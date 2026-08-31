'use client';

import { useMemo } from 'react';
import { EdgeProps } from '@xyflow/react';
import { routeIsometric, tilesToMotionPath } from '@/lib/isoRouter';

type Direction = 'NW' | 'SE' | 'NE' | 'SW';

function getDirection(dx: number, dy: number): Direction | null {
  if (dx > 0 && dy > 0) return 'SE';
  if (dx < 0 && dy < 0) return 'NW';
  if (dx > 0 && dy < 0) return 'NE';
  if (dx < 0 && dy > 0) return 'SW';
  return null;
}

function opposite(dir: Direction): Direction {
  if (dir === 'SE') return 'NW';
  if (dir === 'NW') return 'SE';
  if (dir === 'SW') return 'NE';
  if (dir === 'NE') return 'SW';
  return 'SE';
}

function TunnelTile({ dirs }: { dirs: Set<Direction> }) {
  const hasNW = dirs.has('NW');
  const hasSE = dirs.has('SE');
  const hasNE = dirs.has('NE');
  const hasSW = dirs.has('SW');

  const TUNNEL_DARK = 'rgba(15, 23, 42, 0.85)';
  const TUNNEL_SHADOW = 'rgba(2, 6, 23, 0.9)';
  const CURB_SUBTLE = 'rgba(51, 65, 85, 0.4)';

  return (
    <g>
      {/* Dark Translucent Subterranean Tile */}
      <polygon
        points="32,0 64,16 32,32 0,16"
        fill={TUNNEL_DARK}
      />

      {/* Subtle depth shadow overlay */}
      <polygon
        points="32,2 62,16 32,30 2,16"
        fill={TUNNEL_SHADOW}
        opacity={0.35}
      />

      {/* Subtle dark side edges (no yellow) */}
      {(hasNW || hasSE) && (
        <g>
          <line x1="32" y1="0" x2="64" y2="16" stroke={CURB_SUBTLE} strokeWidth={1.5} />
          <line x1="0" y1="16" x2="32" y2="32" stroke={CURB_SUBTLE} strokeWidth={1.5} />
        </g>
      )}

      {(hasNE || hasSW) && (
        <g>
          <line x1="32" y1="0" x2="0" y2="16" stroke={CURB_SUBTLE} strokeWidth={1.5} />
          <line x1="64" y1="16" x2="32" y2="32" stroke={CURB_SUBTLE} strokeWidth={1.5} />
        </g>
      )}
    </g>
  );
}

export default function TunnelEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
  sourcePosition,
}: EdgeProps) {
  // Compute path points (returns GridPoint[])
  const points = useMemo(
    () => routeIsometric(sourceX, sourceY, targetX, targetY, sourcePosition),
    [sourceX, sourceY, targetX, targetY, sourcePosition]
  );

  const motionPath = useMemo(() => tilesToMotionPath(points), [points]);

  // Compute direction map per grid cell along the tunnel path
  const gridCells = useMemo(() => {
    const grid = new Map<string, { x: number; y: number; dirs: Set<Direction> }>();

    const addConnection = (x: number, y: number, dir: Direction) => {
      const key = `${Math.round(x)},${Math.round(y)}`;
      if (!grid.has(key)) {
        grid.set(key, { x, y, dirs: new Set() });
      }
      grid.get(key)!.dirs.add(dir);
    };

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;

      const dir = getDirection(dx, dy);
      if (dir) {
        addConnection(p0.x, p0.y, dir);
        addConnection(p1.x, p1.y, opposite(dir));
      }
    }

    if (points.length === 1) {
      const p = points[0];
      const key = `${Math.round(p.x)},${Math.round(p.y)}`;
      if (!grid.has(key)) grid.set(key, { x: p.x, y: p.y, dirs: new Set() });
    }

    return Array.from(grid.values());
  }, [points]);

  return (
    <g>
      {/* Invisible interaction path for hovering and clicking/deleting */}
      <path
        d={motionPath as string}
        fill="none"
        style={{ stroke: selected ? 'rgba(255, 255, 255, 0.5)' : 'transparent', cursor: 'pointer' }}
        strokeWidth={32}
      />

      {/* Subterranean Translucent Tunnel Tiles */}
      {gridCells.map((cell) => (
        <g key={`${cell.x},${cell.y}`} transform={`translate(${cell.x - 32}, ${cell.y - 16})`}>
          <TunnelTile dirs={cell.dirs} />
        </g>
      ))}

      {/* Flowing Data Animation during execution */}
      {Boolean(data?.isAnimating) && (
        <path
          d={motionPath as string}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8 16"
          className="animate-pipe-flow"
        />
      )}
    </g>
  );
}
