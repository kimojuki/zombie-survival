'use strict';

const DEFAULT_SURVIVAL = Object.freeze({
  faim: 80,
  soif: 80,
  infection: 0,
  saignement: false,
  endurance: 100,
});

const STARTER_RATIONS = Object.freeze([
  { type: 'food_eau_bouteille', qty: 1 },
  { type: 'food_sandwich', qty: 1 },
]);

const STARTING_ITEMS = Object.freeze({
  hotbar: [
    { type: 'tool_caillou', qty: 1, durability: 80 },
    { type: 'tool_torche', qty: 1 },
    { type: 'food_eau_bouteille', qty: 1 },
    { type: 'food_sandwich', qty: 1 },
    null, null,
  ],
  bag: [],
  equip: { 'Tête': null, 'Torso': null, 'Mains': null, 'Dos': null },
});

/** Intro plage — pas de kit magique ; loot personnel au sol (brique 2). */
const EMPTY_PLAYER_INV = Object.freeze({
  hotbar: Array(6).fill(null),
  bag: [],
  equip: { 'Tête': null, 'Torso': null, 'Mains': null, 'Dos': null },
});

const INTRO_SCENARIO = Object.freeze({
  act: 'beach',
  step: 'intro_wake',
  completed: false,
  version: 2,
  tutorialZombieId: null,
  tutorialKilled: false,
});

const BENCH_SCENARIO = Object.freeze({
  act: 'beach',
  step: 'act1_done',
  completed: true,
  version: 2,
  tutorialZombieId: null,
  tutorialKilled: false,
});

function buildStartingSave() {
  return JSON.stringify({
    ...STARTING_ITEMS,
    survival: DEFAULT_SURVIVAL,
    scenario: INTRO_SCENARIO,
  });
}

function buildBenchSave() {
  return JSON.stringify({
    ...STARTING_ITEMS,
    survival: DEFAULT_SURVIVAL,
    scenario: BENCH_SCENARIO,
  });
}

module.exports = {
  DEFAULT_SURVIVAL,
  STARTER_RATIONS,
  STARTING_ITEMS,
  EMPTY_PLAYER_INV,
  buildStartingSave,
  buildBenchSave,
};
