/** Repousse progressive arbres / rochers — emplacements valides sans chevauchement décor. */

import { TREE_ZONES, TREE_EXCLUSIONS, SPAWN_TRAIL_PTS } from './tree-placements.mjs';
import { ROCK_ZONES, ROCK_EXCLUSIONS, isInCampFootprint } from './rock-placements.mjs';
import { getTreeScale } from './tree-growth.mjs';

export const REGEN_CONFIG = Object.freeze({
  treeIntervalMs: 25_000,
  rockIntervalMs: 35_000,
  treesPerTick: 2,
  rocksPerTick: 1,
  /** Arbres debout ciblés (seed + repousse). */
  treeTargetStanding: 72,
  /** Rochers monde (hors ancres camp fixes). */
  rockTargetWorld: 65,
  spawnAttempts: 48,
  minClearance: 2.4,
  minTreeGap: 3.6,
  minRockGap: 3.4,
});

const TREE_PREFABS = ['tree_oak', 'tree_pine', 'tree_birch'];
const ROCK_PREFABS = ['rock_boulder', 'rock_outcrop'];

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

function _nearTrail(x, z, margin = 1.35) {
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

function _inRockExclusion(x, z) {
  for (const e of ROCK_EXCLUSIONS) {
    if (Math.hypot(x - e.cx, z - e.cz) < e.r) return true;
  }
  return false;
}

/** Emplacement rocher regen / monde. */
export function isRockSpawnClear(x, z, decors, { minGap = REGEN_CONFIG.minRockGap, rockScale = 1.4 } = {}) {
  if (Math.hypot(x, z) < 3.5) return false;
  if (isInCampFootprint(x, z, 2.2 + rockScale * 0.55)) return false;
  if (_inRockExclusion(x, z)) return false;
  if (_nearTrail(x, z, 1.15 + rockScale * 0.12)) return false;
  return _rockClearOfDecors(x, z, decors, minGap, rockScale);
}

/** Ancres camp fixes — hors clairière, sans chevaucher props (pas d'exclusion r=20). */
export function isRockAnchorClear(x, z, decors, { minGap = 2.8, rockScale = 1.4 } = {}) {
  if (isInCampFootprint(x, z, 2.0 + rockScale * 0.55)) return false;
  if (_nearTrail(x, z, 1.0 + rockScale * 0.1)) return false;
  return _rockClearOfDecors(x, z, decors, minGap, rockScale);
}

function _rockClearOfDecors(x, z, decors, minGap, rockScale) {
  const selfR = 0.85 + 1.05 * rockScale;
  for (const d of decors) {
    if (d.falling) continue;
    const r = decorSpawnRadius(d) + selfR + minGap;
    if (Math.hypot(x - (d.x || 0), z - (d.z || 0)) < r) return false;
  }
  return true;
}

/** Rayon d'exclusion XZ autour d'un décor existant. */
export function decorSpawnRadius(decor) {
  const pid = decor?.prefabId || decor?.type || '';
  if (pid.startsWith('tree_')) {
    const phase = decor.growthPhase ?? 4;
    return 1.2 + 1.6 * getTreeScale(phase);
  }
  if (pid.startsWith('rock_') || pid === 'spawn_stone') {
    const s = Number.isFinite(decor.scale) ? decor.scale : 1;
    return 0.85 + 1.05 * s;
  }
  if (pid === 'spawn_border_log') {
    const s = Number.isFinite(decor.scale) ? decor.scale : 1;
    return 0.35 + 0.28 * s;
  }
  if (pid === 'spawn_stump_seat') {
    const s = Number.isFinite(decor.scale) ? decor.scale : 1;
    return 0.85 + 0.55 * s;
  }
  if (pid.startsWith('building_')) return 5.5;
  if (pid === 'spawn_lean_to') return 2.6;
  if (pid.startsWith('spawn_marker')) return 1.35;
  if (pid.startsWith('spawn_')) {
    const s = Number.isFinite(decor.scale) ? decor.scale : 1;
    return 1.5 + 0.45 * s;
  }
  if (pid.startsWith('wreck_')) return 3.2;
  if (pid.startsWith('road_barrier')) return 0.6;
  return 1.3;
}

export function isSpawnPointClear(x, z, decors, { minGap = REGEN_CONFIG.minClearance } = {}) {
  if (Math.hypot(x, z) < 3.5) return false;
  if (_inExclusion(x, z)) return false;
  for (const d of decors) {
    if (d.falling) continue;
    const r = decorSpawnRadius(d) + minGap;
    if (Math.hypot(x - (d.x || 0), z - (d.z || 0)) < r) return false;
  }
  return true;
}

function _pickTreePrefab(rng) {
  const r = rng();
  if (r < 0.55) return 'tree_pine';
  if (r < 0.72) return 'tree_birch';
  return 'tree_oak';
}

function _pickRockPrefab(rng) {
  return rng() < 0.72 ? 'rock_boulder' : 'rock_outcrop';
}

/** @returns {object|null} placement arbre regen ou null */
export function findRandomTreeSpawn(decors, seed = Date.now()) {
  const rng = _mulberry32(seed >>> 0);
  const regenZones = TREE_ZONES.filter((z) => z.id === 'forest_main' || z.id.startsWith('forest_'));
  if (!regenZones.length) return null;
  for (let attempt = 0; attempt < REGEN_CONFIG.spawnAttempts; attempt++) {
    const zone = regenZones[Math.floor(rng() * regenZones.length)];
    const ang = rng() * Math.PI * 2;
    const dist = rng() * zone.radius;
    const x = zone.cx + Math.cos(ang) * dist;
    const z = zone.cz + Math.sin(ang) * dist;
    if (_nearTrail(x, z)) continue;
    if (!isSpawnPointClear(x, z, decors, { minGap: REGEN_CONFIG.minTreeGap })) continue;
    return {
      kind: 'prefab',
      prefabId: _pickTreePrefab(rng),
      x,
      z,
      rotY: rng() * Math.PI * 2,
      scale: 0.88 + rng() * 0.28,
      treeSeed: Math.floor(rng() * 0xffffff),
      zoneId: 'regen_tree',
      regen: true,
    };
  }
  return null;
}

/** @returns {object|null} placement rocher regen (taille adulte) ou null */
export function findRandomRockSpawn(decors, seed = Date.now()) {
  const rng = _mulberry32((seed + 7919) >>> 0);
  const zones = ROCK_ZONES;
  if (!zones.length) return null;
  for (let attempt = 0; attempt < REGEN_CONFIG.spawnAttempts; attempt++) {
    const zone = zones[Math.floor(rng() * zones.length)];
    const ang = rng() * Math.PI * 2;
    const dist = rng() * zone.radius;
    const x = zone.cx + Math.cos(ang) * dist;
    const z = zone.cz + Math.sin(ang) * dist;
    const scale = 1.4 + rng() * 0.85;
    if (!isRockSpawnClear(x, z, decors, { minGap: REGEN_CONFIG.minRockGap, rockScale: scale })) continue;
    return {
      kind: 'prefab',
      prefabId: _pickRockPrefab(rng),
      x,
      z,
      rotY: rng() * Math.PI * 2,
      scale,
      rockSeed: Math.floor(rng() * 0xffffff),
      zoneId: 'regen_rock',
      regen: true,
    };
  }
  return null;
}

/**
 * Seed monde : cherche des emplacements libres zone par zone (déterministe).
 * @returns {Array<object>} placements à ajouter (max `target`)
 */
export function seedWorldRockPlacements(decors, {
  target = REGEN_CONFIG.rockTargetWorld,
  minGap = REGEN_CONFIG.minRockGap,
  seed = 890001,
} = {}) {
  if (target <= 0) return [];
  const occupied = [...decors];
  const rng = _mulberry32(seed >>> 0);
  const zones = ROCK_ZONES;
  const out = [];
  let attempts = 0;
  const maxAttempts = Math.max(target * 140, 800);
  while (out.length < target && attempts < maxAttempts) {
    attempts++;
    const zone = zones[Math.floor(rng() * zones.length)];
    const slotRng = _mulberry32((zone.seed || 1) + attempts * 997 + out.length * 31);
    const ang = slotRng() * Math.PI * 2;
    const dist = slotRng() * zone.radius;
    const x = zone.cx + Math.cos(ang) * dist;
    const z = zone.cz + Math.sin(ang) * dist;
    const scale = 1.4 + slotRng() * 0.85;
    if (!isRockSpawnClear(x, z, occupied, { minGap, rockScale: scale })) continue;
    const placement = {
      kind: 'prefab',
      prefabId: _pickRockPrefab(slotRng),
      x,
      z,
      rotY: slotRng() * Math.PI * 2,
      scale,
      rockSeed: Math.floor(slotRng() * 0xffffff),
      zoneId: zone.id,
    };
    out.push(placement);
    occupied.push(placement);
  }
  return out;
}

export function countStandingTrees(decors) {
  return decors.filter((d) => d.prefabId?.startsWith('tree_') && !d.falling).length;
}

/** Rochers monde regen (pas les ancres camp fixes). */
export function countWorldRocks(decors) {
  return decors.filter((d) => {
    if (!d.prefabId?.startsWith('rock_') && d.prefabId !== 'spawn_stone') return false;
    if (d.anchorId) return false;
    return true;
  }).length;
}
