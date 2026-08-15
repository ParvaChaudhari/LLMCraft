import { NextRequest, NextResponse } from 'next/server';
import { workflowQueue, broadcastEvent } from '@/lib/queue/worker';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  try {
    const { id, action, input } = await req.json();

    if (!id || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // ── Auth check: reject unauthenticated requests ───────────────────────────
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
    // ─────────────────────────────────────────────────────────────────────────

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Fetch pending approval
    const { data: approval, error: fetchErr } = await supabase
      .from('pending_approvals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }


    // Delete the record — no need to keep processed approvals around
    const { error: deleteErr } = await supabase
      .from('pending_approvals')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      return NextResponse.json({ error: 'Failed to delete approval record' }, { status: 500 });
    }

    let currentContext = approval.context;
    
    // Inject human input if provided
    if (input) {
      currentContext.lastOutput = input;
      currentContext[approval.node_id] = input;
    } else {
      currentContext.lastOutput = action === 'approved' ? 'Approved by Human' : 'Rejected by Human';
      currentContext[approval.node_id] = currentContext.lastOutput;
    }

    const edges = approval.edges_json;
    const nodes = approval.nodes_json;

    // Find valid downstream edges based on the action ('approved' or 'rejected' handle)
    const outgoingEdges = edges.filter((e: any) => e.source === approval.node_id && e.sourceHandle === action);

    // Queue up the next nodes with a delay to let the client SSE connection establish first
    for (const edge of outgoingEdges) {
      const nextNodeId = edge.target;
      
      await workflowQueue.add('execute-node', {
        workflowId: approval.workflow_id,
        nodeId: nextNodeId,
        nodes,
        edges,
        context: currentContext
      }, { delay: 800 }); // 800ms delay gives the client time to open SSE connection
    }

    // Broadcast checkpoint finished AFTER queueing (so client can connect during the delay)
    await broadcastEvent(approval.workflow_id, 'NODE_FINISHED', {
      nodeId: approval.node_id,
      type: 'checkpoint',
      output: currentContext.lastOutput,
      isLastNode: outgoingEdges.length === 0,
    });

    return NextResponse.json({ success: true, message: `Workflow resumed via ${action} branch.` });

  } catch (error: any) {
    console.error('Error processing approval:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
