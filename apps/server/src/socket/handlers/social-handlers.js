'use strict';

/** Groupes, chat, admin, rcon socket — extrait de register-sockets.js (with deps) */
const SOCIAL_HANDLERS = `
  socket.on('group-create', (cb) => {
    const player = players.get(socket.id);
    if (!player) return typeof cb === 'function' && cb({ ok: false, error: 'Non connecté' });
    if (player.guest) {
      return typeof cb === 'function' && cb({
        ok: false,
        error: 'Créez un compte pour fonder un groupe',
        code: 'guest_restricted',
      });
    }
    _getGroupsManager().then((gm) => gm.handleCreate(player, cb)).catch((err) => {
      if (typeof cb === 'function') cb({ ok: false, error: err.message });
    });
  });

  socket.on('group-invite', (d, cb) => {
    const player = players.get(socket.id);
    if (!player) return typeof cb === 'function' && cb({ ok: false, error: 'Non connecté' });
    _getGroupsManager().then((gm) => gm.handleInvite(player, d?.username, cb)).catch((err) => {
      if (typeof cb === 'function') cb({ ok: false, error: err.message });
    });
  });

  socket.on('group-invite-respond', (d, cb) => {
    const player = players.get(socket.id);
    if (!player) return typeof cb === 'function' && cb({ ok: false, error: 'Non connecté' });
    _getGroupsManager().then((gm) => gm.handleInviteRespond(player, !!d?.accept, cb)).catch((err) => {
      if (typeof cb === 'function') cb({ ok: false, error: err.message });
    });
  });

  socket.on('group-kick', (d, cb) => {
    const player = players.get(socket.id);
    if (!player) return typeof cb === 'function' && cb({ ok: false, error: 'Non connecté' });
    _getGroupsManager().then((gm) => gm.handleKick(player, d?.userId, cb)).catch((err) => {
      if (typeof cb === 'function') cb({ ok: false, error: err.message });
    });
  });

  socket.on('group-leave', (cb) => {
    const player = players.get(socket.id);
    if (!player) return typeof cb === 'function' && cb({ ok: false, error: 'Non connecté' });
    _getGroupsManager().then((gm) => gm.handleLeave(player, cb)).catch((err) => {
      if (typeof cb === 'function') cb({ ok: false, error: err.message });
    });
  });

  socket.on('group-disband', (cb) => {
    const player = players.get(socket.id);
    if (!player) return typeof cb === 'function' && cb({ ok: false, error: 'Non connecté' });
    _getGroupsManager().then((gm) => gm.handleDisband(player, cb)).catch((err) => {
      if (typeof cb === 'function') cb({ ok: false, error: err.message });
    });
  });

  // ── Chat joueurs ────────────────────────────────────────────────────────────
  const CHAT_MAX_LEN = 200;
  const CHAT_COOLDOWN_MS = 800;

  socket.on('chat', (text, cb) => {
    const player = players.get(socket.id);
    if (!player) {
      if (typeof cb === 'function') cb({ ok: false, error: 'Non connecté' });
      return;
    }
    const msg = String(text || '').trim().replace(/\\s+/g, ' ').slice(0, CHAT_MAX_LEN);
    if (!msg) {
      if (typeof cb === 'function') cb({ ok: false, error: 'Message vide' });
      return;
    }
    const now = Date.now();
    if (player._lastChat && now - player._lastChat < CHAT_COOLDOWN_MS) {
      if (typeof cb === 'function') cb({ ok: false, error: 'Attendez un instant…' });
      return;
    }
    player._lastChat = now;
    const payload = {
      from: player.username,
      message: msg,
      ts: now,
      senderId: socket.id,
    };
    io.emit('chat-message', payload);
    log.info('chat', player.username, { msg: msg.slice(0, 80) });
    if (typeof cb === 'function') cb({ ok: true });
  });

  socket.on('admin-intro-reset-toggle', (data, cb) => {
    if (typeof cb !== 'function') return;
    if (!hasPerm(p.username, 'scenario')) {
      return cb({ ok: false, error: 'Permission scenario requise' });
    }
    const enabled = !!data?.enabled;
    p.adminIntroResetOnRespawn = enabled;
    log.info('scenario', 'admin intro test toggle', {
      user: p.username,
      enabled,
    });
    cb({ ok: true, enabled });
  });

  socket.on('admin-intro-reset-now', (data, cb) => {
    if (typeof cb !== 'function') return;
    if (!hasPerm(p.username, 'scenario')) {
      return cb({ ok: false, error: 'Permission scenario requise' });
    }
    if (p._deathHandled || p.health <= 0) {
      return cb({ ok: false, error: 'Déjà mort — cliquez sur Respawn' });
    }
    p.adminIntroResetOnRespawn = true;
    p.invincible = false;
    p.health = 0;
    _handlePlayerDeath(p);
    log.info('scenario', 'admin intro reset via death', { user: p.username });
    cb({ ok: true, enabled: true });
  });

  // ── Console RCON in-game ────────────────────────────────────────────────────
  if (hasPerm(p.username, 'rcon')) adminSockets.add(socket.id);
  if (hasPerm(p.username, 'rcon')) {
    log.info('rcon', 'admin session', { username: p.username, role: playerRoles?.resolveRoleId(p.username) });
  }

  socket.on('rcon-auth', (password, cb) => {
    if (typeof cb !== 'function') return;
    if (!RCON_PASSWORD && !hasPerm(p.username, 'rcon')) {
      return cb({ ok: false, error: 'RCON non configuré — définissez RCON_PASSWORD dans .env' });
    }
    if (hasPerm(p.username, 'rcon') || password === RCON_PASSWORD) {
      adminSockets.add(socket.id);
      log.info('rcon', 'admin auth ok', { username: p.username });
      return cb({ ok: true });
    }
    cb({ ok: false, error: 'Mot de passe incorrect' });
  });

  socket.on('rcon', (cmd, cb) => {
    if (typeof cb !== 'function') return;
    const run = async () => {
      const roleRcon = hasPerm(p.username, 'rcon');
      const passwordAuth = adminSockets.has(socket.id) && !roleRcon;
      const authorized = adminSockets.has(socket.id) || roleRcon;
      if (!authorized) {
        return cb({
          ok: false,
          lines: ['Non autorisé — tapez: auth <mot_de_passe> (dev SQLite: auth dev)'],
        });
      }
      if (!rcon) return cb({ ok: false, lines: ['RCON pas encore initialisé — réessayez dans 1s'] });
      const result = await rcon.execute(String(cmd || ''), {
        socket,
        player: p,
        passwordAuth,
        resolvePerms: (u) => _authPayload(u).permissions,
      });
      log.info('rcon', 'cmd', { user: p.username, cmd: String(cmd).slice(0, 80), ok: result.ok });
      cb(result);
    };
    run().catch((err) => {
      log.error('rcon', 'cmd error', { user: p.username, err: err.message });
      cb({ ok: false, lines: [\`Erreur serveur: \${err.message}\`] });
    });
  });
`;

module.exports = { SOCIAL_HANDLERS };
