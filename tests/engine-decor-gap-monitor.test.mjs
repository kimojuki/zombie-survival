import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDecorGapMonitor } from '../apps/client/src/engine/decor-gap-monitor.js';

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

test('decor-gap-start when idle with pending and low visible', () => {
  const { ZS, posts } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  for (let i = 0; i < 4; i++) {
    mon.tick(0.4, {
      px: 10, pz: 20, vx: 0, vz: 0,
      pendingNear: 5, pendingCritical: 0,
      visibleNear: 1, totalNear: 1,
    });
  }
  assert.ok(posts.some((p) => p.event === 'decor-gap-start'));
});

test('decor-gap-start on idle backlog (log prod case)', () => {
  const { ZS, posts } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  for (let i = 0; i < 4; i++) {
    mon.tick(0.4, {
      px: 74, pz: -52, vx: 0, vz: 0,
      pendingNear: 60, pendingCritical: 10,
      visibleNear: 55, totalNear: 55,
    });
  }
  const start = posts.find((p) => p.event === 'decor-gap-start');
  assert.ok(start);
  assert.equal(start.data.reason, 'idle-backlog');
});

test('decor-gap-start on forest hidden near', () => {
  const { ZS, posts } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  for (let i = 0; i < 4; i++) {
    mon.tick(0.4, {
      px: 50, pz: 50, vx: 0, vz: 0,
      pendingNear: 0, pendingCritical: 0,
      visibleNear: 20, totalNear: 20,
      forestHiddenNear: true,
    });
  }
  const start = posts.find((p) => p.event === 'decor-gap-start');
  assert.ok(start);
  assert.equal(start.data.reason, 'forest-chunk');
});

test('decor-gap-first-spawn then end', () => {
  const { ZS, posts } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  for (let i = 0; i < 4; i++) {
    mon.tick(0.4, {
      px: 0, pz: 0, vx: 0, vz: 0,
      pendingNear: 8, pendingCritical: 0,
      visibleNear: 0, totalNear: 0,
    });
  }
  mon.notifySpawn(5, 0, 'tree_a');
  mon.tick(0.4, {
    px: 0, pz: 0, vx: 0, vz: 0,
    pendingNear: 0, pendingCritical: 0,
    visibleNear: 10, totalNear: 10,
  });
  assert.ok(posts.some((p) => p.event === 'decor-gap-first-spawn'));
  assert.ok(posts.some((p) => p.event === 'decor-gap-end'));
  const end = posts.find((p) => p.event === 'decor-gap-end');
  assert.ok(end.data.gapMs >= 0);
  assert.equal(end.data.spawnsDuring, 1);
});

test('notifyGameReady logs decor-gap-game-ready', () => {
  const { ZS, posts } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  mon.notifyGameReady({ x: 1, z: 2, deferTotal: 270, nearDecor: 680 });
  assert.ok(posts.some((p) => p.event === 'decor-gap-game-ready'));
});

test('heartbeat after game ready', () => {
  const { ZS, posts } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  mon.notifyGameReady({ deferTotal: 100 });
  for (let i = 0; i < 80; i++) {
    mon.tick(0.04, { px: 0, pz: 0, vx: 0, vz: 0, deferPending: 100 });
  }
  assert.ok(posts.some((p) => p.event === 'decor-gap-heartbeat'));
});

test('decor-gap-start on travel-near-backlog', () => {
  const { ZS, posts } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  for (let i = 0; i < 4; i++) {
    mon.tick(0.4, {
      px: 141, pz: 12, vx: 2, vz: 0,
      pendingNear: 57, pendingCritical: 0,
      visibleNear: 80, totalNear: 80,
    });
  }
  const start = posts.find((p) => p.event === 'decor-gap-start');
  assert.ok(start);
  assert.equal(start.data.reason, 'travel-near-backlog');
});

test('gap does not resolve visible-filled while ring backlog remains', () => {
  const { ZS, posts } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  for (let i = 0; i < 4; i++) {
    mon.tick(0.4, {
      px: -10, pz: -69, vx: 0, vz: 0,
      pendingNear: 19, pendingCritical: 0,
      visibleNear: 5, totalNear: 5,
    });
  }
  mon.tick(0.4, {
    px: -10, pz: -69, vx: 0, vz: 0,
    pendingNear: 55, pendingCritical: 0,
    visibleNear: 40, totalNear: 40,
  });
  assert.ok(!posts.some((p) => p.event === 'decor-gap-end'));
});

test('decor-gap-start on travel-critical', () => {
  const { ZS, posts } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  for (let i = 0; i < 4; i++) {
    mon.tick(0.4, {
      px: 50, pz: -3, vx: 2, vz: 0,
      pendingNear: 40, pendingCritical: 30,
      visibleNear: 50, totalNear: 50,
    });
  }
  const start = posts.find((p) => p.event === 'decor-gap-start');
  assert.ok(start);
  assert.equal(start.data.reason, 'travel-critical');
});

test('notifyStreamQueued logs decor-demand-stream', () => {
  const { ZS, posts } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  mon.notifyStreamQueued(12, 100, 200, { pending: 50, lead: true, r: 400 });
  assert.equal(posts.length, 1);
  assert.equal(posts[0].event, 'decor-demand-stream');
  assert.equal(posts[0].data.queued, 12);
});

test('notifyStreamPaused logs decor-gap-stream-pause', () => {
  const { ZS, posts } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  mon.notifyStreamPaused('spawn-only', { pending: 55, activeGap: true });
  assert.equal(posts[0].event, 'decor-gap-stream-pause');
  assert.equal(posts[0].data.reason, 'spawn-only');
  assert.equal(posts[0].data.phase, 'start');
});

test('notifyStreamPaused throttles duplicate reason', () => {
  const { ZS, posts } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  mon.notifyStreamPaused('drain-first', { pending: 200 });
  mon.notifyStreamPaused('drain-first', { pending: 199 });
  mon.notifyStreamPaused('drain-first', { pending: 150 });
  assert.equal(posts.filter((p) => p.event === 'decor-gap-stream-pause').length, 1);
  mon.notifyStreamPaused('spawn-only', { pending: 50 });
  assert.ok(posts.some((p) => p.event === 'decor-gap-stream-resume'));
  assert.equal(posts.filter((p) => p.event === 'decor-gap-stream-pause').length, 2);
});

test('hasActiveGap tracks open gap', () => {
  const { ZS } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  assert.equal(mon.hasActiveGap(), false);
  for (let i = 0; i < 4; i++) {
    mon.tick(0.4, {
      px: 0, pz: 0, vx: 0, vz: 0,
      pendingNear: 12, pendingCritical: 0,
      visibleNear: 0, totalNear: 0,
    });
  }
  assert.equal(mon.hasActiveGap(), true);
});

test('hasEmergencyGap after 8s idle gap without spawns', () => {
  const { ZS } = mockZS();
  const mon = createDecorGapMonitor(ZS);
  mon.setEnabled(true);
  let t = 5000;
  const orig = performance.now;
  performance.now = () => t;
  try {
    for (let i = 0; i < 4; i++) {
      mon.tick(0.4, {
        px: 0, pz: 0, vx: 0, vz: 0,
        pendingNear: 12, pendingCritical: 0,
        visibleNear: 0, totalNear: 0,
      });
    }
    assert.equal(mon.hasEmergencyGap(), false);
    t += 8500;
    mon.tick(0.4, {
      px: 0, pz: 0, vx: 0, vz: 0,
      pendingNear: 12, pendingCritical: 0,
      visibleNear: 0, totalNear: 0,
    });
    assert.equal(mon.hasEmergencyGap(), true);
    mon.notifySpawn(5, 0, 'tree_a');
    assert.equal(mon.hasEmergencyGap(), false);
  } finally {
    performance.now = orig;
  }
});
