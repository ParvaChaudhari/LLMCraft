import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function GeminiFactoryNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const agentMode = data?.agentMode === true;

  return (
    <div className="relative group" style={{ width: 192, height: 96 }}>
      <NodeControls id={id} data={data} showPin label="Gemini AI" />
      {selected && <DiamondHighlight cols={3} rows={3} />}

      {/* Agent mode badge */}
      {agentMode && (
        <div className="absolute top-0 right-0 z-20 bg-amber-400 text-black font-black px-1 py-0.5 uppercase tracking-wider leading-none pointer-events-none" style={{ fontSize: 7 }}>
          AGENT
        </div>
      )}

      {/* Main Data Input Handle */}
      <Handle type="target" position={Position.Left} id="main" className="w-2 h-2 bg-blue-500 border-none rounded-full z-10" style={{ left: 48, top: 64 }} />

      {/* Tool Input Handle (Top-Right isometric corner) */}
      {agentMode && (
        <Handle
          type="target"
          position={Position.Top}
          id="tool"
          className="w-2.5 h-2.5 bg-amber-400 border-none rounded-full z-10"
          style={{ right: 55, left: 'auto', top: 25, transform: 'none' }}
          title="Tool Input (Connect Tool nodes here)"
        />
      )}

      <div className="absolute pointer-events-none" style={{ left: 0, bottom: -50, width: '100%', height: 256, transformOrigin: 'bottom center' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 bg-blue-400 opacity-20 rounded-full blur-xl animate-pulse pointer-events-none -z-10"></div>

        <img src="/assets/gemini_factory.png" alt="Gemini Factory" className="w-full h-full object-contain" />

        {data.isLoading && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="output" className="w-2 h-2 bg-blue-500 border-none rounded-full z-10" style={{ right: 32, top: 48 }} />
    </div>
  );
}
