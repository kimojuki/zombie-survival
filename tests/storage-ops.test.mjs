import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  ensureChestGrid,
  moveStorageTransfer,
  lootMoveTransfer,
} = require('../apps/server/src/storage-ops.js');
const { ensureSlotGrid } = require('../apps/server/src/inventory-ops.js');

function emptyInv() {
  return {
    hotbar: [null, null, null, null, null, null],
    bag: [null, null, null, null],
    equip: { Tête: null, Torso: null, Mains: null, Dos: null },
  };
}

test('ensureChestGrid pads to capacity', () => {
  const grid = ensureChestGrid([{ type: 'food_bread', qty: 1 }], 4);
  assert.equal(grid.length, 4);
  assert.equal(grid[0].type, 'food_bread');
  assert.equal(grid[1], null);
});

test('moveStorageTransfer swaps within chest', () => {
  const inv = emptyInv();
  const storage = [{ type: 'a', qty: 1 }, null, { type: 'b', qty: 1 }];
  const r = moveStorageTransfer(inv, storage, 3, { zone: 'chest', index: 0 }, { zone: 'chest', index: 2 });
  assert.equal(r.ok, true);
  assert.equal(r.grid[0].type, 'b');
  assert.equal(r.grid[2].type, 'a');
});

test('moveStorageTransfer moves player hotbar to chest slot', () => {
  const inv = emptyInv();
  inv.hotbar[0] = { type: 'res_bois_brut', qty: 2 };
  const storage = [null, null, null];
  const r = moveStorageTransfer(inv, storage, 3, { zone: 'hotbar', index: 0 }, { zone: 'chest', index: 1 });
  assert.equal(r.ok, true);
  assert.equal(r.grid[1].type, 'res_bois_brut');
  assert.equal(inv.hotbar[0], null);
});

test('lootMoveTransfer target to player', () => {
  const player = emptyInv();
  const target = emptyInv();
  target.hotbar[0] = { type: 'tool_torche', qty: 1 };
  const r = lootMoveTransfer(
    player,
    target,
    { side: 'target', zone: 'hotbar', index: 0 },
    { side: 'player', zone: 'hotbar', index: 1 },
  );
  assert.equal(r.ok, true);
  ensureSlotGrid(player);
  assert.equal(player.hotbar[1].type, 'tool_torche');
  assert.equal(target.hotbar[0], null);
});

test('lootMoveTransfer player to target', () => {
  const player = emptyInv();
  const target = emptyInv();
  player.hotbar[0] = { type: 'food_bread', qty: 2 };
  const r = lootMoveTransfer(
    player,
    target,
    { side: 'player', zone: 'hotbar', index: 0 },
    { side: 'target', zone: 'hotbar', index: 2 },
  );
  assert.equal(r.ok, true);
  ensureSlotGrid(player);
  ensureSlotGrid(target);
  assert.equal(player.hotbar[0], null);
  assert.equal(target.hotbar[2].type, 'food_bread');
});

test('moveStorageTransfer chest to player slot', () => {
  const inv = emptyInv();
  const storage = [{ type: 'res_bois_brut', qty: 3 }, null, null];
  const r = moveStorageTransfer(inv, storage, 3, { zone: 'chest', index: 0 }, { zone: 'hotbar', index: 0 });
  assert.equal(r.ok, true);
  assert.equal(inv.hotbar[0].type, 'res_bois_brut');
  assert.equal(r.grid[0], null);
});
