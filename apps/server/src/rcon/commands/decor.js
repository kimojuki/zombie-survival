'use strict';

/** decoradd, decorseed, decorremove — extrait de rcon.js */
function registerDecorCommands(env) {
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
      if (kind === 'signs') {
        if (!ctx.ensureBeachSigns) return fail('ensureBeachSigns indisponible');
        const n = await ctx.ensureBeachSigns({ broadcast: true, reset });
        if (!n && !reset) return ok('Panneaux plage déjà présents — rien à ajouter.');
        return ok(`${n} panneau(x) plage ${reset ? 'repositionné(s)' : 'ajouté(s)'} et synchronisé(s).`);
      }
      if (kind === 'beach') {
        if (!ctx.ensureBeachProps) return fail('ensureBeachProps indisponible');
        const nProps = await ctx.ensureBeachProps({ broadcast: true, reset });
        const nImm = ctx.ensureBeachImmersion
          ? await ctx.ensureBeachImmersion({ broadcast: true, reset })
          : 0;
        const nIntro = ctx.ensureBeachIntroProps
          ? await ctx.ensureBeachIntroProps({ broadcast: true, reset })
          : 0;
        const n = nProps + nImm + nIntro;
        if (!n && !reset) return ok('Props plage déjà présents — rien à ajouter.');
        return ok(`${n} prop(s) plage ${reset ? 'repositionné(s)' : 'ajouté(s)'} (base: ${nProps}, immersion: ${nImm}, intro: ${nIntro}).`);
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
      if (kind === 's01') {
        if (!ctx.ensureS01World) return fail('ensureS01World indisponible');
        const n = await ctx.ensureS01World({ broadcast: true, reset });
        if (!n && !reset) return ok('POI S01 déjà présents — rien à ajouter.');
        return ok(`${n} décor(s) S01 ${reset ? 'repositionné(s)' : 'ajouté(s)'} et synchronisé(s).`);
      }
      return fail('Usage: decorseed wrecks|trees|palms|signs|beach|barriers|rocks|s01 [reset]');
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
      if (ctx.isDecorImmutable?.(target)) return fail('Décor immuable (seed S01) — utilise decorseed s01 reset');
      ctx.decorItems.delete(target.id);
      ctx.persistDecorDelete?.(target.id, target);
      broadcastDecorRemove(target.id);
      return ok(`Décor retiré ${target.id} (${target.prefabId || target.type})`);
    });
}

module.exports = { registerDecorCommands };
