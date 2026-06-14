'use strict';
import fs from 'fs';

const path = 'apps/server/index.js';
let lines = fs.readFileSync(path, 'utf8').split('\n');

function findLine(pred, from = 0) {
  const i = lines.findIndex((l, idx) => idx >= from && pred(l, idx));
  if (i < 0) throw new Error(`line not found from ${from}`);
  return i;
}

if (!lines.some((l) => l.includes('createPlayerSession'))) {
  const adminImport = findLine((l) => l.includes("require('./src/routes/admin-routes')"));
  lines.splice(
    adminImport + 1,
    0,
    "const { createPlayerSession } = require('./src/game/player-session');",
    "const { createWorldBoot } = require('./src/game/world-boot');",
  );
}

if (!lines.some((l) => l.includes('let worldBoot'))) {
  const afterRequires = findLine((l) => l.startsWith('const { registerAuthRoutes }'));
  lines.splice(afterRequires, 0, 'let worldBoot;');
}

// Remove GAME_INIT block
if (lines.some((l) => l.includes('const GAME_INIT_TREE_RADIUS'))) {
  const gStart = findLine((l) => l.includes('const GAME_INIT_TREE_RADIUS'));
  const gEnd = findLine((l) => l.startsWith('/** Arbres lointains'));
  lines.splice(gStart, gEnd - gStart);
}

// Remove boot tail
if (lines.some((l) => l.startsWith('// ── Réinitialisation unique'))) {
  const rStart = findLine((l) => l.startsWith('// ── Réinitialisation unique'));
  const sigLine = findLine((l) => l.includes("for (const sig of ['SIGINT', 'SIGTERM']"));
  let rEnd = sigLine;
  while (rEnd < lines.length - 1 && !(lines[rEnd].trim() === '});' && lines[rEnd + 1].trim() === '')) rEnd++;
  lines.splice(rStart, rEnd - rStart + 1);
}

// playerSession before socket register
if (!lines.some((l) => l.includes('createPlayerSession({'))) {
  const socketReg = findLine((l) => l.startsWith('registerSocketHandlers(createSocketDeps({'));
  const block = `// ── Player session (game-init) ───────────────────────────────────────────────
const playerSession = createPlayerSession({
  normPlayerId: _normPlayerId,
  sleepBodyId: _sleepBodyId,
  ensureSlotGrid: _ensureSlotGrid,
  cloneInv: _cloneInv,
  authPayload: _authPayload,
  decorItemsForGameInit,
  getDecorItems: () => decorItems,
  getPlayers: () => players,
  getItems: () => items,
  getZombies: () => zombies,
  getStructures: () => structures,
  getSleepingPlayers: () => sleepingPlayers,
  getWorldTime: () => _worldTime,
  getServerFlags: () => serverFlags,
  isQaServer,
  serverRole: SERVER_ROLE,
  guestCommitMs: GUEST_COMMIT_MS,
  invDebugBuild: INV_DEBUG_SERVER_BUILD,
  getWorldColliders: () => worldColliders,
});
const _gameInitPayload = playerSession.buildGameInitPayload;
const _isBenchUsername = playerSession.isBenchUsername;

`;
  lines.splice(socketReg, 0, block);
}

// Fix admin reload to use worldBoot lazy
const adminReloadIdx = lines.findIndex((l) => l.includes('reloadWorldFromDatabase: _reloadWorldFromDatabase'));
if (adminReloadIdx >= 0) {
  lines[adminReloadIdx] = '  reloadWorldFromDatabase: (scope) => worldBoot.reloadWorldFromDatabase(scope),';
}

// worldBoot at end
if (!lines.some((l) => l.includes('worldBoot = createWorldBoot'))) {
  const block = `
// ── Boot séquence ────────────────────────────────────────────────────────────
worldBoot = createWorldBoot({
  log,
  path,
  fs,
  pool,
  io,
  server,
  ROOT_DIR,
  BEACH_SPAWN,
  STARTING_SAVE,
  GIT_COMMIT,
  SERVER_ROLE,
  PORT,
  HOST,
  DB_CLIENT,
  USE_CLIENT_BUILD,
  INV_DEBUG_SERVER_BUILD,
  RCON_PASSWORD,
  OWNER_USERS,
  RCON_AUTO_ADMIN,
  ZOMBIE_COUNT,
  ensureWorldSchema,
  ensurePlayersGuestSchema,
  ensureAccountIdSchema,
  qaChecklist,
  worldPersist,
  adminRoadStore,
  getDecorItems: () => decorItems,
  getStructures: () => structures,
  getItems: () => items,
  getZombies: () => zombies,
  getSleepingPlayers: () => sleepingPlayers,
  getDecorSeq: () => decorSeq,
  setDecorSeq: (v) => { decorSeq = v; },
  getStructureIdCounter: () => structureIdCounter,
  setStructureIdCounter: (v) => { structureIdCounter = v; },
  getItemIdCounter: () => itemIdCounter,
  setItemIdCounter: (v) => { itemIdCounter = v; },
  getDoorLockSeq: () => doorLockSeq,
  setDoorLockSeq: (v) => { doorLockSeq = v; },
  getZombieIdCounter: () => zombieIdCounter,
  setZombieIdCounter: (v) => { zombieIdCounter = v; },
  getWorldColliders: () => worldColliders,
  setWorldColliders: (v) => { worldColliders = v; },
  getWorldWaterZones: () => worldWaterZones,
  setWorldWaterZones: (v) => { worldWaterZones = v; },
  getLootBuildings: () => lootBuildings,
  setLootBuildings: (v) => { lootBuildings = v; },
  getWorldTime: () => _worldTime,
  setWorldTime: (v) => { _worldTime = v; },
  getStructureColliders: () => structureColliders,
  getServerReady: () => serverReady,
  setServerReady: (v) => { serverReady = v; },
  setBootPhase: _setBoot,
  decorStats: _decorStats,
  getClientVersion,
  createBootReport,
  initPlayerRoles: _initPlayerRoles,
  runWorldCleanSlateOnce: _runWorldCleanSlateOnce,
  seedSpawnDecorItems,
  ensureRoadWrecks,
  ensureRoadBarriers,
  ensureCampRocks,
  ensureWorldRocks,
  ensureWorldTrees,
  ensureBeachPalms,
  ensureBeachSigns,
  ensureBeachProps,
  ensureBeachImmersion,
  ensureBeachIntroProps,
  ensureZombiePopulation,
  purgeFelledTreesFromWorld: _purgeFelledTreesFromWorld,
  purgeStaleIntroPersonalFromWorld: _purgeStaleIntroPersonalFromWorld,
  saveSleepingToDb: _saveSleepingToDb,
  catchUpSleeperSurvival,
  isStaleWorldSleeper,
  getPlayer,
  deleteWorldSleeper,
  getPlayers: () => players,
  persistPlayer: _persistPlayer,
  getPlayerRoles: () => playerRoles,
});
worldBoot.registerShutdownHandlers();
worldBoot.startServer().catch((err) => {
  log.error('boot', 'fatal startup error', { err: err?.message || String(err) });
  process.exit(1);
});
`;
  lines.push(block.trim());
}

fs.writeFileSync(path, lines.join('\n'));
console.log('patched index.js, lines:', lines.length);
