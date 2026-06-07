import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  normalizeInv,
  addStackToInv,
  removeStackFromInv,
  removeFromSlot,
  takeInvSlot,
  moveInvSlot,
  flattenInv,
  playerHasDoorKey,
  cloneInv,
  wearInvTool,
} = require('../apps/server/src/inventory-ops.js');

function emptyInv() {
  return {
    hotbar: [null, null, null, null, null, null],
    bag: [null, null, null, null],
    equip: { Tête: null, Torso: null, Mains: null, Dos: null },
  };
}

test('normalizeInv handles array legacy', () => {
  const n = normalizeInv([{ type: 'food_bread', qty: 2 }]);
  assert.equal(n.hotbar.length, 1);
  assert.equal(n.hotbar[0].type, 'food_bread');
});

test('addStackToInv stacks same type', () => {
  const inv = emptyInv();
  inv.hotbar[0] = { type: 'res_bois_brut', qty: 5 };
  const r = addStackToInv(inv, { type: 'res_bois_brut', qty: 3 });
  assert.equal(r.added, 3);
  assert.equal(r.leftover, 0);
  assert.equal(inv.hotbar[0].qty, 8);
});

test('addStackToInv overflow when full', () => {
  const inv = emptyInv();
  for (let i = 0; i < 6; i++) inv.hotbar[i] = { type: 'x', qty: 99 };
  for (let i = 0; i < 4; i++) inv.bag[i] = { type: 'y', qty: 99 };
  const r = addStackToInv(inv, { type: 'z', qty: 5 });
  assert.equal(r.added, 0);
  assert.equal(r.leftover, 5);
});

test('struct_cle requires empty slot and lockId', () => {
  const inv = emptyInv();
  const ok = addStackToInv(inv, { type: 'struct_cle', qty: 1, lockId: 'abc' });
  assert.equal(ok.added, 1);
  assert.ok(playerHasDoorKey(inv, 'abc'));
  const dup = addStackToInv(inv, { type: 'struct_cle', qty: 1, lockId: 'xyz' });
  assert.equal(dup.added, 1);
  assert.ok(playerHasDoorKey(inv, 'xyz'));
});

test('removeStackFromInv partial and full', () => {
  const inv = emptyInv();
  inv.hotbar[0] = { type: 'res_pierre', qty: 10 };
  assert.ok(removeStackFromInv(inv, 'res_pierre', 4));
  assert.equal(inv.hotbar[0].qty, 6);
  assert.ok(removeStackFromInv(inv, 'res_pierre', 6));
  assert.equal(inv.hotbar[0], null);
});

test('removeFromSlot by index', () => {
  const inv = emptyInv();
  inv.bag[1] = { type: 'med_bandage', qty: 3 };
  const out = removeFromSlot(inv, 'bag', 1, 2);
  assert.equal(out.qty, 2);
  assert.equal(inv.bag[1].qty, 1);
});

test('takeInvSlot clears slot', () => {
  const inv = emptyInv();
  inv.hotbar[2] = { type: 'tool_torche', qty: 1 };
  const item = takeInvSlot(inv, 'hotbar', 2);
  assert.equal(item.type, 'tool_torche');
  assert.equal(inv.hotbar[2], null);
});

test('moveInvSlot swaps stacks', () => {
  const inv = emptyInv();
  inv.hotbar[0] = { type: 'a', qty: 1 };
  inv.hotbar[1] = { type: 'b', qty: 1 };
  assert.ok(moveInvSlot(inv, 'hotbar', 0, 'hotbar', 1));
  assert.equal(inv.hotbar[0].type, 'b');
  assert.equal(inv.hotbar[1].type, 'a');
});

test('moveInvSlot allows bag indices on compact server arrays', () => {
  const inv = {
    hotbar: Array(6).fill(null),
    bag: [
      { type: 'food_eau_bouteille', qty: 1 },
      { type: 'food_sandwich', qty: 1 },
    ],
    equip: { Tête: null, Torso: null, Mains: null, Dos: { type: 'eq_petit_sac', qty: 1 } },
  };
  assert.ok(moveInvSlot(inv, 'bag', 0, 'bag', 3));
  assert.equal(inv.bag[0], null);
  assert.equal(inv.bag[1].type, 'food_sandwich');
  assert.equal(inv.bag[3].type, 'food_eau_bouteille');
  assert.ok(moveInvSlot(inv, 'bag', 1, 'bag', 0));
  assert.equal(inv.bag[0].type, 'food_sandwich');
  assert.equal(inv.bag[1], null);
});

test('flattenInv includes equip', () => {
  const inv = emptyInv();
  inv.equip.Torso = { type: 'armor_vest', qty: 1 };
  const flat = flattenInv(inv);
  assert.equal(flat.length, 1);
  assert.equal(flat[0].type, 'armor_vest');
});

test('wearInvTool breaks at zero durability', () => {
  const inv = emptyInv();
  inv.hotbar[0] = { type: 'tool_caillou', qty: 1, durability: 1 };
  const r = wearInvTool(inv, 'tool_caillou', 80);
  assert.equal(r.worn, true);
  assert.equal(r.broken, true);
  assert.equal(inv.hotbar[0], null);
});

test('wearInvTool decrements durability', () => {
  const inv = emptyInv();
  inv.hotbar[0] = { type: 'tool_caillou', qty: 1 };
  const r = wearInvTool(inv, 'tool_caillou', 80);
  assert.equal(r.worn, true);
  assert.equal(r.broken, false);
  assert.equal(inv.hotbar[0].durability, 79);
});

test('cloneInv deep copy', () => {
  const inv = emptyInv();
  inv.hotbar[0] = { type: 'x', qty: 1 };
  const c = cloneInv(inv);
  c.hotbar[0].qty = 99;
  assert.equal(inv.hotbar[0].qty, 1);
});
