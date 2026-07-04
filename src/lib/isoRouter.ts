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

export type TileType =
  | 'road_straight_a'
  | 'road_straight_b'
  | 'corner_a_to_b'
  | 'corner_a_to_neg_b'
  | 'corner_neg_a_to_b'
  | 'corner_neg_a_to_neg_b';

export interface TilePlacement {
  screenX: number;
  screenY: number;
  tile: TileType;
}

// One iso tile cell dimensions (must match snapGrid in CityCanvas)
const TILE_W = 64;
const TILE_H = 32;

// Axis vectors in screen space for a SINGLE adjacent tile step
const AXIS_A = { x: TILE_W / 2, y: TILE_H / 2 };   // (32, 16)  ↘
const AXIS_B = { x: -TILE_W / 2, y: TILE_H / 2 };  // (-32, 16) ↙

/**
 * Convert screen-space delta to fractional iso-axis steps.
 * 
 * a * 32 + b * -32 = dx  =>  a - b = dx / 32
 * a * 16 + b * 16  = dy  =>  a + b = dy / 16
 * 2a = dx/32 + dy/16  => a = dx/64 + dy/32
 */
function screenToIsoSteps(dx: number, dy: number): { a: number; b: number } {
  const a = dx / TILE_W + dy / TILE_H;
  const b = -dx / TILE_W + dy / TILE_H;
  return { a, b };
}

/** Advance a point by n steps along a given iso axis. */
function advanceAlongAxis(
  x: number,
  y: number,
  axis: { x: number; y: number },
  steps: number,
): { x: number; y: number } {
  return {
    x: x + axis.x * steps,
    y: y + axis.y * steps,
  };
}

/**
 * Build the full tile placement list for an edge from (sx,sy) to (tx,ty).
 */
export function routeIsometric(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): TilePlacement[] {
  const dx = tx - sx;
  const dy = ty - sy;

  // Trivial case — same point
  if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return [];

  const { a: aRaw, b: bRaw } = screenToIsoSteps(dx, dy);

  // Round to nearest integer tile count
  const aSteps = Math.round(aRaw);
  const bSteps = Math.round(bRaw);

  const tiles: TilePlacement[] = [];
  let curX = sx;
  let curY = sy;

  // ── Walk Axis A ────────────────────────────────────────────────────────────
  const aSign = Math.sign(aSteps) || 1;
  const aAxis = { x: AXIS_A.x * aSign, y: AXIS_A.y * aSign };

  for (let i = 0; i < Math.abs(aSteps); i++) {
    const tileCenter = {
      x: curX + aAxis.x / 2,
      y: curY + aAxis.y / 2,
    };
    tiles.push({
      screenX: tileCenter.x,
      screenY: tileCenter.y,
      tile: 'road_straight_a',
    });
    curX += aAxis.x;
    curY += aAxis.y;
  }

  // ── Corner tile (only if both segments exist) ──────────────────────────────
  if (aSteps !== 0 && bSteps !== 0) {
    const bSign = Math.sign(bSteps) || 1;
    let cornerTile: TileType;

    if (aSign > 0 && bSign > 0) cornerTile = 'corner_a_to_b';
    else if (aSign > 0 && bSign < 0) cornerTile = 'corner_a_to_neg_b';
    else if (aSign < 0 && bSign > 0) cornerTile = 'corner_neg_a_to_b';
    else cornerTile = 'corner_neg_a_to_neg_b';

    tiles.push({
      screenX: curX,
      screenY: curY,
      tile: cornerTile,
    });
  }

  // ── Walk Axis B ────────────────────────────────────────────────────────────
  const bSign = Math.sign(bSteps) || 1;
  const bAxis = { x: AXIS_B.x * bSign, y: AXIS_B.y * bSign };

  for (let i = 0; i < Math.abs(bSteps); i++) {
    const tileCenter = {
      x: curX + bAxis.x / 2,
      y: curY + bAxis.y / 2,
    };
    tiles.push({
      screenX: tileCenter.x,
      screenY: tileCenter.y,
      tile: 'road_straight_b',
    });
    curX += bAxis.x;
    curY += bAxis.y;
  }

  return tiles;
}

/**
 * Convert a tile placement list back into an SVG path string for animateMotion.
 * Uses the center points of each tile as waypoints.
 */
export function tilesToMotionPath(tiles: TilePlacement[]): string {
  if (tiles.length === 0) return '';
  const points = tiles.map(t => `${t.screenX},${t.screenY}`);
  return `M ${points.join(' L ')}`;
}
