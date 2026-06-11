// Collisions 2D (XZ) pour décors prefab / item — local → monde avec rotY + scale.
(function () {
  'use strict';

  // Offsets locaux (lx, lz) relatifs au pivot du décor. minY/maxY = bande verticale active (monde = baseY + offset).
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
    spawn_prop_double_bed: [
      { type: 'box', lx: 0, lz: 0, hw: 0.72, hd: 0.98, maxY: 0.48 },
    ],
    spawn_prop_nightstand: [
      { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.20, maxY: 0.78 },
    ],
    spawn_prop_dresser: [
      { type: 'box', lx: 0, lz: 0, hw: 0.48, hd: 0.22, maxY: 0.88 },
    ],
    spawn_prop_microwave: [
      { type: 'box', lx: 0, lz: 0, hw: 0.26, hd: 0.20, maxY: 0.30 },
    ],
    spawn_prop_stove: [
      { type: 'box', lx: 0, lz: 0, hw: 0.30, hd: 0.30, maxY: 0.90 },
    ],
    spawn_prop_kitchen_sink: [
      { type: 'box', lx: 0, lz: 0, hw: 0.44, hd: 0.28, maxY: 1.05 },
    ],
    spawn_prop_floor_lamp: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.12, topY: 1.65 },
    ],
    spawn_prop_rug_urban: [
      { type: 'box', lx: 0, lz: 0, hw: 0.82, hd: 0.55, maxY: 0.03 },
    ],
    spawn_urban_atm: [
      { type: 'box', lx: 0, lz: 0, hw: 0.38, hd: 0.26, maxY: 1.55 },
    ],
    spawn_urban_phone_booth: [
      { type: 'box', lx: 0, lz: 0, hw: 0.48, hd: 0.48, maxY: 2.12 },
    ],
    spawn_urban_picnic_table: [
      { type: 'box', lx: 0, lz: 0.06, hw: 0.78, hd: 0.38, maxY: 0.78 },
    ],
    spawn_urban_trash_pile: [
      { type: 'box', lx: 0, lz: 0, hw: 0.32, hd: 0.28, maxY: 0.42 },
    ],
    spawn_urban_wood_crate: [
      { type: 'box', lx: 0, lz: 0, hw: 0.32, hd: 0.32, maxY: 0.50 },
    ],
    spawn_urban_generator: [
      { type: 'box', lx: 0, lz: 0, hw: 0.38, hd: 0.26, maxY: 0.68 },
    ],
    spawn_urban_fuel_cans: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.22, maxY: 0.38 },
    ],
    spawn_urban_bbq_grill: [
      { type: 'box', lx: 0, lz: 0, hw: 0.42, hd: 0.26, maxY: 0.92 },
    ],
    spawn_urban_tool_cabinet: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.20, maxY: 0.95 },
    ],
    spawn_prop_bathtub: [
      { type: 'box', lx: 0, lz: 0, hw: 0.78, hd: 0.36, maxY: 0.55 },
    ],
    spawn_urban_bus_shelter: [
      { type: 'box', lx: 0, lz: 0.02, hw: 1.16, hd: 0.42, maxY: 2.22 },
    ],
    spawn_urban_window_ac: [
      { type: 'box', lx: 0, lz: 0, hw: 0.30, hd: 0.28, maxY: 0.40 },
    ],
    spawn_prop_toilet: [
      { type: 'box', lx: 0, lz: 0.02, hw: 0.22, hd: 0.28, maxY: 0.78 },
    ],
    spawn_prop_bathroom_sink: [
      { type: 'box', lx: 0, lz: 0, hw: 0.26, hd: 0.20, maxY: 1.08 },
    ],
    spawn_prop_coffee_table: [
      { type: 'box', lx: 0, lz: 0, hw: 0.48, hd: 0.28, maxY: 0.45 },
    ],
    spawn_prop_dining_table: [
      { type: 'box', lx: 0, lz: 0, hw: 0.78, hd: 0.42, maxY: 0.78 },
    ],
    spawn_prop_bunk_bed: [
      { type: 'box', lx: 0, lz: 0, hw: 0.48, hd: 0.92, maxY: 1.48 },
    ],
    spawn_prop_filing_cabinet: [
      { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.30, maxY: 1.25 },
    ],
    spawn_prop_safe: [
      { type: 'box', lx: 0, lz: 0, hw: 0.26, hd: 0.26, maxY: 0.60 },
    ],
    spawn_urban_gas_pump: [
      { type: 'box', lx: 0, lz: 0, hw: 0.32, hd: 0.24, maxY: 1.70 },
    ],
    spawn_urban_parking_meter: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.08, topY: 1.35 },
    ],
    spawn_urban_street_clock: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.10, topY: 2.75 },
    ],
    spawn_urban_fire_extinguisher: [
      { type: 'box', lx: 0, lz: 0, hw: 0.10, hd: 0.08, maxY: 0.82 },
    ],
    spawn_prop_water_cooler: [
      { type: 'box', lx: 0, lz: 0, hw: 0.18, hd: 0.18, maxY: 1.30 },
    ],
    spawn_prop_office_printer: [
      { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.20, maxY: 0.38 },
    ],
    spawn_urban_satellite_dish: [
      { type: 'cyl', lx: 0.08, lz: 0.18, r: 0.46, topY: 2.05 },
      { type: 'cyl', lx: 0, lz: 0, r: 0.06, topY: 1.90 },
    ],
    spawn_prop_mattress_floor: [
      { type: 'box', lx: 0, lz: 0, hw: 0.48, hd: 0.88, maxY: 0.18 },
    ],
    spawn_urban_beer_crate: [
      { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.16, maxY: 0.35 },
    ],
    spawn_prop_coat_rack_urban: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.12, topY: 1.68 },
    ],
    spawn_urban_pallet_single: [
      { type: 'box', lx: 0, lz: 0, hw: 0.52, hd: 0.38, maxY: 0.16 },
    ],
    spawn_prop_medicine_cabinet: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.08, minY: 0.5, maxY: 1.15 },
    ],
    spawn_urban_cardboard_box: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.22, maxY: 0.40 },
    ],
    spawn_prop_dryer: [
      { type: 'box', lx: 0, lz: 0, hw: 0.30, hd: 0.30, maxY: 0.84 },
    ],
    spawn_prop_radiator: [
      { type: 'box', lx: 0, lz: 0, hw: 0.42, hd: 0.08, maxY: 0.55 },
    ],
    spawn_prop_floor_fan: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.14, topY: 0.98 },
    ],
    spawn_prop_dishwasher: [
      { type: 'box', lx: 0, lz: 0, hw: 0.30, hd: 0.30, maxY: 0.84 },
    ],
    spawn_prop_ironing_board: [
      { type: 'box', lx: 0, lz: 0, hw: 0.18, hd: 0.58, maxY: 0.85 },
    ],
    spawn_prop_wall_mirror: [
      { type: 'box', lx: 0, lz: 0, hw: 0.32, hd: 0.04, minY: 0.2, maxY: 1.0 },
    ],
    spawn_prop_shower_stall: [
      { type: 'box', lx: 0, lz: 0, hw: 0.46, hd: 0.46, maxY: 1.95 },
    ],
    spawn_urban_urinal: [
      { type: 'box', lx: 0, lz: 0, hw: 0.18, hd: 0.16, maxY: 1.08 },
    ],
    spawn_urban_locker: [
      { type: 'box', lx: 0, lz: 0, hw: 0.44, hd: 0.20, maxY: 1.55 },
    ],
    spawn_prop_school_desk: [
      { type: 'box', lx: 0, lz: 0.04, hw: 0.32, hd: 0.28, maxY: 0.75 },
    ],
    spawn_urban_jersey_barrier: [
      { type: 'box', lx: 0, lz: 0, hw: 0.72, hd: 0.26, maxY: 0.58 },
    ],
    spawn_urban_hand_truck: [
      { type: 'box', lx: 0, lz: -0.08, hw: 0.22, hd: 0.18, maxY: 1.12 },
    ],
    spawn_urban_shopping_basket: [
      { type: 'box', lx: 0, lz: 0, hw: 0.20, hd: 0.16, maxY: 0.42 },
    ],
    spawn_urban_snack_machine: [
      { type: 'box', lx: 0, lz: 0, hw: 0.36, hd: 0.28, maxY: 1.55 },
    ],
    spawn_prop_barber_chair: [
      { type: 'box', lx: 0, lz: 0.02, hw: 0.26, hd: 0.24, maxY: 0.92 },
    ],
    spawn_urban_clothesline: [
      { type: 'box', lx: 0, lz: 0, hw: 1.12, hd: 0.08, maxY: 1.48 },
    ],
    spawn_prop_sun_lounger: [
      { type: 'box', lx: 0, lz: -0.08, hw: 0.30, hd: 0.82, maxY: 0.55 },
    ],
    spawn_urban_patio_umbrella: [
      { type: 'cyl', lx: 0, lz: 0, r: 1.15, topY: 2.12 },
    ],
    spawn_prop_upright_piano: [
      { type: 'box', lx: 0, lz: 0, hw: 0.66, hd: 0.30, maxY: 1.25 },
    ],
    spawn_urban_manhole: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.40, topY: 0.08 },
    ],
    spawn_prop_chest_freezer: [
      { type: 'box', lx: 0, lz: 0, hw: 0.48, hd: 0.32, maxY: 0.80 },
    ],
    spawn_prop_kitchen_cabinet: [
      { type: 'box', lx: 0, lz: 0, hw: 0.32, hd: 0.18, maxY: 0.75 },
    ],
    spawn_prop_indoor_trash: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.20, topY: 0.48 },
    ],
    spawn_urban_speed_bump: [
      { type: 'box', lx: 0, lz: 0, hw: 1.42, hd: 0.22, maxY: 0.10 },
    ],
    spawn_urban_fence_post: [
      { type: 'box', lx: 0, lz: 0, hw: 0.42, hd: 0.06, maxY: 1.48 },
    ],
    spawn_urban_store_awning: [
      { type: 'box', lx: 0, lz: 0.18, hw: 1.12, hd: 0.38, minY: 2.0, maxY: 2.42 },
    ],
    spawn_prop_baby_crib: [
      { type: 'box', lx: 0, lz: 0, hw: 0.38, hd: 0.58, maxY: 0.68 },
    ],
    spawn_prop_wheelchair: [
      { type: 'box', lx: 0, lz: 0.02, hw: 0.28, hd: 0.28, maxY: 0.72 },
    ],
    spawn_prop_hospital_bed: [
      { type: 'box', lx: 0, lz: 0, hw: 0.48, hd: 0.98, maxY: 0.72 },
    ],
    spawn_prop_gurney: [
      { type: 'box', lx: 0, lz: 0, hw: 0.32, hd: 0.88, maxY: 0.82 },
    ],
    spawn_prop_slot_machine: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.26, maxY: 1.45 },
    ],
    spawn_prop_arcade_cabinet: [
      { type: 'box', lx: 0, lz: 0, hw: 0.32, hd: 0.30, maxY: 1.55 },
    ],
    spawn_prop_desk_lamp: [
      { type: 'box', lx: 0.10, lz: 0, hw: 0.18, hd: 0.12, maxY: 0.38 },
    ],
    spawn_prop_space_heater: [
      { type: 'box', lx: 0, lz: 0, hw: 0.18, hd: 0.12, maxY: 0.44 },
    ],
    spawn_urban_mail_drop_box: [
      { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.16, maxY: 0.55 },
    ],
    spawn_urban_fire_hose_cabinet: [
      { type: 'box', lx: 0, lz: 0, hw: 0.32, hd: 0.10, maxY: 0.75 },
    ],
    spawn_prop_pool_table: [
      { type: 'box', lx: 0, lz: 0, hw: 0.76, hd: 0.40, maxY: 0.85 },
    ],
    spawn_prop_treadmill: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.68, maxY: 0.92 },
    ],
    spawn_urban_bakery_rack: [
      { type: 'box', lx: 0, lz: 0, hw: 0.44, hd: 0.20, maxY: 1.35 },
    ],
    spawn_prop_clothes_rack: [
      { type: 'box', lx: 0, lz: 0, hw: 0.58, hd: 0.22, maxY: 1.45 },
    ],
    spawn_prop_hair_dryer: [
      { type: 'box', lx: 0, lz: -0.04, hw: 0.08, hd: 0.06, minY: 0.8, maxY: 1.48 },
    ],
    spawn_urban_ev_charger: [
      { type: 'box', lx: 0, lz: 0, hw: 0.18, hd: 0.12, maxY: 0.62 },
    ],
    spawn_prop_exercise_bike: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.42, maxY: 0.92 },
    ],
    spawn_prop_weight_bench: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.68, maxY: 0.95 },
    ],
    spawn_prop_cash_register: [
      { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.18, maxY: 0.32 },
    ],
    spawn_prop_display_fridge: [
      { type: 'box', lx: 0, lz: 0, hw: 0.38, hd: 0.34, maxY: 1.85 },
    ],
    spawn_urban_recycling_dumpster: [
      { type: 'box', lx: 0, lz: 0, hw: 0.82, hd: 0.50, maxY: 1.12 },
    ],
    spawn_prop_dentist_chair: [
      { type: 'box', lx: 0, lz: 0, hw: 0.32, hd: 0.38, maxY: 0.95 },
    ],
    spawn_prop_iv_stand: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.22, topY: 1.65 },
    ],
    spawn_prop_computer_tower: [
      { type: 'box', lx: 0, lz: 0, hw: 0.12, hd: 0.20, maxY: 0.44 },
    ],
    spawn_prop_whiteboard: [
      { type: 'box', lx: 0, lz: 0, hw: 0.64, hd: 0.44, minY: 0.35, maxY: 0.68 },
    ],
    spawn_prop_cork_board: [
      { type: 'box', lx: 0, lz: 0, hw: 0.44, hd: 0.34, minY: 0.0, maxY: 0.65 },
    ],
    spawn_urban_pay_phone: [
      { type: 'box', lx: 0, lz: 0, hw: 0.16, hd: 0.08, minY: 0.0, maxY: 0.52 },
    ],
    spawn_urban_recycle_bin_dual: [
      { type: 'box', lx: 0, lz: 0, hw: 0.42, hd: 0.18, maxY: 0.55 },
    ],
    spawn_prop_book_stack: [
      { type: 'box', lx: 0, lz: 0, hw: 0.18, hd: 0.14, maxY: 0.32 },
    ],
    spawn_prop_wall_tv: [
      { type: 'box', lx: 0, lz: 0, hw: 0.58, hd: 0.36, minY: 0.38, maxY: 0.78 },
    ],
    spawn_urban_led_sign: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.08, topY: 2.62 },
      { type: 'box', lx: 0, lz: 0, hw: 0.44, hd: 0.06, minY: 2.15, maxY: 2.62 },
    ],
    spawn_prop_grandfather_clock: [
      { type: 'box', lx: 0, lz: 0, hw: 0.24, hd: 0.16, maxY: 1.95 },
    ],
    spawn_prop_kitchen_island: [
      { type: 'box', lx: 0, lz: 0, hw: 0.66, hd: 0.36, maxY: 0.95 },
    ],
    spawn_game_dartboard: [
      { type: 'box', lx: 0, lz: 0, hw: 0.26, hd: 0.06, minY: 1.2, maxY: 1.48 },
    ],
    spawn_game_foosball: [
      { type: 'box', lx: 0, lz: 0, hw: 0.64, hd: 0.34, maxY: 0.88 },
    ],
    spawn_game_ping_pong: [
      { type: 'box', lx: 0, lz: 0, hw: 0.80, hd: 0.44, maxY: 0.88 },
    ],
    spawn_game_chess_table: [
      { type: 'box', lx: 0, lz: 0, hw: 0.34, hd: 0.34, maxY: 0.82 },
    ],
    spawn_game_poker_table: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.58, topY: 0.82 },
    ],
    spawn_game_jenga: [
      { type: 'box', lx: 0, lz: 0, hw: 0.12, hd: 0.12, maxY: 0.26 },
    ],
    spawn_game_pinball: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.54, maxY: 0.95 },
    ],
    spawn_game_bowling_pins: [
      { type: 'box', lx: 0, lz: 0, hw: 0.38, hd: 0.38, maxY: 0.28 },
    ],
    spawn_game_petanque: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.22, topY: 0.08 },
    ],
    spawn_sport_basketball_hoop: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.08, topY: 2.85 },
      { type: 'box', lx: 0, lz: -0.12, hw: 0.40, hd: 0.06, minY: 2.4, maxY: 2.85 },
    ],
    spawn_sport_soccer_goal: [
      { type: 'box', lx: 0, lz: 0, hw: 1.15, hd: 0.08, maxY: 1.28 },
    ],
    spawn_sport_punching_bag: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.24, topY: 1.02 },
    ],
    spawn_sport_tennis_net: [
      { type: 'box', lx: 0, lz: 0, hw: 5.25, hd: 0.06, maxY: 0.98 },
    ],
    spawn_sport_golf_bag: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.20, topY: 0.88 },
    ],
    spawn_sport_skateboard: [
      { type: 'box', lx: 0, lz: 0, hw: 0.38, hd: 0.12, maxY: 0.12 },
    ],
    spawn_sport_surfboard: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.88, maxY: 0.18 },
    ],
    spawn_loisir_fishing_rod: [
      { type: 'box', lx: 0, lz: 0.04, hw: 0.12, hd: 0.22, maxY: 0.82 },
    ],
    spawn_loisir_camping_tent: [
      { type: 'box', lx: 0, lz: 0, hw: 0.72, hd: 0.72, maxY: 1.15 },
    ],
    spawn_loisir_hammock: [
      { type: 'box', lx: 0, lz: 0, hw: 1.48, hd: 0.42, minY: 0.85, maxY: 1.05 },
      { type: 'cyl', lx: -1.42, lz: 0, r: 0.08, topY: 1.70 },
      { type: 'cyl', lx: 1.42, lz: 0, r: 0.08, topY: 1.70 },
    ],
    spawn_loisir_acoustic_guitar: [
      { type: 'box', lx: 0, lz: 0, hw: 0.16, hd: 0.12, maxY: 0.62 },
    ],
    spawn_loisir_playground_slide: [
      { type: 'box', lx: 0, lz: 0, hw: 0.48, hd: 0.38, maxY: 1.88 },
    ],
    spawn_game_shuffleboard: [
      { type: 'box', lx: 0, lz: 0, hw: 1.45, hd: 0.28, maxY: 0.90 },
    ],
    spawn_game_air_hockey: [
      { type: 'box', lx: 0, lz: 0, hw: 0.74, hd: 0.44, maxY: 0.85 },
    ],
    spawn_game_croquet: [
      { type: 'box', lx: 0, lz: 0, hw: 0.38, hd: 0.28, maxY: 0.35 },
    ],
    spawn_game_horseshoes: [
      { type: 'box', lx: 0, lz: 0, hw: 0.44, hd: 0.34, maxY: 0.18 },
    ],
    spawn_sport_volleyball_net: [
      { type: 'box', lx: 0, lz: 0, hw: 4.85, hd: 0.06, maxY: 1.52 },
    ],
    spawn_sport_baseball_set: [
      { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.22, maxY: 0.82 },
    ],
    spawn_sport_boxing_corner: [
      { type: 'box', lx: 0, lz: 0, hw: 0.58, hd: 0.58, maxY: 1.28 },
    ],
    spawn_sport_hockey_sticks: [
      { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.22, maxY: 0.45 },
    ],
    spawn_sport_kayak: [
      { type: 'box', lx: 0, lz: 0, hw: 0.24, hd: 1.45, maxY: 0.32 },
    ],
    spawn_sport_mountain_bike: [
      { type: 'box', lx: 0, lz: 0, hw: 0.32, hd: 0.48, maxY: 0.92 },
    ],
    spawn_loisir_camp_stove: [
      { type: 'box', lx: 0, lz: 0, hw: 0.18, hd: 0.14, maxY: 0.12 },
    ],
    spawn_loisir_cooler: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.18, maxY: 0.48 },
    ],
    spawn_loisir_folding_chair: [
      { type: 'box', lx: 0, lz: 0, hw: 0.24, hd: 0.22, maxY: 0.85 },
    ],
    spawn_loisir_camp_lantern: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.14, topY: 0.50 },
    ],
    spawn_loisir_drum_kit: [
      { type: 'box', lx: 0, lz: 0, hw: 0.42, hd: 0.32, maxY: 0.88 },
    ],
    spawn_loisir_keyboard: [
      { type: 'box', lx: 0, lz: 0, hw: 0.48, hd: 0.18, maxY: 0.80 },
    ],
    spawn_loisir_playground_swing: [
      { type: 'box', lx: 0, lz: 0, hw: 0.68, hd: 0.12, maxY: 2.25 },
    ],
    spawn_loisir_sandbox: [
      { type: 'box', lx: 0, lz: 0, hw: 0.64, hd: 0.64, maxY: 0.22 },
    ],
    spawn_loisir_trampoline: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.96, topY: 0.58 },
    ],
    spawn_loisir_canoe: [
      { type: 'box', lx: 0, lz: 0, hw: 0.48, hd: 1.28, minY: 0.0, maxY: 0.62 },
    ],
    spawn_game_roulette_table: [
      { type: 'box', lx: 0, lz: 0, hw: 0.76, hd: 0.46, maxY: 0.88 },
    ],
    spawn_game_craps_table: [
      { type: 'box', lx: 0, lz: 0, hw: 0.96, hd: 0.52, maxY: 0.85 },
    ],
    spawn_game_skee_ball: [
      { type: 'box', lx: 0, lz: 0, hw: 0.34, hd: 0.74, maxY: 0.95 },
    ],
    spawn_game_board_game: [
      { type: 'box', lx: 0, lz: 0, hw: 0.38, hd: 0.28, maxY: 0.48 },
    ],
    spawn_sport_climbing_wall: [
      { type: 'box', lx: 0, lz: 0, hw: 0.94, hd: 0.08, maxY: 2.48 },
    ],
    spawn_sport_archery_target: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.36, topY: 1.28 },
    ],
    spawn_sport_ski_set: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.88, maxY: 0.12 },
    ],
    spawn_sport_dumbbell_rack: [
      { type: 'box', lx: 0, lz: 0, hw: 0.44, hd: 0.18, maxY: 0.48 },
    ],
    spawn_sport_badminton_net: [
      { type: 'box', lx: 0, lz: 0, hw: 2.68, hd: 0.06, maxY: 1.28 },
    ],
    spawn_sport_lacrosse_sticks: [
      { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.22, maxY: 0.52 },
    ],
    spawn_loisir_microphone_stand: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.18, topY: 1.62 },
    ],
    spawn_loisir_portable_bbq: [
      { type: 'box', lx: 0, lz: 0, hw: 0.24, hd: 0.16, maxY: 0.66 },
    ],
    spawn_loisir_picnic_basket: [
      { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.16, maxY: 0.32 },
    ],
    spawn_loisir_telescope: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.28, maxY: 1.12 },
    ],
    spawn_loisir_seesaw: [
      { type: 'box', lx: 0, lz: 0, hw: 1.25, hd: 0.14, maxY: 0.62 },
    ],
    spawn_loisir_spinning_playground: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.78, topY: 0.48 },
    ],
    spawn_loisir_camp_table: [
      { type: 'box', lx: 0, lz: 0, hw: 0.48, hd: 0.28, maxY: 0.56 },
    ],
    spawn_loisir_sleeping_pad: [
      { type: 'box', lx: 0, lz: 0, hw: 0.18, hd: 0.34, maxY: 0.18 },
    ],
    spawn_loisir_binoculars_tripod: [
      { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.22, maxY: 0.85 },
    ],
    spawn_loisir_ukulele_stand: [
      { type: 'box', lx: 0, lz: 0, hw: 0.12, hd: 0.10, maxY: 0.52 },
    ],
    spawn_game_ring_toss: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.08, topY: 0.62 },
    ],
    spawn_game_lawn_darts: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.26, topY: 0.12 },
    ],
    spawn_game_kubb: [
      { type: 'box', lx: 0, lz: 0, hw: 0.32, hd: 0.32, maxY: 0.35 },
    ],
    spawn_game_marbles: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.30, topY: 0.06 },
    ],
    spawn_sport_disc_golf_basket: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.26, topY: 1.28 },
    ],
    spawn_sport_yoga_mat: [
      { type: 'box', lx: 0, lz: 0, hw: 0.32, hd: 0.14, maxY: 0.14 },
    ],
    spawn_sport_pull_up_bar: [
      { type: 'box', lx: 0, lz: 0, hw: 0.68, hd: 0.08, minY: 0.0, maxY: 2.08 },
    ],
    spawn_sport_boxing_gloves: [
      { type: 'box', lx: 0, lz: 0, hw: 0.18, hd: 0.08, minY: 1.0, maxY: 1.48 },
    ],
    spawn_sport_curling_stones: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.22, maxY: 0.16 },
    ],
    spawn_sport_football_pad: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.44, maxY: 0.58 },
    ],
    spawn_loisir_beach_chair: [
      { type: 'box', lx: 0, lz: 0, hw: 0.26, hd: 0.24, maxY: 0.72 },
    ],
    spawn_loisir_beach_umbrella: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.96, topY: 2.02 },
    ],
    spawn_loisir_life_ring: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.08, topY: 1.08 },
      { type: 'box', lx: 0, lz: 0, hw: 0.26, hd: 0.06, minY: 0.7, maxY: 0.95 },
    ],
    spawn_loisir_paddle_board: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.95, maxY: 0.18 },
    ],
    spawn_loisir_snorkel_set: [
      { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.14, maxY: 0.22 },
    ],
    spawn_loisir_camp_cot: [
      { type: 'box', lx: 0, lz: 0, hw: 0.34, hd: 0.95, maxY: 0.52 },
    ],
    spawn_loisir_fire_pit: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.38, topY: 0.18 },
    ],
    spawn_loisir_solar_shower: [
      { type: 'box', lx: 0, lz: 0, hw: 0.18, hd: 0.08, maxY: 1.45 },
    ],
    spawn_loisir_bird_bath: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.24, topY: 0.80 },
    ],
    spawn_loisir_red_wagon: [
      { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.42, maxY: 0.32 },
    ],
    spawn_backpack: [
      { type: 'box', lx: 0, lz: 0, hw: 0.20, hd: 0.16, maxY: 0.32 },
    ],
    spawn_lean_to: [
      { type: 'box', lx: 0, lz: 0.35, hw: 0.95, hd: 0.55, maxY: 1.15 },
    ],
    spawn_stump_seat: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.22, topY: 0.42 },
    ],
    spawn_lantern: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.10, topY: 0.55 },
    ],
    spawn_stone: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.17, topY: 0.32 },
    ],
    rock_boulder: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.72, topY: 0.95 },
    ],
    rock_outcrop: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.55, topY: 0.55 },
    ],
    spawn_workbench: [
      { type: 'box', lx: 0, lz: 0, hw: 0.52, hd: 0.34, maxY: 0.88 },
    ],
    storage_chest: [
      { type: 'box', lx: 0, lz: 0, hw: 0.58, hd: 0.36, maxY: 0.62 },
    ],
    building_survivor_shack: _survivorShackColliderDefs(),
    smallcity_house_a: [
      { type: 'box', lx: 0, lz: -4.75, hw: 5.5, hd: 0.13, maxY: 3.1 },
      { type: 'box', lx: -5.5, lz: 0, hw: 0.13, hd: 4.75, maxY: 3.1 },
      { type: 'box', lx: 5.5, lz: 0, hw: 0.13, hd: 4.75, maxY: 3.1 },
      { type: 'box', lx: -3.25, lz: 4.75, hw: 2.25, hd: 0.13, maxY: 3.1 },
      { type: 'box', lx: 3.25, lz: 4.75, hw: 2.25, hd: 0.13, maxY: 3.1 },
      { type: 'box', lx: 0, lz: 4.75, hw: 1.0, hd: 0.13, minY: 2.55, maxY: 3.1 },
      { type: 'box', lx: -1.8, lz: -2.65, hw: 0.10, hd: 1.30, maxY: 2.55 },
      { type: 'box', lx: -1.8, lz: 2.85, hw: 0.10, hd: 0.90, maxY: 2.55 },
      { type: 'box', lx: -1.8, lz: 0.3, hw: 0.10, hd: 1.65, minY: 2.2, maxY: 2.55 },
      { type: 'box', lx: -2.0, lz: 1.0, hw: 0.90, hd: 0.10, maxY: 2.55 },
      { type: 'box', lx: 3.2, lz: 1.0, hw: 2.10, hd: 0.10, maxY: 2.55 },
      { type: 'box', lx: 0, lz: 1.0, hw: 1.10, hd: 0.10, minY: 2.2, maxY: 2.55 },
    ],
    smallcity_house_b: [
      { type: 'box', lx: 0, lz: -5.25, hw: 5.0, hd: 0.14, maxY: 3.2 },
      { type: 'box', lx: 0, lz: 5.25, hw: 5.0, hd: 0.14, maxY: 3.2 },
      { type: 'box', lx: 5.0, lz: 0, hw: 0.14, hd: 5.25, maxY: 3.2 },
      { type: 'box', lx: -5.0, lz: -3.125, hw: 0.14, hd: 2.125, maxY: 3.2 },
      { type: 'box', lx: -5.0, lz: 3.125, hw: 0.14, hd: 2.125, maxY: 3.2 },
      { type: 'box', lx: -5.0, lz: 0, hw: 0.14, hd: 1.0, minY: 2.55, maxY: 3.2 },
      { type: 'box', lx: -2.65, lz: -1.0, hw: 1.30, hd: 0.10, maxY: 2.55 },
      { type: 'box', lx: 2.6, lz: -1.0, hw: 2.05, hd: 0.10, maxY: 2.55 },
      { type: 'box', lx: -0.4, lz: -1.0, hw: 0.93, hd: 0.10, minY: 2.2, maxY: 2.55 },
      { type: 'box', lx: 2.4, lz: 2.9, hw: 0.10, hd: 0.85, maxY: 2.55 },
      { type: 'box', lx: 2.4, lz: 1.15, hw: 0.10, hd: 0.78, minY: 2.2, maxY: 2.55 },
    ],
    // Poteaux de signalisation camp (4 m) — cylindre pleine hauteur, non montable
    spawn_marker_left: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.14 },
    ],
    spawn_marker_right: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.14 },
    ],
    road_barrier_post: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.09, topY: 0.72 },
    ],
    road_barrier_rail: [
      { type: 'box', lx: 0, lz: 0, hw: 0.5, hd: 0.04, maxY: 0.66 },
    ],
    s01_gas_station: [
      { type: 'box', lx: 0, lz: 0, hw: 4.1, hd: 3.1, maxY: 3.4 },
      { type: 'box', lx: -4.5, lz: 0, hw: 2.8, hd: 3.8, maxY: 3.9 },
    ],
    s01_military_tent: [
      { type: 'box', lx: -5.5, lz: 0, hw: 0.14, hd: 3.75, maxY: 2.2 },
      { type: 'box', lx: 5.5, lz: 0, hw: 0.14, hd: 3.75, maxY: 2.2 },
      { type: 'box', lx: 0, lz: 3.75, hw: 5.5, hd: 0.14, maxY: 2.2 },
      { type: 'cyl', lx: 0, lz: -1.8, r: 0.11, topY: 3.7 },
      { type: 'cyl', lx: 0, lz: 1.8, r: 0.11, topY: 3.7 },
    ],
    sign_sector_gate: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.14, topY: 2.4 },
    ],
    beach_exit_torch: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.08, topY: 2.1 },
    ],
    spawn_beach_footprint_trail: [],
    spawn_beach_message_bottle: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.08, topY: 0.28 },
    ],
    spawn_beach_campfire_ring: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.42, topY: 0.12 },
    ],
    spawn_beach_pier_wreck: [
      { type: 'box', lx: 0, lz: 0, hw: 0.62, hd: 0.38, maxY: 0.55 },
    ],
    spawn_beach_boat_hull: [
      { type: 'box', lx: 0.05, lz: 0, hw: 1.05, hd: 0.42, maxY: 0.52 },
    ],
    spawn_beach_burnt_note: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.16, topY: 0.22 },
    ],
    spawn_beach_starter_torch: [
      { type: 'cyl', lx: 0, lz: 0, r: 0.07, topY: 0.95 },
    ],
    spawn_beach_starter_suitcase: [
      { type: 'box', lx: 0, lz: 0, hw: 0.30, hd: 0.22, maxY: 0.32 },
    ],
    spawn_flat_stone: [],
    spawn_drink_set: [],
    tree_oak: [{ type: 'cyl', lx: 0, lz: 0, r: 0.55 }],
    tree_pine: [{ type: 'cyl', lx: 0, lz: 0, r: 0.52 }],
    tree_birch: [{ type: 'cyl', lx: 0, lz: 0, r: 0.50 }],
    tree_dead: [{ type: 'cyl', lx: 0, lz: 0, r: 0.25 }],
    tree_palm: [{ type: 'cyl', lx: 0, lz: 0, r: 0.38 }],
  };

  /** Dimensions épaves — miroir de vehicle_prefabs.js BODY (carrosserie + habitacle). */
  const WRECK_BODY = {
    wreck_sedan:  { w: 1.78, h: 0.72, d: 4.1,  cw: 1.48, ch: 0.62, cd: 2.15, cz: -0.18 },
    wreck_pickup: { w: 1.85, h: 0.78, d: 4.55, cw: 1.52, ch: 0.68, cd: 1.85, cz: -0.35 },
  };

  function _wreckColliderDefs(prefabId) {
    const spec = WRECK_BODY[prefabId] || WRECK_BODY.wreck_sedan;
    return [
      { type: 'box', lx: 0, lz: 0, hw: spec.w * 0.5, hd: spec.d * 0.5, maxY: 0.62 + spec.h * 0.5 },
      { type: 'box', lx: 0, lz: spec.cz, hw: spec.cw * 0.5, hd: spec.cd * 0.5, maxY: 1.25 + spec.ch * 0.5 },
    ];
  }

  const ITEM_COLLIDERS = {
    default: { type: 'box', lx: 0, lz: 0, hw: 0.11, hd: 0.11, maxY: 0.22 },
    food_eau_bouteille: { type: 'cyl', lx: 0, lz: 0, r: 0.07, topY: 0.28 },
    food_conserves: { type: 'cyl', lx: 0, lz: 0, r: 0.09, topY: 0.12 },
    food_haricots_boite: { type: 'cyl', lx: 0, lz: 0, r: 0.09, topY: 0.12 },
    food_soupe_conserve: { type: 'cyl', lx: 0, lz: 0, r: 0.08, topY: 0.14 },
    tool_caillou: { type: 'cyl', lx: 0, lz: 0, r: 0.09, topY: 0.14 },
    food_pain: { type: 'box', lx: 0, lz: 0, hw: 0.14, hd: 0.10, maxY: 0.10 },
    food_sandwich: { type: 'box', lx: 0, lz: 0, hw: 0.15, hd: 0.11, maxY: 0.11 },
    tool_hachette: { type: 'box', lx: 0, lz: 0, hw: 0.16, hd: 0.07, maxY: 0.08, layFlat: true },
    tool_pioche: { type: 'box', lx: 0, lz: 0, hw: 0.18, hd: 0.07, maxY: 0.08, layFlat: true },
    tool_marteau: { type: 'box', lx: 0, lz: 0, hw: 0.15, hd: 0.07, maxY: 0.08, layFlat: true },
    wpn_couteau: { type: 'box', lx: 0, lz: 0, hw: 0.12, hd: 0.05, maxY: 0.06, layFlat: true },
    wpn_pistolet: { type: 'box', lx: 0, lz: 0, hw: 0.14, hd: 0.08, maxY: 0.10 },
    wpn_fusil_pompe: { type: 'box', lx: 0, lz: 0, hw: 0.28, hd: 0.08, maxY: 0.10, layFlat: true },
    wpn_barre_fer: { type: 'box', lx: 0, lz: 0, hw: 0.22, hd: 0.06, maxY: 0.08, layFlat: true },
    med_kit_soin: { type: 'box', lx: 0, lz: 0, hw: 0.14, hd: 0.10, maxY: 0.12 },
    res_bois_brut: { type: 'cyl', lx: 0, lz: 0, r: 0.12, topY: 0.18 },
    res_planche: { type: 'box', lx: 0, lz: 0, hw: 0.20, hd: 0.08, maxY: 0.06, layFlat: true },
  };

  /** Pièces validées une par une — miroir packages/shared/src/survivor-shack-*.mjs */
  function _survivorShackColliderDefs() {
    return [
      _survivorShackFloorColliderDef(),
      _survivorShackWallNorthColliderDef(),
      ..._survivorShackWallSouthColliderDefs(),
      _survivorShackWallWestColliderDef(),
      _survivorShackWallEastColliderDef(),
      _survivorShackDoorLeafColliderDef(),
      ..._survivorShackRoofColliderDefs(),
    ];
  }

  function _survivorShackFloorColliderDef() {
    const FLOOR_W = 5.25;
    const FLOOR_D = 4.25;
    return {
      type: 'box',
      lx: 0,
      lz: 0,
      hw: FLOOR_W / 2,
      hd: FLOOR_D / 2,
      minY: 0,
      maxY: 0.12,
    };
  }

  /** Pièce 2/7 — miroir packages/shared/src/survivor-shack-wall-north.mjs */
  function _survivorShackWallNorthColliderDef() {
    const W = 5.25;
    const Z = 2.04;
    return {
      type: 'box',
      lx: 0,
      lz: Z,
      hw: W / 2,
      hd: 0.22,
    };
  }

  /** Pièce 3/7 — miroir packages/shared/src/survivor-shack-wall-south.mjs */
  function _survivorShackWallSouthColliderDefs() {
    const Z = -2.04;
    const HW = 1.98 / 2;
    const HD = 0.22;
    const X = 1.61;
    return [
      { type: 'box', lx: -X, lz: Z, hw: HW, hd: HD },
      { type: 'box', lx: X, lz: Z, hw: HW, hd: HD },
    ];
  }

  /** Pièce 4/7 — miroir packages/shared/src/survivor-shack-wall-west.mjs */
  function _survivorShackWallWestColliderDef() {
    const X = -2.54;
    const D = 4.15;
    return {
      type: 'box',
      lx: X,
      lz: 0,
      hw: 0.22,
      hd: D / 2,
    };
  }

  /** Pièce 5/7 — miroir packages/shared/src/survivor-shack-wall-east.mjs */
  function _survivorShackWallEastColliderDef() {
    const X = 2.54;
    const D = 4.15;
    return {
      type: 'box',
      lx: X,
      lz: 0,
      hw: 0.22,
      hd: D / 2,
    };
  }

  /** Miroir packages/shared/src/door-leaf-collider.mjs */
  const DOOR_OPEN_ANGLE = -Math.PI * 0.52;

  function _transformOpenDoorLeaf(def, angle) {
    if (!def?.door || !angle) return def;
    const px = def.doorPivotLx ?? def.lx ?? 0;
    const pz = def.doorPivotLz ?? def.lz ?? 0;
    const offX = (def.lx || 0) - px;
    const offZ = (def.lz || 0) - pz;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return {
      ...def,
      lx: px + offX * c + offZ * s,
      lz: pz - offX * s + offZ * c,
      localRotY: angle,
    };
  }

  /** Pièce 7/7 — miroir packages/shared/src/survivor-shack-roof.mjs */
  function _survivorShackRoofColliderDefs() {
    const halfRun = 2.45;
    const rise = 0.93;
    const pitch = Math.atan2(rise, halfRun);
    const roofW = 5.88;
    const panelLen = halfRun + 0.12;
    const panelZ = halfRun * 0.5;
    const band = { minY: 2.55, maxY: 3.65 };
    return [
      { type: 'box', lx: 0, lz: -panelZ, hw: roofW / 2, hd: panelLen / 2, rotX: -pitch, ...band },
      { type: 'box', lx: 0, lz: panelZ, hw: roofW / 2, hd: panelLen / 2, rotX: pitch, ...band },
    ];
  }

  /** Pièce 6/7 — miroir packages/shared/src/survivor-shack-door.mjs */
  function _survivorShackDoorLeafColliderDef() {
    const DOOR_W = 1.24;
    const PIVOT_X = -0.60;
    const PIVOT_Z = -2.10;
    return {
      type: 'box',
      lx: 0,
      lz: PIVOT_Z,
      hw: DOOR_W / 2,
      hd: 0.28,
      doorPivotLx: PIVOT_X,
      doorPivotLz: PIVOT_Z,
      door: true,
    };
  }

  function _doorFrameColliderDefs(gap) {
    const w = 3.0;
    const t = 0.36;
    const h = 2.6;
    const side = (w - gap) / 2;
    const off = gap / 2 + side / 2;
    return [
      { type: 'box', lx: -off, lz: 0, hw: side / 2, hd: t / 2, maxY: h },
      { type: 'box', lx: off, lz: 0, hw: side / 2, hd: t / 2, maxY: h },
      { type: 'box', lx: 0, lz: 0, hw: w / 2, hd: t / 2, maxY: h, minY: h - 0.4 },
    ];
  }

  /** Battant — pivot local ; ouvert = collider tourné (trou libre, panneau bloque). */
  function _doorLeafColliderDef(gap) {
    const doorW = Math.max(0.9, gap - 0.1);
    const pivotX = -doorW / 2;
    const pivotZ = -0.11;
    return {
      type: 'box',
      lx: 0,
      lz: pivotZ,
      hw: doorW / 2,
      hd: 0.06,
      minY: 0.08,
      maxY: 2.12,
      doorPivotLx: pivotX,
      doorPivotLz: pivotZ,
      door: true,
    };
  }

  function _buildDoorColliderDefs(gap) {
    return [..._doorFrameColliderDefs(gap), _doorLeafColliderDef(gap)];
  }

  const BUILD_PREFAB_COLLIDERS = {
    build_wall_wood: [
      { type: 'box', lx: 0, lz: 0, hw: 1.5, hd: 0.18, maxY: 2.6 },
    ],
    build_door_wood: _buildDoorColliderDefs(1.8),
    build_large_door_wood: _buildDoorColliderDefs(2.4),
    build_doorway_wood: _doorFrameColliderDefs(1.8),
    build_large_doorway_wood: _doorFrameColliderDefs(2.4),
    build_stair_wood: [
      { type: 'box', lx: -(1.8 / 2 + 0.08), lz: 0, hw: 0.10, hd: 3.0 / 2, maxY: 2.6 },
      { type: 'box', lx: (1.8 / 2 + 0.08), lz: 0, hw: 0.10, hd: 3.0 / 2, maxY: 2.6 },
    ],
    build_ceiling_wood: [
      { type: 'box', lx: 0, lz: 0, hw: 1.5, hd: 1.5, minY: 0, maxY: 0.18 },
    ],
  };

  function _defsForSpec(spec) {
    if (spec.kind === 'prefab') {
      if (spec.prefabId?.startsWith('wreck_')) return _wreckColliderDefs(spec.prefabId);
      const buildCols = BUILD_PREFAB_COLLIDERS[spec.prefabId];
      if (buildCols) return buildCols;
      const list = PREFAB_COLLIDERS[spec.prefabId];
      return list == null ? [] : list;
    }
    const def = ITEM_COLLIDERS[spec.type] || ITEM_COLLIDERS.default;
    return def ? [def] : [];
  }

  function _applyLayFlat(def, spec) {
    if (!def.layFlat && !spec.layFlat) return def;
    return {
      ...def,
      hw: (def.hw || 0.1) * 1.15,
      hd: (def.hd || 0.1) * 0.65,
      maxY: def.maxY != null ? def.maxY * 0.55 : 0.08,
    };
  }

  function buildDecorColliders(spec) {
    if (!spec) return [];
    if (spec.prefabId === 'road_barrier_rail' && spec.railSeg) {
      const baseY = Number.isFinite(spec.baseY) ? spec.baseY : 0;
      return [{
        type: 'seg',
        x0: spec.railSeg.x0,
        z0: spec.railSeg.z0,
        x1: spec.railSeg.x1,
        z1: spec.railSeg.z1,
        r: 0.14,
        baseY,
        maxY: baseY + 0.78,
        decorId: spec.decorId,
      }];
    }
    const {
      x = 0, z = 0, baseY = 0,
      rotY = 0, rotX = 0, scale: scaleIn = 1,
      wreckTilt = 0,
      rotZ = 0,
      railLen,
    } = spec;
    const scale = scaleIn ?? 1;
    const railLenScale = (spec.prefabId === 'road_barrier_rail' && Number.isFinite(railLen))
      ? railLen
      : null;
    const isWreck = spec.prefabId?.startsWith('wreck_');
    const tiltZ = isWreck ? (Number(wreckTilt) || Number(rotZ) || 0) : 0;
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const out = [];

    for (const raw of _defsForSpec(spec)) {
      if (!raw) continue;
      let def = _applyLayFlat(raw, spec);
      if (raw.door && spec.doorOpen) {
        const angle = Number.isFinite(spec.doorAngle) ? spec.doorAngle : DOOR_OPEN_ANGLE;
        def = _transformOpenDoorLeaf(def, angle);
      }
      const lx0 = (def.lx || 0) * (railLenScale ?? scale);
      const lz0 = (def.lz || 0) * (railLenScale ?? scale);
      const hw = (def.hw || 0.1) * (railLenScale ?? scale);
      const hd = (def.hd || 0.1) * scale;

      if (def.type === 'cyl' || def.r != null) {
        const ox = lx0 * cos + lz0 * sin;
        const oz = -lx0 * sin + lz0 * cos;
        out.push({
          x: x + ox,
          z: z + oz,
          r: (def.r || 0.1) * scale,
          topY: def.topY != null ? baseY + def.topY * scale : undefined,
          decorId: spec.decorId,
        });
        continue;
      }

      if (isWreck) {
        out.push({
          type: 'box',
          cx: x,
          cz: z,
          lx: lx0,
          lz: lz0,
          hw,
          hd,
          rotY,
          rotZ: tiltZ,
          baseY,
          maxY: def.maxY != null ? baseY + def.maxY * scale : undefined,
          minY: def.minY != null ? baseY + def.minY * scale : undefined,
          decorId: spec.decorId,
          wreckPart: true,
        });
        continue;
      }

      out.push({
        type: 'box',
        cx: x,
        cz: z,
        lx: lx0,
        lz: lz0,
        hw,
        hd,
        rotY,
        rotX: def.rotX ?? rotX ?? 0,
        localRotY: def.localRotY || 0,
        baseY,
        maxY: def.maxY != null ? baseY + def.maxY * scale : undefined,
        minY: def.minY != null ? baseY + def.minY * scale : undefined,
        decorId: spec.decorId,
        prefabId: spec.prefabId,
      });
    }
    return out;
  }

  function listPrefabColliderIds() {
    return Object.keys(PREFAB_COLLIDERS).filter((id) => (PREFAB_COLLIDERS[id] || []).length > 0);
  }

  window.ZS = window.ZS || {};
  ZS.buildDecorColliders = buildDecorColliders;
  ZS.listPrefabColliderIds = listPrefabColliderIds;
  ZS.DECOR_PREFAB_COLLIDERS = PREFAB_COLLIDERS;
  ZS.DECOR_ITEM_COLLIDERS = ITEM_COLLIDERS;
  ZS.WRECK_BODY = WRECK_BODY;
}());
