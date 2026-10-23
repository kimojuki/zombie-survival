'use strict';
import fs from 'fs';

const path = 'apps/server/index.js';
let lines = fs.readFileSync(path, 'utf8').split('\n');

function findLine(pred, from = 0) {
  const i = lines.findIndex((l, idx) => idx >= from && pred(l, idx));
  if (i < 0) throw new Error('line not found');
  return i;
}

if (!lines.some((l) => l.includes('createWorldLoops'))) {
  const wl = findLine((l) => l.includes('createWorldBoot'));
  lines.splice(wl + 1, 0, "const { createWorldLoops } = require('./src/game/world-loops');");
}

// Remove block A: expiry through line before DETECT_RANGE (or loadZombiePrefabs if already patched)
if (lines.some((l) => l.includes('// Expiration objets au sol'))) {
  const aStart = findLine((l) => l.includes('// Expiration objets au sol'));
  let aEnd = lines.findIndex((l) => l.startsWith('async function loadZombiePrefabs'));
  if (aEnd < 0) aEnd = findLine((l) => l.startsWith('const DETECT_RANGE'));
  lines.splice(aStart, aEnd - aStart);
}

// Remove spatial grid helpers if still inline (post–world-loops patch)
const spatialStart = lines.findIndex((l) => l.includes('let _playerSpatialGrid = null'));
if (spatialStart >= 0) {
  const spatialEnd = lines.findIndex((l, i) => i > spatialStart && l.startsWith('async function loadZombiePrefabs'));
  if (spatialEnd > spatialStart) lines.splice(spatialStart, spatialEnd - spatialStart);
}

// Remove block B: setIntervals regen -> craft
const regenIdx = lines.findIndex((l, i) => l.startsWith('setInterval') && lines[i + 2]?.includes('resourceRegen?.tick()'));
const bootIdx = findLine((l) => l.startsWith('// ── Boot séquence'));
if (regenIdx >= 0) {
  let bEnd = bootIdx - 1;
  while (bEnd > regenIdx && lines[bEnd].trim() === '') bEnd--;
  lines.splice(regenIdx, bEnd - regenIdx + 1);
}

// Insert worldLoops before boot sequence (after zombie helpers)
if (!lines.some((l) => l.includes('createWorldLoops({'))) {
  const ps = findLine((l) => l.startsWith('// ── Boot séquence'));
  const block = `// ── Boucles temps réel (zombie, survie, craft…) ─────────────────────────────
const worldLoops = createWorldLoops({
  log,
  io,
  players,
  items,
  zombies,
  sleepingPlayers,
  serverFlags,
  getWorldTime: () => _worldTime,
  setWorldTime: (v) => { _worldTime = v; },
  dayDurationSec: _DAY_DURATION,
  resourceRegen: () => resourceRegen,
  worldPersist,
  craftQueueMod,
  _craftOps,
  _removeGroundItem,
  _persistPlayer,
  _tickGuestCommit,
  _emitSurvivalUpdate,
  _emitInvAuth,
  _handlePlayerDeath,
  _saveSleepingToDb,
  _wakeFromBedSleep,
  _normalizeInv,
  tickPlayerSurvival,
  tickSleeperSurvival,
  itemEffectsModPromise,
  bedSleepModPromise,
  scenarioBeach,
  getWaterSlowFactor,
  resolveZombieCollision,
  ZOMBIE_R,
  WORLD_RADIUS,
  ZOMBIE_COUNT,
  ensureZombiePopulation,
  _trimZombiePopulation: (...args) => _trimZombiePopulation(...args),
  _zombieHasLineOfSight,
  _dropZombieKillLoot,
  getSurvivalMod: () => _survivalMod,
  DEFAULT_SURVIVAL,
  DETECT_RANGE,
  AGGRO_MEMORY,
  AGGRO_LOST_SIGHT_DRAIN,
  ZOMBIE_ATTACK_RANGE,
  ZOMBIE_DMG,
  ZOMBIE_ATTACK_CD,
  WANDER_SPEED,
  WANDER_TURN_MIN,
  WANDER_TURN_MAX,
  SPATIAL_GRID_URL,
  lootBuildings: () => lootBuildings,
  decorStats: _decorStats,
  structures,
  decorItems,
  worldColliders: () => worldColliders,
  worldWaterZones: () => worldWaterZones,
});
const _playerVisibleZombies = worldLoops.playerVisibleZombies;
const _rebuildPlayerSpatialGrid = (...a) => worldLoops.rebuildPlayerSpatialGrid(...a);
const _broadcastPlayerMove = (...a) => worldLoops.broadcastPlayerMove(...a);

`;
  lines.splice(ps, 0, block);
}

fs.writeFileSync(path, lines.join('\n'));
console.log('patched index.js, lines:', lines.length);
