/**
 * Pièce réutilisable — battant porte cabane survivor_shack.
 * Miroir mesh : apps/client/public/js/spawn_clearing.js → _buildSurvivorShack
 * Colliders : apps/client/public/js/decor_colliders.js → building_survivor_shack
 */

export const SURVIVOR_SHACK_DOOR = Object.freeze({
  width: 1.24,
  height: 2.02,
  depth: 0.14,
  /** Pivot porte (local décor). */
  pivotX: -0.60,
  pivotY: 0.08,
  pivotZ: -2.10,
  /** Centre du battant fermé (local décor) = pivotX + (DOOR_HX - 0.02). */
  leafCenterX: 0,
  /** Épaisseur demi-collider (≥ depth/2 + marge joueur / rotY). */
  colliderHalfDepth: 0.28,
});

/** Définition collider locale — instanciée par buildDecorColliders(x, z, rotY, baseY, …). */
export function survivorShackDoorLeafColliderDef() {
  const d = SURVIVOR_SHACK_DOOR;
  return {
    type: 'box',
    lx: d.leafCenterX,
    lz: d.pivotZ,
    hw: d.width / 2,
    hd: d.colliderHalfDepth,
    doorPivotLx: d.pivotX,
    doorPivotLz: d.pivotZ,
    door: true,
  };
}
