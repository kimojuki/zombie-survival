'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

const SHARED = path.join(__dirname, '../../../../packages/shared/src');
const url = (name) => pathToFileURL(path.join(SHARED, name)).href;

const ROAD_WRECKS_URL = url('road-wrecks.mjs');
const ROAD_BARRIERS_URL = url('road-barriers.mjs');
const TREE_PLACEMENTS_URL = url('tree-placements.mjs');
const PALM_PLACEMENTS_URL = url('palm-placements.mjs');
const BEACH_SIGN_PLACEMENTS_URL = url('beach-sign-placements.mjs');
const BEACH_PROP_PLACEMENTS_URL = url('beach-prop-placements.mjs');
const BEACH_IMMERSION_PLACEMENTS_URL = url('beach-immersion-placements.mjs');
const BEACH_INTRO_PLACEMENTS_URL = url('beach-intro-placements.mjs');
const S01_WORLD_PLACEMENTS_URL = url('s01-world-placements.mjs');
const ROCK_PLACEMENTS_URL = url('rock-placements.mjs');
const RESOURCE_SPAWN_URL = url('resource-spawn.mjs');

/** Prefabs campement / POI S01 — retirés pour repartir sur map propre. */
const S01_CAMP_POI_PREFABS = new Set([
  's01_gas_station',
  's01_military_tent',
  'building_survivor_shack',
  'spawn_campfire',
  'spawn_workbench',
  'spawn_bedroll',
  'spawn_lean_to',
  'spawn_backpack',
  'spawn_supply_crate',
]);

function seedDecorId(placementKey) {
  if (!placementKey) return null;
  const safe = String(placementKey).replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 88);
  return `seed_${safe}`;
}

function getPlacementKey(d, isMinableRockPrefab) {
  if (!d) return null;
  if (d.placementKey) return String(d.placementKey);
  if (d.anchorId) return `anchor:${d.anchorId}`;
  if (d.prefabId?.startsWith('tree_') && d.zoneId != null && d.treeSeed != null) {
    return `tree:${d.zoneId}:${d.treeSeed}`;
  }
  if (isMinableRockPrefab(d.prefabId) && d.zoneId != null && d.rockSeed != null) {
    return `rock:${d.zoneId}:${d.rockSeed}`;
  }
  return null;
}

/**
 * Seed décor monde — épaves, plage, arbres, rochers, S01.
 */
function createWorldSeed(deps) {
  const {
    log,
    getDecorItems,
    worldPersist,
    getRcon,
    removeDecorItem,
    isDecorImmutable,
    isMinableRockPrefab,
    makeDecorItem,
    treeWoodUrl,
    rockStoneUrl,
    s01BuildModPromise,
    s01SafeModPromise,
  } = deps;

  function shouldSkipSeedPlacement(placementKey) {
    if (!placementKey) return false;
    if (worldPersist?.isSeedRemoved?.(placementKey)) return true;
    const id = seedDecorId(placementKey);
    const decorItems = getDecorItems();
    return !!(id && decorItems.has(id));
  }

  function trySeedDecor(placement, extra = {}) {
    const merged = { ...placement, ...extra };
    const placementKey = getPlacementKey(merged, isMinableRockPrefab);
    if (placementKey && shouldSkipSeedPlacement(placementKey)) return null;
    const id = placementKey ? seedDecorId(placementKey) : null;
    return makeDecorItem({ ...merged, placementKey, ...(id ? { id } : {}) });
  }

  function broadcastAdded(added, broadcast) {
    if (!added.length) return;
    const rcon = getRcon();
    if (broadcast && rcon?.broadcastDecorSpawn) {
      for (const item of added) rcon.broadcastDecorSpawn(item);
    }
  }

  /** Ajoute les épaves routières si absentes (boot ou RCON decorseed wrecks). */
  function ensureRoadWrecks({ broadcast = false, reset = false } = {}) {
    const decorItems = getDecorItems();
    if (reset) {
      for (const [id, d] of decorItems) {
        if (!d.prefabId?.startsWith('wreck_')) continue;
        removeDecorItem(id, { emit: broadcast });
      }
    }
    return import(ROAD_WRECKS_URL).then(({ computeRoadWreckPlacements }) => {
      const added = [];
      for (const w of computeRoadWreckPlacements()) {
        const item = trySeedDecor(w);
        if (item) added.push(item);
      }
      if (added.length) log.info('seed', 'road wrecks added', { count: added.length });
      broadcastAdded(added, broadcast);
      return added.length;
    });
  }

  /** Barrières routières prefab — seed serveur (boot ou RCON decorseed barriers). */
  function ensureRoadBarriers({ broadcast = false, reset = false } = {}) {
    const decorItems = getDecorItems();
    if (reset) {
      for (const [id, d] of decorItems) {
        if (!d.prefabId?.startsWith('road_barrier_')) continue;
        removeDecorItem(id, { emit: broadcast });
      }
    }
    return import(ROAD_BARRIERS_URL).then(({ computeRoadBarrierPlacements }) => {
      const added = [];
      for (const b of computeRoadBarrierPlacements()) {
        const item = trySeedDecor(b);
        if (item) added.push(item);
      }
      if (added.length) log.info('seed', 'road barriers added', { count: added.length });
      broadcastAdded(added, broadcast);
      return added.length;
    });
  }

  /** Ajoute les arbres prefab forêt si absents (boot ou RCON decorseed trees). */
  function ensureWorldTrees({ broadcast = false, reset = false } = {}) {
    const decorItems = getDecorItems();
    if (reset) {
      for (const [id, d] of decorItems) {
        if (!d.prefabId?.startsWith('tree_') || d.prefabId === 'tree_palm') continue;
        removeDecorItem(id, { emit: broadcast });
      }
    }
    return import(TREE_PLACEMENTS_URL).then(({ computeTreePlacements }) =>
      import(treeWoodUrl).then(({ getTreeWoodMax }) => {
        const added = [];
        for (const t of computeTreePlacements()) {
          const woodMax = getTreeWoodMax(t.prefabId);
          const item = trySeedDecor(t, { woodMax, woodRemaining: woodMax });
          if (item) added.push(item);
        }
        if (added.length) log.info('seed', 'world trees added', { count: added.length });
        broadcastAdded(added, broadcast);
        return added.length;
      }));
  }

  /** Panneau sortie plage — seed initial + RCON decorseed signs. */
  function ensureBeachSigns({ broadcast = false, reset = false } = {}) {
    const decorItems = getDecorItems();
    if (reset) {
      for (const [id, d] of decorItems) {
        if (d.prefabId !== 'sign_beach_exit' && d.prefabId !== 'beach_exit_torch') continue;
        removeDecorItem(id, { emit: broadcast });
      }
    }
    return import(BEACH_SIGN_PLACEMENTS_URL).then(({ computeBeachSignPlacements }) => {
      const added = [];
      for (const p of computeBeachSignPlacements()) {
        const item = trySeedDecor(p);
        if (item) added.push(item);
      }
      if (added.length) log.info('seed', 'beach signs added', { count: added.length });
      broadcastAdded(added, broadcast);
      return added.length;
    });
  }

  /** Piste intro v3 (empreintes, bouteille, feu, ponton) — seed initial. */
  function ensureBeachIntroProps({ broadcast = false, reset = false } = {}) {
    const decorItems = getDecorItems();
    if (reset) {
      for (const [id, d] of decorItems) {
        if (d.zoneId !== 'beach_intro_v3') continue;
        removeDecorItem(id, { emit: broadcast });
      }
    }
    return import(BEACH_INTRO_PLACEMENTS_URL).then(({ computeBeachIntroPlacements, isBeachIntroPlacementValid }) => {
      const added = [];
      for (const p of computeBeachIntroPlacements()) {
        if (!isBeachIntroPlacementValid(p)) {
          log.warn('seed', 'beach intro prop skipped', { placementKey: p.placementKey, x: p.x, z: p.z });
          continue;
        }
        const item = trySeedDecor(p);
        if (item) added.push(item);
      }
      if (added.length) log.info('seed', 'beach intro props added', { count: added.length });
      broadcastAdded(added, broadcast);
      return added.length;
    });
  }

  /** Décor plage immersion (4 scènes loisirs / rivage) — seed initial + RCON decorseed beach. */
  function ensureBeachImmersion({ broadcast = false, reset = false } = {}) {
    const decorItems = getDecorItems();
    if (reset) {
      for (const [id, d] of decorItems) {
        if (d.zoneId !== 'beach_immersion_v1') continue;
        removeDecorItem(id, { emit: broadcast });
      }
    }
    return import(BEACH_IMMERSION_PLACEMENTS_URL).then(({ computeBeachImmersionPlacements, isBeachImmersionPlacementValid }) => {
      const added = [];
      for (const p of computeBeachImmersionPlacements()) {
        if (!isBeachImmersionPlacementValid(p)) {
          log.warn('seed', 'beach immersion prop skipped', {
            placementKey: p.placementKey,
            x: p.x,
            z: p.z,
          });
          continue;
        }
        const item = trySeedDecor(p);
        if (item) added.push(item);
      }
      if (added.length) log.info('seed', 'beach immersion props added', { count: added.length });
      broadcastAdded(added, broadcast);
      return added.length;
    });
  }

  /** Props narratifs plage (naufrage, affaires…) — seed initial + RCON decorseed beach. */
  function ensureBeachProps({ broadcast = false, reset = false } = {}) {
    const decorItems = getDecorItems();
    if (reset) {
      for (const [id, d] of decorItems) {
        if (d.zoneId !== 'beach_spawn_props') continue;
        removeDecorItem(id, { emit: broadcast });
      }
    }
    return import(BEACH_PROP_PLACEMENTS_URL).then(({ computeBeachPropPlacements, isBeachPropPlacementValid }) => {
      const added = [];
      for (const p of computeBeachPropPlacements()) {
        if (!isBeachPropPlacementValid(p)) {
          log.warn('seed', 'beach prop skipped (invalid placement)', {
            placementKey: p.placementKey,
            x: p.x,
            z: p.z,
          });
          continue;
        }
        const item = trySeedDecor(p);
        if (item) added.push(item);
      }
      if (added.length) log.info('seed', 'beach props added', { count: added.length });
      broadcastAdded(added, broadcast);
      return added.length;
    });
  }

  /** Palmiers plage — seed initial + RCON decorseed palms. */
  function ensureBeachPalms({ broadcast = false, reset = false } = {}) {
    const decorItems = getDecorItems();
    if (reset) {
      for (const [id, d] of decorItems) {
        if (d.prefabId !== 'tree_palm') continue;
        removeDecorItem(id, { emit: broadcast });
      }
    }
    return import(PALM_PLACEMENTS_URL).then(({ computePalmPlacements }) =>
      import(treeWoodUrl).then(({ getTreeWoodMax }) => {
        const added = [];
        for (const p of computePalmPlacements()) {
          const woodMax = getTreeWoodMax(p.prefabId);
          const item = trySeedDecor(p, { woodMax, woodRemaining: woodMax });
          if (item) added.push(item);
        }
        if (added.length) log.info('seed', 'beach palms added', { count: added.length });
        broadcastAdded(added, broadcast);
        return added.length;
      }));
  }

  /** Rochers fixes au spawn — ancres stables, complétées si manquantes. */
  function ensureCampRocks({ broadcast = false, reset = false } = {}) {
    const decorItems = getDecorItems();
    if (reset) {
      for (const [id, d] of decorItems) {
        if (!d.anchorId) continue;
        if (!isMinableRockPrefab(d.prefabId)) continue;
        removeDecorItem(id, { emit: broadcast });
      }
    }
    return import(ROCK_PLACEMENTS_URL).then(({ computeCampRockAnchors, rockPlacementKey }) =>
      import(rockStoneUrl).then(({ getRockStoneMax }) =>
        import(RESOURCE_SPAWN_URL).then(({ isRockAnchorClear }) => {
          const occupied = Array.from(decorItems.values());
          const added = [];
          for (const r of computeCampRockAnchors()) {
            const placementKey = rockPlacementKey(r);
            if (shouldSkipSeedPlacement(placementKey)) continue;
            const scale = Number.isFinite(r.scale) ? r.scale : 1.4;
            if (!isRockAnchorClear(r.x, r.z, occupied, { minGap: 2.8, rockScale: scale })) {
              log.warn('seed', 'camp rock anchor skipped (overlap)', {
                anchorId: r.anchorId,
                x: r.x,
                z: r.z,
              });
              continue;
            }
            const stoneMax = getRockStoneMax(r.prefabId);
            const item = trySeedDecor({ ...r, placementKey }, { stoneMax, stoneRemaining: stoneMax });
            if (!item) continue;
            occupied.push(item);
            added.push(item);
          }
          if (added.length) log.info('seed', 'camp rocks added', { count: added.length });
          broadcastAdded(added, broadcast);
          return added.length;
        })));
  }

  /** Ajoute les rochers minables (boot ou RCON decorseed rocks). */
  function ensureWorldRocks({ broadcast = false, reset = false, force = false } = {}) {
    const decorItems = getDecorItems();
    if (reset || force) {
      for (const [id, d] of decorItems) {
        if (d.anchorId) continue;
        if (!isMinableRockPrefab(d.prefabId)) continue;
        removeDecorItem(id, { emit: broadcast });
      }
    }
    return import(ROCK_PLACEMENTS_URL).then(({ rockPlacementKey }) =>
      import(rockStoneUrl).then(({ getRockStoneMax }) =>
        import(RESOURCE_SPAWN_URL).then(({ seedWorldRockPlacements, countWorldRocks, REGEN_CONFIG }) => {
          const occupied = Array.from(decorItems.values());
          const existing = countWorldRocks(occupied);
          const need = (reset || force)
            ? REGEN_CONFIG.rockTargetWorld
            : Math.max(0, REGEN_CONFIG.rockTargetWorld - existing);
          if (need <= 0) return 0;
          const added = [];
          for (const r of seedWorldRockPlacements(occupied, { target: need })) {
            const placementKey = rockPlacementKey(r);
            if (shouldSkipSeedPlacement(placementKey)) continue;
            const stoneMax = getRockStoneMax(r.prefabId);
            const item = trySeedDecor({ ...r, placementKey }, { stoneMax, stoneRemaining: stoneMax });
            if (!item) continue;
            occupied.push(item);
            added.push(item);
          }
          if (added.length) {
            log.info('seed', 'world rocks added', { count: added.length, target: REGEN_CONFIG.rockTargetWorld });
            broadcastAdded(added, broadcast);
          } else if (need > 0) {
            log.error('seed', 'world rocks FAILED — 0 placement', {
              need,
              occupied: occupied.length,
              existing,
            });
          }
          return added.length;
        })));
  }

  /** Supprime les arbres forêt dans les zones de dégagement bâtiments S01. */
  function clearTreesInZones(zones, { broadcast = false } = {}) {
    if (!zones?.length) return 0;
    const decorItems = getDecorItems();
    let n = 0;
    for (const [id, d] of [...decorItems.entries()]) {
      const pid = d.prefabId || '';
      if (!pid.startsWith('tree_') || pid === 'tree_palm') continue;
      for (const zone of zones) {
        if (Math.hypot(d.x - zone.cx, d.z - zone.cz) < zone.r) {
          if (removeDecorItem(id, { emit: broadcast })) n++;
          break;
        }
      }
    }
    if (n) log.info('seed', 'trees cleared for S01 buildings', { count: n });
    return n;
  }

  /** Retire tout decor seed S01 persisté (station, cabanes, pont, hub…). */
  function purgeAllS01Decor({ broadcast = false, reseed = false } = {}) {
    const decorItems = getDecorItems();
    let n = 0;
    for (const [id, d] of [...decorItems.entries()]) {
      const pk = String(d.placementKey || '');
      const isS01Key = pk.startsWith('s01:');
      const isS01Prefab = S01_CAMP_POI_PREFABS.has(d.prefabId);
      if (!isS01Key && !isS01Prefab) continue;
      removeDecorItem(id, { emit: broadcast, force: true, markRemoved: !reseed });
      n++;
    }
    if (n) log.info('seed', 's01 decor purged', { count: n, reseed });
    return n;
  }

  /** POI forêt S01 — seed initial + complément après persistance. */
  function ensureS01World({ broadcast = false, reset = false } = {}) {
    const decorItems = getDecorItems();
    purgeAllS01Decor({ broadcast, reseed: true });
    if (reset) {
      for (const [id, d] of decorItems) {
        if (!isDecorImmutable(d)) continue;
        removeDecorItem(id, { emit: broadcast, force: true });
      }
    }
    return Promise.all([s01BuildModPromise, s01SafeModPromise]).then(() =>
      import(S01_WORLD_PLACEMENTS_URL).then(({ computeS01DecorPlacements, computeS01TreeClearZones }) => {
        const placements = computeS01DecorPlacements();
        const clearZones = computeS01TreeClearZones();
        for (const p of placements) {
          if (p.placementKey) worldPersist?.unmarkSeed?.(p.placementKey);
        }
        const added = [];
        for (const p of placements) {
          const item = trySeedDecor(p);
          if (item) added.push(item);
        }
        clearTreesInZones(clearZones, { broadcast });
        if (added.length) log.info('seed', 's01 world added', { count: added.length });
        broadcastAdded(added, broadcast);
        return added.length;
      }));
  }

  function seedSpawnDecorItems() {
    return ensureS01World();
  }

  return {
    S01_CAMP_POI_PREFABS,
    ensureRoadWrecks,
    ensureRoadBarriers,
    ensureWorldTrees,
    ensureBeachSigns,
    ensureBeachIntroProps,
    ensureBeachImmersion,
    ensureBeachProps,
    ensureBeachPalms,
    ensureCampRocks,
    ensureWorldRocks,
    ensureS01World,
    seedSpawnDecorItems,
  };
}

module.exports = { createWorldSeed, seedDecorId, getPlacementKey, S01_CAMP_POI_PREFABS };
