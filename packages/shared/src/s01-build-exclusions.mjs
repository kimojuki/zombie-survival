/** Exclusions construction joueur — plage + 10 m autour des POI immuables S01. */

import { BEACH_TRAIL_PTS, isBuildBlockedOnBeach } from './beach-spawn.mjs';
import { S01_BUILD_EXCLUSION_POIS, S01_POI_BUILD_EXCLUSION_R } from './s01-poi.mjs';

/** Bande 10 m à l'ouest de la bouche du sentier (fin plage côté forêt). */
export function isInBeachTrailMouthExclusion(x, z, margin = S01_POI_BUILD_EXCLUSION_R) {
  const [tx, tz] = BEACH_TRAIL_PTS[0];
  const westEdge = tx - margin;
  if (x > tx + 2 || x < westEdge - 4) return false;
  return Math.abs(z - tz) <= margin + 6;
}

export function isInS01PoiBuildExclusion(x, z, halfW = 0, halfD = 0) {
  const corners = [
    [x, z],
    [x - halfW, z - halfD],
    [x + halfW, z - halfD],
    [x - halfW, z + halfD],
    [x + halfW, z + halfD],
  ];
  for (const poi of S01_BUILD_EXCLUSION_POIS) {
    for (const [px, pz] of corners) {
      if (Math.hypot(px - poi.x, pz - poi.z) < poi.r) return true;
    }
  }
  return false;
}

export function isS01BuildBlocked(x, z, halfW = 1.5, halfD = 1.5) {
  if (isBuildBlockedOnBeach(x, z, halfW, halfD)) return true;
  if (isInBeachTrailMouthExclusion(x, z)) return true;
  if (isInS01PoiBuildExclusion(x, z, halfW, halfD)) return true;
  return false;
}
