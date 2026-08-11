import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function MergeNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 192, height: 96 }}>
      <NodeControls id={id} data={data} label="Junction Tower" />
      {selected && <DiamondHighlight />}

      {/* Two input handles on the left — Branch A (top) and Branch B (bottom) */}
      <Handle type="target" position={Position.Left} id="a" className="w-2 h-2 bg-blue-400 border-none rounded-full z-10" style={{ left: 64, top: 28 }} />
      <Handle type="target" position={Position.Left} id="b" className="w-2 h-2 bg-purple-400 border-none rounded-full z-10" style={{ left: 64, top: 64 }} />

      <div className="absolute pointer-events-none" style={{ left: 0, bottom: -70, width: '100%', height: 210, transform: 'scale(1)', transformOrigin: 'bottom center' }}>
        <img src="/assets/merge_junction.png" alt="Junction Tower" className="w-full h-full object-contain" />
      </div>

      {/* Single output handle on the right (aligned to Top-Right road) */}
      <Handle type="source" position={Position.Top} id="merged" className="w-2 h-2 bg-amber-400 border-none rounded-full z-10" style={{ right: 55, left: 'auto', top: 25, transform: 'none' }} />
    </div>
  );
}
