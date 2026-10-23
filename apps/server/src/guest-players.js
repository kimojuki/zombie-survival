'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

const GUEST_AUTH_URL = pathToFileURL(
  path.join(__dirname, '../../../packages/shared/src/guest-auth.mjs'),
).href;

/** @type {Promise<typeof import('../../../packages/shared/src/guest-auth.mjs')>} */
const guestAuthMod = import(GUEST_AUTH_URL);

const GUEST_PASSWORD_PLACEHOLDER = '!GUEST_NO_LOGIN!';

function pickGuestSuffix() {
  return Math.floor(1000 + Math.random() * 9000);
}

/**
 * @param {object} deps
 * @param {import('./db')} deps.db
 * @param {object} deps.log
 */
function createGuestPlayersService(deps) {
  const { db, log } = deps;

  async function generateGuestUsername() {
    const { GUEST_USERNAME_PREFIX } = await guestAuthMod;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const username = `${GUEST_USERNAME_PREFIX}${pickGuestSuffix()}`;
      // eslint-disable-next-line no-await-in-loop
      if (!(await db.getPlayer(username))) return username;
    }
    throw new Error('Impossible de générer un pseudo invité');
  }

  async function createGuestAccount(spawnFn, startingSave) {
    const username = await generateGuestUsername();
    const spawn = spawnFn();
    const id = await db.createGuestPlayer(username, startingSave, spawn, GUEST_PASSWORD_PLACEHOLDER);
    log?.info?.('guest', 'created', { username, id });
    return { id, username };
  }

  async function purgeTrialGuest(playerId, username) {
    const row = await db.getPlayerById(playerId);
    if (!row || !row.is_guest || row.guest_committed) return false;
    await db.deleteGuestPlayer(playerId);
    log?.info?.('guest', 'purged trial', { username, id: playerId });
    return true;
  }

  async function commitGuest(playerId, username) {
    await db.setGuestCommitted(playerId);
    log?.info?.('guest', 'committed', { username, id: playerId });
  }

  async function upgradeToAccount(playerId, newUsername, passwordHash) {
    const row = await db.getPlayerById(playerId);
    if (!row?.is_guest) {
      return { ok: false, error: 'Compte déjà enregistré', code: 'not_guest' };
    }
    if (await db.getPlayer(newUsername)) {
      return { ok: false, error: 'Nom déjà utilisé', code: 'username_taken' };
    }
    await db.upgradeGuestPlayer(playerId, newUsername, passwordHash);
    log?.info?.('guest', 'upgraded', { from: row.username, to: newUsername, id: playerId });
    return { ok: true, username: newUsername, id: playerId };
  }

  return {
    GUEST_PASSWORD_PLACEHOLDER,
    generateGuestUsername,
    createGuestAccount,
    purgeTrialGuest,
    commitGuest,
    upgradeToAccount,
    guestAuth: () => guestAuthMod,
  };
}

module.exports = { createGuestPlayersService, GUEST_PASSWORD_PLACEHOLDER };
