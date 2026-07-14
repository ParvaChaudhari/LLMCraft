import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/client';
import { decrypt } from '@/lib/crypto';
import vm from 'vm';
import * as cheerio from 'cheerio';

// Initialize Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

// Create the Queue
export const workflowQueue = new Queue('workflow-queue', { connection: connection as any });

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
    let raw = baseValue;
    if (typeof raw === 'string') {
      const match = raw.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (match) raw = match[1].trim();
    }
    const parsedObj = typeof raw === 'string' ? JSON.parse(raw) : raw;
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

  // Limit Node: Toll Booth Counter Check
  if (currentNode.type === 'limit') {
    newContext.limitCounters = newContext.limitCounters || {};
    const currentCount = newContext.limitCounters[nodeId] || 0;
    const maxItems = currentNode.data?.maxItems || 1;
    
    if (currentCount >= maxItems) {
      console.log(`[Queue] Limit reached for node ${nodeId} (${currentCount}/${maxItems}). Stopping path.`);
      newContext.lastOutput = `Limit Reached (${maxItems} items max)`;
      await broadcastEvent(workflowId, 'NODE_FINISHED', { nodeId, type: currentNode.type, output: newContext.lastOutput, isLastNode: true });
      return; // End execution of this branch
    }
    
    newContext.limitCounters[nodeId] = currentCount + 1;
    newContext.lastOutput = `Passed Toll Booth (${currentCount + 1}/${maxItems})`;
    console.log(`[Queue] Passing Limit node ${nodeId}: ${currentCount + 1}/${maxItems}`);
  }

  // Pinned Node: Skip execution, use cached output
  if (currentNode.data?.isPinned && currentNode.data?.pinnedOutput !== undefined) {
    console.log(`[Queue] Node ${nodeId} is pinned — using cached output.`);
    newContext.lastOutput = currentNode.data.pinnedOutput;
    newContext[nodeId] = currentNode.data.pinnedOutput;

    const outgoingEdges = edges.filter((e: any) => e.source === nodeId);
    await broadcastEvent(workflowId, 'NODE_FINISHED', {
      nodeId,
      type: currentNode.type,
      output: newContext.lastOutput,
      isLastNode: outgoingEdges.length === 0,
    });
    for (const edge of outgoingEdges) {
      await broadcastEvent(workflowId, 'EDGE_TRAVERSED', {
        edgeId: edge.id,
        source: nodeId,
        target: edge.target,
      });
      await workflowQueue.add('execute-node', {
        workflowId, nodeId: edge.target, nodes, edges, context: newContext
      });
    }
    return;
  }

  // 1. Run specific node logic
  if (['geminiFactory', 'chatgptFactory', 'claudeFactory'].includes(currentNode.type)) {
    const credentialId = currentNode.data?.credentialId;
    // For Gemini, fallback to process.env if no credentialId is provided
    let apiKey = (currentNode.type === 'geminiFactory' && !credentialId) 
      ? process.env.GEMINI_API_KEY 
      : await fetchApiKey(credentialId);

    if (!apiKey) {
      console.log(`[Queue] No API key found for ${currentNode.type}.`);
      newContext.lastOutput = `Error: No valid API Key or Credential selected for ${currentNode.type}.`;
      newContext[nodeId] = newContext.lastOutput;
    } else {
      const defaultPrompts: Record<string, string> = {
        geminiFactory: "Tell me a short 1 sentence joke about city builders.",
        chatgptFactory: "Tell me a joke.",
        claudeFactory: "Write a haiku."
      };
      
      const defaultModels: Record<string, string> = {
        geminiFactory: "gemini-3.1-flash-lite",
        chatgptFactory: "gpt-4o",
        claudeFactory: "claude-3-5-sonnet-20240620"
      };

      const rawPrompt = currentNode.data?.prompt || defaultPrompts[currentNode.type];
      const prompt = replaceVariables(rawPrompt, newContext);
      const modelName = currentNode.data?.model || defaultModels[currentNode.type];

      console.log(`[Queue] Calling ${currentNode.type} (${modelName}) with prompt: ${prompt}`);

      try {
        let output = "";

        switch (currentNode.type) {
          case 'geminiFactory': {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            output = result.response.text();
            break;
          }
          case 'chatgptFactory': {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: modelName,
                messages: [{ role: 'user', content: prompt }]
              })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'OpenAI API Error');
            output = data.choices?.[0]?.message?.content || "No output returned.";
            break;
          }
          case 'claudeFactory': {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify({
                model: modelName,
                max_tokens: 1024,
                messages: [{ role: 'user', content: prompt }]
              })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'Anthropic API Error');
            output = data.content?.[0]?.text || "No output returned.";
            break;
          }
        }

        newContext.lastOutput = output;
        newContext[nodeId] = output;
        console.log(`[Queue] ${currentNode.type} Output: ${output.trim()}`);
      } catch (err: any) {
        console.error(`[Queue] ${currentNode.type} Error:`, err.message);
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
      let data = await res.text();
      try {
        data = JSON.stringify(JSON.parse(data), null, 2);
      } catch (e) {
        // Keep as raw text if it's not valid JSON
      }
      newContext.lastOutput = data;
      newContext[nodeId] = data;
    } catch (err: any) {
      console.error(`[Queue] HTTP Error:`, err.message);
      newContext.lastOutput = `Error: ${err.message}`;
    }
  } else if (currentNode.type === 'watchtower') {
    const rawQuery = currentNode.data?.query || '{{lastOutput}}';
    const query = replaceVariables(rawQuery, newContext);
    const apiKey = await fetchApiKey(currentNode.data?.credentialId);

    if (!apiKey) {
      newContext.lastOutput = `Error: Missing Tavily API Key`;
      newContext[nodeId] = newContext.lastOutput;
    } else {
      console.log(`[Queue] Watchtower searching Tavily for: ${query}`);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query: query,
            search_depth: "advanced",
            include_answer: "basic",
            max_results: 5
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Tavily API Error');
        
        const formattedOutput = {
          summary: data.answer || "No search results found.",
          sources: (data.results || []).map((r: any) => ({
            url: r.url,
            content: r.content
          }))
        };
        const output = JSON.stringify(formattedOutput, null, 2);

        newContext.lastOutput = output;
        newContext[nodeId] = output;
      } catch (err: any) {
        console.error(`[Queue] Watchtower Error:`, err.message);
        newContext.lastOutput = `Error: ${err.message}`;
        newContext[nodeId] = newContext.lastOutput;
      }
    }
  } else if (currentNode.type === 'customWorkshop') {
    const userCode = currentNode.data?.code || 'return context.lastOutput;';
    console.log(`[Queue] Executing Custom Workshop code...`);

    const sandbox = {
      context: newContext,
      console: {
        log: (...args: any[]) => console.log(`[Workshop Log]`, ...args),
        error: (...args: any[]) => console.error(`[Workshop Error]`, ...args),
      }
    };
    vm.createContext(sandbox);

    const scriptStr = `
      (async () => {
        ${userCode}
      })();
    `;

    try {
      const script = new vm.Script(scriptStr);
      const result = await script.runInContext(sandbox, { timeout: 5000 });
      
      if (result !== undefined) {
        newContext.lastOutput = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        newContext[nodeId] = newContext.lastOutput;
      }
    } catch (err: any) {
      console.error(`[Queue] Custom Workshop Error:`, err.message);
      newContext.lastOutput = `Error: ${err.message}`;
      newContext[nodeId] = newContext.lastOutput;
    }
  } else if (currentNode.type === 'webScraper') {
    const rawUrl = currentNode.data?.url || '';
    const url = replaceVariables(rawUrl, newContext);
    console.log(`[Queue] Print Shop scraping URL: ${url}`);
    
    if (!url) {
      newContext.lastOutput = `Error: Missing URL for Print Shop.`;
      newContext[nodeId] = newContext.lastOutput;
    } else {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        
        const html = await res.text();
        const $ = cheerio.load(html);
        
        // Remove non-text elements
        $('script, style, noscript, iframe, img, svg').remove();
        
        // Extract raw text and clean whitespace
        const rawText = $('body').text() || $.text();
        let cleanText = rawText.replace(/\s+/g, ' ').trim();
        
        // Prevent massive payloads from crashing SSE/Redis
        if (cleanText.length > 30000) {
          cleanText = cleanText.substring(0, 30000) + '\n\n... (Content truncated due to length)';
        }
        
        newContext.lastOutput = cleanText;
        newContext[nodeId] = cleanText;
      } catch (err: any) {
        console.error(`[Queue] Print Shop Error:`, err.message);
        newContext.lastOutput = `Error: ${err.message}`;
        newContext[nodeId] = newContext.lastOutput;
      }
    }
  } else if (currentNode.type === 'output') {
    console.log(`[Queue] Final Output Reached: ${newContext.lastOutput}`);
    await broadcastEvent(workflowId, 'NODE_FINISHED', { nodeId, type: currentNode.type, output: newContext.lastOutput });
    return; // End of line
  }

  // 2. Find next nodes based on edges
  const outgoingEdges = edges.filter((e: any) => e.source === nodeId);
  const validEdges: any[] = [];
  
  let expectedHandle: string | null = null;
  if (currentNode.type === 'conditional') {
    const lhsRaw = currentNode.data?.conditionLhs || '{{lastOutput}}';
    const rhsRaw = currentNode.data?.conditionRhs || 'error';
    const op = currentNode.data?.conditionOperator || 'contains';
    
    const lhs = replaceVariables(lhsRaw, newContext);
    const rhs = replaceVariables(rhsRaw, newContext);
    
    let condition = false;
    const lhsStr = String(lhs).toLowerCase();
    const rhsStr = String(rhs).toLowerCase();
    
    switch (op) {
      case 'contains':
        condition = lhsStr.includes(rhsStr);
        break;
      case 'is_equal_to':
        condition = lhsStr === rhsStr;
        break;
      case 'is_not_equal_to':
        condition = lhsStr !== rhsStr;
        break;
      case 'greater_than':
        condition = parseFloat(lhsStr) > parseFloat(rhsStr);
        break;
      case 'less_than':
        condition = parseFloat(lhsStr) < parseFloat(rhsStr);
        break;
      default:
        condition = lhsStr.includes(rhsStr);
    }
    
    expectedHandle = condition ? 'true' : 'false';
    console.log(`[Queue] Conditional '${lhsRaw} ${op} ${rhsRaw}' evaluated to ${condition}, taking path: ${expectedHandle}`);
  }

  for (const edge of outgoingEdges) {
    if (currentNode.type === 'conditional' && edge.sourceHandle !== expectedHandle) {
      continue;
    }
    validEdges.push(edge);
  }

  // Broadcast completion of current node
  newContext[nodeId] = newContext.lastOutput;
  await broadcastEvent(workflowId, 'NODE_FINISHED', { 
    nodeId, 
    type: currentNode.type, 
    output: newContext.lastOutput,
    isLastNode: validEdges.length === 0
  });
  
  for (const edge of validEdges) {
    let nextNodeId = edge.target;
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
global.__worker__ = new Worker('workflow-queue', executeNode, { connection: connection as any, concurrency: 100 });

global.__worker__.on('completed', (job) => {
  // console.log(`[Queue] Job ${job.id} completed successfully`);
});

global.__worker__.on('failed', (job, err) => {
  console.log(`[Queue] Job ${job?.id} failed with ${err.message}`);
});

export const worker = global.__worker__;
