import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLodGapMonitor } from '../apps/client/src/engine/lod-gap-monitor.js';

function mockZS() {
  const posts = [];
  return {
    posts,
    ZS: {
      LoadLog: {
        sinceStart: () => 1000,
        isEnabled: () => false,
        post: (event, data) => posts.push({ event, data }),
      },
    },
  };
}

test('lod-gap-start when urgent simpleLod near player', () => {
  const { ZS, posts } = mockZS();
  const mon = createLodGapMonitor(ZS);
  mon.setEnabled(true);
  for (let i = 0; i < 4; i++) {
    mon.tick(0.4, {
      px: 10, pz: 20, vx: 0, vz: 0,
      simpleLodUrgent: 6, simpleLodMid: 10, simpleLodNear: 12,
      simpleLodTotal: 80,
    });
  }
  const start = posts.find((p) => p.event === 'lod-gap-start');
  assert.ok(start);
  assert.equal(start.data.reason, 'urgent-many');
});

test('lod-gap-start when idle with urgent blocked upgrades', () => {
  const { ZS, posts } = mockZS();
  const mon = createLodGapMonitor(ZS);
  mon.setEnabled(true);
  for (let i = 0; i < 4; i++) {
    mon.tick(0.4, {
      px: 0, pz: 0, vx: 0, vz: 0,
      simpleLodUrgent: 4, simpleLodMid: 15,
      lodUpgradeBlocked: true,
      lodUpgradeBlockReason: 'defer-priority',
    });
  }
  const start = posts.find((p) => p.event === 'lod-gap-start');
  assert.ok(start);
  assert.equal(start.data.reason, 'idle-urgent-blocked');
});

test('lod-gap-first-upgrade then end', () => {
  const { ZS, posts } = mockZS();
  const mon = createLodGapMonitor(ZS);
  mon.setEnabled(true);
  for (let i = 0; i < 4; i++) {
    mon.tick(0.4, {
      px: 0, pz: 0, vx: 0, vz: 0,
      simpleLodUrgent: 8, simpleLodMid: 20, simpleLodNear: 25,
    });
  }
  mon.notifyLodUpgrade(5, 0, 'tree_1', { lodMs: 42 });
  mon.notifyLodUpgrade(6, 0, 'tree_2', { lodMs: 38 });
  mon.notifyLodUpgrade(7, 0, 'tree_3', { lodMs: 35 });
  mon.tick(0.4, {
    px: 0, pz: 0, vx: 0, vz: 0,
    simpleLodUrgent: 1, simpleLodMid: 6, simpleLodNear: 8,
  });
  assert.ok(posts.some((p) => p.event === 'lod-gap-first-upgrade'));
  assert.ok(posts.some((p) => p.event === 'lod-gap-end'));
});

test('lod-gap-spawn-simple logged on notify', () => {
  const { ZS, posts } = mockZS();
  const mon = createLodGapMonitor(ZS);
  mon.setEnabled(true);
  mon.notifySimpleLodSpawn(12, 34, 'tree_x', { ring: 'mid' });
  assert.ok(posts.some((p) => p.event === 'lod-gap-spawn-simple'));
});

test('lod-gap disabled via setEnabled', () => {
  const { ZS, posts } = mockZS();
  const mon = createLodGapMonitor(ZS);
  mon.setEnabled(false);
  posts.length = 0;
  for (let i = 0; i < 4; i++) {
    mon.tick(0.4, {
      px: 0, pz: 0, vx: 0, vz: 0,
      simpleLodUrgent: 10, simpleLodMid: 30,
    });
  }
  assert.equal(posts.filter((p) => p.event.startsWith('lod-gap-')).length, 0);
});

test('lod-gap dump returns stats', () => {
  const { ZS } = mockZS();
  const mon = createLodGapMonitor(ZS);
  mon.setEnabled(true);
  mon.tick(0.4, {
    px: 0, pz: 0, vx: 0, vz: 0,
    simpleLodUrgent: 5, simpleLodMid: 12,
  });
  const stats = mon.dump();
  assert.equal(stats.enabled, true);
  assert.ok(stats.urgentR === 64);
});
