import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';

export default function GeminiFactoryNode({ data, selected }: { data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 192, height: 96 }}>
      {selected && <DiamondHighlight cols={3} rows={3} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-blue-500 border-none rounded-full z-10" style={{ left: 48, top: 64 }} />

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

      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
        Gemini AI Factory
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-blue-500 border-none rounded-full z-10" style={{ right: 32, top: 48 }} />
    </div>
  );
}
