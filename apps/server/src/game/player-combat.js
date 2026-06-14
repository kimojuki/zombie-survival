'use strict';

const ZOMBIE_DROP_CHANCE = 0.50;
const ZOMBIE_DROP_TYPES = [
  'food_eau_bouteille',
  'food_eau_bouteille',
  'food_sandwich',
  'food_sandwich',
  'food_conserves',
  'med_pilules_anti_infection',
  'med_pilules_anti_infection',
  'med_pilules_anti_infection',
  'med_bandage',
  'ammo_pistolet',
];

/**
 * Combat PvP/PvE, mort joueur/endormi, tir, loot zombie.
 */
function createPlayerCombat(deps) {
  const {
    log,
    io,
    defaultSurvival,
    groundItemTtlMs,
    flattenInv,
    cloneInv,
    normalizeInv,
    normPlayerId,
    isOnBeachSafeSand,
    wakeFromBedSleep,
    emitSurvivalUpdate,
    emitInvAuth,
    saveSleepingToDb,
    addGroundItem,
    dropWorldItem,
    lootQty,
    getNextItemId,
  } = deps;

  function initLifeStats(p, restore) {
    const now = Date.now();
    p.lifeStartedAt = restore?.lifeStartedAt ?? now;
    p.lifeZombieKills = restore?.lifeZombieKills ?? 0;
    p.lifePlayerKills = restore?.lifePlayerKills ?? 0;
  }

  function resetLifeStats(p) {
    p.lifeStartedAt = Date.now();
    p.lifeZombieKills = 0;
    p.lifePlayerKills = 0;
  }

  function lifeRecap(p) {
    const started = p.lifeStartedAt || p.connectedAt || Date.now();
    return {
      zombieKills: p.lifeZombieKills ?? 0,
      playerKills: p.lifePlayerKills ?? 0,
      survivedMs: Math.max(0, Date.now() - started),
      totalKills: p.kills ?? 0,
    };
  }

  function handlePlayerDeath(p) {
    if (p.health > 0 || p._deathHandled) return;
    p._deathHandled = true;
    p.health = 0;
    if (p.inv?.scenario) {
      p._scenarioKeep = { ...p.inv.scenario };
    }
    p._deathInv = cloneInv(p.inv);
    p._deathPos = { x: p.x, y: p.y, z: p.z, rotY: p.rotY };
    p._deathEquipped = p.equipped || null;
    p.inv = normalizeInv({
      hotbar: Array(6).fill(null),
      bag: [],
      equip: { Tête: null, Torso: null, Mains: null, Dos: null },
    });
    p.dirty = true;
    log.info('death', 'player down', {
      player: p.username,
      lootItems: flattenInv(p._deathInv).length,
      pos: { x: +p.x.toFixed(1), z: +p.z.toFixed(1) },
    });
    io.emit('player-death', {
      id: p.socketId,
      playerId: normPlayerId(p.id),
      username: p.username,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      equipped: p._deathEquipped,
      kills: p.kills,
      recap: lifeRecap(p),
    });
    const sock = io.sockets.sockets.get(p.socketId);
    if (sock) {
      emitInvAuth(sock, p);
      emitSurvivalUpdate(sock, p);
    }
  }

  function spawnDeathBagFromPlayer(p) {
    const loot = flattenInv(p._deathInv);
    const pos = p._deathPos;
    if (!loot?.length || !pos) return;
    addGroundItem({
      id: getNextItemId(),
      type: 'death_bag',
      bag: true,
      x: pos.x,
      z: pos.z,
      items: loot,
      expiresAt: Date.now() + groundItemTtlMs,
      owner: p.username,
    });
    log.info('death', 'death bag spawned on respawn', {
      player: p.username,
      items: loot.length,
      pos: { x: +pos.x.toFixed(1), z: +pos.z.toFixed(1) },
    });
  }

  function spawnDeathBagFromSleeper(sleep) {
    const loot = flattenInv(sleep?._deathInv);
    if (!loot?.length || sleep?.x == null) return;
    addGroundItem({
      id: getNextItemId(),
      type: 'death_bag',
      bag: true,
      x: sleep.x,
      z: sleep.z,
      items: loot,
      expiresAt: Date.now() + groundItemTtlMs,
      owner: sleep.username,
    });
    log.info('death', 'death bag spawned on sleeper reconnect', {
      player: sleep.username,
      items: loot.length,
      pos: { x: +sleep.x.toFixed(1), z: +sleep.z.toFixed(1) },
    });
  }

  function handleSleeperDeath(attacker, sleep) {
    if (!sleep || sleep.dead) return;
    sleep.dead = true;
    sleep.health = 0;
    sleep._deathInv = cloneInv(sleep.inv);
    sleep._deathEquipped = sleep.equipped || null;
    sleep.inv = normalizeInv({
      hotbar: Array(6).fill(null),
      bag: [],
      equip: { Tête: null, Torso: null, Mains: null, Dos: null },
    });
    saveSleepingToDb(sleep).catch(() => {});
    log.info('combat', 'sleeper killed', {
      victim: sleep.username,
      killer: attacker?.username || '?',
      pos: { x: +sleep.x.toFixed(1), z: +sleep.z.toFixed(1) },
    });
    io.emit('sleeper-death', {
      playerId: normPlayerId(sleep.playerId),
      username: sleep.username,
      x: sleep.x,
      y: sleep.y,
      z: sleep.z,
      rotY: sleep.rotY,
      equipped: sleep._deathEquipped,
    });
    if (attacker) {
      attacker.kills++;
      attacker.lifePlayerKills = (attacker.lifePlayerKills ?? 0) + 1;
      const atkSock = io.sockets.sockets.get(attacker.socketId);
      if (atkSock) {
        atkSock.emit('score-update', {
          kills: attacker.kills,
          playerKills: attacker.lifePlayerKills ?? 0,
        });
      }
    }
  }

  function applySleeperCombatDamage(attacker, sleep, dmg) {
    if (!sleep || sleep.dead || sleep.health <= 0) return;
    if (isOnBeachSafeSand(sleep.x, sleep.z)) return;
    sleep.health = Math.max(0, sleep.health - dmg);
    saveSleepingToDb(sleep).catch(() => {});
    io.emit('sleeper-hit', {
      playerId: normPlayerId(sleep.playerId),
      health: sleep.health,
    });
    if (sleep.health <= 0) handleSleeperDeath(attacker, sleep);
  }

  function applyPlayerCombatDamage(attacker, target, dmg) {
    if (!target || target.health <= 0 || target._deathHandled) return;
    if (target.invincible) return;
    if (isOnBeachSafeSand(target.x, target.z)) return;
    if (target.bedSleep) wakeFromBedSleep(target, 'damage');
    target.health = Math.max(0, target.health - dmg);
    if (!target.survival) target.survival = { ...defaultSurvival };
    const sv = target.survival;
    if (dmg >= 8 && Math.random() < 0.2) sv.saignement = true;
    target.dirty = true;
    const targetSock = io.sockets.sockets.get(target.socketId);
    if (targetSock) {
      targetSock.emit('take-damage', { dmg, health: target.health });
      emitSurvivalUpdate(targetSock, target);
    }
    io.emit('player-hit', { id: target.socketId, health: target.health });
    if (target.health <= 0) {
      handlePlayerDeath(target);
      if (attacker && attacker.socketId !== target.socketId) {
        attacker.kills++;
        attacker.lifePlayerKills = (attacker.lifePlayerKills ?? 0) + 1;
        const atkSock = io.sockets.sockets.get(attacker.socketId);
        if (atkSock) {
          atkSock.emit('score-update', {
            kills: attacker.kills,
            playerKills: attacker.lifePlayerKills ?? 0,
          });
        }
        log.info('combat', 'pvp kill', { killer: attacker.username, victim: target.username });
      }
    }
  }

  /** Cible la plus proche le long du rayon : joueurs connectés, endormis, puis zombies. */
  function pickShootTarget(ray, combatMod, pvpTargets, zombieList, sleepers) {
    let best = null;
    let minT = Infinity;
    const playerR = Math.max(ray.radius || 0, combatMod.PLAYER_HIT_RADIUS);

    for (const pl of pvpTargets) {
      if (pl.skip || pl.health <= 0 || pl.invincible) continue;
      if (isOnBeachSafeSand(pl.x, pl.z)) continue;
      const hit = combatMod.rayHitXZ(ray.ox, ray.oz, ray.nx, ray.nz, ray.range, pl.x, pl.z, playerR);
      if (hit && hit.t < minT) {
        minT = hit.t;
        best = { kind: 'player', id: pl.socketId };
      }
    }

    for (const sleep of sleepers) {
      if (!sleep || sleep.dead || sleep.health <= 0) continue;
      if (isOnBeachSafeSand(sleep.x, sleep.z)) continue;
      const hit = combatMod.rayHitXZ(ray.ox, ray.oz, ray.nx, ray.nz, ray.range, sleep.x, sleep.z, playerR);
      if (hit && hit.t < minT) {
        minT = hit.t;
        best = { kind: 'sleeper', entity: sleep };
      }
    }

    for (const z of zombieList) {
      const hitR = z.hitRadius || ray.radius || playerR;
      const hit = combatMod.rayHitXZ(ray.ox, ray.oz, ray.nx, ray.nz, ray.range, z.x, z.z, hitR);
      if (hit && hit.t < minT) {
        minT = hit.t;
        best = { kind: 'zombie', id: z.id, entity: z };
      }
    }

    return best;
  }

  function dropZombieKillLoot(hit) {
    if (Math.random() >= ZOMBIE_DROP_CHANCE) return;
    const type = ZOMBIE_DROP_TYPES[Math.floor(Math.random() * ZOMBIE_DROP_TYPES.length)];
    dropWorldItem(type, lootQty(type), hit.x + (Math.random() - 0.5) * 1.6, hit.z + (Math.random() - 0.5) * 1.6);
  }

  return {
    initLifeStats,
    resetLifeStats,
    lifeRecap,
    handlePlayerDeath,
    spawnDeathBagFromPlayer,
    spawnDeathBagFromSleeper,
    handleSleeperDeath,
    applySleeperCombatDamage,
    applyPlayerCombatDamage,
    pickShootTarget,
    dropZombieKillLoot,
  };
}

module.exports = { createPlayerCombat };
