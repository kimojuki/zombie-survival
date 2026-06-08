'use strict';

/** Prefabs posés par les joueurs (liste de référence pour docs / RCON). */
const PLAYER_BUILD_PREFABS = new Set([
  'storage_chest',
  'build_wall_wood',
  'build_doorway_wood',
  'build_large_doorway_wood',
  'build_floor_wood',
  'build_ceiling_wood',
  'build_stair_wood',
  'build_door_wood',
  'build_large_door_wood',
]);

/** Toute entité décor avec id est persistée sauf opt-out explicite. */
function shouldPersistDecor(item) {
  if (!item?.id) return false;
  if (item.persist === false) return false;
  return true;
}

/** Objet ramassable au sol (loot bâtiment, drop joueur, butin de mort non expiré). */
function shouldPersistGroundItem(item) {
  if (!item?.id) return false;
  if (item.expiresAt && Date.now() > item.expiresAt) return false;
  return !!item.type;
}

function createWorldPersist(db, log) {
  const pendingDecorUpserts = new Map();
  const pendingDecorDeletes = new Set();
  const pendingStructUpserts = new Map();
  const pendingStructDeletes = new Set();
  const pendingItemUpserts = new Map();
  const pendingItemDeletes = new Set();
  const pendingZombieUpserts = new Map();
  const pendingZombieDeletes = new Set();
  const pendingSleeperUpserts = new Map();
  const pendingSleeperDeletes = new Set();
  let removedSeedKeys = new Set();
  let pendingMeta = {};
  let flushTimer = null;
  const FLUSH_MS = 500;

  function markSeedRemoved(placementKey) {
    if (!placementKey) return;
    removedSeedKeys.add(String(placementKey));
    pendingMeta.removedSeedKeys = [...removedSeedKeys];
    queueFlush();
  }

  function unmarkSeed(placementKey) {
    if (!placementKey) return;
    const key = String(placementKey);
    if (!removedSeedKeys.delete(key)) return;
    pendingMeta.removedSeedKeys = [...removedSeedKeys];
    queueFlush();
  }

  function isSeedRemoved(placementKey) {
    if (!placementKey) return false;
    return removedSeedKeys.has(String(placementKey));
  }

  function scheduleUpsertDecor(item) {
    if (!shouldPersistDecor(item)) return;
    pendingDecorDeletes.delete(item.id);
    pendingDecorUpserts.set(item.id, item);
    queueFlush();
  }

  function scheduleDeleteDecor(id, item, opts = {}) {
    const known = item || pendingDecorUpserts.get(id);
    if (known && !shouldPersistDecor(known)) return;
    if (opts.markRemoved !== false && known?.placementKey) markSeedRemoved(known.placementKey);
    pendingDecorUpserts.delete(id);
    pendingDecorDeletes.add(id);
    queueFlush();
  }

  function scheduleUpsertStructure(st) {
    if (!st?.id) return;
    pendingStructDeletes.delete(st.id);
    pendingStructUpserts.set(st.id, st);
    queueFlush();
  }

  function scheduleDeleteStructure(id) {
    pendingStructUpserts.delete(id);
    pendingStructDeletes.add(id);
    queueFlush();
  }

  function scheduleUpsertItem(item) {
    if (!shouldPersistGroundItem(item)) return;
    pendingItemDeletes.delete(item.id);
    pendingItemUpserts.set(item.id, item);
    queueFlush();
  }

  function scheduleDeleteItem(id, item) {
    const known = item || pendingItemUpserts.get(id);
    if (known && !shouldPersistGroundItem(known)) return;
    pendingItemUpserts.delete(id);
    pendingItemDeletes.add(id);
    queueFlush();
  }

  function scheduleUpsertZombie(z) {
    if (!z?.id) return;
    pendingZombieDeletes.delete(z.id);
    pendingZombieUpserts.set(z.id, z);
    queueFlush();
  }

  function scheduleDeleteZombie(id) {
    pendingZombieUpserts.delete(id);
    pendingZombieDeletes.add(id);
    queueFlush();
  }

  function scheduleUpsertSleeper(sleep) {
    const pid = sleep?.playerId;
    if (!pid) return;
    pendingSleeperDeletes.delete(pid);
    pendingSleeperUpserts.set(pid, sleep);
    queueFlush();
  }

  function scheduleDeleteSleeper(playerId) {
    pendingSleeperUpserts.delete(playerId);
    pendingSleeperDeletes.add(playerId);
    queueFlush();
  }

  function scheduleWorldState(patch) {
    pendingMeta = { ...pendingMeta, ...patch };
    queueFlush();
  }

  function queueFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush().catch((err) => log.error('world', 'persist flush failed', { err: err.message }));
    }, FLUSH_MS);
  }

  async function flush(meta = {}) {
    for (const id of pendingDecorDeletes) {
      await db.deleteWorldDecor(id);
    }
    pendingDecorDeletes.clear();

    for (const [id, item] of pendingDecorUpserts) {
      await db.upsertWorldDecor(id, JSON.stringify(item), item.createdBy || null);
    }
    pendingDecorUpserts.clear();

    for (const id of pendingStructDeletes) {
      await db.deleteWorldStructure(id);
    }
    pendingStructDeletes.clear();

    for (const [, st] of pendingStructUpserts) {
      await db.upsertWorldStructure(st.id, JSON.stringify(st));
    }
    pendingStructUpserts.clear();

    for (const id of pendingItemDeletes) {
      await db.deleteWorldItem(id);
    }
    pendingItemDeletes.clear();

    for (const [id, item] of pendingItemUpserts) {
      await db.upsertWorldItem(id, JSON.stringify(item));
    }
    pendingItemUpserts.clear();

    for (const id of pendingZombieDeletes) {
      await db.deleteWorldZombie(id);
    }
    pendingZombieDeletes.clear();

    for (const [, z] of pendingZombieUpserts) {
      await db.upsertWorldZombie(z.id, JSON.stringify(z));
    }
    pendingZombieUpserts.clear();

    for (const pid of pendingSleeperDeletes) {
      await db.deleteWorldSleeper(pid);
    }
    pendingSleeperDeletes.clear();

    for (const [, sleep] of pendingSleeperUpserts) {
      await db.upsertWorldSleeper(sleep.playerId, JSON.stringify(sleep));
    }
    pendingSleeperUpserts.clear();

    const mergedMeta = { ...pendingMeta, ...meta };
    pendingMeta = {};
    if (mergedMeta.removedSeedKeys) {
      await db.setWorldMeta('removedSeedKeys', JSON.stringify(mergedMeta.removedSeedKeys));
    }
    if (mergedMeta.worldColliders != null) {
      await db.setWorldMeta('worldColliders', JSON.stringify(mergedMeta.worldColliders));
    }
    if (mergedMeta.worldWaterZones != null) {
      await db.setWorldMeta('worldWaterZones', JSON.stringify(mergedMeta.worldWaterZones));
    }
    if (mergedMeta.lootBuildings != null) {
      await db.setWorldMeta('lootBuildings', JSON.stringify(mergedMeta.lootBuildings));
    }
    if (mergedMeta.worldTime != null) {
      await db.setWorldMeta('worldTime', String(mergedMeta.worldTime));
    }

    if (meta.decorSeq != null) await db.setWorldMeta('decorSeq', String(meta.decorSeq));
    if (meta.doorLockSeq != null) await db.setWorldMeta('doorLockSeq', String(meta.doorLockSeq));
    if (meta.structureIdCounter != null) {
      await db.setWorldMeta('structureIdCounter', String(meta.structureIdCounter));
    }
    if (meta.itemIdCounter != null) {
      await db.setWorldMeta('itemIdCounter', String(meta.itemIdCounter));
    }
    if (meta.zombieIdCounter != null) {
      await db.setWorldMeta('zombieIdCounter', String(meta.zombieIdCounter));
    }
    if (meta.worldTime != null) {
      await db.setWorldMeta('worldTime', String(meta.worldTime));
    }
  }

  async function flushSync(meta) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await flush(meta);
  }

  async function loadInto(decorItems, structures, groundItems, zombies, sleepingPlayers) {
    const rows = await db.loadAllWorldDecor();
    let maxDecorSeq = 1;
    for (const row of rows) {
      let item;
      try {
        item = JSON.parse(row.payload);
      } catch {
        continue;
      }
      if (!item?.id) continue;
      decorItems.set(item.id, item);
      const m = /^decor_(\d+)$/.exec(item.id);
      if (m) maxDecorSeq = Math.max(maxDecorSeq, parseInt(m[1], 10) + 1);
    }

    const structRows = await db.loadAllWorldStructures();
    let maxStructId = 0;
    for (const row of structRows) {
      let st;
      try {
        st = JSON.parse(row.payload);
      } catch {
        continue;
      }
      if (!st?.id) continue;
      structures.set(st.id, st);
      maxStructId = Math.max(maxStructId, Number(st.id) || 0);
    }

    const itemRows = await db.loadAllWorldItems();
    let maxItemId = 0;
    let itemCount = 0;
    for (const row of itemRows) {
      let item;
      try {
        item = JSON.parse(row.payload);
      } catch {
        continue;
      }
      if (!item?.id) continue;
      if (item.expiresAt && Date.now() > item.expiresAt) {
        await db.deleteWorldItem(item.id);
        continue;
      }
      groundItems.set(item.id, item);
      maxItemId = Math.max(maxItemId, Number(item.id) || 0);
      itemCount++;
    }

    let zombieCount = 0;
    let maxZombieId = 0;
    if (zombies && db.loadAllWorldZombies) {
      const zombieRows = await db.loadAllWorldZombies();
      for (const row of zombieRows) {
        let z;
        try {
          z = JSON.parse(row.payload);
        } catch {
          continue;
        }
        if (!z?.id) continue;
        zombies.set(z.id, z);
        maxZombieId = Math.max(maxZombieId, Number(z.id) || 0);
        zombieCount++;
      }
    }

    let sleeperCount = 0;
    if (sleepingPlayers && db.loadAllWorldSleepers) {
      const sleeperRows = await db.loadAllWorldSleepers();
      for (const row of sleeperRows) {
        let sleep;
        try {
          sleep = JSON.parse(row.payload);
        } catch {
          continue;
        }
        if (!sleep?.playerId) continue;
        const pid = Number(sleep.playerId);
        if (Number.isFinite(pid)) sleep.playerId = pid;
        sleepingPlayers.set(sleep.playerId, sleep);
        sleeperCount++;
      }
    }

    const storedDecorSeq = parseInt(await db.getWorldMeta('decorSeq'), 10);
    if (Number.isFinite(storedDecorSeq)) maxDecorSeq = Math.max(maxDecorSeq, storedDecorSeq);

    const storedStructId = parseInt(await db.getWorldMeta('structureIdCounter'), 10);
    if (Number.isFinite(storedStructId)) maxStructId = Math.max(maxStructId, storedStructId);

    const storedItemId = parseInt(await db.getWorldMeta('itemIdCounter'), 10);
    if (Number.isFinite(storedItemId)) maxItemId = Math.max(maxItemId, storedItemId);

    const storedDoorLockSeq = parseInt(await db.getWorldMeta('doorLockSeq'), 10);
    const storedZombieId = parseInt(await db.getWorldMeta('zombieIdCounter'), 10);
    if (Number.isFinite(storedZombieId)) maxZombieId = Math.max(maxZombieId, storedZombieId);

    try {
      const rawRemoved = await db.getWorldMeta('removedSeedKeys');
      if (rawRemoved) {
        const arr = JSON.parse(rawRemoved);
        if (Array.isArray(arr)) removedSeedKeys = new Set(arr.map(String));
      }
    } catch {
      removedSeedKeys = new Set();
    }

    let worldColliders = null;
    let worldWaterZones = null;
    let lootBuildings = null;
    let worldTime = null;
    try {
      const rawCols = await db.getWorldMeta('worldColliders');
      if (rawCols) worldColliders = JSON.parse(rawCols);
    } catch { /* ignore */ }
    try {
      const rawWater = await db.getWorldMeta('worldWaterZones');
      if (rawWater) worldWaterZones = JSON.parse(rawWater);
    } catch { /* ignore */ }
    try {
      const rawLoot = await db.getWorldMeta('lootBuildings');
      if (rawLoot) lootBuildings = JSON.parse(rawLoot);
    } catch { /* ignore */ }
    try {
      const rawTime = await db.getWorldMeta('worldTime');
      if (rawTime != null && rawTime !== '') worldTime = parseFloat(rawTime);
    } catch { /* ignore */ }

    return {
      decorCount: rows.length,
      structureCount: structRows.length,
      itemCount,
      zombieCount,
      sleeperCount,
      decorSeq: maxDecorSeq,
      structureIdCounter: maxStructId,
      itemIdCounter: maxItemId,
      doorLockSeq: Number.isFinite(storedDoorLockSeq) ? storedDoorLockSeq : 0,
      zombieIdCounter: maxZombieId,
      removedSeedKeys: [...removedSeedKeys],
      worldColliders,
      worldWaterZones,
      lootBuildings,
      worldTime,
    };
  }

  return {
    shouldPersistDecor,
    shouldPersistGroundItem,
    markSeedRemoved,
    unmarkSeed,
    isSeedRemoved,
    scheduleUpsertDecor,
    scheduleDeleteDecor,
    scheduleUpsertStructure,
    scheduleDeleteStructure,
    scheduleUpsertItem,
    scheduleDeleteItem,
    scheduleUpsertZombie,
    scheduleDeleteZombie,
    scheduleUpsertSleeper,
    scheduleDeleteSleeper,
    scheduleWorldState,
    loadInto,
    flushSync,
    queueFlush,
  };
}

module.exports = {
  createWorldPersist,
  shouldPersistDecor,
  shouldPersistGroundItem,
  PLAYER_BUILD_PREFABS,
};
