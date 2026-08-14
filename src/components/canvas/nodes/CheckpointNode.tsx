import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function CheckpointNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 190, height: 78 }}>
      <NodeControls id={id} data={data} label="Checkpoint" />
      {selected && <DiamondHighlight cols={3} rows={3} style={{ left: 0, top: 0 }} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-orange-500 border-none rounded-full z-10" style={{ left: 85, top: 85 }} />
      <Handle type="source" id="approved" position={Position.Right} className="w-2 h-2 bg-green-500 border-none rounded-full z-10" style={{ left: 160, top: 40 }} />
      <Handle type="source" id="rejected" position={Position.Right} className="w-2 h-2 bg-red-500 border-none rounded-full z-10" style={{ left: 140, top: 60 }} />

      <div className="absolute pointer-events-none" style={{ left: 0, bottom: -65, width: '100%', height: 200, transform: 'scale(1.1)', transformOrigin: 'bottom center' }}>
        <img src="/assets/checkpoint.png" alt="Checkpoint" className="w-full h-full object-contain" />
      </div>
    </div>
  );
}
