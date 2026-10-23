'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

const DECOR_PREFAB_CATALOG_URL = pathToFileURL(
  path.join(__dirname, '../../../packages/shared/src/decor-prefab-catalog.mjs'),
).href;

/**
 * Catalog prefabs décor + init RCON (après discovery client JS).
 */
function createServerRcon(deps) {
  const {
    createRcon,
    log,
    clientPublicJs,
    clientDecorPrefabMeta,
    getDecorPrefabs,
    setDecorPrefabIds,
    setDecorPrefabCatalogCache,
    getScenarioBeach,
    getRconContext,
  } = deps;
  let rcon = null;

  async function reloadDecorPrefabCatalog(extraIds = []) {
    const mod = await import(DECOR_PREFAB_CATALOG_URL);
    const discovered = mod.discoverDecorPrefabIds(clientPublicJs);
    const ids = [...new Set([...discovered, ...extraIds, ...getDecorPrefabs()])].sort();
    setDecorPrefabIds(ids);
    const catalog = mod.buildDecorPrefabCatalog(ids, clientDecorPrefabMeta);
    setDecorPrefabCatalogCache(catalog);
    return { ids, catalog };
  }

  function initRcon() {
    const ctx = getRconContext();
    rcon = createRcon({
      io: ctx.io,
      players: ctx.players,
      zombies: ctx.zombies,
      items: ctx.items,
      structures: ctx.structures,
      decorItems: ctx.decorItems,
      decorPrefabs: ctx.decorPrefabs,
      flags: ctx.serverFlags,
      worldColliders: ctx.worldColliders,
      lootBuildings: ctx.lootBuildings,
      worldWaterZones: ctx.worldWaterZones,
      getWorldTime: ctx.getWorldTime,
      setWorldTime: ctx.setWorldTime,
      makeZombie: ctx.makeZombie,
      loadZombiePrefabs: ctx.loadZombiePrefabs,
      ensureZombiePopulation: ctx.ensureZombiePopulation,
      listZombiePrefabs: ctx.listZombiePrefabIds,
      getZombiePrefab: ctx.getZombiePrefab,
      savePlayerState: ctx.savePlayerState,
      saveBlob: ctx.saveBlob,
      generateLoot: ctx.generateLoot,
      clearLoot: ctx.clearLoot,
      makeDecorItemId: ctx.makeDecorItemId,
      persistDecorUpsert: ctx.persistDecorUpsert,
      persistDecorDelete: ctx.persistDecorDelete,
      ensureRoadWrecks: ctx.ensureRoadWrecks,
      ensureRoadBarriers: ctx.ensureRoadBarriers,
      ensureWorldTrees: ctx.ensureWorldTrees,
      ensureBeachPalms: ctx.ensureBeachPalms,
      ensureBeachSigns: ctx.ensureBeachSigns,
      ensureBeachProps: ctx.ensureBeachProps,
      ensureBeachImmersion: ctx.ensureBeachImmersion,
      ensureBeachIntroProps: ctx.ensureBeachIntroProps,
      ensureS01World: ctx.ensureS01World,
      wipePlayerWorld: ctx.wipePlayerWorld,
      isDecorImmutable: ctx.isDecorImmutable,
      ensureCampRocks: ctx.ensureCampRocks,
      ensureWorldRocks: ctx.ensureWorldRocks,
      itemTypes: ctx.itemTypes,
      addStackToInv: ctx.addStackToInv,
      cloneInv: ctx.cloneInv,
      handlePlayerDeath: ctx.handlePlayerDeath,
      resetPlayerScenario: async (target, sock) => {
        const sc = await getScenarioBeach();
        sc.resetScenario(target, sock);
      },
      emitSurvivalUpdate: ctx.emitSurvivalUpdate,
      qaChecklist: ctx.qaChecklist,
      log,
    });
    return rcon;
  }

  function startRconBoot() {
    reloadDecorPrefabCatalog()
      .then(({ ids }) => {
        initRcon();
        log.info('boot', 'decor prefab catalog', { count: ids.length, source: 'client-js-discovery' });
      })
      .catch((err) => {
        log.error('boot', 'decor prefab catalog load failed — RCON prefabs vides', { err: err.message });
        initRcon();
      });
  }

  return {
    reloadDecorPrefabCatalog,
    initRcon,
    startRconBoot,
    getRcon: () => rcon,
  };
}

module.exports = { createServerRcon };
