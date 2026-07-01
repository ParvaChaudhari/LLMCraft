import { Handle, Position } from '@xyflow/react';

export default function ConditionalNode({ data }: { data: any }) {
  return (
    <div className="relative group w-32 h-32">
      <Handle type="target" position={Position.Left} className="w-4 h-4 bg-yellow-500 border-2 border-white shadow-md z-10" style={{ left: -8, top: '50%' }} />
      
      <img src="/assets/conditional_gate.png" alt="Conditional" className="w-full h-full object-cover rounded-xl shadow-lg border-2 border-yellow-800/30 bg-white" />
      
      <Handle type="source" position={Position.Right} id="true" className="w-4 h-4 bg-green-500 border-2 border-white shadow-md z-10" style={{ right: -8, top: '30%' }} />
      <Handle type="source" position={Position.Right} id="false" className="w-4 h-4 bg-red-500 border-2 border-white shadow-md z-10" style={{ right: -8, top: '70%' }} />
      
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Toll Booth Checkpoint
      </div>
    </div>
  );
}
