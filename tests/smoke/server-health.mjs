import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = process.env.SMOKE_PORT || '3000';
const baseUrl = `http://127.0.0.1:${port}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(maxMs = 20000) {
  const started = Date.now();
  let lastError = null;

  while (Date.now() - started < maxMs) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.status === 503 || res.ok) return res;
    } catch (err) {
      lastError = err;
    }
    await wait(500);
  }

  throw lastError || new Error('Timed out waiting for /api/health');
}

let existingServer = null;
try {
  existingServer = await fetch(`${baseUrl}/api/health`);
} catch {
  existingServer = null;
}

const child = existingServer
  ? null
  : spawn(process.execPath, ['apps/server/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: port,
    DB_CLIENT: 'sqlite',
    SQLITE_PATH: process.env.SQLITE_PATH || 'database/local-dev.sqlite',
    JWT_SECRET: process.env.JWT_SECRET || 'smoke_secret',
    LOG_LEVEL: 'error',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
if (child) {
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
}

try {
  const res = existingServer || await waitForHealth();
  assert.ok([200, 503].includes(res.status));
  const body = await res.json();
  assert.equal(typeof body.ok, 'boolean');
  assert.equal(typeof body.ready, 'boolean');
  if (body.ready) {
    assert.equal(typeof body.clientVersion, 'string');
    assert.ok(body.clientVersion.length >= 4);
  }
} finally {
  if (child) child.kill();
}

if (child) {
  child.on('exit', (code, signal) => {
    if (code && !signal) {
      console.error(stderr);
    }
  });
}
