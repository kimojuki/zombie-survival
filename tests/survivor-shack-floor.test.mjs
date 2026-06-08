import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import {
  SURVIVOR_SHACK_FLOOR,
  survivorShackFloorColliderDef,
} from '../packages/shared/src/survivor-shack-floor.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadDecorColliders() {
  const src = readFileSync(join(root, 'apps/client/public/js/decor_colliders.js'), 'utf8');
  const zs = {};
  vm.runInNewContext(src, { window: { ZS: zs }, ZS: zs, Math, console });
  return zs;
}

test('shared floor def matches building_survivor_shack collider', () => {
  const ZS = loadDecorColliders();
  const shared = survivorShackFloorColliderDef();
  const cols = ZS.buildDecorColliders({
    kind: 'prefab',
    prefabId: 'building_survivor_shack',
    x: 165.1,
    z: 7.1,
    baseY: 7.1,
    rotY: 0.55,
    scale: 1,
    decorId: 'shack_a',
    doorOpen: false,
  });
  const col = cols.find((c) => c.lz === 0 && c.hd > 2);
  assert.ok(col);
  assert.equal(col.hw, shared.hw);
  assert.equal(col.hd, shared.hd);
  assert.equal(col.minY, 7.1);
  assert.equal(col.maxY, 7.1 + SURVIVOR_SHACK_FLOOR.topY);
  assert.equal(col.cx, 165.1);
  assert.equal(col.cz, 7.1);
});

test('floor collider is identical for any spawn position', () => {
  const ZS = loadDecorColliders();
  const spec = (x, z, rotY) => ZS.buildDecorColliders({
    kind: 'prefab',
    prefabId: 'building_survivor_shack',
    x,
    z,
    baseY: 3,
    rotY,
    scale: 1,
    decorId: 'x',
    doorOpen: false,
  })[0];
  const a = spec(10, -5, 0);
  const b = spec(-88, 42, 2.1);
  assert.equal(a.hw, b.hw);
  assert.equal(a.hd, b.hd);
  assert.equal(a.lx, 0);
  assert.equal(a.lz, 0);
  assert.notEqual(a.cx, b.cx);
});
