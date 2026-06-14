import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHUNK_SIZE,
  chunkKeyFromWorld,
  chunkKeysInRadius,
  chunkCenterFromKey,
} from '../apps/client/src/engine/spatial-chunk-keys.js';
import { createSpatialChunkStreamer } from '../apps/client/src/engine/spatial-chunk-streamer.js';

test('chunkKeyFromWorld 64m grid', () => {
  assert.equal(chunkKeyFromWorld(0, 0), '0,0');
  assert.equal(chunkKeyFromWorld(63, 63), '0,0');
  assert.equal(chunkKeyFromWorld(64, 0), '1,0');
});

test('chunkCenterFromKey', () => {
  const c = chunkCenterFromKey('1,0', 64);
  assert.equal(c.x, 96);
  assert.equal(c.z, 32);
});

test('chunkKeysInRadius includes center cell', () => {
  const keys = chunkKeysInRadius(100, 100, 80, 64);
  assert.ok(keys.includes(chunkKeyFromWorld(100, 100, 64)));
});

test('ChunkStreamer tick shows near hides far', () => {
  const streamer = createSpatialChunkStreamer({ chunkSize: 64, strideMod: 1 });
  const near = { visible: false, cx: 32, cz: 32, group: { visible: false } };
  const far = { visible: true, cx: 400, cz: 400, group: { visible: true } };
  streamer.registerLayer('test', { chunkSize: 64 });
  streamer.registerChunk('test', '0,0', near);
  streamer.registerChunk('test', '6,6', far);

  const stats = streamer.tick(32, 32, 8);
  assert.equal(near.group.visible, true);
  assert.equal(far.group.visible, false);
  assert.ok(stats.shown >= 1);
  assert.ok(stats.hidden >= 1);
});

test('ChunkStreamer skips tick when barely moved', () => {
  const streamer = createSpatialChunkStreamer({ strideMod: 6 });
  streamer.registerLayer('test');
  streamer.registerChunk('test', '0,0', { cx: 32, cz: 32, group: { visible: true } });
  streamer.tick(10, 10, 2);
  const second = streamer.tick(10.5, 10.5, 2);
  assert.equal(second.skipped, true);
});

test('prefetchKeysNear returns keys within NEAR ring', () => {
  const streamer = createSpatialChunkStreamer();
  const keys = streamer.prefetchKeysNear(0, 0, 64);
  assert.ok(keys.length >= 1);
  assert.ok(keys.includes('0,0'));
});

test('CHUNK_SIZE is 64', () => {
  assert.equal(CHUNK_SIZE, 64);
});
