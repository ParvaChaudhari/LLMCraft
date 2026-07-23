import { useState, useEffect } from 'react';

export default function SecretManager({ onClose }: { onClose: () => void }) {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState('openai');

  const fetchCredentials = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/credentials');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCredentials(data);
      }
    } catch (e) {
      console.error('Failed to fetch credentials', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this secret? This action cannot be undone.')) return;
    try {
      await fetch(`/api/credentials?id=${id}`, { method: 'DELETE' });
      setCredentials(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartEdit = (cred: any) => {
    setEditingId(cred.id);
    setEditName(cred.name);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch('/api/credentials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editName })
      });
      const updated = await res.json();
      if (updated.id) {
        setCredentials(prev => prev.map(c => c.id === id ? updated : c));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEditingId(null);
    }
  };

  const handleCreateNew = async () => {
    if (!newName || !newKey) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, type: newType, data: newKey })
      });
      const added = await res.json();
      if (added.id) {
        setCredentials(prev => [added, ...prev]);
        setIsCreating(false);
        setNewName('');
        setNewKey('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const filteredCredentials = credentials.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    if (type.includes('openai')) return 'memory';
    if (type.includes('anthropic') || type.includes('claude')) return 'smart_toy';
    if (type.includes('aws') || type.includes('gcp') || type.includes('azure')) return 'cloud';
    if (type.includes('gemini') || type.includes('google')) return 'language';
    if (type.includes('groq')) return 'bolt';
    if (type.includes('togetherai')) return 'hub';
    if (type.includes('supabase')) return 'database';
    return 'key';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[var(--spacing-gutter-md)] pointer-events-auto bg-[var(--color-on-surface)]/80 backdrop-blur-sm">
      <div className="absolute inset-0 scanline z-0 pointer-events-none opacity-20"></div>

      <div className="relative z-10 w-full max-w-2xl bg-[var(--color-surface)] bevel-container shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[var(--color-inverse-surface)] border-b-2 border-[var(--color-on-surface)] p-[var(--spacing-gutter-sm)] flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 scanline opacity-30 pointer-events-none"></div>
          <div className="flex items-center gap-[var(--spacing-gutter-sm)] relative z-10">
            <span className="material-symbols-outlined text-[var(--color-inverse-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            <h2 className="font-[family-name:var(--font-headline-md)] text-[length:var(--text-headline-md)] text-[var(--color-inverse-primary)] tracking-tight">SECRET_MANAGER</h2>
          </div>
          <button onClick={onClose} className="text-[var(--color-surface-variant)] hover:text-white transition-colors relative z-10">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-[var(--spacing-gutter-md)] flex flex-col gap-[var(--spacing-gutter-md)] overflow-y-auto bg-[var(--color-primary-container)]">
          {/* Tools/Filters Row */}
          <div className="flex justify-between items-end gap-4">
            <div className="flex-grow relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] z-10">search</span>
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] pl-8 pr-2 py-1 bevel-inset focus:outline-none focus:ring-0 placeholder:text-[var(--color-on-surface-variant)]" 
                placeholder="Search secrets..." 
              />
            </div>
            {/* 
            <button 
              onClick={() => setIsCreating(!isCreating)}
              className="bg-[var(--color-tertiary-fixed)] text-[var(--color-on-tertiary-fixed)] font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] px-4 py-2 border-2 border-[var(--color-on-surface)] retro-btn flex items-center gap-1 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">{isCreating ? 'close' : 'add'}</span>
              {isCreating ? 'CANCEL' : 'NEW SECRET'}
            </button>
            */}
          </div>

          {/* Inline Create Form (Commented out for now) */}
          {/*
          {isCreating && (
            <div className="bg-[var(--color-surface)] border-2 border-[var(--color-on-surface)] p-[var(--spacing-gutter-sm)] flex flex-col gap-2 shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoComplete="off"
                  data-lpignore="true"
                  placeholder="Key Name (e.g. prod_api_key)" 
                  className="flex-1 bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] px-2 py-1 bevel-inset focus:outline-none placeholder:text-[var(--color-on-surface-variant)]" 
                />
                <select 
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] px-2 py-1 bevel-inset focus:outline-none cursor-pointer"
                >
                  <option value="openai">OPENAI</option>
                  <option value="anthropic">ANTHROPIC</option>
                  <option value="gemini">GEMINI</option>
                  <option value="tavily">TAVILY</option>
                  <option value="apify">APIFY</option>
                  <option value="postgres">POSTGRES (SUPABASE)</option>
                  <option value="string">STRING (CUSTOM)</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  autoComplete="new-password"
                  data-lpignore="true"
                  placeholder="Paste Secret Value..." 
                  className="flex-1 bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] px-2 py-1 bevel-inset focus:outline-none placeholder:text-[var(--color-on-surface-variant)]" 
                />
                <button 
                  onClick={handleCreateNew}
                  disabled={!newName || !newKey || isLoading}
                  className="bg-[var(--color-tertiary-fixed)] text-[var(--color-on-tertiary-fixed)] font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] px-4 py-1 border-2 border-[var(--color-on-surface)] retro-btn disabled:opacity-50 hover:bg-[#5ae658]"
                >
                  SAVE KEY
                </button>
              </div>
            </div>
          )}
          */}

          {/* Secrets List */}
          <div className="flex flex-col gap-[var(--spacing-gutter-sm)]">
            {/* Column Headers */}
            <div className="flex px-[var(--spacing-gutter-sm)] py-1 font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] text-[var(--color-on-primary-container)] border-b-2 border-[var(--color-on-primary-fixed-variant)]">
              <div className="w-1/3">PROVIDER</div>
              <div className="w-1/3">KEY_NAME</div>
              <div className="w-1/6 text-center">STATUS</div>
              <div className="w-1/6 text-right">ACTIONS</div>
            </div>

            {isLoading && !isCreating ? (
              <div className="text-center py-8 text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)]">
                Decrypting payload...
              </div>
            ) : filteredCredentials.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-on-surface-variant)] font-[family-name:var(--font-code-sm)] opacity-70">
                {searchQuery ? "No matching secrets found." : "Vault is empty."}
              </div>
            ) : (
              filteredCredentials.map(cred => (
                <div key={cred.id} className="bg-[var(--color-surface)] border-2 border-[var(--color-on-surface)] p-[var(--spacing-gutter-sm)] flex items-center shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]">
                  <div className="w-1/3 flex items-center gap-2 font-[family-name:var(--font-headline-md)] text-[length:var(--text-headline-md)] uppercase">
                    <span className="material-symbols-outlined text-[var(--color-primary)]">{getTypeIcon(cred.type)}</span>
                    {cred.type.replace('_', ' ')}
                  </div>
                  
                  <div className="w-1/3 font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] text-[var(--color-on-surface-variant)] pr-2">
                    {editingId === cred.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] px-1 bevel-inset outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(cred.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                    ) : (
                      cred.name
                    )}
                  </div>

                  <div className="w-1/6 flex justify-center">
                    <div className="bg-[#1A1A1A] border-2 border-[var(--color-on-surface)] px-2 py-1 flex items-center gap-1 rounded-sm">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-tertiary-fixed-dim)]" style={{ boxShadow: '0 0 4px var(--color-tertiary-fixed)' }}></div>
                      <span className="font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] text-[var(--color-tertiary-fixed)]">ACTIVE</span>
                    </div>
                  </div>

                  <div className="w-1/6 flex justify-end gap-1">
                    {editingId === cred.id ? (
                      <>
                        <button onClick={() => handleSaveEdit(cred.id)} className="p-1 bg-[var(--color-surface-variant)] border-2 border-[var(--color-on-surface)] retro-btn hover:bg-[var(--color-tertiary-fixed)] text-[var(--color-on-surface)]" title="Save">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </button>
                        <button onClick={handleCancelEdit} className="p-1 bg-[var(--color-surface-variant)] border-2 border-[var(--color-on-surface)] retro-btn hover:bg-[var(--color-error-container)] text-[var(--color-error)]" title="Cancel">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleStartEdit(cred)} className="p-1 bg-[var(--color-surface-variant)] border-2 border-[var(--color-on-surface)] retro-btn hover:bg-[var(--color-primary-fixed)] text-[var(--color-on-surface)]" title="Edit">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(cred.id)} className="p-1 bg-[var(--color-surface-variant)] border-2 border-[var(--color-on-surface)] retro-btn hover:bg-[var(--color-error-container)] text-[var(--color-error)]" title="Revoke">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[var(--color-surface)] border-t-2 border-[var(--color-on-surface)] p-[var(--spacing-gutter-sm)] flex justify-between items-center bg-[var(--color-secondary-container)]">
          <span className="font-[family-name:var(--font-code-sm)] text-[length:var(--text-code-sm)] text-[var(--color-on-secondary-container)]">TOTAL SECRETS: {credentials.length}</span>
          <button onClick={onClose} className="bg-[var(--color-surface)] font-[family-name:var(--font-label-caps)] text-[length:var(--text-label-caps)] px-4 py-2 border-2 border-[var(--color-on-surface)] retro-btn hover:bg-[var(--color-surface-variant)] uppercase">
            CLOSE VAULT
          </button>
        </div>
      </div>
    </div>
  );
}
