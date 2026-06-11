import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beatTriggeredByPosition,
  beatTriggeredByReadable,
  defaultIntroBeats,
  isIntroKitDone,
  migrateIntroBeats,
} from '../packages/shared/src/intro-beach-beats.mjs';
import { INTRO_ZONE_FOOTPRINTS, INTRO_ZONE_CAMPFIRE, INTRO_ZONE_PIER } from '../packages/shared/src/beach-intro-placements.mjs';

test('intro beats default and kit done', () => {
  const b = defaultIntroBeats();
  assert.equal(b.footprints, false);
  assert.equal(isIntroKitDone(b), false);
  assert.ok(isIntroKitDone({ footprints: true, campfire: true, pier: true, kitDone: true }));
});

test('migrate from v2 starterLootStep', () => {
  assert.deepEqual(migrateIntroBeats({ starterLootStep: 0 }), defaultIntroBeats());
  assert.equal(migrateIntroBeats({ starterLootStep: 1 }).footprints, true);
  assert.equal(migrateIntroBeats({ starterLootStep: 3 }).kitDone, true);
});

test('beat zones trigger in order', () => {
  const empty = defaultIntroBeats();
  assert.equal(beatTriggeredByPosition(INTRO_ZONE_FOOTPRINTS.x, INTRO_ZONE_FOOTPRINTS.z, empty), 'footprints');
  const afterFp = { ...empty, footprints: true };
  assert.equal(beatTriggeredByPosition(INTRO_ZONE_CAMPFIRE.x, INTRO_ZONE_CAMPFIRE.z, afterFp), 'campfire');
  const afterCamp = { footprints: true, campfire: true, pier: false, kitDone: false };
  assert.equal(beatTriggeredByPosition(INTRO_ZONE_PIER.x, INTRO_ZONE_PIER.z, afterCamp), 'pier');
});

test('readable triggers footprints and campfire', () => {
  const empty = defaultIntroBeats();
  assert.equal(beatTriggeredByReadable('intro_bottle_k', empty), 'footprints');
  const fp = { footprints: true, campfire: false, pier: false, kitDone: false };
  assert.equal(beatTriggeredByReadable('intro_burnt_note_k', fp), 'campfire');
});

test('intro session progress detects picked loot', async () => {
  const {
    hasIntroSessionProgress,
    playerOwnsIntroItem,
    shouldResetIntroInventoryOnConnect,
  } = await import('../packages/shared/src/intro-beach-beats.mjs');
  const fresh = { step: 'intro_wake', introBeats: defaultIntroBeats() };
  const invEmpty = { hotbar: [], bag: [] };
  assert.equal(hasIntroSessionProgress(fresh, invEmpty), false);
  assert.equal(shouldResetIntroInventoryOnConnect(fresh, invEmpty), true);
  const invRock = { hotbar: [{ type: 'tool_caillou', qty: 1 }], bag: [] };
  assert.ok(playerOwnsIntroItem(invRock, 'tool_caillou'));
  assert.ok(hasIntroSessionProgress(fresh, invRock));
  assert.equal(shouldResetIntroInventoryOnConnect(fresh, invRock), false);
  const flagged = { step: 'explore', introBeats: { ...defaultIntroBeats(), footprints: true, pickedRock: true } };
  assert.ok(hasIntroSessionProgress(flagged, invEmpty));
});
