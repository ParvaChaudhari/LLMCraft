'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import IsometricCompound from './IsometricCompound';

export default function DashboardPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setWorkflows(data);
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
        {/* Left: Logo + Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 20,
            fontWeight: 700,
            color: '#d1c5ae',
            letterSpacing: '-0.02em',
          }}>
            LLMCRAFT: STATION_01
          </span>
          <nav style={{ display: 'flex', gap: 4 }}>
            {['SYSTEM', 'AGENTS', 'INFRA', 'MAP'].map((tab, i) => (
              <button key={tab} style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 10px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                color: i === 0 ? '#23ff47' : '#c8c6c6',
                borderBottom: i === 0 ? '2px solid #23ff47' : '2px solid transparent',
              }}>
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Icons + Deploy */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['settings', 'terminal', 'notifications'].map(icon => (
            <button key={icon} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 8, color: '#00e639',
              fontFamily: 'Material Symbols Outlined',
              fontSize: 20,
            }} className="material-symbols-outlined">{icon}</button>
          ))}
          <button style={{
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
            DEPLOY
          </button>
        </div>
      </header>

      {/* ══════════════ BODY ══════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{
          width: 240,
          flexShrink: 0,
          background: '#f2edea',
          borderRight: '2px solid #1d1b1a',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
        }}>
          {/* Station Core Header */}
          <div style={{ padding: '16px', borderBottom: '2px solid #cdc6ba' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36,
                background: '#e8dcc4',
                border: '2px solid #1d1b1a',
                boxShadow: '2px 2px 0 #1d1b1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#665e4b' }}>terminal</span>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#1d1b1a' }}>STATION_CORE</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#006e16', letterSpacing: '0.08em' }}>STATUS: OPTIMAL</div>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { icon: 'apartment', label: 'CONSTRUCT', active: true },
              { icon: 'reorder', label: 'LOGISTICS' },
              { icon: 'bolt', label: 'ENERGY' },
              { icon: 'biotech', label: 'RESEARCH' },
              { icon: 'terminal', label: 'COMMAND' },
            ].map(item => (
              <button key={item.label} style={{
                background: item.active ? '#e8dcc4' : 'transparent',
                border: item.active ? '2px solid #1d1b1a' : '2px solid transparent',
                boxShadow: item.active ? '2px 2px 0 #1d1b1a' : 'none',
                padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                color: item.active ? '#1d1b1a' : '#4b463e',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.1s',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div style={{ padding: '16px', borderTop: '2px solid #cdc6ba', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button style={{
              background: '#e4e2e1',
              border: '2px solid #1d1b1a',
              padding: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              cursor: 'pointer',
              boxShadow: '2px 2px 0 #1d1b1a',
              transition: 'all 0.1s',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'translate(2px,2px)', e.currentTarget.style.boxShadow = 'none')}
            onMouseUp={e => (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = '2px 2px 0 #1d1b1a')}
            >
              SYNC_NODES
            </button>
            <div style={{ display: 'flex', gap: 16 }}>
              <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#4b463e', textDecoration: 'none' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>code</span> TERMINAL
              </a>
              <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#4b463e', textDecoration: 'none' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>help_outline</span> HELP
              </a>
            </div>
          </div>
        </aside>

        {/* ── MAIN CANVAS ── */}
        <main style={{
          flex: 1,
          position: 'relative',
          background: '#f8f3ef',
          overflow: 'hidden',
        }}>

          {/* Soft dark green background */}
          <div style={{ position: 'absolute', inset: 0, background: '#9cb3a2' }} />

          {/* Scrollable world area */}
          <div style={{
            position: 'absolute', inset: 0,
            overflowX: 'auto', overflowY: 'auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            padding: '80px 60px',
          }}>
            {loading ? (
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#006e16', fontWeight: 700, letterSpacing: '0.1em', animation: 'pulse 1.5s infinite' }}>
                LOADING WORLD DATA...
              </div>
            ) : workflows.length === 0 ? (
              <div style={{ textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 12, color: '#4b463e' }}>
                <div style={{ marginBottom: 16, opacity: 0.6 }}>NO SECTORS ONLINE</div>
                <button onClick={() => router.push('/')} style={{
                  background: '#23ff47', color: '#002203',
                  border: '2px solid #1d1b1a', padding: '10px 24px',
                  fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '3px 3px 0 #1d1b1a',
                  letterSpacing: '0.08em',
                }}>
                  INITIALIZE NEW SECTOR
                </button>
              </div>
            ) : (
              workflows.map(wf => (
                <IsometricCompound
                  key={wf.id}
                  workflow={wf}
                  onClick={() => router.push('/')}
                />
              ))
            )}
          </div>

          {/* ── Viewport navigation arrows ── */}
          <button style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40,
            background: '#f2edea', border: '2px solid #1d1b1a',
            boxShadow: '3px 3px 0 rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 20,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <button style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40,
            background: '#f2edea', border: '2px solid #1d1b1a',
            boxShadow: '3px 3px 0 rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 20,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
          </button>

          {/* ── BOTTOM LEFT: Terminal ── */}
          <div style={{
            position: 'absolute', bottom: 16, left: 16,
            width: 320, height: 192,
            background: '#4b463e',
            border: '2px solid #1d1b1a',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column',
            zIndex: 30,
            overflow: 'hidden',
          }}>
            <div style={{
              background: '#32302e',
              padding: '4px 10px',
              borderBottom: '2px solid #1d1b1a',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'white', letterSpacing: '0.08em' }}>GLOBAL_INBOX.LOG</span>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e639' }} />
            </div>
            <div style={{
              flex: 1, padding: '8px', overflowY: 'auto',
              fontFamily: 'JetBrains Mono', fontSize: 11,
              lineHeight: '16px',
              background: '#2a2826',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {[
                { time: '10:45 AM', msg: 'PROJECT B-2: Agent Z completed task.', color: '#00e639' },
                { time: '10:30 AM', msg: 'PROJECT C-3: Deployment successful.', color: '#00e639' },
                { time: '10:15 AM', msg: 'AI_MODEL_TRAINER: Critical memory leak detected.', color: '#ba1a1a' },
                { time: '10:00 AM', msg: 'SYSTEM: Daily node sync initiated.', color: 'white' },
                { time: '09:55 AM', msg: 'INFRA: Sector 7 power stable.', color: '#00e639' },
              ].map((line, i) => (
                <div key={i} style={{ color: line.color }}>
                  <span style={{ opacity: 0.5 }}>[{line.time}]</span> {line.msg}
                </div>
              ))}
              <div style={{ color: '#00e639', opacity: 0.8 }}>_</div>
            </div>
          </div>

          {/* ── BOTTOM RIGHT: Radar + Toggles ── */}
          <div style={{
            position: 'absolute', bottom: 16, right: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
            zIndex: 30,
          }}>
            {/* Radar */}
            <div style={{
              width: 192, height: 192,
              background: '#1d1b1a',
              border: '2px solid #1d1b1a',
              boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0,
                background: '#32302e', padding: '2px 8px',
                fontSize: 9, fontWeight: 700, color: 'white', letterSpacing: '0.08em',
                borderRight: '1px solid #1d1b1a', borderBottom: '1px solid #1d1b1a',
                zIndex: 5,
              }}>RADAR_NAV_0.8</div>

              {/* Grid lines */}
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0,230,57,0.15)' }} />
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(0,230,57,0.15)' }} />

              {/* Radar sweep */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '200%', height: 1,
                background: 'rgba(0,230,57,0.3)',
                transformOrigin: 'left center',
                animation: 'radar-sweep 4s linear infinite',
              }} />

              {/* Blips */}
              {workflows.map((wf, i) => (
                <div key={wf.id} style={{
                  position: 'absolute',
                  width: 8, height: 8,
                  background: '#006e16',
                  boxShadow: '0 0 5px #00ff41',
                  left: `${20 + (i * 30) % 55}%`,
                  top: `${30 + (i * 20) % 40}%`,
                }} />
              ))}

              <button style={{
                position: 'absolute', bottom: 4, right: 4,
                background: '#f2edea', border: '1px solid #1d1b1a',
                fontSize: 9, fontWeight: 700, color: '#1d1b1a',
                padding: '2px 4px', cursor: 'pointer', letterSpacing: '0.06em',
              }}>ZOOM_TO_FIT</button>
            </div>

            {/* HUD Toggles */}
            <div style={{
              background: '#f2edea',
              border: '2px solid #1d1b1a',
              boxShadow: '4px 4px 0 rgba(0,0,0,0.2)',
              padding: '8px 12px',
              display: 'flex', gap: 16, alignItems: 'center',
            }}>
              {[{ label: 'OPS MODE', on: true }, { label: 'LABELS', on: true }, { label: 'FOCUS', on: false }].map(toggle => (
                <div key={toggle.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#4b463e', letterSpacing: '0.06em' }}>{toggle.label}</span>
                  <div style={{
                    width: 36, height: 18,
                    background: toggle.on ? '#006e16' : '#cdc6ba',
                    border: '1px solid #1d1b1a',
                    position: 'relative', cursor: 'pointer',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 2,
                      [toggle.on ? 'right' : 'left']: 2,
                      width: 14, height: 14,
                      background: 'white',
                      border: '1px solid #1d1b1a',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
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
          <span>© 2024 LLMCRAFT INDUSTRIAL. ALL RIGHTS RESERVED.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#006e16' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#23ff47', border: '1px solid #006e16' }} />
            SYSTEM_LIVE
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 16, fontSize: 10, fontWeight: 700 }}>
          <a href="#" style={{ color: '#4b463e', textDecoration: 'none' }}>PRIVACY</a>
          <a href="#" style={{ color: '#4b463e', textDecoration: 'none' }}>LICENSE</a>
          <a href="#" style={{ color: '#006e16', textDecoration: 'none' }}>DEB_LOGS</a>
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
    </div>
  );
}
