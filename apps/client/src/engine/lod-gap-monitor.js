/**
 * LodGapMonitor — mesure les périodes où le joueur voit des textures/arbre LOD basique
 * (simpleLod) en attente de la texture/mesh finale (L3i).
 * Filtre console DevTools: lod-gap (pas une commande JS)
 * Résumé: ZS.LodGapMonitor.dump()
 */
const TAG = '[lod-gap]';
const TICK_S = 0.35;
const WAIT_PULSE_MS = 2000;
const HEARTBEAT_S = 2.5;
const SAMPLE_S = 2.0;
const GAP_TIMEOUT_MS = 35_000;
const URGENT_R = 64;
const MID_R = 110;

function _enabledByDefault(ZS) {
  const href = typeof location !== 'undefined' ? location.search : '';
  const host = typeof location !== 'undefined' ? location.hostname : '';
  if (/(?:^|[?&])lodgap=0(?:&|$)/.test(href)) return false;
  if (/(?:^|[?&])lodgap(?:=|&|$)/.test(href)) return true;
  if (typeof localStorage !== 'undefined') {
    if (localStorage.getItem('zs_lod_gap') === '0') return false;
    if (localStorage.getItem('zs_lod_gap') === '1') return true;
    if (localStorage.getItem('zombie_is_admin') === '1') return true;
  }
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (ZS?.LoadLog?.isEnabled?.()) return true;
  return true;
}

export function createLodGapMonitor(ZS) {
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
  let _lastSample = null;

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
      localStorage.setItem('zs_lod_gap', on ? '1' : '0');
    }
    if (on) _logInit();
  }

  function isEnabled() {
    return _enabled;
  }

  function _logInit() {
    console.info(TAG, 'init', {
      t: _sinceLoad(),
      msg: 'LodGapMonitor actif — textures basiques (simpleLod) vs finales',
      help: 'Filtre DevTools: lod-gap | ZS.LodGapMonitor.dump() | ?lodgap=0 pour couper',
      urgentR: URGENT_R,
      midR: MID_R,
    });
  }

  _logInit();

  function notifyGameReady(extra = {}) {
    _gameReady = true;
    _hbAcc = HEARTBEAT_S;
    _sampleAcc = SAMPLE_S;
    _log('lod-gap-game-ready', {
      x: Math.round(extra.x ?? 0),
      z: Math.round(extra.z ?? 0),
      simpleLodTotal: extra.simpleLodTotal ?? null,
      simpleLodUrgent: extra.simpleLodUrgent ?? null,
      simpleLodMid: extra.simpleLodMid ?? null,
    });
  }

  /** Arbre spawné en simpleLod visible près du joueur. */
  function notifySimpleLodSpawn(tx, tz, decorId, extra = {}) {
    if (!_enabled) return;
    const ring = extra.ring ?? 'mid';
    _log('lod-gap-spawn-simple', {
      x: Math.round(tx),
      z: Math.round(tz),
      decorId: decorId || null,
      ring,
      simpleLodUrgent: extra.simpleLodUrgent ?? null,
      simpleLodMid: extra.simpleLodMid ?? null,
    });
    if (!_active) return;
    _active.spawnsDuring++;
    if (_active.spawnsDuring === 1) {
      const gapMs = Math.round(performance.now() - _active.t0);
      _log('lod-gap-first-simple', {
        gapId: _active.id,
        gapMs,
        x: Math.round(tx),
        z: Math.round(tz),
        decorId: decorId || null,
      });
    }
  }

  /** Upgrade simpleLod → mesh/textures finales. */
  function notifyLodUpgrade(tx, tz, decorId, extra = {}) {
    if (!_active) return;
    _active.upgradesDuring++;
    const gapMs = Math.round(performance.now() - _active.t0);
    if (_active.upgradesDuring === 1) {
      _log('lod-gap-first-upgrade', {
        gapId: _active.id,
        gapMs,
        waitMs: gapMs,
        x: Math.round(tx),
        z: Math.round(tz),
        decorId: decorId || null,
        lodMs: extra.lodMs ?? null,
        simpleLodUrgent: extra.simpleLodUrgent ?? _active.lastUrgent,
        simpleLodMid: extra.simpleLodMid ?? _active.lastMid,
      });
    }
  }

  function _speed(sample) {
    return Math.hypot(sample.vx ?? 0, sample.vz ?? 0);
  }

  function _pressure(sample) {
    const urgent = sample.simpleLodUrgent ?? 0;
    const mid = sample.simpleLodMid ?? 0;
    const near = sample.simpleLodNear ?? 0;
    return urgent * 3 + mid + near * 0.5;
  }

  function _shouldStart(sample) {
    const urgent = sample.simpleLodUrgent ?? 0;
    const mid = sample.simpleLodMid ?? 0;
    const near = sample.simpleLodNear ?? 0;
    const speed = _speed(sample);
    const blocked = !!sample.lodUpgradeBlocked;

    if (urgent >= 6) return blocked ? 'urgent-blocked' : 'urgent-many';
    if (speed < 1.2 && urgent >= 3) return blocked ? 'idle-urgent-blocked' : 'idle-urgent';
    if (speed < 1.2 && mid >= 12 && urgent >= 1) return 'idle-mid-backlog';
    if (speed >= 0.8 && urgent >= 4) return 'travel-urgent';
    if (speed >= 0.8 && near >= 10 && mid >= 8) return 'travel-mid';
    if (mid >= 20 && urgent >= 2) return 'mid-backlog';
    return '';
  }

  function _isResolved(sample, gapMs) {
    const urgent = sample.simpleLodUrgent ?? 0;
    const mid = sample.simpleLodMid ?? 0;
    const near = sample.simpleLodNear ?? 0;
    if (gapMs >= GAP_TIMEOUT_MS) return 'timeout';
    if (urgent <= 1 && near <= 4 && mid <= 8) return 'lod-drained';
    const upgraded = _active.upgradesDuring - _active.upgrades0;
    const startUrgent = _active.urgent0;
    if (startUrgent >= 3 && upgraded >= Math.max(2, startUrgent * 0.6) && urgent <= 2) return 'upgraded';
    if (_active.upgradesDuring >= 3 && urgent <= 2 && mid <= _active.mid0 * 0.5) return 'upgraded';
    return '';
  }

  function _snapshot(sample) {
    return {
      x: Math.round(sample.px),
      z: Math.round(sample.pz),
      simpleLodTotal: sample.simpleLodTotal ?? 0,
      simpleLodUrgent: sample.simpleLodUrgent ?? 0,
      simpleLodMid: sample.simpleLodMid ?? 0,
      simpleLodNear: sample.simpleLodNear ?? 0,
      lodUpgradeQueue: sample.lodUpgradeQueue ?? null,
      lodUpgradeBlocked: !!sample.lodUpgradeBlocked,
      lodUpgradeBlockReason: sample.lodUpgradeBlockReason ?? null,
      deferPending: sample.deferPending ?? null,
      fps: sample.fps ?? null,
      speed: Math.round(_speed(sample) * 10) / 10,
      initVis: !!sample.initVisActive,
      postSpawn: !!sample.postSpawnBusy,
    };
  }

  function _maybeHeartbeat(sample, dt) {
    if (!_gameReady) return;
    _hbAcc += dt;
    if (_hbAcc < HEARTBEAT_S) return;
    _hbAcc = 0;
    _log('lod-gap-heartbeat', {
      ticks: _tickCount,
      gaps: _gapCount,
      activeGap: _active ? _active.id : null,
      activeGapMs: _active ? Math.round(performance.now() - _active.t0) : 0,
      pressure: Math.round(_pressure(sample)),
      ..._snapshot(sample),
    });
  }

  function _maybeSamplePulse(sample, dt) {
    _sampleAcc += dt;
    if (_sampleAcc < SAMPLE_S) return;
    _sampleAcc = 0;
    const urgent = sample.simpleLodUrgent ?? 0;
    const mid = sample.simpleLodMid ?? 0;
    const speed = _speed(sample);
    const interesting = _gameReady && (
      urgent >= 1
      || mid >= 6
      || (sample.simpleLodTotal ?? 0) >= 40
      || speed >= 1.5
      || !!_active
      || !!sample.lodUpgradeBlocked
    );
    if (!interesting) return;
    _log('lod-gap-sample', {
      ..._snapshot(sample),
      pressure: Math.round(_pressure(sample)),
      activeGap: _active ? _active.id : null,
      activeGapMs: _active ? Math.round(performance.now() - _active.t0) : 0,
    });
  }

  function tick(dt, sample = {}) {
    if (!Number.isFinite(dt) || dt <= 0) dt = 1 / 60;
    _tickCount++;
    _lastSample = _snapshot(sample);
    _maybeHeartbeat(sample, dt);
    _maybeSamplePulse(sample, dt);

    if (sample.initVisActive) return;
    _acc += dt;
    if (_acc < TICK_S) return;
    _acc = 0;

    const urgent = sample.simpleLodUrgent ?? 0;
    const mid = sample.simpleLodMid ?? 0;
    const speed = _speed(sample);

    if (!_active) {
      const reason = _shouldStart(sample);
      if (!reason) return;
      _active = {
        id: ++_gapId,
        t0: performance.now(),
        px: sample.px,
        pz: sample.pz,
        urgent0: urgent,
        mid0: mid,
        near0: sample.simpleLodNear ?? 0,
        upgrades0: 0,
        upgradesDuring: 0,
        spawnsDuring: 0,
        maxUrgent: urgent,
        maxMid: mid,
        lastUrgent: urgent,
        lastMid: mid,
        reason,
      };
      _lastWaitPulse = _active.t0;
      _log('lod-gap-start', {
        gapId: _active.id,
        ..._snapshot(sample),
        pressure: Math.round(_pressure(sample)),
        reason,
        speed: Math.round(speed * 10) / 10,
      });
      return;
    }

    _active.lastUrgent = urgent;
    _active.lastMid = mid;
    _active.maxUrgent = Math.max(_active.maxUrgent, urgent);
    _active.maxMid = Math.max(_active.maxMid, mid);
    const gapMs = performance.now() - _active.t0;
    const resolve = _isResolved(sample, gapMs);

    if (!resolve) {
      const now = performance.now();
      if (now - _lastWaitPulse >= WAIT_PULSE_MS && urgent >= 1) {
        _lastWaitPulse = now;
        _log('lod-gap-wait', {
          gapId: _active.id,
          gapMs: Math.round(gapMs),
          waitMs: Math.round(gapMs),
          simpleLodUrgent: urgent,
          simpleLodMid: mid,
          upgradesDuring: _active.upgradesDuring,
          spawnsDuring: _active.spawnsDuring,
          ..._snapshot(sample),
        });
      }
      return;
    }

    const totalMs = Math.round(gapMs);
    _totalGapMs += totalMs;
    _gapCount++;
    _log('lod-gap-end', {
      gapId: _active.id,
      gapMs: totalMs,
      waitMs: totalMs,
      resolve,
      ..._snapshot(sample),
      urgentStart: _active.urgent0,
      urgentEnd: urgent,
      midStart: _active.mid0,
      midEnd: mid,
      upgradesDuring: _active.upgradesDuring,
      spawnsDuring: _active.spawnsDuring,
      maxUrgent: _active.maxUrgent,
      maxMid: _active.maxMid,
      reason: _active.reason,
      gapCount: _gapCount,
      avgGapMs: _gapCount ? Math.round(_totalGapMs / _gapCount) : 0,
      totalGapMs: _totalGapMs,
    });
    if (totalMs >= 500 && _active.upgradesDuring === 0 && urgent >= 2) {
      _log('lod-gap-unfulfilled', {
        gapId: _active.id,
        gapMs: totalMs,
        waitMs: totalMs,
        urgentEnd: urgent,
        midEnd: mid,
        reason: _active.reason,
        lodUpgradeBlocked: !!sample.lodUpgradeBlocked,
      });
    }
    _active = null;
  }

  function hasActiveGap() {
    return !!_active;
  }

  function getStats() {
    return {
      enabled: _enabled,
      gameReady: _gameReady,
      tickCount: _tickCount,
      active: _active ? {
        gapId: _active.id,
        gapMs: Math.round(performance.now() - _active.t0),
        urgent: _active.lastUrgent,
        mid: _active.lastMid,
        upgradesDuring: _active.upgradesDuring,
        spawnsDuring: _active.spawnsDuring,
        reason: _active.reason,
      } : null,
      gapCount: _gapCount,
      totalGapMs: _totalGapMs,
      avgGapMs: _gapCount ? Math.round(_totalGapMs / _gapCount) : 0,
      urgentR: URGENT_R,
      midR: MID_R,
      lastSample: _lastSample,
    };
  }

  function dump() {
    const s = getStats();
    console.info(TAG, 'dump', s);
    return s;
  }

  return {
    tick,
    notifySimpleLodSpawn,
    notifyLodUpgrade,
    notifyGameReady,
    hasActiveGap,
    getStats,
    dump,
    setEnabled,
    isEnabled,
  };
}
