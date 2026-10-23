#!/usr/bin/env node
/**
 * Phase D — copie les comptes joueurs (game DB) vers auth DB + lie account_id.
 * Idempotent : skip si compte auth existe deja (match username).
 *
 * Usage :
 *   node tools/migrate-game-accounts-to-auth.mjs           # dry-run
 *   node tools/migrate-game-accounts-to-auth.mjs --apply
 */
import 'dotenv/config';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const gameDb = require('../apps/server/src/db.js');
const authDb = require('../apps/auth-server/src/auth-db.js');

const APPLY = process.argv.includes('--apply');
const SKIP_TRIAL_GUESTS = !process.argv.includes('--include-trial-guests');

await gameDb.ensureAccountIdSchema();
await authDb.ensureAuthSchema();

const [rows] = await gameDb.pool.execute(
  `SELECT id, username, password_hash, is_guest, guest_committed, account_id
   FROM players
   ORDER BY id ASC`,
);

let created = 0;
let linked = 0;
let skipped = 0;
let errors = 0;

for (const row of rows) {
  const isTrialGuest = row.is_guest && !row.guest_committed;
  if (SKIP_TRIAL_GUESTS && isTrialGuest) {
    skipped += 1;
    continue;
  }
  if (row.account_id) {
    const existing = await authDb.getAccountById(row.account_id);
    if (existing) {
      skipped += 1;
      continue;
    }
  }

  let account = await authDb.getAccountByUsername(row.username);
  if (!account) {
    if (!APPLY) {
      console.log(`[dry-run] create + link: ${row.username} (player #${row.id})`);
      created += 1;
      linked += 1;
      continue;
    }
    try {
      const accountId = await authDb.createAccount(row.username, row.password_hash, {
        isGuest: !!row.is_guest,
      });
      if (row.is_guest && row.guest_committed) {
        await authDb.setGuestCommitted(accountId);
      }
      account = await authDb.getAccountById(accountId);
      created += 1;
    } catch (err) {
      console.error(`[error] create ${row.username}:`, err.message);
      errors += 1;
      continue;
    }
  }

  if (account && row.account_id === account.id) {
    skipped += 1;
    continue;
  }

  if (!APPLY) {
    console.log(`[dry-run] link player #${row.id} ${row.username} → account #${account.id}`);
    linked += 1;
    continue;
  }

  try {
    await gameDb.setPlayerAccountId(row.id, account.id);
    linked += 1;
  } catch (err) {
    console.error(`[error] link ${row.username}:`, err.message);
    errors += 1;
  }
}

console.log('');
console.log(APPLY ? '=== migration apply ===' : '=== dry-run (ajoutez --apply) ===');
console.log({ total: rows.length, created, linked, skipped, errors, skipTrialGuests: SKIP_TRIAL_GUESTS });
if (!APPLY && (created || linked)) {
  console.log('\nRelancez avec --apply apres backup: npm run backup:pre-deploy');
}

await gameDb.pool.end?.();
await authDb.pool.end?.();
