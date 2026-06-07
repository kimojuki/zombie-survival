/** Rochers minables — placements seed serveur (plage + forêt + secteurs). */

import { TREE_EXCLUSIONS, SPAWN_TRAIL_PTS } from './tree-placements.mjs';
import { BEACH_FOOTPRINT, isInBeachFootprint } from './beach-spawn.mjs';

/** Plage spawn — ellipse (alignée proc_spawn). */
export const CAMP_FOOTPRINT = BEACH_FOOTPRINT;

/** @returns {boolean} point dans l'ellipse plage (+ marge extérieure en mètres). */
export const isInCampFootprint = isInBeachFootprint;

/** Ancres camp retirées — spawn plage sans rochers fixes. */
export const CAMP_ROCK_ANCHORS = Object.freeze([]);

export function computeCampRockAnchors() {
  return [];
}

/** Zones bâties / denses où on ne pose pas de rochers procéduraux. */
export const ROCK_EXCLUSIONS = Object.freeze([
  ...TREE_EXCLUSIONS,
  { cx: 270, cz: -8, r: 42 },
  { cx: -20, cz: -185, r: 58 },
  { cx: -200, cz: -160, r: 68 },
  { cx: -155, cz: 0, r: 22 },
  { cx: -120, cz: -18, r: 14 },
]);

export const ROCK_ZONES = Object.freeze([
  {
    id: 'beach_ring',
    cx: 270,
    cz: -8,
    count: 4,
    radius: 44,
    boulderWeight: 0.5,
    seed: 89001,
  },
  {
    id: 'forest_scatter',
    cx: 0,
    cz: -6,
    count: 18,
    radius: 140,
    boulderWeight: 0.72,
    seed: 89002,
  },
  {
    id: 'forest_west',
    cx: -58,
    cz: 28,
    count: 12,
    radius: 88,
    boulderWeight: 0.7,
    seed: 89008,
  },
  {
    id: 'forest_north',
    cx: -28,
    cz: 58,
    count: 10,
    radius: 72,
    boulderWeight: 0.66,
    seed: 89009,
  },
  {
    id: 'forest_south',
    cx: 18,
    cz: -88,
    count: 10,
    radius: 78,
    boulderWeight: 0.74,
    seed: 89010,
  },
  {
    id: 'forest_east',
    cx: 55,
    cz: -75,
    count: 10,
    radius: 62,
    boulderWeight: 0.68,
    seed: 89004,
  },
  {
    id: 'trail_side',
    cx: 10,
    cz: -16,
    count: 6,
    radius: 28,
    boulderWeight: 0.8,
    seed: 89003,
  },
  {
    id: 'town_scatter',
    cx: -115,
    cz: -6,
    count: 12,
    radius: 82,
    boulderWeight: 0.65,
    seed: 89005,
  },
  {
    id: 'city_scatter',
    cx: -20,
    cz: -185,
    count: 12,
    radius: 92,
    boulderWeight: 0.58,
    seed: 89006,
  },
  {
    id: 'military_scatter',
    cx: -200,
    cz: -160,
    count: 10,
    radius: 96,
    boulderWeight: 0.74,
    seed: 89007,
  },
  {
    id: 'east_wilds',
    cx: 72,
    cz: -95,
    count: 10,
    radius: 68,
    boulderWeight: 0.7,
    seed: 89011,
  },
]);

/** zoneId des rochers seed statique (hors regen). */
export const ROCK_SEED_ZONE_IDS = Object.freeze(ROCK_ZONES.map((z) => z.id));

function _mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _distToSegment(px, pz, x0, z0, x1, z1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-8) return Math.hypot(px - x0, pz - z0);
  let t = ((px - x0) * dx + (pz - z0) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x0 + dx * t), pz - (z0 + dz * t));
}

function _nearTrail(x, z, margin = 1.4) {
  for (let i = 1; i < SPAWN_TRAIL_PTS.length; i++) {
    const [x0, z0] = SPAWN_TRAIL_PTS[i - 1];
    const [x1, z1] = SPAWN_TRAIL_PTS[i];
    if (_distToSegment(x, z, x0, z0, x1, z1) < margin) return true;
  }
  return false;
}

function _inExclusion(x, z) {
  for (const e of ROCK_EXCLUSIONS) {
    if (Math.hypot(x - e.cx, z - e.cz) < e.r) return true;
  }
  return false;
}

function _pickRockPrefab(rng, zone) {
  return rng() < (zone.boulderWeight ?? 0.7) ? 'rock_boulder' : 'rock_outcrop';
}

function _placementsForZone(zone) {
  const rng = _mulberry32(zone.seed || 1);
  const out = [];
  let attempts = 0;
  const maxAttempts = zone.count * 60;
  while (out.length < zone.count && attempts < maxAttempts) {
    attempts++;
    const ang = rng() * Math.PI * 2;
    const dist = rng() * zone.radius;
    const x = zone.cx + Math.cos(ang) * dist;
    const z = zone.cz + Math.sin(ang) * dist;
    if (Math.hypot(x, z) < 3.5) continue;
    if (_inExclusion(x, z)) continue;
    if (_nearTrail(x, z)) continue;
    const rockSeed = Math.floor(rng() * 0xffffff);
    out.push({
      kind: 'prefab',
      prefabId: _pickRockPrefab(rng, zone),
      x,
      z,
      rotY: rng() * Math.PI * 2,
      scale: 1.35 + rng() * 0.75,
      rockSeed,
      zoneId: zone.id,
    });
  }
  return out;
}

/** @returns {Array<{ kind: 'prefab', prefabId: string, x: number, z: number, rotY: number, scale: number, rockSeed: number, anchorId?: string, zoneId?: string }>} */
export function computeRockPlacements() {
  const out = [];
  for (const zone of ROCK_ZONES) {
    for (const r of _placementsForZone(zone)) {
      out.push({ ...r, placementKey: rockPlacementKey(r) });
    }
  }
  return out;
}

/** Clé stable pour dédupliquer un rocher seed serveur. */
export function rockPlacementKey(placement) {
  if (!placement) return '';
  if (placement.anchorId) return `anchor:${placement.anchorId}`;
  return `zone:${placement.zoneId}:${placement.rockSeed}`;
}
