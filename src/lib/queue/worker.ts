import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

// Create the Queue
export const workflowQueue = new Queue('workflow-queue', { connection });

// Helper to broadcast events via Redis Pub/Sub
const broadcastEvent = async (workflowId: string, event: string, data: any) => {
  try {
    await connection.publish(`workflow-events:${workflowId}`, JSON.stringify({ event, data }));
  } catch (err) {
    console.error('[Queue] Error broadcasting event:', err);
  }
};

// Helper for template variable interpolation
const replaceVariables = (text: string, context: any) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    // Allow reading from node IDs if stored in context, or flat keys like lastOutput
    return context[trimmedKey] !== undefined ? context[trimmedKey] : match;
  });
};

// The traversal logic for a single node
const executeNode = async (job: Job) => {
  const { workflowId, nodeId, nodes, edges, context } = job.data;
  const currentNode = nodes.find((n: any) => n.id === nodeId);
  
  if (!currentNode) {
    console.log(`[Queue] Node ${nodeId} not found.`);
    return;
  }

  console.log(`[Queue] Executing Node: ${currentNode.type} (${nodeId})`);
  await broadcastEvent(workflowId, 'NODE_STARTED', { nodeId, type: currentNode.type });
  
  let newContext = { ...context };

  // 1. Run specific node logic
  if (currentNode.type === 'geminiFactory') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = currentNode.data?.model || "gemini-3.1-flash-lite";
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const rawPrompt = currentNode.data?.prompt || "Tell me a short 1 sentence joke about city builders.";
        const prompt = replaceVariables(rawPrompt, newContext);
        
        console.log(`[Queue] Calling Gemini (${modelName}) with prompt: ${prompt}`);
        
        const result = await model.generateContent(prompt);
        newContext.lastOutput = result.response.text();
        newContext[nodeId] = newContext.lastOutput; // Save to context by node ID too
        console.log(`[Queue] Gemini Output: ${newContext.lastOutput.trim()}`);
      } catch (err: any) {
        console.error(`[Queue] Gemini Error:`, err.message);
        throw err;
      }
    } else {
      console.log(`[Queue] No Gemini API key found.`);
      newContext.lastOutput = "Error: No Gemini API Key";
    }
  } else if (currentNode.type === 'httpRequest') {
    const url = replaceVariables(currentNode.data?.url || "https://jsonplaceholder.typicode.com/posts/1", newContext);
    const method = currentNode.data?.method || "GET";
    
    console.log(`[Queue] Making real HTTP ${method} request to ${url}...`);
    try {
      const res = await fetch(url, { method });
      const data = await res.text();
      newContext.lastOutput = data;
      newContext[nodeId] = data;
    } catch (err: any) {
      console.error(`[Queue] HTTP Error:`, err.message);
      newContext.lastOutput = `Error: ${err.message}`;
    }
  } else if (currentNode.type === 'output') {
    console.log(`[Queue] Final Output Reached: ${newContext.lastOutput}`);
    await broadcastEvent(workflowId, 'NODE_FINISHED', { nodeId, type: currentNode.type, output: newContext.lastOutput });
    return; // End of line
  }

  // Broadcast completion of current node
  await broadcastEvent(workflowId, 'NODE_FINISHED', { nodeId, type: currentNode.type, output: newContext.lastOutput });

  // 2. Find next nodes based on edges
  const outgoingEdges = edges.filter((e: any) => e.source === nodeId);
  
  for (const edge of outgoingEdges) {
    let nextNodeId = edge.target;
    
    // For conditional branching, we pick the right handle
    if (currentNode.type === 'conditional') {
      const matchText = (currentNode.data?.matchText || "error").toLowerCase();
      // True path if NOT matched, False path if matched
      const condition = newContext.lastOutput?.toLowerCase().includes(matchText) ? false : true;
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
      delay = nextNode.data?.delayMs || 5000;
      console.log(`[Queue] Delay node hit! Queuing next job with a ${delay}ms delay.`);
    }

    await broadcastEvent(workflowId, 'EDGE_TRAVERSED', { 
      edgeId: edge.id, 
      source: nodeId, 
      target: nextNodeId 
    });

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

if (global.__worker__) {
  global.__worker__.close();
}

console.log('[Queue] Starting background worker...');
global.__worker__ = new Worker('workflow-queue', executeNode, { connection, concurrency: 100 });

global.__worker__.on('completed', (job) => {
  // console.log(`[Queue] Job ${job.id} completed successfully`);
});

global.__worker__.on('failed', (job, err) => {
  console.log(`[Queue] Job ${job?.id} failed with ${err.message}`);
});

export const worker = global.__worker__;
