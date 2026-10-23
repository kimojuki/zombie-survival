'use strict';

/**
 * Wipe constructions joueur — RCON worldwipe + boot clean slate (une fois).
 */
function createWorldWipe(deps) {
  const {
    log,
    path,
    fs,
    ROOT_DIR,
    worldPersist,
    campPoiPrefabs,
    getStructures,
    getStructureColliders,
    getDecorItems,
    getItems,
    removeDecorItem,
    removeGroundItem,
    isDecorImmutable,
    getPersistCounters,
  } = deps;

  /**
   * @param {object} opts
   * @param {boolean} [opts.broadcast=true] sync clients
   * @param {boolean} [opts.allPlayerDecor=false] tout décor non-seed non-immuable (decoradd admin)
   * @param {boolean} [opts.groundItems=false] loot / drops au sol
   * @param {boolean} [opts.persist=true] flush SQLite immédiat
   */
  async function wipePlayerWorld({
    broadcast = true,
    allPlayerDecor = false,
    groundItems = false,
    persist = true,
  } = {}) {
    const structures = getStructures();
    const structureColliders = getStructureColliders();
    const decorItems = getDecorItems();
    const items = getItems();
    let decorN = 0;
    let structN = 0;
    let groundN = 0;

    for (const [id] of [...structures.entries()]) {
      structures.delete(id);
      worldPersist?.scheduleDeleteStructure?.(id);
      structN++;
    }
    structureColliders.length = 0;

    for (const [id, d] of [...decorItems.entries()]) {
      if (isDecorImmutable(d)) continue;
      const pid = d.prefabId || '';
      const pk = String(d.placementKey || '');
      if (pk.startsWith('s01:')) continue;
      const isPlayerWood = pid.startsWith('build_') && pid.endsWith('_wood');
      const isCampPoi = campPoiPrefabs.has(pid);
      const isPlayerChest = pid === 'storage_chest' && d.createdBy !== 'seed';
      const isManualDecor = allPlayerDecor && d.createdBy !== 'seed';
      if (!isPlayerWood && !isCampPoi && !isPlayerChest && !isManualDecor) continue;
      removeDecorItem(id, { emit: broadcast, force: true });
      decorN++;
    }

    if (groundItems) {
      for (const [id] of [...items.entries()]) {
        removeGroundItem(id, { emit: broadcast });
        groundN++;
      }
    }

    if (persist) {
      await worldPersist.flushSync?.(getPersistCounters());
    }

    if (decorN || structN || groundN) {
      log.info('world', 'player world wiped', { decor: decorN, structures: structN, ground: groundN });
    }
    return { decor: decorN, structures: structN, ground: groundN };
  }

  async function runWorldCleanSlateOnce() {
    const marker = path.join(ROOT_DIR, '.world_clean_slate_20260608');
    if (fs.existsSync(marker)) return { skipped: true };
    await wipePlayerWorld({ broadcast: false, persist: true });
    fs.writeFileSync(marker, new Date().toISOString());
    log.info('boot', 'world clean slate applied (player builds + camp POI)');
    return { skipped: false };
  }

  return { wipePlayerWorld, runWorldCleanSlateOnce };
}

module.exports = { createWorldWipe };
