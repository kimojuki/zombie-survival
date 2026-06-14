'use strict';

/** Carte admin monde + POI — extrait de admin-routes.js */
function registerAdminMapRoutes(env) {
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

  app.get('/api/admin/world-map', async (req, res) => {
      const user = adminAuthAny(req, res, ['world.map', 'decor.edit']);
      if (!user) return;
      try {
        const [staticMod, poisMod] = await Promise.all([
          import(ADMIN_MAP_STATIC_URL),
          import(ADMIN_MAP_POIS_URL),
        ]);
        const staticData = staticMod.getAdminMapStaticData();
        const decorItems = getDecorItems();
        const decor = Array.from(decorItems.values()).map(marker);
        const seedPlacements = poisMod.computeAdminMapSeedPlacements?.() || [];
        const pois = poisMod.buildAdminMapPois({
          decor,
          seedPlacements,
          designLandmarks: staticData.designLandmarks || [],
        });
        const online = [];
        for (const p of getPlayers().values()) {
          online.push({
            id: p.id,
            username: p.username,
            x: p.x,
            z: p.z,
            y: p.y,
            health: p.health,
            rotY: p.rotY,
          });
        }
        const byLayer = {};
        for (const d of decor) byLayer[d.layer] = (byLayer[d.layer] || 0) + 1;
        res.json({
          ok: true,
          world: staticData.world,
          sectors: staticData.sectors,
          roads: staticData.roads,
          gates: staticData.gates,
          pois,
          decor,
          players: online,
          waterZones: getWorldWaterZones(),
          lootBuildings: getLootBuildings(),
          stats: {
            decor: decor.length,
            players: online.length,
            byLayer,
          },
          updatedAt: Date.now(),
        });
      } catch (err) {
        log.error('admin', 'world-map failed', { err: err.message });
        res.status(500).json({ ok: false, error: 'Erreur serveur' });
      }
    });
}

module.exports = { registerAdminMapRoutes };
