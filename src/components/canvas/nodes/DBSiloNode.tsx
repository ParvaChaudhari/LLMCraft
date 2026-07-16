import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function DBSiloNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const isExecuting = data?.isLoading;

  return (
    <div className="relative group" style={{ width: 192, height: 82 }}>
      <NodeControls id={id} data={data} showPin label="DB Silo" />
      {selected && <DiamondHighlight cols={3} rows={3} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-cyan-500 border-none rounded-full z-10" style={{ left: 48, top: 64 }} />

      <div className="absolute pointer-events-none" style={{ left: 0, bottom: -40, width: '100%', height: 260, transformOrigin: 'bottom center' }}>
        <img src="/assets/db_silo.png" alt="DB Silo" className="w-full h-full object-contain" style={{ transform: 'scale(1.2)' }} />

        {isExecuting && (
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-20 h-20 bg-cyan-400 opacity-40 rounded-full blur-xl animate-pulse pointer-events-none z-10"></div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-cyan-500 border-none rounded-full z-10" style={{ right: 48, top: 64 }} />
    </div>
  );
}
