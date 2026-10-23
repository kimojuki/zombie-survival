import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sampleSurvivorShackPadHeight,
  survivorShackLocalToWorldXZ,
  survivorShackPadSampleLocals,
} from '../packages/shared/src/survivor-shack-pad.mjs';

test('pad samples five corners including center', () => {
  assert.equal(survivorShackPadSampleLocals().length, 5);
});

test('sampleSurvivorShackPadHeight uses max terrain under footprint', () => {
  const heights = new Map();
  const rotY = 0.55;
  for (const [lx, lz] of survivorShackPadSampleLocals()) {
    const { x, z } = survivorShackLocalToWorldXZ(10, 20, rotY, lx, lz);
    heights.set(`${x.toFixed(3)},${z.toFixed(3)}`, 7 + lx * 0.1);
  }
  const h = sampleSurvivorShackPadHeight(10, 20, rotY, (wx, wz) => {
    const key = `${wx.toFixed(3)},${wz.toFixed(3)}`;
    return heights.get(key) ?? 7;
  });
  assert.ok(h >= 7.2);
});
