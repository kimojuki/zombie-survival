'use strict';

const SOCKET_EVENTS = Object.freeze({
  chatMessage: 'chat-message',
  playerAttack: 'player-attack',
  playerJoin: 'player-join',
  playerLeave: 'player-leave',
  playerUpdate: 'player-update',
  playersOnline: 'players-online',
});

module.exports = { SOCKET_EVENTS };
