/**
 * Pièce 4 — mur ouest (−X) cabane survivor_shack.
 * Mesh : spawn_clearing.js → _buildSurvivorShackWallWest
 */

export const SURVIVOR_SHACK_WALL_WEST = Object.freeze({
  thickness: 0.18,
  height: 2.55,
  depth: 4.15,
  centerY: 1.32,
  /** Centre local sur l'axe X (côté −X). */
  centerX: -2.54,
  colliderHalfDepth: 0.22,
});

export function survivorShackWallWestColliderDef() {
  const w = SURVIVOR_SHACK_WALL_WEST;
  return {
    type: 'box',
    lx: w.centerX,
    lz: 0,
    hw: w.colliderHalfDepth,
    hd: w.depth / 2,
  };
}
