'use strict';

const { createGameState } = require('./game-state');
const { createSharedModImports } = require('./shared-mod-imports');
const {
  DEFAULT_SURVIVAL,
  STARTER_RATIONS,
  buildStartingSave,
  buildBenchSave,
} = require('./player-starter-kit');
const { createDecorQueryHelpers } = require('./decor-query');
const { createPlayerAuthSession } = require('./player-auth-session');
const { createWorldClock } = require('./world-clock');
const { createPlayerInteract } = require('./player-interact');
const { createBeachSpawn, BEACH_SPAWN } = require('./beach-spawn');
const { createPlayerSurvival } = require('./player-survival');
const { createPlayerInventory } = require('./player-inventory');
const { createGroundItems, GROUND_ITEM_TTL_MS } = require('./ground-items');
const { createDecorCore } = require('./decor-core');
const { createPlayerSleep } = require('./player-sleep');
const { createBuildingLoot, ALL_ITEMS } = require('./building-loot');
const { createPlayerCombat } = require('./player-combat');
const { createWorldSeed, getPlacementKey } = require('./world-seed');
const { createWorldWipe } = require('./world-wipe');
const { createZombieSpawn } = require('./zombie-spawn');
const { createScenarioRuntime } = require('./scenario-runtime');
const { createPlayerSession } = require('./player-session');
const { compactZombiesForSync: _compactZombiesForSync } = require('./zombie-sync');
const { createServerRcon } = require('../server-rcon');
const { createAuthPlayerLink } = require('../auth-player-link');
const { GUEST_PASSWORD_PLACEHOLDER } = require('../guest-players');
const { decorItemsForGameInit } = require('../decor-game-init');

/**
 * Instancie state + modules game (combat, décor, seed, zombies, RCON, session).
 */
function createGameStack(deps) {
  const {
    serverDir,
    io,
    log,
    db,
    worldPersist,
    savePlayerState,
    guestPlayers,
    guestCommitMs,
    getPlayerRoles,
    ownerUsers,
    rconAutoAdmin,
    zombieCount,
    rootDir,
    fs,
    path,
    createRcon,
    qaChecklist,
    sleeperPlayersTableSurvival,
    isQaServer,
    serverRole,
    invDebugBuild,
    isFelledTreeDecor,
    decorTreesBeyond,
    decorPropsBeyond,
    decorItemsNearPlayer,
    normalizeInv,
    ensureSlotGrid,
    cloneInv,
    wearInvTool,
    ensureChestGrid,
    flattenInv,
    countInvType,
    removeStackFromInv,
    addStackToInv,
  } = deps;

  const gs = createGameState(serverDir);
  const players = gs.players;
  const sleepingPlayers = gs.sleepingPlayers;
  const adminSockets = gs.adminSockets;
  const zombies = gs.zombies;
  const items = gs.items;
  const structures = gs.structures;
  const decorItems = gs.decorItems;
  const decorPrefabs = gs.decorPrefabs;
  const CLIENT_PUBLIC_JS = gs.clientPublicJs;
  const clientDecorPrefabMeta = gs.clientDecorPrefabMeta;
  const DECOR_PREFAB_BY_ITEM = gs.DECOR_PREFAB_BY_ITEM;
  const DOOR_PREFABS = gs.DOOR_PREFABS;
  const STORAGE_CHEST_CAPACITY = gs.STORAGE_CHEST_CAPACITY;
  const INTRO_SUITCASE_CAPACITY = gs.INTRO_SUITCASE_CAPACITY;
  const STORAGE_CHEST_BREAK_HITS = gs.STORAGE_CHEST_BREAK_HITS;
  const structureColliders = gs.structureColliders;
  let scenarioBeach = gs.scenarioBeach;

  const {
    normPlayerId: _normPlayerId,
    authPayload: _authPayload,
    hasPerm,
    takeoverLiveSession: _takeoverLiveSession,
    hasOnlineSession: _hasOnlineSession,
    devAccessPayload: _devAccessPayload,
    canAccessDevServer: _canAccessDevServer,
  } = createPlayerAuthSession({
    io,
    log,
    getPlayers: () => players,
    getAdminSockets: () => adminSockets,
    getPlayerRoles,
    ownerUsers,
    rconAutoAdmin,
  });

  const decorQuery = createDecorQueryHelpers(() => decorItems, {
    decorTreesBeyond,
    decorPropsBeyond,
    decorItemsNearPlayer,
  });

  const worldClock = createWorldClock({
    io,
    worldPersist,
    getPlayers: () => players,
    getWorldWaterZones: () => gs.worldWaterZones,
  });

  const playerInteract = createPlayerInteract({
    getDecorItems: () => decorItems,
    doorPrefabs: DOOR_PREFABS,
  });

  const mods = createSharedModImports(serverDir);
  const {
    urls: {
      TREE_WOOD_URL,
      ROCK_STONE_URL,
      BEACH_SPAWN_URL,
      SCENARIO_BEACH_URL,
      INTRO_BEATS_SHARED_URL,
    },
    combatModPromise,
    survivalModPromise,
    bedSleepModPromise,
    s01BuildModPromise,
    s01SafeModPromise,
    sectorBoundsModPromise,
    buildDamageModPromise,
    craftRecipesModPromise,
    weaponStatsModPromise,
    scenarioBeachModPromise,
    introBeachBeatsModPromise,
    groupsModPromise,
  } = mods;

  let _combatMod = null;
  let _survivalMod = null;
  let _weaponStatsMod = null;
  let _sectorBoundsMod = null;
  combatModPromise.then((m) => { _combatMod = m; });
  survivalModPromise.then((m) => { _survivalMod = m; });
  weaponStatsModPromise.then((m) => { _weaponStatsMod = m; }).catch(() => {});
  sectorBoundsModPromise.then((m) => { _sectorBoundsMod = m; });

  const beachSpawn = createBeachSpawn({
    getPlayers: () => players,
    getBeachSpawnMod: mods.getBeachSpawnMod,
    getS01BuildMod: mods.getS01BuildMod,
    getS01SafeMod: mods.getS01SafeMod,
  });

  const STARTING_SAVE = buildStartingSave();
  const BENCH_SAVE = buildBenchSave();

  const authPlayerLink = createAuthPlayerLink({
    db,
    log,
    introSpawn: beachSpawn.introBeachSpawn,
    startingSave: STARTING_SAVE,
    guestPasswordPlaceholder: GUEST_PASSWORD_PLACEHOLDER,
  });

  const playerSurvival = createPlayerSurvival({ normalizeInv });

  const playerInventory = createPlayerInventory({
    io,
    log,
    savePlayerState,
    guestPlayers,
    guestCommitMs,
    defaultSurvival: DEFAULT_SURVIVAL,
    introSuitcaseCapacity: INTRO_SUITCASE_CAPACITY,
    storageChestCapacity: STORAGE_CHEST_CAPACITY,
    starterRations: STARTER_RATIONS,
    getPlayers: () => players,
    cloneInv,
    wearInvTool,
    ensureChestGrid,
    ensureSlotGrid,
  });
  const _pendingInvAuth = playerInventory.getPendingInvAuth();

  const groundItems = createGroundItems({
    io,
    worldPersist,
    getItems: () => items,
    getPlayers: () => players,
    normPlayerId: _normPlayerId,
    getNextItemId: () => ++gs.itemIdCounter,
    groundItemTtlMs: GROUND_ITEM_TTL_MS,
  });

  const decorCore = createDecorCore({
    log,
    io,
    worldPersist,
    getDecorItems: () => decorItems,
    getItems: () => items,
    getNextDecorId: () => `decor_${gs.decorSeq++}`,
    removeGroundItem: groundItems.removeGroundItem,
    isFelledTreeDecor,
  });

  const playerSleep = createPlayerSleep({
    io,
    worldPersist,
    savePlayerState,
    defaultSurvival: DEFAULT_SURVIVAL,
    sleeperPlayersTableSurvival,
    getSleepingPlayers: () => sleepingPlayers,
    getPlayers: () => players,
    normPlayerId: _normPlayerId,
    isInS01SafeZone: beachSpawn.isInS01SafeZone,
    emitSurvivalUpdate: playerSurvival.emitSurvivalUpdate,
  });

  const buildingLoot = createBuildingLoot({
    log,
    getItems: () => items,
    getLootBuildings: () => gs.lootBuildings,
    addGroundItem: groundItems.addGroundItem,
    removeGroundItem: groundItems.removeGroundItem,
    getNextItemId: () => ++gs.itemIdCounter,
  });

  const playerCombat = createPlayerCombat({
    log,
    io,
    defaultSurvival: DEFAULT_SURVIVAL,
    groundItemTtlMs: GROUND_ITEM_TTL_MS,
    flattenInv,
    cloneInv,
    normalizeInv,
    normPlayerId: _normPlayerId,
    isOnBeachSafeSand: beachSpawn.isOnBeachSafeSand,
    wakeFromBedSleep: playerSleep.wakeFromBedSleep,
    emitSurvivalUpdate: playerSurvival.emitSurvivalUpdate,
    emitInvAuth: playerInventory.emitInvAuth,
    saveSleepingToDb: playerSleep.saveSleepingToDb,
    addGroundItem: groundItems.addGroundItem,
    dropWorldItem: groundItems.dropWorldItem,
    lootQty: buildingLoot.lootQty,
    getNextItemId: () => ++gs.itemIdCounter,
  });

  const craftOps = {
    countInvType,
    removeStackFromInv,
    addStackToInv,
  };

  let serverRcon = null;

  const worldSeed = createWorldSeed({
    log,
    getDecorItems: () => decorItems,
    worldPersist,
    getRcon: () => serverRcon?.getRcon() ?? null,
    removeDecorItem: decorCore.removeDecorItem,
    isDecorImmutable: decorCore.isDecorImmutable,
    isMinableRockPrefab: decorCore.isMinableRockPrefab,
    makeDecorItem: decorCore.makeDecorItem,
    treeWoodUrl: TREE_WOOD_URL,
    rockStoneUrl: ROCK_STONE_URL,
    s01BuildModPromise,
    s01SafeModPromise,
  });

  const worldWipe = createWorldWipe({
    log,
    path,
    fs,
    ROOT_DIR: rootDir,
    worldPersist,
    campPoiPrefabs: worldSeed.S01_CAMP_POI_PREFABS,
    getStructures: () => structures,
    getStructureColliders: () => structureColliders,
    getDecorItems: () => decorItems,
    getItems: () => items,
    removeDecorItem: decorCore.removeDecorItem,
    removeGroundItem: groundItems.removeGroundItem,
    isDecorImmutable: decorCore.isDecorImmutable,
    getPersistCounters: () => ({
      decorSeq: gs.decorSeq,
      structureIdCounter: gs.structureIdCounter,
      itemIdCounter: gs.itemIdCounter,
      zombieIdCounter: gs.zombieIdCounter,
      doorLockSeq: gs.doorLockSeq,
    }),
  });

  const zombieSpawn = createZombieSpawn({
    log,
    io,
    worldPersist,
    beachSpawn: BEACH_SPAWN,
    zombieCount,
    getPlayers: () => players,
    getZombies: () => zombies,
    getNextZombieId: () => ++gs.zombieIdCounter,
    isInS01SafeZone: beachSpawn.isInS01SafeZone,
    getSectorBoundsMod: () => _sectorBoundsMod,
    getWorldColliders: () => gs.worldColliders,
    getStructureColliders: () => structureColliders,
  });

  const scenarioRuntime = createScenarioRuntime({
    io,
    log,
    groupsModPromise,
    introBeachBeatsModPromise,
    scenarioBeachModPromise,
    getPlayers: () => players,
    getZombies: () => zombies,
    getItems: () => items,
    getDecorItems: () => decorItems,
    worldPersist,
    normPlayerId: _normPlayerId,
    makeZombie: zombieSpawn.makeZombie,
    compactZombiesForSync: _compactZombiesForSync,
    addGroundItem: groundItems.addGroundItem,
    removeGroundItem: groundItems.removeGroundItem,
    makeDecorItem: decorCore.makeDecorItem,
    removeDecorItem: decorCore.removeDecorItem,
    addStackToInv,
    emitInvAuth: playerInventory.emitInvAuth,
    getNextItemId: () => ++gs.itemIdCounter,
    snapIntroPlayerToCluster: beachSpawn.snapIntroPlayerToCluster,
    clearIntroInventory: playerInventory.clearIntroInventory,
  });

  async function getScenarioBeach() {
    const sc = await scenarioRuntime.getScenarioBeach();
    gs.scenarioBeach = sc;
    scenarioBeach = sc;
    return sc;
  }

  serverRcon = createServerRcon({
    createRcon,
    log,
    clientPublicJs: CLIENT_PUBLIC_JS,
    clientDecorPrefabMeta,
    getDecorPrefabs: () => decorPrefabs,
    setDecorPrefabIds: (ids) => { decorPrefabs.splice(0, decorPrefabs.length, ...ids); },
    setDecorPrefabCatalogCache: (cache) => { gs.decorPrefabCatalogCache = cache; },
    getScenarioBeach,
    getRconContext: () => ({
      io,
      players,
      zombies,
      items,
      structures,
      decorItems,
      decorPrefabs,
      serverFlags: worldClock.serverFlags,
      worldColliders: () => gs.worldColliders,
      lootBuildings: () => gs.lootBuildings,
      worldWaterZones: () => gs.worldWaterZones,
      getWorldTime: worldClock.getWorldTime,
      setWorldTime: worldClock.setWorldTime,
      makeZombie: zombieSpawn.makeZombie,
      loadZombiePrefabs: zombieSpawn.loadZombiePrefabs,
      ensureZombiePopulation: zombieSpawn.ensureZombiePopulation,
      listZombiePrefabIds: zombieSpawn.listZombiePrefabIds,
      getZombiePrefab: zombieSpawn.getZombiePrefab,
      savePlayerState,
      saveBlob: playerInventory.saveBlob,
      generateLoot: buildingLoot.generateLoot,
      clearLoot: buildingLoot.clearLoot,
      makeDecorItemId: () => `decor_${gs.decorSeq++}`,
      persistDecorUpsert: (item) => worldPersist.scheduleUpsertDecor(item),
      persistDecorDelete: (id, item) => worldPersist.scheduleDeleteDecor(id, item),
      ensureRoadWrecks: worldSeed.ensureRoadWrecks,
      ensureRoadBarriers: worldSeed.ensureRoadBarriers,
      ensureWorldTrees: worldSeed.ensureWorldTrees,
      ensureBeachPalms: worldSeed.ensureBeachPalms,
      ensureBeachSigns: worldSeed.ensureBeachSigns,
      ensureBeachProps: worldSeed.ensureBeachProps,
      ensureBeachImmersion: worldSeed.ensureBeachImmersion,
      ensureBeachIntroProps: worldSeed.ensureBeachIntroProps,
      ensureS01World: worldSeed.ensureS01World,
      wipePlayerWorld: worldWipe.wipePlayerWorld,
      isDecorImmutable: decorCore.isDecorImmutable,
      ensureCampRocks: worldSeed.ensureCampRocks,
      ensureWorldRocks: worldSeed.ensureWorldRocks,
      itemTypes: ALL_ITEMS,
      addStackToInv,
      cloneInv,
      handlePlayerDeath: playerCombat.handlePlayerDeath,
      emitSurvivalUpdate: (target) => {
        const sock = io.sockets.sockets.get(target.socketId);
        if (sock) playerSurvival.emitSurvivalUpdate(sock, target);
      },
      qaChecklist,
    }),
  });

  const playerSession = createPlayerSession({
    normPlayerId: _normPlayerId,
    sleepBodyId: playerSleep.sleepBodyId,
    ensureSlotGrid,
    cloneInv,
    authPayload: _authPayload,
    decorItemsForGameInit,
    getDecorItems: () => decorItems,
    getPlayers: () => players,
    getItems: () => items,
    getZombies: () => zombies,
    getStructures: () => structures,
    getSleepingPlayers: () => sleepingPlayers,
    getWorldTime: worldClock.getWorldTime,
    getServerFlags: () => worldClock.serverFlags,
    isQaServer,
    serverRole,
    guestCommitMs,
    invDebugBuild,
    getWorldColliders: () => gs.worldColliders,
  });

  function flushPersistCounters() {
    return {
      decorSeq: gs.decorSeq,
      structureIdCounter: gs.structureIdCounter,
      itemIdCounter: gs.itemIdCounter,
      zombieIdCounter: gs.zombieIdCounter,
      doorLockSeq: gs.doorLockSeq,
    };
  }

  return {
    gs,
    players,
    sleepingPlayers,
    adminSockets,
    zombies,
    items,
    structures,
    decorItems,
    decorPrefabs,
    structureColliders,
    scenarioBeach: () => scenarioBeach,
    setScenarioBeach: (v) => { scenarioBeach = v; gs.scenarioBeach = v; },
    CLIENT_PUBLIC_JS,
    clientDecorPrefabMeta,
    DECOR_PREFAB_BY_ITEM,
    DOOR_PREFABS,
    STORAGE_CHEST_BREAK_HITS,
    STARTING_SAVE,
    BENCH_SAVE,
    authPlayerLink,
    hasPerm,
    authPayload: _authPayload,
    devAccessPayload: _devAccessPayload,
    canAccessDevServer: _canAccessDevServer,
    takeoverLiveSession: _takeoverLiveSession,
    hasOnlineSession: _hasOnlineSession,
    normPlayerId: _normPlayerId,
    decorQuery,
    worldClock,
    playerInteract,
    mods,
    lazyMods: {
      get combat() { return _combatMod; },
      get survival() { return _survivalMod; },
      get weaponStats() { return _weaponStatsMod; },
      get sectorBounds() { return _sectorBoundsMod; },
    },
    beachSpawn,
    playerSurvival,
    playerInventory,
    groundItems,
    decorCore,
    playerSleep,
    buildingLoot,
    playerCombat,
    craftOps,
    worldSeed,
    worldWipe,
    zombieSpawn,
    scenarioRuntime,
    getScenarioBeach,
    serverRcon,
    playerSession,
    pendingInvAuth: _pendingInvAuth,
    urls: {
      TREE_WOOD_URL,
      ROCK_STONE_URL,
      BEACH_SPAWN_URL,
      SCENARIO_BEACH_URL,
      INTRO_BEATS_SHARED_URL,
    },
    modPromises: {
      combatModPromise,
      survivalModPromise,
      bedSleepModPromise,
      buildDamageModPromise,
      craftRecipesModPromise,
      weaponStatsModPromise,
      itemEffectsModPromise: playerSurvival.itemEffectsModPromise,
    },
    flushPersistCounters,
    getPlacementKey: (d) => getPlacementKey(d, decorCore.isMinableRockPrefab),
    reloadDecorPrefabCatalog: (...args) => serverRcon.reloadDecorPrefabCatalog(...args),
    bootScenario: () => {
      getScenarioBeach().catch((err) => log.error('boot', 'scenario beach init failed', { err: err.message }));
      serverRcon.startRconBoot();
    },
  };
}

module.exports = { createGameStack };
