/** Rochers minables — placements seed serveur (clairière + forêt + secteurs). */

import { TREE_EXCLUSIONS, SPAWN_TRAIL_PTS } from './tree-placements.mjs';

/** Clairière spawn — ellipse (alignée client proc_spawn). */
export const CAMP_FOOTPRINT = Object.freeze({
  cx: 0,
  cz: -6,
  rx: 5.8,
  rz: 5.2,
});

/** @returns {boolean} point dans l'ellipse camp (+ marge extérieure en mètres). */
export function isInCampFootprint(x, z, margin = 0) {
  const dx = (x - CAMP_FOOTPRINT.cx) / (CAMP_FOOTPRINT.rx + margin);
  const dz = (z - CAMP_FOOTPRINT.cz) / (CAMP_FOOTPRINT.rz + margin);
  return Math.hypot(dx, dz) <= 1;
}

/** Rochers fixes visibles au spawn — hors clairière / props (pas sur le camp). */
export const CAMP_ROCK_ANCHORS = Object.freeze([
  {
    anchorId: 'starter_spawn_path',
    prefabId: 'spawn_stone',
    x: 22,
    z: 6,
    rotY: 0.35,
    scale: 1.65,
    rockSeed: 890100,
  },
  {
    anchorId: 'starter_trail',
    prefabId: 'rock_boulder',
    x: -9,
    z: 2,
    rotY: 0.9,
    scale: 2.15,
    rockSeed: 890101,
  },
  {
    anchorId: 'starter_camp_main',
    prefabId: 'rock_boulder',
    x: 16,
    z: -5,
    rotY: -0.4,
    scale: 2.25,
    rockSeed: 890102,
  },
  {
    anchorId: 'starter_camp_side',
    prefabId: 'rock_outcrop',
    x: -11.5,
    z: -9,
    rotY: 0.55,
    scale: 1.95,
    rockSeed: 890103,
  },
]);

/** Zones bâties / denses où on ne pose pas de rochers procéduraux. */
export const ROCK_EXCLUSIONS = Object.freeze([
  ...TREE_EXCLUSIONS,
  { cx: 0, cz: -6, r: 20 },
  { cx: -20, cz: -185, r: 58 },
  { cx: -200, cz: -160, r: 68 },
  { cx: -155, cz: 0, r: 22 },
  { cx: -120, cz: -18, r: 14 },
]);

export const ROCK_ZONES = Object.freeze([
  {
    id: 'spawn_ring',
    cx: 0,
    cz: -6,
    count: 8,
    radius: 32,
    boulderWeight: 0.68,
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
export function computeCampRockAnchors() {
  return CAMP_ROCK_ANCHORS.map((a) => ({
    kind: 'prefab',
    prefabId: a.prefabId,
    x: a.x,
    z: a.z,
    rotY: a.rotY,
    scale: a.scale,
    rockSeed: a.rockSeed,
    anchorId: a.anchorId,
  }));
}

/** @returns {Array<{ kind: 'prefab', prefabId: string, x: number, z: number, rotY: number, scale: number, rockSeed: number, zoneId: string }>} */
export function computeRockPlacements() {
  const out = [];
  for (const zone of ROCK_ZONES) {
    out.push(..._placementsForZone(zone));
  }
  return out;
}

/** Clé stable pour dédupliquer un rocher seed serveur. */
export function rockPlacementKey(placement) {
  if (!placement) return '';
  if (placement.anchorId) return `anchor:${placement.anchorId}`;
  return `zone:${placement.zoneId}:${placement.rockSeed}`;
}
