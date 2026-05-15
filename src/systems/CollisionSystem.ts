import type { Rect } from '../types';

/** AABB overlap test. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Horizontal centre-to-centre distance between two rects. */
export function centerDistX(a: Rect, b: Rect): number {
  return Math.abs(a.x + a.width / 2 - (b.x + b.width / 2));
}
