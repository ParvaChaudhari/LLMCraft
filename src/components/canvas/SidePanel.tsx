import { useState, useEffect, useRef } from 'react';
import { buildNodeContext } from '@/lib/buildNodeContext';

// Cache entries include a timestamp so stale data expires after CACHE_TTL_MS.
// Without TTL, deleted/rotated credentials would show until a hard page refresh.
const CACHE_TTL_MS = 60_000; // 60 seconds

type CacheEntry<T> = { data: T; expiresAt: number };
const globalModelCache: Record<string, CacheEntry<string[]>> = {};
const globalCredCache: Record<string, CacheEntry<any[]>> = {};

const isFresh = <T,>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> =>
  !!entry && Date.now() < entry.expiresAt;

const LLM_NODE_TYPES = ['geminiFactory', 'chatgptFactory', 'claudeFactory'];

const getCredentialProvider = (nodeType: string): string | null => {
  if (nodeType === 'geminiFactory') return 'gemini';
  if (nodeType === 'chatgptFactory') return 'openai';
  if (nodeType === 'claudeFactory') return 'anthropic';
  if (nodeType === 'watchtower') return 'tavily';
  if (nodeType === 'dbSilo' || nodeType === 'bankVault') return 'postgres';
  if (nodeType === 'apify') return 'apify';
  if (nodeType === 'postOffice') return 'resend';
  if (nodeType === 'googleDrive') return 'google_drive';
  return null;
};

const JsonNode = ({ keyName, value, path, onInsert }: any) => {
  const [expanded, setExpanded] = useState(true);
  const isObject = value !== null && typeof value === 'object';

  if (isObject) {
    return (
      <div className="ml-2 border-l-2 border-[var(--color-on-surface-variant)] pl-2 my-1 font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] text-[var(--color-on-surface)]">
        <div
          className="cursor-pointer hover:bg-[var(--color-surface)] inline-block px-1 font-bold transition-colors"
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
    <div className="ml-4 my-1 flex items-start group font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] text-[var(--color-on-surface)] relative pr-10">
      <span className="font-bold mr-2 whitespace-nowrap">{keyName}:</span>
      <span className="break-words">{String(value)}</span>
      {onInsert && (
        <button
          onClick={() => onInsert(path)}
          className="absolute right-0 -top-1 opacity-0 group-hover:opacity-100 bg-[var(--color-tertiary-fixed)] text-[var(--color-on-background)] hover:bg-[#3ade1d] w-5 h-5 flex items-center justify-center font-bold text-sm rounded-sm transition-all tactile-button z-20"
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
  jsonParser: 'sorting_facility.png',
  postOffice: 'postoffice.png',
  clocktower: 'clocktower.png',
  googleDrive: 'gdrive_vault.png',
  merge: 'merge_junction.png',
  variable: 'storage_shed.png',
  airport: 'airport.png',
  checkpoint: 'checkpoint.png',
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
  
  const lastFocusedInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        lastFocusedInputRef.current = target as HTMLInputElement | HTMLTextAreaElement;
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);
  
  const [gDriveClientId, setGDriveClientId] = useState('');
  const [gDriveClientSecret, setGDriveClientSecret] = useState('');
  const [gDriveRefreshToken, setGDriveRefreshToken] = useState('');

  const [embeddingCredentials, setEmbeddingCredentials] = useState<any[]>([]);

  const [dynamicModels, setDynamicModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isNodeRunning, setIsNodeRunning] = useState(false);
  const [viewAsJson, setViewAsJson] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<{time: string, text: string, type: string}[]>([]);
  const nodeEventSourceRef = useRef<EventSource | null>(null);
  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const [savedWorkflows, setSavedWorkflows] = useState<{id: string, name: string, graph_json?: any}[]>([]);

  useEffect(() => {
    if (selectedNode?.type === 'airport') {
      const fetchWorkflows = async () => {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data } = await supabase
            .from('workflows')
            .select('id, name, graph_json')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (data) {
            const currentCityId = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '';
            setSavedWorkflows(data.filter((wf: any) => wf.id !== currentCityId));
          }
        } catch (e) {
          console.error("Failed to fetch workflows:", e);
        }
      };
      fetchWorkflows();
    }
  }, [selectedNode?.type]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [terminalLogs, isNodeRunning]);

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
        className={`relative px-6 py-2 font-bold font-[family-name:var(--font-code-sm)] text-sm uppercase tracking-widest tactile-button transition-all duration-150 ease-out border-b-0 flex items-center justify-center gap-2 ${isActive
          ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)] z-10 shadow-none translate-y-[2px]'
          : 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)] shadow-[0_4px_0_0_rgba(0,0,0,0.8)] -translate-y-[4px]'
          }`}
      >

        <div className={`w-2 h-2 rounded-full transition-all duration-300 shrink-0 ${isActive ? 'bg-[var(--color-tertiary-fixed)] shadow-[0_0_6px_var(--color-tertiary-fixed)]' : 'bg-[#1a1a1a] shadow-inner'}`} />
        <span className="mt-1">{label}</span>

        {/* Gold Connector Pins (visible when popped up) */}
        <div className={`absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-12 h-[6px] bg-[#d4af37] border border-black flex justify-around px-[1px] pt-[1px] transition-opacity duration-150 -z-10 ${isActive ? 'opacity-0' : 'opacity-100'}`}>
          <div className="w-[2px] h-full bg-black/40"></div>
          <div className="w-[2px] h-full bg-black/40"></div>
          <div className="w-[2px] h-full bg-black/40"></div>
          <div className="w-[2px] h-full bg-black/40"></div>
        </div>
      </button>
    );
  };

  // Fetch credentials when a node that needs them is selected
  useEffect(() => {
    const credType = getCredentialProvider(selectedNode?.type);

    if (credType) {
      // Serve fresh cached data immediately to avoid flicker
      if (isFresh(globalCredCache[credType])) {
        setCredentials(globalCredCache[credType].data);
      }
      fetch(`/api/credentials?type=${credType}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            globalCredCache[credType] = { data, expiresAt: Date.now() + CACHE_TTL_MS };
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
    if (!forceRefresh && isFresh(globalModelCache[credId])) {
      setDynamicModels(globalModelCache[credId].data);
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
        globalModelCache[credId] = { data: result.models, expiresAt: Date.now() + CACHE_TTL_MS };
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
      if (data.model && !isFresh(globalModelCache[data.credentialId])) {
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

  const handleDeploySchedule = async () => {
    if (isNodeRunning) return;
    setIsNodeRunning(true);
    setTerminalLogs([]);
    updateNodeData(selectedNode.id, { isLoading: true });

    try {
      const res = await fetch('/api/schedule-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nodeId: selectedNode.id, 
          cronExpression: data.cronExpression,
          nodes, 
          edges 
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to deploy schedule');

      setTerminalLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `Schedule Deployed: ${data.cronExpression}`, type: 'success' }]);
      updateNodeData(selectedNode.id, { isLoading: false, isScheduled: true });
    } catch (err: any) {
      setTerminalLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `Error: ${err.message}`, type: 'error' }]);
      updateNodeData(selectedNode.id, { isLoading: false });
    } finally {
      setIsNodeRunning(false);
    }
  };

  const handleStopSchedule = async () => {
    if (isNodeRunning) return;
    setIsNodeRunning(true);
    setTerminalLogs([]);
    updateNodeData(selectedNode.id, { isLoading: true });

    try {
      const res = await fetch('/api/stop-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: selectedNode.id }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to stop schedule');

      setTerminalLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `Schedule Stopped!`, type: 'success' }]);
      updateNodeData(selectedNode.id, { isLoading: false, isScheduled: false });
    } catch (err: any) {
      setTerminalLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `Error: ${err.message}`, type: 'error' }]);
      updateNodeData(selectedNode.id, { isLoading: false });
    } finally {
      setIsNodeRunning(false);
    }
  };

  const executeNodeStandalone = async () => {
    if (isNodeRunning) return;
    setIsNodeRunning(true);
    // Clear current output, reset logs, and show loader
    setTerminalLogs([]);
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
          
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          
          if (eventName === 'NODE_STARTED') {
            setTerminalLogs(prev => [...prev, { time: timeStr, text: `Executing Node [${eventData.nodeId}]`, type: 'info' }]);
          } else if (eventName === 'NODE_PROGRESS') {
            setTerminalLogs(prev => [...prev, { time: timeStr, text: eventData.message, type: 'info' }]);
          } else if (eventName === 'NODE_FINISHED') {
            const isError = typeof eventData.output === 'string' && eventData.output.startsWith('Error:');
            setTerminalLogs(prev => [...prev, { 
              time: timeStr, 
              text: isError ? `Execution Failed: ${eventData.output}` : `Execution Complete.`, 
              type: isError ? 'error' : 'success' 
            }]);
            if (eventData.nodeId === selectedNode.id) {
              updateNodeData(selectedNode.id, { output: eventData.output, isLoading: false });
              setIsNodeRunning(false);
              es.close();
            }
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
        setTerminalLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `Connection error.`, type: 'error' }]);
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
    
    const activeEl = lastFocusedInputRef.current;
    if (activeEl && document.contains(activeEl)) {
      const start = activeEl.selectionStart || 0;
      const end = activeEl.selectionEnd || 0;
      const text = activeEl.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      
      if (activeEl.tagName === 'INPUT' && nativeInputValueSetter) {
        nativeInputValueSetter.call(activeEl, before + templateTag + after);
      } else if (activeEl.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(activeEl, before + templateTag + after);
      }

      activeEl.dispatchEvent(new Event('input', { bubbles: true }));
      
      setTimeout(() => {
        activeEl.focus();
        activeEl.setSelectionRange(start + templateTag.length, start + templateTag.length);
      }, 0);
      return;
    }

    if (LLM_NODE_TYPES.includes(selectedNode.type) || selectedNode.type === 'artStudio' || selectedNode.type === 'postOffice') {
      const currentPrompt = selectedNode.data?.prompt || selectedNode.data?.message || '';
      const field = selectedNode.type === 'postOffice' ? 'message' : 'prompt';
      handleChange(field, currentPrompt + (currentPrompt ? ' ' : '') + templateTag);
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
    const credType = getCredentialProvider(selectedNode.type);
    
    let finalKey = newCredKey;
    if (credType === 'google_drive') {
      finalKey = JSON.stringify({
        client_id: gDriveClientId,
        client_secret: gDriveClientSecret,
        refresh_token: gDriveRefreshToken
      });
    }

    if (!newCredName || !finalKey) return;
    setIsSavingCred(true);
    try {
      if (!credType) return;

      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCredName, type: credType, apiKey: finalKey })
      });
      const newCred = await res.json();

      if (newCred.id) {
        setCredentials(prev => [newCred, ...prev]);
        handleChange('credentialId', newCred.id); // Auto select it
        setShowNewCredForm(false);
        setNewCredName('');
        setNewCredKey('');
        setGDriveClientId('');
        setGDriveClientSecret('');
        setGDriveRefreshToken('');
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
  const uniqueIncomingIds = Array.from(new Set(incomingEdges.map(e => e.source)));
  const incomingNodes = uniqueIncomingIds.map(id => nodes.find(n => n.id === id)).filter(Boolean);

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
        <div className="bg-transparent text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] flex-1 overflow-y-auto custom-scrollbar mr-4">
          {Object.entries(parsedJson).map(([k, v]) => (
            <JsonNode
              key={k}
              keyName={k}
              value={v}
              path={Array.isArray(parsedJson) ? 'lastOutput' : `lastOutput.${k}`}
              onInsert={handleInsertVariable}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col relative group mr-4">
        <textarea
          readOnly
          className="flex-1 w-full bg-transparent text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] resize-none outline-none custom-scrollbar"
          value={outputData || 'No output generated yet.'}
        />
        {outputData && (
          <button
            onClick={() => handleInsertVariable(node.id)}
            className="absolute -top-[5px] -right-4 opacity-0 group-hover:opacity-100 bg-[var(--color-tertiary-fixed)] text-[var(--color-on-background)] hover:bg-[#3ade1d] w-6 h-6 flex items-center justify-center font-bold text-lg rounded-sm transition-all tactile-button z-20"
            title="Insert Output String"
          >
            +
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-on-surface)]/80 backdrop-blur-sm p-[var(--spacing-gutter-md)] pointer-events-auto">
      <div className="absolute inset-0 scanline z-0 pointer-events-none opacity-20"></div>

      {/* Main Modal Container */}
      <div
        className="w-[100%] max-w-[1600px] h-[95vh] bg-[var(--color-surface)] bevel-container shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col relative z-10"
      >

        {/* Header Bar */}
        <div className="h-10 bg-[var(--color-inverse-surface)] flex justify-between items-center px-[var(--spacing-gutter-sm)] border-b-2 border-[var(--color-on-surface)] relative overflow-hidden">
          <div className="absolute inset-0 scanline opacity-30 pointer-events-none"></div>
          <div className="flex items-center space-x-4 relative z-10">
            <span className="text-[var(--color-inverse-primary)] font-bold font-[family-name:var(--font-code-sm)] text-xl tracking-widest uppercase flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
              NODE CONFIGURATION // {selectedNode.type}
            </span>
          </div>
          <button onClick={onClose} className="text-[var(--color-surface-variant)] hover:text-white transition-colors relative z-10 flex items-center justify-center w-8 h-8">
            <span className="material-symbols-outlined text-[24px] leading-none">close</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-row overflow-hidden p-[var(--spacing-gutter-md)] gap-[var(--spacing-gutter-md)] bg-[var(--color-primary-container)]">

          {/* LEFT COLUMN (1/4 Width) - Asset Preview & Terminal */}
          <div className="w-1/4 flex flex-col gap-[var(--spacing-gutter-sm)] min-w-[280px]">
            <div className="h-[250px] shrink-0 bg-[var(--color-inverse-surface)] inset-input flex items-center justify-center relative overflow-hidden p-4 min-h-0" style={{
              backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              backgroundPosition: 'center center'
            }}>
              {assetName && (
                <img
                  src={`/assets/${assetName}`}
                  alt={selectedNode.type}
                  className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105 transition-transform"
                />
              )}
            </div>

            {/* Building Stats Panel */}
            <div className="bg-[#1a1a1a] inset-input p-[var(--spacing-gutter-sm)] text-[var(--color-tertiary-fixed-dim)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] leading-tight uppercase flex flex-col gap-3 justify-center">
              <div>BUILDING ID: <span className="text-white">{selectedNode.type.toUpperCase()}-{selectedNode.id.split('_')[1]}</span></div>

              {/* Standalone Execute Button */}
              {['geminiFactory', 'chatgptFactory', 'claudeFactory', 'httpRequest', 'watchtower', 'customWorkshop', 'webScraper', 'documentParser', 'dbSilo', 'jsonParser', 'apify', 'bankVault', 'artStudio', 'postOffice', 'googleDrive', 'variable', 'airport'].includes(selectedNode.type) && (
                <button
                  onClick={executeNodeStandalone}
                  disabled={isNodeRunning}
                  className={`w-full py-3 font-bold font-[family-name:var(--font-code-sm)] text-[length:var(--text-label-caps)] uppercase tracking-widest tactile-button transition-colors flex items-center justify-center gap-2 ${isNodeRunning
                    ? 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] opacity-50 cursor-not-allowed border-none'
                    : 'bg-[var(--color-tertiary-fixed)] hover:bg-[#5ae658] text-[var(--color-on-background)]'
                    }`}
                >
                  {isNodeRunning ? (
                    <>
                      <div className="w-3 h-3 border-2 border-[var(--color-on-surface-variant)] border-t-transparent rounded-full animate-spin" />
                      Running...
                    </>
                  ) : (
                    <> ▶ Execute Node </>
                  )}
                </button>
              )}
            </div>

            {/* Terminal Logs Panel */}
            <div className="flex-1 bg-[#1a1a1a] inset-input flex flex-col overflow-hidden">
              <div className="bg-[#2d2d2d] px-3 py-1 flex items-center gap-2 border-b-2 border-black shrink-0">
                <span className="material-symbols-outlined text-[16px] text-gray-400">terminal</span>
                <span className="text-xs font-bold font-[family-name:var(--font-code-sm)] text-gray-400 uppercase tracking-wider">LIVE TERMINAL</span>
              </div>
              <div 
                ref={terminalScrollRef}
                className="flex-1 overflow-y-auto p-3 font-[family-name:var(--font-code-sm)] text-xs flex flex-col gap-1 custom-scrollbar text-gray-300"
              >
                {terminalLogs.length === 0 ? (
                  <div className="text-gray-500 italic mt-2 text-center">No execution logs yet.</div>
                ) : (
                  terminalLogs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-gray-500 shrink-0">[{log.time}]</span>
                      <span className={`${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : log.type === 'info' ? 'text-blue-400' : 'text-gray-300'} break-all`}>
                        {log.text}
                      </span>
                    </div>
                  ))
                )}
                {isNodeRunning && (
                  <div className="flex gap-2 mt-2">
                    <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
                    <span className="text-yellow-400 animate-pulse">Running...</span>
                  </div>
                )}
              </div>
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
            <div className="flex-1 bg-[var(--color-primary-container)] bevel-container flex flex-row overflow-hidden relative">

              {/* COLUMN 1: INPUT */}
              {activeTabs.includes('input') && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="bg-[var(--color-inverse-surface)] border-b-2 border-[var(--color-on-surface)] py-1 text-center">
                    <h3 className="text-[var(--color-inverse-primary)] font-bold font-[family-name:var(--font-code-sm)] uppercase tracking-widest">Input</h3>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {incomingNodes.length === 0 ? (
                      <div className="text-gray-500 italic h-full flex items-center justify-center text-center">
                        No incoming connections.
                      </div>
                    ) : (
                      <div className="space-y-4 h-full flex flex-col">
                        {incomingNodes.map((node: any) => (
                          <div key={node.id} className="bg-[var(--color-surface)] px-4 pb-4 pt-5 relative inset-input text-[var(--color-on-surface)] flex-1 flex flex-col">
                            <div className="absolute top-2 left-4 text-[var(--color-on-surface-variant)] opacity-40 font-bold font-[family-name:var(--font-label-caps)] text-[9px] uppercase pointer-events-none select-none z-10">
                              FROM: {node.type}
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
                <div className={`flex-1 flex flex-col overflow-hidden ${activeTabs.includes('input') ? 'border-l-2 border-[var(--color-on-surface)]' : ''}`}>
                  <div className="bg-[var(--color-inverse-surface)] border-b-2 border-[var(--color-on-surface)] py-1 text-center">
                    <h3 className="text-[var(--color-inverse-primary)] font-bold font-[family-name:var(--font-code-sm)] uppercase tracking-widest">Tasks</h3>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-6">
                    {[...LLM_NODE_TYPES, 'watchtower', 'dbSilo', 'apify', 'bankVault', 'googleDrive'].includes(selectedNode.type) && (
                      <>
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">
                            {selectedNode.type === 'bankVault' ? 'Database Credential (Postgres)' : 'Authentication Credential'}
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={data.credentialId || ''}
                              onChange={(e) => handleChange('credentialId', e.target.value)}
                              className="flex-1 inset-input bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] py-1 px-2 outline-none"
                            >
                              <option value="">-- Select Credential --</option>
                              {credentials.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>

                            <button
                              onClick={() => setShowNewCredForm(!showNewCredForm)}
                              className="bg-[var(--color-surface)] hover:bg-[var(--color-surface)] text-[var(--color-on-surface)] tactile-button px-4 py-1 font-bold text-[length:var(--text-code-sm)] transition-colors"
                            >
                              {showNewCredForm ? '-' : '+'}
                            </button>
                          </div>

                          {showNewCredForm && (
                            <div className="mt-2 p-4 bg-[var(--color-inverse-surface)] inset-input space-y-4">
                              <h4 className="text-[var(--color-inverse-primary)] font-bold text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] uppercase tracking-widest border-b border-[var(--color-on-surface)] pb-2">Create New Credential</h4>
                              <div>
                                <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-1 text-[var(--color-inverse-primary)]">Credential Name</label>
                                <input
                                  type="text"
                                  value={newCredName}
                                  onChange={(e) => setNewCredName(e.target.value)}
                                  placeholder="e.g. My Personal API Key"
                                  autoComplete="off"
                                  className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                />
                              </div>
                              <div>
                                <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-1 text-[var(--color-inverse-primary)]">
                                  {getCredentialProvider(selectedNode.type) === 'postgres' ? 'Connection String' : getCredentialProvider(selectedNode.type) === 'google_drive' ? 'OAuth JSON (Client & Token)' : 'API Key'}
                                </label>
                                {getCredentialProvider(selectedNode.type) === 'google_drive' ? (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={gDriveClientId}
                                      onChange={(e) => setGDriveClientId(e.target.value)}
                                      placeholder="Client ID (e.g. 12345-abcde.apps.googleusercontent.com)"
                                      autoComplete="new-password"
                                      className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                    />
                                    <input
                                      type="password"
                                      value={gDriveClientSecret}
                                      onChange={(e) => setGDriveClientSecret(e.target.value)}
                                      placeholder="Client Secret (e.g. GOCSPX-...)"
                                      autoComplete="new-password"
                                      className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                    />
                                    <input
                                      type="password"
                                      value={gDriveRefreshToken}
                                      onChange={(e) => setGDriveRefreshToken(e.target.value)}
                                      placeholder="Refresh Token (e.g. 1//0eXYZ...)"
                                      autoComplete="new-password"
                                      className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                    />
                                  </div>
                                ) : (
                                  <input
                                    type="password"
                                    value={newCredKey}
                                    onChange={(e) => setNewCredKey(e.target.value)}
                                    placeholder={getCredentialProvider(selectedNode.type) === 'postgres' ? "postgresql://user:password@host/db" : "sk-..."}
                                    autoComplete="new-password"
                                    className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                  />
                                )}
                              </div>
                              <button
                                onClick={handleCreateCredential}
                                disabled={!newCredName || !newCredKey || isSavingCred}
                                className="w-full bg-[var(--color-tertiary-fixed)] hover:bg-[#5ae658] text-[var(--color-on-background)] font-bold py-2 px-4 uppercase tracking-wider tactile-button disabled:opacity-50"
                              >
                                {isSavingCred ? 'Saving...' : 'Save & Select'}
                              </button>
                            </div>
                          )}
                        </div>
                        {LLM_NODE_TYPES.includes(selectedNode.type) && (
                          <>
                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)] flex justify-between items-center">
                                <span>AI Model Version</span>
                                {LLM_NODE_TYPES.includes(selectedNode.type) && data.credentialId && (
                                  <button
                                    onClick={() => fetchModels(data.credentialId, true)}
                                    className="text-black hover:text-gray-700 transition-colors"
                                    title="Reload Models"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" /></svg>
                                  </button>
                                )}
                              </label>
                              {isLoadingModels ? (
                                <div className="w-full bg-[var(--color-surface-variant)] text-[var(--color-tertiary-fixed-dim)] p-[var(--spacing-gutter-sm)] inset-input font-bold animate-pulse text-sm">Fetching live models...</div>
                              ) : modelsError === 'Credential not found' || !data.credentialId ? (
                                <div className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] p-[var(--spacing-gutter-sm)] inset-input font-[family-name:var(--font-code-sm)] text-sm">
                                  Select a valid credential to load models.
                                </div>
                              ) : modelsError ? (
                                <div className="w-full bg-[var(--color-error-container)] text-[var(--color-on-error-container)] p-[var(--spacing-gutter-sm)] inset-input font-bold text-sm">
                                  Error: {modelsError}
                                </div>
                              ) : (
                                <select
                                  value={data.model || ''}
                                  onChange={(e) => handleChange('model', e.target.value)}
                                  className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] py-1 px-2 inset-input outline-none font-bold"
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
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Instruction Prompt</label>
                              <textarea
                                value={data.prompt || ''}
                                onChange={(e) => handleChange('prompt', e.target.value)}
                                className="w-full h-32 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-sm resize-y"
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
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
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
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                              placeholder="https://api.example.com/data"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Headers (JSON)</label>
                          <textarea
                            value={data.headers || ''}
                            onChange={(e) => handleChange('headers', e.target.value)}
                            className="w-full h-20 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input outline-none resize-y"
                            placeholder='{"Content-Type": "application/json"}'
                          />
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Request Body (JSON)</label>
                          <textarea
                            value={data.body || ''}
                            onChange={(e) => handleChange('body', e.target.value)}
                            className="w-full h-32 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input outline-none resize-y"
                            placeholder='{"data": "{{previous_node.value}}"}'
                          />
                        </div>
                      </>
                    )}

                    {selectedNode.type === 'watchtower' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Search Query</label>
                          <input
                            type="text"
                            value={data.query || ''}
                            onChange={(e) => handleChange('query', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                            placeholder="{{webhook.query}} or 'latest news'"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'dbSilo' && (
                      <div className="space-y-2">
                        <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">SQL Query (Supports {"{{"}variable{"}}"} interpolation)</label>
                        <textarea
                          value={data.query || ''}
                          onChange={(e) => handleChange('query', e.target.value)}
                          className="w-full h-32 p-3 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] inset-input resize-y outline-none"
                          placeholder="SELECT * FROM users WHERE email = '{{lastOutput}}';"
                        />
                      </div>
                    )}

                    {selectedNode.type === 'jsonParser' && (
                      <div className="space-y-4">
                        <div className="bg-[var(--color-surface)] p-[var(--spacing-gutter-sm)] inset-input text-center text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]">
                          Automatically extracts JSON. No configuration required.
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'apify' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Actor ID</label>
                          <input
                            type="text"
                            value={data.actorId || ''}
                            onChange={(e) => handleChange('actorId', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                            placeholder="e.g. apify/instagram-scraper"
                          />
                        </div>
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">JSON Input Payload</label>
                          <textarea
                            value={data.payload || ''}
                            onChange={(e) => handleChange('payload', e.target.value)}
                            className="w-full h-40 p-3 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] inset-input resize-y outline-none"
                            placeholder='{&#10;  "searchTerms": ["{{lastOutput}}"]&#10;}'
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'airport' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Target Workflow (Sub-Agent)</label>
                          <select
                            value={data.workflowId || ''}
                            onChange={(e) => {
                              const id = e.target.value;
                              const wf = savedWorkflows.find((w: any) => w.id === id);
                              updateNodeData(selectedNode.id, {
                                ...data,
                                workflowId: id,
                                workflowGraph: wf ? wf.graph_json : null
                              });
                            }}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="">-- Select Saved Workflow --</option>
                            {savedWorkflows.map(wf => (
                              <option key={wf.id} value={wf.id}>{wf.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="bg-[var(--color-surface)] p-[var(--spacing-gutter-sm)] inset-input text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]">
                          The current data in this pipeline (lastOutput) will be passed directly into the selected sub-workflow's starting node. This node will pause execution and wait for the sub-workflow to finish.
                        </div>
                      </div>
                    )}
                    {selectedNode.type === 'checkpoint' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Approval Prompt Message</label>
                          <textarea
                            value={data.promptMessage || ''}
                            onChange={(e) => handleChange('promptMessage', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-2 px-3 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] min-h-[80px]"
                            placeholder="e.g. Please review the following content: {{lastOutput}}"
                          />
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-[var(--color-surface)] inset-input">
                          <input
                            type="checkbox"
                            checked={data.requireInput || false}
                            onChange={(e) => handleChange('requireInput', e.target.checked)}
                            className="w-5 h-5 accent-[#06b6d4] bg-transparent border-2 border-[var(--color-on-surface-variant)] cursor-pointer"
                          />
                          <span className="font-[family-name:var(--font-code-sm)] font-bold text-[length:var(--text-code-sm)] text-[var(--color-on-surface)]">
                            Require Human Text Input
                          </span>
                        </label>
                      </div>
                    )}

                    {selectedNode.type === 'bankVault' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Embedding Credential (AI Provider)</label>
                          <select
                            value={data.embeddingCredentialId || ''}
                            onChange={(e) => handleChange('embeddingCredentialId', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="">-- Select Embedding Credential --</option>
                            {embeddingCredentials.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Mode</label>
                          <div
                            className="relative bg-[var(--color-inverse-surface)] inset-input p-1 flex items-center w-full h-10 cursor-pointer"
                            onClick={() => handleChange('mode', (!data.mode || data.mode === 'save') ? 'search' : 'save')}
                          >
                            <div
                              className={`absolute h-8 w-[calc(50%-4px)] bg-[var(--color-surface)] tactile-button transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${data.mode === 'search' ? 'left-[calc(50%+2px)]' : 'left-1'
                                }`}
                            />
                            <div className="relative z-10 flex w-full h-full text-[length:var(--text-label-caps)] font-bold font-[family-name:var(--font-label-caps)] uppercase pointer-events-none select-none">
                              <div className={`flex-1 flex items-center justify-center transition-colors ${(!data.mode || data.mode === 'save') ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-surface-variant)] opacity-50'}`}>
                                Save (Upsert)
                              </div>
                              <div className={`flex-1 flex items-center justify-center transition-colors ${(data.mode === 'search') ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-surface-variant)] opacity-50'}`}>
                                Search (RAG)
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Table Name</label>
                          <input
                            type="text"
                            value={data.tableName || ''}
                            onChange={(e) => handleChange('tableName', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                            placeholder="documents"
                          />
                        </div>

                        {data.mode === 'search' && (
                          <div>
                            <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Match Count Limit</label>
                            <input
                              type="number"
                              value={data.matchCount || 3}
                              onChange={(e) => handleChange('matchCount', parseInt(e.target.value))}
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
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
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">API Credential</label>
                          <select
                            value={data.credentialId || ''}
                            onChange={(e) => handleChange('credentialId', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="">-- Select Credential --</option>
                            {embeddingCredentials.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Model Version</label>
                          <select
                            value={data.model || ''}
                            onChange={(e) => handleChange('model', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="">-- Select Model --</option>
                            <option value="dall-e-3">DALL-E 3 (Requires OpenAI Key)</option>
                            <option value="gpt-image-2">GPT Image 2 (Requires OpenAI Key)</option>
                            <option value="chatgpt-image-latest">ChatGPT Image Latest (Requires OpenAI Key)</option>
                            <option value="gemini-3-pro-image">Nano Banana Pro (Requires Gemini Key)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Image Prompt</label>
                          <textarea
                            value={data.prompt || ''}
                            onChange={(e) => handleChange('prompt', e.target.value)}
                            className="w-full h-32 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input resize-y outline-none"
                            placeholder="An isometric building based on: {{lastOutput}}"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'postOffice' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Channel</label>
                          <div className="relative bg-[var(--color-inverse-surface)] inset-input p-1 flex items-center w-full h-10">
                            <div
                              className={`absolute h-8 w-[calc(33.333%-2px)] bg-[var(--color-surface)] tactile-button transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                                (!data.channel || data.channel === 'discord') ? 'left-1' :
                                data.channel === 'slack' ? 'left-[calc(33.333%+1px)]' :
                                'left-[calc(66.666%+2px)]'
                              }`}
                            />
                            <div className="relative z-10 flex w-full h-full text-[length:var(--text-label-caps)] font-bold font-[family-name:var(--font-label-caps)] uppercase select-none">
                              <div
                                onClick={() => handleChange('channel', 'discord')}
                                className={`flex-1 flex items-center justify-center gap-2 cursor-pointer transition-all ${(!data.channel || data.channel === 'discord') ? 'text-[var(--color-on-surface)] opacity-100' : 'text-[var(--color-surface-variant)] opacity-50'}`}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>forum</span>
                                Discord
                              </div>
                              <div
                                onClick={() => handleChange('channel', 'slack')}
                                className={`flex-1 flex items-center justify-center gap-2 cursor-pointer transition-all ${data.channel === 'slack' ? 'text-[var(--color-on-surface)] opacity-100' : 'text-[var(--color-surface-variant)] opacity-50'}`}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chat_bubble</span>
                                Slack
                              </div>
                              <div
                                onClick={() => handleChange('channel', 'email')}
                                className={`flex-1 flex items-center justify-center gap-2 cursor-pointer transition-all ${data.channel === 'email' ? 'text-[var(--color-on-surface)] opacity-100' : 'text-[var(--color-surface-variant)] opacity-50'}`}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>mail</span>
                                Email
                              </div>
                            </div>
                          </div>
                        </div>

                        {data.channel === 'email' ? (
                          <>
                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Resend API Credential</label>
                              <div className="flex gap-2">
                                <select
                                  value={data.credentialId || ''}
                                  onChange={(e) => handleChange('credentialId', e.target.value)}
                                  className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                                >
                                  <option value="">-- Select Resend Credential --</option>
                                  {credentials.filter(c => c.type === 'resend').map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => setShowNewCredForm(!showNewCredForm)}
                                  className="bg-[var(--color-surface)] hover:bg-[var(--color-surface)] text-[var(--color-on-surface)] tactile-button px-4 py-1 font-bold text-[length:var(--text-code-sm)] transition-colors"
                                >
                                  {showNewCredForm ? '-' : '+'}
                                </button>
                              </div>

                              {showNewCredForm && (
                                <div className="mt-2 p-4 bg-[var(--color-inverse-surface)] inset-input space-y-4">
                                  <h4 className="text-[var(--color-inverse-primary)] font-bold text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] uppercase tracking-widest border-b border-[var(--color-on-surface)] pb-2">Create New Credential</h4>
                                  <div>
                                    <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-1 text-[var(--color-on-surface-variant)]">Credential Name</label>
                                    <input
                                      type="text"
                                      value={newCredName}
                                      onChange={(e) => setNewCredName(e.target.value)}
                                      placeholder="e.g. Resend Key"
                                      autoComplete="off"
                                      className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-1 text-[var(--color-on-surface-variant)]">API Key</label>
                                    <input
                                      type="password"
                                      value={newCredKey}
                                      onChange={(e) => setNewCredKey(e.target.value)}
                                      placeholder="re_..."
                                      autoComplete="new-password"
                                      className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                    />
                                  </div>
                                  <button
                                    onClick={handleCreateCredential}
                                    disabled={!newCredName || !newCredKey || isSavingCred}
                                    className="w-full bg-[var(--color-tertiary-fixed)] hover:bg-[#5ae658] text-[var(--color-on-background)] font-bold py-2 px-4 uppercase tracking-wider tactile-button disabled:opacity-50"
                                  >
                                    {isSavingCred ? 'Saving...' : 'Save & Select'}
                                  </button>
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">To Address</label>
                              <input
                                type="text"
                                value={data.to || ''}
                                onChange={(e) => handleChange('to', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="user@example.com"
                              />
                            </div>
                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Subject</label>
                              <input
                                type="text"
                                value={data.subject || ''}
                                onChange={(e) => handleChange('subject', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Alert: {{lastOutput}}"
                              />
                            </div>
                          </>
                        ) : (
                          <div>
                            <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Webhook URL</label>
                            <input
                              type="text"
                              value={data.webhookUrl || ''}
                              onChange={(e) => handleChange('webhookUrl', e.target.value)}
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                              placeholder={(!data.channel || data.channel === 'discord') ? 'https://discord.com/api/webhooks/...' : 'https://hooks.slack.com/services/...'}
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Message Body</label>
                          <textarea
                            value={data.message || '{{lastOutput}}'}
                            onChange={(e) => handleChange('message', e.target.value)}
                            className="w-full h-28 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] py-1 px-2 inset-input outline-none resize-y"
                            placeholder="Workflow complete! Result: {{lastOutput}}"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'customWorkshop' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">JavaScript Code</label>
                          <textarea
                            value={data.code !== undefined ? data.code : 'return context.lastOutput;'}
                            onChange={(e) => handleChange('code', e.target.value)}
                            className="w-full h-48 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-3 inset-input resize-y outline-none"
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'webScraper' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Target URL</label>
                          <input
                            type="text"
                            value={data.url || ''}
                            onChange={(e) => handleChange('url', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                            placeholder="https://example.com or {{webhook.url}}"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'documentParser' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Document File</label>
                          <div className="relative">
                            <label className="w-full bg-[var(--color-surface)] hover:bg-[#06b6d4] hover:text-[var(--color-on-primary)] text-[var(--color-on-surface)] tactile-button py-2 px-4 text-center font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] font-bold uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer">
                              <input
                                type="file"
                                accept=".pdf,.csv,.txt"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    updateNodeData(selectedNode.id, { isUploading: true, uploadError: null });

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
                                className="hidden"
                              />
                              {data.isUploading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                'Choose File'
                              )}
                            </label>
                          </div>
                          {data.fileName && (
                            <div className="mt-2 text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold text-[var(--color-on-primary-container)] bg-[var(--color-primary-container)] p-2 bevel-container truncate">
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
                        <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Wait Duration (ms)</label>
                        <input
                          type="number"
                          value={data.delayMs || 5000}
                          onChange={(e) => handleChange('delayMs', parseInt(e.target.value))}
                          className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                          placeholder="5000"
                        />
                      </div>
                    )}

                    {selectedNode.type === 'conditional' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Condition Variable</label>
                          <input
                            type="text"
                            value={data.conditionLhs ?? '{{lastOutput}}'}
                            onChange={(e) => handleChange('conditionLhs', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                            placeholder="{{lastOutput}}"
                          />
                        </div>
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Operator</label>
                          <select
                            value={data.conditionOperator || 'contains'}
                            onChange={(e) => handleChange('conditionOperator', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="contains">Contains</option>
                            <option value="is_equal_to">Is Equal To</option>
                            <option value="is_not_equal_to">Is Not Equal To</option>
                            <option value="greater_than">Is Greater Than</option>
                            <option value="less_than">Is Less Than</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Compare Value</label>
                          <input
                            type="text"
                            value={data.conditionRhs ?? 'error'}
                            onChange={(e) => handleChange('conditionRhs', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                            placeholder="error"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'limit' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Max Items / Passes</label>
                          <input
                            type="number"
                            value={data.maxItems !== undefined ? data.maxItems : 1}
                            onChange={(e) => handleChange('maxItems', e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                            placeholder="1"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Keep</label>
                          <select
                            value={data.keepMode || 'first_items'}
                            onChange={(e) => handleChange('keepMode', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                          >
                            <option value="first_items">First Items</option>
                            <option value="last_items">Last Items</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'webhook' && (
                      <div className="bg-[var(--color-surface)] p-[var(--spacing-gutter-sm)] inset-input text-center text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] tracking-widest uppercase">
                        <div>LISTENING FOR TRIGGER</div>
                      </div>
                    )}

                    {selectedNode.type === 'clocktower' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Cron Expression</label>
                          <input
                            type="text"
                            value={data.cronExpression || ''}
                            onChange={(e) => handleChange('cronExpression', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                            placeholder="*/5 * * * *"
                          />
                          <p className="text-xs text-[var(--color-on-surface-variant)] mt-2 italic">Format: minute hour day month day-of-week</p>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <button
                            onClick={handleDeploySchedule}
                            disabled={!data.cronExpression || isNodeRunning}
                            className="flex-1 relative px-4 py-3 font-bold font-[family-name:var(--font-label-caps)] text-sm uppercase tracking-widest bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)] hover:bg-[#3ade1d] hover:text-black active:bg-[#2eaa16] active:translate-y-[2px] tactile-button transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black border-b-4"
                          >
                            DEPLOY
                          </button>
                          <button
                            onClick={handleStopSchedule}
                            disabled={isNodeRunning}
                            className="flex-1 relative px-4 py-3 font-bold font-[family-name:var(--font-label-caps)] text-sm uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 active:bg-red-700 active:translate-y-[2px] tactile-button transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black border-b-4"
                          >
                            STOP
                          </button>
                        </div>
                      </div>
                    )}


                    {selectedNode.type === 'googleDrive' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Action</label>
                          <select
                            value={data.action || 'read'}
                            onChange={(e) => handleChange('action', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="read">Read Google Doc / Text</option>
                            <option value="create">Create Google Doc</option>
                          </select>
                        </div>
                        
                        {(data.action === 'read' || !data.action) && (
                          <div>
                            <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">File ID</label>
                            <input
                              type="text"
                              value={data.fileId || ''}
                              onChange={(e) => handleChange('fileId', e.target.value)}
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                              placeholder="1BxiMVs0XRY..."
                            />
                            <p className="text-xs text-[var(--color-on-surface-variant)] mt-2">The unique ID from the Google Drive URL.</p>
                          </div>
                        )}

                        {data.action === 'create' && (
                          <>
                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Folder ID (Optional)</label>
                              <input
                                type="text"
                                value={data.folderId || ''}
                                onChange={(e) => handleChange('folderId', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="1BxiMVs0XRY..."
                              />
                            </div>
                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">File Name</label>
                              <input
                                type="text"
                                value={data.fileName || ''}
                                onChange={(e) => handleChange('fileName', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="output.txt"
                              />
                            </div>
                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">File Content</label>
                              <textarea
                                value={data.content || '{{lastOutput}}'}
                                onChange={(e) => handleChange('content', e.target.value)}
                                className="w-full h-32 bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] resize-y custom-scrollbar"
                                placeholder="{{lastOutput}}"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {selectedNode.type === 'output' && (
                      <div className="bg-[var(--color-surface)] p-[var(--spacing-gutter-sm)] inset-input text-center text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] tracking-widest uppercase">
                        <div>END OF LINE</div>
                      </div>
                    )}

                    {selectedNode.type === 'variable' && (
                      <div className="space-y-4">
                        <div className="bg-[var(--color-surface)] p-[var(--spacing-gutter-sm)] inset-input">
                          <p className="text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)] text-xs mb-3">
                            Define variables to reshape data or set static values. Use <span className="text-[var(--color-on-surface)] font-bold">{"{{lastOutput.field}}"}</span> to extract data.
                          </p>
                          {(data.variables || []).map((v: any, index: number) => (
                            <div key={index} className="flex space-x-2 items-start mb-2">
                              <input
                                type="text"
                                value={v.key || ''}
                                onChange={(e) => {
                                  const newVars = [...(data.variables || [])];
                                  newVars[index].key = e.target.value;
                                  handleChange('variables', newVars);
                                }}
                                className="w-1/3 bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Key"
                              />
                              <input
                                type="text"
                                value={v.value || ''}
                                onChange={(e) => {
                                  const newVars = [...(data.variables || [])];
                                  newVars[index].value = e.target.value;
                                  handleChange('variables', newVars);
                                }}
                                className="flex-1 bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="{{lastOutput.name}}"
                              />
                              <button
                                onClick={() => {
                                  const newVars = [...(data.variables || [])];
                                  newVars.splice(index, 1);
                                  handleChange('variables', newVars);
                                }}
                                className="text-red-500 hover:text-red-400 font-bold px-2 py-1"
                                title="Remove"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const newVars = [...(data.variables || []), { key: '', value: '' }];
                              handleChange('variables', newVars);
                            }}
                            className="w-full bg-blue-500 hover:bg-blue-400 text-white py-1 font-bold tactile-button uppercase tracking-wider text-sm mt-2 transition-colors"
                          >
                            + Add Variable
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'merge' && (
                      <div className="space-y-4">
                        <div className="bg-[var(--color-surface)] p-[var(--spacing-gutter-sm)] inset-input space-y-3">
                          <p className="text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] leading-relaxed">
                            Connect <span className="text-blue-400 font-bold">Branch A</span> (top handle) and <span className="text-purple-400 font-bold">Branch B</span> (bottom handle) from two separate pipeline paths.
                          </p>
                          <p className="text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] leading-relaxed">
                            The Junction Tower will wait for <span className="text-amber-400 font-bold">both</span> branches to finish, then combine their outputs and continue as one stream.
                          </p>
                          <div className="border-t border-[var(--color-on-surface-variant)] pt-3">
                            <p className="text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)] text-xs uppercase tracking-widest">Output Format</p>
                            <pre className="text-[var(--color-tertiary-fixed-dim)] font-[family-name:var(--font-code-sm)] text-xs mt-1 whitespace-pre-wrap">{`{\n  "branch_a": "...",\n  "branch_b": "..."\n}`}</pre>
                            <p className="text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)] text-xs mt-2">Use <span className="text-[var(--color-on-surface)] font-bold">{"{{_mergeA}}"}</span> or <span className="text-[var(--color-on-surface)] font-bold">{"{{_mergeB}}"}</span> in downstream prompts to reference each branch individually.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COLUMN 3: LOGS */}
              {activeTabs.includes('logs') && (
                <div className={`flex-1 flex flex-col overflow-hidden ${(activeTabs.includes('input') || activeTabs.includes('tasks')) ? 'border-l-2 border-[var(--color-on-surface)]' : ''}`}>
                  <div className="bg-[var(--color-inverse-surface)] border-b-2 border-[var(--color-on-surface)] py-1 text-center">
                    <h3 className="text-[var(--color-inverse-primary)] font-bold font-[family-name:var(--font-code-sm)] uppercase tracking-widest">Output Logs</h3>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto">
                    <div className="h-full bg-[var(--color-surface)] inset-input p-[var(--spacing-gutter-md)] text-[var(--color-on-surface)] flex flex-col relative">
                      {data.output && (
                        <div
                          className="relative bg-[var(--color-inverse-surface)] inset-input p-1 flex items-center w-36 h-8 cursor-pointer mb-4 shrink-0 self-end"
                          onClick={() => setViewAsJson(!viewAsJson)}
                        >
                          <div
                            className={`absolute h-6 w-[calc(50%-4px)] bg-[var(--color-surface)] tactile-button transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${viewAsJson ? 'left-[calc(50%+2px)]' : 'left-1'
                              }`}
                          />
                          <div className="relative z-10 flex w-full h-full text-[length:var(--text-label-caps)] font-bold font-[family-name:var(--font-label-caps)] uppercase pointer-events-none select-none">
                            <div className={`flex-1 flex items-center justify-center transition-colors ${!viewAsJson ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-surface-variant)] opacity-50'}`}>
                              RAW
                            </div>
                            <div className={`flex-1 flex items-center justify-center transition-colors ${viewAsJson ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-surface-variant)] opacity-50'}`}>
                              JSON
                            </div>
                          </div>
                        </div>
                      )}
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

                          if (parsedJson !== null && typeof parsedJson === 'object') {
                            return (
                              <div className="bg-transparent font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {Object.entries(parsedJson).map(([k, v]) => (
                                  <JsonNode
                                    key={k}
                                    keyName={k}
                                    value={v}
                                    path={Array.isArray(parsedJson) ? 'lastOutput' : `lastOutput.${k}`}
                                    onInsert={handleInsertVariable}
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
                              className="flex-1 w-full bg-transparent font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] resize-none outline-none pr-4 custom-scrollbar"
                              value={data.output}
                            />
                          )
                        )
                      ) : (
                        <div className="flex-1 flex items-center justify-center flex-col text-[var(--color-on-surface-variant)] font-mono text-sm">
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
