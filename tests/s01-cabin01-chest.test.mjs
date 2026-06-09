import { test } from 'node:test';

import assert from 'node:assert/strict';

import { decorLocalToWorld } from '../packages/shared/src/collider-resolve.mjs';

import {

  S01_CABIN01_CHEST_LOCAL,

  cabin01ChestFaceDoorRotY,

  cabin01ChestWorldXZ,

} from '../packages/shared/src/s01-cabin01-chest.mjs';

import { S01_CABIN01_PROTO } from '../packages/shared/src/s01-poi.mjs';

import { SURVIVOR_SHACK_DOOR } from '../packages/shared/src/survivor-shack-door.mjs';

import { computeS01DecorPlacements, S01_CABIN_CHEST_LOOT } from '../packages/shared/src/s01-world-placements.mjs';



function _chestForwardXZ(rotY) {

  return { x: -Math.sin(rotY), z: -Math.cos(rotY) };

}



test('cabin01 chest sits in NE corner without penetrating walls', () => {
  const { lx, lz } = S01_CABIN01_CHEST_LOCAL;
  const innerEast = 2.54 - 0.22;
  const innerNorth = 2.04 - 0.22;
  assert.ok(lx > 0, 'east side of shack');
  assert.ok(lz > 0, 'north interior');
  assert.ok(lx + 0.58 <= innerEast + 0.001, 'clear of east wall');
  assert.ok(lz + 0.36 <= innerNorth + 0.001, 'clear of north wall');
});



test('cabin01 chest rotY faces shack door (Three.js −Z forward)', () => {

  const s = S01_CABIN01_PROTO;

  const anchor = { cx: s.x, cz: s.z, rotY: s.rotY };

  const chest = decorLocalToWorld(S01_CABIN01_CHEST_LOCAL.lx, 0, S01_CABIN01_CHEST_LOCAL.lz, anchor);

  const door = decorLocalToWorld(0, 0, SURVIVOR_SHACK_DOOR.pivotZ, anchor);

  const dx = door.x - chest.x;

  const dz = door.z - chest.z;

  const len = Math.hypot(dx, dz);

  const rotY = cabin01ChestFaceDoorRotY();

  const fwd = _chestForwardXZ(rotY);

  const dot = (fwd.x * dx + fwd.z * dz) / len;

  assert.ok(dot > 0.99, `chest should face door, dot=${dot}`);

  assert.ok(Math.abs(rotY - (Math.PI + s.rotY)) > 0.5, 'must not face north wall (shack+PI)');

});



test('seed includes shack + chest with loot and floor anchor', () => {

  const placements = computeS01DecorPlacements();

  assert.equal(placements.length, 3);

  const chest = placements.find((p) => p.placementKey === 's01:cabin01:chest');

  assert.ok(chest);

  assert.equal(chest.prefabId, 'storage_chest');

  assert.equal(chest.storage.length, S01_CABIN_CHEST_LOOT.length);

  assert.equal(chest.shackFloorY, 0.12);

  assert.equal(chest.shackAnchor.x, 165.1);

  const w = cabin01ChestWorldXZ();

  assert.ok(Math.abs(chest.x - w.x) < 0.001);

  assert.ok(Math.abs(chest.z - w.z) < 0.001);

  assert.ok(Math.abs(chest.rotY - w.rotY) < 0.001);

  assert.ok(Math.abs(chest.rotY - Math.PI - S01_CABIN01_PROTO.rotY) > 0.5, 'must not be shack+PI');

});

