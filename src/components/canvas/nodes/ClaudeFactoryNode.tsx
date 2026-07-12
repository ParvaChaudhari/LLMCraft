import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function ClaudeFactoryNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 192, height: 96 }}>
      <NodeControls id={id} data={data} showPin label="Claude AI" />
      {selected && <DiamondHighlight cols={3} rows={3} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-[#d97757] border-none rounded-full z-10" style={{ left: 48, top: 64 }} />

      <div className="absolute pointer-events-none" style={{ left: 16, bottom: -45, width: '100%', height: 210, transform: 'scale(1.15)', transformOrigin: 'bottom center' }}>
        <img src="/assets/claude_factory.png" alt="Claude Factory" className="w-full h-full object-contain" />
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-[#d97757] border-none rounded-full z-10" style={{ right: 32, top: 48 }} />
    </div>
  );
}

