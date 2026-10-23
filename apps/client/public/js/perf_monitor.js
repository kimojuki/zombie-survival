// Métriques perf client — draw calls, triangles, comptage scène.
// Usage console (localhost ou ?devlog) :
//   ZS.perfSnapshot()           — instantané complet
//   ZS.perfWatch(5000)          — log toutes les 5 s (filtre zs-dev)
//   ZS.perfWatchStop()
//   ZS.perfHud(true)            — overlay léger (?perfhud=1)
(function () {
  'use strict';

  const TAG = '[zs-perf]';
  const HUD_ID = 'zs-perf-hud';

  let _watchId = null;
  let _hudOn = false;
  let _fpsRing = [];
  let _lastTick = performance.now();
  let _frameMs = 0;

  function _active() {
    return ZS.DevLog?.isEnabled?.()
      || /(?:^|[?&])perfhud(?:=|&|$)/.test(location.search)
      || /(?:^|[?&])perfwatch(?:=|&|$)/.test(location.search)
      || localStorage.getItem('zs_perf_hud') === '1';
  }

  function _gfx() {
    return ZS._gfxRuntime || null;
  }

  function _playerPos() {
    const cam = _gfx()?.camera;
    if (cam) return { x: cam.position.x, z: cam.position.z };
    return null;
  }

  /** Compte meshes / instances (coût O(n) — snapshot manuel seulement). */
  function _countScene(scene) {
    const out = {
      meshes: 0,
      instancedMeshes: 0,
      meshVisible: 0,
      instancedVisible: 0,
      groups: 0,
      forestDecorMeshes: 0,
      forestDecorInstanced: 0,
      decorItems: 0,
    };
    if (!scene) return out;

    scene.traverse((o) => {
      if (o.isGroup) out.groups++;
      if (o.isMesh && !o.isInstancedMesh) {
        out.meshes++;
        if (o.visible) out.meshVisible++;
        let p = o;
        while (p) {
          if (p.name === 'forestDecorRoot' || p.name?.startsWith('forestDecorChunk:')) {
            out.forestDecorMeshes++;
            break;
          }
          p = p.parent;
        }
      }
      if (o.isInstancedMesh) {
        out.instancedMeshes++;
        if (o.visible) out.instancedVisible++;
        if (o.parent?.name === 'forestDecorInstanced'
            || o.parent?.parent?.name === 'forestDecorRoot') {
          out.forestDecorInstanced += o.count || 0;
        }
      }
      if (o.userData?.decorId) out.decorItems++;
    });
    return out;
  }

  function _tierInfo() {
    return {
      tier: ZS.Options?.getResolvedTier?.() ?? '?',
      decorScale: ZS.Options?.getDecorScale?.() ?? '?',
      decorVisRadius: ZS.Options?.getProfile?.()?.decorVisRadius ?? '?',
      shadows: !!ZS.Options?.getProfile?.()?.shadows,
      pixelRatioMax: ZS.Options?.getProfile?.()?.pixelRatioMax ?? '?',
    };
  }

  function _renderInfo(renderer) {
    if (!renderer?.info) return null;
    const r = renderer.info.render;
    const m = renderer.info.memory;
    return {
      drawCalls: r.calls,
      triangles: r.triangles,
      points: r.points,
      lines: r.lines,
      geometries: m.geometries,
      textures: m.textures,
      programs: renderer.info.programs?.length ?? null,
    };
  }

  function _fpsStats() {
    if (!_fpsRing.length) return { fps: null, frameMs: Math.round(_frameMs * 10) / 10 };
    const sorted = _fpsRing.slice().sort((a, b) => a - b);
    const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    return {
      fps: Math.round(1000 / avg),
      fpsMin: Math.round(1000 / max),
      frameMsAvg: Math.round(avg * 10) / 10,
      frameMsP95: Math.round(p95 * 10) / 10,
      frameMsMax: Math.round(max * 10) / 10,
    };
  }

  function getStats() {
    return _fpsStats();
  }

  function getRenderStats() {
    return _renderInfo(_gfx()?.renderer);
  }

  /**
   * Instantané perf — appeler en jeu après quelques secondes de marche.
   * @param {object} [opts]
   * @param {boolean} [opts.traverse=true] comptage scène (un peu coûteux)
   * @param {string} [opts.label] label DevLog
   */
  function snapshot(opts) {
    opts = opts || {};
    const gfx = _gfx();
    const renderer = gfx?.renderer;
    const scene = gfx?.scene;
    const pos = _playerPos();

    const row = {
      t: Date.now(),
      label: opts.label || 'snapshot',
      client: window.__ZS_CLIENT_VERSION || null,
      position: pos,
      tier: _tierInfo(),
      render: _renderInfo(renderer),
      fps: _fpsStats(),
      scene: opts.traverse === false ? null : _countScene(scene),
    };

    console.info(TAG, row.label, row);
    if (row.render) {
      console.table({
        drawCalls: row.render.drawCalls,
        triangles: row.render.triangles,
        geometries: row.render.geometries,
        textures: row.render.textures,
        fps: row.fps.fps,
        frameMsP95: row.fps.frameMsP95,
      });
    }
    ZS.DevLog?.log?.('perf-snapshot', row.label, row);
    return row;
  }

  function watch(intervalMs) {
    watchStop();
    intervalMs = Math.max(2000, intervalMs || 5000);
    console.info(TAG, 'watch', { intervalMs, stop: 'ZS.perfWatchStop()' });
    _watchId = setInterval(() => snapshot({ label: 'watch' }), intervalMs);
  }

  function watchStop() {
    if (_watchId) {
      clearInterval(_watchId);
      _watchId = null;
    }
  }

  function tickFrame() {
    const now = performance.now();
    const dt = now - _lastTick;
    _lastTick = now;
    _frameMs = dt;
    _fpsRing.push(dt);
    if (_fpsRing.length > 120) _fpsRing.shift();
    if (_hudOn) _updateHud();
  }

  function _ensureHud() {
    let el = document.getElementById(HUD_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = HUD_ID;
    el.style.cssText = [
      'position:fixed', 'left:8px', 'bottom:8px', 'z-index:220',
      'font:11px/1.45 monospace', 'color:#c8e6c8', 'background:rgba(8,12,8,0.82)',
      'padding:6px 9px', 'border-radius:4px', 'pointer-events:none',
      'white-space:pre', 'max-width:92vw',
    ].join(';');
    document.body.appendChild(el);
    return el;
  }

  function _updateHud() {
    const el = _ensureHud();
    const r = _renderInfo(_gfx()?.renderer);
    const f = _fpsStats();
    const tier = ZS.Options?.getResolvedTier?.() ?? '?';
    el.textContent = [
      `FPS ${f.fps ?? '—'}  p95 ${f.frameMsP95 ?? '—'} ms  tier ${tier}`,
      r ? `draw ${r.drawCalls}  tri ${r.triangles}  geo ${r.geometries}  tex ${r.textures}` : 'render: —',
      'ZS.perfSnapshot()  ZS.perfHud(false)',
    ].join('\n');
  }

  function hud(on) {
    _hudOn = !!on;
    localStorage.setItem('zs_perf_hud', on ? '1' : '0');
    if (!_hudOn) {
      document.getElementById(HUD_ID)?.remove();
      return;
    }
    _updateHud();
  }

  window.ZS = window.ZS || {};
  ZS.perfSnapshot = snapshot;
  ZS.perfWatch = watch;
  ZS.perfWatchStop = watchStop;
  ZS.perfHud = hud;
  ZS.PerfMonitor = { snapshot, watch, watchStop, hud, tickFrame, getStats, getRenderStats };

  if (/(?:^|[?&])perfhud(?:=|&|$)/.test(location.search) || localStorage.getItem('zs_perf_hud') === '1') {
    hud(true);
  }
  const watchM = /(?:^|[?&])perfwatch=(\d+)/.exec(location.search);
  if (watchM) watch(Number(watchM[1]) * 1000 || 5000);

  if (_active()) {
    console.info(TAG, 'init', {
      snapshot: 'ZS.perfSnapshot()',
      watch: 'ZS.perfWatch(5000)',
      hud: 'ZS.perfHud(true) ou ?perfhud=1',
      filter: 'zs-dev (snapshots) | zs-perf (direct)',
    });
  }
}());
