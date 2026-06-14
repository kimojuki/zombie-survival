'use strict';

/** help, status, players, whoami, save, flags — extrait de rcon.js */
function registerCoreCommands(env) {
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
  
  register('flags', 'Affiche tous les drapeaux serveur', () => {
      return ok(
        '=== Flags serveur ===',
        ...Object.entries(ctx.flags).map(([k, v]) => `  ${k}: ${v}`)
      );
    });
}

module.exports = { registerCoreCommands };
