/**
 * POI secteur 01 — ancres monde.
 * Les valeurs ci-dessous sont des **placeholders map v1** : ne pas les utiliser pour seed
 * sans repositionnement en jeu (voir design/secteur/S01_ROADMAP.md).
 */

export const S01_CLEARING = Object.freeze({ x: 0, z: -6 });
export const S01_FOREST_HUB = Object.freeze({ x: 28, z: -42 });
export const S01_ABANDONED_CAMP = Object.freeze({ x: -20, z: 33 });
export const S01_CABIN_NORTH = Object.freeze({ x: -60, z: -70 });
export const S01_CABIN_SOUTH = Object.freeze({ x: -80, z: 42 });
export const S01_GAS_STATION = Object.freeze({ x: 82, z: -100 });
export const S01_BRIDGE = Object.freeze({ x: -90, z: -9 });

/** Cabane #1 — ancre validée playtest 2026-06-08 (Bruno @ 165.1, 7.1). */
export const S01_CABIN01_PROTO = Object.freeze({ x: 165.1, z: 7.1, rotY: 0.55 });

/** Cercles d'exclusion construction joueur autour des POI immuables (m). */
export const S01_POI_BUILD_EXCLUSION_R = 10;

/** @deprecated — campements retirés ; conservé pour compat doc. */
export const S01_CAMP_SAFE_RADIUS = 25;

/** POI seed actifs — une entrée par ancre validée en jeu. */
export const S01_BUILD_EXCLUSION_POIS = Object.freeze([
  { x: 165.1, z: 7.1, r: S01_POI_BUILD_EXCLUSION_R, id: 'cabin01' },
]);
