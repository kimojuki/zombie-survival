// Defer queue + tick spawn
function _resetDecorSpawnDefer() {
    const loader = ZS.Engine?.ContentLoader;
    if (loader) loader.resetDecor();
    else _decorDeferLegacy.pending.length = 0;
  }

  function _resetPropDefer() {
    _propDefer.loading = false;
    _propDefer.offset = 0;
    _propDefer.hasMore = true;
    _propDefer.active = false;
  }

  function _deferQueueHas(id) {
    if (!id) return true;
    if (decorItems.has(id)) return true;
    return _decorSpawnDefer.pending.some((d) => d.id === id);
  }

  function _queueDeferredProp(d) {
    if (!d?.id || _deferQueueHas(d.id)) return;
    _decorSpawnDefer.pending.push(d);
  }

  function _splitDecorForSpawn(list, px, pz) {
    const spawnR2 = _decorSpawnRadius2();
    let near = [];
    const deferred = [];
    for (const d of list) {
      if (_isCriticalPinnedDecor(d, d?.id)) {
        near.push(d);
        continue;
      }
      const dx = (Number.isFinite(d.x) ? d.x : px) - px;
      const dz = (Number.isFinite(d.z) ? d.z : pz) - pz;
      if (dx * dx + dz * dz <= spawnR2) near.push(d);
      else deferred.push(d);
    }
    return _capInitDecorNear(near, deferred, px, pz);
  }

  let _decorDeferLogAcc = 0;
  let _treeDeferLogLast = 0;
  /** Resnap arbres différés — budgeté (évite pic 500 ms dans network tick). */
  let _treeResnapPending = null;
  let _treeResnapSnapped = 0;

  function _roadsPostSpawnBusy() {
    return !!ZS._roadsPostSpawnBusy;
  }

  function _postSpawnVisualBusy() {
    return !!ZS._roadsPostSpawnBusy || !!ZS._sectorDecorBusy;
  }

  let _decorVisRing = null;
  let _decorVisCursor = 0;
  let _decorVisLastPx = NaN;
  let _decorVisLastPz = NaN;
  function _invalidateDecorVisRing() {
    _decorVisRing = null;
    _decorVisCursor = 0;
    _decorVisLastPx = NaN;
    _decorVisLastPz = NaN;
  }

  let _deferPruneAcc = 0;
  const _treeFetchGate = { reason: '', since: 0 };

  function _decorTickBudgetMs() {
    if (ZS.isFrameRecovering?.()) return ZS._isMobile ? 2 : 4;
    let base;
    if (_postSpawnVisualBusy()) base = ZS._isMobile ? 4 : 8;
    else base = ZS._isMobile ? 6 : 12;
    if (_inPostSectorDrainSoft()) base = Math.max(4, Math.floor(base * 0.72));
    const fps = ZS.PerfMonitor?.getStats?.()?.fps;
    if (fps != null && fps < 12) return Math.max(2, Math.floor(base * 0.35));
    if (fps != null && fps < 16) return Math.max(3, Math.floor(base * 0.55));
    if (fps != null && fps < 20) return Math.max(4, Math.floor(base * 0.75));
    return base;
  }

  function _deferLoaderBlockReason() {
    const lp = getLocalXZ();
    const plan = _lastBacklogPlan || _buildBacklogPlan(lp.x, lp.z);
    const gov = ZS.Engine?.BudgetGovernor;
    if (gov?.treeFetchBlockReason) {
      return gov.treeFetchBlockReason(plan, {
        deferPending: _decorSpawnDefer.pending.length,
        lodMid: _lodMidRingPendingCount(lp.x, lp.z),
        deferForced: plan?.deferForced ?? _deferForcedDrain(
          _decorSpawnDefer.pending.length,
          _lodMidRingPendingCount(lp.x, lp.z),
          _lodNearPendingCount(lp.x, lp.z),
        ),
      });
    }
    if (!plan || plan.allow.treeFetch) return '';
    if (plan.deferForced && plan.pressure.defer >= DEFER_STREAM_RESUME - 20) return '';
    if (plan.pressure.lodMid < 24 && plan.pressure.defer > 250) return '';
    if (plan.phase === 'sector-drain'
        && plan.pressure.defer > 180
        && !plan.deferForced
        && plan.pressure.lodMid > plan.th.pause * 0.65) return 'post-drain';
    if (plan.phase === 'sector-drain'
        && plan.pressure.lodMid > plan.th.pause
        && plan.pressure.defer > 100) return 'post-drain-lod';
    if (plan.pressure.lodMid > plan.th.high && plan.pressure.defer > 80) return 'lod-mid';
    if (plan.deferPaused) return 'defer-pause';
    if (plan.pressure.lodNear > 160 && plan.pressure.defer > 60) return 'lod-near';
    return 'backlog';
  }

  function _setTreeFetchGate(reason, ctx) {
    const r = reason || '';
    if (_treeFetchGate.reason === r) return;
    const now = performance.now();
    const base = ctx || _streamGateContext();
    if (_treeFetchGate.reason && !r) {
      ZS.LoadLog?.post?.('tree-fetch-gate-clear', {
        prev: _treeFetchGate.reason,
        blockedMs: Math.round(now - _treeFetchGate.since),
        ...base,
      });
    } else if (r) {
      ZS.LoadLog?.post?.('tree-fetch-gate', { reason: r, ...base });
    }
    _treeFetchGate.reason = r;
    _treeFetchGate.since = r ? now : 0;
  }

  function _maybePeriodicDeferPrune(px, pz, dt) {
    _deferPruneAcc += dt;
    if (_deferPruneAcc < 4) return;
    _deferPruneAcc = 0;
    const n = _decorSpawnDefer.pending.length;
    const lodN = _lodPendingCount();
    const lodMid = _lodMidRingPendingCount(px, pz);
    const th = _lodMidStreamThresholds();
    if (n < 280 && lodN < 520 && lodMid < th.pause) return;
    if (!_inPostSectorDrainSoft() && !_sectorDecorCooldown() && n < 420 && lodN < 620 && lodMid < th.pause * 1.1) return;
    const before = n;
    const dropped = _pruneDecorDeferFarFrom(px, pz);
    if (dropped > 0) {
      ZS.LoadLog?.post?.('defer-prune', {
        dropped,
        before,
        pending: _decorSpawnDefer.pending.length,
        lod: lodN,
        lodMid,
      });
    }
  }

  function _resnapOneGroundedDecor(entry) {
    const { root, data } = entry;
    if (!root || !_prefabResnapGround(data?.prefabId, data)) return false;
    const rotY = data.rotY ?? root.userData?.decorSpec?.rotY ?? root.rotation?.y ?? 0;
    const px = root.position.x;
    const pz = root.position.z;
    const gy = _s01DecorGroundY(data, px, pz, rotY);
    if (!Number.isFinite(gy)) return false;
    if (Math.abs(root.position.y - gy) < 0.02) return false;
    root.position.y = gy;
    data.y = gy;
    data.baseY = gy;
    root.userData.fastGroundSpawn = false;
    ZS.refreshDecorCollision?.(root);
    return true;
  }

  function _scheduleDeferredTreeResnap() {
    if (_treeResnapPending) return;
    _treeResnapPending = [];
    for (const entry of decorItems.values()) {
      const root = entry?.root;
      if (!root || !_prefabResnapGround(entry.data?.prefabId, entry.data)) continue;
      if (!root.userData?.fastGroundSpawn) continue;
      if (!entry.data?.prefabId?.startsWith('tree_')) continue;
      _treeResnapPending.push(entry);
    }
    if (!_treeResnapPending.length) {
      _treeResnapPending = null;
      return;
    }
    _treeResnapSnapped = 0;
    ZS.LoadLog?.post?.('deferred-trees-resnap-start', { count: _treeResnapPending.length });
    _tickDeferredTreeResnap();
  }

  function _tickDeferredTreeResnap() {
    if (!_treeResnapPending?.length) {
      _treeResnapPending = null;
      return;
    }
    if (!_decorTickHeavyAllowed()) {
      requestAnimationFrame(_tickDeferredTreeResnap);
      return;
    }
    const t0 = performance.now();
    const budget = _decorTickBudgetMs() || 10;
    while (_treeResnapPending.length && performance.now() - t0 < budget) {
      if (_resnapOneGroundedDecor(_treeResnapPending.shift())) _treeResnapSnapped++;
    }
    if (_treeResnapPending.length) {
      requestAnimationFrame(_tickDeferredTreeResnap);
      return;
    }
    const total = _treeResnapSnapped;
    _treeResnapPending = null;
    _treeResnapSnapped = 0;
    if (total > 0) console.info('[decor] resnap arbres différés:', total);
    ZS.LoadLog?.post?.('deferred-trees-resnap-done', { snapped: total });
  }

  function _decorTickHeavyAllowed() {
    if (ZS.isFrameRecovering?.()) return false;
    const s = ZS.PerfMonitor?.getStats?.();
    if (s?.frameMsMax != null && s.frameMsMax > 110) return false;
    if (s?.frameMsP95 != null && s.frameMsP95 > 95) return false;
    return true;
  }

  /** Spawn immédiat des décor en attente dans le rayon spawn (palmiers, arbres proches). */
  async function _flushSpawnZoneDeferSpawn(px, pz, opts = {}) {
    const radius = opts.radius ?? SPAWN_IMMEDIATE_R;
    const maxMs = opts.maxMs ?? (ZS._isMobile ? 320 : 480);
    const maxItems = opts.maxItems ?? (ZS._isMobile ? 120 : 200);
    const pending = _decorSpawnDefer.pending;
    if (!pending.length) return { spawned: 0, ms: 0 };

    const loader = ZS.Engine?.ContentLoader;
    const spawnR2 = _decorSpawnRadius2();
    const streamR = _gameInitDecorRadius() + _decorSpawnMargin();
    const streamR2 = streamR * streamR;
    const handlers = {
      simpleLod: (d) => _treeSpawnSimpleLod(d, px, pz),
      spawnOne: (d, o) => _spawnDecorItem(d, o),
      yield: () => _yieldToMainLight(),
    };

    _beginColliderBatch();
    let result;
    if (loader?.drainDecorRingAsync) {
      result = await loader.drainDecorRingAsync(px, pz, {
        maxItems,
        maxMs,
        radiusR2: radius * radius,
        spawnR2,
        streamR2,
        forceFastGround: true,
        batchSize: 24,
      }, handlers);
    } else {
      const t0 = performance.now();
      const toRemove = new Set();
      let spawned = 0;
      for (let i = 0; i < pending.length && spawned < maxItems; i++) {
        if (performance.now() - t0 >= maxMs) break;
        const d = pending[i];
        const tx = Number.isFinite(d.x) ? d.x : px;
        const tz = Number.isFinite(d.z) ? d.z : pz;
        if ((tx - px) ** 2 + (tz - pz) ** 2 > radius * radius) continue;
        toRemove.add(i);
        _spawnDecorItem(d, { simpleLod: _treeSpawnSimpleLod(d, px, pz), fastGround: true });
        spawned++;
        if (spawned % 24 === 0) await _yieldToMainLight();
      }
      if (toRemove.size) {
        const kept = [];
        for (let i = 0; i < pending.length; i++) {
          if (!toRemove.has(i)) kept.push(pending[i]);
        }
        pending.length = 0;
        pending.push(...kept);
      }
      result = { spawned, ms: Math.round(performance.now() - t0) };
    }
    _endColliderBatch();

    console.info('[sync] spawn-zone defer flush', result.spawned, 'obj', result.ms, 'ms · reste', _decorSpawnDefer.pending.length);
    ZS.LoadLog?.post?.('spawn-zone-defer-flush', {
      spawned: result.spawned,
      ms: result.ms,
      pending: _decorSpawnDefer.pending.length,
    });
    return result;
  }

  function _deferSpawnHandlers(px, pz, ctx) {
    const forcedDrain = ctx.forcedDrain;
    const lodNear = ctx.lodNear;
    const lodMid = ctx.lodMid;
    const lodMidTh = ctx.lodMidTh;
    const urgentPending = ctx.urgentPending;
    const approachPrefetch = ctx.approachPrefetch;
    const criticalSurge = ctx.criticalSurge;
    const explorationBoost = ctx.explorationBoost;
    const decorGapActive = ctx.decorGapActive;
    const decorGapEmergency = ctx.decorGapEmergency;
    const pendingNearRing = ctx.pendingNearRing ?? 0;
    const idleGapFill = decorGapActive || decorGapEmergency
      || (pendingNearRing >= 8 && (ctx.idleSpeed2 ?? 1) < 1.44);
    const vx = ctx.vx ?? 0;
    const vz = ctx.vz ?? 0;
    const farR2 = 320 * 320;
    const bypassLod = approachPrefetch || criticalSurge || explorationBoost || decorGapActive || idleGapFill;
    return {
      shouldSkip: (pick) => {
        if (decorGapActive && (pick.ring === 'critical' || pick.ring === 'near')) return false;
        if (decorGapEmergency && (pick.ring === 'critical' || pick.ring === 'near')) return false;
        if (idleGapFill && (pick.ring === 'critical' || pick.ring === 'near')) return false;
        if (bypassLod) {
          const tx = Number.isFinite(pick.d.x) ? pick.d.x : px;
          const tz = Number.isFinite(pick.d.z) ? pick.d.z : pz;
          const dx = tx - px;
          const dz = tz - pz;
          const dot = dx * vx + dz * vz;
          if (dot > 0 && dx * dx + dz * dz <= farR2) return false;
          if ((criticalSurge || explorationBoost || decorGapActive) && pick.ring === 'critical') return false;
          if ((explorationBoost || decorGapActive || idleGapFill) && pick.ring === 'near') return false;
        }
        if (urgentPending > LOD_URGENT_SPAWN_PAUSE && !decorGapActive && !idleGapFill
          && pick.d.prefabId?.startsWith('tree_')
          && _treeSpawnSimpleLod(pick.d, px, pz)) return true;
        if (!forcedDrain && !bypassLod && lodNear > 96
          && pick.d.prefabId?.startsWith('tree_')
          && _treeSpawnSimpleLod(pick.d, px, pz)) return true;
        if (!forcedDrain && !bypassLod && lodMid > lodMidTh.pause
          && pick.d.prefabId?.startsWith('tree_')
          && _treeSpawnSimpleLod(pick.d, px, pz)) return true;
        return false;
      },
      simpleLod: (d) => {
        if (decorGapActive || idleGapFill) {
          const tx = Number.isFinite(d.x) ? d.x : px;
          const tz = Number.isFinite(d.z) ? d.z : pz;
          if ((tx - px) ** 2 + (tz - pz) ** 2 <= TREE_LOD_NEAR_R2) return false;
        }
        return _treeSpawnSimpleLod(d, px, pz);
      },
      spawnOne: (d, o) => _spawnDecorItem(d, o),
    };
  }

  function _tickDecorSpawnDefer(px, pz, remainingMs) {
    const pending = _decorSpawnDefer.pending;
    if (!pending.length) return;

    const loader = ZS.Engine?.ContentLoader;
    const src = loader?.getStreamingSource?.() ?? { vx: 0, vz: 0 };
    const vx = src.vx ?? 0;
    const vz = src.vz ?? 0;
    const deferPending = pending.length;
    const lodMid = _lodMidRingPendingCount(px, pz);
    const lodNear = _lodNearPendingCount(px, pz);
    const plan = _lastBacklogPlan || _buildBacklogPlan(px, pz);
    const forcedDrain = _deferForcedDrain(deferPending, lodMid, lodNear);
    const zoneBoost = _inSpawnZoneBoost();
    const band0Pending = zoneBoost && _deferHasBand0Pending(px, pz);
    const urgentPending = _lodUrgentPendingCount(px, pz);
    const explorationBoost = _explorationBoostActive?.() ?? false;
    const approachPrefetch = _approachPrefetchActive?.() ?? false;
    const criticalSurge = _criticalSurgeActive?.() ?? false;
    const decorGapActive = !!ZS.Engine?.DecorGapMonitor?.hasActiveGap?.();
    const decorGapEmergency = !!ZS.Engine?.DecorGapMonitor?.hasEmergencyGap?.();
    const lodGapActive = !!ZS.Engine?.LodGapMonitor?.hasActiveGap?.();
    const lodTextureSurge = _lodTextureSurgeActive?.() ?? false;
    const nearCounts = loader?.pendingNearPlayer?.(px, pz) ?? {};
    const pendingNearRing = nearCounts.near ?? 0;
    const lead = ((approachPrefetch || criticalSurge) && loader?.computeLeadAnchor)
      ? loader.computeLeadAnchor(px, pz, vx, vz)
      : { lx: px, lz: pz, active: false };
    const drainX = ((approachPrefetch || criticalSurge) && lead.active) ? lead.lx : px;
    const drainZ = ((approachPrefetch || criticalSurge) && lead.active) ? lead.lz : pz;
    const gov = ZS.Engine?.BudgetGovernor;

    const gate = gov?.evaluateDeferSpawnGate?.(plan, {
      forcedDrain,
      band0Pending,
      explorationBoost,
      approachPrefetch,
      criticalSurge,
      decorGapActive,
      decorGapEmergency,
      lodGapActive,
      lodTextureSurge,
      initVisDeferBlocked: _initVisRevealDeferBlocked(),
      postSpawnVisualBusy: _postSpawnVisualBusy(),
      decorTickHeavyAllowed: _decorTickHeavyAllowed(),
      urgentPending,
      sectorCooldown: _sectorDecorCooldown(),
      recenterActive: _nearStream.recenterUntil > 0 && performance.now() < _nearStream.recenterUntil,
    }) ?? { allowed: true };

    if (!gate.allowed) return;

    const lodMidTh = plan?.th ?? _lodMidStreamThresholds();
    const maxSpawn = gov?.computeDeferSpawnQuota?.(plan, {
      isMobile: ZS._isMobile,
      deferPending,
      lodMid,
      lodNear,
      lodMidTh,
      urgentPending,
      decorN: decorItems.size,
      forcedDrain,
      band0Pending,
      explorationBoost,
      approachPrefetch,
      criticalSurge,
      decorGapActive,
      decorGapEmergency,
      lodGapActive,
      lodTextureSurge,
      simpleLodUrgent: _lodUrgentPendingCount(px, pz),
      pendingNearRing,
      postSpawnVisualBusy: _postSpawnVisualBusy(),
      sectorCooldown: _sectorDecorCooldown(),
      postSectorDrainSoft: _inPostSectorDrainSoft(),
      postRevealSpawnSoft: _inPostRevealSpawnSoft(),
      streamSoftStart: _inStreamSoftStart(),
      bootGrace: _inBootGrace(),
    }) ?? (plan?.quotas?.maxSpawn ?? (ZS._isMobile ? 6 : 12));

    _maybeLogDeferCap(maxSpawn, deferPending, lodNear);

    const budgetMs = gov?.getDeferSpawnCapMs?.({
      isMobile: ZS._isMobile,
      zoneBoost: band0Pending || explorationBoost || criticalSurge || decorGapActive || decorGapEmergency,
      approachPrefetch,
      criticalSurge,
      decorGapActive,
      decorGapEmergency,
      lodGapActive,
      lodTextureSurge,
      remainingMs,
    }) ?? (ZS._isMobile ? 6 : 9);

    const spawnR2 = _decorSpawnRadius2();
    const streamR = _gameInitDecorRadius() + _decorSpawnMargin();
    const streamR2 = streamR * streamR;
    const handlers = _deferSpawnHandlers(px, pz, {
      forcedDrain, lodNear, lodMid, lodMidTh, urgentPending,
      approachPrefetch, criticalSurge, explorationBoost, decorGapActive, decorGapEmergency, vx, vz,
      pendingNearRing,
      idleSpeed2: vx * vx + vz * vz,
    });

    _beginColliderBatch();
    let n = 0;
    let ms = 0;

    if (loader?.drainDecorRing) {
      const gapDrain = decorGapActive || decorGapEmergency
        || (pendingNearRing >= 10 && vx * vx + vz * vz < 1.44);
      const result = loader.drainDecorRing(drainX, drainZ, {
        maxItems: gapDrain ? Math.max(maxSpawn, ZS._isMobile ? 12 : 20) : maxSpawn,
        maxMs: gapDrain ? Math.max(budgetMs, ZS._isMobile ? 14 : 22) : budgetMs,
        spawnR2,
        streamR2,
      }, handlers);
      n = result.spawned;
      ms = result.ms;
    } else {
      const t0 = performance.now();
      const ranked = [];
      for (let i = 0; i < pending.length; i++) {
        const d = pending[i];
        const tx = Number.isFinite(d.x) ? d.x : px;
        const tz = Number.isFinite(d.z) ? d.z : pz;
        const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
        const band = d2 <= spawnR2 ? 0 : (d2 <= streamR2 ? 1 : 2);
        ranked.push({ index: i, d, d2, band });
      }
      ranked.sort((a, b) => a.band - b.band || a.d2 - b.d2);
      const toRemove = new Set();
      for (const pick of ranked) {
        if (n >= maxSpawn) break;
        if (performance.now() - t0 >= budgetMs) break;
        if (handlers.shouldSkip(pick)) continue;
        toRemove.add(pick.index);
        handlers.spawnOne(pick.d, {
          simpleLod: handlers.simpleLod(pick.d),
          fastGround: pick.band >= 1,
        });
        n++;
      }
      if (toRemove.size) {
        const kept = [];
        for (let i = 0; i < pending.length; i++) {
          if (!toRemove.has(i)) kept.push(pending[i]);
        }
        pending.length = 0;
        pending.push(...kept);
      }
      ms = Math.round(performance.now() - t0);
    }
    _endColliderBatch();

    if (n > 0) {
      _decorDeferLogAcc = (_decorDeferLogAcc || 0) + n;
      if (ms >= 8 || _decorDeferLogAcc % 48 === 0) {
        ZS.LoadLog?.post?.('decor-defer-spawn', {
          spawned: n,
          pending: pending.length,
          lodMid,
          ms,
          totalSpawned: _decorDeferLogAcc,
          gateBypass: !!gate.bypass,
        });
      }
    }
  }
