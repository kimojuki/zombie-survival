'use strict';

/** Routes admin éditeur — extrait de admin-routes.js */
function registerAdminRoadRoutes(env) {
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

  app.get('/api/world/admin-roads', (req, res) => {
      res.json({ ok: true, roads: adminRoadStore.list() });
    });
  
    app.get('/api/admin/roads', (req, res) => {
      const user = adminAuthAny(req, res, ['decor.edit', 'world.map']);
      if (!user) return;
      res.json({ ok: true, roads: adminRoadStore.list() });
    });
  
    app.post('/api/admin/roads', async (req, res) => {
      const user = adminDecorAuth(req, res);
      if (!user) return;
      try {
        const road = await adminRoadStore.create(req.body || {}, user.username);
        log.info('admin', 'road created', { id: road.id, by: user.username });
        io.emit('admin-roads-changed', { action: 'create', id: road.id });
        res.json({ ok: true, road });
      } catch (err) {
        res.status(400).json({ ok: false, error: err.message || 'Route invalide' });
      }
    });
  
    app.patch('/api/admin/roads/:id', async (req, res) => {
      const user = adminDecorAuth(req, res);
      if (!user) return;
      const id = String(req.params.id || '').trim();
      try {
        const result = await adminRoadStore.patch(id, req.body?.patch || req.body || {}, user.username);
        if (!result) return res.status(404).json({ ok: false, error: 'Route introuvable' });
        log.info('admin', 'road patched', { id, changed: result.changed, by: user.username });
        io.emit('admin-roads-changed', { action: 'patch', id });
        res.json({ ok: true, ...result });
      } catch (err) {
        res.status(400).json({ ok: false, error: err.message || 'Patch invalide' });
      }
    });
  
    app.delete('/api/admin/roads/:id', (req, res) => {
      const user = adminDecorAuth(req, res);
      if (!user) return;
      const id = String(req.params.id || '').trim();
      if (!adminRoadStore.remove(id)) {
        return res.status(404).json({ ok: false, error: 'Route introuvable' });
      }
      log.info('admin', 'road deleted', { id, by: user.username });
      io.emit('admin-roads-changed', { action: 'delete', id });
      res.json({ ok: true, id });
    });
}

module.exports = { registerAdminRoadRoutes };
