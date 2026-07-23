import { useState } from 'react';

interface ToolItem {
  type: string;
  name: string;
  icon: string;
  description: string;
  longDescription: string;
  color: string;
  asset: string;
}

const toolItems: ToolItem[] = [
  { type: 'webhook',        name: 'Radio Tower',      icon: '[+]', description: 'Triggers the workflow',      longDescription: 'The entry point of your workflow. Starts execution and passes initial payload data to the next connected nodes.', color: '#4ade80', asset: 'webhook_tower.png' },
  { type: 'customWorkshop', name: 'Custom Workshop',  icon: '[#]', description: 'Execute custom logic',       longDescription: 'A secure sandbox for executing raw JavaScript. Manipulate data, transform strings, and perform custom calculations mid-workflow.', color: '#a78bfa', asset: 'custom_workshop.png' },
  { type: 'httpRequest',    name: 'Data Center',      icon: '[*]', description: 'Make HTTP requests',         longDescription: 'Perform generic REST API calls (GET, POST, etc.) to any external service and pull the JSON response into your workflow.', color: '#2dd4bf', asset: 'http_request.png' },
  { type: 'geminiFactory',  name: 'Gemini Factory',   icon: '[~]', description: 'Process with Gemini AI',     longDescription: 'Leverage Google Gemini models to process inputs, generate text, and solve complex reasoning tasks based on a custom prompt.', color: '#60a5fa', asset: 'gemini_factory.png' },
  { type: 'chatgptFactory', name: 'ChatGPT Factory',  icon: '[~]', description: 'Process with OpenAI',        longDescription: 'Leverage OpenAI models (like GPT-4o) to process inputs, generate text, and solve complex reasoning tasks based on a custom prompt.', color: '#74aa9c', asset: 'chatgpt_factory.png' },
  { type: 'claudeFactory',  name: 'Claude Factory',   icon: '[~]', description: 'Process with Anthropic',     longDescription: 'Leverage Anthropic Claude models to process inputs, generate text, and solve complex reasoning tasks based on a custom prompt.', color: '#d97757', asset: 'claude_factory.png' },
  { type: 'conditional',    name: 'Filter Gate',      icon: '[?]', description: 'If/Else Logic Gate',         longDescription: 'Route your workflow down different paths based on a condition. Compares an input against a target value.', color: '#facc15', asset: 'conditional_road.png' },
  { type: 'limit',          name: 'Toll Booth',       icon: '[!]', description: 'Execution Limit Counter',    longDescription: 'Prevent infinite loops and runaway costs by capping the maximum number of times a workflow branch can be executed.', color: '#f87171', asset: 'limit_toll.png' },
  { type: 'delay',          name: 'Truck Stop',       icon: '[-]', description: 'Wait for specified time',    longDescription: 'Pause the execution of the workflow for a specified duration before continuing to the next node.', color: '#d1d5db', asset: 'delay_stop.png' },
  { type: 'output',         name: 'Delivery Dock',    icon: '[=]', description: 'Final output destination',   longDescription: 'The final destination of your workflow. Marks the successful completion and outputs the final processed data.', color: '#fb923c', asset: 'output_dock.png' },
  { type: 'watchtower',     name: 'Watchtower',       icon: '[O]', description: 'Web Search (Tavily)',        longDescription: 'Perform an advanced web search using Tavily AI to pull real-time information and sources directly into your workflow.', color: '#818cf8', asset: 'watchtower.png' },
  { type: 'webScraper',     name: 'Print Shop',       icon: '[P]', description: 'Web Scraper',                longDescription: 'Scrape the raw HTML from any given URL, strip out the code tags, and extract the clean, readable text.', color: '#3b82f6', asset: 'print_shop.png' },
  { type: 'documentParser', name: 'Library',          icon: '[L]', description: 'Document Parser',            longDescription: 'Extract raw text from PDF, CSV, and TXT files. Upload documents directly into your workflow for AI processing.', color: '#ca8a04', asset: 'library.png' },
  { type: 'dbSilo',         name: 'DB Silo',          icon: '[D]', description: 'Postgres Connector',         longDescription: 'Connect to remote Postgres databases and run raw SQL queries directly in the pipeline.', color: '#06b6d4', asset: 'db_silo.png' },
  { type: 'jsonParser',     name: 'Sorting Facility', icon: '[S]', description: 'JSON Validator',             longDescription: 'Extract and validate structured JSON from raw LLM text outputs. Blocks invalid formatting.', color: '#22c55e', asset: 'sorting_facility.png' },
  { type: 'apify',          name: 'Apify Hub',        icon: '[A]', description: 'Apify Automation',           longDescription: 'Trigger third-party Apify web scrapers and automation bots in the cloud.', color: '#3b82f6', asset: 'drone_hub.png' },
  { type: 'bankVault',      name: 'Supabase Center',  icon: '[V]', description: 'Supabase Vector DB',         longDescription: 'Connect to Supabase to store and retrieve semantic embeddings for RAG workflows.', color: '#4af626', asset: 'bank-vault.png' },
  { type: 'artStudio',      name: 'Art Studio',       icon: '[🎨]', description: 'Image Generation',         longDescription: 'Generate images using DALL-E, Imagen 4, or Nano Banana Pro based on dynamic prompts.', color: '#facc15', asset: 'art_studio.png' },
];

export default function Toolbox({ onOpenSecretManager }: { onOpenSecretManager?: () => void }) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewY, setPreviewY] = useState(0);

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
        <div className="flex flex-col mb-4 border-b-2 border-[#2d2d2d] pb-4 gap-3">
          <h3 className="text-lg font-bold text-[#2d2d2d] uppercase tracking-widest">Projects</h3>
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#2d2d2d] text-white p-2 border-[3px] border-[#1a1a1a] outline-none font-mono text-sm placeholder-gray-500 focus:border-[#4af626] transition-colors"
          />
        </div>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {toolItems
          .filter(item => 
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(item => (
          <div
            key={item.type}
            className="bg-[#2d2d2d] text-[#e0e0e0] border-2 border-[#1a1a1a] px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[#3d3d3d] transition-colors"
            style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.5)' }}
            onDragStart={(event) => onDragStart(event, item.type)}
            onDragEnd={onDragEnd}
            onMouseEnter={(e) => {
              if (typeof window !== 'undefined') {
                const maxTop = window.innerHeight - 450;
                setPreviewY(Math.min(Math.max(16, e.clientY - 120), maxTop));
              } else {
                setPreviewY(e.clientY - 120);
              }
              setSelectedTool(item.type);
            }}
            onMouseMove={(e) => {
              if (typeof window !== 'undefined') {
                const maxTop = window.innerHeight - 450;
                setPreviewY(Math.min(Math.max(16, e.clientY - 120), maxTop));
              } else {
                setPreviewY(e.clientY - 120);
              }
            }}
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
          <div 
            className="fixed left-[320px] z-50 bg-[#d8c8b8] p-4 w-72 border-[3px] border-[#2d2d2d] pointer-events-none transition-all duration-75 ease-out" 
            style={{ 
              top: Math.max(16, previewY),
              boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)' 
            }}
          >
            <div className="flex justify-between items-center mb-4 border-b-2 border-[#2d2d2d] pb-2">
              <h3 className="text-lg font-bold text-[#2d2d2d] uppercase tracking-widest">Asset Preview</h3>
            </div>
            <div className="bg-[#2d2d2d] p-4 flex flex-col items-center justify-center border-2 border-[#1a1a1a]" style={{ boxShadow: 'inset 2px 2px 0px 0px rgba(0,0,0,0.5)' }}>
              <img 
                src={`/assets/${item.asset}`} 
                alt={`${item.name} Preview`} 
                className="w-full object-contain mb-4" 
                style={{ imageRendering: 'auto' }} 
              />
              <div className="text-[#c4b4a4] font-mono text-xs text-center border-t-2 border-[#1a1a1a] pt-4 w-full leading-tight">
                {item.longDescription}
              </div>
            </div>
          </div>
        ) : null;
      })()}
    </div>
    </div>
  );
}
