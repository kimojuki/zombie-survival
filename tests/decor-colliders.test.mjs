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
