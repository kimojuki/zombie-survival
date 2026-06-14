import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('db sqlite — PRAGMA table_info returns rows (guest schema migration)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zs-db-'));
  const dbPath = path.join(dir, 'pragma-test.sqlite');
  const prevPath = process.env.SQLITE_PATH;
  const prevClient = process.env.DB_CLIENT;
  process.env.SQLITE_PATH = dbPath;
  process.env.DB_CLIENT = 'sqlite';

  delete require.cache[require.resolve('../apps/server/src/db.js')];
  const db = require('../apps/server/src/db.js');

  try {
    await db.ensurePlayersGuestSchema();
    const [cols] = await db.pool.execute('PRAGMA table_info(players)');
    assert.ok(Array.isArray(cols));
    const names = cols.map((c) => c.name);
    assert.ok(names.includes('is_guest'));
    assert.ok(names.includes('guest_committed'));
  } finally {
    await db.pool.end().catch(() => {});
    if (prevPath != null) process.env.SQLITE_PATH = prevPath;
    else delete process.env.SQLITE_PATH;
    if (prevClient != null) process.env.DB_CLIENT = prevClient;
    else delete process.env.DB_CLIENT;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
