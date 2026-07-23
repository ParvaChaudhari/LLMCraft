'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (mode === 'SIGNUP') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('> CLEARANCE REQUESTED. CHECK COMMS (EMAIL) TO VERIFY.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setError('> ACCESS GRANTED. ROUTING...');
        router.push('/');
      }
    } catch (err: any) {
      setError(`> ERROR: ${err.message.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--color-inverse-surface)] min-h-screen flex flex-col items-center justify-center relative overflow-hidden text-[var(--color-primary)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)]">
      {/* CRT Overlay */}
      <div className="absolute inset-0 crt-scanlines z-50 mix-blend-overlay"></div>
      
      {/* Background Grid */}
      <div 
        className="absolute inset-0 z-0 opacity-10" 
        style={{ backgroundImage: "radial-gradient(var(--color-primary) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      ></div>

      {/* Login Container */}
      <main className="relative z-10 w-full max-w-md p-[var(--spacing-gutter-md)]">
        {/* Main Card */}
        <div className="bg-[var(--color-surface-container-highest)] bevel-container p-[var(--spacing-gutter-md)] flex flex-col gap-[var(--spacing-margin-lg)] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
          
          {/* Header Section */}
          <div className="flex flex-col items-center gap-[var(--spacing-gutter-sm)] text-center border-b-2 border-[var(--color-on-surface-variant)] pb-[var(--spacing-gutter-sm)]">
            <span className="material-symbols-outlined text-4xl text-[var(--color-on-surface)] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
            <h1 className="font-[family-name:var(--font-headline-lg)] text-[length:var(--text-headline-lg)] font-bold text-[var(--color-on-surface)] tracking-tighter uppercase">LLMCRAFT_OS</h1>
            <p className="font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-medium text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container-lowest)] px-2 py-1 border border-[var(--color-on-surface-variant)]">
              STATION_01 ACCESS
            </p>
          </div>

          {/* Status Chips */}
          <div className="flex justify-between w-full font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] font-bold uppercase">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[var(--color-error)] rounded-full inline-block shadow-[1px_1px_0px_0px_var(--color-on-background)]"></span>
              <span className="text-[var(--color-on-surface-variant)]">STATION STATUS: OFFLINE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[var(--color-tertiary)] rounded-full inline-block shadow-[1px_1px_0px_0px_var(--color-on-background)]"></span>
              <span className="text-[var(--color-on-surface-variant)]">ENCRYPTION: ENABLED</span>
            </div>
          </div>

          {/* Form Section */}
          <form className="flex flex-col gap-[var(--spacing-gutter-md)]" onSubmit={handleAuth}>
            {/* User ID Field */}
            <div className="flex flex-col gap-[var(--spacing-gutter-xs)]">
              <label className="font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] font-bold text-[var(--color-on-surface)] uppercase" htmlFor="userid">&gt; USER_ID</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[var(--color-on-surface-variant)] z-10">person</span>
                <input 
                  id="userid" 
                  type="email" 
                  autoComplete="off"
                  placeholder="ENTER ID..." 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#1A1A1A] inset-input text-[var(--color-tertiary-container)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-medium py-3 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder-[var(--color-on-surface-variant)] transition-colors" 
                />
              </div>
            </div>

            {/* Access Key Field */}
            <div className="flex flex-col gap-[var(--spacing-gutter-xs)]">
              <label className="font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] font-bold text-[var(--color-on-surface)] uppercase" htmlFor="accesskey">&gt; ACCESS_KEY</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[var(--color-on-surface-variant)] z-10">key</span>
                <input 
                  id="accesskey" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#1A1A1A] inset-input text-[var(--color-tertiary-container)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-medium py-3 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder-[var(--color-on-surface-variant)] transition-colors" 
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex flex-col gap-2">
              <button 
                type="submit" 
                disabled={loading}
                onClick={() => setMode('LOGIN')}
                className="w-full bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] tactile-button py-4 font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] font-bold flex items-center justify-center gap-2 uppercase transition-transform active:bg-[var(--color-on-tertiary-container)] disabled:opacity-50"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>power_settings_new</span>
                {loading && mode === 'LOGIN' ? 'PROCESSING...' : 'INITIALIZE_BOOT_SEQUENCE'}
              </button>
              
              <button 
                type="submit" 
                disabled={loading}
                onClick={() => setMode('SIGNUP')}
                className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] tactile-button py-2 font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] font-bold flex items-center justify-center gap-2 uppercase transition-transform active:bg-[var(--color-surface-dim)] disabled:opacity-50 mt-2"
              >
                <span className="material-symbols-outlined text-[14px]">person_add</span>
                {loading && mode === 'SIGNUP' ? 'PROCESSING...' : 'REQUEST NEW CLEARANCE'}
              </button>
            </div>
          </form>

          {/* Terminal Output Decorative */}
          <div className="bg-[#1A1A1A] inset-input p-3 min-h-[80px] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-medium text-[var(--color-on-surface-variant)] flex flex-col gap-1 overflow-hidden">
            <span className="text-[var(--color-tertiary-fixed-dim)]">&gt; SYSTEM READY.</span>
            <span>&gt; AWAITING CREDENTIALS...</span>
            {error && (
              <span className={error.includes('ERROR') ? 'text-[var(--color-error)]' : 'text-[var(--color-tertiary-fixed-dim)]'}>
                {error}
              </span>
            )}
            <span className="flex items-center">&gt; <div className="w-2 h-4 bg-[var(--color-tertiary-fixed-dim)] ml-2 blinking-cursor"></div></span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-[var(--color-inverse-surface)] border-t-2 border-[var(--color-outline-variant)] px-[var(--spacing-gutter-md)] py-[var(--spacing-gutter-xs)] flex justify-between items-center z-40 text-[var(--color-on-secondary-fixed-variant)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] font-medium">
        <span className="font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] font-bold text-[var(--color-tertiary-fixed)] uppercase">
          (C) 1994 LLMCRAFT SYSTEMS - ENCRYPTION ENABLED
        </span>
        <div className="flex gap-[var(--spacing-gutter-md)]">
          <span className="hover:text-[var(--color-tertiary-fixed-dim)] underline cursor-pointer">HELP</span>
          <span className="hover:text-[var(--color-tertiary-fixed-dim)] underline cursor-pointer">LEGAL</span>
          <span className="text-[var(--color-tertiary-fixed)] font-bold cursor-pointer">V1.0</span>
        </div>
      </footer>
    </div>
  );
}
