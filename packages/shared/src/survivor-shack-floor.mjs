/**
 * Pièce 1 — sol cabane survivor_shack.
 * Mesh : spawn_clearing.js → _buildSurvivorShackFloor
 */

export const SURVIVOR_SHACK_FLOOR = Object.freeze({
  width: 5.25,
  depth: 4.25,
  thickness: 0.12,
  centerY: 0.06,
  topY: 0.12,
});

export function survivorShackFloorColliderDef() {
  const f = SURVIVOR_SHACK_FLOOR;
  return {
    type: 'box',
    lx: 0,
    lz: 0,
    hw: f.width / 2,
    hd: f.depth / 2,
    minY: 0,
    maxY: f.topY,
  };
}
