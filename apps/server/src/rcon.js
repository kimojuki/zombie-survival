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

  register('pvp', 'Combat joueur vs joueur [on|off]', (args) => {
    if (!args[1]) return ok(`pvp = ${ctx.flags.pvp !== false ? 'on' : 'off'}`);
    const v = args[1].toLowerCase();
    if (v === 'on' || v === '1') ctx.flags.pvp = true;
    else if (v === 'off' || v === '0') ctx.flags.pvp = false;
    else return fail('Usage: pvp on|off');
    broadcastFlags();
    return ok(`PvP: ${ctx.flags.pvp !== false ? 'ON' : 'OFF'}`);
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

  register('spawnzombies', 'Fait apparaître N zombies aléatoires [count]', (args) => {
    const n = Math.max(1, Math.min(200, parseInt(args[1], 10) || 1));
    for (let i = 0; i < n; i++) {
      const z = ctx.makeZombie();
      ctx.zombies.set(z.id, z);
      ctx.io.emit('zombie-spawn', z);
    }
    return ok(`${n} zombie(s) ajouté(s) — total ${ctx.zombies.size}`);
  });

  register('zombieprefabs', 'Liste les prefabs zombie [filtre]', (args) => {
    const filter = (args[1] || '').toLowerCase();
    const ids = listZombiePrefabs().filter((id) => !filter || id.includes(filter));
    if (!ids.length) return ok('Aucun prefab zombie trouvé.');
    const linesOut = ids.map((id) => {
      const def = ctx.getZombiePrefab?.(id);
      if (!def) return `  ${id}`;
      return `  ${id} — HP ${def.health} dmg ${def.damage} spd ${def.speedMin}-${def.speedMax} wt ${def.weight}`;
    });
    return ok('=== Prefabs zombie ===', ...linesOut);
  });

  register('spawnzombie', 'Spawn prefab — spawnzombie <id> [count] [x z]', async (args, meta) => {
    const prefabId = (args[1] || '').toLowerCase();
    if (!prefabId) return fail('Usage: spawnzombie <prefabId> [count] [x z]');
    await ctx.loadZombiePrefabs?.();
    if (!listZombiePrefabs().includes(prefabId)) return fail(`Prefab inconnu: ${prefabId} — zombieprefabs`);
    const def = ctx.getZombiePrefab?.(prefabId);
    const n = Math.max(1, Math.min(50, parseInt(args[2], 10) || 1));
    const hasPos = Number.isFinite(Number(args[3])) && Number.isFinite(Number(args[4]));
    const baseX = hasPos ? Number(args[3]) : (meta.player?.x || 0);
    const baseZ = hasPos ? Number(args[4]) : (meta.player?.z || 0);
    const spawned = [];
    for (let i = 0; i < n; i++) {
      const z = ctx.makeZombie({
        prefabId,
        x: baseX + (hasPos ? 0 : (Math.random() - 0.5) * 4),
        z: baseZ + (hasPos ? 0 : (Math.random() - 0.5) * 4),
      });
      ctx.zombies.set(z.id, z);
      ctx.io.emit('zombie-spawn', z);
      spawned.push(z.id);
    }
    return ok(`${n}× ${prefabId} spawné(s) — ids ${spawned.join(', ')}`);
  });

  register('zombielist', 'Liste les zombies actifs [prefab]', (args) => {
    const filter = (args[1] || '').toLowerCase();
    const list = [...ctx.zombies.values()]
      .filter((z) => !filter || (z.prefabId || '').includes(filter))
      .sort((a, b) => a.id - b.id);
    if (!list.length) return ok('Aucun zombie actif.');
    return ok(
      `=== Zombies (${list.length}) ===`,
      ...list.slice(0, 40).map((z) => `  #${z.id} ${z.prefabId || 'zombie_walker'} HP ${z.health}/${z.maxHealth || z.health} @ (${z.x.toFixed(1)}, ${z.z.toFixed(1)}) spd ${(z.speed || 0).toFixed(1)}`),
      list.length > 40 ? `  … +${list.length - 40} autres` : null,
    );
  });

  register('zombieseed', 'Peuple le serveur jusqu\'à la cible — zombieseed [reset]', async (args) => {
    const reset = (args[1] || '').toLowerCase() === 'reset';
    await ctx.loadZombiePrefabs?.();
    const r = await ctx.ensureZombiePopulation?.({ reset });
    if (!r) return fail('ensureZombiePopulation indisponible');
    return ok(`Zombies: ${r.total} actifs (${r.added} ajouté(s)${reset ? ', reset' : ''})`);
  });

  register('killzombie', 'Supprime un zombie — killzombie <id|nearest>', (args, meta) => {
    const q = (args[1] || 'nearest').toLowerCase();
    let target = null;
    if (q === 'nearest') {
      target = findNearestZombie(meta.player?.x || 0, meta.player?.z || 0)?.zombie || null;
    } else {
      const id = parseInt(q, 10);
      target = Number.isFinite(id) ? ctx.zombies.get(id) : null;
    }
    if (!target) return fail(`Zombie introuvable: ${args[1] || 'nearest'}`);
    ctx.zombies.delete(target.id);
    ctx.io.emit('zombie-die', target.id);
    return ok(`Zombie #${target.id} (${target.prefabId || '?'}) supprimé`);
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
    let x, z, rotY = null;
    if (args.length >= 4 && findPlayer(args[1])) {
      target = findPlayer(args[1]);
      x = Number(args[2]);
      z = Number(args[3]);
      if (args.length >= 5) rotY = Number(args[4]);
    } else if (args.length >= 3) {
      x = Number(args[1]);
      z = Number(args[2]);
      if (args.length >= 4) rotY = Number(args[3]);
    } else {
      return fail('Usage: tp <x> <z>  ou  tp <joueur> <x> <z>');
    }
    if (!target || !Number.isFinite(x) || !Number.isFinite(z)) return fail('Arguments invalides');
    const y = 2.5;
    target.x = x;
    target.y = y + 1.7;
    target.z = z;
    if (Number.isFinite(rotY)) target.rotY = rotY;
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
    if (target._deathHandled) {
      target._deathHandled = false;
      delete target._deathInv;
      delete target._deathPos;
      delete target._deathEquipped;
    }
    if (!target.survival) target.survival = {};
    target.survival.saignement = false;
    target.dirty = true;
    ctx.emitSurvivalUpdate?.(target);
    return ok(`${target.username} soigné (100 HP)`);
  });

  register('kill', 'Tue un joueur <nom>', (args) => {
    const target = findPlayer(args[1]);
    if (!target) return fail(`Joueur introuvable: ${args[1] || '?'}`);
    target.health = 0;
    ctx.handlePlayerDeath?.(target);
    return ok(`${target.username} tué`);
  });

  register('give', 'Donne un objet give <joueur> <type> [qty]', (args) => {
    const target = findPlayer(args[1]);
    const type = args[2];
    const qty = Math.max(1, Math.min(999, parseInt(args[3], 10) || 1));
    if (!target || !type) return fail('Usage: give <joueur> <type> [qty]');
    if (!target.inv) target.inv = { hotbar: [], bag: [], equip: {} };
    const add = ctx.addStackToInv?.(target.inv, { type, qty });
    if (!add || add.added <= 0) return fail(`Inventaire plein pour ${target.username}`);
    target.dirty = true;
    const sock = ctx.io.sockets.sockets.get(target.socketId);
    if (sock && ctx.cloneInv) {
      sock.emit('inventory-authoritative', ctx.cloneInv(target.inv));
    }
    const left = add?.leftover || 0;
    return ok(`${qty - left}x ${type} → ${target.username}${left > 0 ? ` (${left} au sol — inv plein)` : ''}`);
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

  register('scenario-reset', 'Réinitialise l\'intro plage [joueur]', async (args) => {
    const target = findPlayer(args[1]);
    if (!target) return fail('Usage: scenario-reset <joueur>');
    if (!ctx.resetPlayerScenario) return fail('Module scénario indisponible');
    const sock = ctx.io.sockets.sockets.get(target.socketId);
    await ctx.resetPlayerScenario(target, sock);
    return ok(`Intro plage réinitialisée pour ${target.username}`);
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

  register('decoradd', 'Pose un décor — decoradd prefab <id> [here|x z] [rotY] [scale] (sans x/z = devant vous)', (args, meta) => {
    let kind = 'item';
    let ref = args[1];
    let offset = 2;
    if ((args[1] || '').toLowerCase() === 'item' || (args[1] || '').toLowerCase() === 'prefab') {
      kind = args[1].toLowerCase();
      ref = args[2];
      offset = 3;
    }
    if (!ref) return fail('Usage: decoradd <type> [here|x z] [rotY] [scale]  ou  decoradd prefab <id> [here|x z] [rotY] [scale]');
    if (kind === 'item' && listDecorPrefabs().includes(ref)) {
      kind = 'prefab';
    }
    if (kind === 'prefab' && !listDecorPrefabs().includes(ref)) return fail(`Prefab inconnu: ${ref}`);
    if (kind === 'item' && !listItemTypes().includes(ref)) {
      return fail(`Item décor inconnu: ${ref}. Utilise un vrai type d'item ou 'decorprefabs'.`);
    }
    const place = _parseDecorPlacement(args, offset, meta, ref, kind);
    const { x, z, rotY, scale, extraBase } = place;
    const item = {
      id: ctx.makeDecorItemId(),
      kind,
      type: kind === 'item' ? ref : null,
      prefabId: kind === 'prefab' ? ref : null,
      x,
      y: 0,
      z,
      rotX: 0,
      rotY,
      rotZ: 0,
      scale: Number.isFinite(scale) ? scale : 1,
      createdBy: meta.player?.username || 'admin',
      createdAt: Date.now(),
    };
    if (kind === 'prefab' && String(ref).startsWith('wreck_')) {
      const varArg = args[extraBase];
      if (varArg) {
        if (varArg === 'burnt') {
          item.wreckBurnt = true;
          item.wreckVariant = 'burnt';
        } else {
          item.wreckVariant = varArg;
        }
      }
      const tilt = Number(args[extraBase + 1]);
      const wheels = Number(args[extraBase + 2]);
      const sink = Number(args[extraBase + 3]);
      if (Number.isFinite(tilt)) {
        item.wreckTilt = tilt;
        item.rotZ = tilt;
      }
      if (Number.isFinite(wheels)) item.wreckWheels = wheels;
      if (Number.isFinite(sink)) item.wreckSink = sink;
    }
    if (kind === 'prefab' && String(ref).startsWith('tree_')) {
      item.treeSeed = Math.floor(Math.random() * 0xffffff);
    }
    ctx.decorItems.set(item.id, item);
    ctx.persistDecorUpsert?.(item);
    broadcastDecorSpawn(item);
    return ok(`Décor posé ${item.id}: ${(item.prefabId || item.type)} @ (${x.toFixed(1)}, ${z.toFixed(1)}) scale=${item.scale.toFixed(2)}`);
  });

  register('decorlist', 'Liste les items décoratifs posés', () => {
    const list = listDecorItems();
    if (!list.length) return ok('Aucun item décoratif posé.');
    return ok(
      `=== Décors (${list.length}) ===`,
      ...list.map((d) => `  ${d.id}  ${(d.kind || 'item')}:${d.prefabId || d.type}  pos(${d.x.toFixed(1)}, ${d.z.toFixed(1)}) rotY=${(d.rotY || 0).toFixed(2)} scale=${(d.scale || 1).toFixed(2)}`)
    );
  });

  register('decorprefabs', 'Liste les prefabs décor disponibles', (args) => {
    const filter = (args[1] || '').toLowerCase();
    const list = listDecorPrefabs().filter((id) => !filter || id.includes(filter));
    if (!list.length) return ok('Aucun prefab décor trouvé.');
    return ok('=== Prefabs décor ===', ...list.map((id) => `  ${id}`));
  });

  register('decorseed', 'Seed décor manquant — decorseed wrecks|trees|palms|barriers|rocks [reset]', async (args) => {
    const kind = (args[1] || '').toLowerCase();
    const reset = (args[2] || '').toLowerCase() === 'reset';
    if (kind === 'wrecks') {
      if (!ctx.ensureRoadWrecks) return fail('ensureRoadWrecks indisponible');
      const n = await ctx.ensureRoadWrecks({ broadcast: true, reset });
      if (!n && !reset) return ok('Épaves déjà présentes — rien à ajouter.');
      return ok(`${n} épave(s) routière(s) ${reset ? 'repositionnée(s)' : 'ajoutée(s)'} et synchronisée(s).`);
    }
    if (kind === 'trees') {
      if (!ctx.ensureWorldTrees) return fail('ensureWorldTrees indisponible');
      const n = await ctx.ensureWorldTrees({ broadcast: true, reset });
      if (!n && !reset) return ok('Arbres déjà présents — rien à ajouter.');
      return ok(`${n} arbre(s) prefab ${reset ? 'repositionnée(s)' : 'ajouté(s)'} et synchronisé(s).`);
    }
    if (kind === 'palms') {
      if (!ctx.ensureBeachPalms) return fail('ensureBeachPalms indisponible');
      const n = await ctx.ensureBeachPalms({ broadcast: true, reset });
      if (!n && !reset) return ok('Palmiers déjà présents — rien à ajouter.');
      return ok(`${n} palmier(s) plage ${reset ? 'repositionnée(s)' : 'ajouté(s)'} et synchronisé(s).`);
    }
    if (kind === 'barriers') {
      if (!ctx.ensureRoadBarriers) return fail('ensureRoadBarriers indisponible');
      const n = await ctx.ensureRoadBarriers({ broadcast: true, reset });
      if (!n && !reset) return ok('Barrières déjà présentes — rien à ajouter.');
      return ok(`${n} barrière(s) routière(s) ${reset ? 'repositionnée(s)' : 'ajoutée(s)'} et synchronisée(s).`);
    }
    if (kind === 'rocks') {
      if (!ctx.ensureCampRocks) return fail('ensureCampRocks indisponible');
      if (!ctx.ensureWorldRocks) return fail('ensureWorldRocks indisponible');
      const camp = await ctx.ensureCampRocks({ broadcast: true, reset });
      const world = await ctx.ensureWorldRocks({ broadcast: true, reset });
      const n = camp + world;
      if (!n && !reset) return ok('Rochers déjà présents — rien à ajouter.');
      return ok(`${n} rocher(s) minable(s) ${reset ? 'repositionné(s)' : 'ajouté(s)'} (camp: ${camp}, monde: ${world}).`);
    }
    return fail('Usage: decorseed wrecks|trees|palms|barriers|rocks [reset]');
  });

  register('decoritems', 'Liste les items posables comme décor [filtre]', (args) => {
    const filter = (args[1] || '').toLowerCase();
    const list = listItemTypes()
      .filter((id) => !filter || id.includes(filter))
      .sort((a, b) => a.localeCompare(b));
    if (!list.length) return ok('Aucun item décor trouvé.');
    return ok('=== Items décor posables ===', ...list.map((id) => `  ${id}`));
  });

  register('decorremove', 'Retire un décor decorremove <id|nearest>', (args, meta) => {
    const q = (args[1] || 'nearest').toLowerCase();
    let target = null;
    if (q === 'nearest') {
      target = findNearestDecor(meta.player.x, meta.player.z)?.item || null;
    } else {
      target = ctx.decorItems.get(args[1]) || null;
    }
    if (!target) return fail(`Décor introuvable: ${args[1] || 'nearest'}`);
    ctx.decorItems.delete(target.id);
    ctx.persistDecorDelete?.(target.id, target);
    broadcastDecorRemove(target.id);
    return ok(`Décor retiré ${target.id} (${target.prefabId || target.type})`);
  });

  // ── QA checklist (serveur QA) ───────────────────────────────────────────────

  register('qa', 'QA — qa new|add|list|failures|testers|fix|full|close', async (args) => {
    const qa = ctx.qaChecklist;
    if (!qa) return fail('Module QA indisponible');
    const sub = (args[1] || 'list').toLowerCase();

    if (sub === 'new' || sub === 'campaign') {
      const title = args[2] || 'Campagne QA';
      const full = (args[3] || '').toLowerCase() === 'full';
      const id = await qa.createCampaign(title, full);
      return ok(`Campagne QA #${id} créée${full ? ' (retest complet)' : ''}: ${title}`);
    }

    if (sub === 'add') {
      const title = args[2];
      if (!title) return fail('Usage: qa add "Titre" ["Description"]');
      const desc = args[3] || '';
      const id = await qa.addItem(title, desc);
      return ok(`Item QA #${id} ajouté: ${title}`);
    }

    if (sub === 'list') {
      const { campaign, items } = await qa.listAllItems();
      if (!campaign) return ok('Aucune campagne QA active.');
      return ok(
        `=== QA ${campaign.title} (#${campaign.id})${campaign.fullRetest ? ' [RETEST COMPLET]' : ''} ===`,
        ...items.map((i) => `  #${i.id} [${i.status}] ${i.title}${i.description ? ' — ' + i.description : ''}`),
      );
    }

    if (sub === 'failures' || sub === 'feedback') {
      const rows = await qa.listFeedback(40);
      if (!rows.length) return ok('Aucun retour QA négatif.');
      return ok(
        '=== Retours QA (échecs) ===',
        ...rows.map((r) => `  #${r.itemId} ${r.itemTitle} — ${r.username}: ${r.feedback}`),
      );
    }

    if (sub === 'testers') {
      const rows = await qa.getTesterLeaderboard(25);
      if (!rows.length) return ok('Aucun testeur QA enregistré.');
      return ok(
        '=== Testeurs QA ===',
        ...rows.map((t, i) => `  ${i + 1}. ${t.username} — ${t.passCount}✓ ${t.failCount}✗ (total ${t.total})`),
      );
    }

    if (sub === 'fix' || sub === 'reset') {
      const id = Number(args[2]);
      if (!id) return fail('Usage: qa fix <itemId>');
      const done = await qa.markFixed(id);
      return done ? ok(`Item QA #${id} remis en attente`) : fail(`Item #${id} introuvable`);
    }

    if (sub === 'full') {
      const on = (args[2] || 'on').toLowerCase() !== 'off';
      const done = await qa.setCampaignFullRetest(on);
      if (!done) return fail('Aucune campagne QA active');
      return ok(on ? 'Retest complet activé — tous les items reviennent aux testeurs' : 'Retest complet désactivé');
    }

    if (sub === 'close') {
      const n = await qa.closeActiveCampaign();
      return ok(n ? 'Campagne QA fermée' : 'Aucune campagne active');
    }

    return fail('Usage: qa new|add|list|failures|testers|fix|full|close');
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

  return { execute, commands, helpText, broadcastFlags, broadcastTime, broadcastDecorSpawn, broadcastDecorRemove };
}

module.exports = { createRcon };
