'use strict';

/** Sauvegardes monde — extrait de admin-routes.js */
function registerAdminBackupRoutes(env) {
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

  app.get('/api/admin/backups', (req, res) => {
      const user = adminAuth(req, res, 'rcon');
      if (!user) return;
      try {
        res.json({ ok: true, backups: getWorldBackup().listBackups() });
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    });
  
    app.post('/api/admin/backups', async (req, res) => {
      const user = adminAuth(req, res, 'rcon');
      if (!user) return;
      const kind = req.body?.kind === 'full' ? 'full' : 'map';
      const label = req.body?.label;
      const includePlayerBuilds = kind === 'full' ? true : !!req.body?.includePlayerBuilds;
      try {
        await worldPersist.flushSync?.(flushWorldPersistCounters());
        const snap = await getWorldBackup().buildSnapshot({
          kind,
          includePlayerBuilds,
          createdBy: user.username,
          label,
        });
        const saved = getWorldBackup().saveBackupToDisk(snap);
        res.json({
          ok: true,
          id: saved.id,
          kind: snap.kind,
          label: snap.label,
          stats: snap.stats,
          includePlayerBuilds: snap.includePlayerBuilds,
        });
      } catch (err) {
        log.error('backup', 'create failed', { err: err.message, user: user.username });
        res.status(500).json({ ok: false, error: err.message });
      }
    });
  
    app.get('/api/admin/backups/:id/download', (req, res) => {
      const user = adminAuth(req, res, 'rcon');
      if (!user) return;
      const raw = getWorldBackup().readBackupById(req.params.id);
      if (!raw) return res.status(404).json({ ok: false, error: 'Backup introuvable' });
      const filename = `${req.params.id}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(raw, null, 2));
    });
  
    app.delete('/api/admin/backups/:id', (req, res) => {
      const user = adminAuth(req, res, 'rcon.dangerous');
      if (!user) return;
      const ok = getWorldBackup().deleteBackup(req.params.id);
      if (!ok) return res.status(404).json({ ok: false, error: 'Backup introuvable' });
      res.json({ ok: true, id: req.params.id });
    });
  
    app.post('/api/admin/backups/import', express.json({ limit: '100mb' }), async (req, res) => {
      const user = adminAuth(req, res, 'rcon.dangerous');
      if (!user) return;
      const payload = req.body?.backup ?? req.body;
      try {
        const result = await getWorldBackup().restoreBackup(payload, {
          flushWorldPersist: () => worldPersist.flushSync?.(flushWorldPersistCounters()),
        });
        if (!result.ok) return res.status(400).json(result);
        await reloadWorldFromDatabase(result.kind);
        log.info('backup', 'imported', { by: user.username, kind: result.kind });
        res.json({ ok: true, ...result, requiresReload: true });
      } catch (err) {
        log.error('backup', 'import failed', { err: err.message, user: user.username });
        res.status(500).json({ ok: false, error: err.message });
      }
    });
  
    app.post('/api/admin/backups/:id/restore', async (req, res) => {
      const user = adminAuth(req, res, 'rcon.dangerous');
      if (!user) return;
      const raw = getWorldBackup().readBackupById(req.params.id);
      if (!raw) return res.status(404).json({ ok: false, error: 'Backup introuvable' });
      try {
        const result = await getWorldBackup().restoreBackup(raw, {
          flushWorldPersist: () => worldPersist.flushSync?.(flushWorldPersistCounters()),
        });
        if (!result.ok) return res.status(400).json(result);
        await reloadWorldFromDatabase(result.kind);
        log.info('backup', 'restored from disk', { by: user.username, id: req.params.id, kind: result.kind });
        res.json({ ok: true, id: req.params.id, ...result, requiresReload: true });
      } catch (err) {
        log.error('backup', 'restore failed', { err: err.message, user: user.username, id: req.params.id });
        res.status(500).json({ ok: false, error: err.message });
      }
    });
}

module.exports = { registerAdminBackupRoutes };
