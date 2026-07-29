'use client';

import { useEffect, useState, useRef, PointerEvent as ReactPointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import IsometricCompound from './IsometricCompound';

export default function DashboardPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any | null>(null);
  const [showNewSectorModal, setShowNewSectorModal] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Pan and Zoom state for custom canvas
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
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
  const supabase = createClient();

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectorName.trim() || isCreating) return;
    setIsCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const initialGraph = { nodes: [], edges: [] };
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

  const handleRun = async () => {
    if (isRunning || !selectedWorkflow) return;

    const nodes = selectedWorkflow.graph_json?.nodes || [];
    const edges = selectedWorkflow.graph_json?.edges || [];
    
    const startNode = nodes.find((n: any) => n.type === 'webhook');
    if (!startNode) {
      alert("Missing Radio Tower (Webhook) trigger! Cannot run city.");
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setIsRunning(true);
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
        body: JSON.stringify({ nodes, edges }),
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

      const eventSource = new EventSource(`/api/events?workflowId=${resData.workflowId}`);
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
              setLogs(prev => [...prev, JSON.stringify(eventData.output, null, 2)]);
              
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
        } catch(e) {}
      };

      eventSource.onerror = () => {
        setIsRunning(false);
        eventSource.close();
      };

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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
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
          
          setPan({ x: -centerX * calculatedZoom, y: -centerY * calculatedZoom });
          setZoom(calculatedZoom);
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

        {/* Right: New Sector + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
          <aside style={{
            position: 'absolute',
            top: 0, bottom: 0, left: 0,
            width: 320,
            background: '#f2edea',
            borderRight: '2px solid #1d1b1a',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 40,
          }}>
            {/* City Header */}
            <div style={{ padding: '20px 16px', borderBottom: '2px solid #cdc6ba', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48, height: 48,
                  background: '#e8dcc4', border: '2px solid #1d1b1a', boxShadow: '2px 2px 0 #1d1b1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#665e4b' }}>location_city</span>
                </div>
                <div>
                  {isEditingName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        autoFocus
                        value={editingNameValue}
                        onChange={e => setEditingNameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameCity();
                          if (e.key === 'Escape') setIsEditingName(false);
                        }}
                        style={{
                          background: '#fff', border: '2px solid #1d1b1a', padding: '2px 6px',
                          fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700,
                          color: '#1d1b1a', width: 140, outline: 'none'
                        }}
                      />
                      <button onClick={handleRenameCity} disabled={isSavingName} style={{
                        background: '#23ff47', border: '2px solid #1d1b1a', padding: '2px 6px',
                        cursor: 'pointer', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 10
                      }}>SAVE</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', color: '#1d1b1a', textTransform: 'uppercase' }}>
                        {selectedWorkflow.name || 'Unnamed City'}
                      </div>
                      <button onClick={() => { setIsEditingName(true); setEditingNameValue(selectedWorkflow.name || ''); }} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center', color: '#665e4b'
                      }} title="Rename City">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                      </button>
                    </div>
                  )}
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#006e16', letterSpacing: '0.08em', marginTop: 4 }}>
                    STATUS: OFFLINE
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkflow(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#665e4b' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Actions */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => router.push(`/city/${selectedWorkflow.id}`)}
                style={{
                  background: '#23ff47', color: '#002203', border: '2px solid #1d1b1a',
                  padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '3px 3px 0 #1d1b1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'translate(3px,3px)', e.currentTarget.style.boxShadow = 'none')}
                onMouseUp={e => (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = '3px 3px 0 #1d1b1a')}
              >
                <span className="material-symbols-outlined">login</span>
                ENTER CITY
              </button>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleDeleteSector}
                  style={{
                    flex: 1, background: '#e4e2e1', color: '#ba1a1a', border: '2px solid #1d1b1a', padding: '10px',
                    fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: '2px 2px 0 #1d1b1a',
                  }}
                  onMouseDown={e => (e.currentTarget.style.transform = 'translate(2px,2px)', e.currentTarget.style.boxShadow = 'none')}
                  onMouseUp={e => (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = '2px 2px 0 #1d1b1a')}
                >
                  DELETE
                </button>
                <button 
                  onClick={handleRun}
                  disabled={isRunning}
                  style={{
                  flex: 1, background: isRunning ? '#333' : '#1d1b1a', color: isRunning ? '#888' : '#00e639', border: '2px solid #1d1b1a', padding: '10px',
                  fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: isRunning ? 'default' : 'pointer', boxShadow: isRunning ? 'none' : '2px 2px 0 #1d1b1a',
                  transform: isRunning ? 'translate(2px,2px)' : 'none'
                }}
                  onMouseDown={e => { if (!isRunning) { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = 'none'; } }}
                  onMouseUp={e => { if (!isRunning) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '2px 2px 0 #1d1b1a'; } }}
                >
                  {isRunning ? 'RUNNING...' : 'START'}
                </button>
              </div>
            </div>

            {/* Logs Window */}
            <div style={{
              flex: 1, margin: '16px', background: '#32302e', border: '2px solid #1d1b1a',
              boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '6px 10px', borderBottom: '2px solid #1d1b1a', fontSize: 10, fontWeight: 700, color: 'white', letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between' }}>
                <span>CITY_LOGS.EXE</span>
                {isRunning && <span className="material-symbols-outlined animate-spin" style={{ fontSize: 12 }}>sync</span>}
              </div>
              <div style={{
                flex: 1, padding: '10px', overflowY: 'auto',
                fontFamily: 'JetBrains Mono', fontSize: 10, lineHeight: '1.6',
                color: '#c8c6c6', display: 'flex', flexDirection: 'column', gap: 6,
                whiteSpace: 'pre-wrap'
              }}>
                {logs.length === 0 ? (
                  <>
                    <div style={{ color: '#00e639' }}>&gt; System initialized.</div>
                    <div>&gt; Found {selectedWorkflow.graph_json?.nodes?.length || 0} structures.</div>
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
                        onClick={() => {
                          setSelectedWorkflow(wf);
                          setIsEditingName(false);
                          setEditingNameValue(wf.name || '');
                          setLogs([]); // Reset the logs for the newly selected city

                          // Smooth pan camera to center this city
                          setIsCentering(true);
                          setPan({ x: -isoX * zoom, y: -isoY * zoom });
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
      {showNewSectorModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(29, 27, 26, 0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <form onSubmit={handleCreateSector} style={{
            background: '#e4e2e1', width: 400, border: '2px solid #1d1b1a',
            boxShadow: '8px 8px 0 rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              background: '#32302e', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '2px solid #1d1b1a'
            }}>
              <span style={{ color: '#00e639', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>INITIALIZE_NEW_CITY.EXE</span>
              <button type="button" onClick={() => setShowNewSectorModal(false)} style={{ background: 'none', border: 'none', color: '#c8c6c6', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#4b463e', letterSpacing: '0.08em' }}>CITY NAME:</label>
              <input
                autoFocus
                type="text"
                value={newSectorName}
                onChange={e => setNewSectorName(e.target.value)}
                placeholder="e.g. Neo Tokyo"
                style={{
                  background: '#f8f3ef', border: '2px solid #1d1b1a', padding: 12,
                  fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: '#1d1b1a',
                  outline: 'none', boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.1)'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowNewSectorModal(false)} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#4b463e'
                }}>CANCEL</button>
                <button type="submit" disabled={!newSectorName.trim() || isCreating} style={{
                  background: '#23ff47', color: '#002203', border: '2px solid #1d1b1a',
                  padding: '10px 24px', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700,
                  cursor: isCreating || !newSectorName.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: '2px 2px 0 #1d1b1a', opacity: isCreating || !newSectorName.trim() ? 0.5 : 1
                }}>
                  {isCreating ? 'INITIALIZING...' : 'INITIALIZE'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
