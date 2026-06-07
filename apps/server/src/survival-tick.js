'use strict';

// Sync packages/shared/src/survival.mjs (HUNGER_DECAY_PER_SEC / THIRST_DECAY_PER_SEC)
const HUNGER_DECAY = 0.04;
const THIRST_DECAY = 0.06;
const BLEED_DMG = 2.0;
const STARVE_DMG = 0.8;
const DEHYDRATE_DMG = 1.2;
const INFECT_PROGRESS = 0.7;

function clampStat(v) {
  return Math.max(0, Math.min(100, v));
}

/**
 * Tick survival for one player. Mutates p.survival and p.health.
 * @returns {{ dmg: number, died: boolean }}
 */
function tickPlayerSurvival(p, dt, getMaxHealth) {
  const sv = p.survival || { faim: 80, soif: 80, infection: 0, saignement: false };
  if (p.health <= 0) return { dmg: 0, died: false };

  sv.faim = clampStat((sv.faim ?? 80) - HUNGER_DECAY * dt);
  sv.soif = clampStat((sv.soif ?? 80) - THIRST_DECAY * dt);

  const now = Date.now();
  if (sv.infectionPausedUntil && now >= sv.infectionPausedUntil) {
    delete sv.infectionPausedUntil;
  }
  const infectionPaused = sv.infectionPausedUntil && now < sv.infectionPausedUntil;
  if (sv.infection > 0 && !infectionPaused) {
    sv.infection = clampStat(sv.infection + INFECT_PROGRESS * dt);
  }

  let dmg = 0;
  if (sv.saignement) dmg += BLEED_DMG * dt;
  if (sv.faim <= 0) dmg += STARVE_DMG * dt;
  if (sv.soif <= 0) dmg += DEHYDRATE_DMG * dt;

  if (sv.infection >= 100) {
    p.health = 0;
    p.survival = sv;
    return { dmg: 0, died: true, reason: 'infection' };
  }

  if (dmg > 0) {
    p.health = Math.max(0, (p.health ?? 100) - dmg);
  }

  p.survival = sv;
  const maxHp = getMaxHealth(p.inv);
  if (p.health > maxHp) p.health = maxHp;

  if (p.health <= 0) {
    return { dmg, died: true, reason: 'survival' };
  }
  return { dmg, died: false };
}

module.exports = {
  HUNGER_DECAY,
  THIRST_DECAY,
  tickPlayerSurvival,
};
