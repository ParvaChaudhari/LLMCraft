import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function WebhookResponseNode({ id, data, selected }: { id: string; data: any; selected?: boolean }) {
  const isExecuting = data?.isLoading;

  return (
    <div className="relative group" style={{ width: 192, height: 133 }}>
      <NodeControls id={id} data={data} showPin label="Reply Tower" />
      {selected && <DiamondHighlight cols={3} rows={3} offsetX={0} offsetY={32} />}

      {/* Input target handle from incoming workflow branch */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 bg-teal-400 border-none rounded-full z-10"
        style={{ left: 48, top: 100 }}
      />

      {/* Visual Sprite Container */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: 0,
          bottom: -50,
          width: '100%',
          height: 260,
          transform: 'scale(1.58)',
          transformOrigin: 'bottom center',
        }}
      >
        <img
          src="/assets/reply_tower.png"
          alt="Reply Tower (Webhook Response)"
          className="w-full h-full object-contain"
        />

        {/* Active glowing telemetry pulse when responding */}
        {isExecuting && (
          <div className="absolute top-[35%] left-[50%] -translate-x-1/2 w-20 h-20 bg-teal-400 opacity-40 rounded-full blur-xl animate-pulse pointer-events-none z-10"></div>
        )}
      </div>

      {/* Optional passthrough source handle to allow logging/archiving branches after response */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 bg-teal-400 border-none rounded-full z-10"
        style={{ right: 48, top: 100 }}
      />
    </div>
  );
}
