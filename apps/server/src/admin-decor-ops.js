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

/**
 * Crée un item décor prefab posé par un admin (POST /api/admin/decor).
 * @param {string} prefabId
 * @param {object} body
 * @param {string} id
 * @param {string} [adminUser]
 */
function buildAdminDecorCreateItem(prefabId, body, id, adminUser = 'admin') {
  const pid = String(prefabId || '').trim();
  if (!pid) throw new Error('prefabId requis');
  const x = Number(body.x);
  const z = Number(body.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) throw new Error('x et z requis');
  let rotY = Number(body.rotY);
  if (!Number.isFinite(rotY)) rotY = 0;
  let scale = Number(body.scale);
  if (!Number.isFinite(scale)) scale = 1;
  scale = Math.max(0.05, Math.min(12, scale));

  const item = {
    id,
    kind: 'prefab',
    type: null,
    prefabId: pid,
    x,
    y: 0,
    z,
    rotX: Number.isFinite(Number(body.rotX)) ? Number(body.rotX) : 0,
    rotY,
    rotZ: Number.isFinite(Number(body.rotZ)) ? Number(body.rotZ) : 0,
    scale,
    createdBy: adminUser,
    createdAt: Date.now(),
  };

  if (Number.isFinite(Number(body.groundLift))) item.groundLift = Number(body.groundLift);
  if (Number.isFinite(Number(body.buildLevel))) {
    item.buildLevel = Math.max(0, Math.min(8, Math.floor(Number(body.buildLevel))));
  }
  if (Number.isFinite(Number(body.baseY))) item.baseY = Number(body.baseY);

  if (pid.startsWith('wreck_')) {
    const variant = body.wreckVariant != null ? String(body.wreckVariant).slice(0, 24) : '';
    if (variant === 'burnt') {
      item.wreckBurnt = true;
      item.wreckVariant = 'burnt';
    } else if (variant) {
      item.wreckVariant = variant;
    } else if (!item.wreckVariant) {
      item.wreckVariant = 'rust';
    }
    const tilt = Number(body.wreckTilt);
    const wheels = Number(body.wreckWheels);
    const sink = Number(body.wreckSink);
    if (Number.isFinite(tilt)) {
      item.wreckTilt = tilt;
      item.rotZ = tilt;
    } else {
      item.wreckTilt = 0.12;
      item.rotZ = 0.12;
    }
    if (Number.isFinite(wheels)) item.wreckWheels = wheels;
    else item.wreckWheels = 2;
    if (Number.isFinite(sink)) item.wreckSink = sink;
  }

  if (pid.startsWith('tree_')) {
    item.treeSeed = Number.isFinite(Number(body.treeSeed))
      ? Math.floor(Number(body.treeSeed)) & 0xffffff
      : Math.floor(Math.random() * 0xffffff);
  }

  if (pid.startsWith('road_barrier_rail') && Number.isFinite(Number(body.railLen))) {
    item.railLen = Number(body.railLen);
  }

  return item;
}

const STORAGE_PREFAB_IDS = new Set(['storage_chest', 'spawn_beach_starter_suitcase']);
const STORAGE_CHEST_CAPACITY = 27;
const STORAGE_SUITCASE_CAPACITY = 12;

function _storageCapacityForPrefab(prefabId) {
  if (prefabId === 'spawn_beach_starter_suitcase') return STORAGE_SUITCASE_CAPACITY;
  if (prefabId === 'storage_chest') return STORAGE_CHEST_CAPACITY;
  return 0;
}

function _sanitizeStorageSlot(slot) {
  if (!slot || !slot.type) return null;
  const type = String(slot.type).slice(0, 64);
  if (!type) return null;
  let qty = Math.floor(Number(slot.qty));
  if (!Number.isFinite(qty) || qty < 1) qty = 1;
  if (qty > 99) qty = 99;
  const out = { type, qty };
  if (slot.lockId) out.lockId = String(slot.lockId).slice(0, 48);
  if (slot.durability != null && Number.isFinite(Number(slot.durability))) {
    out.durability = Number(slot.durability);
  }
  if (slot.ammo != null && Number.isFinite(Number(slot.ammo))) {
    out.ammo = Math.max(0, Math.floor(Number(slot.ammo)));
  }
  return out;
}

/**
 * Patch contenu coffre admin (clear / grille complète).
 * @param {object} item
 * @param {object} patch
 * @returns {string[]} champs modifiés
 */
function applyAdminDecorStoragePatch(item, patch) {
  if (!item || !patch || typeof patch !== 'object') return [];
  if (!STORAGE_PREFAB_IDS.has(item.prefabId)) return [];
  const capacity = _storageCapacityForPrefab(item.prefabId);
  if (!capacity) return [];

  if (patch.clearStorage === true) {
    item.storage = Array.from({ length: capacity }, () => null);
    return ['storage'];
  }

  if (Array.isArray(patch.storage)) {
    const grid = Array.from({ length: capacity }, () => null);
    const src = patch.storage;
    for (let i = 0; i < capacity; i++) {
      grid[i] = _sanitizeStorageSlot(src[i]);
    }
    item.storage = grid;
    return ['storage'];
  }

  return [];
}

module.exports = {
  applyAdminDecorPatch,
  applyAdminDecorStoragePatch,
  adminDecorSnapshot,
  buildAdminDecorCreateItem,
  NUM_FIELDS,
  STORAGE_PREFAB_IDS,
};
