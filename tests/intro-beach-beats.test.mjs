import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beatTriggeredByPosition,
  beatTriggeredByReadable,
  defaultIntroBeats,
  introPersonalVisibleTo,
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

test('introPersonalVisibleTo — owner only', () => {
  const rock = { introPersonal: true, ownerPlayerId: 42, type: 'tool_caillou' };
  assert.equal(introPersonalVisibleTo(rock, 42), true);
  assert.equal(introPersonalVisibleTo(rock, 7), false);
  assert.equal(introPersonalVisibleTo(rock, null), false);
  assert.equal(introPersonalVisibleTo({ type: 'food_sandwich' }, 7), true);
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

test('blocksStarterRationsDuringIntro until kit done', async () => {
  const { blocksStarterRationsDuringIntro, defaultIntroBeats } = await import('../packages/shared/src/intro-beach-beats.mjs');
  assert.equal(blocksStarterRationsDuringIntro({ step: 'explore', introBeats: defaultIntroBeats() }), true);
  assert.equal(blocksStarterRationsDuringIntro({ step: 'act1_done', completed: true }), false);
  assert.equal(blocksStarterRationsDuringIntro({
    step: 'explore',
    introBeats: { ...defaultIntroBeats(), kitDone: true },
  }), false);
});

test('stripLegacyIntroKit removes magic kit before valise', async () => {
  const { stripLegacyIntroKit, defaultIntroBeats } = await import('../packages/shared/src/intro-beach-beats.mjs');
  const scenario = { step: 'explore', introBeats: defaultIntroBeats() };
  const inv = {
    hotbar: [
      { type: 'tool_caillou', qty: 1 },
      { type: 'tool_torche', qty: 1 },
      { type: 'food_eau_bouteille', qty: 1 },
      { type: 'food_sandwich', qty: 1 },
      null,
      null,
    ],
    bag: [],
    equip: {},
  };
  assert.equal(stripLegacyIntroKit(inv, scenario), true);
  assert.equal(inv.hotbar[0], null);
  assert.equal(inv.hotbar[1], null);
  assert.equal(inv.hotbar[2], null);
  assert.equal(inv.hotbar[3], null);
  const done = { step: 'explore', introBeats: { ...defaultIntroBeats(), kitDone: true } };
  const kept = {
    hotbar: [{ type: 'food_sandwich', qty: 1 }],
    bag: [],
    equip: {},
  };
  assert.equal(stripLegacyIntroKit(kept, done), false);
  assert.equal(kept.hotbar[0].type, 'food_sandwich');
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
