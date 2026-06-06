/** Archétypes zombie — stats serveur + id prefab client (visuels dans zombie_prefabs.js). */

export const ZOMBIE_PREFABS = Object.freeze({
  zombie_walker: {
    id: 'zombie_walker',
    label: 'Walker',
    health: 100,
    speedMin: 1.8,
    speedMax: 3.2,
    damage: 8,
    attackCd: 0.9,
    detectRange: 12,
    hitRadius: 0.8,
    collideRadius: 0.42,
    scale: 1,
    weight: 55,
  },
  zombie_runner: {
    id: 'zombie_runner',
    label: 'Runner',
    health: 65,
    speedMin: 3.0,
    speedMax: 4.2,
    damage: 6,
    attackCd: 0.7,
    detectRange: 16,
    hitRadius: 0.75,
    collideRadius: 0.38,
    scale: 0.92,
    weight: 25,
  },
  zombie_brute: {
    id: 'zombie_brute',
    label: 'Brute',
    health: 180,
    speedMin: 1.2,
    speedMax: 2.0,
    damage: 14,
    attackCd: 1.2,
    detectRange: 10,
    hitRadius: 1.0,
    collideRadius: 0.52,
    scale: 1.18,
    weight: 20,
  },
});

export function listZombiePrefabIds() {
  return Object.keys(ZOMBIE_PREFABS);
}

export function getZombiePrefab(id) {
  return ZOMBIE_PREFABS[id] || ZOMBIE_PREFABS.zombie_walker;
}

/** Poids relatif par secteur — plus de runners en ville, brutes en base militaire. */
export const ZOMBIE_ZONE_WEIGHTS = Object.freeze({
  forest:    { zombie_walker: 72, zombie_runner: 23, zombie_brute: 5 },
  smalltown: { zombie_walker: 48, zombie_runner: 37, zombie_brute: 15 },
  military:  { zombie_walker: 28, zombie_runner: 32, zombie_brute: 40 },
  maincity:  { zombie_walker: 42, zombie_runner: 43, zombie_brute: 15 },
});

function _pickFromWeightMap(weights) {
  let total = 0;
  for (const w of Object.values(weights)) total += w || 0;
  if (total <= 0) return 'zombie_walker';
  let r = Math.random() * total;
  for (const [id, w] of Object.entries(weights)) {
    if ((r -= w || 0) < 0) return id;
  }
  return 'zombie_walker';
}

export function pickZombiePrefab() {
  const weights = {};
  for (const p of Object.values(ZOMBIE_PREFABS)) weights[p.id] = p.weight || 0;
  return _pickFromWeightMap(weights);
}

export function pickZombiePrefabForZone(zoneName) {
  const weights = ZOMBIE_ZONE_WEIGHTS[zoneName];
  if (!weights) return pickZombiePrefab();
  return _pickFromWeightMap(weights);
}

export function rollZombieSpeed(def) {
  return def.speedMin + Math.random() * Math.max(0, def.speedMax - def.speedMin);
}

/**
 * @param {string} prefabId
 * @param {{ x: number, z: number }} spawn
 * @param {number} id
 */
export function buildZombieEntity(prefabId, spawn, id) {
  const def = getZombiePrefab(prefabId);
  const wanderAngle = Math.random() * Math.PI * 2;
  return {
    id,
    prefabId: def.id,
    x: spawn.x,
    y: 0,
    z: spawn.z,
    health: def.health,
    maxHealth: def.health,
    angle: wanderAngle,
    wanderAngle,
    wanderTimer: 2 + Math.random() * 3,
    aggroTimer: 0,
    attackTimer: 0,
    speed: rollZombieSpeed(def),
    damage: def.damage,
    attackCd: def.attackCd,
    detectRange: def.detectRange,
    hitRadius: def.hitRadius,
    scale: def.scale,
    collideRadius: def.collideRadius,
  };
}
