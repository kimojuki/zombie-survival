'use strict';

/** spawn, prefabs, seed, kill zombies — extrait de rcon.js */
function registerZombieCommands(env) {
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

  register('clearzombies', 'Supprime tous les zombies', () => {
      const ids = [...ctx.zombies.keys()];
      ctx.zombies.clear();
      for (const id of ids) ctx.io.emit('zombie-die', id);
      return ok(`${ids.length} zombie(s) supprimé(s)`);
    }, { dangerous: true });
  
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
}

module.exports = { registerZombieCommands };
