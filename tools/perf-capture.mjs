/**
 * Capture métriques perf in-game via Chromium (Playwright).
 *
 * Prérequis : serveur local + compte avec accès dev (login habituel).
 *
 * Usage :
 *   npm run test:perf
 *   PERF_USER=ton_user PERF_PASS=ton_mdp npm run test:perf
 *   BASE_URL=http://127.0.0.1:3000 npm run test:perf
 *
 * Sortie : notes-local/perf/latest.json (+ affichage console)
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dir, '..');
dotenv.config({ path: join(rootDir, '.env') });
const outDir = join(rootDir, 'notes-local', 'perf');

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const user = process.env.PERF_USER || process.env.ZS_PERF_USER;
const pass = process.env.PERF_PASS || process.env.ZS_PERF_PASS;
const headless = process.env.PERF_HEADED !== '1';
const waitDecorMs = Number(process.env.PERF_WAIT_MS || 8000);

async function waitForHealth(maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(`${baseUrl}/api/health`);
      if (r.ok) return;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Serveur injoignable : ${baseUrl}/api/health — lance npm start`);
}

async function loginToken() {
  const benchUser = user || process.env.PERF_USER;
  if (process.env.PERF_LOCAL_BENCH === '1' && benchUser) {
    const res = await fetch(`${baseUrl}/api/dev/perf-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: benchUser }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.token) {
      return { token: body.token, username: body.username, via: 'perf-login' };
    }
    console.warn('[perf-capture] perf-login failed', res.status, body.error || '');
  }

  if (!user || !pass) {
    throw new Error(
      'Login impossible. Ajoute PERF_USER=Bruno et PERF_LOCAL_BENCH=1 dans .env (SQLite local),\n'
      + '  ou PERF_USER + PERF_PASS pour login classique.',
    );
  }
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Login échoué (${res.status}): ${body.error || res.statusText}`);
  }
  if (!body.token) throw new Error('Login OK mais pas de token');
  return { token: body.token, username: body.username, via: 'login' };
}

async function main() {
  await waitForHealth();
  const auth = await loginToken();
  console.log('[perf-capture] login ok', auth.username, auth.via || '');

  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  await context.addInitScript(({ token, username }) => {
    localStorage.setItem('zombie_token', token);
    localStorage.setItem('zombie_username', username);
    localStorage.setItem('zs_dev_log', '1');
  }, { token: auth.token, username: auth.username });

  const page = await context.newPage();
  page.setDefaultTimeout(180000);
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[zs-perf]') || t.includes('[zs-dev]')) {
      console.log('[browser]', t.slice(0, 500));
    }
  });

  const gameUrl = `${baseUrl}/game.html?devlog=1`;
  console.log('[perf-capture] loading', gameUrl);
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });

  console.log('[perf-capture] attente monde + sync…');
  await page.waitForFunction(() => {
    return typeof window.ZS?.perfSnapshot === 'function'
      && typeof window.ZS?.Network?.isSpawnReady === 'function'
      && window.ZS.Network.isSpawnReady();
  }, { timeout: 180000 });

  console.log('[perf-capture] attente décor forêt (idle)', waitDecorMs, 'ms…');
  await page.waitForTimeout(waitDecorMs);

  const snapshot = await page.evaluate(() => {
    return window.ZS.perfSnapshot({ label: 'automated-capture', traverse: true });
  });

  await page.waitForTimeout(2000);
  const snapshotInGame = await page.evaluate(() => {
    return window.ZS.perfSnapshot({ label: 'automated-after-wait', traverse: true });
  });

  const report = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    username: auth.username,
    headless,
    afterLoad: snapshot,
    afterWait: snapshotInGame,
  };

  const outPath = join(outDir, 'latest.json');
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log('\n[perf-capture] saved', outPath);
  if (snapshotInGame?.render) {
    console.table({
      drawCalls: snapshotInGame.render.drawCalls,
      triangles: snapshotInGame.render.triangles,
      geometries: snapshotInGame.render.geometries,
      textures: snapshotInGame.render.textures,
      fps: snapshotInGame.fps?.fps,
      frameMsP95: snapshotInGame.fps?.frameMsP95,
      forestDecorMeshes: snapshotInGame.scene?.forestDecorMeshes,
      forestDecorInstanced: snapshotInGame.scene?.forestDecorInstanced,
    });
  }

  await browser.close();
}

main().catch((err) => {
  console.error('[perf-capture]', err.message || err);
  process.exit(1);
});
