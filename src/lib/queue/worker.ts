import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

// Create the Queue
export const workflowQueue = new Queue('workflow-queue', { connection });

// The traversal logic for a single node
const executeNode = async (job: Job) => {
  const { workflowId, nodeId, nodes, edges, context } = job.data;
  const currentNode = nodes.find((n: any) => n.id === nodeId);
  
  if (!currentNode) {
    console.log(`[Queue] Node ${nodeId} not found.`);
    return;
  }

  console.log(`[Queue] Executing Node: ${currentNode.type} (${nodeId})`);
  let newContext = { ...context };

  // 1. Run specific node logic
  if (currentNode.type === 'geminiFactory') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
        const prompt = newContext.lastOutput || "Tell me a short 1 sentence joke about city builders.";
        const result = await model.generateContent(prompt);
        newContext.lastOutput = result.response.text();
        console.log(`[Queue] Gemini Output: ${newContext.lastOutput.trim()}`);
      } catch (err: any) {
        console.error(`[Queue] Gemini Error:`, err.message);
        throw err; // Throwing triggers BullMQ retry logic
      }
    } else {
      console.log(`[Queue] No Gemini API key found.`);
    }
  } else if (currentNode.type === 'httpRequest') {
    console.log(`[Queue] Making fake HTTP request...`);
    newContext.lastOutput = "HTTP Request Succeeded";
  } else if (currentNode.type === 'output') {
    console.log(`[Queue] Final Output Reached: ${newContext.lastOutput}`);
    return; // End of line
  }

  // 2. Find next nodes based on edges
  const outgoingEdges = edges.filter((e: any) => e.source === nodeId);
  
  for (const edge of outgoingEdges) {
    let nextNodeId = edge.target;
    
    // For conditional branching, we pick the right handle
    if (currentNode.type === 'conditional') {
      // Basic logic: if output contains 'error', take False path, else True
      const condition = newContext.lastOutput?.toLowerCase().includes('error') ? false : true;
      const expectedHandle = condition ? 'true' : 'false';
      if (edge.sourceHandle !== expectedHandle) {
        continue; // Skip this edge path
      }
      console.log(`[Queue] Conditional evaluated to ${condition}, taking path: ${expectedHandle}`);
    }

    const nextNode = nodes.find((n: any) => n.id === nextNodeId);
    let delay = 0;
    
    // If next node is a Delay, tell BullMQ to wait before executing it
    if (nextNode && nextNode.type === 'delay') {
      delay = 5000; // 5 seconds delay for proof of concept
      console.log(`[Queue] Delay node hit! Queuing next job with a 5 second delay.`);
    }

    await workflowQueue.add('execute-node', {
      workflowId,
      nodeId: nextNodeId,
      nodes,
      edges,
      context: newContext
    }, { delay });
  }
};

// Initialize worker only once globally in Next.js dev environment
declare global {
  var __worker__: Worker | undefined;
}

if (!global.__worker__) {
  console.log('[Queue] Starting background worker...');
  global.__worker__ = new Worker('workflow-queue', executeNode, { connection });
  
  global.__worker__.on('completed', (job) => {
    // console.log(`[Queue] Job ${job.id} completed successfully`);
  });

  global.__worker__.on('failed', (job, err) => {
    console.log(`[Queue] Job ${job?.id} failed with ${err.message}`);
  });
}

export const worker = global.__worker__;
