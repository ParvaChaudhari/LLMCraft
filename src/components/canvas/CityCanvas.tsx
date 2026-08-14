'use client';

import { useCallback, useState, useEffect, DragEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Connection,
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
import LimitNode from './nodes/LimitNode';
import DelayNode from './nodes/DelayNode';
import SidePanel from './SidePanel';
import Toolbox from './Toolbox';
import SecretManager from './SecretManager';
import WatchtowerNode from './nodes/WatchtowerNode';
import CustomWorkshopNode from './nodes/CustomWorkshopNode';
import PrintShopNode from './nodes/PrintShopNode';
import LibraryNode from './nodes/LibraryNode';
import DBSiloNode from './nodes/DBSiloNode';
import SortingFacilityNode from './nodes/SortingFacilityNode';
import ApifyNode from './nodes/ApifyNode';
import BankVaultNode from './nodes/BankVaultNode';
import ArtStudioNode from './nodes/ArtStudioNode';
import PostOfficeNode from './nodes/PostOfficeNode';
import GoogleDriveNode from './nodes/GoogleDriveNode';
import VariableNode from './nodes/VariableNode';
import AirportNode from './nodes/AirportNode';
import CheckpointNode from './nodes/CheckpointNode';

import RoadEdge from './RoadEdge';
import PipeEdge from './PipeEdge';
import RoadLayer from './RoadLayer';
import IsometricBackground from './IsometricBackground';

import ClocktowerNode from './nodes/ClocktowerNode';
import MergeNode from './nodes/MergeNode';

const nodeTypes = {
  webhook: WebhookNode,
  clocktower: ClocktowerNode,
  googleDrive: GoogleDriveNode,
  merge: MergeNode,
  variable: VariableNode,
  geminiFactory: GeminiFactoryNode,
  chatgptFactory: ChatGPTFactoryNode,
  claudeFactory: ClaudeFactoryNode,
  output: OutputNode,
  httpRequest: HttpRequestNode,
  conditional: ConditionalNode,
  limit: LimitNode,
  delay: DelayNode,
  watchtower: WatchtowerNode,
  customWorkshop: CustomWorkshopNode,
  webScraper: PrintShopNode,
  documentParser: LibraryNode,
  dbSilo: DBSiloNode,
  jsonParser: SortingFacilityNode,
  apify: ApifyNode,
  bankVault: BankVaultNode,
  artStudio: ArtStudioNode,
  postOffice: PostOfficeNode,
  airport: AirportNode,
  checkpoint: CheckpointNode,
};

const edgeTypes = {
  road: RoadEdge,
  pipe: PipeEdge,
};

// Start empty by default, they will either be loaded or manually added via toolbox
const defaultInitialNodes: Node[] = [];

let id = 0;
const getId = () => `node_${id++}_${Date.now()}`;

// Custom minimap node — renders a fixed-size blip so isometric nodes
// don't appear huge and overlapping in the radar view.
function MinimapBlip({ x, y, width, height, color }: { x: number; y: number; width: number; height: number; color?: string; selected?: boolean; className?: string; style?: React.CSSProperties; }) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  return (
    <rect
      x={cx - 8}
      y={cy - 8}
      width={64}
      height={64}
      rx={2}
      fill={color || '#2a6a2a'}
    />
  );
}

export default function CityCanvas({ cityId }: { cityId?: string }) {
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

      let data, error;
      if (cityId) {
        ({ data, error } = await supabase
          .from('workflows')
          .select('*')
          .eq('user_id', user.id)
          .eq('id', cityId)
          .single());
      } else {
        ({ data, error } = await supabase
          .from('workflows')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single());
      }

      if (data && data.graph_json) {
        setNodes(data.graph_json.nodes || []);
        setEdges(data.graph_json.edges || []);
        setWorkflowId(data.id);
      }
    }
    loadWorkflow();
  }, [router, supabase, cityId]);

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert('You must be logged in to save.');
      setIsSaving(false);
      return;
    }

    if (workflowId) {
      // Just update the graph, leave the name alone
      const payload = { graph_json: { nodes, edges } };
      await supabase.from('workflows').update(payload).eq('id', workflowId);
    } else {
      // Fallback for brand new graphs not created via dashboard
      const payload = {
        user_id: user.id,
        name: "My First City",
        graph_json: { nodes, edges }
      };
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
        if (eventData.type === 'output' || eventData.isLastNode) {
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

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'road' }, eds)),
    [setEdges]
  );

  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach((node) => {
        if (node.type === 'documentParser' && node.data?.filePath) {
          fetch('/api/upload', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl: node.data.filePath }),
          }).catch((err) => console.error('Failed to delete associated file:', err));
        }
      });
    },
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
        body: JSON.stringify({ nodes, edges }),
      });

      let resData;
      const rawText = await res.text();
      try {
        resData = JSON.parse(rawText);
      } catch (e) {
        console.error('Failed to parse response as JSON. Raw response:', rawText);
        throw new Error(`Server returned invalid JSON (Status: ${res.status})`);
      }

      if (!res.ok) throw new Error(resData.error || 'Execution failed');
      if (!resData.workflowId) throw new Error('No workflowId returned');

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
              if (eventData.isLastNode) {
                setIsRunning(false);
                eventSource.close();
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
          onNodesDelete={onNodesDelete}
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
          <Panel position="bottom-right" style={{ margin: 0, padding: 0 }}>
            <div
              className="satellite-minimap-wrapper"
              style={{
                border: '2px solid #1a3a1a',
                boxShadow: '4px 4px 0 0 rgba(0,0,0,1)',
                background: '#0a1a0a',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{
                background: '#0d2a0d',
                borderBottom: '2px solid #1a3a1a',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#4ade80' }}>satellite_alt</span>
                <span style={{
                  fontFamily: 'var(--font-code-sm)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#4ade80',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>SATELLITE VIEW</span>
              </div>

              {/* Scanline overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)',
                pointerEvents: 'none',
                zIndex: 10,
              }} />

              <MiniMap
                pannable
                zoomable
                nodeComponent={MinimapBlip}
                nodeColor={(node) => {
                  if (node.data?.isLoading) return '#4ade80';
                  if (node.data?.output) return '#06b6d4';
                  return '#2a6a2a';
                }}
                nodeStrokeWidth={0}
                maskColor="rgba(0,8,0,0.72)"
                style={{
                  background: '#0a1a0a',
                  margin: 0,
                  position: 'relative',
                  display: 'block',
                  width: 200,
                  height: 150,
                }}
              />
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Top right Buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-4 items-center">
        {/* Hardware Slider Toggle */}
        <div 
          className="relative bg-[var(--color-inverse-surface)] inset-input p-1 flex items-center w-80 h-12 cursor-pointer"
          onClick={() => setVisualMode(visualMode === 'roads' ? 'pipes' : 'roads')}
        >
          {/* Sliding Block */}
          <div 
            className={`absolute h-10 w-[calc(50%-4px)] bg-[var(--color-surface)] tactile-button transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              visualMode === 'pipes' ? 'left-[calc(50%+2px)]' : 'left-1'
            }`}
          />
          {/* Labels */}
          <div className="relative z-10 flex w-full h-full text-sm font-bold font-[family-name:var(--font-code-sm)] pointer-events-none select-none">
            <div className={`flex-1 flex items-center justify-center gap-2 transition-colors ${visualMode === 'roads' ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-surface-variant)] opacity-50'}`}>
              <span className="material-symbols-outlined text-[18px]">domain</span>
              <div className="flex flex-col items-start leading-none justify-center">
                <span>City</span>
                <span className="text-[9px] opacity-70 font-normal mt-[2px]">(Animation mode)</span>
              </div>
            </div>
            <div className={`flex-1 flex items-center justify-center gap-2 transition-colors ${visualMode === 'pipes' ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-surface-variant)] opacity-50'}`}>
              <span className="material-symbols-outlined text-[18px]">account_tree</span>
              <div className="flex flex-col items-start leading-none justify-center">
                <span>DataPipeline</span>
                <span className="text-[9px] opacity-70 font-normal mt-[2px]">(Fast Mode)</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 ml-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-12 h-12 flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-on-surface)] hover:bg-[var(--color-tertiary-fixed)] hover:text-[var(--color-on-background)] tactile-button transition-colors disabled:opacity-50 group"
            title="Save Layout"
          >
            {isSaving ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[24px]">save</span>
            )}
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className={`w-12 h-12 flex items-center justify-center tactile-button transition-colors disabled:opacity-50 ${
              isRunning ? 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]' : 'bg-[var(--color-surface)] text-[var(--color-on-surface)] hover:bg-[#06b6d4] hover:text-[var(--color-on-primary)]'
            }`}
            title="Run Pipeline"
          >
            {isRunning ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[24px]">play_arrow</span>
            )}
          </button>
        </div>
        
        <button
          onClick={() => router.push('/dashboard')}
          className="h-12 px-4 flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)] tactile-button transition-colors font-bold font-[family-name:var(--font-code-sm)] text-sm gap-2"
          title="Return to World Dashboard"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          DASHBOARD
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
