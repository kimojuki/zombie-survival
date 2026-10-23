/**
 * BacklogScheduler — pression décor unifiée (defer / LOD / stream / phase).
 * Source de vérité ES module ; installé sur ZS.Engine + alias ZS.BacklogScheduler.
 */
import { DEFER, LOD_MID } from './constants.js';

export { DEFER, LOD_MID };

export function createBacklogScheduler() {
  let _deferGatePaused = false;

  function syncDeferGate(deferN) {
    if (deferN > DEFER.PAUSE) _deferGatePaused = true;
    else if (deferN <= DEFER.RESUME) _deferGatePaused = false;
    return _deferGatePaused;
  }

  function resolvePhase(ctx) {
    if (ctx.initVisActive) return 'init-vis';
    if (ctx.roadsBusy || ctx.sectorDecorBusy) return 'sector-build';
    if (ctx.sectorCooldown || ctx.postSectorDrain) return 'sector-drain';
    if (ctx.streamSoft) return 'stream-soft';
    if (ctx.bootGrace) return 'boot';
    return 'steady';
  }

  function lodMidThresholds(phase) {
    if (phase === 'sector-build' || phase === 'sector-drain') return LOD_MID.sector;
    if (phase === 'boot' || phase === 'stream-soft') return LOD_MID.boot;
    return LOD_MID.normal;
  }

  function evaluate(ctx) {
    const phase = resolvePhase(ctx);
    const th = lodMidThresholds(phase);
    const deferN = ctx.deferPending | 0;
    const lodNear = ctx.lodNearPending | 0;
    const lodMid = ctx.lodMidPending | 0;
    const lodTotal = ctx.lodTotalPending | 0;
    const lodUrgent = ctx.lodUrgentPending | 0;
    const pendingCritical = ctx.pendingCritical | 0;
    const fps = ctx.fps ?? null;
    const lodFar = Math.max(0, lodNear - lodMid);
    const lodPressure = lodMid + Math.min(lodFar, 32);
    const deferPaused = syncDeferGate(deferN);
    const gapSurge = !!(ctx.decorGapActive || ctx.lodGapActive || ctx.lodTextureSurge || ctx.decorGapEmergency);
    const decorGapActive = !!ctx.decorGapActive;
    const decorGapEmergency = !!ctx.decorGapEmergency;
    const lodGapActive = !!ctx.lodGapActive;
    const lodTextureSurge = !!ctx.lodTextureSurge;
    const surge = !!(ctx.approachPrefetch || ctx.criticalSurge || ctx.explorationBoost || gapSurge);

    const reasons = {};
    const allow = {
      stream: true,
      deferSpawn: true,
      lodUpgrade: true,
      treeFetch: true,
      propFetch: true,
      colliderFar: true,
    };

    if (!ctx.streamActive) {
      allow.stream = false;
      reasons.stream = 'inactive';
    }
    if (ctx.frameRecovering) {
      allow.stream = false;
      if (!reasons.stream) reasons.stream = 'frame-recover';
    }
    if (ctx.initVisActive) {
      allow.stream = false;
      allow.treeFetch = false;
      allow.propFetch = false;
      if (!reasons.stream) reasons.stream = 'init-vis';
    }
    if (ctx.roadsBusy || ctx.sectorDecorBusy) {
      allow.stream = false;
      allow.deferSpawn = allow.deferSpawn && deferN > DEFER.RESUME;
      if (!reasons.stream) reasons.stream = 'post-spawn-busy';
    }
    if (ctx.sectorCooldown) {
      allow.stream = false;
      allow.treeFetch = false;
      allow.propFetch = false;
      if (!reasons.stream) reasons.stream = 'sector-cooldown';
    }
    if (ctx.recenterUntil > 0 && !surge) {
      allow.stream = false;
      if (!reasons.stream) reasons.stream = 'recenter';
    }
    if (lodMid > th.high && deferN > 40 && !surge) {
      allow.stream = false;
      if (!reasons.stream) reasons.stream = 'lod-high';
    } else if (lodMid > th.pause && !surge) {
      allow.stream = false;
      if (!reasons.stream) reasons.stream = 'lod-pause';
    }
    if (deferPaused && !ctx.deferForced && !ctx.criticalSurge) {
      allow.stream = false;
      allow.treeFetch = false;
      if (!reasons.stream) reasons.stream = 'defer-pause';
    }
    if (deferN > 220 && lodMid < 72 && !ctx.criticalSurge) {
      allow.stream = false;
      if (!reasons.stream) reasons.stream = 'defer-drain';
    } else if (deferN > 240 && lodMid < 40 && !ctx.criticalSurge) {
      allow.stream = false;
      if (!reasons.stream) reasons.stream = 'defer-drain';
    } else if (lodMid > th.high && deferN > 60) {
      allow.stream = false;
      if (!reasons.stream) reasons.stream = 'lod-near';
    }
    if (lodUrgent > 55 && lodMid > 52) {
      allow.stream = false;
      if (!reasons.stream) reasons.stream = 'urgent-lod';
    }

    if (ctx.initVisDeferBlocked) allow.deferSpawn = false;
    if (ctx.frameRecovering && !ctx.deferForced) allow.deferSpawn = false;
    if ((ctx.roadsBusy || ctx.sectorDecorBusy) && !ctx.deferForced) allow.deferSpawn = false;
    if (ctx.sectorCooldown && !ctx.deferForced) allow.deferSpawn = false;
    if (ctx.recenterActive && !ctx.deferForced && !surge) allow.deferSpawn = false;
    if (lodUrgent > 55 && !ctx.deferForced && !ctx.criticalSurge && !gapSurge
      && (ctx.pendingNearRing ?? 0) < 18 && !ctx.explorationBoost) allow.deferSpawn = false;

    if (ctx.postSpawnVisualBusy) allow.lodUpgrade = false;
    if (ctx.initVisActive) allow.lodUpgrade = false;
    if (deferPaused && !ctx.deferForced && lodNear < 80) allow.lodUpgrade = false;
    if (deferN > 280 && lodMid < 48 && lodNear < 100) allow.lodUpgrade = false;
    if (ctx.sectorCooldown && lodUrgent < 8) allow.lodUpgrade = false;

    if (ctx.sectorCooldown) {
      allow.treeFetch = false;
      allow.propFetch = false;
    }
    if (deferPaused && !ctx.deferForced) {
      allow.treeFetch = false;
    }
    if (lodMid > th.high && deferN > 80) {
      allow.treeFetch = false;
      allow.propFetch = false;
    }

    if (deferN > 320 || ctx.sectorCooldown) allow.colliderFar = false;

    if (ctx.lodGapActive && lodUrgent >= 4) {
      allow.lodUpgrade = true;
      if (reasons.stream === 'defer-pause' || reasons.stream === 'defer-drain') {
        delete reasons.stream;
      }
    }
    if (lodTextureSurge && lodUrgent >= 2) {
      allow.lodUpgrade = true;
      allow.deferSpawn = allow.deferSpawn && deferN > DEFER.RESUME;
      if (reasons.stream === 'lod-pause' || reasons.stream === 'lod-high') delete reasons.stream;
    }
    if (decorGapEmergency) {
      allow.deferSpawn = true;
      if (reasons.stream === 'defer-pause' || reasons.stream === 'defer-drain') delete reasons.stream;
    }

    const deferHeavy = deferN > 200 && lodMid < 72;
    const lodHeavy = lodMid > 65 && (deferN < 320 || lodMid > deferN * 0.24);

    let priority = 'balanced';
    const nearRing = ctx.pendingNearRing ?? 0;
    if (decorGapActive || lodGapActive || decorGapEmergency) priority = 'defer';
    else if (lodTextureSurge && lodUrgent >= 3) priority = 'lod';
    else if ((ctx.criticalSurge || gapSurge || nearRing >= 22) && (pendingCritical >= 12 || nearRing >= 18)) priority = 'defer';
    else if (ctx.lodGapActive && lodUrgent >= 5) priority = 'lod';
    else if (lodHeavy && !ctx.criticalSurge && !gapSurge) priority = 'lod';
    else if (deferHeavy || ctx.criticalSurge || ctx.decorGapActive) priority = 'defer';

    let maxSpawn = ctx.isMobile ? 6 : 12;
    if (ctx.deferForced) {
      maxSpawn = Math.max(maxSpawn, ctx.isMobile ? 8 : 14);
      if (deferN > DEFER.RESUME && deferN <= DEFER.PAUSE) {
        maxSpawn = Math.max(maxSpawn, ctx.isMobile ? 7 : 12);
      }
      if (lodMid > 20) maxSpawn = Math.min(maxSpawn, ctx.isMobile ? 4 : 6);
    }
    if ((phase === 'boot' || phase === 'stream-soft') && deferN > 280 && lodMid < th.pause * 0.55) {
      maxSpawn = Math.max(maxSpawn, ctx.isMobile ? 7 : 11);
    }
    if (deferN >= 340 && deferN <= DEFER.PAUSE && lodMid < 32) {
      maxSpawn = Math.max(maxSpawn, ctx.isMobile ? 8 : 12);
    }
    if (deferN > 400 && !ctx.deferForced && !ctx.criticalSurge) maxSpawn = Math.min(maxSpawn, ctx.isMobile ? 2 : 4);
    else if (deferN > 200 && !ctx.deferForced && !ctx.criticalSurge) maxSpawn = Math.min(maxSpawn, ctx.isMobile ? 3 : 5);
    if (deferN >= DEFER.RESUME && deferN <= DEFER.PAUSE && lodMid < 64) {
      maxSpawn = Math.max(maxSpawn, ctx.isMobile ? 6 : 10);
    }
    if (deferN >= 180 && deferN < DEFER.RESUME && lodMid < 72) {
      maxSpawn = Math.max(maxSpawn, ctx.isMobile ? 6 : 10);
    }
    if (lodPressure > 120) maxSpawn = Math.min(maxSpawn, ctx.isMobile ? 3 : 5);
    if (lodMid > th.pause) maxSpawn = Math.min(maxSpawn, ctx.isMobile ? 2 : 4);

    let lodWindowMax = 80;
    if (deferN > 400) lodWindowMax = 24;
    else if (deferN > 250) lodWindowMax = 40;
    else if (phase === 'sector-drain' && deferN > 120) lodWindowMax = 32;
    else if (deferN < 120 && lodMid > th.pause * 0.25) {
      lodWindowMax = fps != null && fps >= 18 ? 52 : 36;
    }
    if (lodMid > 160) lodWindowMax = Math.min(lodWindowMax, 24);
    else if (lodMid > 120) lodWindowMax = Math.min(lodWindowMax, 36);
    else if (lodMid > 72) lodWindowMax = Math.min(lodWindowMax, 52);
    if (ctx.lodGapActive && lodUrgent >= 4) {
      lodWindowMax = Math.max(lodWindowMax, fps != null && fps >= 16 ? 64 : 48);
    }
    if (lodTextureSurge && lodUrgent >= 2) {
      lodWindowMax = Math.max(lodWindowMax, fps != null && fps >= 14 ? 88 : 64);
    }

    let streamQueueCap = ctx.isMobile ? 12 : 20;
    if (lodMid > th.pause) streamQueueCap = ctx.isMobile ? 6 : 10;
    if (ctx.criticalSurge || gapSurge || nearRing >= 22) {
      maxSpawn = Math.max(maxSpawn, ctx.isMobile ? 16 : 28);
    }
    if (ctx.decorGapActive && deferN >= 4) {
      maxSpawn = Math.max(maxSpawn, ctx.isMobile ? 18 : 30);
      allow.deferSpawn = true;
      if (reasons.stream === 'lod-pause' || reasons.stream === 'lod-high') delete reasons.stream;
    }
    if (deferN > 120 && lodMid < th.pause * 0.4 && phase === 'stream-soft') {
      maxSpawn = Math.max(maxSpawn, ctx.isMobile ? 10 : 16);
    }
    if (ctx.approachPrefetch) {
      streamQueueCap = Math.max(streamQueueCap, ctx.isMobile ? 28 : 48);
      allow.stream = true;
      if (reasons.stream === 'lod-pause' || reasons.stream === 'lod-high') {
        delete reasons.stream;
      }
    }
    if (ctx.criticalSurge || gapSurge) {
      streamQueueCap = Math.max(streamQueueCap, ctx.isMobile ? 20 : 36);
      allow.stream = true;
      allow.deferSpawn = true;
      if (reasons.stream === 'defer-drain' || reasons.stream === 'defer-pause'
        || reasons.stream === 'lod-pause' || reasons.stream === 'lod-high') {
        delete reasons.stream;
      }
    }
    if (deferN > 220 && lodMid < 72 && !ctx.criticalSurge && !gapSurge) streamQueueCap = 0;
    else if (lodMid > 120) streamQueueCap = Math.min(streamQueueCap, ctx.isMobile ? 4 : 6);

    let roadBudgetMs = ctx.isMobile ? 7 : 10;
    if (deferN > 200 || lodMid > 72) roadBudgetMs = Math.max(4, roadBudgetMs - 3);
    if (ctx.frameRecovering) roadBudgetMs = Math.max(3, roadBudgetMs - 2);

    return {
      phase,
      th,
      deferPaused,
      priority,
      allow,
      reasons,
      deferForced: ctx.deferForced,
      criticalSurge: !!ctx.criticalSurge,
      gapSurge,
      decorGapActive: !!ctx.decorGapActive,
      decorGapEmergency: !!ctx.decorGapEmergency,
      lodGapActive: !!ctx.lodGapActive,
      lodTextureSurge: !!ctx.lodTextureSurge,
      pendingCritical,
      quotas: {
        maxSpawn,
        lodWindowMax,
        streamQueueCap,
        roadBudgetMs,
      },
      pressure: {
        defer: deferN,
        lodTotal,
        lodNear,
        lodMid,
        lodFar,
        lodPressure,
        lodUrgent,
      },
    };
  }

  function deferForced(deferN, lodMid, lodNear, bootGrace) {
    if (lodMid >= 96) return false;
    if (bootGrace && deferN >= 320 && lodMid < 120) return true;
    if (deferN >= 340 && deferN <= DEFER.PAUSE && lodMid < 48) return true;
    if (deferN >= 180 && deferN <= DEFER.PAUSE && lodMid < 72) return true;
    if (deferN >= DEFER.RESUME && deferN <= DEFER.PAUSE && lodMid < 72) return true;
    if (deferN > DEFER.PAUSE && lodMid < 64) return true;
    return false;
  }

  function resetDeferGate() {
    _deferGatePaused = false;
  }

  return {
    DEFER,
    LOD_MID,
    evaluate,
    deferForced,
    syncDeferGate,
    resetDeferGate,
    isDeferGatePaused: () => _deferGatePaused,
  };
}
