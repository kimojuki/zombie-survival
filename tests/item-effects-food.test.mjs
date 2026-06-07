import test from 'node:test';
import assert from 'node:assert/strict';
import { applyItemUse } from '../packages/shared/src/item-effects.mjs';

function normalizeInv(inv) {
  return inv;
}

test('food_sandwich restores hunger and thirst', () => {
  const player = {
    health: 100,
    survival: { faim: 40, soif: 35, infection: 0, saignement: false },
    inv: { hotbar: [], bag: [], equip: {} },
  };
  const res = applyItemUse('food_sandwich', player, normalizeInv);
  assert.equal(res.ok, true);
  assert.equal(player.survival.faim, 72);
  assert.equal(player.survival.soif, 43);
});
