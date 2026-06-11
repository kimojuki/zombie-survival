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
  scenarioSpawnRef,
  tutorialPosForPlayer,
} from '../packages/shared/src/scenario-beach.mjs';
import { defaultIntroBeats } from '../packages/shared/src/intro-beach-beats.mjs';

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
  assert.deepEqual(s.introBeats, defaultIntroBeats());
});

test('walk_west requires intro kit done', () => {
  const ref = { x: 248, z: -8 };
  assert.equal(checkPositionAdvance('explore', 230, -8, { spawnRef: ref, kitDone: false }), null);
  assert.equal(checkPositionAdvance('explore', 230, -8, { spawnRef: ref, kitDone: true }), 'walk_west');
});

test('trail_exit advances to read_exit_sign near panneau', () => {
  assert.equal(checkPositionAdvance('trail_exit', 243.8, -10.8, {}), 'read_exit_sign');
});

test('position advances explore and walk_west', () => {
  assert.equal(checkPositionAdvance('explore', 230, -8, { kitDone: true }), 'walk_west');
  assert.equal(checkPositionAdvance('walk_west', 230, -8), 'silhouette');
  assert.equal(checkPositionAdvance('walk_west', 240, -8), null);
});

test('explore uses scenario anchor not global ref when spawn is offset', () => {
  const anchor = { x: 270, z: -8 };
  const ref = scenarioSpawnRef({ anchorX: anchor.x, anchorZ: anchor.z });
  assert.deepEqual(ref, anchor);
  assert.equal(
    checkPositionAdvance('explore', 270, -8, { spawnRef: ref }),
    null,
  );
  assert.equal(
    checkPositionAdvance('explore', 255, -8, { spawnRef: ref, kitDone: true }),
    'walk_west',
  );
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
