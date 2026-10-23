// PREFAB_COLLIDERS A — extrait de decor_colliders.js (IIFE)
const PREFAB_COLLIDERS = {
    spawn_campfire: [
      { type: 'box', lx: 0, lz: 0, hw: 0.52, hd: 0.52, maxY: 0.42 },
    ],
    spawn_log_pile: [
      { type: 'box', lx: 0, lz: 0, hw: 0.42, hd: 0.32, maxY: 0.45 },
    ],
    spawn_border_log: [
      { type: 'box', lx: 0, lz: 0, hw: 0.21, hd: 0.058, maxY: 0.13 },
    ],
    spawn_supply_crate: [
      { type: 'box', lx: 0, lz: 0, hw: 0.40, hd: 0.34, maxY: 0.48 },
    ],
    spawn_bedroll: [
      { type: 'box', lx: 0, lz: 0, hw: 0.38, hd: 0.85, maxY: 0.12 },
    ],
    spawn_single_bed: [
      { type: 'box', lx: 0, lz: 0, hw: 0.46, hd: 0.89, maxY: 0.52 },
    ],
    spawn_cabin_table: [
      { type: 'box', lx: 0, lz: 0, hw: 0.58, hd: 0.36, maxY: 0.76 },
    ],
    spawn_cabin_chair: [
      { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.20, maxY: 0.88 },
    ],
    spawn_cabin_shelf: [
      { type: 'box', lx: 0, lz: 0, hw: 0.40, hd: 0.13, maxY: 1.12 },
    ],
    spawn_cabin_stove: [
      { type: 'box', lx: 0.03, lz: 0.04, hw: 0.28, hd: 0.22, maxY: 1.14 },
    ],
    spawn_cabin_lantern: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.11, minY: 1.52, maxY: 2.35 },
    ],
    spawn_cabin_wood_box: [
      { type: 'box', lx: 0, lz: 0.02, hw: 0.26, hd: 0.18, maxY: 0.72 },
    ],
    spawn_cabin_rug: [
      { type: 'box', lx: 0, lz: 0, hw: 0.49, hd: 0.32, maxY: 0.03 },
    ],
    spawn_cabin_bench: [
      { type: 'box', lx: 0, lz: -0.01, hw: 0.52, hd: 0.19, maxY: 0.88 },
    ],
    spawn_cabin_basin: [
      { type: 'box', lx: 0, lz: 0, hw: 0.25, hd: 0.16, maxY: 1.02 },
    ],
    spawn_cabin_wall_clock: [
      { type: 'box', lx: 0, lz: 0, hw: 0.17, hd: 0.08, minY: 1.0, maxY: 1.72 },
    ],
    spawn_cabin_coat_rack: [
      { type: 'box', lx: 0, lz: -0.02, hw: 0.21, hd: 0.12, minY: 0.45, maxY: 1.55 },
    ],
    spawn_beach_wreck_debris: [
      { type: 'box', lx: 0, lz: 0, hw: 0.52, hd: 0.46, maxY: 0.30 },
    ],
    spawn_beach_washed_gear: [
      { type: 'box', lx: 0, lz: 0.02, hw: 0.34, hd: 0.30, maxY: 0.24 },
    ],
    spawn_beach_driftwood: [
      { type: 'box', lx: 0.02, lz: 0, hw: 0.58, hd: 0.14, maxY: 0.18 },
    ],
    spawn_urban_trash_bin: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.28, topY: 0.78 },
    ],
    spawn_urban_bench: [
      { type: 'box', lx: 0, lz: -0.19, hw: 0.56, hd: 0.24, maxY: 0.58 },
    ],
    spawn_urban_street_lamp: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.08, topY: 3.15 },
    ],
    spawn_urban_fire_hydrant: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.18, topY: 0.78 },
    ],
    spawn_urban_mailbox: [
      { type: 'box', lx: 0, lz: 0, hw: 0.18, hd: 0.14, maxY: 1.22 },
    ],
    spawn_urban_bicycle_rack: [
      { type: 'box', lx: 0, lz: 0, hw: 0.70, hd: 0.12, maxY: 0.32 },
    ],
    spawn_urban_traffic_cone: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.16, topY: 0.42 },
    ],
    spawn_urban_dumpster: [
      { type: 'box', lx: 0, lz: 0, hw: 0.84, hd: 0.50, maxY: 1.22 },
    ],
    spawn_urban_pallet_stack: [
      { type: 'box', lx: 0.02, lz: 0.02, hw: 0.56, hd: 0.44, maxY: 0.78 },
    ],
    spawn_urban_barrel: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.32, topY: 0.84 },
    ],
    spawn_urban_fence_panel: [
      { type: 'box', lx: 0, lz: 0, hw: 0.94, hd: 0.06, maxY: 1.08 },
    ],
    spawn_urban_bollard: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.16, topY: 0.86 },
    ],
    spawn_prop_fridge: [
      { type: 'box', lx: 0, lz: 0, hw: 0.30, hd: 0.30, maxY: 1.65 },
    ],
    spawn_prop_grocery_shelf: [
      { type: 'box', lx: 0, lz: 0, hw: 0.54, hd: 0.20, maxY: 1.75 },
    ],
    spawn_prop_shop_counter: [
      { type: 'box', lx: 0.12, lz: 0.18, hw: 0.92, hd: 0.58, maxY: 0.98 },
    ],
    spawn_prop_sofa: [
      { type: 'box', lx: 0, lz: 0.02, hw: 0.92, hd: 0.40, maxY: 0.88 },
    ],
    spawn_urban_planter: [
      { type: 'box', lx: 0, lz: 0, hw: 0.32, hd: 0.22, maxY: 0.88 },
    ],
    spawn_urban_stop_sign: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.06, topY: 2.15 },
    ],
    spawn_urban_newspaper_box: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.20, maxY: 0.78 },
    ],
    spawn_urban_shopping_cart: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.22, maxY: 1.15 },
    ],
    spawn_urban_vending_machine: [
      { type: 'box', lx: 0, lz: 0, hw: 0.38, hd: 0.30, maxY: 1.75 },
    ],
    spawn_urban_police_barrier: [
      { type: 'box', lx: 0, lz: 0, hw: 0.54, hd: 0.06, maxY: 0.52 },
    ],
    spawn_urban_road_sign: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.06, topY: 2.45 },
    ],
    spawn_urban_propane_tank: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.28, topY: 1.05 },
    ],
    spawn_urban_tire_stack: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.34, topY: 0.68 },
    ],
    spawn_urban_wheelbarrow: [
      { type: 'box', lx: 0, lz: -0.04, hw: 0.34, hd: 0.28, maxY: 0.78 },
    ],
    spawn_urban_abandoned_bike: [
      { type: 'box', lx: 0, lz: 0, hw: 0.48, hd: 0.22, maxY: 0.62 },
    ],
    spawn_prop_office_desk: [
      { type: 'box', lx: 0, lz: 0, hw: 0.62, hd: 0.32, maxY: 0.92 },
    ],
    spawn_prop_office_chair: [
      { type: 'box', lx: 0, lz: 0.02, hw: 0.22, hd: 0.22, maxY: 0.92 },
    ],
    spawn_prop_wardrobe: [
      { type: 'box', lx: 0, lz: 0, hw: 0.54, hd: 0.28, maxY: 1.98 },
    ],
    spawn_prop_kitchen_table: [
      { type: 'box', lx: 0, lz: 0, hw: 0.48, hd: 0.48, maxY: 0.78 },
    ],
    spawn_prop_kitchen_chair: [
      { type: 'box', lx: 0, lz: 0, hw: 0.20, hd: 0.20, maxY: 0.92 },
    ],
    spawn_prop_bookshelf: [
      { type: 'box', lx: 0, lz: 0, hw: 0.42, hd: 0.16, maxY: 1.55 },
    ],
    spawn_prop_tv_old: [
      { type: 'box', lx: 0, lz: 0, hw: 0.26, hd: 0.22, maxY: 0.78 },
    ],
    spawn_prop_washing_machine: [
      { type: 'box', lx: 0, lz: 0, hw: 0.30, hd: 0.30, maxY: 0.84 },
    ],
    spawn_prop_metal_shelf: [
      { type: 'box', lx: 0, lz: 0, hw: 0.70, hd: 0.22, maxY: 1.85 },
    ],
    spawn_prop_workbench: [
      { type: 'box', lx: 0, lz: 0, hw: 0.76, hd: 0.36, maxY: 0.95 },
    ],
