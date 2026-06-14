// Post-init, game-init sync, preconnect — extrait de network.js (IIFE)
function _schedulePostInitGroundRefine(spawnX, spawnZ) {
    const idle = typeof requestIdleCallback === 'function'
      ? (fn) => requestIdleCallback(fn, { timeout: 5000 })
      : (fn) => setTimeout(fn, 400);
    const tStart = performance.now();
    let snappedTotal = 0;
    let refinePass = 0;
    const slice = () => {
      if (!_spawnReady || _isSectorLoadBusy() || ZS.isFrameRecovering?.()) {
        idle(slice);
        return;
      }
      const t0 = performance.now();
      const budgetMs = ZS._isMobile ? 5 : 8;
      while (performance.now() - t0 < budgetMs) {
        const refined = _refineFastGroundDecorNear(spawnX, spawnZ, 52, 6);
        if (refined > 0) refinePass++;
        else break;
      }
      while (performance.now() - t0 < budgetMs) {
        const snapped = _resnapGroundedWorldDecorNear(spawnX, spawnZ, 72, 4);
        snappedTotal += snapped;
        if (snapped <= 0) break;
      }
      const hasFast = [...decorItems.values()].some(({ root }) => root?.userData?.fastGroundSpawn);
      if (hasFast) {
        idle(slice);
        return;
      }
      const ms = Math.round(performance.now() - tStart);
      if (snappedTotal > 0) console.info('[decor] resnap post-init (proche):', snappedTotal);
      ZS.LoadLog?.post?.('post-init-ground-refine', { ms, snapped: snappedTotal, refinePass });
    };
    idle(slice);
  }

  function _scheduleNearCollidersAfterBoot(spawnX, spawnZ, delayMs) {
    const delay = delayMs ?? (_spawnZoneCollidersRegistered > 0 ? 500 : 2200);
    ZS.LoadLog?.post?.('colliders-post-boot-scheduled', { delayMs: delay, preRegistered: _spawnZoneCollidersRegistered });
    setTimeout(() => {
      if (!_spawnReady || !_scene) return;
      ZS.LoadLog?.stepStart?.('colliders-post-boot');
      ZS.beginDecorColliderRegisterBatch?.();
      _runDecorCollidersBackground({
        playerX: spawnX,
        playerZ: spawnZ,
        budgetMs: ZS._isMobile ? 10 : 14,
      }).then((r) => {
        ZS.LoadLog?.stepEnd?.('colliders-post-boot', r || {});
      });
      console.info('[sync] colliders proches (post-boot)');
    }, delay);
  }

  function _syncZombiesFromInit(data, requestSync) {
    const zList = ZS.Scenario?.filterZombies?.(data?.zombies || []) || data?.zombies || [];
    if (zList.length) ZS.Zombies.syncAll(zList);
    if (requestSync && _socket && !ZS.Scenario?.shouldDelayZombieSync?.()) {
      _socket.emit('request-zombie-sync');
    }
  }

  async function _runPostInitIdle(decorList, structList, data, spawnX, spawnZ) {
    const LL = ZS.LoadLog;
    LL?.post?.('post-init-idle-start', {
      deferredDecor: _decorSpawnDefer.pending.length,
      decorTotal: decorList.length,
    });
    ZS.runPostSpawnVisualBuilds?.(_scene);
    await _yieldToMain();
    LL?.post?.('post-init-build-anchors');
    const buildList = decorList.filter((d) => d.prefabId?.startsWith('build_'));
    ZS.BuildAnchors?.syncRegistryFromDecor?.(buildList);
    await _yieldToMain();
    ZS.reconcileAllBuildFloors?.();
    ZS.BuildingDebug?.dumpShack?.();

    const worldRockCount = decorList.filter(
      (d) => d.prefabId?.startsWith('rock_') && !d.anchorId,
    ).length;
    const spawnedRocks = _countSpawnedWorldRocks();
    if (worldRockCount > 0 && spawnedRocks === 0) {
      _beginColliderBatch();
      _resyncWorldRocksFromApi().then((n) => {
        ZS.resnapAllMinableRocks?.(_scene);
        _endColliderBatch();
        if (n > 0) console.info('[decor] rochers resync API:', n);
      }).catch(() => _endColliderBatch());
    }

    await _yieldToMain();
    for (const st of structList) ZS.Inventory.spawnStructure(st);

    const zList = ZS.Scenario?.filterZombies?.(data.zombies || []) || data.zombies || [];
    if (zList.length) ZS.Zombies.syncAll(zList);
    if (_socket && !ZS.Scenario?.shouldDelayZombieSync?.()) {
      _socket.emit('request-zombie-sync');
    }
    ZS.SpawnIntro?.tryStart?.(_state);
    ZS.BeachIntroPrefabs?.syncIntroCampfireTorchVisibility?.();
    _schedulePostInitGroundRefine(spawnX, spawnZ);
    LL?.post?.('post-init-idle-done', {
      pendingDecor: _decorSpawnDefer.pending.length,
      treeActive: _treeDefer.active,
      propActive: _propDefer.active,
    });
  }

  function isDecorColliderDefer() {
    return _colliderDeferRegister;
  }

  function _clearSyncedWorldState() {
    remotePlayers.forEach(({ mesh }) => _scene?.remove(mesh));
    remotePlayers.clear();
    sleepingBodies.forEach(({ mesh }) => _scene?.remove(mesh));
    sleepingBodies.clear();
    deathCorpses.forEach(({ mesh }) => _scene?.remove(mesh));
    deathCorpses.clear();
    _hideLocalDeathCorpse();
    decorItems.forEach(({ root }) => { if (root?.parent) root.parent.remove(root); });
    decorItems.clear();
    _lodPendingCached = 0;
    _lodRingCache.dirty = true;
    _lodRingCache.urgent = 0;
    _lodRingCache.mid = 0;
    _lodRingCache.near = 0;
    _invalidateDecorVisRing();
    _markLodQueueDirty();
    _lastBacklogPlan = null;
    ZS._backlogPlan = null;
    ZS._roadBuildBudgetMs = null;
    ZS.BacklogScheduler?.resetDeferGate?.();
    _resetTreeDefer();
    _resetDecorSpawnDefer();
    _resetPropDefer();
    _resetNearStream();
    _resetDecorStream();
    _resetInitVisReveal();
    _postInitPending = null;
    _lodUpgradeWindowAt = 0;
    _lodUpgradeWindowCount = 0;
    _colliderFarQueue = [];
    _colliderFarAcc = 0;
    _spawnZoneCollidersRegistered = 0;
    _spawnReadyAt = 0;
    ZS.clearDecorColliders?.();
    _lastEquip = undefined;
  }

  function _beginGameInitSync(data) {
    if (_gameInitSyncing) {
      _pendingGameInit = data;
      ZS.LoadLog?.mark?.('game-init-queued', {
        decor: data?.decorItems?.length ?? 0,
        bytes: ZS.LoadLog?.payloadBytes?.(data),
      });
      return;
    }
    _gameInitSyncing = true;
    ZS.LoadLog?.stepStart?.('game-init', {
      decor: data?.decorItems?.length ?? 0,
      items: data?.items?.length ?? 0,
      structures: data?.structures?.length ?? 0,
      players: data?.players?.length ?? 0,
      bytes: ZS.LoadLog?.payloadBytes?.(data),
    });
    _connecting(true, 'Synchronisation…', 'Réception des données serveur', 'sync', 0);
    _finalizeGameInit(data)
      .catch((err) => {
        console.error('[network] game-init failed', err);
        ZS.LoadLog?.stepEnd?.('game-init', { failed: true, err: String(err?.message || err) });
        ZS.LoadLog?.summary?.('game-init-failed');
        _gameInitRetries++;
        if (_gameInitRetries >= _GAME_INIT_MAX_RETRIES) {
          _spawnReady = true;
          _syncPlayerPosToServer();
          _connecting(false);
          ZS.UI?.showNotif?.('Synchronisation incomplète — rechargez la page (Ctrl+F5)');
          return;
        }
        _connecting(
          true,
          'Synchronisation interrompue',
          `Nouvelle tentative ${_gameInitRetries}/${_GAME_INIT_MAX_RETRIES}…`,
          'sync',
          0.08,
        );
        const retry = () => {
          if (_socket?.connected) _socket.emit('request-game-init');
        };
        setTimeout(retry, 600 + _gameInitRetries * 400);
      })
      .finally(() => {
        _gameInitSyncing = false;
        if (_pendingGameInit) {
          const pending = _pendingGameInit;
          _pendingGameInit = null;
          _beginGameInitSync(pending);
        }
      });
  }

  function _flushPendingGameInit() {
    if (!_pendingGameInit || _gameInitSyncing) return;
    const pending = _pendingGameInit;
    _pendingGameInit = null;
    _beginGameInitSync(pending);
  }

  function _onGameInitReceived(data) {
    const buffered = !_worldReady || !_scene || !_state;
    ZS.LoadLog?.mark?.('game-init-received', {
      buffered,
      worldReady: !!_worldReady,
      decor: data?.decorItems?.length ?? 0,
      bytes: ZS.LoadLog?.payloadBytes?.(data),
    });
    if (buffered) {
      _pendingGameInit = data;
      return;
    }
    _beginGameInitSync(data);
  }

  /** Démarre la connexion socket pendant buildWorld — buffer game-init jusqu'à init(). */
  function preconnect(socket) {
    _socket = socket;
    socket.on('connect', () => {
      ZS.LoadLog?.mark?.('socket-connect', { duringWorldBuild: !_worldReady });
      if (!_worldReady) {
        window.ZS?.Loading?.setPhase?.('socket', 0.72, 'Serveur joint', 'Construction du monde…');
      }
      _syncDecorPrefabRegistry();
    });
    socket.on('game-init', _onGameInitReceived);
  }
