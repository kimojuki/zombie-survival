'use strict';

/** Bootstrap joueur à la connexion — extrait de register-sockets.js (with deps) */
const CONNECTION_BOOTSTRAP = `
io.on('connection', async (socket) => {
  // Load saved state from DB
  let saved = null;
  try { saved = await getPlayer(socket.user.username); } catch {}

  // Décompose la sauvegarde (objets + survie) ; position restaurée depuis la DB.
  let _save = {};
  try { _save = typeof saved?.inventory === 'string' ? JSON.parse(saved.inventory) : (saved?.inventory || {}); } catch {}
  const _survival = (_save && _save.survival) ? _save.survival : { ...DEFAULT_SURVIVAL };
  if (_save && !Array.isArray(_save)) delete _save.survival;

  const userId = _normPlayerId(socket.user.id);
  const liveSession = _takeoverLiveSession(userId, socket.id);

  let priorSleep = _getSleepingPlayer(userId);
  if (priorSleep && isStaleWorldSleeper(priorSleep, saved)) {
    log.info('socket', 'stale sleeper ignored on connect', { user: socket.user.username });
    sleepingPlayers.delete(_sleeperKey(userId));
    deleteWorldSleeper(String(_sleeperKey(userId))).catch(() => {});
    worldPersist?.scheduleDeleteSleeper?.(_sleeperKey(userId));
    priorSleep = null;
  }
  const killedWhileOffline = !!(priorSleep && (priorSleep.dead || priorSleep.health <= 0));
  const wokeFromSleep = !!priorSleep && !killedWhileOffline;
  if (priorSleep && !killedWhileOffline) {
    catchUpSleeperSurvival(priorSleep);
  }
  if (priorSleep) {
    if (killedWhileOffline) _spawnDeathBagFromSleeper(priorSleep);
    sleepingPlayers.delete(_sleeperKey(userId));
    deleteWorldSleeper(String(_sleeperKey(userId))).catch(() => {});
    worldPersist?.scheduleDeleteSleeper?.(_sleeperKey(userId));
    if (killedWhileOffline) {
      io.emit('sleeper-removed', { playerId: _normPlayerId(userId) });
    } else {
      io.emit('player-wake', { playerId: _sleeperKey(userId) });
    }
  }

  const restore = killedWhileOffline ? null : (liveSession || priorSleep || null);
  const hasLiveRestore = !!restore;
  const connectHealth = resolveConnectHealthFlags({
    killedWhileOffline,
    hasLiveRestore,
    savedHealth: saved?.health,
  });
  const forceBeachRespawn = connectHealth.forceBeachRespawn;
  const dbId = saved?.id != null ? _normPlayerId(saved.id) : userId;
  // Réveil depuis le corps endormi : inventaire du sleeper (post-fouille), pas la DB players.
  const wakeInv = wokeFromSleep ? _cloneInv(priorSleep.inv) : null;
  const respawnKit = forceBeachRespawn ? JSON.parse(JSON.stringify(STARTING_ITEMS)) : null;
  const freshBeachSpawn = (!restore && !forceBeachRespawn
    && (saved?.pos_x == null || saved?.pos_y == null || saved?.pos_z == null))
    ? _introBeachSpawn(socket.id) : null;
  const beachRespawnSpawn = forceBeachRespawn ? _randomBeachSpawn(socket.id) : null;
  const p = {
    socketId: socket.id,
    id: dbId,
    username: socket.user.username,
    x: beachRespawnSpawn?.x ?? (restore?.x ?? ((saved && saved.pos_x != null) ? saved.pos_x : (freshBeachSpawn?.x ?? BEACH_SPAWN.x))),
    y: beachRespawnSpawn?.y ?? (restore?.y ?? ((saved && saved.pos_y != null) ? saved.pos_y : (freshBeachSpawn?.y ?? BEACH_SPAWN.y))),
    z: beachRespawnSpawn?.z ?? (restore?.z ?? ((saved && saved.pos_z != null) ? saved.pos_z : (freshBeachSpawn?.z ?? BEACH_SPAWN.z))),
    rotY: beachRespawnSpawn?.rotY ?? (restore?.rotY ?? ((saved && saved.rot_y != null) ? saved.rot_y : (freshBeachSpawn?.rotY ?? BEACH_SPAWN.rotY))),
    health: connectHealthValue({ forceBeachRespawn, restore, saved, wokeFromSleep }),
    kills:  restore?.kills ?? saved?.kills ?? 0,
    inv: respawnKit ?? wakeInv ?? (restore ? _cloneInv(restore.inv) : _save),
    survival: resolveConnectSurvival({
      forceBeachRespawn,
      restore,
      dbSurvival: _survival,
      wokeFromSleep,
      defaultSurvival: DEFAULT_SURVIVAL,
    }),
    equipped: forceBeachRespawn ? null : (restore?.equipped ?? null),
    dirty: true,
    invincible: true,
    posSynced: forceBeachRespawn,
    connectedAt: Date.now(),
    anchorX: 0,
    anchorY: 0,
    anchorZ: 0,
    _killedWhileOffline: killedWhileOffline,
    _respawnReason: connectHealth.respawnReason,
  };
  p.anchorX = p.x;
  p.anchorY = p.y;
  p.anchorZ = p.z;
  p.guest = !!(socket.user.guest || saved?.is_guest);
  p.guestCommitted = !!(socket.user.guestCommitted || saved?.guest_committed);
  p.guestPlaytimeMs = 0;
  p.guestSessionStart = Date.now();
  p._guestLastTick = Date.now();
  _initLifeStats(p, forceBeachRespawn ? null : restore);
  if (forceBeachRespawn) _resetLifeStats(p);
  if (restore?._deathHandled && p.health <= 0) {
    p._deathHandled = true;
    p._deathInv = restore._deathInv ? _cloneInv(restore._deathInv) : undefined;
    p._deathPos = restore._deathPos ? { ...restore._deathPos } : undefined;
    p._deathEquipped = restore._deathEquipped ?? null;
  }
  const scenMod = await _getScenarioBeach();
  scenMod.initPlayerScenario(p, _save);
  const { shouldResetIntroInventoryOnConnect, stripLegacyIntroKit } = await import(INTRO_BEATS_SHARED_URL);
  if (!scenMod.isAct1Done(p.inv.scenario) && !wokeFromSleep && !forceBeachRespawn) {
    if (shouldResetIntroInventoryOnConnect(p.inv.scenario, p.inv)) {
      const _sc = p.inv.scenario;
      p.inv = _cloneInv(EMPTY_PLAYER_INV);
      p.inv.scenario = _sc;
      p.dirty = true;
    } else if (stripLegacyIntroKit(p.inv, p.inv.scenario)) {
      p.dirty = true;
    }
  }
  scenMod.ensureTutorialZombie(p, socket);
  if (!scenMod.isAct1Done(p.inv.scenario)) {
    _snapIntroPlayerToCluster(p);
    ensureBeachIntroProps({ broadcast: players.size > 0 }).catch((err) => {
      log.error('ensureBeachIntroProps on connect failed', err);
    });
    (await _getIntroBeachBeats()).ensure(p, socket);
  }
  const _invBeforeMigrate = _invDebugSnapshot(p.inv, _normalizeInv);
  _ensureSlotGrid(p.inv);
  const _invAfterMigrate = _invDebugSnapshot(p.inv, _normalizeInv);
  if (JSON.stringify(_invBeforeMigrate.food) !== JSON.stringify(_invAfterMigrate.food)
    || _invBeforeMigrate.hotbar.some((s, i) => s.type !== _invAfterMigrate.hotbar[i]?.type)) {
    p.dirty = true;
    _logInvDebug(log, 'connect-inv-migrate', {
      user: p.username,
      before: _invBeforeMigrate,
      after: _invAfterMigrate,
    });
  }
  if (!scenMod.isAct1Done(p.inv.scenario)) {
    p.invincible = scenMod.isInvincibleDuringIntro(p.inv.scenario);
  } else {
    setTimeout(() => { if (players.has(socket.id)) p.invincible = false; }, 5000);
  }
  // Pas de kit de départ si réveil après déco/fouille — inventaire vide = légitime.
  if (!wokeFromSleep && !forceBeachRespawn && scenMod.isAct1Done(p.inv.scenario)) {
    const rockCh = ensureStarterRock(p);
    const torchCh = ensureStarterTorch(p);
    const rationCh = ensureStarterRations(p);
    if (rockCh || torchCh || rationCh) p.dirty = true;
    _logInvDebug(log, 'connect-starters', {
      user: p.username,
      rock: rockCh,
      torch: torchCh,
      rations: rationCh,
      snap: _invDebugSnapshot(p.inv, _normalizeInv),
    });
  } else {
    _logInvDebug(log, 'connect-skip-starters', {
      user: p.username,
      wokeFromSleep,
      killedWhileOffline,
      forceBeachRespawn,
      respawnReason: connectHealth.respawnReason,
      snap: _invDebugSnapshot(p.inv, _normalizeInv),
    });
  }
  if (forceBeachRespawn) {
    const keepScenario = p.inv?.scenario || _save?.scenario;
    if (keepScenario) p.inv.scenario = keepScenario;
  }
  const _keepScen = p.inv?.scenario;
  p.inv = _cloneInv(p.inv);
  if (_keepScen) p.inv.scenario = _keepScen;
  players.set(socket.id, p);
  _rebuildPlayerSpatialGrid();
  if (!scenMod.isAct1Done(p.inv.scenario)) {
    p._introMoveGraceUntil = Date.now() + 8000;
    p.lastX = p.x;
    p.lastZ = p.z;
    p.lastMoveAt = Date.now();
  }
  p._survivalDamageGraceUntil = Date.now() + 8000;
  _registerInvConsumeHandlers(socket, () => players.get(socket.id));
  _persistPlayer(p);
  log.info('socket', 'connect', {
    username: p.username,
    online: players.size,
    spawn: { x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1) },
    health: p.health,
    kills: p.kills,
    respawnReason: connectHealth.respawnReason,
    deathHandled: !!p._deathHandled,
  });

  const _initPayload = _gameInitPayload(socket, p, scenMod, wokeFromSleep);
  if (!scenMod.isAct1Done(p.inv.scenario)) {
    const beatsMod = await _getIntroBeachBeats();
    _initPayload.introRockLook = beatsMod.introRockLookTarget(p.x, p.z);
  }
  _logInvDebug(log, 'game-init-send', {
    user: p.username,
    wokeFromSleep,
    snap: _invDebugSnapshot(p.inv, _normalizeInv),
  });
  socket.emit('game-init', _initPayload);
  if (shouldEmitDeathOnConnect(p)) {
    socket.emit('player-death', {
      id: socket.id,
      playerId: _normPlayerId(p.id),
      username: p.username,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      equipped: p._deathEquipped ?? null,
      kills: p.kills,
      recap: _lifeRecap(p),
    });
  }
  _emitInvAuth(socket, p);
  socket.emit('craft-queue-state', craftQueueMod.getCraftQueueState(p));
  socket.broadcast.emit('player-join', { id: socket.id, username: p.username, x: p.x, y: p.y, z: p.z, rotY: p.rotY, equipped: p.equipped });
  _emitPlayersOnline();
  _getGroupsManager().then((gm) => {
    gm.onConnect(p);
    gm.onRosterChange();
  }).catch(() => {});
`;

module.exports = { CONNECTION_BOOTSTRAP };
