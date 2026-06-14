/** Contrat auth partagé — routes, JWT, erreurs (auth-server ↔ game-server ↔ client) */

export const AUTH_ROUTES = Object.freeze({
  login: '/api/auth/login',
  register: '/api/auth/register',
  guest: '/api/auth/guest',
  upgradeGuest: '/api/auth/upgrade-guest',
  logout: '/api/auth/logout',
  me: '/api/auth/me',
  exchange: '/api/auth/exchange',
  handoff: '/api/auth/handoff',
  serverInfo: '/api/server-info',
  servers: '/api/servers',
  health: '/api/health',
  internalSession: '/api/internal/session',
});

/** Audience JWT — sépare portail auth vs shard jeu */
export const JWT_AUD = Object.freeze({
  portal: 'portal',
  game: 'game',
});

/** Durée handoff ticket (secondes) */
export const HANDOFF_TTL_SECONDS = 60;

/** Claims JWT attendus côté game */
export const JWT_CLAIMS = Object.freeze({
  sub: 'sub',
  username: 'username',
  sid: 'sid',
  aud: 'aud',
  serverId: 'serverId',
  guest: 'guest',
  guestCommitted: 'guestCommitted',
});

export const AUTH_ERROR_CODES = Object.freeze({
  devAdminOnly: 'dev_admin_only',
  sessionRevoked: 'session_revoked',
  handoffExpired: 'handoff_expired',
  handoffUsed: 'handoff_used',
  handoffInvalid: 'handoff_invalid',
  guestAccount: 'guest_account',
  notGuest: 'not_guest',
  usernameTaken: 'username_taken',
  banned: 'banned',
  invalidCredentials: 'invalid_credentials',
  missingFields: 'missing_fields',
  serverNotFound: 'server_not_found',
  unauthorized: 'unauthorized',
});

export const AUTH_MODES = Object.freeze({
  embedded: 'embedded',
  standalone: 'standalone',
});

/** @param {unknown} aud */
export function isGameAudience(aud) {
  return aud === JWT_AUD.game;
}

/** @param {unknown} aud */
export function isPortalAudience(aud) {
  return aud === JWT_AUD.portal;
}

/** @param {Record<string, unknown> | null | undefined} claims */
export function hasRequiredGameClaims(claims) {
  if (!claims || typeof claims !== 'object') return false;
  return (
    typeof claims.sub === 'number' ||
    (typeof claims.sub === 'string' && claims.sub !== '')
  ) && typeof claims.username === 'string'
    && typeof claims.sid === 'string'
    && isGameAudience(claims.aud);
}
