/** Intro plage — étapes, constantes et validateurs partagés client/serveur. */

import { BEACH_SPAWN } from './beach-spawn.mjs';

export const BEACH_SCENARIO_VERSION = 2;

export const STEPS = Object.freeze([
  'intro_wake',
  'intro_stand',
  'breathe',
  'explore',
  'walk_west',
  'silhouette',
  'approach',
  'reveal',
  'fight',
  'loot',
  'epilogue',
  'act1_done',
]);

export const ACTS = Object.freeze([
  { id: 1, title: 'Le rivage', steps: ['intro_wake', 'intro_stand', 'breathe', 'explore'] },
  { id: 2, title: 'La forme', steps: ['walk_west', 'silhouette', 'approach'] },
  { id: 3, title: 'La vérité', steps: ['reveal', 'fight', 'loot', 'epilogue', 'act1_done'] },
]);

export const TUTORIAL_ZOMBIE_POS = Object.freeze({ x: 208, z: -8 });
export const BEACH_SPAWN_REF = Object.freeze({ x: BEACH_SPAWN.x, z: BEACH_SPAWN.z });
export const WALK_WEST_X = 236;
export const EXPLORE_MIN_DIST = 15;
export const BREATHE_MIN_DIST = 3;
export const BREATHE_MIN_YAW = 0.4;
export const SILHOUETTE_SEE_DIST = 40;
export const SILHOUETTE_APPROACH_DIST = 18;
export const TUTORIAL_FLEE_DIST = 35;
export const REVEAL_MS = 6000;
export const TUTORIAL_HP_RATIO = 0.45;
export const TUTORIAL_SPEED_RATIO = 0.65;

export const STEP_HUD = Object.freeze({
  breathe: 'Regarde autour',
  explore: 'Explore le rivage',
  walk_west: 'Va vers l\'intérieur',
  silhouette: 'Quelqu\'un au loin ?',
  approach: 'Approche-toi',
  fight: 'Défends-toi !',
  loot: 'Récupère le bandage',
});

export const STEP_HINT = Object.freeze({
  breathe: 'Tourne la tête ou fais un pas.',
  explore: 'Le sable, la mer… personne.',
  walk_west: 'Suis le sentier vers l\'ouest.',
  silhouette: 'Une forme immobile sur le sentier.',
  approach: 'Prudemment…',
  fight: 'Utilise ton caillou.',
  loot: 'Ramasse le bandage au sol.',
});

export const STEP_DIALOGUE = Object.freeze({
  silhouette: 'Une forme… sur le sentier. Elle ne bouge pas.',
  approach: 'Un survivant ?',
});

export const REVEAL_SCRIPT = Object.freeze([
  { atMs: 0, line: 'Elle tourne la tête.' },
  { atMs: 1500, line: '…Ce n\'est pas un survivant.' },
  { atMs: 3000, line: 'C\'est quoi ça — ?!' },
  { atMs: 4500, line: null, hudFight: true },
]);

export const EPILOGUE_LINES = Object.freeze([
  '…Ils étaient humains. Autrefois.',
  'Tu as un bandage. La forêt t\'attend.',
]);

export const INTRO_WAKE_LINES = Object.freeze([
  'Du sable. Des vagues. Aucun souvenir.',
  'L\'océan à l\'est. La forêt… là-bas, à l\'ouest.',
  'Personne en vue.',
]);

export function stepIndex(step) {
  const i = STEPS.indexOf(step);
  return i >= 0 ? i : STEPS.length - 1;
}

export function isAct1Done(scenario) {
  if (!scenario || typeof scenario !== 'object') return true;
  if (scenario.completed) return true;
  return scenario.step === 'act1_done';
}

export function isInIntro(scenario) {
  return !isAct1Done(scenario);
}

export function shouldDelayZombieSync(scenario) {
  return isInIntro(scenario) && stepIndex(scenario.step) < stepIndex('walk_west');
}

export function shouldShowOnlyTutorialZombie(scenario) {
  if (isAct1Done(scenario)) return false;
  const idx = stepIndex(scenario.step);
  const walk = stepIndex('walk_west');
  const fight = stepIndex('fight');
  return idx >= walk && idx <= fight;
}

export function isInvincibleDuringIntro(scenario) {
  if (isAct1Done(scenario)) return false;
  return stepIndex(scenario.step) < stepIndex('fight');
}

export function getActForStep(step) {
  for (const act of ACTS) {
    if (act.steps.includes(step)) return act;
  }
  return ACTS[ACTS.length - 1];
}

export function distXZ(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

/** Décalage léger par joueur pour éviter collision multi-intro. */
export function tutorialPosForPlayer(playerId) {
  const n = Number(playerId);
  const slot = Number.isFinite(n) ? Math.abs(Math.floor(n)) % 5 : 0;
  const offsetX = (slot - 2) * 1.2;
  return {
    x: TUTORIAL_ZOMBIE_POS.x + offsetX,
    z: TUTORIAL_ZOMBIE_POS.z,
  };
}

export function defaultScenario(step = 'intro_wake') {
  return {
    act: 'beach',
    step,
    completed: step === 'act1_done',
    version: BEACH_SCENARIO_VERSION,
    tutorialZombieId: null,
    tutorialKilled: false,
  };
}

export function migrateScenario(savedInv) {
  if (savedInv?.scenario && typeof savedInv.scenario === 'object') {
    const s = savedInv.scenario;
    if (!s.version) s.version = BEACH_SCENARIO_VERSION;
    if (s.step === 'act1_done') s.completed = true;
    return s;
  }
  return defaultScenario('act1_done');
}

export function canClientAdvance(fromStep, toStep) {
  const from = stepIndex(fromStep);
  const to = stepIndex(toStep);
  if (to !== from + 1) return false;
  const clientSteps = new Set(['intro_stand', 'breathe', 'act1_done']);
  return clientSteps.has(toStep);
}

export function checkPositionAdvance(step, px, pz, extra = {}) {
  switch (step) {
    case 'breathe': {
      if (extra.yawDelta >= BREATHE_MIN_YAW) return 'explore';
      if (distXZ(px, pz, BEACH_SPAWN_REF.x, BEACH_SPAWN_REF.z) >= BREATHE_MIN_DIST) return 'explore';
      return null;
    }
    case 'explore':
      if (distXZ(px, pz, BEACH_SPAWN_REF.x, BEACH_SPAWN_REF.z) >= EXPLORE_MIN_DIST) return 'walk_west';
      return null;
    case 'walk_west':
      if (px < WALK_WEST_X) return 'silhouette';
      return null;
    case 'silhouette': {
      const tp = extra.tutorialPos || TUTORIAL_ZOMBIE_POS;
      if (distXZ(px, pz, tp.x, tp.z) <= SILHOUETTE_SEE_DIST) return 'approach';
      return null;
    }
    case 'approach': {
      const tp = extra.tutorialPos || TUTORIAL_ZOMBIE_POS;
      if (distXZ(px, pz, tp.x, tp.z) <= SILHOUETTE_APPROACH_DIST) return 'reveal';
      return null;
    }
    default:
      return null;
  }
}
