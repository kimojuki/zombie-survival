/**
 * Lit une place cabane #1 — coin nord-ouest (murs ouest + nord).
 * Prefab : `spawn_single_bed` — remplace le sac de couchage en seed S01.
 */

import { decorLocalToWorld } from './collider-resolve.mjs';
import { S01_CABIN01_PROTO } from './s01-poi.mjs';

/** Demi-tailles collider `spawn_single_bed` (decor_colliders.js). */
export const S01_SINGLE_BED_HALF_W = 0.46;
export const S01_SINGLE_BED_HALF_L = 0.89;
/** Faces intérieures murs shack (decor_colliders.js). */
const SHACK_WEST_INNER = -2.54 + 0.22;
const SHACK_NORTH_INNER = 2.04 - 0.22;
const WALL_CLEARANCE = 0.10;

/** Pivot lit — tête contre le mur nord (+Z), long côté le long du mur ouest. */
export const S01_CABIN01_BED_LOCAL = Object.freeze({
  lx: SHACK_WEST_INNER + S01_SINGLE_BED_HALF_W + WALL_CLEARANCE,
  lz: SHACK_NORTH_INNER - S01_SINGLE_BED_HALF_L - WALL_CLEARANCE,
  floorY: 0.12,
});

export function cabin01BedWorldXZ(
  shack = S01_CABIN01_PROTO,
  local = S01_CABIN01_BED_LOCAL,
) {
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

/** Vérifie que le footprint reste dans la cabane (tests). */
export function cabin01BedFitsShack(local = S01_CABIN01_BED_LOCAL) {
  const innerWest = -2.54 + 0.22;
  const innerEast = 2.54 - 0.22;
  const innerNorth = 2.04 - 0.22;
  const innerSouth = -2.04 + 0.22;
  const { lx, lz } = local;
  return (
    lx - S01_SINGLE_BED_HALF_W >= innerWest + WALL_CLEARANCE - 0.001
    && lx + S01_SINGLE_BED_HALF_W <= innerEast - WALL_CLEARANCE + 0.001
    && lz + S01_SINGLE_BED_HALF_L <= innerNorth - WALL_CLEARANCE + 0.001
    && lz - S01_SINGLE_BED_HALF_L >= innerSouth + 0.35
  );
}
