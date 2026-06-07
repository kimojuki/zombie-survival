/** Combat partagé — raycasts XZ, constantes joueur. */

export const PLAYER_COLLIDE_RADIUS = 0.45;
export const PLAYER_HIT_RADIUS = 0.45;

/**
 * Intersection segment (ox,oz)+t*(nx,nz) avec disque (tx,tz).
 * @returns {{ t: number, dist: number } | null}
 */
export function rayHitXZ(ox, oz, nx, nz, range, tx, tz, hitR) {
  const dx = tx - ox;
  const dz = tz - oz;
  const t = dx * nx + dz * nz;
  if (t < 0 || t > range) return null;
  const px = ox + nx * t;
  const pz = oz + nz * t;
  const dist = Math.hypot(px - tx, pz - tz);
  if (dist >= hitR) return null;
  return { t, dist };
}

/**
 * Cible joueur la plus proche le long du rayon (PvP).
 * @param {object} ray { ox, oz, nx, nz, range, radius }
 * @param {Array} players — { socketId, x, z, health, invincible, skip }
 */
export function findPlayerShootTarget(ray, players) {
  return findShootTarget(ray, [], players);
}

/**
 * Cible la plus proche le long du rayon (joueur ou zombie).
 * @param {object} ray { ox, oz, nx, nz, range, radius }
 * @param {Array} zombies
 * @param {Array} players — { socketId, x, z, health, invincible, skip }
 */
export function findShootTarget(ray, zombies, players) {
  let best = null;
  let minT = Infinity;
  const playerR = Math.max(ray.radius || 0, PLAYER_HIT_RADIUS);

  for (const pl of players) {
    if (pl.skip) continue;
    if (pl.health <= 0 || pl.invincible) continue;
    const hit = rayHitXZ(ray.ox, ray.oz, ray.nx, ray.nz, ray.range, pl.x, pl.z, playerR);
    if (hit && hit.t < minT) {
      minT = hit.t;
      best = { kind: 'player', id: pl.socketId, entity: pl };
    }
  }

  for (const z of zombies) {
    const hitR = z.hitRadius || ray.radius || PLAYER_HIT_RADIUS;
    const hit = rayHitXZ(ray.ox, ray.oz, ray.nx, ray.nz, ray.range, z.x, z.z, hitR);
    if (hit && hit.t < minT) {
      minT = hit.t;
      best = { kind: 'zombie', id: z.id, entity: z };
    }
  }

  return best;
}
