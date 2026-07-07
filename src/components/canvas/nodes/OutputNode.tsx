import { Handle, Position, useReactFlow } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';

export default function OutputNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const { deleteElements } = useReactFlow();
  return (
    <div className="relative group" style={{ width: 256, height: 128 }}>
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
      {selected && <DiamondHighlight cols={4} rows={4} style={{ left: 32, top: -32 }} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-orange-500 border-none rounded-full z-10" style={{ left: 64, top: 32 }} />

      <div className="absolute pointer-events-none" style={{ left: 32, bottom: -16, width: '100%', height: 300 }}>
        <img src="/assets/output_dock.png" alt="Output" className="w-full h-full object-contain" />
      </div>

      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
        Delivery Dock
      </div>

      {/* data.output && (
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 bg-[#1e1e1e] border-4 border-[#2d2d2d] text-[#4af626] text-xs px-3 py-2 w-64 text-center max-h-32 overflow-y-auto pointer-events-auto z-20" style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)' }}>
          <div className="text-[#a0a0a0] mb-1 border-b border-[#333] pb-1 uppercase tracking-widest">System Log</div>
          {data.output}
        </div>
      ) */}
    </div>
  );
}
