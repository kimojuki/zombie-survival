import { test } from 'node:test';

import assert from 'node:assert/strict';

import { readFileSync } from 'fs';

import { fileURLToPath } from 'url';

import { dirname, join } from 'path';

import vm from 'vm';

import {

  SURVIVOR_SHACK_ROOF,

  survivorShackRoofColliderDefs,

  survivorShackRoofPitch,

} from '../packages/shared/src/survivor-shack-roof.mjs';



const root = join(dirname(fileURLToPath(import.meta.url)), '..');



function loadDecorColliders() {

  const src = readFileSync(join(root, 'apps/client/public/js/decor_colliders.js'), 'utf8');

  const zs = {};

  vm.runInNewContext(src, { window: { ZS: zs }, ZS: zs, Math, console });

  return zs;

}



test('roof collider defs match shared geometry', () => {

  const shared = survivorShackRoofColliderDefs();

  const pitch = survivorShackRoofPitch();

  assert.equal(shared.length, 2);

  assert.ok(Math.abs(shared[0].rotX + pitch) < 0.001);

  assert.ok(Math.abs(shared[1].rotX - pitch) < 0.001);

  assert.equal(shared[0].lz, -SURVIVOR_SHACK_ROOF.halfRun * 0.5);

  assert.equal(shared[1].lz, SURVIVOR_SHACK_ROOF.halfRun * 0.5);

  assert.equal(shared[0].minY, SURVIVOR_SHACK_ROOF.colliderMinY);

});



test('shack has nine colliders with roof panels (pieces 1-7)', () => {

  const ZS = loadDecorColliders();

  const cols = ZS.buildDecorColliders({

    kind: 'prefab',

    prefabId: 'building_survivor_shack',

    x: 0,

    z: 0,

    baseY: 7,

    rotY: 0.55,

    scale: 1,

    decorId: 'shack_roof',

    doorOpen: false,

  });

  assert.equal(cols.length, 9);

  const roofs = cols.filter((c) => c.rotX);

  assert.equal(roofs.length, 2);

  assert.equal(roofs[0].minY, 7 + SURVIVOR_SHACK_ROOF.colliderMinY);

  assert.equal(roofs[0].maxY, 7 + SURVIVOR_SHACK_ROOF.colliderMaxY);

});

