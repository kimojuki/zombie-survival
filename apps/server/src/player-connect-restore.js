'use strict';

/**
 * Restauration connexion — détecte un corps endormi obsolète en DB (ex. restart SIGINT
 * sans disconnect alors que players.last_saved a été mis à jour après le sleeper).
 */

function parseDbTimestamp(v) {
  if (v == null) return NaN;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (!s) return NaN;
  if (/^\d+$/.test(s)) return Number(s);
  const iso = s.includes('T') ? s : `${s.replace(' ', 'T')}Z`;
  return Date.parse(iso);
}

/**
 * @param {object|null} sleep corps endormi (world_sleepers)
 * @param {object|null} savedRow ligne players (last_saved)
 */
function isStaleWorldSleeper(sleep, savedRow) {
  if (!sleep?.since || !savedRow?.last_saved) return false;
  const sleeperAt = parseDbTimestamp(sleep._worldUpdatedAt ?? sleep.since);
  const playerAt = parseDbTimestamp(savedRow.last_saved);
  if (!Number.isFinite(sleeperAt) || !Number.isFinite(playerAt)) return false;
  return playerAt > sleeperAt + 1000;
}

/**
 * Survie écrite dans players.inventory depuis un corps endormi :
 * snapshot à la déco uniquement (pas la faim/soif tickée offline).
 */
function sleeperPlayersTableSurvival(sleep, defaultSurvival) {
  const snap = sleep?._survivalAtDisconnect;
  if (snap && typeof snap === 'object') {
    return { ...defaultSurvival, ...snap };
  }
  return null;
}

/**
 * Survie appliquée au joueur à la connexion.
 * @param {object} opts
 * @param {boolean} opts.forceBeachRespawn
 * @param {object|null} opts.restore session live ou corps endormi
 * @param {object|null} opts.dbSurvival survie parsée depuis players.inventory
 * @param {boolean} opts.wokeFromSleep réveil depuis corps endormi
 * @param {object} opts.defaultSurvival
 */
function resolveConnectSurvival({
  forceBeachRespawn,
  restore,
  dbSurvival,
  wokeFromSleep,
  defaultSurvival,
}) {
  const def = { ...defaultSurvival };
  if (forceBeachRespawn) return { ...def };

  if (restore && !wokeFromSleep) {
    return { ...def, ...(restore.survival || {}) };
  }

  if (wokeFromSleep && restore) {
    const atDisc = restore._survivalAtDisconnect;
    if (atDisc && typeof atDisc === 'object') {
      return { ...def, ...atDisc };
    }
    if (dbSurvival && typeof dbSurvival === 'object') {
      return { ...def, ...dbSurvival };
    }
    return { ...def, ...(restore.survival || {}) };
  }

  if (dbSurvival && typeof dbSurvival === 'object') {
    return { ...def, ...dbSurvival };
  }
  if (restore?.survival) return { ...def, ...restore.survival };
  return { ...def };
}

module.exports = {
  parseDbTimestamp,
  isStaleWorldSleeper,
  sleeperPlayersTableSurvival,
  resolveConnectSurvival,
};
