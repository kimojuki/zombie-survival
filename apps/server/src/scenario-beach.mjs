import {
  BEACH_SCENARIO_VERSION,
  REVEAL_MS,
  TUTORIAL_FLEE_DIST,
  TUTORIAL_HP_RATIO,
  TUTORIAL_SPEED_RATIO,
  canClientAdvance,
  checkPositionAdvance,
  defaultScenario,
  isAct1Done,
  isInvincibleDuringIntro,
  migrateScenario,
  shouldDelayZombieSync,
  shouldShowOnlyTutorialZombie,
  stepIndex,
  tutorialPosForPlayer,
} from '../../../packages/shared/src/scenario-beach.mjs';

function _normId(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n : id;
}

function _getScenario(p) {
  if (!p.inv || typeof p.inv !== 'object') p.inv = {};
  if (!p.inv.scenario) p.inv.scenario = defaultScenario('act1_done');
  return p.inv.scenario;
}

function _emitUpdate(socket, scenario, extra = {}) {
  if (!socket) return;
  socket.emit('scenario-update', { scenario: { ...scenario }, ...extra });
}

function _setStep(p, socket, step, extra = {}) {
  const sc = _getScenario(p);
  sc.step = step;
  if (step === 'act1_done') {
    sc.completed = true;
    p.invincible = false;
  }
  p.dirty = true;
  _emitUpdate(socket, sc, extra);
}

export function createScenarioBeach(ctx) {
  const {
    zombies,
    makeZombie,
    compactZombiesForSync,
    addGroundItem,
    getNextItemId,
    log,
    normPlayerId = _normId,
  } = ctx;

  function initPlayerScenario(p, savedInv) {
    if (!p.inv || typeof p.inv !== 'object') p.inv = {};
    p.inv.scenario = migrateScenario(savedInv);
    if (isInvincibleDuringIntro(p.inv.scenario)) p.invincible = true;
    return p.inv.scenario;
  }

  function filterZombiesForPlayer(p, list) {
    const sc = p.inv?.scenario;
    if (!sc || isAct1Done(sc)) return list;
    if (shouldDelayZombieSync(sc)) return [];
    if (shouldShowOnlyTutorialZombie(sc)) {
      const tid = sc.tutorialZombieId;
      if (tid == null) return [];
      return list.filter((z) => z.id === tid);
    }
    return list.filter((z) => !z.tutorial || z.ownerPlayerId === normPlayerId(p.id));
  }

  function findTutorialZombie(sc) {
    if (sc.tutorialZombieId == null) return null;
    return zombies.get(sc.tutorialZombieId) || null;
  }

  function removeTutorialZombie(sc) {
    const z = findTutorialZombie(sc);
    if (!z) return;
    zombies.delete(z.id);
    ctx.worldPersist?.scheduleDeleteZombie?.(z.id);
    sc.tutorialZombieId = null;
  }

  function spawnTutorialZombie(p, socket) {
    const sc = _getScenario(p);
    if (sc.tutorialZombieId != null && zombies.has(sc.tutorialZombieId)) return zombies.get(sc.tutorialZombieId);

    removeTutorialZombie(sc);
    const pos = tutorialPosForPlayer(p.id);
    const z = makeZombie({ prefabId: 'zombie_walker', x: pos.x, z: pos.z });
    const maxHp = Math.max(20, Math.round((z.maxHealth || z.health || 100) * TUTORIAL_HP_RATIO));
    z.health = maxHp;
    z.maxHealth = maxHp;
    z.tutorial = true;
    z.ownerPlayerId = normPlayerId(p.id);
    z.frozen = true;
    z.scenarioFrozen = true;
    z.aggroTimer = 0;
    z.baseSpeed = z.speed;
    z.speed = (z.speed || 2) * TUTORIAL_SPEED_RATIO;
    z.tutorialHit = false;
    zombies.set(z.id, z);
    ctx.worldPersist?.scheduleUpsertZombie?.(z);
    sc.tutorialZombieId = z.id;
    p.dirty = true;
    if (socket) socket.emit('zombie-spawn', z);
    return z;
  }

  function ensureTutorialZombie(p, socket) {
    const sc = _getScenario(p);
    if (isAct1Done(sc)) return null;
    if (stepIndex(sc.step) < stepIndex('walk_west')) return null;
    if (stepIndex(sc.step) > stepIndex('fight')) return null;
    if (sc.tutorialKilled) return null;
    return spawnTutorialZombie(p, socket);
  }

  function beginReveal(p, socket) {
    const sc = _getScenario(p);
    if (sc.step !== 'approach') return;
    _setStep(p, socket, 'reveal', { revealScript: true });
    const z = ensureTutorialZombie(p, socket);
    if (z) {
      z.frozen = false;
      z.scenarioFrozen = false;
      z.aggroTimer = 0;
      socket?.emit('zombie-hit', { id: z.id, health: z.health, maxHealth: z.maxHealth, scenarioFrozen: false });
    }
    p._revealFightAt = Date.now() + REVEAL_MS;
    if (p._revealTimer) clearTimeout(p._revealTimer);
    p._revealTimer = setTimeout(() => {
      if (!ctx.players.has(p.socketId)) return;
      const cur = _getScenario(p);
      if (cur.step !== 'reveal') return;
      _setStep(p, socket, 'fight', { combatTutorial: true });
      const tz = findTutorialZombie(cur);
      if (tz) {
        tz.aggroTimer = 5;
        tz.frozen = false;
      }
      p.invincible = false;
    }, REVEAL_MS);
  }

  function advanceFromPosition(p, socket, extra = {}) {
    const sc = _getScenario(p);
    if (isAct1Done(sc)) return;
    const next = checkPositionAdvance(sc.step, p.x, p.z, {
      yawDelta: extra.yawDelta,
      tutorialPos: tutorialPosForPlayer(p.id),
    });
    if (!next) return;

    if (next === 'reveal') {
      beginReveal(p, socket);
      return;
    }

    _setStep(p, socket, next);
    if (next === 'walk_west') ensureTutorialZombie(p, socket);
    if (next === 'silhouette' || next === 'approach') {
      _emitUpdate(socket, sc, { dialogue: next });
    }
  }

  function handleClientAdvance(p, socket, step) {
    const sc = _getScenario(p);
    if (isAct1Done(sc)) return false;
    if (!canClientAdvance(sc.step, step)) return false;
    if (step === 'act1_done' && sc.step === 'epilogue') {
      _setStep(p, socket, 'act1_done', { introComplete: true });
      removeTutorialZombie(sc);
      socket.emit('zombies-snapshot', compactZombiesForSync(filterZombiesForPlayer(p, Array.from(zombies.values()))));
      return true;
    }
    _setStep(p, socket, step);
    if (step === 'intro_stand') {
      p._lastYaw = p.rotY;
    }
    return true;
  }

  function onMove(p, socket, rotY) {
    const sc = _getScenario(p);
    if (isAct1Done(sc)) return;
    let yawDelta = 0;
    if (sc.step === 'breathe' && Number.isFinite(rotY)) {
      if (Number.isFinite(p._lastYaw)) {
        yawDelta = Math.abs(rotY - p._lastYaw);
        if (yawDelta > Math.PI) yawDelta = Math.PI * 2 - yawDelta;
      }
      p._lastYaw = rotY;
    }
    advanceFromPosition(p, socket, { yawDelta });
    if (isInvincibleDuringIntro(sc)) p.invincible = true;
  }

  function onTutorialZombieHit(z) {
    if (!z.tutorial || z.tutorialHit) return;
    z.tutorialHit = true;
    if (z.baseSpeed) z.speed = z.baseSpeed;
  }

  function shouldSkipZombieAi(z, pList) {
    if (z.frozen) return true;
    if (!z.tutorial || z.ownerPlayerId == null) return false;
    const owner = pList.find((p) => normPlayerId(p.id) === normPlayerId(z.ownerPlayerId));
    if (!owner) return true;
    const sc = owner.inv?.scenario;
    if (!sc || isAct1Done(sc)) return true;
    if (sc.step === 'fight') {
      const dist = Math.hypot(owner.x - z.x, owner.z - z.z);
      if (dist > TUTORIAL_FLEE_DIST) {
        z.aggroTimer = 0;
        return true;
      }
    }
    return false;
  }

  function getNearestForTutorial(z, pList) {
    const owner = pList.find((p) => normPlayerId(p.id) === normPlayerId(z.ownerPlayerId));
    if (!owner) return { nearestP: null, nearestDist: Infinity };
    return {
      nearestP: owner,
      nearestDist: Math.hypot(owner.x - z.x, owner.z - z.z),
    };
  }

  function handleTutorialKill(p, socket, hit) {
    const sc = _getScenario(p);
    if (!hit.tutorial || normPlayerId(hit.ownerPlayerId) !== normPlayerId(p.id)) return false;
    sc.tutorialKilled = true;
    sc.tutorialZombieId = null;
    addGroundItem({
      id: getNextItemId(),
      type: 'med_bandage',
      x: hit.x + (Math.random() - 0.5) * 0.8,
      z: hit.z + (Math.random() - 0.5) * 0.8,
    });
    _setStep(p, socket, 'loot', { toast: 'Bandage récupéré — ouvre l\'inventaire pour te soigner plus tard.' });
    p.dirty = true;
    log?.info?.('scenario', 'tutorial zombie killed', { player: p.username });
    return true;
  }

  function onPickup(p, socket, itemType) {
    const sc = _getScenario(p);
    if (isAct1Done(sc) || sc.step !== 'loot') return;
    if (itemType !== 'med_bandage') return;
    _setStep(p, socket, 'epilogue', { epilogue: true });
  }

  function onRespawnDuringIntro(p, socket) {
    const sc = _getScenario(p);
    if (isAct1Done(sc)) return;
    if (stepIndex(sc.step) < stepIndex('fight')) return;
    sc.tutorialKilled = false;
    sc.step = 'fight';
    p.invincible = true;
    setTimeout(() => {
      if (ctx.players.has(p.socketId)) p.invincible = false;
    }, 2000);
    spawnTutorialZombie(p, socket);
    _emitUpdate(socket, sc, { respawnFight: true });
    p.dirty = true;
  }

  function resetScenario(p, socket) {
    removeTutorialZombie(_getScenario(p));
    p.inv.scenario = defaultScenario('intro_wake');
    p.invincible = true;
    _emitUpdate(socket, p.inv.scenario);
    p.dirty = true;
  }

  return {
    initPlayerScenario,
    filterZombiesForPlayer,
    ensureTutorialZombie,
    handleClientAdvance,
    onMove,
    onTutorialZombieHit,
    shouldSkipZombieAi,
    getNearestForTutorial,
    handleTutorialKill,
    onPickup,
    onRespawnDuringIntro,
    resetScenario,
    isAct1Done,
    isInvincibleDuringIntro,
    shouldDelayZombieSync,
    BEACH_SCENARIO_VERSION,
  };
}
