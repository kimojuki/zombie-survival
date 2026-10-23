'use strict';

const { createSocketDeps } = require('./create-socket-deps');
const BASE_KEYS = require('./deps-names.json');

const EXTRA_KEYS = [
  'isAuthStandalone', 'isDevServer', 'isQaServer', 'getAuthMode',
  'getPlayer', 'savePlayerState', 'deleteWorldSleeper', 'getPlayerById',
  'resolveConnectHealthFlags', 'connectHealthValue', 'shouldEmitDeathOnConnect',
  'resolveConnectSurvival', 'isStaleWorldSleeper', 'sleeperPlayersTableSurvival',
  'catchUpSleeperSurvival',
  'GUEST_COMMIT_MS', 'SERVER_ROLE', 'BEACH_SPAWN_URL', 'SCENARIO_BEACH_URL',
  '_cloneInv', '_ensureSlotGrid', '_findStackByType', '_resolveUseItemStack',
  '_removeFromSlot', '_normalizeInv', '_invDebugSnapshot', '_logInvDebug',
  '_addStackToInv', '_addStackToInvOnce', '_tryAddSlotToInv', '_removeStackFromInv',
  '_consumeInvType', '_moveInvSlot', '_takeInvSlot', '_wearInvTool', '_iterInvStacks',
  '_countInvType', '_playerHasDoorKey', '_consumeDoorKey', '_playerOwnsItemType',
  '_ensureChestGrid', '_chestFilledCount', '_lootMoveTransfer', '_moveStorageTransfer',
  '_getNearbyStorage', '_tickGuestCommit', 'setWorldTime', '_worldTime',
  'itemIdCounter', 'decorSeq', 'decorPrefabs', 'decorPrefabCatalogCache',
  'zombieIdCounter', 'pathToFileURL', 'flattenInv', '_flatInv', 'adminRoadStore',
];

const BINDING_KEYS = [...new Set([
  ...BASE_KEYS.filter((k) => k !== '_registerInvConsumeHandlers'),
  ...EXTRA_KEYS,
])].sort();

/**
 * Contexte Socket.io — getters lazy depuis un snapshot fourni par index.
 */
function createGameSocketBindings(getContext) {
  const bindings = {};
  for (const key of BINDING_KEYS) {
    bindings[key] = () => getContext()[key];
  }
  return createSocketDeps(bindings);
}

module.exports = { createGameSocketBindings, BINDING_KEYS };
