'use client';

export default function Toolbox() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="absolute top-4 left-4 z-10 w-48 bg-white shadow-xl rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
      <h3 className="text-sm font-bold text-gray-800 mb-1 border-b pb-2">Toolbox</h3>
      
      <div className="text-[10px] uppercase text-gray-400 font-bold mt-1">Triggers</div>
      <div 
        className="p-2 border-2 border-green-400 bg-green-50 rounded text-xs font-bold text-green-800 cursor-grab active:cursor-grabbing text-center transition-colors hover:bg-green-100"
        onDragStart={(e) => onDragStart(e, 'webhook')} draggable>
        Webhook
      </div>

      <div className="text-[10px] uppercase text-gray-400 font-bold mt-2">Actions</div>
      <div 
        className="p-2 border-2 border-blue-400 bg-blue-50 rounded text-xs font-bold text-blue-800 cursor-grab active:cursor-grabbing text-center transition-colors hover:bg-blue-100"
        onDragStart={(e) => onDragStart(e, 'geminiFactory')} draggable>
        Gemini Factory
      </div>
      <div 
        className="p-2 border-2 border-teal-400 bg-teal-50 rounded text-xs font-bold text-teal-800 cursor-grab active:cursor-grabbing text-center transition-colors hover:bg-teal-100"
        onDragStart={(e) => onDragStart(e, 'httpRequest')} draggable>
        HTTP Request
      </div>
      
      <div className="text-[10px] uppercase text-gray-400 font-bold mt-2">Logic</div>
      <div 
        className="p-2 border-2 border-yellow-400 bg-yellow-50 rounded text-xs font-bold text-yellow-800 cursor-grab active:cursor-grabbing text-center transition-colors hover:bg-yellow-100"
        onDragStart={(e) => onDragStart(e, 'conditional')} draggable>
        Conditional
      </div>
      <div 
        className="p-2 border-2 border-gray-600 bg-gray-50 rounded text-xs font-bold text-gray-800 cursor-grab active:cursor-grabbing text-center transition-colors hover:bg-gray-100"
        onDragStart={(e) => onDragStart(e, 'delay')} draggable>
        Delay
      </div>

      <div className="text-[10px] uppercase text-gray-400 font-bold mt-2">Outputs</div>
      <div 
        className="p-2 border-2 border-orange-400 bg-orange-50 rounded text-xs font-bold text-orange-800 cursor-grab active:cursor-grabbing text-center transition-colors hover:bg-orange-100"
        onDragStart={(e) => onDragStart(e, 'output')} draggable>
        Output Node
      </div>
    </div>
  );
}
