'use strict';

/**
 * Auth embedded (legacy) — comptes dans `players` du game DB.
 * @deprecated Utiliser auth-server (AUTH_MODE=standalone). Conservé pour dev sans conteneur auth.
 */
function registerEmbeddedAuthRoutes(app, deps) {
  const {
    bcrypt,
    jwt,
    JWT_SECRET,
    log,
    guestPlayers,
    getPlayer,
    createPlayer,
    isDevServer,
    isQaServer,
    SERVER_ROLE,
    GUEST_COMMIT_MS,
    authFromHeader,
    authPayload,
    devAccessPayload,
    canAccessDevServer,
    introBeachSpawn,
    startingSave,
    beachSpawn,
  } = deps;

  app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Champs manquants' });
    if (username.length < 3 || username.length > 50) return res.status(400).json({ error: 'Nom: 3-50 caractères' });
    if (password.length < 6) return res.status(400).json({ error: 'Mot de passe: min 6 caractères' });
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) return res.status(400).json({ error: 'Nom invalide (a-z, 0-9, _, -)' });
    if (/^Invite_/i.test(username)) return res.status(400).json({ error: 'Ce préfixe est réservé aux invités' });

    try {
      if (isDevServer()) return res.status(403).json(devAccessPayload());
      if (await getPlayer(username)) return res.status(409).json({ error: 'Nom déjà utilisé' });
      const hash = await bcrypt.hash(password, 12);
      const id = await createPlayer(username, hash, startingSave, introBeachSpawn());
      const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
      const auth = authPayload(username);
      log.info('auth', 'register ok', { username, role: auth.role });
      res.json({ token, username, ...auth, serverRole: SERVER_ROLE });
    } catch (err) {
      log.error('auth', 'register failed', { username, err: err.message });
      res.status(500).json({ error: 'Erreur serveur: ' + err.message });
    }
  });

  app.post('/api/auth/guest', async (req, res) => {
    if (isDevServer()) return res.status(403).json(devAccessPayload());
    try {
      const account = await guestPlayers.createGuestAccount(introBeachSpawn, startingSave);
      const token = jwt.sign(
        { id: account.id, username: account.username, guest: true, guestCommitted: false },
        JWT_SECRET,
        { expiresIn: '24h' },
      );
      log.info('auth', 'guest start', { username: account.username });
      res.json({
        token,
        username: account.username,
        guest: true,
        guestCommitted: false,
        guestCommitMinutes: Math.round(GUEST_COMMIT_MS / 60000),
        ...authPayload(account.username),
        serverRole: SERVER_ROLE,
        qaEnabled: isQaServer(),
        spawn: { x: beachSpawn.x, y: beachSpawn.y, z: beachSpawn.z, rotY: beachSpawn.rotY },
        health: 100,
        kills: 0,
      });
    } catch (err) {
      log.error('auth', 'guest failed', { err: err.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.post('/api/auth/upgrade-guest', async (req, res) => {
    const user = authFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Non authentifié' });
    if (!user.guest) return res.status(403).json({ error: 'Réservé aux comptes invité', code: 'not_guest' });
    const { username, password } = req.body || {};
    const nextName = String(username || '').trim();
    if (!nextName || !password) return res.status(400).json({ error: 'Champs manquants' });
    if (nextName.length < 3 || nextName.length > 50) return res.status(400).json({ error: 'Nom: 3-50 caractères' });
    if (password.length < 6) return res.status(400).json({ error: 'Mot de passe: min 6 caractères' });
    if (!/^[a-zA-Z0-9_-]+$/.test(nextName)) return res.status(400).json({ error: 'Nom invalide (a-z, 0-9, _, -)' });
    if (/^Invite_/i.test(nextName)) return res.status(400).json({ error: 'Ce préfixe est réservé aux invités' });
    try {
      const hash = await bcrypt.hash(password, 12);
      const result = await guestPlayers.upgradeToAccount(user.id, nextName, hash);
      if (!result.ok) {
        const status = result.code === 'username_taken' ? 409 : 403;
        return res.status(status).json(result);
      }
      const token = jwt.sign(
        { id: user.id, username: result.username, guest: false, guestCommitted: true },
        JWT_SECRET,
        { expiresIn: '7d' },
      );
      const auth = authPayload(result.username);
      log.info('auth', 'guest upgraded', { username: result.username });
      res.json({
        token,
        username: result.username,
        guest: false,
        guestCommitted: true,
        ...auth,
        serverRole: SERVER_ROLE,
        qaEnabled: isQaServer(),
      });
    } catch (err) {
      log.error('auth', 'upgrade-guest failed', { err: err.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Champs manquants' });

    try {
      const player = await getPlayer(username);
      if (!player || !(await bcrypt.compare(password, player.password_hash))) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }
      if (player.is_guest) {
        return res.status(403).json({
          error: 'Compte invité — utilisez « Jouer en invité » ou enregistrez votre progression en jeu',
          code: 'guest_account',
        });
      }
      if (isDevServer() && !canAccessDevServer(player.username)) {
        return res.status(403).json(devAccessPayload());
      }

      const token = jwt.sign({ id: player.id, username: player.username }, JWT_SECRET, { expiresIn: '7d' });
      log.info('auth', 'login ok', {
        username: player.username,
        spawn: { x: player.pos_x ?? 0, y: player.pos_y ?? 0, z: player.pos_z ?? 0 },
        health: player.health ?? 100,
        kills: player.kills ?? 0,
      });
      const auth = authPayload(player.username);
      res.json({
        token,
        username: player.username,
        ...auth,
        serverRole: SERVER_ROLE,
        qaEnabled: isQaServer(),
        spawn: { x: player.pos_x ?? 0, y: player.pos_y ?? 0, z: player.pos_z ?? 0, rotY: player.rot_y ?? 0 },
        health: player.health ?? 100,
        kills: player.kills ?? 0,
      });
    } catch (err) {
      log.error('auth', 'login failed', { username, err: err.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });
}

module.exports = { registerEmbeddedAuthRoutes };
