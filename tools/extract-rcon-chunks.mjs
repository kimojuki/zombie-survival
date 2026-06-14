#!/usr/bin/env node
/**
 * Découpe rcon.js en rcon/commands/* + rcon/helpers.js
 * Usage: node tools/extract-rcon-chunks.mjs [--write]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RCON = path.join(ROOT, 'apps/server/src/rcon.js');
const CMD_DIR = path.join(ROOT, 'apps/server/src/rcon/commands');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: 'core.js',
    fn: 'registerCoreCommands',
    title: 'help, status, players, whoami, save, flags',
    ranges: [
      ["register('help'", "register('time'"],
      ["register('save'", "register('loot'"],
      ["register('flags'", "register('decoradd'"],
    ],
  },
  {
    file: 'world.js',
    fn: 'registerWorldCommands',
    title: 'time, cycle, flags serveur, loot, worldwipe',
    ranges: [
      ["register('time'", "register('clearzombies'"],
      ["register('loot'", "register('flags'"],
      ["register('worldwipe'", "register('decorremove'"],
    ],
  },
  {
    file: 'zombie.js',
    fn: 'registerZombieCommands',
    title: 'spawn, prefabs, seed, kill zombies',
    ranges: [["register('clearzombies'", "register('kick'"]],
  },
  {
    file: 'player.js',
    fn: 'registerPlayerCommands',
    title: 'kick, say, tp, heal, give, god, scenario-reset',
    ranges: [
      ["register('kick'", "function _teleportPlayer("],
      ['function _teleportPlayer(', "register('save'"],
    ],
  },
  {
    file: 'decor.js',
    fn: 'registerDecorCommands',
    title: 'decoradd, decorseed, decorremove',
    ranges: [["register('decoradd'", "register('worldwipe'"]],
  },
  {
    file: 'qa.js',
    fn: 'registerQaCommands',
    title: 'checklist QA serveur',
    ranges: [["register('qa'", '// ── Exécution']],
  },
];

const HELPERS_START = 'function _arr(ctx, key)';
const HELPERS_END = '  // ── Commandes';

function sliceBetween(src, startMarker, endMarker, includeStart = true) {
  const i0 = src.indexOf(startMarker);
  if (i0 < 0) throw new Error(`start not found: ${startMarker.slice(0, 40)}`);
  const searchFrom = i0 + startMarker.length;
  const i1 = src.indexOf(endMarker, searchFrom);
  if (i1 < 0) throw new Error(`end not found after ${startMarker.slice(0, 40)}`);
  const from = includeStart ? i0 : searchFrom;
  return src.slice(from, i1).trimEnd();
}

function extractChunkBody(src, chunk) {
  const parts = chunk.ranges.map(([start, end]) => sliceBetween(src, start, end));
  return parts.join('\n\n');
}

function wrapCommands(chunk, body) {
  return `'use strict';

/** ${chunk.title} — extrait de rcon.js */
function ${chunk.fn}(env) {
  const {
    register,
    ctx,
    commands,
    ok,
    fail,
    _arr,
    findPlayer,
    broadcastTime,
    broadcastFlags,
    broadcastDecorSpawn,
    broadcastDecorRemove,
    listDecorItems,
    listDecorPrefabs,
    listItemTypes,
    _parseDecorPlacement,
    findNearestZombie,
    listZombiePrefabs,
    findNearestDecor,
    _getS01Checkpoints,
  } = env;

${body.split('\n').map((l) => `  ${l}`).join('\n')}
}

module.exports = { ${chunk.fn} };
`;
}

function buildRconJs(helpersBody, chunkFiles) {
  const imports = chunkFiles
    .map((c) => `const { ${c.fn} } = require('./rcon/commands/${c.file.replace('.js', '')}');`)
    .join('\n');

  const calls = chunkFiles.map((c) => `  ${c.fn}(env);`).join('\n');

  return `'use strict';

const { pathToFileURL } = require('url');
const path = require('path');
const { createRconHelpers } = require('./rcon/helpers');
${imports}

const S01_CHECKPOINTS_URL = pathToFileURL(
  path.join(__dirname, '../../../packages/shared/src/s01-checkpoints.mjs'),
).href;

let _checkpointsMod = null;
async function _getS01Checkpoints() {
  if (!_checkpointsMod) _checkpointsMod = await import(S01_CHECKPOINTS_URL);
  return _checkpointsMod;
}

/**
 * Console RCON — registre de commandes admin serveur.
 * Utilisée via Socket.io (in-game) et POST /api/rcon (scripts externes).
 */
function createRcon(ctx) {
  const commands = new Map();

  function register(name, desc, fn, opts = {}) {
    commands.set(name.toLowerCase(), {
      name,
      desc,
      fn,
      perm: opts.perm || 'rcon',
      dangerous: !!opts.dangerous,
    });
  }

  function _checkCommandPerm(entry, meta) {
    if (meta.passwordAuth) return null;
    const perms = meta.resolvePerms?.(meta.player?.username) || [];
    if (perms.includes('*')) return null;
    const need = entry.dangerous ? 'rcon.dangerous' : entry.perm;
    if (!perms.includes(need)) return \`Permission requise : \${need}\`;
    return null;
  }

  function parseArgs(line) {
    const parts = [];
    const re = /"([^"]*)"|'([^']*)'|(\\S+)/g;
    let m;
    while ((m = re.exec(line.trim()))) {
      parts.push(m[1] ?? m[2] ?? m[3]);
    }
    return parts;
  }

  const helpers = createRconHelpers(ctx);
  const {
    broadcastTime,
    broadcastFlags,
    broadcastDecorSpawn,
    broadcastDecorRemove,
    ok,
    fail,
    findPlayer,
    listDecorItems,
    listDecorPrefabs,
    listItemTypes,
    _parseDecorPlacement,
    findNearestZombie,
    listZombiePrefabs,
    findNearestDecor,
    _arr,
  } = helpers;

  const env = {
    register,
    ctx,
    commands,
    ok,
    fail,
    _arr,
    findPlayer,
    broadcastTime,
    broadcastFlags,
    broadcastDecorSpawn,
    broadcastDecorRemove,
    listDecorItems,
    listDecorPrefabs,
    listItemTypes,
    _parseDecorPlacement,
    findNearestZombie,
    listZombiePrefabs,
    findNearestDecor,
    _getS01Checkpoints,
  };

${calls}

  // ── Exécution ─────────────────────────────────────────────────────────────

  async function execute(line, meta = {}) {
    const trimmed = (line || '').trim();
    if (!trimmed) return { ok: true, lines: [] };
    const args = parseArgs(trimmed);
    const cmd = (args[0] || '').toLowerCase();
    const entry = commands.get(cmd);
    if (!entry) return fail(\`Commande inconnue: \${cmd} — tapez "help"\`);
    const permErr = _checkCommandPerm(entry, meta);
    if (permErr) return fail(permErr);
    try {
      const result = await entry.fn(args, meta);
      if (result && typeof result === 'object' && 'lines' in result) return result;
      return ok(String(result ?? 'OK'));
    } catch (err) {
      ctx.log?.error?.('rcon', 'command failed', { cmd, err: err.message });
      return fail(\`Erreur: \${err.message}\`);
    }
  }

  function helpText() {
    return [...commands.values()].map((c) => c.name).sort().join(', ');
  }

  return { execute, commands, helpText, broadcastFlags, broadcastTime, broadcastDecorSpawn, broadcastDecorRemove };
}

module.exports = { createRcon };
`;
}

function buildHelpersJs(helpersBody) {
  return `'use strict';

function _arr(ctx, key) {
  const v = ctx[key];
  return typeof v === 'function' ? v() : (v || []);
}

const DECOR_HERE_KEYS = new Set(['here', '.', '@', 'devant', 'me', 'ici']);

/** Deux nombres ressemblent à rotY + scale (pas à x/z monde). */
function _looksLikeRotScale(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (b <= 0 || b > 12) return false;
  if (a < -Math.PI * 2 || a > Math.PI * 2) return false;
  if (Math.abs(a) > 8 || Math.abs(b) > 8) return false;
  if (Number.isInteger(a) && Number.isInteger(b) && (Math.abs(a) >= 4 || Math.abs(b) >= 4)) return false;
  if (a < 0 && Math.abs(a) >= 2) return false;
  if (b < 0 && Math.abs(b) >= 2) return false;
  return true;
}

function createRconHelpers(ctx) {
  function broadcastTime() {
    ctx.io.emit('world-time', { time: ctx.getWorldTime() });
  }

  function broadcastFlags() {
    ctx.io.emit('server-flags', { ...ctx.flags });
  }

  function broadcastDecorSpawn(item) {
    ctx.io.emit('decor-item-spawn', item);
  }

  function broadcastDecorRemove(id) {
    ctx.io.emit('decor-item-remove', id);
  }

  function lines(...args) {
    return args.flat().filter((x) => x != null && x !== '');
  }

  function ok(...out) {
    return { ok: true, lines: lines(...out) };
  }

  function fail(msg) {
    return { ok: false, lines: [msg] };
  }

  function listDecorItems() {
    return Array.from(ctx.decorItems?.values?.() || []);
  }

  function listDecorPrefabs() {
    return Array.from(ctx.decorPrefabs || []);
  }

  function listItemTypes() {
    return Array.from(ctx.itemTypes || []);
  }

  /**
   * Parse [x z] [rotY] [scale] pour decoradd.
   * Sans x/z explicites → devant le joueur (here / rotY scale / rien).
   */
  function _parseDecorPlacement(args, offset, meta, ref, kind) {
    const isBuilding = kind === 'prefab' && String(ref).startsWith('building_');
    const spawnAhead = isBuilding ? 8 : 2.5;
    const baseRotY = Number.isFinite(meta.player?.rotY) ? meta.player.rotY : 0;
    const px = Number.isFinite(meta.player?.x) ? meta.player.x : 0;
    const pz = Number.isFinite(meta.player?.z) ? meta.player.z : 0;

    const aheadPos = () => ({
      x: px - Math.sin(baseRotY) * spawnAhead,
      z: pz - Math.cos(baseRotY) * spawnAhead,
    });

    const defRotY = (v) => (Number.isFinite(v) ? v : (isBuilding ? baseRotY : 0));

    const token0 = (args[offset] || '').toLowerCase();
    if (DECOR_HERE_KEYS.has(token0)) {
      const { x, z } = aheadPos();
      return {
        x, z,
        rotY: defRotY(Number(args[offset + 1])),
        scale: Number.isFinite(Number(args[offset + 2])) ? Number(args[offset + 2]) : 1,
        extraBase: offset + 3,
      };
    }

    const n0 = Number(args[offset]);
    const n1 = Number(args[offset + 1]);
    const n2 = Number(args[offset + 2]);
    const n3 = Number(args[offset + 3]);
    const has = (i) => args.length > i && Number.isFinite(Number(args[i]));

    if (has(offset + 3)) {
      return { x: n0, z: n1, rotY: defRotY(n2), scale: n3, extraBase: offset + 4 };
    }

    if (has(offset + 1) && _looksLikeRotScale(n0, n1)) {
      const { x, z } = aheadPos();
      return { x, z, rotY: n0, scale: n1, extraBase: offset + 2 };
    }

    if (has(offset + 1)) {
      return {
        x: n0, z: n1,
        rotY: defRotY(n2),
        scale: Number.isFinite(n3) ? n3 : 1,
        extraBase: offset + 4,
      };
    }

    if (has(offset)) {
      const { x, z } = aheadPos();
      const scale = Number(args[offset + 1]);
      return {
        x, z,
        rotY: defRotY(n0),
        scale: Number.isFinite(scale) ? scale : 1,
        extraBase: offset + 2,
      };
    }

    const { x, z } = aheadPos();
    return { x, z, rotY: isBuilding ? baseRotY : 0, scale: 1, extraBase: offset };
  }

  function findPlayer(name) {
    if (!name) return null;
    const q = name.toLowerCase();
    for (const p of ctx.players.values()) {
      if (p.username.toLowerCase() === q || p.socketId === name) return p;
    }
    for (const p of ctx.players.values()) {
      if (p.username.toLowerCase().startsWith(q)) return p;
    }
    return null;
  }

  function findNearestZombie(x, pz) {
    let best = null;
    for (const zm of ctx.zombies.values()) {
      const dist = Math.hypot((zm.x || 0) - x, (zm.z || 0) - pz);
      if (!best || dist < best.dist) best = { zombie: zm, dist };
    }
    return best;
  }

  function listZombiePrefabs() {
    return ctx.listZombiePrefabs?.() || [];
  }

  function findNearestDecor(x, z) {
    let best = null;
    for (const d of listDecorItems()) {
      const dist = Math.hypot((d.x || 0) - x, (d.z || 0) - z);
      if (!best || dist < best.dist) best = { item: d, dist };
    }
    return best;
  }

  return {
    broadcastTime,
    broadcastFlags,
    broadcastDecorSpawn,
    broadcastDecorRemove,
    ok,
    fail,
    findPlayer,
    listDecorItems,
    listDecorPrefabs,
    listItemTypes,
    _parseDecorPlacement,
    findNearestZombie,
    listZombiePrefabs,
    findNearestDecor,
    _arr,
  };
}

module.exports = { createRconHelpers, _arr };
`;
}

const src = fs.readFileSync(RCON, 'utf8');

if (!WRITE) {
  for (const chunk of CHUNKS) {
    const body = extractChunkBody(src, chunk);
    console.log(chunk.file, body.split('\n').length, 'lines');
  }
  console.log('\nRun with --write to extract');
  process.exit(0);
}

fs.mkdirSync(CMD_DIR, { recursive: true });
for (const chunk of CHUNKS) {
  const body = extractChunkBody(src, chunk);
  fs.writeFileSync(path.join(CMD_DIR, chunk.file), wrapCommands(chunk, body));
  console.log('wrote', chunk.file, body.split('\n').length, 'lines');
}

fs.writeFileSync(path.join(ROOT, 'apps/server/src/rcon/helpers.js'), buildHelpersJs());
fs.writeFileSync(RCON, buildRconJs(null, CHUNKS));
console.log('rewrote rcon.js + rcon/helpers.js');
