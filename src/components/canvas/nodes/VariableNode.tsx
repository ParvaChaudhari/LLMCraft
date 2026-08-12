import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function VariableNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 128, height: 86 }}>
      <NodeControls id={id} data={data} label="Warehouse" />
      {selected && <DiamondHighlight />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-blue-500 border-none rounded-full z-10" style={{ left: 50, top: 62 }} />

      <div className="absolute pointer-events-none" style={{ left: 30, bottom: -40, width: '100%', height: 128, transform: 'scale(1.5)', transformOrigin: 'bottom center' }}>
        <img src="/assets/storage_shed.png" alt="Storage Shed" className="w-full h-full object-contain" />
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-green-500 border-none rounded-full z-10" style={{ right: 2, top: 62 }} />
    </div>
  );
}
