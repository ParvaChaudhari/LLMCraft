import { useState, useEffect } from 'react';

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
      <span className="text-green-300 break-all">{String(value)}</span>
      <button 
        onClick={() => onInsert(path)}
        className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 bg-[#4af626] text-black text-xs font-bold px-2 rounded-sm hover:bg-[#3ade1d] transition-opacity"
        title="Insert Variable"
      >
        +
      </button>
    </div>
  );
};

const toolAssets: Record<string, string> = {
  webhook: 'webhook_tower.png',
  httpRequest: 'http_request.png',
  geminiFactory: 'gemini_factory.png',
  conditional: 'conditional_gate.png',
  delay: 'delay_stop.png',
  output: 'output_dock.png'
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

  // Fetch credentials when a node that needs them is selected
  useEffect(() => {
    if (selectedNode?.type === 'geminiFactory') {
      fetch(`/api/credentials?type=gemini`)
        .then(res => res.json())
        .then(data => setCredentials(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [selectedNode?.type]);

  if (!selectedNode) return null;

  const handleChange = (key: string, value: any) => {
    updateNodeData(selectedNode.id, { [key]: value });
  };

  const handleInsertVariable = (path: string) => {
    const templateTag = `{{${path}}}`;
    if (selectedNode.type === 'geminiFactory') {
      const currentPrompt = selectedNode.data?.prompt || '';
      handleChange('prompt', currentPrompt + (currentPrompt ? ' ' : '') + templateTag);
    } else if (selectedNode.type === 'httpRequest') {
      const currentBody = selectedNode.data?.body || '';
      handleChange('body', currentBody + (currentBody ? ' ' : '') + templateTag);
    } else if (selectedNode.type === 'conditional') {
      const currentMatch = selectedNode.data?.matchText || '';
      handleChange('matchText', currentMatch + (currentMatch ? ' ' : '') + templateTag);
    }
  };

  const handleCreateCredential = async () => {
    if (!newCredName || !newCredKey) return;
    setIsSavingCred(true);
    try {
      // The node type dictates the credential type
      let credType = '';
      if (selectedNode.type === 'geminiFactory') credType = 'gemini';
      
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

  const data = selectedNode.data || {};
  const assetName = toolAssets[selectedNode.type];

  // Calculate inputs for the 'Input' tab
  const incomingEdges = edges.filter(e => e.target === selectedNode.id);
  const incomingNodes = incomingEdges.map(e => nodes.find(n => n.id === e.source)).filter(Boolean);

  const renderInputSource = (node: any) => {
    let outputData = node.data?.output;
    let parsedJson = null;

    if (outputData) {
      try {
        parsedJson = JSON.parse(outputData);
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

          {/* RIGHT COLUMN (3/4 Width) - 3 Columns (Input, Tasks, Logs) */}
          <div className="w-3/4 flex flex-row gap-4">
            
            {/* COLUMN 1: INPUT */}
            <div className="flex-1 bg-[#d8c8b8] border-[4px] border-[#1a1a1a] flex flex-col overflow-hidden">
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

            {/* COLUMN 2: TASKS (Configuration) */}
            <div className="flex-1 bg-[#d8c8b8] border-[4px] border-[#1a1a1a] flex flex-col overflow-hidden">
              <div className="bg-[#1a1a1a] border-b-[4px] border-[#1a1a1a] py-3 text-center">
                <h3 className="text-[#c4b4a4] font-bold uppercase tracking-widest">Tasks</h3>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-6">
                {selectedNode.type === 'geminiFactory' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Authentication Credential</label>
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
                              placeholder="e.g. My Personal Gemini Key"
                              className="w-full bg-[#2d2d2d] text-white p-2 border-2 border-[#333] outline-none font-mono text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1 text-gray-400">API Key</label>
                            <input
                              type="password"
                              value={newCredKey}
                              onChange={(e) => setNewCredKey(e.target.value)}
                              placeholder="AIzaSy..."
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
                    <div>
                      <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">AI Model Version</label>
                      <select
                        value={data.model || 'gemini-3.1-flash-lite'}
                        onChange={(e) => handleChange('model', e.target.value)}
                        className="w-full bg-[#1a1a1a] text-[#4af626] p-3 border-[3px] border-[#2d2d2d] outline-none font-bold"
                      >
                        <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                      </select>
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
                  <div>
                    <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Route to False If Output Contains:</label>
                    <input
                      type="text"
                      value={data.matchText || 'error'}
                      onChange={(e) => handleChange('matchText', e.target.value)}
                      className="w-full bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm"
                      placeholder="error"
                    />
                  </div>
                )}
                
                {selectedNode.type === 'webhook' && (
                  <div className="bg-[#1a1a1a] p-6 border-[3px] border-[#2d2d2d] text-center text-[#4af626] font-mono">
                    <div className="animate-pulse mb-2">● LISTENING FOR TRIGGER</div>
                    The Webhook acts as the starting trigger. No configuration is required.
                  </div>
                )}

                {selectedNode.type === 'output' && (
                  <div className="bg-[#1a1a1a] p-6 border-[3px] border-[#2d2d2d] text-center text-[#4af626] font-mono">
                    <div className="mb-2 text-orange-500 font-bold">» END OF LINE «</div>
                    The Output node marks the final destination of the workflow. Check the LOGS to see the final output!
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 3: LOGS */}
            <div className="flex-1 bg-[#d8c8b8] border-[4px] border-[#1a1a1a] flex flex-col overflow-hidden">
              <div className="bg-[#1a1a1a] border-b-[4px] border-[#1a1a1a] py-3 text-center">
                <h3 className="text-[#c4b4a4] font-bold uppercase tracking-widest">Logs</h3>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="h-full bg-[#1a1a1a] border-[4px] border-[#2d2d2d] p-4 pr-0 flex flex-col">
                  <div className="text-[#4af626] font-bold text-xs uppercase mb-2 border-b border-[#333] pb-2 mr-4 flex justify-between">
                    <span>SYSTEM OUTPUT</span>
                    <span className="text-gray-500">READY</span>
                  </div>
                  {data.output ? (
                    <textarea 
                      readOnly 
                      className="flex-1 w-full bg-transparent text-white font-mono text-sm resize-none outline-none pr-4"
                      value={data.output}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center flex-col text-gray-600 font-mono text-sm">
                      <div className="animate-bounce mb-2">_</div>
                      Waiting for execution...
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
