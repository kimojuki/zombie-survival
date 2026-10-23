'use strict';

/** Handlers inventaire — extrait de register-sockets.js (with deps) */
const INVENTORY_HANDLERS = `
/** use-item + debug-inv-snapshot enregistrés dès la connexion (avant game-init long côté client). */
function _registerInvConsumeHandlers(socket, getPlayer) {
  socket.on('use-item', async (d, cb) => {
    const trace = typeof d?.trace === 'string' ? d.trace.slice(0, 48) : null;
    const reply = (payload) => {
      const out = {
        ...payload,
        serverBuild: INV_DEBUG_SERVER_BUILD,
        ...(trace ? { trace } : {}),
      };
      if (typeof cb === 'function') cb(out);
    };
    try {
      const pl = getPlayer();
      if (!pl) {
        reply({ ok: false, err: 'no_player' });
        return;
      }
      const zone = d?.zone === 'bag' || d?.zone === 'hotbar' ? d.zone : null;
      const idx = Number(d?.index);
      const typeHint = typeof d?.type === 'string' ? d.type.slice(0, 80) : null;
      const before = _invDebugSnapshot(pl.inv, _normalizeInv);
      _logInvDebug(log, 'use-item-req', {
        trace,
        user: pl.username,
        socketId: socket.id,
        build: INV_DEBUG_SERVER_BUILD,
        zone,
        idx,
        typeHint,
        before,
      });
      if (!typeHint) {
        _logInvDebug(log, 'use-item-reject', { trace, user: pl.username, err: 'no_type', req: d });
        reply({ ok: false, err: 'no_type', debug: { before, build: INV_DEBUG_SERVER_BUILD } });
        return;
      }
      _ensureSlotGrid(pl.inv);
      let resolved = _findStackByType(pl.inv, typeHint);
      let rationAdded = false;
      if (!resolved?.stack?.type) {
        rationAdded = ensureStarterRations(pl);
        if (rationAdded) pl.dirty = true;
        _ensureSlotGrid(pl.inv);
        resolved = _findStackByType(pl.inv, typeHint)
          || _resolveUseItemStack(pl.inv, zone, idx, typeHint);
      }
      if (!resolved?.stack?.type) {
        const after = _invDebugSnapshot(pl.inv, _normalizeInv);
        _logInvDebug(log, 'use-item-empty', {
          trace,
          user: pl.username,
          rationAdded,
          build: INV_DEBUG_SERVER_BUILD,
          before,
          after,
        });
        reply({
          ok: false,
          err: 'empty',
          inventory: _cloneInv(pl.inv),
          debug: { before, after, build: INV_DEBUG_SERVER_BUILD },
        });
        return;
      }
      const { zone: useZone, idx: useIdx, stack } = resolved;
      const itemFx = await itemEffectsModPromise;
      const eff = itemFx.getItemEffect(stack.type);
      if (!eff) {
        _logInvDebug(log, 'use-item-reject', {
          trace,
          user: pl.username,
          err: 'not_consumable',
          resolved: { zone: useZone, idx: useIdx, type: stack.type },
        });
        reply({ ok: false, err: 'not_consumable', debug: { before, resolved: stack.type } });
        return;
      }
      const svBefore = { ...(pl.survival || {}) };
      itemFx.applyItemUse(stack.type, pl, _normalizeInv);
      _removeFromSlot(pl.inv, useZone, useIdx, 1);
      pl.dirty = true;
      pl._svBroadcastSnap = null;
      _emitInvAuth(socket, pl);
      _emitSurvivalUpdate(socket, pl);
      const after = _invDebugSnapshot(pl.inv, _normalizeInv);
      _logInvDebug(log, 'use-item-ok', {
        trace,
        user: pl.username,
        used: { zone: useZone, idx: useIdx, type: stack.type },
        survivalBefore: svBefore,
        survivalAfter: pl.survival,
        before,
        after,
      });
      reply({
        ok: true,
        inventory: _cloneInv(pl.inv),
        survival: { ...(pl.survival || {}) },
        health: Math.max(0, Math.floor(pl.health ?? 100)),
        debug: { before, after, used: { zone: useZone, idx: useIdx, type: stack.type }, build: INV_DEBUG_SERVER_BUILD },
      });
    } catch (err) {
      const pl = getPlayer();
      _logInvDebug(log, 'use-item-error', { trace, user: pl?.username, err: err?.message });
      log.warn('inventory', 'use-item failed', { err: err?.message, player: pl?.username, trace });
      reply({ ok: false, err: 'server_error', trace });
    }
  });

  socket.on('debug-inv-snapshot', (d, cb) => {
    const trace = typeof d?.trace === 'string' ? d.trace.slice(0, 48) : null;
    const pl = getPlayer();
    if (!pl) {
      if (typeof cb === 'function') {
        cb({ ok: false, err: 'no_player', trace, serverBuild: INV_DEBUG_SERVER_BUILD });
      }
      return;
    }
    _ensureSlotGrid(pl.inv);
    const snap = _invDebugSnapshot(pl.inv, _normalizeInv);
    _logInvDebug(log, 'debug-inv-snapshot', { trace, user: pl.username, snap, build: INV_DEBUG_SERVER_BUILD });
    if (typeof cb === 'function') {
      cb({
        ok: true,
        trace,
        username: pl.username,
        serverBuild: INV_DEBUG_SERVER_BUILD,
        snap,
        inventory: _cloneInv(pl.inv),
        survival: { ...(pl.survival || {}) },
      });
    }
  });
}
`;

module.exports = { INVENTORY_HANDLERS };
