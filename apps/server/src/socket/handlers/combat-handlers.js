'use strict';

/** Scénario, tir, pickup/drop items — extrait de register-sockets.js (with deps) */
const COMBAT_HANDLERS = `
  socket.on('scenario-advance', (d) => {
    const step = (d && typeof d.step === 'string') ? d.step.slice(0, 32) : null;
    if (!step) return;
    _getScenarioBeach().then((sc) => sc.handleClientAdvance(p, socket, step)).catch(() => {});
  });

  socket.on('intro-readable-read', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const kind = typeof d?.signKind === 'string' ? d.signKind.slice(0, 48) : null;
    if (!kind) {
      reply({ ok: false });
      return;
    }
    const beatsMod = await _getIntroBeachBeats();
    beatsMod.onReadable(p, socket, kind);
    const scen = await _getScenarioBeach();
    if (kind === 'beach_safe_zone' && p.inv?.scenario?.step === 'read_exit_sign') {
      scen.handleClientAdvance(p, socket, 'act1_done');
    }
    reply({ ok: true });
  });

  socket.on('shoot', async (d) => {
    if (p._deathHandled) return;
    const combatMod = _combatMod || await combatModPromise;
    const wmod = _weaponStatsMod || await weaponStatsModPromise;
    const len = Math.hypot(d.dx, d.dz);
    if (len < 0.001) return;
    const nx = d.dx / len, nz = d.dz / len;
    const weaponType = String(d.weaponType || p.equipped || '__fist__').slice(0, 60);
    const stats = wmod.getWeaponStats(weaponType);
    if (!wmod.playerHasWeapon(p.inv, weaponType, _iterInvStacks)) return;
    const now = Date.now();
    const minInterval = (stats.fireRate || 0.5) * 1000;
    if (p.lastShotAt && now - p.lastShotAt < minInterval * 0.85) return;
    p.lastShotAt = now;

    const dmg = stats.dmg;
    const range = stats.range;
    const radius = stats.radius;

    let ox = Number(d.ox);
    let oz = Number(d.oz);
    if (!Number.isFinite(ox)) ox = p.x;
    if (!Number.isFinite(oz)) oz = p.z;
    const aimDrift = Math.hypot(ox - p.x, oz - p.z);
    if (range <= 3.5) {
      // Mêlée : garder la visée client (caméra) si proche de la position serveur.
      if (aimDrift > 3) { ox = p.x; oz = p.z; }
    } else if (aimDrift > 8) {
      ox = p.x;
      oz = p.z;
    }

    let invDirty = false;
    if (stats.ammoType) {
      const n = _normalizeInv(p.inv);
      let fired = false;
      for (const arr of [n.hotbar, n.bag]) {
        for (let i = 0; i < arr.length; i++) {
          const s = arr[i];
          if (!s || s.type !== weaponType) continue;
          if ((s.ammo ?? 0) <= 0) return;
          s.ammo = (s.ammo ?? 0) - 1;
          fired = true;
          break;
        }
        if (fired) break;
      }
      if (!fired) return;
      Object.assign(p.inv, n);
      invDirty = true;
    }

    const pellets = stats.pellets || 1;
    const groupsMod = await _getGroupsManager();
    const pvpTargets = serverFlags.pvp !== false
      ? [...players.entries()].map(([sid, tp]) => ({
        socketId: sid,
        x: tp.x,
        z: tp.z,
        health: tp.health,
        invincible: !!tp.invincible,
        skip: sid === socket.id || !!tp._deathHandled
          || groupsMod.areSameGroup(p.id, tp.id),
      }))
      : [];

    const spread = stats.dispersion || 0;
    for (let pellet = 0; pellet < pellets; pellet++) {
      let pnx = nx;
      let pnz = nz;
      if (pellets > 1 && spread > 0) {
        pnx += (Math.random() - 0.5) * spread;
        pnz += (Math.random() - 0.5) * spread;
        const plen = Math.hypot(pnx, pnz) || 1;
        pnx /= plen;
        pnz /= plen;
      } else if (spread > 0 && pellet > 0) {
        pnx += (Math.random() - 0.5) * spread * 0.35;
        pnz += (Math.random() - 0.5) * spread * 0.35;
        const plen = Math.hypot(pnx, pnz) || 1;
        pnx /= plen;
        pnz /= plen;
      }
      const ray = { ox, oz, nx: pnx, nz: pnz, range, radius };
      const best = _pickShootTarget(
        ray,
        combatMod,
        pvpTargets,
        [...zombies.values()],
        [...sleepingPlayers.values()],
      );
      if (!best) continue;

      if (best.kind === 'player') {
        const victim = players.get(best.id);
        if (victim) {
          log.debug('combat', 'pvp hit', {
            attacker: p.username,
            victim: victim.username,
            dmg,
            weaponType,
            healthLeft: Math.max(0, victim.health - dmg),
          });
          _applyPlayerCombatDamage(p, victim, dmg);
        }
        continue;
      }

      if (best.kind === 'sleeper') {
        log.debug('combat', 'sleeper hit', {
          attacker: p.username,
          victim: best.entity.username,
          dmg,
          weaponType,
          healthLeft: Math.max(0, best.entity.health - dmg),
        });
        _applySleeperCombatDamage(p, best.entity, dmg);
        continue;
      }

      const hit = best.entity;
      if (hit) {
        hit.health -= dmg;
        log.debug('combat', 'shoot hit', {
          player: p.username,
          zombieId: hit.id,
          dmg,
          weaponType,
          healthLeft: hit.health,
        });
        if (hit.health <= 0) {
          log.info('combat', 'zombie kill', { player: p.username, zombieId: hit.id, kills: p.kills + 1 });
          io.emit('zombie-die', hit.id);
          worldPersist?.scheduleDeleteZombie?.(hit.id);
          zombies.delete(hit.id);
          p.kills++;
          p.lifeZombieKills = (p.lifeZombieKills ?? 0) + 1;
          io.to(socket.id).emit('score-update', {
            kills: p.kills,
            playerKills: p.lifePlayerKills ?? 0,
          });
          let tutorialHandled = false;
          if (scenarioBeach) {
            tutorialHandled = scenarioBeach.handleTutorialKill(p, socket, hit);
          }
          if (!tutorialHandled) {
            _dropZombieKillLoot(hit);
            if (serverFlags.zombieSpawn) {
              setTimeout(() => {
                const nz = makeZombie();
                zombies.set(nz.id, nz);
                worldPersist?.scheduleUpsertZombie?.(nz);
                io.emit('zombie-spawn', nz);
              }, 4000);
            }
          }
        } else {
          if (scenarioBeach) scenarioBeach.onTutorialZombieHit(hit);
          const kb = stats.kb || 0;
          if (kb > 0) {
            const zR = hit.collideRadius || ZOMBIE_R;
            const pushed = resolveZombieCollision(hit.x + nx * kb, hit.z + nz * kb, zR);
            hit.x = pushed[0];
            hit.z = pushed[1];
          }
          io.emit('zombie-hit', {
            id: hit.id,
            health: hit.health,
            maxHealth: hit.maxHealth || hit.health,
            x: hit.x,
            z: hit.z,
            angle: hit.angle,
          });
        }
      }
    }
    const wearRes = _wearPlayerToolInv(p, weaponType, wmod);
    if (invDirty || wearRes.worn) _scheduleInvAuth(socket, p);
  });

  socket.on('intro-torch-pickup', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const lootMod = await _getIntroBeachBeats();
    const px = Number(d?.x);
    const pz = Number(d?.z);
    const decorId = d?.id ? String(d.id).trim() : null;
    let decor = decorId ? decorItems.get(decorId) : null;
    if (!decor) {
      const pid = _normPlayerId(p.id);
      for (const item of decorItems.values()) {
        if (item.prefabId !== 'spawn_beach_starter_torch') continue;
        if (_normPlayerId(item.ownerPlayerId) !== pid) continue;
        decor = item;
        break;
      }
    }
    const campfireDecorId = decor?.prefabId === 'spawn_beach_campfire_ring' ? decor.id : decorId;
    lootMod.tryCampfireBeatNear(p, socket, px, pz, campfireDecorId);
    let ok = false;
    if (decor?.prefabId === 'spawn_beach_starter_torch') {
      ok = lootMod.onTorchDecorPickup(p, socket, decor);
    } else {
      ok = lootMod.onTorchCampfirePickup(p, socket, px, pz, campfireDecorId);
    }
    if (!ok) {
      const beats = p.inv?.scenario?.introBeats;
      let err = 'pickup_failed';
      if (!beats?.pickedRock && !_invHasType(p.inv, 'tool_caillou')) err = 'need_rock';
      else if (!beats?.campfire) err = 'need_campfire_beat';
      else if (beats?.pickedTorch || _invHasType(p.inv, 'tool_torche')) err = 'already_has_torch';
      else if (beats?.campfire) {
        const hasSlot = (p.inv?.hotbar || []).some((s) => !s || !s.type)
          || (p.inv?.bag || []).some((s) => !s || !s.type);
        if (!hasSlot) err = 'inventory_full';
      }
      reply({ ok: false, err });
      return;
    }
    reply({ ok: true });
  });

  socket.on('item-pickup', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const item = items.get(d?.id);
    if (!item) {
      reply({ ok: false, err: 'gone' });
      return;
    }
    if (item.ownerPlayerId != null
      && _normPlayerId(item.ownerPlayerId) !== _normPlayerId(p.id)) {
      reply({ ok: false, err: 'not_owner' });
      return;
    }
    const lootMod = await _getIntroBeachBeats();
    if (!lootMod.canPickup(p, item)) {
      reply({ ok: false, err: 'not_ready' });
      return;
    }
    if (Math.hypot(item.x - p.x, item.z - p.z) > 3.0) {
      reply({ ok: false, err: 'too_far' });
      return;
    }
    _removeGroundItem(d.id);
    if (item.bag) {
      for (const it of (item.items || [])) {
        if (!it?.type) continue;
        const res = _addStackToInv(p.inv, it);
        if (res.leftover > 0) {
          _dropWorldItem(it.type, res.leftover, item.x, item.z, {
            ...(it.lockId ? { lockId: it.lockId } : {}),
          });
        }
      }
    } else {
      const stack = {
        type: item.type,
        qty: item.qty || 1,
        ...(item.lockId ? { lockId: item.lockId } : {}),
        ...(item.durability != null ? { durability: item.durability } : {}),
        ...(item.ammo != null ? { ammo: item.ammo } : {}),
      };
      const res = _addStackToInv(p.inv, stack);
      if (res.leftover > 0) {
        _dropWorldItem(item.type, res.leftover, item.x, item.z, {
          ...(item.lockId ? { lockId: item.lockId } : {}),
        });
      }
    }
    p.dirty = true;
    _emitInvAuth(socket, p);
    if (item.introPersonal) lootMod.onPickup(p, socket, item);
    if (scenarioBeach) scenarioBeach.onPickup(p, socket, item.bag ? null : item.type);
    log.debug('items', 'pickup', { player: p.username, type: item.type, bag: !!item.bag });
    reply({ ok: true });
  });

  socket.on('item-drop', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    if (!d || typeof d.type !== 'string' || d.type.length > 60) {
      reply({ ok: false, err: 'invalid' });
      return;
    }
    const qty = Math.max(1, Math.min(999, Number(d.qty) || 1));
    const zone = ['hotbar', 'bag', 'equip'].includes(d.zone) ? d.zone : null;
    const idx = zone === 'equip' ? d.index : Number(d.index);
    const itemFx = await _getItemFx();
    const prevArmor = zone === 'equip' ? itemFx.getArmorFromInv(p.inv, _normalizeInv) : 0;
    let removed = false;
    if (zone != null && (zone === 'equip' ? idx != null : Number.isFinite(idx))) {
      const slot = _removeFromSlot(p.inv, zone, idx, qty);
      removed = !!slot && slot.type === d.type;
    } else {
      removed = _removeStackFromInv(p.inv, d.type, qty, {
        lockId: d.type === 'struct_cle' ? d.lockId : undefined,
      });
    }
    if (!removed) {
      reply({ ok: false, err: 'no_item' });
      return;
    }
    const ang = Math.random() * Math.PI * 2;
    const extra = {};
    if (d.type === 'struct_cle') {
      const lockId = typeof d.lockId === 'string' ? d.lockId.trim() : '';
      if (!lockId || lockId.length > 80) {
        reply({ ok: false, err: 'invalid_key' });
        return;
      }
      extra.lockId = lockId;
    }
    _dropWorldItem(d.type, qty, p.x + Math.cos(ang) * 1.0, p.z + Math.sin(ang) * 1.0, extra);
    p.dirty = true;
    _emitInvAuth(socket, p);
    if (zone === 'equip' && _maybeSyncEquipArmor(p, prevArmor, itemFx)) {
      _emitSurvivalUpdate(socket, p);
    }
    reply({ ok: true });
  });

  // Récolte bois sur arbre prefab — sync multijoueur
`;

module.exports = { COMBAT_HANDLERS };
