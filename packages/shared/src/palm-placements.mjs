/** Palmiers plage — placements seed serveur (zone sable uniquement). */

import {
  BEACH_SPAWN,
  BEACH_TRAIL_PTS,
  beachCoastWeight,
  isInBeachFootprint,
} from './beach-spawn.mjs';

export const PALM_ZONES = Object.freeze([
  {
    id: 'beach_palms',
    cx: 268,
    cz: -8,
    count: 20,
    radiusX: 22,
    radiusZ: 75,
    minCoastWeight: 0.35,
    seed: 88120,
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

function _nearTrail(x, z, margin = 2.5) {
  for (let i = 1; i < BEACH_TRAIL_PTS.length; i++) {
    const [x0, z0] = BEACH_TRAIL_PTS[i - 1];
    const [x1, z1] = BEACH_TRAIL_PTS[i];
    if (_distToSegment(x, z, x0, z0, x1, z1) < margin) return true;
  }
  return false;
}

function _nearSpawn(x, z, margin = 8) {
  return Math.hypot(x - BEACH_SPAWN.x, z - BEACH_SPAWN.z) < margin;
}

function _clearOfPalms(x, z, placed, minGap = 2.2) {
  for (const p of placed) {
    if (Math.hypot(x - p.x, z - p.z) < minGap) return false;
  }
  return true;
}

function _placementsForZone(zone) {
  const rng = _mulberry32(zone.seed || 1);
  const out = [];
  let attempts = 0;
  const maxAttempts = zone.count * 80;
  while (out.length < zone.count && attempts < maxAttempts) {
    attempts++;
    const ang = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng());
    const x = zone.cx + Math.cos(ang) * dist * zone.radiusX;
    const z = zone.cz + Math.sin(ang) * dist * zone.radiusZ;
    if (beachCoastWeight(x, z) < (zone.minCoastWeight ?? 0.35)) continue;
    if (!isInBeachFootprint(x, z, 0)) continue;
    if (_nearTrail(x, z)) continue;
    if (_nearSpawn(x, z)) continue;
    if (!_clearOfPalms(x, z, out)) continue;
    const treeSeed = Math.floor(rng() * 0xffffff);
    out.push({
      kind: 'prefab',
      prefabId: 'tree_palm',
      x,
      z,
      rotY: rng() * Math.PI * 2,
      scale: 0.92 + rng() * 0.22,
      treeSeed,
      zoneId: zone.id,
    });
  }
  return out;
}

/** Clé stable pour dédupliquer un palmier seed serveur. */
export function palmPlacementKey(placement) {
  if (!placement) return '';
  return `palm:${placement.zoneId}:${placement.treeSeed}`;
}

export function computePalmPlacements() {
  const out = [];
  for (const zone of PALM_ZONES) {
    for (const p of _placementsForZone(zone)) {
      out.push({ ...p, placementKey: palmPlacementKey(p) });
    }
  }
  return out;
}

export function listPalmPrefabIds() {
  return ['tree_palm'];
}
