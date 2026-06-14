'use strict';

const SLEEP_LOOT_RADIUS = 3.5;

/**
 * Sleepers (déco), lit, persist corps endormi, loot fouille.
 */
function createPlayerSleep(deps) {
  const {
    io,
    worldPersist,
    savePlayerState,
    defaultSurvival,
    sleeperPlayersTableSurvival,
    getSleepingPlayers,
    getPlayers,
    normPlayerId,
    isInS01SafeZone,
    emitSurvivalUpdate,
    saveSleepingToDb: saveSleepingToDbAfterTake,
  } = deps;

  function sleeperKey(id) {
    return normPlayerId(id);
  }

  function sleepBodyId(playerId) {
    return `sleep:${playerId}`;
  }

  function getSleepingPlayer(id) {
    const key = sleeperKey(id);
    return getSleepingPlayers().get(key) || null;
  }

  function setSleepingPlayer(id, sleep) {
    const key = sleeperKey(id);
    if (sleep) sleep.playerId = key;
    getSleepingPlayers().set(key, sleep);
  }

  function saveBlobFromSleeper(sleep) {
    const base = Array.isArray(sleep.inv) ? { hotbar: sleep.inv } : (sleep.inv || {});
    const survival = sleeperPlayersTableSurvival(sleep, defaultSurvival)
      || sleep._survivalAtDisconnect
      || defaultSurvival;
    return JSON.stringify({ ...base, survival });
  }

  async function saveSleepingToDb(sleep) {
    if (!sleep?.playerId) return;
    sleep.playerId = sleeperKey(sleep.playerId);
    worldPersist?.scheduleUpsertSleeper?.(sleep);
    await savePlayerState(
      sleep.playerId,
      sleep.x,
      sleep.y,
      sleep.z,
      sleep.rotY,
      sleep.health ?? 100,
      sleep.kills ?? 0,
      saveBlobFromSleeper(sleep),
      sleep.username,
    ).catch(() => {});
  }

  function bedSleepPoseFromDecor(item, bodyLift) {
    const lift = bodyLift != null ? bodyLift : 0.42;
    return {
      x: item.x,
      y: (Number(item.y) || 0) + lift,
      z: item.z,
      rotY: item.rotY || 0,
    };
  }

  function wakeFromBedSleep(p, reason) {
    if (!p?.bedSleep) return false;
    p.bedSleep = null;
    p.dirty = true;
    const sock = io.sockets.sockets.get(p.socketId);
    if (sock) {
      sock.emit('bed-sleep-end', { reason: reason || 'wake' });
      emitSurvivalUpdate(sock, p);
    }
    if (p.socketId) {
      io.emit('player-bed-sleep', {
        id: p.socketId,
        sleeping: false,
        x: p.x,
        y: p.y,
        z: p.z,
        rotY: p.rotY,
      });
    }
    return true;
  }

  function sleepLootBlockedOnBeach(target) {
    return target?.kind === 'sleep'
      && (target.x != null && target.z != null)
      && isInS01SafeZone(target.x, target.z);
  }

  /** Joueur endormi (déco) ou mort au sol — inventaire fouillable. */
  function findLootTarget(targetId) {
    const tid = sleeperKey(targetId);
    const sleep = getSleepingPlayer(tid);
    if (sleep) {
      const dead = !!sleep.dead || sleep.health <= 0;
      return {
        kind: dead ? 'death' : 'sleep',
        playerId: tid,
        username: sleep.username,
        inv: dead ? (sleep._deathInv || sleep.inv) : sleep.inv,
        x: sleep.x,
        z: sleep.z,
        afterTake: () => saveSleepingToDb(sleep),
      };
    }
    for (const pl of getPlayers().values()) {
      if (normPlayerId(pl.id) !== tid || !pl._deathHandled || !pl._deathInv) continue;
      const pos = pl._deathPos || pl;
      return {
        kind: 'death',
        playerId: tid,
        username: pl.username,
        inv: pl._deathInv,
        x: pos.x,
        z: pos.z,
        afterTake: () => {},
      };
    }
    return null;
  }

  return {
    SLEEP_LOOT_RADIUS,
    sleepBodyId,
    sleeperKey,
    getSleepingPlayer,
    setSleepingPlayer,
    saveSleepingToDb,
    bedSleepPoseFromDecor,
    wakeFromBedSleep,
    sleepLootBlockedOnBeach,
    findLootTarget,
  };
}

module.exports = { createPlayerSleep, SLEEP_LOOT_RADIUS };
