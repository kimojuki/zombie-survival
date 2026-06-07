'use strict';

/** Score plus élevé = retirer en premier (zombies les plus éloignés). */
function zombieTrimScore(z, players, spawn) {
  if (players.length) {
    let best = Infinity;
    for (const p of players) {
      const d = Math.hypot(p.x - z.x, p.z - z.z);
      if (d < best) best = d;
    }
    return best;
  }
  if (spawn && Number.isFinite(spawn.x) && Number.isFinite(spawn.z)) {
    return Math.hypot(z.x - spawn.x, z.z - spawn.z);
  }
  return 0;
}

/** Retourne les zombies à supprimer pour revenir à `target` (les plus éloignés d'abord). */
function pickZombiesToTrim(zombieList, target, players, spawn) {
  const excess = zombieList.length - target;
  if (excess <= 0) return [];
  return [...zombieList]
    .sort((a, b) => zombieTrimScore(b, players, spawn) - zombieTrimScore(a, players, spawn))
    .slice(0, excess);
}

module.exports = {
  pickZombiesToTrim,
  zombieTrimScore,
};
