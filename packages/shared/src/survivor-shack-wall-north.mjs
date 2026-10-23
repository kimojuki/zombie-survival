/**
 * Pièce 2 — mur nord (+Z) cabane survivor_shack.
 * Mesh : spawn_clearing.js → _buildSurvivorShackWallNorth
 */

export const SURVIVOR_SHACK_WALL_NORTH = Object.freeze({
  width: 5.25,
  height: 2.55,
  thickness: 0.18,
  centerY: 1.32,
  /** Centre local sur l'axe Z (fond cabane, côté +Z). */
  centerZ: 2.04,
  /** Demi-épaisseur collider (≥ mesh/2 + marge rotY / tunneling). */
  colliderHalfDepth: 0.22,
});

export function survivorShackWallNorthColliderDef() {
  const w = SURVIVOR_SHACK_WALL_NORTH;
  return {
    type: 'box',
    lx: 0,
    lz: w.centerZ,
    hw: w.width / 2,
    hd: w.colliderHalfDepth,
  };
}
