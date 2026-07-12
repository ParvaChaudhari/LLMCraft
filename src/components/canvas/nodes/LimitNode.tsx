import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function LimitNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 102, height: 100 }}>
      <NodeControls id={id} data={data} label="Toll Booth" />
      {selected && <DiamondHighlight cols={2} rows={1} style={{ left: 0, top: 32 }} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-yellow-500 border-none rounded-full z-10" style={{ left: 26, top: 42 }} />

      <div className="absolute pointer-events-none" style={{ left: 0, bottom: -20, width: '100%', height: 150, transformOrigin: 'bottom center' }}>
        <img src="/assets/limit_toll.png" alt="Limit" className="w-full h-full object-contain" />
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-green-500 border-none rounded-full z-10" style={{ right: 26, top: 62 }} />
    </div>
  );
}
