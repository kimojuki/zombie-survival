// DECOR_PREFABS + registre — extrait de spawn_clearing.js (IIFE)
const DECOR_DOORS = new Map();
  const DECOR_STORAGES = new Map();
  const DECOR_INTERACTS = new Map();

  const INTERACT_ROLE_BY_PREFAB = {
    spawn_bedroll: 'bedroll',
    spawn_single_bed: 'bed',
    spawn_lean_to: 'bedroll',
    spawn_workbench: 'workbench',
    spawn_campfire: 'campfire',
    spawn_beach_starter_torch: 'intro_torch',
    spawn_beach_campfire_ring: 'intro_campfire_torch',
  };
  const DECOR_SIGNS = new Map();
  const DECOR_BUILDS = new Map();
  const _buildRayHits = [];
  const DOOR_OPEN_ANGLE = -Math.PI * 0.52;
  const CHEST_OPEN_ANGLE = Math.PI * 0.62;
  const DOOR_ANIM_SPEED = 3.2;
  const CHEST_ANIM_SPEED = 2.4;

  const DECOR_PREFABS = {
    spawn_campfire: {
      build(root) {
        if (ZS.buildCampfire) ZS.buildCampfire(root, 0, 0, 0);
      },
    },
    spawn_log_pile: { build(root) { _buildLogPile(root, 0, 0, 0); } },
    spawn_border_log: { build(root) { _buildBorderLog(root); } },
    spawn_supply_crate: { build(root) { _buildCrate(root, 0, 0, 0, 0); } },
    spawn_marker_left: { build(root) { _buildMarkerPole(root, 0, 0, 0, -1); } },
    spawn_marker_right: { build(root) { _buildMarkerPole(root, 0, 0, 0, 1); } },
    spawn_bedroll: { build(root) { _buildBedroll(root, 0, 0, 0, 0); } },
    spawn_single_bed: { build(root) { _buildSingleBed(root, 0, 0, 0, 0); } },
    spawn_cabin_table: { build(root) { _buildCabinTable(root, 0, 0, 0, 0); } },
    spawn_cabin_chair: { build(root) { _buildCabinChair(root, 0, 0, 0, 0); } },
    spawn_cabin_shelf: { build(root) { _buildCabinShelf(root, 0, 0, 0, 0); } },
    spawn_cabin_stove: { build(root) { _buildCabinStove(root, 0, 0, 0, 0); } },
    spawn_cabin_lantern: { build(root) { _buildCabinLantern(root, 0, 0, 0, 0); } },
    spawn_cabin_wood_box: { build(root) { _buildCabinWoodBox(root, 0, 0, 0, 0); } },
    spawn_cabin_rug: { build(root) { _buildCabinRug(root, 0, 0, 0, 0); } },
    spawn_cabin_bench: { build(root) { _buildCabinBench(root, 0, 0, 0, 0); } },
    spawn_cabin_basin: { build(root) { _buildCabinBasin(root, 0, 0, 0, 0); } },
    spawn_cabin_wall_clock: { build(root) { _buildCabinWallClock(root, 0, 0, 0, 0); } },
    spawn_cabin_coat_rack: { build(root) { _buildCabinCoatRack(root, 0, 0, 0, 0); } },
    spawn_beach_wreck_debris: { build(root) { _buildBeachWreckDebris(root, 0, 0, 0, 0); } },
    spawn_beach_washed_gear: { build(root) { _buildBeachWashedGear(root, 0, 0, 0, 0); } },
    spawn_beach_driftwood: { build(root) { _buildBeachDriftwood(root, 0, 0, 0, 0); } },
    spawn_backpack: { build(root) { _buildBackpack(root, 0, 0, 0, 0); } },
    spawn_lean_to: { build(root) { _buildLeanToShelter(root, 0, 0, 0, 0); } },
    spawn_stump_seat: { build(root) { _buildStumpSeat(root, 0, 0, 0, 0.20, 0); } },
    spawn_drink_set: { build(root) { _buildDrinkSet(root, 0, 0, 0); } },
    spawn_lantern: { build(root) { _buildLantern(root, 0, 0, 0); } },
    spawn_stone: { build(root) { _buildStone(root, 0, 0, 0, 0.16, 0); } },
    rock_boulder: { build(root, opts) { ZS.RockWorldPrefabs?.buildBoulder?.(root, opts); } },
    rock_outcrop: { build(root, opts) { ZS.RockWorldPrefabs?.buildOutcrop?.(root, opts); } },
    spawn_workbench: { build(root) { _buildWorkbench(root, 0, 0, 0, 0); } },
    storage_chest: { build(root, opts = {}) {
      root.rotation.y = 0;
      const ry = Number.isFinite(opts.rotY) ? opts.rotY : 0;
      _buildStorageChest(root, 0, 0, 0, ry);
    } },
    build_wall_wood: { build(root) { _buildWoodWall(root, 0, 0, 0); }, buildKind: 'wall', w: 3.0, h: 2.6, t: 0.36 },
    build_doorway_wood: { build(root) { _buildWoodDoorway(root, 0, 0, 0, 1.8); }, buildKind: 'door', w: 3.0, h: 2.6, t: 0.36, gap: 1.8 },
    build_large_doorway_wood: { build(root) { _buildWoodDoorway(root, 0, 0, 0, 2.4); }, buildKind: 'door', w: 3.0, h: 2.6, t: 0.36, gap: 2.4 },
    build_floor_wood: { build(root, opts) { _buildWoodFloor(root, 0, 0, 0, opts); }, buildKind: 'floor', w: 3.0, h: 0.18, t: 3.0 },
    build_ceiling_wood: { build(root) { _buildWoodCeiling(root, 0, 0, 0); }, buildKind: 'ceiling', w: 3.0, h: 0.18, t: 3.0 },
    build_stair_wood: { build(root) { _buildWoodStair(root, 0, 0, 0); }, buildKind: 'stair', w: 1.8, h: 2.6, t: 3.0 },
    build_door_wood: { build(root) { _buildWoodDoor(root, 0, 0, 0, 1.8); }, buildKind: 'door', w: 3.0, h: 2.6, t: 0.36 },
    build_large_door_wood: { build(root) { _buildWoodDoor(root, 0, 0, 0, 2.4); }, buildKind: 'door', w: 3.0, h: 2.6, t: 0.36 },
    building_survivor_shack: { build(root) { _buildSurvivorShack(root); } },
    smallcity_house_a: { build(root) { _buildSmallCityHouseA(root); } },
    smallcity_house_b: { build(root) { _buildSmallCityHouseB(root); } },
    spawn_flat_stone: {
      build(root) {
        _add(root, new THREE.BoxGeometry(0.28, 0.06, 0.22),
          new THREE.MeshLambertMaterial({ color: 0x7a7468 }), 0, 0.05, 0);
      },
    },
  };

  const DECOR_PREFAB_META_CLIENT = {};

  function registerDecorPrefab(id, def) {
    if (!id || !def) return;
    DECOR_PREFABS[id] = def;
    if (def.label || def.category || def.desc || def.notes) {
      DECOR_PREFAB_META_CLIENT[id] = {
        label: def.label,
        category: def.category,
        desc: def.desc,
        notes: def.notes,
      };
    }
  }

  function getDecorPrefabMeta() {
    return { ...DECOR_PREFAB_META_CLIENT };
  }

  function listDecorPrefabs() {
    return Object.keys(DECOR_PREFABS);
  }

  /** Yaw décor — coffre : rotation sur le groupe mesh interne, pas le root. */
