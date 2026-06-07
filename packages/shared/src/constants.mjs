export const APP_NAME = 'Zombie Survival';

export const SOCKET_EVENTS = Object.freeze({
  CHAT_MESSAGE: 'chat-message',
  PLAYER_ATTACK: 'player-attack',
  PLAYER_JOIN: 'player-join',
  PLAYER_LEAVE: 'player-leave',
  PLAYER_UPDATE: 'player-update',
  PLAYERS_ONLINE: 'players-online',
  ZOMBIE_TICK: 'zombie-tick',
  ZOMBIE_SPAWN: 'zombie-spawn',
  ZOMBIE_HIT: 'zombie-hit',
  ZOMBIE_DIE: 'zombie-die',
  TAKE_DAMAGE: 'take-damage',
  GAME_INIT: 'game-init',
  SCENARIO_ADVANCE: 'scenario-advance',
  SCENARIO_UPDATE: 'scenario-update',
  PLAYER_HIT: 'player-hit',
  GROUP_STATE: 'group-state',
  GROUP_INVITE: 'group-invite',
  GROUP_UPDATE: 'group-update',
  PLAYER_RESPAWN: 'player-respawn',
});

export const ROUTES = Object.freeze({
  HEALTH: '/api/health',
  RCON: '/api/rcon',
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  ME: '/api/auth/me',
});
