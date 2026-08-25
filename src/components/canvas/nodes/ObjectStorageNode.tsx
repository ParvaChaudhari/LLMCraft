import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function ObjectStorageNode({ id, data, selected }: { id: string; data: any; selected?: boolean }) {
  const isExecuting = data?.isLoading;

  return (
    <div className="relative group" style={{ width: 192, height: 144 }}>
      <NodeControls id={id} data={data} showPin label="Object Storage (S3)" />
      {selected && <DiamondHighlight cols={3} rows={3} offsetX={0} offsetY={32} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-sky-500 border-none rounded-full z-10" style={{ left: 48, top: 100 }} />

      <div className="absolute pointer-events-none" style={{ left: 0, bottom: -50, width: '100%', height: 260, transformOrigin: 'bottom center' }}>
        <img src="/assets/object_storage.png" alt="Object Storage" className="w-full h-full object-contain" />

        {isExecuting && (
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-20 h-20 bg-sky-400 opacity-40 rounded-full blur-xl animate-pulse pointer-events-none z-10"></div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-sky-500 border-none rounded-full z-10" style={{ right: 48, top: 100 }} />
    </div>
  );
}
