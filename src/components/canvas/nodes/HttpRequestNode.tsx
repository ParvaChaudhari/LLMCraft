import { Handle, Position, useReactFlow } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';

export default function HttpRequestNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const { deleteElements, setNodes } = useReactFlow();

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div className="relative group" style={{ width: 320, height: 160 }}>
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
      <button
        onClick={togglePin}
        className={`absolute top-0 right-6 w-5 h-5 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center justify-center pointer-events-auto border ${
          data.isPinned ? 'bg-yellow-500 border-yellow-700 opacity-100' : 'bg-[#2d2d2d] border-[#1a1a1a] hover:bg-yellow-500'
        }`}
        title={data.isPinned ? 'Unpin output' : 'Pin output'}
      >
        📌
      </button>
      {data.isPinned && (
        <div className="absolute top-0 left-0 bg-yellow-500 text-black text-[8px] font-bold px-1 rounded-br z-50 pointer-events-none">PINNED</div>
      )}
      {selected && <DiamondHighlight cols={5} rows={5} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-teal-500 border-none rounded-full z-10" style={{ left: 100, top: 100 }} />

      <div className="absolute pointer-events-none" style={{ left: 0, bottom: -36, width: '100%', height: 384, transformOrigin: 'bottom center' }}>
        <img src="/assets/http_request.png" alt="HTTP Request" className="w-full h-full object-contain" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-teal-300 opacity-20 rounded-full blur-xl animate-ping pointer-events-none -z-10"></div>
      </div>

      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
        HTTP Data Center
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-teal-500 border-none rounded-full z-10" style={{ right: 32, top: 80 }} />
    </div>
  );
}
