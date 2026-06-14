'use strict';

/** Heure, flags, annonces — extrait de admin-routes.js */
function registerAdminServerRoutes(env) {
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

  app.get('/api/admin/world-state', (req, res) => {
      const user = adminAuthAny(req, res, ['decor.edit', 'rcon']);
      if (!user) return;
      res.json({
        ok: true,
        worldTime: getWorldTime(),
        autoDay: serverFlags.autoDay,
        dayDurationSec,
        serverFlags: { ...serverFlags },
      });
    });
  
    app.post('/api/admin/announce', (req, res) => {
      const user = adminAuthAny(req, res, ['decor.edit', 'rcon']);
      if (!user) return;
      const msg = String(req.body?.message || '').trim();
      if (!msg) return res.status(400).json({ ok: false, error: 'message requis' });
      const text = msg.slice(0, 280);
      io.emit('server-announce', { message: text, from: user.username });
      log.info('admin', 'announce', { by: user.username, message: text.slice(0, 80) });
      res.json({ ok: true, message: text });
    });
  
    app.post('/api/admin/server-flags', (req, res) => {
      const user = adminAuthAny(req, res, ['decor.edit', 'rcon']);
      if (!user) return;
      const allowed = ['autoDay', 'zombieAI', 'zombieSpawn', 'lootEnabled', 'pvp'];
      const body = req.body || {};
      const changed = [];
      for (const key of allowed) {
        if (body[key] === undefined) continue;
        const next = !!body[key];
        if (serverFlags[key] !== next) {
          serverFlags[key] = next;
          changed.push(key);
        }
      }
      if (changed.length) {
        io.emit('server-flags', { ...serverFlags });
        log.info('admin', 'server-flags', { by: user.username, changed, flags: { ...serverFlags } });
      }
      res.json({ ok: true, serverFlags: { ...serverFlags }, changed });
    });
  
    app.post('/api/admin/world-time', (req, res) => {
      const user = adminAuthAny(req, res, ['decor.edit', 'rcon']);
      if (!user) return;
      const presets = { day: 0.5, night: 0, dawn: 0.25, dusk: 0.75 };
      const preset = String(req.body?.preset || '').trim().toLowerCase();
      if (preset && presets[preset] != null) {
        setWorldTime(presets[preset]);
      } else if (req.body?.time != null && req.body?.time !== '') {
        const v = Number(req.body.time);
        if (!Number.isFinite(v)) {
          return res.status(400).json({ ok: false, error: 'time invalide (0–1)' });
        }
        setWorldTime(v);
      }
      if (req.body?.autoDay !== undefined) {
        serverFlags.autoDay = !!req.body.autoDay;
      }
      io.emit('world-time', { time: getWorldTime() });
      log.info('admin', 'world-time', { by: user.username, time: getWorldTime(), autoDay: serverFlags.autoDay });
      res.json({ ok: true, worldTime: getWorldTime(), autoDay: serverFlags.autoDay });
    });
}

module.exports = { registerAdminServerRoutes };
