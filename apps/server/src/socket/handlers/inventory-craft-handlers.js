'use strict';

/** Inventaire, craft, respawn — extrait de register-sockets.js (with deps) */
const INVENTORY_CRAFT_HANDLERS = `
  socket.on('inventory-move', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const fromZone = d?.from?.zone;
    const toZone = d?.to?.zone;
    if (!['hotbar', 'bag', 'equip'].includes(fromZone) || !['hotbar', 'bag', 'equip'].includes(toZone)) {
      reply({ ok: false, err: 'invalid' });
      return;
    }
    const itemFx = await _getItemFx();
    const equipTouched = fromZone === 'equip' || toZone === 'equip';
    const prevArmor = equipTouched ? itemFx.getArmorFromInv(p.inv, _normalizeInv) : 0;
    const ok = _moveInvSlot(p.inv, fromZone, d.from.index, toZone, d.to.index);
    if (!ok) {
      reply({ ok: false, err: 'move_failed' });
      return;
    }
    p.dirty = true;
    _emitInvAuth(socket, p);
    if (equipTouched && _maybeSyncEquipArmor(p, prevArmor, itemFx)) {
      _emitSurvivalUpdate(socket, p);
    }
    reply({ ok: true });
  });

  socket.on('weapon-reload', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const wmod = _weaponStatsMod || await weaponStatsModPromise;
    const weaponType = String(d?.weaponType || p.equipped || '').slice(0, 60);
    const stats = wmod.getWeaponStats(weaponType);
    if (!stats.ammoType) {
      reply({ ok: false, err: 'not_firearm' });
      return;
    }
    if (!wmod.playerHasWeapon(p.inv, weaponType, _iterInvStacks)) {
      reply({ ok: false, err: 'no_weapon' });
      return;
    }
    const n = _normalizeInv(p.inv);
    let slot = null;
    for (const s of n.hotbar) {
      if (s && s.type === weaponType) { slot = s; break; }
    }
    if (!slot) {
      reply({ ok: false, err: 'no_weapon' });
      return;
    }
    const cap = stats.magazineCap || 12;
    const need = cap - (slot.ammo || 0);
    if (need <= 0) {
      reply({ ok: true, loaded: 0 });
      return;
    }
    const have = _countInvType(p.inv, stats.ammoType);
    const load = Math.min(have, need);
    if (load <= 0) {
      reply({ ok: false, err: 'no_ammo' });
      return;
    }
    if (!_removeStackFromInv(p.inv, stats.ammoType, load)) {
      reply({ ok: false, err: 'consume_failed' });
      return;
    }
    slot.ammo = (slot.ammo || 0) + load;
    Object.assign(p.inv, n);
    p.dirty = true;
    _emitInvAuth(socket, p);
    reply({ ok: true, loaded: load });
  });

  socket.on('craft-queue', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const recipeMod = await craftRecipesModPromise;
    const result = craftQueueMod.enqueueCraft(p, d?.recipeId || d?.result, _craftOps, recipeMod);
    if (!result.ok) {
      reply(result);
      return;
    }
    p.dirty = true;
    _emitInvAuth(socket, p);
    socket.emit('craft-queue-state', craftQueueMod.getCraftQueueState(p));
    reply(result);
  });

  socket.on('craft-cancel', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const recipeMod = await craftRecipesModPromise;
    const result = craftQueueMod.cancelCraftJob(p, Number(d?.jobId), _craftOps, recipeMod);
    if (result.ok) {
      p.dirty = true;
      _emitInvAuth(socket, p);
      socket.emit('craft-queue-state', craftQueueMod.getCraftQueueState(p));
    }
    reply(result);
  });

  socket.on('inventory-sync', () => {
    log.throttled(\`inv-sync-reject:\${p.username}\`, 5000, () => {
      log.debug('inventory', 'ignored client inventory-sync', { player: p.username });
    });
  });

  socket.on('survival-sync', () => {
    log.throttled(\`sv-sync-reject:\${p.username}\`, 5000, () => {
      log.debug('survival', 'ignored client survival-sync', { player: p.username });
    });
  });

  socket.on('player-died', () => {
    log.debug('death', 'ignored client player-died', { player: p.username });
  });

  socket.on('respawn', async () => {
    if (p.health > 0 && !p._deathHandled) return;
    _spawnDeathBagFromPlayer(p);
    delete p._deathInv;
    delete p._deathPos;
    delete p._deathEquipped;
    p._deathHandled = false;
    p.health = 100;
    _resetLifeStats(p);
    p.invincible = true;
    const adminIntroReset = hasPerm(p.username, 'scenario') && p.adminIntroResetOnRespawn;
    const scKeep = p._scenarioKeep || p.inv?.scenario;
    const introRespawn = adminIntroReset
      || (scenarioBeach && scKeep && !scenarioBeach.isAct1Done(scKeep));
    const kit = JSON.parse(JSON.stringify(introRespawn ? EMPTY_PLAYER_INV : STARTING_ITEMS));
    if (!adminIntroReset) {
      const keepScenario = p._scenarioKeep || p.inv?.scenario;
      p.inv = kit;
      if (keepScenario) {
        p.inv.scenario = keepScenario;
        delete p._scenarioKeep;
      }
    } else {
      p.inv = kit;
      delete p._scenarioKeep;
    }
    p.survival = { ...DEFAULT_SURVIVAL };
    const spawn = introRespawn ? _introBeachSpawn(socket.id) : _randomBeachSpawn(socket.id);
    p.x = spawn.x;
    p.y = spawn.y;
    p.z = spawn.z;
    p.rotY = spawn.rotY;
    if (introRespawn) {
      p.anchorX = spawn.x;
      p.anchorY = spawn.y;
      p.anchorZ = spawn.z;
      const scAnchor = p.inv?.scenario;
      if (scAnchor) {
        scAnchor.anchorX = spawn.x;
        scAnchor.anchorZ = spawn.z;
      }
    }
    p.lastX = p.x;
    p.lastZ = p.z;
    p.lastMoveAt = Date.now();
    p.posSynced = true;
    p._respawnGraceUntil = Date.now() + 2500;
    p.dirty = true;
    setTimeout(() => { if (players.has(socket.id)) p.invincible = false; }, 3000);
    _emitSurvivalUpdate(socket, p);
    _emitInvAuth(socket, p);
    socket.emit('respawn-at', {
      spawn,
      inventory: _cloneInv(p.inv),
      survival: { ...DEFAULT_SURVIVAL },
    });
    socket.broadcast.emit('player-respawn', {
      id: socket.id,
      playerId: _normPlayerId(p.id),
      username: p.username,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      equipped: p.equipped || null,
    });
    if (scenarioBeach) {
      if (adminIntroReset) scenarioBeach.resetScenario(p, socket);
      else {
        scenarioBeach.onRespawnDuringIntro(p, socket);
        if (!scenarioBeach.isAct1Done(p.inv.scenario)) {
          (await _getIntroBeachBeats()).ensure(p, socket);
        }
      }
    }
    log.info('death', 'respawn', {
      player: p.username,
      spawn,
      kit: 'caillou+torche',
      adminIntroReset: !!adminIntroReset,
    });
  });

  // Fouille joueur endormi (déco) ou mort au sol
`;

module.exports = { INVENTORY_CRAFT_HANDLERS };
