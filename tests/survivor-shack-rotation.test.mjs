import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decorLocalToWorld } from '../packages/shared/src/collider-resolve.mjs';
import { survivorShackLocalToWorldXZ } from '../packages/shared/src/survivor-shack-pad.mjs';

test('shack pad and collider rotation use same Three.js convention', () => {
  const x = 165.1;
  const z = 7.1;
  const rotY = 0.55;
  const lx = 0;
  const lz = 2.04;
  const pad = survivorShackLocalToWorldXZ(x, z, rotY, lx, lz);
  const col = decorLocalToWorld(lx, 0, lz, { cx: x, cz: z, rotY, baseY: 0 });
  assert.ok(Math.abs(pad.x - col.x) < 0.001);
  assert.ok(Math.abs(pad.z - col.z) < 0.001);
});
