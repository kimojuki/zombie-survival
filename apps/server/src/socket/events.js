'use strict';

const SOCKET_EVENTS = Object.freeze({
  chatMessage: 'chat-message',
  playerAttack: 'player-attack',
  playerFootstep: 'player-footstep',
  playerJoin: 'player-join',
  playerLeave: 'player-leave',
  playerUpdate: 'player-update',
  playersOnline: 'players-online',
  zombieTick: 'zombie-tick',
  zombieSpawn: 'zombie-spawn',
  zombieHit: 'zombie-hit',
  zombieDie: 'zombie-die',
  takeDamage: 'take-damage',
  gameInit: 'game-init',
});

module.exports = { SOCKET_EVENTS };
