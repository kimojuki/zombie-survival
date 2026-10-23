'use strict';

/**
 * Résolution PV à la connexion.
 * - Zombies : n'attaquent que les joueurs connectés (pas les corps endormis).
 * - Déco : faim/soif baissent sur le corps endormi ; PV gelés (PvP seulement).
 * - Bug corrigé : health=0 en DB sans session de mort → respawn plage, pas spawn à 0 PV.
 */
function resolveConnectHealthFlags({
  killedWhileOffline,
  hasLiveRestore,
  savedHealth,
}) {
  if (killedWhileOffline) {
    return { forceBeachRespawn: true, respawnReason: 'offline_kill' };
  }
  const dbHp = Number(savedHealth);
  const staleDbDeath = !hasLiveRestore && Number.isFinite(dbHp) && dbHp <= 0;
  if (staleDbDeath) {
    return { forceBeachRespawn: true, respawnReason: 'stale_death' };
  }
  return { forceBeachRespawn: false, respawnReason: null };
}

function connectHealthValue({ forceBeachRespawn, restore, saved, wokeFromSleep }) {
  if (forceBeachRespawn) return 100;
  if (wokeFromSleep && restore?.health != null) {
    return Math.max(0, Math.floor(restore.health));
  }
  const h = restore?.health ?? saved?.health ?? 100;
  return Math.max(0, Math.floor(h));
}

function shouldEmitDeathOnConnect(player) {
  return !!(player?._deathHandled && (player.health ?? 100) <= 0);
}

module.exports = {
  resolveConnectHealthFlags,
  connectHealthValue,
  shouldEmitDeathOnConnect,
};
