'use strict';

import { HUNGER_DECAY_PER_SEC, THIRST_DECAY_PER_SEC } from './survival.mjs';

/** Prefabs utilisant le sommeil progressif (lit meublé). */
export const BED_SLEEP_PREFABS = Object.freeze([
  'spawn_single_bed',
]);

/** PV restaurés par seconde de sommeil. */
export const BED_SLEEP_HP_PER_SEC = 2.8;

/** Multiplicateurs faim/soif pendant le sommeil (coût du repos). */
export const BED_SLEEP_HUNGER_MUL = 1.55;
export const BED_SLEEP_THIRST_MUL = 2.1;

export function isBedSleepPrefab(prefabId) {
  return BED_SLEEP_PREFABS.includes(String(prefabId || ''));
}

function clamp(v) {
  return Math.max(0, Math.min(100, v));
}

/**
 * Tick sommeil lit — regen PV, baisse faim/soif, pas de dégâts survie.
 * @param {object} p joueur connecté (muté)
 * @param {number} dt secondes
 * @param {(inv: object) => number} getMaxHealth
 */
export function tickBedSleep(p, dt, getMaxHealth) {
  const sv = p.survival || { faim: 80, soif: 80, infection: 0, saignement: false };
  sv.faim = clamp((sv.faim ?? 80) - HUNGER_DECAY_PER_SEC * BED_SLEEP_HUNGER_MUL * dt);
  sv.soif = clamp((sv.soif ?? 80) - THIRST_DECAY_PER_SEC * BED_SLEEP_THIRST_MUL * dt);
  p.survival = sv;

  const maxHp = typeof getMaxHealth === 'function' ? getMaxHealth(p.inv) : 100;
  const before = p.health ?? 100;
  p.health = Math.min(maxHp, before + BED_SLEEP_HP_PER_SEC * dt);

  return {
    hpGained: p.health - before,
    faim: sv.faim,
    soif: sv.soif,
    health: p.health,
  };
}

/** Pose allongée au lit (offset vertical depuis le pivot décor). */
export const BED_SLEEP_BODY_LIFT = 0.42;
