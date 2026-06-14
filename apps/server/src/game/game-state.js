'use strict';

const path = require('path');

const DECOR_PREFAB_BY_ITEM = Object.freeze({
  struct_storage_chest: 'storage_chest',
  struct_mur_bois: 'build_wall_wood',
  struct_mur_embrasure_porte: 'build_doorway_wood',
  struct_mur_embrasure_grande_porte: 'build_large_doorway_wood',
  struct_plancher_bois: 'build_floor_wood',
  struct_plafond_bois: 'build_ceiling_wood',
  struct_escalier_bois: 'build_stair_wood',
  struct_porte_bois: 'build_door_wood',
  struct_grande_porte_bois: 'build_large_door_wood',
});

const DOOR_PREFABS = new Set([
  'building_survivor_shack',
  'build_door_wood',
  'build_large_door_wood',
  'smallcity_house_a',
  'smallcity_house_b',
]);

const STORAGE_CHEST_CAPACITY = 27;
const INTRO_SUITCASE_CAPACITY = 4;
const STORAGE_CHEST_BREAK_HITS = 3;

/**
 * Maps/compteurs monde + prefabs décor (source de vérité game process).
 */
function createGameState(serverDir) {
  return {
    players: new Map(),
    sleepingPlayers: new Map(),
    adminSockets: new Set(),
    zombies: new Map(),
    items: new Map(),
    lootBuildings: [],
    structures: new Map(),
    decorItems: new Map(),
    decorSeq: 1,
    decorPrefabs: [],
    clientPublicJs: path.join(serverDir, '../client/public/js'),
    decorPrefabCatalogCache: [],
    clientDecorPrefabMeta: {},
    DECOR_PREFAB_BY_ITEM,
    DOOR_PREFABS,
    STORAGE_CHEST_CAPACITY,
    INTRO_SUITCASE_CAPACITY,
    STORAGE_CHEST_BREAK_HITS,
    zombieIdCounter: 0,
    itemIdCounter: 0,
    structureIdCounter: 0,
    doorLockSeq: 0,
    worldWaterZones: [],
    worldColliders: [],
    structureColliders: [],
    scenarioBeach: null,
  };
}

module.exports = {
  createGameState,
  DECOR_PREFAB_BY_ITEM,
  DOOR_PREFABS,
  STORAGE_CHEST_CAPACITY,
  INTRO_SUITCASE_CAPACITY,
  STORAGE_CHEST_BREAK_HITS,
};
