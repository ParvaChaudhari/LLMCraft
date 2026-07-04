'use client';

import { useEffect, useMemo } from 'react';
import { EdgeProps } from '@xyflow/react';
import { routeIsometric, tilesToMotionPath } from '@/lib/isoRouter';
import { roadStore } from '@/lib/roadStore';

export default function RoadEdge({
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
  
  // Register with global road store
  useEffect(() => {
    roadStore.setPath(id, points);
    return () => roadStore.removePath(id);
  }, [id, points]);

  const motionPath = tilesToMotionPath(points);

  return (
    <g>
      {/* Invisible interaction path for hovering and clicking */}
      <path
        d={motionPath}
        fill="none"
        style={{ stroke: selected ? "rgba(255, 255, 255, 0.5)" : "transparent", cursor: 'pointer' }}
        strokeWidth={32}
      />

      {/* Truck animation */}
      {data?.isAnimating && motionPath && (
        // @ts-expect-error: SVG <image> with <animateMotion> child is valid SVG but not in React's typedefs
        <image href="/assets/truck.png" x={-16} y={-16} width={32} height={32}>
          <animateMotion dur="2s" repeatCount="1" path={motionPath} rotate="auto" />
        </image>
      )}
    </g>
  );
}
