'use strict';

const DEFAULT_EQUIP = Object.freeze({
  Tête: null,
  Torso: null,
  Mains: null,
  Dos: null,
});

const MAX_STACK = 99;
const HOTBAR_SIZE = 6;

/** Aligné client + packages/shared/src/item-effects.mjs */
const BAG_SLOTS_BY_TYPE = {
  eq_petit_sac: 8,
  eq_sac_moyen: 16,
  eq_grand_sac: 24,
};

function bagCapacity(inv) {
  const n = normalizeInv(inv);
  const equipped = n.equip?.Dos;
  if (!equipped?.type) return 0;
  return BAG_SLOTS_BY_TYPE[equipped.type] || 0;
}

/** Grille fixe hotbar/sac comme le client (slots vides = null). */
function ensureSlotGrid(inv) {
  const n = normalizeInv(inv);
  if (n.hotbar.length < HOTBAR_SIZE) {
    while (n.hotbar.length < HOTBAR_SIZE) n.hotbar.push(null);
  } else if (n.hotbar.length > HOTBAR_SIZE) {
    n.hotbar.length = HOTBAR_SIZE;
  }
  const cap = bagCapacity(n);
  if (n.bag.length < cap) {
    while (n.bag.length < cap) n.bag.push(null);
  } else if (n.bag.length > cap) {
    n.bag.length = cap;
  }
  Object.assign(inv, n);
  return n;
}

function normalizeInv(inv) {
  if (!inv || typeof inv !== 'object') {
    return { hotbar: [], bag: [], equip: { ...DEFAULT_EQUIP } };
  }
  if (Array.isArray(inv)) {
    return { hotbar: inv, bag: [], equip: { ...DEFAULT_EQUIP } };
  }
  return {
    hotbar: inv.hotbar || [],
    bag: inv.bag || [],
    equip: inv.equip || { ...DEFAULT_EQUIP },
  };
}

function cloneInv(inv) {
  return JSON.parse(JSON.stringify(normalizeInv(inv)));
}

function flattenInv(inv) {
  const out = [];
  const push = (s) => {
    if (!s?.type) return;
    const o = { type: s.type, qty: s.qty || 1 };
    if (s.lockId) o.lockId = s.lockId;
    if (s.durability != null) o.durability = s.durability;
    if (s.ammo != null) o.ammo = s.ammo;
    out.push(o);
  };
  if (!inv || typeof inv !== 'object') return out;
  (Array.isArray(inv) ? inv : (inv.hotbar || [])).forEach(push);
  (inv.bag || []).forEach(push);
  if (inv.equip) for (const k of Object.keys(inv.equip)) push(inv.equip[k]);
  return out;
}

function iterInvStacks(inv) {
  if (!inv || typeof inv !== 'object') return [];
  const hotbar = Array.isArray(inv) ? inv : (inv.hotbar || []);
  const bag = Array.isArray(inv) ? [] : (inv.bag || []);
  const equip = Array.isArray(inv) ? {} : (inv.equip || {});
  return [...hotbar, ...bag, ...Object.values(equip)];
}

function playerHasDoorKey(inv, lockId) {
  if (!lockId) return false;
  return iterInvStacks(inv).some(
    (s) => s && s.type === 'struct_cle' && s.lockId === lockId,
  );
}

function takeInvSlot(inv, zone, index) {
  const n = normalizeInv(inv);
  if (zone === 'equip') {
    const key = String(index);
    const item = n.equip[key];
    if (!item || !item.type) return null;
    n.equip[key] = null;
    Object.assign(inv, n);
    return JSON.parse(JSON.stringify(item));
  }
  const arr = zone === 'bag' ? n.bag : n.hotbar;
  const i = Number(index);
  if (!Number.isFinite(i) || i < 0 || i >= arr.length) return null;
  const item = arr[i];
  if (!item || !item.type) return null;
  arr[i] = null;
  Object.assign(inv, n);
  return JSON.parse(JSON.stringify(item));
}

/** Retire qty depuis un slot ; retourne l'item retiré ou null. */
function removeFromSlot(inv, zone, index, qty) {
  const n = normalizeInv(inv);
  let item;
  let arr;
  if (zone === 'equip') {
    const key = String(index);
    item = n.equip[key];
    if (!item?.type) return null;
    const take = qty == null ? (item.qty || 1) : Math.max(1, Math.min(item.qty || 1, qty));
    const out = JSON.parse(JSON.stringify({ ...item, qty: take }));
    if (take >= (item.qty || 1)) n.equip[key] = null;
    else item.qty = (item.qty || 1) - take;
    Object.assign(inv, n);
    return out;
  }
  arr = zone === 'bag' ? n.bag : n.hotbar;
  const i = Number(index);
  if (!Number.isFinite(i) || i < 0 || i >= arr.length) return null;
  item = arr[i];
  if (!item?.type) return null;
  const take = qty == null ? (item.qty || 1) : Math.max(1, Math.min(item.qty || 1, qty));
  const out = JSON.parse(JSON.stringify({ ...item, qty: take }));
  if (take >= (item.qty || 1)) arr[i] = null;
  else item.qty = (item.qty || 1) - take;
  Object.assign(inv, n);
  return out;
}

function addStackToInv(inv, item) {
  if (!item?.type) return { added: 0, leftover: 0 };
  const qty = Math.max(1, Math.min(999, Number(item.qty) || 1));
  if (item.type === 'struct_cle' && item.lockId) {
    if (qty !== 1) return { added: 0, leftover: qty };
    const clone = JSON.parse(JSON.stringify({ ...item, qty: 1 }));
    if (addStackToInvOnce(inv, clone)) return { added: 1, leftover: 0 };
    return { added: 0, leftover: 1 };
  }
  const n = normalizeInv(inv);
  let left = qty;
  for (const arr of [n.hotbar, n.bag]) {
    for (let i = 0; i < arr.length && left > 0; i++) {
      if (!arr[i] || arr[i].type !== item.type) continue;
      if (item.lockId && arr[i].lockId !== item.lockId) continue;
      const room = MAX_STACK - (arr[i].qty || 1);
      if (room <= 0) continue;
      const add = Math.min(room, left);
      arr[i].qty = (arr[i].qty || 1) + add;
      left -= add;
    }
  }
  for (const arr of [n.hotbar, n.bag]) {
    for (let i = 0; i < arr.length && left > 0; i++) {
      if (arr[i]) continue;
      const add = Math.min(MAX_STACK, left);
      arr[i] = JSON.parse(JSON.stringify({ ...item, qty: add }));
      left -= add;
    }
  }
  Object.assign(inv, n);
  return { added: qty - left, leftover: left };
}

function addStackToInvOnce(inv, item) {
  if (!item?.type) return false;
  const n = normalizeInv(inv);
  if (item.type === 'struct_cle' && item.lockId) {
    for (const arr of [n.hotbar, n.bag]) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i]) continue;
        arr[i] = JSON.parse(JSON.stringify({ ...item, qty: item.qty || 1 }));
        Object.assign(inv, n);
        return true;
      }
    }
    return false;
  }
  return addStackToInv(inv, item).leftover === 0;
}

function tryAddSlotToInv(inv, item) {
  const r = addStackToInv(inv, item);
  return r.added > 0 && r.leftover === 0;
}

function removeStackFromInv(inv, type, qty = 1, opts = {}) {
  let left = qty;
  const n = normalizeInv(inv);
  for (const arr of [n.hotbar, n.bag]) {
    for (let i = 0; i < arr.length && left > 0; i++) {
      if (!arr[i] || arr[i].type !== type) continue;
      if (opts.lockId && arr[i].lockId !== opts.lockId) continue;
      const have = arr[i].qty || 1;
      if (have <= left) {
        left -= have;
        arr[i] = null;
      } else {
        arr[i].qty = have - left;
        left = 0;
      }
    }
  }
  if (left > 0) return false;
  Object.assign(inv, n);
  return true;
}

function consumeInvType(inv, type, qty = 1) {
  return removeStackFromInv(inv, type, qty);
}

function consumeDoorKey(inv, lockId) {
  if (!lockId) return false;
  const n = normalizeInv(inv);
  for (const arr of [n.hotbar, n.bag]) {
    for (let i = 0; i < arr.length; i++) {
      const s = arr[i];
      if (!s || s.type !== 'struct_cle' || s.lockId !== lockId) continue;
      arr[i] = null;
      Object.assign(inv, n);
      return true;
    }
  }
  return false;
}

function countInvType(inv, type) {
  return iterInvStacks(inv).reduce(
    (n, s) => n + (s && s.type === type ? (s.qty || 1) : 0),
    0,
  );
}

function playerOwnsItemType(inv, type) {
  return countInvType(inv, type) > 0;
}

/** Déplace ou fusionne deux slots inventaire (hotbar/bag/equip). */
function moveInvSlot(inv, fromZone, fromIdx, toZone, toIdx) {
  const n = ensureSlotGrid(inv);
  const getArr = (zone) => (zone === 'bag' ? n.bag : zone === 'hotbar' ? n.hotbar : null);
  let src;
  if (fromZone === 'equip') {
    const key = String(fromIdx);
    src = n.equip[key];
    if (!src?.type) return false;
  } else {
    const arr = getArr(fromZone);
    const fi = Number(fromIdx);
    if (!arr || fi < 0 || fi >= arr.length) return false;
    src = arr[fi];
    if (!src?.type) return false;
  }

  let dst;
  if (toZone === 'equip') {
    const key = String(toIdx);
    dst = n.equip[key];
  } else {
    const arr = getArr(toZone);
    const ti = Number(toIdx);
    if (!arr || ti < 0 || ti >= arr.length) return false;
    dst = arr[ti];
  }

  const setSrc = (val) => {
    if (fromZone === 'equip') n.equip[String(fromIdx)] = val;
    else getArr(fromZone)[Number(fromIdx)] = val;
  };
  const setDst = (val) => {
    if (toZone === 'equip') n.equip[String(toIdx)] = val;
    else getArr(toZone)[Number(toIdx)] = val;
  };

  if (dst && dst.type === src.type && !src.lockId && !dst.lockId) {
    const max = MAX_STACK;
    const total = (dst.qty || 1) + (src.qty || 1);
    if (total <= max) {
      dst.qty = total;
      setSrc(null);
      Object.assign(inv, n);
      return true;
    }
    const room = max - (dst.qty || 1);
    if (room > 0) {
      dst.qty = max;
      src.qty = (src.qty || 1) - room;
      Object.assign(inv, n);
      return true;
    }
  }

  setSrc(dst || null);
  setDst(JSON.parse(JSON.stringify(src)));
  Object.assign(inv, n);
  return true;
}

/** Usure d'un outil/arme de mêlée (-1 durabilité ; casse à 0). */
function wearInvTool(inv, toolType, maxDurability) {
  if (!toolType || maxDurability == null || maxDurability === Infinity || !Number.isFinite(maxDurability)) {
    return { worn: false, broken: false };
  }
  const n = normalizeInv(inv);
  for (const arr of [n.hotbar, n.bag]) {
    for (let i = 0; i < arr.length; i++) {
      const s = arr[i];
      if (!s || s.type !== toolType) continue;
      if (s.durability == null) s.durability = maxDurability;
      s.durability -= 1;
      if (s.durability <= 0) {
        arr[i] = null;
        Object.assign(inv, n);
        return { worn: true, broken: true };
      }
      Object.assign(inv, n);
      return { worn: true, broken: false };
    }
  }
  return { worn: false, broken: false };
}

module.exports = {
  DEFAULT_EQUIP,
  MAX_STACK,
  HOTBAR_SIZE,
  bagCapacity,
  ensureSlotGrid,
  normalizeInv,
  cloneInv,
  flattenInv,
  iterInvStacks,
  playerHasDoorKey,
  takeInvSlot,
  removeFromSlot,
  addStackToInv,
  addStackToInvOnce,
  tryAddSlotToInv,
  removeStackFromInv,
  consumeInvType,
  consumeDoorKey,
  countInvType,
  playerOwnsItemType,
  moveInvSlot,
  wearInvTool,
};
