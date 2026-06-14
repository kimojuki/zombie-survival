#!/usr/bin/env node
/**
 * Découpe admin-routes.js en routes/admin/*
 * Usage: node tools/extract-admin-routes.mjs [--write]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN = path.join(ROOT, 'apps/server/src/routes/admin-routes.js');
const ADMIN_DIR = path.join(ROOT, 'apps/server/src/routes/admin');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: 'rcon-routes.js',
    fn: 'registerAdminRconRoutes',
    title: 'RCON HTTP + session authentifiée',
    ranges: [
      ["app.post('/api/rcon'", "app.get('/api/admin/world-map'"],
      ["app.post('/api/rcon/session'", null, { toEnd: true }],
    ],
  },
  {
    file: 'map-routes.js',
    fn: 'registerAdminMapRoutes',
    title: 'Carte admin monde + POI',
    ranges: [["app.get('/api/admin/world-map'", "app.get('/api/admin/players'"]],
  },
  {
    file: 'player-routes.js',
    fn: 'registerAdminPlayerRoutes',
    title: 'Joueurs en ligne, actions, rôles',
    ranges: [["app.get('/api/admin/players'", "app.get('/api/world/admin-roads'"]],
  },
  {
    file: 'road-routes.js',
    fn: 'registerAdminRoadRoutes',
    title: 'Routes admin éditeur',
    ranges: [["app.get('/api/world/admin-roads'", "app.post('/api/admin/decor'"]],
  },
  {
    file: 'decor-routes.js',
    fn: 'registerAdminDecorRoutes',
    title: 'CRUD décor, recherche, teleport-here',
    ranges: [
      ["app.post('/api/admin/decor'", "app.get('/api/admin/world-state'"],
      ["app.post('/api/admin/decor/restore'", "app.get('/api/admin/prefab-catalog'"],
    ],
  },
  {
    file: 'server-routes.js',
    fn: 'registerAdminServerRoutes',
    title: 'Heure, flags, annonces',
    ranges: [["app.get('/api/admin/world-state'", "app.get('/api/admin/backups'"]],
  },
  {
    file: 'backup-routes.js',
    fn: 'registerAdminBackupRoutes',
    title: 'Sauvegardes monde',
    ranges: [["app.get('/api/admin/backups'", "app.post('/api/admin/decor/restore'"]],
  },
  {
    file: 'prefab-routes.js',
    fn: 'registerAdminPrefabRoutes',
    title: 'Catalogue prefabs + reviews',
    ranges: [["app.get('/api/admin/prefab-catalog'", "app.post('/api/rcon/session'"]],
  },
];

function sliceBetween(src, startMarker, endMarker, includeStart = true, toEnd = false) {
  const i0 = src.indexOf(startMarker);
  if (i0 < 0) throw new Error(`start not found: ${startMarker.slice(0, 50)}`);
  const searchFrom = i0 + startMarker.length;
  if (toEnd) return src.slice(includeStart ? i0 : searchFrom).trimEnd();
  const i1 = src.indexOf(endMarker, searchFrom);
  if (i1 < 0) throw new Error(`end not found after ${startMarker.slice(0, 50)}`);
  const from = includeStart ? i0 : searchFrom;
  return src.slice(from, i1).trimEnd();
}

function extractRouteBody(src, chunk) {
  const parts = chunk.ranges.map(([start, end, opts = {}]) =>
    sliceBetween(src, start, end, true, opts.toEnd),
  );
  return parts.join('\n\n');
}

function wrapRoutes(chunk, body) {
  return `'use strict';

/** ${chunk.title} — extrait de admin-routes.js */
function ${chunk.fn}(env) {
  const { app, express } = env;
  const {
    log,
    io,
    authFromHeader,
    hasPerm,
    authPayload,
    getRcon,
    rconPassword,
    getPlayers,
    getDecorItems,
    getWorldWaterZones,
    getLootBuildings,
    playerRoles,
    ownerUsers,
    adminRoadStore,
    worldPersist,
    prefabCatalogReviews,
    getDecorPrefabCatalogCache,
    reloadDecorPrefabCatalog,
    decorPrefabs,
    nextDecorId,
    buildAdminDecorCreateItem,
    adminDecorSnapshot,
    applyAdminDecorPatch,
    applyAdminDecorStoragePatch,
    removeDecorItem,
    emitStorageUpdate,
    emitSurvivalUpdate,
    reloadWorldFromDatabase,
    isDecorImmutable,
    getPlacementKey,
    flushWorldPersistCounters,
    worldRadius,
    sectorBoundsMod,
    getWorldTime,
    setWorldTime,
    serverFlags,
    dayDurationSec,
    adminAuth,
    adminDecorAuth,
    adminAuthAny,
    findOnlinePlayer,
    adminSyncPlayerPos,
    marker,
    getWorldBackup,
    adminDecorLayer,
    ADMIN_MAP_STATIC_URL,
    ADMIN_MAP_POIS_URL,
    DECOR_PREFAB_CATALOG_URL,
    PREFAB_CATALOG_REVIEWS_URL,
  } = env;

${body.split('\n').map((l) => `  ${l}`).join('\n')}
}

module.exports = { ${chunk.fn} };
`;
}

function buildHelpersJs() {
  return `'use strict';

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
`;
}

function buildAdminRoutesJs(chunks) {
  const imports = chunks
    .map((c) => `const { ${c.fn} } = require('./admin/${c.file.replace('.js', '')}');`)
    .join('\n');

  const calls = chunks.map((c) => `  ${c.fn}(env);`).join('\n');

  return `'use strict';

const {
  adminDecorMarker,
  createAdminAuthHelpers,
  adminDecorLayer,
  DECOR_PREFAB_CATALOG_URL,
  PREFAB_CATALOG_REVIEWS_URL,
  ADMIN_MAP_STATIC_URL,
  ADMIN_MAP_POIS_URL,
} = require('./admin/helpers');
${imports}

/**
 * Routes admin REST + RCON HTTP — orchestration (corps dans admin/*).
 */
function registerAdminRoutes(app, express, deps) {
  const {
    io,
    getPlayers,
    isDecorImmutable,
    getPlacementKey,
    createWorldBackupService,
    backupServiceConfig,
  } = deps;

  const { adminAuth, adminDecorAuth, adminAuthAny } = createAdminAuthHelpers(deps);

  function findOnlinePlayer(username) {
    const q = String(username || '').trim().toLowerCase();
    if (!q) return null;
    const players = getPlayers();
    for (const p of players.values()) {
      if (p.username.toLowerCase() === q) return p;
    }
    for (const p of players.values()) {
      if (p.username.toLowerCase().startsWith(q)) return p;
    }
    return null;
  }

  function adminSyncPlayerPos(p) {
    if (!p?.socketId) return;
    const sock = io.sockets.sockets.get(p.socketId);
    if (!sock) return;
    sock.emit('admin-tp', { x: p.x, y: p.y, z: p.z, rotY: p.rotY });
    sock.broadcast.emit('player-move', {
      id: p.socketId,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
    });
  }

  function marker(d) {
    return adminDecorMarker(d, { isDecorImmutable, getPlacementKey });
  }

  let worldBackupSvc = null;
  function getWorldBackup() {
    if (!worldBackupSvc) {
      worldBackupSvc = createWorldBackupService(backupServiceConfig);
    }
    return worldBackupSvc;
  }

  const env = {
    app,
    express,
    ...deps,
    adminAuth,
    adminDecorAuth,
    adminAuthAny,
    findOnlinePlayer,
    adminSyncPlayerPos,
    marker,
    getWorldBackup,
    adminDecorLayer,
    DECOR_PREFAB_CATALOG_URL,
    PREFAB_CATALOG_REVIEWS_URL,
    ADMIN_MAP_STATIC_URL,
    ADMIN_MAP_POIS_URL,
  };

${calls}
}

module.exports = { registerAdminRoutes };
`;
}

function extractRegisterBody(src) {
  const start = src.indexOf('function registerAdminRoutes(app, express, deps) {');
  if (start < 0) throw new Error('registerAdminRoutes not found');
  const bodyStart = src.indexOf('{', start) + 1;
  const end = src.lastIndexOf('\n}');
  return src.slice(bodyStart, end);
}

const src = fs.readFileSync(ADMIN, 'utf8');
const body = extractRegisterBody(src);

if (!WRITE) {
  for (const chunk of CHUNKS) {
    const content = extractRouteBody(body, chunk);
    console.log(chunk.file, content.split('\n').length, 'lines');
  }
  console.log('\nRun with --write to extract');
  process.exit(0);
}

fs.mkdirSync(ADMIN_DIR, { recursive: true });
for (const chunk of CHUNKS) {
  const content = extractRouteBody(body, chunk);
  fs.writeFileSync(path.join(ADMIN_DIR, chunk.file), wrapRoutes(chunk, content));
  console.log('wrote', chunk.file, content.split('\n').length, 'lines');
}

fs.writeFileSync(path.join(ADMIN_DIR, 'helpers.js'), buildHelpersJs());
fs.writeFileSync(ADMIN, buildAdminRoutesJs(CHUNKS));
console.log('rewrote admin-routes.js + admin/helpers.js');
