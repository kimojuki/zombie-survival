import { isOnBeachSafeSand } from './beach-spawn.mjs';

/**
 * Secteur 01 : zone sûre active.
 * Pour l'instant seule la plage de spawn protège PvP, loot de dormeur et survie.
 */
export function isInS01SafeZone(x, z) {
  return isOnBeachSafeSand(x, z);
}
