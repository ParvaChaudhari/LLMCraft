'use client';

import { useSyncExternalStore, useMemo } from 'react';
import { useViewport } from '@xyflow/react';
import { roadStore } from '@/lib/roadStore';
import { GridPoint } from '@/lib/isoRouter';

const ASPHALT_COLOR = "#4a4e58";
const CURB_COLOR = "#9a9da8";
const LINE_COLOR = "#d4a843";

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

function TileGraphic({ dirs }: { dirs: Set<Direction> }) {
  const diamond = <polygon points="32,0 64,16 32,32 0,16" fill={ASPHALT_COLOR} />;

  const hasNW = dirs.has('NW');
  const hasSE = dirs.has('SE');
  const hasNE = dirs.has('NE');
  const hasSW = dirs.has('SW');
  const count = dirs.size;

  if (count === 0) return null;

  // 4-WAY CROSSROAD
  if (count === 4) {
    return (
      <g>
        {diamond}
        <line x1="16" y1="8" x2="48" y2="24" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
        <line x1="48" y1="8" x2="16" y2="24" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
      </g>
    );
  }

  // T-JUNCTIONS (3 connections)
  if (count === 3) {
    if (!hasNE) {
      return (
        <g>
          {diamond}
          <line x1="32" y1="0" x2="64" y2="16" stroke={CURB_COLOR} strokeWidth={4} />
          <line x1="16" y1="8" x2="48" y2="24" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
          <line x1="16" y1="24" x2="32" y2="16" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
        </g>
      );
    }
    if (!hasSW) {
      return (
        <g>
          {diamond}
          <line x1="0" y1="16" x2="32" y2="32" stroke={CURB_COLOR} strokeWidth={4} />
          <line x1="16" y1="8" x2="48" y2="24" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
          <line x1="48" y1="8" x2="32" y2="16" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
        </g>
      );
    }
    if (!hasSE) {
      return (
        <g>
          {diamond}
          <line x1="64" y1="16" x2="32" y2="32" stroke={CURB_COLOR} strokeWidth={4} />
          <line x1="48" y1="8" x2="16" y2="24" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
          <line x1="16" y1="8" x2="32" y2="16" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
        </g>
      );
    }
    if (!hasNW) {
      return (
        <g>
          {diamond}
          <line x1="0" y1="16" x2="32" y2="0" stroke={CURB_COLOR} strokeWidth={4} />
          <line x1="48" y1="8" x2="16" y2="24" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
          <line x1="48" y1="24" x2="32" y2="16" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
        </g>
      );
    }
  }

  // CORNERS (2 adjacent connections)
  if (count === 2) {
    if (hasNW && hasSW) {
      return (
        <g>
          {diamond}
          <polyline points="32,0 64,16 32,32" fill="none" stroke={CURB_COLOR} strokeWidth={4} strokeLinejoin="round" />
          <path d="M 16,8 Q 32,16 16,24" fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
        </g>
      );
    }
    if (hasNW && hasNE) {
      return (
        <g>
          {diamond}
          <polyline points="0,16 32,32 64,16" fill="none" stroke={CURB_COLOR} strokeWidth={4} strokeLinejoin="round" />
          <path d="M 16,8 Q 32,16 48,8" fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
        </g>
      );
    }
    if (hasSE && hasSW) {
      return (
        <g>
          {diamond}
          <polyline points="0,16 32,0 64,16" fill="none" stroke={CURB_COLOR} strokeWidth={4} strokeLinejoin="round" />
          <path d="M 16,24 Q 32,16 48,24" fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
        </g>
      );
    }
    if (hasSE && hasNE) {
      return (
        <g>
          {diamond}
          <polyline points="32,0 0,16 32,32" fill="none" stroke={CURB_COLOR} strokeWidth={4} strokeLinejoin="round" />
          <path d="M 48,24 Q 32,16 48,8" fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
        </g>
      );
    }
  }

  // STRAIGHTS & DEAD ENDS (2 opposite connections, or 1 connection)
  if (hasNW || hasSE) {
    return (
      <g>
        {diamond}
        <line x1="32" y1="0" x2="64" y2="16" stroke={CURB_COLOR} strokeWidth={4} />
        <line x1="0" y1="16" x2="32" y2="32" stroke={CURB_COLOR} strokeWidth={4} />
        <line x1="16" y1="8" x2="48" y2="24" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
      </g>
    );
  }
  
  if (hasNE || hasSW) {
    return (
      <g>
        {diamond}
        <line x1="32" y1="0" x2="0" y2="16" stroke={CURB_COLOR} strokeWidth={4} />
        <line x1="64" y1="16" x2="32" y2="32" stroke={CURB_COLOR} strokeWidth={4} />
        <line x1="48" y1="8" x2="16" y2="24" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
      </g>
    );
  }

  // Fallback (shouldn't be reached if count > 0)
  return <g>{diamond}</g>;
}

export default function RoadLayer() {
  const { x, y, zoom } = useViewport();
  const paths = useSyncExternalStore(roadStore.subscribe, roadStore.getPaths, roadStore.getPaths);

  const gridMap = useMemo(() => {
    const grid = new Map<string, { x: number, y: number, dirs: Set<Direction> }>();

    const addConnection = (x: number, y: number, dir: Direction) => {
      const key = `${Math.round(x)},${Math.round(y)}`;
      if (!grid.has(key)) {
        grid.set(key, { x, y, dirs: new Set() });
      }
      grid.get(key)!.dirs.add(dir);
    };

    paths.forEach(points => {
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
      
      // Handle isolated points (shouldn't happen with our routing, but just in case)
      if (points.length === 1) {
        const p = points[0];
        const key = `${Math.round(p.x)},${Math.round(p.y)}`;
        if (!grid.has(key)) grid.set(key, { x: p.x, y: p.y, dirs: new Set() });
      }
    });

    return Array.from(grid.values());
  }, [paths]);

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 0 }}>
      <g transform={`translate(${x}, ${y}) scale(${zoom})`}>
        {gridMap.map(cell => (
          <g key={`${cell.x},${cell.y}`} transform={`translate(${cell.x - 32}, ${cell.y - 16})`}>
            <TileGraphic dirs={cell.dirs} />
          </g>
        ))}
      </g>
    </svg>
  );
}
