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

  // Compute intervals for the metal strap connectors
  const straps = useMemo(() => {
    const list = [];
    const STRAP_INTERVAL = 64;
    let accumulatedDistance = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      const isNWSE = Math.sign(dx) === Math.sign(dy);

      const startD = accumulatedDistance;
      const endD = accumulatedDistance + len;

      // Find all multiples of STRAP_INTERVAL that fall within this segment
      let nextStrap = Math.ceil((startD + 0.1) / STRAP_INTERVAL) * STRAP_INTERVAL;

      // Optional offset so we don't put a strap immediately on the start node
      if (nextStrap === 0) nextStrap = STRAP_INTERVAL;

      for (let d = nextStrap; d <= endD; d += STRAP_INTERVAL) {
        const t = (d - startD) / len;
        list.push({
          x: p1.x + t * dx,
          y: p1.y + t * dy,
          isNWSE
        });
      }

      accumulatedDistance += len;
    }
    return list;
  }, [points]);

  return (
    <g>
      {/* Invisible interaction path for hovering and clicking */}
      <path
        d={motionPath as string}
        fill="none"
        style={{ stroke: "transparent", cursor: 'pointer' }}
        strokeWidth={32}
      />

      {/* Group with drop shadow for 3D depth */}
      <g style={{ filter: 'drop-shadow(2px 8px 6px rgba(0,0,0,0.6))' }}>

        {/* Pipe 1 (Top-Left offset) */}
        <g transform="translate(0, -6)">
          {/* Base pipe (dark) */}
          <path d={motionPath as string} fill="none" stroke={selected ? "#ffffff" : "#1f2937"} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          {/* Cylindrical Highlight (shifted up for 3D effect) */}
          <g transform="translate(0, -2)">
            <path d={motionPath as string} fill="none" stroke="#6b7280" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>

        {/* Pipe 2 (Bottom-Right offset) */}
        <g transform="translate(0, 6)">
          <path d={motionPath as string} fill="none" stroke={selected ? "#ffffff" : "#1f2937"} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          <g transform="translate(0, -2)">
            <path d={motionPath as string} fill="none" stroke="#6b7280" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>

        {/* 3D Isometric Connector Brackets */}
        {straps.map((strap, i) => (
          <g key={i} transform={`translate(${strap.x}, ${strap.y})`}>
            {/* 
              TWEAK THESE POINTS TO ROTATE THE STRAPS! 
              Format is: "x1,y1 x2,y2 x3,y3 x4,y4"
              These map to the four corners of the strap quad.
            */}
            <polygon
              points={strap.isNWSE ? "-12,4 16,-10 12,-4 -16,10" : "-16,-10 12,4 16,10 -12,-4"}
              fill="#111827"
            />
            {/* Top metallic highlight for the bracket (usually the first two points of the polygon) */}
            <polyline
              points={strap.isNWSE ? "-12,4 16,-10" : "-16,-10 12,4"}
              stroke="#9ca3af"
              strokeWidth={2}
              fill="none"
            />
          </g>
        ))}
      </g>

      {/* Flowing Data Animation (Dual Flow) */}
      {isAnimating && (
        <g>
          <path
            d={motionPath as string}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 24"
            className="animate-pipe-flow"
            transform="translate(0, -6)"
          />
          <path
            d={motionPath as string}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 24"
            className="animate-pipe-flow"
            transform="translate(0, 6)"
            style={{ animationDelay: '-0.5s' }}
          />
        </g>
      )}
    </g>
  );
}
