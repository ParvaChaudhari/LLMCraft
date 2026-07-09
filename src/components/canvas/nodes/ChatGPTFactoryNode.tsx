import { Handle, Position, useReactFlow } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';

export default function ChatGPTFactoryNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  const { deleteElements, setNodes } = useReactFlow();

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes(nds => nds.map(n => {
      if (n.id !== id) return n;
      if (n.data.isPinned) {
        const { isPinned, pinnedOutput, ...rest } = n.data;
        return { ...n, data: rest };
      }
      return { ...n, data: { ...n.data, isPinned: true, pinnedOutput: n.data.output } };
    }));
  };

  return (
    <div className="relative group" style={{ width: 192, height: 96 }}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          deleteElements({ nodes: [{ id }] });
        }}
        className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white font-bold text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-red-500 border border-red-800 flex items-center justify-center pointer-events-auto"
        title="Delete Node"
      >
        X
      </button>
      <button
        onClick={togglePin}
        className={`absolute top-0 right-6 w-5 h-5 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center justify-center pointer-events-auto border ${
          data.isPinned ? 'bg-yellow-500 border-yellow-700 opacity-100' : 'bg-[#2d2d2d] border-[#1a1a1a] hover:bg-yellow-500'
        }`}
        title={data.isPinned ? 'Unpin output' : 'Pin output'}
      >
        📌
      </button>
      {data.isPinned && (
        <div className="absolute top-0 left-0 bg-yellow-500 text-black text-[8px] font-bold px-1 rounded-br z-50 pointer-events-none">PINNED</div>
      )}
      {selected && <DiamondHighlight cols={3} rows={3} />}

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-[#74aa9c] border-none rounded-full z-10" style={{ left: 48, top: 64 }} />

      <div className="absolute pointer-events-none" style={{ left: 0, bottom: -50, width: '100%', height: 256, transformOrigin: 'bottom center' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 bg-[#74aa9c] opacity-20 rounded-full blur-xl animate-pulse pointer-events-none -z-10"></div>

        <img src="/assets/chatgpt_factory.png" alt="ChatGPT Factory" className="w-full h-full object-contain" />

        {data.isLoading && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
            <div className="w-2 h-2 bg-[#74aa9c] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#74aa9c] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-[#74aa9c] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}
      </div>

      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
        ChatGPT AI Factory
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-[#74aa9c] border-none rounded-full z-10" style={{ right: 32, top: 48 }} />
    </div>
  );
}
