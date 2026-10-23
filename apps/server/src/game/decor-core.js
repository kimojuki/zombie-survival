'use strict';

const { seedDecorId, getPlacementKey } = require('./world-seed');

const STORAGE_PREFABS = new Set(['storage_chest', 'spawn_beach_starter_suitcase']);

const TREE_WOOD_FALLBACK = { tree_oak: 8, tree_pine: 10, tree_birch: 6, tree_dead: 3, tree_palm: 6 };
const TREE_WOOD_RATIO = [0.1, 0.28, 0.5, 0.78, 1.0];
const ROCK_STONE_FALLBACK = { rock_boulder: 20, rock_outcrop: 14, spawn_stone: 8 };

function treeWoodForPhase(prefabId, phase) {
  const p = Math.max(0, Math.min(4, Math.floor(phase ?? 4)));
  const adult = TREE_WOOD_FALLBACK[prefabId] ?? 6;
  return Math.max(1, Math.floor(adult * TREE_WOOD_RATIO[p]));
}

function isMinableRockPrefab(prefabId) {
  return prefabId === 'spawn_stone' || prefabId?.startsWith('rock_');
}

function isDecorImmutable(item) {
  if (!item) return false;
  if (item.immutable === true) return true;
  const key = item.placementKey || '';
  return typeof key === 'string' && key.startsWith('s01:');
}

/**
 * CRUD décor monde — prefabs seed/joueur, arbres, rochers, purge boot.
 */
function createDecorCore(deps) {
  const {
    log,
    io,
    worldPersist,
    getDecorItems,
    getItems,
    getNextDecorId,
    removeGroundItem,
    isFelledTreeDecor,
  } = deps;

  function applyTreeFields(item) {
    if (!item.prefabId?.startsWith('tree_')) return;
    const isRegen = item.regen || item.zoneId === 'regen_tree';
    if (item.growthPhase == null) item.growthPhase = isRegen ? 0 : 4;
    if (item.plantedAt == null) item.plantedAt = item.createdAt || Date.now();
    if (item.woodMax == null) item.woodMax = treeWoodForPhase(item.prefabId, item.growthPhase);
    if (item.woodRemaining == null) item.woodRemaining = item.woodMax;
  }

  function decorStats() {
    const list = Array.from(getDecorItems().values());
    return {
      total: list.length,
      trees: list.filter((d) => d.prefabId?.startsWith('tree_') && d.prefabId !== 'tree_palm').length,
      palms: list.filter((d) => d.prefabId === 'tree_palm').length,
      worldRocks: list.filter((d) => isMinableRockPrefab(d.prefabId) && !d.anchorId).length,
      campRocks: list.filter((d) => isMinableRockPrefab(d.prefabId) && d.anchorId).length,
    };
  }

  function touchDecorItem(item) {
    if (item) worldPersist?.scheduleUpsertDecor(item);
  }

  function removeDecorItem(id, { emit = true, force = false, markRemoved = true, keepInMemory = false } = {}) {
    const decorItems = getDecorItems();
    const item = decorItems.get(id);
    if (!item) return false;
    if (!force && isDecorImmutable(item)) return false;
    worldPersist?.scheduleDeleteDecor(id, item, { markRemoved });
    if (!keepInMemory) decorItems.delete(id);
    if (emit) io.emit('decor-item-remove', id);
    return true;
  }

  function makeDecorItem(d) {
    const placementKey = getPlacementKey(d, isMinableRockPrefab) || d.placementKey || null;
    const id = d.id || (placementKey ? seedDecorId(placementKey) : getNextDecorId());
    const item = {
      y: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scale: 1,
      createdBy: 'seed',
      createdAt: Date.now(),
      ...d,
      id,
      placementKey,
    };
    if (!item.kind) {
      if (item.prefabId) item.kind = 'prefab';
      else if (item.type) item.kind = 'item';
    }
    if (STORAGE_PREFABS.has(item.prefabId) && !Array.isArray(item.storage)) {
      item.storage = [];
      item.storageOpen = !!item.storageOpen;
    }
    if (item.prefabId?.startsWith('tree_')) {
      applyTreeFields(item);
    }
    if (isMinableRockPrefab(item.prefabId) && item.stoneMax == null) {
      item.stoneMax = ROCK_STONE_FALLBACK[item.prefabId] ?? 10;
      if (item.stoneRemaining == null) item.stoneRemaining = item.stoneMax;
    }
    if (item.prefabId?.startsWith('build_') && item.prefabId.endsWith('_wood')) {
      if (item.buildDamage == null) item.buildDamage = 0;
      if (item.buildMaxHp == null) item.buildMaxHp = 100;
    }
    const decorItems = getDecorItems();
    decorItems.set(item.id, item);
    worldPersist?.scheduleUpsertDecor(item);
    return item;
  }

  function purgeFelledTreesFromWorld() {
    const decorItems = getDecorItems();
    let n = 0;
    for (const [id, d] of [...decorItems.entries()]) {
      if (!isFelledTreeDecor(d)) continue;
      removeDecorItem(id, { emit: false, force: true });
      n++;
    }
    if (n) log.info('world', 'felled trees purged on load', { count: n });
    return n;
  }

  function purgeStaleIntroPersonalFromWorld() {
    let ground = 0;
    let decor = 0;
    for (const [id, it] of [...getItems().entries()]) {
      if (!it?.introPersonal) continue;
      removeGroundItem(id, { emit: false });
      ground++;
    }
    for (const [id, d] of [...getDecorItems().entries()]) {
      if (!d?.introPersonal) continue;
      removeDecorItem(id, { emit: false, force: true });
      decor++;
    }
    if (ground || decor) {
      log.info('boot', 'intro personal purged on load', { ground, decor });
    }
    return ground + decor;
  }

  return {
    isDecorImmutable,
    isMinableRockPrefab,
    decorStats,
    touchDecorItem,
    removeDecorItem,
    makeDecorItem,
    purgeFelledTreesFromWorld,
    purgeStaleIntroPersonalFromWorld,
    treeWoodForPhase,
  };
}

module.exports = {
  createDecorCore,
  STORAGE_PREFABS,
  isMinableRockPrefab,
  isDecorImmutable,
  treeWoodForPhase,
};
