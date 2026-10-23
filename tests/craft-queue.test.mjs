import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const craftQueue = require('../apps/server/src/craft-queue.js');
const { addStackToInv, removeStackFromInv, countInvType } = require('../apps/server/src/inventory-ops.js');
const { findCraftRecipe, CRAFT_MAX_QUEUE, defaultCraftDuration } = await import('../packages/shared/src/craft-recipes.mjs');

const recipeMod = { findCraftRecipe, CRAFT_MAX_QUEUE, defaultCraftDuration };

const ops = {
  countInvType,
  removeStackFromInv,
  addStackToInv,
};

function emptyInv() {
  return {
    hotbar: [null, null, null, null, null, null],
    bag: [null, null, null, null],
    equip: { Tête: null, Torso: null, Mains: null, Dos: null },
  };
}

function playerWithWood(qty = 10) {
  const inv = emptyInv();
  addStackToInv(inv, { type: 'res_bois_brut', qty });
  return { inv, craftQueue: [], craftActive: null, _craftJobSeq: 0, dirty: false };
}

test('enqueueCraft consumes ingredients and queues job', () => {
  const p = playerWithWood(10);
  const recipe = findCraftRecipe('wpn_lance_bois');
  const res = craftQueue.enqueueCraft(p, recipe.id, ops, recipeMod);
  assert.equal(res.ok, true);
  assert.equal(p.craftQueue.length, 1);
  assert.equal(countInvType(p.inv, 'res_bois_brut'), 0);
});

test('enqueueCraft rejects insufficient resources', () => {
  const p = playerWithWood(3);
  const res = craftQueue.enqueueCraft(p, 'wpn_lance_bois', ops, recipeMod);
  assert.equal(res.ok, false);
  assert.equal(res.err, 'insufficient_resources');
});

test('tickCraftQueues delivers result to inventory', () => {
  const p = playerWithWood(10);
  craftQueue.enqueueCraft(p, 'wpn_lance_bois', ops, recipeMod);
  craftQueue.tickCraftQueues(new Map([['a', p]]), 0.2, ops);
  assert.ok(p.craftActive);
  const duration = p.craftActive.duration;
  craftQueue.tickCraftQueues(new Map([['a', p]]), duration, ops);
  assert.equal(p.craftActive, null);
  assert.ok(p._craftPendingComplete);
  assert.equal(countInvType(p.inv, 'wpn_lance_bois'), 1);
});

test('cancelCraftJob refunds waiting job ingredients', () => {
  const p = playerWithWood(10);
  const enq = craftQueue.enqueueCraft(p, 'wpn_lance_bois', ops, recipeMod);
  const cancel = craftQueue.cancelCraftJob(p, enq.job.id, ops, recipeMod);
  assert.equal(cancel.ok, true);
  assert.equal(p.craftQueue.length, 0);
  assert.equal(countInvType(p.inv, 'res_bois_brut'), 10);
});
