import { useState } from 'react';

export default function ApprovalsModal({ 
  approvals, 
  onClose, 
  onApproveReject 
}: { 
  approvals: any[]; 
  onClose: () => void;
  onApproveReject: (id: string, action: 'approved' | 'rejected', input?: string) => void;
}) {
  const [inputs, setInputs] = useState<Record<string, string>>({});

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] border-4 border-[var(--color-on-surface)] w-full max-w-2xl shadow-[8px_8px_0_rgba(0,0,0,1)] flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="bg-[var(--color-inverse-surface)] p-3 border-b-4 border-[var(--color-on-surface)] flex justify-between items-center text-[var(--color-inverse-primary)]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">inbox</span>
            <h2 className="font-[family-name:var(--font-headline-md)] text-lg uppercase tracking-widest m-0">Approvals Inbox</h2>
          </div>
          <button onClick={onClose} className="hover:text-white transition-colors cursor-pointer text-[var(--color-surface-variant)]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* List */}
        <div className="p-4 flex flex-col gap-4 overflow-y-auto inset-input bg-[#fdf8f5] flex-1">
          {approvals.length === 0 ? (
            <div className="text-center text-[var(--color-on-surface-variant)] py-8 font-[family-name:var(--font-code-sm)] text-sm">
              No pending approvals. Your workflows are running smoothly!
            </div>
          ) : (
            approvals.map(app => (
              <div key={app.id} className="bg-white border-2 border-[var(--color-on-surface)] p-4 shadow-[4px_4px_0_var(--color-on-surface)] flex flex-col gap-3">
                <div className="flex justify-between items-start border-b-2 border-dotted border-[var(--color-on-surface-variant)] pb-2">
                  <div className="font-[family-name:var(--font-code-sm)] text-xs text-[var(--color-on-surface-variant)]">
                    <strong>Workflow ID:</strong> {app.workflow_id.slice(0, 8)}...<br/>
                    <strong>Node:</strong> Checkpoint ({app.node_id})
                  </div>
                  <div className="text-xs bg-yellow-300 text-yellow-900 px-2 py-1 font-bold border border-yellow-900 uppercase">
                    Pending
                  </div>
                </div>

                <div className="font-[family-name:var(--font-code-sm)] text-sm text-[var(--color-on-surface)] whitespace-pre-wrap">
                  {app.prompt_message || 'Human input required for this workflow to proceed.'}
                </div>

                <div className="bg-[var(--color-surface)] p-3 inset-input font-[family-name:var(--font-code-sm)] text-xs text-[var(--color-on-surface)] overflow-x-auto border-2 border-[rgba(0,0,0,0.1)] max-h-32">
                  <strong>Current Payload (lastOutput):</strong>
                  <pre className="mt-1">{app.context?.lastOutput || 'null'}</pre>
                </div>

                {app.require_input && (
                  <textarea
                    className="w-full bg-white border-2 border-[var(--color-on-surface)] p-2 inset-input outline-none font-[family-name:var(--font-code-sm)] text-sm min-h-[60px]"
                    placeholder="Type your required input here..."
                    value={inputs[app.id] || ''}
                    onChange={(e) => setInputs({ ...inputs, [app.id]: e.target.value })}
                  />
                )}

                <div className="flex justify-end gap-3 mt-2">
                  <button 
                    onClick={() => onApproveReject(app.id, 'rejected')}
                    className="bg-[var(--color-error)] text-[var(--color-on-error)] border-2 border-[var(--color-on-surface)] px-4 py-2 font-[family-name:var(--font-code-sm)] text-xs font-bold cursor-pointer shadow-[2px_2px_0_var(--color-on-surface)] retro-btn hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0_var(--color-on-surface)] transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">cancel</span> REJECT
                  </button>
                  <button 
                    onClick={() => onApproveReject(app.id, 'approved', inputs[app.id])}
                    className="bg-[#4ade80] text-green-900 border-2 border-[var(--color-on-surface)] px-4 py-2 font-[family-name:var(--font-code-sm)] text-xs font-bold cursor-pointer shadow-[2px_2px_0_var(--color-on-surface)] retro-btn hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0_var(--color-on-surface)] transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span> APPROVE
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
