/** Spawn plage côte est (style Rust) — source partagée client / serveur / tests. */

export const BEACH_CENTER = Object.freeze({ cx: 252, cz: 8 });

/** Ellipse sable + exclusion ressources procédurales. */
export const BEACH_FOOTPRINT = Object.freeze({
  cx: 252,
  cz: 8,
  rx: 32,
  rz: 58,
});

/** Point de spawn joueur (face l'intérieur, ouest). */
export const BEACH_SPAWN = Object.freeze({
  x: 234,
  y: 1,
  z: 8,
  rotY: Math.PI / 2,
});

export const BEACH_ZOMBIE_RING = Object.freeze({
  count: 12,
  rMin: 45,
  rMax: 130,
});

/** Mer (côté est de la plage). */
export const BEACH_SEA = Object.freeze({
  cx: 278,
  cz: 8,
  halfW: 18,
  halfD: 62,
  surfaceY: 0.35,
});

/** @returns {boolean} point dans l'ellipse plage (+ marge). */
export function isInBeachFootprint(x, z, margin = 0) {
  const dx = (x - BEACH_FOOTPRINT.cx) / (BEACH_FOOTPRINT.rx + margin);
  const dz = (z - BEACH_FOOTPRINT.cz) / (BEACH_FOOTPRINT.rz + margin);
  return Math.hypot(dx, dz) <= 1;
}

/** Alias legacy (exclusions rochers). */
export const CAMP_FOOTPRINT = BEACH_FOOTPRINT;
export const isInCampFootprint = isInBeachFootprint;

/** Jitter léger le long de la côte (respawn / nouveaux comptes). */
export function pickBeachSpawn(rng = Math.random) {
  const zSpread = 24;
  const xSpread = 6;
  return {
    x: BEACH_SPAWN.x + (rng() - 0.5) * xSpread * 2,
    y: BEACH_SPAWN.y,
    z: BEACH_SPAWN.z + (rng() - 0.5) * zSpread * 2,
    rotY: BEACH_SPAWN.rotY,
  };
}
