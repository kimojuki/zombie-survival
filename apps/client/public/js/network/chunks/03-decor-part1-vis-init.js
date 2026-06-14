// Visibilite init + reveal
function _resetTreeDefer() {
    _treeDefer.queue.length = 0;
    _treeDefer.loading = false;
    _treeDefer.offset = 0;
    _treeDefer.hasMore = true;
    _treeDefer.active = false;
  }

  function _isPinnedDecor(data, decorId) {
    if (!data) return true;
    const pid = data.prefabId || data.type || '';
    if (data.immutable || (data.placementKey && String(data.placementKey).startsWith('s01:'))) return true;
    if (pid.startsWith('build_') || pid.startsWith('wreck_')) return true;
    if (pid.includes('door') || pid === 'storage_chest') return true;
    if (data.locked != null || data.doorOpen != null || data.storageOpen != null) return true;
    if (pid.startsWith('tree_') && decorId && ZS.isTreeVisPinned?.(decorId)) return true;
    return false;
  }

  /** POI interactifs / builds — toujours spawn init. Le reste (s01 seed lointain) = rayon. */
  function _isCriticalPinnedDecor(data, decorId) {
    if (!data) return false;
    const pid = data.prefabId || data.type || '';
    if (pid.startsWith('build_') || pid.startsWith('wreck_')) return true;
    if (pid === 'storage_chest' || pid === 'building_survivor_shack') return true;
    if (pid.includes('door')) return true;
    if (data.locked != null || data.doorOpen != null || data.storageOpen != null) return true;
    if (pid.startsWith('tree_') && decorId && ZS.isTreeVisPinned?.(decorId)) return true;
    return false;
  }

  const INIT_NEAR_DECOR_CAP = () => (ZS._isMobile ? 420 : 680);
  const SPAWN_IMMEDIATE_R = 100;
  const SPAWN_IMMEDIATE_R2 = SPAWN_IMMEDIATE_R * SPAWN_IMMEDIATE_R;

  function _capInitDecorNear(near, deferred, px, pz) {
    const cap = INIT_NEAR_DECOR_CAP();
    const immediate = [];
    const rest = [];
    for (const d of near) {
      if (_isCriticalPinnedDecor(d, d?.id)) {
        immediate.push(d);
        continue;
      }
      const tx = Number.isFinite(d.x) ? d.x : px;
      const tz = Number.isFinite(d.z) ? d.z : pz;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 <= SPAWN_IMMEDIATE_R2) immediate.push(d);
      else rest.push(d);
    }
    if (rest.length + immediate.length <= cap) {
      return { near: immediate.concat(rest), deferred };
    }
    rest.sort((a, b) => {
      const ax = (Number.isFinite(a.x) ? a.x : px) - px;
      const az = (Number.isFinite(a.z) ? a.z : pz) - pz;
      const bx = (Number.isFinite(b.x) ? b.x : px) - px;
      const bz = (Number.isFinite(b.z) ? b.z : pz) - pz;
      return (ax * ax + az * az) - (bx * bx + bz * bz);
    });
    const room = Math.max(0, cap - immediate.length);
    const kept = immediate.concat(rest.slice(0, room));
    const overflow = rest.slice(room);
    if (overflow.length) {
      console.info('[sync] décor init capped', kept.length, '+', overflow.length, 'différés (cap', cap, ')');
      ZS.LoadLog?.post?.('init-decor-cap', { kept: kept.length, overflow: overflow.length, cap, immediate: immediate.length });
    }
    return { near: kept, deferred: deferred.concat(overflow) };
  }

  function _decorVisRadius2() {
    const r = ZS.Options?.getProfile?.()?.decorVisRadius ?? 140;
    return r * r;
  }

  let _decorVisAcc = 0;
  let _spawnReadyAt = 0;
  const INIT_VIS_REVEAL_MS = 3600;
  const INIT_VIS_REVEAL_HOLD_FRAMES = 4;
  const INIT_VIS_REVEAL_EXPAND_PAUSE_FRAMES = 4;
  const INIT_VIS_EXPAND_MIN_DR2 = 28;
  /** Rayon visibilité progressif pendant hold (évite pic render shader compile). */
  const INIT_VIS_HOLD_RADIUS = [10, 16, 22, 30, 38, 46, 54, 64];
  const _initVisReveal = {
    active: false,
    phase: 'idle',
    px: 0,
    pz: 0,
    radius2: 0,
    targetR2: 0,
    expandStartAt: 0,
    lastAppliedR2: 0,
  };

  function _effectiveDecorVisR2() {
    if (_initVisReveal.active) {
      const target = _initVisReveal.targetR2 || _decorVisRadius2();
      return Math.min(_initVisReveal.radius2, target);
    }
    return _decorVisRadius2();
  }

  /** Compte décor spawnés dans un rayon (visible vs total). */
  function _countDecorNear(px, pz, radius) {
    const r2 = radius * radius;
    let visible = 0;
    let total = 0;
    for (const { root, data } of decorItems.values()) {
      if (!root || !data) continue;
      const tx = Number.isFinite(data.x) ? data.x : root.position.x;
      const tz = Number.isFinite(data.z) ? data.z : root.position.z;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 > r2) continue;
      total++;
      if (root.visible) visible++;
    }
    return { visible, total };
  }

  function _countDeferNear(px, pz, radius) {
    const r2 = radius * radius;
    let n = 0;
    for (const d of _decorSpawnDefer.pending) {
      const tx = Number.isFinite(d.x) ? d.x : px;
      const tz = Number.isFinite(d.z) ? d.z : pz;
      if ((tx - px) ** 2 + (tz - pz) ** 2 <= r2) n++;
    }
    return n;
  }

  function _sampleDecorGap(px, pz) {
    const loader = ZS.Engine?.ContentLoader;
    const rings = loader?.pendingRingSummary?.(px, pz)
      ?? loader?.pendingNearPlayer?.(px, pz)
      ?? { critical: 0, near: 0, total: 0, far: 0, disk320: 0 };
    const counts = _countDecorNear(px, pz, 160);
    return {
      pendingNear: rings.near ?? 0,
      pendingCritical: rings.critical ?? 0,
      pendingFar: rings.far ?? 0,
      disk320: rings.disk320 ?? 0,
      visibleNear: counts.visible,
      totalNear: counts.total,
      deferNear: _countDeferNear(px, pz, 160),
      deferPending: _decorSpawnDefer.pending.length,
    };
  }

  const BOOT_GRACE_MS = 12000;
  const SPAWN_ZONE_BOOST_MS = 25000;
  let _spawnZoneCollidersRegistered = 0;

  function _inSpawnZoneBoost() {
    return _spawnReadyAt > 0 && performance.now() - _spawnReadyAt < SPAWN_ZONE_BOOST_MS;
  }

  function _deferHasBand0Pending(px, pz) {
    const spawnR2 = _decorSpawnRadius2();
    for (const d of _decorSpawnDefer.pending) {
      const tx = Number.isFinite(d.x) ? d.x : px;
      const tz = Number.isFinite(d.z) ? d.z : pz;
      if ((tx - px) ** 2 + (tz - pz) ** 2 <= spawnR2) return true;
    }
    return false;
  }
  const TREE_LOD_URGENT_R = 64;
  const TREE_LOD_URGENT_R2 = TREE_LOD_URGENT_R * TREE_LOD_URGENT_R;
  const TREE_LOD_NEAR_R2 = 72 * 72;
  const INIT_TREE_FULL_LOD_R2 = 105 * 105;
  const TREE_LOD_MID_R2 = 110 * 110;
  const LOD_BACKLOG_MID = 450;
  const LOD_BACKLOG_HIGH = 800;
  const LOD_BOOT_GRACE_MS = 3500;
  const LOD_UPGRADE_WINDOW_MS = 4000;
  const LOD_UPGRADE_WINDOW_MAX = 80;
  let _lodUpgradeList = null;
  let _lodLastScanPx = NaN;
  let _lodLastScanPz = NaN;
  let _lodUpgradeWindowAt = 0;
  let _lodUpgradeWindowCount = 0;
  let _postInitPending = null;
  let _deferredInvDebugTrace = null;
  let _postRevealSpawnUntil = 0;
  const DEFERRED_TREE_START_MS = 4000;

  function _resetInitVisReveal() {
    _initVisReveal.active = false;
    _initVisReveal.phase = 'idle';
    _initVisReveal.radius2 = 0;
    _initVisReveal.expandStartAt = 0;
    _initVisReveal.lastAppliedR2 = 0;
  }

  function _beginInitVisReveal(px, pz) {
    _initVisReveal.active = true;
    _initVisReveal.phase = 'pre';
    _initVisReveal.px = px;
    _initVisReveal.pz = pz;
    const r0 = INIT_VIS_HOLD_RADIUS[0];
    _initVisReveal.radius2 = r0 * r0;
    _initVisReveal.targetR2 = _decorVisRadius2();
    _initVisReveal.expandStartAt = 0;
    _initVisReveal.lastAppliedR2 = 0;
    const touched = _applyInitVisReveal(px, pz);
    ZS.LoadLog?.post?.('init-vis-reveal-start', {
      r: r0,
      targetR: Math.round(Math.sqrt(_initVisReveal.targetR2)),
      holdFrames: INIT_VIS_REVEAL_HOLD_FRAMES,
      touched,
    });
  }

  function _initVisToggleBudget() {
    if (ZS.isFrameRecovering?.()) return ZS._isMobile ? 12 : 20;
    if (_initVisReveal.phase === 'expand') return ZS._isMobile ? 32 : 48;
    if (_initVisReveal.phase === 'hold' || _initVisReveal.phase === 'pause') {
      return ZS._isMobile ? 36 : 56;
    }
    return 9999;
  }

  function _applyInitVisReveal(px, pz, maxToggles) {
    if (!_initVisReveal.active) return 0;
    const outerR2 = Math.min(_initVisReveal.radius2, _initVisReveal.targetR2);
    const innerR2 = _initVisReveal.lastAppliedR2 || 0;
    if (outerR2 <= innerR2) return 0;
    const budget = maxToggles ?? _initVisToggleBudget();
    let touched = 0;
    let toggles = 0;
    let complete = true;
    decorItems.forEach((entry, id) => {
      if (toggles >= budget) {
        complete = false;
        return;
      }
      if (!entry?.root) return;
      if (_isPinnedDecor(entry.data, id)) {
        entry.root.visible = true;
        return;
      }
      const tx = entry.data?.x ?? entry.root.position.x;
      const tz = entry.data?.z ?? entry.root.position.z;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 <= innerR2) return;
      if (d2 <= outerR2) {
        if (!entry.root.visible) {
          touched++;
          toggles++;
        }
        entry.root.visible = true;
        return;
      }
      if (entry.root.visible) {
        entry.root.visible = false;
        touched++;
        toggles++;
      }
    });
    if (complete) _initVisReveal.lastAppliedR2 = outerR2;
    _initVisReveal.px = px;
    _initVisReveal.pz = pz;
    return touched;
  }

  async function _runInitVisRevealHoldFrames(px, pz) {
    if (!_initVisReveal.active) return;
    _initVisReveal.phase = 'hold';
    _initVisReveal.px = px;
    _initVisReveal.pz = pz;
    await _yieldToMain();
    for (let f = 0; f < INIT_VIS_REVEAL_HOLD_FRAMES; f++) {
      const holdR = INIT_VIS_HOLD_RADIUS[Math.min(f + 1, INIT_VIS_HOLD_RADIUS.length - 1)];
      _initVisReveal.radius2 = holdR * holdR;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const t0 = performance.now();
      const touched = _applyInitVisReveal(px, pz);
      const ms = Math.round(performance.now() - t0);
      if (ms >= 12 && ZS.LoadLog?.isEnabled?.()) {
        ZS.LoadLog.post('init-vis-hold-step', { f: f + 1, r: holdR, ms, touched });
      }
    }
    _initVisReveal.phase = 'pause';
    for (let f = 0; f < INIT_VIS_REVEAL_EXPAND_PAUSE_FRAMES; f++) {
      const pauseIdx = INIT_VIS_REVEAL_HOLD_FRAMES + f + 1;
      const holdR = INIT_VIS_HOLD_RADIUS[Math.min(pauseIdx, INIT_VIS_HOLD_RADIUS.length - 1)];
      _initVisReveal.radius2 = holdR * holdR;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      _applyInitVisReveal(px, pz);
    }
    _initVisReveal.phase = 'expand';
    _initVisReveal.expandStartAt = performance.now();
    ZS.LoadLog?.post?.('init-vis-reveal-expand', {
      holdFrames: INIT_VIS_REVEAL_HOLD_FRAMES,
      pauseFrames: INIT_VIS_REVEAL_EXPAND_PAUSE_FRAMES,
      targetR: Math.round(Math.sqrt(_initVisReveal.targetR2)),
    });
  }

  function _tickInitVisReveal(px, pz) {
    if (!_initVisReveal.active) return false;
    if (_initVisReveal.phase === 'pre' || _initVisReveal.phase === 'hold' || _initVisReveal.phase === 'pause') {
      _initVisReveal.px = px;
      _initVisReveal.pz = pz;
      return true;
    }
    if (_initVisReveal.phase !== 'expand') return false;
    const elapsed = performance.now() - _initVisReveal.expandStartAt;
    const tLin = Math.min(1, elapsed / INIT_VIS_REVEAL_MS);
    const t = 1 - (1 - tLin) ** 3;
    const urgentR = TREE_LOD_URGENT_R;
    const visR = Math.sqrt(_initVisReveal.targetR2);
    const r = urgentR + (visR - urgentR) * t;
    const outerR2 = r * r;
    if (outerR2 - (_initVisReveal.lastAppliedR2 || 0) < INIT_VIS_EXPAND_MIN_DR2 && t < 1) {
      _initVisReveal.px = px;
      _initVisReveal.pz = pz;
      return true;
    }
    _initVisReveal.radius2 = outerR2;
    _initVisReveal.px = px;
    _initVisReveal.pz = pz;
    _applyInitVisReveal(px, pz);
    if (t >= 1) {
      _initVisReveal.active = false;
      _initVisReveal.phase = 'idle';
      ZS.LoadLog?.post?.('init-vis-reveal-done', {
        ms: Math.round(elapsed),
        r: Math.round(visR),
        holdFrames: INIT_VIS_REVEAL_HOLD_FRAMES,
      });
      _runPostInitWorkIfReady();
    }
    return true;
  }

  function _initVisRevealHoldPhase() {
    if (!_initVisReveal.active) return false;
    const p = _initVisReveal.phase;
    return p === 'pre' || p === 'hold' || p === 'pause';
  }

  function _initVisRevealDeferBlocked() {
    if (!_initVisReveal.active) return false;
    const p = _initVisReveal.phase;
    return p === 'pre' || p === 'hold' || p === 'pause';
  }

  function _initVisRevealBusy() {
    if (!_initVisReveal.active) return false;
    if (_initVisReveal.phase === 'pre' || _initVisReveal.phase === 'hold' || _initVisReveal.phase === 'pause') return true;
    return _initVisReveal.phase === 'expand';
  }
