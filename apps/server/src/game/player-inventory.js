'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

const WEAPON_STATS_URL = pathToFileURL(
  path.join(__dirname, '../../../../packages/shared/src/weapon-stats.mjs'),
).href;
const weaponStatsModPromise = import(WEAPON_STATS_URL);
let _weaponStatsMod = null;
weaponStatsModPromise.then((m) => { _weaponStatsMod = m; }).catch(() => {});

const INTRO_RESET_STRIP_TYPES = new Set([
  'tool_caillou', 'tool_torche', 'food_eau_bouteille', 'food_sandwich',
]);

/**
 * Persist joueur, inv-auth coalescé, storage payload, starter kit, guest commit.
 */
function createPlayerInventory(deps) {
  const {
    io,
    log,
    savePlayerState,
    guestPlayers,
    guestCommitMs,
    defaultSurvival,
    introSuitcaseCapacity,
    storageChestCapacity,
    starterRations,
    getPlayers,
    cloneInv,
    wearInvTool,
    ensureChestGrid,
    ensureSlotGrid,
  } = deps;

  const pendingInvAuth = new Map();

  function saveBlob(p) {
    const base = Array.isArray(p.inv) ? { hotbar: p.inv } : (p.inv || {});
    return JSON.stringify({ ...base, survival: p.survival || defaultSurvival });
  }

  function scheduleInvAuth(socket, p) {
    if (!socket?.id || !p) return;
    p.dirty = true;
    if (pendingInvAuth.has(socket.id)) return;
    pendingInvAuth.set(socket.id, { socket, p });
    setImmediate(() => {
      const pending = pendingInvAuth.get(socket.id);
      pendingInvAuth.delete(socket.id);
      if (!pending?.socket?.connected) return;
      const pl = getPlayers().get(pending.socket.id);
      if (!pl) return;
      pending.socket.emit('inventory-authoritative', cloneInv(pl.inv));
    });
  }

  function emitInvAuth(socket, p) {
    scheduleInvAuth(socket, p);
  }

  function wearPlayerToolInv(p, toolType, wmod) {
    if (!toolType || toolType === '__fist__') return { worn: false, broken: false };
    const max = wmod.getWeaponStats(toolType).durabilityMax;
    if (max == null || max === Infinity || !Number.isFinite(max)) {
      return { worn: false, broken: false };
    }
    return wearInvTool(p.inv, toolType, max);
  }

  async function wearPlayerTool(socket, p, toolType) {
    const wmod = _weaponStatsMod || await weaponStatsModPromise;
    const res = wearPlayerToolInv(p, toolType, wmod);
    if (res.worn) scheduleInvAuth(socket, p);
    return res;
  }

  function persistPlayer(p) {
    if (!p?.id) return Promise.resolve(0);
    if (p.guest && !p.guestCommitted) return Promise.resolve(0);
    return savePlayerState(p.id, p.x, p.y, p.z, p.rotY, p.health, p.kills, saveBlob(p), p.username)
      .catch((err) => {
        log.warn('save', 'persist failed', { user: p.username, err: err.message });
        return 0;
      });
  }

  function tickGuestCommit(p) {
    if (!p.guest || p.guestCommitted) return;
    const now = Date.now();
    if (!p._guestLastTick) p._guestLastTick = now;
    p.guestPlaytimeMs = (p.guestPlaytimeMs || 0) + (now - p._guestLastTick);
    p._guestLastTick = now;
    if (p.guestPlaytimeMs < guestCommitMs) return;
    p.guestCommitted = true;
    guestPlayers.commitGuest(p.id, p.username).catch(() => {});
    persistPlayer(p);
    const sock = io.sockets.sockets.get(p.socketId);
    if (sock) {
      sock.emit('guest-committed', {
        guestCommitted: true,
        guestPlaytimeMs: p.guestPlaytimeMs,
      });
    }
    log.info('guest', 'session committed', { username: p.username, playtimeMs: p.guestPlaytimeMs });
  }

  function storageCapacity(item) {
    if (!item) return 0;
    if (item.prefabId === 'spawn_beach_starter_suitcase') return introSuitcaseCapacity;
    if (item.prefabId === 'storage_chest') return storageChestCapacity;
    return 0;
  }

  function storagePayload(item) {
    const capacity = storageCapacity(item);
    if (!item || !capacity) return null;
    const grid = ensureChestGrid(item.storage, capacity);
    item.storage = grid;
    return {
      id: item.id,
      prefabId: item.prefabId,
      items: grid.map((s) => (s?.type ? { type: s.type, qty: s.qty || 1 } : null)),
      capacity,
      title: item.prefabId === 'spawn_beach_starter_suitcase' ? 'Valise échouée' : 'Coffre',
      takeAllEnabled: true,
    };
  }

  function emitStorageUpdate(item) {
    const payload = storagePayload(item);
    if (payload) io.emit('storage-update', payload);
  }

  function invHasType(inv, type) {
    const hotbar = Array.isArray(inv.hotbar) ? inv.hotbar : [];
    const bag = inv.bag || [];
    const equip = inv.equip || {};
    return hotbar.some((s) => s && s.type === type)
      || bag.some((s) => s && s.type === type)
      || Object.values(equip).some((s) => s && s.type === type);
  }

  function invHasFood(inv) {
    const hotbar = Array.isArray(inv.hotbar) ? inv.hotbar : [];
    const bag = inv.bag || [];
    const equip = inv.equip || {};
    const isFood = (s) => s?.type?.startsWith('food_');
    return hotbar.some(isFood) || bag.some(isFood) || Object.values(equip).some(isFood);
  }

  function clearIntroInventory(p) {
    const inv = p.inv;
    if (!inv || typeof inv !== 'object') return;
    let changed = false;
    if (Array.isArray(inv.hotbar)) {
      for (let i = 0; i < inv.hotbar.length; i++) {
        const s = inv.hotbar[i];
        if (s?.type && INTRO_RESET_STRIP_TYPES.has(s.type)) {
          inv.hotbar[i] = null;
          changed = true;
        }
      }
    }
    if (Array.isArray(inv.bag) && inv.bag.length) {
      const next = inv.bag.filter((s) => !s?.type || !INTRO_RESET_STRIP_TYPES.has(s.type));
      if (next.length !== inv.bag.length) {
        inv.bag = next;
        changed = true;
      }
    }
    if (inv.equip && typeof inv.equip === 'object') {
      for (const slot of Object.keys(inv.equip)) {
        const s = inv.equip[slot];
        if (s?.type && INTRO_RESET_STRIP_TYPES.has(s.type)) {
          inv.equip[slot] = null;
          changed = true;
        }
      }
    }
    if (changed) p.dirty = true;
  }

  function ensureStarterRock(p) {
    const inv = p.inv;
    if (!inv || typeof inv !== 'object') return false;
    const hotbar = Array.isArray(inv.hotbar) ? inv.hotbar : [];
    const bag = inv.bag || [];
    const equip = inv.equip || {};
    const hasAny = hotbar.some((s) => s && s.type)
      || bag.some((s) => s && s.type)
      || Object.values(equip).some((s) => s && s.type);
    if (hasAny) return false;
    inv.hotbar = [
      { type: 'tool_caillou', qty: 1, durability: 80 },
      { type: 'tool_torche', qty: 1 },
      null, null, null, null,
    ];
    inv.bag = inv.bag || [];
    return true;
  }

  function ensureStarterRations(p) {
    const inv = p.inv;
    if (!inv || typeof inv !== 'object') return false;
    const sc = inv.scenario;
    if (sc && !sc.completed && sc.step !== 'act1_done' && !sc.introBeats?.kitDone) {
      return false;
    }
    ensureSlotGrid(inv);
    if (invHasFood(inv)) return false;
    let changed = false;
    for (const s of starterRations) {
      if (invHasType(inv, s.type)) continue;
      const hotbar = inv.hotbar || [];
      const freeHb = hotbar.findIndex((slot) => !slot || !slot.type);
      if (freeHb >= 0) {
        hotbar[freeHb] = { ...s };
        changed = true;
        continue;
      }
      inv.bag = inv.bag || [];
      inv.bag.push({ ...s });
      changed = true;
    }
    return changed;
  }

  function ensureStarterTorch(p) {
    const inv = p.inv;
    if (!inv || typeof inv !== 'object') return false;
    if (invHasType(inv, 'tool_torche')) return false;
    const hotbar = Array.isArray(inv.hotbar) ? inv.hotbar : (inv.hotbar = []);
    const idx = hotbar.findIndex((s) => !s || !s.type);
    const torch = { type: 'tool_torche', qty: 1 };
    if (idx >= 0) {
      hotbar[idx] = torch;
      return true;
    }
    inv.bag = inv.bag || [];
    inv.bag.push(torch);
    return true;
  }

  return {
    saveBlob,
    emitInvAuth,
    scheduleInvAuth,
    getPendingInvAuth: () => pendingInvAuth,
    wearPlayerToolInv,
    wearPlayerTool,
    persistPlayer,
    tickGuestCommit,
    storageCapacity,
    storagePayload,
    emitStorageUpdate,
    invHasType,
    clearIntroInventory,
    ensureStarterRock,
    ensureStarterRations,
    ensureStarterTorch,
  };
}

module.exports = { createPlayerInventory };
