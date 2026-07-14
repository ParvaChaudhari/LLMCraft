import { useState } from 'react';

interface ToolItem {
  type: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  asset: string;
}

const toolItems: ToolItem[] = [
  { type: 'webhook',        name: 'Radio Tower',      icon: '[+]', description: 'Triggers the workflow',      color: '#4ade80', asset: 'webhook_tower.png' },
  { type: 'customWorkshop', name: 'Custom Workshop',  icon: '[#]', description: 'Execute custom logic',      color: '#a78bfa', asset: 'custom_workshop.png' },
  { type: 'httpRequest',    name: 'Data Center',      icon: '[*]', description: 'Make HTTP requests',         color: '#2dd4bf', asset: 'http_request.png' },
  { type: 'geminiFactory',  name: 'Gemini Factory',   icon: '[~]', description: 'Process with Gemini AI',     color: '#60a5fa', asset: 'gemini_factory.png' },
  { type: 'chatgptFactory', name: 'ChatGPT Factory',  icon: '[~]', description: 'Process with OpenAI',        color: '#74aa9c', asset: 'chatgpt_factory.png' },
  { type: 'claudeFactory',  name: 'Claude Factory',   icon: '[~]', description: 'Process with Anthropic',     color: '#d97757', asset: 'claude_factory.png' },
  { type: 'conditional',    name: 'Filter Gate',      icon: '[?]', description: 'If/Else Logic Gate',         color: '#facc15', asset: 'conditional_road.png' },
  { type: 'limit',          name: 'Toll Booth',       icon: '[!]', description: 'Execution Limit Counter',    color: '#f87171', asset: 'limit_toll.png' },
  { type: 'delay',          name: 'Truck Stop',       icon: '[-]', description: 'Wait for specified time',    color: '#d1d5db', asset: 'delay_stop.png' },
  { type: 'output',         name: 'Delivery Dock',    icon: '[=]', description: 'Final output destination',   color: '#fb923c', asset: 'output_dock.png' },
  { type: 'watchtower',     name: 'Watchtower',       icon: '[O]', description: 'Web Search (Tavily)',        color: '#818cf8', asset: 'watchtower.png' },
];

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
        {toolItems.map(item => (
          <div
            key={item.type}
            className="bg-[#2d2d2d] text-[#e0e0e0] border-2 border-[#1a1a1a] px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[#3d3d3d] transition-colors"
            style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.5)' }}
            onDragStart={(event) => onDragStart(event, item.type)}
            onDragEnd={onDragEnd}
            onMouseEnter={() => setSelectedTool(item.type)}
            onMouseLeave={() => setSelectedTool(null)}
            draggable
          >
            <div className="font-bold" style={{ color: item.color }}>{item.icon} {item.name}</div>
            <div className="text-xs text-gray-400 mt-1">{item.description}</div>
          </div>
        ))}
      </div>

      {/* Asset Preview Panel */}
      {selectedTool && (() => {
        const item = toolItems.find(t => t.type === selectedTool);
        return item ? (
          <div className="absolute top-0 left-[300px] z-20 bg-[#d8c8b8] p-4 w-72 border-[3px] border-[#2d2d2d] pointer-events-none" style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)' }}>
            <div className="flex justify-between items-center mb-4 border-b-2 border-[#2d2d2d] pb-2">
              <h3 className="text-lg font-bold text-[#2d2d2d] uppercase tracking-widest">Asset Preview</h3>
            </div>
            <div className="bg-[#2d2d2d] p-4 flex items-center justify-center border-2 border-[#1a1a1a]" style={{ boxShadow: 'inset 2px 2px 0px 0px rgba(0,0,0,0.5)' }}>
              <img 
                src={`/assets/${item.asset}`} 
                alt={`${item.name} Preview`} 
                className="w-full object-contain" 
                style={{ imageRendering: 'auto' }} 
              />
            </div>
          </div>
        ) : null;
      })()}
    </div>
    </div>
  );
}
