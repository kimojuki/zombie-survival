// Stream fetch, gates, backlog
function _gameInitDecorRadius() {
    return ZS._isMobile ? 220 : 320;
  }

  function _decorSpawnMargin() {
    return ZS._isMobile ? 85 : 120;
  }

  function _decorSpawnRadius() {
    const vis = ZS.Options?.getProfile?.()?.decorVisRadius ?? 140;
    return vis + _decorSpawnMargin();
  }

  function _decorSpawnRadius2() {
    const r = _decorSpawnRadius();
    return r * r;
  }

  function _deferTreeRadius() {
    return _gameInitDecorRadius();
  }

  const _treeDefer = {
    queue: [],
    loading: false,
    offset: 0,
    hasMore: true,
    sx: 0,
    sz: 0,
    active: false,
  };

  /** Décor reçu en game-init mais pas encore instancié (hors rayon visibilité). */
  const _decorDeferLegacy = { pending: [] };
  function _decorDeferArray() {
    const loader = ZS.Engine?.ContentLoader;
    if (loader) return loader.getDecorPending();
    return _decorDeferLegacy.pending;
  }
  const _decorSpawnDefer = {
    get pending() { return _decorDeferArray(); },
  };

  /** Ancrage streaming arbres/props — recentré quand le joueur s'éloigne. */
  const _decorStream = {
    anchorX: null, anchorZ: null, lastX: null, lastZ: null, fetchX: null, fetchZ: null,
  };
  const STREAM_RECENTER_R = 160;
  const STREAM_MOVE_R = 100;
  const STREAM_FETCH_RESET_R = 80;

  function _resetDecorStream() {
    _decorStream.anchorX = null;
    _decorStream.anchorZ = null;
    _decorStream.lastX = null;
    _decorStream.lastZ = null;
    _decorStream.fetchX = null;
    _decorStream.fetchZ = null;
  }

  /** Pagination API : offset invalide si le joueur a bougé (liste triée par position). */
  function _resetFetchOffsetIfMoved(px, pz) {
    if (_decorStream.fetchX == null) {
      _decorStream.fetchX = px;
      _decorStream.fetchZ = pz;
      return false;
    }
    const dx = px - _decorStream.fetchX;
    const dz = pz - _decorStream.fetchZ;
    if (dx * dx + dz * dz < STREAM_FETCH_RESET_R * STREAM_FETCH_RESET_R) return false;
    _decorStream.fetchX = px;
    _decorStream.fetchZ = pz;
    return true;
  }

  function _maybeRecenterDecorStream(px, pz) {
    if (_decorStream.anchorX == null) {
      _decorStream.anchorX = px;
      _decorStream.anchorZ = pz;
      _decorStream.lastX = px;
      _decorStream.lastZ = pz;
      return;
    }
    const mdx = px - _decorStream.lastX;
    const mdz = pz - _decorStream.lastZ;
    if (mdx * mdx + mdz * mdz >= STREAM_MOVE_R * STREAM_MOVE_R) {
      _decorStream.lastX = px;
      _decorStream.lastZ = pz;
    }
    const sdx = px - _decorStream.anchorX;
    const sdz = pz - _decorStream.anchorZ;
    if (sdx * sdx + sdz * sdz < STREAM_RECENTER_R * STREAM_RECENTER_R) return;
    const jump2 = sdx * sdx + sdz * sdz;
    const isTeleport = jump2 > 100 * 100;
    _decorStream.anchorX = px;
    _decorStream.anchorZ = pz;
    _treeDefer.offset = 0;
    _treeDefer.hasMore = true;
    _treeDefer.sx = px;
    _treeDefer.sz = pz;
    _propDefer.offset = 0;
    _propDefer.hasMore = true;
    _propDefer.sx = px;
    _propDefer.sz = pz;
    _nearStream.offset = 0;
    _nearStream.hasMore = true;
    _nearStream.softStartAt = performance.now();
    const nearPending = ZS.Engine?.ContentLoader?.pendingNearPlayer?.(px, pz)?.total ?? 0;
    const pauseMs = isTeleport ? 5000
      : (nearPending >= 24 ? 900 : (_decorSpawnDefer.pending.length > 280 ? 3500 : 2000));
    _nearStream.recenterUntil = performance.now() + pauseMs;
    const dropped = _pruneDecorDeferFarFrom(px, pz);
    ZS.LoadLog?.post?.('decor-stream-recenter', {
      x: Math.round(px),
      z: Math.round(pz),
      teleport: isTeleport,
      droppedDefer: dropped,
      pauseMs,
      nearPending,
    });
  }

  function _updateExplorationBoost(px, pz) {
    const evalBoost = ZS.Engine?.ContentLoader?.evaluateExplorationBoost?.(px, pz, { minTotal: 15 });
    if (!evalBoost) return _explorationBoostActive();
    const now = performance.now();
    if (evalBoost.active) {
      _explorationBoostUntil = Math.max(_explorationBoostUntil, now + (evalBoost.durationMs ?? 10_000));
      if (evalBoost.total >= 30 && now - _lastExplorationBoostLogAt > 4000) {
        _lastExplorationBoostLogAt = now;
        ZS.LoadLog?.post?.('exploration-defer-boost', {
          critical: evalBoost.critical,
          near: evalBoost.near,
          total: evalBoost.total,
          pending: evalBoost.pending,
        });
      }
    }
    return _explorationBoostActive();
  }

  function _explorationBoostActive() {
    return performance.now() < _explorationBoostUntil;
  }

  function _updateApproachPrefetch(px, pz, vx, vz) {
    const evalPrefetch = ZS.Engine?.ContentLoader?.evaluateApproachPrefetch?.(px, pz, vx, vz);
    const now = performance.now();
    const speed2 = vx * vx + vz * vz;
    if (evalPrefetch?.active) {
      _approachPrefetchUntil = Math.max(_approachPrefetchUntil, now + (evalPrefetch.durationMs ?? 6000));
      if (now - _lastApproachPrefetchLogAt > 5000) {
        _lastApproachPrefetchLogAt = now;
        ZS.LoadLog?.post?.('approach-prefetch', {
          speed: Math.round((evalPrefetch.speed ?? 0) * 10) / 10,
          ahead: evalPrefetch.ahead?.total ?? 0,
          lead: Math.round(evalPrefetch.dist ?? 0),
          pending: evalPrefetch.pending,
        });
      }
    } else if (speed2 > 2.5 * 2.5) {
      _approachPrefetchUntil = Math.max(_approachPrefetchUntil, now + 3500);
    }
    return _approachPrefetchActive();
  }

  function _updateCriticalSurge(px, pz, vx, vz) {
    const evalSurge = ZS.Engine?.ContentLoader?.evaluateCriticalSurge?.(px, pz, vx, vz);
    if (!evalSurge) return _criticalSurgeActive();
    const now = performance.now();
    if (evalSurge.active) {
      _criticalSurgeUntil = Math.max(_criticalSurgeUntil, now + (evalSurge.durationMs ?? 12_000));
      if ((evalSurge.nearNow?.critical >= 24 || evalSurge.nearNow?.near >= 22)
        && now - _lastCriticalSurgeLogAt > 4000) {
        _lastCriticalSurgeLogAt = now;
        ZS.LoadLog?.post?.('critical-surge', {
          critical: evalSurge.nearNow?.critical ?? 0,
          near: evalSurge.nearNow?.near ?? 0,
          aheadCritical: evalSurge.ahead?.critical ?? 0,
          aheadTotal: evalSurge.ahead?.total ?? 0,
          speed: Math.round((evalSurge.speed ?? 0) * 10) / 10,
          pending: evalSurge.pending,
        });
      }
    }
    return _criticalSurgeActive();
  }

  function _criticalSurgeActive() {
    return performance.now() < _criticalSurgeUntil;
  }

  /** Beaucoup de simpleLod visibles → priorité upgrades textures finales. */
  function _updateLodTextureSurge(px, pz) {
    const urgent = _lodUrgentPendingCount(px, pz);
    const mid = _lodMidRingPendingCount(px, pz);
    const now = performance.now();
    const active = urgent >= 4 || mid >= 16 || (urgent >= 2 && mid >= 8);
    if (active) {
      _lodTextureSurgeUntil = Math.max(_lodTextureSurgeUntil, now + 14_000);
      if (now - _lastLodTextureSurgeLogAt > 4000) {
        _lastLodTextureSurgeLogAt = now;
        ZS.LoadLog?.post?.('lod-texture-surge', {
          urgent, mid, near: _lodNearPendingCount(px, pz),
          total: _lodPendingCount(),
        });
      }
    }
    return _lodTextureSurgeActive();
  }

  function _lodTextureSurgeActive() {
    return performance.now() < _lodTextureSurgeUntil;
  }

  function _approachPrefetchActive() {
    return performance.now() < _approachPrefetchUntil;
  }

  function _streamFetchPoint(px, pz, vx, vz) {
    const lead = ZS.Engine?.ContentLoader?.computeLeadAnchor?.(px, pz, vx, vz);
    if (!lead?.active) return { fx: px, fz: pz, extraR: 0 };
    return {
      fx: px + (lead.lx - px) * 0.55,
      fz: pz + (lead.lz - pz) * 0.55,
      extraR: Math.min(Math.round(lead.dist * 0.45), 72),
    };
  }

  /** Fetch décor dans un disque autour du joueur (exploration). */
  const STREAM_SOFT_MS = 12000;
  const STREAM_SOFT_EXTEND_MS = 6000;
  const POST_REVEAL_SPAWN_SOFT_MS = 15000;
  const LOD_STREAM_PAUSE = 680;
  const LOD_MID_STREAM_PAUSE = 105;
  const LOD_MID_BACKLOG_HIGH = 175;
  const LOD_MID_BOOT_PAUSE = 200;
  const LOD_MID_BOOT_HIGH = 280;
  const LOD_MID_SECTOR_PAUSE = 125;
  const LOD_MID_SECTOR_HIGH = 215;
  const DEFER_STREAM_PAUSE = 420;
  const DEFER_STREAM_RESUME = 380;
  const SECTOR_DECOR_COOLDOWN_MS = 8000;
  const POST_SECTOR_DRAIN_SOFT_MS = 8000;
  const LOD_URGENT_PRESSURE = 40;
  const LOD_URGENT_SPAWN_PAUSE = 80;
  let _postSectorDrainUntil = 0;
  let _streamSoftExtraUntil = 0;
  let _lastBacklogPlan = null;
  const _streamGate = { reason: '', since: 0 };
  let _lastDeferCapLogAt = 0;
  let _lastDeferCapVal = -1;
  let _explorationBoostUntil = 0;
  let _lastExplorationBoostLogAt = 0;
  let _approachPrefetchUntil = 0;
  let _lastApproachPrefetchLogAt = 0;
  let _criticalSurgeUntil = 0;
  let _lastCriticalSurgeLogAt = 0;
  let _lodTextureSurgeUntil = 0;
  let _lastLodTextureSurgeLogAt = 0;
  const _nearStream = {
    active: false,
    loading: false,
    offset: 0,
    hasMore: true,
    fetchAcc: 0,
    softStartAt: 0,
    recenterUntil: 0,
  };

  function _syncDeferGatePaused(deferN) {
    return ZS.BacklogScheduler?.syncDeferGate(deferN) ?? (deferN > DEFER_STREAM_PAUSE);
  }

  function _deferForcedDrain(deferN, lodMid, lodNear) {
    return ZS.BacklogScheduler?.deferForced(deferN, lodMid, lodNear, _inBootGrace()) ?? false;
  }

  function _buildBacklogPlan(px, pz) {
    const deferN = _decorSpawnDefer.pending.length;
    const lodMid = _lodMidRingPendingCount(px, pz);
    const lodNear = _lodNearPendingCount(px, pz);
    const lodTotal = _lodPendingCount();
    const fpsStats = ZS.PerfMonitor?.getStats?.() ?? {};
    const deferForced = _deferForcedDrain(deferN, lodMid, lodNear);
    const nearCounts = ZS.Engine?.ContentLoader?.pendingNearPlayer?.(px, pz) ?? {};
    const ctx = {
      deferPending: deferN,
      lodTotalPending: lodTotal,
      lodNearPending: lodNear,
      lodMidPending: lodMid,
      lodUrgentPending: _lodUrgentPendingCount(px, pz),
      pendingCritical: nearCounts.critical ?? 0,
      pendingNearRing: nearCounts.near ?? 0,
      streamActive: _nearStream.active,
      initVisActive: _initVisRevealBusy(),
      initVisDeferBlocked: _initVisRevealDeferBlocked(),
      roadsBusy: !!ZS._roadsPostSpawnBusy,
      sectorDecorBusy: !!ZS._sectorDecorBusy,
      sectorCooldown: _sectorDecorCooldown(),
      postSectorDrain: _inPostSectorDrainSoft(),
      streamSoft: _inStreamSoftStart(),
      bootGrace: _inBootGrace(),
      recenterUntil: (_nearStream.recenterUntil > 0 && performance.now() < _nearStream.recenterUntil) ? 1 : 0,
      recenterActive: _nearStream.recenterUntil > 0 && performance.now() < _nearStream.recenterUntil,
      postSpawnVisualBusy: _postSpawnVisualBusy(),
      frameRecovering: !!ZS.isFrameRecovering?.(),
      deferForced,
      isMobile: !!ZS._isMobile,
      fps: fpsStats.fps ?? null,
      approachPrefetch: _approachPrefetchActive(),
      explorationBoost: _explorationBoostActive(),
      criticalSurge: _criticalSurgeActive(),
      lodTextureSurge: _lodTextureSurgeActive(),
      decorGapActive: !!ZS.Engine?.DecorGapMonitor?.hasActiveGap?.(),
      decorGapEmergency: !!ZS.Engine?.DecorGapMonitor?.hasEmergencyGap?.(),
      lodGapActive: !!ZS.Engine?.LodGapMonitor?.hasActiveGap?.(),
    };
    _lastBacklogPlan = ZS.Engine?.DecorPressure?.evaluate(ctx)
      ?? ZS.BacklogScheduler?.evaluate(ctx)
      ?? null;
    if (_lastBacklogPlan) {
      ZS._backlogPlan = _lastBacklogPlan;
      ZS._roadBuildBudgetMs = _lastBacklogPlan.quotas.roadBudgetMs;
      if (!ZS.Engine?.DecorPressure) {
        ZS.Engine?.Telemetry?.postBacklogSnapshot?.(_lastBacklogPlan);
      }
    }
    return _lastBacklogPlan;
  }

  function _lodMidStreamThresholds() {
    const phase = _lastBacklogPlan?.phase;
    if (phase && ZS.BacklogScheduler?.LOD_MID) {
      if (phase === 'sector-build' || phase === 'sector-drain') return ZS.BacklogScheduler.LOD_MID.sector;
      if (phase === 'boot' || phase === 'stream-soft') return ZS.BacklogScheduler.LOD_MID.boot;
      return ZS.BacklogScheduler.LOD_MID.normal;
    }
    if (_isSectorLoadBusy()) {
      return { pause: LOD_MID_SECTOR_PAUSE, high: LOD_MID_SECTOR_HIGH };
    }
    if (_inBootGrace()) {
      return { pause: LOD_MID_BOOT_PAUSE, high: LOD_MID_BOOT_HIGH };
    }
    return { pause: LOD_MID_STREAM_PAUSE, high: LOD_MID_BACKLOG_HIGH };
  }

  function _inStreamSoftStart() {
    const now = performance.now();
    if (_nearStream.active && _nearStream.softStartAt > 0
      && now - _nearStream.softStartAt < STREAM_SOFT_MS) return true;
    return _streamSoftExtraUntil > now;
  }

  function _maybeExtendStreamSoft() {
    if (!_nearStream.active || !_nearStream.softStartAt) return;
    const now = performance.now();
    if (now - _nearStream.softStartAt < STREAM_SOFT_MS) return;
    if (_streamSoftExtraUntil > now) return;
    const deferN = _decorSpawnDefer.pending.length;
    const lp = getLocalXZ();
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const th = _lodMidStreamThresholds();
    if (deferN <= 180 && lodMid <= th.pause * 0.88) return;
    if (deferN > 200) return;
    if (deferN > 300 && lodMid === 0) return;
    if (_lodNearPendingCount(lp.x, lp.z) > 160 && deferN > 80) return;
    _streamSoftExtraUntil = now + STREAM_SOFT_EXTEND_MS;
    ZS.LoadLog?.post?.('stream-soft-extend', {
      ms: STREAM_SOFT_EXTEND_MS,
      defer: deferN,
      lodMid,
    });
  }

  function _isSectorLoadBusy() {
    return _sectorDecorCooldown() || _inPostSectorDrainSoft() || !!ZS._sectorDecorBusy;
  }

  function _inPostRevealSpawnSoft() {
    return _postRevealSpawnUntil > 0 && performance.now() < _postRevealSpawnUntil;
  }

  function _sectorDecorCooldown() {
    const until = ZS._sectorDecorCooldownUntil || 0;
    return until > 0 && performance.now() < until;
  }

  function _inPostSectorDrainSoft() {
    return _postSectorDrainUntil > 0 && performance.now() < _postSectorDrainUntil;
  }

  function _markSectorDecorCooldown() {
    const now = performance.now();
    const lp = getLocalXZ();
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const th = _lodMidStreamThresholds();
    let drainMs = POST_SECTOR_DRAIN_SOFT_MS;
    if (lodMid > th.pause) drainMs += 4000;
    else if (lodMid > th.pause * 0.65) drainMs += 2000;
    ZS._sectorDecorCooldownUntil = now + SECTOR_DECOR_COOLDOWN_MS;
    _postSectorDrainUntil = ZS._sectorDecorCooldownUntil + drainMs;
    ZS.LoadLog?.post?.('sector-decor-cooldown', {
      ms: SECTOR_DECOR_COOLDOWN_MS,
      drainSoftMs: drainMs,
      lodMid,
    });
  }

  function _streamGateContext() {
    const lp = getLocalXZ();
    const lodTotal = _lodPendingCount();
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const lodNear = _lodNearPendingCount(lp.x, lp.z);
    const plan = _lastBacklogPlan;
    return {
      defer: _decorSpawnDefer.pending.length,
      lod: lodTotal,
      lodNear,
      lodMid,
      lodMidTh: plan?.th ?? _lodMidStreamThresholds(),
      urgent: _lodUrgentPendingCount(lp.x, lp.z),
      phase: plan?.phase ?? null,
      priority: plan?.priority ?? null,
    };
  }

  function _setStreamGate(reason, ctx) {
    const r = reason || '';
    if (_streamGate.reason === r) return;
    const now = performance.now();
    const base = ctx || _streamGateContext();
    const pauseReasons = { 'drain-first': 1, 'spawn-only': 1 };
    if (_streamGate.reason && pauseReasons[_streamGate.reason]) {
      ZS.Engine?.DecorGapMonitor?.notifyStreamResumed?.();
    }
    if (_streamGate.reason && !r) {
      ZS.LoadLog?.post?.('stream-gate-clear', {
        prev: _streamGate.reason,
        blockedMs: Math.round(now - _streamGate.since),
        ...base,
      });
    } else if (r) {
      ZS.LoadLog?.post?.('stream-gate', { reason: r, ...base });
    }
    if (r && pauseReasons[r]) {
      const lp = getLocalXZ();
      ZS.Engine?.DecorGapMonitor?.notifyStreamPaused?.(r, {
        x: Math.round(lp.x), z: Math.round(lp.z),
        pending: base.defer ?? _decorSpawnDefer.pending.length,
        activeGap: !!ZS.Engine?.DecorGapMonitor?.hasActiveGap?.(),
        lodGapActive: !!ZS.Engine?.LodGapMonitor?.hasActiveGap?.(),
      });
    }
    _streamGate.reason = r;
    _streamGate.since = r ? now : 0;
  }

  function _streamGateBlockReason(px, pz) {
    const plan = _lastBacklogPlan || _buildBacklogPlan(px, pz);
    if (!plan) {
      if (!_nearStream.active) return 'inactive';
      return '';
    }
    const gov = ZS.Engine?.BudgetGovernor;
    if (gov?.canWork?.('stream', plan)) return '';
    return plan.reasons?.stream || 'backlog';
  }

  function _maybeLogDeferCap(maxSpawn, deferPending, lodNear) {
    if (maxSpawn > 5 || !ZS.LoadLog?.isEnabled?.()) return;
    const now = performance.now();
    if (maxSpawn === _lastDeferCapVal && now - _lastDeferCapLogAt < 8000) return;
    _lastDeferCapLogAt = now;
    _lastDeferCapVal = maxSpawn;
    ZS.LoadLog.post('defer-cap', {
      maxSpawn,
      deferPending,
      lodNear,
      lodTotal: _lodPendingCount(),
      lodMid: _lodMidRingPendingCount(getLocalXZ().x, getLocalXZ().z),
      sectorCooldown: _sectorDecorCooldown(),
      postDrain: _inPostSectorDrainSoft(),
      postRevealSoft: _inPostRevealSpawnSoft(),
    });
  }

  function _streamFetchLimit(lodMidN, decorN, deferN, th) {
    const deferPending = deferN ?? _decorSpawnDefer.pending.length;
    const gates = th || _lodMidStreamThresholds();
    if (_inStreamSoftStart()) {
      return ZS._isMobile ? 12 : 20;
    }
    if (_inPostSectorDrainSoft()) {
      if (deferPending > 150) return ZS._isMobile ? 6 : 10;
      return ZS._isMobile ? 8 : 12;
    }
    if (lodMidN > gates.pause) return ZS._isMobile ? 4 : 8;
    if (deferPending > 300) return ZS._isMobile ? 8 : 12;
    if (deferPending > 150) return ZS._isMobile ? 12 : 20;
    let limit = ZS._isMobile ? 80 : 120;
    if (lodMidN > gates.pause * 0.65) limit = ZS._isMobile ? 24 : 36;
    else if (decorN > 2000) limit = ZS._isMobile ? 32 : 48;
    else if (decorN > 1400) limit = ZS._isMobile ? 48 : 72;
    return limit;
  }

  function _resetNearStream() {
    _nearStream.active = false;
    _nearStream.loading = false;
    _nearStream.offset = 0;
    _nearStream.hasMore = true;
    _nearStream.fetchAcc = 0;
    _nearStream.softStartAt = 0;
    _nearStream.recenterUntil = 0;
    _streamSoftExtraUntil = 0;
  }

  function _pruneDecorDeferFarFrom(px, pz) {
    const pending = _decorSpawnDefer.pending;
    if (!pending.length) return 0;
    const th = _lodMidStreamThresholds();
    const lodMid = _lodMidRingPendingCount(px, pz);
    let margin = 96;
    if (lodMid > th.high) margin = 24;
    else if (lodMid > th.pause) margin = 48;
    const minKeepR = 416;
    const keepR = Math.max(_nearStreamRadius() + margin, minKeepR);
    const keepR2 = keepR * keepR;
    const maxDrop = 80;
    const isP0 = ZS.Engine?.isP0GameplayDecor;
    const keep = [];
    const dropCandidates = [];
    for (let i = 0; i < pending.length; i++) {
      const d = pending[i];
      if (isP0?.(d)) {
        keep.push(d);
        continue;
      }
      const tx = Number.isFinite(d.x) ? d.x : px;
      const tz = Number.isFinite(d.z) ? d.z : pz;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 <= keepR2) keep.push(d);
      else dropCandidates.push({ d, d2 });
    }
    dropCandidates.sort((a, b) => b.d2 - a.d2);
    const dropN = Math.min(maxDrop, dropCandidates.length);
    for (let i = dropN; i < dropCandidates.length; i++) {
      keep.push(dropCandidates[i].d);
    }
    const dropped = pending.length - keep.length;
    pending.length = 0;
    pending.push(...keep);
    return dropped;
  }

  function _nearStreamRadius() {
    return _gameInitDecorRadius() + _decorSpawnMargin() + 48;
  }

  function _beginNearStream(sx, sz) {
    _resetNearStream();
    _nearStream.active = true;
    _nearStream.softStartAt = performance.now();
    _decorStream.anchorX = sx;
    _decorStream.anchorZ = sz;
    _decorStream.lastX = sx;
    _decorStream.lastZ = sz;
    _decorStream.fetchX = sx;
    _decorStream.fetchZ = sz;
    ZS.LoadLog?.post?.('decor-stream-start', {
      x: Math.round(sx),
      z: Math.round(sz),
      r: _nearStreamRadius(),
      softMs: STREAM_SOFT_MS,
    });
  }

  async function _fetchDecorStreamNearBatch(px, pz, vx, vz) {
    if (_nearStream.loading || !_nearStream.hasMore) return;
    const plan = _lastBacklogPlan || _buildBacklogPlan(px, pz);
    if (!plan?.allow.stream) return;
    _nearStream.loading = true;
    if (_resetFetchOffsetIfMoved(px, pz)) _nearStream.offset = 0;
    const fetchPt = _streamFetchPoint(px, pz, vx ?? 0, vz ?? 0);
    const r = _nearStreamRadius() + (fetchPt.extraR || 0);
    const decorN = decorItems.size;
    const lodMid = plan.pressure.lodMid;
    const deferN = plan.pressure.defer;
    const th = plan.th;
    const limit = _streamFetchLimit(lodMid, decorN, deferN, th);
    try {
      const res = await fetch(
        `/api/world/decor-stream?x=${encodeURIComponent(fetchPt.fx)}&z=${encodeURIComponent(fetchPt.fz)}`
        + `&r=${r}&limit=${limit}&offset=${_nearStream.offset}`,
      );
      if (res.status === 404) {
        _nearStream.hasMore = false;
        return;
      }
      if (!res.ok) {
        _nearStream.hasMore = false;
        return;
      }
      const json = await res.json();
      if (ZS.Engine?.DecorGapMonitor?.hasActiveGap?.()
          || ZS.Engine?.LodGapMonitor?.hasActiveGap?.()) {
        return;
      }
      let queued = 0;
      const queueCap = plan.quotas.streamQueueCap;
      for (const d of (json.items || [])) {
        if (!d?.id || _deferQueueHas(d.id)) continue;
        if (queued >= queueCap) break;
        _decorSpawnDefer.pending.push(d);
        queued++;
      }
      _nearStream.offset = json.nextOffset ?? (_nearStream.offset + (json.items?.length || 0));
      _nearStream.hasMore = !!json.hasMore;
      if (queued > 0 || !json.hasMore) {
        ZS.Engine?.DecorGapMonitor?.notifyStreamQueued?.(queued, fetchPt.fx, fetchPt.fz, {
          pending: _decorSpawnDefer.pending.length,
          lead: fetchPt.extraR > 0,
          r,
        });
        ZS.LoadLog?.post?.('decor-stream-fetch', {
          queued,
          pending: _decorSpawnDefer.pending.length,
          offset: _nearStream.offset,
          total: json.total,
          hasMore: _nearStream.hasMore,
          lead: fetchPt.extraR > 0,
          r,
        });
      }
    } catch (e) {
      console.warn('[sync] decor-stream', e);
    } finally {
      _nearStream.loading = false;
    }
  }

  function _tickDecorStreamFetch(px, pz, dt, vx, vz) {
    const loader = ZS.Engine?.ContentLoader;
    const activeGap = !!ZS.Engine?.DecorGapMonitor?.hasActiveGap?.();
    const lodGapActive = !!ZS.Engine?.LodGapMonitor?.hasActiveGap?.();
    if (loader?.shouldDeferStreamFetch?.(px, pz)) {
      _setStreamGate('drain-first', { defer: _decorSpawnDefer.pending.length, lod: _lodPendingCount() });
      return;
    }
    if (loader?.shouldPauseStreamFetch?.(px, pz, vx ?? 0, vz ?? 0, { activeGap, lodGapActive })) {
      _setStreamGate('spawn-only', { defer: _decorSpawnDefer.pending.length, lod: _lodPendingCount() });
      return;
    }
    const block = _streamGateBlockReason(px, pz);
    if (block) {
      _setStreamGate(block, { defer: _decorSpawnDefer.pending.length, lod: _lodPendingCount(), lodMid: _lodMidRingPendingCount(px, pz) });
      return;
    }
    _setStreamGate('');
    const lodMid = _lodMidRingPendingCount(px, pz);
    const deferN = _decorSpawnDefer.pending.length;
    const th = _lodMidStreamThresholds();
    _maybeRecenterDecorStream(px, pz);
    _nearStream.fetchAcc += dt;
    const moving = (vx * vx + vz * vz) > 1.44;
    const prefetch = _approachPrefetchActive();
    const surge = _criticalSurgeActive();
    const pendingLow = deferN < (prefetch || surge ? 8 : (_inStreamSoftStart() ? 24 : 56));
    const decorN = decorItems.size;
    let fetchInterval = decorN > 2000 ? 0.38 : decorN > 1400 ? 0.28 : 0.22;
    if (moving || prefetch || surge) fetchInterval = Math.min(fetchInterval, surge ? 0.10 : (prefetch ? 0.12 : 0.16));
    if (_inStreamSoftStart()) fetchInterval = Math.max(fetchInterval, prefetch ? 0.18 : 0.45);
    if (_inPostSectorDrainSoft()) fetchInterval = Math.max(fetchInterval, 0.78);
    if (lodMid > th.pause * 0.65) fetchInterval = Math.max(fetchInterval, 0.42);
    if (lodMid > th.pause * 0.9) fetchInterval = 0.58;
    if (deferN > 250) fetchInterval = Math.max(fetchInterval, 0.72);
    else if (deferN > 120) fetchInterval = Math.max(fetchInterval, 0.55);
    const due = _nearStream.fetchAcc >= fetchInterval;
    if (!_nearStream.hasMore || _nearStream.loading) return;
    if (!due && !pendingLow && !prefetch && !surge) return;
    _maybeExtendStreamSoft();
    _nearStream.fetchAcc = 0;
    _fetchDecorStreamNearBatch(px, pz, vx, vz);
  }

  const _propDefer = {
    loading: false,
    offset: 0,
    hasMore: true,
    sx: 0,
    sz: 0,
    active: false,
  };
