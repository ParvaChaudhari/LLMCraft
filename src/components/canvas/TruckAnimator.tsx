import React, { useEffect, useRef, useMemo } from 'react';

interface Point {
  x: number;
  y: number;
}

interface TruckAnimatorProps {
  points: Point[];
  duration?: number;
}

export default function TruckAnimator({ points, duration = 2000 }: TruckAnimatorProps) {
  const imageRef = useRef<SVGImageElement>(null);

  // Pre-calculate segments and total length
  const { segments, totalLength } = useMemo(() => {
    let length = 0;
    const segs = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      segs.push({ p1, p2, dx, dy, dist, accumulatedLength: length });
      length += dist;
    }
    return { segments: segs, totalLength: length };
  }, [points]);

  useEffect(() => {
    if (!imageRef.current || segments.length === 0 || totalLength === 0) return;

    let animationFrameId: number;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentDist = progress * totalLength;

      // Find the current segment
      let currentSegment = segments[0];
      for (let i = 0; i < segments.length; i++) {
        if (currentDist >= segments[i].accumulatedLength && currentDist <= segments[i].accumulatedLength + segments[i].dist) {
          currentSegment = segments[i];
          break;
        }
      }

      // If we are at the very end, it might exceed the last segment's bound slightly due to floating point
      if (progress >= 1) {
        currentSegment = segments[segments.length - 1];
      }

      // Calculate position within the segment
      const segmentProgress = currentSegment.dist > 0 
        ? (currentDist - currentSegment.accumulatedLength) / currentSegment.dist 
        : 1;

      const x = currentSegment.p1.x + currentSegment.dx * segmentProgress;
      const y = currentSegment.p1.y + currentSegment.dy * segmentProgress;

      // Determine Y direction (South vs North)
      const isMovingSouth = currentSegment.dy > 0;
      const spriteHref = isMovingSouth ? '/assets/truck_se.png' : '/assets/truck_ne.png';

      // Determine flip based on X direction and the asset's natural orientation
      // truck_se.png naturally faces LEFT (South-West).
      // truck_ne.png naturally faces RIGHT (North-East).
      let scaleX = 1;
      if (isMovingSouth) {
        // Using truck_se (faces left). If moving right (dx > 0), flip it.
        scaleX = currentSegment.dx > 0 ? -1 : 1;
      } else {
        // Using truck_ne (faces right). If moving left (dx < 0), flip it.
        scaleX = currentSegment.dx < 0 ? -1 : 1;
      }

      // Apply transform and update sprite
      if (imageRef.current) {
        imageRef.current.setAttribute('href', spriteHref);
        imageRef.current.setAttribute('transform', `translate(${x}, ${y}) scale(${scaleX}, 1)`);
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [segments, totalLength, duration]);

  // Initial render at the start position
  return (
    <image
      ref={imageRef}
      href="/assets/truck_se.png"
      x={-16}
      y={-16}
      width={32}
      height={32}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
