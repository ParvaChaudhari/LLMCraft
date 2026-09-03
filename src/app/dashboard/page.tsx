'use client';

import { useEffect, useState, useRef, PointerEvent as ReactPointerEvent, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import IsometricCompound from './IsometricCompound';
import ApprovalsModal from './ApprovalsModal';
import { TEMPLATES, instantiateTemplate } from '@/lib/templates';

export default function DashboardPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any | null>(null);
  const [showNewSectorModal, setShowNewSectorModal] = useState(false);
  const [newSectorName, setNewSectorName] = useState('Web Research City');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('web-research-agent');
  const [isCreating, setIsCreating] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  // History State
  const [activeTab, setActiveTab] = useState<'logs' | 'history'>('logs');
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (activeTab === 'history' && selectedWorkflow) {
      setIsLoadingHistory(true);
      supabase
        .from('executions')
        .select('id, status, created_at')
        .eq('workflow_id', selectedWorkflow.id)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data, error }) => {
          if (!error && data) setHistory(data);
          setIsLoadingHistory(false);
        });
    }
  }, [activeTab, selectedWorkflow]);

  const [showInbox, setShowInbox] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  // Pan and Zoom state for custom canvas
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [defaultView, setDefaultView] = useState({ pan: { x: 0, y: 0 }, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isCentering, setIsCentering] = useState(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPan = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // Don't drag if clicking on UI elements like buttons or modals
    if ((e.target as HTMLElement).closest('button, input, .modal, .ui-panel, .iso-compound')) return;

    setIsDragging(true);
    setIsCentering(false);
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPan.current = { x: pan.x, y: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - startMouse.current.x;
    const dy = e.clientY - startMouse.current.y;
    setPan({ x: startPan.current.x + dx, y: startPan.current.y + dy });
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Zoom on ctrl+wheel (pinch) OR if standard mouse wheel (deltaY present, no deltaX)
    const isMouseWheelZoom = Math.abs(e.deltaY) > 0 && e.deltaX === 0 && !e.ctrlKey && !e.metaKey;
    
    if (e.ctrlKey || e.metaKey || isMouseWheelZoom) {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
      setIsCentering(false);
      
      const zoomFactor = -e.deltaY * (isMouseWheelZoom ? 0.002 : 0.01);
      let newZoom = zoom * Math.exp(zoomFactor);
      newZoom = Math.max(0.2, Math.min(newZoom, 3));
      
      // Zoom at cursor focal point instead of screen center
      const cx = e.clientX - window.innerWidth / 2;
      const cy = e.clientY - window.innerHeight / 2;
      
      const wx = (cx - pan.x) / zoom;
      const wy = (cy - pan.y) / zoom;
      
      setPan({
        x: cx - wx * newZoom,
        y: cy - wy * newZoom
      });
      setZoom(newZoom);
    } else {
      setIsCentering(false);
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchPendingApprovals = useCallback(async () => {
    const { data } = await supabase
      .from('pending_approvals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setPendingApprovals(data);
  }, [supabase]);

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectorName.trim() || isCreating) return;
    setIsCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const initialGraph = instantiateTemplate(selectedTemplateId);
    const { data, error } = await supabase
      .from('workflows')
      .insert([
        {
          user_id: user.id,
          name: newSectorName,
          graph_json: initialGraph
        }
      ])
      .select()
      .single();

    if (data) {
      router.push(`/city/${data.id}`);
    } else {
      console.error(error);
      setIsCreating(false);
    }
  };

  const handleRenameCity = async () => {
    if (!selectedWorkflow || !editingNameValue.trim() || isSavingName) return;
    setIsSavingName(true);

    const { error } = await supabase
      .from('workflows')
      .update({ name: editingNameValue })
      .eq('id', selectedWorkflow.id);

    if (!error) {
      setWorkflows(workflows.map(w => w.id === selectedWorkflow.id ? { ...w, name: editingNameValue } : w));
      setSelectedWorkflow({ ...selectedWorkflow, name: editingNameValue });
      setIsEditingName(false);
    } else {
      console.error(error);
    }
    setIsSavingName(false);
  };

  const startEventStream = useCallback((wfId: string, nodes: any[]) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setIsRunning(true);
    const eventSource = new EventSource(`/api/events?workflowId=${wfId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: eventName, data: eventData } = payload;
        
        if (eventName === 'NODE_STARTED') {
          const node = nodes.find((n: any) => n.id === eventData.nodeId);
          setLogs(prev => [...prev, `> Executing ${node?.name || node?.type || 'node'}...`]);
        } 
        else if (eventName === 'NODE_FINISHED') {
          const node = nodes.find((n: any) => n.id === eventData.nodeId);
          setLogs(prev => [...prev, `> Finished ${node?.name || node?.type || 'node'}.`]);
          
          if (eventData.type === 'output') {
            setLogs(prev => [...prev, `> Output:`]);
            let formattedOutput = 'undefined';
            if (eventData.output !== undefined) {
              if (typeof eventData.output === 'object' && eventData.output !== null) {
                formattedOutput = JSON.stringify(eventData.output, null, 2);
              } else if (typeof eventData.output === 'string') {
                try {
                  let raw = eventData.output.trim();
                  const fence = raw.match(/^```(?:json)?\n?([\s\S]*?)\n?```$/);
                  if (fence) raw = fence[1].trim();
                  const parsed = JSON.parse(raw);
                  formattedOutput = JSON.stringify(parsed, null, 2);
                } catch (_) {
                  formattedOutput = eventData.output;
                }
              } else {
                formattedOutput = String(eventData.output);
              }
            }
            setLogs(prev => [...prev, formattedOutput]);
            
            setLogs(prev => [...prev, `> Execution complete.`]);
            setIsRunning(false);
            eventSource.close();
          } else if (eventData.isLastNode) {
            setLogs(prev => [...prev, `> Execution complete.`]);
            setIsRunning(false);
            eventSource.close();
          }
        }
        else if (eventName === 'NODE_ERROR') {
           setLogs(prev => [...prev, `> ERROR: ${eventData.error}`]);
           setIsRunning(false);
           eventSource.close();
        }
        else if (eventName === 'NODE_PROGRESS') {
           setLogs(prev => [...prev, `> ${eventData.message}`]);
        }
        else if (eventName === 'NODE_PAUSED') {
           setLogs(prev => [...prev, `> Workflow paused at Checkpoint.`]);
           setIsRunning(false);
           eventSource.close();
           
           // Refresh pending approvals automatically
           fetchPendingApprovals();
        }
      } catch(e) {}
    };

    eventSource.onerror = () => {
      setIsRunning(false);
      eventSource.close();
    };
  }, [fetchPendingApprovals]);

  const handleRun = async () => {
    if (isRunning || !selectedWorkflow) return;

    const nodes = selectedWorkflow.graph_json?.nodes || [];
    const edges = selectedWorkflow.graph_json?.edges || [];
    
    const startNode = nodes.find((n: any) => n.type === 'webhook');
    if (!startNode) {
      alert("Missing Radio Tower (Webhook) trigger! Cannot run city.");
      return;
    }

    setLogs([
      `> System initialized.`,
      `> Found ${nodes.length} structures.`,
      `> Initiating deployment sequence...`,
      `> Booting ${startNode.type}...`
    ]);

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges, workflowId: selectedWorkflow.id }),
      });

      let resData;
      const rawText = await res.text();
      try {
        resData = JSON.parse(rawText);
      } catch (e) {
        throw new Error(`Server returned invalid JSON (Status: ${res.status})`);
      }

      if (!res.ok) throw new Error(resData.error || 'Execution failed');
      if (!resData.workflowId) throw new Error('No workflowId returned');

      startEventStream(resData.workflowId, nodes);

    } catch (err: any) {
      setLogs(prev => [...prev, `> ERROR: ${err.message}`]);
      setIsRunning(false);
    }
  };

  const handleDeleteSector = async () => {
    if (!selectedWorkflow) return;
    if (!confirm(`Are you sure you want to delete "${selectedWorkflow.name || 'Unnamed City'}"?`)) return;

    await supabase.from('workflows').delete().eq('id', selectedWorkflow.id);
    setWorkflows(workflows.filter(w => w.id !== selectedWorkflow.id));
    setSelectedWorkflow(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCloseSidebar = useCallback(() => {
    if (selectedWorkflow) {
      setSelectedWorkflow(null);
      setIsCentering(true);
      setPan(defaultView.pan);
      setZoom(defaultView.zoom);
    }
  }, [selectedWorkflow, defaultView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't close if they are typing in an input (like renaming the city)
      if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement)) {
        handleCloseSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseSidebar]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      await fetchPendingApprovals();

      if (data) {
        const positions = new Set();
        // Dynamically scale cluster size based on number of cities to keep them tight
        const clusterSize = Math.max(3, Math.ceil(Math.sqrt(data.length)));
        const halfSize = Math.floor(clusterSize / 2);

        const scatteredData = data.map((wf, idx) => {
          let r = 0, c = 0;
          if (wf.id) {
            let seed = wf.id.charCodeAt(0) + wf.id.charCodeAt(wf.id.length - 1) + idx;
            let attempts = 0;
            while (positions.has(`${r},${c}`) && attempts < 1000) {
              r = (seed % clusterSize) - halfSize;
              c = (Math.floor(seed / clusterSize) % clusterSize) - halfSize;
              seed = (seed * 1103515245 + 12345) & 0x7fffffff;
              attempts++;
            }
            if (attempts >= 1000) { r = idx; c = idx; }
          }
          positions.add(`${r},${c}`);
          return { ...wf, gridR: r, gridC: c };
        });
        setWorkflows(scatteredData);

        // Auto-center and zoom to fit all cities
        if (scatteredData.length > 0 && typeof window !== 'undefined') {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          scatteredData.forEach(wf => {
            const isoX = (wf.gridC - wf.gridR) * 450;
            const isoY = (wf.gridC + wf.gridR) * 300;
            if (isoX < minX) minX = isoX;
            if (isoX > maxX) maxX = isoX;
            if (isoY < minY) minY = isoY;
            if (isoY > maxY) maxY = isoY;
          });

          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          
          const paddingX = 1000; // Account for city width + screen padding
          const paddingY = 800;
          const contentW = (maxX - minX) + paddingX;
          const contentH = (maxY - minY) + paddingY;
          
          const zoomX = window.innerWidth / contentW;
          const zoomY = window.innerHeight / contentH;
          let calculatedZoom = Math.min(zoomX, zoomY, 1.0); // max zoom 1.0 looks good
          calculatedZoom = Math.max(calculatedZoom, 0.2); // min zoom 0.2
          
          const initialPan = { x: -centerX * calculatedZoom, y: -centerY * calculatedZoom };
          setPan(initialPan);
          setZoom(calculatedZoom);
          setDefaultView({ pan: initialPan, zoom: calculatedZoom });
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: 'JetBrains Mono, monospace',
      background: '#fdf8f5',
      color: '#1d1b1a',
    }}>

      {/* ══════════════ TOP NAV BAR ══════════════ */}
      <header style={{
        height: 56,
        background: '#32302e',
        borderBottom: '2px solid #1d1b1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        boxShadow: '0 4px 0 rgba(0,0,0,0.3)',
        zIndex: 50,
      }}>
        {/* Left: Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="material-symbols-outlined" style={{ color: '#00e639', fontSize: 24 }}>public</span>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 20,
            fontWeight: 700,
            color: '#d1c5ae',
            letterSpacing: '-0.02em',
          }}>
            LLMCRAFT: DASHBOARD
          </span>
        </div>

        {/* Right: Inbox + New Sector + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={async () => {
            const { data } = await supabase.from('pending_approvals').select('*').eq('status', 'pending').order('created_at', { ascending: false });
            if (data) setPendingApprovals(data);
            setShowInbox(true);
          }} style={{
            background: pendingApprovals.length > 0 ? '#ffb4ab' : '#d1c5ae',
            color: '#1d1b1a',
            border: '2px solid #1d1b1a',
            padding: '8px 16px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            boxShadow: '2px 2px 0 #1d1b1a',
            transition: 'all 0.1s',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
            onMouseDown={e => (e.currentTarget.style.transform = 'translate(2px,2px)', e.currentTarget.style.boxShadow = 'none')}
            onMouseUp={e => (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = '2px 2px 0 #1d1b1a')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>inbox</span>
            INBOX ({pendingApprovals.length})
          </button>

          <button onClick={() => setShowNewSectorModal(true)} style={{
            background: '#23ff47',
            color: '#002203',
            border: '2px solid #1d1b1a',
            padding: '8px 20px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            boxShadow: '2px 2px 0 #1d1b1a',
            transition: 'all 0.1s',
          }}
            onMouseDown={e => (e.currentTarget.style.transform = 'translate(2px,2px)', e.currentTarget.style.boxShadow = 'none')}
            onMouseUp={e => (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = '2px 2px 0 #1d1b1a')}
          >
            + INITIALIZE NEW CITY
          </button>

          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              width: 40, height: 40,
              background: '#e4e2e1', border: '2px solid #1d1b1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '2px 2px 0 #1d1b1a',
              color: '#1d1b1a',
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#ffb4ab'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#e4e2e1'; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '2px 2px 0 #1d1b1a'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
          </button>
        </div>
      </header>

      {/* ══════════════ BODY ══════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* ── LEFT SIDEBAR ── */}
        {selectedWorkflow && (
          <aside className="absolute top-0 bottom-0 left-0 w-[320px] bg-[var(--color-surface)] border-r-2 border-[var(--color-on-surface)] shadow-[4px_0_0_0_rgba(0,0,0,1)] flex flex-col z-40 bevel-container">
            {/* City Header */}
            <div className="bg-[var(--color-inverse-surface)] border-b-2 border-[var(--color-on-surface)] p-[var(--spacing-gutter-md)] flex justify-between items-start relative overflow-hidden">
              <div className="absolute inset-0 scanline opacity-30 pointer-events-none"></div>
              <div className="flex items-center gap-3 relative z-10 w-full">
                <div className="w-12 h-12 bg-[var(--color-primary-container)] border-2 border-[var(--color-on-surface)] shadow-[2px_2px_0_var(--color-on-surface)] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl text-[var(--color-on-primary-container)]" style={{ fontVariationSettings: "'FILL' 1" }}>domain</span>
                </div>
                <div className="flex-1 min-w-0">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editingNameValue}
                        onChange={e => setEditingNameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameCity();
                          if (e.key === 'Escape') setIsEditingName(false);
                        }}
                        className="bg-[var(--color-surface)] border-2 border-[var(--color-on-surface)] px-1 py-0.5 font-[family-name:var(--font-code-sm)] text-sm font-bold text-[var(--color-on-surface)] w-full outline-none bevel-inset"
                      />
                      <button onClick={handleRenameCity} disabled={isSavingName} className="bg-[var(--color-primary)] border-2 border-[var(--color-on-surface)] px-1 py-0.5 cursor-pointer font-[family-name:var(--font-code-sm)] font-bold text-[10px] text-[var(--color-on-primary)] shrink-0 retro-btn">
                        SAVE
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold tracking-wider text-[var(--color-inverse-primary)] uppercase truncate">
                        {selectedWorkflow.name || 'Unnamed City'}
                      </div>
                      <button onClick={() => { setIsEditingName(true); setEditingNameValue(selectedWorkflow.name || ''); }} className="bg-transparent border-none cursor-pointer p-0 flex items-center text-[var(--color-surface-variant)] hover:text-white transition-colors" title="Rename City">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col gap-1 mt-3">
                    <div className="text-[10px] font-bold text-[var(--color-inverse-primary)] opacity-90 tracking-wider flex justify-between border-b border-[rgba(0,0,0,0.1)] pb-1">
                      <span>STRUCTURES:</span>
                      <span>{selectedWorkflow.graph_json?.nodes?.length || 0}</span>
                    </div>
                    <div className="text-[10px] font-bold text-[var(--color-inverse-primary)] opacity-90 tracking-wider flex justify-between border-b border-[rgba(0,0,0,0.1)] pb-1">
                      <span>CONNECTIONS:</span>
                      <span>{selectedWorkflow.graph_json?.edges?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseSidebar}
                className="bg-transparent border-none cursor-pointer text-[var(--color-surface-variant)] hover:text-white transition-colors relative z-10 shrink-0 self-start"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Actions */}
            <div className="p-[var(--spacing-gutter-md)] flex flex-col gap-[var(--spacing-gutter-sm)] bg-[var(--color-surface)]">
              <div className="flex gap-[var(--spacing-gutter-sm)]">
                <button
                  onClick={() => router.push(`/city/${selectedWorkflow.id}`)}
                  className="flex-1 bg-[var(--color-primary)] text-[var(--color-on-primary)] border-2 border-[var(--color-on-surface)] p-[var(--spacing-gutter-sm)] font-[family-name:var(--font-code-sm)] text-xs font-bold cursor-pointer shadow-[3px_3px_0_var(--color-on-surface)] flex items-center justify-center gap-2 retro-btn"
                >
                  <span className="material-symbols-outlined">login</span>
                  ENTER CITY
                </button>
                <button
                  onClick={handleDeleteSector}
                  className="bg-[var(--color-error)] text-[var(--color-on-error)] border-2 border-[var(--color-on-surface)] p-[var(--spacing-gutter-sm)] font-[family-name:var(--font-code-sm)] text-xs font-bold cursor-pointer shadow-[3px_3px_0_var(--color-on-surface)] flex items-center justify-center shrink-0 retro-btn"
                  title="Delete City"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
              
              <button 
                onClick={handleRun}
                disabled={isRunning}
                className="bg-[var(--color-tertiary-fixed)] text-[var(--color-on-tertiary-fixed)] border-2 border-[var(--color-on-surface)] p-[var(--spacing-gutter-sm)] font-[family-name:var(--font-code-sm)] text-xs font-bold cursor-pointer shadow-[3px_3px_0_var(--color-on-surface)] flex items-center justify-center gap-2 w-full retro-btn disabled:opacity-50"
              >
                <span className="material-symbols-outlined">{isRunning ? 'stop' : 'play_arrow'}</span>
                {isRunning ? 'RUNNING...' : 'EXECUTE'}
              </button>
            </div>

            {/* Logs Window */}
            <div style={{
              flex: 1, margin: '16px', background: '#32302e', border: '2px solid #1d1b1a',
              boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', borderBottom: '2px solid #1d1b1a' }}>
                <button 
                  onClick={() => setActiveTab('logs')}
                  style={{ flex: 1, padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', backgroundColor: activeTab === 'logs' ? '#4a4744' : 'transparent', color: activeTab === 'logs' ? 'white' : '#888', border: 'none', borderRight: '2px solid #1d1b1a', cursor: 'pointer' }}
                >
                  CITY_LOGS.EXE
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  style={{ flex: 1, padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', backgroundColor: activeTab === 'history' ? '#4a4744' : 'transparent', color: activeTab === 'history' ? 'white' : '#888', border: 'none', cursor: 'pointer' }}
                >
                  HISTORY.LOG
                </button>
              </div>

              {activeTab === 'logs' ? (
                <div style={{
                  flex: 1, padding: '10px', overflowY: 'auto',
                  fontFamily: 'JetBrains Mono', fontSize: 10, lineHeight: '1.6',
                  color: '#c8c6c6', display: 'flex', flexDirection: 'column', gap: 6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {logs.length === 0 ? (
                    <>
                      <div style={{ color: '#00e639' }}>&gt; System initialized.</div>
                      <div>&gt; Awaiting deployment sequence...</div>
                    </>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} style={{ color: log.includes('ERROR') ? '#ff5555' : log.includes('>') ? '#00e639' : '#c8c6c6' }}>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div style={{
                  flex: 1, padding: '10px', overflowY: 'auto',
                  fontFamily: 'JetBrains Mono', fontSize: 10, lineHeight: '1.6',
                  color: '#c8c6c6', display: 'flex', flexDirection: 'column', gap: 6
                }}>
                  {isLoadingHistory ? (
                    <div style={{ color: '#888' }}>Loading history...</div>
                  ) : history.length === 0 ? (
                    <div style={{ color: '#888' }}>No execution history found.</div>
                  ) : (
                    history.map(exec => (
                      <div 
                        key={exec.id} 
                        onClick={() => router.push(`/city/${selectedWorkflow.id}?execId=${exec.id}`)}
                        style={{
                          padding: '8px', 
                          backgroundColor: 'rgba(0,0,0,0.2)', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        className="hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                      >
                        <div>
                          <div style={{ color: exec.status === 'success' ? '#00e639' : exec.status === 'error' ? '#ff5555' : '#e6e600', fontWeight: 'bold' }}>
                            {exec.status.toUpperCase()}
                          </div>
                          <div style={{ fontSize: 8, color: '#888' }}>
                            {new Date(exec.created_at).toLocaleString()}
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-xs text-gray-500">open_in_new</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ── MAIN CANVAS ── */}
        <main style={{
          flex: 1,
          position: 'relative',
          background: '#f8f3ef',
          overflow: 'hidden',
        }}>

          {/* Deep digital ocean blue background with animated geometric wave grid */}
          <div style={{ position: 'absolute', inset: 0, background: '#64b5f6', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: '-100%',
              backgroundSize: '60px 60px',
              backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)',
              transformOrigin: 'center center',
              animation: 'oceanGridMove 4s linear infinite',
            }} />
          </div>
          <style>{`
            @keyframes oceanGridMove {
              0% { transform: rotateX(60deg) rotateZ(45deg) translateY(0); }
              100% { transform: rotateX(60deg) rotateZ(45deg) translateY(60px); }
            }
          `}</style>

          {/* Draggable world area */}
          <div
            style={{
              position: 'absolute', inset: 0,
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none', // Prevent browser default pan on touch
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
          >
            {/* Camera Transform Container */}
            <div style={{
              position: 'absolute',
              left: '50%', top: '50%',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isDragging || !isCentering ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              {loading ? (
                <div style={{ position: 'absolute', transform: 'translate(-50%, -50%)', fontFamily: 'JetBrains Mono', fontSize: 12, color: '#006e16', fontWeight: 700, letterSpacing: '0.1em', animation: 'pulse 1.5s infinite', whiteSpace: 'nowrap' }}>
                  LOADING WORLD DATA...
                </div>
              ) : workflows.length === 0 ? (
                <div style={{ position: 'absolute', transform: 'translate(-50%, -50%)', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 12, color: '#4b463e', whiteSpace: 'nowrap' }}>
                  <div style={{ marginBottom: 16, opacity: 0.6 }}>NO CITIES ONLINE</div>
                  <button onClick={() => router.push('/')} style={{
                    background: '#23ff47', color: '#002203',
                    border: '2px solid #1d1b1a', padding: '10px 24px',
                    fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', boxShadow: '3px 3px 0 #1d1b1a',
                    letterSpacing: '0.08em',
                  }}>
                    INITIALIZE NEW CITY
                  </button>
                </div>
              ) : (
                workflows.map((wf, index) => {
                  const col = wf.gridC !== undefined ? wf.gridC : index % 3;
                  const row = wf.gridR !== undefined ? wf.gridR : Math.floor(index / 3);
                  // True Isometric placement (400x200 leaves a comfortable water gap between platforms)
                  const isoX = (col - row) * 450;
                  const isoY = (col + row) * 300;

                  return (
                    <div key={wf.id} style={{
                      position: 'absolute',
                      left: isoX,
                      top: isoY,
                      transform: 'translate(-50%, -50%)',
                      zIndex: Math.round(isoY),
                    }}>
                      <IsometricCompound
                        workflow={wf}
                        selected={selectedWorkflow?.id === wf.id}
                        onClick={() => {
                          setSelectedWorkflow(wf);
                          setIsEditingName(false);
                          setEditingNameValue(wf.name || '');
                          setLogs([]); // Reset the logs for the newly selected city

                          // Smooth pan camera to center this city and zoom in
                          // Offset by +160 to center in the remaining space next to the 320px sidebar
                          setIsCentering(true);
                          setZoom(1.5);
                          setPan({ x: -isoX * 1.5 + 160, y: -isoY * 1.5 });
                        }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Viewport navigation arrows removed */}

          {/* Note: HUD Elements removed */}
        </main>
      </div>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer style={{
        height: 28,
        background: '#e4e2e1',
        borderTop: '2px solid #1d1b1a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 10, fontWeight: 700, color: '#4b463e', letterSpacing: '0.06em' }}>
          <span>TOTAL CITIES: {workflows.length}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#006e16' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#23ff47', border: '1px solid #006e16' }} />
            SYSTEM_LIVE
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 16, fontSize: 10, fontWeight: 700, color: '#4b463e' }}>
          <span>SCROLL TO ZOOM</span>
          <span>•</span>
          <span>DRAG TO PAN</span>
        </nav>
      </footer>

      {/* Global animation keyframes */}
      <style>{`
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* New Sector Modal */}
      {/* Modals */}
      {showInbox && (
        <ApprovalsModal
          approvals={pendingApprovals}
          onClose={() => setShowInbox(false)}
          onApproveReject={async (id, action, input) => {
            try {
              const app = pendingApprovals.find(a => a.id === id);
              
              // Start listening BEFORE the API call so we don't miss any broadcasts
              if (app && selectedWorkflow) {
                setLogs(prev => [...prev, `> Decision: ${action.toUpperCase()} — resuming workflow...`]);
                startEventStream(app.workflow_id, selectedWorkflow.graph_json?.nodes || []);
              }

              // Close inbox immediately
              setPendingApprovals(prev => prev.filter(a => a.id !== id));
              if (pendingApprovals.length <= 1) setShowInbox(false);

              const res = await fetch('/api/approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action, input }),
              });
              if (!res.ok) {
                const err = await res.json();
                alert(`Error: ${err.error}`);
              }
            } catch (err: any) {
              alert(`Failed to submit: ${err.message}`);
            }
          }}
        />
      )}

      {showNewSectorModal && (
        <div className="fixed inset-0 bg-[var(--color-on-surface)]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <form onSubmit={handleCreateSector} className="w-[560px] max-w-[95vw] bg-[var(--color-surface)] bevel-container shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[var(--color-inverse-surface)] border-b-2 border-[var(--color-on-surface)] p-[var(--spacing-gutter-sm)] flex justify-between items-center relative overflow-hidden">
              <div className="absolute inset-0 scanline opacity-30 pointer-events-none"></div>
              <div className="flex items-center gap-[var(--spacing-gutter-sm)] relative z-10">
                <span className="material-symbols-outlined text-[var(--color-inverse-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
                <span className="font-bold font-[family-name:var(--font-code-sm)] text-[var(--color-inverse-primary)] tracking-tight uppercase">INITIALIZE_NEW_CITY.EXE</span>
              </div>
              <button type="button" onClick={() => setShowNewSectorModal(false)} className="text-[var(--color-surface-variant)] hover:text-white transition-colors relative z-10 cursor-pointer bg-transparent border-none">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            
            <div className="p-[var(--spacing-gutter-md)] flex flex-col gap-4">
              <div>
                <label className="block font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-1">
                  CITY NAME:
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newSectorName}
                  onChange={e => setNewSectorName(e.target.value)}
                  placeholder="e.g. Web Research City"
                  className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] px-3 py-2 bevel-inset focus:outline-none placeholder:text-[var(--color-on-surface-variant)]"
                />
              </div>

              <div>
                <label className="block font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2">
                  CHOOSE BLUEPRINT / STARTER TEMPLATE:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TEMPLATES.map(tpl => {
                    const isSelected = selectedTemplateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          const oldTemplate = TEMPLATES.find(t => t.id === selectedTemplateId);
                          setSelectedTemplateId(tpl.id);
                          if (!newSectorName.trim() || (oldTemplate && newSectorName === oldTemplate.defaultCityName)) {
                            setNewSectorName(tpl.defaultCityName);
                          }
                        }}
                        className={`p-3 border-2 cursor-pointer transition-all flex flex-col justify-between select-none ${
                          isSelected
                            ? 'border-[#23ff47] bg-[#23ff47]/10 shadow-[3px_3px_0_0_#1d1b1a]'
                            : 'border-[var(--color-on-surface)] bg-[var(--color-surface-variant)]/60 hover:bg-[var(--color-surface-variant)]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`material-symbols-outlined text-[18px] ${
                                  isSelected ? 'text-[#00871d] font-bold' : 'text-[var(--color-on-surface-variant)]'
                                }`}
                              >
                                {tpl.icon}
                              </span>
                              <span className="font-bold text-[12px] font-[family-name:var(--font-code-sm)] text-[var(--color-on-surface)]">
                                {tpl.name}
                              </span>
                            </div>
                            {tpl.badge && (
                              <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 bg-black text-amber-300 shadow-sm border border-amber-400/40 shrink-0">
                                {tpl.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)] line-clamp-3 leading-relaxed">
                            {tpl.description}
                          </p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-[var(--color-on-surface)]/20 flex items-center justify-between text-[10px] text-[var(--color-on-surface-variant)] font-mono">
                          <span>{tpl.category}</span>
                          {isSelected && (
                            <span className="text-[#00871d] font-bold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              SELECTED
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                disabled={isCreating || !newSectorName.trim()}
                type="submit"
                className="bg-[#23ff47] hover:bg-[#1ee03e] text-[#002203] font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] font-bold px-4 py-2.5 border-2 border-[var(--color-on-surface)] shadow-[3px_3px_0_0_#1d1b1a] cursor-pointer w-full mt-2 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">build</span>
                {isCreating ? 'INITIALIZING BLUEPRINT...' : 'START CONSTRUCTION'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
