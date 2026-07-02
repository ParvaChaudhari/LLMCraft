import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';

export default function OutputNode({ data, selected }: { data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 192, height: 96 }}>
      {selected && <DiamondHighlight />}
      
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-orange-500 border-none rounded-full z-10" style={{ left: -12, top: '50%' }} />
      
      <div className="absolute bottom-0 left-0 w-full pointer-events-none" style={{ height: 256 }}>
        <img src="/assets/output_dock.png" alt="Output" className="w-full h-full object-contain" />
      </div>
      
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
        Delivery Dock
      </div>
      
      {data.output && (
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 bg-[#1e1e1e] border-4 border-[#2d2d2d] text-[#4af626] text-xs px-3 py-2 w-64 text-center max-h-32 overflow-y-auto pointer-events-auto z-20" style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)' }}>
          <div className="text-[#a0a0a0] mb-1 border-b border-[#333] pb-1 uppercase tracking-widest">System Log</div>
          {data.output}
        </div>
      )}
    </div>
  );
}
