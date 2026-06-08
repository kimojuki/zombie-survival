/** Arbres prefab — placements seed serveur (mega-forêt S01 + littoral). */

import { BEACH_TRAIL_PTS, isForestTerrainAllowed } from './beach-spawn.mjs';
import { isInsideSector01 } from './sector-bounds.mjs';
import { computeS01TreeClearZones } from './s01-world-placements.mjs';

/** Plage → clairière forêt → ville. */
export const SPAWN_TRAIL_PTS = BEACH_TRAIL_PTS;

/** Exclusions (cx, cz, r) — plage, bâtiments, jonctions. */
export const TREE_EXCLUSIONS = Object.freeze([
  { cx: 270, cz: -8, r: 52 },
  { cx: -20, cz: 33, r: 24 },
  { cx: -60, cz: -70, r: 14 },
  { cx: -80, cz: 42, r: 14 },
  { cx: 82, cz: -100, r: 20 },
  { cx: 28, cz: -42, r: 10 },
]);

export const TREE_ZONES = Object.freeze([
  {
    id: 'coastal_littoral',
    cx: 95,
    cz: -10,
    count: 120,
    radius: 98,
    pineWeight: 0.52,
    birchWeight: 0.14,
    seed: 88005,
  },
  /** Lisière forêt (ouest du sable) — pas de palmiers, mais hors plage. */
  { id: 'forest_coast_west', cx: 188, cz: -10, shape: 'rect', rx: 30, rz: 52, count: 72, pineWeight: 0.56, birchWeight: 0.14, seed: 88004 },
  {
    id: 'forest_main',
    cx: -58,
    cz: -48,
    count: 200,
    radius: 188,
    pineWeight: 0.55,
    birchWeight: 0.14,
    seed: 88001,
  },
  {
    id: 'forest_north',
    cx: -28,
    cz: 58,
    count: 105,
    radius: 138,
    pineWeight: 0.5,
    birchWeight: 0.16,
    seed: 88006,
  },
  {
    id: 'forest_south',
    cx: -22,
    cz: -118,
    count: 105,
    radius: 132,
    pineWeight: 0.52,
    birchWeight: 0.14,
    seed: 88007,
  },
  {
    id: 'forest_west',
    cx: -148,
    cz: -38,
    count: 115,
    radius: 152,
    pineWeight: 0.54,
    birchWeight: 0.12,
    seed: 88008,
  },
  // Grille S01 — couvre les zones vides entre les disques (shape rect)
  { id: 'forest_grid_nw', cx: -52, cz: -82, shape: 'rect', rx: 50, rz: 40, count: 88, pineWeight: 0.54, birchWeight: 0.14, seed: 88101 },
  { id: 'forest_grid_nc', cx: 52, cz: -82, shape: 'rect', rx: 50, rz: 40, count: 88, pineWeight: 0.52, birchWeight: 0.15, seed: 88102 },
  { id: 'forest_grid_ne', cx: 152, cz: -82, shape: 'rect', rx: 46, rz: 40, count: 72, pineWeight: 0.5, birchWeight: 0.16, seed: 88103 },
  { id: 'forest_grid_w', cx: -52, cz: -12, shape: 'rect', rx: 50, rz: 40, count: 92, pineWeight: 0.55, birchWeight: 0.14, seed: 88104 },
  { id: 'forest_grid_c', cx: 52, cz: -12, shape: 'rect', rx: 50, rz: 40, count: 92, pineWeight: 0.53, birchWeight: 0.14, seed: 88105 },
  { id: 'forest_grid_e', cx: 152, cz: -12, shape: 'rect', rx: 46, rz: 40, count: 78, pineWeight: 0.51, birchWeight: 0.15, seed: 88106 },
  { id: 'forest_grid_sw', cx: -52, cz: 58, shape: 'rect', rx: 50, rz: 38, count: 80, pineWeight: 0.52, birchWeight: 0.15, seed: 88107 },
  { id: 'forest_grid_s', cx: 52, cz: 58, shape: 'rect', rx: 50, rz: 38, count: 80, pineWeight: 0.5, birchWeight: 0.16, seed: 88108 },
  { id: 'forest_grid_se', cx: 152, cz: 58, shape: 'rect', rx: 44, rz: 36, count: 68, pineWeight: 0.48, birchWeight: 0.16, seed: 88109 },
  { id: 'forest_grid_far_w', cx: -82, cz: -42, shape: 'rect', rx: 28, rz: 55, count: 55, pineWeight: 0.56, birchWeight: 0.12, seed: 88110 },
  {
    id: 'forest_dead_a',
    cx: 38,
    cz: -58,
    count: 8,
    radius: 18,
    deadOnly: true,
    seed: 88002,
  },
  {
    id: 'forest_dead_b',
    cx: -42,
    cz: 62,
    count: 8,
    radius: 16,
    deadOnly: true,
    seed: 88003,
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

function _nearTrail(x, z, margin = 1.25) {
  for (let i = 1; i < SPAWN_TRAIL_PTS.length; i++) {
    const [x0, z0] = SPAWN_TRAIL_PTS[i - 1];
    const [x1, z1] = SPAWN_TRAIL_PTS[i];
    if (_distToSegment(x, z, x0, z0, x1, z1) < margin) return true;
  }
  return false;
}

function _inExclusion(x, z, extra = []) {
  for (const e of TREE_EXCLUSIONS) {
    if (Math.hypot(x - e.cx, z - e.cz) < e.r) return true;
  }
  for (const e of computeS01TreeClearZones()) {
    if (Math.hypot(x - e.cx, z - e.cz) < e.r) return true;
  }
  for (const e of extra) {
    if (Math.hypot(x - e.cx, z - e.cz) < e.r) return true;
  }
  return false;
}

/** Forêt jouable S01 — hors plage (sable = palmiers uniquement) et hors rectangle secteur. */
function _inForestSector(x, z) {
  if (!isInsideSector01(x, z, 3)) return false;
  if (!isForestTerrainAllowed(x, z)) return false;
  return true;
}

function _pickTreePrefab(rng, zone) {
  if (zone.deadOnly) return 'tree_dead';
  const r = rng();
  if (r < zone.pineWeight) return 'tree_pine';
  if (r < zone.pineWeight + (zone.birchWeight || 0.14)) return 'tree_birch';
  return 'tree_oak';
}

function _sampleZonePoint(rng, zone) {
  if (zone.shape === 'rect') {
    const rx = zone.rx ?? zone.radius ?? 40;
    const rz = zone.rz ?? zone.radius ?? 40;
    return {
      x: zone.cx + (rng() * 2 - 1) * rx,
      z: zone.cz + (rng() * 2 - 1) * rz,
    };
  }
  const ang = rng() * Math.PI * 2;
  const dist = Math.sqrt(rng()) * zone.radius;
  return {
    x: zone.cx + Math.cos(ang) * dist,
    z: zone.cz + Math.sin(ang) * dist,
  };
}

function _placementsForZone(zone) {
  const rng = _mulberry32(zone.seed || 1);
  const out = [];
  let attempts = 0;
  const maxAttempts = zone.count * (zone.shape === 'rect' ? 70 : 55);
  while (out.length < zone.count && attempts < maxAttempts) {
    attempts++;
    const { x, z } = _sampleZonePoint(rng, zone);
    if (Math.hypot(x, z) < 4) continue;
    if (!_inForestSector(x, z)) continue;
    if (_inExclusion(x, z)) continue;
    if (_nearTrail(x, z)) continue;
    const treeSeed = Math.floor(rng() * 0xffffff);
    out.push({
      kind: 'prefab',
      prefabId: _pickTreePrefab(rng, zone),
      x,
      z,
      rotY: rng() * Math.PI * 2,
      scale: 0.88 + rng() * 0.28,
      treeSeed,
      zoneId: zone.id,
    });
  }
  return out;
}

/** Clé stable pour dédupliquer un arbre seed serveur. */
export function treePlacementKey(placement) {
  if (!placement) return '';
  return `tree:${placement.zoneId}:${placement.treeSeed}`;
}

export function computeTreePlacements() {
  const out = [];
  for (const zone of TREE_ZONES) {
    for (const t of _placementsForZone(zone)) {
      out.push({ ...t, placementKey: treePlacementKey(t) });
    }
  }
  return out;
}

export function listTreePrefabIds() {
  return ['tree_oak', 'tree_pine', 'tree_birch', 'tree_dead'];
}
