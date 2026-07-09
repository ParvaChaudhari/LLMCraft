'use client';

import { useCallback, useState, useEffect, DragEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ReactFlow,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import WebhookNode from './nodes/WebhookNode';
import GeminiFactoryNode from './nodes/GeminiFactoryNode';
import ChatGPTFactoryNode from './nodes/ChatGPTFactoryNode';
import ClaudeFactoryNode from './nodes/ClaudeFactoryNode';
import OutputNode from './nodes/OutputNode';
import HttpRequestNode from './nodes/HttpRequestNode';
import ConditionalNode from './nodes/ConditionalNode';
import DelayNode from './nodes/DelayNode';
import SidePanel from './SidePanel';
import Toolbox from './Toolbox';
import SecretManager from './SecretManager';

import RoadEdge from './RoadEdge';
import PipeEdge from './PipeEdge';
import RoadLayer from './RoadLayer';
import IsometricBackground from './IsometricBackground';

const nodeTypes = {
  webhook: WebhookNode,
  geminiFactory: GeminiFactoryNode,
  chatgptFactory: ChatGPTFactoryNode,
  claudeFactory: ClaudeFactoryNode,
  output: OutputNode,
  httpRequest: HttpRequestNode,
  conditional: ConditionalNode,
  delay: DelayNode,
};

const edgeTypes = {
  road: RoadEdge,
  pipe: PipeEdge,
};

// Start empty by default, they will either be loaded or manually added via toolbox
const defaultInitialNodes: Node[] = [];

let id = 0;
const getId = () => `node_${id++}_${Date.now()}`;

export default function CityCanvas() {
  const [nodes, setNodes] = useState<Node[]>(defaultInitialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [visualMode, setVisualMode] = useState<'roads' | 'pipes'>('roads');
  const [isSecretManagerOpen, setIsSecretManagerOpen] = useState(false);
  
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const playbackQueueRef = useRef<any[]>([]);
  const isPlayingRef = useRef(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadWorkflow() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && data.graph_json) {
        setNodes(data.graph_json.nodes || []);
        setEdges(data.graph_json.edges || []);
        setWorkflowId(data.id);
      }
    }
    loadWorkflow();
  }, [router, supabase]);

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert('You must be logged in to save.');
      setIsSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      name: "My First City",
      graph_json: { nodes, edges }
    };

    if (workflowId) {
      await supabase.from('workflows').update(payload).eq('id', workflowId);
    } else {
      const { data, error } = await supabase.from('workflows').insert([payload]).select().single();
      if (data) setWorkflowId(data.id);
      if (error) console.error("Save error:", error);
    }
    
    setIsSaving(false);
    alert('Layout saved successfully!');
  };

  // --- Playback Engine ---
  useEffect(() => {
    let timeoutId: any;
    
    const processQueue = async () => {
      if (playbackQueueRef.current.length === 0) {
        isPlayingRef.current = false;
        
        // If queue is empty and SSE is closed/done, we might want to check if all is finished.
        // For now, if queue is empty, we just wait.
        return;
      }
      
      isPlayingRef.current = true;
      const payload = playbackQueueRef.current.shift();
      const { event: eventName, data: eventData } = payload;
      
      if (eventName === 'NODE_STARTED') {
        setNodes(nds => nds.map(n => n.id === eventData.nodeId ? { ...n, data: { ...n.data, isLoading: true } } : n));
        timeoutId = setTimeout(processQueue, 0); // instantly next
      } 
      else if (eventName === 'NODE_FINISHED') {
        setNodes(nds => nds.map(n => n.id === eventData.nodeId ? { ...n, data: { ...n.data, isLoading: false, output: eventData.output } } : n));
        if (eventData.type === 'output') {
          setIsRunning(false);
        }
        timeoutId = setTimeout(processQueue, 0);
      }
      else if (eventName === 'EDGE_TRAVERSED') {
        const edgeIdsToAnimate = [eventData.edgeId];
        
        // Peek ahead and batch ALL contiguous EDGE_TRAVERSED events!
        // This ensures parallel branches visually dispatch trucks simultaneously.
        while (
          playbackQueueRef.current.length > 0 &&
          playbackQueueRef.current[0].event === 'EDGE_TRAVERSED'
        ) {
          const nextEvent = playbackQueueRef.current.shift();
          edgeIdsToAnimate.push(nextEvent.data.edgeId);
        }

        // Trigger animations for all batched edges simultaneously!
        setEdges(eds => eds.map(e => edgeIdsToAnimate.includes(e.id) ? { ...e, data: { ...e.data, isAnimating: true } } : e));
        
        timeoutId = setTimeout(() => {
          setEdges(eds => eds.map(e => edgeIdsToAnimate.includes(e.id) ? { ...e, data: { ...e.data, isAnimating: false } } : e));
          processQueue(); // proceed after 2000ms
        }, 2000);
      }
    };
    
    // Polling mechanism to kickstart queue if events arrive
    const pollInterval = setInterval(() => {
      if (playbackQueueRef.current.length > 0 && !isPlayingRef.current) {
        processQueue();
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(pollInterval);
    };
  }, []);
  // -------------------------

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n))
    );
    // Also update selectedNode if it's currently open
    setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...newData } } : prev));
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node`, isLoading: false },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance],
  );

  const handleRun = async () => {
    if (isRunning) return;
    
    const startNode = nodes.find(n => n.type === 'webhook');
    if (!startNode) {
      alert("Missing Radio Tower (Webhook) trigger!");
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setIsRunning(true);
    
    // Reset state
    setNodes(nds => nds.map(node => ({ ...node, data: { ...node.data, isLoading: false, output: undefined } })));
    setEdges(eds => eds.map(edge => ({ ...edge, data: { ...edge.data, isAnimating: false } })));

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
      });
      const resData = await res.json();
      
      if (!resData.workflowId) throw new Error("No workflowId returned");

      const eventSource = new EventSource(`/api/events?workflowId=${resData.workflowId}`);
      eventSourceRef.current = eventSource;

      // Manually push the start node events to the Playback Queue for instant visual feedback
      // so we don't have to wait for the SSE connection to open and receive them!
      if (visualMode === 'roads') {
        playbackQueueRef.current.push({ event: 'NODE_STARTED', data: { nodeId: startNode.id } });
        const outEdges = edges.filter(e => e.source === startNode.id);
        outEdges.forEach(e => {
          playbackQueueRef.current.push({ event: 'EDGE_TRAVERSED', data: { edgeId: e.id, source: startNode.id, target: e.target } });
        });
        playbackQueueRef.current.push({ event: 'NODE_FINISHED', data: { nodeId: startNode.id, type: 'webhook' } });
      }

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { event: eventName, data: eventData } = payload;
          
          // Ignore duplicate events from the backend for the start node,
          // since we already pushed them to the queue manually!
          if (eventName === 'NODE_STARTED' || eventName === 'NODE_FINISHED') {
            if (eventData.nodeId === startNode.id) return;
          }
          if (eventName === 'EDGE_TRAVERSED') {
            if (eventData.source === startNode.id) return;
          }
          
          if (visualMode === 'roads') {
            // Push to playback queue
            playbackQueueRef.current.push(payload);
          } else {
            // Instant Pipeline Execution
            const { event: eventName, data: eventData } = payload;
            
            if (eventName === 'NODE_STARTED') {
              setNodes(nds => nds.map(n => n.id === eventData.nodeId ? { ...n, data: { ...n.data, isLoading: true } } : n));
            } 
            else if (eventName === 'NODE_FINISHED') {
              setNodes(nds => nds.map(n => n.id === eventData.nodeId ? { ...n, data: { ...n.data, isLoading: false, output: eventData.output } } : n));
              if (eventData.type === 'output') {
                setIsRunning(false);
              }
            }
            else if (eventName === 'EDGE_TRAVERSED') {
              // Very fast instant blip for pipes (500ms)
              setEdges(eds => eds.map(e => e.id === eventData.edgeId ? { ...e, data: { ...e.data, isAnimating: true } } : e));
              setTimeout(() => {
                setEdges(eds => eds.map(e => e.id === eventData.edgeId ? { ...e, data: { ...e.data, isAnimating: false } } : e));
              }, 500);
            }
          }
        } catch(e) {}
      };

      eventSource.onerror = (err) => {
        console.error("SSE Error:", err);
        eventSource.close();
        setIsRunning(false);
      };
    } catch (err) {
      console.error(err);
      setIsRunning(false);
    }
  };

  return (
    <div className="w-full h-full relative bg-[#4CAF50] flex">
      {/* Toolbox on the left */}
      <Toolbox onOpenSecretManager={() => setIsSecretManagerOpen(true)} />

      {/* Main Canvas Area */}
      <div className="flex-1 h-full w-full relative overflow-hidden bg-[#d2b48c]" onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges.map(e => ({ ...e, type: visualMode === 'pipes' ? 'pipe' : 'road' }))}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onNodeClick={onNodeClick}
          onEdgeClick={(event, edge) => setEdges((eds) => eds.filter((e) => e.id !== edge.id))}
          onPaneClick={() => setSelectedNode(null)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'road' }}
          fitView
          snapToGrid={true}
          snapGrid={[64, 32]}
          className="bg-transparent"
        >
          <IsometricBackground />
          {visualMode === 'roads' && <RoadLayer />}
          <Controls />
        </ReactFlow>
      </div>

      {/* Top right Buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <div className="bg-[#2d2d2d] rounded-lg p-1 flex shadow-lg border border-[#444]">
          <button
            onClick={() => setVisualMode('roads')}
            className={`px-4 py-1 text-sm font-bold rounded-md transition-colors ${visualMode === 'roads' ? 'bg-[#4af626] text-black' : 'text-white hover:bg-[#333]'}`}
          >
            City Mode
          </button>
          <button
            onClick={() => setVisualMode('pipes')}
            className={`px-4 py-1 text-sm font-bold rounded-md transition-colors ${visualMode === 'pipes' ? 'bg-[#06b6d4] text-white' : 'text-white hover:bg-[#333]'}`}
          >
            Pipeline
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={`px-6 py-2 text-white font-bold rounded-lg shadow-lg transition-colors ${
            isRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRunning ? 'Running...' : 'Run'}
        </button>
      </div>

      {/* Sliding Side Panel */}
      <SidePanel 
        selectedNode={selectedNode} 
        onClose={() => setSelectedNode(null)} 
        updateNodeData={updateNodeData}
        nodes={nodes}
        edges={edges}
      />

      {/* Secret Manager Modal */}
      {isSecretManagerOpen && (
        <SecretManager onClose={() => setIsSecretManagerOpen(false)} />
      )}
    </div>
  );
}
