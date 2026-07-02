export default function SidePanel({
  selectedNode,
  onClose,
}: {
  selectedNode: any;
  onClose: () => void;
}) {
  if (!selectedNode) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-[#d8c8b8] border-l-[4px] border-[#2d2d2d] z-20">
      <div className="p-4 border-b-[4px] border-[#2d2d2d] flex justify-between items-center bg-[#c4b4a4]">
        <h2 className="text-xl font-bold text-[#2d2d2d] uppercase tracking-widest">Terminal</h2>
        <button onClick={onClose} className="text-[#2d2d2d] hover:text-black font-bold text-xl">
          [X]
        </button>
      </div>

      <div className="p-4 space-y-6 text-[#2d2d2d]">
        <div>
          <label className="block text-sm font-bold mb-1 uppercase">Block ID</label>
          <div className="bg-[#1e1e1e] text-[#4af626] p-2 border-2 border-[#2d2d2d] text-sm">
            {selectedNode.id}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1 uppercase">Block Type</label>
          <div className="bg-[#1e1e1e] text-[#4af626] p-2 border-2 border-[#2d2d2d] text-sm capitalize">
            {selectedNode.type}
          </div>
        </div>

        <div className="pt-4 border-t border-[#2d2d2d]">
          <label className="block text-sm font-bold mb-1 uppercase">
            Fake Setting 1
          </label>
          <input
            type="text"
            className="w-full bg-[#1e1e1e] text-[#4af626] p-2 border-2 border-[#2d2d2d] outline-none"
            placeholder="Type something..."
          />
        </div>
      </div>
    </div>
  );
}
