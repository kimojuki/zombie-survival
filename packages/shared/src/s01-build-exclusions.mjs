import { isBuildBlockedOnBeach } from './beach-spawn.mjs';

/**
 * Secteur 01 : zones où la construction joueur est bloquée.
 * La map S01 a été nettoyée ; on conserve seulement la protection de la plage spawn.
 */
export function isS01BuildBlocked(x, z, halfW = 1.5, halfD = 1.5) {
  return isBuildBlockedOnBeach(x, z, halfW, halfD);
}
