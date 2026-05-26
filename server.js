'use strict';
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config({ override: true });

const { getPlayer, createPlayer, savePlayerState } = require('./src/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_CHANGE_ME';
const WORLD_RADIUS = 55;
const ZOMBIE_COUNT = 25;

app.use(express.json());
app.use(express.static('public'));

// ── Auth routes ─────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Champs manquants' });
  if (username.length < 3 || username.length > 50) return res.status(400).json({ error: 'Nom: 3-50 caractères' });
  if (password.length < 6) return res.status(400).json({ error: 'Mot de passe: min 6 caractères' });
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return res.status(400).json({ error: 'Nom invalide (a-z, 0-9, _, -)' });

  try {
    if (await getPlayer(username)) return res.status(409).json({ error: 'Nom déjà utilisé' });
    const hash = await bcrypt.hash(password, 12);
    const id = await createPlayer(username, hash);
    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch (err) {
    console.error('Register error complet:', err);
    res.status(500).json({ error: 'Erreur serveur: ' + err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Champs manquants' });

  try {
    const player = await getPlayer(username);
    if (!player || !(await bcrypt.compare(password, player.password_hash)))
      return res.status(401).json({ error: 'Identifiants invalides' });

    const token = jwt.sign({ id: player.id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token, username,
      spawn: { x: player.pos_x, y: player.pos_y, z: player.pos_z, rotY: player.rot_y },
      health: player.health,
      kills: player.kills
    });
  } catch (err) {
    console.error('Login:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Game state ───────────────────────────────────────────────────────────────

const players = new Map();
const zombies = new Map();
let zombieIdCounter = 0;

function makeZombie() {
  const id = ++zombieIdCounter;
  const angle = Math.random() * Math.PI * 2;
  const dist = 12 + Math.random() * (WORLD_RADIUS - 12);
  return {
    id,
    x: Math.cos(angle) * dist,
    y: 0,
    z: Math.sin(angle) * dist,
    health: 100,
    wanderAngle: Math.random() * Math.PI * 2,
    speed: 1.8 + Math.random() * 1.4
  };
}

for (let i = 0; i < ZOMBIE_COUNT; i++) {
  const z = makeZombie();
  zombies.set(z.id, z);
}

// Zombie AI — 100ms tick
setInterval(() => {
  if (players.size === 0) return;
  const pList = Array.from(players.values());
  const DT = 0.1;

  zombies.forEach((z) => {
    let nearestDist = Infinity, nearestP = null;
    for (const p of pList) {
      const d = Math.hypot(p.x - z.x, p.z - z.z);
      if (d < nearestDist) { nearestDist = d; nearestP = p; }
    }

    if (nearestP && nearestDist < 28) {
      const ang = Math.atan2(nearestP.z - z.z, nearestP.x - z.x);
      z.x += Math.cos(ang) * z.speed * DT;
      z.z += Math.sin(ang) * z.speed * DT;
      if (nearestDist < 1.5) {
        nearestP.health = Math.max(0, nearestP.health - 5);
        io.to(nearestP.socketId).emit('take-damage', { health: nearestP.health });
      }
    } else {
      z.wanderAngle += (Math.random() - 0.5) * 0.4;
      z.x = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, z.x + Math.cos(z.wanderAngle) * z.speed * 0.4 * DT));
      z.z = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, z.z + Math.sin(z.wanderAngle) * z.speed * 0.4 * DT));
    }
  });

  io.emit('zombie-tick', Array.from(zombies.values()));
}, 100);

// Auto-save player state every 5s
setInterval(() => {
  players.forEach((p) => {
    if (p.dirty && p.id) {
      savePlayerState(p.id, p.x, p.y, p.z, p.rotY, p.health, p.kills).catch(() => {});
      p.dirty = false;
    }
  });
}, 5000);

// ── Socket.io ────────────────────────────────────────────────────────────────

io.use((socket, next) => {
  try {
    socket.user = jwt.verify(socket.handshake.auth.token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Authentification requise'));
  }
});

io.on('connection', (socket) => {
  const p = {
    socketId: socket.id,
    id: socket.user.id,
    username: socket.user.username,
    x: 0, y: 1, z: 0, rotY: 0,
    health: 100, kills: 0, dirty: false
  };
  players.set(socket.id, p);
  console.log(`+ ${p.username} (${players.size} en ligne)`);

  socket.emit('game-init', {
    selfId: socket.id,
    players: [...players.entries()]
      .filter(([sid]) => sid !== socket.id)
      .map(([sid, q]) => ({ id: sid, username: q.username, x: q.x, y: q.y, z: q.z, rotY: q.rotY })),
    zombies: Array.from(zombies.values())
  });
  socket.broadcast.emit('player-join', { id: socket.id, username: p.username, x: p.x, y: p.y, z: p.z });

  socket.on('move', (d) => {
    p.x = d.x; p.y = d.y; p.z = d.z; p.rotY = d.rotY; p.dirty = true;
    socket.broadcast.emit('player-move', { id: socket.id, x: d.x, y: d.y, z: d.z, rotY: d.rotY });
  });

  socket.on('shoot', (d) => {
    const len = Math.hypot(d.dx, d.dz);
    if (len < 0.001) return;
    const nx = d.dx / len, nz = d.dz / len;

    let hit = null, minT = Infinity;
    zombies.forEach((z) => {
      const tx = z.x - d.ox, tz = z.z - d.oz;
      const t = tx * nx + tz * nz;
      if (t < 0 || t > 80) return;
      if (Math.hypot(d.ox + nx * t - z.x, d.oz + nz * t - z.z) < 0.8 && t < minT) {
        minT = t; hit = z;
      }
    });

    if (hit) {
      hit.health -= 34;
      if (hit.health <= 0) {
        io.emit('zombie-die', hit.id);
        zombies.delete(hit.id);
        p.kills++;
        io.to(socket.id).emit('score-update', { kills: p.kills });
        setTimeout(() => {
          const nz = makeZombie();
          zombies.set(nz.id, nz);
          io.emit('zombie-spawn', nz);
        }, 4000);
      } else {
        io.emit('zombie-hit', { id: hit.id, health: hit.health });
      }
    }
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    console.log(`- ${p.username} (${players.size} en ligne)`);
    io.emit('player-leave', socket.id);
  });
});

server.listen(PORT, () => console.log(`🧟 Zombie Survival → http://localhost:${PORT}`));
