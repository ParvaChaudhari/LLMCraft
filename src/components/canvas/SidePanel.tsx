import { useState } from 'react';

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
  if (!selectedNode) return null;

  const handleChange = (key: string, value: any) => {
    updateNodeData(selectedNode.id, { [key]: value });
  };

  const data = selectedNode.data || {};
  const assetName = toolAssets[selectedNode.type];

  // Calculate inputs for the 'Input' tab
  const incomingEdges = edges.filter(e => e.target === selectedNode.id);
  const incomingNodes = incomingEdges.map(e => nodes.find(n => n.id === e.source)).filter(Boolean);

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
                  <div className="space-y-4">
                    {incomingNodes.map((node: any) => (
                      <div key={node.id} className="bg-[#1a1a1a] p-4 border-[3px] border-[#2d2d2d]">
                        <div className="text-[#4af626] font-bold text-xs uppercase mb-2">SOURCE: {node.type}</div>
                        <textarea 
                          readOnly 
                          className="w-full h-32 bg-transparent text-white font-mono text-sm resize-none outline-none"
                          value={node.data?.output || 'No output generated yet.'}
                        />
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
                        className="w-full h-48 bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm resize-y"
                        placeholder="Summarize this: {{lastOutput}}"
                      />
                    </div>
                  </>
                )}

                {selectedNode.type === 'httpRequest' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Request Method</label>
                      <select
                        value={data.method || 'GET'}
                        onChange={(e) => handleChange('method', e.target.value)}
                        className="w-full bg-[#1a1a1a] text-[#4af626] p-3 border-[3px] border-[#2d2d2d] outline-none font-bold"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2 uppercase text-[#1a1a1a]">Target URL</label>
                      <input
                        type="text"
                        value={data.url || ''}
                        onChange={(e) => handleChange('url', e.target.value)}
                        className="w-full bg-[#1a1a1a] text-[#4af626] p-4 border-[3px] border-[#2d2d2d] outline-none font-mono text-sm"
                        placeholder="https://api.example.com/data"
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
                <div className="h-full bg-[#1a1a1a] border-[4px] border-[#2d2d2d] p-4 flex flex-col">
                  <div className="text-[#4af626] font-bold text-xs uppercase mb-2 border-b border-[#333] pb-2 flex justify-between">
                    <span>SYSTEM OUTPUT</span>
                    <span className="text-gray-500">READY</span>
                  </div>
                  {data.output ? (
                    <textarea 
                      readOnly 
                      className="flex-1 w-full bg-transparent text-white font-mono text-sm resize-none outline-none"
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
