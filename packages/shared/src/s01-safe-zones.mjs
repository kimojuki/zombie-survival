/** Zones safe S01 — plage uniquement (campements retirés). */

import { isOnBeachSafeSand } from './beach-spawn.mjs';

/** Plage protégée — pas de spawn zombie / PvP endormi. */
export function isInS01SafeZone(x, z) {
  return isOnBeachSafeSand(x, z);
}
