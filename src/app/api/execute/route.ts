import { NextRequest, NextResponse } from 'next/server';
import { workflowQueue } from '@/lib/queue/worker';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { nodes, edges, workflowId: dbWorkflowId } = await req.json();

    // Find the starting node (webhook)
    const startNode = nodes.find((n: any) => n.type === 'webhook');
    
    if (!startNode) {
      return NextResponse.json({ error: "No starting Webhook node found." }, { status: 400 });
    }

    // ── Auth check ───────────────────────────
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let executionId = `exec-${Date.now()}`;

    if (dbWorkflowId) {
      // Use service role key to bypass RLS for server-side inserts
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: execData, error: execErr } = await adminSupabase
        .from('executions')
        .insert({
          workflow_id: dbWorkflowId,
          user_id: user.id,
          status: 'running',
          state_json: { context: {} }
        })
        .select('id')
        .single();
        
      if (!execErr && execData) {
        executionId = execData.id;
        console.log('[Execute] Created execution row:', executionId);
      } else {
        console.warn('[Execute] Failed to insert execution row:', execErr);
      }
    }

    // Push the first job to the queue with a slight delay
    // This gives the client time to establish the SSE connection before events fire
    await workflowQueue.add('execute-node', {
      workflowId: executionId,
      nodeId: startNode.id,
      nodes,
      edges,
      context: {}
    }, { delay: 500 });

    return NextResponse.json({ message: "Workflow queued successfully!", workflowId: executionId });
  } catch (error: any) {
    console.error("Execution API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to start execution" }, { status: 500 });
  }
}
