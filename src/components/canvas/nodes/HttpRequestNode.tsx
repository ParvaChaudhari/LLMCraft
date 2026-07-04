import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';

export default function HttpRequestNode({ data, selected }: { data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 320, height: 160 }}>
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
