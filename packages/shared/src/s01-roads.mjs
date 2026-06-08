/** Routes S01 — sentier plage via proc_spawn/Trails ; pas de routes RN forêt (terrain naturel). */



import { BEACH_TRAIL_PTS } from './beach-spawn.mjs';



export const S01_SPAWN_TRAIL_PTS = BEACH_TRAIL_PTS;



/** Vide — les chemins forêt ne sont plus enregistrés dans RoadNetwork. */

export const S01_DIRT_ROADS = Object.freeze([]);

