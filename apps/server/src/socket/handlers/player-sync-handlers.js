'use strict';

/** Mouvement, équipement, sync zombie/game-init — extrait de register-sockets.js (with deps) */
const PLAYER_SYNC_HANDLERS = `
  socket.on('move', (d) => {
    if (p._deathHandled) return;
    if (p.bedSleep) return;
    if (!d || !Number.isFinite(d.x) || !Number.isFinite(d.z)) return;
    const now = Date.now();
    const dt = Math.max(0.05, (now - (p.lastMoveAt || now)) / 1000);
    const maxDelta = 11 * dt * 1.5;
    const respawnGrace = p._respawnGraceUntil && now < p._respawnGraceUntil;
    const tpGrace = p._tpGraceUntil && now < p._tpGraceUntil;
    const introGrace = p._introMoveGraceUntil && now < p._introMoveGraceUntil;
    if (!respawnGrace && !tpGrace && !introGrace && p.lastMoveAt && Number.isFinite(p.lastX) && Number.isFinite(p.lastZ)) {
      const dist = Math.hypot(d.x - p.lastX, d.z - p.lastZ);
      if (dist > maxDelta) {
        socket.emit('move-correction', { x: p.x, y: p.y, z: p.z, rotY: p.rotY });
        return;
      }
    }
    let x = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, d.x));
    let z = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, d.z));
    if (_sectorBoundsMod?.clampToSector01) {
      const c = _sectorBoundsMod.clampToSector01(x, z);
      x = c.x;
      z = c.z;
    }
    const y = Number.isFinite(d.y) ? Math.max(-20, Math.min(100, d.y)) : p.y;
    const rotY = Number.isFinite(d.rotY) ? d.rotY : p.rotY;
    p.lastMoveAt = now;
    p.lastX = x;
    p.lastZ = z;
    p.x = x; p.y = y; p.z = z; p.rotY = rotY; p.dirty = true;
    p.crouching = !!(d && d.crouch);
    p.posSynced = true;
    const movePkt = { id: socket.id, x, y, z, rotY, crouch: p.crouching };
    _broadcastPlayerMove(socket, movePkt, x, z);
    _getScenarioBeach().then((sc) => sc.onMove(p, socket, d.rotY)).catch(() => {});
    if (log.isTrace()) {
      log.throttled(\`move:\${p.username}\`, 1000, () => {
        log.trace('move', p.username, { x: +d.x.toFixed(1), y: +d.y.toFixed(1), z: +d.z.toFixed(1) });
      });
    }
  });

  // Item tenu en main → visible des autres joueurs (arme, torche, outil…).
  socket.on('equip', (d) => {
    const type = (d && typeof d.type === 'string' && d.type.length <= 60) ? d.type : null;
    if (type && !_playerOwnsItemType(p.inv, type) && type !== p.equipped) return;
    if (type === p.equipped) return;
    p.equipped = type;
    socket.broadcast.emit('player-equip', { id: socket.id, type });
  });

  // Geste d'attaque (tir / mêlée) → animation + SFX chez les autres joueurs.
  socket.on('attack', (d) => {
    const kind = (d && d.kind === 'recoil') ? 'recoil' : 'melee';
    const weapon = (d && typeof d.weapon === 'string' && d.weapon.length <= 60) ? d.weapon : p.equipped;
    socket.broadcast.emit('player-attack', {
      id: socket.id,
      kind,
      weapon: weapon || null,
      x: p.x,
      z: p.z,
      t: Date.now(),
    });
  });

  const FOOTSTEP_SURFACES = new Set([
    'sand', 'grass', 'forest', 'dirt', 'water', 'wood', 'trail', 'asphalt',
  ]);
  socket.on('footstep', (d) => {
    const surface = (d && typeof d.surface === 'string') ? d.surface.slice(0, 16) : 'dirt';
    if (!FOOTSTEP_SURFACES.has(surface)) return;
    const now = Date.now();
    if (p._lastFootstepAt && now - p._lastFootstepAt < 200) return;
    p._lastFootstepAt = now;
    socket.broadcast.emit('player-footstep', {
      id: socket.id,
      surface,
      sprint: !!(d && d.sprint),
      x: p.x,
      z: p.z,
      t: now,
    });
  });

  socket.on('request-zombie-sync', () => {
    _getScenarioBeach().then((sc) => {
      const list = sc.filterZombiesForPlayer(p, Array.from(zombies.values()));
      socket.emit('zombies-snapshot', _compactZombiesForSync(list));
    }).catch(() => {
      socket.emit('zombies-snapshot', _compactZombiesForSync(Array.from(zombies.values())));
    });
  });

  socket.on('request-game-init', async () => {
    const cur = players.get(socket.id);
    if (!cur) return;
    _ensureSlotGrid(cur.inv);
    try {
      const sc = await _getScenarioBeach();
      if (sc.isAct1Done(cur.inv.scenario)) {
        if (ensureStarterRations(cur)) cur.dirty = true;
      } else {
        const { stripLegacyIntroKit } = await import(INTRO_BEATS_SHARED_URL);
        if (stripLegacyIntroKit(cur.inv, cur.inv.scenario)) cur.dirty = true;
      }
      socket.emit('game-init', _gameInitPayload(socket, cur, sc, false));
    } catch (e) {
      log.warn?.('socket', 'request-game-init', e);
    }
  });
`;

module.exports = { PLAYER_SYNC_HANDLERS };
