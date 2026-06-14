// Shack + portes colliders — extrait de decor_colliders.js (IIFE)
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
