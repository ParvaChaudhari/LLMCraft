import { NextResponse } from 'next/server';
import { workflowQueue } from '@/lib/queue/worker';

export async function POST(req: Request) {
  try {
    const { nodeId, nodes, edges, context } = await req.json();

    if (!nodeId) {
      return NextResponse.json({ error: 'No nodeId provided.' }, { status: 400 });
    }

    const workflowId = `node-exec-${Date.now()}`;
    await workflowQueue.add('execute-node', {
      workflowId,
      nodeId,
      nodes,
      edges,
      context: context || {},
    });

    return NextResponse.json({ message: 'Node queued successfully!', workflowId });
  } catch (error: any) {
    console.error('Execute-Node API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start node execution' }, { status: 500 });
  }
}
