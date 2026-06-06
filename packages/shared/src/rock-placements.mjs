/** Rochers minables — placements seed serveur (clairière + forêt). */

import { TREE_EXCLUSIONS, SPAWN_TRAIL_PTS } from './tree-placements.mjs';

/** Rochers fixes visibles au spawn (toujours ré-injectés si absents au boot). */
export const CAMP_ROCK_ANCHORS = Object.freeze([
  {
    anchorId: 'starter_trail',
    prefabId: 'rock_boulder',
    x: 1.8,
    z: 3.8,
    rotY: 0.25,
    scale: 1.65,
    rockSeed: 890101,
  },
  {
    anchorId: 'starter_camp_main',
    prefabId: 'rock_boulder',
    x: 0.9,
    z: -1.6,
    rotY: -0.15,
    scale: 1.55,
    rockSeed: 890102,
  },
  {
    anchorId: 'starter_camp_side',
    prefabId: 'rock_outcrop',
    x: -2.4,
    z: -3.6,
    rotY: 0.55,
    scale: 1.25,
    rockSeed: 890103,
  },
]);

export const ROCK_ZONES = Object.freeze([
  {
    id: 'spawn_ring',
    cx: 0,
    cz: -6,
    count: 6,
    radius: 28,
    boulderWeight: 0.55,
    seed: 89001,
  },
  {
    id: 'forest_scatter',
    cx: 0,
    cz: -6,
    count: 10,
    radius: 115,
    boulderWeight: 0.72,
    seed: 89002,
  },
  {
    id: 'trail_side',
    cx: 10,
    cz: -16,
    count: 3,
    radius: 18,
    boulderWeight: 0.8,
    seed: 89003,
  },
]);

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
  for (const e of TREE_EXCLUSIONS) {
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
  const maxAttempts = zone.count * 50;
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
      scale: 0.85 + rng() * 0.45,
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

/** @returns {Array<{ kind: 'prefab', prefabId: string, x: number, z: number, rotY: number, scale: number, rockSeed: number }>} */
export function computeRockPlacements() {
  const out = [];
  for (const zone of ROCK_ZONES) {
    out.push(..._placementsForZone(zone));
  }
  return out;
}
