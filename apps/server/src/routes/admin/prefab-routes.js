'use strict';

/** Catalogue prefabs + reviews — extrait de admin-routes.js */
function registerAdminPrefabRoutes(env) {
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

  app.get('/api/admin/prefab-catalog', async (req, res) => {
      const user = adminAuthAny(req, res, ['prefab.catalog', 'decor.edit']);
      if (!user) return;
      try {
        const mod = await import(DECOR_PREFAB_CATALOG_URL);
        const catalog = getDecorPrefabCatalogCache();
        if (!catalog.length) await reloadDecorPrefabCatalog();
        const reviewSnap = await prefabCatalogReviews.getPrefabCatalogReviewSnapshot();
        const { getPrefabReviewStatus } = await import(PREFAB_CATALOG_REVIEWS_URL);
        const prefabs = catalog.map((p) => ({
          ...p,
          reviewStatus: getPrefabReviewStatus(reviewSnap.reviews, p.id),
          reviewComment: reviewSnap.reworkDetails?.[p.id]?.comment || null,
        }));
        res.json({
          ok: true,
          prefabs,
          categories: mod.DECOR_PREFAB_CATEGORIES,
          count: prefabs.length,
          autoDiscovered: true,
          reviews: reviewSnap.reviews,
          reworkList: reviewSnap.reworkList,
          reworkDetails: reviewSnap.reworkDetails,
          validatedList: reviewSnap.validatedList,
        });
      } catch (err) {
        log.error('admin', 'prefab catalog failed', { err: err.message });
        res.status(500).json({ ok: false, error: 'Erreur serveur' });
      }
    });
  
    app.put('/api/admin/prefab-catalog/review', async (req, res) => {
      const user = adminAuth(req, res, 'prefab.catalog');
      if (!user) return;
      const prefabId = String(req.body?.prefabId || req.body?.id || '').trim();
      if (!prefabId) return res.status(400).json({ ok: false, error: 'prefabId requis' });
      let status = req.body?.status;
      if (status === '' || status === 'none' || status === 'pending') status = null;
      if (status != null && status !== 'validated' && status !== 'rework') {
        return res.status(400).json({ ok: false, error: 'status invalide (validated | rework | null)' });
      }
      const comment = req.body?.comment != null ? String(req.body.comment) : undefined;
      try {
        const catalog = getDecorPrefabCatalogCache();
        if (!catalog.length) await reloadDecorPrefabCatalog();
        const known = catalog.some((p) => p.id === prefabId);
        if (!known) return res.status(404).json({ ok: false, error: 'Prefab inconnu du catalogue' });
        const result = await prefabCatalogReviews.setPrefabCatalogReview(prefabId, status, user.username, comment);
        log.info('admin', 'prefab review', { prefabId, status: result.status, by: user.username });
        res.json(result);
      } catch (err) {
        if (err.code === 'REVIEW_INVALID') {
          return res.status(400).json({ ok: false, error: err.message });
        }
        log.error('admin', 'prefab review failed', { err: err.message, prefabId });
        res.status(500).json({ ok: false, error: 'Erreur serveur' });
      }
    });
}

module.exports = { registerAdminPrefabRoutes };
