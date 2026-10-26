/**
 * Intégration : démarre le serveur, connecte un guest, vérifie que les
 * positions zombie changent via zombie-tick (pas seulement au hit).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { io } = require('socket.io-client');

const PORT = String(3900 + Math.floor(Math.random() * 200));
const BASE = `http://127.0.0.1:${PORT}`;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'zs-zom-'));
const SQLITE = path.join(TMP, 'game.sqlite');

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitHealth(maxMs = 45000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < maxMs) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      const body = await res.json();
      if (body.ready) return body;
      last = body;
    } catch (e) {
      last = e;
    }
    await wait(400);
  }
  throw new Error(`server not ready: ${JSON.stringify(last)}`);
}

test('live server: zombies move on zombie-tick', async (t) => {
  const child = spawn(process.execPath, ['apps/server/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT,
      HOST: '127.0.0.1',
      DB_CLIENT: 'sqlite',
      SQLITE_PATH: SQLITE,
      JWT_SECRET: 'zombie_live_test_secret',
      AUTH_MODE: 'embedded',
      LOG_LEVEL: 'error',
      RCON_PASSWORD: 'test',
      RCON_AUTO_ADMIN: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (c) => { stderr += c.toString(); });

  t.after(() => {
    child.kill('SIGTERM');
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  await waitHealth();

  const guestRes = await fetch(`${BASE}/api/auth/guest`, { method: 'POST' });
  const guestText = await guestRes.text();
  assert.equal(guestRes.status, 200, guestText);
  const guest = JSON.parse(guestText);
  assert.ok(guest.token, 'guest token');

  await fetch(`${BASE}/api/rcon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-RCON-Password': 'test' },
    body: JSON.stringify({ cmd: 'zombies on' }),
  }).catch(() => {});

  const ticks = [];
  let initZombies = [];
  const socket = io(BASE, {
    auth: { token: guest.token },
    transports: ['websocket'],
    forceNew: true,
  });

  await new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('socket connect timeout')), 15000);
    socket.on('connect', () => { clearTimeout(to); resolve(); });
    socket.on('connect_error', (err) => { clearTimeout(to); reject(err); });
  });

  socket.on('game-init', (d) => {
    if (Array.isArray(d?.zombies)) initZombies = d.zombies;
  });
  socket.on('zombie-tick', (d) => {
    if (d?.zombies?.length) ticks.push({
      full: d.full,
      zombies: d.zombies.map((z) => ({ id: z.id, x: z.x, z: z.z })),
    });
  });
  socket.on('zombies-snapshot', (list) => {
    if (Array.isArray(list) && list.length) {
      ticks.push({ full: true, zombies: list.map((z) => ({ id: z.id, x: z.x, z: z.z })) });
    }
  });

  // Attendre game-init puis sortir de l'intro (sinon filter cache les zombies monde)
  await wait(800);
  socket.emit('scenario-advance', { step: 'act1_done' });
  await wait(200);
  socket.emit('request-zombie-sync');

  // TP près de la forêt / ring de spawn
  await fetch(`${BASE}/api/rcon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-RCON-Password': 'test' },
    body: JSON.stringify({ cmd: `tp ${guest.username} 0 40` }),
  }).catch(() => {});

  for (let i = 0; i < 8; i++) {
    socket.emit('move', { x: 2 + i * 0.5, y: 1, z: 40 + i * 0.2, rotY: 0 });
    await wait(120);
  }

  await wait(3500);

  socket.close();

  assert.ok(ticks.length >= 3, `expected several zombie-tick payloads, got ${ticks.length}. stderr=${stderr.slice(-500)}`);

  // Track one zombie id across ticks and assert position changed
  const samples = new Map();
  for (const tick of ticks) {
    for (const z of tick.zombies) {
      if (!samples.has(z.id)) samples.set(z.id, []);
      samples.get(z.id).push({ x: z.x, z: z.z, t: ticks.indexOf(tick) });
    }
  }
  assert.ok(samples.size > 0, 'no zombies in ticks');

  let movedOk = false;
  for (const [, pts] of samples) {
    if (pts.length < 2) continue;
    const a = pts[0];
    const b = pts[pts.length - 1];
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    if (dist > 0.08) {
      movedOk = true;
      break;
    }
  }
  assert.ok(
    movedOk,
    `zombies did not move across ticks. samples=${JSON.stringify([...samples.entries()].slice(0, 3))}`,
  );
});
