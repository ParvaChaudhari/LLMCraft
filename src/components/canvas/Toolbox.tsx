import { useState } from 'react';

const toolAssets: Record<string, string> = {
  webhook: 'webhook_tower.png',
  httpRequest: 'http_request.png',
  geminiFactory: 'gemini_factory.png',
  chatgptFactory: 'chatgpt_factory.png',
  claudeFactory: 'claude_factory.png',
  conditional: 'conditional_road.png',
  limit: 'limit_toll.png',
  delay: 'delay_stop.png',
  output: 'output_dock.png'
};

export default function Toolbox({ onOpenSecretManager }: { onOpenSecretManager?: () => void }) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = () => {
    setIsExpanded(false);
    setSelectedTool(null);
  };

  if (!isExpanded) {
    return (
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
        <button 
          onClick={() => setIsExpanded(true)}
          className="bg-[#d8c8b8] text-[#2d2d2d] font-bold text-2xl w-12 h-12 flex items-center justify-center border-[3px] border-[#2d2d2d] hover:bg-[#c4b29f] transition-colors"
          style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)' }}
          title="Open Toolbox"
        >
          +
        </button>
        <button 
          onClick={() => onOpenSecretManager?.()}
          className="bg-[#2d2d2d] text-[#e0e0e0] font-bold text-xl w-12 h-12 flex items-center justify-center border-[3px] border-[#1a1a1a] hover:bg-[#3d3d3d] transition-colors"
          style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)' }}
          title="Open Secret Manager"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-10 flex gap-3">
      {/* Action Buttons Column when expanded */}
      <div className="flex flex-col gap-3">
        <button 
          onClick={() => setIsExpanded(false)}
          className="bg-[#d8c8b8] text-[#2d2d2d] font-bold text-2xl w-12 h-12 flex items-center justify-center border-[3px] border-[#2d2d2d] hover:bg-[#c4b29f] transition-colors"
          style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)' }}
          title="Close Toolbox"
        >
          -
        </button>
        <button 
          onClick={() => onOpenSecretManager?.()}
          className="bg-[#2d2d2d] text-[#e0e0e0] font-bold text-xl w-12 h-12 flex items-center justify-center border-[3px] border-[#1a1a1a] hover:bg-[#3d3d3d] transition-colors"
          style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)' }}
          title="Open Secret Manager"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        </button>
      </div>

      <div className="bg-[#d8c8b8] p-4 w-72 border-[3px] border-[#2d2d2d]" style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)' }}>
        <div className="flex justify-between items-center mb-4 border-b-2 border-[#2d2d2d] pb-2">
          <h3 className="text-lg font-bold text-[#2d2d2d] uppercase tracking-widest">Projects</h3>
        </div>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
        
        <div 
          className="bg-[#2d2d2d] text-[#e0e0e0] border-2 border-[#1a1a1a] px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[#3d3d3d] transition-colors"
          style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.5)' }}
          onDragStart={(event) => onDragStart(event, 'webhook')} 
          onDragEnd={onDragEnd}
          onMouseEnter={() => setSelectedTool('webhook')}
          onMouseLeave={() => setSelectedTool(null)}
          draggable
        >
          <div className="font-bold text-green-400">[+] Radio Tower</div>
          <div className="text-xs text-gray-400 mt-1">Triggers the workflow</div>
        </div>

        <div 
          className="bg-[#2d2d2d] text-[#e0e0e0] border-2 border-[#1a1a1a] px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[#3d3d3d] transition-colors"
          style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.5)' }}
          onDragStart={(event) => onDragStart(event, 'httpRequest')} 
          onDragEnd={onDragEnd}
          onMouseEnter={() => setSelectedTool('httpRequest')}
          onMouseLeave={() => setSelectedTool(null)}
          draggable
        >
          <div className="font-bold text-teal-400">[*] Data Center</div>
          <div className="text-xs text-gray-400 mt-1">Make HTTP requests</div>
        </div>

        <div 
          className="bg-[#2d2d2d] text-[#e0e0e0] border-2 border-[#1a1a1a] px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[#3d3d3d] transition-colors"
          style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.5)' }}
          onDragStart={(event) => onDragStart(event, 'geminiFactory')} 
          onDragEnd={onDragEnd}
          onMouseEnter={() => setSelectedTool('geminiFactory')}
          onMouseLeave={() => setSelectedTool(null)}
          draggable
        >
          <div className="font-bold text-blue-400">[~] Gemini Factory</div>
          <div className="text-xs text-gray-400 mt-1">Process with Gemini AI</div>
        </div>

        <div 
          className="bg-[#2d2d2d] text-[#e0e0e0] border-2 border-[#1a1a1a] px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[#3d3d3d] transition-colors"
          style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.5)' }}
          onDragStart={(event) => onDragStart(event, 'chatgptFactory')} 
          onDragEnd={onDragEnd}
          onMouseEnter={() => setSelectedTool('chatgptFactory')}
          onMouseLeave={() => setSelectedTool(null)}
          draggable
        >
          <div className="font-bold text-[#74aa9c]">[~] ChatGPT Factory</div>
          <div className="text-xs text-gray-400 mt-1">Process with OpenAI</div>
        </div>

        <div 
          className="bg-[#2d2d2d] text-[#e0e0e0] border-2 border-[#1a1a1a] px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[#3d3d3d] transition-colors"
          style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.5)' }}
          onDragStart={(event) => onDragStart(event, 'claudeFactory')} 
          onDragEnd={onDragEnd}
          onMouseEnter={() => setSelectedTool('claudeFactory')}
          onMouseLeave={() => setSelectedTool(null)}
          draggable
        >
          <div className="font-bold text-[#d97757]">[~] Claude Factory</div>
          <div className="text-xs text-gray-400 mt-1">Process with Anthropic</div>
        </div>

        <div 
          className="bg-[#2d2d2d] text-[#e0e0e0] border-2 border-[#1a1a1a] px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[#3d3d3d] transition-colors"
          style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.5)' }}
          onDragStart={(event) => onDragStart(event, 'conditional')} 
          onDragEnd={onDragEnd}
          onMouseEnter={() => setSelectedTool('conditional')}
          onMouseLeave={() => setSelectedTool(null)}
          draggable
        >
          <div className="font-bold text-yellow-400">[?] Filter Gate</div>
          <div className="text-xs text-gray-400 mt-1">If/Else Logic Gate</div>
        </div>

        <div 
          className="bg-[#2d2d2d] text-[#e0e0e0] border-2 border-[#1a1a1a] px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[#3d3d3d] transition-colors"
          style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.5)' }}
          onDragStart={(event) => onDragStart(event, 'limit')} 
          onDragEnd={onDragEnd}
          onMouseEnter={() => setSelectedTool('limit')}
          onMouseLeave={() => setSelectedTool(null)}
          draggable
        >
          <div className="font-bold text-red-400">[!] Toll Booth</div>
          <div className="text-xs text-gray-400 mt-1">Execution Limit Counter</div>
        </div>

        <div 
          className="bg-[#2d2d2d] text-[#e0e0e0] border-2 border-[#1a1a1a] px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[#3d3d3d] transition-colors"
          style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.5)' }}
          onDragStart={(event) => onDragStart(event, 'delay')} 
          onDragEnd={onDragEnd}
          onMouseEnter={() => setSelectedTool('delay')}
          onMouseLeave={() => setSelectedTool(null)}
          draggable
        >
          <div className="font-bold text-gray-300">[-] Truck Stop</div>
          <div className="text-xs text-gray-400 mt-1">Wait for specified time</div>
        </div>

        <div 
          className="bg-[#2d2d2d] text-[#e0e0e0] border-2 border-[#1a1a1a] px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[#3d3d3d] transition-colors"
          style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.5)' }}
          onDragStart={(event) => onDragStart(event, 'output')} 
          onDragEnd={onDragEnd}
          onMouseEnter={() => setSelectedTool('output')}
          onMouseLeave={() => setSelectedTool(null)}
          draggable
        >
          <div className="font-bold text-orange-400">[=] Delivery Dock</div>
          <div className="text-xs text-gray-400 mt-1">Final output destination</div>
        </div>

      </div>

      {/* Asset Preview Panel */}
      {selectedTool && (
        <div className="absolute top-0 left-[300px] z-20 bg-[#d8c8b8] p-4 w-72 border-[3px] border-[#2d2d2d] pointer-events-none" style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)' }}>
          <div className="flex justify-between items-center mb-4 border-b-2 border-[#2d2d2d] pb-2">
            <h3 className="text-lg font-bold text-[#2d2d2d] uppercase tracking-widest">Asset Preview</h3>
          </div>
          <div className="bg-[#2d2d2d] p-4 flex items-center justify-center border-2 border-[#1a1a1a]" style={{ boxShadow: 'inset 2px 2px 0px 0px rgba(0,0,0,0.5)' }}>
            {toolAssets[selectedTool] && (
              <img 
                src={`/assets/${toolAssets[selectedTool]}`} 
                alt={`${selectedTool} Preview`} 
                className="w-full object-contain" 
                style={{ imageRendering: 'auto' }} 
              />
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
