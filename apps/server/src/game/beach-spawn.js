'use strict';

/** Sync packages/shared/src/beach-spawn.mjs */
const BEACH_SPAWN = { x: 248, y: 1, z: -8, rotY: Math.PI / 2 };

const BEACH_SAFE_LOOT_MSG = 'Zone protégée — pas de vol sur la plage';
const BEACH_BUILD_BLOCKED_MSG = 'Construction interdite sur la plage (zone protégée)';

/**
 * Spawn plage, cluster intro, safe sand, build block.
 */
function createBeachSpawn(deps) {
  const {
    getPlayers,
    getBeachSpawnMod,
    getS01BuildMod,
    getS01SafeMod,
  } = deps;

  function beachOccupiedSpawns(excludeSocketId = null) {
    const pts = [];
    for (const [sid, pl] of getPlayers()) {
      if (excludeSocketId && sid === excludeSocketId) continue;
      if (isOnBeachSafeSand(pl.x, pl.z)) pts.push({ x: pl.x, z: pl.z });
    }
    return pts;
  }

  function randomBeachSpawn(excludeSocketId = null) {
    const mod = getBeachSpawnMod();
    if (mod?.pickBeachSpawnAwayFrom) {
      return mod.pickBeachSpawnAwayFrom(beachOccupiedSpawns(excludeSocketId));
    }
    if (mod?.pickBeachSpawn) return mod.pickBeachSpawn();
    return { ...BEACH_SPAWN };
  }

  function introBeachSpawn(excludeSocketId = null) {
    const occ = beachOccupiedSpawns(excludeSocketId);
    const mod = getBeachSpawnMod();
    if (mod?.pickBeachSpawnForIntro) {
      return mod.pickBeachSpawnForIntro(occ);
    }
    return randomBeachSpawn(excludeSocketId);
  }

  /** Replace spawn lointain si intro incomplète (piste près de BEACH_SPAWN). */
  function snapIntroPlayerToCluster(p) {
    const mod = getBeachSpawnMod();
    if (!mod?.isInIntroSpawnCluster) return false;
    if (mod.isInIntroSpawnCluster(p.x, p.z)) return false;
    const spawn = introBeachSpawn(p.socketId);
    p.x = spawn.x;
    p.y = spawn.y;
    p.z = spawn.z;
    p.rotY = spawn.rotY;
    p.anchorX = p.x;
    p.anchorY = p.y;
    p.anchorZ = p.z;
    p.posSynced = true;
    p.dirty = true;
    return true;
  }

  function isOnBeachSafeSand(x, z) {
    const mod = getBeachSpawnMod();
    if (mod?.isOnBeachSafeSand) return mod.isOnBeachSafeSand(x, z);
    return false;
  }

  function isBuildBlockedOnBeach(x, z, halfW = 1.5, halfD = 1.5) {
    const s01Build = getS01BuildMod();
    if (s01Build?.isS01BuildBlocked) {
      return s01Build.isS01BuildBlocked(x, z, halfW, halfD);
    }
    const mod = getBeachSpawnMod();
    if (mod?.isBuildBlockedOnBeach) {
      return mod.isBuildBlockedOnBeach(x, z, halfW, halfD);
    }
    return isOnBeachSafeSand(x, z);
  }

  function isInS01SafeZone(x, z) {
    const s01Safe = getS01SafeMod();
    if (s01Safe?.isInS01SafeZone) return s01Safe.isInS01SafeZone(x, z);
    return isOnBeachSafeSand(x, z);
  }

  return {
    BEACH_SPAWN,
    BEACH_SAFE_LOOT_MSG,
    BEACH_BUILD_BLOCKED_MSG,
    beachOccupiedSpawns,
    randomBeachSpawn,
    introBeachSpawn,
    snapIntroPlayerToCluster,
    isOnBeachSafeSand,
    isBuildBlockedOnBeach,
    isInS01SafeZone,
  };
}

module.exports = { createBeachSpawn, BEACH_SPAWN, BEACH_SAFE_LOOT_MSG, BEACH_BUILD_BLOCKED_MSG };
