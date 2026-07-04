/**
 * isoRouter.ts
 *
 * Converts a source and target point in React Flow screen space into a
 * sequence of isometric road tile placements.
 *
 * Iso grid definition (matches CityCanvas snapGrid=[64,32]):
 *   Axis A step: screen (+64, +32)  — goes "down-right" (↘)
 *   Axis B step: screen (-64, +32)  — goes "down-left"  (↙)
 *
 * Routing strategy:
 *   1. Convert screen delta → (a, b) steps in iso-axis space
 *   2. Walk a steps along Axis A, then b steps along Axis B
 *   3. At the bend, insert a corner tile
 *   4. For negative-direction steps, mark flipX/flipY on the tile
 *      so the renderer can apply an SVG transform instead of needing
 *      extra images.
 */

export interface GridPoint {
  x: number;
  y: number;
}

// One iso tile cell dimensions (must match snapGrid in CityCanvas)
const TILE_W = 64;
const TILE_H = 32;

// Axis vectors in screen space for a SINGLE adjacent tile step
const AXIS_A = { x: TILE_W / 2, y: TILE_H / 2 };   // (32, 16)  ↘
const AXIS_B = { x: -TILE_W / 2, y: TILE_H / 2 };  // (-32, 16) ↙

/**
 * Convert screen-space delta to fractional iso-axis steps.
 */
function screenToIsoSteps(dx: number, dy: number): { a: number; b: number } {
  const a = dx / TILE_W + dy / TILE_H;
  const b = -dx / TILE_W + dy / TILE_H;
  return { a, b };
}

/**
 * Generate a sequence of grid points from (sx,sy) to (tx,ty).
 */
export function routeIsometric(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): GridPoint[] {
  const dx = tx - sx;
  const dy = ty - sy;

  if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return [];

  const { a: aRaw, b: bRaw } = screenToIsoSteps(dx, dy);
  const aSteps = Math.round(aRaw);
  const bSteps = Math.round(bRaw);

  const points: GridPoint[] = [];
  let curX = sx;
  let curY = sy;

  const aSign = Math.sign(aSteps) || 1;
  const aAxis = { x: AXIS_A.x * aSign, y: AXIS_A.y * aSign };
  
  const bSign = Math.sign(bSteps) || 1;
  const bAxis = { x: AXIS_B.x * bSign, y: AXIS_B.y * bSign };

  // Walk Axis A
  for (let i = 0; i <= Math.abs(aSteps); i++) {
    points.push({ x: curX, y: curY });
    if (i < Math.abs(aSteps)) {
      curX += aAxis.x;
      curY += aAxis.y;
    }
  }

  // Walk Axis B (starting from 1 so we don't duplicate the corner point)
  for (let i = 1; i <= Math.abs(bSteps); i++) {
    curX += bAxis.x;
    curY += bAxis.y;
    points.push({ x: curX, y: curY });
  }

  return points;
}

/**
 * Convert a list of grid points into an SVG path string for animateMotion.
 */
export function tilesToMotionPath(points: GridPoint[]): string {
  if (points.length === 0) return '';
  const pStrs = points.map(p => `${p.x},${p.y}`);
  return `M ${pStrs.join(' L ')}`;
}
