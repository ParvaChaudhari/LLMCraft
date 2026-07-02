'use client';

import { useViewport } from '@xyflow/react';

/**
 * IsometricBackground — draws a diamond tile grid that tracks with
 * ReactFlow's pan/zoom. Replaces the built-in <Background />.
 *
 * Each diamond is 128px wide × 64px tall (classic 2:1 isometric ratio).
 * The pattern uses two alternating fill colors for terrain depth.
 */
export default function IsometricBackground() {
  const { x, y, zoom } = useViewport();

  // Diamond tile dimensions (in flow-space pixels)
  // Smaller tiles mean each building covers multiple tiles (like a 3×6 footprint)
  const tileW = 64;
  const tileH = 32;

  // Scale everything by zoom
  const sw = tileW * zoom;
  const sh = tileH * zoom;

  // The SVG pattern tile is one full diamond.
  // We offset the pattern based on viewport translation so it scrolls correctly.
  const patternX = (x % sw);
  const patternY = (y % sh);

  // Unique pattern id
  const patternId = 'iso-diamond-grid';

  return (
    <svg
      className="react-flow__background"
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <defs>
        {/*
          The pattern tile is a rectangle that contains one full diamond.
          We use two half-diamonds (top-left and bottom-right fills) to create
          the alternating tile color effect.

          Pattern coordinate system:
            (0,0)──────(sw,0)
              │          │
              │  ◇ tile  │
              │          │
            (0,sh)─────(sw,sh)

          Diamond vertices:
            top:    (sw/2, 0)
            right:  (sw, sh/2)
            bottom: (sw/2, sh)
            left:   (0, sh/2)
        */}
        <pattern
          id={patternId}
          x={patternX}
          y={patternY}
          width={sw}
          height={sh}
          patternUnits="userSpaceOnUse"
        >
          {/* Fill A — the main diamond */}
          <polygon
            points={`${sw / 2},0 ${sw},${sh / 2} ${sw / 2},${sh} 0,${sh / 2}`}
            fill="#8cbe5a"
            stroke="#7ca84e"
            strokeWidth={Math.max(1, zoom)}
          />

          {/* Fill B — the four corner triangles (they form the adjacent diamonds) */}
          {/* Top-left triangle */}
          <polygon
            points={`0,0 ${sw / 2},0 0,${sh / 2}`}
            fill="#98c962"
          />
          {/* Top-right triangle */}
          <polygon
            points={`${sw / 2},0 ${sw},0 ${sw},${sh / 2}`}
            fill="#98c962"
          />
          {/* Bottom-left triangle */}
          <polygon
            points={`0,${sh / 2} 0,${sh} ${sw / 2},${sh}`}
            fill="#98c962"
          />
          {/* Bottom-right triangle */}
          <polygon
            points={`${sw},${sh / 2} ${sw},${sh} ${sw / 2},${sh}`}
            fill="#98c962"
          />
        </pattern>
      </defs>

      {/* Fill the entire viewport with the diamond pattern */}
      <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
