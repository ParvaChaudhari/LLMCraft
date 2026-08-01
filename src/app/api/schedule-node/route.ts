import { NextResponse } from 'next/server';
import { workflowQueue } from '@/lib/queue/worker';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nodeId, cronExpression, nodes, edges } = body;

    if (!nodeId || !cronExpression || !nodes || !edges) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch all repeatable jobs
    const repeatableJobs = await workflowQueue.getRepeatableJobs();
    
    // 2. Remove any existing schedule for this specific node
    for (const job of repeatableJobs) {
      // We encode the nodeId into the job name or check its key
      if (job.name === `cron-${nodeId}`) {
        await workflowQueue.removeRepeatableByKey(job.key);
      }
    }

    // 3. Register the new repeatable job
    // The name of the job will be `cron-${nodeId}` so we can track it easily
    const workflowId = `cron-${nodeId}-${Date.now()}`;
    
    // Create an initial context where the clocktower starts the flow
    const context = {
      [nodeId]: "Scheduled Execution",
      lastOutput: "Scheduled Execution"
    };

    await workflowQueue.add(`cron-${nodeId}`, {
      workflowId,
      nodeId,
      nodes,
      edges,
      context
    }, {
      repeat: { pattern: cronExpression }
    });

    return NextResponse.json({ success: true, message: `Scheduled node ${nodeId} with cron ${cronExpression}` });
  } catch (err: any) {
    console.error('Error scheduling node:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
