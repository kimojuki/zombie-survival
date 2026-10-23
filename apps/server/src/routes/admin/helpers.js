'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

const DECOR_PREFAB_CATALOG_URL = pathToFileURL(
  path.join(__dirname, '../../../../packages/shared/src/decor-prefab-catalog.mjs'),
).href;
const PREFAB_CATALOG_REVIEWS_URL = pathToFileURL(
  path.join(__dirname, '../../../../packages/shared/src/prefab-catalog-reviews.mjs'),
).href;
const ADMIN_MAP_STATIC_URL = pathToFileURL(
  path.join(__dirname, '../../../../packages/shared/src/admin-map-static.mjs'),
).href;
const ADMIN_MAP_POIS_URL = pathToFileURL(
  path.join(__dirname, '../../../../packages/shared/src/admin-map-pois.mjs'),
).href;

function adminDecorLayer(d) {
  const pid = d.prefabId || '';
  if (d.kind === 'item') return 'item';
  if (pid.startsWith('tree_')) return pid === 'tree_palm' ? 'palm' : 'tree';
  if (pid.startsWith('rock_') || pid === 'spawn_stone') return 'rock';
  if (pid.startsWith('building_') || pid.startsWith('smallcity_') || pid.startsWith('s01_')) return 'building';
  if (pid.startsWith('sign_') || pid.startsWith('beach_')) return 'sign';
  if (pid.startsWith('wreck_')) return 'wreck';
  if (pid.startsWith('road_')) return 'barrier';
  if (pid === 'storage_chest') return 'storage';
  if (pid.startsWith('spawn_') || pid.startsWith('build_')) return 'camp';
  return 'other';
}

function adminDecorMarker(d, deps) {
  const { isDecorImmutable, getPlacementKey } = deps;
  return {
    id: d.id,
    kind: d.kind || 'item',
    prefabId: d.prefabId || null,
    type: d.type || null,
    x: d.x,
    z: d.z,
    y: d.y,
    rotY: d.rotY,
    scale: d.scale,
    layer: adminDecorLayer(d),
    immutable: isDecorImmutable(d),
    placementKey: d.placementKey || getPlacementKey(d) || null,
    createdBy: d.createdBy || null,
    anchorId: d.anchorId || null,
    zoneId: d.zoneId ?? null,
  };
}

function createAdminAuthHelpers(deps) {
  const { authFromHeader, hasPerm } = deps;

  function adminAuth(req, res, perm) {
    const user = authFromHeader(req);
    if (!user) {
      res.status(401).json({ ok: false, error: 'Non authentifié' });
      return null;
    }
    if (!hasPerm(user.username, perm)) {
      res.status(403).json({ ok: false, error: 'Permission requise', perm });
      return null;
    }
    return user;
  }

  function adminDecorAuth(req, res, perm = 'decor.edit') {
    return adminAuth(req, res, perm);
  }

  function adminAuthAny(req, res, perms) {
    const user = authFromHeader(req);
    if (!user) {
      res.status(401).json({ ok: false, error: 'Non authentifié' });
      return null;
    }
    const list = Array.isArray(perms) ? perms : [perms];
    if (!list.some((p) => hasPerm(user.username, p))) {
      res.status(403).json({ ok: false, error: 'Permission requise' });
      return null;
    }
    return user;
  }

  return { adminAuth, adminDecorAuth, adminAuthAny };
}

module.exports = {
  adminDecorLayer,
  adminDecorMarker,
  createAdminAuthHelpers,
  DECOR_PREFAB_CATALOG_URL,
  PREFAB_CATALOG_REVIEWS_URL,
  ADMIN_MAP_STATIC_URL,
  ADMIN_MAP_POIS_URL,
};
