/**
 * Test de charge serveur — bots Socket.io (sans client 3D).
 *
 * Pour un benchmark réaliste (Chromium + charge concurrente) : npm run test:bench
 *
 * Prérequis : serveur local SQLite + PERF_LOCAL_BENCH=1
 *
 * Usage :
 *   npm run test:load
 *   LOAD_COUNT=80 LOAD_RAMP=8 npm run test:load
 *   BASE_URL=http://127.0.0.1:3000 npm run test:load
 *
 * Sortie : notes-local/load-bench/latest.json
 */
import { io } from 'socket.io-client';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  baseUrl,
  benchToken,
  fetchDecorPages,
  fetchHealth,
  pct,
  rootDir,
  sleep,
  SOCKET_CLIENT_MOVE,
  waitForHealth,
  warnBenchEnv,
} from './bench-lib.mjs';

const outDir = join(rootDir, 'notes-local', 'load-bench');

const total = Math.min(999, Math.max(1, parseInt(process.env.LOAD_COUNT || '30', 10)));
const ramp = Math.max(1, parseInt(process.env.LOAD_RAMP || '5', 10));
const connectTimeoutMs = Number(process.env.LOAD_CONNECT_MS || 45000);
const holdMs = Number(process.env.LOAD_HOLD_MS || 12000);
const moveIntervalMs = Number(process.env.LOAD_MOVE_MS || 2000);
const simulateMove = process.env.LOAD_MOVE !== '0';
const simulateDecorFetch = process.env.LOAD_DECOR_FETCH !== '0';

async function connectBot(slot) {
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
      const ms = Math.round(performance.now() - t0);
      const payloadBytes = JSON.stringify(payload).length;
      const decorN = payload?.decorItems?.length ?? 0;
      finish({
        ok: true,
        phase: 'game-init',
        ms,
        payloadBytes,
        decorN,
        onlineCount: payload?.onlineCount,
      });
    });

    socket.on('connect', () => {
      /* game-init attendu */
    });
  });
}

async function sampleDecorFetch(live) {
  const sample = live.slice(0, Math.min(5, live.length));
  let pages = 0;
  let bytes = 0;
  for (const bot of sample) {
    const t = Date.now() / 1000;
    const angle = bot.slot * 0.41 + t * 0.7;
    const px = 200 + Math.cos(angle) * 40;
    const pz = 80 + Math.sin(angle) * 40;
    const df = await fetchDecorPages(px, pz, 320);
    pages += df.treePages + df.propPages;
    bytes += df.bytes;
  }
  return { bots: sample.length, pages, bytes };
}

export async function runSocketLoadTest(opts = {}) {
  const count = opts.total ?? total;
  const batchRamp = opts.ramp ?? ramp;
  const results = [];
  const live = [];

  for (let i = 0; i < count; i += batchRamp) {
    const batch = [];
    for (let s = i; s < Math.min(count, i + batchRamp); s++) batch.push(s);
    const batchResults = await Promise.all(batch.map((slot) => connectBot(slot)));
    for (const r of batchResults) {
      results.push(r);
      if (r.ok && r.socket) live.push(r);
    }
    await sleep(300);
  }

  return { results, live };
}

async function main() {
  warnBenchEnv();

  const health0 = await waitForHealth();
  console.log('[load-bench] serveur prêt', { players: health0.players, uptime: health0.uptime });
  console.log('[load-bench] cible', { total, ramp, holdMs, simulateMove, simulateDecorFetch, baseUrl });

  await mkdir(outDir, { recursive: true });

  const tStart = performance.now();
  const { results, live } = await runSocketLoadTest();
  const tConnected = performance.now();
  const healthPeak = await fetchHealth();

  let decorFetchTotal = null;

  if (simulateMove && live.length) {
    console.log('[load-bench] simulation move', holdMs, 'ms…');
    const moveStart = Date.now();
    while (Date.now() - moveStart < holdMs) {
      for (const bot of live) {
        if (!bot.socket?.connected) continue;
        const t = Date.now() / 1000;
        const angle = bot.slot * 0.41 + t * 0.7;
        const px = 200 + Math.cos(angle) * 40;
        const pz = 80 + Math.sin(angle) * 40;
        bot.socket.emit(SOCKET_CLIENT_MOVE, {
          x: px,
          y: 5,
          z: pz,
          rotY: angle,
          crouch: false,
        });
      }
      await sleep(moveIntervalMs);
    }
    if (simulateDecorFetch) {
      decorFetchTotal = await sampleDecorFetch(live);
    }
  } else if (holdMs > 0) {
    await sleep(holdMs);
  }

  const healthEnd = await fetchHealth();
  const okResults = results.filter((r) => r.ok);
  const failResults = results.filter((r) => !r.ok);
  const initMs = okResults.map((r) => r.ms).sort((a, b) => a - b);
  const payloadBytes = okResults.map((r) => r.payloadBytes).sort((a, b) => a - b);

  for (const bot of live) {
    try { bot.socket.disconnect(); } catch { /* ignore */ }
  }

  const report = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    config: { total, ramp, holdMs, simulateMove, simulateDecorFetch, connectTimeoutMs },
    durationMs: Math.round(performance.now() - tStart),
    connectPhaseMs: Math.round(tConnected - tStart),
    summary: {
      attempted: total,
      connected: okResults.length,
      failed: failResults.length,
      successRate: total ? Math.round((okResults.length / total) * 1000) / 10 : 0,
    },
    gameInit: okResults.length ? {
      msAvg: Math.round(initMs.reduce((s, v) => s + v, 0) / initMs.length),
      msP50: pct(initMs, 0.5),
      msP95: pct(initMs, 0.95),
      payloadBytesAvg: Math.round(payloadBytes.reduce((s, v) => s + v, 0) / payloadBytes.length),
      decorAvg: Math.round(okResults.reduce((s, r) => s + (r.decorN || 0), 0) / okResults.length),
    } : null,
    decorFetchSample: decorFetchTotal,
    server: {
      playersBefore: health0.players,
      playersPeak: healthPeak?.players,
      playersAfter: healthEnd?.players,
      uptime: healthEnd?.uptime,
    },
    failures: failResults.slice(0, 20).map((r) => ({
      slot: r.slot,
      phase: r.phase,
      error: r.error,
      ms: r.ms,
    })),
  };

  const outPath = join(outDir, 'latest.json');
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('\n[load-bench] résultat');
  console.table({
    connected: report.summary.connected,
    failed: report.summary.failed,
    successPct: report.summary.successRate,
    initMsP50: report.gameInit?.msP50,
    initMsP95: report.gameInit?.msP95,
    payloadKB: report.gameInit ? Math.round(report.gameInit.payloadBytesAvg / 1024) : null,
    serverPlayers: report.server.playersPeak,
  });
  console.log('[load-bench] saved', outPath);

  if (failResults.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[load-bench]', err.message || err);
  process.exit(1);
});
