'use strict';

/**
 * Console RCON — registre de commandes admin serveur.
 * Utilisée via Socket.io (in-game) et POST /api/rcon (scripts externes).
 */
function _arr(ctx, key) {
  const v = ctx[key];
  return typeof v === 'function' ? v() : (v || []);
}

function createRcon(ctx) {
  const commands = new Map();

  function register(name, desc, fn) {
    commands.set(name.toLowerCase(), { name, desc, fn });
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

  function broadcastTime() {
    ctx.io.emit('world-time', { time: ctx.getWorldTime() });
  }

  function broadcastFlags() {
    ctx.io.emit('server-flags', { ...ctx.flags });
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

  // ── Commandes ─────────────────────────────────────────────────────────────

  register('help', 'Liste les commandes [filtre]', (args) => {
    const filter = (args[1] || '').toLowerCase();
    const list = [...commands.values()]
      .filter((c) => !filter || c.name.includes(filter) || c.desc.toLowerCase().includes(filter))
      .sort((a, b) => a.name.localeCompare(b.name));
    return ok(
      `=== Commandes RCON (${list.length}) ===`,
      ...list.map((c) => `  ${c.name.padEnd(16)} — ${c.desc}`)
    );
  });

  register('status', 'État du serveur', () => {
    const t = ctx.getWorldTime();
    const phase = t < 0.2 ? 'nuit' : t < 0.35 ? 'aube' : t < 0.65 ? 'jour' : t < 0.8 ? 'crépuscule' : 'nuit';
    return ok(
      `Joueurs: ${ctx.players.size} | Zombies: ${ctx.zombies.size} | Items: ${ctx.items.size} | Structures: ${ctx.structures.size}`,
      `Temps: ${(t * 100).toFixed(1)}% (${phase}) | Uptime: ${Math.floor(process.uptime())}s`,
      `Flags: autoday=${ctx.flags.autoDay} zombies=${ctx.flags.zombieAI} spawn=${ctx.flags.zombieSpawn} loot=${ctx.flags.lootEnabled}`,
      `Colliders: ${_arr(ctx, 'worldColliders').length} | Loot bâtiments: ${_arr(ctx, 'lootBuildings').length} | Zones eau: ${_arr(ctx, 'worldWaterZones').length}`
    );
  });

  register('players', 'Liste les joueurs connectés', () => {
    if (!ctx.players.size) return ok('Aucun joueur connecté.');
    return ok(
      '=== Joueurs en ligne ===',
      ...[...ctx.players.values()].map((p) => {
        const adm = p.invincible ? ' [god]' : '';
        return `  ${p.username} — HP ${p.health} — kills ${p.kills} — pos (${p.x.toFixed(1)}, ${p.z.toFixed(1)})${adm}`;
      })
    );
  });

  register('whoami', 'Infos sur votre session admin', (_a, meta) => {
    const p = meta.player;
    return ok(
      `Joueur: ${p.username} (id ${p.socketId})`,
      `Position: (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`,
      `Admin: oui`
    );
  });

  register('time', 'Affiche ou fixe l\'heure [0-1]', (args) => {
    if (args[1] == null) {
      return ok(`Heure mondiale: ${ctx.getWorldTime().toFixed(4)} (0=minuit, 0.5=midi)`);
    }
    const v = Number(args[1]);
    if (!Number.isFinite(v) || v < 0 || v > 1) return fail('Valeur invalide — utilisez 0 à 1');
    ctx.setWorldTime(v);
    broadcastTime();
    return ok(`Heure fixée à ${v.toFixed(4)}`);
  });

  register('day', 'Passer en plein jour (0.5)', () => {
    ctx.setWorldTime(0.5);
    broadcastTime();
    return ok('Jour — midi (0.5)');
  });

  register('night', 'Passer en nuit (0.0)', () => {
    ctx.setWorldTime(0.0);
    broadcastTime();
    return ok('Nuit (0.0)');
  });

  register('dawn', 'Lever du soleil (0.25)', () => {
    ctx.setWorldTime(0.25);
    broadcastTime();
    return ok('Aube (0.25)');
  });

  register('dusk', 'Coucher du soleil (0.75)', () => {
    ctx.setWorldTime(0.75);
    broadcastTime();
    return ok('Crépuscule (0.75)');
  });

  register('autoday', 'Cycle jour/nuit auto [on|off]', (args) => {
    if (!args[1]) return ok(`autoday = ${ctx.flags.autoDay ? 'on' : 'off'}`);
    const v = args[1].toLowerCase();
    if (v === 'on' || v === '1' || v === 'true') ctx.flags.autoDay = true;
    else if (v === 'off' || v === '0' || v === 'false') ctx.flags.autoDay = false;
    else return fail('Usage: autoday on|off');
    broadcastFlags();
    return ok(`Cycle automatique: ${ctx.flags.autoDay ? 'ON' : 'OFF'}`);
  });

  register('zombies', 'IA des zombies [on|off]', (args) => {
    if (!args[1]) return ok(`zombies = ${ctx.flags.zombieAI ? 'on' : 'off'}`);
    const v = args[1].toLowerCase();
    if (v === 'on' || v === '1') ctx.flags.zombieAI = true;
    else if (v === 'off' || v === '0') ctx.flags.zombieAI = false;
    else return fail('Usage: zombies on|off');
    broadcastFlags();
    return ok(`IA zombies: ${ctx.flags.zombieAI ? 'ON' : 'OFF'}`);
  });

  register('nospawn', 'Désactive les respawns zombie [on|off]', (args) => {
    if (!args[1]) return ok(`nospawn = ${ctx.flags.zombieSpawn ? 'off' : 'on'} (spawn ${ctx.flags.zombieSpawn ? 'actif' : 'bloqué'})`);
    const v = args[1].toLowerCase();
    // nospawn on = pas de spawn
    if (v === 'on' || v === '1') ctx.flags.zombieSpawn = false;
    else if (v === 'off' || v === '0') ctx.flags.zombieSpawn = true;
    else return fail('Usage: nospawn on|off');
    broadcastFlags();
    return ok(`Respawn zombies: ${ctx.flags.zombieSpawn ? 'ACTIF' : 'BLOQUÉ'}`);
  });

  register('clearzombies', 'Supprime tous les zombies', () => {
    const ids = [...ctx.zombies.keys()];
    ctx.zombies.clear();
    for (const id of ids) ctx.io.emit('zombie-die', id);
    return ok(`${ids.length} zombie(s) supprimé(s)`);
  });

  register('spawnzombies', 'Fait apparaître N zombies [count]', (args) => {
    const n = Math.max(1, Math.min(200, parseInt(args[1], 10) || 1));
    for (let i = 0; i < n; i++) {
      const z = ctx.makeZombie();
      ctx.zombies.set(z.id, z);
      ctx.io.emit('zombie-spawn', z);
    }
    return ok(`${n} zombie(s) ajouté(s) — total ${ctx.zombies.size}`);
  });

  register('kick', 'Expulse un joueur <nom>', (args) => {
    const target = findPlayer(args[1]);
    if (!target) return fail(`Joueur introuvable: ${args[1] || '?'}`);
    const sock = ctx.io.sockets.sockets.get(target.socketId);
    if (sock) sock.disconnect(true);
    return ok(`${target.username} expulsé`);
  });

  register('say', 'Message global <texte>', (args, meta) => {
    const msg = args.slice(1).join(' ').trim();
    if (!msg) return fail('Usage: say <message>');
    ctx.io.emit('server-announce', { message: msg, from: meta.player?.username || 'admin' });
    return ok(`Annonce envoyée: ${msg}`);
  });

  register('tp', 'Téléportation tp <x> <z> | tp <joueur> <x> <z>', (args, meta) => {
    let target = meta.player;
    let x, z;
    if (args.length >= 4 && findPlayer(args[1])) {
      target = findPlayer(args[1]);
      x = Number(args[2]);
      z = Number(args[3]);
    } else if (args.length >= 3) {
      x = Number(args[1]);
      z = Number(args[2]);
    } else {
      return fail('Usage: tp <x> <z>  ou  tp <joueur> <x> <z>');
    }
    if (!target || !Number.isFinite(x) || !Number.isFinite(z)) return fail('Arguments invalides');
    const y = 2.5;
    target.x = x;
    target.y = y + 1.7;
    target.z = z;
    target.dirty = true;
    const sock = ctx.io.sockets.sockets.get(target.socketId);
    if (sock) {
      sock.emit('admin-tp', { x, y: y + 1.7, z, rotY: target.rotY });
      sock.broadcast.emit('player-move', { id: target.socketId, x: target.x, y: target.y, z: target.z, rotY: target.rotY });
    }
    return ok(`${target.username} → (${x.toFixed(1)}, ${z.toFixed(1)})`);
  });

  register('bring', 'Téléporte un joueur vers vous <nom>', (args, meta) => {
    const target = findPlayer(args[1]);
    if (!target) return fail(`Joueur introuvable: ${args[1] || '?'}`);
    target.x = meta.player.x;
    target.y = meta.player.y;
    target.z = meta.player.z + 2;
    target.dirty = true;
    const sock = ctx.io.sockets.sockets.get(target.socketId);
    if (sock) {
      sock.emit('admin-tp', { x: target.x, y: target.y, z: target.z, rotY: target.rotY });
      sock.broadcast.emit('player-move', { id: target.socketId, x: target.x, y: target.y, z: target.z, rotY: target.rotY });
    }
    return ok(`${target.username} amené à votre position`);
  });

  register('goto', 'Vous téléporte vers un joueur <nom>', (args, meta) => {
    const target = findPlayer(args[1]);
    if (!target) return fail(`Joueur introuvable: ${args[1] || '?'}`);
    meta.player.x = target.x;
    meta.player.y = target.y;
    meta.player.z = target.z + 2;
    meta.player.dirty = true;
    const sock = ctx.io.sockets.sockets.get(meta.player.socketId);
    if (sock) {
      sock.emit('admin-tp', { x: meta.player.x, y: meta.player.y, z: meta.player.z, rotY: meta.player.rotY });
      sock.broadcast.emit('player-move', { id: meta.player.socketId, x: meta.player.x, y: meta.player.y, z: meta.player.z, rotY: meta.player.rotY });
    }
    return ok(`Téléporté vers ${target.username}`);
  });

  register('heal', 'Soigne un joueur [nom] (défaut: vous)', (args, meta) => {
    const target = args[1] ? findPlayer(args[1]) : meta.player;
    if (!target) return fail(`Joueur introuvable: ${args[1]}`);
    target.health = 100;
    target.dirty = true;
    const sock = ctx.io.sockets.sockets.get(target.socketId);
    if (sock) sock.emit('take-damage', { health: 100 });
    return ok(`${target.username} soigné (100 HP)`);
  });

  register('kill', 'Tue un joueur <nom>', (args) => {
    const target = findPlayer(args[1]);
    if (!target) return fail(`Joueur introuvable: ${args[1] || '?'}`);
    target.health = 0;
    const sock = ctx.io.sockets.sockets.get(target.socketId);
    if (sock) sock.emit('take-damage', { dmg: 9999 });
    return ok(`${target.username} tué`);
  });

  register('give', 'Donne un objet give <joueur> <type> [qty]', (args) => {
    const target = findPlayer(args[1]);
    const type = args[2];
    const qty = Math.max(1, Math.min(999, parseInt(args[3], 10) || 1));
    if (!target || !type) return fail('Usage: give <joueur> <type> [qty]');
    const sock = ctx.io.sockets.sockets.get(target.socketId);
    if (sock) sock.emit('item-add', { type, qty });
    return ok(`${qty}x ${type} → ${target.username}`);
  });

  register('god', 'Invincibilité [on|off] [joueur]', (args, meta) => {
    let target = meta.player;
    let mode = args[1];
    if (args[2] && findPlayer(args[2])) {
      target = findPlayer(args[2]);
      mode = args[1];
    } else if (args[1] && findPlayer(args[1]) && !['on', 'off', '1', '0'].includes((args[1] || '').toLowerCase())) {
      target = findPlayer(args[1]);
      mode = args[2] || 'on';
    }
    if (!mode) return ok(`${target.username} invincible = ${target.invincible ? 'on' : 'off'}`);
    const on = ['on', '1', 'true'].includes((mode || '').toLowerCase());
    target.invincible = on;
    return ok(`Invincibilité ${target.username}: ${on ? 'ON' : 'OFF'}`);
  });

  register('save', 'Force la sauvegarde de tous les joueurs', async () => {
    let n = 0;
    for (const p of ctx.players.values()) {
      if (!p.id) continue;
      await ctx.savePlayerState(p.id, p.x, p.y, p.z, p.rotY, p.health, p.kills, ctx.saveBlob(p));
      p.dirty = false;
      n++;
    }
    return ok(`${n} joueur(s) sauvegardé(s)`);
  });

  register('loot', 'Génération loot bâtiments [regen|clear|status]', (args) => {
    const sub = (args[1] || 'status').toLowerCase();
    if (sub === 'regen' || sub === 'on') {
      if (!_arr(ctx, 'lootBuildings').length) return fail('Aucun bâtiment loot chargé');
      ctx.generateLoot();
      return ok('Loot régénéré');
    }
    if (sub === 'clear' || sub === 'off') {
      ctx.clearLoot();
      return ok('Loot monde supprimé');
    }
    const lootCount = [...ctx.items.values()].filter((i) => i.loot).length;
    return ok(`Loot: ${lootCount} items | Bâtiments: ${_arr(ctx, 'lootBuildings').length} | enabled=${ctx.flags.lootEnabled}`);
  });

  register('flags', 'Affiche tous les drapeaux serveur', () => {
    return ok(
      '=== Flags serveur ===',
      ...Object.entries(ctx.flags).map(([k, v]) => `  ${k}: ${v}`)
    );
  });

  // ── Exécution ─────────────────────────────────────────────────────────────

  async function execute(line, meta = {}) {
    const trimmed = (line || '').trim();
    if (!trimmed) return { ok: true, lines: [] };
    const args = parseArgs(trimmed);
    const cmd = (args[0] || '').toLowerCase();
    const entry = commands.get(cmd);
    if (!entry) return fail(`Commande inconnue: ${cmd} — tapez "help"`);
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

  return { execute, commands, helpText, broadcastFlags, broadcastTime };
}

module.exports = { createRcon };
