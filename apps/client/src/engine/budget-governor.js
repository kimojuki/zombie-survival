/**
 * BudgetGovernor — budget ms/frame unifié par type de job.
 * Complète BacklogScheduler (allow/deny) avec quotas temps réels.
 */
import { DEFER_STREAM, LOD_URGENT } from '../net/decor-pressure.js';

export { DEFER_STREAM, LOD_URGENT };

export function createBudgetGovernor() {
  /**
   * @param {object} ctx
   * @param {boolean} [ctx.isMobile]
   * @param {boolean} [ctx.frameRecovering]
   * @param {boolean} [ctx.postSpawnVisualBusy]
   * @param {boolean} [ctx.initVisActive]
   * @param {number|null} [ctx.fps]
   * @param {number} [ctx.bootWarmup] — frames warmup render
   * @param {object|null} [ctx.plan] — BacklogScheduler.evaluate result
   */
  function getDecorBudget(ctx = {}) {
    const mobile = !!ctx.isMobile;
    let base;
    if (ctx.frameRecovering) base = mobile ? 2 : 4;
    else if (ctx.postSpawnVisualBusy) base = mobile ? 4 : 8;
    else base = mobile ? 6 : 12;

    if (ctx.initVisActive) base = Math.min(base, mobile ? 3 : 5);

    const fps = ctx.fps ?? null;
    if (fps != null && fps < 12) base = Math.max(2, Math.floor(base * 0.35));
    else if (fps != null && fps < 16) base = Math.max(3, Math.floor(base * 0.55));
    else if (fps != null && fps < 20) base = Math.max(4, Math.floor(base * 0.75));

    if ((ctx.bootWarmup ?? 0) > 8) base = Math.min(base, mobile ? 3 : 5);

    if (ctx.criticalSurge) base = Math.max(base, mobile ? 9 : 15);
    if (ctx.decorGapActive || ctx.lodGapActive) base = Math.max(base, mobile ? 8 : 14);
    if (ctx.lodTextureSurge) base = Math.max(base, mobile ? 10 : 16);
    if (ctx.decorGapEmergency) base = Math.max(base, mobile ? 10 : 18);

    return base;
  }

  /**
   * Cap ms pour un tick defer spawn (sous-budget décor).
   * @param {object} opts
   * @param {boolean} [opts.zoneBoost] spawn zone boost actif
   * @param {number} [opts.remainingMs] budget parent restant
   */
  function getDeferSpawnCapMs(opts = {}) {
    const mobile = !!opts.isMobile;
    let cap = opts.zoneBoost ? (mobile ? 10 : 14) : (mobile ? 6 : 9);
    if (opts.approachPrefetch) cap = Math.max(cap, mobile ? 12 : 18);
    if (opts.criticalSurge) cap = Math.max(cap, mobile ? 14 : 22);
    if (opts.decorGapActive || opts.lodGapActive) cap = Math.max(cap, mobile ? 12 : 20);
    if (opts.lodTextureSurge) cap = Math.max(cap, mobile ? 10 : 16);
    if (opts.decorGapEmergency) cap = Math.max(cap, mobile ? 14 : 24);
    if (opts.remainingMs != null) {
      cap = Math.min(cap, Math.max(2, opts.remainingMs));
    }
    return cap;
  }

  /**
   * @param {string} workType — 'stream' | 'deferSpawn' | 'lodUpgrade' | 'colliderFar' | 'treeFetch'
   * @param {object|null} plan
   */
  function canWork(workType, plan) {
    if (!plan) return true;
    const allow = plan.allow ?? {};
    if (workType === 'stream') return !!allow.stream;
    if (workType === 'deferSpawn') return !!allow.deferSpawn;
    if (workType === 'lodUpgrade') return !!allow.lodUpgrade;
    if (workType === 'colliderFar') return !!allow.colliderFar;
    if (workType === 'treeFetch') return !!allow.treeFetch;
    if (workType === 'propFetch') return !!allow.propFetch;
    return true;
  }

  /**
   * Gate unifiée defer spawn — remplace les early-return dispersés dans network tick.
   * @param {object|null} plan
   * @param {object} ctx
   */
  function evaluateDeferSpawnGate(plan, ctx = {}) {
    const bypass = !!(ctx.forcedDrain || ctx.band0Pending || ctx.syncFlush);
    if (bypass) return { allowed: true, bypass: true, reason: '' };

    if (plan && !canWork('deferSpawn', plan)) {
      return { allowed: false, reason: 'plan-deferSpawn' };
    }
    const gapSurge = !!(ctx.decorGapActive || ctx.lodGapActive || ctx.lodTextureSurge || ctx.decorGapEmergency);
    if (ctx.initVisDeferBlocked && !ctx.explorationBoost && !ctx.approachPrefetch && !ctx.criticalSurge && !gapSurge) {
      return { allowed: false, reason: 'init-vis-defer' };
    }
    if (ctx.postSpawnVisualBusy && !ctx.explorationBoost && !ctx.approachPrefetch && !ctx.criticalSurge && !gapSurge) {
      return { allowed: false, reason: 'post-spawn-busy' };
    }
    if (ctx.decorTickHeavyAllowed === false) return { allowed: false, reason: 'frame-heavy' };
    if ((ctx.urgentPending ?? 0) > LOD_URGENT.GATE && !ctx.criticalSurge && !gapSurge) {
      return { allowed: false, reason: 'lod-urgent' };
    }
    if (ctx.sectorCooldown && !ctx.explorationBoost && !ctx.approachPrefetch && !ctx.criticalSurge && !gapSurge) {
      return { allowed: false, reason: 'sector-cooldown' };
    }
    if (ctx.recenterActive && !ctx.explorationBoost && !ctx.approachPrefetch && !ctx.criticalSurge && !gapSurge) {
      return { allowed: false, reason: 'recenter' };
    }
    return {
      allowed: true,
      reason: ctx.criticalSurge ? 'critical-surge'
        : (ctx.decorGapEmergency ? 'decor-gap-emergency'
          : (ctx.decorGapActive ? 'decor-gap'
            : (ctx.lodGapActive ? 'lod-gap'
              : (ctx.lodTextureSurge ? 'lod-texture-surge'
                : (ctx.approachPrefetch ? 'prefetch' : (ctx.explorationBoost ? 'exploration' : '')))))),
    };
  }

  /**
   * Quota objets defer/frame — extrait de _tickDecorSpawnDefer.
   * @param {object|null} plan
   * @param {object} ctx
   */
  function computeDeferSpawnQuota(plan, ctx = {}) {
    const mobile = !!ctx.isMobile;
    const deferPending = ctx.deferPending ?? 0;
    const lodMid = ctx.lodMid ?? 0;
    const lodNear = ctx.lodNear ?? 0;
    const lodMidTh = ctx.lodMidTh ?? { pause: 105, high: 175 };
    const forcedDrain = !!ctx.forcedDrain;
    const band0Pending = !!ctx.band0Pending;
    const urgentPending = ctx.urgentPending ?? 0;
    const decorN = ctx.decorN ?? 0;
    const pause = DEFER_STREAM.PAUSE;
    const resume = DEFER_STREAM.RESUME;

    let maxSpawn = plan?.quotas?.maxSpawn ?? (mobile ? 6 : 12);
    if (band0Pending) maxSpawn = Math.max(maxSpawn, mobile ? 14 : 22);
    if (ctx.explorationBoost) maxSpawn = Math.max(maxSpawn, mobile ? 12 : 18);
    if (ctx.approachPrefetch) maxSpawn = Math.max(maxSpawn, mobile ? 14 : 24);
    if (ctx.criticalSurge) maxSpawn = Math.max(maxSpawn, mobile ? 18 : 32);
    if (ctx.decorGapActive) maxSpawn = Math.max(maxSpawn, mobile ? 18 : 30);
    if (ctx.decorGapEmergency) maxSpawn = Math.max(maxSpawn, mobile ? 20 : 34);
    if (ctx.lodGapActive && (ctx.simpleLodUrgent ?? 0) >= 3) maxSpawn = Math.max(maxSpawn, mobile ? 12 : 18);
    if (ctx.lodTextureSurge && (ctx.simpleLodUrgent ?? 0) >= 2) maxSpawn = Math.max(maxSpawn, mobile ? 10 : 16);
    if ((ctx.pendingNearRing ?? 0) >= 22) maxSpawn = Math.max(maxSpawn, mobile ? 16 : 28);
    if (forcedDrain) {
      maxSpawn = Math.max(maxSpawn, ctx.bootGrace && deferPending > resume
        ? (mobile ? 8 : 12)
        : (mobile ? 5 : 8));
      if (deferPending > resume && deferPending <= pause && lodMid < 64) {
        maxSpawn = Math.max(maxSpawn, mobile ? 8 : 10);
      }
      if (deferPending >= 180 && deferPending < resume && lodMid < 72) {
        maxSpawn = Math.max(maxSpawn, mobile ? 6 : 10);
      }
      if (deferPending > 250) maxSpawn = Math.min(maxSpawn, mobile ? 5 : 8);
      if (lodMid > 72) maxSpawn = Math.min(maxSpawn, mobile ? 4 : 6);
      else if (lodMid > 48) maxSpawn = Math.min(maxSpawn, mobile ? 5 : 8);
    }
    if (ctx.postSpawnVisualBusy && forcedDrain && !band0Pending && !ctx.approachPrefetch) {
      maxSpawn = Math.min(maxSpawn, mobile ? 3 : 5);
    }
    if (ctx.sectorCooldown && forcedDrain && !band0Pending && !ctx.approachPrefetch) {
      maxSpawn = Math.min(maxSpawn, mobile ? 4 : 6);
    }
    if (ctx.postSectorDrainSoft && !ctx.approachPrefetch && !ctx.criticalSurge) maxSpawn = Math.min(maxSpawn, mobile ? 3 : 4);
    if (ctx.postRevealSpawnSoft && !band0Pending && !ctx.approachPrefetch && !ctx.criticalSurge) maxSpawn = Math.min(maxSpawn, mobile ? 3 : 4);
    if (ctx.streamSoftStart && !band0Pending && !ctx.approachPrefetch && !ctx.criticalSurge) maxSpawn = Math.min(maxSpawn, mobile ? 4 : 8);
    if (deferPending > 600 && !ctx.criticalSurge) maxSpawn = Math.min(maxSpawn, mobile ? 2 : 3);
    else if (deferPending > 400 && !forcedDrain && !ctx.criticalSurge) maxSpawn = Math.min(maxSpawn, mobile ? 2 : 4);
    else if (deferPending > 200 && !forcedDrain && !ctx.criticalSurge) maxSpawn = Math.min(maxSpawn, mobile ? 3 : 5);
    if (!forcedDrain || lodMid >= 72) {
      if (lodNear > 180 && !ctx.criticalSurge) maxSpawn = Math.min(maxSpawn, mobile ? 2 : 4);
      else if (lodNear > 120 && !ctx.criticalSurge) maxSpawn = Math.min(maxSpawn, mobile ? 2 : 3);
      else if (lodNear > 80 && !ctx.criticalSurge) maxSpawn = Math.min(maxSpawn, mobile ? 3 : 5);
    } else if (lodMid > lodMidTh.high) maxSpawn = Math.min(maxSpawn, mobile ? 2 : 3);
    else if (lodMid > lodMidTh.pause) maxSpawn = Math.min(maxSpawn, mobile ? 3 : 5);
    else if (urgentPending > LOD_URGENT.PRESSURE) maxSpawn = Math.min(maxSpawn, mobile ? 3 : 5);
    else if (decorN > 2200) maxSpawn = Math.min(maxSpawn, mobile ? 3 : 5);
    else if (decorN > 1400) maxSpawn = Math.min(maxSpawn, mobile ? 4 : 8);

    return maxSpawn;
  }

  /**
   * Raison blocage tree/prop fetch — simplifie _deferLoaderBlockReason.
   * @param {object|null} plan
   * @param {object} ctx
   */
  function treeFetchBlockReason(plan, ctx = {}) {
    if (canWork('treeFetch', plan)) return '';
    if (ctx.deferForced && (ctx.deferPending ?? 0) >= DEFER_STREAM.RESUME - 20) return '';
    if ((ctx.lodMid ?? 0) < 24 && (ctx.deferPending ?? 0) > 250) return '';
    if (!plan) return 'backlog';
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
    return plan.reasons?.stream || 'backlog';
  }

  return {
    getDecorBudget,
    getDeferSpawnCapMs,
    canWork,
    evaluateDeferSpawnGate,
    computeDeferSpawnQuota,
    treeFetchBlockReason,
  };
}
