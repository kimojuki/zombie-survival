'use strict';

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
