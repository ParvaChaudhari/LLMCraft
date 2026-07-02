import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';

export default function DelayNode({ data, selected }: { data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 192, height: 96 }}>
      {selected && <DiamondHighlight />}
      
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-gray-500 border-none rounded-full z-10" style={{ left: -12, top: '50%' }} />
      
      <div className="absolute bottom-0 left-0 w-full pointer-events-none" style={{ height: 256 }}>
        <img src="/assets/delay_stop.png" alt="Delay" className="w-full h-full object-contain" />
        
        <div className="absolute -top-4 right-4 text-gray-500 font-bold text-sm pointer-events-none animate-pulse">Zzz</div>
      </div>
      
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
        Truck Stop (Delay)
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-gray-500 border-none rounded-full z-10" style={{ right: -12, top: '50%' }} />
    </div>
  );
}
