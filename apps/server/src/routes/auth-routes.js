'use strict';

const { getAuthMode, isAuthStandalone } = require('../auth-mode');
const { registerEmbeddedAuthRoutes } = require('./auth-embedded');

/**
 * Routes /api/auth/* sur le process game.
 * - standalone : proxy → auth-server + handoff local + /me
 * - embedded (legacy) : handlers locaux dans auth-embedded.js
 */
function registerAuthRoutes(app, deps) {
  const {
    jwt,
    JWT_SECRET,
    log,
    authProxy,
    getAuthPlayerLink,
    authFromHeader,
    authPayload,
    isQaServer,
    SERVER_ROLE,
    GUEST_COMMIT_MS,
    exchangeHandoffWithAuth,
  } = deps;

  app.post('/api/auth/handoff', async (req, res) => {
    if (!isAuthStandalone()) {
      return res.status(404).json({ error: 'Handoff indisponible', code: 'embedded_auth' });
    }
    const code = String(req.body?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'Code manquant', code: 'missing_fields' });
    const link = getAuthPlayerLink();
    if (!link) return res.status(503).json({ error: 'Serveur en démarrage' });
    try {
      const ex = await exchangeHandoffWithAuth(code, { serverId: req.body?.serverId });
      if (!ex.ok) return res.status(ex.status || 401).json(ex.data);
      const claims = link.verifyGameJwt(ex.data.token, JWT_SECRET);
      const row = await link.ensureGamePlayerFromTokenClaims(claims);
      const auth = authPayload(claims.username);
      const token = jwt.sign({
        sub: row.account_id || claims.sub,
        id: row.id,
        username: row.username,
        sid: claims.sid,
        aud: 'game',
        guest: !!claims.guest,
        guestCommitted: !!claims.guestCommitted,
      }, JWT_SECRET, { expiresIn: claims.guest ? '24h' : '7d' });
      log.info('auth', 'handoff ok', { username: row.username, accountId: row.account_id, guest: !!claims.guest });
      res.json({
        token,
        username: row.username,
        guest: !!claims.guest,
        guestCommitted: !!claims.guestCommitted,
        guestCommitMinutes: Math.round(GUEST_COMMIT_MS / 60000),
        ...auth,
        serverRole: SERVER_ROLE,
        qaEnabled: isQaServer(),
        spawn: { x: row.pos_x ?? 0, y: row.pos_y ?? 0, z: row.pos_z ?? 0, rotY: row.rot_y ?? 0 },
        health: row.health ?? 100,
        kills: row.kills ?? 0,
      });
    } catch (err) {
      log.error('auth', 'handoff failed', { err: err.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const user = authFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Non authentifié' });
    res.json({
      username: user.username,
      ...authPayload(user.username),
      serverRole: SERVER_ROLE,
      qaEnabled: isQaServer(),
      guest: !!user.guest,
      guestCommitted: !!user.guestCommitted,
      guestCommitMinutes: Math.round(GUEST_COMMIT_MS / 60000),
      authMode: getAuthMode(),
    });
  });

  if (isAuthStandalone()) {
    app.all('/api/auth/:action', authProxy);
  } else {
    registerEmbeddedAuthRoutes(app, deps);
  }
}

module.exports = { registerAuthRoutes };
