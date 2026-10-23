#!/usr/bin/env node
/**
 * Vérifie les deps `_foo()` et symboles unprefixed critiques dans world-loops / register-sockets.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const LOOPS_KNOWN = new Set([
  '_craftOps', '_removeGroundItem', '_persistPlayer', '_tickGuestCommit',
  '_emitSurvivalUpdate', '_emitInvAuth', '_handlePlayerDeath', '_saveSleepingToDb',
  '_wakeFromBedSleep', '_normalizeInv', '_trimZombiePopulation', '_zombieHasLineOfSight',
  '_dropZombieKillLoot', '_decorStats',
  'ensureZombiePopulation', 'getSurvivalMod', 'getWaterSlowFactor', 'resolveZombieCollision',
  'tickPlayerSurvival', 'tickSleeperSurvival', 'craftQueueMod', 'resourceRegen',
  'scenarioBeach', 'itemEffectsModPromise', 'bedSleepModPromise',
]);

const SOCKET_UNPREFIXED = new Set([
  'catchUpSleeperSurvival', 'resolveConnectHealthFlags', 'connectHealthValue',
  'shouldEmitDeathOnConnect', 'resolveConnectSurvival', 'isStaleWorldSleeper',
  'deleteWorldSleeper', 'getPlayer', 'getPlayerById', 'savePlayerState',
  'isAuthStandalone', 'isDevServer', 'getAuthMode', 'flattenInv', 'pathToFileURL',
]);

const SOCKET_EXTRA = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'apps/server/src/socket/deps-names.json'), 'utf8'),
);
const BINDING_EXTRA = [
  'isAuthStandalone', 'isDevServer', 'isQaServer', 'getAuthMode',
  'getPlayer', 'savePlayerState', 'deleteWorldSleeper', 'getPlayerById',
  'resolveConnectHealthFlags', 'connectHealthValue', 'shouldEmitDeathOnConnect',
  'resolveConnectSurvival', 'isStaleWorldSleeper', 'sleeperPlayersTableSurvival',
  'catchUpSleeperSurvival', 'GUEST_COMMIT_MS', 'SERVER_ROLE', 'BEACH_SPAWN_URL',
  'SCENARIO_BEACH_URL', '_cloneInv', '_ensureSlotGrid', '_findStackByType',
  '_resolveUseItemStack', '_removeFromSlot', '_normalizeInv', '_invDebugSnapshot',
  '_logInvDebug', '_addStackToInv', '_addStackToInvOnce', '_tryAddSlotToInv',
  '_removeStackFromInv', '_consumeInvType', '_moveInvSlot', '_takeInvSlot',
  '_wearInvTool', '_iterInvStacks', '_countInvType', '_playerHasDoorKey',
  '_consumeDoorKey', '_playerOwnsItemType', '_ensureChestGrid', '_chestFilledCount',
  '_lootMoveTransfer', '_moveStorageTransfer', '_getNearbyStorage', '_tickGuestCommit',
  'setWorldTime', '_worldTime', 'itemIdCounter', 'decorSeq', 'decorPrefabs',
  'decorPrefabCatalogCache', 'zombieIdCounter', 'pathToFileURL', 'flattenInv',
  '_flatInv', 'adminRoadStore', 'getWorldTime', 'serverRcon', 'jwt',
];

const SOCKET_KNOWN = new Set([
  ...SOCKET_EXTRA.filter((k) => k !== '_registerInvConsumeHandlers'),
  ...BINDING_EXTRA,
  ...SOCKET_UNPREFIXED,
  'log', 'io', 'rcon',
]);

function extractBody(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/new Function\([^,]+,\s*`([\s\S]*?)`\s*\)/);
  return m ? m[1] : src;
}

/** Identifiants appelés comme fonctions, hors accès méthode (foo.bar). */
function findCallIds(body) {
  const ids = new Set();
  const re = /(?<![.\w$])([_a-zA-Z][\w]*)\s*\(/g;
  for (const m of body.matchAll(re)) ids.add(m[1]);
  return ids;
}

function findUnknown(body, known, { prefixedOnly = false } = {}) {
  const localFns = new Set([...body.matchAll(/function (_?[a-zA-Z][\w]*)/g)].map((m) => m[1]));
  const unknown = [];
  for (const id of findCallIds(body)) {
    if (localFns.has(id) || known.has(id)) continue;
    if (prefixedOnly && !id.startsWith('_') && !SOCKET_UNPREFIXED.has(id)) continue;
    if (!prefixedOnly && !id.startsWith('_') && !LOOPS_KNOWN.has(id)) {
      // unprefixed in loops — only flag if looks like our dep (camelCase, not builtin)
      if (!/^[a-z][a-zA-Z0-9]+$/.test(id)) continue;
      if (['log', 'io', 'items', 'players', 'zombies', 'Math', 'Date', 'JSON', 'Promise'].includes(id)) continue;
    }
    if (id.startsWith('_') || (!prefixedOnly && /^[a-z]/.test(id))) {
      if (!known.has(id) && id.startsWith('_')) unknown.push(id);
      else if (!prefixedOnly && !id.startsWith('_') && !known.has(id)) {
        const loopExtras = ['ensureZombiePopulation', 'getSurvivalMod', 'getWaterSlowFactor',
          'resolveZombieCollision', 'tickPlayerSurvival', 'tickSleeperSurvival', 'craftQueueMod',
          'resourceRegen', 'scenarioBeach', 'itemEffectsModPromise', 'bedSleepModPromise'];
        if (loopExtras.includes(id) && !known.has(id)) unknown.push(id);
      }
    }
  }
  return [...new Set(unknown)].sort();
}

function readSocketBodies() {
  const main = extractBody(path.join(ROOT, 'apps/server/src/socket/register-sockets.js'));
  const handlersDir = path.join(ROOT, 'apps/server/src/socket/handlers');
  let extra = '';
  if (fs.existsSync(handlersDir)) {
    for (const name of fs.readdirSync(handlersDir).sort()) {
      if (name.endsWith('.js')) {
        extra += '\n' + fs.readFileSync(path.join(handlersDir, name), 'utf8');
      }
    }
  }
  return main + extra;
}

const loopsFile = path.join(ROOT, 'apps/server/src/game/world-loops.js');

const loopsUnknown = findUnknown(extractBody(loopsFile), LOOPS_KNOWN);
const socketUnknown = [
  ...findUnknown(readSocketBodies(), SOCKET_KNOWN, { prefixedOnly: true }),
  ...[...findCallIds(readSocketBodies())].filter(
    (id) => SOCKET_UNPREFIXED.has(id) && !SOCKET_KNOWN.has(id),
  ),
].sort();

let failed = false;
if (loopsUnknown.length) {
  failed = true;
  console.error('world-loops — deps `_` / unprefixed manquants:');
  loopsUnknown.forEach((id) => console.error('  -', id));
}
if (socketUnknown.length) {
  failed = true;
  console.error('register-sockets — deps manquants:');
  socketUnknown.forEach((id) => console.error('  -', id));
}

if (!failed) {
  console.log('audit:game-deps OK');
  process.exit(0);
}
console.error('\n→ Corriger build-*-context.js ou deps-names.json');
process.exit(1);
