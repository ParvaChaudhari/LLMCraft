import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function LimitNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 192, height: 96 }}>
      <NodeControls id={id} data={data} label="Toll Booth" />
      {selected && <DiamondHighlight />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-yellow-500 border-none rounded-full z-10" style={{ left: 32, top: 48 }} />

      <div className="absolute pointer-events-none" style={{ left: 15, bottom: -87, width: '100%', height: 256, transform: 'scale(1.15)', transformOrigin: 'bottom center' }}>
        <img src="/assets/limit_toll.png" alt="Limit" className="w-full h-full object-contain" />
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-green-500 border-none rounded-full z-10" style={{ right: 32, top: 48 }} />
    </div>
  );
}
