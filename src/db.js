'use strict';
const mysql = require('mysql2/promise');
require('dotenv').config({ override: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'zombie_mobile_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function getPlayer(username) {
  const [rows] = await pool.execute(
    'SELECT id, username, password_hash, pos_x, pos_y, pos_z, rot_y, health, kills, inventory FROM players WHERE username = ?',
    [username]
  );
  return rows[0] || null;
}

// inventory / spawn : valeurs de départ (kit + Start Forest) fournies par le serveur.
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
    'UPDATE players SET pos_x=?, pos_y=?, pos_z=?, rot_y=?, health=?, kills=?, inventory=? WHERE id=?',
    [x, y, z, rotY, health, kills, inventory ?? '[]', id]
  );
}

module.exports = { pool, getPlayer, createPlayer, savePlayerState };
