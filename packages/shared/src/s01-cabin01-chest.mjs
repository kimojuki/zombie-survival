/**
 * Coffre loot cabane #1 — offset local au pivot shack (Three.js rotY).
 * Guide placement / orientation : docs/S01_DECOR_PLACEMENT.md
 */

import { decorLocalToWorld } from './collider-resolve.mjs';
import { S01_CABIN01_PROTO } from './s01-poi.mjs';
import { SURVIVOR_SHACK_DOOR } from './survivor-shack-door.mjs';

/** Demi-tailles collider `storage_chest` (decor_colliders.js). */
const CHEST_HALF_W = 0.58;
const CHEST_HALF_D = 0.36;
/** Faces intérieures murs shack (decor_colliders.js). */
const SHACK_EAST_X = 2.54;
const SHACK_NORTH_Z = 2.04;
const SHACK_WALL_HALF_D = 0.22;
/** Marge mesh intérieur ↔ murs (playtest : +4 cm vs 6 cm initial, coin NE). */
const WALL_CLEARANCE = 0.10;

/** Centre coffre — coin nord-est (fond + mur droit), face porte sud (−Z). */
export const S01_CABIN01_CHEST_LOCAL = Object.freeze({
  lx: SHACK_EAST_X - SHACK_WALL_HALF_D - CHEST_HALF_W - WALL_CLEARANCE,
  lz: SHACK_NORTH_Z - SHACK_WALL_HALF_D - CHEST_HALF_D - WALL_CLEARANCE,
  /** Hauteur dessus sol cabane (baseY shack + floorY). */
  floorY: 0.12,
});

/**
 * Yaw monde pour que le devant mesh coffre (−Z Three.js) regarde la porte.
 * @param {typeof S01_CABIN01_PROTO} shack
 * @param {typeof S01_CABIN01_CHEST_LOCAL} chestLocal
 */
export function cabin01ChestFaceDoorRotY(
  shack = S01_CABIN01_PROTO,
  chestLocal = S01_CABIN01_CHEST_LOCAL,
) {
  const anchor = { cx: shack.x, cz: shack.z, rotY: shack.rotY };
  const pos = decorLocalToWorld(chestLocal.lx, 0, chestLocal.lz, anchor);
  const door = decorLocalToWorld(0, 0, SURVIVOR_SHACK_DOOR.pivotZ, anchor);
  const dx = door.x - pos.x;
  const dz = door.z - pos.z;
  return Math.atan2(-dx, -dz);
}

export function cabin01ChestWorldXZ() {
  const s = S01_CABIN01_PROTO;
  const c = S01_CABIN01_CHEST_LOCAL;
  const w = decorLocalToWorld(c.lx, 0, c.lz, { cx: s.x, cz: s.z, rotY: s.rotY });
  return {
    x: w.x,
    z: w.z,
    rotY: cabin01ChestFaceDoorRotY(s, c),
  };
}
