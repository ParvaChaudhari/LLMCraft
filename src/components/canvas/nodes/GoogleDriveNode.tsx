import { Handle, Position } from '@xyflow/react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

export default function GoogleDriveNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
  return (
    <div className="relative group" style={{ width: 192, height: 127 }}>
      <NodeControls id={id} data={data} label="Cloud Vault" />
      
      {/* Target Connection (Left side) */}
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-blue-500 border-none rounded-full z-10" style={{ left: 64, top: 64 }} />
      
      {/* Source Connection (Right side) */}
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-blue-500 border-none rounded-full z-10" style={{ right: 64, top: 64 }} />

      {/* Selection Highlight */}
      {selected && <DiamondHighlight />}

      {/* Image extends upward from the base footprint */}
      <div className="absolute left-0 w-full pointer-events-none" style={{ bottom: -30, height: 256, transform: 'scale(1.3)', transformOrigin: 'bottom center' }}>
        <img src="/assets/gdrive_vault.png" alt="Cloud Vault" className="w-full h-full object-contain" />
      </div>
    </div>
  );
}
