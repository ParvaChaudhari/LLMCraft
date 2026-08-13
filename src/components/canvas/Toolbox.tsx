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
  { type: 'webhook',        name: 'Radio Tower',      icon: 'cell_tower', description: 'Triggers the workflow',      longDescription: 'The entry point of your workflow. Starts execution and passes initial payload data to the next connected nodes.', color: '#4ade80', asset: 'webhook_tower.png' },
  { type: 'clocktower',     name: 'Clocktower',       icon: 'schedule', description: 'Cron Scheduler',         longDescription: 'Trigger your workflow autonomously on a recurring schedule using cron expressions.', color: '#ef4444', asset: 'clocktower.png' },
  { type: 'googleDrive',    name: 'Cloud Vault',      icon: 'cloud', description: 'Google Drive Integration',   longDescription: 'Fetch files from or save documents directly to Google Drive using a Service Account.', color: '#0ea5e9', asset: 'gdrive_vault.png' },
  { type: 'merge',          name: 'Junction Tower',   icon: 'merge', description: 'Merge two branches',         longDescription: 'Waits for two incoming pipeline branches to both complete, then combines their outputs into a single unified stream to continue the pipeline.', color: '#f59e0b', asset: 'merge_junction.png' },
  { type: 'variable',       name: 'Warehouse',        icon: 'inventory_2', description: 'Set or extract variables', longDescription: 'A lightweight way to store, rename, or reshape data mid-pipeline. Define static values or extract specific fields from massive payloads without writing code.', color: '#8b5cf6', asset: 'storage_shed.png' },
  { type: 'customWorkshop', name: 'Custom Workshop',  icon: 'precision_manufacturing', description: 'Execute custom logic',       longDescription: 'A secure sandbox for executing raw JavaScript. Manipulate data, transform strings, and perform custom calculations mid-workflow.', color: '#a78bfa', asset: 'custom_workshop.png' },
  { type: 'httpRequest',    name: 'Data Center',      icon: 'dns', description: 'Make HTTP requests',         longDescription: 'Perform generic REST API calls (GET, POST, etc.) to any external service and pull the JSON response into your workflow.', color: '#2dd4bf', asset: 'http_request.png' },
  { type: 'geminiFactory',  name: 'Gemini Factory',   icon: 'smart_toy', description: 'Process with Gemini AI',     longDescription: 'Leverage Google Gemini models to process inputs, generate text, and solve complex reasoning tasks based on a custom prompt.', color: '#60a5fa', asset: 'gemini_factory.png' },
  { type: 'chatgptFactory', name: 'ChatGPT Factory',  icon: 'smart_toy', description: 'Process with OpenAI',        longDescription: 'Leverage OpenAI models (like GPT-4o) to process inputs, generate text, and solve complex reasoning tasks based on a custom prompt.', color: '#74aa9c', asset: 'chatgpt_factory.png' },
  { type: 'claudeFactory',  name: 'Claude Factory',   icon: 'smart_toy', description: 'Process with Anthropic',     longDescription: 'Leverage Anthropic Claude models to process inputs, generate text, and solve complex reasoning tasks based on a custom prompt.', color: '#d97757', asset: 'claude_factory.png' },
  { type: 'conditional',    name: 'Filter Gate',      icon: 'route', description: 'If/Else Logic Gate',         longDescription: 'Route your workflow down different paths based on a condition. Compares an input against a target value.', color: '#facc15', asset: 'conditional_road.png' },
  { type: 'limit',          name: 'Toll Booth',       icon: 'toll', description: 'Execution Limit Counter',    longDescription: 'Prevent infinite loops and runaway costs by capping the maximum number of times a workflow branch can be executed.', color: '#f87171', asset: 'limit_toll.png' },
  { type: 'delay',          name: 'Truck Stop',       icon: 'hourglass_empty', description: 'Wait for specified time',    longDescription: 'Pause the execution of the workflow for a specified duration before continuing to the next node.', color: '#d1d5db', asset: 'delay_stop.png' },
  { type: 'output',         name: 'Delivery Dock',    icon: 'local_shipping', description: 'Final output destination',   longDescription: 'The final destination of your workflow. Marks the successful completion and outputs the final processed data.', color: '#fb923c', asset: 'output_dock.png' },
  { type: 'watchtower',     name: 'Watchtower',       icon: 'radar', description: 'Web Search (Tavily)',        longDescription: 'Perform an advanced web search using Tavily AI to pull real-time information and sources directly into your workflow.', color: '#818cf8', asset: 'watchtower.png' },
  { type: 'webScraper',     name: 'Print Shop',       icon: 'print', description: 'Web Scraper',                longDescription: 'Scrape the raw HTML from any given URL, strip out the code tags, and extract the clean, readable text.', color: '#3b82f6', asset: 'print_shop.png' },
  { type: 'documentParser', name: 'Library',          icon: 'local_library', description: 'Document Parser',            longDescription: 'Extract raw text from PDF, CSV, and TXT files. Upload documents directly into your workflow for AI processing.', color: '#ca8a04', asset: 'library.png' },
  { type: 'dbSilo',         name: 'DB Silo',          icon: 'database', description: 'Postgres Connector',         longDescription: 'Connect to remote Postgres databases and run raw SQL queries directly in the pipeline.', color: '#06b6d4', asset: 'db_silo.png' },
  { type: 'jsonParser',     name: 'Sorting Facility', icon: 'account_tree', description: 'JSON Validator',             longDescription: 'Extract and validate structured JSON from raw LLM text outputs. Blocks invalid formatting.', color: '#22c55e', asset: 'sorting_facility.png' },
  { type: 'apify',          name: 'Apify Hub',        icon: 'hub', description: 'Apify Automation',           longDescription: 'Trigger third-party Apify web scrapers and automation bots in the cloud.', color: '#3b82f6', asset: 'drone_hub.png' },
  { type: 'bankVault',      name: 'Supabase Center',  icon: 'account_balance', description: 'Supabase Vector DB',         longDescription: 'Connect to Supabase to store and retrieve semantic embeddings for RAG workflows.', color: '#4af626', asset: 'bank-vault.png' },
  { type: 'artStudio',      name: 'Art Studio',       icon: 'palette', description: 'Image Generation',         longDescription: 'Generate images using DALL-E, Imagen 4, or Nano Banana Pro based on dynamic prompts.', color: '#facc15', asset: 'art_studio.png' },
  { type: 'postOffice',     name: 'Post Office',      icon: 'mark_email_unread', description: 'Dispatch Notifications',     longDescription: 'Send outputs via email, Slack, Discord, or other webhooks to notify users.', color: '#0ea5e9', asset: 'postoffice.png' },
  { type: 'airport',        name: 'Agent Runway',     icon: 'flight_takeoff', description: 'Invoke Sub-Workflow',        longDescription: 'Invoke another saved workflow as a sub-agent. Suspends execution until the sub-agent returns its final output.', color: '#ef4444', asset: 'airport.png' },
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
      <div className="absolute top-4 left-4 z-40 flex flex-col gap-3">
        <button 
          onClick={() => setIsExpanded(true)}
          className="w-14 h-14 flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-on-surface)] hover:bg-[#facc15] hover:text-black tactile-button transition-colors font-bold text-3xl cursor-pointer"
          title="Open Toolbox"
        >
          +
        </button>
        <button 
          onClick={() => onOpenSecretManager?.()}
          className="w-14 h-14 flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-on-surface)] hover:bg-[#06b6d4] hover:text-white tactile-button transition-colors cursor-pointer"
          title="Open Secret Manager"
        >
          <span className="material-symbols-outlined text-[28px]">key</span>
        </button>
      </div>
    );
  }

  return (
    <aside className="absolute top-0 bottom-0 left-0 w-80 bg-[var(--color-surface-container)] border-r-2 border-[var(--color-on-surface)] shadow-[4px_0_0_0_rgba(0,0,0,1)] flex flex-col z-40 bevel-container">
      {/* Header */}
      <div className="bg-[var(--color-inverse-surface)] border-b-2 border-[var(--color-on-surface)] p-[var(--spacing-gutter-md)] flex justify-between items-center relative overflow-hidden shrink-0">
        <div className="absolute inset-0 scanline opacity-30 pointer-events-none"></div>
        <div className="flex items-center gap-3 relative z-10">
          <span className="material-symbols-outlined text-[var(--color-inverse-primary)] text-2xl">apartment</span>
          <h2 className="text-headline-md font-headline-md uppercase text-[var(--color-on-primary)] tracking-widest m-0">CONSTRUCT</h2>
        </div>
        <div className="flex gap-2 relative z-10">
          <button onClick={() => onOpenSecretManager?.()} className="bg-transparent border-none cursor-pointer text-[var(--color-surface-variant)] hover:text-[#06b6d4] transition-colors p-1" title="Secret Manager">
            <span className="material-symbols-outlined">key</span>
          </button>
          <button onClick={() => setIsExpanded(false)} className="bg-transparent border-none cursor-pointer text-[var(--color-surface-variant)] hover:text-[var(--color-error)] transition-colors p-1" title="Close Panel">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-3 border-b-2 border-[var(--color-on-surface-variant)] pb-4 shrink-0">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] z-10" style={{ fontSize: '16px' }}>search</span>
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] pl-8 pr-2 py-1 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] placeholder-[var(--color-outline)] focus:border-[var(--color-tertiary-fixed)] transition-colors"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
          {toolItems
            .filter(item => 
              item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              item.description.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map(item => (
            <div
              key={item.type}
              className="bg-[var(--color-primary-container)] bevel-inset p-2 cursor-grab active:cursor-grabbing hover:bg-[var(--color-surface-variant)] transition-colors group flex flex-col"
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
              <div className="flex items-start gap-3">
                {/* CRT Styled Icon Box */}
                <div className="w-16 h-16 bg-[var(--color-on-surface)] shrink-0 bevel-inset flex items-center justify-center crt-bg">
                  <span className="material-symbols-outlined text-2xl group-hover:animate-pulse transition-all" style={{ color: item.color }}>
                    {item.icon}
                  </span>
                </div>
                {/* Details */}
                <div className="flex flex-col flex-1 min-w-0 justify-center h-16">
                  <span className="text-sm font-[family-name:var(--font-label-caps)] uppercase font-bold text-[var(--color-on-surface)] truncate">
                    {item.name}
                  </span>
                  <span className="text-xs font-[family-name:var(--font-code-sm)] text-[var(--color-on-surface-variant)] leading-tight mt-1 line-clamp-2">
                    {item.description}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Asset Preview Panel */}
        {selectedTool && (() => {
          const item = toolItems.find(t => t.type === selectedTool);
          return item ? (
            <div 
              className="fixed left-[330px] z-50 bg-[var(--color-primary-container)] p-4 w-72 bevel-container pointer-events-none transition-all duration-75 ease-out flex flex-col gap-4" 
              style={{ top: Math.max(16, previewY) }}
            >
              <div className="flex justify-between items-center border-b-2 border-[var(--color-on-surface-variant)] pb-2">
                <h3 className="font-bold font-[family-name:var(--font-code-sm)] text-lg text-[var(--color-on-surface)] uppercase tracking-widest">Asset Preview</h3>
              </div>
              
              <div className="bg-[var(--color-inverse-surface)] p-4 flex flex-col items-center justify-center inset-input" style={{
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                backgroundSize: '10px 10px',
                backgroundPosition: 'center center'
              }}>
                <img 
                  src={`/assets/${item.asset}`} 
                  alt={`${item.name} Preview`} 
                  className="w-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
                />
              </div>

              <div className="text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] text-center leading-tight">
                {item.longDescription}
              </div>
            </div>
          ) : null;
        })()}
      </div>
    </aside>
  );
}
