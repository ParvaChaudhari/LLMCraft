'use client';

import { EdgeProps } from '@xyflow/react';
import { routeIsometric, tilesToMotionPath, TilePlacement, TileType } from '@/lib/isoRouter';

const TILE_W = 64;
const TILE_H = 32;

const ASPHALT_COLOR = "#4a4e58";
const CURB_COLOR = "#9a9da8";
const LINE_COLOR = "#d4a843";

function TileGraphic({ tile }: { tile: TileType }) {
  // Common diamond base for all tiles
  const diamond = <polygon points="32,0 64,16 32,32 0,16" fill={ASPHALT_COLOR} />;

  if (tile === 'road_straight_a') {
    return (
      <g>
        {diamond}
        {/* Curbs (top-right and bottom-left edges) */}
        <line x1="32" y1="0" x2="64" y2="16" stroke={CURB_COLOR} strokeWidth={4} />
        <line x1="0" y1="16" x2="32" y2="32" stroke={CURB_COLOR} strokeWidth={4} />
        {/* Yellow center line (top-left edge center to bottom-right edge center) */}
        <line x1="16" y1="8" x2="48" y2="24" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
      </g>
    );
  }
  if (tile === 'road_straight_b') {
    return (
      <g>
        {diamond}
        {/* Curbs (top-left and bottom-right edges) */}
        <line x1="32" y1="0" x2="0" y2="16" stroke={CURB_COLOR} strokeWidth={4} />
        <line x1="64" y1="16" x2="32" y2="32" stroke={CURB_COLOR} strokeWidth={4} />
        {/* Yellow center line (top-right edge center to bottom-left edge center) */}
        <line x1="48" y1="8" x2="16" y2="24" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
      </g>
    );
  }
  if (tile === 'corner_a_to_b') {
    // A+ to B+ (Right Turn): Enters Top-Left, Exits Bottom-Left
    // Road on Left, Grass on Right
    return (
      <g>
        {diamond}
        <polyline points="32,0 64,16 32,32" fill="none" stroke={CURB_COLOR} strokeWidth={4} strokeLinejoin="round" />
        <line x1="32" y1="0" x2="32" y2="32" stroke={CURB_COLOR} strokeWidth={3} />
        <path d="M 16,8 Q 32,16 16,24" fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
      </g>
    );
  }
  if (tile === 'corner_a_to_neg_b') {
    // A+ to B- (Left Turn): Enters Top-Left, Exits Top-Right
    // Road on Top, Grass on Bottom
    return (
      <g>
        {diamond}
        <polyline points="0,16 32,32 64,16" fill="none" stroke={CURB_COLOR} strokeWidth={4} strokeLinejoin="round" />
        <line x1="0" y1="16" x2="64" y2="16" stroke={CURB_COLOR} strokeWidth={3} />
        <path d="M 16,8 Q 32,16 48,8" fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
      </g>
    );
  }
  if (tile === 'corner_neg_a_to_b') {
    // A- to B+ (Left Turn): Enters Bottom-Right, Exits Bottom-Left
    // Road on Bottom, Grass on Top
    return (
      <g>
        {diamond}
        <polyline points="0,16 32,0 64,16" fill="none" stroke={CURB_COLOR} strokeWidth={4} strokeLinejoin="round" />
        <line x1="0" y1="16" x2="64" y2="16" stroke={CURB_COLOR} strokeWidth={3} />
        <path d="M 16,24 Q 32,16 48,24" fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
      </g>
    );
  }
  if (tile === 'corner_neg_a_to_neg_b') {
    // A- to B- (Right Turn): Enters Bottom-Right, Exits Top-Right
    // Road on Right, Grass on Left
    return (
      <g>
        {diamond}
        <polyline points="32,0 0,16 32,32" fill="none" stroke={CURB_COLOR} strokeWidth={4} strokeLinejoin="round" />
        <line x1="32" y1="0" x2="32" y2="32" stroke={CURB_COLOR} strokeWidth={3} />
        <path d="M 48,24 Q 32,16 48,8" fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeDasharray="4,3" />
      </g>
    );
  }
  return null;
}

export default function RoadEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps) {
  const tiles = routeIsometric(sourceX, sourceY, targetX, targetY);
  const motionPath = tilesToMotionPath(tiles);

  return (
    <g>
      {tiles.map((t, i) => {
        const x = t.screenX - TILE_W / 2;
        const y = t.screenY - TILE_H / 2;

        return (
          <g key={i} transform={`translate(${x}, ${y})`}>
            <TileGraphic tile={t.tile} />
          </g>
        );
      })}

      {/* Truck animation — SVG image+animateMotion is valid but needs ts suppression */}
      {data?.isAnimating && motionPath && (
        // @ts-expect-error: SVG <image> with <animateMotion> child is valid SVG but not in React's typedefs
        <image href="/assets/truck.png" x={-16} y={-16} width={32} height={32}>
          <animateMotion dur="2s" repeatCount="1" path={motionPath} rotate="auto" />
        </image>
      )}
    </g>
  );
}
