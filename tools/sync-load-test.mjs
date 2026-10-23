/**
 * Test chargement client — Playwright, vérifie isSpawnReady + logs [sync].
 *
 * Usage :
 *   npm run test:sync-load
 *   BASE_URL=http://127.0.0.1:3000 npm run test:sync-load
 *
 * Démarre le serveur si absent (SQLite smoke).
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(rootDir, '.env') });

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const port = process.env.SMOKE_PORT || new URL(baseUrl).port || '3000';
const timeoutMs = Number(process.env.SYNC_LOAD_TIMEOUT_MS || 120000);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth(maxMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(`${baseUrl}/api/health`);
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ready) return d;
    } catch { /* retry */ }
    await sleep(500);
  }
  throw new Error(`Serveur non prêt : ${baseUrl}/api/health`);
}

async function ensureServer() {
  try {
    const r = await fetch(`${baseUrl}/api/health`);
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ready) {
      return { child: null, health: d };
    }
  } catch { /* spawn */ }

  const child = spawn(process.execPath, ['apps/server/index.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: port,
      DB_CLIENT: 'sqlite',
      SQLITE_PATH: process.env.SQLITE_PATH || 'database/local-dev.sqlite',
      JWT_SECRET: process.env.JWT_SECRET || 'smoke_secret',
      PERF_LOCAL_BENCH: '1',
      LOG_LEVEL: 'error',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr?.on('data', (c) => { stderr += c.toString(); });

  try {
    const health = await waitForHealth();
    return { child, health };
  } catch (err) {
    child.kill();
    if (stderr) console.error(stderr.slice(-2000));
    throw err;
  }
}

async function benchToken(slot = 996) {
  const res = await fetch(`${baseUrl}/api/dev/bench-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`bench-token: ${res.status} ${body.error || res.statusText}`);
  }
  return body;
}

async function main() {
  console.log('[sync-load] baseUrl', baseUrl);
  const { child, health } = await ensureServer();
  console.log('[sync-load] server ready', health.clientVersion || '?');

  const auth = await benchToken(996);
  const syncLogs = [];
  const errors = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(({ token, username }) => {
    localStorage.setItem('zombie_token', token);
    localStorage.setItem('zombie_username', username);
  }, { token: auth.token, username: auth.username });

  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  page.setDefaultNavigationTimeout(120000);
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[sync]') || t.includes('game-init')) syncLogs.push(t);
    if (msg.type() === 'error') errors.push(t.slice(0, 400));
  });
  page.on('pageerror', (err) => errors.push(String(err.message || err).slice(0, 400)));

  const t0 = performance.now();
  await page.goto(`${baseUrl}/game.html`, { waitUntil: 'domcontentloaded', timeout: 120000 });

  try {
    await page.waitForFunction(() => {
      return typeof window.ZS?.Network?.isSpawnReady === 'function'
        && window.ZS.Network.isSpawnReady();
    }, { timeout: timeoutMs });
  } catch (err) {
    const snap = await page.evaluate(() => ({
      hasZS: !!window.ZS,
      hasNetwork: !!window.ZS?.Network,
      spawnReady: window.ZS?.Network?.isSpawnReady?.(),
      loadingActive: window.ZS?.Loading?.isActive?.(),
      detail: document.getElementById('connecting-detail')?.textContent || '',
      msg: document.getElementById('connecting-msg')?.textContent || '',
      clientVersion: window.__ZS_CLIENT_VERSION || null,
    }));
    console.error('[sync-load] état blocage:', JSON.stringify(snap, null, 2));
    console.error('[sync-load] logs sync capturés:', syncLogs.slice(-20));
    console.error('[sync-load] erreurs:', errors.slice(0, 8));
    throw err;
  }

  await page.waitForFunction(() => !window.ZS?.Loading?.isActive?.(), { timeout: 15000 }).catch(() => {});
  await sleep(700);

  const loadMs = Math.round(performance.now() - t0);

  const ui = await page.evaluate(() => {
    const screen = document.getElementById('connecting-screen');
    const style = screen ? getComputedStyle(screen) : null;
    return {
      loadingVisible: screen ? style.display !== 'none' && !screen.classList.contains('connecting-fade-out') : null,
      detail: document.getElementById('connecting-detail')?.textContent || '',
      clientVersion: window.__ZS_CLIENT_VERSION || null,
      spawnReady: window.ZS?.Network?.isSpawnReady?.(),
    };
  });

  await browser.close();
  if (child) child.kill();

  console.log('\n[sync-load] OK — spawn ready en', loadMs, 'ms');
  console.log('[sync-load] loading screen visible:', ui.loadingVisible);
  console.log('[sync-load] client version:', ui.clientVersion);
  console.log('\n[sync-load] logs sync:');
  for (const line of syncLogs.slice(-12)) console.log(' ', line);

  if (errors.length) {
    console.warn('\n[sync-load] erreurs navigateur:', errors.slice(0, 5));
  }

  if (ui.loadingVisible) {
    console.error('[sync-load] ÉCHEC — écran chargement encore visible:', ui.detail);
    process.exit(1);
  }

  if (loadMs > timeoutMs * 0.95) {
    console.warn('[sync-load] lent mais OK', loadMs, 'ms');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[sync-load] ÉCHEC', err.message || err);
  process.exit(1);
});
