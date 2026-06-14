/**
 * DecorGapMonitor — mesure les périodes sans décor autour du joueur (L3e).
 * Filtre console DevTools: decor-gap (pas une commande JS)
 * Résumé: ZS.DecorGapMonitor.dump()
 */
import { ContentRing, RING_RADIUS } from './content-rings.js';

const TAG = '[decor-gap]';
const NEAR_R = RING_RADIUS[ContentRing.NEAR];
const CRIT_R = RING_RADIUS[ContentRing.CRITICAL];
const TICK_S = 0.35;
const WAIT_PULSE_MS = 2000;
const HEARTBEAT_S = 2.5;
const SAMPLE_S = 2.0;
const GAP_TIMEOUT_MS = 45_000;
const EMERGENCY_GAP_MS = 8000;
const ARRIVE_SPEED = 0.85;
const MOVE_SPEED = 2.0;

function _enabledByDefault(ZS) {
  const href = typeof location !== 'undefined' ? location.search : '';
  const host = typeof location !== 'undefined' ? location.hostname : '';
  if (/(?:^|[?&])decorgap=0(?:&|$)/.test(href)) return false;
  if (/(?:^|[?&])decorgap(?:=|&|$)/.test(href)) return true;
  if (typeof localStorage !== 'undefined') {
    if (localStorage.getItem('zs_decor_gap') === '0') return false;
    if (localStorage.getItem('zs_decor_gap') === '1') return true;
    if (localStorage.getItem('zombie_is_admin') === '1') return true;
  }
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (ZS?.LoadLog?.isEnabled?.()) return true;
  return true;
}

export function createDecorGapMonitor(ZS) {
  let _enabled = _enabledByDefault(ZS);
  let _gameReady = false;
  let _active = null;
  let _gapId = 0;
  let _gapCount = 0;
  let _totalGapMs = 0;
  let _acc = 0;
  let _hbAcc = 0;
  let _sampleAcc = 0;
  let _lastWaitPulse = 0;
  let _tickCount = 0;
  let _wasMoving = false;
  let _lastSample = null;
  let _streamPauseState = { reason: '', at: 0, pending: null };
  let _lastStreamQueuedAt = 0;
  let _lastStreamQueuedN = 0;

  function _sinceLoad() {
    return ZS?.LoadLog?.sinceStart?.() ?? Math.round(performance.now());
  }

  function _log(event, data) {
    if (!_enabled) return;
    const payload = { t: _sinceLoad(), ...data };
    ZS?.LoadLog?.post?.(event, payload);
    console.info(TAG, event, payload);
  }

  function setEnabled(on) {
    _enabled = !!on;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('zs_decor_gap', on ? '1' : '0');
    }
    if (on) _logInit();
  }

  function isEnabled() {
    return _enabled;
  }

  function _logInit() {
    console.info(TAG, 'init', {
      t: _sinceLoad(),
      msg: 'DecorGapMonitor actif',
      help: 'Filtre DevTools: decor-gap | ZS.DecorGapMonitor.dump() | ?decorgap=0 pour couper',
      nearR: NEAR_R,
      critR: CRIT_R,
    });
  }

  _logInit();

  /** Appelé à la fin de game-init — débloque heartbeats + snapshot spawn. */
  function notifyGameReady(extra = {}) {
    _gameReady = true;
    _hbAcc = HEARTBEAT_S;
    _sampleAcc = SAMPLE_S;
    _log('decor-gap-game-ready', {
      x: Math.round(extra.x ?? 0),
      z: Math.round(extra.z ?? 0),
      deferTotal: extra.deferTotal ?? null,
      nearDecor: extra.nearDecor ?? null,
      deferredDecor: extra.deferredDecor ?? null,
      decorTotal: extra.decorTotal ?? null,
    });
  }

  /** Un fetch stream = demande de ressources pour une zone. */
  function notifyStreamQueued(n, fx, fz, extra = {}) {
    if (!n) return;
    const now = performance.now();
    const pending = extra.pending ?? null;
    const pulse = now - _lastStreamQueuedAt >= 2500;
    const bigBatch = n >= 6;
    if (!pulse && !bigBatch && n === _lastStreamQueuedN) return;
    _lastStreamQueuedAt = now;
    _lastStreamQueuedN = n;
    _log('decor-demand-stream', {
      queued: n,
      x: Math.round(fx),
      z: Math.round(fz),
      pending,
      lead: !!extra.lead,
      r: extra.r ?? null,
    });
  }

  /** Premier décor spawné pendant un gap actif. */
  function notifySpawn(tx, tz, decorId) {
    if (!_active) return;
    _active.spawnsDuring++;
    const gapMs = Math.round(performance.now() - _active.t0);
    if (_active.spawnsDuring === 1) {
      _log('decor-gap-first-spawn', {
        gapId: _active.id,
        gapMs,
        waitMs: gapMs,
        x: Math.round(tx),
        z: Math.round(tz),
        decorId: decorId || null,
        pending: _active.lastDemand,
        visible: _active.lastVisible,
      });
    }
  }

  function _demand(sample) {
    return (sample.pendingNear ?? 0)
      + (sample.pendingCritical ?? 0)
      + (sample.deferNear ?? 0);
  }

  function _speed(sample) {
    return Math.hypot(sample.vx ?? 0, sample.vz ?? 0);
  }

  function _underfill(sample) {
    const demand = _demand(sample);
    const visible = sample.visibleNear ?? 0;
    const total = visible + demand;
    return total > 0 ? demand / total : 0;
  }

  function _shouldStart(sample) {
    const pendingNear = sample.pendingNear ?? 0;
    const pendingCritical = sample.pendingCritical ?? 0;
    const ringDemand = pendingNear + pendingCritical;
    const deferNear = sample.deferNear ?? 0;
    const demand = ringDemand + deferNear;
    const visible = sample.visibleNear ?? 0;
    const speed = _speed(sample);
    const underfill = _underfill(sample);

    if (sample.forestHiddenNear && speed < 2.5) return 'forest-chunk';
    // Idle + gros backlog : visible compte le décor lointain dans 160 m → seuils absolus
    if (speed < 1.0 && ringDemand >= 10) return 'idle-backlog';
    if (speed < 1.2 && pendingCritical >= 8 && ringDemand >= 12) return 'idle-critical';
    if (speed < 1.2 && ringDemand >= 6 && underfill >= 0.38) return 'idle-underfill';
    if (deferNear >= 1 && visible < Math.max(2, deferNear * 0.4)) return 'defer-near';
    if (ringDemand < 1) return '';
    if (speed < 1.2 && ringDemand >= 3 && visible < ringDemand * 0.55) return 'idle-wait';
    if (speed >= 0.8 && pendingCritical >= 25) return 'travel-critical';
    if (speed >= 0.8 && (sample.pendingNear ?? 0) >= 18) return 'travel-near-backlog';
    if (speed >= 1.0 && ringDemand >= 8 && underfill >= 0.35) return 'travel-backlog';
    if (demand >= 4 && visible < demand * 0.35) return 'mixed-demand';
    return '';
  }

  function _isResolved(sample, gapMs) {
    const demand = _demand(sample);
    const visible = sample.visibleNear ?? 0;
    const ringDemand = (sample.pendingNear ?? 0) + (sample.pendingCritical ?? 0);
    if (gapMs >= GAP_TIMEOUT_MS) return 'timeout';
    if (_active?.reason === 'forest-chunk' && !sample.forestHiddenNear && demand <= 1) return 'forest-visible';
    if (demand <= 0 && !sample.forestHiddenNear) return 'pending-drained';
    if (ringDemand >= 8) return '';
    const spawned = visible - _active.spawned0;
    if (spawned >= Math.max(3, _active.pending0 * 0.5) && ringDemand <= 4) return 'visible-filled';
    if (visible >= _active.spawned0 + Math.max(2, _active.pending0 * 0.7) && ringDemand <= 4) return 'visible-filled';
    return '';
  }

  function _snapshot(sample) {
    return {
      x: Math.round(sample.px),
      z: Math.round(sample.pz),
      pendingNear: sample.pendingNear ?? 0,
      pendingCritical: sample.pendingCritical ?? 0,
      pendingFar: sample.pendingFar ?? 0,
      disk320: sample.disk320 ?? null,
      deferNear: sample.deferNear ?? 0,
      deferTotal: sample.deferPending ?? null,
      visible: sample.visibleNear ?? 0,
      totalNear: sample.totalNear ?? 0,
      underfill: Math.round(_underfill(sample) * 100) / 100,
      forestHidden: !!sample.forestHiddenNear,
      speed: Math.round(_speed(sample) * 10) / 10,
      initVis: !!sample.initVisActive,
      postSpawn: !!sample.postSpawnBusy,
      streamGate: sample.streamGate ?? null,
      prefetch: !!sample.approachPrefetch,
      exploration: !!sample.explorationBoost,
      criticalSurge: !!sample.criticalSurge,
    };
  }

  function _maybeHeartbeat(sample, dt) {
    if (!_gameReady) return;
    _hbAcc += dt;
    if (_hbAcc < HEARTBEAT_S) return;
    _hbAcc = 0;
    _log('decor-gap-heartbeat', {
      ticks: _tickCount,
      gaps: _gapCount,
      activeGap: _active ? _active.id : null,
      activeGapMs: _active ? Math.round(performance.now() - _active.t0) : 0,
      ..._snapshot(sample),
    });
  }

  function _maybeSamplePulse(sample, dt) {
    _sampleAcc += dt;
    if (_sampleAcc < SAMPLE_S) return;
    _sampleAcc = 0;
    const demand = _demand(sample);
    const speed = _speed(sample);
    const interesting = _gameReady && (
      demand >= 1
      || sample.forestHiddenNear
      || (sample.deferPending ?? 0) >= 1
      || speed >= 1.5
      || !!_active
    );
    if (!interesting) return;
    _log('decor-gap-sample', {
      ..._snapshot(sample),
      pending: demand,
      activeGap: _active ? _active.id : null,
      activeGapMs: _active ? Math.round(performance.now() - _active.t0) : 0,
    });
  }

  function _maybeArrived(sample) {
    const speed = _speed(sample);
    const moving = speed >= MOVE_SPEED;
    if (moving) {
      _wasMoving = true;
      return;
    }
    if (!_wasMoving || speed > ARRIVE_SPEED) return;
    _wasMoving = false;
    const snap = _snapshot(sample);
    const prev = _lastSample;
    _log('decor-gap-arrived', {
      ...snap,
      pending: _demand(sample),
      movedFrom: prev ? { x: prev.x, z: prev.z } : null,
    });
  }

  /**
   * @param {number} dt
   * @param {object} sample
   */
  function tick(dt, sample = {}) {
    if (!Number.isFinite(dt) || dt <= 0) dt = 1 / 60;
    _tickCount++;
    _lastSample = _snapshot(sample);
    _maybeHeartbeat(sample, dt);
    _maybeSamplePulse(sample, dt);
    _maybeArrived(sample);

    if (sample.initVisActive) return;
    _acc += dt;
    if (_acc < TICK_S) return;
    _acc = 0;

    const demand = _demand(sample);
    const visible = sample.visibleNear ?? 0;
    const speed = _speed(sample);

    if (!_active) {
      const reason = _shouldStart(sample);
      if (!reason) return;
      _active = {
        id: ++_gapId,
        t0: performance.now(),
        px: sample.px,
        pz: sample.pz,
        pending0: demand,
        spawned0: visible,
        spawnsDuring: 0,
        maxPending: demand,
        lastDemand: demand,
        lastVisible: visible,
        reason,
      };
      _lastWaitPulse = _active.t0;
      _log('decor-gap-start', {
        gapId: _active.id,
        ..._snapshot(sample),
        pending: demand,
        reason,
        speed: Math.round(speed * 10) / 10,
      });
      return;
    }

    _active.lastDemand = demand;
    _active.lastVisible = visible;
    _active.maxPending = Math.max(_active.maxPending, demand);
    const gapMs = performance.now() - _active.t0;
    const resolve = _isResolved(sample, gapMs);

    if (!resolve) {
      const now = performance.now();
      if (now - _lastWaitPulse >= WAIT_PULSE_MS && speed < 1.5 && demand >= 1) {
        _lastWaitPulse = now;
        _log('decor-gap-wait', {
          gapId: _active.id,
          gapMs: Math.round(gapMs),
          waitMs: Math.round(gapMs),
          pending: demand,
          visible,
          spawnsDuring: _active.spawnsDuring,
          ..._snapshot(sample),
        });
      }
      return;
    }

    const totalMs = Math.round(gapMs);
    _totalGapMs += totalMs;
    _gapCount++;
    _log('decor-gap-end', {
      gapId: _active.id,
      gapMs: totalMs,
      waitMs: totalMs,
      resolve,
      ..._snapshot(sample),
      pendingStart: _active.pending0,
      pendingEnd: demand,
      visibleStart: _active.spawned0,
      visibleEnd: visible,
      spawnsDuring: _active.spawnsDuring,
      maxPending: _active.maxPending,
      reason: _active.reason,
      gapCount: _gapCount,
      avgGapMs: _gapCount ? Math.round(_totalGapMs / _gapCount) : 0,
      totalGapMs: _totalGapMs,
    });
    if (totalMs >= 600 && _active.spawnsDuring === 0 && (demand >= 1 || sample.forestHiddenNear)) {
      _log('decor-gap-unfulfilled', {
        gapId: _active.id,
        gapMs: totalMs,
        waitMs: totalMs,
        pendingEnd: demand,
        visibleEnd: visible,
        reason: _active.reason,
      });
    }
    _active = null;
  }

  function notifyStreamPaused(reason, extra = {}) {
    if (!_enabled) return;
    const now = performance.now();
    const reasonChanged = reason !== _streamPauseState.reason;
    const pulseDue = now - _streamPauseState.at >= 5000;
    if (!reasonChanged && !pulseDue) return;
    if (reasonChanged && _streamPauseState.reason) {
      _log('decor-gap-stream-resume', {
        prevReason: _streamPauseState.reason,
        durationMs: Math.round(now - _streamPauseState.at),
      });
    }
    _streamPauseState = { reason, at: now, pending: extra.pending ?? null };
    _log('decor-gap-stream-pause', {
      reason,
      phase: reasonChanged ? 'start' : 'pulse',
      ...extra,
    });
  }

  function notifyStreamResumed() {
    if (!_enabled || !_streamPauseState.reason) return;
    _log('decor-gap-stream-resume', {
      prevReason: _streamPauseState.reason,
      durationMs: Math.round(performance.now() - _streamPauseState.at),
    });
    _streamPauseState = { reason: '', at: 0, pending: null };
  }

  function hasActiveGap() {
    return !!_active;
  }

  /** Gap actif >8 s sans aucun spawn visible — bypass gates defer. */
  function hasEmergencyGap() {
    if (!_active) return false;
    const gapMs = performance.now() - _active.t0;
    return gapMs >= EMERGENCY_GAP_MS
      && _active.spawnsDuring === 0
      && _active.lastDemand >= 1;
  }

  function getStats() {
    return {
      enabled: _enabled,
      gameReady: _gameReady,
      tickCount: _tickCount,
      active: _active ? {
        gapId: _active.id,
        gapMs: Math.round(performance.now() - _active.t0),
        pending: _active.lastDemand,
        visible: _active.lastVisible,
        spawnsDuring: _active.spawnsDuring,
        reason: _active.reason,
      } : null,
      gapCount: _gapCount,
      totalGapMs: _totalGapMs,
      avgGapMs: _gapCount ? Math.round(_totalGapMs / _gapCount) : 0,
      nearR: NEAR_R,
      critR: CRIT_R,
    };
  }

  function dump() {
    const s = getStats();
    console.info(TAG, 'dump', s);
    return s;
  }

  return {
    tick,
    notifySpawn,
    notifyStreamQueued,
    notifyStreamPaused,
    notifyStreamResumed,
    notifyGameReady,
    hasActiveGap,
    hasEmergencyGap,
    getStats,
    dump,
    setEnabled,
    isEnabled,
  };
}
