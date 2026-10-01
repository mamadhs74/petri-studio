import type { NetNode } from '../model/net';

export const PLACE_RADIUS = 26;
export const TRANSITION_SIZE = { width: 14, height: 46 } as const;

/** Point where a line from the node centre towards (dx, dy) leaves the node outline. */
function boundaryOffset(node: NetNode, dx: number, dy: number): { x: number; y: number } {
  const length = Math.hypot(dx, dy) || 1;
  if (node.kind === 'place') {
    return { x: (dx / length) * PLACE_RADIUS, y: (dy / length) * PLACE_RADIUS };
  }
  const halfW = TRANSITION_SIZE.width / 2;
  const halfH = TRANSITION_SIZE.height / 2;
  const scale = Math.min(halfW / Math.abs(dx || 1e-9), halfH / Math.abs(dy || 1e-9));
  return { x: dx * scale, y: dy * scale };
}

/** Arc segment trimmed to both node outlines, leaving room for the arrowhead. */
export function arcSegment(from: NetNode, to: NetNode) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const start = boundaryOffset(from, dx, dy);
  const end = boundaryOffset(to, -dx, -dy);
  return {
    x1: from.x + start.x,
    y1: from.y + start.y,
    x2: to.x + end.x,
    y2: to.y + end.y,
  };
}
