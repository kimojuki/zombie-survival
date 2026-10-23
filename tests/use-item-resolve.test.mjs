import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  ensureSlotGrid,
  resolveUseItemStack,
  removeFromSlot,
} = require('../apps/server/src/inventory-ops.js');
const { applyItemUse } = await import('../packages/shared/src/item-effects.mjs');

function starterInv() {
  return {
    hotbar: [
      { type: 'tool_caillou', qty: 1, durability: 80 },
      { type: 'tool_torche', qty: 1 },
      null, null, null, null,
    ],
    bag: [
      { type: 'food_eau_bouteille', qty: 1 },
      { type: 'food_sandwich', qty: 1 },
    ],
    equip: { Tête: null, Torso: null, Mains: null, Dos: null },
  };
}

test('consume water after bag overflow matches client hotbar slot', () => {
  const inv = starterInv();
  ensureSlotGrid(inv);
  const resolved = resolveUseItemStack(inv, 'hotbar', 2, 'food_eau_bouteille');
  assert.equal(resolved?.stack?.type, 'food_eau_bouteille');

  const player = { inv, survival: { faim: 60, soif: 40 } };
  applyItemUse('food_eau_bouteille', player, (x) => x);
  removeFromSlot(inv, resolved.zone, resolved.idx, 1);

  assert.equal(player.survival.soif, 85);
  assert.equal(inv.hotbar[2], null);
});
