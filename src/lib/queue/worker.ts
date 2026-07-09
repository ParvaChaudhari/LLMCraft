import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/client';
import { decrypt } from '@/lib/crypto';

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

// Helper to resolve dot-notation paths from context
const resolvePath = (context: any, path: string) => {
  const parts = path.split('.');
  const baseKey = parts[0]; // e.g., 'webhook_1' or 'lastOutput'
  
  let baseValue = context[baseKey];
  if (baseValue === undefined) return undefined;
  
  // If there are no nested parts, just return the base value directly
  if (parts.length === 1) return baseValue;
  
  // If there are nested parts, attempt to parse the base value as JSON
  try {
    const parsedObj = typeof baseValue === 'string' ? JSON.parse(baseValue) : baseValue;
    let current = parsedObj;
    for (let i = 1; i < parts.length; i++) {
      if (current === null || current === undefined) return undefined;
      current = current[parts[i]];
    }
    
    // If the final result is an object/array, stringify it so it can be injected cleanly
    if (typeof current === 'object' && current !== null) {
      return JSON.stringify(current);
    }
    return current;
  } catch (e) {
    // If it's not valid JSON, we cannot resolve a nested path
    return undefined;
  }
};

// Helper for template variable interpolation
const replaceVariables = (text: string, context: any) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const resolvedValue = resolvePath(context, trimmedKey);
    return resolvedValue !== undefined ? String(resolvedValue) : match;
  });
};

// Helper to fetch and decrypt API keys
const fetchApiKey = async (credentialId: string): Promise<string | null> => {
  if (!credentialId) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('credentials').select('encrypted_data').eq('id', credentialId).single();
    if (error || !data) return null;
    return decrypt(data.encrypted_data);
  } catch (e) {
    console.error('[Queue] Error decrypting key:', e);
    return null;
  }
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
    let apiKey = process.env.GEMINI_API_KEY;
    const credentialId = currentNode.data?.credentialId;

    if (credentialId) {
      console.log(`[Queue] Fetching credential ${credentialId} from database...`);
      const supabase = createClient();
      const { data: credData, error } = await supabase
        .from('credentials')
        .select('encrypted_data')
        .eq('id', credentialId)
        .single();
      
      if (error || !credData) {
        console.error(`[Queue] Failed to load credential:`, error?.message);
        newContext.lastOutput = `Error: Failed to load credential (${error?.message || 'Not found'})`;
        await broadcastEvent(workflowId, 'NODE_FINISHED', { nodeId, type: currentNode.type, output: newContext.lastOutput });
        return;
      }

      try {
        apiKey = decrypt(credData.encrypted_data);
        console.log(`[Queue] Successfully decrypted credential for Gemini.`);
      } catch (decErr: any) {
        console.error(`[Queue] Decryption failed:`, decErr.message);
        newContext.lastOutput = `Error: Failed to decrypt credential`;
        await broadcastEvent(workflowId, 'NODE_FINISHED', { nodeId, type: currentNode.type, output: newContext.lastOutput });
        return;
      }
    }

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
      newContext.lastOutput = "Error: No Gemini API Key or Credential selected.";
    }
  } else if (currentNode.type === 'chatgptFactory') {
    const credentialId = currentNode.data?.credentialId;
    const apiKey = await fetchApiKey(credentialId);
    
    if (!apiKey) {
      newContext.lastOutput = "Error: Invalid or missing OpenAI API Key.";
      newContext[nodeId] = newContext.lastOutput;
    } else {
      const rawPrompt = currentNode.data?.prompt || "Tell me a joke.";
      const prompt = replaceVariables(rawPrompt, newContext);
      const model = currentNode.data?.model || "gpt-4o";
      
      console.log(`[Queue] Calling OpenAI (${model}) with prompt: ${prompt}`);
      
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'OpenAI API Error');
        
        newContext.lastOutput = data.choices?.[0]?.message?.content || "No output returned.";
        newContext[nodeId] = newContext.lastOutput;
        console.log(`[Queue] ChatGPT Output: ${newContext.lastOutput.trim()}`);
      } catch (err: any) {
        console.error(`[Queue] ChatGPT Error:`, err.message);
        newContext.lastOutput = `Error: ${err.message}`;
        newContext[nodeId] = newContext.lastOutput;
      }
    }
    
  } else if (currentNode.type === 'claudeFactory') {
    const credentialId = currentNode.data?.credentialId;
    const apiKey = await fetchApiKey(credentialId);
    
    if (!apiKey) {
      newContext.lastOutput = "Error: Invalid or missing Anthropic API Key.";
      newContext[nodeId] = newContext.lastOutput;
    } else {
      const rawPrompt = currentNode.data?.prompt || "Write a haiku.";
      const prompt = replaceVariables(rawPrompt, newContext);
      const model = currentNode.data?.model || "claude-3-5-sonnet-20240620";
      
      console.log(`[Queue] Calling Claude (${model}) with prompt: ${prompt}`);
      
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Anthropic API Error');
        
        newContext.lastOutput = data.content?.[0]?.text || "No output returned.";
        newContext[nodeId] = newContext.lastOutput;
        console.log(`[Queue] Claude Output: ${newContext.lastOutput.trim()}`);
      } catch (err: any) {
        console.error(`[Queue] Claude Error:`, err.message);
        newContext.lastOutput = `Error: ${err.message}`;
        newContext[nodeId] = newContext.lastOutput;
      }
    }
    
  } else if (currentNode.type === 'httpRequest') {
    const url = replaceVariables(currentNode.data?.url || "https://jsonplaceholder.typicode.com/posts/1", newContext);
    const method = currentNode.data?.method || "GET";
    
    const options: RequestInit = { method };

    if (currentNode.data?.headers) {
      try {
        const parsedHeaders = JSON.parse(replaceVariables(currentNode.data.headers, newContext));
        options.headers = parsedHeaders;
      } catch (err: any) {
        console.error(`[Queue] Failed to parse headers:`, err.message);
      }
    }

    if (currentNode.data?.body && ['POST', 'PUT', 'DELETE'].includes(method)) {
      options.body = replaceVariables(currentNode.data.body, newContext);
    }
    
    console.log(`[Queue] Making real HTTP ${method} request to ${url}...`);
    try {
      const res = await fetch(url, options);
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
