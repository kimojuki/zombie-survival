/**
 * Props narratifs plage (spawn rivage) — seed serveur.
 * Posés sur la couche sable via groundLift client (getDecorGroundHeight + getBeachSurfaceHeight).
 *
 * Ajouter un objet : entrée dans BEACH_SPAWN_PROPS + test plage sable.
 */

import {
  BEACH_SPAWN,
  BEACH_TRAIL_PTS,
  isOnBeachSafeSand,
} from './beach-spawn.mjs';

export const BEACH_PROP_ZONE_ID = 'beach_spawn_props';

export const BEACH_WRECK_PLACEMENT_KEY = 'beach:wreck_debris';
export const BEACH_WASHED_GEAR_PLACEMENT_KEY = 'beach:washed_gear';
export const BEACH_DRIFTWOOD_PLACEMENT_KEY = 'beach:driftwood';

/** @typedef {{
 *   prefabId: string,
 *   x: number,
 *   z: number,
 *   rotY: number,
 *   scale?: number,
 *   groundLift?: number,
 *   placementKey: string,
 *   zoneId?: string,
 *   immutable?: boolean,
 * }} BeachPropPlacement */

/** groundLift négatif = semi-enfoui dans le sable (relatif au dessus du mesh sable). */
export const BEACH_SPAWN_PROPS = Object.freeze([
  {
    prefabId: 'spawn_beach_wreck_debris',
    x: 252.8,
    z: -11.2,
    rotY: -Math.PI / 2,
    scale: 1,
    groundLift: -0.048,
    placementKey: BEACH_WRECK_PLACEMENT_KEY,
    zoneId: BEACH_PROP_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_beach_washed_gear',
    x: 244.6,
    z: -10.8,
    rotY: -Math.PI * 0.52,
    scale: 1,
    groundLift: -0.018,
    placementKey: BEACH_WASHED_GEAR_PLACEMENT_KEY,
    zoneId: BEACH_PROP_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_beach_driftwood',
    x: 240.2,
    z: -7.2,
    rotY: 0.12,
    scale: 1,
    groundLift: -0.032,
    placementKey: BEACH_DRIFTWOOD_PLACEMENT_KEY,
    zoneId: BEACH_PROP_ZONE_ID,
    immutable: true,
  },
]);

/**
 * Props scène spawn plage (naufrage, affaires, futurs objets rivage).
 * @returns {BeachPropPlacement[]}
 */
export function computeBeachPropPlacements() {
  return BEACH_SPAWN_PROPS.map((p) => ({ ...p }));
}

export function beachPropPrefabIds() {
  const ids = new Set();
  for (const p of BEACH_SPAWN_PROPS) ids.add(p.prefabId);
  return [...ids];
}

/** Distance min au point de réveil (évite de recouvrir le spawn joueur). */
export function beachPropMinDistFromSpawn(x, z) {
  return Math.hypot(x - BEACH_SPAWN.x, z - BEACH_SPAWN.z);
}

/**
 * @param {BeachPropPlacement} p
 * @returns {boolean}
 */
export function isBeachPropPlacementValid(p) {
  if (!p?.prefabId || !Number.isFinite(p.x) || !Number.isFinite(p.z)) return false;
  if (!isOnBeachSafeSand(p.x, p.z)) return false;
  if (beachPropMinDistFromSpawn(p.x, p.z) < 3.5) return false;
  return true;
}

/** Bouche sentier pour référence placement (admin / docs). */
export function beachTrailMouthXZ() {
  const [x, z] = BEACH_TRAIL_PTS[0];
  return { x, z };
}
