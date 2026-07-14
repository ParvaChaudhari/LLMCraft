import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function CustomWorkshopNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 192, height: 103 }}>
      <NodeControls id={id} data={data} showPin label="Custom Workshop" />
      {selected && <DiamondHighlight cols={3} rows={3} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-green-500 border-none rounded-full z-10" style={{ left: 48, top: 64 }} />

      <div className="absolute pointer-events-none" style={{ left: 0, bottom: -50, width: '100%', height: 300, transformOrigin: 'bottom center' }}>
        <img src="/assets/custom_workshop.png" alt="Custom Workshop" className="w-full h-full object-contain" />

        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-green-500 opacity-20 rounded-full blur-xl animate-pulse pointer-events-none -z-10"></div>
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-green-500 border-none rounded-full z-10" style={{ right: 48, top: 64 }} />
    </div>
  );
}
