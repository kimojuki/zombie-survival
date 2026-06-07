'use strict';
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Prod Infomaniak = MySQL. SQLite uniquement si DB_CLIENT=sqlite (dev local).
// better-sqlite3 est chargé à la demande pour ne pas crasher la prod si le binaire natif manque.
const DB_CLIENT = (process.env.DB_CLIENT || 'mysql').toLowerCase();

function createMySqlPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'zombie_mobile_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

function createSqlitePool() {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    console.error('better-sqlite3 indisponible (module natif). Utilisez DB_CLIENT=mysql en production.');
    throw e;
  }

  const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
  const dbPath = process.env.SQLITE_PATH
    ? (path.isAbsolute(process.env.SQLITE_PATH)
      ? process.env.SQLITE_PATH
      : path.join(ROOT_DIR, process.env.SQLITE_PATH))
    : path.join(ROOT_DIR, 'database', 'local-dev.sqlite');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      pos_x REAL DEFAULT 0.0,
      pos_y REAL DEFAULT 1.0,
      pos_z REAL DEFAULT 0.0,
      rot_y REAL DEFAULT 0.0,
      health INTEGER DEFAULT 100,
      kills INTEGER DEFAULT 0,
      inventory TEXT,
      last_saved TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS world_decor (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      created_by TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS world_structures (
      id INTEGER PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS world_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS world_items (
      id INTEGER PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS world_zombies (
      id INTEGER PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS world_sleepers (
      player_id INTEGER PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
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
    }
  };
}

const pool = DB_CLIENT === 'mysql' ? createMySqlPool() : createSqlitePool();

async function getPlayer(username) {
  const [rows] = await pool.execute(
    'SELECT id, username, password_hash, pos_x, pos_y, pos_z, rot_y, health, kills, inventory FROM players WHERE username = ?',
    [username]
  );
  return rows[0] || null;
}

async function createPlayer(username, passwordHash, inventory, spawn) {
  const sp = spawn || { x: 0, y: 1, z: -5, rotY: 0 };
  const inv = inventory || JSON.stringify([]);
  const [result] = await pool.execute(
    'INSERT INTO players (username, password_hash, inventory, pos_x, pos_y, pos_z, rot_y, health, kills) VALUES (?, ?, ?, ?, ?, ?, ?, 100, 0)',
    [username, passwordHash, inv, sp.x, sp.y, sp.z, sp.rotY]
  );
  return result.insertId;
}

async function savePlayerState(id, x, y, z, rotY, health, kills, inventory, username) {
  const inv = inventory ?? '[]';
  const baseParams = [x, y, z, rotY, health, kills, inv];
  let [result] = await pool.execute(
    'UPDATE players SET pos_x=?, pos_y=?, pos_z=?, rot_y=?, health=?, kills=?, inventory=?, last_saved=CURRENT_TIMESTAMP WHERE id=?',
    [...baseParams, id]
  );
  if ((!result.affectedRows) && username) {
    [result] = await pool.execute(
      'UPDATE players SET pos_x=?, pos_y=?, pos_z=?, rot_y=?, health=?, kills=?, inventory=?, last_saved=CURRENT_TIMESTAMP WHERE username=?',
      [...baseParams, username]
    );
  }
  return result.affectedRows || 0;
}

async function ensureWorldSchema() {
  if (DB_CLIENT === 'mysql') {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS world_decor (
        id VARCHAR(96) PRIMARY KEY,
        payload JSON NOT NULL,
        created_by VARCHAR(64) NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS world_structures (
        id INT PRIMARY KEY,
        payload JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS world_meta (
        \`key\` VARCHAR(64) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS world_items (
        id INT PRIMARY KEY,
        payload JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS world_zombies (
        id INT PRIMARY KEY,
        payload JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS world_sleepers (
        player_id INT PRIMARY KEY,
        payload JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  }
}

async function loadAllWorldDecor() {
  const [rows] = await pool.execute(
    'SELECT id, payload, created_by FROM world_decor ORDER BY id'
  );
  return rows.map((r) => ({
    id: r.id,
    payload: typeof r.payload === 'string' ? r.payload : JSON.stringify(r.payload),
    created_by: r.created_by,
  }));
}

async function upsertWorldDecor(id, payload, createdBy) {
  if (DB_CLIENT === 'mysql') {
    await pool.execute(
      `INSERT INTO world_decor (id, payload, created_by) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE payload=VALUES(payload), created_by=VALUES(created_by)`,
      [id, payload, createdBy]
    );
    return;
  }
  await pool.execute(
    `INSERT OR REPLACE INTO world_decor (id, payload, created_by, updated_at)
     VALUES (?, ?, ?, datetime('now'))`,
    [id, payload, createdBy]
  );
}

async function deleteWorldDecor(id) {
  await pool.execute('DELETE FROM world_decor WHERE id = ?', [id]);
}

async function loadAllWorldStructures() {
  const [rows] = await pool.execute(
    'SELECT id, payload FROM world_structures ORDER BY id'
  );
  return rows.map((r) => ({
    id: r.id,
    payload: typeof r.payload === 'string' ? r.payload : JSON.stringify(r.payload),
  }));
}

async function upsertWorldStructure(id, payload) {
  if (DB_CLIENT === 'mysql') {
    await pool.execute(
      `INSERT INTO world_structures (id, payload) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE payload=VALUES(payload)`,
      [id, payload]
    );
    return;
  }
  await pool.execute(
    `INSERT OR REPLACE INTO world_structures (id, payload, updated_at)
     VALUES (?, ?, datetime('now'))`,
    [id, payload]
  );
}

async function deleteWorldStructure(id) {
  await pool.execute('DELETE FROM world_structures WHERE id = ?', [id]);
}

async function loadAllWorldItems() {
  const [rows] = await pool.execute(
    'SELECT id, payload FROM world_items ORDER BY id'
  );
  return rows.map((r) => ({
    id: r.id,
    payload: typeof r.payload === 'string' ? r.payload : JSON.stringify(r.payload),
  }));
}

async function upsertWorldItem(id, payload) {
  if (DB_CLIENT === 'mysql') {
    await pool.execute(
      `INSERT INTO world_items (id, payload) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE payload=VALUES(payload)`,
      [id, payload]
    );
    return;
  }
  await pool.execute(
    `INSERT OR REPLACE INTO world_items (id, payload, updated_at)
     VALUES (?, ?, datetime('now'))`,
    [id, payload]
  );
}

async function deleteWorldItem(id) {
  await pool.execute('DELETE FROM world_items WHERE id = ?', [id]);
}

async function loadAllWorldZombies() {
  const [rows] = await pool.execute('SELECT id, payload FROM world_zombies ORDER BY id');
  return rows.map((r) => ({
    id: r.id,
    payload: typeof r.payload === 'string' ? r.payload : JSON.stringify(r.payload),
  }));
}

async function upsertWorldZombie(id, payload) {
  if (DB_CLIENT === 'mysql') {
    await pool.execute(
      `INSERT INTO world_zombies (id, payload) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE payload=VALUES(payload)`,
      [id, payload]
    );
    return;
  }
  await pool.execute(
    `INSERT OR REPLACE INTO world_zombies (id, payload, updated_at)
     VALUES (?, ?, datetime('now'))`,
    [id, payload]
  );
}

async function deleteWorldZombie(id) {
  await pool.execute('DELETE FROM world_zombies WHERE id = ?', [id]);
}

async function loadAllWorldSleepers() {
  const [rows] = await pool.execute('SELECT player_id, payload FROM world_sleepers ORDER BY player_id');
  return rows.map((r) => ({
    player_id: r.player_id,
    payload: typeof r.payload === 'string' ? r.payload : JSON.stringify(r.payload),
  }));
}

async function upsertWorldSleeper(playerId, payload) {
  if (DB_CLIENT === 'mysql') {
    await pool.execute(
      `INSERT INTO world_sleepers (player_id, payload) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE payload=VALUES(payload)`,
      [playerId, payload]
    );
    return;
  }
  await pool.execute(
    `INSERT OR REPLACE INTO world_sleepers (player_id, payload, updated_at)
     VALUES (?, ?, datetime('now'))`,
    [playerId, payload]
  );
}

async function deleteWorldSleeper(playerId) {
  await pool.execute('DELETE FROM world_sleepers WHERE player_id = ?', [playerId]);
}

async function getWorldMeta(key) {
  const [rows] = await pool.execute(
    DB_CLIENT === 'mysql'
      ? 'SELECT value FROM world_meta WHERE `key` = ?'
      : 'SELECT value FROM world_meta WHERE key = ?',
    [key]
  );
  return rows[0]?.value ?? null;
}

async function setWorldMeta(key, value) {
  if (DB_CLIENT === 'mysql') {
    await pool.execute(
      'INSERT INTO world_meta (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value=VALUES(value)',
      [key, value]
    );
    return;
  }
  await pool.execute(
    'INSERT OR REPLACE INTO world_meta (key, value) VALUES (?, ?)',
    [key, value]
  );
}

module.exports = {
  pool,
  getPlayer,
  createPlayer,
  savePlayerState,
  DB_CLIENT,
  ensureWorldSchema,
  loadAllWorldDecor,
  upsertWorldDecor,
  deleteWorldDecor,
  loadAllWorldStructures,
  upsertWorldStructure,
  deleteWorldStructure,
  loadAllWorldItems,
  upsertWorldItem,
  deleteWorldItem,
  loadAllWorldZombies,
  upsertWorldZombie,
  deleteWorldZombie,
  loadAllWorldSleepers,
  upsertWorldSleeper,
  deleteWorldSleeper,
  getWorldMeta,
  setWorldMeta,
};
