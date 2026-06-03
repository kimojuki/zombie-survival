'use strict';
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config({ override: true });

const { getPlayer, createPlayer, savePlayerState, pool } = require('./src/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_CHANGE_ME';
const WORLD_RADIUS = 290;   // borne d'errance (carte ~±300)
const ZOMBIE_COUNT = 70;

// Répartition des zombies par secteur (poids = densité relative).
// Main City > Military > Small Town ; la forêt (zone de départ) reste éparse.
const ZOMBIE_ZONES = [
  { name: 'maincity',  cx: -20,  cz: -182, r: 70, weight: 34 },
  { name: 'military',  cx: -200, cz: -172, r: 75, weight: 24 },
  { name: 'smalltown', cx: -177, cz: 0,    r: 58, weight: 12 },
  { name: 'forest',    cx: 0,    cz: 20,   r: 95, weight: 14 },
];
const ZOMBIE_ZONE_TOTAL = ZOMBIE_ZONES.reduce((s, z) => s + z.weight, 0);

function pickZombieZone() {
  let r = Math.random() * ZOMBIE_ZONE_TOTAL;
  for (const z of ZOMBIE_ZONES) { if ((r -= z.weight) < 0) return z; }
  return ZOMBIE_ZONES[0];
}

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
    const id = await createPlayer(username, hash, STARTING_SAVE, FOREST_SPAWN);
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

const players    = new Map();
const zombies    = new Map();
const items      = new Map(); // world pickup items (+ butins de mort : bag:true)
const structures = new Map(); // structures construites par les joueurs (base)
let zombieIdCounter    = 0;
let itemIdCounter      = 0;
let structureIdCounter = 0;

// ── Spawn / kit / survie ──────────────────────────────────────────────────────
const FOREST_SPAWN     = { x: 0, y: 1, z: -5, rotY: 0 };   // Start Forest
const DEFAULT_SURVIVAL = { faim: 80, soif: 80, infection: 0, saignement: false };
const STARTING_ITEMS   = {
  hotbar: [null, null, null, null, null, null],   // inventaire vide
  bag: [],
  equip: { 'Tête': null, 'Torso': null, 'Mains': null, 'Dos': null },  // aucun sac
};
const STARTING_SAVE = JSON.stringify({ ...STARTING_ITEMS, survival: DEFAULT_SURVIVAL });
const DEATH_BAG_MS  = 30 * 60 * 1000; // butin de mort : 30 min puis disparition

// Sauvegarde combinée (objets + survie) écrite dans la colonne JSON `inventory`.
function saveBlob(p) {
  const base = Array.isArray(p.inv) ? { hotbar: p.inv } : (p.inv || {});
  return JSON.stringify({ ...base, survival: p.survival || DEFAULT_SURVIVAL });
}

// Aplati l'inventaire d'un joueur en liste d'objets pour le butin de mort.
function flattenInv(inv) {
  const out = [];
  if (!inv || typeof inv !== 'object') return out;
  const push = (s) => { if (s && s.type) out.push({ type: s.type, qty: s.qty || 1 }); };
  (Array.isArray(inv) ? inv : (inv.hotbar || [])).forEach(push);
  (inv.bag || []).forEach(push);
  if (inv.equip) for (const k of Object.keys(inv.equip)) push(inv.equip[k]);
  return out;
}

// ── Collision géométrique (transmise une fois par le premier client) ──────────
// Le client construit la géométrie : il est la source de vérité unique. On ne garde
// que l'empreinte 2D et on ignore les murs d'étage (minY), les zombies restant au sol.
// Les portes n'ont aucun collider → les zombies passent par les ouvertures comme les joueurs.
let worldColliders = [];
const structureColliders = []; // murs/portes construits par les joueurs
const ZOMBIE_R = 0.5;

function resolveZombieCollision(nx, nz) {
  for (const list of [worldColliders, structureColliders]) {
  for (const c of list) {
    if (c.type === 'box') {
      const clampX = Math.max(c.cx - c.hw, Math.min(c.cx + c.hw, nx));
      const clampZ = Math.max(c.cz - c.hd, Math.min(c.cz + c.hd, nz));
      const dx = nx - clampX, dz = nz - clampZ;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.0001) {
        if (dist < ZOMBIE_R) {
          const pen = ZOMBIE_R - dist;
          nx += (dx / dist) * pen;
          nz += (dz / dist) * pen;
        }
      } else {
        // Centre à l'intérieur de la boîte → on ressort par le bord le plus proche
        const l = nx - (c.cx - c.hw), r = (c.cx + c.hw) - nx;
        const t = nz - (c.cz - c.hd), b = (c.cz + c.hd) - nz;
        const m = Math.min(l, r, t, b);
        if      (m === l) nx = c.cx - c.hw - ZOMBIE_R;
        else if (m === r) nx = c.cx + c.hw + ZOMBIE_R;
        else if (m === t) nz = c.cz - c.hd - ZOMBIE_R;
        else              nz = c.cz + c.hd + ZOMBIE_R;
      }
    } else {
      const dx = nx - c.x, dz = nz - c.z;
      const dist = Math.hypot(dx, dz);
      const min = ZOMBIE_R + (c.r || 0.3);
      if (dist < min && dist > 0.0001) {
        const scale = min / dist;
        nx = c.x + dx * scale;
        nz = c.z + dz * scale;
      }
    }
  }
  }
  return [nx, nz];
}

// Temps mondial partagé — source de vérité pour tous les clients
let _worldTime = 0.3; // 0–1 (0=minuit, 0.25=lever, 0.5=midi, 0.75=coucher)
const _DAY_DURATION = 600; // secondes par cycle complet (~10 min — transitions lentes et réalistes)
const _TICK_DT = 0.1;      // durée du tick zombie en secondes

const DROP_CHANCE  = 0.40;
const DROP_TYPES   = ['ammo', 'ammo', 'ammo', 'medkit', 'medkit', 'food'];

// ── Système de loot des bâtiments (voir worlDesign/items/items.md) ────────────
// Le client transmet l'empreinte des bâtiments (loot-buildings) ; le serveur
// répartit les objets au sol selon le type de bâtiment et régénère chaque heure.
let lootBuildings = [];
const LOOT_RESPAWN_MS = 3600 * 1000; // 1 h

// Tables par type : high = forte probabilité, low = faible. Aucun objet exclusif.
const LOOT_TABLES = {
  hopital: {
    high: ['med_bandage', 'med_kit_soin', 'med_seringue_anti_infection'],
    low:  ['food_conserves', 'food_eau_bouteille', 'tool_marteau', 'res_chiffon', 'res_ferraille'],
  },
  police: {
    high: ['wpn_pistolet', 'wpn_fusil_pompe', 'wpn_fusil_chasse',
           'ammo_pistolet', 'ammo_fusil_pompe', 'ammo_fusil_chasse'],
    low:  ['food_conserves', 'food_eau_bouteille', 'med_bandage', 'res_ferraille'],
  },
  maison: {
    high: ['food_conserves', 'food_pain', 'food_fruits', 'food_eau_bouteille', 'res_chiffon', 'eq_petit_sac'],
    med:  ['med_bandage', 'tool_marteau', 'tool_hachette', 'res_corde'],
    low:  ['wpn_couteau', 'ammo_pistolet', 'eq_sac_moyen'],
  },
  chantier: {
    high: ['res_bois_brut', 'res_planche', 'res_clous', 'res_ferraille', 'res_metal', 'tool_marteau', 'tool_hachette'],
    low:  ['food_conserves', 'food_eau_bouteille', 'res_corde'],
  },
  garage: {
    high: ['res_ferraille', 'res_metal', 'tool_marteau', 'tool_hachette', 'tool_pioche', 'res_ruban_adhesif'],
    low:  ['food_conserves', 'food_eau_bouteille', 'med_bandage', 'res_corde'],
  },
  supermarche: {
    high: ['food_conserves', 'food_haricots_boite', 'food_soupe_conserve', 'food_pain',
           'food_fruits', 'food_eau_bouteille', 'food_boisson_energisante'],
    low:  ['tool_marteau', 'med_bandage', 'res_chiffon'],
  },
  militaire: {
    high: ['wpn_fusil_chasse', 'wpn_fusil_pompe', 'ammo_fusil_chasse', 'ammo_fusil_pompe',
           'ammo_pistolet', 'eq_gilet_protection', 'eq_casque'],
    low:  ['med_kit_soin', 'food_conserves', 'food_boisson_energisante'],
  },
};

// Pool global : tout objet peut apparaître n'importe où (faible chance).
const ALL_ITEMS = [
  'food_eau_bouteille', 'food_boisson_energisante', 'food_conserves', 'food_haricots_boite',
  'food_soupe_conserve', 'food_pain', 'food_fruits',
  'med_bandage', 'med_kit_soin', 'med_seringue_anti_infection',
  'wpn_couteau', 'wpn_machette', 'wpn_barre_fer', 'wpn_batte_cloutee',
  'wpn_pistolet', 'wpn_fusil_pompe', 'wpn_fusil_chasse',
  'ammo_pistolet', 'ammo_fusil_pompe', 'ammo_fusil_chasse',
  'eq_petit_sac', 'eq_sac_moyen', 'eq_casque', 'eq_gilet_protection', 'eq_gants',
  'res_bois_brut', 'res_planche', 'res_ferraille', 'res_metal', 'res_clous',
  'res_ruban_adhesif', 'res_chiffon', 'res_corde',
  'tool_marteau', 'tool_hachette', 'tool_pioche',
];

function _randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

// Quantité d'une pile au sol selon la nature de l'objet (pas de def serveur → par préfixe).
function lootQty(type) {
  if (type.startsWith('ammo_')) return _randInt(6, 18);
  if (type.startsWith('res_'))  return _randInt(4, 14);
  if (type.startsWith('food_')) return _randInt(1, 3);
  if (type.startsWith('med_'))  return _randInt(1, 2);
  return 1; // armes, outils, équipement
}

// Nombre d'objets selon la taille du bâtiment (1–8, cf. items.md).
function lootCount(w, d) {
  const area = w * d;
  if (area < 75)  return _randInt(1, 4); // petit
  if (area < 170) return _randInt(2, 6); // moyen
  return _randInt(4, 8);                 // grand
}

// Tirage pondéré d'un type d'objet pour un bâtiment donné.
function pickLootType(table) {
  if (Math.random() < 0.15) return ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
  const pool = [];
  for (const t of (table.high || [])) for (let i = 0; i < 6; i++) pool.push(t);
  for (const t of (table.med  || [])) for (let i = 0; i < 3; i++) pool.push(t);
  for (const t of (table.low  || [])) for (let i = 0; i < 1; i++) pool.push(t);
  if (pool.length === 0) return ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

function clearLoot() {
  for (const [id, it] of items) {
    if (it.loot) { items.delete(id); io.emit('item-remove', id); }
  }
}

function generateLoot() {
  clearLoot();
  for (const b of lootBuildings) {
    const table = LOOT_TABLES[b.category] || LOOT_TABLES.maison;
    const n = lootCount(b.w, b.d);
    const placed = [];
    for (let i = 0; i < n; i++) {
      let x, z, ok = false;
      for (let tries = 0; tries < 12 && !ok; tries++) {
        x = b.cx + (Math.random() - 0.5) * b.w * 0.7;
        z = b.cz + (Math.random() - 0.5) * b.d * 0.7;
        ok = placed.every((pt) => Math.hypot(pt.x - x, pt.z - z) > 1.2);
      }
      if (!ok) continue;
      placed.push({ x, z });
      const type = pickLootType(table);
      const id = ++itemIdCounter;
      const drop = { id, type, x, z, qty: lootQty(type), loot: true };
      items.set(id, drop);
      io.emit('item-spawn', drop);
    }
  }
  console.log(`🎒 Loot généré : ${[...items.values()].filter((i) => i.loot).length} objets dans ${lootBuildings.length} bâtiments`);
}

// Loot généré UNE seule fois (monde partagé et stable) — pas de régénération
// automatique : on ne crée pas de nouveaux items à chaque connexion/heure.
// (Respawn horaire désactivé volontairement.)

// Expiration des butins de mort : disparaissent après 30 min s'ils ne sont pas ramassés.
setInterval(() => {
  const now = Date.now();
  for (const [id, it] of items) {
    if (it.bag && it.expiresAt && now > it.expiresAt) {
      items.delete(id);
      io.emit('item-remove', id);
    }
  }
}, 60 * 1000);

const DETECT_RANGE   = 12;   // unités — portée de détection
const AGGRO_MEMORY   = 5;    // secondes d'aggro après perte de vue
const ZOMBIE_DMG       = 8;   // dégâts par coup (au lieu de 5 toutes les 100ms)
const ZOMBIE_ATTACK_CD = 0.9; // secondes entre deux coups d'un même zombie
const WANDER_SPEED   = 0.25; // fraction de vitesse en mode errance
const WANDER_TURN_MIN = 2;   // secondes min avant changement de direction
const WANDER_TURN_MAX = 5;   // secondes max avant changement de direction

function makeZombie() {
  const id = ++zombieIdCounter;
  const zone = pickZombieZone();
  const ang  = Math.random() * Math.PI * 2;
  const dist = Math.sqrt(Math.random()) * zone.r;   // réparti uniformément dans le disque
  const wanderAngle = Math.random() * Math.PI * 2;
  return {
    id,
    x: zone.cx + Math.cos(ang) * dist,
    y: 0,
    z: zone.cz + Math.sin(ang) * dist,
    health: 100,
    angle: wanderAngle,
    wanderAngle,
    wanderTimer: WANDER_TURN_MIN + Math.random() * (WANDER_TURN_MAX - WANDER_TURN_MIN),
    aggroTimer: 0,
    attackTimer: 0,
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
      // Déplacement + collision murs/objets (glisse le long, entre par les portes)
      const chase = resolveZombieCollision(z.x + Math.cos(ang) * z.speed * DT,
                                           z.z + Math.sin(ang) * z.speed * DT);
      z.x = chase[0];
      z.z = chase[1];
      // Attaque avec cadence : un coup toutes ZOMBIE_ATTACK_CD s, dégâts modérés.
      z.attackTimer = Math.max(0, (z.attackTimer || 0) - DT);
      if (nearestDist < 1.5 && !nearestP.invincible && z.attackTimer <= 0) {
        z.attackTimer = ZOMBIE_ATTACK_CD;
        nearestP.health = Math.max(0, nearestP.health - ZOMBIE_DMG);
        io.to(nearestP.socketId).emit('take-damage', { dmg: ZOMBIE_DMG });
      }
    } else {
      // Wander slowly — change direction periodically, not every tick
      z.wanderTimer -= DT;
      if (z.wanderTimer <= 0) {
        z.wanderAngle = Math.random() * Math.PI * 2;
        z.wanderTimer = WANDER_TURN_MIN + Math.random() * (WANDER_TURN_MAX - WANDER_TURN_MIN);
      }
      z.angle = z.wanderAngle;
      const wx = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, z.x + Math.cos(z.wanderAngle) * z.speed * WANDER_SPEED * DT));
      const wz = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, z.z + Math.sin(z.wanderAngle) * z.speed * WANDER_SPEED * DT));
      const wander = resolveZombieCollision(wx, wz);
      z.x = wander[0];
      z.z = wander[1];
    }
  });

  io.emit('zombie-tick', { zombies: Array.from(zombies.values()), time: _worldTime });
}, 100);

// Auto-save player state every 5s
setInterval(() => {
  players.forEach((p) => {
    if (p.dirty && p.id) {
      savePlayerState(p.id, p.x, p.y, p.z, p.rotY, p.health, p.kills, saveBlob(p)).catch(() => {});
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

  // Décompose la sauvegarde (objets + survie) ; position restaurée depuis la DB.
  let _save = {};
  try { _save = typeof saved?.inventory === 'string' ? JSON.parse(saved.inventory) : (saved?.inventory || {}); } catch {}
  const _survival = (_save && _save.survival) ? _save.survival : { ...DEFAULT_SURVIVAL };
  if (_save && !Array.isArray(_save)) delete _save.survival;

  const p = {
    socketId: socket.id,
    id: socket.user.id,
    username: socket.user.username,
    x:    (saved && saved.pos_x != null) ? saved.pos_x : FOREST_SPAWN.x,
    y:    (saved && saved.pos_y != null) ? saved.pos_y : FOREST_SPAWN.y,
    z:    (saved && saved.pos_z != null) ? saved.pos_z : FOREST_SPAWN.z,
    rotY: (saved && saved.rot_y != null) ? saved.rot_y : FOREST_SPAWN.rotY,
    health: saved?.health ?? 100,
    kills:  saved?.kills  ?? 0,
    inv: _save,            // { hotbar, bag, equip }
    survival: _survival,   // { faim, soif, infection, saignement }
    equipped: null,        // type de l'item tenu en main (visible des autres joueurs)
    dirty: false,
    invincible: true
  };
  setTimeout(() => { if (players.has(socket.id)) p.invincible = false; }, 5000);
  players.set(socket.id, p);
  console.log(`+ ${p.username} (${players.size} en ligne)`);

  socket.emit('game-init', {
    selfId: socket.id,
    spawn: { x: p.x, y: p.y, z: p.z, rotY: p.rotY },
    players: [...players.entries()]
      .filter(([sid]) => sid !== socket.id)
      .map(([sid, q]) => ({ id: sid, username: q.username, x: q.x, y: q.y, z: q.z, rotY: q.rotY, equipped: q.equipped })),
    zombies: Array.from(zombies.values()),
    items:   Array.from(items.values()),
    structures: Array.from(structures.values()),
    worldTime: _worldTime,
    inventory: p.inv,
    survival:  p.survival
  });
  socket.broadcast.emit('player-join', { id: socket.id, username: p.username, x: p.x, y: p.y, z: p.z, rotY: p.rotY, equipped: p.equipped });

  // Le premier client transmet la géométrie de collision (murs, arbres, etc.).
  socket.on('world-colliders', (cols) => {
    if (worldColliders.length === 0 && Array.isArray(cols)) {
      // On exclut les murs d'étage / parapets (minY) : ils ne concernent pas le sol.
      worldColliders = cols.filter(c => c && c.minY === undefined);
    }
  });

  // Le premier client transmet l'empreinte des bâtiments → génération du loot.
  socket.on('loot-buildings', (list) => {
    if (lootBuildings.length === 0 && Array.isArray(list) && list.length) {
      lootBuildings = list.filter(b => b && typeof b.cx === 'number' && typeof b.cz === 'number');
      generateLoot();
    }
  });

  socket.on('move', (d) => {
    p.x = d.x; p.y = d.y; p.z = d.z; p.rotY = d.rotY; p.dirty = true;
    socket.broadcast.emit('player-move', { id: socket.id, x: d.x, y: d.y, z: d.z, rotY: d.rotY });
  });

  // Item tenu en main → visible des autres joueurs (arme, torche, outil…).
  socket.on('equip', (d) => {
    const type = (d && typeof d.type === 'string' && d.type.length <= 60) ? d.type : null;
    if (type === p.equipped) return;
    p.equipped = type;
    socket.broadcast.emit('player-equip', { id: socket.id, type });
  });

  // Geste d'attaque (tir / mêlée) → animation rejouée chez les autres joueurs.
  socket.on('attack', (d) => {
    const kind = (d && d.kind === 'recoil') ? 'recoil' : 'melee';
    socket.broadcast.emit('player-attack', { id: socket.id, kind });
  });

  socket.on('shoot', (d) => {
    const len = Math.hypot(d.dx, d.dz);
    if (len < 0.001) return;
    const nx = d.dx / len, nz = d.dz / len;

    // Dégâts/portée/rayon fournis par le client (arme), bornés côté serveur.
    const dmg    = Math.max(1, Math.min(250, Number(d.dmg)    || 34));
    const range  = Math.max(0.5, Math.min(120, Number(d.range)  || 80));
    const radius = Math.max(0.4, Math.min(2.0, Number(d.radius) || 0.8));

    let hit = null, minT = Infinity;
    zombies.forEach((z) => {
      const tx = z.x - d.ox, tz = z.z - d.oz;
      const t = tx * nx + tz * nz;
      if (t < 0 || t > range) return;
      if (Math.hypot(d.ox + nx * t - z.x, d.oz + nz * t - z.z) < radius && t < minT) {
        minT = t; hit = z;
      }
    });

    if (hit) {
      hit.health -= dmg;
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
    if (item.bag) {
      socket.emit('bag-collect', { items: item.items || [] });  // butin : rend tout
    } else {
      socket.emit('item-add', { type: item.type, qty: item.qty || 1 });
    }
  });

  socket.on('item-drop', (d) => {
    if (!d || typeof d.type !== 'string' || d.type.length > 60) return;
    const qty = Math.max(1, Math.min(999, Number(d.qty) || 1));
    const ang = Math.random() * Math.PI * 2;
    const id  = ++itemIdCounter;
    const drop = {
      id, type: d.type, qty,
      x: p.x + Math.cos(ang) * 1.0,   // position autoritative du joueur (+léger décalage)
      z: p.z + Math.sin(ang) * 1.0,
      // pas de loot:true → l'objet jeté n'est pas effacé au respawn horaire
    };
    items.set(id, drop);
    io.emit('item-spawn', drop);
  });

  socket.on('place-structure', (d) => {
    if (!d || typeof d.type !== 'string' || !d.type.startsWith('struct_')) return;
    const x = Number(d.x), z = Number(d.z), rotY = Number(d.rotY) || 0;
    const y = Number(d.y);
    if (!isFinite(x) || !isFinite(z)) return;
    // Anti-triche léger : pose seulement à portée raisonnable du joueur
    if (Math.hypot(x - p.x, z - p.z) > 8) return;
    const colliders = Array.isArray(d.colliders)
      ? d.colliders.filter(c => c && c.type === 'box' &&
          isFinite(c.cx) && isFinite(c.cz) && isFinite(c.hw) && isFinite(c.hd)).slice(0, 4)
      : [];
    const id = ++structureIdCounter;
    const st = { id, type: d.type, x, z, rotY, owner: p.id };
    if (isFinite(y)) st.y = y;
    st.colliders = colliders;
    structures.set(id, st);
    // Les zombies (au sol) ne se cognent que dans les murs du rez-de-chaussée (sans minY)
    for (const c of colliders) if (c.minY === undefined) structureColliders.push(c);
    io.emit('structure-spawn', st);
  });

  socket.on('inventory-sync', (slots) => {
    if (slots && typeof slots === 'object') { p.inv = slots; p.dirty = true; }
  });

  socket.on('survival-sync', (sv) => {
    if (sv && typeof sv === 'object') {
      p.survival = {
        faim:       Math.max(0, Math.min(100, Number(sv.faim) || 0)),
        soif:       Math.max(0, Math.min(100, Number(sv.soif) || 0)),
        infection:  Math.max(0, Math.min(100, Number(sv.infection) || 0)),
        saignement: !!sv.saignement,
      };
      // Vie autoritaire côté client (armure → peut dépasser 100) ; on persiste.
      if (typeof sv.health === 'number') p.health = Math.max(0, Math.min(999, sv.health));
      p.dirty = true;
    }
  });

  // Mort : le butin du joueur tombe au sol dans une caisse récupérable 30 min.
  socket.on('player-died', () => {
    const loot = flattenInv(p.inv);
    if (loot.length) {
      const id  = ++itemIdCounter;
      const bag = { id, type: 'death_bag', bag: true, x: p.x, z: p.z,
                    items: loot, expiresAt: Date.now() + DEATH_BAG_MS, owner: p.username };
      items.set(id, bag);
      io.emit('item-spawn', bag);
    }
  });

  socket.on('respawn', () => {
    p.health = 100;
    p.invincible = true;
    p.inv = JSON.parse(JSON.stringify(STARTING_ITEMS));   // kit de départ (comme 1re connexion)
    p.survival = { ...DEFAULT_SURVIVAL };
    p.x = FOREST_SPAWN.x; p.y = FOREST_SPAWN.y; p.z = FOREST_SPAWN.z; p.rotY = FOREST_SPAWN.rotY;
    p.dirty = true;
    setTimeout(() => { if (players.has(socket.id)) p.invincible = false; }, 3000);
    socket.emit('take-damage', { health: 100 });
    socket.emit('respawn-at', { spawn: FOREST_SPAWN, inventory: STARTING_ITEMS, survival: DEFAULT_SURVIVAL });
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    console.log(`- ${p.username} (${players.size} en ligne)`);
    io.emit('player-leave', socket.id);
    if (p.id) savePlayerState(p.id, p.x, p.y, p.z, p.rotY, p.health, p.kills, saveBlob(p)).catch(() => {});
  });
});

// ── Réinitialisation unique (lancement) ───────────────────────────────────────
// Remet TOUS les joueurs à l'état « première connexion » : kit de départ + survie
// par défaut, spawn dans Start Forest, vie pleine. Protégé par un marqueur pour ne
// s'exécuter qu'une fois au prochain démarrage.
async function resetAllPlayersOnce() {
  const marker = path.join(__dirname, '.inventory_reset_v4_done');
  if (fs.existsSync(marker)) return;
  try {
    const [r] = await pool.execute(
      'UPDATE players SET inventory = ?, pos_x = ?, pos_y = ?, pos_z = ?, rot_y = ?, health = 100',
      [STARTING_SAVE, FOREST_SPAWN.x, FOREST_SPAWN.y, FOREST_SPAWN.z, FOREST_SPAWN.rotY]
    );
    fs.writeFileSync(marker, new Date().toISOString());
    console.log(`🔄 Joueurs réinitialisés (inventaire vide + spawn forêt) : ${r.affectedRows} joueur(s).`);
  } catch (e) {
    console.error('Reset joueurs échoué (réessai au prochain démarrage):', e.message);
  }
}

server.listen(PORT, async () => {
  console.log(`🧟 Zombie Survival → http://localhost:${PORT}`);
  await resetAllPlayersOnce();
});
