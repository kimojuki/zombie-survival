'use strict';
import fs from 'fs';

const base = JSON.parse(fs.readFileSync('apps/server/src/socket/deps-names.json', 'utf8'));
const extra = [
  'isAuthStandalone', 'isDevServer', 'isQaServer', 'getAuthMode',
  'getPlayer', 'savePlayerState', 'deleteWorldSleeper', 'getPlayerById',
  'resolveConnectHealthFlags', 'connectHealthValue', 'shouldEmitDeathOnConnect',
  'resolveConnectSurvival', 'isStaleWorldSleeper', 'sleeperPlayersTableSurvival',
  'GUEST_COMMIT_MS', 'SERVER_ROLE',
  '_cloneInv', '_ensureSlotGrid', '_findStackByType', '_resolveUseItemStack',
  '_removeFromSlot', '_normalizeInv', '_invDebugSnapshot', '_logInvDebug',
  '_addStackToInv', '_addStackToInvOnce', '_tryAddSlotToInv', '_removeStackFromInv',
  '_consumeInvType', '_moveInvSlot', '_takeInvSlot', '_wearInvTool', '_iterInvStacks',
  '_countInvType', '_playerHasDoorKey', '_consumeDoorKey', '_playerOwnsItemType',
  '_ensureChestGrid', '_chestFilledCount', '_lootMoveTransfer', '_moveStorageTransfer',
  '_getNearbyStorage', '_tickGuestCommit', 'setWorldTime', '_worldTime',
  'itemIdCounter', 'decorSeq', 'decorPrefabs', 'decorPrefabCatalogCache',
  'zombieIdCounter', 'ensureStarterRations',
  'pathToFileURL', 'BEACH_SPAWN_URL', 'SCENARIO_BEACH_URL',
  'flattenInv', '_flatInv', 'adminRoadStore',
];

const names = [...new Set([...base.filter((n) => n !== '_registerInvConsumeHandlers'), ...extra])].sort();
const lines = names.map((n) => `    ${n}: () => ${n},`).join('\n');

const snippet = `registerSocketHandlers(createSocketDeps({
${lines}
  }));`;

fs.writeFileSync('apps/server/src/socket/bindings-snippet.js.txt', snippet);
console.log('names', names.length);
console.log('written bindings-snippet.js.txt');
