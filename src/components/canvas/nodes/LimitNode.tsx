import { Handle, Position, useReactFlow } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';

export default function LimitNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const { deleteElements } = useReactFlow();
  return (
    <div className="relative group" style={{ width: 192, height: 96 }}>
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
      {selected && <DiamondHighlight />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-yellow-500 border-none rounded-full z-10" style={{ left: 32, top: 48 }} />

      <div className="absolute pointer-events-none" style={{ left: 15, bottom: -87, width: '100%', height: 256, transform: 'scale(1.15)', transformOrigin: 'bottom center' }}>
        <img src="/assets/limit_toll.png" alt="Limit" className="w-full h-full object-contain" />
      </div>

      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
        Toll Booth Checkpoint
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-green-500 border-none rounded-full z-10" style={{ right: 32, top: 48 }} />
    </div>
  );
}
