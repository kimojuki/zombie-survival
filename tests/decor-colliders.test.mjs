import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'apps/client/public/js/decor_colliders.js'), 'utf8');

function loadDecorColliders() {
  const zs = {};
  const sandbox = { window: { ZS: zs }, ZS: zs, Math, console };
  vm.runInNewContext(src, sandbox);
  return sandbox.ZS;
}

test('buildDecorColliders rotates and scales prefab box', () => {
  const ZS = loadDecorColliders();
  const cols = ZS.buildDecorColliders({
    kind: 'prefab',
    prefabId: 'spawn_supply_crate',
    x: 10,
    z: -5,
    baseY: 1.2,
    rotY: Math.PI / 2,
    scale: 1.5,
    decorId: 'decor_test',
  });
  assert.equal(cols.length, 1);
  assert.equal(cols[0].type, 'box');
  assert.ok(cols[0].hw > 0.5);
  assert.ok(cols[0].maxY > 1.2);
  assert.equal(cols[0].decorId, 'decor_test');
});

test('marker poles have cylindrical colliders', () => {
  const ZS = loadDecorColliders();
  const cols = ZS.buildDecorColliders({ kind: 'prefab', prefabId: 'spawn_marker_left', x: 0, z: 0, baseY: 0 });
  assert.equal(cols.length, 1);
  assert.ok(cols[0].r >= 0.1);
  assert.equal(cols[0].topY, undefined);
});

test('border log prefab has oriented box collider', () => {
  const ZS = loadDecorColliders();
  const cols = ZS.buildDecorColliders({
    kind: 'prefab',
    prefabId: 'spawn_border_log',
    x: 1,
    z: -6,
    baseY: 0.1,
    rotY: 0.5,
    scale: 1.1,
    decorId: 'decor_log',
  });
  assert.equal(cols.length, 1);
  assert.equal(cols[0].type, 'box');
  assert.ok(cols[0].hw > 0.2);
  assert.equal(cols[0].rotY, 0.5);
});

test('wreck colliders match body + cabin compound boxes', () => {
  const ZS = loadDecorColliders();
  const baseY = -7.25;
  const cols = ZS.buildDecorColliders({
    kind: 'prefab',
    prefabId: 'wreck_sedan',
    x: -18,
    z: -37,
    baseY,
    rotY: -1.1,
    rotZ: 0.12,
    scale: 1,
    wreckTilt: 0.12,
    decorId: 'decor_wreck',
  });
  assert.equal(cols.length, 2);
  assert.equal(cols[0].cx, -18);
  assert.equal(cols[0].cz, -37);
  assert.equal(cols[0].lx, 0);
  assert.equal(cols[0].rotZ, 0.12);
  assert.equal(cols[0].hw, 0.89);
  assert.equal(cols[0].hd, 2.05);
  assert.equal(cols[1].lz, -0.18);
  assert.ok(cols[0].maxY > baseY + 0.9);
  assert.ok(cols[1].maxY > cols[0].maxY);
});

test('survivor shack door collider toggles with door state', () => {
  const ZS = loadDecorColliders();
  const closed = ZS.buildDecorColliders({
    kind: 'prefab',
    prefabId: 'building_survivor_shack',
    x: 0,
    z: 0,
    baseY: 0,
    rotY: 0,
    scale: 1,
    decorId: 'decor_shack',
    doorOpen: false,
  });
  const open = ZS.buildDecorColliders({
    kind: 'prefab',
    prefabId: 'building_survivor_shack',
    x: 0,
    z: 0,
    baseY: 0,
    rotY: 0,
    scale: 1,
    decorId: 'decor_shack',
    doorOpen: true,
  });
  assert.equal(closed.length, open.length + 1);
  assert.ok(closed.some((c) => c.cz < -2.05 && c.hw > 0.55 && c.hw < 0.7));
  assert.equal(open.some((c) => c.cz < -2.05 && c.hw > 0.55), false);
});

test('barrier rail uses segment collider between posts', () => {
  const ZS = loadDecorColliders();
  const cols = ZS.buildDecorColliders({
    kind: 'prefab',
    prefabId: 'road_barrier_rail',
    x: 0,
    z: 0,
    baseY: 1,
    decorId: 'rb_rail_1',
    railSeg: { x0: -2, z0: 5, x1: 2, z1: 5 },
  });
  assert.equal(cols.length, 1);
  assert.equal(cols[0].type, 'seg');
  assert.equal(cols[0].x0, -2);
  assert.equal(cols[0].x1, 2);
  assert.equal(cols[0].r, 0.14);
});

test('storage chest prefab has a blocking box collider', () => {
  const ZS = loadDecorColliders();
  const cols = ZS.buildDecorColliders({
    kind: 'prefab',
    prefabId: 'storage_chest',
    x: 3,
    z: -4,
    baseY: 0.2,
    rotY: 0.4,
    scale: 1,
    decorId: 'decor_chest',
  });
  assert.equal(cols.length, 1);
  assert.equal(cols[0].type, 'box');
  assert.equal(cols[0].decorId, 'decor_chest');
  assert.ok(cols[0].maxY > 0.7);
});

test('unknown item type falls back to default collider', () => {
  const ZS = loadDecorColliders();
  const cols = ZS.buildDecorColliders({
    kind: 'item',
    type: 'eq_casque',
    x: 0,
    z: 0,
    baseY: 0,
  });
  assert.equal(cols.length, 1);
  assert.equal(cols[0].type, 'box');
});
