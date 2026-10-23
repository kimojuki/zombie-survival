'use strict';

const { pathToFileURL } = require('url');
const path = require('path');
const { createRconHelpers } = require('./rcon/helpers');
const { registerCoreCommands } = require('./rcon/commands/core');
const { registerWorldCommands } = require('./rcon/commands/world');
const { registerZombieCommands } = require('./rcon/commands/zombie');
const { registerPlayerCommands } = require('./rcon/commands/player');
const { registerDecorCommands } = require('./rcon/commands/decor');
const { registerQaCommands } = require('./rcon/commands/qa');

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
    if (!perms.includes(need)) return `Permission requise : ${need}`;
    return null;
  }

  function parseArgs(line) {
    const parts = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
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

  registerCoreCommands(env);
  registerWorldCommands(env);
  registerZombieCommands(env);
  registerPlayerCommands(env);
  registerDecorCommands(env);
  registerQaCommands(env);

  // ── Exécution ─────────────────────────────────────────────────────────────

  async function execute(line, meta = {}) {
    const trimmed = (line || '').trim();
    if (!trimmed) return { ok: true, lines: [] };
    const args = parseArgs(trimmed);
    const cmd = (args[0] || '').toLowerCase();
    const entry = commands.get(cmd);
    if (!entry) return fail(`Commande inconnue: ${cmd} — tapez "help"`);
    const permErr = _checkCommandPerm(entry, meta);
    if (permErr) return fail(permErr);
    try {
      const result = await entry.fn(args, meta);
      if (result && typeof result === 'object' && 'lines' in result) return result;
      return ok(String(result ?? 'OK'));
    } catch (err) {
      ctx.log?.error?.('rcon', 'command failed', { cmd, err: err.message });
      return fail(`Erreur: ${err.message}`);
    }
  }

  function helpText() {
    return [...commands.values()].map((c) => c.name).sort().join(', ');
  }

  return { execute, commands, helpText, broadcastFlags, broadcastTime, broadcastDecorSpawn, broadcastDecorRemove };
}

module.exports = { createRcon };
