import { Handle, Position } from '@xyflow/react';

export default function OutputNode({ data }: { data: any }) {
  return (
    <div className="relative group w-32 h-32">
      <Handle type="target" position={Position.Left} className="w-4 h-4 bg-orange-500 border-2 border-white shadow-md z-10" style={{ left: -8, top: '50%' }} />
      <img src="/assets/output_dock.png" alt="Output" className="w-full h-full object-cover rounded-xl shadow-lg border-2 border-orange-800/30 bg-white" />
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Delivery Dock
      </div>
      
      {/* Show output value floating above the building if it exists */}
      {data.output && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white border-2 border-orange-200 text-gray-800 text-xs px-3 py-2 rounded-xl shadow-xl w-64 text-center max-h-32 overflow-y-auto pointer-events-auto z-20">
          <div className="font-bold text-orange-600 mb-1 border-b pb-1">Final Delivery</div>
          {data.output}
        </div>
      )}
    </div>
  );
}
