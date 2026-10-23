import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  buildVerdict,
  buildScore,
  compareBenchReports,
  meshVisibleRatio,
  numStats,
  SOCKET_CLIENT_MOVE,
} from '../tools/bench-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('load-bench émet move (client→serveur), pas player-move', async () => {
  const src = await readFile(join(root, 'tools/load-bench.mjs'), 'utf8');
  assert.match(src, /SOCKET_CLIENT_MOVE/);
  assert.match(src, /\.emit\(SOCKET_CLIENT_MOVE,/);
  assert.doesNotMatch(src, /\.emit\(['"]player-move['"]/);
});

test('bench-real émet move pour les bots socket', async () => {
  const src = await readFile(join(root, 'tools/bench-real.mjs'), 'utf8');
  assert.match(src, /\.emit\(SOCKET_CLIENT_MOVE,/);
  assert.doesNotMatch(src, /\.emit\(['"]player-move['"]/);
});

test('bench-real — spawn wait + marche + verdict', async () => {
  const src = await readFile(join(root, 'tools/bench-real.mjs'), 'utf8');
  assert.match(src, /bench=1/);
  assert.match(src, /waitSpawnReady/);
  assert.match(src, /buildVerdict/);
  assert.match(src, /HealthSampler/);
  assert.match(src, /preflightBench/);
});

test('bench-lib numStats', () => {
  const s = numStats([10, 20, 30, 40, 50]);
  assert.equal(s.min, 10);
  assert.equal(s.max, 50);
  assert.equal(s.avg, 30);
  assert.equal(s.p50, 30);
});

test('bench-lib buildVerdict — pass et fail', () => {
  const pass = buildVerdict({
    socket: { attempted: 10, connected: 10, gameInit: { msP95: 1000 } },
    browsers: {
      count: 2,
      fpsWalk: { min: 25 },
      spawnReadyMs: { p95: 50000 },
      clients: [{ walkDistanceM: 15 }, { walkDistanceM: 12 }],
    },
  }, { minFpsWalk: 15, maxInitP95Ms: 5000, maxSpawnReadyMs: 120000, minSocketSuccess: 0.95, minWalkM: 8 });
  assert.equal(pass.pass, true);

  const fail = buildVerdict({
    browsers: {
      count: 1,
      fpsWalk: { min: 10 },
      spawnReadyMs: { p95: 5000 },
      clients: [{ walkDistanceM: 2 }],
    },
  }, { minFpsWalk: 15, maxInitP95Ms: 5000, maxSpawnReadyMs: 120000, minSocketSuccess: 0.95, minWalkM: 8 });
  assert.equal(fail.pass, false);
  assert.ok(fail.reasons.length >= 2);
});

test('bench-real utilise marche forêt bench (worldDir + noclip)', async () => {
  const src = await readFile(join(root, 'tools/bench-real.mjs'), 'utf8');
  assert.match(src, /worldDir/);
  assert.match(src, /noclip:\s*true/);
  assert.match(src, /formatBenchMarkdown/);
  assert.match(src, /latest\.md/);
});

test('game.js supporte worldDir + noclip bench', async () => {
  const src = await readFile(join(root, 'apps/client/public/js/game.js'), 'utf8');
  assert.match(src, /worldDir/);
  assert.match(src, /benchNoclip/);
});

test('bench-lib buildScore', () => {
  const score = buildScore({
    socket: { successRate: 100, gameInit: { p95: 200 } },
    browsers: {
      count: 2,
      fpsWalk: { p50: 18 },
      spawnReadyMs: { p50: 70000 },
      syncDecorMs: { p50: 30000 },
      drawCallsWalkAvg: 2800,
      walkDistanceAvgM: 42,
    },
  });
  assert.ok(score.realisticBrowserPlayers >= 12);
  assert.ok(score.realisticSocketBots >= 50);
});

test('bench-lib compareBenchReports détecte régression spawn', () => {
  const prev = {
    capturedAt: '2026-06-08T10:00:00.000Z',
    browsers: { spawnReadyMs: { p50: 40000 }, syncDecorMs: { p50: 20000 }, fpsWalk: { p50: 20 }, drawCallsWalkAvg: 3000, meshVisibleRatioAvg: 0.45 },
    socket: { gameInit: { p95: 100 } },
  };
  const curr = {
    capturedAt: '2026-06-09T10:00:00.000Z',
    browsers: { spawnReadyMs: { p50: 60000 }, syncDecorMs: { p50: 22000 }, fpsWalk: { p50: 19 }, drawCallsWalkAvg: 3100, meshVisibleRatioAvg: 0.48 },
    socket: { gameInit: { p95: 110 } },
  };
  const cmp = compareBenchReports(prev, curr);
  assert.equal(cmp.hasPrevious, true);
  assert.ok(cmp.regressions.some((r) => r.includes('spawn')));
});

test('bench-lib meshVisibleRatio', () => {
  assert.equal(meshVisibleRatio({ scene: { meshes: 1000, meshVisible: 400 } }), 0.4);
  assert.equal(meshVisibleRatio(null), null);
});

test('bench-real sauvegarde history/', async () => {
  const src = await readFile(join(root, 'tools/bench-real.mjs'), 'utf8');
  assert.match(src, /historyDir/);
  assert.match(src, /compareBenchReports/);
  assert.match(src, /meshVisibleRatioAvg/);
});
