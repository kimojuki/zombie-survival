'use strict';

const TAG = 'inv-debug';

function _scanStacks(inv, normalizeInv) {
  const n = normalizeInv(inv);
  const out = [];
  const push = (zone, arr) => {
    if (!Array.isArray(arr)) return;
    for (let i = 0; i < arr.length; i++) {
      const s = arr[i];
      if (!s?.type) continue;
      out.push({ zone, idx: i, type: s.type, qty: s.qty || 1 });
    }
  };
  push('hotbar', n.hotbar);
  push('bag', n.bag);
  for (const [slot, s] of Object.entries(n.equip || {})) {
    if (s?.type) out.push({ zone: 'equip', idx: slot, type: s.type, qty: s.qty || 1 });
  }
  return out;
}

function invSnapshot(inv, normalizeInv) {
  const stacks = _scanStacks(inv, normalizeInv);
  const food = stacks.filter((s) => s.type.startsWith('food_'));
  const hotbar = (normalizeInv(inv).hotbar || []).map((s, idx) => (
    s?.type ? { idx, type: s.type, qty: s.qty || 1 } : { idx, type: null }
  ));
  const bagLen = (normalizeInv(inv).bag || []).length;
  const bagCap = (() => {
    const equipped = normalizeInv(inv).equip?.Dos;
    if (!equipped?.type) return 0;
    const map = { eq_petit_sac: 8, eq_sac_moyen: 16, eq_grand_sac: 24 };
    return map[equipped.type] || 0;
  })();
  return {
    hotbar,
    bagLen,
    bagCap,
    stackCount: stacks.length,
    food,
    all: stacks,
  };
}

function logInv(log, phase, data) {
  log.info(TAG, phase, data);
}

module.exports = { TAG, invSnapshot, logInv };
