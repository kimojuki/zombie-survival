'use strict';

/** Perte faim (pts/s, tick serveur 1 s). Depuis 80 → 0 en ~33 min. */
export const HUNGER_DECAY_PER_SEC = 0.04;

/** Perte soif (pts/s). Depuis 80 → 0 en ~22 min — un peu plus vite que la faim. */
export const THIRST_DECAY_PER_SEC = 0.06;

/** Part des attaques mêlée zombie comptées comme morsure (griffes = saignement seulement). */
export const ZOMBIE_BITE_ATTACK_CHANCE = 0.32;

/** Probabilité qu'une morsure transmette le virus. */
export const ZOMBIE_BITE_INFECT_CHANCE = 0.68;

export const ZOMBIE_BITE_INFECT_MIN = 10;
export const ZOMBIE_BITE_INFECT_MAX = 22;

/**
 * Applique saignement (coups lourds) et infection uniquement sur morsure.
 * @param {object} sv survival du joueur (muté)
 * @param {number} dmg dégâts du coup
 * @param {() => number} [rnd] RNG injectable (tests)
 * @returns {{ bit: boolean, infected: boolean, added?: number }}
 */
export function applyZombieMeleeSurvival(sv, dmg, rnd = Math.random) {
  if (!sv.saignement && dmg >= 10 && rnd() < 0.25) {
    sv.saignement = true;
  }
  if (rnd() >= ZOMBIE_BITE_ATTACK_CHANCE) {
    return { bit: false, infected: false };
  }
  if (rnd() >= ZOMBIE_BITE_INFECT_CHANCE) {
    return { bit: true, infected: false };
  }
  const added = ZOMBIE_BITE_INFECT_MIN
    + rnd() * (ZOMBIE_BITE_INFECT_MAX - ZOMBIE_BITE_INFECT_MIN);
  sv.infection = Math.min(100, (sv.infection || 0) + added);
  return { bit: true, infected: true, added };
}
