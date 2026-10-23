/**
 * Scoring jobs contenu — distance, anneau, tags gameplay P0, direction mouvement.
 */
import { ContentRing, ringForDelta } from './content-rings.js';

export const ContentJobType = Object.freeze({
  COLLIDER: 'collider',
  DECOR_SPAWN: 'decor-spawn',
  LOD_UPGRADE: 'lod-upgrade',
  ROAD_MESH: 'road-mesh',
  FOREST_CHUNK: 'forest-chunk',
  BEACH_CHUNK: 'beach-chunk',
  TREE_FETCH: 'tree-fetch',
  PROP_FETCH: 'prop-fetch',
});

/** Poids anneau (plus haut = traité en premier). */
const RING_WEIGHT = Object.freeze({
  [ContentRing.CRITICAL]: 1_000_000,
  [ContentRing.NEAR]: 100_000,
  [ContentRing.FAR]: 10_000,
  [ContentRing.STREAM]: 1_000,
});

/** Poids type — collider avant mesh. */
const TYPE_WEIGHT = Object.freeze({
  [ContentJobType.COLLIDER]: 50_000,
  [ContentJobType.DECOR_SPAWN]: 10_000,
  [ContentJobType.LOD_UPGRADE]: 5_000,
  [ContentJobType.ROAD_MESH]: 40_000,
  [ContentJobType.FOREST_CHUNK]: 3_000,
  [ContentJobType.BEACH_CHUNK]: 3_000,
  [ContentJobType.TREE_FETCH]: 2_000,
  [ContentJobType.PROP_FETCH]: 2_000,
});

const P0_PREFAB_PREFIXES = ['tree_palm', 'palm_', 'beach_', 'intro_', 'sign_'];
const P0_PLACEMENT_PREFIXES = ['beach:', 'spawn:', 'trail:'];

/**
 * @param {object} decor — entrée game-init décor
 * @returns {boolean}
 */
export function isP0GameplayDecor(decor) {
  if (!decor) return false;
  if (decor.p0 || decor.critical) return true;
  const pid = String(decor.prefabId || '');
  const pk = String(decor.placementKey || '');
  if (P0_PREFAB_PREFIXES.some((p) => pid.startsWith(p))) return true;
  if (P0_PLACEMENT_PREFIXES.some((p) => pk.startsWith(p))) return true;
  if (pid.includes('trail') || pid.includes('chest') || pid.includes('crate')) return true;
  return false;
}

/**
 * Score plus élevé = priorité plus haute.
 * @param {object} opts
 * @param {number} opts.dx delta X vs source
 * @param {number} opts.dz delta Z vs source
 * @param {typeof ContentJobType[keyof typeof ContentJobType]} [opts.type]
 * @param {object} [opts.payload] décor ou job payload
 * @param {number} [opts.vx] vélocité source (prédiction)
 * @param {number} [opts.vz]
 */
export function scoreContentJob(opts) {
  const dx = opts.dx ?? 0;
  const dz = opts.dz ?? 0;
  const d2 = dx * dx + dz * dz;
  const ring = ringForDelta(dx, dz);
  const type = opts.type ?? ContentJobType.DECOR_SPAWN;
  let score = RING_WEIGHT[ring] ?? 0;
  score += TYPE_WEIGHT[type] ?? 0;

  if (opts.payload && isP0GameplayDecor(opts.payload)) {
    score += 200_000;
  }

  // Proximité : inverse distance² (max ~10k pour d=0)
  score += Math.max(0, 10_000 - Math.min(d2, 10_000));

  // Prédiction mouvement : bonus fort si devant le joueur (L3d prefetch)
  const vx = opts.vx ?? 0;
  const vz = opts.vz ?? 0;
  const speed2 = vx * vx + vz * vz;
  if (speed2 > 0.04) {
    const dot = dx * vx + dz * vz;
    if (dot > 0) score += Math.min(15_000, dot * 4 + speed2 * 80);
  }

  return { score, ring, d2 };
}

/**
 * Bande legacy compat réseau (0 = spawn vis, 1 = stream, 2 = lointain).
 */
export function legacyBandForD2(d2, spawnR2, streamR2) {
  if (d2 <= spawnR2) return 0;
  if (d2 <= streamR2) return 1;
  return 2;
}
