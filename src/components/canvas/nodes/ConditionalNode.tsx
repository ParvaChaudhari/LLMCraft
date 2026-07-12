import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function ConditionalNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 192, height: 96 }}>
      <NodeControls id={id} data={data} label="Fork in the Road" />
      {selected && <DiamondHighlight />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-yellow-500 border-none rounded-full z-10" style={{ left: 64, top: 32 }} />

      <div className="absolute pointer-events-none" style={{ left: 0, bottom: -70, width: '100%', height: 210, transform: 'scale(1)', transformOrigin: 'bottom center' }}>
        <img src="/assets/conditional_road.png" alt="Conditional" className="w-full h-full object-contain" />
      </div>

      <Handle type="source" position={Position.Right} id="true" className="w-2 h-2 bg-green-500 border-none rounded-full z-10" style={{ right: 64, top: 64 }} />
      <Handle type="source" position={Position.Right} id="false" className="w-2 h-2 bg-red-500 border-none rounded-full z-10" style={{ right: 64, top: 16 }} />
    </div>
  );
}

