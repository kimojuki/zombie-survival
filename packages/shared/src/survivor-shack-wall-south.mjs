/**
 * Pièce 3 — mur sud (−Z) cabane survivor_shack (2 pans + ouverture porte).
 * Mesh : spawn_clearing.js → _buildSurvivorShackWallSouth
 */

export const SURVIVOR_SHACK_WALL_SOUTH = Object.freeze({
  height: 2.55,
  thickness: 0.18,
  centerY: 1.32,
  /** Centre local sur l'axe Z (entrée cabane, côté −Z). */
  centerZ: -2.04,
  /** Largeur d'un pan (mesh 1.98 m). */
  segmentWidth: 1.98,
  /** Centre local X de chaque pan. */
  segmentCenterX: 1.61,
  colliderHalfDepth: 0.22,
});

export function survivorShackWallSouthColliderDefs() {
  const w = SURVIVOR_SHACK_WALL_SOUTH;
  const hw = w.segmentWidth / 2;
  const hd = w.colliderHalfDepth;
  const z = w.centerZ;
  return [
    { type: 'box', lx: -w.segmentCenterX, lz: z, hw, hd },
    { type: 'box', lx: w.segmentCenterX, lz: z, hw, hd },
  ];
}
