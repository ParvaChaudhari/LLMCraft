import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function BankVaultNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const isExecuting = data?.isLoading;

  return (
    <div className="relative group" style={{ width: 256, height: 134 }}>
      <NodeControls id={id} data={data} showPin label="Supabase Center" />
      {selected && <DiamondHighlight cols={4} rows={4} offsetY={16} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-[#4af626] border-none rounded-full z-10" style={{ left: 64, top: 110 }} />

      <div className="absolute pointer-events-none" style={{ left: 0, bottom: -60, width: '100%', height: 300, transformOrigin: 'bottom center' }}>
        <img src="/assets/bank-vault.png" alt="Supabase Center" className="w-full h-full object-contain" style={{ transform: 'scale(1.0)' }} />

        {isExecuting && (
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-32 h-32 bg-[#4af626] opacity-40 rounded-full blur-xl animate-pulse pointer-events-none z-10"></div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-[#4af626] border-none rounded-full z-10" style={{ right: 64, top: 100 }} />
    </div>
  );
}
