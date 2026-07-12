import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function OutputNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 256, height: 128 }}>
      <NodeControls id={id} data={data} label="Final Destination" />
      {selected && <DiamondHighlight cols={4} rows={4} style={{ left: 32, top: -32 }} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-orange-500 border-none rounded-full z-10" style={{ left: 64, top: 32 }} />

      <div className="absolute pointer-events-none" style={{ left: 30, bottom: -40, width: '100%', height: 259, transform: 'scale(1.06)', transformOrigin: 'bottom center' }}>
        <img src="/assets/output_dock.png" alt="Output" className="w-full h-full object-contain" />
      </div>
    </div>
  );
}

