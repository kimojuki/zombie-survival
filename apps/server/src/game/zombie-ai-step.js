'use strict';

/**
 * Une étape d'IA zombie (mutates `z`).
 * Extrait pour tests — logique alignée sur world-loops.
 */
function sanitizeZombieRuntime(z, opts = {}) {
  const {
    defaultSpeed = () => 1.8 + Math.random() * 1.4,
  } = opts;
  if (!z) return false;
  // Gel tutoriel uniquement ; tout autre frozen = statue bugée
  if (z.frozen && !z.tutorial) {
    z.frozen = false;
    z.scenarioFrozen = false;
  }
  // Combat tutoriel : ne jamais rester frozen si aggro / fight
  if (z.tutorial && z.frozen && (z.aggroTimer > 0 || z._forceUnfreeze)) {
    z.frozen = false;
    z.scenarioFrozen = false;
  }
  if (!Number.isFinite(z.speed) || z.speed <= 0) {
    z.speed = typeof defaultSpeed === 'function' ? defaultSpeed() : defaultSpeed;
  }
  if (!Number.isFinite(z.wanderAngle)) z.wanderAngle = Math.random() * Math.PI * 2;
  if (!Number.isFinite(z.angle)) z.angle = z.wanderAngle;
  if (!Number.isFinite(z.wanderTimer) || z.wanderTimer < 0) {
    z.wanderTimer = 2 + Math.random() * 3;
  }
  if (!Number.isFinite(z.aggroTimer) || z.aggroTimer < 0) z.aggroTimer = 0;
  if (!Number.isFinite(z.x) || !Number.isFinite(z.z)) return false;
  return true;
}

function _tryMove(z, ang, dist, resolveZombieCollision, zR) {
  const tx = z.x + Math.cos(ang) * dist;
  const tz = z.z + Math.sin(ang) * dist;
  const out = resolveZombieCollision(tx, tz, zR);
  return { x: out[0], z: out[1], moved: Math.hypot(out[0] - z.x, out[1] - z.z) };
}

/**
 * Si coincé dans des colliders, tente glissades puis nudge libre.
 */
function _unstuck(z, resolveZombieCollision, zR) {
  const base = Number.isFinite(z.wanderAngle) ? z.wanderAngle : Math.random() * Math.PI * 2;
  const tries = [0, 0.7, -0.7, 1.5, -1.5, Math.PI];
  for (let i = 0; i < tries.length; i++) {
    const ang = base + tries[i];
    const step = _tryMove(z, ang, 0.85, resolveZombieCollision, zR);
    if (step.moved > 0.2) {
      z.x = step.x;
      z.z = step.z;
      z.wanderAngle = ang;
      z.angle = ang;
      return step.moved;
    }
  }
  // Dernier recours : sortir sans collision (évite statues dans la géométrie)
  const ang = base + Math.PI * (Math.random() * 0.5 - 0.25);
  z.x += Math.cos(ang) * 0.75;
  z.z += Math.sin(ang) * 0.75;
  z.wanderAngle = ang;
  z.angle = ang;
  return 0.75;
}

/**
 * @returns {{ mode: 'frozen'|'chase'|'wander', moved: number }}
 */
function stepZombieAi(z, ctx) {
  const {
    nearestP = null,
    nearestDist = Infinity,
    hasLOS = false,
    DT = 0.1,
    DETECT_RANGE = 12,
    AGGRO_MEMORY = 5,
    AGGRO_LOST_SIGHT_DRAIN = 4,
    WANDER_SPEED = 0.55,
    WANDER_TURN_MIN = 1.2,
    WANDER_TURN_MAX = 3.5,
    WORLD_RADIUS = 500,
    resolveZombieCollision = (x, zz) => [x, zz],
    getWaterSlowFactor = () => 1,
    ZOMBIE_R = 0.5,
  } = ctx;

  if (!sanitizeZombieRuntime(z)) {
    return { mode: 'frozen', moved: 0 };
  }
  if (z.frozen) {
    z.meleeReach = false;
    return { mode: 'frozen', moved: 0 };
  }

  const detectRange = z.detectRange || DETECT_RANGE;
  const prevX = z.x;
  const prevZ = z.z;

  if (nearestDist < detectRange && hasLOS && nearestP) {
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

  const chaseTx = nearestP ? nearestP.x
    : (Number.isFinite(z.lastSeenX) ? z.lastSeenX : null);
  const chaseTz = nearestP ? nearestP.z
    : (Number.isFinite(z.lastSeenZ) ? z.lastSeenZ : null);

  let mode = 'wander';
  const waterMul = getWaterSlowFactor(z.x, z.z);
  const zR = z.collideRadius || ZOMBIE_R;

  if (z.aggroTimer > 0 && chaseTx != null && chaseTz != null) {
    mode = 'chase';
    const ang = Math.atan2(chaseTz - z.z, chaseTx - z.x);
    z.angle = ang;
    const chase = resolveZombieCollision(
      z.x + Math.cos(ang) * z.speed * waterMul * DT,
      z.z + Math.sin(ang) * z.speed * waterMul * DT,
      zR,
    );
    z.x = chase[0];
    z.z = chase[1];
  } else {
    z.meleeReach = false;
    z.wanderTimer -= DT;
    if (z.wanderTimer <= 0) {
      z.wanderAngle = Math.random() * Math.PI * 2;
      z.wanderTimer = WANDER_TURN_MIN + Math.random() * (WANDER_TURN_MAX - WANDER_TURN_MIN);
    }
    z.angle = z.wanderAngle;
    const wx = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS,
      z.x + Math.cos(z.wanderAngle) * z.speed * WANDER_SPEED * waterMul * DT));
    const wz = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS,
      z.z + Math.sin(z.wanderAngle) * z.speed * WANDER_SPEED * waterMul * DT));
    const wander = resolveZombieCollision(wx, wz, zR);
    z.x = wander[0];
    z.z = wander[1];
  }

  if (!Number.isFinite(z.x) || !Number.isFinite(z.z)) {
    z.x = prevX;
    z.z = prevZ;
    return { mode: 'frozen', moved: 0 };
  }

  let moved = Math.hypot(z.x - prevX, z.z - prevZ);

  // Coincé dans murs/arbres → déblocage forcé (sinon statues visibles)
  if (moved < 0.004) {
    z._stuckTicks = (z._stuckTicks || 0) + 1;
    if (z._stuckTicks >= 8) {
      moved = _unstuck(z, resolveZombieCollision, zR);
      z._stuckTicks = 0;
    }
  } else {
    z._stuckTicks = 0;
  }

  // Force sync client même pour petits pas
  if (moved > 0.001) z._syncDirty = true;
  return { mode, moved };
}

module.exports = {
  sanitizeZombieRuntime,
  stepZombieAi,
};
