'use strict';

/** Sync monde client → serveur (colliders, eau, loot) — extrait de register-sockets.js (with deps) */
const WORLD_SYNC_HANDLERS = `
  // Le premier client transmet la géométrie de collision (murs, arbres, etc.).
  let _lastDecorColliderCount = 0;
  socket.on('world-colliders', (cols) => {
    if (!Array.isArray(cols)) return;
    const terrain = cols.filter((c) => c && c.minY === undefined && !c.decorId);
    if (worldColliders.length === 0 && terrain.length) {
      worldColliders = terrain;
      log.info('world', 'colliders loaded', { terrain: terrain.length, from: p.username });
      worldPersist?.scheduleWorldState?.({ worldColliders });
    }
  });

  socket.on('decor-prefab-registry', (payload) => {
    if (!payload || !Array.isArray(payload.ids)) return;
    if (payload.meta && typeof payload.meta === 'object') {
      for (const [id, meta] of Object.entries(payload.meta)) {
        if (!meta || typeof meta !== 'object') continue;
        clientDecorPrefabMeta[id] = { ...clientDecorPrefabMeta[id], ...meta };
      }
    }
    _reloadDecorPrefabCatalog(payload.ids)
      .then(({ ids }) => {
        log.info('world', 'decor prefab registry', { count: ids.length, from: p.username });
      })
      .catch((err) => log.error('world', 'decor prefab registry failed', { err: err.message }));
  });

  socket.on('world-water-zones', (zones) => {
    if (worldWaterZones.length === 0 && Array.isArray(zones)) {
      worldWaterZones = zones.filter(z =>
        z &&
        Number.isFinite(z.x) &&
        Number.isFinite(z.z) &&
        Number.isFinite(z.r)
      );
      log.info('world', 'water zones loaded', { count: worldWaterZones.length, from: p.username });
      worldPersist?.scheduleWorldState?.({ worldWaterZones });
    }
  });

  // Le premier client transmet l'empreinte des bâtiments → génération du loot.
  socket.on('loot-buildings', (list) => {
    if (lootBuildings.length === 0 && Array.isArray(list) && list.length) {
      lootBuildings = list.filter(b => b && typeof b.cx === 'number' && typeof b.cz === 'number');
      log.info('world', 'loot buildings loaded', { count: lootBuildings.length, from: p.username });
      worldPersist?.scheduleWorldState?.({ lootBuildings });
      if (serverFlags.lootEnabled && !_hasPersistedBuildingLoot()) generateLoot();
    }
  });
`;

module.exports = { WORLD_SYNC_HANDLERS };
