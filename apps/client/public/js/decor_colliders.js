// Collisions 2D (XZ) pour décors prefab / item — local → monde avec rotY + scale.
(function () {
  'use strict';

  // Offsets locaux (lx, lz) relatifs au pivot du décor. maxY = hauteur solide (sautable au-dessus).
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
    building_survivor_shack: [
      { type: 'box', lx: 0, lz: 2.04, hw: 2.64, hd: 0.11 },
      { type: 'box', lx: -2.54, lz: 0, hw: 0.11, hd: 2.08 },
      { type: 'box', lx: 2.54, lz: 0, hw: 0.11, hd: 2.08 },
      { type: 'box', lx: -1.61, lz: -2.04, hw: 0.99, hd: 0.11 },
      { type: 'box', lx: 1.61, lz: -2.04, hw: 0.99, hd: 0.11 },
      { type: 'box', lx: 0, lz: -2.12, hw: 0.62, hd: 0.10, door: true },
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
    spawn_flat_stone: [],
    spawn_drink_set: [],
    tree_oak: [{ type: 'cyl', lx: 0, lz: 0, r: 0.55 }],
    tree_pine: [{ type: 'cyl', lx: 0, lz: 0, r: 0.52 }],
    tree_birch: [{ type: 'cyl', lx: 0, lz: 0, r: 0.50 }],
    tree_dead: [{ type: 'cyl', lx: 0, lz: 0, r: 0.25 }],
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

  function _defsForSpec(spec) {
    if (spec.kind === 'prefab') {
      if (spec.prefabId?.startsWith('wreck_')) return _wreckColliderDefs(spec.prefabId);
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
      if (raw.door && spec.doorOpen) continue;
      const def = _applyLayFlat(raw, spec);
      const lx0 = (def.lx || 0) * (railLenScale ?? scale);
      const lz0 = (def.lz || 0) * (railLenScale ?? scale);
      const hw = (def.hw || 0.1) * (railLenScale ?? scale);
      const hd = (def.hd || 0.1) * scale;

      if (def.type === 'cyl' || def.r != null) {
        const ox = lx0 * cos - lz0 * sin;
        const oz = lx0 * sin + lz0 * cos;
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

      const ox = lx0 * cos - lz0 * sin;
      const oz = lx0 * sin + lz0 * cos;
      out.push({
        type: 'box',
        cx: x + ox,
        cz: z + oz,
        hw,
        hd,
        rotY,
        rotX: rotX || 0,
        baseY,
        maxY: def.maxY != null ? baseY + def.maxY : undefined,
        minY: def.minY != null ? baseY + def.minY : undefined,
        decorId: spec.decorId,
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
