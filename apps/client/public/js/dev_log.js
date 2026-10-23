// Logs client structurés pour playtest / feedback console navigateur.
// Filtres DevTools : zs-dev | zs-load
(function () {
  'use strict';

  if (window.__ZS_DEV_LOG_INIT) return;
  window.__ZS_DEV_LOG_INIT = true;

  const TAG = '[zs-dev]';
  const LOAD_TAG = '[zs-load]';
  const MAX_BUF = 120;
  const MAX_LOAD_BUF = 600;
  const LOAD_T0 = performance.now();

  function _defaultOn() {
    if (/(?:^|[?&])devlog=0(?:&|$)/.test(location.search)) return false;
    if (/(?:^|[?&])devlog(?:=|&|$)/.test(location.search)) return true;
    if (localStorage.getItem('zs_dev_log') === '0') return false;
    if (localStorage.getItem('zs_dev_log') === '1') return true;
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  function _loadDefaultOn() {
    if (/(?:^|[?&])loadlog=0(?:&|$)/.test(location.search)) return false;
    if (/(?:^|[?&])loadlog(?:=|&|$)/.test(location.search)) return true;
    if (localStorage.getItem('zs_load_log') === '0') return false;
    if (localStorage.getItem('zs_load_log') === '1') return true;
    return _defaultOn();
  }

  let _enabled = _defaultOn();
  let _loadEnabled = _loadDefaultOn();
  const _buf = [];
  const _loadSteps = [];
  const _openLoadSteps = new Map();

  function _clientVersion() {
    return window.__ZS_CLIENT_VERSION || null;
  }

  function _sinceLoadStart() {
    return Math.round(performance.now() - LOAD_T0);
  }

  function log(category, message, data) {
    if (!_enabled) return;
    const row = {
      t: Date.now(),
      cat: category || 'misc',
      msg: message || '',
      ...(data !== undefined ? { data } : {}),
      client: _clientVersion(),
    };
    _buf.push(row);
    while (_buf.length > MAX_BUF) _buf.shift();
    if (data !== undefined) {
      console.info(TAG, category, message, row);
    } else {
      console.info(TAG, category, message);
    }
  }

  function perf(label, ms, extra) {
    log('perf', label, { ms: Math.round(ms), ...extra });
  }

  function intro(message, data) {
    log('intro', message, data);
  }

  function sync(message, data) {
    log('sync', message, data);
  }

  function boot(message, data) {
    log('boot', message, data);
  }

  function scenario(message, data) {
    log('intro', `scenario:${message}`, data);
  }

  function trail(message, data) {
    log('trail-decor', message, data);
  }

  function s01(message, data) {
    log('s01', message, data);
  }

  function dump() {
    return _buf.slice();
  }

  function setEnabled(on) {
    _enabled = !!on;
    localStorage.setItem('zs_dev_log', on ? '1' : '0');
    if (on) {
      console.info(TAG, 'init', {
        msg: 'DevLog actif',
        help: 'Filtre: zs-dev | ZS.DevLog.dump() | ZS.DevLog.setEnabled(false)',
        client: _clientVersion(),
      });
    }
  }

  function isEnabled() {
    return _enabled;
  }

  function loadMark(name, data) {
    const row = { at: _sinceLoadStart(), name, ...(data || {}) };
    _loadSteps.push(row);
    while (_loadSteps.length > MAX_LOAD_BUF) _loadSteps.shift();
    if (!_loadEnabled) return;
    if (data !== undefined) {
      console.info(LOAD_TAG, `+${row.at}ms`, name, data);
    } else {
      console.info(LOAD_TAG, `+${row.at}ms`, name);
    }
  }

  function loadStepStart(name, data) {
    _openLoadSteps.set(name, performance.now());
    loadMark(`▶ ${name}`, data);
  }

  function loadStepEnd(name, data) {
    const t0 = _openLoadSteps.get(name);
    const ms = t0 != null ? Math.round(performance.now() - t0) : null;
    if (t0 != null) _openLoadSteps.delete(name);
    const row = { at: _sinceLoadStart(), name: `✓ ${name}`, ms, ...(data || {}) };
    _loadSteps.push(row);
    if (_loadEnabled) {
      const dur = ms != null ? `${ms}ms` : '';
      if (data !== undefined) {
        console.info(LOAD_TAG, `+${row.at}ms`, `✓ ${name}`, dur, data);
      } else {
        console.info(LOAD_TAG, `+${row.at}ms`, `✓ ${name}`, dur);
      }
    }
    if (ms != null && ms >= 500) {
      console.warn(LOAD_TAG, 'SLOW', name, `${ms}ms`, data || '');
    }
  }

  function loadPhase(phaseKey, pct, msg, detail) {
    if (!_loadEnabled) return;
    const p = Math.round(Math.max(0, Math.min(100, pct)));
    console.info(LOAD_TAG, `+${_sinceLoadStart()}ms`, `phase:${phaseKey}`, `${p}%`, msg || '', detail || '');
  }

  function loadPayloadBytes(data) {
    try {
      return JSON.stringify(data).length;
    } catch {
      return null;
    }
  }

  function loadSummary(label) {
    if (!_loadEnabled) return;
    const rows = _loadSteps.filter((s) => s.ms != null || String(s.name || '').startsWith('✓'));
    console.info(LOAD_TAG, '══════════════════════════════════════');
    console.info(LOAD_TAG, 'RÉSUMÉ', label || 'chargement', `— ${rows.length} étapes`);
    if (rows.length) {
      console.table(rows.map((s) => ({
        '+ms': s.at,
        step: s.name,
        dur: s.ms != null ? `${s.ms}ms` : '',
        ...(s.count != null ? { count: s.count } : {}),
        ...(s.decor != null ? { decor: s.decor } : {}),
        ...(s.bytes != null ? { bytes: s.bytes } : {}),
      })));
    }
    const slow = rows.filter((s) => s.ms != null && s.ms >= 500);
    if (slow.length) {
      console.warn(LOAD_TAG, 'Étapes lentes (≥500ms):', slow.map((s) => `${s.name} ${s.ms}ms`).join(' · '));
    }
    console.info(LOAD_TAG, 'dump: ZS.LoadLog.dump() | filtre console: zs-load');
    console.info(LOAD_TAG, '══════════════════════════════════════');
  }

  function loadDump() {
    return _loadSteps.slice();
  }

  function loadSetEnabled(on) {
    _loadEnabled = !!on;
    localStorage.setItem('zs_load_log', on ? '1' : '0');
    if (on) {
      console.info(LOAD_TAG, 'init', {
        msg: 'LoadLog actif',
        help: 'Filtre: zs-load | post:fps / backlog-snapshot / stream-gate / frame-recover / adaptive-pr-drop / init-vis-hold-step / defer-cap | ?loadlog=0',
        client: _clientVersion(),
        sinceMs: _sinceLoadStart(),
      });
    }
  }

  function loadIsEnabled() {
    return _loadEnabled;
  }

  /** Logs post-spawn (préfixe post:). */
  function loadPost(name, data) {
    loadMark(`post:${name}`, data);
  }

  /** Frame lente en jeu (≥ seuil ms). */
  let _lastFreezeLogAt = 0;
  function loadSlowFrame(ms, data) {
    if (!_loadEnabled || ms < 50) return;
    const row = { at: _sinceLoadStart(), name: 'frame-freeze', ms: Math.round(ms), ...(data || {}) };
    if (ms >= 200) {
      _loadSteps.push(row);
      while (_loadSteps.length > MAX_LOAD_BUF) _loadSteps.shift();
    }
    const fps = ZS.PerfMonitor?.getStats?.();
    const fpsNow = fps?.fps ?? null;
    const loggable = ms >= 200 || (ms >= 80 && fpsNow != null && fpsNow < 24);
    if (!loggable) return;
    const now = performance.now();
    const throttle = ms >= 200 ? 800 : 4000;
    if (now - _lastFreezeLogAt < throttle) return;
    _lastFreezeLogAt = now;
    console.info(LOAD_TAG, 'FRAME-FREEZE', `+${row.at}ms`, `${row.ms}ms`, {
      ...(data || {}),
      fps: fpsNow,
      fpsMin: fps?.fpsMin ?? null,
    });
  }

  /** Échantillons FPS périodiques (zs-load) — corrélé aux rames. */
  const _fpsWatch = {
    active: false,
    intervalMs: 8000,
    lastAt: 0,
    samples: [],
    worst: null,
    lowDips: 0,
  };
  const _backlogWatch = {
    intervalMs: 20000,
    lastAt: 0,
    peakDefer: 0,
    peakLod: 0,
    peakLodMid: 0,
    peakUrgent: 0,
    peakColliderFar: 0,
  };

  function _resetFpsWatch() {
    _fpsWatch.active = false;
    _fpsWatch.lastAt = 0;
    _fpsWatch.samples = [];
    _fpsWatch.worst = null;
    _fpsWatch.lowDips = 0;
    _backlogWatch.lastAt = 0;
    _backlogWatch.peakDefer = 0;
    _backlogWatch.peakLod = 0;
    _backlogWatch.peakLodMid = 0;
    _backlogWatch.peakUrgent = 0;
    _backlogWatch.peakColliderFar = 0;
  }

  function _tickBacklogSnapshot(ctx) {
    if (!_loadEnabled) return;
    const now = performance.now();
    if (now - _backlogWatch.lastAt < _backlogWatch.intervalMs) return;
    _backlogWatch.lastAt = now;
    const defer = ctx.decorPending ?? 0;
    const lod = ctx.simpleLodPending ?? 0;
    const lodMid = ctx.simpleLodMidPending ?? 0;
    const urgent = ctx.urgentLodPending ?? 0;
    const colliderFar = ctx.colliderFar ?? 0;
    if (defer > _backlogWatch.peakDefer) _backlogWatch.peakDefer = defer;
    if (lod > _backlogWatch.peakLod) _backlogWatch.peakLod = lod;
    if (lodMid > _backlogWatch.peakLodMid) _backlogWatch.peakLodMid = lodMid;
    if (urgent > _backlogWatch.peakUrgent) _backlogWatch.peakUrgent = urgent;
    if (colliderFar > _backlogWatch.peakColliderFar) _backlogWatch.peakColliderFar = colliderFar;
    loadPost('backlog-snapshot', {
      defer,
      lod,
      lodMid,
      urgent,
      colliderFar,
      peakDefer: _backlogWatch.peakDefer,
      peakLod: _backlogWatch.peakLod,
      peakLodMid: _backlogWatch.peakLodMid,
      peakUrgent: _backlogWatch.peakUrgent,
      peakColliderFar: _backlogWatch.peakColliderFar,
      streamGate: ctx.streamGate ?? null,
      streamSoftExtra: !!ctx.streamSoftExtra,
      treeGate: ctx.treeFetchGate ?? null,
      decorBudget: ctx.decorBudget ?? null,
      sectorLoadBusy: !!ctx.sectorLoadBusy,
      postSectorDrain: !!ctx.postSectorDrain,
      initVisReveal: ctx.initVisReveal ?? null,
    });
  }

  function tickPerfSample(frameMs, sect) {
    if (!_loadEnabled || !_fpsWatch.active) return;
    const now = performance.now();
    if (now - _fpsWatch.lastAt < _fpsWatch.intervalMs) return;
    _fpsWatch.lastAt = now;

    const fps = ZS.PerfMonitor?.getStats?.() || {};
    const render = ZS.PerfMonitor?.getRenderStats?.() || null;
    const ctx = ZS.Network?.getPerfContext?.() || {};
    _tickBacklogSnapshot(ctx);
    const row = {
      fps: fps.fps ?? null,
      fpsMin: fps.fpsMin ?? null,
      frameMsP95: fps.frameMsP95 ?? null,
      frameMsMax: fps.frameMsMax ?? null,
      lastFrameMs: Math.round(frameMs),
      drawCalls: render?.drawCalls ?? null,
      triangles: render?.triangles ?? null,
      geometries: render?.geometries ?? null,
      roadsBusy: !!window.ZS?._roadsPostSpawnBusy,
      sectorDecorBusy: !!window.ZS?._sectorDecorBusy,
      decorSpawned: ctx.decorSpawned ?? null,
      decorPending: ctx.decorPending ?? null,
      decorTotal: ctx.decorSpawned ?? null,
      simpleLodPending: ctx.simpleLodPending ?? null,
      simpleLodMidPending: ctx.simpleLodMidPending ?? null,
      urgentLodPending: ctx.urgentLodPending ?? null,
      streamGate: ctx.streamGate ?? null,
      treeGate: ctx.treeFetchGate ?? null,
      decorBudget: ctx.decorBudget ?? null,
      sectorCooldown: !!ctx.sectorCooldown,
      postSectorDrain: !!ctx.postSectorDrain,
      initVisReveal: ctx.initVisReveal ?? null,
      frameRecover: !!window.ZS?.isFrameRecovering?.(),
      preNet: sect?.preNet != null ? Math.round(sect.preNet) : null,
      network: sect?.network != null ? Math.round(sect.network) : null,
      renderMs: sect?.render != null ? Math.round(sect.render) : null,
    };
    _fpsWatch.samples.push({ at: _sinceLoadStart(), ...row });
    if (fps.fps != null && (!_fpsWatch.worst || fps.fps < _fpsWatch.worst.fps)) {
      _fpsWatch.worst = { at: _sinceLoadStart(), ...row };
    }
    loadPost('fps', row);
    if (fps.fps != null && fps.fps < 22) {
      _fpsWatch.lowDips++;
      console.info(LOAD_TAG, 'FPS-LOW', `+${_sinceLoadStart()}ms`, row);
    }
  }

  function _fpsWatchSummary(slowFrames) {
    const vals = _fpsWatch.samples.map((s) => s.fps).filter((f) => f != null);
    const summary = {
      samples: vals.length,
      fpsMin: vals.length ? Math.min(...vals) : null,
      fpsAvg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
      fpsLast: vals.length ? vals[vals.length - 1] : null,
      lowDips: _fpsWatch.lowDips,
      slowFrames: slowFrames ?? null,
      worst: _fpsWatch.worst,
      peakDefer: _backlogWatch.peakDefer,
      peakLod: _backlogWatch.peakLod,
      peakLodMid: _backlogWatch.peakLodMid,
      peakUrgent: _backlogWatch.peakUrgent,
      peakColliderFar: _backlogWatch.peakColliderFar,
    };
    loadMark('post-fps-summary', summary);
    if (vals.length) {
      console.info(LOAD_TAG, 'FPS-RÉSUMÉ', summary);
      console.table(_fpsWatch.samples.slice(-12).map((s) => ({
        '+ms': s.at,
        fps: s.fps,
        fpsMin: s.fpsMin,
        p95ms: s.frameMsP95,
        draw: s.drawCalls,
        tri: s.triangles,
        defer: s.decorPending,
        lod: s.simpleLodPending,
        lodMid: s.simpleLodMidPending,
        urgent: s.urgentLodPending,
        gate: s.streamGate || '',
        treeGate: s.treeGate || '',
        budget: s.decorBudget,
      })));
    }
    _resetFpsWatch();
  }

  let _postWatchOn = false;
  /** Watchdog rAF — détecte les freezes après spawn (3 min par défaut). */
  function startPostFrameWatch(thresholdMs = 50, durationMs = 180000) {
    if (_postWatchOn || !_loadEnabled) return;
    _postWatchOn = true;
    const end = performance.now() + durationMs;
    let last = performance.now();
    let slowN = 0;
    _fpsWatch.active = true;
    _fpsWatch.lastAt = performance.now();
    loadMark('post-frame-watch-start', { thresholdMs, durationMs, fpsIntervalMs: _fpsWatch.intervalMs });
    function watch(now) {
      if (performance.now() > end) {
        loadMark('post-frame-watch-end', { slowFrames: slowN });
        _fpsWatchSummary(slowN);
        _postWatchOn = false;
        return;
      }
      const ms = now - last;
      last = now;
      if (ms >= thresholdMs) {
        slowN++;
        loadSlowFrame(ms, { n: slowN });
      }
      requestAnimationFrame(watch);
    }
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(watch); });
  }

  function loadPostSummary() {
    if (!_loadEnabled) return;
    const post = _loadSteps.filter((s) => String(s.name || '').startsWith('post:')
      || s.name === 'frame-freeze' || String(s.name || '').includes('road-meshes'));
    console.info(LOAD_TAG, '── POST-SPAWN', post.length, 'events ──');
    if (post.length) console.table(post.slice(-40).map((s) => ({
      '+ms': s.at,
      event: s.name,
      ms: s.ms ?? '',
      ...(s.fps != null ? { fps: s.fps } : {}),
      ...(s.fpsMin != null ? { fpsMin: s.fpsMin } : {}),
      ...(s.drawCalls != null ? { draw: s.drawCalls } : {}),
      ...(s.pending != null ? { pending: s.pending } : {}),
      ...(s.defer != null ? { defer: s.defer } : {}),
      ...(s.lod != null ? { lod: s.lod } : {}),
      ...(s.reason != null ? { reason: s.reason } : {}),
      ...(s.maxSpawn != null ? { cap: s.maxSpawn } : {}),
      ...(s.decorPending != null ? { pending: s.decorPending } : {}),
      ...(s.done != null ? { done: s.done } : {}),
    })));
  }

  window.ZS = window.ZS || {};
  ZS.DevLog = {
    log,
    perf,
    intro,
    sync,
    boot,
    scenario,
    trail,
    s01,
    dump,
    setEnabled,
    isEnabled,
  };
  ZS.LoadLog = {
    mark: loadMark,
    post: loadPost,
    stepStart: loadStepStart,
    stepEnd: loadStepEnd,
    phase: loadPhase,
    summary: loadSummary,
    postSummary: loadPostSummary,
    slowFrame: loadSlowFrame,
    tickPerfSample,
    startPostFrameWatch,
    dump: loadDump,
    payloadBytes: loadPayloadBytes,
    setEnabled: loadSetEnabled,
    isEnabled: loadIsEnabled,
    sinceStart: _sinceLoadStart,
  };

  loadMark('boot', { client: _clientVersion(), href: location.pathname + location.search });

  if (_enabled) {
    console.info(TAG, 'init', {
      msg: 'DevLog actif (localhost ou ?devlog)',
      help: 'Filtre console: zs-dev | ZS.DevLog.dump() | ZS.DevLog.setEnabled(false)',
      client: _clientVersion(),
      invDebug: 'ZS.ConsumeDebug — filtre inv-debug (?invdebug pour forcer)',
      perf: 'ZS.perfSnapshot() | ZS.perfHud(true) | ?perfhud=1',
      loadLog: 'ZS.LoadLog — filtre zs-load (?loadlog pour forcer)',
      decorGap: 'ZS.DecorGapMonitor.dump() — filtre DevTools decor-gap (pas une commande JS)',
      lodGap: 'ZS.LodGapMonitor.dump() — filtre DevTools lod-gap (textures basiques vs finales)',
    });
  }
  if (_loadEnabled && !_enabled) {
    loadSetEnabled(true);
  }
}());
