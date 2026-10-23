#!/usr/bin/env node
/**
 * Importe comptes auth + joueurs depuis SQLite dev vers MySQL (Docker prod-sim).
 *
 * Usage (dans le conteneur game, après docker cp des .sqlite) :
 *   SQLITE_GAME_PATH=/tmp/game.sqlite SQLITE_AUTH_PATH=/tmp/auth.sqlite \
 *     node tools/import-sqlite-accounts-to-mysql.mjs [--apply]
 */
import 'dotenv/config';
import Database from 'better-sqlite3';
import { createRequire } from 'node:module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');

const gameSqlitePath = process.env.SQLITE_GAME_PATH
  || path.join(ROOT, 'database/local-dev.sqlite');
const authSqlitePath = process.env.SQLITE_AUTH_PATH
  || path.join(ROOT, 'database/auth-local.sqlite');

const gameDb = require('../apps/server/src/db.js');
const authDb = require('../apps/auth-server/src/auth-db.js');

if ((process.env.DB_CLIENT || 'mysql').toLowerCase() !== 'mysql') {
  console.error('DB_CLIENT must be mysql (run inside Docker game container)');
  process.exit(1);
}

const gameSql = new Database(gameSqlitePath, { readonly: true });
const authSql = new Database(authSqlitePath, { readonly: true });

await gameDb.ensureAccountIdSchema();
await authDb.ensureAuthSchema();

const authRows = authSql.prepare(
  'SELECT id, username, password_hash, is_guest, guest_committed, banned, ban_reason FROM accounts ORDER BY id',
).all();
const playerRows = gameSql.prepare(
  'SELECT id, username, password_hash, pos_x, pos_y, pos_z, rot_y, health, kills, inventory, is_guest, guest_committed, account_id FROM players ORDER BY id',
).all();

const authIdBySqliteId = new Map();
let authCreated = 0;
let authUpdated = 0;
let authSkipped = 0;

for (const row of authRows) {
  let acc = await authDb.getAccountByUsername(row.username);
  if (!acc) {
    if (!APPLY) {
      console.log('[dry-run] auth create', row.username);
      authIdBySqliteId.set(row.id, `(new:${row.username})`);
      authCreated += 1;
      continue;
    }
    const id = await authDb.createAccount(row.username, row.password_hash, { isGuest: !!row.is_guest });
    if (row.guest_committed) await authDb.setGuestCommitted(id);
    if (row.banned) {
      await authDb.pool.execute(
        'UPDATE accounts SET banned = 1, ban_reason = ? WHERE id = ?',
        [row.ban_reason || 'imported', id],
      );
    }
    acc = await authDb.getAccountById(id);
    authCreated += 1;
  } else if (acc.password_hash !== row.password_hash || !!acc.is_guest !== !!row.is_guest) {
    if (!APPLY) {
      console.log('[dry-run] auth update', row.username);
      authUpdated += 1;
    } else {
      await authDb.pool.execute(
        'UPDATE accounts SET password_hash = ?, is_guest = ?, guest_committed = ?, banned = ?, ban_reason = ? WHERE id = ?',
        [row.password_hash, row.is_guest ? 1 : 0, row.guest_committed ? 1 : 0, row.banned ? 1 : 0, row.ban_reason, acc.id],
      );
      authUpdated += 1;
    }
  } else {
    authSkipped += 1;
  }
  authIdBySqliteId.set(row.id, acc?.id ?? authIdBySqliteId.get(row.id));
}

if (APPLY) {
  for (const row of authRows) {
    if (authIdBySqliteId.has(row.id) && typeof authIdBySqliteId.get(row.id) === 'number') continue;
    const acc = await authDb.getAccountByUsername(row.username);
    if (acc) authIdBySqliteId.set(row.id, acc.id);
  }
}

let playersCreated = 0;
let playersUpdated = 0;
let playersSkipped = 0;
let linkFixed = 0;

for (const row of playerRows) {
  const sqliteAuthId = row.account_id;
  const mappedAccountId = sqliteAuthId != null ? authIdBySqliteId.get(sqliteAuthId) : null;
  const accountId = typeof mappedAccountId === 'number' ? mappedAccountId : null;

  const existing = await gameDb.getPlayer(row.username);
  if (!existing) {
    if (!APPLY) {
      console.log('[dry-run] player create', row.username, accountId ? `→ account ${accountId}` : '');
      playersCreated += 1;
      continue;
    }
    if (accountId) {
      await gameDb.createLinkedPlayer({
        accountId,
        username: row.username,
        passwordHash: row.password_hash,
        inventory: row.inventory,
        spawn: { x: row.pos_x, y: row.pos_y, z: row.pos_z, rotY: row.rot_y },
        isGuest: !!row.is_guest,
        guestCommitted: !!row.guest_committed,
      });
    } else if (row.is_guest) {
      await gameDb.createGuestPlayer(row.username, row.inventory, {
        x: row.pos_x, y: row.pos_y, z: row.pos_z, rotY: row.rot_y,
      }, row.password_hash);
    } else {
      await gameDb.createPlayer(row.username, row.password_hash, row.inventory, {
        x: row.pos_x, y: row.pos_y, z: row.pos_z, rotY: row.rot_y,
      });
    }
    playersCreated += 1;
    continue;
  }

  const needsUpdate = existing.password_hash !== row.password_hash
    || existing.account_id !== accountId
    || !!existing.is_guest !== !!row.is_guest
    || !!existing.guest_committed !== !!row.guest_committed;

  if (!needsUpdate) {
    playersSkipped += 1;
    continue;
  }

  if (!APPLY) {
    console.log('[dry-run] player update', row.username);
    playersUpdated += 1;
    if (accountId && existing.account_id !== accountId) linkFixed += 1;
    continue;
  }

  await gameDb.pool.execute(
    `UPDATE players SET password_hash = ?, pos_x = ?, pos_y = ?, pos_z = ?, rot_y = ?,
     health = ?, kills = ?, inventory = ?, is_guest = ?, guest_committed = ?, account_id = ?
     WHERE id = ?`,
    [
      row.password_hash, row.pos_x, row.pos_y, row.pos_z, row.rot_y,
      row.health ?? 100, row.kills ?? 0, row.inventory,
      row.is_guest ? 1 : 0, row.guest_committed ? 1 : 0, accountId,
      existing.id,
    ],
  );
  playersUpdated += 1;
  if (accountId && existing.account_id !== accountId) linkFixed += 1;
}

console.log('');
console.log(APPLY ? '=== import sqlite → mysql (apply) ===' : '=== dry-run (ajoutez --apply) ===');
console.log({
  authSource: authRows.length,
  authCreated,
  authUpdated,
  authSkipped,
  playersSource: playerRows.length,
  playersCreated,
  playersUpdated,
  playersSkipped,
  linkFixed,
});

gameSql.close();
authSql.close();
await gameDb.pool.end?.();
await authDb.pool.end?.();
