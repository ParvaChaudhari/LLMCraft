import { useState, useEffect, useRef } from 'react';
import { buildNodeContext } from '@/lib/buildNodeContext';

const globalModelCache: Record<string, string[]> = {};
const globalCredCache: Record<string, any[]> = {};

const LLM_NODE_TYPES = ['geminiFactory', 'chatgptFactory', 'claudeFactory'];

const getCredentialProvider = (nodeType: string): string | null => {
  if (nodeType === 'geminiFactory') return 'gemini';
  if (nodeType === 'chatgptFactory') return 'openai';
  if (nodeType === 'claudeFactory') return 'anthropic';
  if (nodeType === 'watchtower') return 'tavily';
  if (nodeType === 'dbSilo' || nodeType === 'bankVault') return 'postgres';
  if (nodeType === 'apify') return 'apify';
  return null;
};

const JsonNode = ({ keyName, value, path, onInsert }: any) => {
  const [expanded, setExpanded] = useState(true);
  const isObject = value !== null && typeof value === 'object';
  
  if (isObject) {
    return (
      <div className="ml-2 border-l-2 border-[#333] pl-2 my-1 font-mono text-sm">
        <div 
          className="cursor-pointer hover:bg-[#333] inline-block px-1 text-blue-400 font-bold"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '▼' : '▶'} {keyName}
        </div>
        {expanded && (
          <div>
            {Object.entries(value).map(([k, v]) => (
              <JsonNode 
                key={k} 
                keyName={k} 
                value={v} 
                path={path ? `${path}.${k}` : k} 
                onInsert={onInsert} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Primitive value
  return (
    <div className="ml-4 my-1 flex items-start group font-mono text-sm relative pr-10">
      <span className="text-orange-400 font-bold mr-2 whitespace-nowrap">{keyName}:</span>
      <span className="text-green-300 break-words">{String(value)}</span>
      {onInsert && (
        <button 
          onClick={() => onInsert(path)}
          className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 bg-[#4af626] text-black text-xs font-bold px-2 rounded-sm hover:bg-[#3ade1d] transition-opacity"
          title="Insert Variable"
        >
          +
        </button>
      )}
    </div>
  );
};

const toolAssets: Record<string, string> = {
  webhook: 'webhook_tower.png',
  httpRequest: 'http_request.png',
  geminiFactory: 'gemini_factory.png',
  chatgptFactory: 'chatgpt_factory.png',
  claudeFactory: 'claude_factory.png',
  conditional: 'conditional_road.png',
  limit: 'limit_toll.png',
  delay: 'delay_stop.png',
  output: 'output_dock.png',
  watchtower: 'watchtower.png',
  customWorkshop: 'custom_workshop.png',
  webScraper: 'print_shop.png',
  documentParser: 'library.png',
  dbSilo: 'db_silo.png',
  apify: 'drone_hub.png',
  bankVault: 'bank-vault.png',
  artStudio: 'art_studio.png',
};

export default function SidePanel({
  selectedNode,
  onClose,
  updateNodeData,
  nodes = [],
  edges = [],
}: {
  selectedNode: any;
  onClose: () => void;
  updateNodeData: (id: string, data: any) => void;
  nodes?: any[];
  edges?: any[];
}) {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [showNewCredForm, setShowNewCredForm] = useState(false);
  const [newCredName, setNewCredName] = useState('');
  const [newCredKey, setNewCredKey] = useState('');
  const [isSavingCred, setIsSavingCred] = useState(false);
  const [activeTabs, setActiveTabs] = useState<string[]>(['input', 'tasks', 'logs']);
  
  const [embeddingCredentials, setEmbeddingCredentials] = useState<any[]>([]);
  
  const [dynamicModels, setDynamicModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isNodeRunning, setIsNodeRunning] = useState(false);
  const [viewAsJson, setViewAsJson] = useState(false);
  const nodeEventSourceRef = useRef<EventSource | null>(null);

  const toggleTab = (tabId: string) => {
    setActiveTabs(prev => {
      if (prev.includes(tabId)) {
        if (prev.length === 1) return prev; // Prevent closing the last tab
        return prev.filter(t => t !== tabId);
      }
      return [...prev, tabId];
    });
  };

  const TabButton = ({ id, label }: { id: string, label: string }) => {
    const isActive = activeTabs.includes(id);
    return (
      <button 
        onClick={() => toggleTab(id)}
        className={`px-6 py-2 font-bold uppercase tracking-widest text-sm border-[4px] border-[#1a1a1a] border-b-0 transition-colors ${
          isActive ? 'bg-[#d8c8b8] text-[#1a1a1a]' : 'bg-[#1a1a1a] text-gray-500 hover:text-gray-300'
        }`}
      >
        {label}
      </button>
    );
  };

  // Fetch credentials when a node that needs them is selected
  useEffect(() => {
    const credType = getCredentialProvider(selectedNode?.type);
    
    if (credType) {
      if (globalCredCache[credType]) {
        setCredentials(globalCredCache[credType]);
      }
      fetch(`/api/credentials?type=${credType}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            globalCredCache[credType] = data;
            setCredentials(data);
          }
        })
        .catch(err => console.error("Failed to fetch credentials:", err));
    }
  }, [selectedNode?.type]);

  // Fetch embedding credentials specifically for Bank Vault
  useEffect(() => {
    if (selectedNode?.type === 'bankVault' || selectedNode?.type === 'artStudio') {
      Promise.all([
        fetch('/api/credentials?type=openai').then(res => res.json()),
        fetch('/api/credentials?type=gemini').then(res => res.json())
      ]).then(([openaiCreds, geminiCreds]) => {
        const o = Array.isArray(openaiCreds) ? openaiCreds : [];
        const g = Array.isArray(geminiCreds) ? geminiCreds : [];
        setEmbeddingCredentials([...o, ...g]);
      }).catch(err => console.error("Failed to fetch embedding credentials:", err));
    }
  }, [selectedNode?.type]);

  const fetchModels = async (credId: string, forceRefresh = false) => {
    if (!forceRefresh && globalModelCache[credId]) {
      setDynamicModels(globalModelCache[credId]);
      return;
    }
    setIsLoadingModels(true);
    setModelsError(null);
    if (!forceRefresh && !dynamicModels.length) setDynamicModels([]);
    try {
      const res = await fetch(`/api/models?credentialId=${credId}`);
      const result = await res.json();
      if (result.error) {
        setModelsError(result.error);
      } else if (result.models) {
        globalModelCache[credId] = result.models;
        setDynamicModels(result.models);
      }
    } catch (err: any) {
      setModelsError(err.message);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const data = selectedNode?.data || {};

  useEffect(() => {
    if (data.credentialId && LLM_NODE_TYPES.includes(selectedNode?.type)) {
      if (data.model && !globalModelCache[data.credentialId]) {
        setDynamicModels([data.model]);
      }
      fetchModels(data.credentialId);
    } else {
      setDynamicModels([]);
      setModelsError(null);
    }
  }, [data.credentialId, selectedNode?.type]);

  if (!selectedNode) return null;

  const handleChange = (key: string, value: any) => {
    updateNodeData(selectedNode.id, { [key]: value });
  };

  const executeNodeStandalone = async () => {
    if (isNodeRunning) return;
    setIsNodeRunning(true);
    // Clear current output and show loader
    updateNodeData(selectedNode.id, { output: undefined, isLoading: true });

    if (nodeEventSourceRef.current) nodeEventSourceRef.current.close();

    // Build context from upstream pinned/previous outputs
    const context = buildNodeContext(selectedNode.id, nodes, edges);

    // Generate workflowId client-side so we can connect SSE BEFORE queuing the job.
    // This prevents a race condition where fast nodes (like Custom Workshop) finish
    // before the EventSource is even connected.
    const workflowId = `node-exec-${Date.now()}`;

    try {
      // 1. Connect SSE FIRST
      const es = new EventSource(`/api/events?workflowId=${workflowId}`);
      nodeEventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { event: eventName, data: eventData } = payload;
          if (eventName === 'NODE_FINISHED' && eventData.nodeId === selectedNode.id) {
            updateNodeData(selectedNode.id, { output: eventData.output, isLoading: false });
            setIsNodeRunning(false);
            es.close();
          }
          if (eventName === 'NODE_FINISHED' && eventData.isLastNode) {
            setIsNodeRunning(false);
            es.close();
          }
        } catch (e) { /* ignore parse errors */ }
      };

      es.onerror = () => {
        setIsNodeRunning(false);
        updateNodeData(selectedNode.id, { isLoading: false });
        es.close();
      };

      // 2. Wait a tick for SSE to connect, THEN queue the job
      await new Promise(r => setTimeout(r, 300));

      const res = await fetch('/api/execute-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: selectedNode.id, nodes, edges, context, workflowId }),
      });

      let resData;
      const rawText = await res.text();
      try {
        resData = JSON.parse(rawText);
      } catch (e) {
        console.error('Failed to parse response as JSON. Raw response:', rawText);
        throw new Error(`Server returned invalid JSON (Status: ${res.status})`);
      }

      if (!res.ok) throw new Error(resData.error || 'Failed to execute node');
    } catch (err) {
      setIsNodeRunning(false);
      updateNodeData(selectedNode.id, { isLoading: false });
    }
  };

  const handleInsertVariable = (path: string) => {
    const templateTag = `{{${path}}}`;
    if (LLM_NODE_TYPES.includes(selectedNode.type) || selectedNode.type === 'artStudio') {
      const currentPrompt = selectedNode.data?.prompt || '';
      handleChange('prompt', currentPrompt + (currentPrompt ? ' ' : '') + templateTag);
    } else if (selectedNode.type === 'httpRequest') {
      const currentBody = selectedNode.data?.body || '';
      handleChange('body', currentBody + (currentBody ? ' ' : '') + templateTag);
    } else if (selectedNode.type === 'conditional') {
      const currentMatch = selectedNode.data?.conditionLhs || '';
      handleChange('conditionLhs', currentMatch + (currentMatch ? ' ' : '') + templateTag);
    } else if (selectedNode.type === 'dbSilo') {
      const currentQuery = selectedNode.data?.query || '';
      handleChange('query', currentQuery + (currentQuery ? ' ' : '') + templateTag);
    }
  };

  const handleCreateCredential = async () => {
    if (!newCredName || !newCredKey) return;
    setIsSavingCred(true);
    try {
      const credType = getCredentialProvider(selectedNode.type);
      if (!credType) return;
      
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCredName, type: credType, apiKey: newCredKey })
      });
      const newCred = await res.json();
      
      if (newCred.id) {
        setCredentials(prev => [newCred, ...prev]);
        handleChange('credentialId', newCred.id); // Auto select it
        setShowNewCredForm(false);
        setNewCredName('');
        setNewCredKey('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingCred(false);
    }
  };


  const assetName = toolAssets[selectedNode.type];

  // Calculate inputs for the 'Input' tab
  const incomingEdges = edges.filter(e => e.target === selectedNode.id);
  const incomingNodes = incomingEdges.map(e => nodes.find(n => n.id === e.source)).filter(Boolean);

  const renderInputSource = (node: any) => {
    let outputData = node.data?.output;
    let parsedJson = null;

    if (outputData) {
      try {
        let cleanData = outputData;
        const match = cleanData.match(/```(?:json)?\n([\s\S]*?)\n```/);
        if (match) cleanData = match[1].trim();
        parsedJson = JSON.parse(cleanData);
      } catch (e) {
        // Not JSON
      }
    }

    if (parsedJson && typeof parsedJson === 'object') {
      return (
        <div className="bg-transparent text-white font-mono text-sm flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {Object.entries(parsedJson).map(([k, v]) => (
            <JsonNode 
              key={k} 
              keyName={k} 
              value={v} 
              path={`${node.id}.${k}`} 
              onInsert={handleInsertVariable} 
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col relative group">
        <textarea 
          readOnly 
          className="flex-1 w-full bg-transparent text-white font-mono text-sm resize-none outline-none pr-4"
          value={outputData || 'No output generated yet.'}
        />
        {outputData && (
           <button 
             onClick={() => handleInsertVariable(node.id)}
             className="absolute top-0 right-4 opacity-0 group-hover:opacity-100 bg-[#4af626] text-black text-xs font-bold px-2 py-1 rounded-sm hover:bg-[#3ade1d] transition-opacity"
             title="Insert Variable"
           >
             + Insert String
           </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-8 pointer-events-auto">
      
      {/* Main Modal Container */}
      <div 
        className="w-[95%] max-w-[1600px] h-[85vh] bg-[#2d2d2d] border-[4px] border-[#1a1a1a] flex flex-col shadow-2xl relative"
        style={{ boxShadow: '8px 8px 0px rgba(0,0,0,0.5)' }}
      >
        
        {/* Header Bar */}
        <div className="h-12 bg-[#1a1a1a] flex justify-between items-center px-4 border-b-[4px] border-[#1a1a1a]">
          <div className="flex items-center space-x-4">
            <span className="text-[#c4b4a4] font-bold tracking-widest uppercase">
              NODE CONFIGURATION // {selectedNode.type}
            </span>
            <div className="flex space-x-2">
              <span className="text-green-500 font-bold text-xs uppercase flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> STATUS: ONLINE
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-red-500 hover:text-red-400 font-bold text-xl px-2 bg-[#2d2d2d] border-2 border-[#1a1a1a]">
            X
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-row overflow-hidden p-4 gap-4 bg-[#3d3d3d]">
          
          {/* LEFT COLUMN (1/4 Width) - Asset Preview */}
          <div className="w-1/4 flex flex-col gap-2">
            <div className="flex-1 bg-[#1a1a1a] border-[4px] border-[#2d2d2d] flex items-center justify-center relative overflow-hidden p-8" style={{
              backgroundImage: 'linear-gradient(rgba(74, 246, 38, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(74, 246, 38, 0.1) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              backgroundPosition: 'center center'
            }}>
              {assetName && (
                <img 
                  src={`/assets/${assetName}`} 
                  alt={selectedNode.type} 
                  className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(74,246,38,0.3)] hover:scale-105 transition-transform"
                />
              )}
            </div>
            
            {/* Building Stats Panel */}
            <div className="h-24 bg-[#1a1a1a] border-[4px] border-[#2d2d2d] p-3 text-[#4af626] font-mono text-sm leading-tight uppercase flex flex-col justify-center">
              <div>BUILDING ID: <span className="text-white">{selectedNode.type.toUpperCase()}-{selectedNode.id.split('_')[1]}</span></div>
              <div>INTEGRITY: <span className="text-white">100%</span></div>
              <div>POWER: <span className="text-white">OPTIMAL</span></div>
            </div>
          </div>

          {/* RIGHT COLUMN (3/4 Width) - Toggleable Tabs */}
          <div className="w-3/4 flex flex-col">
            
            {/* TAB BAR */}
            <div className="flex gap-2 px-4">
              <TabButton id="input" label="Input" />
              <TabButton id="tasks" label="Tasks" />
              <TabButton id="logs" label="Logs" />
            </div>

            {/* UNIFIED CONTAINER */}
            <div className="flex-1 bg-[#d8c8b8] border-[4px] border-[#1a1a1a] flex flex-row overflow-hidden relative">
              
              {/* COLUMN 1: INPUT */}
              {activeTabs.includes('input') && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="bg-[#1a1a1a] border-b-[4px] border-[#1a1a1a] py-3 text-center">
                    <h3 className="text-[#c4b4a4] font-bold uppercase tracking-widest">Input</h3>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {incomingNodes.length === 0 ? (
                      <div className="text-gray-500 italic h-full flex items-center justify-center text-center">
                        No incoming connections.
                      </div>
                    ) : (
                      <div className="space-y-4 h-full flex flex-col">
                        {incomingNodes.map((node: any) => (
                          <div key={node.id} className="bg-[#1a1a1a] p-4 pr-0 border-[3px] border-[#2d2d2d] flex-1 flex flex-col">
                            <div className="text-[#4af626] font-bold text-xs uppercase mb-2 mr-4 flex justify-between">
                              <span>SOURCE: {node.type}</span>
                            </div>
                            {renderInputSource(node)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COLUMN 2: TASKS (Configuration) */}
              {activeTabs.includes('tasks') && (
                <div className={`flex-1 flex flex-col overflow-hidden ${activeTabs.includes('input') ? 'border-l-[4px] border-[#1a1a1a]' : ''}`}>
                  <div className="bg-[#1a1a1a] border-b-[4px] border-[#1a1a1a] py-3 text-center">
                    <h3 className="text-[#c4b4a4] font-bold uppercase tracking-widest">Tasks</h3>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-6">
                    {[...LLM_NODE_TYPES, 'watchtower', 'dbSilo', 'apify', 'bankVault'].includes(selectedNode.type) && (
                      <>
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">
                            {selectedNode.type === 'bankVault' ? 'Database Credential (Postgres)' : 'Authentication Credential'}
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={data.credentialId || ''}
                              onChange={(e) => handleChange('credentialId', e.target.value)}
                              className="flex-1 bg-[#1a1a1a] text-[#4af626] p-3 border-[3px] border-[#2d2d2d] outline-none font-bold"
                            >
                              <option value="">-- Select Credential --</option>
                              {credentials.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>

                            <button 
                              onClick={() => setShowNewCredForm(!showNewCredForm)}
                              className="bg-[#2d2d2d] hover:bg-[#1a1a1a] text-[#4af626] border-[3px] border-[#2d2d2d] px-4 font-bold text-xl transition-colors"
                            >
                              {showNewCredForm ? '-' : '+'}
                            </button>
                          </div>
                          
                          {showNewCredForm && (
                            <div className="mt-2 p-4 bg-[#1a1a1a] border-[3px] border-[#2d2d2d] space-y-4">
                              <h4 className="text-[#c4b4a4] font-bold text-xs uppercase tracking-widest border-b border-[#333] pb-2">Create New Credential</h4>
                              <div>
                                <label className="block text-xs font-bold mb-1 text-gray-400">Credential Name</label>
                                <input
                                  type="text"
                                  value={newCredName}
                                  onChange={(e) => setNewCredName(e.target.value)}
                                  placeholder="e.g. My Personal API Key"
                                  autoComplete="off"
                                  className="w-full bg-[#2d2d2d] text-white p-2 border-2 border-[#333] outline-none font-mono text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold mb-1 text-gray-400">
                                  {getCredentialProvider(selectedNode.type) === 'postgres' ? 'Connection String' : 'API Key'}
                                </label>
                                <input
                                  type="password"
                                  value={newCredKey}
                                  onChange={(e) => setNewCredKey(e.target.value)}
                                  placeholder={getCredentialProvider(selectedNode.type) === 'postgres' ? "postgresql://user:password@host/db" : "sk-..."}
                                  autoComplete="new-password"
                                  className="w-full bg-[#2d2d2d] text-white p-2 border-2 border-[#333] outline-none font-mono text-sm"
                                />
                              </div>
                              <button
                                onClick={handleCreateCredential}
                                disabled={!newCredName || !newCredKey || isSavingCred}
                                className="w-full bg-[#4af626] hover:bg-[#3ade1d] text-black font-bold py-2 px-4 uppercase tracking-wider disabled:opacity-50"
                              >
                                {isSavingCred ? 'Saving...' : 'Save & Select'}
                              </button>
                            </div>
                          )}
                        </div>
                        {LLM_NODE_TYPES.includes(selectedNode.type) && (
                          <>
                            <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a] flex justify-between items-center">
                            <span>AI Model Version</span>
                            {LLM_NODE_TYPES.includes(selectedNode.type) && data.credentialId && (
                               <button 
                                 onClick={() => fetchModels(data.credentialId, true)}
                                 className="text-black hover:text-gray-700 transition-colors"
                                 title="Reload Models"
                               >
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
                               </button>
                            )}
                          </label>
                          {isLoadingModels ? (
                             <div className="w-full bg-[#1a1a1a] text-[#4af626] p-3 border-[3px] border-[#2d2d2d] font-bold animate-pulse text-sm">Fetching live models...</div>
                          ) : modelsError === 'Credential not found' || !data.credentialId ? (
                             <div className="w-full bg-[#1a1a1a] text-gray-500 p-3 border-[3px] border-[#2d2d2d] font-mono text-sm">
                               Select a valid credential to load models.
                             </div>
                          ) : modelsError ? (
                             <div className="w-full bg-[#1a1a1a] text-red-500 p-3 border-[3px] border-red-900 font-bold text-sm">
                               Error: {modelsError}
                             </div>
                          ) : (
                            <select
                              value={data.model || ''}
                              onChange={(e) => handleChange('model', e.target.value)}
                              className="w-full bg-[#1a1a1a] text-[#4af626] p-3 border-[3px] border-[#2d2d2d] outline-none font-bold"
                            >
                              <option value="">-- Select Model --</option>
                              {LLM_NODE_TYPES.includes(selectedNode.type) && (
                                dynamicModels.map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))
                              )}
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Instruction Prompt</label>
                          <textarea
                            value={data.prompt || ''}
                            onChange={(e) => handleChange('prompt', e.target.value)}
                            className="w-full h-32 bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm resize-y"
                            placeholder="Summarize this: {{lastOutput}}"
                          />
                        </div>
                      </>
                    )}
                      </>
                    )}

                    {selectedNode.type === 'httpRequest' && (
                      <>
                        <div className="flex gap-4">
                          <div className="w-1/4">
                            <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a] whitespace-nowrap">Method</label>
                            <select
                              value={data.method || 'GET'}
                              onChange={(e) => handleChange('method', e.target.value)}
                              className="w-full bg-[#1a1a1a] text-[#4af626] p-3 border-[3px] border-[#2d2d2d] outline-none font-bold"
                            >
                              <option value="GET">GET</option>
                              <option value="POST">POST</option>
                              <option value="PUT">PUT</option>
                              <option value="DELETE">DELETE</option>
                            </select>
                          </div>
                          <div className="w-3/4">
                            <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a] whitespace-nowrap">Target URL</label>
                            <input
                              type="text"
                              value={data.url || ''}
                              onChange={(e) => handleChange('url', e.target.value)}
                              className="w-full bg-[#1a1a1a] text-[#4af626] p-3 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm"
                              placeholder="https://api.example.com/data"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Headers (JSON)</label>
                          <textarea
                            value={data.headers || ''}
                            onChange={(e) => handleChange('headers', e.target.value)}
                            className="w-full h-20 bg-[#1a1a1a] text-[#4af626] p-3 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm resize-y"
                            placeholder='{"Content-Type": "application/json"}'
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Request Body (JSON)</label>
                          <textarea
                            value={data.body || ''}
                            onChange={(e) => handleChange('body', e.target.value)}
                            className="w-full h-32 bg-[#1a1a1a] text-[#4af626] p-3 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm resize-y"
                            placeholder='{"data": "{{previous_node.value}}"}'
                          />
                        </div>
                      </>
                    )}

                    {selectedNode.type === 'watchtower' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Search Query</label>
                          <input
                            type="text"
                            value={data.query || ''}
                            onChange={(e) => handleChange('query', e.target.value)}
                            className="w-full bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm"
                            placeholder="{{webhook.query}} or 'latest news'"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'dbSilo' && (
                      <div className="space-y-2">
                        <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">SQL Query (Supports {"{{"}variable{"}}"} interpolation)</label>
                        <textarea
                          value={data.query || ''}
                          onChange={(e) => handleChange('query', e.target.value)}
                          className="w-full h-32 p-4 bg-[#1a1a1a] border-[3px] border-[#2d2d2d] text-[#4af626] font-mono text-sm resize-y outline-none"
                          placeholder="SELECT * FROM users WHERE email = '{{lastOutput}}';"
                        />
                      </div>
                    )}

                    {selectedNode.type === 'jsonParser' && (
                      <div className="space-y-4">
                      </div>
                    )}

                    {selectedNode.type === 'apify' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Actor ID</label>
                          <input
                            type="text"
                            value={data.actorId || ''}
                            onChange={(e) => handleChange('actorId', e.target.value)}
                            className="w-full p-3 bg-[#1a1a1a] border-[3px] border-[#2d2d2d] text-[#4af626] font-mono outline-none"
                            placeholder="e.g. apify/instagram-scraper"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">JSON Input Payload</label>
                          <textarea
                            value={data.payload || ''}
                            onChange={(e) => handleChange('payload', e.target.value)}
                            className="w-full h-40 p-3 bg-[#1a1a1a] border-[3px] border-[#2d2d2d] text-[#4af626] font-mono text-sm resize-y outline-none"
                            placeholder='{&#10;  "searchTerms": ["{{lastOutput}}"]&#10;}'
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'bankVault' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Embedding Credential (AI Provider)</label>
                          <select
                            value={data.embeddingCredentialId || ''}
                            onChange={(e) => handleChange('embeddingCredentialId', e.target.value)}
                            className="w-full bg-[#1a1a1a] text-[#4af626] p-3 border-[3px] border-[#2d2d2d] outline-none font-bold"
                          >
                            <option value="">-- Select Embedding Credential --</option>
                            {embeddingCredentials.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Mode</label>
                          <div className="flex border-[3px] border-[#2d2d2d] bg-[#1a1a1a]">
                            <button
                              onClick={() => handleChange('mode', 'save')}
                              className={`flex-1 p-3 text-xs font-bold uppercase transition-colors ${(!data.mode || data.mode === 'save') ? 'bg-[#4af626] text-black' : 'text-gray-400 hover:text-[#4af626]'}`}
                            >
                              Save (Upsert)
                            </button>
                            <button
                              onClick={() => handleChange('mode', 'search')}
                              className={`flex-1 p-3 text-xs font-bold uppercase transition-colors ${(data.mode === 'search') ? 'bg-[#4af626] text-black' : 'text-gray-400 hover:text-[#4af626]'}`}
                            >
                              Search (RAG)
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Table Name</label>
                          <input
                            type="text"
                            value={data.tableName || ''}
                            onChange={(e) => handleChange('tableName', e.target.value)}
                            className="w-full bg-[#1a1a1a] text-[#4af626] p-3 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm"
                            placeholder="documents"
                          />
                        </div>

                        {data.mode === 'search' && (
                          <div>
                            <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Match Count Limit</label>
                            <input
                              type="number"
                              value={data.matchCount || 3}
                              onChange={(e) => handleChange('matchCount', parseInt(e.target.value))}
                              className="w-full bg-[#1a1a1a] text-[#4af626] p-3 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm"
                              placeholder="3"
                              min="1"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {selectedNode.type === 'artStudio' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">API Credential</label>
                          <select
                            value={data.credentialId || ''}
                            onChange={(e) => handleChange('credentialId', e.target.value)}
                            className="w-full bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-bold"
                          >
                            <option value="">-- Select Credential --</option>
                            {embeddingCredentials.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Model Version</label>
                          <select
                            value={data.model || ''}
                            onChange={(e) => handleChange('model', e.target.value)}
                            className="w-full bg-[#1a1a1a] text-[#4af626] p-3 border-[3px] border-[#2d2d2d] outline-none font-bold"
                          >
                            <option value="">-- Select Model --</option>
                            <option value="dall-e-3">DALL-E 3 (Requires OpenAI Key)</option>
                            <option value="gpt-image-2">GPT Image 2 (Requires OpenAI Key)</option>
                            <option value="chatgpt-image-latest">ChatGPT Image Latest (Requires OpenAI Key)</option>
                            <option value="gemini-3-pro-image">Nano Banana Pro (Requires Gemini Key)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Image Prompt</label>
                          <textarea
                            value={data.prompt || ''}
                            onChange={(e) => handleChange('prompt', e.target.value)}
                            className="w-full h-32 bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm resize-y"
                            placeholder="An isometric building based on: {{lastOutput}}"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'customWorkshop' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">JavaScript Code</label>
                          <textarea
                            value={data.code !== undefined ? data.code : 'return context.lastOutput;'}
                            onChange={(e) => handleChange('code', e.target.value)}
                            className="w-full h-48 bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm resize-y"
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'webScraper' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Target URL</label>
                          <input
                            type="text"
                            value={data.url || ''}
                            onChange={(e) => handleChange('url', e.target.value)}
                            className="w-full bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm"
                            placeholder="https://example.com or {{webhook.url}}"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'documentParser' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Document File</label>
                          <div className="relative">
                            <input
                              type="file"
                              accept=".pdf,.csv,.txt"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  updateNodeData(selectedNode.id, { isUploading: true, uploadError: null });
                                  
                                  // Clean up old file if it exists
                                  if (data.filePath) {
                                    await fetch('/api/upload', {
                                      method: 'DELETE',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ fileUrl: data.filePath }),
                                    }).catch((err) => console.error('Failed to delete old file:', err));
                                  }

                                  const formData = new FormData();
                                  formData.append('file', file);
                                  const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                  if (!res.ok) throw new Error('Upload failed');
                                  const json = await res.json();
                                  updateNodeData(selectedNode.id, { filePath: json.filePath, fileName: json.fileName, isUploading: false });
                                } catch (err: any) {
                                  updateNodeData(selectedNode.id, { uploadError: err.message, isUploading: false });
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-full bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] text-center font-bold uppercase transition-colors hover:bg-[#2d2d2d] flex items-center justify-center gap-2">
                              {data.isUploading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-[#4af626] border-t-transparent rounded-full animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                'Choose File'
                              )}
                            </div>
                          </div>
                          {data.fileName && (
                            <div className="mt-2 text-xs font-bold text-[#1a1a1a] bg-[#d8c8b8] p-2 border-[2px] border-[#2d2d2d] truncate">
                              Selected: {data.fileName}
                            </div>
                          )}
                          {data.uploadError && (
                            <div className="mt-2 text-xs font-bold text-red-500">
                              {data.uploadError}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'delay' && (
                      <div>
                        <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Wait Duration (ms)</label>
                        <input
                          type="number"
                          value={data.delayMs || 5000}
                          onChange={(e) => handleChange('delayMs', parseInt(e.target.value))}
                          className="w-full bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm"
                          placeholder="5000"
                        />
                      </div>
                    )}

                    {selectedNode.type === 'conditional' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Condition Variable</label>
                          <input
                            type="text"
                            value={data.conditionLhs ?? '{{lastOutput}}'}
                            onChange={(e) => handleChange('conditionLhs', e.target.value)}
                            className="w-full bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm"
                            placeholder="{{lastOutput}}"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Operator</label>
                          <select
                            value={data.conditionOperator || 'contains'}
                            onChange={(e) => handleChange('conditionOperator', e.target.value)}
                            className="w-full bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-bold"
                          >
                            <option value="contains">Contains</option>
                            <option value="is_equal_to">Is Equal To</option>
                            <option value="is_not_equal_to">Is Not Equal To</option>
                            <option value="greater_than">Is Greater Than</option>
                            <option value="less_than">Is Less Than</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Compare Value</label>
                          <input
                            type="text"
                            value={data.conditionRhs ?? 'error'}
                            onChange={(e) => handleChange('conditionRhs', e.target.value)}
                            className="w-full bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm"
                            placeholder="error"
                          />
                        </div>
                      </div>
                    )}
                    
                    {selectedNode.type === 'limit' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Max Items / Passes</label>
                          <input
                            type="number"
                            value={data.maxItems || 1}
                            onChange={(e) => handleChange('maxItems', parseInt(e.target.value))}
                            className="w-full bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm"
                            placeholder="1"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Keep</label>
                          <select
                            disabled
                            value="first_items"
                            className="w-full bg-[#1a1a1a] text-gray-500 p-4 border-[3px] border-[#2d2d2d] outline-none font-bold opacity-50 cursor-not-allowed"
                          >
                            <option value="first_items">First Items</option>
                          </select>
                        </div>
                      </div>
                    )}
                    
                    {selectedNode.type === 'webhook' && (
                      <div className="bg-[#1a1a1a] p-6 border-[3px] border-[#2d2d2d] text-center text-[#4af626] font-mono">
                        <div className="animate-pulse">● LISTENING FOR TRIGGER</div>
                      </div>
                    )}

                    {/* Standalone Execute Button */}
                    {['geminiFactory', 'chatgptFactory', 'claudeFactory', 'httpRequest', 'watchtower', 'customWorkshop', 'webScraper', 'documentParser', 'dbSilo', 'jsonParser', 'apify', 'bankVault', 'artStudio'].includes(selectedNode.type) && (
                      <div className="pt-4 border-t-2 border-[#1a1a1a] mt-4">
                        <button
                          onClick={executeNodeStandalone}
                          disabled={isNodeRunning}
                          className={`w-full py-3 font-bold text-sm uppercase tracking-widest border-[3px] transition-colors flex items-center justify-center gap-2 ${
                            isNodeRunning
                              ? 'bg-[#1a1a1a] text-gray-500 border-[#2d2d2d] cursor-not-allowed'
                              : 'bg-[#4af626] hover:bg-[#3ade1d] text-black border-[#3ade1d] hover:border-[#2ac514]'
                          }`}
                        >
                          {isNodeRunning ? (
                            <>
                              <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                              Running...
                            </>
                          ) : (
                            <> ▶ Execute Node </>
                          )}
                        </button>
                      </div>
                    )}

                    {selectedNode.type === 'output' && (
                      <div className="bg-[#1a1a1a] p-6 border-[3px] border-[#2d2d2d] text-center text-[#4af626] font-mono">
                        <div className="text-orange-500 font-bold">» END OF LINE «</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COLUMN 3: LOGS */}
              {activeTabs.includes('logs') && (
                <div className={`flex-1 flex flex-col overflow-hidden ${(activeTabs.includes('input') || activeTabs.includes('tasks')) ? 'border-l-[4px] border-[#1a1a1a]' : ''}`}>
                  <div className="bg-[#1a1a1a] border-b-[4px] border-[#1a1a1a] py-3 text-center">
                    <h3 className="text-[#c4b4a4] font-bold uppercase tracking-widest">Logs</h3>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto">
                    <div className="h-full bg-[#1a1a1a] border-[4px] border-[#2d2d2d] p-4 pr-0 flex flex-col relative">
                      <div className="text-[#4af626] font-bold text-xs uppercase mb-2 border-b border-[#333] pb-2 mr-4 flex justify-between items-center">
                        <span>SYSTEM OUTPUT</span>
                        <div className="flex items-center gap-4">
                          {data.output && (
                            <button
                              onClick={() => setViewAsJson(!viewAsJson)}
                              className={`px-3 py-1 text-[10px] font-bold border-2 transition-colors ${
                                viewAsJson 
                                  ? 'bg-[#4af626] text-black border-[#4af626]' 
                                  : 'bg-transparent text-gray-400 border-gray-600 hover:text-white hover:border-gray-400'
                              }`}
                            >
                              JSON
                            </button>
                          )}
                          <span className="text-gray-500">READY</span>
                        </div>
                      </div>
                      {data.output ? (
                        viewAsJson ? (() => {
                          let parsedJson = null;
                          try {
                            let cleanData = data.output;
                            const match = cleanData.match(/```(?:json)?\n([\s\S]*?)\n```/);
                            if (match) cleanData = match[1].trim();
                            parsedJson = JSON.parse(cleanData);
                          } catch (e) {
                            // Invalid JSON
                          }
                          
                          if (parsedJson && typeof parsedJson === 'object') {
                            return (
                              <div className="bg-transparent text-white font-mono text-sm flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {Object.entries(parsedJson).map(([k, v]) => (
                                  <JsonNode 
                                    key={k} 
                                    keyName={k} 
                                    value={v} 
                                    path={k} 
                                  />
                                ))}
                              </div>
                            );
                          } else {
                            return (
                              <div className="flex-1 flex items-center justify-center flex-col text-red-500 font-mono text-sm">
                                <div>Invalid JSON Format</div>
                                <button onClick={() => setViewAsJson(false)} className="mt-2 text-gray-400 underline hover:text-white">Return to RAW text</button>
                              </div>
                            );
                          }
                        })() : (
                          data.output.includes('[IMAGE GENERATED]') ? (() => {
                            const match = data.output.match(/URL\/Data:\s*(.*)/);
                            const imgUrl = match ? match[1].trim() : '';
                            return (
                              <div className="flex-1 w-full overflow-y-auto flex flex-col items-center custom-scrollbar">
                                <img src={imgUrl} alt="Generated" className="max-w-full rounded-md border-[4px] border-[#2d2d2d]" />
                              </div>
                            );
                          })() : (
                            <textarea 
                              readOnly 
                              className="flex-1 w-full bg-transparent text-white font-mono text-sm resize-none outline-none pr-4 custom-scrollbar"
                              value={data.output}
                            />
                          )
                        )
                      ) : (
                        <div className="flex-1 flex items-center justify-center flex-col text-gray-600 font-mono text-sm">
                          <div className="animate-bounce mb-2">_</div>
                          Waiting for execution...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
