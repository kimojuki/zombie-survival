/** Règles mode invité — partagées client / serveur / tests */

export const GUEST_USERNAME_PREFIX = 'Invite_';

/** Temps de jeu actif avant persistance invité (ms) */
export const GUEST_COMMIT_PLAYTIME_MS = 8 * 60 * 1000;

/** JWT invité (plus court qu'un compte complet) */
export const GUEST_JWT_EXPIRES = '24h';

/** Compte complet */
export const ACCOUNT_JWT_EXPIRES = '7d';

export function isGuestUsername(username) {
  return typeof username === 'string' && username.startsWith(GUEST_USERNAME_PREFIX);
}

export function guestCommitMinutes() {
  return Math.round(GUEST_COMMIT_PLAYTIME_MS / 60000);
}

export function guestPlaytimeProgressMs(playtimeMs) {
  return Math.min(1, Math.max(0, playtimeMs / GUEST_COMMIT_PLAYTIME_MS));
}
