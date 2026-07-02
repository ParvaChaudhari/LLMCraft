import { BaseEdge, EdgeProps } from '@xyflow/react';

/**
 * Build a path between two points using 45° diagonal segments.
 * This makes roads follow the isometric grid lines instead of
 * going horizontal/vertical.
 *
 * Strategy:
 *   - Calculate dx and dy between source and target
 *   - Route diagonally (45°) for as far as possible
 *   - Then go straight (horizontal or vertical) for the remainder
 *   - Add a smooth curve at the bend point
 */
function getDiagonalPath(
  sx: number, sy: number,
  tx: number, ty: number,
): string {
  const dx = tx - sx;
  const dy = ty - sy;

  // If points are very close, just draw a straight line
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
    return `M ${sx},${sy} L ${tx},${ty}`;
  }

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const r = 16; // corner radius

  // Determine which dimension is shorter — we go diagonal for that distance
  if (absDx >= absDy) {
    // More horizontal than vertical: go diagonal for absDy, then horizontal for the rest
    const diagDist = absDy;
    const diagSignX = Math.sign(dx);
    const diagSignY = Math.sign(dy);

    // Midpoint after diagonal segment
    const mx = sx + diagDist * diagSignX;
    const my = sy + diagDist * diagSignY;

    if (diagDist < r * 2) {
      // Too short for a curve, just go straight
      return `M ${sx},${sy} L ${mx},${my} L ${tx},${ty}`;
    }

    // Curve control points (pull back from the bend by radius)
    const cx1 = mx - r * diagSignX;
    const cy1 = my - r * diagSignY;
    const cx2 = mx + r * diagSignX;

    return `M ${sx},${sy} L ${cx1},${cy1} Q ${mx},${my} ${cx2},${my} L ${tx},${ty}`;
  } else {
    // More vertical than horizontal: go diagonal for absDx, then vertical for the rest
    const diagDist = absDx;
    const diagSignX = Math.sign(dx);
    const diagSignY = Math.sign(dy);

    // Midpoint after diagonal segment
    const mx = sx + diagDist * diagSignX;
    const my = sy + diagDist * diagSignY;

    if (diagDist < r * 2) {
      return `M ${sx},${sy} L ${mx},${my} L ${tx},${ty}`;
    }

    const cx1 = mx - r * diagSignX;
    const cy1 = my - r * diagSignY;
    const cy2 = my + r * diagSignY;

    return `M ${sx},${sy} L ${cx1},${cy1} Q ${mx},${my} ${mx},${cy2} L ${tx},${ty}`;
  }
}

export default function RoadEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const edgePath = getDiagonalPath(sourceX, sourceY, targetX, targetY);

  return (
    <>
      {/* Sidewalk/Curb */}
      <BaseEdge path={edgePath} style={{ ...style, strokeWidth: 40, stroke: '#A4A8B3', strokeLinecap: 'round', strokeLinejoin: 'round' }} />
      {/* Asphalt */}
      <BaseEdge path={edgePath} style={{ ...style, strokeWidth: 32, stroke: '#777A85', strokeLinecap: 'round', strokeLinejoin: 'round' }} />
      {/* Dashed Center Line */}
      <BaseEdge path={edgePath} style={{ ...style, strokeWidth: 2, stroke: '#E1AE4C', strokeDasharray: '12 12' }} />
      
      {/* Moving Vehicle */}
      {data?.isAnimating && (
        <image href="/assets/truck.png" x="-16" y="-16" width="32" height="32">
          <animateMotion
            dur="2s"
            repeatCount="1"
            path={edgePath}
            rotate="auto"
          />
        </image>
      )}
    </>
  );
}
