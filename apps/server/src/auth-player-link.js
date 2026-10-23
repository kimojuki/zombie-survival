'use strict';

const jwt = require('jsonwebtoken');
const JWT_AUD_GAME = 'game';

/**
 * Lie un compte auth (JWT game) à une ligne `players` sur le shard jeu.
 * @param {object} deps
 * @param {import('./db')} deps.db
 * @param {object} deps.log
 * @param {Function} deps.introSpawn
 * @param {string} deps.startingSave
 * @param {string} deps.guestPasswordPlaceholder
 */
function createAuthPlayerLink(deps) {
  const { db, log, introSpawn, startingSave, guestPasswordPlaceholder } = deps;

  async function ensureGamePlayerFromTokenClaims(claims) {
    const accountId = Number(claims.sub ?? claims.id);
    const username = claims.username;
    if (!accountId || !username) {
      throw new Error('JWT auth incomplet (sub/username)');
    }

    let row = await db.getPlayerByAccountId(accountId);
    if (!row) row = await db.getPlayer(username);

    const isGuest = !!claims.guest;
    const guestCommitted = !!claims.guestCommitted;

    if (!row) {
      const spawn = introSpawn();
      await db.createLinkedPlayer({
        accountId,
        username,
        passwordHash: guestPasswordPlaceholder,
        inventory: startingSave,
        spawn,
        isGuest,
        guestCommitted,
      });
      log?.info?.('auth', 'game player created from auth', { accountId, username, guest: isGuest });
      row = await db.getPlayerByAccountId(accountId);
    } else if (!row.account_id) {
      await db.setPlayerAccountId(row.id, accountId);
      row = await db.getPlayerById(row.id);
    }

    return row;
  }

  function verifyGameJwt(token, jwtSecret) {
    const claims = jwt.verify(token, jwtSecret);
    if (claims.aud && claims.aud !== JWT_AUD_GAME) {
      const err = new Error('Audience JWT invalide');
      err.code = 'invalid_audience';
      throw err;
    }
    return claims;
  }

  return { ensureGamePlayerFromTokenClaims, verifyGameJwt };
}

module.exports = { createAuthPlayerLink };
