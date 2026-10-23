'use strict';

const fs = require('fs');
const path = require('path');
const { PLAYER_BUILD_PREFABS } = require('./world-persist');

const BACKUP_FORMAT = 'zs-backup';
const BACKUP_VERSION = 1;

const MAP_META_KEYS = [
  'decorSeq',
  'structureIdCounter',
  'itemIdCounter',
  'zombieIdCounter',
  'doorLockSeq',
  'removedSeedKeys',
  'worldColliders',
  'worldWaterZones',
  'lootBuildings',
  'adminRoads',
  'adminRoadSeq',
  'worldTime',
  'prefabCatalogReviews',
];

function safeParseJson(raw, fallback = null) {
  if (raw == null || raw === '') return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function isPlayerBuiltDecor(d, { isDecorImmutable, campPoiPrefabs } = {}) {
  if (!d?.id) return false;
  if (typeof isDecorImmutable === 'function' && isDecorImmutable(d)) return false;
  const pid = d.prefabId || '';
  const pk = String(d.placementKey || '');
  if (pk.startsWith('s01:')) return false;
  if (campPoiPrefabs?.has?.(pid)) return false;
  const isPlayerWood = pid.startsWith('build_') && pid.endsWith('_wood');
  const isPlayerChest = pid === 'storage_chest' && d.createdBy !== 'seed';
  const isKnownBuild = PLAYER_BUILD_PREFABS.has(pid) && pid !== 'storage_chest';
  return isPlayerWood || isPlayerChest || isKnownBuild;
}

function createWorldBackupService({
  db,
  pool,
  DB_CLIENT,
  backupDir,
  log,
  isDecorImmutable,
  campPoiPrefabs,
}) {
  const decorCtx = { isDecorImmutable, campPoiPrefabs };

  function ensureBackupDir() {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  function backupFilePath(id) {
    const safe = String(id).replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(backupDir, `${safe}.json`);
  }

  function parseBackupId(filename) {
    return path.basename(filename, '.json');
  }

  async function loadAllWorldMeta() {
    const meta = {};
    for (const key of MAP_META_KEYS) {
      try {
        const raw = await db.getWorldMeta(key);
        if (raw != null && raw !== '') meta[key] = raw;
      } catch {
        /* ignore missing keys */
      }
    }
    return meta;
  }

  async function exportDecorRows(includePlayerBuilds) {
    const rows = await db.loadAllWorldDecor();
    if (includePlayerBuilds) return rows;
    return rows.filter((row) => {
      const d = safeParseJson(row.payload, {});
      return !isPlayerBuiltDecor(d, decorCtx);
    });
  }

  async function exportStructures(includePlayerBuilds) {
    if (!includePlayerBuilds) return [];
    return db.loadAllWorldStructures();
  }

  async function buildSnapshot({ kind, includePlayerBuilds, createdBy, label }) {
    const includeBuilds = kind === 'full' ? true : !!includePlayerBuilds;
    const decor = await exportDecorRows(includeBuilds);
    const structures = await exportStructures(includeBuilds);
    const meta = await loadAllWorldMeta();

    const data = {
      decor,
      structures,
      meta,
    };

    if (kind === 'full') {
      const [playerRows] = await pool.execute(
        'SELECT id, username, password_hash, pos_x, pos_y, pos_z, rot_y, health, kills, inventory, last_saved FROM players ORDER BY id'
      );
      data.items = await db.loadAllWorldItems();
      data.zombies = await db.loadAllWorldZombies();
      data.sleepers = await db.loadAllWorldSleepers();
      data.players = playerRows || [];
      try {
        const [roleRows] = await pool.execute(
          'SELECT username, role, assigned_by, updated_at FROM player_roles ORDER BY username'
        );
        data.playerRoles = roleRows || [];
      } catch {
        data.playerRoles = [];
      }
    }

    const stats = {
      decor: decor.length,
      structures: structures.length,
      metaKeys: Object.keys(meta).length,
      items: data.items?.length ?? 0,
      zombies: data.zombies?.length ?? 0,
      sleepers: data.sleepers?.length ?? 0,
      players: data.players?.length ?? 0,
    };

    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      kind,
      createdAt: new Date().toISOString(),
      createdBy: createdBy || null,
      label: label ? String(label).slice(0, 120) : null,
      includePlayerBuilds: includeBuilds,
      stats,
      data,
    };
  }

  function validateBackup(raw) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid_json' };
    if (raw.format !== BACKUP_FORMAT) return { ok: false, error: 'unknown_format' };
    if (raw.version !== BACKUP_VERSION) return { ok: false, error: 'unsupported_version' };
    if (raw.kind !== 'map' && raw.kind !== 'full') return { ok: false, error: 'invalid_kind' };
    if (!raw.data || typeof raw.data !== 'object') return { ok: false, error: 'missing_data' };
    if (!Array.isArray(raw.data.decor)) return { ok: false, error: 'missing_decor' };
    if (!Array.isArray(raw.data.structures)) return { ok: false, error: 'missing_structures' };
    if (!raw.data.meta || typeof raw.data.meta !== 'object') return { ok: false, error: 'missing_meta' };
    if (raw.kind === 'full') {
      if (!Array.isArray(raw.data.players)) return { ok: false, error: 'missing_players' };
      if (!Array.isArray(raw.data.items)) return { ok: false, error: 'missing_items' };
      if (!Array.isArray(raw.data.zombies)) return { ok: false, error: 'missing_zombies' };
      if (!Array.isArray(raw.data.sleepers)) return { ok: false, error: 'missing_sleepers' };
    }
    return { ok: true, backup: raw };
  }

  async function saveBackupToDisk(snapshot) {
    ensureBackupDir();
    const stamp = snapshot.createdAt.replace(/[:.]/g, '-');
    const slug = snapshot.label
      ? snapshot.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)
      : '';
    const id = `${stamp}-${snapshot.kind}${slug ? `-${slug}` : ''}`;
    const filePath = backupFilePath(id);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
    log.info('backup', 'created', { id, kind: snapshot.kind, file: filePath, stats: snapshot.stats });
    return { id, filePath, snapshot };
  }

  function listBackups() {
    ensureBackupDir();
    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));
    const rows = [];
    for (const file of files) {
      const id = parseBackupId(file);
      const filePath = path.join(backupDir, file);
      let snap = null;
      try {
        snap = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch {
        snap = null;
      }
      const st = fs.statSync(filePath);
      rows.push({
        id,
        kind: snap?.kind || 'unknown',
        label: snap?.label || null,
        createdAt: snap?.createdAt || st.mtime.toISOString(),
        createdBy: snap?.createdBy || null,
        includePlayerBuilds: snap?.includePlayerBuilds ?? null,
        stats: snap?.stats || null,
        bytes: st.size,
      });
    }
    rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return rows;
  }

  function readBackupById(id) {
    const filePath = backupFilePath(id);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return null;
    }
  }

  function deleteBackup(id) {
    const filePath = backupFilePath(id);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    log.info('backup', 'deleted', { id });
    return true;
  }

  async function upsertMetaFromBackup(meta) {
    for (const key of MAP_META_KEYS) {
      if (!(key in meta)) continue;
      const val = meta[key];
      if (val == null) continue;
      const stored = typeof val === 'string' ? val : JSON.stringify(val);
      await db.setWorldMeta(key, stored);
    }
  }

  async function replaceTableRows(table, rows, insertFn) {
    await pool.execute(`DELETE FROM ${table}`);
    for (const row of rows) {
      await insertFn(row);
    }
  }

  async function applyMapBackup(backup) {
    const { decor, structures, meta } = backup.data;
    await replaceTableRows('world_decor', decor, async (row) => {
      const payload = typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload);
      await db.upsertWorldDecor(row.id, payload, row.created_by || null);
    });
    await replaceTableRows('world_structures', structures, async (row) => {
      const payload = typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload);
      await db.upsertWorldStructure(row.id, payload);
    });
    await upsertMetaFromBackup(meta);
  }

  async function applyFullBackup(backup) {
    await applyMapBackup(backup);
    const { items, zombies, sleepers, players, playerRoles } = backup.data;

    await replaceTableRows('world_items', items, async (row) => {
      const payload = typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload);
      await db.upsertWorldItem(row.id, payload);
    });
    await replaceTableRows('world_zombies', zombies, async (row) => {
      const payload = typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload);
      await db.upsertWorldZombie(row.id, payload);
    });

    await pool.execute('DELETE FROM world_sleepers');
    for (const row of sleepers) {
      const payload = typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload);
      await db.upsertWorldSleeper(row.player_id, payload);
    }

    await pool.execute('DELETE FROM players');
    for (const p of players) {
      await pool.execute(
        DB_CLIENT === 'mysql'
          ? 'INSERT INTO players (id, username, password_hash, pos_x, pos_y, pos_z, rot_y, health, kills, inventory, last_saved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          : 'INSERT INTO players (id, username, password_hash, pos_x, pos_y, pos_z, rot_y, health, kills, inventory, last_saved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          p.id,
          p.username,
          p.password_hash,
          p.pos_x,
          p.pos_y,
          p.pos_z,
          p.rot_y,
          p.health ?? 100,
          p.kills ?? 0,
          typeof p.inventory === 'string' ? p.inventory : JSON.stringify(p.inventory || []),
          p.last_saved || new Date().toISOString(),
        ]
      );
    }

    try {
      await pool.execute('DELETE FROM player_roles');
      for (const r of playerRoles || []) {
        await pool.execute(
          DB_CLIENT === 'mysql'
            ? 'INSERT INTO player_roles (username, role, assigned_by, updated_at) VALUES (?, ?, ?, ?)'
            : 'INSERT INTO player_roles (username, role, assigned_by, updated_at) VALUES (?, ?, ?, ?)',
          [r.username, r.role, r.assigned_by || null, r.updated_at || null]
        );
      }
    } catch (err) {
      log.warn('backup', 'player_roles restore skipped', { err: err.message });
    }
  }

  async function restoreBackup(raw, { flushWorldPersist }) {
    const check = validateBackup(raw);
    if (!check.ok) return check;
    const backup = check.backup;

    if (typeof flushWorldPersist === 'function') {
      await flushWorldPersist();
    }

    if (backup.kind === 'full') {
      await applyFullBackup(backup);
    } else {
      await applyMapBackup(backup);
    }

    log.info('backup', 'restored', { kind: backup.kind, stats: backup.stats });
    return { ok: true, kind: backup.kind, stats: backup.stats };
  }

  return {
    BACKUP_FORMAT,
    BACKUP_VERSION,
    MAP_META_KEYS,
    isPlayerBuiltDecor,
    buildSnapshot,
    validateBackup,
    saveBackupToDisk,
    listBackups,
    readBackupById,
    deleteBackup,
    restoreBackup,
    backupFilePath,
  };
}

module.exports = {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  MAP_META_KEYS,
  isPlayerBuiltDecor,
  createWorldBackupService,
};
