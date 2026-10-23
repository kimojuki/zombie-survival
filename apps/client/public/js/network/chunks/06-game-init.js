// Finalisation game-init — extrait de network.js (IIFE)
async function _finalizeGameInit(data) {
    const L = _loading();
    const LL = ZS.LoadLog;
    const t0 = performance.now();
    LL?.mark?.('game-init-prepare');
    L?.setPhase?.('sync', 0.05, 'Synchronisation…', 'Préparation de la partie');

    ZS.AdminAuth?.loadFromAuth?.(data);
    if (ZS.AdminHub?.rebuildMenu) ZS.AdminHub.rebuildMenu();
    if (data.username) {
      localStorage.setItem('zombie_username', data.username);
      _localUsername = data.username;
    }
    if (ZS.Chat?.setUsername) ZS.Chat.setUsername(data.username);
    if (ZS.Chat?.setSelfId) ZS.Chat.setSelfId(data.selfId);
    if (ZS.Chat?.setServerReady) ZS.Chat.setServerReady(data.features?.chat !== false);
    if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
    if (data.qaEnabled) _loadDeferredScript('/js/qa-panel.js').then(() => {
      ZS.QaPanel?.init?.({ qaEnabled: true });
    }).catch(() => {});
    if (data.worldCollidersReady) _serverCollidersReady = true;
    ZS.Groups?.init?.();
    if (data.serverRole) localStorage.setItem('zombie_server_role', data.serverRole);
    if (data.features?.guest) {
      localStorage.setItem('zombie_is_guest', '1');
      localStorage.setItem('zombie_guest_committed', data.features.guestCommitted ? '1' : '0');
      const mins = data.features.guestCommitMinutes || 8;
      ZS.GuestAccount?.injectMenuEntry?.();
      if (!data.features.guestCommitted) {
        ZS.UI?.showNotif?.(`Mode invité — progression sauvegardée après ~${mins} min de jeu`);
      } else {
        ZS.UI?.showNotif?.('Invité enregistré — menu ☰ → Créer mon compte pour votre pseudo');
      }
    } else {
      localStorage.setItem('zombie_is_guest', '0');
    }
    _state.selfId = data.selfId;
    if (data.playerId != null) ZS.Inventory?.setSelfPlayerId?.(data.playerId);
    const spawn = data.spawn || ZS.SpawnZone?.spawn || null;
    if (spawn) {
      _state.player.x   = spawn.x;
      _state.player.z   = spawn.z;
      _state.camera.yaw = spawn.rotY || 0;
      _state.player.y   = ((ZS.getDecorGroundHeight
        ? ZS.getDecorGroundHeight(spawn.x, spawn.z)
        : (ZS.getTerrainHeight ? ZS.getTerrainHeight(spawn.x, spawn.z) : _state.player.y - 1.7))) + 1.7;
      if (ZS._camera) {
        ZS._camera.position.set(_state.player.x, _state.player.y, _state.player.z);
        ZS._camera.rotation.y = _state.camera.yaw;
      }
      if (ZS._localAvatar) {
        ZS._localAvatar.position.set(_state.player.x, _state.player.y - 1.7, _state.player.z);
        ZS._localAvatar.rotation.y = _state.camera.yaw;
      }
      localStorage.setItem('zombie_spawn', JSON.stringify(spawn));
    }
    if (typeof data.worldTime === 'number') ZS.setWorldTime(data.worldTime);
    if (ZS.Rcon) ZS.Rcon.init(_socket, data);
    if (ZS.AdminPanel) ZS.AdminPanel.init(_socket, data);
    _clearSyncedWorldState();
    for (const p of data.players) {
      if (p.id === _state.selfId) continue;
      _addRemotePlayer(p);
    }
    for (const s of (data.sleeping || [])) {
      if (s.dead) _addDeathCorpse(s);
      else _addSleepingBody(s);
    }
    if (data.respawnReason === 'stale_death') {
      ZS.UI?.showNotif?.('Vous étiez mort — respawn à la plage avec un nouveau kit.');
    } else if (data.respawnReason === 'offline_kill' || data.killedWhileOffline) {
      ZS.UI?.showNotif?.('Vous avez été tué pendant votre absence — respawn à la plage.');
    }

    const decorList = (data.decorItems || []).filter(
      (d) => !d.prefabId?.startsWith('road_barrier_')
        && !String(d.placementKey || '').startsWith('s01:hub:')
        && !String(d.placementKey || '').startsWith('s01:camp:'),
    );
    const itemList = data.items || [];
    const structList = data.structures || [];
    const spawnX = spawn?.x ?? _state.player.x ?? 0;
    const spawnZ = spawn?.z ?? _state.player.z ?? 0;
    ZS.Engine?.ContentLoader?.setStreamingSource?.(spawnX, spawnZ);
    ZS.Engine?.ContentLoader?.setBootPhase?.('sync');
    ZS.Engine?.Telemetry?.setBootPhase?.('sync');
    const mobile = !!ZS._isMobile;
    const syncTotal = decorList.length + itemList.length + structList.length + 2;
    const tSync = performance.now();
    const batchOpts = mobile
      ? { sliceMs: 14, yieldEvery: 8, simpleLodTrees: true, initFullLodTrees: true, fastGround: true, spawnX, spawnZ }
      : { sliceMs: 14, yieldEvery: 10, simpleLodTrees: true, initFullLodTrees: true, fastGround: true, spawnX, spawnZ };
    const { near: nearDecor, deferred: deferredDecor } = _splitDecorForSpawn(decorList, spawnX, spawnZ);
    _decorSpawnDefer.pending.push(...deferredDecor);
    ZS.DevLog?.sync?.('decor-split', {
      near: nearDecor.length,
      deferred: deferredDecor.length,
      total: decorList.length,
      spawn: [Math.round(spawnX), Math.round(spawnZ)],
    });
    LL?.mark?.('decor-split', {
      near: nearDecor.length,
      deferred: deferredDecor.length,
      total: decorList.length,
      items: itemList.length,
      structures: structList.length,
    });

    LL?.stepStart?.('world-items', { count: itemList.length });
    for (const item of itemList) {
      ZS.Inventory.spawnWorldItem(item);
    }
    LL?.stepEnd?.('world-items', { count: itemList.length });

    ZS.setDeferRockSnap?.(true);
    _beginColliderBatch();
    _beginInitVisReveal(spawnX, spawnZ);
    await _spawnDecorBatch(nearDecor, (n, total) => {
      const done = itemList.length + n;
      const t = syncTotal > 0 ? done / syncTotal : 1;
      L?.setPhase?.('sync', t, 'Synchronisation…', `${done} / ${syncTotal} objets`);
    }, batchOpts);
    _recomputeLodPendingFull();
    await _yieldToMainLight();
    const colliderSync = _registerSpawnZoneCollidersSync(spawnX, spawnZ);
    LL?.mark?.('spawn-zone-colliders', colliderSync);
    console.info('[sync] colliders zone spawn', colliderSync.registered, '/', colliderSync.total, colliderSync.ms, 'ms');
    const deferFlush = await _flushSpawnZoneDeferSpawn(spawnX, spawnZ);
    LL?.mark?.('spawn-zone-defer-flush', deferFlush);
    ZS.updateForestDecorVisibility?.(spawnX, spawnZ);
    const decorMs = Math.round(performance.now() - tSync);
    console.info('[sync] décor', nearDecor.length, '/', decorList.length, decorMs, 'ms',
      deferredDecor.length ? `(+${deferredDecor.length} différés)` : '');
    ZS.DevLog?.sync?.('decor-batch', {
      count: nearDecor.length,
      deferred: deferredDecor.length,
      total: decorList.length,
      ms: decorMs,
      mobile,
    });
    ZS.setDeferRockSnap?.(false);
    L?.setPhase?.('sync', 0.92, 'Synchronisation…', 'Inventaire et scénario');
    const idleSnap = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
    idleSnap(() => {
      ZS.resnapAllMinableRocks?.(_scene);
      const n = _resnapS01DecorNear(spawnX, spawnZ, 48);
      if (n > 0) console.info('[decor] resnap s01 proche:', n);
    });
    _endColliderBatch();

    const clientV = window.__ZS_CLIENT_VERSION || '';
    const invDebugBuild = data.serverBuild || data.invDebugBuild || null;
    const tInv = performance.now();
    LL?.stepStart?.('inventory-scenario');
    ZS.ConsumeDebug?.log('game-init-server-build', {
      clientVersion: clientV,
      invDebugBuild,
      wokeFromSleep: !!data.wokeFromSleep,
    });
    if (!invDebugBuild) {
      console.warn('[inv-debug] Serveur ancien (pas invDebugBuild) — npm run dev:server');
      if (localStorage.getItem('zombie_is_admin') === '1') {
        ZS.UI?.showNotif?.('Serveur ancien — npm run dev:server');
      }
    }

    if (data.inventory) {
      ZS.ConsumeDebug?.log('game-init-inv-raw', {
        trace: ZS.ConsumeDebug?.traceId?.('init'),
        serverFood: ZS.ConsumeDebug?.foodFromInv?.(data.inventory),
        wokeFromSleep: !!data.wokeFromSleep,
        invDebugBuild,
      });
      ZS.Inventory.loadFromSave(data.inventory);
      const cmp = ZS.ConsumeDebug?.compare?.(data.inventory, 'game-init');
      ZS.ConsumeDebug?.log('game-init-inv-loaded', { compare: cmp });
      if (ZS.ConsumeDebug?.isEnabled?.()) {
        _deferredInvDebugTrace = cmp?.trace;
      }
    }
    if (typeof data.health === 'number' && _state?.player) {
      _state.player.health = Math.max(0, data.health);
      ZS.UI.setHealth(
        Math.floor(_state.player.health),
        ZS.Inventory?.getMaxHealth?.() || 100,
      );
      localStorage.setItem('zombie_health', String(Math.floor(_state.player.health)));
    }
    if (data.survival) ZS.Survival.loadFromSave(data.survival);
    const scenario = data.scenario || data.inventory?.scenario;
    ZS.IntroStarter?.setRockLookTarget?.(data.introRockLook);
    ZS.Scenario?.init?.(scenario, _state, _socket);
    _syncZombiesFromInit(data, true);
    if (typeof data.onlineCount === 'number') _setOnlineCount(data.onlineCount);
    else _setOnlineCount(remotePlayers.size + 1);
    if (typeof data.playerKills === 'number') {
      _state.player.playerKills = data.playerKills;
      ZS.UI.setPlayerKills(data.playerKills);
    }

    const invMs = Math.round(performance.now() - tInv);
    console.info('[sync] inventaire+scenario', invMs, 'ms');
    LL?.stepEnd?.('inventory-scenario', { ms: invMs });

    L?.setPhase?.('finalize', 0.35, 'Finalisation…', 'Connexion au monde');
    _syncPlayerPosToServer();
    _hadSpawnReady = true;
    _gameInitRetries = 0;

    L?.setPhase?.('finalize', 0.7, 'Finalisation…', 'Première image');
    await _runInitVisRevealHoldFrames(spawnX, spawnZ);

    _spawnReady = true;
    _spawnReadyAt = performance.now();
    if (ZS.Scenario?.needsWakeIntro?.()) {
      ZS.SpawnIntro?.tryStart?.(_state);
    }
    ZS.beginBootRenderWarmup?.(ZS._isMobile ? 14 : 20);
    ZS.LoadLog?.startPostFrameWatch?.(50, 180000);

    const idleColliders = window.requestIdleCallback || ((cb) => setTimeout(cb, 48));
    idleColliders(() => {
      LL?.stepStart?.('colliders-sync');
      _syncWorldColliders(true);
      LL?.stepEnd?.('colliders-sync');
    });

    const initMs = Math.round(performance.now() - t0);
    console.info('[sync] game-init total', initMs, 'ms', '(décor', decorMs, 'ms · inv', invMs, 'ms)');
    ZS.DevLog?.sync?.('game-init-done', {
      ms: initMs,
      decorMs,
      invMs,
      decor: decorList.length,
      nearDecor: nearDecor.length,
      deferredDecor: deferredDecor.length,
      wokeFromSleep: !!data.wokeFromSleep,
      scenarioStep: data.scenario?.step || data.inventory?.scenario?.step,
    });
    LL?.stepEnd?.('game-init', {
      ms: initMs,
      decorMs,
      invMs,
      decor: decorList.length,
      nearDecor: nearDecor.length,
      deferredDecor: deferredDecor.length,
    });
    ZS.DecorGapMonitor?.notifyGameReady?.({
      x: spawnX,
      z: spawnZ,
      deferTotal: _decorSpawnDefer.pending.length,
      nearDecor: nearDecor.length,
      deferredDecor: deferredDecor.length,
      decorTotal: decorList.length,
    });
    ZS.LodGapMonitor?.notifyGameReady?.({
      x: spawnX,
      z: spawnZ,
      simpleLodTotal: _lodPendingCount?.() ?? null,
      simpleLodUrgent: _lodUrgentPendingCount?.(spawnX, spawnZ) ?? null,
      simpleLodMid: _lodMidRingPendingCount?.(spawnX, spawnZ) ?? null,
    });
    LL?.summary?.('game-init');
    L?.setPhase?.('finalize', 1, 'Prêt', '');
    _connecting(false);
    _schedulePostInitWork(spawnX, spawnZ, decorList, structList, data);
    if (!_initVisReveal.active) _runPostInitWorkIfReady();
  }
