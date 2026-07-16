/**
 * DiamondHighlight — draws diamond-shaped tile highlights under a selected node.
 * Shows the isometric "footprint" of the building on the terrain grid.
 *
 * Props:
 *   cols: number of tile-columns the node spans (horizontally)
 *   rows: number of tile-rows the node spans (vertically)
 *   color: highlight color (default green)
 */
export default function DiamondHighlight({
  cols = 3,
  rows = 3,
  color = 'rgba(200, 255, 0, 0.25)',
  strokeColor = 'rgba(200, 255, 0, 1)',
  offsetX = 0,
  offsetY = 0,
  style = {},
}: {
  cols?: number;
  rows?: number;
  color?: string;
  strokeColor?: string;
  offsetX?: number;
  offsetY?: number;
  style?: React.CSSProperties;
}) {
  // Each diamond tile is 64px wide × 32px tall in flow-space
  const tileW = 64;
  const tileH = 32;

  // Total node size based on true isometric bounds
  const nodeW = (cols + rows) / 2 * tileW; // 192 for 3x3
  const nodeH = (cols + rows) / 2 * tileH; // 96 for 3x3

  // The origin X/Y (center point of the topmost tile in the footprint)
  const originX = (rows * tileW) / 2;
  const originY = tileH / 2;

  const diamonds: React.ReactNode[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Isometric projection math
      // +col moves down-right, +row moves down-left
      const cx = originX + (col * tileW / 2) - (row * tileW / 2);
      const cy = originY + (col * tileH / 2) + (row * tileH / 2);

      // Diamond vertices relative to center
      const points = [
        `${cx},${cy - tileH / 2}`,    // top
        `${cx + tileW / 2},${cy}`,    // right
        `${cx},${cy + tileH / 2}`,    // bottom
        `${cx - tileW / 2},${cy}`,    // left
      ].join(' ');

      diamonds.push(
        <polygon
          key={`${row}-${col}`}
          points={points}
          fill={color}
          stroke={strokeColor}
          strokeWidth={1}
        />
      );
    }
  }

  return (
    <svg
      className="absolute pointer-events-none z-0"
      style={{ 
        left: offsetX,
        top: offsetY,
        filter: 'drop-shadow(0px 0px 8px rgba(200, 255, 0, 0.8))', 
        ...style 
      }}
      width={nodeW}
      height={nodeH}
      viewBox={`0 0 ${nodeW} ${nodeH}`}
    >
      {diamonds}
    </svg>
  );
}
