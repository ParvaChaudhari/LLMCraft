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

const getCredentialProvider = (nodeType: string, nodeData?: any): string | null => {
  if (nodeType === 'geminiFactory') return 'gemini';
  if (nodeType === 'chatgptFactory') return 'openai';
  if (nodeType === 'claudeFactory') return 'anthropic';
  if (nodeType === 'watchtower') return 'tavily';
  if (nodeType === 'dbSilo' || nodeType === 'bankVault') return 'postgres';
  if (nodeType === 'apify') return 'apify';
  if (nodeType === 'postOffice') return 'resend';
  if (nodeType === 'googleDrive') return 'google_drive';
  if (nodeType === 'github') return 'github';
  if (nodeType === 'objectStorage') return 's3';
  if (nodeType === 'audioStudio') {
    return 'gemini';
  }
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
  github: 'github.png',
  sawmill: 'sawmill.png',
  textRefinery: 'text_refinery.png',
  billboard: 'billboard.png',
  objectStorage: 'object_storage.png',
  audioStudio: 'recording_studio.png',
  webhookResponse: 'reply_tower.png',
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

  const [s3AccessKey, setS3AccessKey] = useState('');
  const [s3SecretKey, setS3SecretKey] = useState('');
  const [s3Region, setS3Region] = useState('us-east-1');
  const [s3Endpoint, setS3Endpoint] = useState('');

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
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [isToolConfigExpanded, setIsToolConfigExpanded] = useState<boolean>(false);

  useEffect(() => {
    setIsToolConfigExpanded(Boolean(selectedNode?.data?.toolName));
  }, [selectedNode?.id]);

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
    const credType = getCredentialProvider(selectedNode?.type, selectedNode?.data);

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
  }, [selectedNode?.type, selectedNode?.data?.provider]);

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
          } else if (eventName === 'NODE_PROGRESS' || eventName === 'LOG_ENTRY') {
            const msg = eventData.message || '';
            const logType = msg.includes('❌') || msg.includes('⚠️') ? 'error' : msg.includes('✅') || msg.includes('🏁') ? 'success' : 'info';
            setTerminalLogs(prev => [...prev, { time: timeStr, text: msg, type: logType }]);
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
    const credType = getCredentialProvider(selectedNode.type, selectedNode.data);
    
    let finalKey = newCredKey;
    if (credType === 'google_drive') {
      finalKey = JSON.stringify({
        client_id: gDriveClientId,
        client_secret: gDriveClientSecret,
        refresh_token: gDriveRefreshToken
      });
    } else if (credType === 's3') {
      finalKey = JSON.stringify({
        access_key_id: s3AccessKey,
        secret_access_key: s3SecretKey,
        region: s3Region || 'us-east-1',
        endpoint: s3Endpoint || undefined,
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
        setS3AccessKey('');
        setS3SecretKey('');
        setS3Region('us-east-1');
        setS3Endpoint('');
      } else if (newCred.error) {
        console.error('[Create Credential Error]', newCred.error);
        alert(`Failed to save credential: ${newCred.error}`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error saving credential: ${e.message}`);
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
              {['geminiFactory', 'chatgptFactory', 'claudeFactory', 'httpRequest', 'watchtower', 'customWorkshop', 'webScraper', 'documentParser', 'dbSilo', 'jsonParser', 'apify', 'bankVault', 'artStudio', 'postOffice', 'googleDrive', 'variable', 'airport', 'github', 'sawmill', 'textRefinery', 'objectStorage', 'audioStudio', 'webhookResponse'].includes(selectedNode.type) && (
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
                    {[...LLM_NODE_TYPES, 'watchtower', 'dbSilo', 'apify', 'bankVault', 'googleDrive', 'objectStorage', 'audioStudio'].includes(selectedNode.type) && (
                      <>
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">
                            {selectedNode.type === 'bankVault'
                              ? 'Database Credential (Postgres)'
                              : selectedNode.type === 'objectStorage'
                              ? 'S3 / R2 Authentication Credential'
                              : selectedNode.type === 'audioStudio'
                              ? (data.provider === 'openai' ? 'OpenAI API Credential' : 'Google / Gemini API Credential')
                              : 'Authentication Credential'}
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
                                  {getCredentialProvider(selectedNode.type) === 'postgres' ? 'Connection String' : getCredentialProvider(selectedNode.type) === 'google_drive' ? 'OAuth JSON (Client & Token)' : getCredentialProvider(selectedNode.type) === 's3' ? 'S3 / R2 Keys & Endpoint' : 'API Key'}
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
                                ) : getCredentialProvider(selectedNode.type) === 's3' ? (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={s3AccessKey}
                                      onChange={(e) => setS3AccessKey(e.target.value)}
                                      placeholder="Access Key ID (e.g. AKIA... or R2 token)"
                                      autoComplete="new-password"
                                      className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                    />
                                    <input
                                      type="password"
                                      value={s3SecretKey}
                                      onChange={(e) => setS3SecretKey(e.target.value)}
                                      placeholder="Secret Access Key"
                                      autoComplete="new-password"
                                      className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                    />
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={s3Region}
                                        onChange={(e) => setS3Region(e.target.value)}
                                        placeholder="Region (e.g. us-east-1, auto)"
                                        className="w-1/3 bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                      />
                                      <input
                                        type="text"
                                        value={s3Endpoint}
                                        onChange={(e) => setS3Endpoint(e.target.value)}
                                        placeholder="Endpoint URL (Optional for R2/MinIO)"
                                        className="w-2/3 bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                      />
                                    </div>
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

                            {/* Agent Mode & Tool Calling (AI Factory Nodes Only) */}
                            <div className="pt-4 mt-2 border-t border-[var(--color-on-surface)] space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold uppercase text-[var(--color-on-primary-container)] flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[15px] text-amber-500">build</span>
                                  Agent Mode & Tool Calling
                                </label>
                                <button
                                  onClick={() => handleChange('agentMode', !data.agentMode)}
                                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${data.agentMode ? 'bg-amber-500' : 'bg-[var(--color-surface-variant)]'}`}
                                >
                                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${data.agentMode ? 'left-5' : 'left-0.5'}`} />
                                </button>
                              </div>

                              {data.agentMode && (
                                <div className="space-y-3">
                                  <p className="text-[11px] text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)] leading-relaxed">
                                    Connect tool nodes (HTTP, DB, Search) to the <span className="text-amber-500 font-bold">amber pin</span> of this node. The AI will call them autonomously based on the prompt.
                                  </p>

                                  <div>
                                    <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Max Tool Rounds</label>
                                    <select
                                      value={data.maxToolRounds || 5}
                                      onChange={(e) => handleChange('maxToolRounds', parseInt(e.target.value, 10))}
                                      className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1.5 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                                    >
                                      <option value="1">1 (Single Tool Call)</option>
                                      <option value="3">3 (Lightweight Agent)</option>
                                      <option value="5">5 (Standard Agent)</option>
                                      <option value="10">10 (Deep Research Agent)</option>
                                    </select>
                                    <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-1 font-[family-name:var(--font-code-sm)]">Maximum number of tool calls before forcing a final answer.</p>
                                  </div>

                                  <div>
                                    <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Agent System Prompt (Optional)</label>
                                    <textarea
                                      value={data.agentSystemPrompt || ''}
                                      onChange={(e) => handleChange('agentSystemPrompt', e.target.value)}
                                      className="w-full h-20 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input resize-y outline-none"
                                      placeholder="You are a helpful assistant. Use the available tools to answer the user's question accurately."
                                    />
                                  </div>
                                </div>
                              )}
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

                        {/* Tool Calling Config for httpRequest */}
                        <div className="pt-3 border-t border-[var(--color-on-surface)] space-y-2">
                          <button
                            type="button"
                            onClick={() => setIsToolConfigExpanded(!isToolConfigExpanded)}
                            className="w-full flex items-center justify-between py-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <label className="text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold uppercase text-[var(--color-on-primary-container)] flex items-center gap-1.5 cursor-pointer">
                              <span className="material-symbols-outlined text-[15px] text-amber-500">build</span>
                              Tool Calling Config (Agent Mode)
                              {data.toolName && (
                                <span className="text-[9px] font-mono bg-black text-amber-300 font-bold px-1.5 py-0.5 shadow-sm">
                                  {data.toolName}
                                </span>
                              )}
                            </label>
                            <span className={`material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)] transition-transform duration-200 ${isToolConfigExpanded ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </button>

                          {isToolConfigExpanded && (
                            <div className="space-y-2 pt-1">
                              <p className="text-[11px] text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)]">
                                Fill to use as a callable tool for AI Factory nodes in Agent Mode.
                              </p>
                              <input
                                type="text"
                                value={data.toolName || ''}
                                onChange={(e) => handleChange('toolName', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool name: get_weather"
                              />
                              <input
                                type="text"
                                value={data.toolDescription || ''}
                                onChange={(e) => handleChange('toolDescription', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder='Tool description: Fetches live weather for a city.'
                              />
                              <textarea
                                value={data.toolSchema || ''}
                                onChange={(e) => handleChange('toolSchema', e.target.value)}
                                className="w-full h-16 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input resize-y outline-none"
                                placeholder='{"city": {"type": "string", "description": "The city name"}}'
                              />
                            </div>
                          )}
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

                        {/* Tool Calling Config for watchtower */}
                        <div className="pt-3 border-t border-[var(--color-on-surface)] space-y-2">
                          <button
                            type="button"
                            onClick={() => setIsToolConfigExpanded(!isToolConfigExpanded)}
                            className="w-full flex items-center justify-between py-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <label className="text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold uppercase text-[var(--color-on-primary-container)] flex items-center gap-1.5 cursor-pointer">
                              <span className="material-symbols-outlined text-[15px] text-amber-500">build</span>
                              Tool Calling Config (Agent Mode)
                              {data.toolName && (
                                <span className="text-[9px] font-mono bg-black text-amber-300 font-bold px-1.5 py-0.5 shadow-sm">
                                  {data.toolName}
                                </span>
                              )}
                            </label>
                            <span className={`material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)] transition-transform duration-200 ${isToolConfigExpanded ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </button>

                          {isToolConfigExpanded && (
                            <div className="space-y-2 pt-1">
                              <p className="text-[11px] text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)]">
                                Fill to use as a callable tool for AI Factory nodes in Agent Mode.
                              </p>
                              <input
                                type="text"
                                value={data.toolName || ''}
                                onChange={(e) => handleChange('toolName', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool name: search_web"
                              />
                              <input
                                type="text"
                                value={data.toolDescription || ''}
                                onChange={(e) => handleChange('toolDescription', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool description: Searches the web for up-to-date information."
                              />
                              <textarea
                                value={data.toolSchema || ''}
                                onChange={(e) => handleChange('toolSchema', e.target.value)}
                                className="w-full h-16 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input resize-y outline-none"
                                placeholder='{"query": {"type": "string", "description": "The search query"}}'
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'dbSilo' && (
                      <div className="space-y-2">
                        <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">SQL Query (Supports {"{{variable}}"} interpolation)</label>
                        <textarea
                          value={data.query || ''}
                          onChange={(e) => handleChange('query', e.target.value)}
                          className="w-full h-32 p-3 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] inset-input resize-y outline-none"
                          placeholder="SELECT * FROM users WHERE email = '{{lastOutput}}';"
                        />
                        {/* Tool Calling Config for dbSilo */}
                        <div className="pt-3 border-t border-[var(--color-on-surface)] space-y-2">
                          <button
                            type="button"
                            onClick={() => setIsToolConfigExpanded(!isToolConfigExpanded)}
                            className="w-full flex items-center justify-between py-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <label className="text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold uppercase text-[var(--color-on-primary-container)] flex items-center gap-1.5 cursor-pointer">
                              <span className="material-symbols-outlined text-[15px] text-amber-500">build</span>
                              Tool Calling Config (Agent Mode)
                              {data.toolName && (
                                <span className="text-[9px] font-mono bg-black text-amber-300 font-bold px-1.5 py-0.5 shadow-sm">
                                  {data.toolName}
                                </span>
                              )}
                            </label>
                            <span className={`material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)] transition-transform duration-200 ${isToolConfigExpanded ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </button>

                          {isToolConfigExpanded && (
                            <div className="space-y-2 pt-1">
                              <input
                                type="text"
                                value={data.toolName || ''}
                                onChange={(e) => handleChange('toolName', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool name: lookup_customer"
                              />
                              <input
                                type="text"
                                value={data.toolDescription || ''}
                                onChange={(e) => handleChange('toolDescription', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder='Tool description: Looks up customer data by email.'
                              />
                              <textarea
                                value={data.toolSchema || ''}
                                onChange={(e) => handleChange('toolSchema', e.target.value)}
                                className="w-full h-16 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input resize-y outline-none"
                                placeholder='{"email": {"type": "string", "description": "Customer email address"}}'
                              />
                            </div>
                          )}
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

                        {/* Tool Calling Config for bankVault */}
                        <div className="pt-3 border-t border-[var(--color-on-surface)] space-y-2">
                          <button
                            type="button"
                            onClick={() => setIsToolConfigExpanded(!isToolConfigExpanded)}
                            className="w-full flex items-center justify-between py-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <label className="text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold uppercase text-[var(--color-on-primary-container)] flex items-center gap-1.5 cursor-pointer">
                              <span className="material-symbols-outlined text-[15px] text-amber-500">build</span>
                              Tool Calling Config (Agent Mode)
                              {data.toolName && (
                                <span className="text-[9px] font-mono bg-black text-amber-300 font-bold px-1.5 py-0.5 shadow-sm">
                                  {data.toolName}
                                </span>
                              )}
                            </label>
                            <span className={`material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)] transition-transform duration-200 ${isToolConfigExpanded ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </button>

                          {isToolConfigExpanded && (
                            <div className="space-y-2 pt-1">
                              <input
                                type="text"
                                value={data.toolName || ''}
                                onChange={(e) => handleChange('toolName', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool name: search_supabase_docs"
                              />
                              <input
                                type="text"
                                value={data.toolDescription || ''}
                                onChange={(e) => handleChange('toolDescription', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool description: Semantically searches the vector database for relevant documentation."
                              />
                              <textarea
                                value={data.toolSchema || ''}
                                onChange={(e) => handleChange('toolSchema', e.target.value)}
                                className="w-full h-16 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input resize-y outline-none"
                                placeholder='{"query": {"type": "string", "description": "Search query to find in knowledge base"}}'
                              />
                            </div>
                          )}
                        </div>
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
                                  disabled={
                                    !newCredName ||
                                    (getCredentialProvider(selectedNode.type, selectedNode.data) === 'google_drive'
                                      ? !(gDriveClientId && gDriveClientSecret && gDriveRefreshToken)
                                      : getCredentialProvider(selectedNode.type, selectedNode.data) === 's3'
                                      ? !(s3AccessKey && s3SecretKey)
                                      : !newCredKey) ||
                                    isSavingCred
                                  }
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

                        {/* Tool Calling Config for customWorkshop */}
                        <div className="pt-3 border-t border-[var(--color-on-surface)] space-y-2">
                          <button
                            type="button"
                            onClick={() => setIsToolConfigExpanded(!isToolConfigExpanded)}
                            className="w-full flex items-center justify-between py-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <label className="text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold uppercase text-[var(--color-on-primary-container)] flex items-center gap-1.5 cursor-pointer">
                              <span className="material-symbols-outlined text-[15px] text-amber-500">build</span>
                              Tool Calling Config (Agent Mode)
                              {data.toolName && (
                                <span className="text-[9px] font-mono bg-black text-amber-300 font-bold px-1.5 py-0.5 shadow-sm">
                                  {data.toolName}
                                </span>
                              )}
                            </label>
                            <span className={`material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)] transition-transform duration-200 ${isToolConfigExpanded ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </button>

                          {isToolConfigExpanded && (
                            <div className="space-y-2 pt-1">
                              <p className="text-[11px] text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)]">
                                Allow AI Agents to execute custom JavaScript scripts or calculations.
                              </p>
                              <input
                                type="text"
                                value={data.toolName || ''}
                                onChange={(e) => handleChange('toolName', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool name: execute_code"
                              />
                              <input
                                type="text"
                                value={data.toolDescription || ''}
                                onChange={(e) => handleChange('toolDescription', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool description: Executes custom JavaScript code to perform precise calculations or data transformations."
                              />
                              <textarea
                                value={data.toolSchema || ''}
                                onChange={(e) => handleChange('toolSchema', e.target.value)}
                                className="w-full h-16 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input resize-y outline-none"
                                placeholder='{"code": {"type": "string", "description": "JavaScript code string to evaluate, returning a value"}}'
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'github' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">GitHub PAT Credential</label>
                          <div className="flex gap-2">
                            <select
                              value={data.credentialId || ''}
                              onChange={(e) => handleChange('credentialId', e.target.value)}
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                            >
                              <option value="">-- Select GitHub PAT --</option>
                              {credentials.filter(c => c.type === 'github').map(c => (
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
                                  placeholder="e.g. GitHub Token"
                                  autoComplete="off"
                                  className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                />
                              </div>
                              <div>
                                <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-1 text-[var(--color-on-surface-variant)]">Personal Access Token</label>
                                <input
                                  type="password"
                                  value={newCredKey}
                                  onChange={(e) => setNewCredKey(e.target.value)}
                                  placeholder="ghp_..."
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
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Action</label>
                          <select
                            value={data.action || 'fetch_file'}
                            onChange={(e) => handleChange('action', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold mb-4"
                          >
                            <option value="fetch_file">Fetch File</option>
                            <option value="search_issues">Search Issues</option>
                            <option value="create_issue">Create Issue</option>
                            <option value="post_comment">Post Comment</option>
                          </select>
                        </div>
                        
                        {(data.action === 'fetch_file' || data.action === 'create_issue' || data.action === 'post_comment') && (
                          <div>
                            <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Repository</label>
                            <input
                              type="text"
                              value={data.repository || ''}
                              onChange={(e) => handleChange('repository', e.target.value)}
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                              placeholder="owner/repo"
                            />
                          </div>
                        )}

                        {data.action === 'fetch_file' && (
                          <div>
                            <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">File Path</label>
                            <input
                              type="text"
                              value={data.filePath || ''}
                              onChange={(e) => handleChange('filePath', e.target.value)}
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                              placeholder="src/lib/worker.ts"
                            />
                          </div>
                        )}

                        {data.action === 'search_issues' && (
                          <div>
                            <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Search Query</label>
                            <input
                              type="text"
                              value={data.query || ''}
                              onChange={(e) => handleChange('query', e.target.value)}
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                              placeholder="repo:owner/repo is:open label:bug"
                            />
                          </div>
                        )}

                        {data.action === 'create_issue' && (
                          <div>
                            <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Issue Title</label>
                            <input
                              type="text"
                              value={data.title || ''}
                              onChange={(e) => handleChange('title', e.target.value)}
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                              placeholder="Automated Bug Report"
                            />
                          </div>
                        )}

                        {(data.action === 'post_comment' || data.action === 'create_issue') && (
                          <div>
                            {data.action === 'post_comment' && (
                              <div className="mb-4">
                                <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Issue / PR Number</label>
                                <input
                                  type="text"
                                  value={data.issueNumber || ''}
                                  onChange={(e) => handleChange('issueNumber', e.target.value)}
                                  className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                  placeholder="123"
                                />
                              </div>
                            )}
                            <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Body (Markdown)</label>
                            <textarea
                              value={data.body || '{{lastOutput}}'}
                              onChange={(e) => handleChange('body', e.target.value)}
                              className="w-full h-32 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] py-1 px-2 inset-input outline-none resize-y"
                              placeholder="{{lastOutput}}"
                            />
                          </div>
                        )}

                        {/* Callable Tool Section */}
                        <div className="pt-3 border-t border-[var(--color-on-surface)] space-y-2">
                          <button
                            type="button"
                            onClick={() => setIsToolConfigExpanded(!isToolConfigExpanded)}
                            className="w-full flex items-center justify-between py-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <label className="text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold uppercase text-[var(--color-on-primary-container)] flex items-center gap-1.5 cursor-pointer">
                              <span className="material-symbols-outlined text-[15px] text-amber-500">build</span>
                              Tool Calling Config (Agent Mode)
                              {data.toolName && (
                                <span className="text-[9px] font-mono bg-black text-amber-300 font-bold px-1.5 py-0.5 shadow-sm">
                                  {data.toolName}
                                </span>
                              )}
                            </label>
                            <span className={`material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)] transition-transform duration-200 ${isToolConfigExpanded ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </button>

                          {isToolConfigExpanded && (
                            <div className="space-y-2 pt-1">
                              <p className="text-[11px] text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)]">
                                Allow AI Agents to interact with GitHub (fetch files, search issues, create issues, post comments).
                              </p>
                              <input
                                type="text"
                                value={data.toolName || ''}
                                onChange={(e) => handleChange('toolName', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool name: github_tool"
                              />
                              <input
                                type="text"
                                value={data.toolDescription || ''}
                                onChange={(e) => handleChange('toolDescription', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool description: Interacts with GitHub repositories to fetch files, search issues, or create issues."
                              />
                              <textarea
                                value={data.toolSchema || ''}
                                onChange={(e) => handleChange('toolSchema', e.target.value)}
                                className="w-full h-24 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input resize-y outline-none"
                                placeholder='{"action": {"type": "string", "description": "fetch_file | search_issues | create_issue | post_comment"}, "repository": {"type": "string", "description": "owner/repo"}, "filePath": {"type": "string", "description": "Path to file"}, "query": {"type": "string", "description": "Issue search query"}, "title": {"type": "string", "description": "Issue title"}, "body": {"type": "string", "description": "Body or comment text"}}'
                              />
                            </div>
                          )}
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

                        {/* Callable Tool Section */}
                        <div className="pt-3 border-t border-[var(--color-on-surface)] space-y-2">
                          <button
                            type="button"
                            onClick={() => setIsToolConfigExpanded(!isToolConfigExpanded)}
                            className="w-full flex items-center justify-between py-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <label className="text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold uppercase text-[var(--color-on-primary-container)] flex items-center gap-1.5 cursor-pointer">
                              <span className="material-symbols-outlined text-[15px] text-amber-500">build</span>
                              Tool Calling Config (Agent Mode)
                              {data.toolName && (
                                <span className="text-[9px] font-mono bg-black text-amber-300 font-bold px-1.5 py-0.5 shadow-sm">
                                  {data.toolName}
                                </span>
                              )}
                            </label>
                            <span className={`material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)] transition-transform duration-200 ${isToolConfigExpanded ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </button>

                          {isToolConfigExpanded && (
                            <div className="space-y-2 pt-1">
                              <p className="text-[11px] text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)]">
                                Allow AI Agents to scrape and read full web page content from any URL.
                              </p>
                              <input
                                type="text"
                                value={data.toolName || ''}
                                onChange={(e) => handleChange('toolName', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool name: scrape_webpage"
                              />
                              <input
                                type="text"
                                value={data.toolDescription || ''}
                                onChange={(e) => handleChange('toolDescription', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool description: Fetches and extracts clean, readable text from a specified webpage URL."
                              />
                              <textarea
                                value={data.toolSchema || ''}
                                onChange={(e) => handleChange('toolSchema', e.target.value)}
                                className="w-full h-16 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input resize-y outline-none"
                                placeholder='{"url": {"type": "string", "description": "The URL of the webpage to scrape and read"}}'
                              />
                            </div>
                          )}
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

                    {selectedNode.type === 'sawmill' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Split Strategy</label>
                          <select
                            value={data.splitBy || 'characters'}
                            onChange={(e) => handleChange('splitBy', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="characters">Characters</option>
                            <option value="words">Words</option>
                            <option value="paragraphs">Paragraphs (Double Newline)</option>
                            <option value="sentences">Sentences (. ! ?)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Chunk Size ({data.splitBy === 'words' ? 'words' : 'chars'})</label>
                          <input
                            type="number"
                            value={data.chunkSize !== undefined ? data.chunkSize : 500}
                            onChange={(e) => handleChange('chunkSize', e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                            placeholder="500"
                            min="1"
                          />
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Overlap ({data.splitBy === 'words' ? 'words' : 'chars'})</label>
                          <input
                            type="number"
                            value={data.overlap !== undefined ? data.overlap : 50}
                            onChange={(e) => handleChange('overlap', e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                            placeholder="50"
                            min="0"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'textRefinery' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Refinery Mode</label>
                          <select
                            value={data.mode || 'extract_regex'}
                            onChange={(e) => handleChange('mode', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="extract_regex">Extract Regex Matches</option>
                            <option value="replace_regex">Search & Replace (Regex / Text)</option>
                            <option value="case_transform">Case & Text Formatter</option>
                          </select>
                        </div>

                        {(data.mode === 'extract_regex' || !data.mode) && (
                          <>
                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Regex Pattern</label>
                              <input
                                type="text"
                                value={data.pattern !== undefined ? data.pattern : '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'}
                                onChange={(e) => handleChange('pattern', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-mono"
                                placeholder="e.g. \\d{4}-\\d{2}-\\d{2}"
                              />
                            </div>

                            <div className="flex gap-3">
                              <div className="w-1/3">
                                <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Flags</label>
                                <input
                                  type="text"
                                  value={data.flags !== undefined ? data.flags : 'g'}
                                  onChange={(e) => handleChange('flags', e.target.value)}
                                  className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-mono"
                                  placeholder="g, i, m"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Output Format</label>
                                <select
                                  value={data.matchFormat || 'all_array'}
                                  onChange={(e) => handleChange('matchFormat', e.target.value)}
                                  className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                                >
                                  <option value="all_array">JSON Array of Matches</option>
                                  <option value="first_match">First Match Only (String)</option>
                                  <option value="joined_newline">Joined with Newlines</option>
                                  <option value="joined_comma">Joined with Commas</option>
                                </select>
                              </div>
                            </div>
                          </>
                        )}

                        {data.mode === 'replace_regex' && (
                          <>
                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Search Pattern (Regex or Text)</label>
                              <input
                                type="text"
                                value={data.pattern !== undefined ? data.pattern : ''}
                                onChange={(e) => handleChange('pattern', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-mono"
                                placeholder="e.g. \\s+ or bad_word"
                              />
                            </div>

                            <div className="flex gap-3">
                              <div className="w-1/3">
                                <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Flags</label>
                                <input
                                  type="text"
                                  value={data.flags !== undefined ? data.flags : 'g'}
                                  onChange={(e) => handleChange('flags', e.target.value)}
                                  className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-mono"
                                  placeholder="g, i, m"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Replace With</label>
                                <input
                                  type="text"
                                  value={data.replaceWith !== undefined ? data.replaceWith : ''}
                                  onChange={(e) => handleChange('replaceWith', e.target.value)}
                                  className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                  placeholder="e.g. [REDACTED] or $1"
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {data.mode === 'case_transform' && (
                          <div>
                            <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Transform Type</label>
                            <select
                              value={data.caseType || 'title_case'}
                              onChange={(e) => handleChange('caseType', e.target.value)}
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                            >
                              <option value="uppercase">UPPERCASE</option>
                              <option value="lowercase">lowercase</option>
                              <option value="title_case">Title Case</option>
                              <option value="camel_case">camelCase</option>
                              <option value="snake_case">snake_case</option>
                              <option value="kebab_case">kebab-case</option>
                              <option value="trim">Trim Whitespace</option>
                              <option value="slugify">URL Slug (slug-style)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedNode.type === 'billboard' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Signboard Headline</label>
                          <input
                            type="text"
                            value={data.title !== undefined ? data.title : 'NOTE'}
                            onChange={(e) => handleChange('title', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1.5 px-2.5 inset-input outline-none font-[family-name:var(--font-label-caps)] text-sm font-bold uppercase tracking-wider"
                            placeholder="e.g. INGESTION PIPELINE"
                          />
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Signboard Message / Documentation</label>
                          <textarea
                            value={data.content !== undefined ? data.content : ''}
                            onChange={(e) => handleChange('content', e.target.value)}
                            className="w-full h-32 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2.5 inset-input resize-y outline-none"
                            placeholder="Type documentation, instructions, or pipeline notes..."
                          />
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Color & Visual Theme</label>
                          <select
                            value={data.theme || 'classic'}
                            onChange={(e) => handleChange('theme', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1.5 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="classic">Classic Cream & Charcoal</option>
                            <option value="cyber">Cyber Neon Cyan</option>
                            <option value="amber">Amber Highway Matrix</option>
                            <option value="hazard">Construction Hazard Yellow</option>
                          </select>
                        </div>

                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Font Size</label>
                            <select
                              value={data.fontSize || 'md'}
                              onChange={(e) => handleChange('fontSize', e.target.value)}
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                            >
                              <option value="sm">Small</option>
                              <option value="md">Medium</option>
                              <option value="lg">Large</option>
                            </select>
                          </div>

                          <div className="flex-1">
                            <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Alignment</label>
                            <select
                              value={data.align || 'center'}
                              onChange={(e) => handleChange('align', e.target.value)}
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                            >
                              <option value="center">Center</option>
                              <option value="left">Left</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'objectStorage' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Bucket Action</label>
                          <select
                            value={data.action || 'upload_object'}
                            onChange={(e) => handleChange('action', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="upload_object">Upload Object / File</option>
                            <option value="read_object">Read / Download Object</option>
                            <option value="list_objects">List Objects in Bucket</option>
                            <option value="delete_object">Delete Object</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Bucket Name</label>
                          <input
                            type="text"
                            value={data.bucketName || ''}
                            onChange={(e) => handleChange('bucketName', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                            placeholder="e.g. my-app-production-bucket"
                          />
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">
                            {data.action === 'list_objects' ? 'Prefix / Folder Path (Optional)' : 'Object Key / Path'}
                          </label>
                          <input
                            type="text"
                            value={data.objectKey !== undefined ? data.objectKey : ''}
                            onChange={(e) => handleChange('objectKey', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                            placeholder={data.action === 'list_objects' ? "e.g. images/ or exports/" : "e.g. data/results.json or images/{{filename}}.png"}
                          />
                        </div>

                        {(data.action === 'upload_object' || !data.action) && (
                          <>
                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Payload / Body Content</label>
                              <textarea
                                value={data.body !== undefined ? data.body : '{{lastOutput}}'}
                                onChange={(e) => handleChange('body', e.target.value)}
                                className="w-full h-24 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input resize-y outline-none"
                                placeholder="{{lastOutput}} or custom data to upload..."
                              />
                            </div>

                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Content-Type</label>
                              <input
                                type="text"
                                value={data.contentType || 'application/json'}
                                onChange={(e) => handleChange('contentType', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="e.g. application/json, text/plain, image/png, auto"
                              />
                            </div>
                          </>
                        )}

                        {/* Callable Tool Section */}
                        <div className="pt-3 border-t border-[var(--color-on-surface)] space-y-2">
                          <button
                            type="button"
                            onClick={() => setIsToolConfigExpanded(!isToolConfigExpanded)}
                            className="w-full flex items-center justify-between py-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <label className="text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold uppercase text-[var(--color-on-primary-container)] flex items-center gap-1.5 cursor-pointer">
                              <span className="material-symbols-outlined text-[15px] text-amber-500">build</span>
                              Tool Calling Config (Agent Mode)
                              {data.toolName && (
                                <span className="text-[9px] font-mono bg-black text-amber-300 font-bold px-1.5 py-0.5 shadow-sm">
                                  {data.toolName}
                                </span>
                              )}
                            </label>
                            <span className={`material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)] transition-transform duration-200 ${isToolConfigExpanded ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </button>

                          {isToolConfigExpanded && (
                            <div className="space-y-2 pt-1">
                              <p className="text-[11px] text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)]">
                                Allow AI Agents to interact with AWS S3 / Cloudflare R2 / MinIO storage (upload, read, list, delete objects).
                              </p>
                              <input
                                type="text"
                                value={data.toolName || ''}
                                onChange={(e) => handleChange('toolName', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool name: s3_storage"
                              />
                              <input
                                type="text"
                                value={data.toolDescription || ''}
                                onChange={(e) => handleChange('toolDescription', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Tool description: Uploads, reads, lists, or deletes files and data objects in an S3-compatible cloud storage bucket."
                              />
                              <textarea
                                value={data.toolSchema || ''}
                                onChange={(e) => handleChange('toolSchema', e.target.value)}
                                className="w-full h-24 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input resize-y outline-none"
                                placeholder='{"action": {"type": "string", "description": "read_object | upload_object | list_objects | delete_object"}, "bucketName": {"type": "string", "description": "S3 bucket name"}, "objectKey": {"type": "string", "description": "Object key / file path (or prefix for list_objects)"}, "body": {"type": "string", "description": "Content string to upload for upload_object"}, "contentType": {"type": "string", "description": "Content-Type for uploaded object"}}'
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'audioStudio' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Studio Operation</label>
                          <select
                            value={data.mode || 'text_to_speech'}
                            onChange={(e) => handleChange('mode', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1.5 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="text_to_speech">Text-to-Speech (Generate Voice Audio)</option>
                            <option value="speech_to_text">Speech-to-Text (Transcribe Audio)</option>
                          </select>
                        </div>

                        {(data.mode === 'text_to_speech' || !data.mode) ? (
                          <>
                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Gemini Voice</label>
                              <select
                                value={data.voice || 'Kore'}
                                onChange={(e) => handleChange('voice', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                              >
                                <option value="Kore">Kore (Clear / Soothing Female)</option>
                                <option value="Leda">Leda (Precise / Articulate Female)</option>
                                <option value="Orus">Orus (Warm / Narrative Male)</option>
                                <option value="Charon">Charon (Deep / Authoritative Male)</option>
                                <option value="Puck">Puck (Energetic / Natural Male)</option>
                                <option value="Fenrir">Fenrir (Bold / Resonant Male)</option>
                                <option value="Aoede">Aoede (Expressive / Warm Female)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Text Script to Synthesize</label>
                              <textarea
                                value={data.text !== undefined ? data.text : '{{lastOutput}}'}
                                onChange={(e) => handleChange('text', e.target.value)}
                                className="w-full h-28 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2.5 inset-input resize-y outline-none"
                                placeholder="{{lastOutput}} or type the text to speak..."
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Audio Source (URL, S3 Link, or Base64 Audio)</label>
                              <textarea
                                value={data.audioSource !== undefined ? data.audioSource : '{{lastOutput}}'}
                                onChange={(e) => handleChange('audioSource', e.target.value)}
                                className="w-full h-24 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2.5 inset-input resize-y outline-none"
                                placeholder="{{lastOutput}} or https://example.com/audio.mp3"
                              />
                            </div>

                            <div>
                              <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Language (Optional ISO code, e.g. en, es, fr)</label>
                              <input
                                type="text"
                                value={data.language || ''}
                                onChange={(e) => handleChange('language', e.target.value)}
                                className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]"
                                placeholder="Leave blank for automatic detection"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {selectedNode.type === 'webhook' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Execution & Response Mode</label>
                          <select
                            value={data.executionMode || 'async'}
                            onChange={(e) => handleChange('executionMode', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1.5 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="async">⚡ Asynchronous (Instant 200 Queue Receipt)</option>
                            <option value="sync">🔄 Synchronous (Wait for Pipeline Response)</option>
                          </select>
                          <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-1 font-[family-name:var(--font-code-sm)] leading-relaxed">
                            {data.executionMode === 'sync'
                              ? 'Holds the HTTP connection open up to 30s and returns the computed payload from a Reply Tower or final node.'
                              : 'Immediately returns { workflowId, status: "queued" }. Best for background jobs or scrapers.'}
                          </p>
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Public Webhook URL</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/${window.location.pathname.split('/').pop()}` : '/api/webhook/:id'}
                              className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] select-all"
                            />
                            <button
                              onClick={() => {
                                if (typeof window !== 'undefined') {
                                  const url = `${window.location.origin}/api/webhook/${window.location.pathname.split('/').pop()}`;
                                  navigator.clipboard.writeText(url);
                                  setCopiedWebhookUrl(true);
                                  setTimeout(() => setCopiedWebhookUrl(false), 2000);
                                }
                              }}
                              className="bg-[var(--color-surface)] hover:bg-[var(--color-surface)] text-[var(--color-on-surface)] tactile-button px-2 py-0.5 font-bold text-xs shrink-0 flex items-center justify-center min-w-[28px] h-[26px]"
                              title={copiedWebhookUrl ? 'Copied!' : 'Copy URL'}
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {copiedWebhookUrl ? 'check' : 'content_copy'}
                              </span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Test Payload (JSON Simulation)</label>
                          <textarea
                            value={data.mockPayload !== undefined ? data.mockPayload : '{\n  "message": "Hello from external webhook!",\n  "userId": 42\n}'}
                            onChange={(e) => handleChange('mockPayload', e.target.value)}
                            className="w-full h-24 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input resize-y outline-none"
                            placeholder='{"event": "user.created", "data": { ... }}'
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'webhookResponse' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">HTTP Status Code</label>
                          <div className="flex gap-2">
                            <select
                              value={data.statusCode || '200'}
                              onChange={(e) => handleChange('statusCode', e.target.value)}
                              className="w-2/3 bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1.5 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                            >
                              <option value="200">200 - OK (Success)</option>
                              <option value="201">201 - Created</option>
                              <option value="202">202 - Accepted</option>
                              <option value="400">400 - Bad Request (Client Error)</option>
                              <option value="401">401 - Unauthorized</option>
                              <option value="403">403 - Forbidden</option>
                              <option value="404">404 - Not Found</option>
                              <option value="422">422 - Unprocessable Entity</option>
                              <option value="500">500 - Internal Server Error</option>
                            </select>
                            <input
                              type="number"
                              value={data.statusCode || 200}
                              onChange={(e) => handleChange('statusCode', parseInt(e.target.value, 10) || 200)}
                              className="w-1/3 bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                              placeholder="200"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Response Content-Type</label>
                          <select
                            value={data.contentType || 'application/json'}
                            onChange={(e) => handleChange('contentType', e.target.value)}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1.5 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="application/json">application/json (JSON Payload)</option>
                            <option value="text/plain">text/plain (Raw String / Text)</option>
                            <option value="text/html">text/html (HTML Markup)</option>
                            <option value="application/xml">application/xml (XML Document)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Response Body Payload</label>
                          <textarea
                            value={data.responseBody !== undefined ? data.responseBody : '{{lastOutput}}'}
                            onChange={(e) => handleChange('responseBody', e.target.value)}
                            className="w-full h-32 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2.5 inset-input resize-y outline-none"
                            placeholder='{{lastOutput}} or {\n  "success": true,\n  "data": {{lastOutput}}\n}'
                          />
                        </div>

                        <div>
                          <label className="block text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold mb-2 uppercase text-[var(--color-on-primary-container)]">Custom Response Headers (JSON)</label>
                          <textarea
                            value={data.customHeaders || ''}
                            onChange={(e) => handleChange('customHeaders', e.target.value)}
                            className="w-full h-20 bg-[var(--color-surface)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] p-2 inset-input resize-y outline-none"
                            placeholder='{\n  "X-Custom-API-Version": "1.0",\n  "X-Execution-Engine": "LLMCraft"\n}'
                          />
                        </div>
                      </div>
                    )}

                    {/* Standardized Fault Tolerance & Auto-Retry for all AI & Network Nodes */}
                    {['geminiFactory', 'chatgptFactory', 'claudeFactory', 'httpRequest', 'watchtower', 'dbSilo', 'webScraper', 'apify', 'documentParser', 'artStudio', 'audioStudio', 'googleDrive', 'objectStorage', 'github', 'bankVault'].includes(selectedNode.type) && (
                      <div className="pt-4 mt-2 border-t border-[var(--color-on-surface)] space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[length:var(--text-label-caps)] font-[family-name:var(--font-label-caps)] font-bold uppercase text-[var(--color-on-primary-container)] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-amber-500">shield</span>
                            Fault Tolerance & Auto-Retry
                          </label>
                          {data.retryCount && data.retryCount > 0 ? (
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded uppercase">
                              {data.retryCount}x Retry Active
                            </span>
                          ) : null}
                        </div>

                        <div>
                          <select
                            value={data.retryCount !== undefined ? data.retryCount : 0}
                            onChange={(e) => handleChange('retryCount', parseInt(e.target.value, 10))}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] py-1.5 px-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-bold"
                          >
                            <option value="0">Off (Fail immediately on error)</option>
                            <option value="1">1x Retry (1s backoff)</option>
                            <option value="2">2x Retries (1s, 2s exponential backoff)</option>
                            <option value="3">3x Retries (1s, 2s, 4s exponential backoff)</option>
                          </select>
                          <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-1 font-[family-name:var(--font-code-sm)] leading-relaxed">
                            Automatically retries on 429 rate limits, 503/504 server timeouts, and socket drops.
                          </p>
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
                          })() : (data.output.startsWith('data:audio/') || data.output.includes('[AUDIO GENERATED]')) ? (() => {
                            let audioSrc = data.output;
                            const match = data.output.match(/Data:\s*(data:audio\/[^\s]+)/);
                            if (match) audioSrc = match[1].trim();
                            return (
                              <div className="flex-1 w-full overflow-y-auto flex flex-col items-center justify-center p-2 custom-scrollbar">
                                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm w-full flex flex-col items-center gap-3">
                                  <div className="flex items-center gap-2 text-fuchsia-600 font-bold text-xs uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-[20px]">graphic_eq</span>
                                    <span>Synthesized Audio</span>
                                  </div>
                                  <audio controls src={audioSrc} className="w-full" autoPlay={false} />
                                </div>
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
