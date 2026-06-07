'use strict';
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { pathToFileURL } = require('url');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./src/db');
const { getPlayer, createPlayer, savePlayerState, pool, ensureWorldSchema } = db;
const log = require('./src/logger');
const { createRcon } = require('./src/rcon');
const { createWorldPersist } = require('./src/world-persist');
const worldPersist = createWorldPersist(db, log);

// Dev SQLite : mot de passe par défaut "dev" si RCON_PASSWORD absent (prod MySQL = désactivé)
const RCON_PASSWORD = process.env.RCON_PASSWORD
  || (process.env.DB_CLIENT === 'sqlite' ? 'dev' : '');
const ADMIN_USERS = new Set(
  (process.env.ADMIN_USERS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);
// Dev local : admin auto pour tous (uniquement si RCON_AUTO_ADMIN=true dans .env)
const RCON_AUTO_ADMIN = process.env.RCON_AUTO_ADMIN === 'true'
  && process.env.DB_CLIENT === 'sqlite';

function _gitCommit() {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT;
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}
const GIT_COMMIT = _gitCommit();

if (ADMIN_USERS.size) {
  log.info('boot', 'RCON admins', { users: [...ADMIN_USERS], autoAll: RCON_AUTO_ADMIN });
}

function authFromHeader(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

const app = express();
const server = http.createServer(app);
if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
const io = new Server(server, {
  cors: { origin: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_CHANGE_ME';
const WORLD_RADIUS = 290;   // borne d'errance (carte ~±300)
const ZOMBIE_COUNT = 70;
const ROOT_DIR = path.resolve(__dirname, '../..');
const CLIENT_ROOT = path.join(ROOT_DIR, 'apps/client');
const CLIENT_SRC = path.join(CLIENT_ROOT, 'src');
const CLIENT_DIST = path.join(ROOT_DIR, 'build/client');
const CLIENT_PUBLIC = path.join(CLIENT_ROOT, 'public');
const USE_CLIENT_BUILD =
  process.env.USE_CLIENT_BUILD === 'true'
  || (process.env.NODE_ENV === 'production'
    && fs.existsSync(path.join(CLIENT_DIST, 'index.html')));

function _noCacheJs(res, filePath) {
  if (filePath.endsWith('.js')) res.set('Cache-Control', 'no-cache');
}

function _sendClientHtml(res, fileName) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const filePath = USE_CLIENT_BUILD
    ? path.join(CLIENT_DIST, fileName)
    : path.join(CLIENT_ROOT, fileName);
  res.sendFile(filePath, (err) => {
    if (err) {
      log.error('client', 'html send failed', { fileName, err: err.message });
      if (!res.headersSent) res.status(500).json({ error: 'Client entrypoint unavailable' });
    }
  });
}

function _registerClientStatic() {
  app.get('/favicon.ico', (req, res) => res.status(204).end());
  app.get('/', (req, res) => _sendClientHtml(res, 'index.html'));
  app.get('/index.html', (req, res) => _sendClientHtml(res, 'index.html'));
  app.get('/game.html', (req, res) => _sendClientHtml(res, 'game.html'));
  app.get('/webrcon.html', (req, res) => _sendClientHtml(res, 'webrcon.html'));
  app.get('/arm-preview.html', (req, res) => _sendClientHtml(res, 'arm-preview.html'));
  app.get('/models-preview.html', (req, res) => _sendClientHtml(res, 'models-preview.html'));

  if (USE_CLIENT_BUILD) {
    app.use(express.static(CLIENT_DIST, { setHeaders: _noCacheJs }));
    return;
  }

  app.use('/src', express.static(CLIENT_SRC, { setHeaders: _noCacheJs }));
  app.use(express.static(CLIENT_PUBLIC, { setHeaders: _noCacheJs }));
}

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

function getWaterSlowFactor(x, z) {
  for (const wz of worldWaterZones) {
    if (Math.hypot(x - wz.x, z - wz.z) < wz.r) return 0.55;
  }
  return 1;
}

app.use(express.json());
_registerClientStatic();

// ── Game state (avant /api/health pour le handler) ───────────────────────────

const players         = new Map();
const sleepingPlayers = new Map(); // playerId → corps endormi (déco)
const SLEEP_LOOT_RADIUS = 3.5;
let serverReady  = false;
const bootStatus = { phase: 'starting', progress: 0 };

function _setBoot(phase, progress) {
  bootStatus.phase = phase;
  bootStatus.progress = Math.max(0, Math.min(13, Math.round(progress)));
}

function _emitPlayersOnline() {
  io.emit('players-online', { count: players.size });
}

// ── Health (client attend que le serveur soit prêt) ───────────────────────────

app.get('/api/health', (req, res) => {
  if (!serverReady) {
    return res.status(503).json({
      ok: false,
      ready: false,
      status: 'starting',
      boot: { ...bootStatus },
    });
  }
  res.json({
    ok: true,
    ready: true,
    players: players.size,
    uptime: Math.floor(process.uptime()),
    rcon: !!(RCON_PASSWORD || ADMIN_USERS.size),
    chat: true,
    commit: GIT_COMMIT,
    decor: _decorStats(),
  });
});

/** Rochers monde synchronisables (debug + resync client). */
app.get('/api/world/decor-rocks', (req, res) => {
  if (!serverReady) return res.status(503).json({ ok: false, ready: false });
  const items = Array.from(decorItems.values()).filter(
    (d) => d.kind === 'prefab' && _isMinableRockPrefab(d.prefabId) && !d.anchorId,
  );
  res.json({ ok: true, count: items.length, items });
});

// Console RCON externe (scripts, curl) — header X-RCON-Password ou body.password
app.post('/api/rcon', async (req, res) => {
  const pw = req.headers['x-rcon-password'] || req.body?.password || '';
  if (!RCON_PASSWORD) {
    return res.status(503).json({ ok: false, error: 'RCON désactivé — définissez RCON_PASSWORD dans .env' });
  }
  if (pw !== RCON_PASSWORD) {
    return res.status(403).json({ ok: false, error: 'Mot de passe RCON invalide' });
  }
  const cmd = (req.body?.cmd || req.body?.command || '').trim();
  if (!cmd) return res.status(400).json({ ok: false, error: 'cmd requis' });
  if (!rcon) return res.status(503).json({ ok: false, error: 'Serveur en démarrage' });
  try {
    const result = await rcon.execute(cmd, { player: { username: 'api' } });
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/rcon/session', async (req, res) => {
  const user = authFromHeader(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Non authentifié' });
  const isAdmin = isAdminUser(user.username) || RCON_AUTO_ADMIN;
  if (!isAdmin) return res.status(403).json({ ok: false, error: 'Accès admin requis' });
  const cmd = (req.body?.cmd || req.body?.command || '').trim();
  if (!cmd) return res.status(400).json({ ok: false, error: 'cmd requis' });
  if (!rcon) return res.status(503).json({ ok: false, error: 'Serveur en démarrage' });
  try {
    const result = await rcon.execute(cmd, { player: { username: user.username } });
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

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
    const id = await createPlayer(username, hash, STARTING_SAVE, BEACH_SPAWN);
    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
    const isAdmin = isAdminUser(username) || RCON_AUTO_ADMIN;
    log.info('auth', 'register ok', { username });
    res.json({ token, username, isAdmin, rconEnabled: isAdmin });
  } catch (err) {
    log.error('auth', 'register failed', { username, err: err.message });
    res.status(500).json({ error: 'Erreur serveur: ' + err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = authFromHeader(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié' });
  const isAdmin = isAdminUser(user.username) || RCON_AUTO_ADMIN;
  res.json({
    username: user.username,
    isAdmin,
    rconEnabled: isAdmin,
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Champs manquants' });

  try {
    const player = await getPlayer(username);
    if (!player || !(await bcrypt.compare(password, player.password_hash)))
      return res.status(401).json({ error: 'Identifiants invalides' });

    const token = jwt.sign({ id: player.id, username: player.username }, JWT_SECRET, { expiresIn: '7d' });
    log.info('auth', 'login ok', {
      username: player.username,
      spawn: { x: player.pos_x ?? 0, y: player.pos_y ?? 0, z: player.pos_z ?? 0 },
      health: player.health ?? 100,
      kills: player.kills ?? 0,
    });
    const isAdmin = isAdminUser(player.username) || RCON_AUTO_ADMIN;
    res.json({
      token, username: player.username,
      isAdmin,
      rconEnabled: isAdmin,
      spawn: { x: player.pos_x ?? 0, y: player.pos_y ?? 0, z: player.pos_z ?? 0, rotY: player.rot_y ?? 0 },
      health: player.health ?? 100,
      kills: player.kills ?? 0
    });
  } catch (err) {
    log.error('auth', 'login failed', { username, err: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Game state (suite) ───────────────────────────────────────────────────────

const zombies    = new Map();
const items      = new Map(); // world pickup items (+ butins de mort : bag:true)
const structures = new Map(); // structures construites par les joueurs (base)
const decorItems = new Map(); // props monde (seed + constructions joueurs)
let decorSeq = 1;
const decorPrefabs = [
  'spawn_campfire',
  'spawn_log_pile',
  'spawn_border_log',
  'spawn_supply_crate',
  'spawn_marker_left',
  'spawn_marker_right',
  'spawn_bedroll',
  'spawn_backpack',
  'spawn_lean_to',
  'spawn_stump_seat',
  'spawn_drink_set',
  'spawn_lantern',
  'spawn_stone',
  'rock_boulder',
  'rock_outcrop',
  'spawn_workbench',
  'spawn_flat_stone',
  'storage_chest',
  'build_wall_wood',
  'build_doorway_wood',
  'build_large_doorway_wood',
  'build_floor_wood',
  'build_ceiling_wood',
  'build_stair_wood',
  'build_door_wood',
  'build_large_door_wood',
  'wreck_sedan',
  'wreck_pickup',
  'tree_oak',
  'tree_pine',
  'tree_birch',
  'tree_dead',
  'building_survivor_shack',
];
const DECOR_PREFAB_BY_ITEM = {
  struct_storage_chest: 'storage_chest',
  struct_mur_bois: 'build_wall_wood',
  struct_mur_embrasure_porte: 'build_doorway_wood',
  struct_mur_embrasure_grande_porte: 'build_large_doorway_wood',
  struct_plancher_bois: 'build_floor_wood',
  struct_plafond_bois: 'build_ceiling_wood',
  struct_escalier_bois: 'build_stair_wood',
  struct_porte_bois: 'build_door_wood',
  struct_grande_porte_bois: 'build_large_door_wood',
};
const DOOR_PREFABS = new Set(['building_survivor_shack', 'build_door_wood', 'build_large_door_wood']);
const STORAGE_CHEST_CAPACITY = 27;
const STORAGE_CHEST_BREAK_HITS = 3;
let zombieIdCounter    = 0;
let itemIdCounter      = 0;
let structureIdCounter = 0;
let doorLockSeq        = 0;
let worldWaterZones    = [];

// ── Spawn / kit / survie ──────────────────────────────────────────────────────
const BEACH_SPAWN      = { x: 234, y: 1, z: 8, rotY: Math.PI / 2 }; // sync beach-spawn.mjs
const DEFAULT_SURVIVAL = { faim: 80, soif: 80, infection: 0, saignement: false };
const STARTING_ITEMS   = {
  hotbar: [{ type: 'tool_caillou', qty: 1, durability: 80 }, null, null, null, null, null],
  bag: [],
  equip: { 'Tête': null, 'Torso': null, 'Mains': null, 'Dos': null },
};

function ensureStarterRock(p) {
  const inv = p.inv;
  if (!inv || typeof inv !== 'object') return false;
  const hotbar = Array.isArray(inv.hotbar) ? inv.hotbar : [];
  const bag = inv.bag || [];
  const equip = inv.equip || {};
  const hasAny = hotbar.some((s) => s && s.type)
    || bag.some((s) => s && s.type)
    || Object.values(equip).some((s) => s && s.type);
  if (hasAny) return false;
  inv.hotbar = [{ type: 'tool_caillou', qty: 1, durability: 80 }, null, null, null, null, null];
  inv.bag = inv.bag || [];
  return true;
}
const STARTING_SAVE = JSON.stringify({ ...STARTING_ITEMS, survival: DEFAULT_SURVIVAL });
const GROUND_ITEM_TTL_MS = 30 * 60 * 1000; // drops joueur / mort / zombie / coffre : 30 min

// Sauvegarde combinée (objets + survie) écrite dans la colonne JSON `inventory`.
function saveBlob(p) {
  const base = Array.isArray(p.inv) ? { hotbar: p.inv } : (p.inv || {});
  return JSON.stringify({ ...base, survival: p.survival || DEFAULT_SURVIVAL });
}

// Aplati l'inventaire d'un joueur en liste d'objets pour le butin de mort.
function flattenInv(inv) {
  const out = [];
  const push = (s) => {
    if (!s?.type) return;
    const o = { type: s.type, qty: s.qty || 1 };
    if (s.lockId) o.lockId = s.lockId;
    if (s.durability != null) o.durability = s.durability;
    if (s.ammo != null) o.ammo = s.ammo;
    out.push(o);
  };
  if (!inv || typeof inv !== 'object') return out;
  (Array.isArray(inv) ? inv : (inv.hotbar || [])).forEach(push);
  (inv.bag || []).forEach(push);
  if (inv.equip) for (const k of Object.keys(inv.equip)) push(inv.equip[k]);
  return out;
}

function _iterInvStacks(inv) {
  if (!inv || typeof inv !== 'object') return [];
  const hotbar = Array.isArray(inv) ? inv : (inv.hotbar || []);
  const bag = Array.isArray(inv) ? [] : (inv.bag || []);
  const equip = Array.isArray(inv) ? {} : (inv.equip || {});
  return [...hotbar, ...bag, ...Object.values(equip)];
}

function _playerHasDoorKey(inv, lockId) {
  if (!lockId) return false;
  return _iterInvStacks(inv).some(
    (s) => s && s.type === 'struct_cle' && s.lockId === lockId,
  );
}

function _normalizeInv(inv) {
  if (!inv || typeof inv !== 'object') {
    return { hotbar: [], bag: [], equip: { Tête: null, Torso: null, Mains: null, Dos: null } };
  }
  if (Array.isArray(inv)) return { hotbar: inv, bag: [], equip: { Tête: null, Torso: null, Mains: null, Dos: null } };
  return {
    hotbar: inv.hotbar || [],
    bag: inv.bag || [],
    equip: inv.equip || { Tête: null, Torso: null, Mains: null, Dos: null },
  };
}

function _cloneInv(inv) {
  return JSON.parse(JSON.stringify(_normalizeInv(inv)));
}

function _sleepBodyId(playerId) {
  return `sleep:${playerId}`;
}

function _normPlayerId(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n : id;
}

/** Session encore ouverte (refresh : nouvelle socket avant déco de l'ancienne). */
function _takeoverLiveSession(userId, newSocketId) {
  const uid = _normPlayerId(userId);
  for (const [sid, op] of players.entries()) {
    if (_normPlayerId(op.id) !== uid || sid === newSocketId) continue;
    players.delete(sid);
    adminSockets.delete(sid);
    const oldSock = io.sockets.sockets.get(sid);
    if (oldSock) {
      oldSock._handoff = true;
      oldSock.disconnect(true);
    }
    log.info('socket', 'session handoff', { username: op.username, from: sid, to: newSocketId });
    return op;
  }
  return null;
}

function _hasOnlineSession(userId, exceptSocketId) {
  const uid = _normPlayerId(userId);
  for (const [sid, op] of players.entries()) {
    if (sid === exceptSocketId) continue;
    if (_normPlayerId(op.id) === uid) return true;
  }
  return false;
}

function _distXZ(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

function _takeInvSlot(inv, zone, index) {
  const n = _normalizeInv(inv);
  if (zone === 'equip') {
    const key = String(index);
    const item = n.equip[key];
    if (!item || !item.type) return null;
    n.equip[key] = null;
    Object.assign(inv, n);
    return JSON.parse(JSON.stringify(item));
  }
  const arr = zone === 'bag' ? n.bag : n.hotbar;
  const i = Number(index);
  if (!Number.isFinite(i) || i < 0 || i >= arr.length) return null;
  const item = arr[i];
  if (!item || !item.type) return null;
  arr[i] = null;
  Object.assign(inv, n);
  return JSON.parse(JSON.stringify(item));
}

function _tryAddSlotToInv(inv, item) {
  const r = _addStackToInv(inv, item);
  return r.added > 0 && r.leftover === 0;
}

/** Ajoute autant que possible ; retourne le reste non placé. */
function _addStackToInv(inv, item) {
  if (!item?.type) return { added: 0, leftover: 0 };
  const qty = Math.max(1, Math.min(999, Number(item.qty) || 1));
  if (item.type === 'struct_cle' && item.lockId) {
    if (qty !== 1) return { added: 0, leftover: qty };
    const clone = JSON.parse(JSON.stringify({ ...item, qty: 1 }));
    if (_addStackToInvOnce(inv, clone)) return { added: 1, leftover: 0 };
    return { added: 0, leftover: 1 };
  }
  const n = _normalizeInv(inv);
  let left = qty;
  const maxStack = 99;
  for (const arr of [n.hotbar, n.bag]) {
    for (let i = 0; i < arr.length && left > 0; i++) {
      if (!arr[i] || arr[i].type !== item.type) continue;
      if (item.lockId && arr[i].lockId !== item.lockId) continue;
      const room = maxStack - (arr[i].qty || 1);
      if (room <= 0) continue;
      const add = Math.min(room, left);
      arr[i].qty = (arr[i].qty || 1) + add;
      left -= add;
    }
  }
  for (const arr of [n.hotbar, n.bag]) {
    for (let i = 0; i < arr.length && left > 0; i++) {
      if (arr[i]) continue;
      const add = Math.min(maxStack, left);
      arr[i] = JSON.parse(JSON.stringify({ ...item, qty: add }));
      left -= add;
    }
  }
  Object.assign(inv, n);
  return { added: qty - left, leftover: left };
}

function _addStackToInvOnce(inv, item) {
  if (!item?.type) return false;
  const n = _normalizeInv(inv);
  if (item.type === 'struct_cle' && item.lockId) {
    for (const arr of [n.hotbar, n.bag]) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i]) continue;
        arr[i] = JSON.parse(JSON.stringify({ ...item, qty: item.qty || 1 }));
        Object.assign(inv, n);
        return true;
      }
    }
    return false;
  }
  return _addStackToInv(inv, item).leftover === 0;
}

function _spawnChestOverflowDrop(type, qty, baseX, baseZ, extra, idx) {
  const a = (idx / Math.max(1, idx + 1)) * Math.PI * 2 + idx * 0.4;
  const r = 0.4 + (idx % 4) * 0.22;
  return _dropWorldItem(
    type,
    Math.max(1, qty),
    baseX + Math.cos(a) * r,
    baseZ + Math.sin(a) * r,
    extra,
  );
}

function _consumeInvType(inv, type, qty = 1) {
  let left = qty;
  const n = _normalizeInv(inv);
  for (const arr of [n.hotbar, n.bag]) {
    for (let i = 0; i < arr.length && left > 0; i++) {
      if (!arr[i] || arr[i].type !== type) continue;
      const have = arr[i].qty || 1;
      if (have <= left) {
        left -= have;
        arr[i] = null;
      } else {
        arr[i].qty = have - left;
        left = 0;
      }
    }
  }
  if (left > 0) return false;
  Object.assign(inv, n);
  return true;
}

function _consumeDoorKey(inv, lockId) {
  if (!lockId) return false;
  const n = _normalizeInv(inv);
  for (const arr of [n.hotbar, n.bag]) {
    for (let i = 0; i < arr.length; i++) {
      const s = arr[i];
      if (!s || s.type !== 'struct_cle' || s.lockId !== lockId) continue;
      arr[i] = null;
      Object.assign(inv, n);
      return true;
    }
  }
  return false;
}

function _getNearbyDoor(id, px, pz, maxDist = 6) {
  if (!id || typeof id !== 'string') return null;
  const item = decorItems.get(id);
  if (!item || !DOOR_PREFABS.has(item.prefabId)) return null;
  if (Math.hypot((item.x || 0) - px, (item.z || 0) - pz) > maxDist) return null;
  return item;
}

function _dropWorldItem(type, qty, x, z, extra = {}) {
  const id = ++itemIdCounter;
  return _addGroundItem({ id, type, qty, x, z, ...extra });
}

function _addGroundItem(drop) {
  if (!drop?.id) return null;
  const item = { ...drop };
  // Loot de bâtiment (loot:true) : reste jusqu'au ramassage. Tout le reste : 30 min.
  if (!item.loot && item.expiresAt == null) {
    item.expiresAt = Date.now() + GROUND_ITEM_TTL_MS;
  }
  items.set(item.id, item);
  worldPersist.scheduleUpsertItem(item);
  io.emit('item-spawn', item);
  return item;
}

function _removeGroundItem(id, { emit = true } = {}) {
  const item = items.get(id);
  if (!item) return false;
  items.delete(id);
  worldPersist.scheduleDeleteItem(id, item);
  if (emit) io.emit('item-remove', id);
  return true;
}

function _hasPersistedBuildingLoot() {
  for (const it of items.values()) {
    if (it.loot) return true;
  }
  return false;
}

function _saveSleepingToDb(sleep) {
  if (!sleep?.playerId) return;
  worldPersist?.scheduleUpsertSleeper?.(sleep);
  savePlayerState(
    sleep.playerId,
    sleep.x,
    sleep.y,
    sleep.z,
    sleep.rotY,
    sleep.health ?? 100,
    sleep.kills ?? 0,
    saveBlob({ inv: sleep.inv, survival: sleep.survival || DEFAULT_SURVIVAL }),
    sleep.username
  ).catch(() => {});
}

function _persistPlayer(p) {
  if (!p?.id) return Promise.resolve(0);
  return savePlayerState(p.id, p.x, p.y, p.z, p.rotY, p.health, p.kills, saveBlob(p), p.username)
    .catch((err) => {
      log.warn('save', 'persist failed', { user: p.username, err: err.message });
      return 0;
    });
}

function _storagePayload(item) {
  if (!item || item.prefabId !== 'storage_chest') return null;
  if (!Array.isArray(item.storage)) item.storage = [];
  return {
    id: item.id,
    items: item.storage.map((s) => ({ type: s.type, qty: s.qty || 1 })),
    capacity: STORAGE_CHEST_CAPACITY,
  };
}

function _emitStorageUpdate(item) {
  const payload = _storagePayload(item);
  if (payload) io.emit('storage-update', payload);
}

function _spawnWorldDrop(type, qty, x, z, extra = {}) {
  if (!type) return null;
  const id = ++itemIdCounter;
  return _addGroundItem({
    id,
    type,
    qty: Math.max(1, Math.min(999, Number(qty) || 1)),
    x,
    z,
    ...extra,
  });
}

const ROAD_WRECKS_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/road-wrecks.mjs')).href;
const ROAD_BARRIERS_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/road-barriers.mjs')).href;
const TREE_PLACEMENTS_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/tree-placements.mjs')).href;
const TREE_WOOD_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/tree-wood.mjs')).href;
const ROCK_STONE_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/rock-stone.mjs')).href;
const ROCK_PLACEMENTS_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/rock-placements.mjs')).href;
const BUILD_DAMAGE_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/build-damage.mjs')).href;
const buildDamageModPromise = import(BUILD_DAMAGE_URL);
const RESOURCE_REGEN_URL = pathToFileURL(path.join(__dirname, 'src/resource-regen.mjs')).href;
const _TREE_WOOD_FALLBACK = { tree_oak: 8, tree_pine: 10, tree_birch: 6, tree_dead: 3 };
const _TREE_WOOD_RATIO = [0.1, 0.28, 0.5, 0.78, 1.0];
const _ROCK_STONE_FALLBACK = { rock_boulder: 20, rock_outcrop: 14, spawn_stone: 8 };

function _treeWoodForPhase(prefabId, phase) {
  const p = Math.max(0, Math.min(4, Math.floor(Number(phase) ?? 4)));
  const adult = _TREE_WOOD_FALLBACK[prefabId] ?? 6;
  return Math.max(1, Math.floor(adult * _TREE_WOOD_RATIO[p]));
}

function _applyTreeFields(item) {
  if (!item.prefabId?.startsWith('tree_')) return;
  const isRegen = item.regen || item.zoneId === 'regen_tree';
  if (item.growthPhase == null) item.growthPhase = isRegen ? 0 : 4;
  if (item.plantedAt == null) item.plantedAt = item.createdAt || Date.now();
  if (item.woodMax == null) item.woodMax = _treeWoodForPhase(item.prefabId, item.growthPhase);
  if (item.woodRemaining == null) item.woodRemaining = item.woodMax;
}

function _isMinableRockPrefab(prefabId) {
  return prefabId === 'spawn_stone' || prefabId?.startsWith('rock_');
}

function _decorStats() {
  const list = Array.from(decorItems.values());
  return {
    total: list.length,
    trees: list.filter((d) => d.prefabId?.startsWith('tree_')).length,
    worldRocks: list.filter((d) => _isMinableRockPrefab(d.prefabId) && !d.anchorId).length,
    campRocks: list.filter((d) => _isMinableRockPrefab(d.prefabId) && d.anchorId).length,
  };
}

function _touchDecorItem(item) {
  if (item) worldPersist?.scheduleUpsertDecor(item);
}

function _removeDecorItem(id, { emit = true } = {}) {
  const item = decorItems.get(id);
  if (!item) return false;
  decorItems.delete(id);
  worldPersist?.scheduleDeleteDecor(id, item);
  if (emit) io.emit('decor-item-remove', id);
  return true;
}

function _seedDecorId(placementKey) {
  if (!placementKey) return null;
  const safe = String(placementKey).replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 88);
  return `seed_${safe}`;
}

function _getPlacementKey(d) {
  if (!d) return null;
  if (d.placementKey) return String(d.placementKey);
  if (d.anchorId) return `anchor:${d.anchorId}`;
  if (d.prefabId?.startsWith('tree_') && d.zoneId != null && d.treeSeed != null) {
    return `tree:${d.zoneId}:${d.treeSeed}`;
  }
  if (_isMinableRockPrefab(d.prefabId) && d.zoneId != null && d.rockSeed != null) {
    return `rock:${d.zoneId}:${d.rockSeed}`;
  }
  return null;
}

function _shouldSkipSeedPlacement(placementKey) {
  if (!placementKey) return false;
  if (worldPersist?.isSeedRemoved?.(placementKey)) return true;
  const id = _seedDecorId(placementKey);
  return !!(id && decorItems.has(id));
}

function _trySeedDecor(placement, extra = {}) {
  const merged = { ...placement, ...extra };
  const placementKey = _getPlacementKey(merged);
  if (placementKey && _shouldSkipSeedPlacement(placementKey)) return null;
  const id = placementKey ? _seedDecorId(placementKey) : null;
  return _makeDecorItem({ ...merged, placementKey, ...(id ? { id } : {}) });
}

function _makeDecorItem(d) {
  const placementKey = _getPlacementKey(d) || d.placementKey || null;
  const id = d.id || (placementKey ? _seedDecorId(placementKey) : `decor_${decorSeq++}`);
  const item = {
    y: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    scale: 1,
    createdBy: 'seed',
    createdAt: Date.now(),
    ...d,
    id,
    placementKey,
  };
  if (!item.kind) {
    if (item.prefabId) item.kind = 'prefab';
    else if (item.type) item.kind = 'item';
  }
  if (item.prefabId === 'storage_chest' && !Array.isArray(item.storage)) {
    item.storage = [];
    item.storageOpen = !!item.storageOpen;
  }
  if (item.prefabId?.startsWith('tree_')) {
    _applyTreeFields(item);
  }
  if (_isMinableRockPrefab(item.prefabId) && item.stoneMax == null) {
    item.stoneMax = _ROCK_STONE_FALLBACK[item.prefabId] ?? 10;
    if (item.stoneRemaining == null) item.stoneRemaining = item.stoneMax;
  }
  if (item.prefabId?.startsWith('build_') && item.prefabId.endsWith('_wood')) {
    if (item.buildDamage == null) item.buildDamage = 0;
    if (item.buildMaxHp == null) item.buildMaxHp = 100;
  }
  decorItems.set(item.id, item);
  worldPersist?.scheduleUpsertDecor(item);
  return item;
}

/** Ajoute les épaves routières si absentes (boot ou RCON decorseed wrecks). */
function ensureRoadWrecks({ broadcast = false, reset = false } = {}) {
  if (reset) {
    for (const [id, d] of decorItems) {
      if (!d.prefabId?.startsWith('wreck_')) continue;
      _removeDecorItem(id, { emit: broadcast });
    }
  }
  return import(ROAD_WRECKS_URL).then(({ computeRoadWreckPlacements }) => {
    const added = [];
    for (const w of computeRoadWreckPlacements()) {
      const item = _trySeedDecor(w);
      if (item) added.push(item);
    }
    if (added.length) {
      log.info('seed', 'road wrecks added', { count: added.length });
      if (broadcast && rcon?.broadcastDecorSpawn) {
        for (const item of added) rcon.broadcastDecorSpawn(item);
      }
    }
    return added.length;
  });
}

/** Barrières routières prefab — seed serveur (boot ou RCON decorseed barriers). */
function ensureRoadBarriers({ broadcast = false, reset = false } = {}) {
  if (reset) {
    for (const [id, d] of decorItems) {
      if (!d.prefabId?.startsWith('road_barrier_')) continue;
      _removeDecorItem(id, { emit: broadcast });
    }
  }
  return import(ROAD_BARRIERS_URL).then(({ computeRoadBarrierPlacements }) => {
    const added = [];
    for (const b of computeRoadBarrierPlacements()) {
      const item = _trySeedDecor(b);
      if (item) added.push(item);
    }
    if (added.length) {
      log.info('seed', 'road barriers added', { count: added.length });
      if (broadcast && rcon?.broadcastDecorSpawn) {
        for (const item of added) rcon.broadcastDecorSpawn(item);
      }
    }
    return added.length;
  });
}

/** Ajoute les arbres prefab forêt si absents (boot ou RCON decorseed trees). */
function ensureWorldTrees({ broadcast = false, reset = false } = {}) {
  if (reset) {
    for (const [id, d] of decorItems) {
      if (!d.prefabId?.startsWith('tree_')) continue;
      _removeDecorItem(id, { emit: broadcast });
    }
  }
  return import(TREE_PLACEMENTS_URL).then(({ computeTreePlacements }) =>
    import(TREE_WOOD_URL).then(({ getTreeWoodMax }) => {
    const added = [];
    for (const t of computeTreePlacements()) {
      const woodMax = getTreeWoodMax(t.prefabId);
      const item = _trySeedDecor(t, { woodMax, woodRemaining: woodMax });
      if (item) added.push(item);
    }
    if (added.length) {
      log.info('seed', 'world trees added', { count: added.length });
      if (broadcast && rcon?.broadcastDecorSpawn) {
        for (const item of added) rcon.broadcastDecorSpawn(item);
      }
    }
    return added.length;
  }));
}

/** Rochers fixes au spawn — ancres stables, complétées si manquantes. */
function ensureCampRocks({ broadcast = false, reset = false } = {}) {
  if (reset) {
    for (const [id, d] of decorItems) {
      if (!d.anchorId) continue;
      if (!_isMinableRockPrefab(d.prefabId)) continue;
      _removeDecorItem(id, { emit: broadcast });
    }
  }
  return import(ROCK_PLACEMENTS_URL).then(({ computeCampRockAnchors, rockPlacementKey }) =>
    import(ROCK_STONE_URL).then(({ getRockStoneMax }) =>
      import(pathToFileURL(path.join(__dirname, '../../packages/shared/src/resource-spawn.mjs')).href)
        .then(({ isRockAnchorClear }) => {
      const occupied = Array.from(decorItems.values());
      const added = [];
      for (const r of computeCampRockAnchors()) {
        const placementKey = rockPlacementKey(r);
        if (_shouldSkipSeedPlacement(placementKey)) continue;
        const scale = Number.isFinite(r.scale) ? r.scale : 1.4;
        if (!isRockAnchorClear(r.x, r.z, occupied, { minGap: 2.8, rockScale: scale })) {
          log.warn('seed', 'camp rock anchor skipped (overlap)', {
            anchorId: r.anchorId,
            x: r.x,
            z: r.z,
          });
          continue;
        }
        const stoneMax = getRockStoneMax(r.prefabId);
        const item = _trySeedDecor({ ...r, placementKey }, { stoneMax, stoneRemaining: stoneMax });
        if (!item) continue;
        occupied.push(item);
        added.push(item);
      }
      if (added.length) {
        log.info('seed', 'camp rocks added', { count: added.length });
        if (broadcast && rcon?.broadcastDecorSpawn) {
          for (const item of added) rcon.broadcastDecorSpawn(item);
        }
      }
      return added.length;
    })));
}

/** Ajoute les rochers minables (boot ou RCON decorseed rocks). */
function ensureWorldRocks({ broadcast = false, reset = false, force = false } = {}) {
  if (reset || force) {
    for (const [id, d] of decorItems) {
      if (d.anchorId) continue;
      if (!_isMinableRockPrefab(d.prefabId)) continue;
      _removeDecorItem(id, { emit: broadcast });
    }
  }
  const resourceSpawnUrl = pathToFileURL(
    path.join(__dirname, '../../packages/shared/src/resource-spawn.mjs'),
  ).href;
  return import(ROCK_PLACEMENTS_URL).then(({ rockPlacementKey }) =>
    import(ROCK_STONE_URL).then(({ getRockStoneMax }) =>
      import(resourceSpawnUrl).then(({ seedWorldRockPlacements, countWorldRocks, REGEN_CONFIG }) => {
        const occupied = Array.from(decorItems.values());
        const existing = countWorldRocks(occupied);
        const need = (reset || force)
          ? REGEN_CONFIG.rockTargetWorld
          : Math.max(0, REGEN_CONFIG.rockTargetWorld - existing);
        if (need <= 0) return 0;
        const added = [];
        for (const r of seedWorldRockPlacements(occupied, { target: need })) {
          const placementKey = rockPlacementKey(r);
          if (_shouldSkipSeedPlacement(placementKey)) continue;
          const stoneMax = getRockStoneMax(r.prefabId);
          const item = _trySeedDecor({ ...r, placementKey }, { stoneMax, stoneRemaining: stoneMax });
          if (!item) continue;
          occupied.push(item);
          added.push(item);
        }
        if (added.length) {
          log.info('seed', 'world rocks added', { count: added.length, target: REGEN_CONFIG.rockTargetWorld });
          if (broadcast && rcon?.broadcastDecorSpawn) {
            for (const item of added) rcon.broadcastDecorSpawn(item);
          }
        } else if (need > 0) {
          log.error('seed', 'world rocks FAILED — 0 placement', {
            need,
            occupied: occupied.length,
            existing,
          });
        }
        return added.length;
      })));
}

function seedSpawnDecorItems() {
  if (decorItems.size) return Promise.resolve();
  // Spawn plage — plus de camp/clairière forêt au boot.
  return Promise.resolve();
}

// ── Collision géométrique (transmise une fois par le premier client) ──────────
// Le client construit la géométrie : il est la source de vérité unique. On ne garde
// que l'empreinte 2D et on ignore les murs d'étage (minY), les zombies restant au sol.
// Les portes n'ont aucun collider → les zombies passent par les ouvertures comme les joueurs.
let worldColliders = [];
const structureColliders = []; // murs/portes construits par les joueurs
const ZOMBIE_R = 0.5;
/** Horde de départ autour de la plage — loin du point de spawn. */
const ZOMBIE_SPAWN_RING = { count: 12, rMin: 45, rMax: 130 };

function resolveZombieCollision(nx, nz, agentR = ZOMBIE_R) {
  const all = worldColliders.concat(structureColliders);
  if (_colliderResolve?.resolveAgentCollision) {
    return _colliderResolve.resolveAgentCollision(nx, nz, all, agentR, 0, { skipJumpable: false });
  }
  for (const c of all) {
    if (c.type === 'box') {
      const clampX = Math.max(c.cx - c.hw, Math.min(c.cx + c.hw, nx));
      const clampZ = Math.max(c.cz - c.hd, Math.min(c.cz + c.hd, nz));
      const dx = nx - clampX;
      const dz = nz - clampZ;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.0001) {
        if (dist < agentR) {
          const pen = agentR - dist;
          nx += (dx / dist) * pen;
          nz += (dz / dist) * pen;
        }
      } else {
        const l = nx - (c.cx - c.hw);
        const r = (c.cx + c.hw) - nx;
        const t = nz - (c.cz - c.hd);
        const b = (c.cz + c.hd) - nz;
        const m = Math.min(l, r, t, b);
        if      (m === l) nx = c.cx - c.hw - agentR;
        else if (m === r) nx = c.cx + c.hw + agentR;
        else if (m === t) nz = c.cz - c.hd - agentR;
        else              nz = c.cz + c.hd + agentR;
      }
    } else if (c.x !== undefined) {
      const dx = nx - c.x;
      const dz = nz - c.z;
      const dist = Math.hypot(dx, dz);
      const min = agentR + (c.r || 0.3);
      if (dist < min && dist > 0.0001) {
        const scale = min / dist;
        nx = c.x + dx * scale;
        nz = c.z + dz * scale;
      }
    }
  }
  return [nx, nz];
}

/** Vue zombie → joueur (murs / structures au rez-de-chaussée). */
function _zombieHasLineOfSight(zx, zz, px, pz) {
  const all = worldColliders.concat(structureColliders);
  if (_colliderResolve?.hasLineOfSight) {
    return _colliderResolve.hasLineOfSight(zx, zz, px, pz, all, 0, { endpointShrink: 0.45 });
  }
  return true;
}

// Temps mondial partagé — source de vérité pour tous les clients
let _worldTime = 0.3; // 0–1 (0=minuit, 0.25=lever, 0.5=midi, 0.75=coucher)
const _DAY_DURATION = 1800; // secondes par cycle complet (15 min jour + 15 min nuit)
const _TICK_DT = 0.1;      // durée du tick zombie en secondes

const serverFlags = {
  autoDay: true,
  zombieAI: true,
  zombieSpawn: true,
  lootEnabled: true,
};

const adminSockets = new Set();

function isAdminUser(username) {
  return ADMIN_USERS.has((username || '').toLowerCase());
}

function setWorldTime(t) {
  _worldTime = ((t % 1) + 1) % 1;
  worldPersist?.scheduleWorldState?.({ worldTime: _worldTime });
}

let rcon = null;

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
  'res_bois_brut', 'res_planche', 'res_pierre', 'res_ferraille', 'res_metal', 'res_clous',
  'res_ruban_adhesif', 'res_chiffon', 'res_corde',
  'tool_marteau', 'tool_hachette', 'tool_hache_pierre', 'tool_pioche', 'tool_pioche_pierre', 'tool_caillou',
  'wpn_lance_bois', 'wpn_lance_pierre',
  'struct_storage_chest',
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
    if (it.loot) _removeGroundItem(id);
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
      _addGroundItem({ id, type, x, z, qty: lootQty(type), loot: true });
    }
  }
  const generatedItems = [...items.values()].filter((i) => i.loot).length;
  log.info('loot', 'generated', { items: generatedItems, buildings: lootBuildings.length });
}

// Loot généré UNE seule fois (monde partagé et stable) — pas de régénération
// automatique : on ne crée pas de nouveaux items à chaque connexion/heure.
// (Respawn horaire désactivé volontairement.)

// Expiration objets au sol (drops, butins de mort…) — pas le loot permanent des bâtiments.
setInterval(() => {
  const now = Date.now();
  for (const [id, it] of items) {
    if (it.expiresAt && now > it.expiresAt) {
      _removeGroundItem(id);
      log.debug('items', 'ground item expired', {
        id,
        type: it.type,
        bag: !!it.bag,
        owner: it.owner,
      });
    }
  }
}, 60 * 1000);

const DETECT_RANGE   = 12;   // défaut si prefab sans detectRange
const AGGRO_MEMORY   = 5;
const AGGRO_LOST_SIGHT_DRAIN = 4;
const ZOMBIE_ATTACK_RANGE = 1.35;
const ZOMBIE_DMG       = 8;
const ZOMBIE_ATTACK_CD = 0.9;
const WANDER_SPEED   = 0.25;
const WANDER_TURN_MIN = 2;
const WANDER_TURN_MAX = 5;

const ZOMBIE_PREFABS_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/zombie-prefabs.mjs')).href;
const COLLIDER_RESOLVE_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/collider-resolve.mjs')).href;
let _zombiePrefabs = null;
let _colliderResolve = null;

async function loadZombiePrefabs() {
  if (!_zombiePrefabs) _zombiePrefabs = await import(ZOMBIE_PREFABS_URL);
  return _zombiePrefabs;
}

async function loadColliderResolve() {
  if (!_colliderResolve) _colliderResolve = await import(COLLIDER_RESOLVE_URL);
  return _colliderResolve;
}

function makeZombie(opts = {}) {
  const zp = _zombiePrefabs;
  let prefabId = opts.prefabId || null;
  const id = ++zombieIdCounter;
  let x;
  let z;
  if (Number.isFinite(opts.x) && Number.isFinite(opts.z)) {
    x = opts.x;
    z = opts.z;
  } else {
    const zone = pickZombieZone();
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * zone.r;
    x = zone.cx + Math.cos(ang) * dist;
    z = zone.cz + Math.sin(ang) * dist;
    if (!prefabId && zp?.pickZombiePrefabForZone) {
      prefabId = zp.pickZombiePrefabForZone(zone.name);
    }
  }
  if (!prefabId) prefabId = zp ? zp.pickZombiePrefab() : 'zombie_walker';
  if (zp?.buildZombieEntity) {
    return zp.buildZombieEntity(prefabId, { x, z }, id);
  }
  const wanderAngle = Math.random() * Math.PI * 2;
  return {
    id,
    prefabId: 'zombie_walker',
    x,
    y: 0,
    z,
    health: 100,
    maxHealth: 100,
    angle: wanderAngle,
    wanderAngle,
    wanderTimer: WANDER_TURN_MIN + Math.random() * (WANDER_TURN_MAX - WANDER_TURN_MIN),
    aggroTimer: 0,
    attackTimer: 0,
    speed: 1.8 + Math.random() * 1.4,
    damage: ZOMBIE_DMG,
    attackCd: ZOMBIE_ATTACK_CD,
    detectRange: DETECT_RANGE,
    hitRadius: 0.8,
    scale: 1,
  };
}

async function ensureZombiePopulation(opts = {}) {
  await loadZombiePrefabs();
  await loadColliderResolve();
  const target = ZOMBIE_COUNT;
  const reset = !!opts.reset;

  if (reset) {
    const ids = [...zombies.keys()];
    zombies.clear();
    for (const id of ids) {
      worldPersist?.scheduleDeleteZombie?.(id);
      io.emit('zombie-die', id);
    }
  } else if (zombies.size >= target) {
    return { added: 0, total: zombies.size };
  }

  let added = 0;

  if (zombies.size === 0) {
    const zp = _zombiePrefabs;
    for (let i = 0; i < ZOMBIE_SPAWN_RING.count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = ZOMBIE_SPAWN_RING.rMin + Math.random() * (ZOMBIE_SPAWN_RING.rMax - ZOMBIE_SPAWN_RING.rMin);
      const prefabId = zp?.pickZombiePrefabForZone?.('forest') || 'zombie_walker';
      const z = makeZombie({
        prefabId,
        x: BEACH_SPAWN.x + Math.cos(ang) * dist,
        z: BEACH_SPAWN.z + Math.sin(ang) * dist,
      });
      zombies.set(z.id, z);
      worldPersist?.scheduleUpsertZombie?.(z);
      added++;
    }
  }

  while (zombies.size < target) {
    const z = makeZombie();
    zombies.set(z.id, z);
    worldPersist?.scheduleUpsertZombie?.(z);
    added++;
    if (players.size > 0) io.emit('zombie-spawn', z);
  }

  log.info('boot', 'zombies populated', { added, total: zombies.size, target });
  return { added, total: zombies.size };
}

rcon = createRcon({
  io,
  players,
  zombies,
  items,
  structures,
  decorItems,
  decorPrefabs,
  flags: serverFlags,
  worldColliders: () => worldColliders,
  lootBuildings: () => lootBuildings,
  worldWaterZones: () => worldWaterZones,
  getWorldTime: () => _worldTime,
  setWorldTime,
  makeZombie,
  loadZombiePrefabs,
  ensureZombiePopulation,
  listZombiePrefabs: () => (_zombiePrefabs ? _zombiePrefabs.listZombiePrefabIds() : []),
  getZombiePrefab: (id) => (_zombiePrefabs ? _zombiePrefabs.getZombiePrefab(id) : null),
  savePlayerState,
  saveBlob,
  generateLoot,
  clearLoot,
  makeDecorItemId: () => `decor_${decorSeq++}`,
  persistDecorUpsert: (item) => worldPersist.scheduleUpsertDecor(item),
  persistDecorDelete: (id, item) => worldPersist.scheduleDeleteDecor(id, item),
  ensureRoadWrecks,
  ensureRoadBarriers,
  ensureWorldTrees,
  ensureCampRocks,
  ensureWorldRocks,
  itemTypes: ALL_ITEMS,
  log,
});

let resourceRegen = null;
import(RESOURCE_REGEN_URL).then(({ createResourceRegen }) => {
  resourceRegen = createResourceRegen({
    io,
    decorItems,
    makeDecorItem: _makeDecorItem,
    persistDecorUpsert: (item) => worldPersist.scheduleUpsertDecor(item),
    log,
  });
  log.info('boot', 'resource regen ready');
}).catch((err) => log.error('boot', 'resource regen init failed', { err: err.message }));

setInterval(() => {
  try {
    resourceRegen?.tick();
  } catch (err) {
    log.error('regen', 'tick failed', { err: err.message });
  }
}, 10_000);

setInterval(() => {
  try {
    for (const z of zombies.values()) {
      worldPersist?.scheduleUpsertZombie?.(z);
    }
    worldPersist?.scheduleWorldState?.({ worldTime: _worldTime });
  } catch (err) {
    log.error('world', 'zombie persist tick failed', { err: err.message });
  }
}, 5000);

// Zombie AI — 100ms tick
setInterval(() => {
  const _tickStart = log.isDebug() ? Date.now() : 0;
  if (serverFlags.autoDay) {
    _worldTime = (_worldTime + _TICK_DT / _DAY_DURATION) % 1;
  }

  if (players.size === 0) return;
  const pList = Array.from(players.values());
  const DT = _TICK_DT;

  if (!serverFlags.zombieAI) {
    io.emit('zombie-tick', { zombies: Array.from(zombies.values()), time: _worldTime });
    return;
  }

  zombies.forEach((z) => {
    // Nearest player
    let nearestDist = Infinity, nearestP = null;
    for (const p of pList) {
      const d = Math.hypot(p.x - z.x, p.z - z.z);
      if (d < nearestDist) { nearestDist = d; nearestP = p; }
    }

    const hasLOS = nearestP
      ? _zombieHasLineOfSight(z.x, z.z, nearestP.x, nearestP.z)
      : false;

    // Aggro: détection seulement avec ligne de vue ; perte rapide derrière un mur
    const detectRange = z.detectRange || DETECT_RANGE;
    if (nearestDist < detectRange && hasLOS) {
      z.aggroTimer = AGGRO_MEMORY;
    } else if (z.aggroTimer > 0 && nearestDist < detectRange * 1.25 && !hasLOS) {
      z.aggroTimer = Math.max(0, z.aggroTimer - DT * AGGRO_LOST_SIGHT_DRAIN);
    } else {
      z.aggroTimer = Math.max(0, z.aggroTimer - DT);
    }

    if (z.aggroTimer > 0 && nearestP && hasLOS) {
      // Chase at full speed
      const ang = Math.atan2(nearestP.z - z.z, nearestP.x - z.x);
      z.angle = ang;
      // Déplacement + collision murs/objets (glisse le long, entre par les portes)
      const waterMul = getWaterSlowFactor(z.x, z.z);
      const zR = z.collideRadius || ZOMBIE_R;
      const chase = resolveZombieCollision(z.x + Math.cos(ang) * z.speed * waterMul * DT,
                                           z.z + Math.sin(ang) * z.speed * waterMul * DT,
                                           zR);
      z.x = chase[0];
      z.z = chase[1];
      // Attaque : portée courte + LOS (pas de dégâts à travers les murs)
      z.attackTimer = Math.max(0, (z.attackTimer || 0) - DT);
      const zDmg = z.damage || ZOMBIE_DMG;
      const zCd = z.attackCd || ZOMBIE_ATTACK_CD;
      const hitDist = Math.hypot(nearestP.x - z.x, nearestP.z - z.z);
      const hitLOS = _zombieHasLineOfSight(z.x, z.z, nearestP.x, nearestP.z);
      z.meleeReach = hitDist < ZOMBIE_ATTACK_RANGE + 0.15 && hitLOS;
      if (hitDist < ZOMBIE_ATTACK_RANGE && hitLOS
          && !nearestP.invincible && nearestP.posSynced && z.attackTimer <= 0) {
        z.attackTimer = zCd;
        nearestP.health = Math.max(0, nearestP.health - zDmg);
        io.to(nearestP.socketId).emit('take-damage', { dmg: zDmg });
        log.throttled(`zombie-hit:${nearestP.username}`, 2000, () => {
          log.debug('combat', 'zombie hit player', {
            player: nearestP.username,
            prefab: z.prefabId,
            dmg: zDmg,
            health: nearestP.health,
            pos: { x: +nearestP.x.toFixed(1), z: +nearestP.z.toFixed(1) },
          });
        });
      }
    } else {
      z.meleeReach = false;
      // Wander slowly — change direction periodically, not every tick
      z.wanderTimer -= DT;
      if (z.wanderTimer <= 0) {
        z.wanderAngle = Math.random() * Math.PI * 2;
        z.wanderTimer = WANDER_TURN_MIN + Math.random() * (WANDER_TURN_MAX - WANDER_TURN_MIN);
      }
      z.angle = z.wanderAngle;
      const waterMul = getWaterSlowFactor(z.x, z.z);
      const wx = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, z.x + Math.cos(z.wanderAngle) * z.speed * WANDER_SPEED * waterMul * DT));
      const wz = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, z.z + Math.sin(z.wanderAngle) * z.speed * WANDER_SPEED * waterMul * DT));
      const zR = z.collideRadius || ZOMBIE_R;
      const wander = resolveZombieCollision(wx, wz, zR);
      z.x = wander[0];
      z.z = wander[1];
    }
  });

  io.emit('zombie-tick', { zombies: Array.from(zombies.values()), time: _worldTime });
  if (_tickStart) log.tickSummary(zombies, players, Date.now() - _tickStart);
}, 100);

// Maintient la population si des kills ont réduit le nombre sous la cible
setInterval(() => {
  if (!serverFlags.zombieSpawn || zombies.size >= ZOMBIE_COUNT) return;
  ensureZombiePopulation().catch((err) => log.error('ensureZombiePopulation periodic failed', err));
}, 120000);

if (log.PLAYER_SNAPSHOT_MS > 0) {
  setInterval(() => log.playerSnapshot(players), log.PLAYER_SNAPSHOT_MS);
}
if (log.SERVER_STATS_MS > 0) {
  setInterval(() => log.serverStats({
    players: players.size,
    zombies: zombies.size,
    items: items.size,
    structures: structures.size,
    colliders: worldColliders.length,
    lootBuildings: lootBuildings.length,
    waterZones: worldWaterZones.length,
    worldTime: _worldTime,
  }), log.SERVER_STATS_MS);
}

// Auto-save position + inventaire (5 s si dirty, 15 s force position)
const _lastPosSave = new Map();
setInterval(() => {
  const now = Date.now();
  players.forEach((p) => {
    if (!p.id) return;
    const last = _lastPosSave.get(p.id) || 0;
    const forcePos = now - last >= 15000;
    if (!p.dirty && !forcePos) return;
    _persistPlayer(p).then(() => { p.dirty = false; _lastPosSave.set(p.id, now); });
  });
}, 5000);

// ── Socket.io ────────────────────────────────────────────────────────────────

io.use((socket, next) => {
  try {
    socket.user = jwt.verify(socket.handshake.auth.token, JWT_SECRET);
    next();
  } catch (err) {
    log.warn('socket', 'auth rejected', { err: err.message, ip: socket.handshake.address });
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

  const userId = _normPlayerId(socket.user.id);
  const liveSession = _takeoverLiveSession(userId, socket.id);

  const priorSleep = sleepingPlayers.get(userId);
  if (priorSleep) {
    sleepingPlayers.delete(userId);
    worldPersist?.scheduleDeleteSleeper?.(userId);
    io.emit('player-wake', { playerId: userId });
  }

  const restore = liveSession || priorSleep || null;
  const dbId = saved?.id != null ? _normPlayerId(saved.id) : userId;
  const p = {
    socketId: socket.id,
    id: dbId,
    username: socket.user.username,
    x:    restore?.x ?? ((saved && saved.pos_x != null) ? saved.pos_x : BEACH_SPAWN.x),
    y:    restore?.y ?? ((saved && saved.pos_y != null) ? saved.pos_y : BEACH_SPAWN.y),
    z:    restore?.z ?? ((saved && saved.pos_z != null) ? saved.pos_z : BEACH_SPAWN.z),
    rotY: restore?.rotY ?? ((saved && saved.rot_y != null) ? saved.rot_y : BEACH_SPAWN.rotY),
    health: restore?.health ?? saved?.health ?? 100,
    kills:  restore?.kills ?? saved?.kills ?? 0,
    inv: restore ? _cloneInv(restore.inv) : _save,
    survival: restore ? { ...(restore.survival || DEFAULT_SURVIVAL) } : _survival,
    equipped: restore?.equipped ?? null,
    dirty: true,
    invincible: true,
    posSynced: false,
    connectedAt: Date.now(),
    anchorX: 0,
    anchorY: 0,
    anchorZ: 0,
  };
  p.anchorX = p.x;
  p.anchorY = p.y;
  p.anchorZ = p.z;
  setTimeout(() => { if (players.has(socket.id)) p.invincible = false; }, 5000);
  if (ensureStarterRock(p)) p.dirty = true;
  players.set(socket.id, p);
  _persistPlayer(p);
  log.info('socket', 'connect', {
    username: p.username,
    online: players.size,
    spawn: { x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1) },
    health: p.health,
    kills: p.kills,
  });

  socket.emit('game-init', {
    selfId: socket.id,
    spawn: { x: p.x, y: p.y, z: p.z, rotY: p.rotY },
    players: [...players.entries()]
      .filter(([sid]) => sid !== socket.id)
      .map(([sid, q]) => ({ id: sid, username: q.username, x: q.x, y: q.y, z: q.z, rotY: q.rotY, equipped: q.equipped })),
    zombies: Array.from(zombies.values()),
    items:   Array.from(items.values()),
    decorItems: Array.from(decorItems.values()),
    structures: Array.from(structures.values()),
    worldTime: _worldTime,
    serverFlags: { ...serverFlags },
    username: p.username,
    rconEnabled: isAdminUser(p.username) || RCON_AUTO_ADMIN,
    isAdmin: isAdminUser(p.username) || RCON_AUTO_ADMIN,
    rconPreAuth: isAdminUser(p.username) || RCON_AUTO_ADMIN,
    features: { chat: true },
    onlineCount: players.size,
    inventory: p.inv,
    survival:  p.survival,
    sleeping: [...sleepingPlayers.values()].map((s) => ({
      id: _sleepBodyId(s.playerId),
      playerId: s.playerId,
      username: s.username,
      x: s.x,
      y: s.y,
      z: s.z,
      rotY: s.rotY,
      equipped: s.equipped || null,
    })),
  });
  socket.broadcast.emit('player-join', { id: socket.id, username: p.username, x: p.x, y: p.y, z: p.z, rotY: p.rotY, equipped: p.equipped });
  _emitPlayersOnline();

  // Le premier client transmet la géométrie de collision (murs, arbres, etc.).
  let _lastDecorColliderCount = 0;
  socket.on('world-colliders', (cols) => {
    if (!Array.isArray(cols)) return;
    const terrain = cols.filter((c) => c && c.minY === undefined && !c.decorId);
    const decor = cols.filter((c) => c && c.decorId);
    if (worldColliders.length === 0) {
      worldColliders = terrain;
      log.info('world', 'colliders loaded', { terrain: terrain.length, from: p.username });
      worldPersist?.scheduleWorldState?.({ worldColliders });
    } else {
      worldColliders = worldColliders.filter((c) => !c.decorId);
    }
    if (decor.length) {
      worldColliders = worldColliders.concat(decor);
      worldPersist?.scheduleWorldState?.({ worldColliders });
      if (decor.length !== _lastDecorColliderCount) {
        _lastDecorColliderCount = decor.length;
        log.info('world', 'decor colliders merged', {
          decor: decor.length,
          total: worldColliders.length,
          from: p.username,
        });
      }
    }
  });

  socket.on('world-water-zones', (zones) => {
    if (worldWaterZones.length === 0 && Array.isArray(zones)) {
      worldWaterZones = zones.filter(z =>
        z &&
        Number.isFinite(z.x) &&
        Number.isFinite(z.z) &&
        Number.isFinite(z.r)
      );
      log.info('world', 'water zones loaded', { count: worldWaterZones.length, from: p.username });
      worldPersist?.scheduleWorldState?.({ worldWaterZones });
    }
  });

  // Le premier client transmet l'empreinte des bâtiments → génération du loot.
  socket.on('loot-buildings', (list) => {
    if (lootBuildings.length === 0 && Array.isArray(list) && list.length) {
      lootBuildings = list.filter(b => b && typeof b.cx === 'number' && typeof b.cz === 'number');
      log.info('world', 'loot buildings loaded', { count: lootBuildings.length, from: p.username });
      worldPersist?.scheduleWorldState?.({ lootBuildings });
      if (serverFlags.lootEnabled && !_hasPersistedBuildingLoot()) generateLoot();
    }
  });

  socket.on('move', (d) => {
    if (!d || !Number.isFinite(d.x) || !Number.isFinite(d.z)) return;
    p.x = d.x; p.y = d.y; p.z = d.z; p.rotY = d.rotY; p.dirty = true;
    p.posSynced = true;
    socket.broadcast.emit('player-move', { id: socket.id, x: d.x, y: d.y, z: d.z, rotY: d.rotY });
    if (log.isTrace()) {
      log.throttled(`move:${p.username}`, 1000, () => {
        log.trace('move', p.username, { x: +d.x.toFixed(1), y: +d.y.toFixed(1), z: +d.z.toFixed(1) });
      });
    }
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

  socket.on('request-zombie-sync', () => {
    socket.emit('zombies-snapshot', Array.from(zombies.values()));
  });

  socket.on('shoot', (d) => {
    const len = Math.hypot(d.dx, d.dz);
    if (len < 0.001) return;
    const nx = d.dx / len, nz = d.dz / len;

    // Dégâts/portée/rayon fournis par le client (arme), bornés côté serveur.
    const dmg    = Math.max(1, Math.min(250, Number(d.dmg)    || 34));
    const range  = Math.max(0.5, Math.min(120, Number(d.range)  || 80));
    const radius = Math.max(0.4, Math.min(2.0, Number(d.radius) || 0.8));

    let ox = Number(d.ox);
    let oz = Number(d.oz);
    if (!Number.isFinite(ox)) ox = p.x;
    if (!Number.isFinite(oz)) oz = p.z;
    // Mêlée : origine = position serveur (évite les miss pendant la sync client).
    if (range <= 3.5) {
      ox = p.x;
      oz = p.z;
    } else if (Math.hypot(ox - p.x, oz - p.z) > 8) {
      ox = p.x;
      oz = p.z;
    }

    let hit = null, minT = Infinity;
    zombies.forEach((z) => {
      const tx = z.x - ox, tz = z.z - oz;
      const t = tx * nx + tz * nz;
      if (t < 0 || t > range) return;
      const hitR = z.hitRadius || radius;
      if (Math.hypot(ox + nx * t - z.x, oz + nz * t - z.z) < hitR && t < minT) {
        minT = t; hit = z;
      }
    });

    if (hit) {
      hit.health -= dmg;
      log.debug('combat', 'shoot hit', {
        player: p.username,
        zombieId: hit.id,
        dmg,
        healthLeft: hit.health,
        pos: { x: +hit.x.toFixed(1), z: +hit.z.toFixed(1) },
      });
      if (hit.health <= 0) {
        log.info('combat', 'zombie kill', { player: p.username, zombieId: hit.id, kills: p.kills + 1 });
        io.emit('zombie-die', hit.id);
        worldPersist?.scheduleDeleteZombie?.(hit.id);
        // Random drop
        if (Math.random() < DROP_CHANCE) {
          const type   = DROP_TYPES[Math.floor(Math.random() * DROP_TYPES.length)];
          const dropId = ++itemIdCounter;
          _addGroundItem({
            id: dropId,
            type,
            x: hit.x + (Math.random() - 0.5) * 1.6,
            z: hit.z + (Math.random() - 0.5) * 1.6,
          });
        }
        zombies.delete(hit.id);
        p.kills++;
        io.to(socket.id).emit('score-update', { kills: p.kills });
        if (serverFlags.zombieSpawn) {
          setTimeout(() => {
            const nz = makeZombie();
            zombies.set(nz.id, nz);
            worldPersist?.scheduleUpsertZombie?.(nz);
            io.emit('zombie-spawn', nz);
          }, 4000);
        }
      } else {
        // Recul (mêlée) : on repousse le zombie en arrière le long du coup, en
        // respectant les collisions (murs/objets). Diffusé au prochain zombie-tick.
        const kb = Math.max(0, Math.min(3, Number(d.kb) || 0));
        if (kb > 0) {
          const zR = hit.collideRadius || ZOMBIE_R;
          const pushed = resolveZombieCollision(hit.x + nx * kb, hit.z + nz * kb, zR);
          hit.x = pushed[0];
          hit.z = pushed[1];
        }
        io.emit('zombie-hit', { id: hit.id, health: hit.health, maxHealth: hit.maxHealth || hit.health });
      }
    }
  });

  socket.on('item-pickup', (d) => {
    const item = items.get(d.id);
    if (!item) return; // already taken
    // Proximity guard — reject if player is too far (3 units tolerance for latency)
    if (Math.hypot(item.x - p.x, item.z - p.z) > 3.0) {
      log.throttled(`pickup-far:${p.username}`, 3000, () => {
        log.debug('items', 'pickup rejected (too far)', {
          player: p.username,
          itemId: d.id,
          dist: +Math.hypot(item.x - p.x, item.z - p.z).toFixed(1),
        });
      });
      return;
    }
    _removeGroundItem(d.id);
    log.debug('items', 'pickup', {
      player: p.username,
      type: item.type,
      qty: item.qty || 1,
      bag: !!item.bag,
      pos: { x: +item.x.toFixed(1), z: +item.z.toFixed(1) },
    });
    if (item.bag) {
      socket.emit('bag-collect', { items: item.items || [] });  // butin : rend tout
    } else if (item.type === 'struct_cle' && item.lockId) {
      socket.emit('item-add', { slot: { type: item.type, qty: item.qty || 1, lockId: item.lockId } });
    } else {
      socket.emit('item-add', { type: item.type, qty: item.qty || 1 });
    }
  });

  socket.on('item-drop', (d) => {
    if (!d || typeof d.type !== 'string' || d.type.length > 60) return;
    const qty = Math.max(1, Math.min(999, Number(d.qty) || 1));
    const ang = Math.random() * Math.PI * 2;
    const extra = {};
    if (d.type === 'struct_cle') {
      const lockId = typeof d.lockId === 'string' ? d.lockId.trim() : '';
      if (!lockId || lockId.length > 80) return;
      extra.lockId = lockId;
    }
    const drop = _dropWorldItem(
      d.type,
      qty,
      p.x + Math.cos(ang) * 1.0,
      p.z + Math.sin(ang) * 1.0,
      extra,
    );
    log.debug('items', 'drop', {
      player: p.username,
      type: d.type,
      qty,
      lockId: drop.lockId || undefined,
      pos: { x: +drop.x.toFixed(1), z: +drop.z.toFixed(1) },
    });
  });

  // Récolte bois sur arbre prefab — sync multijoueur
  socket.on('decor-chop', (d) => {
    const id = d?.id;
    if (!id || typeof id !== 'string') return;
    const item = decorItems.get(id);
    if (!item?.prefabId?.startsWith('tree_')) return;
    if (item.falling) return;
    if (Math.hypot(item.x - p.x, item.z - p.z) > 6) return;

    import(TREE_WOOD_URL).then(({ TREE_FALL_LINGER_MS }) => {
      const woodMax = item.woodMax ?? _treeWoodForPhase(item.prefabId, item.growthPhase ?? 4);
      item.woodMax = woodMax;
      if (item.woodRemaining == null) item.woodRemaining = woodMax;

      const yieldReq = Math.max(1, Math.min(4, Number(d.yield) || 1));
      const woodTaken = Math.min(yieldReq, item.woodRemaining);
      item.woodRemaining -= woodTaken;

      const base = {
        id,
        woodTaken,
        woodRemaining: item.woodRemaining,
        woodMax,
        growthPhase: item.growthPhase ?? 4,
        by: p.id,
      };

      if (item.woodRemaining <= 0) {
        item.falling = true;
        item.fellAt = Date.now();
        _touchDecorItem(item);
        socket.broadcast.emit('decor-tree-fell', {
          ...base,
          fallDirX: Number(d.dirX) || 0,
          fallDirZ: Number(d.dirZ) || 1,
        });
        setTimeout(() => {
          _removeDecorItem(id);
        }, TREE_FALL_LINGER_MS);
      } else {
        _touchDecorItem(item);
        socket.broadcast.emit('decor-tree-chop', base);
      }
      log.debug('world', 'tree chop', {
        player: p.username,
        decorId: id,
        woodTaken,
        woodRemaining: item.woodRemaining,
      });
    });
  });

  // Récolte pierre sur rocher prefab — sync multijoueur
  socket.on('decor-mine', (d) => {
    const id = d?.id;
    if (!id || typeof id !== 'string') return;
    const item = decorItems.get(id);
    if (!_isMinableRockPrefab(item?.prefabId)) return;
    if (Math.hypot(item.x - p.x, item.z - p.z) > 6) return;

    import(ROCK_STONE_URL).then(({ getRockStoneMax }) => {
      const stoneMax = item.stoneMax ?? getRockStoneMax(item.prefabId);
      item.stoneMax = stoneMax;
      if (item.stoneRemaining == null) item.stoneRemaining = stoneMax;

      const yieldReq = Math.max(1, Math.min(6, Number(d.yield) || 1));
      const stoneTaken = Math.min(yieldReq, item.stoneRemaining);
      item.stoneRemaining -= stoneTaken;

      const base = {
        id,
        stoneTaken,
        stoneRemaining: item.stoneRemaining,
        stoneMax,
        by: p.id,
      };

      if (item.stoneRemaining <= 0) {
        _removeDecorItem(id);
        io.emit('decor-rock-depleted', base);
      } else {
        _touchDecorItem(item);
        socket.broadcast.emit('decor-rock-mine', base);
      }
      log.debug('world', 'rock mine', {
        player: p.username,
        decorId: id,
        stoneTaken,
        stoneRemaining: item.stoneRemaining,
      });
    });
  });

  socket.on('decor-door-toggle', (d) => {
    const id = d?.id;
    if (!id || typeof id !== 'string') return;
    const item = decorItems.get(id);
    if (!item || !DOOR_PREFABS.has(item.prefabId)) return;
    if (Math.hypot((item.x || 0) - p.x, (item.z || 0) - p.z) > 6) return;
    if (item.locked && !_playerHasDoorKey(p.inv, item.lockId)) {
      socket.emit('door-error', { message: 'Porte verrouillée — clé requise' });
      return;
    }
    item.doorOpen = !item.doorOpen;
    _touchDecorItem(item);
    io.emit('decor-door-state', { id, open: !!item.doorOpen });
    log.debug('world', 'door toggled', {
      player: p.username,
      decorId: id,
      open: !!item.doorOpen,
    });
  });

  socket.on('decor-door-lock', (d, cb) => {
    const reply = (payload) => {
      socket.emit('door-lock-result', { ...payload, id: d?.id || null });
      if (typeof cb === 'function') cb(payload);
    };
    if (d?.inv && typeof d.inv === 'object') {
      p.inv = _normalizeInv(d.inv);
      p.dirty = true;
    }
    const item = _getNearbyDoor(d?.id, p.x, p.z);
    if (!item) {
      reply({ ok: false, error: 'Porte introuvable' });
      return;
    }
    if (item.locked) {
      reply({ ok: false, error: 'Déjà verrouillée' });
      return;
    }
    if (!_consumeInvType(p.inv, 'tool_verrou', 1)) {
      reply({ ok: false, error: 'Pas de verrou dans l\'inventaire' });
      return;
    }
    const lockId = `lock_${Date.now()}_${++doorLockSeq}`;
    item.locked = true;
    item.lockId = lockId;
    item.lockOwner = p.username;
    p.dirty = true;
    const key = { type: 'struct_cle', qty: 1, lockId };
    const addResult = _addStackToInv(p.inv, key);
    let keyDropped = false;
    if (addResult.leftover > 0) {
      const ang = Math.random() * Math.PI * 2;
      _dropWorldItem(
        'struct_cle',
        addResult.leftover,
        item.x + Math.cos(ang) * 0.65,
        item.z + Math.sin(ang) * 0.65,
        { lockId },
      );
      keyDropped = true;
    }
    io.emit('door-lock-state', {
      id: item.id,
      locked: true,
      lockId,
      lockOwner: p.username,
    });
    _touchDecorItem(item);
    log.info('world', 'door locked', {
      player: p.username,
      decorId: item.id,
      lockId,
      keyDropped,
    });
    const invSnap = _cloneInv(p.inv);
    socket.emit('inventory-authoritative', invSnap);
    reply({ ok: true, lockId, keyDropped, inventory: invSnap });
  });

  socket.on('decor-door-unlock', (d, cb) => {
    if (d?.inv && typeof d.inv === 'object') {
      p.inv = _normalizeInv(d.inv);
      p.dirty = true;
    }
    const item = _getNearbyDoor(d?.id, p.x, p.z);
    if (!item || !item.locked) {
      if (typeof cb === 'function') cb({ ok: false, error: 'Pas verrouillée' });
      return;
    }
    if (!_playerHasDoorKey(p.inv, item.lockId)) {
      if (typeof cb === 'function') cb({ ok: false, error: 'Clé requise pour retirer le verrou' });
      return;
    }
    const oldLockId = item.lockId;
    item.locked = false;
    item.lockId = null;
    item.lockOwner = null;
    _consumeDoorKey(p.inv, oldLockId);
    p.dirty = true;
    const verrou = { type: 'tool_verrou', qty: 1 };
    if (!_tryAddSlotToInv(p.inv, verrou)) {
      _dropWorldItem('tool_verrou', 1, p.x + 0.3, p.z);
    } else {
      socket.emit('item-add', { type: 'tool_verrou', qty: 1 });
    }
    io.emit('door-lock-state', { id: item.id, locked: false, lockId: null, lockOwner: null });
    _touchDecorItem(item);
    log.info('world', 'door unlocked', { player: p.username, decorId: item.id });
    if (typeof cb === 'function') cb({ ok: true, lockId: oldLockId });
  });

  function _getNearbyStorage(id) {
    const sid = id != null ? String(id) : '';
    if (!sid) return null;
    const item = decorItems.get(sid);
    if (!item || item.prefabId !== 'storage_chest') return null;
    if (Math.hypot((item.x || 0) - p.x, (item.z || 0) - p.z) > 5) return null;
    if (!Array.isArray(item.storage)) item.storage = [];
    return item;
  }

  socket.on('storage-open', (d) => {
    const item = _getNearbyStorage(d?.id);
    if (!item) return;
    item.storageOpen = true;
    io.emit('storage-state', { id: item.id, open: true });
    socket.emit('storage-open', _storagePayload(item));
  });

  socket.on('storage-close', (d) => {
    const item = _getNearbyStorage(d?.id);
    if (!item) return;
    item.storageOpen = false;
    io.emit('storage-state', { id: item.id, open: false });
  });

  socket.on('storage-deposit', (d) => {
    const item = _getNearbyStorage(d?.id);
    const type = String(d?.type || '').slice(0, 60);
    const qty = Math.max(1, Math.min(999, Number(d?.qty) || 1));
    const refund = () => socket.emit('item-add', { type, qty });
    if (!item || !type) {
      if (type) refund();
      return;
    }
    if (item.storage.length >= STORAGE_CHEST_CAPACITY) {
      refund();
      socket.emit('storage-error', { message: 'Coffre plein' });
      return;
    }
    item.storage.push({ type, qty });
    _emitStorageUpdate(item);
    _touchDecorItem(item);
    log.debug('storage', 'deposit', { player: p.username, decorId: item.id, type, qty });
  });

  socket.on('storage-withdraw', (d) => {
    const item = _getNearbyStorage(d?.id);
    if (!item) return;
    const slot = Math.max(0, Math.floor(Number(d?.slot) || 0));
    const stack = item.storage[slot];
    if (!stack?.type) return;
    item.storage.splice(slot, 1);
    socket.emit('item-add', { type: stack.type, qty: stack.qty || 1 });
    _emitStorageUpdate(item);
    _touchDecorItem(item);
    log.debug('storage', 'withdraw', { player: p.username, decorId: item.id, type: stack.type, qty: stack.qty || 1 });
  });

  socket.on('storage-hit', (d) => {
    const item = _getNearbyStorage(d?.id);
    if (!item) return;
    item.breakHits = Math.max(0, Number(item.breakHits) || 0) + 1;
    if (item.breakHits < STORAGE_CHEST_BREAK_HITS) {
      _touchDecorItem(item);
      socket.emit('storage-error', { message: `Coffre endommagé (${item.breakHits}/${STORAGE_CHEST_BREAK_HITS})` });
      return;
    }
    const decorId = item.id;
    const baseX = Number(item.x) || p.x;
    const baseZ = Number(item.z) || p.z;
    const drops = [...(item.storage || []), { type: 'struct_storage_chest', qty: 1 }];
    _removeDecorItem(decorId);
    drops.forEach((stack, idx) => {
      const a = (idx / Math.max(1, drops.length)) * Math.PI * 2;
      const r = 0.45 + (idx % 3) * 0.18;
      _spawnWorldDrop(stack.type, stack.qty || 1, baseX + Math.cos(a) * r, baseZ + Math.sin(a) * r);
    });
    item.storage = [];
    socket.emit('storage-error', { message: 'Coffre cassé' });
    log.info('storage', 'break chest', {
      player: p.username,
      decorId: item.id,
      drops: drops.length,
      pos: { x: +(item.x || 0).toFixed(1), z: +(item.z || 0).toFixed(1) },
    });
  });

  socket.on('storage-pickup', (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    if (d?.inv && typeof d.inv === 'object') {
      p.inv = _normalizeInv(d.inv);
      p.dirty = true;
    }
    const item = _getNearbyStorage(d?.id);
    if (!item) {
      reply({ ok: false, error: 'Coffre introuvable' });
      return;
    }
    const baseX = Number(item.x) || p.x;
    const baseZ = Number(item.z) || p.z;
    const stored = (Array.isArray(item.storage) ? item.storage : []).filter((s) => s?.type);
    let dropIdx = 0;
    let droppedStacks = 0;

    const chestRes = _addStackToInv(p.inv, { type: 'struct_storage_chest', qty: 1 });
    if (chestRes.leftover > 0) {
      _spawnChestOverflowDrop('struct_storage_chest', chestRes.leftover, baseX, baseZ, {}, dropIdx++);
      droppedStacks++;
    }

    for (const stack of stored) {
      const copy = {
        type: stack.type,
        qty: stack.qty || 1,
        ...(stack.lockId ? { lockId: stack.lockId } : {}),
        ...(stack.durability != null ? { durability: stack.durability } : {}),
        ...(stack.ammo != null ? { ammo: stack.ammo } : {}),
      };
      const res = _addStackToInv(p.inv, copy);
      if (res.leftover > 0) {
        const extra = {};
        if (copy.lockId) extra.lockId = copy.lockId;
        if (copy.durability != null) extra.durability = copy.durability;
        if (copy.ammo != null) extra.ammo = copy.ammo;
        _spawnChestOverflowDrop(copy.type, res.leftover, baseX, baseZ, extra, dropIdx++);
        droppedStacks++;
      }
    }

    item.storage = [];
    _removeDecorItem(item.id);
    io.emit('storage-state', { id: item.id, open: false });
    p.dirty = true;
    const invOut = _cloneInv(p.inv);
    socket.emit('inventory-authoritative', invOut);
    log.info('storage', 'pickup chest', {
      player: p.username,
      decorId: item.id,
      stored: stored.length,
      droppedStacks,
      pos: { x: +baseX.toFixed(1), z: +baseZ.toFixed(1) },
    });
    reply({ ok: true, dropped: droppedStacks, inventory: invOut });
  });

  socket.on('build-hit', async (d) => {
    const {
      getBuildDamage, getBuildMaxHp, isBuildPrefab,
      getDoorBreakDamage, getLockedDoorBreakMaxHp, isLockableDoorPrefab,
    } = await buildDamageModPromise;
    const id = String(d?.id || '').slice(0, 80);
    const toolType = String(d?.toolType || '').slice(0, 80);
    if (!id) return;
    const item = decorItems.get(id);
    if (!item) return;
    if (Math.hypot((item.x || 0) - p.x, (item.z || 0) - p.z) > 4.5) return;

    const lockedDoor = !!item.locked && isLockableDoorPrefab(item.prefabId);
    let dmg;
    let maxHp;
    if (lockedDoor) {
      dmg = getDoorBreakDamage(toolType);
      maxHp = Number(item.doorBreakMaxHp) || getLockedDoorBreakMaxHp(item.prefabId);
    } else if (isBuildPrefab(item.prefabId)) {
      dmg = getBuildDamage(toolType);
      maxHp = Number(item.buildMaxHp) || getBuildMaxHp(item.prefabId);
    } else {
      return;
    }
    if (dmg <= 0 || maxHp <= 0) return;

    const field = lockedDoor ? 'doorBreakDamage' : 'buildDamage';
    item[field] = Math.min(maxHp, (Number(item[field]) || 0) + dmg);
    if (item[field] < maxHp) {
      io.emit('build-damage', {
        id: item.id,
        damage: item[field],
        maxHp,
        toolType,
        kind: lockedDoor ? 'door' : 'build',
      });
      _touchDecorItem(item);
      return;
    }
    _removeDecorItem(item.id);
    io.emit('build-destroyed', { id: item.id, prefabId: item.prefabId, kind: lockedDoor ? 'door' : 'build' });
    log.info('build', lockedDoor ? 'locked door destroyed' : 'wood structure destroyed', {
      player: p.username,
      decorId: item.id,
      prefabId: item.prefabId,
      toolType,
      pos: { x: +(item.x || 0).toFixed(1), z: +(item.z || 0).toFixed(1) },
    });
  });

  socket.on('place-structure', (d) => {
    if (!d || typeof d.type !== 'string' || !d.type.startsWith('struct_')) return;
    const x = Number(d.x), z = Number(d.z), rotY = Number(d.rotY) || 0;
    const y = Number(d.y);
    if (!isFinite(x) || !isFinite(z)) return;
    // Anti-triche léger : pose seulement à portée raisonnable du joueur
    if (Math.hypot(x - p.x, z - p.z) > 16) return;
    const colliders = Array.isArray(d.colliders)
      ? d.colliders.filter(c => c && c.type === 'box' &&
          isFinite(c.cx) && isFinite(c.cz) && isFinite(c.hw) && isFinite(c.hd)).slice(0, 4)
      : [];
    const id = ++structureIdCounter;
    const st = { id, type: d.type, x, z, rotY, owner: p.id };
    if (isFinite(y)) st.y = y;
    st.colliders = colliders;
    structures.set(id, st);
    worldPersist.scheduleUpsertStructure(st);
    // Les zombies (au sol) ne se cognent que dans les murs du rez-de-chaussée (sans minY)
    for (const c of colliders) if (c.minY === undefined) structureColliders.push(c);
    io.emit('structure-spawn', st);
    log.info('build', 'structure placed', {
      player: p.username,
      type: d.type,
      pos: { x: +x.toFixed(1), z: +z.toFixed(1) },
      colliders: colliders.length,
    });
  });

  socket.on('place-decor-prefab', (d, cb) => {
    const itemType = String(d?.itemType || '').slice(0, 80);
    const prefabId = String(d?.prefabId || '').slice(0, 80);
    const reject = (error) => {
      if (typeof cb === 'function') cb({ ok: false, error });
    };
    if (!itemType || DECOR_PREFAB_BY_ITEM[itemType] !== prefabId) {
      reject('Prefab invalide');
      return;
    }
    const x = Number(d.x), z = Number(d.z), rotY = Number(d.rotY) || 0;
    const y = Number(d.y);
    const baseY = Number(d.baseY);
    const buildLevel = Number(d.buildLevel);
    const supportGroundY = Number(d.supportGroundY);
    if (!isFinite(x) || !isFinite(z)) {
      reject('Position invalide');
      return;
    }
    if (Math.hypot(x - p.x, z - p.z) > 16) {
      reject('Trop loin');
      return;
    }
    const item = _makeDecorItem({
      kind: 'prefab',
      prefabId,
      x,
      y: Number.isFinite(baseY) ? Math.max(-1, Math.min(30, baseY))
        : (Number.isFinite(y) ? Math.max(-1, Math.min(30, y)) : 0),
      z,
      rotX: 0,
      rotY,
      rotZ: 0,
      scale: 1,
      createdBy: p.username,
      createdAt: Date.now(),
      persist: true,
      ...(Number.isFinite(baseY) ? { baseY: Math.max(-1, Math.min(30, baseY)) } : {}),
      ...(Number.isFinite(buildLevel) ? { buildLevel: Math.max(0, Math.min(8, buildLevel)) } : {}),
      ...(Number.isFinite(supportGroundY) ? { supportGroundY: Math.max(-1, Math.min(30, supportGroundY)) } : {}),
    });
    io.emit('decor-item-spawn', item);
    log.info('build', 'decor prefab placed', {
      player: p.username,
      prefabId: item.prefabId,
      decorId: item.id,
      pos: { x: +x.toFixed(1), z: +z.toFixed(1) },
    });
    if (typeof cb === 'function') cb({ ok: true, id: item.id });
  });

  socket.on('decor-floor-height', (d) => {
    const item = decorItems.get(String(d?.id || ''));
    const pid = item?.prefabId || '';
    const isBuildWood = pid.startsWith('build_') && pid.endsWith('_wood');
    if (!item || (!isBuildWood && pid !== 'storage_chest')) return;
    const y = Number(d.y);
    if (!Number.isFinite(y)) return;
    item.y = Math.max(-1, Math.min(30, y));
    item.baseY = item.y;
    _touchDecorItem(item);
  });

  socket.on('inventory-sync', (slots) => {
    if (slots && typeof slots === 'object') {
      p.inv = _normalizeInv(slots);
      p.dirty = true;
    }
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
    p.health = 0;
    const loot = flattenInv(p.inv);
    if (loot.length) {
      const id  = ++itemIdCounter;
      _addGroundItem({
        id,
        type: 'death_bag',
        bag: true,
        x: p.x,
        z: p.z,
        items: loot,
        expiresAt: Date.now() + GROUND_ITEM_TTL_MS,
        owner: p.username,
      });
      log.info('death', 'death bag spawned', {
        player: p.username,
        items: loot.length,
        pos: { x: +p.x.toFixed(1), z: +p.z.toFixed(1) },
      });
    } else {
      log.info('death', 'player died (empty inv)', { player: p.username });
    }
  });

  socket.on('respawn', () => {
    p.health = 100;
    p.invincible = true;
    const kit = JSON.parse(JSON.stringify(STARTING_ITEMS));
    p.inv = kit;
    p.survival = { ...DEFAULT_SURVIVAL };
    p.x = BEACH_SPAWN.x; p.y = BEACH_SPAWN.y; p.z = BEACH_SPAWN.z; p.rotY = BEACH_SPAWN.rotY;
    p.posSynced = false;
    p.dirty = true;
    setTimeout(() => { if (players.has(socket.id)) p.invincible = false; }, 3000);
    socket.emit('take-damage', { health: 100 });
    socket.emit('respawn-at', { spawn: BEACH_SPAWN, inventory: kit, survival: { ...DEFAULT_SURVIVAL } });
    log.info('death', 'respawn', { player: p.username, spawn: BEACH_SPAWN, kit: 'tool_caillou' });
  });

  // Fouille d'un joueur endormi (déconnecté)
  socket.on('sleep-loot-open', (data, cb) => {
    if (typeof cb !== 'function') return;
    const targetId = Number(data?.playerId);
    const sleep = sleepingPlayers.get(targetId);
    if (!sleep) return cb({ ok: false, error: 'Personne endormie ici' });
    if (_distXZ(p.x, p.z, sleep.x, sleep.z) > SLEEP_LOOT_RADIUS) {
      return cb({ ok: false, error: 'Trop loin' });
    }
    cb({
      ok: true,
      playerId: targetId,
      username: sleep.username,
      inventory: _cloneInv(sleep.inv),
    });
  });

  socket.on('sleep-loot-take', (data, cb) => {
    if (typeof cb !== 'function') return;
    const targetId = Number(data?.playerId);
    const zone = data?.zone;
    const index = data?.index;
    const sleep = sleepingPlayers.get(targetId);
    if (!sleep) return cb({ ok: false, error: 'Personne endormie ici' });
    if (_distXZ(p.x, p.z, sleep.x, sleep.z) > SLEEP_LOOT_RADIUS) {
      return cb({ ok: false, error: 'Trop loin' });
    }
    if (!['hotbar', 'bag', 'equip'].includes(zone)) {
      return cb({ ok: false, error: 'Zone invalide' });
    }
    const item = _takeInvSlot(sleep.inv, zone, index);
    if (!item) return cb({ ok: false, error: 'Emplacement vide' });
    if (!_tryAddSlotToInv(p.inv, item)) {
      const n = _normalizeInv(sleep.inv);
      if (zone === 'equip') n.equip[String(index)] = item;
      else if (zone === 'bag') n.bag[Number(index)] = item;
      else n.hotbar[Number(index)] = item;
      Object.assign(sleep.inv, n);
      return cb({ ok: false, error: 'Inventaire plein' });
    }
    p.dirty = true;
    _saveSleepingToDb(sleep);
    socket.emit('item-add', { slot: item });
    io.emit('sleep-loot-update', { playerId: targetId, inventory: _cloneInv(sleep.inv) });
    log.info('sleep', 'loot take', {
      looter: p.username,
      target: sleep.username,
      type: item.type,
      qty: item.qty || 1,
    });
    cb({ ok: true, inventory: _cloneInv(sleep.inv) });
  });

  // ── Chat joueurs ────────────────────────────────────────────────────────────
  const CHAT_MAX_LEN = 200;
  const CHAT_COOLDOWN_MS = 800;

  socket.on('chat', (text, cb) => {
    const player = players.get(socket.id);
    if (!player) {
      if (typeof cb === 'function') cb({ ok: false, error: 'Non connecté' });
      return;
    }
    const msg = String(text || '').trim().replace(/\s+/g, ' ').slice(0, CHAT_MAX_LEN);
    if (!msg) {
      if (typeof cb === 'function') cb({ ok: false, error: 'Message vide' });
      return;
    }
    const now = Date.now();
    if (player._lastChat && now - player._lastChat < CHAT_COOLDOWN_MS) {
      if (typeof cb === 'function') cb({ ok: false, error: 'Attendez un instant…' });
      return;
    }
    player._lastChat = now;
    const payload = {
      from: player.username,
      message: msg,
      ts: now,
      senderId: socket.id,
    };
    io.emit('chat-message', payload);
    log.info('chat', player.username, { msg: msg.slice(0, 80) });
    if (typeof cb === 'function') cb({ ok: true });
  });

  // ── Console RCON in-game ────────────────────────────────────────────────────
  if (isAdminUser(p.username) || RCON_AUTO_ADMIN) adminSockets.add(socket.id);
  if (isAdminUser(p.username) || RCON_AUTO_ADMIN) {
    log.info('rcon', 'admin session', { username: p.username });
  }

  socket.on('rcon-auth', (password, cb) => {
    if (typeof cb !== 'function') return;
    if (!RCON_PASSWORD && !isAdminUser(p.username)) {
      return cb({ ok: false, error: 'RCON non configuré — définissez RCON_PASSWORD dans .env' });
    }
    if (isAdminUser(p.username) || RCON_AUTO_ADMIN || password === RCON_PASSWORD) {
      adminSockets.add(socket.id);
      log.info('rcon', 'admin auth ok', { username: p.username });
      return cb({ ok: true });
    }
    cb({ ok: false, error: 'Mot de passe incorrect' });
  });

  socket.on('rcon', (cmd, cb) => {
    if (typeof cb !== 'function') return;
    const run = async () => {
      const authorized = adminSockets.has(socket.id) || isAdminUser(p.username) || RCON_AUTO_ADMIN;
      if (!authorized) {
        return cb({
          ok: false,
          lines: ['Non autorisé — tapez: auth <mot_de_passe> (dev SQLite: auth dev)'],
        });
      }
      if (!rcon) return cb({ ok: false, lines: ['RCON pas encore initialisé — réessayez dans 1s'] });
      const result = await rcon.execute(String(cmd || ''), { socket, player: p });
      log.info('rcon', 'cmd', { user: p.username, cmd: String(cmd).slice(0, 80), ok: result.ok });
      cb(result);
    };
    run().catch((err) => {
      log.error('rcon', 'cmd error', { user: p.username, err: err.message });
      cb({ ok: false, lines: [`Erreur serveur: ${err.message}`] });
    });
  });

  socket.on('disconnect', () => {
    adminSockets.delete(socket.id);
    const leaving = players.get(socket.id);
    if (!leaving) return;
    players.delete(socket.id);

    const handoff = !!socket._handoff;
    log.info('socket', 'disconnect', {
      username: leaving.username,
      online: players.size,
      handoff,
      lastPos: { x: +leaving.x.toFixed(1), y: +leaving.y.toFixed(1), z: +leaving.z.toFixed(1) },
      health: leaving.health,
      kills: leaving.kills,
    });

    if (handoff || _hasOnlineSession(leaving.id, socket.id)) {
      _emitPlayersOnline();
      return;
    }

    if (leaving.id) {
      _persistPlayer(leaving);
    }

    // Toujours retirer l'avatar debout des autres clients (évite doublon avec le corps endormi).
    io.emit('player-leave', socket.id);

    if (leaving.id && leaving.health > 0) {
      const sleep = {
        playerId: _normPlayerId(leaving.id),
        username: leaving.username,
        x: leaving.x,
        y: leaving.y,
        z: leaving.z,
        rotY: leaving.rotY,
        health: leaving.health,
        kills: leaving.kills,
        inv: _cloneInv(leaving.inv),
        survival: { ...(leaving.survival || DEFAULT_SURVIVAL) },
        equipped: leaving.equipped || null,
        since: Date.now(),
      };
      sleepingPlayers.set(_normPlayerId(leaving.id), sleep);
      worldPersist?.scheduleUpsertSleeper?.(sleep);
      io.emit('player-sleep', {
        id: _sleepBodyId(leaving.id),
        playerId: _normPlayerId(leaving.id),
        username: leaving.username,
        x: leaving.x,
        y: leaving.y,
        z: leaving.z,
        rotY: leaving.rotY,
        equipped: leaving.equipped || null,
      });
    }
    _emitPlayersOnline();
  });
});

// ── Réinitialisation unique (lancement) ───────────────────────────────────────
// Remet TOUS les joueurs au spawn plage (une fois après migration camp → plage).
async function resetAllPlayersOnce() {
  const marker = path.join(ROOT_DIR, '.beach_spawn_v1_reset');
  if (fs.existsSync(marker)) return;
  try {
    const [r] = await pool.execute(
      'UPDATE players SET inventory = ?, pos_x = ?, pos_y = ?, pos_z = ?, rot_y = ?, health = 100',
      [STARTING_SAVE, BEACH_SPAWN.x, BEACH_SPAWN.y, BEACH_SPAWN.z, BEACH_SPAWN.rotY]
    );
    fs.writeFileSync(marker, new Date().toISOString());
    log.info('boot', 'players reset once', { affected: r.affectedRows });
  } catch (e) {
    log.error('boot', 'player reset failed', { err: e.message });
  }
}

async function loadPersistedWorld() {
  await ensureWorldSchema();
  const loaded = await worldPersist.loadInto(decorItems, structures, items, zombies, sleepingPlayers);
  decorSeq = Math.max(decorSeq, loaded.decorSeq || 1);
  structureIdCounter = Math.max(structureIdCounter, loaded.structureIdCounter || 0);
  itemIdCounter = Math.max(itemIdCounter, loaded.itemIdCounter || 0);
  doorLockSeq = Math.max(doorLockSeq, loaded.doorLockSeq || 0);
  zombieIdCounter = Math.max(zombieIdCounter, loaded.zombieIdCounter || 0);
  if (Array.isArray(loaded.worldColliders) && loaded.worldColliders.length) {
    worldColliders = loaded.worldColliders;
  }
  if (Array.isArray(loaded.worldWaterZones) && loaded.worldWaterZones.length) {
    worldWaterZones = loaded.worldWaterZones;
  }
  if (Array.isArray(loaded.lootBuildings) && loaded.lootBuildings.length) {
    lootBuildings = loaded.lootBuildings;
  }
  if (Number.isFinite(loaded.worldTime)) {
    _worldTime = loaded.worldTime;
  }
  for (const st of structures.values()) {
    for (const c of st.colliders || []) {
      if (c.minY === undefined) structureColliders.push(c);
    }
  }
  log.info('boot', 'persisted world loaded', {
    decor: loaded.decorCount,
    structures: loaded.structureCount,
    groundItems: loaded.itemCount,
    zombies: loaded.zombieCount,
    sleepers: loaded.sleeperCount,
    removedSeeds: loaded.removedSeedKeys?.length || 0,
    decorSeq,
    structureIdCounter,
    itemIdCounter,
    zombieIdCounter,
  });
  return loaded;
}

loadPersistedWorld()
  .catch((err) => log.error('loadPersistedWorld failed', err))
  .then(() => { _setBoot('world_persist', 1); return seedSpawnDecorItems(); })
  .catch((err) => log.error('seedSpawnDecorItems failed', err))
  .then(() => { _setBoot('spawn_decor', 2); return ensureRoadWrecks(); })
  .catch((err) => log.error('ensureRoadWrecks failed', err))
  .then(() => { _setBoot('road_wrecks', 4); return ensureRoadBarriers(); })
  .catch((err) => log.error('ensureRoadBarriers failed', err))
  .then(() => { _setBoot('road_barriers', 6); return ensureCampRocks(); })
  .catch((err) => log.error('ensureCampRocks failed', err))
  .then(() => { _setBoot('camp_rocks', 8); return ensureWorldRocks(); })
  .catch((err) => log.error('ensureWorldRocks failed', err))
  .then(() => { _setBoot('world_rocks', 10); return ensureWorldTrees(); })
  .catch((err) => log.error('ensureWorldTrees failed', err))
  .then(() => { _setBoot('world_trees', 12); return ensureZombiePopulation(); })
  .catch((err) => log.error('ensureZombiePopulation failed', err))
  .then(() => { _setBoot('zombies', 13); })
  .finally(() => {
    _setBoot('listening', 14);
    server.listen(PORT, HOST, () => {
      serverReady = true;
      log.info('boot', 'server started', {
        url: `http://localhost:${PORT}`,
        listen: `${HOST}:${PORT}`,
        clientMode: USE_CLIENT_BUILD ? 'build/client' : 'apps/client',
        db: require('./src/db').DB_CLIENT,
        sqlite: require('./src/db').pool.path || undefined,
        logLevel: log.level,
        playerSnapshotMs: log.PLAYER_SNAPSHOT_MS,
        serverStatsMs: log.SERVER_STATS_MS,
        zombies: ZOMBIE_COUNT,
        rcon: !!(RCON_PASSWORD || ADMIN_USERS.size),
        admins: ADMIN_USERS.size,
        decor: _decorStats(),
        persistedDecor: [...decorItems.values()].filter((d) => worldPersist.shouldPersistDecor(d)).length,
        groundItems: items.size,
      });
      resetAllPlayersOnce().then(() => log.info('boot', 'player reset check done'));
    }).on('error', (err) => {
      log.error('boot', 'server failed to start', { err: err.message });
      process.exit(1);
    });
  });

async function _shutdownPersist() {
  try {
    await worldPersist.flushSync({
      decorSeq,
      doorLockSeq,
      structureIdCounter,
      itemIdCounter,
      zombieIdCounter,
      worldTime: _worldTime,
    });
  } catch (err) {
    log.error('world', 'shutdown persist failed', { err: err.message });
  }
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    log.info('boot', 'shutdown', { signal: sig });
    _shutdownPersist().finally(() => process.exit(0));
  });
}
