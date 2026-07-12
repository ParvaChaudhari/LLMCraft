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
      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteElements({ nodes: [{ id }] });
        }}
        className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white font-bold text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-red-500 border border-red-800 flex items-center justify-center pointer-events-auto"
        title="Delete Node"
      >
        X
      </button>

      {/* Pin Button */}
      {showPin && (
        <button
          onClick={togglePin}
          className={`absolute top-0 right-6 w-5 h-5 text-xs rounded opacity-0 group-hover:opacity-100 transition-colors z-50 flex items-center justify-center pointer-events-auto border hover:bg-green-500 hover:text-black hover:border-green-600 ${data.isPinned ? 'bg-yellow-500 border-yellow-700 opacity-100 text-black' : 'bg-[#2d2d2d] border-[#1a1a1a] text-white'
            }`}
          title={data.isPinned ? 'Unpin output' : 'Pin output'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="17" x2="12" y2="22"></line>
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
          </svg>
        </button>
      )}

      {/* Pin Badge */}
      {showPin && data.isPinned && (
        <div className="absolute top-0 left-0 bg-yellow-500 text-black text-[8px] font-bold px-1 rounded-br z-50 pointer-events-none">PINNED</div>
      )}

      {/* Node Label Tooltip */}
      {label && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
          {label}
        </div>
      )}
    </>
  );
}
