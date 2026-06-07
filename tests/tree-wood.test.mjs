import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getChopWoodYield,
  getTreeWoodMax,
  TREE_WOOD_STOCK,
  TREE_FALL_LINGER_MS,
} from '../packages/shared/src/tree-wood.mjs';

test('tree prefabs expose wood stock', () => {
  assert.equal(getTreeWoodMax('tree_oak'), TREE_WOOD_STOCK.tree_oak);
  assert.equal(getTreeWoodMax('tree_pine'), 10);
  assert.equal(getTreeWoodMax('tree_palm'), 6);
  assert.equal(getTreeWoodMax('tree_unknown'), 6);
});

test('chop yield scales by tool', () => {
  assert.equal(getChopWoodYield('tool_caillou'), 1);
  assert.equal(getChopWoodYield('tool_hachette'), 2);
  assert.equal(getChopWoodYield('wpn_hache_combat'), 1);
  assert.equal(getChopWoodYield('tool_pioche', 3), 2);
});

test('fall linger is long enough to loot trunk', () => {
  assert.ok(TREE_FALL_LINGER_MS >= 60_000);
});

