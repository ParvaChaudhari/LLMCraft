'use client';

interface IsometricCompoundProps {
  workflow: {
    id: string;
    name?: string;
    graph_json?: { nodes?: any[] };
  };
  onClick: (e: any) => void;
  selected?: boolean;
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
export default function IsometricCompound({ workflow, onClick, selected }: IsometricCompoundProps) {
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
    documentParser:  'library.png',
    artStudio:       'art_studio.png',
    customWorkshop:  'custom_workshop.png',
    bankVault:       'bank-vault.png',
    apify:           'drone_hub.png',
    jsonParser:      'sorting_facility.png',
    webScraper:      'print_shop.png',
    powerPlant:      'power_plant.png',
    watchtower:      'watchtower.png',
    output:          'output_dock.png',
    delay:           'delay_stop.png',
    webhook:         'webhook_tower.png',
    checkpoint:      'checkpoint.png',
    airport:         'airport.png',
    clocktower:      'clocktower.png',
    googleDrive:     'gdrive_vault.png',
    variable:        'storage_shed.png',
    postOffice:      'postoffice.png',
    github:          'github.png',
    sawmill:         'sawmill.png',
    textRefinery:    'text_refinery.png',
    billboard:       'billboard.png',
    objectStorage:   'object_storage.png',
    audioStudio:     'recording_studio.png',
    webhookResponse: 'reply_tower.png',
    // Generic/utility nodes intentionally excluded:
    //   conditional, limitToll
  };

  // Get up to 6 unique "important" nodes from the workflow
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
    { cx: rW * 0.58, cy: rH * 0.92 },  // row 3 right
  ];

  return (
    <div
      style={{ display: 'inline-block', userSelect: 'none', position: 'relative', padding: '8px', pointerEvents: 'none' }}
    >
      <svg
        width={svgW + 140}
        height={svgH + 80}
        viewBox={`-130 -40 ${svgW + 140} ${svgH + 80}`}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <g 
          className={`iso-compound ${selected ? 'selected' : ''}`} 
          onClick={onClick} 
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        >
        <defs>
          {/* Top face — dark synthetic green */}
          <linearGradient id={`top-grad-${workflow.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#009920" />
            <stop offset="100%" stopColor="#007718" />
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
          fill="#00330a"
          stroke="#00330a"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* ── LEFT WALL (mid-tone — partial light) ── */}
        <polygon
          points={leftWall}
          fill="#005511"
          stroke="#005511"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* ── TOP FACE ── */}
        <polygon
          points={topFace}
          fill={`url(#top-grad-${workflow.id})`}
          stroke="#009920"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Top face gloss overlay */}
        <polygon
          points={topFace}
          fill={`url(#gloss-${workflow.id})`}
          style={{ pointerEvents: 'none' }}
        />

        {/* ── TRANSPARENT BACK WALLS ── 
            Rendered before buildings so they don't overlay the buildings. */}
        <g className="corner-pillars" style={{ pointerEvents: 'none' }}>
          <polygon
            points={`${left.x},${left.y} ${top.x},${top.y} ${top.x},${top.y - 16} ${left.x},${left.y - 16}`}
            fill="rgba(35, 255, 71, 0.4)"
          />
          <polygon
            points={`${top.x},${top.y} ${right.x},${right.y} ${right.x},${right.y - 16} ${top.x},${top.y - 16}`}
            fill="rgba(35, 255, 71, 0.25)"
          />
        </g>

        {/* ── BUILDING SPRITES ──
            Each sprite stands upright — bottom-center anchored to its surface position. 
            They are sorted by their Y (isometric depth) coordinate so front buildings render on top. */}
        <g>
          {buildingAssets
            .map((asset, i) => ({ asset, pos: buildingPositions[i] }))
            .filter(item => item.pos)
            .sort((a, b) => a.pos.cy - b.pos.cy)
            .map(({ asset, pos }) => {
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

        {/* ── CORNER PILLARS & FRONT WIREFRAME ── 
            Rendered after buildings so the front walls and lime border appear on top. */}
        <g className="corner-pillars" style={{ pointerEvents: 'none' }}>

          {/* Front Walls */}
          <polygon
            points={`${right.x},${right.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y - 16} ${right.x},${right.y - 16}`}
            fill="rgba(35, 255, 71, 0.15)"
          />
          <polygon
            points={`${bottom.x},${bottom.y} ${left.x},${left.y} ${left.x},${left.y - 16} ${bottom.x},${bottom.y - 16}`}
            fill="rgba(35, 255, 71, 0.25)"
          />

          {/* Vertical poles */}
          <g stroke="#66ff00" strokeWidth="2" strokeLinecap="round">
            <line x1={top.x} y1={top.y} x2={top.x} y2={top.y - 16} />
            <line x1={right.x} y1={right.y} x2={right.x} y2={right.y - 16} />
            <line x1={bottom.x} y1={bottom.y} x2={bottom.x} y2={bottom.y - 16} />
            <line x1={left.x} y1={left.y} x2={left.x} y2={left.y - 16} />
          </g>
          {/* Connecting top wireframe */}
          <polygon
            points={`${top.x},${top.y - 16} ${right.x},${right.y - 16} ${bottom.x},${bottom.y - 16} ${left.x},${left.y - 16}`}
            fill="none"
            stroke="#66ff00"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </g>

        {/* ── BILLBOARD ──
            The left wall's face slopes at 2:1 (for every 2px right, 1px down).
            The billboard panel is a parallelogram with the same slope so it
            appears coplanar with the left wall — facing the same direction. */}
        <g>
          {(() => {
            const bW = 160;  // width of sign panel
            const bH = 28;   // height of sign panel
            const thick = 3; // 3D thickness
            
            // Center it horizontally on the left wall (left wall goes from x=0 to x=rW/2)
            const ax = (rW / 2 - bW) / 2;
            
            // Push upwards: align bottom edge slightly below the top edge of the wall
            const topEdgeY = left.y + ax * 0.5;
            const ay = topEdgeY + 18; // sticks down 8px, sticks up 20px
            
            const slope = 0.5; // same as left wall: 1px down per 2px right

            // Back face corners (flush with wall)
            const bl = { x: ax,      y: ay };
            const br = { x: ax + bW, y: ay + bW * slope };
            const tr = { x: ax + bW, y: ay + bW * slope - bH };
            const tl = { x: ax,      y: ay - bH };

            // Front face corners (extruded outward)
            const ox = -thick;
            const oy = thick * 0.5;
            const f_bl = { x: bl.x + ox, y: bl.y + oy };
            const f_br = { x: br.x + ox, y: br.y + oy };
            const f_tr = { x: tr.x + ox, y: tr.y + oy };
            const f_tl = { x: tl.x + ox, y: tl.y + oy };

            const frontPoints = `${f_tl.x},${f_tl.y} ${f_tr.x},${f_tr.y} ${f_br.x},${f_br.y} ${f_bl.x},${f_bl.y}`;
            const topPoints = `${f_tl.x},${f_tl.y} ${f_tr.x},${f_tr.y} ${tr.x},${tr.y} ${tl.x},${tl.y}`;
            const rightPoints = `${f_tr.x},${f_tr.y} ${f_br.x},${f_br.y} ${br.x},${br.y} ${tr.x},${tr.y}`;

            return (
              <>
                {/* 3D Sides */}
                <polygon points={topPoints} fill="#2a3f52" stroke="#4e7a9e" strokeWidth="1" strokeLinejoin="round" />
                <polygon points={rightPoints} fill="#121b24" stroke="#4e7a9e" strokeWidth="1" strokeLinejoin="round" />
                
                {/* Front Face */}
                <polygon points={frontPoints} fill="#1d2b38" stroke="#4e7a9e" strokeWidth="1" strokeLinejoin="round" />

                {/* Name text — positioned at the visual centre of the front face */}
                {(() => {
                  const cx = f_bl.x + bW / 2;
                  const cy = f_bl.y - bH / 2 + (bW * slope) / 2;
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
                        fontSize="16"
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
        </g>
      </svg>

      {/* Hover effect via global style */}
      <style>{`
        .iso-compound {
          transition: filter 0.22s ease;
        }
        .iso-compound:hover {
          filter: drop-shadow(0 12px 24px rgba(0,0,0,0.25));
        }
        .iso-compound .corner-pillars {
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.22s ease, transform 0.22s ease;
        }
        .iso-compound.selected .corner-pillars,
        .iso-compound:hover .corner-pillars {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
