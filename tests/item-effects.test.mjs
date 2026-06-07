import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getItemEffect,
  getMaxHealthFromInv,
  applyItemUse,
} from '../packages/shared/src/item-effects.mjs';

function normalizeInv(inv) {
  return inv;
}

test('med_bandage heals and stops bleeding', () => {
  const player = {
    health: 50,
    survival: { faim: 80, soif: 80, infection: 0, saignement: true },
    inv: { hotbar: [], bag: [], equip: {} },
  };
  const res = applyItemUse('med_bandage', player, normalizeInv);
  assert.equal(res.ok, true);
  assert.equal(player.health, 65);
  assert.equal(player.survival.saignement, false);
});

test('armor increases max health', () => {
  const inv = {
    hotbar: [],
    bag: [],
    equip: { Torso: { type: 'eq_gilet_protection', qty: 1 } },
  };
  assert.equal(getMaxHealthFromInv(inv, normalizeInv), 140);
});

test('unknown item returns null effect', () => {
  assert.equal(getItemEffect('nonexistent'), null);
});
