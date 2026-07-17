import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function ApifyNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const isExecuting = data?.isLoading;

  return (
    <div className="relative group" style={{ width: 192, height: 80 }}>
      <NodeControls id={id} data={data} showPin label="Apify Drone Hub" />
      {selected && <DiamondHighlight cols={3} rows={3} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-blue-500 border-none rounded-full z-10" style={{ left: 48, top: 60 }} />

      <div className="absolute pointer-events-none" style={{ left: 0, bottom: -50, width: '100%', height: 260, transformOrigin: 'bottom center' }}>
        <img src="/assets/drone_hub.png" alt="Apify Drone Hub" className="w-full h-full object-contain" style={{ transform: 'scale(1.1)' }} />

        {isExecuting && (
          <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-24 h-24 bg-blue-400 opacity-40 rounded-full blur-xl animate-pulse pointer-events-none z-10"></div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-blue-500 border-none rounded-full z-10" style={{ right: 48, top: 60 }} />
    </div>
  );
}
