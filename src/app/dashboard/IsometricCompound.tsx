'use client';

interface IsometricCompoundProps {
  workflow: {
    id: string;
    name?: string;
    graph_json?: { nodes?: any[] };
  };
  onClick: () => void;
}

/**
 * IsometricCompound — drawn as a pure SVG isometric box.
 *
 * Using SVG polygons eliminates all CSS transform ambiguity.
 * Three faces of a flat platform tray:
 *   - Top face:   diamond (4 corners of the top)
 *   - Left wall:  front-left parallelogram
 *   - Right wall: front-right parallelogram (darker, in shadow)
 *
 * All coordinates are computed from first principles:
 *   rW = 256, rH = 128 (2:1 isometric ratio)
 *   wallH = 32 (height of the side walls / depth of the tray)
 */
export default function IsometricCompound({ workflow, onClick }: IsometricCompoundProps) {
  const name = workflow.name || 'Unnamed City';

  // ── Core geometry ──────────────────────────────────────────
  const rW = 540;   // rhombus width  (top face)
  const rH = 270;   // rhombus height = rW / 2
  const wallH = 18; // depth of the platform tray

  const svgW = rW;
  const svgH = rH + wallH; // total SVG height

  // Top face diamond corners
  const top   = { x: rW / 2,  y: 0        };
  const right  = { x: rW,     y: rH / 2   };
  const bottom = { x: rW / 2, y: rH       };
  const left   = { x: 0,      y: rH / 2   };

  // Bottom face (wall bottom edges — shift down by wallH)
  const leftBot  = { x: 0,      y: rH / 2 + wallH };
  const botBot   = { x: rW / 2, y: rH + wallH     };
  const rightBot = { x: rW,     y: rH / 2 + wallH };

  // Polygon point strings
  const topFace   = `${top.x},${top.y} ${right.x},${right.y} ${bottom.x},${bottom.y} ${left.x},${left.y}`;
  const leftWall  = `${left.x},${left.y} ${bottom.x},${bottom.y} ${botBot.x},${botBot.y} ${leftBot.x},${leftBot.y}`;
  const rightWall = `${bottom.x},${bottom.y} ${right.x},${right.y} ${rightBot.x},${rightBot.y} ${botBot.x},${botBot.y}`;

  // ── NODE_ASSETS: only "important" unique buildings ────────
  // Edit this map to control which node types show as buildings.
  // Key   = node.type string from the workflow graph
  // Value = filename inside /public/assets/
  const NODE_ASSETS: Record<string, string> = {
    geminiFactory:   'gemini_factory.png',
    chatgptFactory:  'chatgpt_factory.png',
    claudeFactory:   'claude_factory.png',
    dbSilo:          'db_silo.png',
    httpRequest:     'http_request.png',
    library:         'library.png',
    artStudio:       'art_studio.png',
    customWorkshop:  'custom_workshop.png',
    bankVault:       'bank-vault.png',
    droneHub:        'drone_hub.png',
    sortingFacility: 'sorting_facility.png',
    printShop:       'print_shop.png',
    powerPlant:      'power_plant.png',
    // Generic/utility nodes intentionally excluded:
    //   webhook, conditional, output, delayStop, limitToll, watchtower
  };

  // Get up to 6 unique "important" node types from the workflow
  const nodes = workflow.graph_json?.nodes ?? [];
  const seenTypes = new Set<string>();
  const buildingAssets: string[] = [];
  for (const node of nodes) {
    const asset = NODE_ASSETS[node.type as string];
    if (asset && !seenTypes.has(asset)) {
      seenTypes.add(asset);
      buildingAssets.push(asset);
      if (buildingAssets.length === 6) break;
    }
  }

  // ── Building positions ──────────────────────────────────────
  // Each entry is { cx, cy } — the BOTTOM-CENTER anchor of the sprite
  // on the isometric diamond surface.
  //
  // cx: horizontal screen position (0 = left tip, rW = right tip, rW/2 = center)
  // cy: vertical screen position   (0 = top tip,  rH = bottom tip, rH/2 = middle)
  //
  // Adjust cx/cy as fractions of rW/rH to move buildings around.
  // All 6 positions form a 2-column × 3-row layout inside the diamond.
  const imgSize = 110;
  const buildingPositions = [
    { cx: rW * 0.43, cy: rH * 0.45 },  // row 1 left
    { cx: rW * 0.62, cy: rH * 0.50 },  // row 1 right
    { cx: rW * 0.22, cy: rH * 0.70 },  // row 2 left
    { cx: rW * 0.72, cy: rH * 0.65 },  // row 2 right
    { cx: rW * 0.38, cy: rH * 0.85 },  // row 3 left
    { cx: rW * 0.58, cy: rH * 0.88 },  // row 3 right
  ];

  return (
    <div
      onClick={onClick}
      style={{ display: 'inline-block', cursor: 'pointer', userSelect: 'none', position: 'relative', padding: '8px' }}
      className="iso-compound"
    >
      <svg
        width={svgW + 140}
        height={svgH + 48}
        viewBox={`-130 -8 ${svgW + 140} ${svgH + 48}`}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          {/* Top face — light grass green */}
          <linearGradient id={`top-grad-${workflow.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8cba6b" />
            <stop offset="100%" stopColor="#8cba6b" />
          </linearGradient>

          {/* Top face subtle grid pattern */}
          <pattern id={`top-grid-${workflow.id}`} x="0" y="0" width="32" height="16" patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${Math.atan2(rH / 2, rW / 2) * 180 / Math.PI})`}
          >
            <line x1="0" y1="0" x2="32" y2="0" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
          </pattern>

          {/* Gloss overlay for top face */}
          <linearGradient id={`gloss-${workflow.id}`} x1="0%" y1="0%" x2="60%" y2="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* ── RIGHT WALL (darkest — in shadow) ── */}
        <polygon
          points={rightWall}
          fill="#4e7332"
          stroke="#1d1b1a"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* ── LEFT WALL (mid-tone — partial light) ── */}
        <polygon
          points={leftWall}
          fill="#6a944a"
          stroke="#1d1b1a"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* ── TOP FACE ── */}
        <polygon
          points={topFace}
          fill={`url(#top-grad-${workflow.id})`}
          stroke="#1d1b1a"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Top face gloss overlay */}
        <polygon
          points={topFace}
          fill={`url(#gloss-${workflow.id})`}
          style={{ pointerEvents: 'none' }}
        />

        {/* ── BUILDING SPRITES ──
            Clip to the diamond so buildings don't overflow the platform edges.
            Each sprite stands upright — bottom-center anchored to its surface position. */}
        <defs>
          <clipPath id={`diamond-clip-${workflow.id}`}>
            <polygon points={topFace} />
          </clipPath>
        </defs>

        <g clipPath={`url(#diamond-clip-${workflow.id})`}>
          {buildingAssets.map((asset, i) => {
            const pos = buildingPositions[i];
            if (!pos) return null;
            const x = pos.cx - imgSize / 2;
            const y = pos.cy - imgSize;   // bottom-center anchoring
            return (
              <image
                key={asset}
                href={`/assets/${asset}`}
                x={x}
                y={y}
                width={imgSize}
                height={imgSize}
                preserveAspectRatio="xMidYMax meet"
                style={{ imageRendering: 'auto' }}
              />
            );
          })}
        </g>

        {/* ── BILLBOARD ──
            The left wall's face slopes at 2:1 (for every 2px right, 1px down).
            The billboard panel is a parallelogram with the same slope so it
            appears coplanar with the left wall — facing the same direction. */}
        <g>
          {(() => {
            // Placed directly on the left wall
            const bW = 160;  // width of sign panel
            const bH = 14;   // height of sign panel
            
            // Center it horizontally on the left wall (left wall goes from x=0 to x=rW/2)
            const ax = (rW / 2 - bW) / 2;
            
            // ay is the bottom-left corner of the sign
            // Left wall top edge at ax is: left.y + ax * 0.5
            // Left wall bottom edge at ax is: left.y + ax * 0.5 + wallH
            // Center the 14px high sign vertically in the 18px tall wall:
            // top margin = (18 - 14) / 2 = 2px
            const ay = left.y + ax * 0.5 + 2 + bH;

            const slope = 0.5; // same as left wall: 1px down per 2px right

            // Four corners of the sign face parallelogram
            const bl = { x: ax,      y: ay };
            const br = { x: ax + bW, y: ay + bW * slope };
            const tr = { x: ax + bW, y: ay + bW * slope - bH };
            const tl = { x: ax,      y: ay - bH };

            const signPoints = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;

            return (
              <>
                {/* Sign face */}
                <polygon points={signPoints} fill="#1d2b38" stroke="#4e7a9e" strokeWidth="1" />

                {/* Name text — positioned at the visual centre of the parallelogram */}
                {(() => {
                  const cx = ax + bW / 2;
                  const cy = ay - bH / 2 + (bW * slope) / 2;
                  const angle = Math.atan(slope) * (180 / Math.PI);
                  return (
                    <g transform={`translate(${cx}, ${cy}) skewY(${angle})`}>
                      <text
                        x="0"
                        y="1" // slight manual visual vertical tweak
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#a8c4d8"
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="8"
                        fontWeight="700"
                        letterSpacing="0.12em"
                      >
                        {name.toUpperCase()}
                      </text>
                    </g>
                  );
                })()}
              </>
            );
          })()}
        </g>
      </svg>

      {/* Hover effect via global style */}
      <style>{`
        .iso-compound {
          transition: transform 0.22s ease, filter 0.22s ease;
        }
        .iso-compound:hover {
          transform: translateY(-10px);
          filter: drop-shadow(0 12px 24px rgba(0,0,0,0.25));
        }
      `}</style>
    </div>
  );
}
