'use client';

import { useCallback, useState, useEffect, DragEvent } from 'react';
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
import OutputNode from './nodes/OutputNode';
import HttpRequestNode from './nodes/HttpRequestNode';
import ConditionalNode from './nodes/ConditionalNode';
import DelayNode from './nodes/DelayNode';
import SidePanel from './SidePanel';
import Toolbox from './Toolbox';

import RoadEdge from './RoadEdge';
import RoadLayer from './RoadLayer';
import IsometricBackground from './IsometricBackground';

const nodeTypes = {
  webhook: WebhookNode,
  geminiFactory: GeminiFactoryNode,
  output: OutputNode,
  httpRequest: HttpRequestNode,
  conditional: ConditionalNode,
  delay: DelayNode,
};

const edgeTypes = {
  road: RoadEdge,
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
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
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

    setIsRunning(true);
    
    // Reset state
    setNodes(nds => nds.map(node => ({ ...node, data: { ...node.data, isLoading: false, output: undefined } })));
    setEdges(eds => eds.map(edge => ({ ...edge, data: { ...edge.data, isAnimating: false } })));

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    
    // Trigger backend execution silently in background
    fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges })
    }).catch(console.error);

    // Visual Simulation Loop
    let currentNodeId = startNode.id;
    let maxSteps = 20; // safety limit
    
    while (currentNodeId && maxSteps > 0) {
      maxSteps--;
      const outgoingEdge = edges.find(e => e.source === currentNodeId);
      if (!outgoingEdge) break;
      
      // 1. Dispatch Truck
      setEdges(eds => eds.map(e => e.id === outgoingEdge.id ? { ...e, data: { ...e.data, isAnimating: true } } : e));
      await sleep(2000); // wait for truck to arrive (matches SVG dur="2s")
      setEdges(eds => eds.map(e => e.id === outgoingEdge.id ? { ...e, data: { ...e.data, isAnimating: false } } : e));
      
      // 2. Arrive at Next Node
      const nextNode = nodes.find(n => n.id === outgoingEdge.target);
      if (!nextNode) break;
      
      // 3. Process Node
      if (nextNode.type === 'output') {
        setNodes(nds => nds.map(n => n.id === nextNode.id ? { ...n, data: { ...n.data, output: "Delivery Successful! Workflow Complete." } } : n));
        break;
      } else {
        // Show processing state
        setNodes(nds => nds.map(n => n.id === nextNode.id ? { ...n, data: { ...n.data, isLoading: true } } : n));
        await sleep(1500); // processing time
        setNodes(nds => nds.map(n => n.id === nextNode.id ? { ...n, data: { ...n.data, isLoading: false } } : n));
      }
      
      currentNodeId = nextNode.id;
    }

    setIsRunning(false);
  };

  return (
    <div className="w-full h-full relative bg-[#4CAF50] flex">
      {/* Toolbox on the left */}
      <Toolbox />

      {/* Main Canvas Area */}
      <div className="flex-1 h-full w-full relative overflow-hidden bg-[#d2b48c]" onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
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
          <RoadLayer />
          <Controls />
        </ReactFlow>
      </div>

      {/* Top right Buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
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
      <SidePanel selectedNode={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}
