import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import {
  survivorShackWallSouthColliderDefs,
  SURVIVOR_SHACK_WALL_SOUTH,
} from '../packages/shared/src/survivor-shack-wall-south.mjs';
import { decorLocalToWorld } from '../packages/shared/src/collider-resolve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadDecorColliders() {
  const src = readFileSync(join(root, 'apps/client/public/js/decor_colliders.js'), 'utf8');
  const zs = {};
  vm.runInNewContext(src, { window: { ZS: zs }, ZS: zs, Math, console });
  return zs;
}

test('south wall shared defs: two segments flanking door gap', () => {
  const defs = survivorShackWallSouthColliderDefs();
  assert.equal(defs.length, 2);
  assert.equal(defs[0].lz, SURVIVOR_SHACK_WALL_SOUTH.centerZ);
  assert.equal(defs[1].lz, SURVIVOR_SHACK_WALL_SOUTH.centerZ);
  assert.equal(defs[0].lx, -SURVIVOR_SHACK_WALL_SOUTH.segmentCenterX);
  assert.equal(defs[1].lx, SURVIVOR_SHACK_WALL_SOUTH.segmentCenterX);
  assert.equal(defs[0].hd, 0.22);
});

test('south wall colliders match shared and Three.js pivot', () => {
  const ZS = loadDecorColliders();
  const shared = survivorShackWallSouthColliderDefs();
  const cols = ZS.buildDecorColliders({
    kind: 'prefab',
    prefabId: 'building_survivor_shack',
    x: 12,
    z: -8,
    baseY: 5,
    rotY: 0.55,
    scale: 1,
    decorId: 'shack_s',
    doorOpen: false,
  });
  const south = cols.filter((c) => Math.abs(c.lz + 2.04) < 0.01);
  assert.equal(south.length, 2);
  for (let i = 0; i < 2; i++) {
    assert.equal(south[i].hd, shared[i].hd);
    assert.equal(south[i].lx, shared[i].lx);
    assert.equal(south[i].rotY, 0.55);
    assert.equal(south[i].cx, 12);
    assert.equal(south[i].cz, -8);
  }
  const col = { cx: 12, cz: -8, rotY: 0.55, baseY: 5 };
  const w = decorLocalToWorld(shared[0].lx, 0, shared[0].lz, col);
  const rotY = 0.55;
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  const lx = shared[0].lx;
  const lz = shared[0].lz;
  assert.ok(Math.abs(w.x - (12 + lx * c + lz * s)) < 0.001);
  assert.ok(Math.abs(w.z - (-8 - lx * s + lz * c)) < 0.001);
});
