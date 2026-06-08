/** Spawn plage — bord est map (océan → sable → forêt dense). */

/** Limite joueur / bord carte (sync game.js). */
export const MAP_EAST_X = 295;

/** Rectangle legacy (tests / docs). */
export const BEACH_COAST_RECT = Object.freeze({
  xWest: 244,
  xEast: MAP_EAST_X,
  zSouth: -88,
  zNorth: 88,
});

export const BEACH_CENTER = Object.freeze({
  cx: (BEACH_COAST_RECT.xWest + BEACH_COAST_RECT.xEast) * 0.5,
  cz: -8,
});

/** Ellipse legacy (exclusions rochers / compat). */
export const BEACH_FOOTPRINT = Object.freeze({
  cx: 270,
  cz: -8,
  rx: 26,
  rz: 88,
});

/** Sentier : bord sable → forêt → jonction sud (14, -18). */
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

/** Océan — chevauche légèrement le sable côté est. */
export const BEACH_SEA = Object.freeze({
  cx: 338,
  cz: -8,
  halfW: 48,
  halfD: 340,
  surfaceY: 0.28,
});

/** Ligne côte sable → eau. */
export const BEACH_SHORE_X = MAP_EAST_X - 1;

function _smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Poids 0–1 d'appartenance à la plage — forme en croissant le long de la côte est.
 * Bords adoucis : pas d'angle droit N/S, pas de bande herbe entre sable et eau.
 */
export function beachCoastWeight(x, z) {
  const cz = -8;
  const halfLen = 86;

  const zRel = Math.abs(z - cz);
  const zT = zRel / halfLen;
  if (zT > 1.1) return 0;

  const zEnv = zT <= 0.58 ? 1 : _smoothstep(1.1, 0.58, zT);
  if (zEnv < 0.004) return 0;

  const crescent = 0.3 + 0.7 * zEnv;
  const westCore = BEACH_COAST_RECT.xWest;
  const westTip = westCore + 30 * (1 - zEnv);
  const westX = westCore + (westTip - westCore) * Math.pow(Math.min(1, zT), 1.35);
  const eastX = MAP_EAST_X + 6;
  const westFeather = 17 * crescent;

  if (x < westX - westFeather - 2 || x > eastX + 2) return 0;

  let w = zEnv;

  w *= _smoothstep(westX - westFeather, westX + 2, x);

  if (x > MAP_EAST_X + 1) {
    w *= _smoothstep(eastX + 2, MAP_EAST_X, x);
  }

  return Math.max(0, Math.min(1, w));
}

/** @returns {boolean} point dans la plage (+ marge extérieure en mètres). */
export function isInBeachFootprint(x, z, margin = 0) {
  const cut = Math.max(0.03, 0.11 - margin * 0.045);
  return beachCoastWeight(x, z) >= cut;
}

/** Alias legacy (exclusions rochers). */
export const CAMP_FOOTPRINT = BEACH_FOOTPRINT;
export const isInCampFootprint = isInBeachFootprint;

/** Poids côte minimal pour considérer un point comme « sable de plage » (spawn + zone sûre). */
export const BEACH_SAFE_SAND_MIN_WEIGHT = 0.32;

/**
 * Seuil au-delà duquel on refuse arbres forêt / rochers (sable + lisière).
 * La plage reste réservée aux palmiers et au décor plage.
 */
export const BEACH_FOREST_EXCLUDE_WEIGHT = 0.07;

/** Marge (m) appliquée à isInBeachFootprint pour tampon herbe → sable. */
export const BEACH_FOREST_FOOTPRINT_MARGIN = 5;

/**
 * @returns {boolean} true si arbres forêt (chêne/pin/etc.) et rochers minables sont autorisés.
 */
export function isForestTerrainAllowed(x, z) {
  if (beachCoastWeight(x, z) >= BEACH_FOREST_EXCLUDE_WEIGHT) return false;
  if (isInBeachFootprint(x, z, BEACH_FOREST_FOOTPRINT_MARGIN)) return false;
  return true;
}

/** Zone sûre PvP / vol endormi — même critère que le spawn aléatoire sur le sable. */
export function isOnBeachSafeSand(x, z) {
  return beachCoastWeight(x, z) >= BEACH_SAFE_SAND_MIN_WEIGHT && isInBeachFootprint(x, z, 0);
}

/** Construction joueur interdite si le centre ou l'emprise touche le sable protégé. */
export function isBuildBlockedOnBeach(x, z, halfW = 1.5, halfD = 1.5) {
  const pts = [
    [x, z],
    [x - halfW, z - halfD],
    [x + halfW, z - halfD],
    [x - halfW, z + halfD],
    [x + halfW, z + halfD],
  ];
  return pts.some(([px, pz]) => isOnBeachSafeSand(px, pz));
}

/** Zone de tirage sur le sable (marge eau à l'est, bords N/S adoucis). */
export const BEACH_SPAWN_SAND_RECT = Object.freeze({
  xMin: BEACH_COAST_RECT.xWest + 3,
  xMax: MAP_EAST_X - 10,
  zMin: BEACH_COAST_RECT.zSouth + 12,
  zMax: BEACH_COAST_RECT.zNorth - 12,
});

/**
 * Point de spawn aléatoire sur le sable de la plage (respawn / nouveaux comptes).
 * Rejette l'eau et l'herbe via beachCoastWeight + isInBeachFootprint.
 */
export function pickBeachSpawn(rng = Math.random) {
  const { xMin, xMax, zMin, zMax } = BEACH_SPAWN_SAND_RECT;
  for (let t = 0; t < 64; t++) {
    const x = xMin + rng() * (xMax - xMin);
    const z = zMin + rng() * (zMax - zMin);
    if (isOnBeachSafeSand(x, z)) {
      return {
        x: Math.round(x * 10) / 10,
        y: BEACH_SPAWN.y,
        z: Math.round(z * 10) / 10,
        rotY: BEACH_SPAWN.rotY,
      };
    }
  }
  const zSpread = 22;
  const xSpread = 5;
  return {
    x: BEACH_SPAWN.x + (rng() - 0.5) * xSpread * 2,
    y: BEACH_SPAWN.y,
    z: BEACH_SPAWN.z + (rng() - 0.5) * zSpread * 2,
    rotY: BEACH_SPAWN.rotY,
  };
}
