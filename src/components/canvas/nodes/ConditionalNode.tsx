import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';

export default function ConditionalNode({ data, selected }: { data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 164, height: 96 }}>
      {selected && <DiamondHighlight />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-yellow-500 border-none rounded-full z-10" style={{ left: -12, top: '50%' }} />

      <div className="absolute pointer-events-none" style={{ left: 15, bottom: -87, width: '100%', height: 256, transform: 'scale(1.15)', transformOrigin: 'bottom center' }}>
        <img src="/assets/conditional_gate.png" alt="Conditional" className="w-full h-full object-contain" />
      </div>

      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
        Toll Booth Checkpoint
      </div>

      <Handle type="source" position={Position.Right} id="true" className="w-2 h-2 bg-green-500 border-none rounded-full z-10" style={{ right: -12, top: '30%' }} />
      <Handle type="source" position={Position.Right} id="false" className="w-2 h-2 bg-red-500 border-none rounded-full z-10" style={{ right: -12, top: '70%' }} />
    </div>
  );
}
