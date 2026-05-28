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
const WORLD_RADIUS = 130;
const ZOMBIE_COUNT = 35;

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
      spawn: { x: player.pos_x ?? 0, y: player.pos_y ?? 0, z: player.pos_z ?? 0, rotY: player.rot_y ?? 0 },
      health: player.health ?? 100,
      kills: player.kills ?? 0
    });
  } catch (err) {
    console.error('Login:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Game state ───────────────────────────────────────────────────────────────

const players = new Map();
const zombies = new Map();
const items   = new Map(); // world pickup items
let zombieIdCounter = 0;
let itemIdCounter   = 0;

// Temps mondial partagé — source de vérité pour tous les clients
let _worldTime = 0.3; // 0–1 (0=minuit, 0.25=lever, 0.5=midi, 0.75=coucher)
const _DAY_DURATION = 240; // secondes par cycle complet
const _TICK_DT = 0.1;      // durée du tick zombie en secondes

const DROP_CHANCE  = 0.40;
const DROP_TYPES   = ['ammo', 'ammo', 'ammo', 'medkit', 'medkit', 'food'];

const DETECT_RANGE   = 12;   // unités — portée de détection
const AGGRO_MEMORY   = 5;    // secondes d'aggro après perte de vue
const WANDER_SPEED   = 0.25; // fraction de vitesse en mode errance
const WANDER_TURN_MIN = 2;   // secondes min avant changement de direction
const WANDER_TURN_MAX = 5;   // secondes max avant changement de direction

function makeZombie() {
  const id = ++zombieIdCounter;
  const spawnAngle = Math.random() * Math.PI * 2;
  const dist = 25 + Math.random() * (WORLD_RADIUS - 25);
  const wanderAngle = Math.random() * Math.PI * 2;
  return {
    id,
    x: Math.cos(spawnAngle) * dist,
    y: 0,
    z: Math.sin(spawnAngle) * dist,
    health: 100,
    angle: wanderAngle,
    wanderAngle,
    wanderTimer: WANDER_TURN_MIN + Math.random() * (WANDER_TURN_MAX - WANDER_TURN_MIN),
    aggroTimer: 0,
    speed: 1.8 + Math.random() * 1.4
  };
}

for (let i = 0; i < ZOMBIE_COUNT; i++) {
  const z = makeZombie();
  zombies.set(z.id, z);
}

// Zombie AI — 100ms tick
setInterval(() => {
  _worldTime = (_worldTime + _TICK_DT / _DAY_DURATION) % 1;

  if (players.size === 0) return;
  const pList = Array.from(players.values());
  const DT = _TICK_DT;

  zombies.forEach((z) => {
    // Nearest player
    let nearestDist = Infinity, nearestP = null;
    for (const p of pList) {
      const d = Math.hypot(p.x - z.x, p.z - z.z);
      if (d < nearestDist) { nearestDist = d; nearestP = p; }
    }

    // Aggro: detect when close, keep memory after losing sight
    if (nearestDist < DETECT_RANGE) {
      z.aggroTimer = AGGRO_MEMORY;
    } else {
      z.aggroTimer = Math.max(0, z.aggroTimer - DT);
    }

    if (z.aggroTimer > 0 && nearestP) {
      // Chase at full speed
      const ang = Math.atan2(nearestP.z - z.z, nearestP.x - z.x);
      z.angle = ang;
      z.x += Math.cos(ang) * z.speed * DT;
      z.z += Math.sin(ang) * z.speed * DT;
      if (nearestDist < 1.5 && !nearestP.invincible) {
        nearestP.health = Math.max(0, nearestP.health - 5);
        io.to(nearestP.socketId).emit('take-damage', { health: nearestP.health });
      }
    } else {
      // Wander slowly — change direction periodically, not every tick
      z.wanderTimer -= DT;
      if (z.wanderTimer <= 0) {
        z.wanderAngle = Math.random() * Math.PI * 2;
        z.wanderTimer = WANDER_TURN_MIN + Math.random() * (WANDER_TURN_MAX - WANDER_TURN_MIN);
      }
      z.angle = z.wanderAngle;
      z.x = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, z.x + Math.cos(z.wanderAngle) * z.speed * WANDER_SPEED * DT));
      z.z = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, z.z + Math.sin(z.wanderAngle) * z.speed * WANDER_SPEED * DT));
    }
  });

  io.emit('zombie-tick', { zombies: Array.from(zombies.values()), time: _worldTime });
}, 100);

// Auto-save player state every 5s
setInterval(() => {
  players.forEach((p) => {
    if (p.dirty && p.id) {
      savePlayerState(p.id, p.x, p.y, p.z, p.rotY, p.health, p.kills, p.inventory || '[]').catch(() => {});
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

io.on('connection', async (socket) => {
  // Load saved state from DB
  let saved = null;
  try { saved = await getPlayer(socket.user.username); } catch {}

  const p = {
    socketId: socket.id,
    id: socket.user.id,
    username: socket.user.username,
    x:    saved?.pos_x ?? 0,
    y:    saved?.pos_y ?? 1,
    z:    saved?.pos_z ?? 0,
    rotY: saved?.rot_y ?? 0,
    health: saved?.health ?? 100,
    kills:  saved?.kills  ?? 0,
    inventory: saved?.inventory || '[]',
    dirty: false,
    invincible: true
  };
  setTimeout(() => { if (players.has(socket.id)) p.invincible = false; }, 5000);
  players.set(socket.id, p);
  console.log(`+ ${p.username} (${players.size} en ligne)`);

  let savedInventory = [];
  try { savedInventory = JSON.parse(p.inventory || '[]'); } catch {}

  socket.emit('game-init', {
    selfId: socket.id,
    spawn: { x: p.x, y: p.y, z: p.z, rotY: p.rotY },
    players: [...players.entries()]
      .filter(([sid]) => sid !== socket.id)
      .map(([sid, q]) => ({ id: sid, username: q.username, x: q.x, y: q.y, z: q.z, rotY: q.rotY })),
    zombies: Array.from(zombies.values()),
    items:   Array.from(items.values()),
    worldTime: _worldTime,
    inventory: savedInventory
  });
  socket.broadcast.emit('player-join', { id: socket.id, username: p.username, x: p.x, y: p.y, z: p.z, rotY: p.rotY });

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
        // Random drop
        if (Math.random() < DROP_CHANCE) {
          const type   = DROP_TYPES[Math.floor(Math.random() * DROP_TYPES.length)];
          const dropId = ++itemIdCounter;
          const drop   = {
            id:   dropId,
            type,
            x: hit.x + (Math.random() - 0.5) * 1.6,
            z: hit.z + (Math.random() - 0.5) * 1.6
          };
          items.set(dropId, drop);
          io.emit('item-spawn', drop);
        }
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

  socket.on('item-pickup', (d) => {
    const item = items.get(d.id);
    if (!item) return; // already taken
    // Proximity guard — reject if player is too far (3 units tolerance for latency)
    if (Math.hypot(item.x - p.x, item.z - p.z) > 3.0) return;
    items.delete(d.id);
    io.emit('item-remove', item.id);       // use authoritative id, not client-supplied
    socket.emit('item-add', { type: item.type });
  });

  socket.on('inventory-sync', (slots) => {
    try { p.inventory = JSON.stringify(slots); p.dirty = true; } catch {}
  });

  socket.on('respawn', () => {
    p.health = 100;
    p.invincible = true;
    p.inventory = '[]'; // client will send inventory-sync with cleared state
    setTimeout(() => { if (players.has(socket.id)) p.invincible = false; }, 3000);
    socket.emit('take-damage', { health: 100 });
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    console.log(`- ${p.username} (${players.size} en ligne)`);
    io.emit('player-leave', socket.id);
    if (p.id) savePlayerState(p.id, p.x, p.y, p.z, p.rotY, p.health, p.kills, p.inventory || '[]').catch(() => {});
  });
});

server.listen(PORT, () => console.log(`🧟 Zombie Survival → http://localhost:${PORT}`));
