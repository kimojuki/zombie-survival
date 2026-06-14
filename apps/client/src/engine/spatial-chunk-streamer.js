/**
 * SpatialChunkStreamer — visibilité + LRU par couche (forêt, plage, routes).
 * L3 : fondation lazy-load (onLoad/onUnload hooks par couche).
 */
import { RING_RADIUS, ContentRing } from './content-rings.js';
import {
  CHUNK_SIZE,
  chunkKeyFromWorld,
  chunkKeysInRadius,
} from './spatial-chunk-keys.js';

export { CHUNK_SIZE };

function readDecorVisRadius() {
  try {
    const r = globalThis.window?.ZS?.Options?.getProfile?.()?.decorVisRadius;
    if (Number.isFinite(r)) return r;
  } catch { /* legacy boot */ }
  return 130;
}

export function createSpatialChunkStreamer(opts = {}) {
  const defaultChunkSize = opts.chunkSize ?? CHUNK_SIZE;
  const visMargin = opts.visMargin ?? 0.55;
  const defaultMaxLoaded = opts.maxLoadedPerLayer ?? 96;
  const strideMod = opts.strideMod ?? 6;
  const moveThreshold = opts.moveThreshold ?? 2.5;

  /** @type {Map<string, LayerState>} */
  const _layers = new Map();
  let _source = { x: 0, z: 0 };
  let _visStride = 0;
  let _lastVisX = NaN;
  let _lastVisZ = NaN;
  let _lastStats = null;

  /**
   * @typedef {object} LayerState
   * @property {number} chunkSize
   * @property {number} maxLoaded
   * @property {boolean} unloadBeyondFar
   * @property {Map<string, ChunkEntry>} chunks
   * @property {object} handlers
   */

  function registerLayer(name, layerOpts = {}) {
    _layers.set(name, {
      chunkSize: layerOpts.chunkSize ?? defaultChunkSize,
      maxLoaded: layerOpts.maxLoaded ?? defaultMaxLoaded,
      unloadBeyondFar: !!layerOpts.unloadBeyondFar,
      chunks: new Map(),
      handlers: {
        onShow: layerOpts.onShow ?? null,
        onHide: layerOpts.onHide ?? null,
        onUnload: layerOpts.onUnload ?? null,
        onLoad: layerOpts.onLoad ?? null,
      },
    });
    return _layers.get(name);
  }

  function ensureLayer(name, layerOpts = {}) {
    if (!_layers.has(name)) registerLayer(name, layerOpts);
    return _layers.get(name);
  }

  /**
   * @param {string} layerName
   * @param {string} key
   * @param {object} meta — { group, cx, cz, handle }
   */
  function registerChunk(layerName, key, meta) {
    const layer = ensureLayer(layerName, { chunkSize: meta.chunkSize });
    layer.chunks.set(key, {
      key,
      group: meta.group ?? null,
      handle: meta.handle ?? meta.group ?? null,
      cx: meta.cx,
      cz: meta.cz,
      visible: meta.visible ?? true,
      loaded: true,
      lastTouch: performance.now(),
    });
  }

  function registerChunksFromGroups(layerName, entries, chunkSize) {
    const cs = chunkSize ?? defaultChunkSize;
    ensureLayer(layerName, { chunkSize: cs });
    for (const entry of entries) {
      const key = chunkKeyFromWorld(entry.cx, entry.cz, cs);
      registerChunk(layerName, key, { ...entry, chunkSize: cs });
    }
  }

  function resetLayer(name) {
    const layer = _layers.get(name);
    if (layer) layer.chunks.clear();
  }

  function resetAll() {
    _layers.clear();
    _visStride = 0;
    _lastVisX = NaN;
    _lastVisZ = NaN;
    _lastStats = null;
  }

  function setStreamingSource(x, z) {
    _source = { x: Number(x) || 0, z: Number(z) || 0 };
  }

  function getVisRadius(chunkSize = defaultChunkSize) {
    return readDecorVisRadius() + chunkSize * visMargin;
  }

  function _setEntryVisible(layer, entry, visible) {
    if (entry.visible === visible) return false;
    entry.visible = visible;
    if (entry.group) entry.group.visible = visible;
    if (visible) layer.handlers.onShow?.(entry);
    else layer.handlers.onHide?.(entry);
    return true;
  }

  function _maybeUnloadFar(layer, sx, sz) {
    if (!layer.unloadBeyondFar || !layer.handlers.onUnload) return 0;
    const farR2 = RING_RADIUS[ContentRing.FAR] ** 2;
    let unloaded = 0;
    if (layer.chunks.size <= layer.maxLoaded) return 0;

    const victims = [...layer.chunks.values()]
      .filter((e) => {
        const dx = sx - e.cx;
        const dz = sz - e.cz;
        return dx * dx + dz * dz > farR2;
      })
      .sort((a, b) => a.lastTouch - b.lastTouch);

    for (const victim of victims) {
      if (layer.chunks.size <= layer.maxLoaded) break;
      layer.handlers.onUnload(victim);
      layer.chunks.delete(victim.key);
      unloaded++;
    }
    return unloaded;
  }

  /**
   * @param {number} sx
   * @param {number} sz
   * @param {number} [budgetMs]
   * @param {object} [opts]
   * @param {boolean} [opts.force] ignore stride skip (ré-entrée zone)
   */
  function tick(sx, sz, budgetMs = 2, opts = {}) {
    const force = !!opts.force;
    if (!force
        && ++_visStride % strideMod !== 0
        && Math.hypot(sx - _lastVisX, sz - _lastVisZ) < moveThreshold) {
      return { ...(_lastStats ?? {}), skipped: true };
    }
    _visStride = 0;
    _lastVisX = sx;
    _lastVisZ = sz;
    setStreamingSource(sx, sz);

    const t0 = performance.now();
    const stats = { skipped: false, layers: {}, ms: 0, shown: 0, hidden: 0, unloaded: 0 };

    for (const [name, layer] of _layers) {
      const visR2 = getVisRadius(layer.chunkSize) ** 2;
      let shown = 0;
      let hidden = 0;

      for (const entry of layer.chunks.values()) {
        const dx = sx - entry.cx;
        const dz = sz - entry.cz;
        const shouldShow = dx * dx + dz * dz <= visR2;
        if (shouldShow) entry.lastTouch = performance.now();
        if (_setEntryVisible(layer, entry, shouldShow)) {
          if (shouldShow) shown++;
          else hidden++;
        }
        if (performance.now() - t0 >= budgetMs) break;
      }

      const unloaded = _maybeUnloadFar(layer, sx, sz);
      stats.layers[name] = {
        shown,
        hidden,
        unloaded,
        total: layer.chunks.size,
        visR: Math.round(getVisRadius(layer.chunkSize)),
      };
      stats.shown += shown;
      stats.hidden += hidden;
      stats.unloaded += unloaded;

      if (performance.now() - t0 >= budgetMs) break;
    }

    stats.ms = Math.round(performance.now() - t0);
    _lastStats = stats;
    return stats;
  }

  /** Prefetch keys dans anneau NEAR (pour lazy-load futur). */
  function prefetchKeysNear(sx, sz, chunkSize = defaultChunkSize) {
    return chunkKeysInRadius(sx, sz, RING_RADIUS[ContentRing.NEAR], chunkSize);
  }

  /** Chunks chargés mais masqués dans le rayon vis — ré-entrée exploration. */
  function hasHiddenNear(sx, sz) {
    for (const layer of _layers.values()) {
      const visR2 = getVisRadius(layer.chunkSize) ** 2;
      for (const entry of layer.chunks.values()) {
        if (entry.visible) continue;
        const dx = sx - entry.cx;
        const dz = sz - entry.cz;
        if (dx * dx + dz * dz <= visR2) return true;
      }
    }
    return false;
  }

  function getLayerStats(name) {
    const layer = _layers.get(name);
    if (!layer) return null;
    return { total: layer.chunks.size, maxLoaded: layer.maxLoaded };
  }

  function getStats() {
    const out = { layers: {}, source: { ..._source } };
    for (const [name, layer] of _layers) {
      out.layers[name] = {
        total: layer.chunks.size,
        maxLoaded: layer.maxLoaded,
        chunkSize: layer.chunkSize,
      };
    }
    return out;
  }

  return {
    CHUNK_SIZE: defaultChunkSize,
    registerLayer,
    ensureLayer,
    registerChunk,
    registerChunksFromGroups,
    resetLayer,
    resetAll,
    setStreamingSource,
    getVisRadius,
    hasHiddenNear,
    tick,
    prefetchKeysNear,
    getLayerStats,
    getStats,
    chunkKeyFromWorld,
  };
}
