'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const { loadServersConfig, resolveServersForClient } = require('../../../server/src/servers-config');
const {
  assertAccountNotBanned,
  assertDevAccess,
  assertGuestRegisterAllowed,
  validateUsername,
  validatePassword,
  getServerRoleForAuth,
  isDevServer,
} = require('../access-control');
const { resolveGameHandoffUrl, CLIENT_PUBLIC } = require('../resolve-server');

/**
 * @param {object} deps
 * @param {import('../auth-db')} deps.db
 * @param {ReturnType<import('../session-service').createSessionService>} deps.sessions
 * @param {ReturnType<import('../guest-service').createAuthGuestService>} deps.guests
 * @param {object} deps.log
 */
function createAuthRoutes(deps) {
  const { db, sessions, guests, log } = deps;
  const router = express.Router();
  const SERVER_ROLE = getServerRoleForAuth();

  function requestMeta(req) {
    return {
      ip: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
    };
  }

  function authFromHeader(req) {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return null;
    return sessions.verifyPortalToken(token);
  }

  function resolveServerId(body, req) {
    return String(body?.serverId || req.query?.serverId || 'qa').trim();
  }

  async function buildHandoffResponse(account, serverId, req) {
    const devBlock = assertDevAccess(account.username, SERVER_ROLE);
    if (devBlock) return devBlock;

    const gameUrl = resolveGameHandoffUrl(serverId, SERVER_ROLE, `${req.protocol}://${req.get('host')}`);
    if (!gameUrl) {
      return {
        ok: false,
        status: 400,
        body: { error: 'Serveur inconnu', code: 'server_not_found', serverId },
      };
    }

    const handoff = await sessions.createHandoffSession({
      accountId: account.id,
      username: account.username,
      isGuest: !!account.is_guest,
      guestCommitted: !!account.guest_committed,
      serverId,
      ...requestMeta(req),
    });

    return {
      ok: true,
      status: 200,
      body: {
        ok: true,
        username: account.username,
        guest: !!account.is_guest,
        guestCommitted: !!account.guest_committed,
        serverRole: SERVER_ROLE,
        handoff: {
          url: gameUrl,
          code: handoff.exchangeCode,
          expiresIn: handoff.expiresIn,
        },
        portalToken: handoff.portalToken,
      },
    };
  }

  router.get('/server-info', (req, res) => {
    res.json({
      role: SERVER_ROLE,
      devOnly: isDevServer(),
      guestEnabled: !isDevServer(),
      registerEnabled: !isDevServer(),
      authMode: 'standalone',
    });
  });

  router.post('/register', async (req, res) => {
    const blocked = assertGuestRegisterAllowed();
    if (blocked) return res.status(blocked.status).json(blocked.body);

    const username = String(req.body?.username || '').trim();
    const password = req.body?.password;
    const serverId = resolveServerId(req.body, req);

    const userErr = validateUsername(username);
    if (userErr) return res.status(400).json({ error: userErr });
    const passErr = validatePassword(password);
    if (passErr) return res.status(400).json({ error: passErr });

    try {
      if (await db.getAccountByUsername(username)) {
        return res.status(409).json({ error: 'Nom déjà utilisé', code: 'username_taken' });
      }
      const hash = await bcrypt.hash(password, 12);
      const id = await db.createAccount(username, hash, { isGuest: false });
      const account = await db.getAccountById(id);
      const result = await buildHandoffResponse(account, serverId, req);
      if (!result.ok) return res.status(result.status).json(result.body);
      log.info('auth', 'register ok', { username, serverId });
      return res.json(result.body);
    } catch (err) {
      log.error('auth', 'register failed', { username, err: err.message });
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  router.post('/login', async (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = req.body?.password;
    const serverId = resolveServerId(req.body, req);
    if (!username || !password) return res.status(400).json({ error: 'Champs manquants', code: 'missing_fields' });

    try {
      const account = await db.getAccountByUsername(username);
      if (!account || !(await bcrypt.compare(password, account.password_hash))) {
        return res.status(401).json({ error: 'Identifiants invalides', code: 'invalid_credentials' });
      }
      if (account.is_guest) {
        return res.status(403).json({
          error: 'Compte invité — utilisez « Jouer en invité » ou enregistrez votre progression en jeu',
          code: 'guest_account',
        });
      }

      const banned = assertAccountNotBanned(account);
      if (banned) return res.status(banned.status).json(banned.body);

      const result = await buildHandoffResponse(account, serverId, req);
      if (!result.ok) return res.status(result.status).json(result.body);
      log.info('auth', 'login ok', { username, serverId });
      return res.json(result.body);
    } catch (err) {
      log.error('auth', 'login failed', { username, err: err.message });
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  router.post('/guest', async (req, res) => {
    const blocked = assertGuestRegisterAllowed();
    if (blocked) return res.status(blocked.status).json(blocked.body);

    const serverId = resolveServerId(req.body, req);
    try {
      const created = await guests.createGuestAccount();
      const account = await db.getAccountById(created.id);
      const result = await buildHandoffResponse(account, serverId, req);
      if (!result.ok) return res.status(result.status).json(result.body);
      log.info('auth', 'guest start', { username: created.username, serverId });
      return res.json(result.body);
    } catch (err) {
      log.error('auth', 'guest failed', { err: err.message });
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  router.post('/upgrade-guest', async (req, res) => {
    const user = await authFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Non authentifié', code: 'unauthorized' });
    if (!user.guest) {
      return res.status(403).json({ error: 'Réservé aux comptes invité', code: 'not_guest' });
    }

    const nextName = String(req.body?.username || '').trim();
    const password = req.body?.password;
    const userErr = validateUsername(nextName);
    if (userErr) return res.status(400).json({ error: userErr });
    const passErr = validatePassword(password);
    if (passErr) return res.status(400).json({ error: passErr });

    try {
      const hash = await bcrypt.hash(password, 12);
      const result = await guests.upgradeToAccount(user.sub, nextName, hash);
      if (!result.ok) {
        const status = result.code === 'username_taken' ? 409 : 403;
        return res.status(status).json(result);
      }
      const account = await db.getAccountById(user.sub);
      const serverId = resolveServerId(req.body, req);
      const handoffResult = await buildHandoffResponse(account, serverId, req);
      if (!handoffResult.ok) return res.status(handoffResult.status).json(handoffResult.body);
      log.info('auth', 'guest upgraded', { username: result.username });
      return res.json({
        ...handoffResult.body,
        username: result.username,
        guest: false,
        guestCommitted: true,
      });
    } catch (err) {
      log.error('auth', 'upgrade-guest failed', { err: err.message });
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  router.get('/me', async (req, res) => {
    const user = await authFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Non authentifié', code: 'unauthorized' });
    res.json({
      username: user.username,
      accountId: user.sub,
      sid: user.sid,
      serverRole: SERVER_ROLE,
      guest: !!user.guest,
      guestCommitted: !!user.guestCommitted,
      authMode: 'standalone',
    });
  });

  router.post('/logout', async (req, res) => {
    const user = await authFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Non authentifié', code: 'unauthorized' });
    await sessions.revokeBySessionId(user.sid);
    res.json({ ok: true });
  });

  router.post('/exchange', async (req, res) => {
    const internalKey = process.env.AUTH_INTERNAL_KEY || '';
    if (internalKey) {
      const provided = req.get('x-auth-internal') || '';
      if (provided !== internalKey) {
        return res.status(403).json({ error: 'Accès refusé', code: 'unauthorized' });
      }
    }

    const code = String(req.body?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'Code manquant', code: 'missing_fields' });
    const serverId = req.body?.serverId ? String(req.body.serverId) : undefined;

    const result = await sessions.exchangeHandoffCode(code, {
      serverId,
      ip: req.ip,
    });
    if (!result.ok) {
      const status = result.code === 'handoff_expired' || result.code === 'handoff_used' ? 410 : 401;
      return res.status(status).json(result);
    }
    return res.json(result);
  });

  router.get('/internal/session/:sid', async (req, res) => {
    const internalKey = process.env.AUTH_INTERNAL_KEY || '';
    if (internalKey) {
      const provided = req.get('x-auth-internal') || '';
      if (provided !== internalKey) {
        return res.status(403).json({ error: 'Accès refusé', code: 'unauthorized' });
      }
    }

    const row = await db.getSessionById(req.params.sid);
    if (!row) return res.status(404).json({ ok: false, error: 'Session introuvable' });
    res.json({
      ok: true,
      sid: row.id,
      accountId: row.account_id,
      username: row.username,
      serverId: row.server_id,
      revoked: !!row.revoked_at,
      expired: Date.now() > new Date(row.expires_at).getTime(),
      guest: !!row.is_guest,
      guestCommitted: !!row.guest_committed,
    });
  });

  return router;
}

/**
 * @param {object} deps
 * @param {object} deps.log
 */
function createServersRoutes(deps) {
  const router = express.Router();
  const SERVER_ROLE = getServerRoleForAuth();

  router.get('/servers', (req, res) => {
    const config = loadServersConfig(CLIENT_PUBLIC, SERVER_ROLE);
    const origin = `${req.protocol}://${req.get('host')}`;
    const resolved = resolveServersForClient(config, origin);
    res.json(resolved);
  });

  return router;
}

module.exports = { createAuthRoutes, createServersRoutes };
