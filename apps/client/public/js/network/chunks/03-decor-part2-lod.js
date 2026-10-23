// LOD upgrades + ring cache
function _lodWindowMax(deferN, midLod, fps) {
    const plan = _lastBacklogPlan;
    if (plan?.quotas?.lodWindowMax != null) return plan.quotas.lodWindowMax;
    const th = _lodMidStreamThresholds();
    const lodNear = _lodNearPendingCount(_lodRingCache.px, _lodRingCache.pz);
    let cap = LOD_UPGRADE_WINDOW_MAX;
    if (deferN > 400) cap = 24;
    else if (deferN > 250) cap = 40;
    else if (_inPostSectorDrainSoft() && deferN > 120) cap = 32;
    else if (_inPostSectorDrainSoft() && deferN === 0 && midLod > th.pause * 0.32) cap = 88;
    else if (deferN === 0 && midLod > th.pause * 0.45 && fps != null && fps >= 14) cap = 110;
    else if (deferN === 0 && midLod > th.pause * 0.25) cap = 96;
    if (lodNear > 260) cap = Math.min(cap, deferN > 200 ? 24 : 40);
    else if (lodNear > 180) cap = Math.min(cap, deferN > 250 ? 36 : 48);
    else if (lodNear > 120) cap = Math.min(cap, 52);
    if (deferN < 150 && lodNear > 80 && midLod < th.pause * 0.5) {
      cap = Math.max(cap, fps != null && fps >= 18 ? 48 : 36);
    }
    return cap;
  }

  function _colliderBootDelayMs() {
    if (_spawnZoneCollidersRegistered > 0) return 500;
    const defer = _decorSpawnDefer.pending.length;
    const lp = getLocalXZ();
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const th = _lodMidStreamThresholds();
    if (lodMid > th.high) return 3200;
    if (lodMid > th.pause) return 2400;
    if (defer > 350) return 1800;
    return 1200;
  }

  function _flushLodUpgradeWindowLog(px, pz, fps) {
    if (_lodUpgradeWindowCount <= 0 || !ZS.LoadLog?.isEnabled?.()) return;
    ZS.LoadLog.post('lod-upgrade-batch', {
      upgraded: _lodUpgradeWindowCount,
      pending: _lodPendingCount(),
      lodMid: _lodMidRingPendingCount(px, pz),
      deferPending: _decorSpawnDefer.pending.length,
      urgentPending: _lodUrgentPendingCount(px, pz),
      px: Math.round(px),
      pz: Math.round(pz),
      fps: fps ?? null,
    });
  }

  function _rollLodUpgradeWindow(px, pz, fps, windowMax) {
    const now = performance.now();
    if (!_lodUpgradeWindowAt || now - _lodUpgradeWindowAt >= LOD_UPGRADE_WINDOW_MS) {
      if (_lodUpgradeWindowAt && _lodUpgradeWindowCount > 0) {
        _flushLodUpgradeWindowLog(px, pz, fps);
      }
      _lodUpgradeWindowAt = now;
      _lodUpgradeWindowCount = 0;
    }
    return Math.max(0, windowMax - _lodUpgradeWindowCount);
  }

  function _schedulePostInitWork(spawnX, spawnZ, decorList, structList, data) {
    _postInitPending = { spawnX, spawnZ, decorList, structList, data };
  }

  function _runPostInitWorkIfReady() {
    if (!_postInitPending || !_spawnReady) return;
    if (_initVisReveal.active) return;
    const p = _postInitPending;
    _postInitPending = null;
    _scheduleNearCollidersAfterBoot(p.spawnX, p.spawnZ, _colliderBootDelayMs());
    _beginNearStream(p.spawnX, p.spawnZ);
    const lp = getLocalXZ();
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const th = _lodMidStreamThresholds();
    const treeDelayMs = DEFERRED_TREE_START_MS + (lodMid > th.pause ? 2500 : 0);
    setTimeout(() => {
      _beginDeferredTrees(p.spawnX, p.spawnZ);
      _beginDeferredProps(p.spawnX, p.spawnZ);
    }, treeDelayMs);
    _runPostInitIdle(p.decorList, p.structList, p.data, p.spawnX, p.spawnZ).catch((e) => {
      console.warn('[sync] post-init idle', e);
    });
    if (_deferredInvDebugTrace) {
      requestInvDebugSnapshot(_deferredInvDebugTrace, 'post-reveal-init');
      _deferredInvDebugTrace = null;
    }
    _postRevealSpawnUntil = performance.now() + (lodMid > th.pause ? POST_REVEAL_SPAWN_SOFT_MS + 6000 : POST_REVEAL_SPAWN_SOFT_MS);
    ZS.LoadLog?.post?.('post-init-stream-start', {
      x: Math.round(p.spawnX),
      z: Math.round(p.spawnZ),
      softMs: STREAM_SOFT_MS,
      treeDelayMs: treeDelayMs,
      deferSoftMs: lodMid > th.pause ? POST_REVEAL_SPAWN_SOFT_MS + 6000 : POST_REVEAL_SPAWN_SOFT_MS,
      lodMid,
    });
  }

  function _inBootGrace() {
    return _spawnReadyAt > 0 && performance.now() - _spawnReadyAt < BOOT_GRACE_MS;
  }

  function _markLodQueueDirty() {
    _lodUpgradeList = null;
    _lodListRebuildAt = 0;
  }

  let _lodPendingCached = 0;
  let _lodListRebuildAt = 0;
  const LOD_PRESSURE_MARGIN = 72;
  const _lodRingCache = {
    px: NaN, pz: NaN, urgent: 0, mid: 0, near: 0, dirty: true, at: 0,
  };
  const LOD_RING_CACHE_MOVE2 = 8 * 8;
  const LOD_RING_CACHE_MS = 120;

  function _invalidateLodRingCache() {
    _lodRingCache.dirty = true;
  }

  function _adjustLodPendingCached(delta) {
    _lodPendingCached = Math.max(0, _lodPendingCached + delta);
    _invalidateLodRingCache();
  }

  function _recomputeLodPendingFull() {
    let n = 0;
    for (const entry of decorItems.values()) {
      if (entry?.root?.userData?.simpleLod) n++;
    }
    _lodPendingCached = n;
    _lodRingCache.dirty = true;
  }

  function _lodPressureRadius2() {
    const r = Math.sqrt(_decorVisRadius2()) + LOD_PRESSURE_MARGIN;
    return r * r;
  }

  function _syncLodRingCounts(px, pz) {
    const now = performance.now();
    const moved2 = Number.isFinite(_lodRingCache.px)
      ? (px - _lodRingCache.px) ** 2 + (pz - _lodRingCache.pz) ** 2
      : Infinity;
    if (!_lodRingCache.dirty
        && moved2 <= LOD_RING_CACHE_MOVE2
        && now - _lodRingCache.at < LOD_RING_CACHE_MS) return;
    let urgent = 0;
    let mid = 0;
    let near = 0;
    const pressR2 = _lodPressureRadius2();
    for (const entry of decorItems.values()) {
      if (!entry?.root?.userData?.simpleLod) continue;
      const tx = entry.data?.x ?? entry.root.position.x;
      const tz = entry.data?.z ?? entry.root.position.z;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 <= pressR2) near++;
      const pid = entry.data?.prefabId;
      if (!pid?.startsWith('tree_')) continue;
      if (d2 <= TREE_LOD_URGENT_R2) urgent++;
      if (d2 <= TREE_LOD_MID_R2) mid++;
    }
    _lodRingCache.urgent = urgent;
    _lodRingCache.mid = mid;
    _lodRingCache.near = near;
    _lodRingCache.px = px;
    _lodRingCache.pz = pz;
    _lodRingCache.dirty = false;
    _lodRingCache.at = now;
  }

  function _lodPendingCount() {
    return _lodPendingCached;
  }

  function _lodUrgentPendingCount(px, pz) {
    _syncLodRingCounts(px, pz);
    return _lodRingCache.urgent;
  }

  function _lodMidRingPendingCount(px, pz) {
    _syncLodRingCounts(px, pz);
    return _lodRingCache.mid;
  }

  function _lodNearPendingCount(px, pz) {
    _syncLodRingCounts(px, pz);
    return _lodRingCache.near;
  }

  function _sampleLodGap(px, pz) {
    const deferN = _decorSpawnDefer.pending.length;
    const lodMid = _lodMidRingPendingCount(px, pz);
    const lodNear = _lodNearPendingCount(px, pz);
    const plan = _lastBacklogPlan || _buildBacklogPlan(px, pz);
    const forcedDrain = _deferForcedDrain(deferN, lodMid, lodNear);
    const fps = ZS.PerfMonitor?.getStats?.()?.fps ?? null;
    let lodUpgradeBlocked = false;
    let lodUpgradeBlockReason = null;
    if (_postSpawnVisualBusy()) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'post-spawn';
    } else if (_initVisReveal.active) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'init-vis';
    } else if (!_decorTickHeavyAllowed()) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'heavy-throttle';
    } else if (plan && !plan.allow.lodUpgrade && !forcedDrain) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'backlog-plan';
    } else if (_syncDeferGatePaused(deferN) && !forcedDrain) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'defer-gate';
    } else if (deferN > 280 && lodMid < 48 && !forcedDrain) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'defer-priority';
    } else if (fps != null && fps < 10) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'fps-low';
    }
    return {
      simpleLodTotal: _lodPendingCount(),
      simpleLodUrgent: _lodUrgentPendingCount(px, pz),
      simpleLodMid: lodMid,
      simpleLodNear: lodNear,
      lodUpgradeQueue: _lodUpgradeList?.length ?? null,
      lodUpgradeBlocked,
      lodUpgradeBlockReason,
      deferPending: deferN,
      fps,
    };
  }

  function _treeWantsSimpleLodAt(x, z, px, pz) {
    const d2 = ((x || 0) - px) ** 2 + ((z || 0) - pz) ** 2;
    return d2 > TREE_LOD_URGENT_R2;
  }

  function _lodBurstMax(d2, fps, urgentPressure) {
    if (urgentPressure && d2 <= TREE_LOD_URGENT_R2) {
      return ZS._isMobile ? 12 : 20;
    }
    let max = ZS._isMobile ? 2 : 4;
    if (d2 <= TREE_LOD_URGENT_R2) max = ZS._isMobile ? 4 : 6;
    else if (d2 <= TREE_LOD_NEAR_R2) max = ZS._isMobile ? 2 : 3;
    else max = 1;
    if (fps != null && fps < 22) max = Math.max(1, Math.floor(max * 0.5));
    if (fps != null && fps < 14) max = d2 <= TREE_LOD_URGENT_R2 ? 2 : 0;
    return max;
  }

  function _treeWantsSimpleLod(d, px, pz) {
    if (!d?.prefabId?.startsWith('tree_')) return false;
    const tx = Number.isFinite(d.x) ? d.x : px;
    const tz = Number.isFinite(d.z) ? d.z : pz;
    return _treeWantsSimpleLodAt(tx, tz, px, pz);
  }

  function _treeSpawnSimpleLod(d, px, pz) {
    if (!d?.prefabId?.startsWith('tree_')) return false;
    const tx = Number.isFinite(d.x) ? d.x : px;
    const tz = Number.isFinite(d.z) ? d.z : pz;
    const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
    if (d2 <= TREE_LOD_NEAR_R2) return false;
    const deferN = _decorSpawnDefer.pending.length;
    const midLod = _lodMidRingPendingCount(px, pz);
    if (d2 <= TREE_LOD_MID_R2) {
      if (_lodTextureSurgeActive?.()) return false;
      if (deferN > 120 || midLod >= 12) return false;
    }
    return _treeWantsSimpleLod(d, px, pz);
  }

  function _treeSpawnSimpleLodForInit(d, px, pz) {
    if (!d?.prefabId?.startsWith('tree_')) return false;
    const tx = Number.isFinite(d.x) ? d.x : px;
    const tz = Number.isFinite(d.z) ? d.z : pz;
    const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
    if (d2 <= INIT_TREE_FULL_LOD_R2) return false;
    return _treeWantsSimpleLod(d, px, pz);
  }

  function _rebuildLodUpgradeList(px, pz) {
    _lodUpgradeList = [];
    for (const entry of decorItems.values()) {
      const root = entry?.root;
      if (!root?.userData?.simpleLod) continue;
      const pid = entry.data?.prefabId;
      if (!pid?.startsWith('tree_')) continue;
      const tx = entry.data?.x ?? root.position.x;
      const tz = entry.data?.z ?? root.position.z;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 > TREE_LOD_MID_R2) continue;
      _lodUpgradeList.push({ entry, d2 });
    }
    _lodUpgradeList.sort((a, b) => a.d2 - b.d2);
    _lodLastScanPx = px;
    _lodLastScanPz = pz;
  }

  function _compactLodUpgradeList() {
    if (!_lodUpgradeList?.length) return;
    _lodUpgradeList = _lodUpgradeList.filter((row) => row?.entry?.root?.userData?.simpleLod);
  }

  function _upgradeTreeLodEntry(entry, px, pz) {
    const root = entry?.root;
    if (!root?.userData?.simpleLod) return false;
    const pid = entry.data?.prefabId;
    if (!pid?.startsWith('tree_')) return false;
    const tx = entry.data?.x ?? root.position.x;
    const tz = entry.data?.z ?? root.position.z;
    const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
    if (d2 > TREE_LOD_MID_R2) return false;
    if (!root.visible && d2 > TREE_LOD_URGENT_R2 * 0.64) return false;
    const bootAge = _spawnReadyAt > 0 ? performance.now() - _spawnReadyAt : Infinity;
    if (bootAge < LOD_BOOT_GRACE_MS && d2 > TREE_LOD_URGENT_R2) return false;
    const tLod = performance.now();
    const ok = !!ZS.upgradeTreeLod?.(root, pid, {
      treeSeed: entry.data?.treeSeed,
      decorId: entry.data?.id,
    });
    const lodMs = performance.now() - tLod;
    if (ok && lodMs >= 20 && ZS.LoadLog?.isEnabled?.()) {
      ZS.LoadLog.post('lod-upgrade-slow', { ms: Math.round(lodMs), prefab: pid, d2: Math.round(d2) });
    }
    if (ok) {
      if (!root.userData?.simpleLod) {
        _adjustLodPendingCached(-1);
        ZS.Engine?.LodGapMonitor?.notifyLodUpgrade?.(
          tx, tz, entry.data?.id,
          {
            lodMs: Math.round(lodMs),
            simpleLodUrgent: _lodUrgentPendingCount(px, pz),
            simpleLodMid: _lodMidRingPendingCount(px, pz),
          },
        );
      } else _invalidateLodRingCache();
    }
    return ok;
  }

  function _tickLodUpgrades(px, pz) {
    if (_postSpawnVisualBusy()) return;
    if (_initVisReveal.active) return;
    if (!_decorTickHeavyAllowed()) return;
    const sectorCooldown = _sectorDecorCooldown();
    const deferN = _decorSpawnDefer.pending.length;
    const lodMid = _lodMidRingPendingCount(px, pz);
    const lodNear = _lodNearPendingCount(px, pz);
    const lodTextureSurge = _lodTextureSurgeActive?.() ?? false;
    const plan = _lastBacklogPlan || _buildBacklogPlan(px, pz);
    const forcedDrain = _deferForcedDrain(deferN, lodMid, lodNear);
    if (plan && !plan.allow.lodUpgrade && !forcedDrain && !lodTextureSurge) return;
    if (_syncDeferGatePaused(deferN) && !forcedDrain && !lodTextureSurge) return;
    if (deferN > 280 && lodMid < 48 && !forcedDrain && !lodTextureSurge) return;
    const fps = ZS.PerfMonitor?.getStats?.()?.fps ?? null;
    if (fps != null && fps < 10) return;

    const urgentEarly = _lodUrgentPendingCount(px, pz);
    if (sectorCooldown && urgentEarly < 8 && !lodTextureSurge) return;
    if (sectorCooldown && lodTextureSurge && urgentEarly < 2) return;

    const windowMax = _lodWindowMax(deferN, lodMid, fps);
    const windowLeft = _rollLodUpgradeWindow(px, pz, fps, windowMax);
    if (windowLeft <= 0) return;

    const pendingLod = _lodPendingCount();
    const midLod = _lodMidRingPendingCount(px, pz);
    const th = _lodMidStreamThresholds();
    const urgentPending = _lodUrgentPendingCount(px, pz);
    const urgentOnly = sectorCooldown;
    const backlog = midLod > th.pause * 0.75 || pendingLod > LOD_BACKLOG_MID || (_inPostSectorDrainSoft() && deferN > 150);

    const moved = !Number.isFinite(_lodLastScanPx)
      || (px - _lodLastScanPx) ** 2 + (pz - _lodLastScanPz) ** 2 > 30 * 30;
    const rebuildDue = !_lodUpgradeList
      || moved
      || performance.now() - _lodListRebuildAt > 900;
    if (rebuildDue) {
      _rebuildLodUpgradeList(px, pz);
      _lodListRebuildAt = performance.now();
    }
    if (!_lodUpgradeList?.length && pendingLod === 0) return;

    const t0 = performance.now();
    let budget = fps != null && fps < 20
      ? 6
      : Math.min(14, Math.max(8, (_decorTickBudgetMs() || 8) * 1.5));
    if (backlog) budget = Math.min(budget, fps != null && fps < 16 ? 4 : 6);
    if (urgentPending > 0 && fps != null && fps >= 16) {
      budget = Math.min(16, budget + (urgentPending > 8 ? 4 : 2));
    }
    let upgraded = 0;
    let tickCap = backlog ? (fps != null && fps < 16 ? 3 : 5) : 12;
    if (urgentPending > 0 && fps != null && fps >= 14) {
      tickCap = Math.max(tickCap, backlog ? 8 : 10);
    }
    const urgentPressure = urgentPending > LOD_URGENT_PRESSURE;
    if (!urgentPressure && urgentPending > 24) tickCap = Math.min(tickCap, 5);
    if (urgentPressure && fps != null && fps >= 12) {
      tickCap = windowLeft;
      budget = Math.min(22, budget + 8);
    }
    if (urgentOnly) {
      tickCap = Math.min(tickCap, urgentPending > 20 ? 6 : 4);
      budget = Math.min(budget, urgentPending > 20 ? 8 : 5);
    }
    if (deferN === 0 && midLod > th.pause * 0.45 && fps != null && fps >= 14 && !urgentOnly) {
      tickCap = Math.max(tickCap, Math.min(18, windowLeft));
      budget = Math.min(20, budget + 6);
    }
    if (lodTextureSurge && urgentPending >= 2) {
      tickCap = Math.max(tickCap, Math.min(windowLeft, fps != null && fps >= 14 ? 16 : 10));
      budget = Math.min(24, budget + (urgentPending > 6 ? 10 : 6));
    }
    tickCap = Math.min(tickCap, windowLeft);

    // Pass 1 — urgent ring rescan (priorité immédiate autour du joueur).
    for (const entry of decorItems.values()) {
      if (performance.now() - t0 >= budget) break;
      if (!entry?.root?.userData?.simpleLod) continue;
      const pid = entry.data?.prefabId;
      if (!pid?.startsWith('tree_')) continue;
      const tx = entry.data?.x ?? entry.root.position.x;
      const tz = entry.data?.z ?? entry.root.position.z;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 > TREE_LOD_URGENT_R2) continue;
      if (!urgentPressure) {
        const burst = _lodBurstMax(d2, fps, false);
        if (!burst) break;
        if (_upgradeTreeLodEntry(entry, px, pz)) {
          upgraded++;
          if (_lodUpgradeWindowCount + upgraded >= windowMax) break;
          if (upgraded >= burst || upgraded >= tickCap) break;
        }
        continue;
      }
      if (_upgradeTreeLodEntry(entry, px, pz)) {
        upgraded++;
        if (_lodUpgradeWindowCount + upgraded >= windowMax) break;
        if (upgraded >= tickCap) break;
      }
    }

    // Pass 2 — mid ring ; throttled si backlog, actif dès que urgent vide.
    let i = 0;
    const allowPass2 = urgentPending === 0 && !urgentPressure && !urgentOnly;
    let pass2Cap = tickCap;
    if (backlog) pass2Cap = Math.min(pass2Cap, fps != null && fps < 18 ? 3 : 6);
    else if (fps != null && fps >= 20) pass2Cap = Math.min(windowLeft - upgraded, 8);
    if (allowPass2 && !_lodUpgradeList?.length) {
      _rebuildLodUpgradeList(px, pz);
    }
    const pass2List = _lodUpgradeList;
    while (allowPass2 && pass2List && i < pass2List.length && performance.now() - t0 < budget
      && upgraded < pass2Cap && _lodUpgradeWindowCount + upgraded < windowMax) {
      const row = pass2List[i++];
      if (!row?.entry?.root?.userData?.simpleLod) continue;
      const tx = row.entry.data?.x ?? row.entry.root.position.x;
      const tz = row.entry.data?.z ?? row.entry.root.position.z;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 <= TREE_LOD_URGENT_R2) continue;
      const burst = _lodBurstMax(d2, fps, false);
      if (!burst) break;
      if (_upgradeTreeLodEntry(row.entry, px, pz)) {
        upgraded++;
        if (upgraded >= burst + 2) break;
      }
    }

    if (upgraded > 0) {
      _compactLodUpgradeList();
      _lodUpgradeWindowCount += upgraded;
    }
  }

  let _nameTagLosAcc = 0;
