import { NextResponse } from 'next/server';
import { workflowQueue } from '@/lib/queue/worker';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nodeId } = body;

    if (!nodeId) {
      return NextResponse.json({ error: 'Missing nodeId' }, { status: 400 });
    }

    // 1. Fetch all repeatable jobs
    const repeatableJobs = await workflowQueue.getRepeatableJobs();
    let removedCount = 0;
    
    // 2. Remove any existing schedule for this specific node
    for (const job of repeatableJobs) {
      if (job.name === `cron-${nodeId}`) {
        await workflowQueue.removeRepeatableByKey(job.key);
        removedCount++;
      }
    }

    return NextResponse.json({ success: true, message: `Stopped ${removedCount} schedule(s) for node ${nodeId}` });
  } catch (err: any) {
    console.error('Error stopping schedule:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
