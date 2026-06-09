import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  decorForwardWorldXZ,
  decorRotYFaceTarget,
  formatDecorOrientationShort,
  getDecorPrefabOrientation,
} from '../packages/shared/src/decor-prefab-orientation.mjs';

describe('decor-prefab-orientation', () => {
  it('decorForwardWorldXZ — rotY 0 → devant −Z monde', () => {
    const f = decorForwardWorldXZ(0);
    assert.ok(Math.abs(f.x) < 1e-9);
    assert.ok(Math.abs(f.z + 1) < 1e-9);
  });

  it('decorRotYFaceTarget — devant pointe vers cible', () => {
    const x = 1, z = 1;
    const tx = 1, tz = 5;
    const rotY = decorRotYFaceTarget(x, z, tx, tz);
    const fwd = decorForwardWorldXZ(rotY);
    const dx = tx - x, dz = tz - z;
    const dot = (fwd.x * dx + fwd.z * dz) / Math.hypot(dx, dz);
    assert.ok(dot > 0.99);
  });

  it('getDecorPrefabOrientation — mobiliers cabane documentés', () => {
    for (const id of [
      'spawn_cabin_table', 'spawn_cabin_chair', 'spawn_cabin_shelf', 'spawn_cabin_stove',
      'spawn_cabin_lantern', 'spawn_cabin_wood_box', 'spawn_cabin_rug', 'spawn_cabin_bench',
      'spawn_cabin_basin',
    ]) {
      const o = getDecorPrefabOrientation(id);
      assert.equal(o.documented, true);
      assert.ok(o.summary.includes('Devant'));
    }
  });

  it('spawn_single_bed — tête +Z (exception convention)', () => {
    const o = getDecorPrefabOrientation('spawn_single_bed');
    assert.equal(o.forward, '+Z');
    assert.equal(o.back, '-Z');
  });

  it('prefab inconnu — fallback −Z', () => {
    const o = getDecorPrefabOrientation('brand_new_unknown_prefab');
    assert.equal(o.documented, false);
    assert.equal(o.forward, '-Z');
  });

  it('formatDecorOrientationShort', () => {
    const s = formatDecorOrientationShort(getDecorPrefabOrientation('spawn_cabin_chair'));
    assert.match(s, /Devant -Z/);
    assert.match(s, /Dos \+Z/);
  });
});
