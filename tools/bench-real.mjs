/**
 * Benchmark réaliste — clients Chromium (Three.js) + charge socket concurrente.
 *
 * Prérequis : serveur local SQLite + PERF_LOCAL_BENCH=1
 *
 * Usage :
 *   npm run test:bench
 *   npm run test:bench:quick     — 2 clients, 10 bots, ~45 s
 *   BENCH_CLIENTS=5 BENCH_SOCKET=40 BENCH_HEADED=1 npm run test:bench
 *
 * Sortie : notes-local/bench-real/latest.json
 */
import { chromium } from 'playwright';
import { copyFile, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { io } from 'socket.io-client';
import {
  baseUrl,
  benchToken,
  avgMeshVisibleRatio,
  buildVerdict,
  buildScore,
  compareBenchReports,
  fetchDecorPages,
  fetchHealth,
  formatBenchMarkdown,
  HealthSampler,
  loadPreviousBenchReport,
  numStats,
  preflightBench,
  rootDir,
  sleep,
  SOCKET_CLIENT_MOVE,
  warnBenchEnv,
} from './bench-lib.mjs';

const outDir = join(rootDir, 'notes-local', 'bench-real');
const historyDir = join(outDir, 'history');

const quickMode = process.env.BENCH_QUICK === '1'
  || process.argv.includes('--quick')
  || process.env.npm_lifecycle_event === 'test:bench:quick';

const clientCount = Math.min(12, Math.max(0, parseInt(
  process.env.BENCH_CLIENTS ?? (quickMode ? '2' : '3'), 10,
)));
const clientRamp = Math.max(1, parseInt(process.env.BENCH_CLIENT_RAMP ?? '1', 10));
const clientParallel = process.env.BENCH_CLIENT_PARALLEL != null
  ? process.env.BENCH_CLIENT_PARALLEL !== '0'
  : !quickMode;
const clientSlotBase = parseInt(process.env.BENCH_CLIENT_SLOT ?? '900', 10);
const walkMs = Number(process.env.BENCH_WALK_MS || (quickMode ? 10000 : 15000));
const settleMs = Number(process.env.BENCH_SETTLE_MS || (quickMode ? 4000 : 6000));
const fpsSampleMs = Number(process.env.BENCH_FPS_SAMPLE_MS || 2000);
const headless = process.env.BENCH_HEADED !== '1';
const viewportW = parseInt(process.env.BENCH_WIDTH || '1280', 10);
const viewportH = parseInt(process.env.BENCH_HEIGHT || '720', 10);

const socketCount = Math.min(300, Math.max(0, parseInt(
  process.env.BENCH_SOCKET ?? (quickMode ? '10' : '25'), 10,
)));
const socketRamp = Math.max(1, parseInt(process.env.BENCH_SOCKET_RAMP ?? '5', 10));
const socketHoldMs = Number(process.env.BENCH_SOCKET_HOLD_MS || 0);
const socketMoveMs = Number(process.env.BENCH_SOCKET_MOVE_MS || 2000);
const connectTimeoutMs = Number(process.env.BENCH_CONNECT_MS || (quickMode ? 240000 : 180000));
const overlapMode = process.env.BENCH_OVERLAP === '1';

const thresholds = {
  minFpsWalk: Number(process.env.BENCH_MIN_FPS ?? (quickMode ? 0 : 15)),
  maxInitP95Ms: Number(process.env.BENCH_MAX_INIT_MS || (quickMode ? 8000 : 5000)),
  maxSpawnReadyMs: Number(process.env.BENCH_MAX_SPAWN_MS || 120000),
  minSocketSuccess: Number(process.env.BENCH_MIN_SOCKET_OK || 0.95),
  minWalkM: Number(process.env.BENCH_MIN_WALK_M ?? (quickMode ? 5 : 8)),
};

function compactSnapshot(snap) {
  if (!snap) return null;
  return {
    label: snap.label,
    client: snap.client,
    position: snap.position,
    tier: snap.tier,
    render: snap.render,
    fps: snap.fps,
    scene: snap.scene ? {
      meshes: snap.scene.meshes,
      meshVisible: snap.scene.meshVisible,
      instancedMeshes: snap.scene.instancedMeshes,
      forestDecorMeshes: snap.scene.forestDecorMeshes,
      forestDecorInstanced: snap.scene.forestDecorInstanced,
      decorItems: snap.scene.decorItems,
    } : null,
  };
}

function parseSyncConsole(text, state) {
  let m = /\[sync\] décor (\d+) \/ (\d+) (\d+) ms/.exec(text);
  if (m) {
    state.syncDecorNear = Number(m[1]);
    state.syncDecorTotal = Number(m[2]);
    state.syncDecorMs = Number(m[3]);
  }
  m = /\[sync\] décor (\d+) \/ (\d+) (\d+) ms \(\+(\d+) différés\)/.exec(text);
  if (m) {
    state.syncDecorDeferred = Number(m[4]);
  }
  m = /\[sync\] game-init total (\d+) ms/.exec(text);
  if (m) state.gameInitTotalMs = Number(m[1]);
  m = /\[sync\] colliders (\d+) ms/.exec(text);
  if (m) state.syncCollidersMs = Number(m[1]);
  m = /collisions décor/.exec(text);
  if (m) state.colliderPhase = true;
}

async function waitSpawnReady(page, label) {
  let lastLog = 0;
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[sync] game-init total') || t.includes('game-init-done')) {
      console.log(`[bench-real] ${label}`, t.slice(0, 120));
    }
  });

  const deadline = Date.now() + connectTimeoutMs;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => ({
      spawnReady: !!window.ZS?.Network?.isSpawnReady?.(),
      loading: !!window.ZS?.Loading?.isActive?.(),
    })).catch(() => null);
    if (state?.spawnReady) return;
    const now = Date.now();
    if (now - lastLog > 15000) {
      console.log(`[bench-real] ${label} attente spawn…`, state);
      lastLog = now;
    }
    await sleep(1000);
  }

  const debug = await page.evaluate(() => ({
    spawnReady: !!window.ZS?.Network?.isSpawnReady?.(),
    loading: !!window.ZS?.Loading?.isActive?.(),
    hasScene: !!window.ZS?._gfxRuntime?.scene,
    username: localStorage.getItem('zombie_username'),
  })).catch(() => ({}));
  throw new Error(`${label} spawn timeout — ${JSON.stringify(debug)}`);
}

async function readPlayerPos(page) {
  return page.evaluate(() => {
    const lp = window.ZS?.Network?.getLocalXZ?.();
    if (lp && Number.isFinite(lp.x)) return { x: lp.x, z: lp.z };
    const cam = window.ZS?._gfxRuntime?.camera;
    if (cam) return { x: cam.position.x, z: cam.position.z };
    return null;
  });
}

async function sampleFps(page) {
  return page.evaluate(() => {
    const s = window.ZS?.perfSnapshot?.({ label: 'bench-sample', traverse: false });
    return s?.fps?.fps ?? null;
  });
}

async function connectSocketBot(slot) {
  const t0 = performance.now();
  const auth = await benchToken(slot);
  const socket = io(baseUrl, {
    auth: { token: auth.token, client: 'desktop' },
    transports: ['websocket'],
    reconnection: false,
    timeout: connectTimeoutMs,
  });

  return new Promise((resolve) => {
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ slot, username: auth.username, socket, ...result });
    };

    const timer = setTimeout(() => {
      socket.disconnect();
      finish({ ok: false, phase: 'timeout', ms: Math.round(performance.now() - t0) });
    }, connectTimeoutMs);

    socket.on('connect_error', (err) => {
      socket.disconnect();
      finish({ ok: false, phase: 'connect_error', error: err.message, ms: Math.round(performance.now() - t0) });
    });

    socket.once('game-init', (payload) => {
      finish({
        ok: true,
        phase: 'game-init',
        ms: Math.round(performance.now() - t0),
        payloadBytes: JSON.stringify(payload).length,
        decorN: payload?.decorItems?.length ?? 0,
        onlineCount: payload?.onlineCount,
      });
    });
  });
}

async function runSocketBackground(count, ramp) {
  const results = [];
  const live = [];
  for (let i = 0; i < count; i += ramp) {
    const batch = [];
    for (let s = i; s < Math.min(count, i + ramp); s++) batch.push(s);
    const batchResults = await Promise.all(batch.map((slot) => connectSocketBot(slot)));
    for (const r of batchResults) {
      results.push(r);
      if (r.ok && r.socket) live.push(r);
    }
    const ok = results.filter((x) => x.ok).length;
    console.log(`[bench-real] socket ${ok}/${results.length}`);
    await sleep(200);
  }
  return { live, results };
}

function tickSocketBots(live) {
  const t = Date.now() / 1000;
  for (const bot of live) {
    if (!bot.socket?.connected) continue;
    const angle = bot.slot * 0.41 + t * 0.85;
    const r = 8 + (bot.slot % 12) * 3.5;
    bot.socket.emit(SOCKET_CLIENT_MOVE, {
      x: 200 + Math.cos(angle) * r,
      y: 5,
      z: 80 + Math.sin(angle) * r,
      rotY: angle,
      crouch: false,
    });
  }
}

async function runBrowserClient(browser, slot) {
  const benchSlot = clientSlotBase + slot * 37;
  const auth = await benchToken(benchSlot);
  const context = await browser.newContext({
    viewport: { width: viewportW, height: viewportH },
  });

  await context.addInitScript(({ token, username }) => {
    localStorage.setItem('zombie_token', token);
    localStorage.setItem('zombie_username', username);
    localStorage.setItem('zs_dev_log', '1');
  }, { token: auth.token, username: auth.username });

  const page = await context.newPage();
  page.setDefaultTimeout(connectTimeoutMs);

  const syncState = {
    syncDecorMs: null,
    syncDecorNear: null,
    syncDecorTotal: null,
    syncDecorDeferred: null,
    syncCollidersMs: null,
    gameInitTotalMs: null,
    colliderPhase: false,
  };
  page.on('console', (msg) => parseSyncConsole(msg.text(), syncState));

  const t0 = performance.now();
  const gameUrl = `${baseUrl}/game.html?devlog=1&bench=1`;
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded', timeout: connectTimeoutMs });

  await waitSpawnReady(page, `client ${slot}`);

  const spawnReadyMs = Math.round(performance.now() - t0);

  if (settleMs > 0) await page.waitForTimeout(settleMs);

  const snapshotIdle = compactSnapshot(await page.evaluate(() => {
    return window.ZS.perfSnapshot({ label: 'bench-idle', traverse: true });
  }));

  const posBefore = await readPlayerPos(page);

  const walkPromise = page.evaluate(({ durationMs }) => {
    window.__zsBenchMove = {
      worldDir: { x: -1, z: -0.12 },
      noclip: true,
      sprint: true,
    };
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => {
        if (performance.now() - t0 >= durationMs) {
          window.__zsBenchMove = null;
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { durationMs: walkMs });

  const fpsDuringWalk = [];
  const fpsEnd = Date.now() + walkMs;
  while (Date.now() < fpsEnd) {
    await sleep(Math.min(fpsSampleMs, Math.max(0, fpsEnd - Date.now())));
    const fps = await sampleFps(page);
    if (Number.isFinite(fps)) fpsDuringWalk.push(fps);
  }
  await walkPromise;
  await page.waitForTimeout(500);

  const posAfter = await readPlayerPos(page);
  const walkDistanceM = (posBefore && posAfter)
    ? Math.round(Math.hypot(posAfter.x - posBefore.x, posAfter.z - posBefore.z) * 10) / 10
    : null;

  const snapshotWalk = compactSnapshot(await page.evaluate(() => {
    return window.ZS.perfSnapshot({ label: 'bench-walk', traverse: true });
  }));

  const decorFetch = await fetchDecorPages(
    posAfter?.x ?? snapshotWalk?.position?.x ?? 200,
    posAfter?.z ?? snapshotWalk?.position?.z ?? 80,
    320,
  );

  await context.close();

  return {
    slot,
    benchSlot,
    username: auth.username,
    spawnReadyMs,
    gameInitTotalMs: syncState.gameInitTotalMs,
    walkDistanceM,
    positionStart: posBefore,
    positionEnd: posAfter,
    syncDecorMs: syncState.syncDecorMs,
    syncDecorNear: syncState.syncDecorNear,
    syncDecorTotal: syncState.syncDecorTotal,
    syncDecorDeferred: syncState.syncDecorDeferred,
    syncCollidersMs: syncState.syncCollidersMs,
    colliderPhase: syncState.colliderPhase,
    fpsDuringWalk: numStats(fpsDuringWalk),
    snapshotIdle,
    snapshotWalk,
    decorFetch,
  };
}

async function disconnectSocketBots(socketLive) {
  for (const bot of socketLive) {
    try { bot.socket.disconnect(); } catch { /* ignore */ }
  }
  if (socketLive.length) {
    console.log('[bench-real] bots socket déconnectés — pause avant navigateurs…');
    await sleep(2000);
  }
}

async function runBrowserPhase(browser) {
  const results = [];
  if (clientParallel) {
    console.log('[bench-real] navigateurs en parallèle ×', clientCount);
    const slots = Array.from({ length: clientCount }, (_, i) => i);
    const out = await Promise.all(slots.map((c) => runBrowserClient(browser, c)));
    results.push(...out);
  } else {
    for (let i = 0; i < clientCount; i += clientRamp) {
      const batch = [];
      for (let c = i; c < Math.min(clientCount, i + clientRamp); c++) batch.push(c);
      const batchOut = await Promise.all(batch.map((c) => runBrowserClient(browser, c)));
      results.push(...batchOut);
      console.log('[bench-real] clients', results.length, '/', clientCount,
        '| FPS', batchOut.map((r) => r.snapshotWalk?.fps?.fps ?? '—').join(', '));
      await sleep(400);
    }
  }
  return results;
}

async function main() {
  warnBenchEnv();
  if (clientCount === 0 && socketCount === 0) {
    throw new Error('BENCH_CLIENTS et BENCH_SOCKET ne peuvent pas être tous à 0');
  }

  const memStart = process.memoryUsage();
  const health0 = await preflightBench();
  console.log('[bench-real] serveur prêt', {
    players: health0.players,
    uptime: health0.uptime,
    decor: health0.decor,
    clientVersion: health0.clientVersion,
  });
  console.log('[bench-real] config', {
    clientCount, clientParallel, socketCount, socketRamp, walkMs, settleMs, headless, overlapMode, baseUrl,
  });

  await mkdir(outDir, { recursive: true });
  await mkdir(historyDir, { recursive: true });
  const outPath = join(outDir, 'latest.json');
  const previousReport = await loadPreviousBenchReport(outPath);
  const tStart = performance.now();
  const sampler = new HealthSampler(2000);
  sampler.start();

  let socketLive = [];
  let socketResults = [];
  if (socketCount > 0) {
    console.log('[bench-real] phase socket —', socketCount, 'bots…');
    const sock = await runSocketBackground(socketCount, socketRamp);
    socketLive = sock.live;
    socketResults = sock.results;
  }

  let moveTimer = socketLive.length
    ? setInterval(() => tickSocketBots(socketLive), socketMoveMs)
    : null;

  if (!overlapMode && clientCount > 0 && socketLive.length) {
    if (moveTimer) clearInterval(moveTimer);
    moveTimer = null;
    await disconnectSocketBots(socketLive);
    socketLive = [];
  }

  let browserResults = [];
  let browser = null;
  if (clientCount > 0) {
    console.log('[bench-real] phase navigateur — Chromium…');
    browser = await chromium.launch({
      headless,
      args: headless
        ? ['--disable-dev-shm-usage', '--disable-background-timer-throttling', '--disable-renderer-backgrounding']
        : [],
    });
    browserResults = await runBrowserPhase(browser);
    for (const r of browserResults) {
      console.log('[bench-real] client', r.slot, {
        spawnMs: r.spawnReadyMs,
        syncDecorMs: r.syncDecorMs,
        walkM: r.walkDistanceM,
        fpsWalk: r.snapshotWalk?.fps?.fps,
        drawCalls: r.snapshotWalk?.render?.drawCalls,
      });
    }
  }

  const holdTarget = socketHoldMs || (clientCount > 0 ? 0 : Math.max(8000, walkMs));
  if (socketLive.length && holdTarget > 0) {
    console.log('[bench-real] hold socket', holdTarget, 'ms…');
    const holdEnd = Date.now() + holdTarget;
    while (Date.now() < holdEnd) {
      tickSocketBots(socketLive);
      await sleep(socketMoveMs);
    }
  }

  if (moveTimer) clearInterval(moveTimer);
  sampler.stop();
  for (const bot of socketLive) {
    try { bot.socket.disconnect(); } catch { /* ignore */ }
  }
  if (browser) await browser.close();

  const healthEnd = await fetchHealth();
  const memEnd = process.memoryUsage();
  const okSocket = socketResults.filter((r) => r.ok);
  const initMs = okSocket.map((r) => r.ms);
  const payloadBytes = okSocket.map((r) => r.payloadBytes);
  const walkFps = browserResults.map((r) => r.snapshotWalk?.fps?.fps);
  const fpsSampled = browserResults.flatMap((r) => {
    const s = r.fpsDuringWalk;
    return s ? [s.min, s.avg, s.p50].filter(Number.isFinite) : [];
  });
  const spawnMs = browserResults.map((r) => r.spawnReadyMs);
  const syncMs = browserResults.map((r) => r.syncDecorMs).filter(Number.isFinite);
  const colliderMs = browserResults.map((r) => r.syncCollidersMs).filter(Number.isFinite);

  const report = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    durationMs: Math.round(performance.now() - tStart),
    runnerMemoryMb: {
      heapUsedStart: Math.round(memStart.heapUsed / 1048576),
      heapUsedEnd: Math.round(memEnd.heapUsed / 1048576),
      rssEnd: Math.round(memEnd.rss / 1048576),
    },
    config: {
      clientCount,
      clientRamp,
      clientParallel,
      overlapMode,
      socketCount,
      socketRamp,
      walkMs,
      settleMs,
      fpsSampleMs,
      headless,
      viewport: { w: viewportW, h: viewportH },
    },
    server: {
      playersBefore: health0.players,
      playersPeak: sampler.peakPlayers || healthEnd?.players,
      playersAfter: healthEnd?.players,
      uptime: healthEnd?.uptime,
      decor: healthEnd?.decor ?? health0.decor,
      healthSamples: sampler.summary(),
    },
    socket: socketCount ? {
      attempted: socketCount,
      connected: okSocket.length,
      failed: socketResults.length - okSocket.length,
      successRate: socketCount ? Math.round((okSocket.length / socketCount) * 1000) / 10 : 0,
      gameInit: numStats(initMs) ? {
        ...numStats(initMs),
        payloadBytesAvg: Math.round(payloadBytes.reduce((s, v) => s + v, 0) / payloadBytes.length),
        decorAvg: Math.round(okSocket.reduce((s, r) => s + (r.decorN || 0), 0) / okSocket.length),
      } : null,
      failures: socketResults.filter((r) => !r.ok).slice(0, 10).map((r) => ({
        slot: r.slot, phase: r.phase, error: r.error, ms: r.ms,
      })),
    } : null,
    browsers: browserResults.length ? {
      count: browserResults.length,
      spawnReadyMs: numStats(spawnMs),
      syncDecorMs: numStats(syncMs),
      syncCollidersMs: numStats(colliderMs),
      fpsWalk: numStats(walkFps),
      fpsSampledDuringWalk: numStats(fpsSampled),
      drawCallsWalkAvg: Math.round(
        browserResults.reduce((s, r) => s + (r.snapshotWalk?.render?.drawCalls || 0), 0) / browserResults.length,
      ),
      walkDistanceAvgM: browserResults.some((r) => r.walkDistanceM != null)
        ? Math.round(browserResults.reduce((s, r) => s + (r.walkDistanceM || 0), 0) / browserResults.length * 10) / 10
        : null,
      meshVisibleRatioAvg: avgMeshVisibleRatio(browserResults, 'snapshotWalk'),
      clients: browserResults,
    } : null,
  };

  report.compare = compareBenchReports(previousReport, report);
  report.verdict = buildVerdict(report, thresholds);
  report.score = buildScore(report);

  const mdPath = join(outDir, 'latest.md');
  const stamp = report.capturedAt.replace(/[:.]/g, '-');
  const historyJson = join(historyDir, `${stamp}.json`);
  const historyMd = join(historyDir, `${stamp}.md`);
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, `${formatBenchMarkdown(report)}\n`, 'utf8');
  await copyFile(outPath, historyJson);
  await writeFile(historyMd, `${formatBenchMarkdown(report)}\n`, 'utf8');

  console.log('\n[bench-real] résumé');
  console.table({
    durationSec: Math.round(report.durationMs / 1000),
    verdict: report.verdict.pass ? 'PASS' : 'FAIL',
    socketOk: report.socket ? `${report.socket.connected}/${report.socket.attempted}` : '—',
    initMsP95: report.socket?.gameInit?.p95 ?? '—',
    clients: report.browsers?.count ?? 0,
    spawnReadyP50: report.browsers?.spawnReadyMs?.p50 ?? '—',
    syncDecorP50: report.browsers?.syncDecorMs?.p50 ?? '—',
    collidersP50: report.browsers?.syncCollidersMs?.p50 ?? '—',
    fpsWalkP50: report.browsers?.fpsWalk?.p50 ?? '—',
    fpsWalkMin: report.browsers?.fpsWalk?.min ?? '—',
    walkAvgM: report.browsers?.walkDistanceAvgM ?? '—',
    drawCalls: report.browsers?.drawCallsWalkAvg ?? '—',
    meshVisibleRatio: report.browsers?.meshVisibleRatioAvg ?? '—',
    regressions: report.compare?.regressions?.length ?? 0,
    estBrowsers: report.score?.realisticBrowserPlayers ?? '—',
    estSocket: report.score?.realisticSocketBots ?? '—',
    playersPeak: report.server.playersPeak,
  });
  if (!report.verdict.pass) {
    console.warn('[bench-real] échecs:', report.verdict.reasons.join(' ; '));
  }
  console.log('[bench-real] saved', outPath, '+', mdPath);

  if (!report.verdict.pass) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[bench-real]', err.message || err);
  process.exit(1);
});
