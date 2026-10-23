'use strict';

/**
 * Boot serveur — persistance monde, reload backup, démarrage séquencé.
 */
function createWorldBoot(deps) {
  const {
    log,
    path,
    fs,
    pool,
    io,
    server,
    ROOT_DIR,
    BEACH_SPAWN,
    STARTING_SAVE,
    GIT_COMMIT,
    SERVER_ROLE,
    PORT,
    HOST,
    DB_CLIENT,
    USE_CLIENT_BUILD,
    INV_DEBUG_SERVER_BUILD,
    RCON_PASSWORD,
    OWNER_USERS,
    RCON_AUTO_ADMIN,
    ZOMBIE_COUNT,
    ensureWorldSchema,
    ensurePlayersGuestSchema,
    ensureAccountIdSchema,
    qaChecklist,
    worldPersist,
    adminRoadStore,
    getDecorItems,
    getStructures,
    getItems,
    getZombies,
    getSleepingPlayers,
    getDecorSeq,
    setDecorSeq,
    getStructureIdCounter,
    setStructureIdCounter,
    getItemIdCounter,
    setItemIdCounter,
    getDoorLockSeq,
    setDoorLockSeq,
    getZombieIdCounter,
    setZombieIdCounter,
    getWorldColliders,
    setWorldColliders,
    getWorldWaterZones,
    setWorldWaterZones,
    getLootBuildings,
    setLootBuildings,
    getWorldTime,
    setWorldTime,
    getStructureColliders,
    getServerReady,
    setServerReady,
    setBootPhase,
    decorStats,
    getClientVersion,
    createBootReport,
    initPlayerRoles,
    runWorldCleanSlateOnce,
    seedSpawnDecorItems,
    ensureRoadWrecks,
    ensureRoadBarriers,
    ensureCampRocks,
    ensureWorldRocks,
    ensureWorldTrees,
    ensureBeachPalms,
    ensureBeachSigns,
    ensureBeachProps,
    ensureBeachImmersion,
    ensureBeachIntroProps,
    ensureZombiePopulation,
    purgeFelledTreesFromWorld,
    purgeStaleIntroPersonalFromWorld,
    saveSleepingToDb,
    catchUpSleeperSurvival,
    isStaleWorldSleeper,
    getPlayer,
    deleteWorldSleeper,
    getPlayers,
    persistPlayer,
    getPlayerRoles,
  } = deps;

  async function resetAllPlayersOnce() {
    const marker = path.join(ROOT_DIR, '.beach_spawn_v3_east_edge');
    if (fs.existsSync(marker)) return;
    try {
      const [r] = await pool.execute(
        'UPDATE players SET inventory = ?, pos_x = ?, pos_y = ?, pos_z = ?, rot_y = ?, health = 100',
        [STARTING_SAVE, BEACH_SPAWN.x, BEACH_SPAWN.y, BEACH_SPAWN.z, BEACH_SPAWN.rotY],
      );
      fs.writeFileSync(marker, new Date().toISOString());
      log.info('boot', 'players reset to east-edge beach', { affected: r.affectedRows });
    } catch (e) {
      log.error('boot', 'player reset failed', { err: e.message });
    }
  }

  async function purgeStaleWorldSleepers() {
    let purged = 0;
    for (const [key, sleep] of [...getSleepingPlayers().entries()]) {
      if (!sleep?.username) continue;
      let savedRow = null;
      try {
        savedRow = await getPlayer(sleep.username);
      } catch {
        continue;
      }
      if (!isStaleWorldSleeper(sleep, savedRow)) continue;
      getSleepingPlayers().delete(key);
      try {
        await deleteWorldSleeper(String(key));
      } catch {}
      worldPersist?.scheduleDeleteSleeper?.(String(key));
      purged++;
      log.info('boot', 'stale sleeper purged', { user: sleep.username, key: String(key) });
    }
    return purged;
  }

  async function loadPersistedWorld() {
    await ensureWorldSchema();
    await ensurePlayersGuestSchema();
    await ensureAccountIdSchema();
    await qaChecklist.ensureSchema();
    const decorItems = getDecorItems();
    const loaded = await worldPersist.loadInto(
      decorItems,
      getStructures(),
      getItems(),
      getZombies(),
      getSleepingPlayers(),
    );
    await adminRoadStore.load();
    purgeFelledTreesFromWorld();
    purgeStaleIntroPersonalFromWorld();
    await purgeStaleWorldSleepers();
    for (const sleep of getSleepingPlayers().values()) {
      if (!sleep._survivalAtDisconnect && sleep.survival) {
        sleep._survivalAtDisconnect = { ...sleep.survival };
      }
      catchUpSleeperSurvival(sleep);
      saveSleepingToDb(sleep).catch(() => {});
    }
    setDecorSeq(Math.max(getDecorSeq(), loaded.decorSeq || 1));
    setStructureIdCounter(Math.max(getStructureIdCounter(), loaded.structureIdCounter || 0));
    setItemIdCounter(Math.max(getItemIdCounter(), loaded.itemIdCounter || 0));
    setDoorLockSeq(Math.max(getDoorLockSeq(), loaded.doorLockSeq || 0));
    setZombieIdCounter(Math.max(getZombieIdCounter(), loaded.zombieIdCounter || 0));
    if (Array.isArray(loaded.worldColliders) && loaded.worldColliders.length) {
      setWorldColliders(loaded.worldColliders);
    }
    if (Array.isArray(loaded.worldWaterZones) && loaded.worldWaterZones.length) {
      setWorldWaterZones(loaded.worldWaterZones);
    }
    if (Array.isArray(loaded.lootBuildings) && loaded.lootBuildings.length) {
      setLootBuildings(loaded.lootBuildings);
    }
    if (Number.isFinite(loaded.worldTime)) {
      setWorldTime(loaded.worldTime);
    }
    for (const st of getStructures().values()) {
      for (const c of st.colliders || []) {
        if (c.minY === undefined) getStructureColliders().push(c);
      }
    }
    log.info('boot', 'persisted world loaded', {
      decor: loaded.decorCount,
      structures: loaded.structureCount,
      groundItems: loaded.itemCount,
      zombies: loaded.zombieCount,
      sleepers: loaded.sleeperCount,
      removedSeeds: loaded.removedSeedKeys?.length || 0,
      decorSeq: getDecorSeq(),
      structureIdCounter: getStructureIdCounter(),
      itemIdCounter: getItemIdCounter(),
      zombieIdCounter: getZombieIdCounter(),
      worldColliders: getWorldColliders().length,
      lootBuildings: getLootBuildings().length,
    });
    return {
      decorCount: loaded.decorCount,
      structureCount: loaded.structureCount,
      itemCount: loaded.itemCount,
      zombieCount: loaded.zombieCount,
      sleeperCount: loaded.sleeperCount,
      removedSeeds: loaded.removedSeedKeys?.length || 0,
    };
  }

  async function reloadWorldFromDatabase(scope) {
    const kind = scope === 'full' ? 'full' : 'map';
    const decorItems = getDecorItems();
    if (kind === 'full' || kind === 'map') {
      decorItems.clear();
      getStructures().clear();
      getStructureColliders().length = 0;
    }
    if (kind === 'full') {
      getItems().clear();
      getZombies().clear();
      getSleepingPlayers().clear();
    }

    const loaded = await worldPersist.loadInto(
      decorItems,
      getStructures(),
      getItems(),
      getZombies(),
      getSleepingPlayers(),
    );
    await adminRoadStore.load();

    setDecorSeq(Math.max(1, loaded.decorSeq || 1));
    setStructureIdCounter(Math.max(0, loaded.structureIdCounter || 0));
    setItemIdCounter(Math.max(0, loaded.itemIdCounter || 0));
    setDoorLockSeq(Math.max(0, loaded.doorLockSeq || 0));
    setZombieIdCounter(Math.max(0, loaded.zombieIdCounter || 0));

    if (Array.isArray(loaded.worldColliders)) setWorldColliders(loaded.worldColliders);
    if (Array.isArray(loaded.worldWaterZones)) setWorldWaterZones(loaded.worldWaterZones);
    if (Array.isArray(loaded.lootBuildings)) setLootBuildings(loaded.lootBuildings);
    if (Number.isFinite(loaded.worldTime)) setWorldTime(loaded.worldTime);

    for (const st of getStructures().values()) {
      for (const c of st.colliders || []) {
        if (c.minY === undefined) getStructureColliders().push(c);
      }
    }

    io.emit('admin-roads-changed');
    io.emit('world-backup-restored', { kind, requiresReload: true });
    log.info('world', 'reloaded from backup', {
      kind,
      decor: loaded.decorCount,
      structures: loaded.structureCount,
    });
    return loaded;
  }

  async function startServer() {
    const boot = createBootReport(log);
    boot.banner({
      commit: GIT_COMMIT,
      serverRole: SERVER_ROLE,
      port: PORT,
      host: HOST,
      db: DB_CLIENT,
      sqlite: require('../db').pool?.path || undefined,
      logLevel: log.level,
      invDebugBuild: INV_DEBUG_SERVER_BUILD,
      owners: OWNER_USERS.size ? [...OWNER_USERS] : undefined,
      rconAutoAdmin: RCON_AUTO_ADMIN || undefined,
    });

    await boot.step('world_persist', () => { setBootPhase('world_persist', 1); return loadPersistedWorld(); });
    await boot.step('player_roles', initPlayerRoles);
    await boot.step('world_clean_slate', runWorldCleanSlateOnce);
    await boot.step('seed_spawn_decor', () => { setBootPhase('spawn_decor', 2); return seedSpawnDecorItems(); });
    await boot.step('road_wrecks', () => { setBootPhase('road_wrecks', 4); return ensureRoadWrecks(); });
    await boot.step('road_barriers', () => { setBootPhase('road_barriers', 6); return ensureRoadBarriers(); });
    await boot.step('camp_rocks', () => { setBootPhase('camp_rocks', 8); return ensureCampRocks(); });
    await boot.step('world_rocks', () => { setBootPhase('world_rocks', 10); return ensureWorldRocks(); });
    await boot.step('world_trees', () => { setBootPhase('world_trees', 12); return ensureWorldTrees(); });
    await boot.step('beach_palms', () => { setBootPhase('beach_palms', 13); return ensureBeachPalms(); });
    await boot.step('beach_signs', ensureBeachSigns);
    await boot.step('beach_props', ensureBeachProps);
    await boot.step('beach_immersion', ensureBeachImmersion);
    await boot.step('beach_intro_props', ensureBeachIntroProps);
    await boot.step('zombie_population', () => { setBootPhase('zombies', 14); return ensureZombiePopulation(); });

    boot.finish({
      decor: decorStats(),
      zombies: getZombies().size,
      zombieTarget: ZOMBIE_COUNT,
      groundItems: getItems().size,
      structures: getStructures().size,
      roles: getPlayerRoles()?.listAssignments?.()?.length ?? 0,
    });

    setBootPhase('listening', 15);
    server.listen(PORT, HOST, () => {
      setServerReady(true);
      const paths = log.getLogPaths();
      log.info('boot', 'server listening', {
        url: `http://localhost:${PORT}`,
        listen: `${HOST}:${PORT}`,
        serverRole: SERVER_ROLE,
        clientMode: USE_CLIENT_BUILD ? 'build/client' : 'apps/client',
        clientVersion: getClientVersion(),
        commit: GIT_COMMIT,
        db: require('../db').DB_CLIENT,
        sqlite: require('../db').pool.path || undefined,
        logLevel: log.level,
        logFile: paths.fileEnabled ? paths.session : null,
        logErrorFile: paths.fileEnabled ? paths.error : null,
        playerSnapshotMs: log.PLAYER_SNAPSHOT_MS,
        serverStatsMs: log.SERVER_STATS_MS,
        zombies: getZombies().size,
        zombieTarget: ZOMBIE_COUNT,
        rcon: !!(RCON_PASSWORD || OWNER_USERS.size),
        owners: OWNER_USERS.size,
        roles: getPlayerRoles()?.listAssignments?.()?.length ?? 0,
        decor: decorStats(),
        persistedDecor: [...getDecorItems().values()].filter((d) => worldPersist.shouldPersistDecor(d)).length,
        groundItems: getItems().size,
        structures: getStructures().size,
        uptimeMs: Math.round(process.uptime() * 1000),
      });
      resetAllPlayersOnce().then(() => log.info('boot', 'player reset check done'));
    }).on('error', (err) => {
      log.error('boot', 'server failed to start', { err: err.message });
      process.exit(1);
    });
  }

  function registerShutdownHandlers() {
    async function shutdownPersist() {
      try {
        await worldPersist.flushSync({
          decorSeq: getDecorSeq(),
          doorLockSeq: getDoorLockSeq(),
          structureIdCounter: getStructureIdCounter(),
          itemIdCounter: getItemIdCounter(),
          zombieIdCounter: getZombieIdCounter(),
          worldTime: getWorldTime(),
        });
      } catch (err) {
        log.error('world', 'shutdown persist failed', { err: err.message });
      }
    }

    for (const sig of ['SIGINT', 'SIGTERM']) {
      process.on(sig, async () => {
        log.info('boot', 'shutdown', { signal: sig });
        for (const p of getPlayers().values()) {
          if (p?.id) {
            try { await persistPlayer(p); } catch {}
          }
        }
        try {
          await shutdownPersist();
        } finally {
          process.exit(0);
        }
      });
    }
  }

  return {
    loadPersistedWorld,
    reloadWorldFromDatabase,
    startServer,
    registerShutdownHandlers,
  };
}

module.exports = { createWorldBoot };
