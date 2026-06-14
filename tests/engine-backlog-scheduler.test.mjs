import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBacklogScheduler, DEFER } from '../apps/client/src/engine/backlog-scheduler.js';
import { createFrameRunner } from '../apps/client/src/engine/frame-runner.js';

function baseCtx(overrides = {}) {
  return {
    deferPending: 0,
    lodTotalPending: 0,
    lodNearPending: 0,
    lodMidPending: 0,
    lodUrgentPending: 0,
    streamActive: true,
    initVisActive: false,
    initVisDeferBlocked: false,
    roadsBusy: false,
    sectorDecorBusy: false,
    sectorCooldown: false,
    postSectorDrain: false,
    streamSoft: false,
    bootGrace: false,
    recenterUntil: 0,
    recenterActive: false,
    postSpawnVisualBusy: false,
    frameRecovering: false,
    deferForced: false,
    isMobile: false,
    fps: 30,
    ...overrides,
  };
}

test('defer gate hysteresis 420/380', () => {
  const s = createBacklogScheduler();
  assert.equal(s.syncDeferGate(430), true);
  assert.equal(s.isDeferGatePaused(), true);
  assert.equal(s.syncDeferGate(400), true);
  assert.equal(s.syncDeferGate(379), false);
  assert.equal(s.isDeferGatePaused(), false);
});

test('deferForced tail drain from 180 with low lodMid', () => {
  const s = createBacklogScheduler();
  assert.equal(s.deferForced(237, 0, 224, false), true);
  assert.equal(s.deferForced(179, 0, 224, false), false);
});

test('criticalSurge bypasses defer-drain stream block', () => {
  const s = createBacklogScheduler();
  const plan = s.evaluate(baseCtx({
    deferPending: 250,
    lodMidPending: 40,
    deferForced: true,
    criticalSurge: true,
    pendingCritical: 30,
  }));
  assert.equal(plan.allow.stream, true);
  assert.ok(plan.quotas.maxSpawn >= 16);
  assert.equal(plan.priority, 'defer');
});

test('defer-drain blocks stream when defer>220 and lodMid<72', () => {
  const s = createBacklogScheduler();
  const plan = s.evaluate(baseCtx({
    deferPending: 250,
    lodMidPending: 40,
    deferForced: true,
  }));
  assert.equal(plan.allow.stream, false);
  assert.equal(plan.reasons.stream, 'defer-drain');
  assert.equal(plan.quotas.streamQueueCap, 0);
});

test('priority lod when lodMid high and defer moderate', () => {
  const s = createBacklogScheduler();
  const plan = s.evaluate(baseCtx({
    deferPending: 100,
    lodMidPending: 80,
    lodNearPending: 120,
  }));
  assert.equal(plan.priority, 'lod');
});

test('deferForced keeps high maxSpawn in 380-420 band with low lodMid', () => {
  const s = createBacklogScheduler();
  const plan = s.evaluate(baseCtx({
    deferPending: 404,
    lodMidPending: 28,
    lodNearPending: 190,
    deferForced: true,
  }));
  assert.ok(plan.quotas.maxSpawn >= 8, `maxSpawn=${plan.quotas.maxSpawn}`);
  assert.equal(plan.priority, 'defer');
});

test('init-vis blocks stream and tree fetch', () => {
  const s = createBacklogScheduler();
  const plan = s.evaluate(baseCtx({ initVisActive: true }));
  assert.equal(plan.allow.stream, false);
  assert.equal(plan.allow.treeFetch, false);
  assert.equal(plan.phase, 'init-vis');
});

test('FrameRunner runs defer priority before lod', () => {
  const runner = createFrameRunner();
  const order = [];
  runner.runDecorWorkers({
    budgetMs: 50,
    t0: performance.now(),
    plan: { priority: 'defer', pressure: { defer: 300 } },
    workers: {
      lod: () => order.push('lod'),
      defer: () => order.push('defer'),
      vis: () => order.push('vis'),
      loaders: () => order.push('loaders'),
    },
  });
  assert.deepEqual(order, ['defer', 'vis', 'loaders']);
});

test('DEFER constants exported', () => {
  assert.equal(DEFER.PAUSE, 420);
  assert.equal(DEFER.RESUME, 380);
});

test('decorGapActive boosts defer spawn quota', () => {
  const sched = createBacklogScheduler();
  const base = sched.evaluate({
    deferPending: 120,
    lodTotalPending: 40,
    lodNearPending: 30,
    lodMidPending: 20,
    lodUrgentPending: 10,
    pendingCritical: 8,
    pendingNearRing: 16,
    streamActive: true,
    isMobile: false,
    deferForced: false,
  });
  const gap = sched.evaluate({
    deferPending: 120,
    lodTotalPending: 40,
    lodNearPending: 30,
    lodMidPending: 20,
    lodUrgentPending: 10,
    pendingCritical: 8,
    pendingNearRing: 16,
    streamActive: true,
    isMobile: false,
    deferForced: false,
    decorGapActive: true,
  });
  assert.ok(gap.quotas.maxSpawn >= base.quotas.maxSpawn);
  assert.equal(gap.priority, 'defer');
  assert.equal(gap.gapSurge, true);
});
