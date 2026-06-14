import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ContentRing, ringForDelta, RING_RADIUS } from '../apps/client/src/engine/content-rings.js';
import {
  scoreContentJob,
  isP0GameplayDecor,
  ContentJobType,
} from '../apps/client/src/engine/content-priority.js';
import { createBudgetGovernor } from '../apps/client/src/engine/budget-governor.js';
import { createWorldContentLoader } from '../apps/client/src/engine/world-content-loader.js';

test('ringForDelta critical near far stream', () => {
  assert.equal(ringForDelta(0, 0), ContentRing.CRITICAL);
  assert.equal(ringForDelta(RING_RADIUS.critical + 1, 0), ContentRing.NEAR);
  assert.equal(ringForDelta(RING_RADIUS.near + 1, 0), ContentRing.FAR);
  assert.equal(ringForDelta(RING_RADIUS.far + 10, 0), ContentRing.STREAM);
});

test('P0 palm beats far tree in score', () => {
  const palm = scoreContentJob({
    dx: 30,
    dz: 0,
    payload: { prefabId: 'tree_palm_a' },
  });
  const farTree = scoreContentJob({
    dx: 300,
    dz: 0,
    payload: { prefabId: 'tree_oak' },
  });
  assert.ok(palm.score > farTree.score);
});

test('isP0GameplayDecor detects beach prefabs', () => {
  assert.equal(isP0GameplayDecor({ prefabId: 'beach_crate_01' }), true);
  assert.equal(isP0GameplayDecor({ prefabId: 'rock_small' }), false);
});

test('ContentLoader selectDecorBatch prioritizes critical ring', () => {
  const loader = createWorldContentLoader();
  loader.setStreamingSource(0, 0);
  loader.pushDecor({ id: 'far', x: 300, z: 0, prefabId: 'tree_oak' });
  loader.pushDecor({ id: 'near', x: 20, z: 0, prefabId: 'tree_oak' });
  loader.pushDecor({ id: 'palm', x: 40, z: 0, prefabId: 'tree_palm_a' });
  const { picks } = loader.selectDecorBatch(0, 0, {
    maxItems: 3,
    spawnR2: 200 ** 2,
    streamR2: 400 ** 2,
  });
  assert.equal(picks[0].d.id, 'palm');
  assert.equal(picks[1].d.id, 'near');
});

test('ContentLoader removeDecorIndices keeps order', () => {
  const loader = createWorldContentLoader();
  loader.pushDecorMany([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  loader.removeDecorIndices(new Set([1]));
  assert.deepEqual(loader.getDecorPending().map((d) => d.id), ['a', 'c']);
  assert.equal(loader.getStats().drained, 1);
});

test('BudgetGovernor reduces budget on frame recover', () => {
  const gov = createBudgetGovernor();
  const normal = gov.getDecorBudget({ isMobile: false, frameRecovering: false });
  const recover = gov.getDecorBudget({ isMobile: false, frameRecovering: true });
  assert.ok(recover < normal);
});

test('BudgetGovernor canWork respects plan.allow', () => {
  const gov = createBudgetGovernor();
  assert.equal(gov.canWork('stream', { allow: { stream: false } }), false);
  assert.equal(gov.canWork('deferSpawn', { allow: { deferSpawn: true } }), true);
});

test('evaluateDeferSpawnGate blocks init-vis unless bypass', () => {
  const gov = createBudgetGovernor();
  const blocked = gov.evaluateDeferSpawnGate({ allow: { deferSpawn: true } }, {
    initVisDeferBlocked: true,
    decorTickHeavyAllowed: true,
  });
  assert.equal(blocked.allowed, false);
  const bypass = gov.evaluateDeferSpawnGate({ allow: { deferSpawn: false } }, {
    band0Pending: true,
  });
  assert.equal(bypass.allowed, true);
});

test('computeDeferSpawnQuota boosts band0 pending', () => {
  const gov = createBudgetGovernor();
  const normal = gov.computeDeferSpawnQuota({ quotas: { maxSpawn: 8 } }, {
    isMobile: false,
    deferPending: 100,
    lodMid: 20,
    lodNear: 40,
    band0Pending: false,
  });
  const boost = gov.computeDeferSpawnQuota({ quotas: { maxSpawn: 8 } }, {
    isMobile: false,
    deferPending: 100,
    lodMid: 20,
    lodNear: 40,
    band0Pending: true,
  });
  assert.ok(boost >= 14);
  assert.ok(boost > normal);
});

test('evaluateCriticalSurge active on NEAR ring backlog (log prod)', () => {
  const loader = createWorldContentLoader();
  loader.setStreamingSource(0, 0);
  for (let i = 0; i < 25; i++) {
    loader.pushDecor({ id: `n${i}`, x: 90 + i, z: 0, prefabId: 'tree_oak' });
  }
  const surge = loader.evaluateCriticalSurge(0, 0, 2, 0);
  assert.equal(surge.active, true);
  assert.ok(surge.nearNow.near >= 14);
});

test('shouldDeferStreamFetch when disk full and near empty', () => {
  const loader = createWorldContentLoader();
  loader.setStreamingSource(0, 0);
  for (let i = 0; i < 80; i++) {
    loader.pushDecor({ id: `f${i}`, x: 200 + (i % 10), z: i * 3, prefabId: 'tree_oak' });
  }
  assert.equal(loader.shouldDeferStreamFetch(0, 0), true);
});

test('pendingRingSummary counts far ring', () => {
  const loader = createWorldContentLoader();
  loader.pushDecor({ id: 'near', x: 90, z: 0, prefabId: 'tree_oak' });
  loader.pushDecor({ id: 'far', x: 200, z: 0, prefabId: 'tree_oak' });
  const s = loader.pendingRingSummary(0, 0);
  assert.equal(s.near, 1);
  assert.equal(s.far, 1);
  assert.equal(s.disk320, 2);
});

test('shouldPauseStreamFetch when active gap', () => {
  const loader = createWorldContentLoader();
  loader.setStreamingSource(0, 0);
  loader.pushDecor({ id: 'one', x: 200, z: 0, prefabId: 'tree_oak' });
  assert.equal(loader.shouldPauseStreamFetch(0, 0, 3, 0, { activeGap: true }), true);
});

test('shouldPauseStreamFetch when idle with local near backlog', () => {
  const loader = createWorldContentLoader();
  loader.setStreamingSource(0, 0);
  for (let i = 0; i < 8; i++) {
    loader.pushDecor({ id: `n${i}`, x: 90 + i, z: 0, prefabId: 'tree_oak' });
  }
  assert.equal(loader.shouldPauseStreamFetch(0, 0, 0, 0), true);
});

test('shouldPauseStreamFetch when idle with near backlog', () => {
  const loader = createWorldContentLoader();
  loader.setStreamingSource(0, 0);
  for (let i = 0; i < 14; i++) {
    loader.pushDecor({ id: `n${i}`, x: 90 + i, z: 0, prefabId: 'tree_oak' });
  }
  assert.equal(loader.shouldPauseStreamFetch(0, 0, 0, 0), true);
  assert.equal(loader.shouldPauseStreamFetch(0, 0, 0, 0, { activeGap: true }), true);
  assert.equal(loader.shouldPauseStreamFetch(0, 0, 2, 0), false);
});

test('evaluateCriticalSurge active on high critical ring backlog', () => {
  const loader = createWorldContentLoader();
  loader.setStreamingSource(0, 0);
  for (let i = 0; i < 20; i++) {
    loader.pushDecor({ id: `c${i}`, x: 10 + i, z: 0, prefabId: 'tree_oak' });
  }
  const surge = loader.evaluateCriticalSurge(0, 0, 0, 0);
  assert.equal(surge.active, true);
  assert.ok(surge.nearNow.critical >= 18);
});

test('evaluateCriticalSurge active while moving toward ahead critical', () => {
  const loader = createWorldContentLoader();
  loader.setStreamingSource(0, 0);
  for (let i = 0; i < 10; i++) {
    loader.pushDecor({ id: `a${i}`, x: 30 + i * 2, z: 0, prefabId: 'tree_oak' });
  }
  const surge = loader.evaluateCriticalSurge(0, 0, 3, 0);
  assert.equal(surge.active, true);
});

test('computeDeferSpawnQuota boosts criticalSurge', () => {
  const gov = createBudgetGovernor();
  const normal = gov.computeDeferSpawnQuota({ quotas: { maxSpawn: 8 } }, {
    isMobile: false,
    deferPending: 300,
    lodMid: 20,
    lodNear: 140,
  });
  const surge = gov.computeDeferSpawnQuota({ quotas: { maxSpawn: 8 } }, {
    isMobile: false,
    deferPending: 300,
    lodMid: 20,
    lodNear: 140,
    criticalSurge: true,
  });
  assert.ok(surge > normal);
  assert.ok(surge >= 18);
});

test('drainDecorRing respects radiusR2 filter', () => {
  const loader = createWorldContentLoader();
  loader.setStreamingSource(0, 0);
  loader.pushDecor({ id: 'near', x: 30, z: 0, prefabId: 'rock' });
  loader.pushDecor({ id: 'far', x: 150, z: 0, prefabId: 'rock' });
  const spawned = [];
  loader.drainDecorRing(0, 0, {
    maxItems: 10,
    maxMs: 200,
    radiusR2: 100 * 100,
    spawnR2: 200 ** 2,
    streamR2: 400 ** 2,
    forceFastGround: true,
  }, {
    spawnOne: (d) => spawned.push(d.id),
  });
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0], 'near');
  assert.equal(loader.getDecorPending().length, 1);
});

test('drainDecorRingAsync batches with yield', async () => {
  const loader = createWorldContentLoader();
  loader.setStreamingSource(0, 0);
  for (let i = 0; i < 30; i++) {
    loader.pushDecor({ id: `d${i}`, x: i, z: 0, prefabId: 'rock' });
  }
  let yields = 0;
  const result = await loader.drainDecorRingAsync(0, 0, {
    maxItems: 30,
    maxMs: 500,
    radiusR2: 100 * 100,
    spawnR2: 200 ** 2,
    streamR2: 400 ** 2,
    batchSize: 10,
  }, {
    spawnOne: () => {},
    yield: async () => { yields++; },
  });
  assert.ok(result.spawned > 0);
  assert.ok(yields >= 1);
});

test('evaluateExplorationBoost active when near pending high', () => {
  const loader = createWorldContentLoader();
  loader.setStreamingSource(0, 0);
  for (let i = 0; i < 20; i++) {
    loader.pushDecor({ id: `n${i}`, x: 30 + i, z: 0, prefabId: 'tree_oak' });
  }
  const boost = loader.evaluateExplorationBoost(0, 0, { minTotal: 15 });
  assert.equal(boost.active, true);
  assert.ok(boost.total >= 15);
});

test('pendingNearPlayer counts critical and near rings', () => {
  const loader = createWorldContentLoader();
  loader.pushDecor({ id: 'c', x: 10, z: 0 });
  loader.pushDecor({ id: 'n', x: 100, z: 0 });
  loader.pushDecor({ id: 'f', x: 300, z: 0 });
  const counts = loader.pendingNearPlayer(0, 0);
  assert.equal(counts.critical, 1);
  assert.equal(counts.near, 1);
  assert.equal(counts.total, 2);
});

test('evaluateDeferSpawnGate exploration bypasses recenter', () => {
  const gov = createBudgetGovernor();
  const blocked = gov.evaluateDeferSpawnGate({ allow: { deferSpawn: true } }, {
    recenterActive: true,
    decorTickHeavyAllowed: true,
  });
  assert.equal(blocked.allowed, false);
  const boost = gov.evaluateDeferSpawnGate({ allow: { deferSpawn: true } }, {
    recenterActive: true,
    explorationBoost: true,
    decorTickHeavyAllowed: true,
  });
  assert.equal(boost.allowed, true);
});

test('computeDeferSpawnQuota exploration boost', () => {
  const gov = createBudgetGovernor();
  const normal = gov.computeDeferSpawnQuota({ quotas: { maxSpawn: 8 } }, {
    isMobile: false,
    deferPending: 100,
    lodMid: 20,
    lodNear: 40,
    explorationBoost: false,
  });
  const boost = gov.computeDeferSpawnQuota({ quotas: { maxSpawn: 8 } }, {
    isMobile: false,
    deferPending: 100,
    lodMid: 20,
    lodNear: 40,
    explorationBoost: true,
  });
  assert.ok(boost >= 18);
  assert.ok(boost > normal);
});

test('computeLeadAnchor projects ahead of velocity', () => {
  const loader = createWorldContentLoader();
  const lead = loader.computeLeadAnchor(0, 0, 4, 0);
  assert.equal(lead.active, true);
  assert.ok(lead.lx > 10);
  assert.equal(lead.lz, 0);
});

test('evaluateApproachPrefetch active when moving toward pending', () => {
  const loader = createWorldContentLoader();
  for (let i = 0; i < 8; i++) {
    loader.pushDecor({ id: `a${i}`, x: 80 + i * 5, z: 0, prefabId: 'tree_oak' });
  }
  const prefetch = loader.evaluateApproachPrefetch(0, 0, 3, 0);
  assert.equal(prefetch.active, true);
  assert.ok(prefetch.ahead.total >= 3);
});

test('evaluateDeferSpawnGate approach bypasses recenter', () => {
  const gov = createBudgetGovernor();
  const blocked = gov.evaluateDeferSpawnGate({ allow: { deferSpawn: true } }, {
    recenterActive: true,
    decorTickHeavyAllowed: true,
  });
  assert.equal(blocked.allowed, false);
  const prefetch = gov.evaluateDeferSpawnGate({ allow: { deferSpawn: true } }, {
    recenterActive: true,
    approachPrefetch: true,
    decorTickHeavyAllowed: true,
  });
  assert.equal(prefetch.allowed, true);
});

test('ContentJobType collider weight above decor', () => {
  const collider = scoreContentJob({ dx: 50, dz: 0, type: ContentJobType.COLLIDER });
  const decor = scoreContentJob({ dx: 50, dz: 0, type: ContentJobType.DECOR_SPAWN });
  assert.ok(collider.score > decor.score);
});
