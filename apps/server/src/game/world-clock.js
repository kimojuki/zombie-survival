'use strict';

const DAY_DURATION = 1800; // secondes par cycle complet (15 min jour + 15 min nuit)
const TICK_DT = 0.1; // durée du tick zombie en secondes

/**
 * Temps mondial, flags serveur, boot status, eau (slow factor).
 */
function createWorldClock(deps) {
  const {
    io,
    worldPersist,
    getPlayers,
    getWorldWaterZones,
  } = deps;

  let worldTime = 0.3; // 0–1 (0=minuit, 0.25=lever, 0.5=midi, 0.75=coucher)
  let serverReady = false;
  const bootStatus = { phase: 'starting', progress: 0 };
  const serverFlags = {
    autoDay: true,
    zombieAI: true,
    zombieSpawn: true,
    lootEnabled: true,
    pvp: true,
  };

  function getWorldTime() {
    return worldTime;
  }

  function setWorldTimeRaw(v) {
    worldTime = v;
  }

  function setWorldTime(t) {
    worldTime = ((t % 1) + 1) % 1;
    worldPersist?.scheduleWorldState?.({ worldTime });
  }

  function setBoot(phase, progress) {
    bootStatus.phase = phase;
    bootStatus.progress = Math.max(0, Math.min(13, Math.round(progress)));
  }

  function emitPlayersOnline() {
    io.emit('players-online', { count: getPlayers().size });
  }

  function getWaterSlowFactor(x, z) {
    for (const wz of getWorldWaterZones()) {
      if (Math.hypot(x - wz.x, z - wz.z) < wz.r) return 0.55;
    }
    return 1;
  }

  return {
    DAY_DURATION,
    TICK_DT,
    serverFlags,
    getWorldTime,
    setWorldTime,
    setWorldTimeRaw,
    getServerReady: () => serverReady,
    setServerReady: (v) => { serverReady = v; },
    getBootStatus: () => bootStatus,
    setBoot,
    emitPlayersOnline,
    getWaterSlowFactor,
  };
}

module.exports = { createWorldClock, DAY_DURATION, TICK_DT };
