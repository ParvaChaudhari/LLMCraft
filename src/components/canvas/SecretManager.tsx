import { useState, useEffect } from 'react';

export default function SecretManager({ onClose }: { onClose: () => void }) {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8 pointer-events-auto">
      
      {/* Modal Container */}
      <div 
        className="w-[90%] max-w-[1000px] bg-[#2d2d2d] border-[4px] border-[#1a1a1a] flex flex-col shadow-2xl relative"
        style={{ boxShadow: '8px 8px 0px rgba(0,0,0,0.5)' }}
      >
        
        {/* Header Bar */}
        <div className="h-12 bg-[#1a1a1a] flex justify-between items-center px-4 border-b-[4px] border-[#1a1a1a]">
          <div className="flex items-center space-x-4">
            <span className="text-[#c4b4a4] font-bold tracking-widest uppercase flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              SECRET MANAGER
            </span>
          </div>
          <button onClick={onClose} className="text-red-500 hover:text-red-400 font-bold text-xl px-2 bg-[#2d2d2d] border-2 border-[#1a1a1a] transition-colors">
            X
          </button>
        </div>

        {/* Content Area */}
        <div className="p-8 bg-[#3d3d3d] max-h-[70vh] overflow-y-auto">
          
          <div className="mb-6 bg-[#1a1a1a] p-4 border-[3px] border-[#2d2d2d]">
            <p className="text-[#4af626] font-mono text-sm">
              &gt; Secure Vault System Online.<br/>
              &gt; All API keys are encrypted at rest. For security reasons, raw keys cannot be viewed or copied after creation.<br/>
              &gt; You may safely delete or rename your keys here.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-[#4af626] font-mono text-xl animate-pulse">Decrypting vault metadata...</div>
            </div>
          ) : credentials.length === 0 ? (
            <div className="flex justify-center items-center h-32 bg-[#1a1a1a] border-[3px] border-[#2d2d2d]">
              <div className="text-gray-500 font-mono text-lg uppercase tracking-widest">Vault is empty</div>
            </div>
          ) : (
            <div className="space-y-4">
              {credentials.map(cred => (
                <div key={cred.id} className="bg-[#1a1a1a] p-4 border-[3px] border-[#2d2d2d] flex items-center justify-between hover:bg-[#222] transition-colors group">
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-1">
                      {editingId === cred.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="bg-[#2d2d2d] text-[#4af626] font-bold text-lg p-1 px-2 outline-none border-b-2 border-[#4af626]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(cred.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                      ) : (
                        <h4 className="text-[#e0e0e0] font-bold text-lg tracking-wide">{cred.name}</h4>
                      )}
                      <span className="bg-[#3d3d3d] text-gray-300 text-xs px-2 py-1 font-bold uppercase tracking-wider rounded-sm border border-[#555]">
                        {cred.type}
                      </span>
                    </div>
                    <span className="text-gray-500 font-mono text-xs">
                      Stored on: {new Date(cred.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {editingId === cred.id ? (
                      <>
                        <button 
                          onClick={() => handleSaveEdit(cred.id)}
                          className="bg-[#4af626] hover:bg-[#3ade1d] text-black font-bold px-4 py-2 text-sm uppercase tracking-wider"
                        >
                          Save
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          className="bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white border-2 border-[#555] font-bold px-4 py-2 text-sm uppercase tracking-wider"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleStartEdit(cred)}
                          className="bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[#4af626] border-[3px] border-[#2d2d2d] font-bold px-4 py-2 text-sm uppercase tracking-wider transition-colors"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(cred.id)}
                          className="bg-[#2d2d2d] hover:bg-[#1a1a1a] text-red-500 border-[3px] border-[#2d2d2d] font-bold px-4 py-2 text-sm uppercase tracking-wider transition-colors"
                          title="Delete Secret"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
