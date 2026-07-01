import { Handle, Position } from '@xyflow/react';

export default function AnthropicFactoryNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-gray-500">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500" />
      <div className="font-bold text-gray-800 text-sm">Anthropic Factory</div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500" />
    </div>
  );
}
