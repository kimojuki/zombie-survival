// Accesseurs décor + API ZS.Network — extrait de network.js (IIFE)
function _getDecorRoot(id) {
    return decorItems.get(id)?.root || null;
  }

  function _getDecorData(id) {
    return decorItems.get(id)?.data || null;
  }

  function _getDecorEntry(id) {
    return decorItems.get(id) || null;
  }

  function _forEachDecor(fn) {
    decorItems.forEach((entry, id) => { fn(entry, id); });
  }

  function _getPerfContext() {
    const lp = getLocalXZ();
    let simpleLod = 0;
    let urgentLod = 0;
    for (const entry of decorItems.values()) {
      if (!entry?.root?.userData?.simpleLod) continue;
      simpleLod++;
      const pid = entry.data?.prefabId;
      if (!pid?.startsWith('tree_')) continue;
      const tx = entry.data?.x ?? entry.root.position.x;
      const tz = entry.data?.z ?? entry.root.position.z;
      const d2 = (tx - lp.x) ** 2 + (tz - lp.z) ** 2;
      if (d2 <= TREE_LOD_URGENT_R2) urgentLod++;
    }
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const th = _lodMidStreamThresholds();
    return {
      decorSpawned: decorItems.size,
      decorPending: _decorSpawnDefer.pending.length,
      treeQueue: _treeDefer.queue.length,
      simpleLodPending: simpleLod,
      simpleLodMidPending: lodMid,
      lodMidThresholds: th,
      urgentLodPending: urgentLod,
      lodQueue: _lodUpgradeList?.length ?? null,
      streamActive: _nearStream.active,
      streamGate: _streamGate.reason || null,
      streamSoftExtra: _streamSoftExtraUntil > performance.now(),
      treeFetchGate: _treeFetchGate.reason || null,
      decorBudget: _decorTickBudgetMs(),
      colliderFar: _colliderFarQueue.length,
      sectorLoadBusy: _isSectorLoadBusy(),
      sectorCooldown: _sectorDecorCooldown(),
      postSectorDrain: _inPostSectorDrainSoft(),
      initVisReveal: _initVisReveal.active ? _initVisReveal.phase : null,
      frameRecovering: !!ZS.isFrameRecovering?.(),
    };
  }

  window.ZS = window.ZS || {};
  ZS.TREE_LOD_URGENT_R = TREE_LOD_URGENT_R;
  ZS.treeWantsSimpleLodAt = _treeWantsSimpleLodAt;
  ZS._markSectorDecorCooldown = _markSectorDecorCooldown;
  ZS.markSectorDecorCooldown = _markSectorDecorCooldown;
  const _networkApi = {
    preconnect, init, tick, getLocalXZ, sendMove, sendShoot, sendRespawn, sendDied, sendSurvival, sendEquip, sendAttack, sendFootstep,
    notifyDecorChop, notifyDecorMine, requestDecorDoorToggle, requestDecorDoorLock, requestDecorDoorUnlock,
    getLocalUsername, syncWorldColliders: _syncWorldColliders, isDecorColliderDefer,
    isColliderSyncBatch: () => _colliderSyncDepth > 0,
    findNearestSleeping,
    findNearestLootable,
    getSocket: () => _socket,
    isSpawnReady: () => _spawnReady,
    isInitVisRevealHold: _initVisRevealHoldPhase,
    isInitVisRevealBusy: _initVisRevealBusy,
    isSectorLoadBusy: _isSectorLoadBusy,
    requestStorageOpen, requestStorageClose, requestStorageDeposit, requestStorageWithdraw, requestStorageMove,
    requestStorageTakeAll,
    notifyIntroReadable,
    requestStorageHit, requestStoragePickup,
    requestUseItem, requestInvDebugSnapshot, requestCraftQueue, requestCraftCancel,
    requestBuildHit,
    requestIntroTorchPickup,
    requestCampfireCook,
    requestCampRest,
    requestBedSleepStart,
    requestBedSleepWake,
    getDecorRoot: _getDecorRoot,
    getDecorData: _getDecorData,
    getDecorEntry: _getDecorEntry,
    forEachDecor: _forEachDecor,
    patchDecorFloorHeight: _patchDecorFloorHeight,
    syncDecorFloorHeight,
    resolveRemotePlayerCollision,
    getPerfContext: _getPerfContext,
    getLodUrgentPending: () => {
      const lp = getLocalXZ();
      return _lodUrgentPendingCount(lp.x, lp.z);
    },
    getDeferPendingCount: () => _decorSpawnDefer.pending.length,
  };
  ZS.Network = Object.assign(ZS.Network || {}, _networkApi);
  ZS.networkTick = tick;
  if (typeof ZS.Network.tick !== 'function') {
    console.error('[network] API invalide — tick absent après init');
  }
