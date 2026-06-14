'use strict';

const {
  adminDecorMarker,
  createAdminAuthHelpers,
  adminDecorLayer,
  DECOR_PREFAB_CATALOG_URL,
  PREFAB_CATALOG_REVIEWS_URL,
  ADMIN_MAP_STATIC_URL,
  ADMIN_MAP_POIS_URL,
} = require('./admin/helpers');
const { registerAdminRconRoutes } = require('./admin/rcon-routes');
const { registerAdminMapRoutes } = require('./admin/map-routes');
const { registerAdminPlayerRoutes } = require('./admin/player-routes');
const { registerAdminRoadRoutes } = require('./admin/road-routes');
const { registerAdminDecorRoutes } = require('./admin/decor-routes');
const { registerAdminServerRoutes } = require('./admin/server-routes');
const { registerAdminBackupRoutes } = require('./admin/backup-routes');
const { registerAdminPrefabRoutes } = require('./admin/prefab-routes');

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

  registerAdminRconRoutes(env);
  registerAdminMapRoutes(env);
  registerAdminPlayerRoutes(env);
  registerAdminRoadRoutes(env);
  registerAdminDecorRoutes(env);
  registerAdminServerRoutes(env);
  registerAdminBackupRoutes(env);
  registerAdminPrefabRoutes(env);
}

module.exports = { registerAdminRoutes };
