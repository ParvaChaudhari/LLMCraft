import { Handle, Position, useReactFlow } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';

export default function WebhookNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
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
      {/* Selection Highlight — covers only the 3×3 diamond footprint */}
      {selected && <DiamondHighlight />}

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-green-500 border-none rounded-full z-10" style={{ right: 64, top: 64 }} />

      {/* Image extends upward from the base footprint */}
      <div className="absolute left-0 w-full pointer-events-none" style={{ bottom: -50, height: 256, transform: 'scale(1.15)', transformOrigin: 'bottom center' }}>
        {/* Animation Effects: Pulsing Rings */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-8 border-2 border-green-500 rounded-full animate-ping opacity-75 pointer-events-none -z-10"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 border border-green-400 rounded-full animate-ping opacity-50 pointer-events-none -z-10" style={{ animationDelay: '0.5s' }}></div>

        <img src="/assets/webhook_tower.png" alt="Webhook" className="w-full h-full object-contain" />
      </div>

      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
        Webhook Trigger
      </div>
    </div>
  );
}
