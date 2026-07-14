'use client';

import { useMemo } from 'react';
import { EdgeProps } from '@xyflow/react';
import { routeIsometric, tilesToMotionPath } from '@/lib/isoRouter';

export default function PipeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps) {
  // Compute path points (returns GridPoint[])
  const points = useMemo(() => routeIsometric(sourceX, sourceY, targetX, targetY), [sourceX, sourceY, targetX, targetY]);
  const motionPath = tilesToMotionPath(points);

  // Faster pipeline animation
  const isAnimating = Boolean(data?.isAnimating);

  return (
    <g>
      {/* Invisible interaction path for hovering and clicking */}
      <path
        d={motionPath as string}
        fill="none"
        style={{ stroke: "transparent", cursor: 'pointer' }}
        strokeWidth={32}
      />

      {/* Main Pipe Background (Metallic) */}
      <path
        d={motionPath as string}
        fill="none"
        stroke={selected ? "#ffffff" : "#4b5563"} // gray-600
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ 
          filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.5))',
        }}
      />
      
      {/* Pipe Inner Shadow / Highlight */}
      <path
        d={motionPath as string}
        fill="none"
        stroke="#9ca3af" // gray-400
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Flowing Data Animation */}
      {isAnimating && (
        <path
          d={motionPath as string}
          fill="none"
          stroke="#06b6d4" // cyan-500
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="10 15"
          className="animate-pipe-flow"
        />
      )}
    </g>
  );
}
