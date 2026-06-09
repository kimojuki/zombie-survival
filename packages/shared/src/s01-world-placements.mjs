/** Placements decor immuables S01 — ajoutés un par un (seed vide par défaut). */

import {
  S01_BRIDGE,
  S01_CABIN01_PROTO,
  S01_CABIN_NORTH,
  S01_CABIN_SOUTH,
  S01_FOREST_HUB,
  S01_GAS_STATION,
} from './s01-poi.mjs';
import {
  S01_CABIN01_BED_LOCAL,
  cabin01BedWorldXZ,
} from './s01-cabin01-bed.mjs';
import {
  S01_CABIN01_CHEST_LOCAL,
  cabin01ChestWorldXZ,
} from './s01-cabin01-chest.mjs';



export { S01_CABIN01_PROTO } from './s01-poi.mjs';

export const S01_ZONE_ID = 's01_start_forest';



/** Loot basique coffres de départ. */

export const S01_STARTER_CHEST_LOOT = Object.freeze([

  { type: 'food_conserves', qty: 2 },

  { type: 'food_eau_bouteille', qty: 2 },

  { type: 'food_pain', qty: 1 },

  { type: 'med_bandage', qty: 2 },

  { type: 'res_bois_brut', qty: 8 },

  { type: 'res_chiffon', qty: 4 },

]);



export const S01_CABIN_CHEST_LOOT = Object.freeze([

  { type: 'food_haricots_boite', qty: 1 },

  { type: 'food_eau_bouteille', qty: 1 },

  { type: 'res_planche', qty: 3 },

]);



export const S01_GAS_CHEST_LOOT = Object.freeze([

  { type: 'tool_torche', qty: 1 },

  { type: 'food_boisson_energisante', qty: 1 },

  { type: 'res_clous', qty: 6 },

]);



function _p(prefabId, x, z, rotY, key, extra = {}) {

  return {

    kind: 'prefab',

    prefabId,

    x,

    z,

    rotY: rotY || 0,

    scale: 1,

    zoneId: S01_ZONE_ID,

    placementKey: `s01:${key}`,

    immutable: true,

    ...extra,

  };

}



function _chest(x, z, rotY, key, storage, extra = {}) {
  return _p('storage_chest', x, z, rotY, key, {
    storage: storage.map((s) => ({ ...s })),
    storageOpen: false,
    ...extra,
  });
}

function _bed(x, z, rotY, key, extra = {}) {
  return _p('spawn_single_bed', x, z, rotY, key, {
    interactRole: 'bed',
    ...extra,
  });
}



/** @deprecated — réintroduire via étapes incrémentales. */

export function _cabinPlacements(cx, cz, prefix) {

  return [

    _p('building_survivor_shack', cx, cz, 0, `${prefix}:shack`),

    _chest(cx + 2.2, cz - 1.4, -0.5, `${prefix}:chest`, S01_CABIN_CHEST_LOOT),

    _p('spawn_stump_seat', cx - 2.5, cz + 1.8, 0.4, `${prefix}:stump`),

  ];

}



/** @deprecated */

export function _gasStationPlacements() {

  const { x: cx, z: cz } = S01_GAS_STATION;

  return [

    _p('s01_gas_station', cx, cz, Math.PI, 'gas:station'),

    _p('wreck_sedan', cx - 6.5, cz + 2.2, 0.35, 'gas:wreck', {

      wreckVariant: 'rust',

      wreckWheels: 2,

      wreckTilt: 0.08,

    }),

    _chest(cx + 3.5, cz - 2.8, 0.2, 'gas:chest', S01_GAS_CHEST_LOOT),

    _p('road_barrier_post', cx - 12, cz, Math.PI / 2, 'gas:barrier_a'),

    _p('road_barrier_rail', cx - 12, cz, Math.PI / 2, 'gas:barrier_rail', { railLen: 4.2 }),

  ];

}



/** @deprecated */

export function _bridgePlacements() {

  const { x: bx, z: bz } = S01_BRIDGE;

  return [

    _p('road_barrier_post', bx - 2, bz - 3.5, 0, 'bridge:barrier_n'),

    _p('road_barrier_post', bx - 2, bz + 3.5, 0, 'bridge:barrier_s'),

    _p('road_barrier_rail', bx - 2, bz, Math.PI / 2, 'bridge:barrier_rail', { railLen: 7.5 }),

    _p('sign_sector_gate', bx - 3.2, bz, Math.PI / 2, 'bridge:sign'),

  ];

}



/** @deprecated */

export function _hubMarkers() {

  const { x, z } = S01_FOREST_HUB;

  return [

    _p('spawn_stone', x + 1.2, z - 0.8, 0.1, 'hub_cross:stone_a', { groundLift: 0 }),

    _p('spawn_stone', x - 1.1, z + 0.6, 0.3, 'hub_cross:stone_b', { groundLift: 0 }),

    _p('spawn_flat_stone', x, z, 0, 'hub_cross:flat'),

  ];

}



/**

 * Seed S01 vide — POI ajoutés progressivement.

 * @returns {Array<object>}

 */

/** Dégagement arbres autour des bâtiments S01 seedés (m). */
export const S01_BUILDING_TREE_CLEAR_R = 10;

/** Seed S01 actif — voir docs/S01_DECOR_PLACEMENT.md (position, rotY, shackFloorY). */
export function computeS01DecorPlacements() {
  const { x, z, rotY } = S01_CABIN01_PROTO;
  const chest = cabin01ChestWorldXZ();
  const bed = cabin01BedWorldXZ();
  return [
    _p('building_survivor_shack', x, z, rotY, 'cabin01:shack'),
    _chest(chest.x, chest.z, chest.rotY, 'cabin01:chest', S01_CABIN_CHEST_LOOT, {
      shackAnchor: { x, z, rotY },
      shackFloorY: S01_CABIN01_CHEST_LOCAL.floorY,
    }),
    _bed(bed.x, bed.z, bed.rotY, 'cabin01:bed', {
      shackAnchor: { x, z, rotY },
      shackFloorY: S01_CABIN01_BED_LOCAL.floorY,
    }),
  ];
}

/** Zones circulaires sans arbres (seed + regen + purge au boot). */
export function computeS01TreeClearZones() {
  const zones = [];
  for (const p of computeS01DecorPlacements()) {
    if (!p.prefabId?.startsWith('building_')) continue;
    zones.push({
      cx: p.x,
      cz: p.z,
      r: S01_BUILDING_TREE_CLEAR_R,
      placementKey: p.placementKey,
    });
  }
  return zones;
}



export function s01PrefabIds() {

  const ids = new Set();

  for (const p of computeS01DecorPlacements()) {

    if (p.prefabId) ids.add(p.prefabId);

  }

  return [...ids];

}



export function isS01PlacementKey(key) {

  return typeof key === 'string' && key.startsWith('s01:');

}



/** Référence POI (purge boot) — pas seedés tant que computeS01DecorPlacements est vide. */

export const S01_LEGACY_POI_ANCHORS = Object.freeze({

  S01_FOREST_HUB,

  S01_CABIN_NORTH,

  S01_CABIN_SOUTH,

  S01_GAS_STATION,

  S01_BRIDGE,

});

