export const APP_NAME = 'Zombie Survival';

export const SOCKET_EVENTS = Object.freeze({
  CHAT_MESSAGE: 'chat-message',
  PLAYER_ATTACK: 'player-attack',
  PLAYER_JOIN: 'player-join',
  PLAYER_LEAVE: 'player-leave',
  PLAYER_UPDATE: 'player-update',
  PLAYERS_ONLINE: 'players-online',
});

export const ROUTES = Object.freeze({
  HEALTH: '/api/health',
  RCON: '/api/rcon',
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  ME: '/api/auth/me',
});
