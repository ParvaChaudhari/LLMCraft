import { useReactFlow } from '@xyflow/react';

interface NodeControlsProps {
  id: string;
  data: any;
  showPin?: boolean;
  label?: string;
}

export default function NodeControls({ id, data, showPin = false, label }: NodeControlsProps) {
  const { deleteElements, setNodes } = useReactFlow();

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showPin) return;
    setNodes(nds => nds.map(n => {
      if (n.id !== id) return n;
      if (n.data.isPinned) {
        const { isPinned, pinnedOutput, ...rest } = n.data;
        return { ...n, data: rest };
      }
      return { ...n, data: { ...n.data, isPinned: true, pinnedOutput: n.data.output } };
    }));
  };

  return (
    <>
      <div className="absolute -top-5 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-auto z-50 translate-y-2 group-hover:translate-y-0">
        {/* Pin Button */}
        {showPin && (
          <button
            onClick={togglePin}
            className={`w-5 h-5 flex items-center justify-center font-bold tactile-button transition-colors ${
              data.isPinned 
                ? 'bg-[var(--color-tertiary-fixed)] text-[var(--color-on-tertiary-fixed)] hover:bg-[#5ae658]' 
                : 'bg-[var(--color-surface)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)]'
            }`}
            title={data.isPinned ? 'Unpin output' : 'Pin output'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{data.isPinned ? 'keep' : 'push_pin'}</span>
          </button>
        )}

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteElements({ nodes: [{ id }] });
          }}
          className="w-5 h-5 flex items-center justify-center bg-[var(--color-error)] text-[var(--color-on-error)] hover:bg-[#ff4444] font-bold tactile-button transition-colors"
          title="Delete Node"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>delete</span>
        </button>
      </div>

      {/* Pin Badge */}
      {showPin && data.isPinned && (
        <div className="absolute -top-2 -left-1 bg-[var(--color-tertiary-fixed)] text-[var(--color-on-tertiary-fixed)] text-[7px] font-bold px-1 py-[2px] font-[family-name:var(--font-code-sm)] border border-[var(--color-on-surface)] shadow-[1px_1px_0_0_var(--color-on-surface)] pointer-events-none z-50">
          PINNED
        </div>
      )}

      {/* Node Label Tooltip */}
      {label && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[var(--color-inverse-surface)] text-[var(--color-inverse-on-surface)] text-[9px] font-bold px-2 py-[2px] font-[family-name:var(--font-code-sm)] whitespace-nowrap pointer-events-none z-20 border border-[var(--color-on-surface)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-[1px_1px_0_0_var(--color-on-surface)]">
          {label}
        </div>
      )}
    </>
  );
}
