/** Barrières routières — placements le long des RN (seed serveur, miroir road_network). */

import { TOWN_MAIN_PTS, CITY_HIGHWAY_PTS } from './road-wrecks.mjs';

export const BARRIER_OFFSET = 0.55;
export const BARRIER_STEP = 2.6;
export const BARRIER_GAP_RADIUS = 7.5;

export const BARRIER_ROADS = Object.freeze([
  { id: 'town_main', pts: TOWN_MAIN_PTS, width: 8.4 },
  { id: 'city_highway', pts: CITY_HIGHWAY_PTS, width: 12 },
]);

/** Bouche sentier spawn → RN (proc_roads.js). */
export const SPAWN_TRAIL_MOUTH = Object.freeze([0, -11.35]);

const _ROAD_WIDTH = { town_main: 8.4, city_highway: 12 };

function _polylineLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return total;
}

function _cumDist(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return cum;
}

function _pointAtDist(pts, cum, dist) {
  const totalLen = cum[cum.length - 1];
  const d = Math.max(0, Math.min(totalLen, dist));
  for (let i = 1; i < pts.length; i++) {
    const segLen = cum[i] - cum[i - 1];
    if (segLen < 0.0001) continue;
    if (d <= cum[i] || i === pts.length - 1) {
      const f = (d - cum[i - 1]) / segLen;
      const x0 = pts[i - 1][0];
      const z0 = pts[i - 1][1];
      const x1 = pts[i][0];
      const z1 = pts[i][1];
      return {
        x: x0 + (x1 - x0) * f,
        z: z0 + (z1 - z0) * f,
        tx: (x1 - x0) / segLen,
        tz: (z1 - z0) / segLen,
      };
    }
  }
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const segLen = Math.hypot(last[0] - prev[0], last[1] - prev[1]) || 1;
  return {
    x: last[0],
    z: last[1],
    tx: (last[0] - prev[0]) / segLen,
    tz: (last[1] - prev[1]) / segLen,
  };
}

function _nearestOnPolyline(pts, x, z) {
  let best = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const x0 = pts[i][0];
    const z0 = pts[i][1];
    const x1 = pts[i + 1][0];
    const z1 = pts[i + 1][1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-8) continue;
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2));
    const px = x0 + dx * t;
    const pz = z0 + dz * t;
    const dist = Math.hypot(x - px, z - pz);
    if (!best || dist < best.dist) {
      best = { dist, x: px, z: pz, tx: dx / Math.sqrt(len2), tz: dz / Math.sqrt(len2) };
    }
  }
  return best;
}

function _buildTrailTowardRoad(mouth, roadPts) {
  const [mx, mz] = mouth;
  const hit = _nearestOnPolyline(roadPts, mx, mz);
  if (!hit) return null;
  const lead = 5.5;
  const toMx = mx - hit.x;
  const toMz = mz - hit.z;
  const toLen = Math.hypot(toMx, toMz) || 1;
  const approachX = hit.x + (toMx / toLen) * lead;
  const approachZ = hit.z + (toMz / toLen) * lead;
  const perpX = -toMz / toLen;
  const perpZ = toMx / toLen;
  const bend = 2.8;
  const cx = mx + (approachX - mx) * 0.42 + perpX * bend;
  const cz = mz + (approachZ - mz) * 0.42 + perpZ * bend * 0.35;
  const steps = 14;
  const pts = [[mx, mz]];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const omt = 1 - t;
    pts.push([
      omt * omt * mx + 2 * omt * t * cx + t * t * approachX,
      omt * omt * mz + 2 * omt * t * cz + t * t * approachZ,
    ]);
  }
  return pts;
}

/** Gap barrières — plus de jonction sentier spawn (plage). */
export function computeBarrierGaps() {
  return [];
}

function _inGap(x, z, gaps) {
  for (const g of gaps) {
    if (Math.hypot(x - g.x, z - g.z) < g.r) return true;
  }
  return false;
}

function _placementsForRoad(road, gaps) {
  const out = [];
  const pts = road.pts;
  if (!pts || pts.length < 2) return out;
  const cum = _cumDist(pts);
  const totalLen = cum[cum.length - 1];
  if (totalLen < 0.01) return out;
  const hw = road.width * 0.5 + BARRIER_OFFSET;

  for (const side of [-1, 1]) {
    const posts = [];
    for (let d = 0; d <= totalLen + 0.001; d += BARRIER_STEP) {
      const p = _pointAtDist(pts, cum, d);
      const bx = p.x + (-p.tz) * hw * side;
      const bz = p.z + p.tx * hw * side;
      if (_inGap(bx, bz, gaps)) {
        posts.push(null);
        continue;
      }
      const sideName = side < 0 ? 'left' : 'right';
      posts.push({
        kind: 'prefab',
        prefabId: 'road_barrier_post',
        x: bx,
        z: bz,
        rotY: 0,
        scale: 1,
        roadId: road.id,
        side: sideName,
        placementKey: `barrier:${road.id}:${sideName}:post:${Math.round(d * 10)}`,
      });
    }

    for (let i = 0; i < posts.length - 1; i++) {
      const a = posts[i];
      const b = posts[i + 1];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.02) continue;
      const midX = (a.x + b.x) * 0.5;
      const midZ = (a.z + b.z) * 0.5;
      const rotY = Math.atan2(dx, dz);
      const sideName = side < 0 ? 'left' : 'right';
      out.push({
        kind: 'prefab',
        prefabId: 'road_barrier_rail',
        x: midX,
        z: midZ,
        rotY,
        rotX: 0,
        scale: 1,
        railLen: len,
        roadId: road.id,
        side: sideName,
        placementKey: `barrier:${road.id}:${sideName}:rail:${i}`,
      });
    }

    out.push(...posts.filter(Boolean));
  }
  return out;
}

/**
 * @returns {Array<object>} decor items prefab (posts + rails)
 */
export function computeRoadBarrierPlacements() {
  const gaps = computeBarrierGaps();
  const out = [];
  for (const road of BARRIER_ROADS) {
    out.push(..._placementsForRoad(road, gaps));
  }
  return out;
}

export function listRoadBarrierPrefabIds() {
  return ['road_barrier_post', 'road_barrier_rail'];
}

export function countBarrierPlacements() {
  const p = computeRoadBarrierPlacements();
  return {
    total: p.length,
    posts: p.filter((d) => d.prefabId === 'road_barrier_post').length,
    rails: p.filter((d) => d.prefabId === 'road_barrier_rail').length,
  };
}
