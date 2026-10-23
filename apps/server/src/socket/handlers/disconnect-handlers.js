'use strict';

/** Déconnexion joueur — extrait de register-sockets.js (with deps) */
const DISCONNECT_HANDLERS = `
  socket.on('disconnect', () => {
    adminSockets.delete(socket.id);
    _pendingInvAuth.delete(socket.id);
    const leaving = players.get(socket.id);
    if (!leaving) return;
    if (leaving.bedSleep) leaving.bedSleep = null;
    _getGroupsManager().then((gm) => gm.onDisconnect(leaving)).catch(() => {});
    players.delete(socket.id);
    _playerVisibleZombies.delete(socket.id);
    _rebuildPlayerSpatialGrid();

    const handoff = !!socket._handoff;
    log.info('socket', 'disconnect', {
      username: leaving.username,
      online: players.size,
      handoff,
      lastPos: { x: +leaving.x.toFixed(1), y: +leaving.y.toFixed(1), z: +leaving.z.toFixed(1) },
      health: leaving.health,
      kills: leaving.kills,
    });

    if (handoff || _hasOnlineSession(leaving.id, socket.id)) {
      _emitPlayersOnline();
      return;
    }

    // Toujours retirer l'avatar debout des autres clients (évite doublon avec le corps endormi).
    io.emit('player-leave', socket.id);
    _getGroupsManager().then((gm) => gm.onRosterChange()).catch(() => {});

    if (_isBenchUsername(leaving.username)) {
      if (leaving.id) _persistPlayer(leaving).catch(() => {});
      _emitPlayersOnline();
      return;
    }

    if (leaving.guest && !leaving.guestCommitted) {
      guestPlayers.purgeTrialGuest(leaving.id, leaving.username).catch(() => {});
      _emitPlayersOnline();
      return;
    }

    if (leaving.id && leaving.health > 0) {
      const sleep = {
        playerId: _sleeperKey(leaving.id),
        username: leaving.username,
        x: leaving.x,
        y: leaving.y,
        z: leaving.z,
        rotY: leaving.rotY,
        health: leaving.health,
        kills: leaving.kills,
        inv: _cloneInv(leaving.inv),
        survival: { ...(leaving.survival || DEFAULT_SURVIVAL) },
        _survivalAtDisconnect: { ...(leaving.survival || DEFAULT_SURVIVAL) },
        equipped: leaving.equipped || null,
        lifeStartedAt: leaving.lifeStartedAt,
        lifeZombieKills: leaving.lifeZombieKills ?? 0,
        lifePlayerKills: leaving.lifePlayerKills ?? 0,
        since: Date.now(),
        lastSurvivalTickAt: Date.now(),
      };
      _setSleepingPlayer(leaving.id, sleep);
      _persistPlayer(leaving)
        .then(() => _saveSleepingToDb(sleep))
        .catch(() => _saveSleepingToDb(sleep).catch(() => {}));
      io.emit('player-sleep', {
        id: _sleepBodyId(leaving.id),
        playerId: _normPlayerId(leaving.id),
        username: leaving.username,
        x: leaving.x,
        y: leaving.y,
        z: leaving.z,
        rotY: leaving.rotY,
        equipped: leaving.equipped || null,
      });
    } else if (leaving.id) {
      if (leaving._deathHandled) _spawnDeathBagFromPlayer(leaving);
      _persistPlayer(leaving);
    }
    _emitPlayersOnline();
  });
});
`;

module.exports = { DISCONNECT_HANDLERS };
