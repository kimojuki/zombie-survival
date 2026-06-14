'use strict';

const { pathToFileURL } = require('url');
const path = require('path');

const GUEST_AUTH_URL = pathToFileURL(
  path.join(__dirname, '../../../packages/shared/src/guest-auth.mjs'),
).href;

const GUEST_PASSWORD_PLACEHOLDER = '!GUEST_NO_LOGIN!';

function pickGuestSuffix() {
  return Math.floor(1000 + Math.random() * 9000);
}

/**
 * @param {object} deps
 * @param {import('./auth-db')} deps.db
 * @param {object} [deps.log]
 */
function createAuthGuestService(deps) {
  const { db, log } = deps;

  async function generateGuestUsername() {
    const { GUEST_USERNAME_PREFIX } = await import(GUEST_AUTH_URL);
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const username = `${GUEST_USERNAME_PREFIX}${pickGuestSuffix()}`;
      // eslint-disable-next-line no-await-in-loop
      if (!(await db.getAccountByUsername(username))) return username;
    }
    throw new Error('Impossible de générer un pseudo invité');
  }

  async function createGuestAccount() {
    const username = await generateGuestUsername();
    const id = await db.createAccount(username, GUEST_PASSWORD_PLACEHOLDER, { isGuest: true });
    log?.info?.('guest', 'created', { username, id });
    return { id, username };
  }

  async function upgradeToAccount(accountId, newUsername, passwordHash) {
    const row = await db.getAccountById(accountId);
    if (!row?.is_guest) {
      return { ok: false, error: 'Compte déjà enregistré', code: 'not_guest' };
    }
    if (await db.getAccountByUsername(newUsername)) {
      return { ok: false, error: 'Nom déjà utilisé', code: 'username_taken' };
    }
    await db.upgradeGuestAccount(accountId, newUsername, passwordHash);
    log?.info?.('guest', 'upgraded', { from: row.username, to: newUsername, id: accountId });
    return { ok: true, username: newUsername, id: accountId };
  }

  return {
    GUEST_PASSWORD_PLACEHOLDER,
    createGuestAccount,
    upgradeToAccount,
  };
}

module.exports = { createAuthGuestService, GUEST_PASSWORD_PLACEHOLDER };
