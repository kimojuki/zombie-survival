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

/** Prototype cabane #1 — position tentative (voir S01_CABIN01_PROTO). */
export const S01_CABIN01_PROTO = Object.freeze({ x: 108, z: -11 });

/** Cercles d'exclusion construction joueur autour des POI immuables (m). */
export const S01_POI_BUILD_EXCLUSION_R = 10;

/** @deprecated — campements retirés ; conservé pour compat doc. */
export const S01_CAMP_SAFE_RADIUS = 25;

/**
 * Exclusions build autour des POI seed actifs — remplir une entrée par POI validé en jeu.
 * Vide tant qu'aucun POI n'est seed (coords v1 non fiables).
 */
export const S01_BUILD_EXCLUSION_POIS = Object.freeze([]);
