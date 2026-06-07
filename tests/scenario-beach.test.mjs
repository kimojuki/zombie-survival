import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STEPS,
  checkPositionAdvance,
  defaultScenario,
  isAct1Done,
  migrateScenario,
  shouldDelayZombieSync,
  shouldShowOnlyTutorialZombie,
  stepIndex,
  tutorialPosForPlayer,
} from '../packages/shared/src/scenario-beach.mjs';

test('scenario beach steps are ordered', () => {
  assert.equal(STEPS[0], 'intro_wake');
  assert.equal(STEPS[STEPS.length - 1], 'act1_done');
  assert.ok(stepIndex('fight') > stepIndex('walk_west'));
});

test('migrateScenario defaults old accounts to act1_done', () => {
  const s = migrateScenario({ hotbar: [], bag: [] });
  assert.equal(s.step, 'act1_done');
  assert.equal(s.completed, true);
});

test('new scenario starts at intro_wake', () => {
  const s = defaultScenario();
  assert.equal(s.step, 'intro_wake');
  assert.equal(s.completed, false);
});

test('position advances explore and walk_west', () => {
  assert.equal(checkPositionAdvance('explore', 230, -8), 'walk_west');
  assert.equal(checkPositionAdvance('walk_west', 230, -8), 'silhouette');
  assert.equal(checkPositionAdvance('walk_west', 240, -8), null);
});

test('tutorial pos varies by player id', () => {
  const a = tutorialPosForPlayer(1);
  const b = tutorialPosForPlayer(2);
  assert.notEqual(a.x, b.x);
});

test('zombie sync delay before walk_west only', () => {
  const intro = defaultScenario();
  assert.equal(shouldDelayZombieSync(intro), true);
  intro.step = 'walk_west';
  assert.equal(shouldDelayZombieSync(intro), false);
  assert.equal(shouldShowOnlyTutorialZombie(intro), true);
  intro.step = 'loot';
  assert.equal(shouldShowOnlyTutorialZombie(intro), false);
  assert.equal(isAct1Done(migrateScenario({})), true);
});
