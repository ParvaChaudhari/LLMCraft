export default function SidePanel({
  selectedNode,
  onClose,
}: {
  selectedNode: any;
  onClose: () => void;
}) {
  if (!selectedNode) return null;

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-white shadow-2xl border-l border-gray-200 z-10 flex flex-col transform transition-transform">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="text-lg font-bold text-gray-800">Node Configuration</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-800 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <div className="p-2 bg-gray-100 rounded text-sm text-gray-600">
            {selectedNode.type}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Node ID
          </label>
          <div className="p-2 bg-gray-100 rounded text-sm text-gray-600">
            {selectedNode.id}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fake Setting 1
          </label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Type something..."
          />
        </div>
      </div>
    </div>
  );
}
