/**
 * Sac de couchage cabane #1 — offset local au pivot shack (Three.js rotY).
 * Prefab : `spawn_bedroll` (sac déroulé) — pas un lit meublé (prefab futur).
 */

import { decorLocalToWorld } from './collider-resolve.mjs';
import { S01_CABIN01_PROTO } from './s01-poi.mjs';

/** Demi-tailles collider `spawn_bedroll` (decor_colliders.js). */
const BED_HALF_W = 0.38;
const BED_HALF_D = 0.85;
/** Face intérieure mur ouest shack (decor_colliders.js). */
const SHACK_WEST_X = -2.54;
const SHACK_WALL_HALF_W = 0.22;
const WALL_CLEARANCE = 0.10;

/** Centre lit — le long du mur ouest, axe Z parallèle au mur. */
export const S01_CABIN01_BEDROLL_LOCAL = Object.freeze({
  lx: SHACK_WEST_X + SHACK_WALL_HALF_W + BED_HALF_W + WALL_CLEARANCE,
  lz: 0.35,
  floorY: 0.12,
});

export function cabin01BedrollWorldXZ(shack = S01_CABIN01_PROTO, local = S01_CABIN01_BEDROLL_LOCAL) {
  const w = decorLocalToWorld(local.lx, 0, local.lz, {
    cx: shack.x,
    cz: shack.z,
    rotY: shack.rotY,
  });
  return {
    x: w.x,
    z: w.z,
    rotY: shack.rotY,
  };
}
