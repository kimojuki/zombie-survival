'use strict';

/** RCON HTTP + session authentifiée — extrait de admin-routes.js */
function registerAdminRconRoutes(env) {
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

  app.post('/api/rcon', async (req, res) => {
      const pw = req.headers['x-rcon-password'] || req.body?.password || '';
      if (!rconPassword) {
        return res.status(503).json({ ok: false, error: 'RCON désactivé — définissez RCON_PASSWORD dans .env' });
      }
      if (pw !== rconPassword) {
        return res.status(403).json({ ok: false, error: 'Mot de passe RCON invalide' });
      }
      const cmd = (req.body?.cmd || req.body?.command || '').trim();
      if (!cmd) return res.status(400).json({ ok: false, error: 'cmd requis' });
      const rcon = getRcon();
      if (!rcon) return res.status(503).json({ ok: false, error: 'Serveur en démarrage' });
      try {
        const result = await rcon.execute(cmd, { player: { username: 'api' } });
        res.json(result);
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    });
  
  app.post('/api/rcon/session', async (req, res) => {
      const user = adminAuth(req, res, 'rcon');
      if (!user) return;
      const cmd = (req.body?.cmd || req.body?.command || '').trim();
      if (!cmd) return res.status(400).json({ ok: false, error: 'cmd requis' });
      const rcon = getRcon();
      if (!rcon) return res.status(503).json({ ok: false, error: 'Serveur en démarrage' });
      try {
        const result = await rcon.execute(cmd, { player: { username: user.username } });
        res.json(result);
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    });
}

module.exports = { registerAdminRconRoutes };
