import { Handle, Position } from '@xyflow/react';

export default function WebhookNode({ data }: { data: any }) {
  return (
    <div className="relative group w-32 h-32">
      <Handle type="source" position={Position.Right} className="w-4 h-4 bg-green-500 border-2 border-white shadow-md z-10" style={{ right: -8, top: '50%' }} />
      <img src="/assets/radio_tower.png" alt="Webhook" className="w-full h-full object-cover rounded-xl shadow-lg border-2 border-green-800/30 bg-white" />
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Webhook Trigger
      </div>
    </div>
  );
}
