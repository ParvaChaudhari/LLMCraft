import { NextRequest, NextResponse } from 'next/server';
import { workflowQueue } from '@/lib/queue/worker';
import { createClient } from '@supabase/supabase-js';
import IORedis from 'ioredis';

// Create a helper Redis connection for pub/sub subscriptions in synchronous webhook mode
const getRedisClient = () => {
  return new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
  });
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleWebhook(req, params, 'POST');
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleWebhook(req, params, 'GET');
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleWebhook(req, params, 'PUT');
}

async function handleWebhook(req: NextRequest, paramsPromise: Promise<{ id: string }>, method: string) {
  let subClient: IORedis | null = null;
  let timeoutHandle: NodeJS.Timeout | null = null;

  try {
    const { id: workflowId } = await paramsPromise;

    if (!workflowId) {
      return NextResponse.json({ error: 'Missing workflow ID in webhook URL.' }, { status: 400 });
    }

    // ── Supabase Admin Client ───────────────────────────────────────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch the workflow graph
    const { data: workflow, error: wfErr } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (wfErr || !workflow) {
      return NextResponse.json({ error: 'Workflow not found.' }, { status: 404 });
    }

    const graphJson = workflow.graph_json || {};
    const nodes = graphJson.nodes || [];
    const edges = graphJson.edges || [];

    // Find the starting Radio Tower (webhook node)
    const startNode = nodes.find((n: any) => n.type === 'webhook');
    if (!startNode) {
      return NextResponse.json({ error: 'No Radio Tower (webhook trigger) found in this workflow.' }, { status: 400 });
    }

    // ── Extract Incoming Payload ────────────────────────────────────────────
    let body: any = {};
    if (method !== 'GET') {
      const contentType = req.headers.get('content-type') || '';
      try {
        if (contentType.includes('application/json')) {
          body = await req.json();
        } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
          const formData = await req.formData();
          const obj: Record<string, any> = {};
          formData.forEach((val, key) => { obj[key] = val; });
          body = obj;
        } else {
          body = await req.text();
        }
      } catch (e) {
        body = {};
      }
    }

    // Extract query parameters and headers
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const headerEntries: Record<string, string> = {};
    req.headers.forEach((val, key) => { headerEntries[key] = val; });

    // Determine execution mode (sync vs async)
    const isSync = startNode.data?.executionMode === 'sync' || searchParams.sync === 'true';

    // ── Initialize Execution Context ────────────────────────────────────────
    const initialContext: Record<string, any> = {
      webhook: body,
      body,
      query: searchParams,
      headers: headerEntries,
      lastOutput: typeof body === 'string' ? body : JSON.stringify(body),
    };
    initialContext[startNode.id] = initialContext.lastOutput;

    // Create execution row in Supabase
    let executionId = `exec-${Date.now()}`;
    const { data: execData, error: execErr } = await supabase
      .from('executions')
      .insert({
        workflow_id: workflowId,
        user_id: workflow.user_id,
        status: 'running',
        state_json: { context: initialContext },
      })
      .select('id')
      .single();

    if (!execErr && execData) {
      executionId = execData.id;
    }

    console.log(`[Webhook] Incoming ${method} request for workflow ${workflowId} (Mode: ${isSync ? 'SYNC' : 'ASYNC'}, Execution ID: ${executionId})`);

    // ── Synchronous Mode: Wait for Response via Redis Pub/Sub ───────────────
    if (isSync) {
      subClient = getRedisClient();
      const channelName = `workflow-events:${executionId}`;

      const responsePromise = new Promise<{ statusCode: number; headers: Record<string, string>; body: string }>((resolve, reject) => {
        let responded = false;

        // 28-second safeguard timeout to prevent gateway hangs
        timeoutHandle = setTimeout(() => {
          if (!responded) {
            responded = true;
            reject(new Error('Gateway Timeout: Workflow execution exceeded 28 seconds.'));
          }
        }, 28000);

        subClient!.subscribe(channelName, (err) => {
          if (err) {
            if (!responded) {
              responded = true;
              reject(err);
            }
          }
        });

        subClient!.on('message', (_channel, message) => {
          try {
            const { event, data } = JSON.parse(message);

            // 1. Explicit Webhook Response (Reply Tower) event
            if (event === 'WEBHOOK_RESPONDED' && !responded) {
              responded = true;
              resolve({
                statusCode: data.statusCode || 200,
                headers: data.headers || { 'Content-Type': 'application/json' },
                body: typeof data.body === 'string' ? data.body : JSON.stringify(data.body),
              });
            }

            // 2. Fallback: Workflow finished and reached the final node without an explicit Reply Tower
            if (event === 'NODE_FINISHED' && data.isLastNode && !responded) {
              responded = true;
              const output = data.output !== undefined ? String(data.output) : '';
              let isJson = false;
              try {
                JSON.parse(output);
                isJson = true;
              } catch (_) {}

              resolve({
                statusCode: 200,
                headers: { 'Content-Type': isJson ? 'application/json' : 'text/plain' },
                body: output,
              });
            }

            // 3. Workflow error event
            if (event === 'NODE_ERROR' && !responded) {
              responded = true;
              resolve({
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: data.error || 'Workflow execution error', nodeId: data.nodeId }),
              });
            }
          } catch (parseErr) {
            console.error('[Webhook] Error parsing Redis event message:', parseErr);
          }
        });
      });

      // Queue the first node job
      await workflowQueue.add('execute-node', {
        workflowId: executionId,
        nodeId: startNode.id,
        nodes,
        edges,
        context: initialContext,
      }, { delay: 0 });

      // Await the pipeline response
      try {
        const result = await responsePromise;

        // Cleanup
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (subClient) {
          subClient.unsubscribe(channelName).catch(() => {});
          subClient.quit().catch(() => {});
        }

        // Return HTTP Response with custom headers and status code
        const responseHeaders = new Headers();
        Object.entries(result.headers).forEach(([k, v]) => {
          responseHeaders.set(k, String(v));
        });

        return new Response(result.body, {
          status: result.statusCode,
          headers: responseHeaders,
        });
      } catch (waitErr: any) {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (subClient) {
          subClient.unsubscribe(channelName).catch(() => {});
          subClient.quit().catch(() => {});
        }

        return NextResponse.json({
          error: waitErr.message || 'Workflow execution failed or timed out.',
          workflowId: executionId,
        }, { status: 504 });
      }
    }

    // ── Asynchronous Mode: Immediate 200 Receipt ────────────────────────────
    await workflowQueue.add('execute-node', {
      workflowId: executionId,
      nodeId: startNode.id,
      nodes,
      edges,
      context: initialContext,
    }, { delay: 100 });

    return NextResponse.json({
      message: 'Workflow webhook received and queued successfully.',
      workflowId: executionId,
      status: 'queued',
    }, { status: 200 });

  } catch (err: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (subClient) {
      subClient.quit().catch(() => {});
    }
    console.error('[Webhook API Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal webhook error.' }, { status: 500 });
  }
}
