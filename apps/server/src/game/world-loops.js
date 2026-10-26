'use strict';

/**
 * Boucles temps réel — loot expiry, zombie AI/sync, survie, craft, persist.
 */
function createWorldLoops(deps) {
  const state = {
    playerVisibleZombies: new Map(),
    zombieSyncTick: 0,
    lastZombieWallMs: Date.now(),
    lastPosSave: new Map(),
    lastSleeperSave: new Map(),
    playerSpatialGrid: null,
    zombieSpatialGrid: null,
  };
  const api = {};

  const fn = new Function('deps', 'state', 'api', `
    with (deps) {
      with (state) {
// Expiration objets au sol (drops, butins de mort…) — pas le loot permanent des bâtiments.
setInterval(() => {
  const now = Date.now();
  for (const [id, it] of items) {
    if (it.expiresAt && now > it.expiresAt) {
      _removeGroundItem(id);
      log.debug('items', 'ground item expired', {
        id,
        type: it.type,
        bag: !!it.bag,
        owner: it.owner,
      });
    }
  }
}, 60 * 1000);

const ZOMBIE_SYNC_KEYS = ['id', 'x', 'z', 'angle', 'speed', 'health', 'maxHealth', 'prefabId', 'meleeReach', 'collideRadius', 'scenarioFrozen'];

function _compactZombiesForSync(list) {
  const out = new Array(list.length);
  for (let i = 0; i < list.length; i++) {
    const z = list[i];
    const row = {};
    for (let k = 0; k < ZOMBIE_SYNC_KEYS.length; k++) {
      const key = ZOMBIE_SYNC_KEYS[k];
      const val = z[key];
      if (val != null) row[key] = val;
    }
    out[i] = row;
  }
  return out;
}

/** Zombies visibles par client — réduit bande passante et meshes hors rayon (mobile). */
const ZOMBIE_SYNC_RADIUS = 110;
const ZOMBIE_SYNC_RADIUS2 = ZOMBIE_SYNC_RADIUS * ZOMBIE_SYNC_RADIUS;

function _rebuildZombieSpatialGrid(allZ) {
  if (!zombieSpatialGrid || !allZ.length) return;
  const gridItems = new Array(allZ.length);
  for (let i = 0; i < allZ.length; i++) {
    const z = allZ[i];
    gridItems[i] = { data: z, x: z.x, z: z.z };
  }
  zombieSpatialGrid.rebuild(gridItems);
}

function _zombiesNear(px, pz, list) {
  if (zombieSpatialGrid) {
    return zombieSpatialGrid.query(px, pz, ZOMBIE_SYNC_RADIUS);
  }
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const z = list[i];
    const dx = z.x - px;
    const dz = z.z - pz;
    if (dx * dx + dz * dz <= ZOMBIE_SYNC_RADIUS2) out.push(z);
  }
  return out;
}

const ZOMBIE_FULL_SYNC_EVERY = 20;
const ZOMBIE_SYNC_POS_EPS2 = 0.05 * 0.05;
const ZOMBIE_SYNC_ANGLE_EPS = 0.04;
const PLAYER_SPATIAL_QUERY_R = 28;
const PLAYER_MOVE_RADIUS = 150;
const PLAYER_MOVE_GRID_MIN = 16;

function _zombieSyncChanged(z) {
  if (z._syncDirty) return true;
  const sx = z._syncX;
  if (sx == null) return true;
  const dx = z.x - sx;
  const dz = z.z - (z._syncZ ?? 0);
  if (dx * dx + dz * dz > ZOMBIE_SYNC_POS_EPS2) return true;
  let ad = z.angle - (z._syncAngle ?? 0);
  while (ad > Math.PI) ad -= Math.PI * 2;
  while (ad < -Math.PI) ad += Math.PI * 2;
  if (Math.abs(ad) > ZOMBIE_SYNC_ANGLE_EPS) return true;
  if (z.health !== z._syncHealth) return true;
  if (!!z.meleeReach !== !!z._syncMelee) return true;
  if (!!z.scenarioFrozen !== !!z._syncFrozen) return true;
  return false;
}

function _stampZombieSync(z) {
  z._syncX = z.x;
  z._syncZ = z.z;
  z._syncAngle = z.angle;
  z._syncHealth = z.health;
  z._syncMelee = !!z.meleeReach;
  z._syncFrozen = !!z.scenarioFrozen;
  z._syncDirty = false;
}

function _broadcastZombieTick(allZombies, time) {
  if (players.size === 0) return;
  zombieSyncTick++;
  const full = (zombieSyncTick % ZOMBIE_FULL_SYNC_EVERY) === 0;

  for (const pl of players.values()) {
    const sock = io.sockets.sockets.get(pl.socketId);
    if (!sock) continue;
    const near = _zombiesNear(pl.x, pl.z, allZombies);
    let visible = playerVisibleZombies.get(pl.socketId);
    if (!visible) {
      visible = new Set();
      playerVisibleZombies.set(pl.socketId, visible);
    }

    if (full) {
      visible.clear();
      for (let i = 0; i < near.length; i++) visible.add(near[i].id);
      sock.emit('zombie-tick', { zombies: _compactZombiesForSync(near), full: true, time });
      continue;
    }

    const nearIds = new Set();
    for (let i = 0; i < near.length; i++) nearIds.add(near[i].id);

    const removed = [];
    for (const id of visible) {
      if (!nearIds.has(id)) removed.push(id);
    }

    const updates = [];
    for (let i = 0; i < near.length; i++) {
      const z = near[i];
      if (_zombieSyncChanged(z) || !visible.has(z.id)) updates.push(z);
    }

    for (let i = 0; i < removed.length; i++) visible.delete(removed[i]);
    for (let i = 0; i < updates.length; i++) visible.add(updates[i].id);

    if (!updates.length && !removed.length) {
      // Sync horaire allégé quand aucun zombie proche ne bouge (~1 Hz au lieu de 10 Hz).
      if ((zombieSyncTick % 10) === 0) sock.emit('zombie-tick', { time });
      continue;
    }
    sock.emit('zombie-tick', {
      zombies: _compactZombiesForSync(updates),
      removed,
      full: false,
      time,
    });
  }

  for (let i = 0; i < allZombies.length; i++) _stampZombieSync(allZombies[i]);
}


setInterval(() => {
  try {
    resourceRegen()?.tick();
  } catch (err) {
    log.error('regen', 'tick failed', { err: err.message });
  }
}, 5_000);

setInterval(() => {
  try {
    worldPersist?.scheduleWorldState?.({ worldTime: getWorldTime() });
  } catch (err) {
    log.error('world', 'world time persist failed', { err: err.message });
  }
}, 5000);

// Zombie AI — 100ms tick (DT plafonné si event loop en retard — serveur autoritaire)
setInterval(() => {
  const _tickStart = log.isDebug() ? Date.now() : 0;
  const nowMs = Date.now();
  const wallDt = Math.min(0.25, Math.max(0.05, (nowMs - lastZombieWallMs) / 1000));
  lastZombieWallMs = nowMs;
  const DT = wallDt;
  if (serverFlags.autoDay) {
    setWorldTime((getWorldTime() + DT / dayDurationSec) % 1);
  }

  if (players.size === 0) return;
  const pList = Array.from(players.values());
  if (playerSpatialGrid) {
    const gridItems = new Array(pList.length);
    for (let i = 0; i < pList.length; i++) {
      const pl = pList[i];
      gridItems[i] = { data: pl, x: pl.x, z: pl.z };
    }
    playerSpatialGrid.rebuild(gridItems);
  }

  const allZ = Array.from(zombies.values());
  if (!serverFlags.zombieAI) {
    _rebuildZombieSpatialGrid(allZ);
    _broadcastZombieTick(allZ, getWorldTime());
    return;
  }

  zombies.forEach((z) => {
    if (z.frozen) {
      z.meleeReach = false;
      return;
    }
    let nearestDist = Infinity;
    let nearestP = null;
    // Cibles = joueurs connectés uniquement (pas les corps endormis / déco).
    if (z.tutorial && z.ownerPlayerId != null && scenarioBeach) {
      const near = scenarioBeach.getNearestForTutorial(z, pList);
      nearestP = near.nearestP;
      nearestDist = near.nearestDist;
      if (scenarioBeach.shouldSkipZombieAi(z, pList)) return;
    } else if (playerSpatialGrid) {
      const candidates = playerSpatialGrid.query(z.x, z.z, PLAYER_SPATIAL_QUERY_R);
      for (let ci = 0; ci < candidates.length; ci++) {
        const pl = candidates[ci];
        const d = Math.hypot(pl.x - z.x, pl.z - z.z);
        if (d < nearestDist) { nearestDist = d; nearestP = pl; }
      }
    } else {
      for (const pl of pList) {
        const d = Math.hypot(pl.x - z.x, pl.z - z.z);
        if (d < nearestDist) { nearestDist = d; nearestP = pl; }
      }
    }

    const detectRange = z.detectRange || DETECT_RANGE;
    const losRange = detectRange * 1.25;
    const hasLOS = nearestP && nearestDist < losRange
      ? _zombieHasLineOfSight(z.x, z.z, nearestP.x, nearestP.z)
      : false;
    if (nearestDist < detectRange && hasLOS) {
      z.aggroTimer = AGGRO_MEMORY;
      z.lastSeenX = nearestP.x;
      z.lastSeenZ = nearestP.z;
    } else if (z.aggroTimer > 0 && nearestDist < detectRange * 1.25 && !hasLOS) {
      z.aggroTimer = Math.max(0, z.aggroTimer - DT * AGGRO_LOST_SIGHT_DRAIN);
    } else {
      z.aggroTimer = Math.max(0, z.aggroTimer - DT);
    }
    if (nearestP && hasLOS) {
      z.lastSeenX = nearestP.x;
      z.lastSeenZ = nearestP.z;
    }

    // Poursuite tant qu'aggro : la LOS n'est PAS requise pour bouger (arbres/props
    // bloquent souvent la vue et figeaient les zombies en wander). L'attaque reste
    // gated par LOS. Sans joueur visible, chase lastSeen.
    const chaseTx = nearestP ? nearestP.x
      : (Number.isFinite(z.lastSeenX) ? z.lastSeenX : null);
    const chaseTz = nearestP ? nearestP.z
      : (Number.isFinite(z.lastSeenZ) ? z.lastSeenZ : null);

    if (z.aggroTimer > 0 && chaseTx != null && chaseTz != null) {
      const ang = Math.atan2(chaseTz - z.z, chaseTx - z.x);
      z.angle = ang;
      // Déplacement + collision murs/objets (glisse le long, entre par les portes)
      const waterMul = getWaterSlowFactor(z.x, z.z);
      const zR = z.collideRadius || ZOMBIE_R;
      const chase = resolveZombieCollision(z.x + Math.cos(ang) * z.speed * waterMul * DT,
                                           z.z + Math.sin(ang) * z.speed * waterMul * DT,
                                           zR);
      z.x = chase[0];
      z.z = chase[1];
      // Attaque : portée courte + LOS (pas de dégâts à travers les murs)
      z.attackTimer = Math.max(0, (z.attackTimer || 0) - DT);
      const zDmg = z.damage || ZOMBIE_DMG;
      const zCd = z.attackCd || ZOMBIE_ATTACK_CD;
      if (nearestP) {
        const hitDist = Math.hypot(nearestP.x - z.x, nearestP.z - z.z);
        const hitLOS = hitDist < detectRange * 1.5 ? hasLOS : false;
        z.meleeReach = hitDist < ZOMBIE_ATTACK_RANGE + 0.15 && hitLOS;
        if (hitDist < ZOMBIE_ATTACK_RANGE && hitLOS
            && !nearestP.invincible && nearestP.posSynced && z.attackTimer <= 0) {
          z.attackTimer = zCd;
          if (nearestP.bedSleep) _wakeFromBedSleep(nearestP, 'damage');
          nearestP.health = Math.max(0, nearestP.health - zDmg);
          if (!nearestP.survival) nearestP.survival = { ...DEFAULT_SURVIVAL };
          const zSv = nearestP.survival;
          const svMod = getSurvivalMod();
          const biteFx = svMod
            ? svMod.applyZombieMeleeSurvival(zSv, zDmg)
            : { bit: false, infected: false };
          nearestP.dirty = true;
          const hitSock = io.sockets.sockets.get(nearestP.socketId);
          if (hitSock) {
            hitSock.emit('take-damage', {
              dmg: zDmg,
              health: nearestP.health,
              bite: biteFx.bit,
              infected: biteFx.infected,
            });
            _emitSurvivalUpdate(hitSock, nearestP);
          }
          if (nearestP.health <= 0) _handlePlayerDeath(nearestP);
          log.throttled(\`zombie-hit:\${nearestP.username}\`, 2000, () => {
            log.debug('combat', 'zombie hit player', {
              player: nearestP.username,
              prefab: z.prefabId,
              dmg: zDmg,
              health: nearestP.health,
              pos: { x: +nearestP.x.toFixed(1), z: +nearestP.z.toFixed(1) },
            });
          });
        }
      } else {
        z.meleeReach = false;
      }
    } else {
      z.meleeReach = false;
      // Wander slowly — change direction periodically, not every tick
      z.wanderTimer -= DT;
      if (z.wanderTimer <= 0) {
        z.wanderAngle = Math.random() * Math.PI * 2;
        z.wanderTimer = WANDER_TURN_MIN + Math.random() * (WANDER_TURN_MAX - WANDER_TURN_MIN);
      }
      z.angle = z.wanderAngle;
      const waterMul = getWaterSlowFactor(z.x, z.z);
      const wx = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, z.x + Math.cos(z.wanderAngle) * z.speed * WANDER_SPEED * waterMul * DT));
      const wz = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, z.z + Math.sin(z.wanderAngle) * z.speed * WANDER_SPEED * waterMul * DT));
      const zR = z.collideRadius || ZOMBIE_R;
      const wander = resolveZombieCollision(wx, wz, zR);
      z.x = wander[0];
      z.z = wander[1];
    }
  });

  _rebuildZombieSpatialGrid(allZ);
  _broadcastZombieTick(allZ, getWorldTime());
  if (_tickStart) log.tickSummary(zombies, players, Date.now() - _tickStart);
}, 100);

// Maintient la population autour de la cible (trim si excès RCON/persist, top-up si kills)
setInterval(() => {
  if (!serverFlags.zombieSpawn) return;
  if (zombies.size > ZOMBIE_COUNT) {
    _trimZombiePopulation(ZOMBIE_COUNT);
    return;
  }
  if (zombies.size < ZOMBIE_COUNT) {
    ensureZombiePopulation().catch((err) => log.error('ensureZombiePopulation periodic failed', err));
  }
}, 120000);

if (log.PLAYER_SNAPSHOT_MS > 0) {
  setInterval(() => log.playerSnapshot(players), log.PLAYER_SNAPSHOT_MS);
}
if (log.SERVER_STATS_MS > 0) {
  setInterval(() => log.serverStats({
    players: players.size,
    zombies: zombies.size,
    items: items.size,
    structures: structures.size,
    decor: decorItems.size,
    decorDetail: _decorStats(),
    colliders: worldColliders().length,
    lootBuildings: lootBuildings().length,
    waterZones: worldWaterZones().length,
    worldTime: getWorldTime(),
  }), log.SERVER_STATS_MS);
}

// Auto-save position + inventaire (5 s si dirty, 15 s force position)
setInterval(() => {
  const now = Date.now();
  players.forEach((p) => {
    if (!p.id) return;
    const last = lastPosSave.get(p.id) || 0;
    const forcePos = now - last >= 15000;
    if (!p.dirty && !forcePos) return;
    _persistPlayer(p).then(() => { p.dirty = false; lastPosSave.set(p.id, now); });
  });
}, 5000);

// Survie authoritaire (tick 1 s) — connectés : faim/soif + dégâts ; endormis : faim/soif seulement
setInterval(async () => {
  const itemFx = await itemEffectsModPromise;
  const bedMod = await bedSleepModPromise;
  const getMaxHp = (inv) => itemFx.getMaxHealthFromInv(inv, _normalizeInv);
  const now = Date.now();
  players.forEach((p) => {
    _tickGuestCommit(p);
    const sock = io.sockets.sockets.get(p.socketId);
    if (!sock || p.health <= 0 || p._deathHandled) return;
    if (p.bedSleep) {
      bedMod.tickBedSleep(p, 1, getMaxHp);
      p.dirty = true;
      _emitSurvivalUpdate(sock, p);
      return;
    }
    const grace = p._survivalDamageGraceUntil && Date.now() < p._survivalDamageGraceUntil;
    let died = false;
    let dmg = 0;
    if (grace) {
      tickSleeperSurvival(p, 1);
    } else {
      ({ dmg, died } = tickPlayerSurvival(p, 1, getMaxHp));
    }
    if (died) _handlePlayerDeath(p);
    else if (dmg > 0) p.dirty = true;
    _emitSurvivalUpdate(sock, p);
  });
  sleepingPlayers.forEach((sleep) => {
    if (!sleep || sleep.dead || (sleep.health ?? 100) <= 0) return;
    tickSleeperSurvival(sleep, 1);
    sleep.lastSurvivalTickAt = now;
    const key = sleep.playerId;
    const last = lastSleeperSave.get(key) || 0;
    if (now - last >= 5000) {
      _saveSleepingToDb(sleep).catch(() => {});
      lastSleeperSave.set(key, now);
    }
  });
}, 1000);

// File craft authoritaire (tick 100 ms)
setInterval(() => {
  craftQueueMod.tickCraftQueues(players, 0.1, _craftOps);
  players.forEach((p) => {
    if (!p._craftPendingComplete) return;
    const sock = io.sockets.sockets.get(p.socketId);
    const pending = p._craftPendingComplete;
    p._craftPendingComplete = null;
    p.dirty = true;
    if (sock) {
      _emitInvAuth(sock, p);
      sock.emit('craft-complete', pending.job);
      sock.emit('craft-queue-state', craftQueueMod.getCraftQueueState(p));
    }
  });
}, 100);

import(SPATIAL_GRID_URL).then((m) => {
  playerSpatialGrid = m.createSpatialGrid(32);
  zombieSpatialGrid = m.createSpatialGrid(32);
}).catch((err) => log.error('boot', 'spatial grid init failed', { err: err.message }));

function _rebuildPlayerSpatialGrid() {
  if (!playerSpatialGrid) return;
  const gridItems = [];
  for (const pl of players.values()) {
    gridItems.push({ data: pl, x: pl.x, z: pl.z });
  }
  playerSpatialGrid.rebuild(gridItems);
}

function _broadcastPlayerMove(socket, movePkt, x, z) {
  if (playerSpatialGrid && players.size >= PLAYER_MOVE_GRID_MIN) {
    _rebuildPlayerSpatialGrid();
    const recipients = playerSpatialGrid.query(x, z, PLAYER_MOVE_RADIUS);
    for (let i = 0; i < recipients.length; i++) {
      const other = recipients[i];
      if (other.socketId === socket.id) continue;
      const os = io.sockets.sockets.get(other.socketId);
      if (os) os.emit('player-move', movePkt);
    }
    return;
  }
  const moveR2 = PLAYER_MOVE_RADIUS * PLAYER_MOVE_RADIUS;
  for (const [sid, other] of players) {
    if (sid === socket.id) continue;
    const dx = x - other.x;
    const dz = z - other.z;
    if (dx * dx + dz * dz > moveR2) continue;
    const os = io.sockets.sockets.get(other.socketId);
    if (os) os.emit('player-move', movePkt);
  }
}

api.rebuildPlayerSpatialGrid = _rebuildPlayerSpatialGrid;
api.broadcastPlayerMove = _broadcastPlayerMove;
api.playerVisibleZombies = playerVisibleZombies;

      }
    }
  `);
  fn(deps, state, api);

  return {
    get playerVisibleZombies() { return state.playerVisibleZombies; },
    rebuildPlayerSpatialGrid: (...args) => api.rebuildPlayerSpatialGrid(...args),
    broadcastPlayerMove: (...args) => api.broadcastPlayerMove(...args),
  };
}

module.exports = { createWorldLoops };
