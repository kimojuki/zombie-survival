/**
 * WorldContentLoader — orchestrateur contenu client (L2a).
 * Source de vérité progressive pour la queue décor différée.
 */
import { BootPhase } from './constants.js';
import { ContentRing, ringForDelta, RING_RADIUS, PREFETCH, SURGE, STREAM } from './content-rings.js';
import {
  ContentJobType,
  scoreContentJob,
  legacyBandForD2,
} from './content-priority.js';

export { ContentRing, ContentJobType };

export function createWorldContentLoader() {
  /** @type {object[]} décor game-init pas encore instancié */
  const _decorPending = [];
  const _stats = {
    enqueued: 0,
    drained: 0,
    byRing: { critical: 0, near: 0, far: 0, stream: 0 },
  };

  let _source = { x: 0, z: 0, vx: 0, vz: 0 };
  let _bootPhase = BootPhase.SCRIPTS;

  function setStreamingSource(x, z, opts = {}) {
    const nx = Number(x) || 0;
    const nz = Number(z) || 0;
    const vx = opts.vx ?? (nx - _source.x);
    const vz = opts.vz ?? (nz - _source.z);
    _source = { x: nx, z: nz, vx, vz };
  }

  function getStreamingSource() {
    return { ..._source };
  }

  function setBootPhase(phase) {
    _bootPhase = phase || BootPhase.SCRIPTS;
  }

  function getBootPhase() {
    return _bootPhase;
  }

  /** Array ref stable — compat `_decorSpawnDefer.pending`. */
  function getDecorPending() {
    return _decorPending;
  }

  function resetDecor() {
    _decorPending.length = 0;
    _stats.enqueued = 0;
    _stats.drained = 0;
    _stats.byRing = { critical: 0, near: 0, far: 0, stream: 0 };
  }

  function pushDecor(d) {
    if (!d) return false;
    _decorPending.push(d);
    _stats.enqueued++;
    return true;
  }

  function pushDecorMany(list) {
    if (!list?.length) return 0;
    for (const d of list) pushDecor(d);
    return list.length;
  }

  function pendingCount(ring) {
    if (!ring) return _decorPending.length;
    const sx = _source.x;
    const sz = _source.z;
    let n = 0;
    for (const d of _decorPending) {
      const tx = Number.isFinite(d.x) ? d.x : sx;
      const tz = Number.isFinite(d.z) ? d.z : sz;
      const r = ringForDelta(tx - sx, tz - sz);
      if (r === ring) n++;
    }
    return n;
  }

  /**
   * Sélectionne les décor à spawner ce frame (remplace ranked sort legacy).
   * @param {number} px
   * @param {number} pz
   * @param {object} opts
   * @param {number} opts.maxItems
   * @param {number} opts.spawnR2 — rayon vis spawn²
   * @param {number} opts.streamR2 — rayon stream²
   * @param {ContentRing|string|null} [opts.ringFilter] — ex. critical only
   */
  function selectDecorBatch(px, pz, opts = {}) {
    const maxItems = opts.maxItems ?? 12;
    const spawnR2 = opts.spawnR2 ?? 0;
    const streamR2 = opts.streamR2 ?? spawnR2;
    const ringFilter = opts.ringFilter ?? null;
    const vx = _source.vx;
    const vz = _source.vz;

    const ranked = [];
    for (let i = 0; i < _decorPending.length; i++) {
      const d = _decorPending[i];
      const tx = Number.isFinite(d.x) ? d.x : px;
      const tz = Number.isFinite(d.z) ? d.z : pz;
      const dx = tx - px;
      const dz = tz - pz;
      const { score, ring, d2 } = scoreContentJob({
        dx,
        dz,
        type: ContentJobType.DECOR_SPAWN,
        payload: d,
        vx,
        vz,
      });
      if (ringFilter && ring !== ringFilter) continue;
      const band = legacyBandForD2(d2, spawnR2, streamR2);
      ranked.push({ index: i, d, score, ring, d2, band });
    }

    ranked.sort((a, b) => b.score - a.score || a.band - b.band || a.d2 - b.d2);

    return {
      picks: ranked.slice(0, maxItems),
      pending: _decorPending.length,
    };
  }

  /**
   * Retire les indices spawnés et met à jour stats.
   * @param {Set<number>|number[]} indices
   */
  function removeDecorIndices(indices) {
    const toRemove = indices instanceof Set ? indices : new Set(indices);
    if (!toRemove.size) return 0;
    const kept = [];
    for (let i = 0; i < _decorPending.length; i++) {
      if (!toRemove.has(i)) kept.push(_decorPending[i]);
      else {
        _stats.drained++;
        const d = _decorPending[i];
        const tx = Number.isFinite(d?.x) ? d.x : _source.x;
        const tz = Number.isFinite(d?.z) ? d.z : _source.z;
        const ring = ringForDelta(tx - _source.x, tz - _source.z);
        if (_stats.byRing[ring] != null) _stats.byRing[ring]++;
      }
    }
    const removed = _decorPending.length - kept.length;
    _decorPending.length = 0;
    _decorPending.push(...kept);
    return removed;
  }

  /**
   * Drain décor par anneau ou rayon — unifie flush spawn + tick defer.
   * @param {number} px
   * @param {number} pz
   * @param {object} opts
   * @param {number} [opts.maxItems]
   * @param {number} [opts.maxMs]
   * @param {number} [opts.spawnR2]
   * @param {number} [opts.streamR2]
   * @param {string|null} [opts.ringFilter] ContentRing.*
   * @param {number|null} [opts.radiusR2] filtre distance² (flush spawn 100 m)
   * @param {boolean} [opts.forceFastGround]
   * @param {object} handlers
   * @param {Function} handlers.spawnOne — (d, { simpleLod, fastGround })
   * @param {Function} [handlers.shouldSkip] — (pick) => boolean
   * @param {Function} [handlers.simpleLod] — (d) => boolean
   */
  function drainDecorRing(px, pz, opts = {}, handlers = {}) {
    if (!_decorPending.length) return { spawned: 0, ms: 0, pending: 0 };

    const maxItems = opts.maxItems ?? 12;
    const maxMs = opts.maxMs ?? 480;
    const spawnR2 = opts.spawnR2 ?? 0;
    const streamR2 = opts.streamR2 ?? spawnR2;
    const ringFilter = opts.ringFilter ?? null;
    const radiusR2 = opts.radiusR2 ?? null;
    const forceFastGround = !!opts.forceFastGround;

    const t0 = performance.now();
    const { picks } = selectDecorBatch(px, pz, {
      maxItems: _decorPending.length,
      spawnR2,
      streamR2,
      ringFilter,
    });

    const toRemove = new Set();
    let spawned = 0;

    for (const pick of picks) {
      if (spawned >= maxItems) break;
      if (performance.now() - t0 >= maxMs) break;
      if (radiusR2 != null && pick.d2 > radiusR2) continue;
      if (handlers.shouldSkip?.(pick)) continue;

      const simpleLod = handlers.simpleLod?.(pick.d) ?? false;
      const fastGround = forceFastGround || pick.band >= 1;
      handlers.spawnOne?.(pick.d, { simpleLod, fastGround });
      toRemove.add(pick.index);
      spawned++;
    }

    if (toRemove.size) removeDecorIndices(toRemove);

    return {
      spawned,
      ms: Math.round(performance.now() - t0),
      pending: _decorPending.length,
    };
  }

  /**
   * Drain async par batches (game-init flush spawn).
   */
  async function drainDecorRingAsync(px, pz, opts = {}, handlers = {}) {
    const t0 = performance.now();
    const maxItems = opts.maxItems ?? 200;
    const maxMs = opts.maxMs ?? 480;
    const batchSize = opts.batchSize ?? 24;
    let totalSpawned = 0;

    while (totalSpawned < maxItems && performance.now() - t0 < maxMs) {
      const batch = drainDecorRing(px, pz, {
        ...opts,
        maxItems: Math.min(batchSize, maxItems - totalSpawned),
        maxMs: Math.min(80, maxMs - (performance.now() - t0)),
      }, handlers);
      totalSpawned += batch.spawned;
      if (!batch.spawned) break;
      if (handlers.yield) await handlers.yield();
    }

    return {
      spawned: totalSpawned,
      ms: Math.round(performance.now() - t0),
      pending: _decorPending.length,
    };
  }

  function pendingInRadius(px, pz, radius) {
    const r2 = radius * radius;
    let n = 0;
    for (const d of _decorPending) {
      const tx = Number.isFinite(d.x) ? d.x : px;
      const tz = Number.isFinite(d.z) ? d.z : pz;
      if ((tx - px) ** 2 + (tz - pz) ** 2 <= r2) n++;
    }
    return n;
  }

  /** Compte pending CRITICAL+NEAR autour d'une position (pas la source). */
  function pendingNearPlayer(px, pz) {
    let critical = 0;
    let near = 0;
    for (const d of _decorPending) {
      const tx = Number.isFinite(d.x) ? d.x : px;
      const tz = Number.isFinite(d.z) ? d.z : pz;
      const ring = ringForDelta(tx - px, tz - pz);
      if (ring === ContentRing.CRITICAL) critical++;
      else if (ring === ContentRing.NEAR) near++;
    }
    return { critical, near, total: critical + near };
  }

  /** Résumé anneaux autour du joueur (incl. FAR dans disque 320 m). */
  function pendingRingSummary(px, pz) {
    const nearNow = pendingNearPlayer(px, pz);
    const disk320 = pendingInRadius(px, pz, RING_RADIUS[ContentRing.FAR]);
    return {
      ...nearNow,
      far: Math.max(0, disk320 - nearNow.total),
      disk320,
    };
  }

  /**
   * Boost drain quand le joueur revient dans une zone avec beaucoup de defer local.
   * @param {number} px
   * @param {number} pz
   * @param {object} [opts]
   * @param {number} [opts.minTotal] seuil CRITICAL+NEAR
   * @param {number} [opts.durationMs] durée boost
   */
  function evaluateExplorationBoost(px, pz, opts = {}) {
    const minTotal = opts.minTotal ?? 15;
    const minCritical = opts.minCritical ?? 10;
    const durationMs = opts.durationMs ?? 10_000;
    const counts = pendingNearPlayer(px, pz);
    return {
      active: counts.total >= minTotal || counts.critical >= minCritical,
      durationMs,
      ...counts,
      pending: _decorPending.length,
    };
  }

  /** Point devant le joueur pour scorer/fetch prefetch (L3d). */
  function computeLeadAnchor(px, pz, vx, vz, opts = {}) {
    const leadSec = opts.leadSec ?? PREFETCH.LEAD_SEC;
    const leadMax = opts.leadMax ?? PREFETCH.LEAD_MAX;
    const speed = Math.hypot(vx, vz);
    if (speed < 0.4) {
      return { lx: px, lz: pz, dist: 0, speed, active: false };
    }
    const dist = Math.min(speed * leadSec, leadMax);
    const lx = px + (vx / speed) * dist;
    const lz = pz + (vz / speed) * dist;
    return { lx, lz, dist, speed, active: true };
  }

  /** Pending dans un demi-espace devant le joueur (dot > 0). */
  function pendingAhead(px, pz, vx, vz, maxR = RING_RADIUS[ContentRing.FAR]) {
    const maxR2 = maxR * maxR;
    const speed2 = vx * vx + vz * vz;
    let total = 0;
    let critical = 0;
    let near = 0;
    for (const d of _decorPending) {
      const tx = Number.isFinite(d.x) ? d.x : px;
      const tz = Number.isFinite(d.z) ? d.z : pz;
      const dx = tx - px;
      const dz = tz - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 > maxR2) continue;
      if (speed2 > 0.16) {
        const dot = dx * vx + dz * vz;
        if (dot <= 0) continue;
      }
      total++;
      const ring = ringForDelta(dx, dz);
      if (ring === ContentRing.CRITICAL) critical++;
      else if (ring === ContentRing.NEAR) near++;
    }
    return { total, critical, near };
  }

  /**
   * Prefetch actif quand le joueur se déplace vers une zone avec defer en attente.
   */
  function evaluateApproachPrefetch(px, pz, vx, vz, opts = {}) {
    const minSpeed = opts.minSpeed ?? PREFETCH.MIN_SPEED;
    const minAhead = opts.minAhead ?? PREFETCH.MIN_AHEAD;
    const durationMs = opts.durationMs ?? 6000;
    const lead = computeLeadAnchor(px, pz, vx, vz, opts);
    const ahead = pendingAhead(px, pz, vx, vz);
    const nearNow = pendingNearPlayer(px, pz);
    const active = (lead.speed >= minSpeed && ahead.total >= minAhead)
      || (lead.speed >= minSpeed * 0.65 && nearNow.total >= 8)
      || (lead.speed >= SURGE.MIN_SPEED && nearNow.critical >= 12);
    return {
      active,
      durationMs,
      ...lead,
      ahead,
      nearNow,
      pending: _decorPending.length,
    };
  }

  /**
   * L3f — accélère le drain spawn quand CRITICAL/NEAR est en retard (mouvement ou idle).
   */
  function evaluateCriticalSurge(px, pz, vx, vz, opts = {}) {
    const minCritical = opts.minCritical ?? SURGE.MIN_CRITICAL;
    const minNear = opts.minNear ?? SURGE.MIN_NEAR;
    const minRingTotal = opts.minRingTotal ?? SURGE.MIN_RING_TOTAL;
    const minAheadCritical = opts.minAheadCritical ?? SURGE.MIN_AHEAD_CRITICAL;
    const minAheadTotal = opts.minAheadTotal ?? SURGE.MIN_AHEAD_TOTAL;
    const idleMinNear = opts.idleMinNear ?? SURGE.IDLE_MIN_NEAR;
    const minSpeed = opts.minSpeed ?? SURGE.MIN_SPEED;
    const minDiskFar = opts.minDiskFar ?? SURGE.MIN_DISK_FAR;
    const durationMs = opts.durationMs ?? SURGE.DURATION_MS;
    const nearNow = pendingNearPlayer(px, pz);
    const rings = pendingRingSummary(px, pz);
    const ahead = pendingAhead(px, pz, vx, vz, RING_RADIUS[ContentRing.NEAR]);
    const aheadFar = pendingAhead(px, pz, vx, vz, RING_RADIUS[ContentRing.FAR]);
    const speed = Math.hypot(vx, vz);
    const active = nearNow.critical >= minCritical
      || nearNow.near >= minNear
      || nearNow.total >= minRingTotal
      || (speed >= minSpeed && ahead.critical >= minAheadCritical)
      || (speed >= minSpeed && ahead.total >= minAheadTotal)
      || (speed < 1.2 && nearNow.near >= idleMinNear)
      || (speed >= 0.8 && nearNow.near >= 12)
      || (speed >= 1.0 && rings.far >= minDiskFar && nearNow.total <= 5)
      || (speed >= 0.8 && aheadFar.total >= 18);
    return {
      active,
      durationMs,
      speed,
      nearNow,
      rings,
      ahead,
      aheadFar,
      pending: _decorPending.length,
    };
  }

  /** Trop de defer en FAR/disque — drainer avant de re-fetch. */
  function shouldDeferStreamFetch(px, pz) {
    const s = pendingRingSummary(px, pz);
    return s.disk320 >= STREAM.DRAIN_FIRST_DISK && s.total <= STREAM.DRAIN_FIRST_NEAR_MAX;
  }

  /** Idle + backlog local, gap actif, ou LOD gap → spawn-only (pas de fetch). */
  function shouldPauseStreamFetch(px, pz, vx, vz, opts = {}) {
    const s = pendingRingSummary(px, pz);
    const speed2 = vx * vx + vz * vz;
    if (opts.activeGap) return true;
    if (opts.lodGapActive) return true;
    if (speed2 < 0.25 && s.near >= 6) return true;
    if (speed2 < 0.64 && s.total >= 8 && s.near >= 4) return true;
    if (speed2 >= STREAM.PAUSE_IDLE_SPEED2) {
      if (s.disk320 >= 85 && s.total <= 4) return true;
      return false;
    }
    return s.near >= 12 || s.total >= 14 || s.critical >= 6;
  }

  function getStats() {
    return {
      pending: _decorPending.length,
      critical: pendingCount(ContentRing.CRITICAL),
      near: pendingCount(ContentRing.NEAR),
      far: pendingCount(ContentRing.FAR),
      stream: pendingCount(ContentRing.STREAM),
      enqueued: _stats.enqueued,
      drained: _stats.drained,
      bootPhase: _bootPhase,
      source: { ..._source },
    };
  }

  return {
    setStreamingSource,
    getStreamingSource,
    setBootPhase,
    getBootPhase,
    getDecorPending,
    resetDecor,
    pushDecor,
    pushDecorMany,
    pendingCount,
    pendingInRadius,
    pendingNearPlayer,
    pendingRingSummary,
    evaluateExplorationBoost,
    evaluateCriticalSurge,
    shouldDeferStreamFetch,
    shouldPauseStreamFetch,
    computeLeadAnchor,
    pendingAhead,
    evaluateApproachPrefetch,
    selectDecorBatch,
    removeDecorIndices,
    drainDecorRing,
    drainDecorRingAsync,
    getStats,
  };
}
