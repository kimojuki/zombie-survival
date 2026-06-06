/** Arbres prefab — placements seed serveur (forêt + clusters morts). */

export const SPAWN_TRAIL_PTS = Object.freeze([
  [0, -11.2],
  [14, -18],
]);

/** Exclusions (cx, cz, r) — clairière, bâtiments, jonctions. */
export const TREE_EXCLUSIONS = Object.freeze([
  { cx: 0, cz: -6, r: 22 },
  { cx: -20, cz: 33, r: 24 },
  { cx: -60, cz: -70, r: 14 },
  { cx: -80, cz: 42, r: 14 },
  { cx: 82, cz: -100, r: 20 },
  { cx: 28, cz: -42, r: 10 },
  { cx: 14, cz: -18, r: 8 },
]);

export const TREE_ZONES = Object.freeze([
  {
    id: 'forest_main',
    cx: 0,
    cz: -6,
    count: 55,
    radius: 130,
    pineWeight: 0.55,
    birchWeight: 0.14,
    seed: 88001,
  },
  {
    id: 'forest_dead_a',
    cx: 32,
    cz: -55,
    count: 4,
    radius: 12,
    deadOnly: true,
    seed: 88002,
  },
  {
    id: 'forest_dead_b',
    cx: -40,
    cz: 60,
    count: 4,
    radius: 12,
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
  for (const e of extra) {
    if (Math.hypot(x - e.cx, z - e.cz) < e.r) return true;
  }
  return false;
}

function _pickTreePrefab(rng, zone) {
  if (zone.deadOnly) return 'tree_dead';
  const r = rng();
  if (r < zone.pineWeight) return 'tree_pine';
  if (r < zone.pineWeight + (zone.birchWeight || 0.14)) return 'tree_birch';
  return 'tree_oak';
}

function _placementsForZone(zone) {
  const rng = _mulberry32(zone.seed || 1);
  const out = [];
  let attempts = 0;
  const maxAttempts = zone.count * 40;
  while (out.length < zone.count && attempts < maxAttempts) {
    attempts++;
    const ang = rng() * Math.PI * 2;
    const dist = rng() * zone.radius;
    const x = zone.cx + Math.cos(ang) * dist;
    const z = zone.cz + Math.sin(ang) * dist;
    if (Math.hypot(x, z) < 4) continue;
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

/**
 * @returns {Array<{ kind: 'prefab', prefabId: string, x: number, z: number, rotY: number, scale: number, treeSeed: number }>}
 */
export function computeTreePlacements() {
  const out = [];
  for (const zone of TREE_ZONES) {
    out.push(..._placementsForZone(zone));
  }
  return out;
}

export function listTreePrefabIds() {
  return ['tree_oak', 'tree_pine', 'tree_birch', 'tree_dead'];
}

