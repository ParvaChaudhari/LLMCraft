import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function AirportNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 256, height: 154 }}>
      <NodeControls id={id} data={data} label="Agent Runway" />
      {selected && <DiamondHighlight cols={5} rows={5} style={{ left: 0, top: 0 }} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-orange-500 border-none rounded-full z-10" style={{ left: 102, top: 47 }} />
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-blue-500 border-none rounded-full z-10" style={{ left: 224, top: 107 }} />

      <div className="absolute pointer-events-none" style={{ left: 30, bottom: -40, width: '100%', height: 259, transform: 'scale(1.2)', transformOrigin: 'bottom center' }}>
        <img src="/assets/airport.png" alt="Airport" className="w-full h-full object-contain" />
      </div>
    </div>
  );
}
