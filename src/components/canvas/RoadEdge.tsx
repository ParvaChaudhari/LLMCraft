'use client';

import { useEffect, useMemo } from 'react';
import { EdgeProps } from '@xyflow/react';
import { routeIsometric, tilesToMotionPath } from '@/lib/isoRouter';
import { roadStore } from '@/lib/roadStore';

import TruckAnimator from './TruckAnimator';

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
        d={motionPath as string}
        fill="none"
        style={{ stroke: selected ? "rgba(255, 255, 255, 0.5)" : "transparent", cursor: 'pointer' }}
        strokeWidth={32}
      />

      {/* Custom Truck Animator */}
      {Boolean(data?.isAnimating) && points.length > 0 && (
        <TruckAnimator points={points} duration={2000} />
      )}
    </g>
  );
}
