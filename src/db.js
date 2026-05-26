'use strict';
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'zombie_mobile_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function getPlayer(username) {
  const [rows] = await pool.execute(
    'SELECT id, username, password_hash, pos_x, pos_y, pos_z, rot_y, health, kills FROM players WHERE username = ?',
    [username]
  );
  return rows[0] || null;
}

async function createPlayer(username, passwordHash) {
  const [result] = await pool.execute(
    'INSERT INTO players (username, password_hash, inventory) VALUES (?, ?, ?)',
    [username, passwordHash, JSON.stringify([])]
  );
  return result.insertId;
}

async function savePlayerState(id, x, y, z, rotY, health, kills) {
  await pool.execute(
    'UPDATE players SET pos_x=?, pos_y=?, pos_z=?, rot_y=?, health=?, kills=? WHERE id=?',
    [x, y, z, rotY, health, kills, id]
  );
}

module.exports = { pool, getPlayer, createPlayer, savePlayerState };
