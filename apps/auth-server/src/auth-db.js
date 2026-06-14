'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_CLIENT = (process.env.AUTH_DB_CLIENT || process.env.DB_CLIENT || 'sqlite').toLowerCase();

/** MariaDB DATETIME n'accepte pas les ISO avec suffixe Z. */
function toMysqlDatetime(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function createMySqlPool() {
  const mysql = require('mysql2/promise');
  return mysql.createPool({
    host: process.env.AUTH_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.AUTH_DB_PORT || process.env.DB_PORT || '3306', 10),
    user: process.env.AUTH_DB_USER || process.env.DB_USER || 'root',
    password: process.env.AUTH_DB_PASS || process.env.DB_PASS || '',
    database: process.env.AUTH_DB_NAME || 'zombie_auth_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

function createSqlitePool() {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    console.error('better-sqlite3 indisponible pour auth-server.');
    throw e;
  }

  const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
  const dbPath = process.env.AUTH_SQLITE_PATH
    ? (path.isAbsolute(process.env.AUTH_SQLITE_PATH)
      ? process.env.AUTH_SQLITE_PATH
      : path.join(ROOT_DIR, process.env.AUTH_SQLITE_PATH))
    : path.join(ROOT_DIR, 'database', 'auth-local.sqlite');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_guest INTEGER NOT NULL DEFAULT 0,
      guest_committed INTEGER NOT NULL DEFAULT 0,
      banned INTEGER NOT NULL DEFAULT 0,
      ban_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL,
      server_id TEXT,
      exchange_code_hash TEXT,
      exchange_expires TEXT,
      exchange_used_at TEXT,
      revoked_at TEXT,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ip TEXT,
      user_agent TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_exchange ON sessions(exchange_code_hash);
  `);

  return {
    kind: 'sqlite',
    path: dbPath,
    async execute(sql, params = []) {
      const normalizedSql = sql.trim().replace(/\s+/g, ' ');
      const isSelect = /^\s*select\b/i.test(normalizedSql);
      if (isSelect) {
        const stmt = db.prepare(sql);
        return [stmt.all(params)];
      }
      const stmt = db.prepare(sql);
      const info = stmt.run(params);
      return [{ insertId: Number(info.lastInsertRowid || 0), affectedRows: info.changes }];
    },
    async end() {
      db.close();
    },
  };
}

const pool = DB_CLIENT === 'mysql' ? createMySqlPool() : createSqlitePool();

async function ensureAuthSchema() {
  if (DB_CLIENT === 'mysql') {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_guest TINYINT(1) NOT NULL DEFAULT 0,
        guest_committed TINYINT(1) NOT NULL DEFAULT 0,
        banned TINYINT(1) NOT NULL DEFAULT 0,
        ban_reason VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id CHAR(36) PRIMARY KEY,
        account_id INT NOT NULL,
        server_id VARCHAR(64) NULL,
        exchange_code_hash CHAR(64) NULL,
        exchange_expires DATETIME NULL,
        exchange_used_at DATETIME NULL,
        revoked_at DATETIME NULL,
        expires_at DATETIME NOT NULL,
        last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        ip VARCHAR(45) NULL,
        user_agent VARCHAR(512) NULL,
        INDEX idx_sessions_account (account_id),
        INDEX idx_sessions_exchange (exchange_code_hash),
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `);
  }
}

async function getAccountByUsername(username) {
  const [rows] = await pool.execute(
    'SELECT id, username, password_hash, is_guest, guest_committed, banned, ban_reason, created_at FROM accounts WHERE username = ?',
    [username],
  );
  return rows[0] || null;
}

async function getAccountById(id) {
  const [rows] = await pool.execute(
    'SELECT id, username, password_hash, is_guest, guest_committed, banned, ban_reason, created_at FROM accounts WHERE id = ?',
    [id],
  );
  return rows[0] || null;
}

async function createAccount(username, passwordHash, { isGuest = false } = {}) {
  const [result] = await pool.execute(
    'INSERT INTO accounts (username, password_hash, is_guest, guest_committed) VALUES (?, ?, ?, 0)',
    [username, passwordHash, isGuest ? 1 : 0],
  );
  return result.insertId;
}

async function setGuestCommitted(accountId) {
  await pool.execute(
    'UPDATE accounts SET guest_committed = 1 WHERE id = ? AND is_guest = 1',
    [accountId],
  );
}

async function deleteTrialGuest(accountId) {
  await pool.execute(
    'DELETE FROM accounts WHERE id = ? AND is_guest = 1 AND guest_committed = 0',
    [accountId],
  );
}

async function upgradeGuestAccount(accountId, newUsername, passwordHash) {
  await pool.execute(
    'UPDATE accounts SET username = ?, password_hash = ?, is_guest = 0, guest_committed = 1 WHERE id = ? AND is_guest = 1',
    [newUsername, passwordHash, accountId],
  );
}

async function insertSession(row) {
  const exchangeExpires = DB_CLIENT === 'mysql' ? toMysqlDatetime(row.exchangeExpires) : row.exchangeExpires;
  const expiresAt = DB_CLIENT === 'mysql' ? toMysqlDatetime(row.expiresAt) : row.expiresAt;
  if (DB_CLIENT === 'mysql') {
    await pool.execute(
      `INSERT INTO sessions
        (id, account_id, server_id, exchange_code_hash, exchange_expires, expires_at, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.accountId,
        row.serverId || null,
        row.exchangeCodeHash || null,
        exchangeExpires,
        expiresAt,
        row.ip || null,
        row.userAgent || null,
      ],
    );
    return;
  }
  await pool.execute(
    `INSERT INTO sessions
      (id, account_id, server_id, exchange_code_hash, exchange_expires, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.accountId,
      row.serverId || null,
      row.exchangeCodeHash || null,
      row.exchangeExpires || null,
      row.expiresAt,
      row.ip || null,
      row.userAgent || null,
    ],
  );
}

async function getSessionById(sessionId) {
  const [rows] = await pool.execute(
    `SELECT s.*, a.username, a.is_guest, a.guest_committed, a.banned
     FROM sessions s
     JOIN accounts a ON a.id = s.account_id
     WHERE s.id = ?`,
    [sessionId],
  );
  return rows[0] || null;
}

async function getSessionByExchangeHash(hash) {
  const [rows] = await pool.execute(
    `SELECT s.*, a.username, a.is_guest, a.guest_committed, a.banned
     FROM sessions s
     JOIN accounts a ON a.id = s.account_id
     WHERE s.exchange_code_hash = ?`,
    [hash],
  );
  return rows[0] || null;
}

async function markExchangeUsed(sessionId) {
  const now = DB_CLIENT === 'mysql' ? toMysqlDatetime(new Date()) : new Date().toISOString();
  await pool.execute(
    'UPDATE sessions SET exchange_used_at = ?, last_seen_at = ? WHERE id = ?',
    [now, now, sessionId],
  );
}

async function touchSession(sessionId) {
  const now = DB_CLIENT === 'mysql' ? toMysqlDatetime(new Date()) : new Date().toISOString();
  await pool.execute(
    'UPDATE sessions SET last_seen_at = ? WHERE id = ? AND revoked_at IS NULL',
    [now, sessionId],
  );
}

async function revokeSession(sessionId) {
  const now = DB_CLIENT === 'mysql' ? toMysqlDatetime(new Date()) : new Date().toISOString();
  await pool.execute(
    'UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL',
    [now, sessionId],
  );
}

module.exports = {
  pool,
  DB_CLIENT,
  ensureAuthSchema,
  getAccountByUsername,
  getAccountById,
  createAccount,
  setGuestCommitted,
  deleteTrialGuest,
  upgradeGuestAccount,
  insertSession,
  getSessionById,
  getSessionByExchangeHash,
  markExchangeUsed,
  touchSession,
  revokeSession,
};
