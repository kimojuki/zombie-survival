/** Schéma routes posées par les admins in-game (persistées world_meta). */

export const ADMIN_ROAD_TYPES = Object.freeze(['dirt', 'path', 'trail', 'asphalt']);

const TYPE_SET = new Set(ADMIN_ROAD_TYPES);

/**
 * @param {unknown} def
 * @returns {object|null}
 */
export function normalizeAdminRoadDef(def) {
  if (!def || typeof def !== 'object') return null;
  const id = String(def.id || '').trim();
  if (!id) return null;
  const rawPts = Array.isArray(def.pts) ? def.pts : [];
  const pts = [];
  for (const p of rawPts) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const x = Number(p[0]);
    const z = Number(p[1]);
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    pts.push([Math.round(x * 1000) / 1000, Math.round(z * 1000) / 1000]);
  }
  if (pts.length < 2) return null;
  const type = TYPE_SET.has(def.type) ? def.type : 'dirt';
  let width = Number(def.width);
  if (!Number.isFinite(width)) width = 2.6;
  width = Math.max(1, Math.min(16, width));
  const label = def.label != null ? String(def.label).slice(0, 64) : '';
  return {
    id,
    label,
    pts,
    width,
    type,
    smooth: def.smooth !== false,
    visual: def.visual !== false,
    barriers: def.barriers === true,
    createdAt: Number.isFinite(def.createdAt) ? def.createdAt : Date.now(),
    updatedAt: Number.isFinite(def.updatedAt) ? def.updatedAt : Date.now(),
    createdBy: def.createdBy ? String(def.createdBy).slice(0, 32) : null,
    updatedBy: def.updatedBy ? String(def.updatedBy).slice(0, 32) : null,
  };
}

/**
 * @param {object} body
 * @param {string} id
 * @param {string} [adminUser]
 */
export function buildAdminRoadCreate(body, id, adminUser = 'admin') {
  const def = normalizeAdminRoadDef({ ...body, id });
  if (!def) throw new Error('Route invalide — au moins 2 points requis');
  const now = Date.now();
  def.createdAt = now;
  def.updatedAt = now;
  def.createdBy = adminUser;
  def.updatedBy = adminUser;
  return def;
}

/**
 * @param {object} road
 * @param {object} patch
 * @param {string} [adminUser]
 * @returns {string[]}
 */
export function applyAdminRoadPatch(road, patch, adminUser = 'admin') {
  if (!road || !patch || typeof patch !== 'object') return [];
  const changed = [];
  if (patch.label !== undefined) {
    const label = String(patch.label).slice(0, 64);
    if (road.label !== label) {
      road.label = label;
      changed.push('label');
    }
  }
  if (Array.isArray(patch.pts)) {
    const next = normalizeAdminRoadDef({ ...road, pts: patch.pts });
    if (!next) throw new Error('pts invalides');
    road.pts = next.pts;
    changed.push('pts');
  }
  if (patch.type !== undefined) {
    const type = TYPE_SET.has(patch.type) ? patch.type : road.type;
    if (road.type !== type) {
      road.type = type;
      changed.push('type');
    }
  }
  if (patch.width !== undefined) {
    let width = Number(patch.width);
    if (Number.isFinite(width)) {
      width = Math.max(1, Math.min(16, width));
      if (road.width !== width) {
        road.width = width;
        changed.push('width');
      }
    }
  }
  for (const key of ['smooth', 'visual', 'barriers']) {
    if (patch[key] === undefined) continue;
    const v = !!patch[key];
    if (!!road[key] !== v) {
      road[key] = v;
      changed.push(key);
    }
  }
  if (changed.length) {
    road.updatedAt = Date.now();
    road.updatedBy = adminUser;
  }
  return changed;
}
