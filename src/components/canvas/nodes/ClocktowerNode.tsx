import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function ClocktowerNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 192, height: 105 }}>
      <NodeControls id={id} data={data} label="Clocktower Scheduler" />
      {/* Selection Highlight — covers only the 3×3 diamond footprint */}
      {selected && <DiamondHighlight />}

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-green-500 border-none rounded-full z-10" style={{ right: 64, top: 64 }} />

      {/* Image extends upward from the base footprint */}
      <div className="absolute left-0 w-full pointer-events-none" style={{ bottom: -30, height: 256, transform: 'scale(1)', transformOrigin: 'bottom center' }}>
        <img src="/assets/clocktower.png" alt="Clocktower" className="w-full h-full object-contain" />
      </div>

    </div>
  );
}
