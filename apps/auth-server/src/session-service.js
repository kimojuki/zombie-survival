'use strict';

const jwt = require('jsonwebtoken');
const { pathToFileURL } = require('url');
const path = require('path');

const AUTH_CONTRACT_URL = pathToFileURL(
  path.join(__dirname, '../../../packages/shared/src/auth-contract.mjs'),
).href;
const GUEST_AUTH_URL = pathToFileURL(
  path.join(__dirname, '../../../packages/shared/src/guest-auth.mjs'),
).href;

const contractMod = import(AUTH_CONTRACT_URL);
const guestAuthMod = import(GUEST_AUTH_URL);

const {
  hashExchangeCode,
  generateExchangeCode,
  generateSessionId,
  exchangeExpiresAt,
  isExchangeExpired,
  isExchangeUsed,
  isSessionRevoked,
  isSessionExpired,
} = require('./handoff');

/**
 * @param {object} deps
 * @param {import('./auth-db')} deps.db
 * @param {string} deps.jwtSecret
 * @param {object} [deps.log]
 */
function createSessionService(deps) {
  const { db, jwtSecret, log } = deps;

  async function sessionExpiresIn(isGuest) {
    const guestAuth = await guestAuthMod;
    return isGuest ? guestAuth.GUEST_JWT_EXPIRES : guestAuth.ACCOUNT_JWT_EXPIRES;
  }

  function sessionExpiresAtMs(isGuest) {
    const ms = isGuest ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + ms).toISOString();
  }

  /**
   * Crée une session avec ticket handoff pour un shard jeu.
   * @param {object} opts
   * @param {number} opts.accountId
   * @param {string} opts.username
   * @param {boolean} opts.isGuest
   * @param {boolean} opts.guestCommitted
   * @param {string} opts.serverId
   * @param {string} [opts.ip]
   * @param {string} [opts.userAgent]
   */
  async function createHandoffSession(opts) {
    const { JWT_AUD } = await contractMod;
    const sessionId = generateSessionId();
    const exchangeCode = generateExchangeCode();
    const codeHash = hashExchangeCode(exchangeCode);
    const expiresAt = sessionExpiresAtMs(opts.isGuest);

    await db.insertSession({
      id: sessionId,
      accountId: opts.accountId,
      serverId: opts.serverId,
      exchangeCodeHash: codeHash,
      exchangeExpires: exchangeExpiresAt(),
      expiresAt,
      ip: opts.ip,
      userAgent: opts.userAgent,
    });

    log?.info?.('auth', 'session created', {
      sid: sessionId,
      accountId: opts.accountId,
      username: opts.username,
      serverId: opts.serverId,
      guest: opts.isGuest,
    });

    return {
      sessionId,
      exchangeCode,
      expiresIn: (await contractMod).HANDOFF_TTL_SECONDS,
      portalToken: signPortalToken({
        sub: opts.accountId,
        username: opts.username,
        sid: sessionId,
        guest: opts.isGuest,
        guestCommitted: opts.guestCommitted,
        aud: JWT_AUD.portal,
      }),
    };
  }

  function signPortalToken(payload) {
    return jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
  }

  function signGameToken(payload, expiresIn) {
    return jwt.sign(payload, jwtSecret, { expiresIn });
  }

  async function exchangeHandoffCode(code, { serverId, ip } = {}) {
    const { JWT_AUD, AUTH_ERROR_CODES } = await contractMod;
    const hash = hashExchangeCode(code);
    const row = await db.getSessionByExchangeHash(hash);
    if (!row) {
      return { ok: false, code: AUTH_ERROR_CODES.handoffInvalid, error: 'Code handoff invalide' };
    }
    if (isExchangeUsed(row)) {
      return { ok: false, code: AUTH_ERROR_CODES.handoffUsed, error: 'Code handoff déjà utilisé' };
    }
    if (isExchangeExpired(row)) {
      return { ok: false, code: AUTH_ERROR_CODES.handoffExpired, error: 'Code handoff expiré' };
    }
    if (isSessionRevoked(row) || isSessionExpired(row)) {
      return { ok: false, code: AUTH_ERROR_CODES.sessionRevoked, error: 'Session révoquée ou expirée' };
    }
    if (serverId && row.server_id && row.server_id !== serverId) {
      return { ok: false, code: AUTH_ERROR_CODES.handoffInvalid, error: 'Serveur jeu incorrect' };
    }
    if (row.banned) {
      return { ok: false, code: AUTH_ERROR_CODES.banned, error: 'Compte suspendu' };
    }

    await db.markExchangeUsed(row.id);
    await db.touchSession(row.id);

    const guestAuth = await guestAuthMod;
    const expiresIn = row.is_guest ? guestAuth.GUEST_JWT_EXPIRES : guestAuth.ACCOUNT_JWT_EXPIRES;
    const token = signGameToken({
      sub: row.account_id,
      id: row.account_id,
      username: row.username,
      sid: row.id,
      aud: JWT_AUD.game,
      serverId: row.server_id || serverId || null,
      guest: !!row.is_guest,
      guestCommitted: !!row.guest_committed,
    }, expiresIn);

    log?.info?.('auth', 'handoff exchanged', {
      sid: row.id,
      username: row.username,
      serverId: row.server_id,
      ip,
    });

    return {
      ok: true,
      token,
      username: row.username,
      accountId: row.account_id,
      sid: row.id,
      serverId: row.server_id,
      guest: !!row.is_guest,
      guestCommitted: !!row.guest_committed,
    };
  }

  async function verifyPortalToken(token) {
    const { JWT_AUD } = await contractMod;
    try {
      const claims = jwt.verify(token, jwtSecret);
      if (claims.aud !== JWT_AUD.portal) return null;
      const row = await db.getSessionById(claims.sid);
      if (!row || isSessionRevoked(row) || isSessionExpired(row)) return null;
      await db.touchSession(claims.sid);
      return { ...claims, account: row };
    } catch {
      return null;
    }
  }

  async function verifyGameToken(token) {
    const { JWT_AUD, hasRequiredGameClaims } = await contractMod;
    try {
      const claims = jwt.verify(token, jwtSecret);
      if (!hasRequiredGameClaims(claims) || claims.aud !== JWT_AUD.game) return null;
      const row = await db.getSessionById(claims.sid);
      if (!row || isSessionRevoked(row) || isSessionExpired(row)) return null;
      return { ...claims, account: row };
    } catch {
      return null;
    }
  }

  async function revokeBySessionId(sessionId) {
    await db.revokeSession(sessionId);
    log?.info?.('auth', 'session revoked', { sid: sessionId });
  }

  return {
    createHandoffSession,
    exchangeHandoffCode,
    verifyPortalToken,
    verifyGameToken,
    signPortalToken,
    signGameToken,
    revokeBySessionId,
    sessionExpiresIn,
  };
}

module.exports = { createSessionService };
