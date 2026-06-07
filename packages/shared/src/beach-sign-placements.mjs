/** Panneaux plage — seed serveur (sortie sable → sentier). */

import { BEACH_TRAIL_PTS, isOnBeachSafeSand } from './beach-spawn.mjs';

export const BEACH_SIGN_PLACEMENT_KEY = 'sign:beach_exit';

/**
 * Panneau à la bouche du sentier (côté sable, face aux naufragés venant de l'est).
 */
export function computeBeachSignPlacements() {
  const [tx, tz] = BEACH_TRAIL_PTS[0];
  return [{
    prefabId: 'sign_beach_exit',
    x: tx + 2.2,
    z: tz - 3.8,
    rotY: -Math.PI / 2,
    scale: 1,
    zoneId: 'beach_signs',
    placementKey: BEACH_SIGN_PLACEMENT_KEY,
    signKind: 'beach_safe_zone',
  }];
}

export function beachSignPrefabIds() {
  return ['sign_beach_exit'];
}
