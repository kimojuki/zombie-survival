'use strict';

const { INVENTORY_HANDLERS } = require('./handlers/inventory-handlers');
const { SOCKET_AUTH } = require('./handlers/socket-auth');
const { CONNECTION_BOOTSTRAP } = require('./handlers/connection-bootstrap');
const { WORLD_SYNC_HANDLERS } = require('./handlers/world-sync-handlers');
const { PLAYER_SYNC_HANDLERS } = require('./handlers/player-sync-handlers');
const { COMBAT_HANDLERS } = require('./handlers/combat-handlers');
const { DECOR_HANDLERS } = require('./handlers/decor-handlers');
const { INVENTORY_CRAFT_HANDLERS } = require('./handlers/inventory-craft-handlers');
const { SLEEP_LOOT_HANDLERS } = require('./handlers/sleep-loot-handlers');
const { SOCIAL_HANDLERS } = require('./handlers/social-handlers');
const { DISCONNECT_HANDLERS } = require('./handlers/disconnect-handlers');

/**
 * Handlers Socket.io — orchestration (corps dans handlers/*).
 */
function registerSocketHandlers(deps) {
  const fn = new Function('deps', `
    with (deps) {

${INVENTORY_HANDLERS}

${SOCKET_AUTH}

${CONNECTION_BOOTSTRAP}

${WORLD_SYNC_HANDLERS}

${PLAYER_SYNC_HANDLERS}

${COMBAT_HANDLERS}

${DECOR_HANDLERS}

${INVENTORY_CRAFT_HANDLERS}

${SLEEP_LOOT_HANDLERS}

${SOCIAL_HANDLERS}

${DISCONNECT_HANDLERS}
    }
  `);
  fn(deps);
}

module.exports = { registerSocketHandlers };
