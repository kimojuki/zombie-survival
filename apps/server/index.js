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
const { getPlayer, createPlayer, savePlayerState, pool, ensureWorldSchema, DB_CLIENT } = db;
const log = require('./src/logger');
const { createRcon } = require('./src/rcon');
const { createWorldPersist } = require('./src/world-persist');
const { getServerRole, isDevServer, isQaServer } = require('./src/server-role');
const { createQaChecklist } = require('./src/qa-checklist');
const { loadServersConfig, resolveServersForClient } = require('./src/servers-config');
const worldPersist = createWorldPersist(db, log);
const qaChecklist = createQaChecklist(pool, DB_CLIENT);
const SERVER_ROLE = getServerRole();
const invOps = require('./src/inventory-ops');
const { applyAdminDecorPatch, adminDecorSnapshot } = require('./src/admin-decor-ops');
const { invSnapshot: _invDebugSnapshot, logInv: _logInvDebug } = require('./src/inv-debug');
const INV_DEBUG_SERVER_BUILD = '20260608-sleeper-survival-273';
const {
  resolveConnectHealthFlags,
  connectHealthValue,
  shouldEmitDeathOnConnect,
} = require('./src/player-connect-health');
log.info('inv-debug', 'server build', { build: INV_DEBUG_SERVER_BUILD });
const {
  normalizeInv: _normalizeInv,
  ensureSlotGrid: _ensureSlotGrid,
  findStackByType: _findStackByType,
  resolveUseItemStack: _resolveUseItemStack,
  cloneInv: _cloneInv,
  flattenInv,
  iterInvStacks: _iterInvStacks,
  playerHasDoorKey: _playerHasDoorKey,
  takeInvSlot: _takeInvSlot,
  removeFromSlot: _removeFromSlot,
  addStackToInv: _addStackToInv,
  addStackToInvOnce: _addStackToInvOnce,
  tryAddSlotToInv: _tryAddSlotToInv,
  removeStackFromInv: _removeStackFromInv,
  consumeInvType: _consumeInvType,
  consumeDoorKey: _consumeDoorKey,
  countInvType: _countInvType,
  playerOwnsItemType: _playerOwnsItemType,
  moveInvSlot: _moveInvSlot,
  wearInvTool: _wearInvTool,
} = invOps;
const {
  ensureChestGrid: _ensureChestGrid,
  chestFilledCount: _chestFilledCount,
  moveStorageTransfer: _moveStorageTransfer,
  lootMoveTransfer: _lootMoveTransfer,
} = require('./src/storage-ops');
const {
  tickPlayerSurvival,
  tickSleeperSurvival,
  catchUpSleeperSurvival,
} = require('./src/survival-tick');
const craftQueueMod = require('./src/craft-queue');
const { createClientVersionLoader } = require('./src/client-version');
const { pickZombiesToTrim } = require('./src/zombie-population');

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
// Derrière Cloudflare / Infomaniak : TRUST_PROXY=true pour req.protocol / host corrects
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
function getClientVersion() {
  const dir = USE_CLIENT_BUILD ? CLIENT_DIST : CLIENT_PUBLIC;
  return createClientVersionLoader(dir).load();
}
const USE_CLIENT_BUILD =
  process.env.USE_CLIENT_BUILD === 'true'
  || (process.env.NODE_ENV === 'production'
    && fs.existsSync(path.join(CLIENT_DIST, 'index.html')));

function _clientAssetHeaders(res, filePath) {
  if (/\.(js|mjs|css|html)$/i.test(filePath)) {
    res.set('Cache-Control', 'no-cache, must-revalidate');
  }
}

function _sendClientHtml(res, fileName) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const filePath = USE_CLIENT_BUILD
    ? path.join(CLIENT_DIST, fileName)
    : path.join(CLIENT_ROOT, fileName);
  if (fileName === 'game.html') {
    fs.readFile(filePath, 'utf8', (err, html) => {
      if (err) {
        log.error('client', 'html read failed', { fileName, err: err.message });
        if (!res.headersSent) res.status(500).json({ error: 'Client entrypoint unavailable' });
        return;
      }
      const ver = getClientVersion();
      res.type('html').send(html.replace(/__CLIENT_VERSION__/g, ver));
    });
    return;
  }
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
  app.get('/prefab-catalog.html', (req, res) => _sendClientHtml(res, 'prefab-catalog.html'));
  app.get('/admin.html', (req, res) => _sendClientHtml(res, 'prefab-catalog.html'));
  app.get('/arm-preview.html', (req, res) => _sendClientHtml(res, 'arm-preview.html'));
  app.get('/models-preview.html', (req, res) => _sendClientHtml(res, 'models-preview.html'));

  if (USE_CLIENT_BUILD) {
    app.use(express.static(CLIENT_DIST, { setHeaders: _clientAssetHeaders }));
    return;
  }

  app.use('/src', express.static(CLIENT_SRC, { setHeaders: _clientAssetHeaders }));
  app.use(express.static(CLIENT_PUBLIC, { setHeaders: _clientAssetHeaders }));
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

/** Joueur endormi (déco) ou mort au sol — inventaire fouillable. */
function _findLootTarget(targetId) {
  const tid = _sleeperKey(targetId);
  const sleep = _getSleepingPlayer(tid);
  if (sleep) {
    const dead = !!sleep.dead || sleep.health <= 0;
    return {
      kind: dead ? 'death' : 'sleep',
      playerId: tid,
      username: sleep.username,
      inv: dead ? (sleep._deathInv || sleep.inv) : sleep.inv,
      x: sleep.x,
      z: sleep.z,
      afterTake: () => _saveSleepingToDb(sleep),
    };
  }
  for (const pl of players.values()) {
    if (_normPlayerId(pl.id) !== tid || !pl._deathHandled || !pl._deathInv) continue;
    const pos = pl._deathPos || pl;
    return {
      kind: 'death',
      playerId: tid,
      username: pl.username,
      inv: pl._deathInv,
      x: pos.x,
      z: pos.z,
      afterTake: () => {},
    };
  }
  return null;
}
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

app.get('/api/client-version', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({ version: getClientVersion() });
});

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
    clientVersion: getClientVersion(),
    serverRole: SERVER_ROLE,
    decor: _decorStats(),
    invDebugBuild: INV_DEBUG_SERVER_BUILD,
  });
});

app.get('/api/server-info', (req, res) => {
  res.json({
    role: SERVER_ROLE,
    qaEnabled: isQaServer(),
    devOnly: isDevServer(),
  });
});

app.get('/api/servers', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host') || '';
  const origin = host ? `${proto}://${host}`.replace(/\/+$/, '') : '';
  const config = loadServersConfig(CLIENT_PUBLIC, SERVER_ROLE);
  res.json(resolveServersForClient(config, origin));
});

const GAME_INIT_TREE_RADIUS = Object.freeze({ mobile: 100, desktop: 180 });

function _gameInitTreeRadius(clientKind) {
  return clientKind === 'mobile' ? GAME_INIT_TREE_RADIUS.mobile : GAME_INIT_TREE_RADIUS.desktop;
}

/** Arbres proches du spawn dans game-init ; le reste via GET /api/world/decor-trees. */
function decorItemsForGameInit(px, pz, clientKind) {
  const r2 = _gameInitTreeRadius(clientKind) ** 2;
  const out = [];
  for (const d of decorItems.values()) {
    if (d.prefabId?.startsWith('road_barrier_')) continue;
    if (!d.prefabId?.startsWith('tree_')) {
      out.push(d);
      continue;
    }
    const dx = d.x - px;
    const dz = d.z - pz;
    if (dx * dx + dz * dz <= r2) out.push(d);
  }
  return out;
}

function _gameInitPayload(socket, p, scenMod, wokeFromSleep) {
  _ensureSlotGrid(p.inv);
  const clientKind = socket.handshake.auth?.client === 'mobile' ? 'mobile' : 'desktop';
  const initDecor = decorItemsForGameInit(p.x, p.z, clientKind);
  return {
    selfId: socket.id,
    spawn: { x: p.x, y: p.y, z: p.z, rotY: p.rotY },
    players: [...players.entries()]
      .filter(([sid]) => sid !== socket.id)
      .map(([sid, q]) => ({ id: sid, username: q.username, x: q.x, y: q.y, z: q.z, rotY: q.rotY, equipped: q.equipped })),
    zombies: scenMod.filterZombiesForPlayer(p, Array.from(zombies.values())),
    items: Array.from(items.values()),
    decorItems: initDecor,
    structures: Array.from(structures.values()),
    worldTime: _worldTime,
    serverFlags: { ...serverFlags },
    username: p.username,
    rconEnabled: isAdminUser(p.username) || RCON_AUTO_ADMIN,
    isAdmin: isAdminUser(p.username) || RCON_AUTO_ADMIN,
    rconPreAuth: isAdminUser(p.username) || RCON_AUTO_ADMIN,
    features: { chat: true, qa: isQaServer() },
    serverRole: SERVER_ROLE,
    qaEnabled: isQaServer(),
    onlineCount: players.size,
    playerKills: p.lifePlayerKills ?? 0,
    health: Math.max(0, Math.floor(p.health ?? 100)),
    inventory: _cloneInv(p.inv),
    scenario: p.inv.scenario,
    survival: p.survival,
    wokeFromSleep: !!wokeFromSleep,
    worldCollidersReady: worldColliders.length > 0,
    sleeping: [...sleepingPlayers.values()].map((s) => ({
      id: _sleepBodyId(s.playerId),
      playerId: s.playerId,
      username: s.username,
      x: s.x,
      y: s.y,
      z: s.z,
      rotY: s.rotY,
      equipped: (s.dead ? s._deathEquipped : s.equipped) || null,
      dead: !!s.dead || s.health <= 0,
      health: s.health ?? 100,
    })),
    killedWhileOffline: !!p._killedWhileOffline,
    respawnReason: p._respawnReason || null,
    serverBuild: INV_DEBUG_SERVER_BUILD,
    invDebugBuild: INV_DEBUG_SERVER_BUILD,
  };
}

/** Arbres lointains (chargement différé client, paginé par distance). */
function _decorTreesBeyond(sx, sz, minR) {
  const minR2 = Number.isFinite(minR) && minR > 0 ? minR * minR : null;
  const rows = [];
  for (const d of decorItems.values()) {
    if (!d.prefabId?.startsWith('tree_')) continue;
    const dx = d.x - (Number.isFinite(sx) ? sx : d.x);
    const dz = d.z - (Number.isFinite(sz) ? sz : d.z);
    const d2 = dx * dx + dz * dz;
    if (minR2 != null && d2 <= minR2) continue;
    rows.push({ d, d2 });
  }
  rows.sort((a, b) => a.d2 - b.d2);
  return rows.map((r) => r.d);
}

app.get('/api/world/decor-trees', (req, res) => {
  if (!serverReady) return res.status(503).json({ ok: false, ready: false });
  const sx = parseFloat(req.query.x);
  const sz = parseFloat(req.query.z);
  const minR = parseFloat(req.query.minR);
  const limit = Math.min(150, Math.max(1, parseInt(req.query.limit, 10) || 80));
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const all = _decorTreesBeyond(sx, sz, minR);
  const slice = all.slice(offset, offset + limit);
  const nextOffset = offset + slice.length;
  res.json({
    ok: true,
    total: all.length,
    offset,
    nextOffset,
    count: slice.length,
    hasMore: nextOffset < all.length,
    items: slice,
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

const DECOR_PREFAB_CATALOG_URL = pathToFileURL(
  path.join(__dirname, '../../packages/shared/src/decor-prefab-catalog.mjs'),
).href;
const ADMIN_MAP_STATIC_URL = pathToFileURL(
  path.join(__dirname, '../../packages/shared/src/admin-map-static.mjs'),
).href;
const ADMIN_MAP_POIS_URL = pathToFileURL(
  path.join(__dirname, '../../packages/shared/src/admin-map-pois.mjs'),
).href;

function _adminDecorLayer(d) {
  const pid = d.prefabId || '';
  if (d.kind === 'item') return 'item';
  if (pid.startsWith('tree_')) return pid === 'tree_palm' ? 'palm' : 'tree';
  if (pid.startsWith('rock_') || pid === 'spawn_stone') return 'rock';
  if (pid.startsWith('building_') || pid.startsWith('smallcity_') || pid.startsWith('s01_')) return 'building';
  if (pid.startsWith('sign_') || pid.startsWith('beach_')) return 'sign';
  if (pid.startsWith('wreck_')) return 'wreck';
  if (pid.startsWith('road_')) return 'barrier';
  if (pid === 'storage_chest') return 'storage';
  if (pid.startsWith('spawn_') || pid.startsWith('build_')) return 'camp';
  return 'other';
}

function _adminDecorMarker(d) {
  return {
    id: d.id,
    kind: d.kind || 'item',
    prefabId: d.prefabId || null,
    type: d.type || null,
    x: d.x,
    z: d.z,
    y: d.y,
    rotY: d.rotY,
    scale: d.scale,
    layer: _adminDecorLayer(d),
    immutable: _isDecorImmutable(d),
    placementKey: d.placementKey || _getPlacementKey(d) || null,
    createdBy: d.createdBy || null,
    anchorId: d.anchorId || null,
    zoneId: d.zoneId ?? null,
  };
}

app.get('/api/admin/world-map', async (req, res) => {
  const user = authFromHeader(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Non authentifié' });
  if (!isAdminUser(user.username) && !RCON_AUTO_ADMIN) {
    return res.status(403).json({ ok: false, error: 'Accès admin requis' });
  }
  try {
    const [staticMod, poisMod] = await Promise.all([
      import(ADMIN_MAP_STATIC_URL),
      import(ADMIN_MAP_POIS_URL),
    ]);
    const staticData = staticMod.getAdminMapStaticData();
    const decor = Array.from(decorItems.values()).map(_adminDecorMarker);
    const seedPlacements = poisMod.computeAdminMapSeedPlacements?.() || [];
    const pois = poisMod.buildAdminMapPois({
      decor,
      seedPlacements,
      designLandmarks: staticData.designLandmarks || [],
    });
    const online = [];
    for (const p of players.values()) {
      online.push({
        id: p.id,
        username: p.username,
        x: p.x,
        z: p.z,
        y: p.y,
        health: p.health,
        rotY: p.rotY,
      });
    }
    const byLayer = {};
    for (const d of decor) byLayer[d.layer] = (byLayer[d.layer] || 0) + 1;
    res.json({
      ok: true,
      world: staticData.world,
      sectors: staticData.sectors,
      roads: staticData.roads,
      gates: staticData.gates,
      pois,
      decor,
      players: online,
      waterZones: worldWaterZones,
      lootBuildings,
      stats: {
        decor: decor.length,
        players: online.length,
        byLayer,
      },
      updatedAt: Date.now(),
    });
  } catch (err) {
    log.error('admin', 'world-map failed', { err: err.message });
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

function _adminDecorAuth(req, res) {
  const user = authFromHeader(req);
  if (!user) {
    res.status(401).json({ ok: false, error: 'Non authentifié' });
    return null;
  }
  if (!isAdminUser(user.username) && !RCON_AUTO_ADMIN) {
    res.status(403).json({ ok: false, error: 'Accès admin requis' });
    return null;
  }
  return user;
}

app.get('/api/admin/decor/:id', (req, res) => {
  const user = _adminDecorAuth(req, res);
  if (!user) return;
  const id = String(req.params.id || '').trim();
  const item = decorItems.get(id);
  if (!item) return res.status(404).json({ ok: false, error: 'Décor introuvable' });
  res.json({
    ok: true,
    item: adminDecorSnapshot(item),
    editable: true,
    immutable: _isDecorImmutable(item),
  });
});

app.patch('/api/admin/decor/:id', (req, res) => {
  const user = _adminDecorAuth(req, res);
  if (!user) return;
  const id = String(req.params.id || '').trim();
  const item = decorItems.get(id);
  if (!item) return res.status(404).json({ ok: false, error: 'Décor introuvable' });
  const patch = req.body?.patch || req.body || {};
  const changed = applyAdminDecorPatch(item, patch, user.username);
  if (!changed.length) {
    return res.json({ ok: true, changed: [], item: adminDecorSnapshot(item), message: 'Aucun changement' });
  }
  if (item.prefabId?.startsWith('wreck_') && Number.isFinite(item.wreckTilt)) {
    item.rotZ = item.wreckTilt;
  }
  decorItems.set(id, item);
  worldPersist?.scheduleUpsertDecor(item);
  io.emit('decor-item-spawn', item);
  log.info('admin', 'decor patched', { id, changed, by: user.username });
  res.json({ ok: true, changed, item: adminDecorSnapshot(item) });
});

app.delete('/api/admin/decor/:id', (req, res) => {
  const user = _adminDecorAuth(req, res);
  if (!user) return;
  const id = String(req.params.id || '').trim();
  const force = req.query.force === '1' || req.body?.force === true;
  const removed = _removeDecorItem(id, { emit: true, force: force || true });
  if (!removed) return res.status(404).json({ ok: false, error: 'Décor introuvable ou non supprimable' });
  log.info('admin', 'decor deleted', { id, by: user.username });
  res.json({ ok: true, id });
});

app.get('/api/admin/prefab-catalog', async (req, res) => {
  const user = authFromHeader(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Non authentifié' });
  if (!isAdminUser(user.username) && !RCON_AUTO_ADMIN) {
    return res.status(403).json({ ok: false, error: 'Accès admin requis' });
  }
  try {
    const mod = await import(DECOR_PREFAB_CATALOG_URL);
    if (!decorPrefabCatalogCache.length) await _reloadDecorPrefabCatalog();
    res.json({
      ok: true,
      prefabs: decorPrefabCatalogCache,
      categories: mod.DECOR_PREFAB_CATEGORIES,
      count: decorPrefabCatalogCache.length,
      autoDiscovered: true,
    });
  } catch (err) {
    log.error('admin', 'prefab catalog failed', { err: err.message });
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
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
    if (isDevServer()) return res.status(403).json(_devAccessPayload());
    if (await getPlayer(username)) return res.status(409).json({ error: 'Nom déjà utilisé' });
    const hash = await bcrypt.hash(password, 12);
    const id = await createPlayer(username, hash, STARTING_SAVE, _randomBeachSpawn());
    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
    const isAdmin = isAdminUser(username) || RCON_AUTO_ADMIN;
    log.info('auth', 'register ok', { username });
    res.json({ token, username, isAdmin, rconEnabled: isAdmin, serverRole: SERVER_ROLE });
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
    serverRole: SERVER_ROLE,
    qaEnabled: isQaServer(),
  });
});

app.get('/api/qa/checklist', async (req, res) => {
  if (!isQaServer()) return res.status(404).json({ ok: false, error: 'QA indisponible sur ce serveur' });
  const user = authFromHeader(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Non authentifié' });
  try {
    const data = await qaChecklist.listItemsForTester(user.username);
    res.json({ ok: true, ...data });
  } catch (err) {
    log.error('qa', 'checklist failed', { err: err.message });
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

app.post('/api/qa/verdict', async (req, res) => {
  if (!isQaServer()) return res.status(404).json({ ok: false, error: 'QA indisponible sur ce serveur' });
  const user = authFromHeader(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Non authentifié' });
  const { itemId, verdict, feedback } = req.body || {};
  try {
    const result = await qaChecklist.submitVerdict(itemId, user.username, verdict, feedback);
    if (!result.ok) {
      const status = result.err === 'feedback_required' ? 400 : 409;
      return res.status(status).json(result);
    }
    res.json(result);
  } catch (err) {
    log.error('qa', 'verdict failed', { err: err.message });
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Champs manquants' });

  try {
    const player = await getPlayer(username);
    if (!player || !(await bcrypt.compare(password, player.password_hash)))
      return res.status(401).json({ error: 'Identifiants invalides' });
    if (isDevServer() && !_canAccessDevServer(player.username)) {
      return res.status(403).json(_devAccessPayload());
    }

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
      serverRole: SERVER_ROLE,
      qaEnabled: isQaServer(),
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
/** IDs prefabs RCON — découverts depuis le client JS + sync clients connectés. */
const decorPrefabs = [];
const CLIENT_PUBLIC_JS = path.join(__dirname, '../client/public/js');
let decorPrefabCatalogCache = [];
const clientDecorPrefabMeta = {};
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
const DOOR_PREFABS = new Set([
  'building_survivor_shack',
  'build_door_wood',
  'build_large_door_wood',
  'smallcity_house_a',
  'smallcity_house_b',
]);
const STORAGE_CHEST_CAPACITY = 27;
const STORAGE_CHEST_BREAK_HITS = 3;
let zombieIdCounter    = 0;
let itemIdCounter      = 0;
let structureIdCounter = 0;
let doorLockSeq        = 0;
let worldWaterZones    = [];

// ── Spawn / kit / survie ──────────────────────────────────────────────────────
const BEACH_SPAWN      = { x: 248, y: 1, z: -8, rotY: Math.PI / 2 }; // sync beach-spawn.mjs

function _randomBeachSpawn() {
  if (_beachSpawnMod?.pickBeachSpawn) return _beachSpawnMod.pickBeachSpawn();
  return { ...BEACH_SPAWN };
}

function _isOnBeachSafeSand(x, z) {
  if (_beachSpawnMod?.isOnBeachSafeSand) return _beachSpawnMod.isOnBeachSafeSand(x, z);
  return false;
}

const BEACH_SAFE_LOOT_MSG = 'Zone protégée — pas de vol sur la plage';
const BEACH_BUILD_BLOCKED_MSG = 'Construction interdite sur la plage (zone protégée)';

function _isBuildBlockedOnBeach(x, z, halfW = 1.5, halfD = 1.5) {
  if (_s01BuildMod?.isS01BuildBlocked) {
    return _s01BuildMod.isS01BuildBlocked(x, z, halfW, halfD);
  }
  if (_beachSpawnMod?.isBuildBlockedOnBeach) {
    return _beachSpawnMod.isBuildBlockedOnBeach(x, z, halfW, halfD);
  }
  return _isOnBeachSafeSand(x, z);
}

function _isInS01SafeZone(x, z) {
  if (_s01SafeMod?.isInS01SafeZone) return _s01SafeMod.isInS01SafeZone(x, z);
  return _isOnBeachSafeSand(x, z);
}

function _sleepLootBlockedOnBeach(target) {
  return target?.kind === 'sleep'
    && (target.x != null && target.z != null)
    && _isInS01SafeZone(target.x, target.z);
}

function _isDecorImmutable(item) {
  if (!item) return false;
  if (item.immutable === true) return true;
  const key = item.placementKey || '';
  return typeof key === 'string' && key.startsWith('s01:');
}
const DEFAULT_SURVIVAL = { faim: 80, soif: 80, infection: 0, saignement: false, endurance: 100 };
const STARTER_RATIONS = Object.freeze([
  { type: 'food_eau_bouteille', qty: 1 },
  { type: 'food_sandwich', qty: 1 },
]);

const STARTING_ITEMS   = {
  hotbar: [
    { type: 'tool_caillou', qty: 1, durability: 80 },
    { type: 'tool_torche', qty: 1 },
    { type: 'food_eau_bouteille', qty: 1 },
    { type: 'food_sandwich', qty: 1 },
    null, null,
  ],
  bag: [],
  equip: { 'Tête': null, 'Torso': null, 'Mains': null, 'Dos': null },
};

function _invHasType(inv, type) {
  const hotbar = Array.isArray(inv.hotbar) ? inv.hotbar : [];
  const bag = inv.bag || [];
  const equip = inv.equip || {};
  return hotbar.some((s) => s && s.type === type)
    || bag.some((s) => s && s.type === type)
    || Object.values(equip).some((s) => s && s.type === type);
}

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
  inv.hotbar = [
    { type: 'tool_caillou', qty: 1, durability: 80 },
    { type: 'tool_torche', qty: 1 },
    null, null, null, null,
  ];
  inv.bag = inv.bag || [];
  return true;
}

/** Torche de départ si absent (rejoin de nuit). */
function _invHasFood(inv) {
  const hotbar = Array.isArray(inv.hotbar) ? inv.hotbar : [];
  const bag = inv.bag || [];
  const equip = inv.equip || {};
  const isFood = (s) => s?.type?.startsWith('food_');
  return hotbar.some(isFood) || bag.some(isFood) || Object.values(equip).some(isFood);
}

/** Eau + sandwich si aucune nourriture (1re partie / vieille sauvegarde). */
function ensureStarterRations(p) {
  const inv = p.inv;
  if (!inv || typeof inv !== 'object') return false;
  _ensureSlotGrid(inv);
  if (_invHasFood(inv)) return false;
  let changed = false;
  for (const s of STARTER_RATIONS) {
    if (_invHasType(inv, s.type)) continue;
    const hotbar = inv.hotbar || [];
    const freeHb = hotbar.findIndex((slot) => !slot || !slot.type);
    if (freeHb >= 0) {
      hotbar[freeHb] = { ...s };
      changed = true;
      continue;
    }
    inv.bag = inv.bag || [];
    inv.bag.push({ ...s });
    changed = true;
  }
  return changed;
}

function ensureStarterTorch(p) {
  const inv = p.inv;
  if (!inv || typeof inv !== 'object') return false;
  if (_invHasType(inv, 'tool_torche')) return false;
  const hotbar = Array.isArray(inv.hotbar) ? inv.hotbar : (inv.hotbar = []);
  const idx = hotbar.findIndex((s) => !s || !s.type);
  const torch = { type: 'tool_torche', qty: 1 };
  if (idx >= 0) {
    hotbar[idx] = torch;
    return true;
  }
  inv.bag = inv.bag || [];
  inv.bag.push(torch);
  return true;
}
const STARTING_SAVE = JSON.stringify({
  ...STARTING_ITEMS,
  survival: DEFAULT_SURVIVAL,
  scenario: {
    act: 'beach',
    step: 'intro_wake',
    completed: false,
    version: 2,
    tutorialZombieId: null,
    tutorialKilled: false,
  },
});
const GROUND_ITEM_TTL_MS = 30 * 60 * 1000; // drops joueur / mort / zombie / coffre : 30 min

// Sauvegarde combinée (objets + survie) écrite dans la colonne JSON `inventory`.
function saveBlob(p) {
  const base = Array.isArray(p.inv) ? { hotbar: p.inv } : (p.inv || {});
  return JSON.stringify({ ...base, survival: p.survival || DEFAULT_SURVIVAL });
}

function _emitInvAuth(socket, p) {
  _scheduleInvAuth(socket, p);
}

const _pendingInvAuth = new Map();

function _scheduleInvAuth(socket, p) {
  if (!socket?.id || !p) return;
  p.dirty = true;
  if (_pendingInvAuth.has(socket.id)) return;
  _pendingInvAuth.set(socket.id, { socket, p });
  setImmediate(() => {
    const pending = _pendingInvAuth.get(socket.id);
    _pendingInvAuth.delete(socket.id);
    if (!pending?.socket?.connected) return;
    const pl = players.get(pending.socket.id);
    if (!pl) return;
    pending.socket.emit('inventory-authoritative', _cloneInv(pl.inv));
  });
}

function _wearPlayerToolInv(p, toolType, wmod) {
  if (!toolType || toolType === '__fist__') return { worn: false, broken: false };
  const max = wmod.getWeaponStats(toolType).durabilityMax;
  if (max == null || max === Infinity || !Number.isFinite(max)) {
    return { worn: false, broken: false };
  }
  return _wearInvTool(p.inv, toolType, max);
}

async function _wearPlayerTool(socket, p, toolType) {
  const wmod = _weaponStatsMod || await weaponStatsModPromise;
  const res = _wearPlayerToolInv(p, toolType, wmod);
  if (res.worn) _scheduleInvAuth(socket, p);
  return res;
}

function _emitSurvivalUpdate(socket, p) {
  const sv = p.survival || {};
  const snap = {
    f: Math.floor(sv.faim ?? 80),
    s: Math.floor(sv.soif ?? 80),
    i: Math.floor(sv.infection ?? 0),
    b: !!sv.saignement,
    e: Math.floor(sv.endurance ?? 100),
    h: Math.floor(p.health ?? 100),
  };
  const prev = p._svBroadcastSnap;
  p._svBroadcastSnap = snap;
  if (prev && prev.f === snap.f && prev.s === snap.s && prev.i === snap.i
    && prev.b === snap.b && prev.e === snap.e && prev.h === snap.h) {
    return;
  }
  socket.emit('survival-update', {
    faim: sv.faim ?? 80,
    soif: sv.soif ?? 80,
    infection: sv.infection ?? 0,
    saignement: !!sv.saignement,
    infectionPausedUntil: sv.infectionPausedUntil || 0,
    endurance: sv.endurance ?? 100,
    health: p.health,
  });
}

function _applyPlayerCombatDamage(attacker, target, dmg) {
  if (!target || target.health <= 0 || target._deathHandled) return;
  if (target.invincible) return;
  if (_isOnBeachSafeSand(target.x, target.z)) return;
  target.health = Math.max(0, target.health - dmg);
  if (!target.survival) target.survival = { ...DEFAULT_SURVIVAL };
  const sv = target.survival;
  if (dmg >= 8 && Math.random() < 0.2) sv.saignement = true;
  target.dirty = true;
  const targetSock = io.sockets.sockets.get(target.socketId);
  if (targetSock) {
    targetSock.emit('take-damage', { dmg, health: target.health });
    _emitSurvivalUpdate(targetSock, target);
  }
  io.emit('player-hit', { id: target.socketId, health: target.health });
  if (target.health <= 0) {
    _handlePlayerDeath(target);
    if (attacker && attacker.socketId !== target.socketId) {
      attacker.kills++;
      attacker.lifePlayerKills = (attacker.lifePlayerKills ?? 0) + 1;
      const atkSock = io.sockets.sockets.get(attacker.socketId);
      if (atkSock) {
        atkSock.emit('score-update', {
          kills: attacker.kills,
          playerKills: attacker.lifePlayerKills ?? 0,
        });
      }
      log.info('combat', 'pvp kill', { killer: attacker.username, victim: target.username });
    }
  }
}

function _spawnDeathBagFromPlayer(p) {
  const loot = flattenInv(p._deathInv);
  const pos = p._deathPos;
  if (!loot?.length || !pos) return;
  _addGroundItem({
    id: ++itemIdCounter,
    type: 'death_bag',
    bag: true,
    x: pos.x,
    z: pos.z,
    items: loot,
    expiresAt: Date.now() + GROUND_ITEM_TTL_MS,
    owner: p.username,
  });
  log.info('death', 'death bag spawned on respawn', {
    player: p.username,
    items: loot.length,
    pos: { x: +pos.x.toFixed(1), z: +pos.z.toFixed(1) },
  });
}

function _spawnDeathBagFromSleeper(sleep) {
  const loot = flattenInv(sleep?._deathInv);
  if (!loot?.length || sleep?.x == null) return;
  _addGroundItem({
    id: ++itemIdCounter,
    type: 'death_bag',
    bag: true,
    x: sleep.x,
    z: sleep.z,
    items: loot,
    expiresAt: Date.now() + GROUND_ITEM_TTL_MS,
    owner: sleep.username,
  });
  log.info('death', 'death bag spawned on sleeper reconnect', {
    player: sleep.username,
    items: loot.length,
    pos: { x: +sleep.x.toFixed(1), z: +sleep.z.toFixed(1) },
  });
}

function _applySleeperCombatDamage(attacker, sleep, dmg) {
  if (!sleep || sleep.dead || sleep.health <= 0) return;
  if (_isOnBeachSafeSand(sleep.x, sleep.z)) return;
  sleep.health = Math.max(0, sleep.health - dmg);
  _saveSleepingToDb(sleep).catch(() => {});
  io.emit('sleeper-hit', {
    playerId: _normPlayerId(sleep.playerId),
    health: sleep.health,
  });
  if (sleep.health <= 0) _handleSleeperDeath(attacker, sleep);
}

function _handleSleeperDeath(attacker, sleep) {
  if (!sleep || sleep.dead) return;
  sleep.dead = true;
  sleep.health = 0;
  sleep._deathInv = _cloneInv(sleep.inv);
  sleep._deathEquipped = sleep.equipped || null;
  sleep.inv = _normalizeInv({
    hotbar: Array(6).fill(null),
    bag: [],
    equip: { Tête: null, Torso: null, Mains: null, Dos: null },
  });
  _saveSleepingToDb(sleep).catch(() => {});
  log.info('combat', 'sleeper killed', {
    victim: sleep.username,
    killer: attacker?.username || '?',
    pos: { x: +sleep.x.toFixed(1), z: +sleep.z.toFixed(1) },
  });
  io.emit('sleeper-death', {
    playerId: _normPlayerId(sleep.playerId),
    username: sleep.username,
    x: sleep.x,
    y: sleep.y,
    z: sleep.z,
    rotY: sleep.rotY,
    equipped: sleep._deathEquipped,
  });
  if (attacker) {
    attacker.kills++;
    attacker.lifePlayerKills = (attacker.lifePlayerKills ?? 0) + 1;
    const atkSock = io.sockets.sockets.get(attacker.socketId);
    if (atkSock) {
      atkSock.emit('score-update', {
        kills: attacker.kills,
        playerKills: attacker.lifePlayerKills ?? 0,
      });
    }
  }
}

/** Cible la plus proche le long du rayon : joueurs connectés, endormis, puis zombies. */
function _pickShootTarget(ray, combatMod, pvpTargets, zombieList, sleepers) {
  let best = null;
  let minT = Infinity;
  const playerR = Math.max(ray.radius || 0, combatMod.PLAYER_HIT_RADIUS);

  for (const pl of pvpTargets) {
    if (pl.skip || pl.health <= 0 || pl.invincible) continue;
    if (_isOnBeachSafeSand(pl.x, pl.z)) continue;
    const hit = combatMod.rayHitXZ(ray.ox, ray.oz, ray.nx, ray.nz, ray.range, pl.x, pl.z, playerR);
    if (hit && hit.t < minT) {
      minT = hit.t;
      best = { kind: 'player', id: pl.socketId };
    }
  }

  for (const sleep of sleepers) {
    if (!sleep || sleep.dead || sleep.health <= 0) continue;
    if (_isOnBeachSafeSand(sleep.x, sleep.z)) continue;
    const hit = combatMod.rayHitXZ(ray.ox, ray.oz, ray.nx, ray.nz, ray.range, sleep.x, sleep.z, playerR);
    if (hit && hit.t < minT) {
      minT = hit.t;
      best = { kind: 'sleeper', entity: sleep };
    }
  }

  for (const z of zombieList) {
    const hitR = z.hitRadius || ray.radius || playerR;
    const hit = combatMod.rayHitXZ(ray.ox, ray.oz, ray.nx, ray.nz, ray.range, z.x, z.z, hitR);
    if (hit && hit.t < minT) {
      minT = hit.t;
      best = { kind: 'zombie', id: z.id, entity: z };
    }
  }

  return best;
}

function _initLifeStats(p, restore) {
  const now = Date.now();
  p.lifeStartedAt = restore?.lifeStartedAt ?? now;
  p.lifeZombieKills = restore?.lifeZombieKills ?? 0;
  p.lifePlayerKills = restore?.lifePlayerKills ?? 0;
}

function _resetLifeStats(p) {
  p.lifeStartedAt = Date.now();
  p.lifeZombieKills = 0;
  p.lifePlayerKills = 0;
}

function _lifeRecap(p) {
  const started = p.lifeStartedAt || p.connectedAt || Date.now();
  return {
    zombieKills: p.lifeZombieKills ?? 0,
    playerKills: p.lifePlayerKills ?? 0,
    survivedMs: Math.max(0, Date.now() - started),
    totalKills: p.kills ?? 0,
  };
}

function _handlePlayerDeath(p) {
  if (p.health > 0 || p._deathHandled) return;
  p._deathHandled = true;
  p.health = 0;
  if (p.inv?.scenario) {
    p._scenarioKeep = { ...p.inv.scenario };
  }
  p._deathInv = _cloneInv(p.inv);
  p._deathPos = { x: p.x, y: p.y, z: p.z, rotY: p.rotY };
  p._deathEquipped = p.equipped || null;
  p.inv = _normalizeInv({
    hotbar: Array(6).fill(null),
    bag: [],
    equip: { Tête: null, Torso: null, Mains: null, Dos: null },
  });
  p.dirty = true;
  log.info('death', 'player down', {
    player: p.username,
    lootItems: flattenInv(p._deathInv).length,
    pos: { x: +p.x.toFixed(1), z: +p.z.toFixed(1) },
  });
  io.emit('player-death', {
    id: p.socketId,
    playerId: _normPlayerId(p.id),
    username: p.username,
    x: p.x,
    y: p.y,
    z: p.z,
    rotY: p.rotY,
    equipped: p._deathEquipped,
    kills: p.kills,
    recap: _lifeRecap(p),
  });
  const sock = io.sockets.sockets.get(p.socketId);
  if (sock) {
    _emitInvAuth(sock, p);
    _emitSurvivalUpdate(sock, p);
  }
}

function _sleepBodyId(playerId) {
  return `sleep:${playerId}`;
}

function _normPlayerId(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n : id;
}

function _sleeperKey(id) {
  return _normPlayerId(id);
}

function _getSleepingPlayer(id) {
  const key = _sleeperKey(id);
  return sleepingPlayers.get(key) || null;
}

function _setSleepingPlayer(id, sleep) {
  const key = _sleeperKey(id);
  if (sleep) sleep.playerId = key;
  sleepingPlayers.set(key, sleep);
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

async function _saveSleepingToDb(sleep) {
  if (!sleep?.playerId) return;
  sleep.playerId = _sleeperKey(sleep.playerId);
  worldPersist?.scheduleUpsertSleeper?.(sleep);
  await savePlayerState(
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
  const grid = _ensureChestGrid(item.storage, STORAGE_CHEST_CAPACITY);
  item.storage = grid;
  return {
    id: item.id,
    items: grid.map((s) => (s?.type ? { type: s.type, qty: s.qty || 1 } : null)),
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
const PALM_PLACEMENTS_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/palm-placements.mjs')).href;
const BEACH_SIGN_PLACEMENTS_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/beach-sign-placements.mjs')).href;
const S01_WORLD_PLACEMENTS_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/s01-world-placements.mjs')).href;
const S01_BUILD_EXCLUSIONS_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/s01-build-exclusions.mjs')).href;
const S01_SAFE_ZONES_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/s01-safe-zones.mjs')).href;
const TREE_WOOD_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/tree-wood.mjs')).href;
const ROCK_STONE_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/rock-stone.mjs')).href;
const ROCK_PLACEMENTS_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/rock-placements.mjs')).href;
const BUILD_DAMAGE_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/build-damage.mjs')).href;
const ITEM_EFFECTS_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/item-effects.mjs')).href;
const CRAFT_RECIPES_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/craft-recipes.mjs')).href;
const WEAPON_STATS_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/weapon-stats.mjs')).href;
const buildDamageModPromise = import(BUILD_DAMAGE_URL);
const itemEffectsModPromise = import(ITEM_EFFECTS_URL);
const craftRecipesModPromise = import(CRAFT_RECIPES_URL);
const weaponStatsModPromise = import(WEAPON_STATS_URL);
let _weaponStatsMod = null;
let _itemFxMod = null;
weaponStatsModPromise.then((m) => { _weaponStatsMod = m; }).catch(() => {});
itemEffectsModPromise.then((m) => { _itemFxMod = m; }).catch(() => {});

async function _getItemFx() {
  return _itemFxMod || itemEffectsModPromise;
}

function _maybeSyncEquipArmor(p, prevArmor, itemFx) {
  const newArmor = itemFx.getArmorFromInv(p.inv, _normalizeInv);
  itemFx.syncArmorHealth(p, prevArmor, newArmor);
  return prevArmor !== newArmor;
}
const _craftOps = {
  countInvType: _countInvType,
  removeStackFromInv: _removeStackFromInv,
  addStackToInv: _addStackToInv,
};
const RESOURCE_REGEN_URL = pathToFileURL(path.join(__dirname, 'src/resource-regen.mjs')).href;
const SCENARIO_BEACH_URL = pathToFileURL(path.join(__dirname, 'src/scenario-beach.mjs')).href;
const GROUPS_URL = pathToFileURL(path.join(__dirname, 'src/groups.mjs')).href;
const COMBAT_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/combat.mjs')).href;
const SURVIVAL_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/survival.mjs')).href;
const BEACH_SPAWN_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/beach-spawn.mjs')).href;
const SECTOR_BOUNDS_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/sector-bounds.mjs')).href;
let _combatMod = null;
let _survivalMod = null;
let _beachSpawnMod = null;
const combatModPromise = import(COMBAT_URL).then((m) => { _combatMod = m; return m; });
const survivalModPromise = import(SURVIVAL_URL).then((m) => { _survivalMod = m; return m; });
const beachSpawnModPromise = import(BEACH_SPAWN_URL).then((m) => { _beachSpawnMod = m; return m; });
let _s01BuildMod = null;
let _s01SafeMod = null;
const s01BuildModPromise = import(S01_BUILD_EXCLUSIONS_URL).then((m) => { _s01BuildMod = m; return m; });
const s01SafeModPromise = import(S01_SAFE_ZONES_URL).then((m) => { _s01SafeMod = m; return m; });
let _sectorBoundsMod = null;
const sectorBoundsModPromise = import(SECTOR_BOUNDS_URL).then((m) => { _sectorBoundsMod = m; return m; });
let scenarioBeach = null;
const scenarioBeachModPromise = import(SCENARIO_BEACH_URL);
let groupsManager = null;
const groupsModPromise = import(GROUPS_URL);

async function _getGroupsManager() {
  if (groupsManager) return groupsManager;
  const { createGroupsManager } = await groupsModPromise;
  groupsManager = createGroupsManager({
    io,
    players,
    log,
    normPlayerId: _normPlayerId,
  });
  return groupsManager;
}

async function _getScenarioBeach() {
  if (scenarioBeach) return scenarioBeach;
  const { createScenarioBeach } = await scenarioBeachModPromise;
  scenarioBeach = createScenarioBeach({
    zombies,
    players,
    makeZombie,
    compactZombiesForSync: _compactZombiesForSync,
    addGroundItem: _addGroundItem,
    getNextItemId: () => ++itemIdCounter,
    worldPersist,
    log,
    normPlayerId: _normPlayerId,
  });
  return scenarioBeach;
}
const _TREE_WOOD_FALLBACK = { tree_oak: 8, tree_pine: 10, tree_birch: 6, tree_dead: 3, tree_palm: 6 };
const _TREE_WOOD_RATIO = [0.1, 0.28, 0.5, 0.78, 1.0];
const _ROCK_STONE_FALLBACK = { rock_boulder: 20, rock_outcrop: 14, spawn_stone: 8 };

function _treeWoodForPhase(prefabId, phase) {
  const p = Math.max(0, Math.min(4, Math.floor(phase ?? 4)));
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
    trees: list.filter((d) => d.prefabId?.startsWith('tree_') && d.prefabId !== 'tree_palm').length,
    palms: list.filter((d) => d.prefabId === 'tree_palm').length,
    worldRocks: list.filter((d) => _isMinableRockPrefab(d.prefabId) && !d.anchorId).length,
    campRocks: list.filter((d) => _isMinableRockPrefab(d.prefabId) && d.anchorId).length,
  };
}

function _touchDecorItem(item) {
  if (item) worldPersist?.scheduleUpsertDecor(item);
}

function _removeDecorItem(id, { emit = true, force = false, markRemoved = true } = {}) {
  const item = decorItems.get(id);
  if (!item) return false;
  if (!force && _isDecorImmutable(item)) return false;
  decorItems.delete(id);
  worldPersist?.scheduleDeleteDecor(id, item, { markRemoved });
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
      if (!d.prefabId?.startsWith('tree_') || d.prefabId === 'tree_palm') continue;
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

/** Panneau sortie plage — seed initial + RCON decorseed signs. */
function ensureBeachSigns({ broadcast = false, reset = false } = {}) {
  if (reset) {
    for (const [id, d] of decorItems) {
      if (d.prefabId !== 'sign_beach_exit' && d.prefabId !== 'beach_exit_torch') continue;
      _removeDecorItem(id, { emit: broadcast });
    }
  }
  return import(BEACH_SIGN_PLACEMENTS_URL).then(({ computeBeachSignPlacements }) => {
    const added = [];
    for (const p of computeBeachSignPlacements()) {
      const item = _trySeedDecor(p);
      if (item) added.push(item);
    }
    if (added.length) {
      log.info('seed', 'beach signs added', { count: added.length });
      if (broadcast && rcon?.broadcastDecorSpawn) {
        for (const item of added) rcon.broadcastDecorSpawn(item);
      }
    }
    return added.length;
  });
}

/** Palmiers plage — seed initial + RCON decorseed palms. */
function ensureBeachPalms({ broadcast = false, reset = false } = {}) {
  if (reset) {
    for (const [id, d] of decorItems) {
      if (d.prefabId !== 'tree_palm') continue;
      _removeDecorItem(id, { emit: broadcast });
    }
  }
  return import(PALM_PLACEMENTS_URL).then(({ computePalmPlacements }) =>
    import(TREE_WOOD_URL).then(({ getTreeWoodMax }) => {
      const added = [];
      for (const p of computePalmPlacements()) {
        const woodMax = getTreeWoodMax(p.prefabId);
        const item = _trySeedDecor(p, { woodMax, woodRemaining: woodMax });
        if (item) added.push(item);
      }
      if (added.length) {
        log.info('seed', 'beach palms added', { count: added.length });
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

/** Prefabs campement / POI S01 — retirés pour repartir sur map propre. */
const S01_CAMP_POI_PREFABS = new Set([
  's01_gas_station',
  's01_military_tent',
  'building_survivor_shack',
  'spawn_campfire',
  'spawn_workbench',
  'spawn_bedroll',
  'spawn_lean_to',
  'spawn_backpack',
  'spawn_supply_crate',
]);

/** Supprime les arbres forêt dans les zones de dégagement bâtiments S01. */
function _clearTreesInZones(zones, { broadcast = false } = {}) {
  if (!zones?.length) return 0;
  let n = 0;
  for (const [id, d] of [...decorItems.entries()]) {
    const pid = d.prefabId || '';
    if (!pid.startsWith('tree_') || pid === 'tree_palm') continue;
    for (const zone of zones) {
      if (Math.hypot(d.x - zone.cx, d.z - zone.cz) < zone.r) {
        if (_removeDecorItem(id, { emit: broadcast })) n++;
        break;
      }
    }
  }
  if (n) log.info('seed', 'trees cleared for S01 buildings', { count: n });
  return n;
}

/** Retire tout decor seed S01 persisté (station, cabanes, pont, hub…). */
function _purgeAllS01Decor({ broadcast = false, reseed = false } = {}) {
  let n = 0;
  for (const [id, d] of [...decorItems.entries()]) {
    const pk = String(d.placementKey || '');
    const isS01Key = pk.startsWith('s01:');
    const isS01Prefab = S01_CAMP_POI_PREFABS.has(d.prefabId);
    if (!isS01Key && !isS01Prefab) continue;
    _removeDecorItem(id, { emit: broadcast, force: true, markRemoved: !reseed });
    n++;
  }
  if (n) log.info('seed', 's01 decor purged', { count: n, reseed });
  return n;
}

/**
 * Wipe constructions joueur (RCON worldwipe + boot clean slate).
 * @param {object} opts
 * @param {boolean} [opts.broadcast=true] sync clients
 * @param {boolean} [opts.allPlayerDecor=false] tout décor non-seed non-immuable (decoradd admin)
 * @param {boolean} [opts.groundItems=false] loot / drops au sol
 * @param {boolean} [opts.persist=true] flush SQLite immédiat
 */
async function wipePlayerWorld({
  broadcast = true,
  allPlayerDecor = false,
  groundItems = false,
  persist = true,
} = {}) {
  let decorN = 0;
  let structN = 0;
  let groundN = 0;

  for (const [id] of [...structures.entries()]) {
    structures.delete(id);
    worldPersist?.scheduleDeleteStructure?.(id);
    structN++;
  }
  structureColliders.length = 0;

  for (const [id, d] of [...decorItems.entries()]) {
    if (_isDecorImmutable(d)) continue;
    const pid = d.prefabId || '';
    const pk = String(d.placementKey || '');
    if (pk.startsWith('s01:')) continue;
    const isPlayerWood = pid.startsWith('build_') && pid.endsWith('_wood');
    const isCampPoi = S01_CAMP_POI_PREFABS.has(pid);
    const isPlayerChest = pid === 'storage_chest' && d.createdBy !== 'seed';
    const isManualDecor = allPlayerDecor && d.createdBy !== 'seed';
    if (!isPlayerWood && !isCampPoi && !isPlayerChest && !isManualDecor) continue;
    _removeDecorItem(id, { emit: broadcast, force: true });
    decorN++;
  }

  if (groundItems) {
    for (const [id] of [...items.entries()]) {
      _removeGroundItem(id, { emit: broadcast });
      groundN++;
    }
  }

  if (persist) {
    await worldPersist.flushSync?.({
      decorSeq,
      structureIdCounter,
      itemIdCounter,
      zombieIdCounter,
      doorLockSeq,
    });
  }

  if (decorN || structN || groundN) {
    log.info('world', 'player world wiped', { decor: decorN, structures: structN, ground: groundN });
  }
  return { decor: decorN, structures: structN, ground: groundN };
}

async function _runWorldCleanSlateOnce() {
  const marker = path.join(ROOT_DIR, '.world_clean_slate_20260608');
  if (fs.existsSync(marker)) return { skipped: true };
  await wipePlayerWorld({ broadcast: false, persist: true });
  fs.writeFileSync(marker, new Date().toISOString());
  log.info('boot', 'world clean slate applied (player builds + camp POI)');
  return { skipped: false };
}

/** POI forêt S01 — seed initial + complément après persistance. */
function ensureS01World({ broadcast = false, reset = false } = {}) {
  _purgeAllS01Decor({ broadcast, reseed: true });
  if (reset) {
    for (const [id, d] of decorItems) {
      if (!_isDecorImmutable(d)) continue;
      _removeDecorItem(id, { emit: broadcast, force: true });
    }
  }
  return Promise.all([s01BuildModPromise, s01SafeModPromise]).then(() =>
    import(S01_WORLD_PLACEMENTS_URL).then(({ computeS01DecorPlacements, computeS01TreeClearZones }) => {
      const placements = computeS01DecorPlacements();
      const clearZones = computeS01TreeClearZones();
      for (const p of placements) {
        if (p.placementKey) worldPersist?.unmarkSeed?.(p.placementKey);
      }
      const added = [];
      for (const p of placements) {
        const item = _trySeedDecor(p);
        if (item) added.push(item);
      }
      _clearTreesInZones(clearZones, { broadcast });
      if (added.length) {
        log.info('seed', 's01 world added', { count: added.length });
        if (broadcast && rcon?.broadcastDecorSpawn) {
          for (const item of added) rcon.broadcastDecorSpawn(item);
        }
      }
      return added.length;
    }));
}

function seedSpawnDecorItems() {
  return ensureS01World();
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
  pvp: true,
};

const adminSockets = new Set();

function isAdminUser(username) {
  return ADMIN_USERS.has((username || '').toLowerCase());
}

function _canAccessDevServer(username) {
  return isAdminUser(username) || RCON_AUTO_ADMIN;
}

function _devAccessPayload() {
  return { error: 'Serveur dev réservé aux administrateurs', code: 'dev_admin_only' };
}

function setWorldTime(t) {
  _worldTime = ((t % 1) + 1) % 1;
  worldPersist?.scheduleWorldState?.({ worldTime: _worldTime });
}

let rcon = null;

/** Butin zombie — survie (eau/sandwich) + pilules ; pas de seringue. */
const ZOMBIE_DROP_CHANCE = 0.50;
const ZOMBIE_DROP_TYPES = [
  'food_eau_bouteille',
  'food_eau_bouteille',
  'food_sandwich',
  'food_sandwich',
  'food_conserves',
  'med_pilules_anti_infection',
  'med_pilules_anti_infection',
  'med_pilules_anti_infection',
  'med_bandage',
  'ammo_pistolet',
];

function _dropZombieKillLoot(hit) {
  if (Math.random() >= ZOMBIE_DROP_CHANCE) return;
  const type = ZOMBIE_DROP_TYPES[Math.floor(Math.random() * ZOMBIE_DROP_TYPES.length)];
  _dropWorldItem(type, lootQty(type), hit.x + (Math.random() - 0.5) * 1.6, hit.z + (Math.random() - 0.5) * 1.6);
}

// ── Système de loot des bâtiments (voir worlDesign/items/items.md) ────────────
// Le client transmet l'empreinte des bâtiments (loot-buildings) ; le serveur
// répartit les objets au sol selon le type de bâtiment et régénère chaque heure.
let lootBuildings = [];
const LOOT_RESPAWN_MS = 3600 * 1000; // 1 h

// Tables par type : high = forte probabilité, low = faible. Aucun objet exclusif.
const LOOT_TABLES = {
  hopital: {
    high: ['med_bandage', 'med_kit_soin', 'med_pilules_anti_infection'],
    low:  ['med_seringue_anti_infection', 'food_conserves', 'food_eau_bouteille', 'tool_marteau', 'res_chiffon', 'res_ferraille'],
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
  'food_soupe_conserve', 'food_pain', 'food_sandwich', 'food_fruits',
  'med_bandage', 'med_kit_soin', 'med_pilules_anti_infection', 'med_seringue_anti_infection',
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

const ZOMBIE_SYNC_KEYS = ['id', 'x', 'z', 'angle', 'speed', 'health', 'maxHealth', 'prefabId', 'meleeReach', 'collideRadius', 'scenarioFrozen'];

function _compactZombiesForSync(list) {
  const out = new Array(list.length);
  for (let i = 0; i < list.length; i++) {
    const z = list[i];
    const row = {};
    for (let k = 0; k < ZOMBIE_SYNC_KEYS.length; k++) {
      const key = ZOMBIE_SYNC_KEYS[k];
      const val = z[key];
      if (val != null) row[key] = val;
    }
    out[i] = row;
  }
  return out;
}

/** Zombies visibles par client — réduit bande passante et meshes hors rayon (mobile). */
const ZOMBIE_SYNC_RADIUS = 110;
const ZOMBIE_SYNC_RADIUS2 = ZOMBIE_SYNC_RADIUS * ZOMBIE_SYNC_RADIUS;

function _rebuildZombieSpatialGrid(allZ) {
  if (!_zombieSpatialGrid || !allZ.length) return;
  const gridItems = new Array(allZ.length);
  for (let i = 0; i < allZ.length; i++) {
    const z = allZ[i];
    gridItems[i] = { data: z, x: z.x, z: z.z };
  }
  _zombieSpatialGrid.rebuild(gridItems);
}

function _zombiesNear(px, pz, list) {
  if (_zombieSpatialGrid) {
    return _zombieSpatialGrid.query(px, pz, ZOMBIE_SYNC_RADIUS);
  }
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const z = list[i];
    const dx = z.x - px;
    const dz = z.z - pz;
    if (dx * dx + dz * dz <= ZOMBIE_SYNC_RADIUS2) out.push(z);
  }
  return out;
}

const ZOMBIE_FULL_SYNC_EVERY = 20;
const ZOMBIE_SYNC_POS_EPS2 = 0.05 * 0.05;
const ZOMBIE_SYNC_ANGLE_EPS = 0.04;
const PLAYER_SPATIAL_QUERY_R = 28;
let _zombieSyncTick = 0;
/** @type {Map<string, Set<number>>} */
const _playerVisibleZombies = new Map();

function _zombieSyncChanged(z) {
  if (z._syncDirty) return true;
  const sx = z._syncX;
  if (sx == null) return true;
  const dx = z.x - sx;
  const dz = z.z - (z._syncZ ?? 0);
  if (dx * dx + dz * dz > ZOMBIE_SYNC_POS_EPS2) return true;
  let ad = z.angle - (z._syncAngle ?? 0);
  while (ad > Math.PI) ad -= Math.PI * 2;
  while (ad < -Math.PI) ad += Math.PI * 2;
  if (Math.abs(ad) > ZOMBIE_SYNC_ANGLE_EPS) return true;
  if (z.health !== z._syncHealth) return true;
  if (!!z.meleeReach !== !!z._syncMelee) return true;
  if (!!z.scenarioFrozen !== !!z._syncFrozen) return true;
  return false;
}

function _stampZombieSync(z) {
  z._syncX = z.x;
  z._syncZ = z.z;
  z._syncAngle = z.angle;
  z._syncHealth = z.health;
  z._syncMelee = !!z.meleeReach;
  z._syncFrozen = !!z.scenarioFrozen;
  z._syncDirty = false;
}

function _broadcastZombieTick(allZombies, time) {
  if (players.size === 0) return;
  _zombieSyncTick++;
  const full = (_zombieSyncTick % ZOMBIE_FULL_SYNC_EVERY) === 0;

  for (const pl of players.values()) {
    const sock = io.sockets.sockets.get(pl.socketId);
    if (!sock) continue;
    const near = _zombiesNear(pl.x, pl.z, allZombies);
    let visible = _playerVisibleZombies.get(pl.socketId);
    if (!visible) {
      visible = new Set();
      _playerVisibleZombies.set(pl.socketId, visible);
    }

    if (full) {
      visible.clear();
      for (let i = 0; i < near.length; i++) visible.add(near[i].id);
      sock.emit('zombie-tick', { zombies: _compactZombiesForSync(near), full: true, time });
      continue;
    }

    const nearIds = new Set();
    for (let i = 0; i < near.length; i++) nearIds.add(near[i].id);

    const removed = [];
    for (const id of visible) {
      if (!nearIds.has(id)) removed.push(id);
    }

    const updates = [];
    for (let i = 0; i < near.length; i++) {
      const z = near[i];
      if (_zombieSyncChanged(z) || !visible.has(z.id)) updates.push(z);
    }

    for (let i = 0; i < removed.length; i++) visible.delete(removed[i]);
    for (let i = 0; i < updates.length; i++) visible.add(updates[i].id);

    if (!updates.length && !removed.length) {
      // Sync horaire allégé quand aucun zombie proche ne bouge (~1 Hz au lieu de 10 Hz).
      if ((_zombieSyncTick % 10) === 0) sock.emit('zombie-tick', { time });
      continue;
    }
    sock.emit('zombie-tick', {
      zombies: _compactZombiesForSync(updates),
      removed,
      full: false,
      time,
    });
  }

  for (let i = 0; i < allZombies.length; i++) _stampZombieSync(allZombies[i]);
}

const DETECT_RANGE   = 12;
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
const SPATIAL_GRID_URL = pathToFileURL(path.join(__dirname, '../../packages/shared/src/spatial-grid.mjs')).href;
let _zombiePrefabs = null;
let _colliderResolve = null;
let _playerSpatialGrid = null;
let _zombieSpatialGrid = null;

import(SPATIAL_GRID_URL).then((m) => {
  _playerSpatialGrid = m.createSpatialGrid(32);
  _zombieSpatialGrid = m.createSpatialGrid(32);
}).catch((err) => log.error('boot', 'spatial grid init failed', { err: err.message }));

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
    let zone;
    for (let attempt = 0; attempt < 24; attempt++) {
      zone = pickZombieZone();
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * zone.r;
      x = zone.cx + Math.cos(ang) * dist;
      z = zone.cz + Math.sin(ang) * dist;
      if (!_isInS01SafeZone(x, z)) break;
    }
    if (!prefabId && zp?.pickZombiePrefabForZone) {
      prefabId = zp.pickZombiePrefabForZone(zone.name);
    }
  }
  if (!prefabId) prefabId = zp ? zp.pickZombiePrefab() : 'zombie_walker';
  if (zp?.buildZombieEntity) {
    const entity = zp.buildZombieEntity(prefabId, { x, z }, id);
    if (prefabId === 'zombie_walker' && _sectorBoundsMod?.getSectorAt?.(x, z)?.id === 's01_start_forest') {
      entity.health = Math.round(entity.health * 0.72);
      entity.maxHealth = entity.health;
      entity.damage = Math.max(4, Math.round(entity.damage * 0.65));
      entity.speed = Math.max(1.2, entity.speed * 0.88);
      entity.detectRange = Math.max(8, entity.detectRange - 2);
    }
    return entity;
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

function _trimZombiePopulation(target) {
  if (zombies.size <= target) return 0;
  const pList = Array.from(players.values());
  const toRemove = pickZombiesToTrim(Array.from(zombies.values()), target, pList, BEACH_SPAWN);
  for (const z of toRemove) {
    if (!zombies.has(z.id)) continue;
    zombies.delete(z.id);
    worldPersist?.scheduleDeleteZombie?.(z.id);
    if (players.size > 0) io.emit('zombie-die', z.id);
  }
  if (toRemove.length) {
    log.info('world', 'zombies trimmed', { removed: toRemove.length, total: zombies.size, target });
  }
  return toRemove.length;
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
  } else {
    _trimZombiePopulation(target);
    if (zombies.size >= target) {
      return { added: 0, total: zombies.size };
    }
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

_getScenarioBeach().catch((err) => log.error('boot', 'scenario beach init failed', { err: err.message }));

async function _reloadDecorPrefabCatalog(extraIds = []) {
  const mod = await import(DECOR_PREFAB_CATALOG_URL);
  const discovered = mod.discoverDecorPrefabIds(CLIENT_PUBLIC_JS);
  const ids = [...new Set([...discovered, ...extraIds, ...decorPrefabs])].sort();
  decorPrefabs.splice(0, decorPrefabs.length, ...ids);
  decorPrefabCatalogCache = mod.buildDecorPrefabCatalog(ids, clientDecorPrefabMeta);
  return { ids, catalog: decorPrefabCatalogCache };
}

function _initRcon() {
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
    ensureBeachPalms,
    ensureBeachSigns,
    ensureS01World,
    wipePlayerWorld,
    isDecorImmutable: _isDecorImmutable,
    ensureCampRocks,
    ensureWorldRocks,
    itemTypes: ALL_ITEMS,
    addStackToInv: _addStackToInv,
    cloneInv: _cloneInv,
    handlePlayerDeath: _handlePlayerDeath,
    resetPlayerScenario: async (target, sock) => {
      const sc = await _getScenarioBeach();
      sc.resetScenario(target, sock);
    },
    emitSurvivalUpdate: (target) => {
      const sock = io.sockets.sockets.get(target.socketId);
      if (sock) _emitSurvivalUpdate(sock, target);
    },
    qaChecklist,
    log,
  });
}

_reloadDecorPrefabCatalog()
  .then(({ ids }) => {
    _initRcon();
    log.info('boot', 'decor prefab catalog', { count: ids.length, source: 'client-js-discovery' });
  })
  .catch((err) => {
    log.error('boot', 'decor prefab catalog load failed — RCON prefabs vides', { err: err.message });
    _initRcon();
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
}, 5_000);

setInterval(() => {
  try {
    worldPersist?.scheduleWorldState?.({ worldTime: _worldTime });
  } catch (err) {
    log.error('world', 'world time persist failed', { err: err.message });
  }
}, 5000);

// Zombie AI — 100ms tick (DT plafonné si event loop en retard — serveur autoritaire)
let _lastZombieWallMs = Date.now();
setInterval(() => {
  const _tickStart = log.isDebug() ? Date.now() : 0;
  const nowMs = Date.now();
  const wallDt = Math.min(0.25, Math.max(0.05, (nowMs - _lastZombieWallMs) / 1000));
  _lastZombieWallMs = nowMs;
  const DT = wallDt;
  if (serverFlags.autoDay) {
    _worldTime = (_worldTime + DT / _DAY_DURATION) % 1;
  }

  if (players.size === 0) return;
  const pList = Array.from(players.values());
  if (_playerSpatialGrid) {
    const gridItems = new Array(pList.length);
    for (let i = 0; i < pList.length; i++) {
      const pl = pList[i];
      gridItems[i] = { data: pl, x: pl.x, z: pl.z };
    }
    _playerSpatialGrid.rebuild(gridItems);
  }

  const allZ = Array.from(zombies.values());
  if (!serverFlags.zombieAI) {
    _rebuildZombieSpatialGrid(allZ);
    _broadcastZombieTick(allZ, _worldTime);
    return;
  }

  zombies.forEach((z) => {
    if (z.frozen) {
      z.meleeReach = false;
      return;
    }
    let nearestDist = Infinity;
    let nearestP = null;
    // Cibles = joueurs connectés uniquement (pas les corps endormis / déco).
    if (z.tutorial && z.ownerPlayerId != null && scenarioBeach) {
      const near = scenarioBeach.getNearestForTutorial(z, pList);
      nearestP = near.nearestP;
      nearestDist = near.nearestDist;
      if (scenarioBeach.shouldSkipZombieAi(z, pList)) return;
    } else if (_playerSpatialGrid) {
      const candidates = _playerSpatialGrid.query(z.x, z.z, PLAYER_SPATIAL_QUERY_R);
      for (let ci = 0; ci < candidates.length; ci++) {
        const pl = candidates[ci];
        const d = Math.hypot(pl.x - z.x, pl.z - z.z);
        if (d < nearestDist) { nearestDist = d; nearestP = pl; }
      }
    } else {
      for (const pl of pList) {
        const d = Math.hypot(pl.x - z.x, pl.z - z.z);
        if (d < nearestDist) { nearestDist = d; nearestP = pl; }
      }
    }

    const detectRange = z.detectRange || DETECT_RANGE;
    const losRange = detectRange * 1.25;
    const hasLOS = nearestP && nearestDist < losRange
      ? _zombieHasLineOfSight(z.x, z.z, nearestP.x, nearestP.z)
      : false;
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
      const hitLOS = hitDist < detectRange * 1.5 ? hasLOS : false;
      z.meleeReach = hitDist < ZOMBIE_ATTACK_RANGE + 0.15 && hitLOS;
      if (hitDist < ZOMBIE_ATTACK_RANGE && hitLOS
          && !nearestP.invincible && nearestP.posSynced && z.attackTimer <= 0) {
        z.attackTimer = zCd;
        nearestP.health = Math.max(0, nearestP.health - zDmg);
        if (!nearestP.survival) nearestP.survival = { ...DEFAULT_SURVIVAL };
        const zSv = nearestP.survival;
        const biteFx = _survivalMod
          ? _survivalMod.applyZombieMeleeSurvival(zSv, zDmg)
          : { bit: false, infected: false };
        nearestP.dirty = true;
        const hitSock = io.sockets.sockets.get(nearestP.socketId);
        if (hitSock) {
          hitSock.emit('take-damage', {
            dmg: zDmg,
            health: nearestP.health,
            bite: biteFx.bit,
            infected: biteFx.infected,
          });
          _emitSurvivalUpdate(hitSock, nearestP);
        }
        if (nearestP.health <= 0) _handlePlayerDeath(nearestP);
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

  _rebuildZombieSpatialGrid(allZ);
  _broadcastZombieTick(allZ, _worldTime);
  if (_tickStart) log.tickSummary(zombies, players, Date.now() - _tickStart);
}, 100);

// Maintient la population autour de la cible (trim si excès RCON/persist, top-up si kills)
setInterval(() => {
  if (!serverFlags.zombieSpawn) return;
  if (zombies.size > ZOMBIE_COUNT) {
    _trimZombiePopulation(ZOMBIE_COUNT);
    return;
  }
  if (zombies.size < ZOMBIE_COUNT) {
    ensureZombiePopulation().catch((err) => log.error('ensureZombiePopulation periodic failed', err));
  }
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

// Survie authoritaire (tick 1 s) — connectés : faim/soif + dégâts ; endormis : faim/soif seulement
const _lastSleeperSave = new Map();
setInterval(async () => {
  const itemFx = await itemEffectsModPromise;
  const getMaxHp = (inv) => itemFx.getMaxHealthFromInv(inv, _normalizeInv);
  const now = Date.now();
  players.forEach((p) => {
    const sock = io.sockets.sockets.get(p.socketId);
    if (!sock || p.health <= 0 || p._deathHandled) return;
    const { dmg, died } = tickPlayerSurvival(p, 1, getMaxHp);
    if (died) _handlePlayerDeath(p);
    else if (dmg > 0) p.dirty = true;
    _emitSurvivalUpdate(sock, p);
  });
  sleepingPlayers.forEach((sleep) => {
    if (!sleep || sleep.dead || (sleep.health ?? 100) <= 0) return;
    tickSleeperSurvival(sleep, 1);
    sleep.lastSurvivalTickAt = now;
    const key = sleep.playerId;
    const last = _lastSleeperSave.get(key) || 0;
    if (now - last >= 5000) {
      _saveSleepingToDb(sleep).catch(() => {});
      _lastSleeperSave.set(key, now);
    }
  });
}, 1000);

// File craft authoritaire (tick 100 ms)
setInterval(() => {
  craftQueueMod.tickCraftQueues(players, 0.1, _craftOps);
  players.forEach((p) => {
    if (!p._craftPendingComplete) return;
    const sock = io.sockets.sockets.get(p.socketId);
    const pending = p._craftPendingComplete;
    p._craftPendingComplete = null;
    p.dirty = true;
    if (sock) {
      _emitInvAuth(sock, p);
      sock.emit('craft-complete', pending.job);
      sock.emit('craft-queue-state', craftQueueMod.getCraftQueueState(p));
    }
  });
}, 100);

// ── Socket.io ────────────────────────────────────────────────────────────────

/** use-item + debug-inv-snapshot enregistrés dès la connexion (avant game-init long côté client). */
function _registerInvConsumeHandlers(socket, getPlayer) {
  socket.on('use-item', async (d, cb) => {
    const trace = typeof d?.trace === 'string' ? d.trace.slice(0, 48) : null;
    const reply = (payload) => {
      const out = {
        ...payload,
        serverBuild: INV_DEBUG_SERVER_BUILD,
        ...(trace ? { trace } : {}),
      };
      if (typeof cb === 'function') cb(out);
    };
    try {
      const pl = getPlayer();
      if (!pl) {
        reply({ ok: false, err: 'no_player' });
        return;
      }
      const zone = d?.zone === 'bag' || d?.zone === 'hotbar' ? d.zone : null;
      const idx = Number(d?.index);
      const typeHint = typeof d?.type === 'string' ? d.type.slice(0, 80) : null;
      const before = _invDebugSnapshot(pl.inv, _normalizeInv);
      _logInvDebug(log, 'use-item-req', {
        trace,
        user: pl.username,
        socketId: socket.id,
        build: INV_DEBUG_SERVER_BUILD,
        zone,
        idx,
        typeHint,
        before,
      });
      if (!typeHint) {
        _logInvDebug(log, 'use-item-reject', { trace, user: pl.username, err: 'no_type', req: d });
        reply({ ok: false, err: 'no_type', debug: { before, build: INV_DEBUG_SERVER_BUILD } });
        return;
      }
      _ensureSlotGrid(pl.inv);
      let resolved = _findStackByType(pl.inv, typeHint);
      let rationAdded = false;
      if (!resolved?.stack?.type) {
        rationAdded = ensureStarterRations(pl);
        if (rationAdded) pl.dirty = true;
        _ensureSlotGrid(pl.inv);
        resolved = _findStackByType(pl.inv, typeHint)
          || _resolveUseItemStack(pl.inv, zone, idx, typeHint);
      }
      if (!resolved?.stack?.type) {
        const after = _invDebugSnapshot(pl.inv, _normalizeInv);
        _logInvDebug(log, 'use-item-empty', {
          trace,
          user: pl.username,
          rationAdded,
          build: INV_DEBUG_SERVER_BUILD,
          before,
          after,
        });
        reply({
          ok: false,
          err: 'empty',
          inventory: _cloneInv(pl.inv),
          debug: { before, after, build: INV_DEBUG_SERVER_BUILD },
        });
        return;
      }
      const { zone: useZone, idx: useIdx, stack } = resolved;
      const itemFx = await itemEffectsModPromise;
      const eff = itemFx.getItemEffect(stack.type);
      if (!eff) {
        _logInvDebug(log, 'use-item-reject', {
          trace,
          user: pl.username,
          err: 'not_consumable',
          resolved: { zone: useZone, idx: useIdx, type: stack.type },
        });
        reply({ ok: false, err: 'not_consumable', debug: { before, resolved: stack.type } });
        return;
      }
      const svBefore = { ...(pl.survival || {}) };
      itemFx.applyItemUse(stack.type, pl, _normalizeInv);
      _removeFromSlot(pl.inv, useZone, useIdx, 1);
      pl.dirty = true;
      pl._svBroadcastSnap = null;
      _emitInvAuth(socket, pl);
      _emitSurvivalUpdate(socket, pl);
      const after = _invDebugSnapshot(pl.inv, _normalizeInv);
      _logInvDebug(log, 'use-item-ok', {
        trace,
        user: pl.username,
        used: { zone: useZone, idx: useIdx, type: stack.type },
        survivalBefore: svBefore,
        survivalAfter: pl.survival,
        before,
        after,
      });
      reply({
        ok: true,
        inventory: _cloneInv(pl.inv),
        survival: { ...(pl.survival || {}) },
        health: Math.max(0, Math.floor(pl.health ?? 100)),
        debug: { before, after, used: { zone: useZone, idx: useIdx, type: stack.type }, build: INV_DEBUG_SERVER_BUILD },
      });
    } catch (err) {
      const pl = getPlayer();
      _logInvDebug(log, 'use-item-error', { trace, user: pl?.username, err: err?.message });
      log.warn('inventory', 'use-item failed', { err: err?.message, player: pl?.username, trace });
      reply({ ok: false, err: 'server_error', trace });
    }
  });

  socket.on('debug-inv-snapshot', (d, cb) => {
    const trace = typeof d?.trace === 'string' ? d.trace.slice(0, 48) : null;
    const pl = getPlayer();
    if (!pl) {
      if (typeof cb === 'function') {
        cb({ ok: false, err: 'no_player', trace, serverBuild: INV_DEBUG_SERVER_BUILD });
      }
      return;
    }
    _ensureSlotGrid(pl.inv);
    const snap = _invDebugSnapshot(pl.inv, _normalizeInv);
    _logInvDebug(log, 'debug-inv-snapshot', { trace, user: pl.username, snap, build: INV_DEBUG_SERVER_BUILD });
    if (typeof cb === 'function') {
      cb({
        ok: true,
        trace,
        username: pl.username,
        serverBuild: INV_DEBUG_SERVER_BUILD,
        snap,
        inventory: _cloneInv(pl.inv),
        survival: { ...(pl.survival || {}) },
      });
    }
  });
}

io.use((socket, next) => {
  try {
    socket.user = jwt.verify(socket.handshake.auth.token, JWT_SECRET);
    if (isDevServer() && !_canAccessDevServer(socket.user.username)) {
      return next(new Error('Serveur dev réservé aux administrateurs'));
    }
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

  const priorSleep = _getSleepingPlayer(userId);
  const killedWhileOffline = !!(priorSleep && (priorSleep.dead || priorSleep.health <= 0));
  const wokeFromSleep = !!priorSleep && !killedWhileOffline;
  if (priorSleep && !killedWhileOffline) {
    catchUpSleeperSurvival(priorSleep);
  }
  if (priorSleep) {
    if (killedWhileOffline) _spawnDeathBagFromSleeper(priorSleep);
    sleepingPlayers.delete(_sleeperKey(userId));
    worldPersist?.scheduleDeleteSleeper?.(_sleeperKey(userId));
    if (killedWhileOffline) {
      io.emit('sleeper-removed', { playerId: _normPlayerId(userId) });
    } else {
      io.emit('player-wake', { playerId: _sleeperKey(userId) });
    }
  }

  const restore = killedWhileOffline ? null : (liveSession || priorSleep || null);
  const hasLiveRestore = !!restore;
  const connectHealth = resolveConnectHealthFlags({
    killedWhileOffline,
    hasLiveRestore,
    savedHealth: saved?.health,
  });
  const forceBeachRespawn = connectHealth.forceBeachRespawn;
  const dbId = saved?.id != null ? _normPlayerId(saved.id) : userId;
  // Réveil depuis le corps endormi : inventaire du sleeper (post-fouille), pas la DB players.
  const wakeInv = wokeFromSleep ? _cloneInv(priorSleep.inv) : null;
  const respawnKit = forceBeachRespawn ? JSON.parse(JSON.stringify(STARTING_ITEMS)) : null;
  const freshBeachSpawn = (!restore && !forceBeachRespawn
    && (saved?.pos_x == null || saved?.pos_y == null || saved?.pos_z == null))
    ? _randomBeachSpawn() : null;
  const beachRespawnSpawn = forceBeachRespawn ? _randomBeachSpawn() : null;
  const p = {
    socketId: socket.id,
    id: dbId,
    username: socket.user.username,
    x: beachRespawnSpawn?.x ?? (restore?.x ?? ((saved && saved.pos_x != null) ? saved.pos_x : (freshBeachSpawn?.x ?? BEACH_SPAWN.x))),
    y: beachRespawnSpawn?.y ?? (restore?.y ?? ((saved && saved.pos_y != null) ? saved.pos_y : (freshBeachSpawn?.y ?? BEACH_SPAWN.y))),
    z: beachRespawnSpawn?.z ?? (restore?.z ?? ((saved && saved.pos_z != null) ? saved.pos_z : (freshBeachSpawn?.z ?? BEACH_SPAWN.z))),
    rotY: beachRespawnSpawn?.rotY ?? (restore?.rotY ?? ((saved && saved.rot_y != null) ? saved.rot_y : (freshBeachSpawn?.rotY ?? BEACH_SPAWN.rotY))),
    health: connectHealthValue({ forceBeachRespawn, restore, saved, wokeFromSleep }),
    kills:  restore?.kills ?? saved?.kills ?? 0,
    inv: respawnKit ?? wakeInv ?? (restore ? _cloneInv(restore.inv) : _save),
    survival: forceBeachRespawn ? { ...DEFAULT_SURVIVAL } : (restore ? { ...(restore.survival || DEFAULT_SURVIVAL) } : _survival),
    equipped: forceBeachRespawn ? null : (restore?.equipped ?? null),
    dirty: true,
    invincible: true,
    posSynced: forceBeachRespawn,
    connectedAt: Date.now(),
    anchorX: 0,
    anchorY: 0,
    anchorZ: 0,
    _killedWhileOffline: killedWhileOffline,
    _respawnReason: connectHealth.respawnReason,
  };
  p.anchorX = p.x;
  p.anchorY = p.y;
  p.anchorZ = p.z;
  _initLifeStats(p, forceBeachRespawn ? null : restore);
  if (forceBeachRespawn) _resetLifeStats(p);
  if (restore?._deathHandled && p.health <= 0) {
    p._deathHandled = true;
    p._deathInv = restore._deathInv ? _cloneInv(restore._deathInv) : undefined;
    p._deathPos = restore._deathPos ? { ...restore._deathPos } : undefined;
    p._deathEquipped = restore._deathEquipped ?? null;
  }
  const scenMod = await _getScenarioBeach();
  scenMod.initPlayerScenario(p, _save);
  scenMod.ensureTutorialZombie(p, socket);
  const _invBeforeMigrate = _invDebugSnapshot(p.inv, _normalizeInv);
  _ensureSlotGrid(p.inv);
  const _invAfterMigrate = _invDebugSnapshot(p.inv, _normalizeInv);
  if (JSON.stringify(_invBeforeMigrate.food) !== JSON.stringify(_invAfterMigrate.food)
    || _invBeforeMigrate.hotbar.some((s, i) => s.type !== _invAfterMigrate.hotbar[i]?.type)) {
    p.dirty = true;
    _logInvDebug(log, 'connect-inv-migrate', {
      user: p.username,
      before: _invBeforeMigrate,
      after: _invAfterMigrate,
    });
  }
  if (!scenMod.isAct1Done(p.inv.scenario)) {
    p.invincible = scenMod.isInvincibleDuringIntro(p.inv.scenario);
  } else {
    setTimeout(() => { if (players.has(socket.id)) p.invincible = false; }, 5000);
  }
  // Pas de kit de départ si réveil après déco/fouille — inventaire vide = légitime.
  if (!wokeFromSleep && !forceBeachRespawn) {
    const rockCh = ensureStarterRock(p);
    const torchCh = ensureStarterTorch(p);
    const rationCh = ensureStarterRations(p);
    if (rockCh || torchCh || rationCh) p.dirty = true;
    _logInvDebug(log, 'connect-starters', {
      user: p.username,
      rock: rockCh,
      torch: torchCh,
      rations: rationCh,
      snap: _invDebugSnapshot(p.inv, _normalizeInv),
    });
  } else {
    _logInvDebug(log, 'connect-skip-starters', {
      user: p.username,
      wokeFromSleep,
      killedWhileOffline,
      forceBeachRespawn,
      respawnReason: connectHealth.respawnReason,
      snap: _invDebugSnapshot(p.inv, _normalizeInv),
    });
  }
  if (forceBeachRespawn) {
    const keepScenario = p.inv?.scenario || _save?.scenario;
    if (keepScenario) p.inv.scenario = keepScenario;
  }
  const _keepScen = p.inv?.scenario;
  p.inv = _cloneInv(p.inv);
  if (_keepScen) p.inv.scenario = _keepScen;
  players.set(socket.id, p);
  _registerInvConsumeHandlers(socket, () => players.get(socket.id));
  _persistPlayer(p);
  log.info('socket', 'connect', {
    username: p.username,
    online: players.size,
    spawn: { x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1) },
    health: p.health,
    kills: p.kills,
    respawnReason: connectHealth.respawnReason,
    deathHandled: !!p._deathHandled,
  });

  const _initPayload = _gameInitPayload(socket, p, scenMod, wokeFromSleep);
  _logInvDebug(log, 'game-init-send', {
    user: p.username,
    wokeFromSleep,
    snap: _invDebugSnapshot(p.inv, _normalizeInv),
  });
  socket.emit('game-init', _initPayload);
  if (shouldEmitDeathOnConnect(p)) {
    socket.emit('player-death', {
      id: socket.id,
      playerId: _normPlayerId(p.id),
      username: p.username,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      equipped: p._deathEquipped ?? null,
      kills: p.kills,
      recap: _lifeRecap(p),
    });
  }
  _emitInvAuth(socket, p);
  socket.emit('craft-queue-state', craftQueueMod.getCraftQueueState(p));
  socket.broadcast.emit('player-join', { id: socket.id, username: p.username, x: p.x, y: p.y, z: p.z, rotY: p.rotY, equipped: p.equipped });
  _emitPlayersOnline();
  _getGroupsManager().then((gm) => {
    gm.onConnect(p);
    gm.onRosterChange();
  }).catch(() => {});

  // Le premier client transmet la géométrie de collision (murs, arbres, etc.).
  let _lastDecorColliderCount = 0;
  socket.on('world-colliders', (cols) => {
    if (!Array.isArray(cols)) return;
    const terrain = cols.filter((c) => c && c.minY === undefined && !c.decorId);
    if (worldColliders.length === 0 && terrain.length) {
      worldColliders = terrain;
      log.info('world', 'colliders loaded', { terrain: terrain.length, from: p.username });
      worldPersist?.scheduleWorldState?.({ worldColliders });
    }
  });

  socket.on('decor-prefab-registry', (payload) => {
    if (!payload || !Array.isArray(payload.ids)) return;
    if (payload.meta && typeof payload.meta === 'object') {
      for (const [id, meta] of Object.entries(payload.meta)) {
        if (!meta || typeof meta !== 'object') continue;
        clientDecorPrefabMeta[id] = { ...clientDecorPrefabMeta[id], ...meta };
      }
    }
    _reloadDecorPrefabCatalog(payload.ids)
      .then(({ ids }) => {
        log.info('world', 'decor prefab registry', { count: ids.length, from: p.username });
      })
      .catch((err) => log.error('world', 'decor prefab registry failed', { err: err.message }));
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
    if (p._deathHandled) return;
    if (!d || !Number.isFinite(d.x) || !Number.isFinite(d.z)) return;
    const now = Date.now();
    const dt = Math.max(0.05, (now - (p.lastMoveAt || now)) / 1000);
    const maxDelta = 11 * dt * 1.5;
    const respawnGrace = p._respawnGraceUntil && now < p._respawnGraceUntil;
    const tpGrace = p._tpGraceUntil && now < p._tpGraceUntil;
    if (!respawnGrace && !tpGrace && p.lastMoveAt && Number.isFinite(p.lastX) && Number.isFinite(p.lastZ)) {
      const dist = Math.hypot(d.x - p.lastX, d.z - p.lastZ);
      if (dist > maxDelta) {
        socket.emit('move-correction', { x: p.x, y: p.y, z: p.z, rotY: p.rotY });
        return;
      }
    }
    let x = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, d.x));
    let z = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, d.z));
    if (_sectorBoundsMod?.clampToSector01) {
      const c = _sectorBoundsMod.clampToSector01(x, z);
      x = c.x;
      z = c.z;
    }
    const y = Number.isFinite(d.y) ? Math.max(-20, Math.min(100, d.y)) : p.y;
    const rotY = Number.isFinite(d.rotY) ? d.rotY : p.rotY;
    p.lastMoveAt = now;
    p.lastX = x;
    p.lastZ = z;
    p.x = x; p.y = y; p.z = z; p.rotY = rotY; p.dirty = true;
    p.posSynced = true;
    const movePkt = { id: socket.id, x, y, z, rotY };
    const moveR2 = 150 * 150;
    for (const [sid, other] of players) {
      if (sid === socket.id) continue;
      const dx = x - other.x;
      const dz = z - other.z;
      if (dx * dx + dz * dz > moveR2) continue;
      const os = io.sockets.sockets.get(other.socketId);
      if (os) os.emit('player-move', movePkt);
    }
    _getScenarioBeach().then((sc) => sc.onMove(p, socket, d.rotY)).catch(() => {});
    if (log.isTrace()) {
      log.throttled(`move:${p.username}`, 1000, () => {
        log.trace('move', p.username, { x: +d.x.toFixed(1), y: +d.y.toFixed(1), z: +d.z.toFixed(1) });
      });
    }
  });

  // Item tenu en main → visible des autres joueurs (arme, torche, outil…).
  socket.on('equip', (d) => {
    const type = (d && typeof d.type === 'string' && d.type.length <= 60) ? d.type : null;
    if (type && !_playerOwnsItemType(p.inv, type) && type !== p.equipped) return;
    if (type === p.equipped) return;
    p.equipped = type;
    socket.broadcast.emit('player-equip', { id: socket.id, type });
  });

  // Geste d'attaque (tir / mêlée) → animation + SFX chez les autres joueurs.
  socket.on('attack', (d) => {
    const kind = (d && d.kind === 'recoil') ? 'recoil' : 'melee';
    const weapon = (d && typeof d.weapon === 'string' && d.weapon.length <= 60) ? d.weapon : p.equipped;
    socket.broadcast.emit('player-attack', {
      id: socket.id,
      kind,
      weapon: weapon || null,
      x: p.x,
      z: p.z,
      t: Date.now(),
    });
  });

  const FOOTSTEP_SURFACES = new Set([
    'sand', 'grass', 'forest', 'dirt', 'water', 'wood', 'trail', 'asphalt',
  ]);
  socket.on('footstep', (d) => {
    const surface = (d && typeof d.surface === 'string') ? d.surface.slice(0, 16) : 'dirt';
    if (!FOOTSTEP_SURFACES.has(surface)) return;
    const now = Date.now();
    if (p._lastFootstepAt && now - p._lastFootstepAt < 200) return;
    p._lastFootstepAt = now;
    socket.broadcast.emit('player-footstep', {
      id: socket.id,
      surface,
      sprint: !!(d && d.sprint),
      x: p.x,
      z: p.z,
      t: now,
    });
  });

  socket.on('request-zombie-sync', () => {
    _getScenarioBeach().then((sc) => {
      const list = sc.filterZombiesForPlayer(p, Array.from(zombies.values()));
      socket.emit('zombies-snapshot', _compactZombiesForSync(list));
    }).catch(() => {
      socket.emit('zombies-snapshot', _compactZombiesForSync(Array.from(zombies.values())));
    });
  });

  socket.on('request-game-init', () => {
    const cur = players.get(socket.id);
    if (!cur) return;
    _ensureSlotGrid(cur.inv);
    if (ensureStarterRations(cur)) cur.dirty = true;
    _getScenarioBeach().then((sc) => {
      socket.emit('game-init', _gameInitPayload(socket, cur, sc, false));
    }).catch((e) => {
      log.warn?.('socket', 'request-game-init', e);
    });
  });

  socket.on('scenario-advance', (d) => {
    const step = (d && typeof d.step === 'string') ? d.step.slice(0, 32) : null;
    if (!step) return;
    _getScenarioBeach().then((sc) => sc.handleClientAdvance(p, socket, step)).catch(() => {});
  });

  socket.on('shoot', async (d) => {
    if (p._deathHandled) return;
    const combatMod = _combatMod || await combatModPromise;
    const wmod = _weaponStatsMod || await weaponStatsModPromise;
    const len = Math.hypot(d.dx, d.dz);
    if (len < 0.001) return;
    const nx = d.dx / len, nz = d.dz / len;
    const weaponType = String(d.weaponType || p.equipped || '__fist__').slice(0, 60);
    const stats = wmod.getWeaponStats(weaponType);
    if (!wmod.playerHasWeapon(p.inv, weaponType, _iterInvStacks)) return;
    const now = Date.now();
    const minInterval = (stats.fireRate || 0.5) * 1000;
    if (p.lastShotAt && now - p.lastShotAt < minInterval * 0.85) return;
    p.lastShotAt = now;

    const dmg = stats.dmg;
    const range = stats.range;
    const radius = stats.radius;

    let ox = Number(d.ox);
    let oz = Number(d.oz);
    if (!Number.isFinite(ox)) ox = p.x;
    if (!Number.isFinite(oz)) oz = p.z;
    const aimDrift = Math.hypot(ox - p.x, oz - p.z);
    if (range <= 3.5) {
      // Mêlée : garder la visée client (caméra) si proche de la position serveur.
      if (aimDrift > 3) { ox = p.x; oz = p.z; }
    } else if (aimDrift > 8) {
      ox = p.x;
      oz = p.z;
    }

    let invDirty = false;
    if (stats.ammoType) {
      const n = _normalizeInv(p.inv);
      let fired = false;
      for (const arr of [n.hotbar, n.bag]) {
        for (let i = 0; i < arr.length; i++) {
          const s = arr[i];
          if (!s || s.type !== weaponType) continue;
          if ((s.ammo ?? 0) <= 0) return;
          s.ammo = (s.ammo ?? 0) - 1;
          fired = true;
          break;
        }
        if (fired) break;
      }
      if (!fired) return;
      Object.assign(p.inv, n);
      invDirty = true;
    }

    const pellets = stats.pellets || 1;
    const groupsMod = await _getGroupsManager();
    const pvpTargets = serverFlags.pvp !== false
      ? [...players.entries()].map(([sid, tp]) => ({
        socketId: sid,
        x: tp.x,
        z: tp.z,
        health: tp.health,
        invincible: !!tp.invincible,
        skip: sid === socket.id || !!tp._deathHandled
          || groupsMod.areSameGroup(p.id, tp.id),
      }))
      : [];

    const spread = stats.dispersion || 0;
    for (let pellet = 0; pellet < pellets; pellet++) {
      let pnx = nx;
      let pnz = nz;
      if (pellets > 1 && spread > 0) {
        pnx += (Math.random() - 0.5) * spread;
        pnz += (Math.random() - 0.5) * spread;
        const plen = Math.hypot(pnx, pnz) || 1;
        pnx /= plen;
        pnz /= plen;
      } else if (spread > 0 && pellet > 0) {
        pnx += (Math.random() - 0.5) * spread * 0.35;
        pnz += (Math.random() - 0.5) * spread * 0.35;
        const plen = Math.hypot(pnx, pnz) || 1;
        pnx /= plen;
        pnz /= plen;
      }
      const ray = { ox, oz, nx: pnx, nz: pnz, range, radius };
      const best = _pickShootTarget(
        ray,
        combatMod,
        pvpTargets,
        [...zombies.values()],
        [...sleepingPlayers.values()],
      );
      if (!best) continue;

      if (best.kind === 'player') {
        const victim = players.get(best.id);
        if (victim) {
          log.debug('combat', 'pvp hit', {
            attacker: p.username,
            victim: victim.username,
            dmg,
            weaponType,
            healthLeft: Math.max(0, victim.health - dmg),
          });
          _applyPlayerCombatDamage(p, victim, dmg);
        }
        continue;
      }

      if (best.kind === 'sleeper') {
        log.debug('combat', 'sleeper hit', {
          attacker: p.username,
          victim: best.entity.username,
          dmg,
          weaponType,
          healthLeft: Math.max(0, best.entity.health - dmg),
        });
        _applySleeperCombatDamage(p, best.entity, dmg);
        continue;
      }

      const hit = best.entity;
      if (hit) {
        hit.health -= dmg;
        log.debug('combat', 'shoot hit', {
          player: p.username,
          zombieId: hit.id,
          dmg,
          weaponType,
          healthLeft: hit.health,
        });
        if (hit.health <= 0) {
          log.info('combat', 'zombie kill', { player: p.username, zombieId: hit.id, kills: p.kills + 1 });
          io.emit('zombie-die', hit.id);
          worldPersist?.scheduleDeleteZombie?.(hit.id);
          zombies.delete(hit.id);
          p.kills++;
          p.lifeZombieKills = (p.lifeZombieKills ?? 0) + 1;
          io.to(socket.id).emit('score-update', {
            kills: p.kills,
            playerKills: p.lifePlayerKills ?? 0,
          });
          let tutorialHandled = false;
          if (scenarioBeach) {
            tutorialHandled = scenarioBeach.handleTutorialKill(p, socket, hit);
          }
          if (!tutorialHandled) {
            _dropZombieKillLoot(hit);
            if (serverFlags.zombieSpawn) {
              setTimeout(() => {
                const nz = makeZombie();
                zombies.set(nz.id, nz);
                worldPersist?.scheduleUpsertZombie?.(nz);
                io.emit('zombie-spawn', nz);
              }, 4000);
            }
          }
        } else {
          if (scenarioBeach) scenarioBeach.onTutorialZombieHit(hit);
          const kb = stats.kb || 0;
          if (kb > 0) {
            const zR = hit.collideRadius || ZOMBIE_R;
            const pushed = resolveZombieCollision(hit.x + nx * kb, hit.z + nz * kb, zR);
            hit.x = pushed[0];
            hit.z = pushed[1];
          }
          io.emit('zombie-hit', {
            id: hit.id,
            health: hit.health,
            maxHealth: hit.maxHealth || hit.health,
            x: hit.x,
            z: hit.z,
            angle: hit.angle,
          });
        }
      }
    }
    const wearRes = _wearPlayerToolInv(p, weaponType, wmod);
    if (invDirty || wearRes.worn) _scheduleInvAuth(socket, p);
  });

  socket.on('item-pickup', (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const item = items.get(d?.id);
    if (!item) {
      reply({ ok: false, err: 'gone' });
      return;
    }
    if (Math.hypot(item.x - p.x, item.z - p.z) > 3.0) {
      reply({ ok: false, err: 'too_far' });
      return;
    }
    _removeGroundItem(d.id);
    if (item.bag) {
      for (const it of (item.items || [])) {
        if (!it?.type) continue;
        const res = _addStackToInv(p.inv, it);
        if (res.leftover > 0) {
          _dropWorldItem(it.type, res.leftover, item.x, item.z, {
            ...(it.lockId ? { lockId: it.lockId } : {}),
          });
        }
      }
    } else {
      const stack = {
        type: item.type,
        qty: item.qty || 1,
        ...(item.lockId ? { lockId: item.lockId } : {}),
        ...(item.durability != null ? { durability: item.durability } : {}),
        ...(item.ammo != null ? { ammo: item.ammo } : {}),
      };
      const res = _addStackToInv(p.inv, stack);
      if (res.leftover > 0) {
        _dropWorldItem(item.type, res.leftover, item.x, item.z, {
          ...(item.lockId ? { lockId: item.lockId } : {}),
        });
      }
    }
    p.dirty = true;
    _emitInvAuth(socket, p);
    if (scenarioBeach) scenarioBeach.onPickup(p, socket, item.bag ? null : item.type);
    log.debug('items', 'pickup', { player: p.username, type: item.type, bag: !!item.bag });
    reply({ ok: true });
  });

  socket.on('item-drop', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    if (!d || typeof d.type !== 'string' || d.type.length > 60) {
      reply({ ok: false, err: 'invalid' });
      return;
    }
    const qty = Math.max(1, Math.min(999, Number(d.qty) || 1));
    const zone = ['hotbar', 'bag', 'equip'].includes(d.zone) ? d.zone : null;
    const idx = zone === 'equip' ? d.index : Number(d.index);
    const itemFx = await _getItemFx();
    const prevArmor = zone === 'equip' ? itemFx.getArmorFromInv(p.inv, _normalizeInv) : 0;
    let removed = false;
    if (zone != null && (zone === 'equip' ? idx != null : Number.isFinite(idx))) {
      const slot = _removeFromSlot(p.inv, zone, idx, qty);
      removed = !!slot && slot.type === d.type;
    } else {
      removed = _removeStackFromInv(p.inv, d.type, qty, {
        lockId: d.type === 'struct_cle' ? d.lockId : undefined,
      });
    }
    if (!removed) {
      reply({ ok: false, err: 'no_item' });
      return;
    }
    const ang = Math.random() * Math.PI * 2;
    const extra = {};
    if (d.type === 'struct_cle') {
      const lockId = typeof d.lockId === 'string' ? d.lockId.trim() : '';
      if (!lockId || lockId.length > 80) {
        reply({ ok: false, err: 'invalid_key' });
        return;
      }
      extra.lockId = lockId;
    }
    _dropWorldItem(d.type, qty, p.x + Math.cos(ang) * 1.0, p.z + Math.sin(ang) * 1.0, extra);
    p.dirty = true;
    _emitInvAuth(socket, p);
    if (zone === 'equip' && _maybeSyncEquipArmor(p, prevArmor, itemFx)) {
      _emitSurvivalUpdate(socket, p);
    }
    reply({ ok: true });
  });

  // Récolte bois sur arbre prefab — sync multijoueur
  socket.on('decor-chop', (d) => {
    const id = d?.id;
    if (!id || typeof id !== 'string') return;
    const item = decorItems.get(id);
    if (!item?.prefabId?.startsWith('tree_')) return;
    if (item.falling) return;
    if (Math.hypot(item.x - p.x, item.z - p.z) > 6) return;

    import(TREE_WOOD_URL).then(async ({ TREE_FALL_LINGER_MS, getChopWoodYield }) => {
      const woodMax = item.woodMax ?? _treeWoodForPhase(item.prefabId, item.growthPhase ?? 4);
      item.woodMax = woodMax;
      if (item.woodRemaining == null) item.woodRemaining = woodMax;

      const toolType = String(d.toolType || p.equipped || 'tool_caillou').slice(0, 60);
      const yieldReq = Math.max(1, Math.min(4, getChopWoodYield(toolType) || 1));
      const woodTaken = Math.min(yieldReq, item.woodRemaining);
      item.woodRemaining -= woodTaken;

      let invDirty = false;
      if (woodTaken > 0) {
        const res = _addStackToInv(p.inv, { type: 'res_bois_brut', qty: woodTaken });
        invDirty = true;
        if (res.leftover > 0) {
          _dropWorldItem('res_bois_brut', res.leftover, p.x, p.z);
        }
      }
      const wmod = _weaponStatsMod || await weaponStatsModPromise;
      const wearRes = _wearPlayerToolInv(p, toolType, wmod);
      if (invDirty || wearRes.worn) _scheduleInvAuth(socket, p);

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
        io.emit('decor-tree-fell', {
          ...base,
          fallDirX: Number(d.dirX) || 0,
          fallDirZ: Number(d.dirZ) || 1,
        });
        setTimeout(() => {
          _removeDecorItem(id);
        }, TREE_FALL_LINGER_MS);
      } else {
        _touchDecorItem(item);
        io.emit('decor-tree-chop', base);
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

    import(ROCK_STONE_URL).then(async ({ getRockStoneMax, getMineStoneYield }) => {
      const stoneMax = item.stoneMax ?? getRockStoneMax(item.prefabId);
      item.stoneMax = stoneMax;
      if (item.stoneRemaining == null) item.stoneRemaining = stoneMax;

      const toolType = String(d.toolType || p.equipped || 'tool_caillou').slice(0, 60);
      const yieldReq = Math.max(1, Math.min(6, getMineStoneYield(toolType) || 1));
      const stoneTaken = Math.min(yieldReq, item.stoneRemaining);
      item.stoneRemaining -= stoneTaken;

      let invDirty = false;
      if (stoneTaken > 0) {
        const res = _addStackToInv(p.inv, { type: 'res_pierre', qty: stoneTaken });
        invDirty = true;
        if (res.leftover > 0) {
          _dropWorldItem('res_pierre', res.leftover, p.x, p.z);
        }
      }
      const wmod = _weaponStatsMod || await weaponStatsModPromise;
      const wearRes = _wearPlayerToolInv(p, toolType, wmod);
      if (invDirty || wearRes.worn) _scheduleInvAuth(socket, p);

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
    const vres = _addStackToInv(p.inv, verrou);
    if (vres.leftover > 0) {
      _dropWorldItem('tool_verrou', vres.leftover, p.x + 0.3, p.z);
    }
    _emitInvAuth(socket, p);
    io.emit('door-lock-state', { id: item.id, locked: false, lockId: null, lockOwner: null });
    _touchDecorItem(item);
    log.info('world', 'door unlocked', { player: p.username, decorId: item.id });
    if (typeof cb === 'function') cb({ ok: true, lockId: oldLockId, inventory: _cloneInv(p.inv) });
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

  socket.on('storage-deposit', (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const item = _getNearbyStorage(d?.id);
    const zone = d?.zone === 'bag' || d?.zone === 'hotbar' ? d.zone : null;
    const idx = Number(d?.index);
    const qty = Math.max(1, Math.min(999, Number(d?.qty) || 1));
    if (!item || zone == null || !Number.isFinite(idx)) {
      reply({ ok: false, err: 'invalid' });
      return;
    }
    const stack = _removeFromSlot(p.inv, zone, idx, qty);
    if (!stack?.type) {
      reply({ ok: false, err: 'no_item' });
      return;
    }
    const grid = _ensureChestGrid(item.storage, STORAGE_CHEST_CAPACITY);
    if (_chestFilledCount(grid) >= STORAGE_CHEST_CAPACITY) {
      _addStackToInv(p.inv, stack);
      _emitInvAuth(socket, p);
      socket.emit('storage-error', { message: 'Coffre plein' });
      reply({ ok: false, err: 'full' });
      return;
    }
    const toIdx = Number.isFinite(Number(d?.toIndex))
      ? Number(d.toIndex)
      : grid.findIndex((s) => !s?.type);
    if (toIdx < 0 || toIdx >= STORAGE_CHEST_CAPACITY || grid[toIdx]?.type) {
      _addStackToInv(p.inv, stack);
      _emitInvAuth(socket, p);
      reply({ ok: false, err: 'full' });
      return;
    }
    grid[toIdx] = { type: stack.type, qty: stack.qty || 1 };
    item.storage = grid;
    _emitStorageUpdate(item);
    _touchDecorItem(item);
    p.dirty = true;
    _emitInvAuth(socket, p);
    log.debug('storage', 'deposit', { player: p.username, decorId: item.id, type: stack.type, qty: stack.qty });
    reply({ ok: true });
  });

  socket.on('storage-withdraw', (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const item = _getNearbyStorage(d?.id);
    if (!item) {
      reply({ ok: false, err: 'not_found' });
      return;
    }
    const slot = Math.max(0, Math.floor(Number(d?.slot) || 0));
    const grid = _ensureChestGrid(item.storage, STORAGE_CHEST_CAPACITY);
    const stack = grid[slot];
    if (!stack?.type) {
      reply({ ok: false, err: 'empty' });
      return;
    }
    grid[slot] = null;
    item.storage = grid;
    const res = _addStackToInv(p.inv, { type: stack.type, qty: stack.qty || 1 });
    p.dirty = true;
    _emitInvAuth(socket, p);
    if (res.leftover > 0) {
      const backIdx = grid.findIndex((s) => !s?.type);
      if (backIdx >= 0) grid[backIdx] = { type: stack.type, qty: res.leftover };
      else {
        const fi = grid.findIndex((s) => !s?.type);
        if (fi >= 0) grid[fi] = { type: stack.type, qty: res.leftover };
      }
      item.storage = grid;
    }
    _emitStorageUpdate(item);
    _touchDecorItem(item);
    log.debug('storage', 'withdraw', { player: p.username, decorId: item.id, type: stack.type });
    reply({ ok: true, leftover: res.leftover });
  });

  socket.on('storage-move', (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const item = _getNearbyStorage(d?.id);
    if (!item) {
      reply({ ok: false, err: 'not_found' });
      return;
    }
    const from = d?.from;
    const to = d?.to;
    if (!from?.zone || !to?.zone) {
      reply({ ok: false, err: 'invalid' });
      return;
    }
    const result = _moveStorageTransfer(
      p.inv,
      item.storage,
      STORAGE_CHEST_CAPACITY,
      { zone: from.zone, index: from.index },
      { zone: to.zone, index: to.index },
    );
    if (!result.ok) {
      reply(result);
      return;
    }
    item.storage = result.grid;
    p.dirty = true;
    _emitInvAuth(socket, p);
    _emitStorageUpdate(item);
    _touchDecorItem(item);
    reply({ ok: true });
  });

  socket.on('storage-hit', (d) => {
    const item = _getNearbyStorage(d?.id);
    if (!item) return;
    if (_isDecorImmutable(item)) {
      socket.emit('storage-error', { message: 'Coffre fixe — ne peut pas être cassé' });
      return;
    }
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
    const item = _getNearbyStorage(d?.id);
    if (!item) {
      reply({ ok: false, error: 'Coffre introuvable' });
      return;
    }
    if (_isDecorImmutable(item)) {
      reply({ ok: false, error: 'Coffre fixe — ne peut pas être déplacé' });
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

  socket.on('campfire-cook', (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const decorId = String(d?.decorId || '');
    const item = decorItems.get(decorId);
    if (!item || item.prefabId !== 'spawn_campfire') {
      reply({ ok: false, error: 'Feu introuvable' });
      return;
    }
    if (Math.hypot((item.x || 0) - p.x, (item.z || 0) - p.z) > 3.2) {
      reply({ ok: false, error: 'Trop loin du feu' });
      return;
    }
    if (!_consumeInvType(p.inv, 'food_viande_crue', 1)) {
      reply({ ok: false, error: 'Il te faut de la viande crue' });
      return;
    }
    const res = _addStackToInv(p.inv, { type: 'food_viande_cuite', qty: 1 });
    if (res.leftover > 0) {
      _addStackToInv(p.inv, { type: 'food_viande_crue', qty: 1 });
      reply({ ok: false, error: 'Inventaire plein' });
      return;
    }
    p.dirty = true;
    _emitInvAuth(socket, p);
    reply({ ok: true });
  });

  socket.on('camp-rest', (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const decorId = String(d?.decorId || '');
    const item = decorItems.get(decorId);
    if (!item || (item.prefabId !== 'spawn_bedroll' && item.prefabId !== 'spawn_lean_to'
        && item.prefabId !== 'spawn_single_bed')) {
      reply({ ok: false, error: 'Aucun couchage à proximité' });
      return;
    }
    if (Math.hypot((item.x || 0) - p.x, (item.z || 0) - p.z) > 3.5) {
      reply({ ok: false, error: 'Trop loin' });
      return;
    }
    p.survival = p.survival || { ...DEFAULT_SURVIVAL };
    if (_isInS01SafeZone(p.x, p.z)) {
      p.survival.faim = Math.min(100, (p.survival.faim || 0) + 8);
      p.survival.soif = Math.min(100, (p.survival.soif || 0) + 6);
      p.survival.endurance = Math.min(100, (p.survival.endurance || 0) + 18);
      p.health = Math.min(100, (p.health || 100) + 6);
    } else {
      p.survival.endurance = Math.min(100, (p.survival.endurance || 0) + 10);
    }
    p.dirty = true;
    _emitSurvivalUpdate(socket, p);
    reply({ ok: true, rested: true });
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
    if (_isDecorImmutable(item)) return;
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
    _wearPlayerTool(socket, p, toolType);

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

  socket.on('place-structure', (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    if (!d || typeof d.type !== 'string' || !d.type.startsWith('struct_')) {
      reply({ ok: false, err: 'invalid' });
      return;
    }
    if (!_removeStackFromInv(p.inv, d.type, 1)) {
      reply({ ok: false, err: 'no_item' });
      return;
    }
    const x = Number(d.x), z = Number(d.z), rotY = Number(d.rotY) || 0;
    const y = Number(d.y);
    if (!isFinite(x) || !isFinite(z)) {
      _addStackToInv(p.inv, { type: d.type, qty: 1 });
      reply({ ok: false, err: 'invalid_pos' });
      return;
    }
    if (Math.hypot(x - p.x, z - p.z) > 16) {
      _addStackToInv(p.inv, { type: d.type, qty: 1 });
      reply({ ok: false, err: 'too_far' });
      return;
    }
    if (_isBuildBlockedOnBeach(x, z)) {
      _addStackToInv(p.inv, { type: d.type, qty: 1 });
      reply({ ok: false, err: 'beach_protected' });
      return;
    }
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
    for (const c of colliders) if (c.minY === undefined) structureColliders.push(c);
    io.emit('structure-spawn', st);
    p.dirty = true;
    _emitInvAuth(socket, p);
    log.info('build', 'structure placed', { player: p.username, type: d.type });
    reply({ ok: true, id });
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
    if (_isBuildBlockedOnBeach(x, z)) {
      reject(BEACH_BUILD_BLOCKED_MSG);
      return;
    }
    if (!_removeStackFromInv(p.inv, itemType, 1)) {
      reject('Objet manquant');
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
    p.dirty = true;
    _emitInvAuth(socket, p);
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
    if (Math.hypot((item.x || 0) - p.x, (item.z || 0) - p.z) > 8) return;
    const y = Number(d.y);
    if (!Number.isFinite(y)) return;
    item.y = Math.max(-1, Math.min(30, y));
    item.baseY = item.y;
    _touchDecorItem(item);
  });

  socket.on('inventory-move', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const fromZone = d?.from?.zone;
    const toZone = d?.to?.zone;
    if (!['hotbar', 'bag', 'equip'].includes(fromZone) || !['hotbar', 'bag', 'equip'].includes(toZone)) {
      reply({ ok: false, err: 'invalid' });
      return;
    }
    const itemFx = await _getItemFx();
    const equipTouched = fromZone === 'equip' || toZone === 'equip';
    const prevArmor = equipTouched ? itemFx.getArmorFromInv(p.inv, _normalizeInv) : 0;
    const ok = _moveInvSlot(p.inv, fromZone, d.from.index, toZone, d.to.index);
    if (!ok) {
      reply({ ok: false, err: 'move_failed' });
      return;
    }
    p.dirty = true;
    _emitInvAuth(socket, p);
    if (equipTouched && _maybeSyncEquipArmor(p, prevArmor, itemFx)) {
      _emitSurvivalUpdate(socket, p);
    }
    reply({ ok: true });
  });

  socket.on('weapon-reload', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const wmod = _weaponStatsMod || await weaponStatsModPromise;
    const weaponType = String(d?.weaponType || p.equipped || '').slice(0, 60);
    const stats = wmod.getWeaponStats(weaponType);
    if (!stats.ammoType) {
      reply({ ok: false, err: 'not_firearm' });
      return;
    }
    if (!wmod.playerHasWeapon(p.inv, weaponType, _iterInvStacks)) {
      reply({ ok: false, err: 'no_weapon' });
      return;
    }
    const n = _normalizeInv(p.inv);
    let slot = null;
    for (const s of n.hotbar) {
      if (s && s.type === weaponType) { slot = s; break; }
    }
    if (!slot) {
      reply({ ok: false, err: 'no_weapon' });
      return;
    }
    const cap = stats.magazineCap || 12;
    const need = cap - (slot.ammo || 0);
    if (need <= 0) {
      reply({ ok: true, loaded: 0 });
      return;
    }
    const have = _countInvType(p.inv, stats.ammoType);
    const load = Math.min(have, need);
    if (load <= 0) {
      reply({ ok: false, err: 'no_ammo' });
      return;
    }
    if (!_removeStackFromInv(p.inv, stats.ammoType, load)) {
      reply({ ok: false, err: 'consume_failed' });
      return;
    }
    slot.ammo = (slot.ammo || 0) + load;
    Object.assign(p.inv, n);
    p.dirty = true;
    _emitInvAuth(socket, p);
    reply({ ok: true, loaded: load });
  });

  socket.on('craft-queue', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const recipeMod = await craftRecipesModPromise;
    const result = craftQueueMod.enqueueCraft(p, d?.recipeId || d?.result, _craftOps, recipeMod);
    if (!result.ok) {
      reply(result);
      return;
    }
    p.dirty = true;
    _emitInvAuth(socket, p);
    socket.emit('craft-queue-state', craftQueueMod.getCraftQueueState(p));
    reply(result);
  });

  socket.on('craft-cancel', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const recipeMod = await craftRecipesModPromise;
    const result = craftQueueMod.cancelCraftJob(p, Number(d?.jobId), _craftOps, recipeMod);
    if (result.ok) {
      p.dirty = true;
      _emitInvAuth(socket, p);
      socket.emit('craft-queue-state', craftQueueMod.getCraftQueueState(p));
    }
    reply(result);
  });

  socket.on('inventory-sync', () => {
    log.throttled(`inv-sync-reject:${p.username}`, 5000, () => {
      log.debug('inventory', 'ignored client inventory-sync', { player: p.username });
    });
  });

  socket.on('survival-sync', () => {
    log.throttled(`sv-sync-reject:${p.username}`, 5000, () => {
      log.debug('survival', 'ignored client survival-sync', { player: p.username });
    });
  });

  socket.on('player-died', () => {
    log.debug('death', 'ignored client player-died', { player: p.username });
  });

  socket.on('respawn', () => {
    if (p.health > 0 && !p._deathHandled) return;
    _spawnDeathBagFromPlayer(p);
    delete p._deathInv;
    delete p._deathPos;
    delete p._deathEquipped;
    p._deathHandled = false;
    p.health = 100;
    _resetLifeStats(p);
    p.invincible = true;
    const kit = JSON.parse(JSON.stringify(STARTING_ITEMS));
    const keepScenario = p._scenarioKeep || p.inv?.scenario;
    p.inv = kit;
    if (keepScenario) {
      p.inv.scenario = keepScenario;
      delete p._scenarioKeep;
    }
    p.survival = { ...DEFAULT_SURVIVAL };
    const spawn = _randomBeachSpawn();
    p.x = spawn.x;
    p.y = spawn.y;
    p.z = spawn.z;
    p.rotY = spawn.rotY;
    p.lastX = p.x;
    p.lastZ = p.z;
    p.lastMoveAt = Date.now();
    p.posSynced = true;
    p._respawnGraceUntil = Date.now() + 2500;
    p.dirty = true;
    setTimeout(() => { if (players.has(socket.id)) p.invincible = false; }, 3000);
    _emitSurvivalUpdate(socket, p);
    _emitInvAuth(socket, p);
    socket.emit('respawn-at', {
      spawn,
      inventory: _cloneInv(p.inv),
      survival: { ...DEFAULT_SURVIVAL },
    });
    socket.broadcast.emit('player-respawn', {
      id: socket.id,
      playerId: _normPlayerId(p.id),
      username: p.username,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      equipped: p.equipped || null,
    });
    if (scenarioBeach) scenarioBeach.onRespawnDuringIntro(p, socket);
    log.info('death', 'respawn', { player: p.username, spawn, kit: 'caillou+torche' });
  });

  // Fouille joueur endormi (déco) ou mort au sol
  socket.on('sleep-loot-open', (data, cb) => {
    if (typeof cb !== 'function') return;
    const targetId = _sleeperKey(data?.playerId);
    const target = _findLootTarget(targetId);
    if (!target) return cb({ ok: false, error: 'Personne à fouiller ici' });
    if (_sleepLootBlockedOnBeach(target)) {
      return cb({ ok: false, error: BEACH_SAFE_LOOT_MSG });
    }
    if (_distXZ(p.x, p.z, target.x, target.z) > SLEEP_LOOT_RADIUS) {
      return cb({ ok: false, error: 'Trop loin' });
    }
    cb({
      ok: true,
      playerId: target.playerId,
      username: target.username,
      inventory: _cloneInv(target.inv),
      kind: target.kind,
    });
  });

  socket.on('sleep-loot-take', async (data, cb) => {
    if (typeof cb !== 'function') return;
    const targetId = _sleeperKey(data?.playerId);
    const zone = data?.zone;
    const index = data?.index;
    const target = _findLootTarget(targetId);
    if (!target) return cb({ ok: false, error: 'Personne à fouiller ici' });
    if (_sleepLootBlockedOnBeach(target)) {
      return cb({ ok: false, error: BEACH_SAFE_LOOT_MSG });
    }
    if (_distXZ(p.x, p.z, target.x, target.z) > SLEEP_LOOT_RADIUS) {
      return cb({ ok: false, error: 'Trop loin' });
    }
    if (!['hotbar', 'bag', 'equip'].includes(zone)) {
      return cb({ ok: false, error: 'Zone invalide' });
    }
    const item = _takeInvSlot(target.inv, zone, index);
    if (!item) return cb({ ok: false, error: 'Emplacement vide' });
    if (!_tryAddSlotToInv(p.inv, item)) {
      const n = _normalizeInv(target.inv);
      if (zone === 'equip') n.equip[String(index)] = item;
      else if (zone === 'bag') n.bag[Number(index)] = item;
      else n.hotbar[Number(index)] = item;
      Object.assign(target.inv, n);
      return cb({ ok: false, error: 'Inventaire plein' });
    }
    p.dirty = true;
    const sleeperLoot = _getSleepingPlayer(target.playerId);
    if (sleeperLoot) await _saveSleepingToDb(sleeperLoot);
    else target.afterTake?.();
    _emitInvAuth(socket, p);
    io.emit('sleep-loot-update', { playerId: target.playerId, inventory: _cloneInv(target.inv) });
    log.info(target.kind === 'death' ? 'death' : 'sleep', 'loot take', {
      looter: p.username,
      target: target.username,
      type: item.type,
      qty: item.qty || 1,
    });
    cb({ ok: true, inventory: _cloneInv(target.inv) });
  });

  socket.on('sleep-loot-move', async (data, cb) => {
    if (typeof cb !== 'function') return;
    const targetId = _sleeperKey(data?.playerId);
    const target = _findLootTarget(targetId);
    if (!target) return cb({ ok: false, error: 'Personne à fouiller ici' });
    if (_sleepLootBlockedOnBeach(target)) {
      return cb({ ok: false, error: BEACH_SAFE_LOOT_MSG });
    }
    if (_distXZ(p.x, p.z, target.x, target.z) > SLEEP_LOOT_RADIUS) {
      return cb({ ok: false, error: 'Trop loin' });
    }
    const from = data?.from;
    const to = data?.to;
    if (!from?.zone || !from?.side || !to?.zone || !to?.side) {
      return cb({ ok: false, error: 'Requête invalide' });
    }

    const result = _lootMoveTransfer(
      p.inv,
      target.inv,
      { side: from.side, zone: from.zone, index: from.index },
      { side: to.side, zone: to.zone, index: to.index },
    );
    if (!result.ok) return cb({ ok: false, error: 'Déplacement refusé' });
    p.dirty = true;
    const sleeperLoot = _getSleepingPlayer(target.playerId);
    if (sleeperLoot) await _saveSleepingToDb(sleeperLoot);
    else target.afterTake?.();
    _emitInvAuth(socket, p);
    io.emit('sleep-loot-update', { playerId: target.playerId, inventory: _cloneInv(target.inv) });
    cb({ ok: true, inventory: _cloneInv(target.inv) });
  });

  // ── Groupes joueurs ─────────────────────────────────────────────────────────
  socket.on('group-create', (cb) => {
    const player = players.get(socket.id);
    if (!player) return typeof cb === 'function' && cb({ ok: false, error: 'Non connecté' });
    _getGroupsManager().then((gm) => gm.handleCreate(player, cb)).catch((err) => {
      if (typeof cb === 'function') cb({ ok: false, error: err.message });
    });
  });

  socket.on('group-invite', (d, cb) => {
    const player = players.get(socket.id);
    if (!player) return typeof cb === 'function' && cb({ ok: false, error: 'Non connecté' });
    _getGroupsManager().then((gm) => gm.handleInvite(player, d?.username, cb)).catch((err) => {
      if (typeof cb === 'function') cb({ ok: false, error: err.message });
    });
  });

  socket.on('group-invite-respond', (d, cb) => {
    const player = players.get(socket.id);
    if (!player) return typeof cb === 'function' && cb({ ok: false, error: 'Non connecté' });
    _getGroupsManager().then((gm) => gm.handleInviteRespond(player, !!d?.accept, cb)).catch((err) => {
      if (typeof cb === 'function') cb({ ok: false, error: err.message });
    });
  });

  socket.on('group-kick', (d, cb) => {
    const player = players.get(socket.id);
    if (!player) return typeof cb === 'function' && cb({ ok: false, error: 'Non connecté' });
    _getGroupsManager().then((gm) => gm.handleKick(player, d?.userId, cb)).catch((err) => {
      if (typeof cb === 'function') cb({ ok: false, error: err.message });
    });
  });

  socket.on('group-leave', (cb) => {
    const player = players.get(socket.id);
    if (!player) return typeof cb === 'function' && cb({ ok: false, error: 'Non connecté' });
    _getGroupsManager().then((gm) => gm.handleLeave(player, cb)).catch((err) => {
      if (typeof cb === 'function') cb({ ok: false, error: err.message });
    });
  });

  socket.on('group-disband', (cb) => {
    const player = players.get(socket.id);
    if (!player) return typeof cb === 'function' && cb({ ok: false, error: 'Non connecté' });
    _getGroupsManager().then((gm) => gm.handleDisband(player, cb)).catch((err) => {
      if (typeof cb === 'function') cb({ ok: false, error: err.message });
    });
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
    _pendingInvAuth.delete(socket.id);
    const leaving = players.get(socket.id);
    if (!leaving) return;
    _getGroupsManager().then((gm) => gm.onDisconnect(leaving)).catch(() => {});
    players.delete(socket.id);
    _playerVisibleZombies.delete(socket.id);

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

    // Toujours retirer l'avatar debout des autres clients (évite doublon avec le corps endormi).
    io.emit('player-leave', socket.id);
    _getGroupsManager().then((gm) => gm.onRosterChange()).catch(() => {});

    if (leaving.id && leaving.health > 0) {
      const sleep = {
        playerId: _sleeperKey(leaving.id),
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
        lifeStartedAt: leaving.lifeStartedAt,
        lifeZombieKills: leaving.lifeZombieKills ?? 0,
        lifePlayerKills: leaving.lifePlayerKills ?? 0,
        since: Date.now(),
        lastSurvivalTickAt: Date.now(),
      };
      _setSleepingPlayer(leaving.id, sleep);
      _saveSleepingToDb(sleep).catch(() => {});
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
    } else if (leaving.id) {
      if (leaving._deathHandled) _spawnDeathBagFromPlayer(leaving);
      _persistPlayer(leaving);
    }
    _emitPlayersOnline();
  });
});

// ── Réinitialisation unique (lancement) ───────────────────────────────────────
// Remet TOUS les joueurs au spawn plage (une fois après migration camp → plage).
async function resetAllPlayersOnce() {
  const marker = path.join(ROOT_DIR, '.beach_spawn_v3_east_edge');
  if (fs.existsSync(marker)) return;
  try {
    const [r] = await pool.execute(
      'UPDATE players SET inventory = ?, pos_x = ?, pos_y = ?, pos_z = ?, rot_y = ?, health = 100',
      [STARTING_SAVE, BEACH_SPAWN.x, BEACH_SPAWN.y, BEACH_SPAWN.z, BEACH_SPAWN.rotY]
    );
    fs.writeFileSync(marker, new Date().toISOString());
    log.info('boot', 'players reset to east-edge beach', { affected: r.affectedRows });
  } catch (e) {
    log.error('boot', 'player reset failed', { err: e.message });
  }
}

async function loadPersistedWorld() {
  await ensureWorldSchema();
  await qaChecklist.ensureSchema();
  const loaded = await worldPersist.loadInto(decorItems, structures, items, zombies, sleepingPlayers);
  for (const sleep of sleepingPlayers.values()) {
    catchUpSleeperSurvival(sleep);
    _saveSleepingToDb(sleep).catch(() => {});
  }
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
  .then(() => _runWorldCleanSlateOnce())
  .catch((err) => log.error('world clean slate failed', err))
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
  .then(() => { _setBoot('world_trees', 12); return ensureBeachPalms(); })
  .catch((err) => log.error('ensureBeachPalms failed', err))
  .then(() => ensureBeachSigns())
  .catch((err) => log.error('ensureBeachSigns failed', err))
  .then(() => { _setBoot('beach_palms', 13); return ensureZombiePopulation(); })
  .catch((err) => log.error('ensureZombiePopulation failed', err))
  .then(() => { _setBoot('zombies', 14); })
  .finally(() => {
    _setBoot('listening', 15);
    server.listen(PORT, HOST, () => {
      serverReady = true;
      log.info('boot', 'server started', {
        url: `http://localhost:${PORT}`,
        listen: `${HOST}:${PORT}`,
        serverRole: SERVER_ROLE,
        clientMode: USE_CLIENT_BUILD ? 'build/client' : 'apps/client',
        db: require('./src/db').DB_CLIENT,
        sqlite: require('./src/db').pool.path || undefined,
        logLevel: log.level,
        playerSnapshotMs: log.PLAYER_SNAPSHOT_MS,
        serverStatsMs: log.SERVER_STATS_MS,
        zombies: zombies.size,
        zombieTarget: ZOMBIE_COUNT,
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
