'use strict';

/** Champs modifiables via PATCH /api/admin/decor/:id */
const NUM_FIELDS = [
  ['x', -500, 500],
  ['z', -500, 500],
  ['y', -5, 50],
  ['baseY', -5, 50],
  ['rotX', -Math.PI * 2, Math.PI * 2],
  ['rotY', -Math.PI * 4, Math.PI * 4],
  ['rotZ', -Math.PI * 2, Math.PI * 2],
  ['scale', 0.05, 12],
  ['groundLift', -2, 5],
  ['buildLevel', 0, 8],
  ['wreckTilt', -1.5, 1.5],
  ['wreckWheels', 0, 4],
  ['wreckSink', 0, 3],
  ['railLen', 0.1, 20],
  ['shackFloorY', -2, 5],
  ['buildDamage', 0, 999],
  ['buildMaxHp', 1, 9999],
];

/**
 * @param {object} item
 * @param {object} patch
 * @param {string} [adminUser]
 * @returns {string[]} champs modifiés
 */
function applyAdminDecorPatch(item, patch, adminUser = 'admin') {
  if (!item || !patch || typeof patch !== 'object') return [];
  const changed = [];

  for (const [key, min, max] of NUM_FIELDS) {
    if (patch[key] === undefined || patch[key] === null || patch[key] === '') continue;
    const v = Number(patch[key]);
    if (!Number.isFinite(v)) continue;
    const clamped = Math.max(min, Math.min(max, v));
    if (item[key] !== clamped) {
      item[key] = clamped;
      changed.push(key);
    }
  }

  if (patch.wreckVariant !== undefined && patch.wreckVariant !== null) {
    const v = String(patch.wreckVariant).slice(0, 24);
    if (item.wreckVariant !== v) {
      item.wreckVariant = v;
      changed.push('wreckVariant');
    }
  }

  if (patch.wreckBurnt !== undefined) {
    const b = !!patch.wreckBurnt;
    if (!!item.wreckBurnt !== b) {
      item.wreckBurnt = b;
      changed.push('wreckBurnt');
    }
  }

  if (patch.shackAnchor && typeof patch.shackAnchor === 'object') {
    const a = patch.shackAnchor;
    const ax = Number(a.x);
    const az = Number(a.z);
    const ar = Number(a.rotY);
    if (Number.isFinite(ax) && Number.isFinite(az)) {
      item.shackAnchor = {
        x: ax,
        z: az,
        rotY: Number.isFinite(ar) ? ar : (item.shackAnchor?.rotY || 0),
      };
      changed.push('shackAnchor');
    }
  }

  if (changed.length) {
    item.updatedAt = Date.now();
    item.updatedBy = adminUser;
  }
  return changed;
}

/**
 * @param {object} item
 * @returns {object}
 */
function adminDecorSnapshot(item) {
  if (!item) return null;
  const snap = { ...item };
  if (Array.isArray(snap.storage)) {
    const filled = snap.storage.filter(Boolean).length;
    snap.storageSummary = { filled, capacity: snap.storage.length };
  }
  return snap;
}

module.exports = {
  applyAdminDecorPatch,
  adminDecorSnapshot,
  NUM_FIELDS,
};
