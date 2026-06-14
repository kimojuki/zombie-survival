'use strict';

/** Fouille corps endormi — extrait de register-sockets.js (with deps) */
const SLEEP_LOOT_HANDLERS = `
  socket.on('sleep-loot-open', (data, cb) => {
    if (typeof cb !== 'function') return;
    const targetId = _sleeperKey(data?.playerId);
    const target = _findLootTarget(targetId);
    if (!target) return cb({ ok: false, error: 'Personne à fouiller ici' });
    if (_sleepLootBlockedOnBeach(target)) {
      return cb({ ok: false, error: BEACH_SAFE_LOOT_MSG });
    }
    if (_distXZ(p.x, p.z, target.x, target.z) > SLEEP_LOOT_RADIUS) {
      return cb({ ok: false, error: 'Trop loin' });
    }
    cb({
      ok: true,
      playerId: target.playerId,
      username: target.username,
      inventory: _cloneInv(target.inv),
      kind: target.kind,
    });
  });

  socket.on('sleep-loot-take', async (data, cb) => {
    if (typeof cb !== 'function') return;
    const targetId = _sleeperKey(data?.playerId);
    const zone = data?.zone;
    const index = data?.index;
    const target = _findLootTarget(targetId);
    if (!target) return cb({ ok: false, error: 'Personne à fouiller ici' });
    if (_sleepLootBlockedOnBeach(target)) {
      return cb({ ok: false, error: BEACH_SAFE_LOOT_MSG });
    }
    if (_distXZ(p.x, p.z, target.x, target.z) > SLEEP_LOOT_RADIUS) {
      return cb({ ok: false, error: 'Trop loin' });
    }
    if (!['hotbar', 'bag', 'equip'].includes(zone)) {
      return cb({ ok: false, error: 'Zone invalide' });
    }
    const item = _takeInvSlot(target.inv, zone, index);
    if (!item) return cb({ ok: false, error: 'Emplacement vide' });
    if (!_tryAddSlotToInv(p.inv, item)) {
      const n = _normalizeInv(target.inv);
      if (zone === 'equip') n.equip[String(index)] = item;
      else if (zone === 'bag') n.bag[Number(index)] = item;
      else n.hotbar[Number(index)] = item;
      Object.assign(target.inv, n);
      return cb({ ok: false, error: 'Inventaire plein' });
    }
    p.dirty = true;
    const sleeperLoot = _getSleepingPlayer(target.playerId);
    if (sleeperLoot) await _saveSleepingToDb(sleeperLoot);
    else target.afterTake?.();
    _emitInvAuth(socket, p);
    io.emit('sleep-loot-update', { playerId: target.playerId, inventory: _cloneInv(target.inv) });
    log.info(target.kind === 'death' ? 'death' : 'sleep', 'loot take', {
      looter: p.username,
      target: target.username,
      type: item.type,
      qty: item.qty || 1,
    });
    cb({ ok: true, inventory: _cloneInv(target.inv) });
  });

  socket.on('sleep-loot-move', async (data, cb) => {
    if (typeof cb !== 'function') return;
    const targetId = _sleeperKey(data?.playerId);
    const target = _findLootTarget(targetId);
    if (!target) return cb({ ok: false, error: 'Personne à fouiller ici' });
    if (_sleepLootBlockedOnBeach(target)) {
      return cb({ ok: false, error: BEACH_SAFE_LOOT_MSG });
    }
    if (_distXZ(p.x, p.z, target.x, target.z) > SLEEP_LOOT_RADIUS) {
      return cb({ ok: false, error: 'Trop loin' });
    }
    const from = data?.from;
    const to = data?.to;
    if (!from?.zone || !from?.side || !to?.zone || !to?.side) {
      return cb({ ok: false, error: 'Requête invalide' });
    }

    const result = _lootMoveTransfer(
      p.inv,
      target.inv,
      { side: from.side, zone: from.zone, index: from.index },
      { side: to.side, zone: to.zone, index: to.index },
    );
    if (!result.ok) return cb({ ok: false, error: 'Déplacement refusé' });
    p.dirty = true;
    const sleeperLoot = _getSleepingPlayer(target.playerId);
    if (sleeperLoot) await _saveSleepingToDb(sleeperLoot);
    else target.afterTake?.();
    _emitInvAuth(socket, p);
    io.emit('sleep-loot-update', { playerId: target.playerId, inventory: _cloneInv(target.inv) });
    cb({ ok: true, inventory: _cloneInv(target.inv) });
  });

  // ── Groupes joueurs ─────────────────────────────────────────────────────────
`;

module.exports = { SLEEP_LOOT_HANDLERS };
