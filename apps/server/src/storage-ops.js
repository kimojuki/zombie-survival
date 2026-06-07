'use strict';

const {
  ensureSlotGrid,
  removeFromSlot,
  moveInvSlot,
  takeInvSlot,
  MAX_STACK,
} = require('./inventory-ops');

function ensureChestGrid(storage, capacity) {
  const grid = Array.from({ length: capacity }, () => null);
  if (!Array.isArray(storage)) return grid;
  for (let i = 0; i < capacity; i++) {
    const s = storage[i];
    if (s?.type) {
      grid[i] = JSON.parse(JSON.stringify({
        type: s.type,
        qty: s.qty || 1,
        ...(s.lockId ? { lockId: s.lockId } : {}),
        ...(s.durability != null ? { durability: s.durability } : {}),
        ...(s.ammo != null ? { ammo: s.ammo } : {}),
      }));
    }
  }
  return grid;
}

function chestFilledCount(grid) {
  let n = 0;
  for (const s of grid) if (s?.type) n += 1;
  return n;
}

function cloneStack(stack) {
  return stack?.type ? JSON.parse(JSON.stringify(stack)) : null;
}

function getInvSlot(n, zone, idx) {
  if (zone === 'equip') return n.equip[String(idx)];
  const arr = zone === 'bag' ? n.bag : zone === 'hotbar' ? n.hotbar : null;
  const i = Number(idx);
  if (!arr || !Number.isFinite(i) || i < 0 || i >= arr.length) return undefined;
  return arr[i];
}

function setInvSlot(n, zone, idx, val) {
  if (zone === 'equip') n.equip[String(idx)] = val;
  else (zone === 'bag' ? n.bag : n.hotbar)[Number(idx)] = val;
}

function tryMergeInto(dst, src) {
  if (!dst?.type || !src?.type || dst.type !== src.type || dst.lockId || src.lockId) return null;
  const total = (dst.qty || 1) + (src.qty || 1);
  if (total <= MAX_STACK) {
    dst.qty = total;
    return { ok: true, leftover: null };
  }
  const room = MAX_STACK - (dst.qty || 1);
  if (room <= 0) return null;
  dst.qty = MAX_STACK;
  src.qty = (src.qty || 1) - room;
  return { ok: true, leftover: src };
}

function restoreChest(grid, idx, item) {
  const i = Number(idx);
  if (!Number.isFinite(i) || i < 0 || i >= grid.length) return false;
  grid[i] = cloneStack(item);
  return true;
}

function restorePlayer(inv, zone, idx, item) {
  const n = ensureSlotGrid(inv);
  setInvSlot(n, zone, idx, cloneStack(item));
  Object.assign(inv, n);
  return true;
}

/** Déplacement / échange entre coffre (grille fixe) et inventaire joueur. */
function moveStorageTransfer(inv, storage, capacity, from, to) {
  const fromZone = from?.zone;
  const toZone = to?.zone;
  if (!['chest', 'hotbar', 'bag'].includes(fromZone) || !['chest', 'hotbar', 'bag'].includes(toZone)) {
    return { ok: false, err: 'invalid' };
  }
  if (fromZone === toZone && String(from.index) === String(to.index)) {
    return { ok: false, err: 'same_slot' };
  }

  const grid = ensureChestGrid(storage, capacity);

  if (fromZone !== 'chest' && toZone !== 'chest') {
    const ok = moveInvSlot(inv, fromZone, from.index, toZone, to.index);
    return ok ? { ok: true, grid } : { ok: false, err: 'move_failed' };
  }

  let src;
  if (fromZone === 'chest') {
    const fi = Number(from.index);
    if (!Number.isFinite(fi) || fi < 0 || fi >= capacity) return { ok: false, err: 'invalid' };
    src = grid[fi];
    if (!src?.type) return { ok: false, err: 'empty' };
    grid[fi] = null;
  } else {
    src = removeFromSlot(inv, fromZone, from.index, null);
    if (!src?.type) return { ok: false, err: 'empty' };
  }

  const placeResult = _placeItem(inv, grid, capacity, toZone, to.index, src);
  if (!placeResult.ok) {
    if (fromZone === 'chest') restoreChest(grid, from.index, src);
    else restorePlayer(inv, fromZone, from.index, src);
    return { ok: false, err: placeResult.err || 'move_failed' };
  }

  if (placeResult.displaced) {
    if (fromZone === 'chest') {
      restoreChest(grid, from.index, placeResult.displaced);
    } else {
      restorePlayer(inv, fromZone, from.index, placeResult.displaced);
    }
  } else if (placeResult.leftover) {
    if (fromZone === 'chest') restoreChest(grid, from.index, placeResult.leftover);
    else restorePlayer(inv, fromZone, from.index, placeResult.leftover);
  }

  return { ok: true, grid };
}

function _placeItem(inv, grid, capacity, toZone, toIdx, src) {
  if (toZone === 'chest') {
    const ti = Number(toIdx);
    if (!Number.isFinite(ti) || ti < 0 || ti >= capacity) return { ok: false, err: 'invalid' };
    const dst = grid[ti];
    if (!dst?.type) {
      grid[ti] = src;
      return { ok: true };
    }
    const merge = tryMergeInto(dst, src);
    if (merge?.ok) {
      return merge.leftover
        ? { ok: true, leftover: merge.leftover }
        : { ok: true };
    }
    grid[ti] = src;
    return { ok: true, displaced: dst };
  }

  const n = ensureSlotGrid(inv);
  const dst = getInvSlot(n, toZone, toIdx);
  if (!dst?.type) {
    setInvSlot(n, toZone, toIdx, src);
    Object.assign(inv, n);
    return { ok: true };
  }
  const merge = tryMergeInto(dst, src);
  if (merge?.ok) {
    Object.assign(inv, n);
    return merge.leftover
      ? { ok: true, leftover: merge.leftover }
      : { ok: true };
  }
  setInvSlot(n, toZone, toIdx, src);
  Object.assign(inv, n);
  return { ok: true, displaced: dst };
}

function _moveBetweenInventories(srcInv, dstInv, from, to) {
  const taken = takeInvSlot(srcInv, from.zone, from.index);
  if (!taken?.type) return { ok: false, err: 'empty' };

  const dn = ensureSlotGrid(dstInv);
  const dst = getInvSlot(dn, to.zone, to.index);
  if (!dst?.type) {
    setInvSlot(dn, to.zone, to.index, taken);
    Object.assign(dstInv, dn);
    Object.assign(srcInv, ensureSlotGrid(srcInv));
    return { ok: true };
  }

  const merge = tryMergeInto(dst, taken);
  if (merge?.ok && !merge.leftover) {
    Object.assign(dstInv, dn);
    Object.assign(srcInv, ensureSlotGrid(srcInv));
    return { ok: true };
  }
  if (merge?.ok && merge.leftover) {
    const sn = ensureSlotGrid(srcInv);
    setInvSlot(sn, from.zone, from.index, merge.leftover);
    Object.assign(srcInv, sn);
    Object.assign(dstInv, dn);
    return { ok: true };
  }

  setInvSlot(dn, to.zone, to.index, taken);
  Object.assign(dstInv, dn);
  const sn = ensureSlotGrid(srcInv);
  setInvSlot(sn, from.zone, from.index, dst);
  Object.assign(srcInv, sn);
  return { ok: true };
}

/** Fouille : transfert bidirectionnel joueur ↔ cible (+ réorg. dans chaque inventaire). */
function lootMoveTransfer(playerInv, targetInv, from, to) {
  const fromSide = from?.side;
  const toSide = to?.side;
  if (!from?.zone || to?.zone == null || !fromSide || !toSide) {
    return { ok: false, err: 'invalid' };
  }
  if (fromSide === toSide && from.zone === to.zone && String(from.index) === String(to.index)) {
    return { ok: false, err: 'same_slot' };
  }

  const playerZones = ['hotbar', 'bag'];
  const targetZones = ['hotbar', 'bag', 'equip'];

  if (fromSide === 'player' && toSide === 'player') {
    if (!playerZones.includes(from.zone) || !playerZones.includes(to.zone)) {
      return { ok: false, err: 'invalid' };
    }
    return moveInvSlot(playerInv, from.zone, from.index, to.zone, to.index)
      ? { ok: true } : { ok: false, err: 'move_failed' };
  }

  if (fromSide === 'target' && toSide === 'target') {
    if (!targetZones.includes(from.zone) || !targetZones.includes(to.zone)) {
      return { ok: false, err: 'invalid' };
    }
    return moveInvSlot(targetInv, from.zone, from.index, to.zone, to.index)
      ? { ok: true } : { ok: false, err: 'move_failed' };
  }

  if (fromSide === 'target' && toSide === 'player') {
    if (!targetZones.includes(from.zone) || !playerZones.includes(to.zone)) {
      return { ok: false, err: 'invalid' };
    }
    return _moveBetweenInventories(targetInv, playerInv, from, to);
  }

  if (fromSide === 'player' && toSide === 'target') {
    if (!playerZones.includes(from.zone) || !targetZones.includes(to.zone)) {
      return { ok: false, err: 'invalid' };
    }
    return _moveBetweenInventories(playerInv, targetInv, from, to);
  }

  return { ok: false, err: 'invalid' };
}

module.exports = {
  ensureChestGrid,
  chestFilledCount,
  moveStorageTransfer,
  lootMoveTransfer,
};
