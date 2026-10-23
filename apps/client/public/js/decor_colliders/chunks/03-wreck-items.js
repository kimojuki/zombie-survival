// WRECK_BODY + ITEM_COLLIDERS — extrait de decor_colliders.js (IIFE)
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
