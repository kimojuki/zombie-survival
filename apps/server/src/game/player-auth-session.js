'use strict';

/**
 * IDs joueur, rôles/permissions, handoff session live (refresh navigateur).
 */
function createPlayerAuthSession(deps) {
  const {
    io,
    log,
    getPlayers,
    getAdminSockets,
    getPlayerRoles,
    ownerUsers,
    rconAutoAdmin,
  } = deps;

  function normPlayerId(id) {
    const n = Number(id);
    return Number.isFinite(n) ? n : id;
  }

  function authPayload(username) {
    const roles = getPlayerRoles();
    if (roles) return roles.getAuthForUser(username);
    const isOwner = ownerUsers.has((username || '').toLowerCase()) || rconAutoAdmin;
    return {
      role: isOwner ? 'owner' : 'player',
      roleLabel: isOwner ? 'Propriétaire' : 'Joueur',
      roleColor: isOwner ? '#f0c040' : '#8a94a4',
      permissions: isOwner ? ['*'] : [],
      isAdmin: isOwner,
      rconEnabled: isOwner,
      rconPreAuth: isOwner,
      envOwner: ownerUsers.has((username || '').toLowerCase()),
    };
  }

  function hasPerm(username, perm) {
    const roles = getPlayerRoles();
    if (roles) return roles.hasPermission(username, perm);
    return ownerUsers.has((username || '').toLowerCase()) || rconAutoAdmin;
  }

  /** Session encore ouverte (refresh : nouvelle socket avant déco de l'ancienne). */
  function takeoverLiveSession(userId, newSocketId) {
    const uid = normPlayerId(userId);
    for (const [sid, op] of getPlayers().entries()) {
      if (normPlayerId(op.id) !== uid || sid === newSocketId) continue;
      getPlayers().delete(sid);
      getAdminSockets().delete(sid);
      const oldSock = io.sockets.sockets.get(sid);
      if (oldSock) {
        oldSock._handoff = true;
        oldSock.disconnect(true);
      }
      log.info('socket', 'session handoff', { username: op.username, from: sid, to: newSocketId });
      return op;
    }
    return null;
  }

  function hasOnlineSession(userId, exceptSocketId) {
    const uid = normPlayerId(userId);
    for (const [sid, op] of getPlayers().entries()) {
      if (sid === exceptSocketId) continue;
      if (normPlayerId(op.id) === uid) return true;
    }
    return false;
  }

  function isAdminUser(username) {
    return hasPerm(username, 'hub.access');
  }

  function canAccessDevServer(username) {
    return hasPerm(username, 'dev.access');
  }

  function devAccessPayload() {
    return { error: 'Serveur dev réservé aux administrateurs', code: 'dev_admin_only' };
  }

  return {
    normPlayerId,
    authPayload,
    hasPerm,
    takeoverLiveSession,
    hasOnlineSession,
    isAdminUser,
    canAccessDevServer,
    devAccessPayload,
  };
}

module.exports = { createPlayerAuthSession };
