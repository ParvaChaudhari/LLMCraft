import { NextResponse } from 'next/server';
import { workflowQueue } from '@/lib/queue/worker';

export async function POST(req: Request) {
  try {
    const { nodes, edges } = await req.json();

    // Find the starting node (webhook)
    const startNode = nodes.find((n: any) => n.type === 'webhook');
    
    if (!startNode) {
      return NextResponse.json({ error: "No starting Webhook node found." }, { status: 400 });
    }

    // Push the first job to the queue
    await workflowQueue.add('execute-node', {
      workflowId: `exec-${Date.now()}`,
      nodeId: startNode.id,
      nodes,
      edges,
      context: {}
    });

    return NextResponse.json({ message: "Workflow queued successfully!" });
  } catch (error: any) {
    console.error("Execution API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to start execution" }, { status: 500 });
  }
}
