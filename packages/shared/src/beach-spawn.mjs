/** Spawn plage — bord est map (océan → sable → forêt dense). */

/** Limite joueur / bord carte (sync game.js). */
export const MAP_EAST_X = 295;

/** Rectangle côte est — sable sec jusqu'au bord map (plus d'herbe entre sable/eau). */
export const BEACH_COAST_RECT = Object.freeze({
  xWest: 244,
  xEast: MAP_EAST_X,
  zSouth: -88,
  zNorth: 88,
});

export const BEACH_CENTER = Object.freeze({
  cx: (BEACH_COAST_RECT.xWest + BEACH_COAST_RECT.xEast) * 0.5,
  cz: (BEACH_COAST_RECT.zSouth + BEACH_COAST_RECT.zNorth) * 0.5,
});

/** Ellipse legacy (exclusions rochers / compat). */
export const BEACH_FOOTPRINT = Object.freeze({
  cx: 270,
  cz: -8,
  rx: 26,
  rz: 88,
});

/** Sentier : fin du sable → clairière forêt. */
export const BEACH_TRAIL_PTS = Object.freeze([
  [242, -8],
  [215, -8],
  [175, -7],
  [130, -6],
  [85, -6],
  [45, -6],
  [0, -6],
  [14, -18],
]);

/** Réveil sur le sable (côté ouest), face à la forêt. */
export const BEACH_SPAWN = Object.freeze({
  x: 248,
  y: 1,
  z: -8,
  rotY: Math.PI / 2,
});

export const BEACH_ZOMBIE_RING = Object.freeze({
  count: 12,
  rMin: 45,
  rMax: 130,
});

/** Océan — chevauche légèrement le sable côté est (plus de bande herbe). */
export const BEACH_SEA = Object.freeze({
  cx: 338,
  cz: -8,
  halfW: 48,
  halfD: 340,
  surfaceY: 0.28,
});

/** Ligne côte sable → eau. */
export const BEACH_SHORE_X = BEACH_COAST_RECT.xEast - 2;

/** @returns {boolean} point dans la bande plage (+ marge). */
export function isInBeachFootprint(x, z, margin = 0) {
  const m = margin;
  return x >= BEACH_COAST_RECT.xWest - m
    && x <= BEACH_COAST_RECT.xEast + m
    && z >= BEACH_COAST_RECT.zSouth - m
    && z <= BEACH_COAST_RECT.zNorth + m;
}

/** Alias legacy (exclusions rochers). */
export const CAMP_FOOTPRINT = BEACH_FOOTPRINT;
export const isInCampFootprint = isInBeachFootprint;

/** Jitter léger le long de la côte (respawn / nouveaux comptes). */
export function pickBeachSpawn(rng = Math.random) {
  const zSpread = 22;
  const xSpread = 5;
  return {
    x: BEACH_SPAWN.x + (rng() - 0.5) * xSpread * 2,
    y: BEACH_SPAWN.y,
    z: BEACH_SPAWN.z + (rng() - 0.5) * zSpread * 2,
    rotY: BEACH_SPAWN.rotY,
  };
}
