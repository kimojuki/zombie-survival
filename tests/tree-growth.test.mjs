import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTreeScale,
  getTreeWoodForPhase,
  clampGrowthPhase,
  GROWTH_PHASE_MS,
  nextGrowthDueAt,
} from '../packages/shared/src/tree-growth.mjs';

test('tree scale grows with phase', () => {
  assert.ok(getTreeScale(0) < getTreeScale(2));
  assert.equal(getTreeScale(4), 1);
});

test('wood stock scales with tree age', () => {
  assert.ok(getTreeWoodForPhase('tree_oak', 0) < getTreeWoodForPhase('tree_oak', 4));
  assert.equal(getTreeWoodForPhase('tree_oak', 4), 8);
});

test('growth schedule uses plantedAt', () => {
  const planted = 1_000_000;
  assert.ok(nextGrowthDueAt(planted, 0) > planted);
  assert.equal(nextGrowthDueAt(planted, 4), Infinity);
  assert.ok(GROWTH_PHASE_MS > 60_000);
});

test('clamp growth phase', () => {
  assert.equal(clampGrowthPhase(-1), 0);
  assert.equal(clampGrowthPhase(99), 4);
});
