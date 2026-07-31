import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function PostOfficeNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 256, height: 116 }}>
      <NodeControls id={id} data={data} showPin label="Post Office" />
      {selected && <DiamondHighlight cols={4} rows={4} style={{ left: 32, top: 0 }} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-orange-500 border-none rounded-full z-10" style={{ left: 72, top: 72 }} />
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-cyan-400 border-none rounded-full z-10" style={{ right: 32, top: 72 }} />

      <div className="absolute pointer-events-none" style={{ left: 30, bottom: -40, width: '100%', height: 259, transform: 'scale(1.04)', transformOrigin: 'bottom center' }}>
        <img src="/assets/postoffice.png" alt="Post Office" className="w-full h-full object-contain" />
      </div>
    </div>
  );
}
