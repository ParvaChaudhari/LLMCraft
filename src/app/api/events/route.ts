import { NextResponse } from 'next/server';
import IORedis from 'ioredis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId');

  if (!workflowId) {
    return new Response('Missing workflowId', { status: 400 });
  }

  const subscriber = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const channel = `workflow-events:${workflowId}`;
      let keepAlive: NodeJS.Timeout;
      
      const cleanup = () => {
        clearInterval(keepAlive);
        try {
          subscriber.quit().catch(() => {});
        } catch (e) {}
      };

      subscriber.subscribe(channel, (err) => {
        if (err) {
          console.error('Failed to subscribe to Redis:', err);
          controller.error(err);
        }
      });

      subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          try {
            controller.enqueue(encoder.encode(`data: ${message}\n\n`));
          } catch (e) {
            // If controller is already closed, ignore
          }
          
          try {
            const parsed = JSON.parse(message);
            if (parsed.event === 'WORKFLOW_COMPLETE') {
              cleanup();
              try { controller.close(); } catch(e) {}
            }
          } catch(e) {}
        }
      });

      keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch (e) {
          cleanup();
        }
      }, 15000);

      request.signal.addEventListener('abort', () => {
        cleanup();
      });
    },
    cancel() {
      try {
        subscriber.quit().catch(() => {});
      } catch (e) {}
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
