'use strict';

/** kick, say, tp, heal, give, god, scenario-reset — extrait de rcon.js */
function registerPlayerCommands(env) {
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
  
  function _teleportPlayer(target, x, z, rotY) {
      if (!target?.socketId) {
        return fail('Joueur non connecté — lancez la commande en jeu (pas via API seule)');
      }
      if (!Number.isFinite(x) || !Number.isFinite(z)) {
        return fail(`Coordonnées invalides (${x}, ${z})`);
      }
      const y = 2.5;
      const py = y + 1.7;
      target.x = x;
      target.y = py;
      target.z = z;
      target.lastX = x;
      target.lastZ = z;
      target.lastMoveAt = Date.now();
      target.posSynced = true;
      target._tpGraceUntil = Date.now() + 2500;
      if (Number.isFinite(rotY)) target.rotY = rotY;
      target.dirty = true;
      const sock = ctx.io.sockets.sockets.get(target.socketId);
      if (sock) {
        sock.emit('admin-tp', { x, y: py, z, rotY: target.rotY });
        sock.broadcast.emit('player-move', {
          id: target.socketId,
          x: target.x,
          y: target.y,
          z: target.z,
          rotY: target.rotY,
        });
      }
      return ok(`${target.username} → (${x.toFixed(1)}, ${z.toFixed(1)})`);
    }
  
    async function _tpCheckpointList() {
      const mod = await _getS01Checkpoints();
      const rows = mod.listS01Checkpoints().map((cp) => {
        const hint = cp.note ? ` — ${cp.note}` : '';
        return `  ${cp.id} — ${cp.label} @ (${cp.x}, ${cp.z})${hint}`;
      });
      return ok('Points de vérification S01:', ...rows, 'Usage: tpcheck <id>  ou  tp check <id>');
    }
  
    async function _tpCheckpointGo(meta, rawId) {
      const mod = await _getS01Checkpoints();
      const cp = mod.resolveS01Checkpoint(rawId);
      if (!cp) {
        const ids = mod.listS01Checkpoints().map((c) => c.id).join(', ');
        return fail(`Point inconnu: ${rawId} — ids: ${ids}`);
      }
      const note = cp.note ? ` — ${cp.note}` : '';
      const res = _teleportPlayer(meta.player, cp.x, cp.z, cp.rotY);
      if (!res.ok) return res;
      res.lines.push(`${cp.label}${note}`);
      return res;
    }
  
    register('tpcheck', 'TP point vérif S01 — tpcheck [id]', async (args, meta) => {
      if (!args[1]) return _tpCheckpointList();
      return _tpCheckpointGo(meta, args[1]);
    });
  
    register('tp', 'tp check [id] | tp <x> <z> | tp <joueur> <x> <z>', async (args, meta) => {
      const sub = (args[1] || '').toLowerCase();
      if (sub === 'check' || sub === 'verif') {
        if (!args[2]) return _tpCheckpointList();
        return _tpCheckpointGo(meta, args[2]);
      }
  
      let target = meta.player;
      let x;
      let z;
      let rotY = null;
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
        return fail('Usage: tp check [id] | tp <x> <z> | tp <joueur> <x> <z>');
      }
      return _teleportPlayer(target, x, z, rotY);
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
    }, { dangerous: true });
  
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
}

module.exports = { registerPlayerCommands };
