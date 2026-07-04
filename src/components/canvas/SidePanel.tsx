export default function SidePanel({
  selectedNode,
  onClose,
  updateNodeData,
}: {
  selectedNode: any;
  onClose: () => void;
  updateNodeData: (id: string, data: any) => void;
}) {
  if (!selectedNode) return null;

  const handleChange = (key: string, value: any) => {
    updateNodeData(selectedNode.id, { [key]: value });
  };

  const data = selectedNode.data || {};

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-[#d8c8b8] border-l-[4px] border-[#2d2d2d] z-20 overflow-y-auto">
      <div className="p-4 border-b-[4px] border-[#2d2d2d] flex justify-between items-center bg-[#c4b4a4]">
        <h2 className="text-xl font-bold text-[#2d2d2d] uppercase tracking-widest">Terminal</h2>
        <button onClick={onClose} className="text-[#2d2d2d] hover:text-black font-bold text-xl">
          [X]
        </button>
      </div>

      <div className="p-4 space-y-6 text-[#2d2d2d]">
        <div>
          <label className="block text-sm font-bold mb-1 uppercase">Block ID</label>
          <div className="bg-[#1e1e1e] text-[#4af626] p-2 border-2 border-[#2d2d2d] text-sm break-all">
            {selectedNode.id}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1 uppercase">Block Type</label>
          <div className="bg-[#1e1e1e] text-[#4af626] p-2 border-2 border-[#2d2d2d] text-sm capitalize">
            {selectedNode.type}
          </div>
        </div>

        <div className="pt-4 border-t border-[#2d2d2d] space-y-4">
          {selectedNode.type === 'geminiFactory' && (
            <>
              <div>
                <label className="block text-sm font-bold mb-1 uppercase">Model</label>
                <select
                  value={data.model || 'gemini-3.1-flash-lite'}
                  onChange={(e) => handleChange('model', e.target.value)}
                  className="w-full bg-[#1e1e1e] text-[#4af626] p-2 border-2 border-[#2d2d2d] outline-none"
                >
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 uppercase">Prompt</label>
                <textarea
                  value={data.prompt || ''}
                  onChange={(e) => handleChange('prompt', e.target.value)}
                  className="w-full h-32 bg-[#1e1e1e] text-[#4af626] p-2 border-2 border-[#2d2d2d] outline-none font-mono text-sm resize-y"
                  placeholder="Summarize this: {{lastOutput}}"
                />
              </div>
            </>
          )}

          {selectedNode.type === 'httpRequest' && (
            <>
              <div>
                <label className="block text-sm font-bold mb-1 uppercase">Method</label>
                <select
                  value={data.method || 'GET'}
                  onChange={(e) => handleChange('method', e.target.value)}
                  className="w-full bg-[#1e1e1e] text-[#4af626] p-2 border-2 border-[#2d2d2d] outline-none"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 uppercase">URL</label>
                <input
                  type="text"
                  value={data.url || ''}
                  onChange={(e) => handleChange('url', e.target.value)}
                  className="w-full bg-[#1e1e1e] text-[#4af626] p-2 border-2 border-[#2d2d2d] outline-none font-mono text-sm"
                  placeholder="https://api.example.com/data"
                />
              </div>
            </>
          )}

          {selectedNode.type === 'delay' && (
            <div>
              <label className="block text-sm font-bold mb-1 uppercase">Wait Time (ms)</label>
              <input
                type="number"
                value={data.delayMs || 5000}
                onChange={(e) => handleChange('delayMs', parseInt(e.target.value))}
                className="w-full bg-[#1e1e1e] text-[#4af626] p-2 border-2 border-[#2d2d2d] outline-none font-mono text-sm"
                placeholder="5000"
              />
            </div>
          )}

          {selectedNode.type === 'conditional' && (
            <div>
              <label className="block text-sm font-bold mb-1 uppercase">Go False If Output Contains:</label>
              <input
                type="text"
                value={data.matchText || 'error'}
                onChange={(e) => handleChange('matchText', e.target.value)}
                className="w-full bg-[#1e1e1e] text-[#4af626] p-2 border-2 border-[#2d2d2d] outline-none font-mono text-sm"
                placeholder="error"
              />
            </div>
          )}
          
          {selectedNode.type === 'webhook' && (
            <div className="text-sm italic opacity-75">
              The Webhook node acts as the starting trigger. No configuration needed.
            </div>
          )}

          {selectedNode.type === 'output' && (
            <div className="space-y-4">
              <div className="text-sm italic opacity-75">
                The Output node marks the end of the workflow. Data arriving here will be displayed.
              </div>
              {data.output && (
                <div>
                  <label className="block text-sm font-bold mb-1 uppercase">Received Data</label>
                  <textarea
                    readOnly
                    value={data.output}
                    className="w-full h-48 bg-[#1e1e1e] text-[#4af626] p-2 border-2 border-[#2d2d2d] outline-none font-mono text-xs resize-y"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
