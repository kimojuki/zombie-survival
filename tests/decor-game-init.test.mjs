import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decorItemsForGameInit,
  decorItemsNearPlayer,
  decorPropsBeyond,
  decorTreesBeyond,
  gameInitDecorRadius,
  isCriticalPinnedDecorServer,
  isPinnedDecorServer,
} from '../apps/server/src/decor-game-init.js';

function decorMap(items) {
  return new Map(items.map((d) => [d.id, d]));
}

test('decorItemsForGameInit — pinned + proche seulement', () => {
  const map = decorMap([
    { id: 'r1', prefabId: 'rock_small', x: 10, z: 10 },
    { id: 'r2', prefabId: 'rock_small', x: 500, z: 500 },
    { id: 'c1', prefabId: 'storage_chest', x: 900, z: 900 },
    { id: 't1', prefabId: 'tree_oak', x: 20, z: 20 },
    { id: 't2', prefabId: 'tree_oak', x: 400, z: 400 },
  ]);
  const init = decorItemsForGameInit(map, 0, 0, 'desktop');
  const ids = init.map((d) => d.id).sort();
  assert.deepEqual(ids, ['c1', 'r1', 't1']);
});

test('decorPropsBeyond respecte minR élargi', () => {
  const map = decorMap([
    { id: 'r1', prefabId: 'rock_small', x: 10, z: 10 },
    { id: 'r2', prefabId: 'rock_small', x: 250, z: 0 },
    { id: 'r3', prefabId: 'rock_small', x: 350, z: 0 },
  ]);
  const far = decorPropsBeyond(map, 0, 0, 320).map((d) => d.id);
  assert.deepEqual(far, ['r3']);
});

test('decorTreesBeyond respecte minR', () => {
  const map = decorMap([
    { id: 't1', prefabId: 'tree_oak', x: 50, z: 0 },
    { id: 't2', prefabId: 'tree_oak', x: 250, z: 0 },
  ]);
  const far = decorTreesBeyond(map, 0, 0, 100).map((d) => d.id);
  assert.deepEqual(far, ['t2']);
});

test('decorPropsBeyond exclut arbres et épinglés', () => {
  const map = decorMap([
    { id: 'r1', prefabId: 'rock_small', x: 10, z: 10 },
    { id: 'r2', prefabId: 'rock_small', x: 400, z: 0 },
    { id: 'c1', prefabId: 'storage_chest', x: 500, z: 0 },
    { id: 't1', prefabId: 'tree_oak', x: 500, z: 0 },
  ]);
  const far = decorPropsBeyond(map, 0, 0, 180).map((d) => d.id);
  assert.deepEqual(far, ['r2']);
});

test('gameInitDecorRadius — desktop / mobile', () => {
  assert.equal(gameInitDecorRadius('desktop'), 320);
  assert.equal(gameInitDecorRadius('mobile'), 220);
});

test('isCriticalPinnedDecorServer — s01 seed lointain non critique', () => {
  assert.equal(isCriticalPinnedDecorServer({ prefabId: 'sign_wood', placementKey: 's01:trail:1' }), false);
  assert.equal(isCriticalPinnedDecorServer({ prefabId: 'tree_oak', placementKey: 's01:forest:1' }), false);
  assert.equal(isCriticalPinnedDecorServer({ prefabId: 'storage_chest', x: 0, z: 0 }), true);
  assert.equal(isCriticalPinnedDecorServer({ prefabId: 'build_floor_wood', x: 0, z: 0 }), true);
});

test('isPinnedDecorServer — alias critical', () => {
  assert.equal(isPinnedDecorServer({ prefabId: 'storage_chest' }), true);
  assert.equal(isPinnedDecorServer({ prefabId: 'sign_wood', placementKey: 's01:trail:1' }), false);
});

test('decorItemsNearPlayer — disque autour du joueur', () => {
  const map = decorMap([
    { id: 'r1', prefabId: 'rock_small', x: 10, z: 10 },
    { id: 'r2', prefabId: 'rock_small', x: 500, z: 500 },
    { id: 't1', prefabId: 'tree_oak', x: 480, z: 490 },
    { id: 'c1', prefabId: 'storage_chest', x: 510, z: 510 },
  ]);
  const near = decorItemsNearPlayer(map, 500, 500, 120).map((d) => d.id);
  assert.equal(near[0], 'r2');
  assert.equal(near.length, 3);
  const far = decorItemsNearPlayer(map, 500, 500, 5).map((d) => d.id);
  assert.deepEqual(far, ['r2']);
});

test('decorItemsForGameInit — s01 lointain exclu, proche inclus', () => {
  const map = decorMap([
    { id: 's1', prefabId: 'sign_wood', placementKey: 's01:trail:1', x: 500, z: 500 },
    { id: 's2', prefabId: 'sign_wood', placementKey: 's01:trail:2', x: 10, z: 10 },
    { id: 't1', prefabId: 'tree_oak', placementKey: 's01:forest:9', x: 800, z: 800 },
  ]);
  const init = decorItemsForGameInit(map, 0, 0, 'desktop');
  assert.deepEqual(init.map((d) => d.id).sort(), ['s2']);
});
