/**
 * Décor plage immersion — 4 scènes (réveil, piste, veilleuse, ponton).
 * Seed : boot serveur + `decorseed beach [reset]`.
 */

import {
  BEACH_SPAWN,
  BEACH_TRAIL_PTS,
  INTRO_SPAWN_CLUSTER,
  isOnBeachSafeSand,
} from './beach-spawn.mjs';

export const BEACH_IMMERSION_ZONE_ID = 'beach_immersion_v1';

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
 * }} BeachImmersionPlacement */

export const BEACH_IMMERSION_BOAT_KEY = 'beach:imm:boat_hull';

export const BEACH_IMMERSION_PROPS = Object.freeze([
  {
    prefabId: 'spawn_beach_boat_hull',
    x: 292.0,
    z: -7.1,
    rotY: -1.35,
    scale: 1.35,
    groundLift: -0.035,
    placementKey: BEACH_IMMERSION_BOAT_KEY,
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  // — Scène A : réveil / littoral (est) —
  {
    prefabId: 'spawn_beach_driftwood',
    x: 287.2,
    z: -10.4,
    rotY: 1.15,
    scale: 1.05,
    groundLift: -0.028,
    placementKey: 'beach:imm:drift_wake_e',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_loisir_life_ring',
    x: 289.0,
    z: -6.4,
    rotY: 0.75,
    scale: 1,
    groundLift: 0,
    placementKey: 'beach:imm:life_ring',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_loisir_fishing_rod',
    x: 287.6,
    z: -9.9,
    rotY: -0.48,
    scale: 1,
    groundLift: -0.006,
    placementKey: 'beach:imm:fishing_post',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_loisir_cooler',
    x: 287.0,
    z: -12.2,
    rotY: 2.05,
    scale: 0.95,
    groundLift: -0.012,
    placementKey: 'beach:imm:cooler_tipped',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_beach_driftwood',
    x: 276.8,
    z: -9.4,
    rotY: -0.35,
    scale: 0.92,
    groundLift: -0.024,
    placementKey: 'beach:imm:drift_near_wreck',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },

  // — Scène B : piste intro (ouest → sentier) —
  {
    prefabId: 'spawn_beach_driftwood',
    x: 266.4,
    z: -11.6,
    rotY: -1.82,
    scale: 1,
    groundLift: -0.022,
    placementKey: 'beach:imm:drift_trail_n',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_beach_driftwood',
    x: 263.6,
    z: -4.3,
    rotY: 0.28,
    scale: 0.88,
    groundLift: -0.018,
    placementKey: 'beach:imm:drift_trail_s',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_loisir_snorkel_set',
    x: 261.6,
    z: -9.6,
    rotY: 1.02,
    scale: 1,
    groundLift: -0.004,
    placementKey: 'beach:imm:snorkel',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_loisir_picnic_basket',
    x: 257.6,
    z: -11.3,
    rotY: -0.38,
    scale: 1,
    groundLift: -0.008,
    placementKey: 'beach:imm:picnic',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },

  // — Scène C : veilleuse (feu intro) —
  {
    prefabId: 'spawn_loisir_camp_lantern',
    x: 253.9,
    z: -8.6,
    rotY: 0.52,
    scale: 1,
    groundLift: 0,
    placementKey: 'beach:imm:lantern',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_loisir_folding_chair',
    x: 254.2,
    z: -5.4,
    rotY: 1.75,
    scale: 0.92,
    groundLift: -0.01,
    placementKey: 'beach:imm:chair',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_loisir_sleeping_pad',
    x: 252.3,
    z: -6.1,
    rotY: -0.18,
    scale: 1,
    groundLift: -0.006,
    placementKey: 'beach:imm:sleep_pad',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_loisir_portable_bbq',
    x: 253.1,
    z: -7.1,
    rotY: 2.35,
    scale: 0.9,
    groundLift: 0,
    placementKey: 'beach:imm:bbq',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },

  // — Scène D : ponton / bouche sentier —
  {
    prefabId: 'spawn_loisir_paddle_board',
    x: 242.6,
    z: -5.1,
    rotY: 0.62,
    scale: 0.85,
    groundLift: -0.014,
    placementKey: 'beach:imm:paddle',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_loisir_canoe',
    x: 241.2,
    z: -9.9,
    rotY: 1.08,
    scale: 0.78,
    groundLift: -0.018,
    placementKey: 'beach:imm:canoe',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'road_barrier_post',
    x: 245.6,
    z: -11.3,
    rotY: 0.05,
    scale: 1,
    groundLift: 0,
    placementKey: 'beach:imm:barrier_a',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'road_barrier_post',
    x: 245.3,
    z: -12.6,
    rotY: 1.52,
    scale: 1,
    groundLift: 0,
    placementKey: 'beach:imm:barrier_b',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_beach_driftwood',
    x: 249.2,
    z: -11.4,
    rotY: -0.72,
    scale: 1.1,
    groundLift: -0.026,
    placementKey: 'beach:imm:drift_pier',
    zoneId: BEACH_IMMERSION_ZONE_ID,
    immutable: true,
  },
]);

function _distToTrail(px, pz, margin = 2.2) {
  for (let i = 1; i < BEACH_TRAIL_PTS.length; i++) {
    const [x0, z0] = BEACH_TRAIL_PTS[i - 1];
    const [x1, z1] = BEACH_TRAIL_PTS[i];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-8) continue;
    let t = ((px - x0) * dx + (pz - z0) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(px - (x0 + dx * t), pz - (z0 + dz * t));
    if (d < margin) return true;
  }
  return false;
}

export function computeBeachImmersionPlacements() {
  return BEACH_IMMERSION_PROPS.map((p) => ({ ...p }));
}

export function beachImmersionPrefabIds() {
  const ids = new Set();
  for (const p of BEACH_IMMERSION_PROPS) ids.add(p.prefabId);
  return [...ids];
}

/**
 * @param {BeachImmersionPlacement} p
 * @returns {boolean}
 */
export function isBeachImmersionPlacementValid(p) {
  if (!p?.prefabId || !Number.isFinite(p.x) || !Number.isFinite(p.z)) return false;
  if (!isOnBeachSafeSand(p.x, p.z)) return false;
  if (Math.hypot(p.x - BEACH_SPAWN.x, p.z - BEACH_SPAWN.z) < 3.5) return false;
  const { cx, cz } = INTRO_SPAWN_CLUSTER;
  if (Math.hypot(p.x - cx, p.z - cz) < 4.5) return false;
  const trailPad = p.prefabId === 'spawn_loisir_canoe' || p.prefabId === 'road_barrier_post' ? 1.0 : 2.0;
  if (_distToTrail(p.x, p.z, trailPad)) return false;
  return true;
}
