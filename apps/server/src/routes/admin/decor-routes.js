'use strict';

/** CRUD décor, recherche, teleport-here — extrait de admin-routes.js */
function registerAdminDecorRoutes(env) {
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

  app.post('/api/admin/decor', async (req, res) => {
      const user = adminDecorAuth(req, res);
      if (!user) return;
      const prefabId = String(req.body?.prefabId || '').trim();
      if (!prefabId) return res.status(400).json({ ok: false, error: 'prefabId requis' });
      try {
        const catalog = getDecorPrefabCatalogCache();
        if (!catalog.length) await reloadDecorPrefabCatalog();
        if (!decorPrefabs.includes(prefabId)) {
          return res.status(400).json({ ok: false, error: `Prefab inconnu: ${prefabId}` });
        }
        const id = nextDecorId();
        const item = buildAdminDecorCreateItem(prefabId, req.body || {}, id, user.username);
        getDecorItems().set(id, item);
        worldPersist?.scheduleUpsertDecor(item);
        io.emit('decor-item-spawn', item);
        log.info('admin', 'decor created', { id, prefabId, by: user.username });
        res.json({ ok: true, item: adminDecorSnapshot(item) });
      } catch (err) {
        const msg = err.message || 'Erreur création';
        if (msg.includes('requis')) return res.status(400).json({ ok: false, error: msg });
        log.error('admin', 'decor create failed', { err: msg, prefabId });
        res.status(500).json({ ok: false, error: 'Erreur serveur' });
      }
    });
  
    app.post('/api/admin/teleport-here', (req, res) => {
      const user = adminAuthAny(req, res, ['decor.edit', 'players.manage']);
      if (!user) return;
      const actor = findOnlinePlayer(user.username);
      if (!actor) {
        return res.status(400).json({ ok: false, error: 'Vous devez être connecté en jeu' });
      }
      const x = Number(req.body?.x);
      const z = Number(req.body?.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) {
        return res.status(400).json({ ok: false, error: 'Coordonnées x/z requises' });
      }
      let y = Number(req.body?.y);
      if (!Number.isFinite(y)) y = actor.y;
      y = Math.max(-20, Math.min(100, y));
      let cx = Math.max(-worldRadius, Math.min(worldRadius, x));
      let cz = Math.max(-worldRadius, Math.min(worldRadius, z));
      if (sectorBoundsMod?.clampToSector01) {
        const c = sectorBoundsMod.clampToSector01(cx, cz);
        cx = c.x;
        cz = c.z;
      }
      actor.x = cx;
      actor.z = cz;
      actor.y = y;
      if (Number.isFinite(Number(req.body?.rotY))) actor.rotY = Number(req.body.rotY);
      actor.lastX = cx;
      actor.lastZ = cz;
      actor.lastMoveAt = Date.now();
      actor.posSynced = true;
      actor._tpGraceUntil = Date.now() + 2500;
      actor.dirty = true;
      adminSyncPlayerPos(actor);
      log.info('admin', 'teleport-here', { by: user.username, x: cx, z: cz });
      res.json({
        ok: true,
        x: +cx.toFixed(2),
        y: +y.toFixed(2),
        z: +cz.toFixed(2),
        rotY: actor.rotY,
      });
    });
  
    app.get('/api/admin/decor/search', (req, res) => {
      const user = adminDecorAuth(req, res);
      if (!user) return;
      const q = String(req.query.q || '').trim().toLowerCase();
      const layer = String(req.query.layer || '').trim();
      const limit = Math.min(80, Math.max(1, parseInt(req.query.limit, 10) || 30));
      const results = [];
      for (const d of getDecorItems().values()) {
        if (layer && adminDecorLayer(d) !== layer) continue;
        if (q) {
          const hay = `${d.id} ${d.prefabId || ''} ${d.type || ''} ${d.placementKey || ''}`.toLowerCase();
          if (!hay.includes(q)) continue;
        }
        results.push(marker(d));
        if (results.length >= limit) break;
      }
      res.json({ ok: true, results, count: results.length, truncated: results.length >= limit });
    });

  app.post('/api/admin/decor/restore', async (req, res) => {
      const user = adminDecorAuth(req, res);
      if (!user) return;
      const snap = req.body?.item;
      if (!snap?.id) return res.status(400).json({ ok: false, error: 'item.id requis' });
      const id = String(snap.id).trim();
      const decorItems = getDecorItems();
      if (decorItems.has(id)) {
        return res.status(409).json({ ok: false, error: 'ID déjà présent' });
      }
      const item = { ...snap };
      delete item.storageSummary;
      item.updatedAt = Date.now();
      item.updatedBy = user.username;
      decorItems.set(id, item);
      worldPersist?.scheduleUpsertDecor(item);
      io.emit('decor-item-spawn', item);
      log.info('admin', 'decor restored', { id, by: user.username });
      res.json({ ok: true, item: adminDecorSnapshot(item) });
    });
  
    app.get('/api/admin/decor/:id', (req, res) => {
      const user = adminDecorAuth(req, res);
      if (!user) return;
      const id = String(req.params.id || '').trim();
      const item = getDecorItems().get(id);
      if (!item) return res.status(404).json({ ok: false, error: 'Décor introuvable' });
      res.json({
        ok: true,
        item: adminDecorSnapshot(item),
        editable: true,
        immutable: isDecorImmutable(item),
      });
    });
  
    app.patch('/api/admin/decor/:id', (req, res) => {
      const user = adminDecorAuth(req, res);
      if (!user) return;
      const id = String(req.params.id || '').trim();
      const decorItems = getDecorItems();
      const item = decorItems.get(id);
      if (!item) return res.status(404).json({ ok: false, error: 'Décor introuvable' });
      const patch = req.body?.patch || req.body || {};
      const changed = applyAdminDecorPatch(item, patch, user.username);
      const storageChanged = applyAdminDecorStoragePatch(item, patch);
      for (const k of storageChanged) {
        if (!changed.includes(k)) changed.push(k);
      }
      if (!changed.length) {
        return res.json({ ok: true, changed: [], item: adminDecorSnapshot(item), message: 'Aucun changement' });
      }
      if (item.prefabId?.startsWith('wreck_') && Number.isFinite(item.wreckTilt)) {
        item.rotZ = item.wreckTilt;
      }
      decorItems.set(id, item);
      worldPersist?.scheduleUpsertDecor(item);
      io.emit('decor-item-spawn', item);
      if (storageChanged.length) emitStorageUpdate(item);
      log.info('admin', 'decor patched', { id, changed, by: user.username });
      res.json({ ok: true, changed, item: adminDecorSnapshot(item) });
    });
  
    app.delete('/api/admin/decor/:id', (req, res) => {
      const user = adminDecorAuth(req, res, 'decor.delete');
      if (!user) return;
      const id = String(req.params.id || '').trim();
      const force = req.query.force === '1' || req.body?.force === true;
      const removed = removeDecorItem(id, { emit: true, force: force || true });
      if (!removed) return res.status(404).json({ ok: false, error: 'Décor introuvable ou non supprimable' });
      log.info('admin', 'decor deleted', { id, by: user.username });
      res.json({ ok: true, id });
    });
}

module.exports = { registerAdminDecorRoutes };
