'use strict';

/** time, cycle, flags serveur, loot, worldwipe — extrait de rcon.js */
function registerWorldCommands(env) {
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
  
  register('worldwipe', 'Wipe map — worldwipe [all] [ground]', async (args) => {
      if (!ctx.wipePlayerWorld) return fail('worldwipe indisponible');
      const flags = new Set(args.slice(1).map((a) => a.toLowerCase()));
      const full = flags.has('full');
      const r = await ctx.wipePlayerWorld({
        broadcast: true,
        allPlayerDecor: full || flags.has('all'),
        groundItems: full || flags.has('ground'),
      });
      const parts = [];
      if (r.structures) parts.push(`${r.structures} structure(s)`);
      if (r.decor) parts.push(`${r.decor} décor/construction(s)`);
      if (r.ground) parts.push(`${r.ground} objet(s) au sol`);
      if (!parts.length) return ok('Carte déjà propre — rien à retirer (seed immuable conservé).');
      return ok(`Map wipée: ${parts.join(', ')}. Seed monde (arbres, plage, panneaux…) conservé.`);
    }, { dangerous: true });
}

module.exports = { registerWorldCommands };
