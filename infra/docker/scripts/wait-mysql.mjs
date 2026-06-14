#!/usr/bin/env node
/**
 * Attend MariaDB avant boot game/auth (docker prod sim).
 * Usage: node infra/docker/scripts/wait-mysql.mjs
 */
import mysql from 'mysql2/promise';

const host = process.env.DB_HOST || process.env.AUTH_DB_HOST || 'mariadb';
const port = parseInt(process.env.DB_PORT || process.env.AUTH_DB_PORT || '3306', 10);
const user = process.env.DB_USER || 'zs_app';
const password = process.env.DB_PASS || '';
const timeoutMs = parseInt(process.env.DB_WAIT_TIMEOUT_MS || '120000', 10);
const intervalMs = 2000;

const started = Date.now();

while (Date.now() - started < timeoutMs) {
  try {
    const conn = await mysql.createConnection({ host, port, user, password });
    await conn.query('SELECT 1');
    await conn.end();
    console.log(`[wait-mysql] OK ${host}:${port} (${Date.now() - started}ms)`);
    process.exit(0);
  } catch (err) {
    console.log(`[wait-mysql] waiting ${host}:${port} — ${err.code || err.message}`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

console.error(`[wait-mysql] timeout after ${timeoutMs}ms`);
process.exit(1);
