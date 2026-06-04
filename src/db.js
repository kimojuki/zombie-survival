'use strict';
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const Database = require('better-sqlite3');
require('dotenv').config({ override: true });

const DB_CLIENT = (process.env.DB_CLIENT || 'sqlite').toLowerCase();

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
  const dbDir = path.join(__dirname, '..', 'database');
  const dbPath = process.env.SQLITE_PATH || path.join(dbDir, 'local-dev.sqlite');
  fs.mkdirSync(dbDir, { recursive: true });

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

async function savePlayerState(id, x, y, z, rotY, health, kills, inventory) {
  await pool.execute(
    'UPDATE players SET pos_x=?, pos_y=?, pos_z=?, rot_y=?, health=?, kills=?, inventory=?, last_saved=CURRENT_TIMESTAMP WHERE id=?',
    [x, y, z, rotY, health, kills, inventory ?? '[]', id]
  );
}

module.exports = { pool, getPlayer, createPlayer, savePlayerState, DB_CLIENT };
