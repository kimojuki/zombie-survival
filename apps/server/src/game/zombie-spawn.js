'use strict';

const path = require('path');
const { pathToFileURL } = require('url');
const { pickZombiesToTrim } = require('../zombie-population');

const SHARED = path.join(__dirname, '../../../../packages/shared/src');
const ZOMBIE_PREFABS_URL = pathToFileURL(path.join(SHARED, 'zombie-prefabs.mjs')).href;
const COLLIDER_RESOLVE_URL = pathToFileURL(path.join(SHARED, 'collider-resolve.mjs')).href;

/** Densité par zone — Main City > Military > Small Town ; forêt éparse au départ. */
const ZOMBIE_ZONES = [
  { name: 'maincity', cx: -20, cz: -182, r: 70, weight: 34 },
  { name: 'military', cx: -200, cz: -172, r: 75, weight: 24 },
  { name: 'smalltown', cx: -177, cz: 0, r: 58, weight: 12 },
  { name: 'forest', cx: 0, cz: 20, r: 95, weight: 14 },
];
const ZOMBIE_ZONE_TOTAL = ZOMBIE_ZONES.reduce((s, z) => s + z.weight, 0);

const ZOMBIE_R = 0.5;
const ZOMBIE_SPAWN_RING = { count: 12, rMin: 45, rMax: 130 };

const DETECT_RANGE = 12;
const AGGRO_MEMORY = 5;
const AGGRO_LOST_SIGHT_DRAIN = 4;
const ZOMBIE_ATTACK_RANGE = 1.35;
const ZOMBIE_DMG = 8;
const ZOMBIE_ATTACK_CD = 0.9;
const WANDER_SPEED = 0.55;
const WANDER_TURN_MIN = 1.2;
const WANDER_TURN_MAX = 3.5;

/**
 * Spawn zombies, population cible, collision autoritaire.
 */
function createZombieSpawn(deps) {
  const {
    log,
    io,
    worldPersist,
    beachSpawn,
    zombieCount,
    getPlayers,
    getZombies,
    getNextZombieId,
    isInS01SafeZone,
    getSectorBoundsMod,
    getWorldColliders,
    getStructureColliders,
  } = deps;

  let _zombiePrefabs = null;
  let _colliderResolve = null;

  function pickZombieZone() {
    let r = Math.random() * ZOMBIE_ZONE_TOTAL;
    for (const z of ZOMBIE_ZONES) { if ((r -= z.weight) < 0) return z; }
    return ZOMBIE_ZONES[0];
  }

  async function loadZombiePrefabs() {
    if (!_zombiePrefabs) _zombiePrefabs = await import(ZOMBIE_PREFABS_URL);
    return _zombiePrefabs;
  }

  async function loadColliderResolve() {
    if (!_colliderResolve) _colliderResolve = await import(COLLIDER_RESOLVE_URL);
    return _colliderResolve;
  }

  function makeZombie(opts = {}) {
    const zp = _zombiePrefabs;
    let prefabId = opts.prefabId || null;
    const id = getNextZombieId();
    let x;
    let z;
    if (Number.isFinite(opts.x) && Number.isFinite(opts.z)) {
      x = opts.x;
      z = opts.z;
    } else {
      let zone;
      for (let attempt = 0; attempt < 24; attempt++) {
        zone = pickZombieZone();
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * zone.r;
        x = zone.cx + Math.cos(ang) * dist;
        z = zone.cz + Math.sin(ang) * dist;
        if (!isInS01SafeZone(x, z)) break;
      }
      if (!prefabId && zp?.pickZombiePrefabForZone) {
        prefabId = zp.pickZombiePrefabForZone(zone.name);
      }
    }
    if (!prefabId) prefabId = zp ? zp.pickZombiePrefab() : 'zombie_walker';
    if (zp?.buildZombieEntity) {
      const entity = zp.buildZombieEntity(prefabId, { x, z }, id);
      const sectorMod = getSectorBoundsMod();
      if (prefabId === 'zombie_walker' && sectorMod?.getSectorAt?.(x, z)?.id === 's01_start_forest') {
        entity.health = Math.round(entity.health * 0.72);
        entity.maxHealth = entity.health;
        entity.damage = Math.max(4, Math.round(entity.damage * 0.65));
        entity.speed = Math.max(1.2, entity.speed * 0.88);
        entity.detectRange = Math.max(8, entity.detectRange - 2);
      }
      return entity;
    }
    const wanderAngle = Math.random() * Math.PI * 2;
    return {
      id,
      prefabId: 'zombie_walker',
      x,
      y: 0,
      z,
      health: 100,
      maxHealth: 100,
      angle: wanderAngle,
      wanderAngle,
      wanderTimer: WANDER_TURN_MIN + Math.random() * (WANDER_TURN_MAX - WANDER_TURN_MIN),
      aggroTimer: 0,
      attackTimer: 0,
      speed: 1.8 + Math.random() * 1.4,
      damage: ZOMBIE_DMG,
      attackCd: ZOMBIE_ATTACK_CD,
      detectRange: DETECT_RANGE,
      hitRadius: 0.8,
      scale: 1,
    };
  }

  function trimZombiePopulation(target) {
    const zombies = getZombies();
    const players = getPlayers();
    if (zombies.size <= target) return 0;
    const pList = Array.from(players.values());
    const toRemove = pickZombiesToTrim(Array.from(zombies.values()), target, pList, beachSpawn);
    for (const z of toRemove) {
      if (!zombies.has(z.id)) continue;
      zombies.delete(z.id);
      worldPersist?.scheduleDeleteZombie?.(z.id);
      if (players.size > 0) io.emit('zombie-die', z.id);
    }
    if (toRemove.length) {
      log.info('world', 'zombies trimmed', { removed: toRemove.length, total: zombies.size, target });
    }
    return toRemove.length;
  }

  async function ensureZombiePopulation(opts = {}) {
    await loadZombiePrefabs();
    await loadColliderResolve();
    const zombies = getZombies();
    const players = getPlayers();
    const target = zombieCount;
    const reset = !!opts.reset;

    if (reset) {
      const ids = [...zombies.keys()];
      zombies.clear();
      for (const id of ids) {
        worldPersist?.scheduleDeleteZombie?.(id);
        io.emit('zombie-die', id);
      }
    } else {
      trimZombiePopulation(target);
      if (zombies.size >= target) {
        return { added: 0, total: zombies.size };
      }
    }

    let added = 0;

    if (zombies.size === 0) {
      const zp = _zombiePrefabs;
      for (let i = 0; i < ZOMBIE_SPAWN_RING.count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = ZOMBIE_SPAWN_RING.rMin + Math.random() * (ZOMBIE_SPAWN_RING.rMax - ZOMBIE_SPAWN_RING.rMin);
        const prefabId = zp?.pickZombiePrefabForZone?.('forest') || 'zombie_walker';
        const z = makeZombie({
          prefabId,
          x: beachSpawn.x + Math.cos(ang) * dist,
          z: beachSpawn.z + Math.sin(ang) * dist,
        });
        zombies.set(z.id, z);
        worldPersist?.scheduleUpsertZombie?.(z);
        added++;
      }
    }

    while (zombies.size < target) {
      const z = makeZombie();
      zombies.set(z.id, z);
      worldPersist?.scheduleUpsertZombie?.(z);
      added++;
      if (players.size > 0) io.emit('zombie-spawn', z);
    }

    log.info('boot', 'zombies populated', { added, total: zombies.size, target });
    return { added, total: zombies.size };
  }

  function resolveZombieCollision(nx, nz, agentR = ZOMBIE_R) {
    const all = getWorldColliders().concat(getStructureColliders());
    if (_colliderResolve?.resolveAgentCollision) {
      return _colliderResolve.resolveAgentCollision(nx, nz, all, agentR, 0, { skipJumpable: false });
    }
    for (const c of all) {
      if (c.type === 'box') {
        const clampX = Math.max(c.cx - c.hw, Math.min(c.cx + c.hw, nx));
        const clampZ = Math.max(c.cz - c.hd, Math.min(c.cz + c.hd, nz));
        const dx = nx - clampX;
        const dz = nz - clampZ;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.0001) {
          if (dist < agentR) {
            const pen = agentR - dist;
            nx += (dx / dist) * pen;
            nz += (dz / dist) * pen;
          }
        } else {
          const l = nx - (c.cx - c.hw);
          const r = (c.cx + c.hw) - nx;
          const t = nz - (c.cz - c.hd);
          const b = (c.cz + c.hd) - nz;
          const m = Math.min(l, r, t, b);
          if (m === l) nx = c.cx - c.hw - agentR;
          else if (m === r) nx = c.cx + c.hw + agentR;
          else if (m === t) nz = c.cz - c.hd - agentR;
          else nz = c.cz + c.hd + agentR;
        }
      } else if (c.x !== undefined) {
        const dx = nx - c.x;
        const dz = nz - c.z;
        const dist = Math.hypot(dx, dz);
        const min = agentR + (c.r || 0.3);
        if (dist < min && dist > 0.0001) {
          const scale = min / dist;
          nx = c.x + dx * scale;
          nz = c.z + dz * scale;
        }
      }
    }
    return [nx, nz];
  }

  function zombieHasLineOfSight(zx, zz, px, pz) {
    const all = getWorldColliders().concat(getStructureColliders());
    if (_colliderResolve?.hasLineOfSight) {
      return _colliderResolve.hasLineOfSight(zx, zz, px, pz, all, 0, { endpointShrink: 0.45 });
    }
    return true;
  }

  function listZombiePrefabIds() {
    return _zombiePrefabs ? _zombiePrefabs.listZombiePrefabIds() : [];
  }

  function getZombiePrefab(id) {
    return _zombiePrefabs ? _zombiePrefabs.getZombiePrefab(id) : null;
  }

  return {
    ZOMBIE_R,
    ZOMBIE_SPAWN_RING,
    DETECT_RANGE,
    AGGRO_MEMORY,
    AGGRO_LOST_SIGHT_DRAIN,
    ZOMBIE_ATTACK_RANGE,
    ZOMBIE_DMG,
    ZOMBIE_ATTACK_CD,
    WANDER_SPEED,
    WANDER_TURN_MIN,
    WANDER_TURN_MAX,
    makeZombie,
    loadZombiePrefabs,
    loadColliderResolve,
    ensureZombiePopulation,
    trimZombiePopulation,
    resolveZombieCollision,
    zombieHasLineOfSight,
    listZombiePrefabIds,
    getZombiePrefab,
  };
}

module.exports = { createZombieSpawn };
