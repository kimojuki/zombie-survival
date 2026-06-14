/**
 * Anneaux de streaming 2D autour de la StreamingSource (joueur).
 */

export const ContentRing = Object.freeze({
  CRITICAL: 'critical',
  NEAR: 'near',
  FAR: 'far',
  STREAM: 'stream',
});

/** Rayons en mètres (bord extérieur inclusif). */
export const RING_RADIUS = Object.freeze({
  [ContentRing.CRITICAL]: 80,
  [ContentRing.NEAR]: 160,
  [ContentRing.FAR]: 320,
});

const R2 = Object.freeze({
  critical: RING_RADIUS.critical ** 2,
  near: RING_RADIUS.near ** 2,
  far: RING_RADIUS.far ** 2,
});

/**
 * @param {number} dx
 * @param {number} dz
 * @returns {typeof ContentRing[keyof typeof ContentRing]}
 */
export function ringForDelta(dx, dz) {
  const d2 = dx * dx + dz * dz;
  if (d2 <= R2.critical) return ContentRing.CRITICAL;
  if (d2 <= R2.near) return ContentRing.NEAR;
  if (d2 <= R2.far) return ContentRing.FAR;
  return ContentRing.STREAM;
}

/**
 * @param {number} x
 * @param {number} z
 * @param {number} sx source X
 * @param {number} sz source Z
 */
export function ringAt(x, z, sx, sz) {
  return ringForDelta(x - sx, z - sz);
}

export function ringRadius(ring) {
  return RING_RADIUS[ring] ?? RING_RADIUS[ContentRing.STREAM];
}

/** L3c — prune defer : rayon minimum + cap drop par événement. */
export const DEFER_PRUNE = Object.freeze({
  MIN_KEEP_R: RING_RADIUS[ContentRing.FAR] + 96,
  MAX_DROP_PER_EVENT: 80,
});

/** L3d — prefetch prédictif devant le joueur. */
export const PREFETCH = Object.freeze({
  MIN_SPEED: 1.2,
  LEAD_SEC: 2.8,
  LEAD_MAX: 110,
  MIN_AHEAD: 3,
});

/** L3f — surge spawn quand l'anneau CRITICAL/NEAR est en retard. */
export const SURGE = Object.freeze({
  MIN_CRITICAL: 16,
  MIN_NEAR: 14,
  MIN_RING_TOTAL: 24,
  MIN_AHEAD_CRITICAL: 6,
  MIN_AHEAD_TOTAL: 10,
  IDLE_MIN_NEAR: 10,
  MIN_DISK_FAR: 40,
  MIN_SPEED: 0.6,
  DURATION_MS: 12_000,
});

/** L3h — drain-first : stop fetch si disque 320 m plein et NEAR vide. */
export const STREAM = Object.freeze({
  DRAIN_FIRST_DISK: 72,
  DRAIN_FIRST_NEAR_MAX: 6,
  PAUSE_IDLE_SPEED2: 1.44,
});
