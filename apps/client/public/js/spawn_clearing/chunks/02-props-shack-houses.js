// Shack, bois, maisons smallcity — extrait de spawn_clearing.js (IIFE)
function _buildSurvivorShackWallNorth(g) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const W = 5.25;
    const H = 2.55;
    const T = 0.18;
    const CY = 1.32;
    const Z = 2.04;
    _add(g, new THREE.BoxGeometry(W, H, T), wallMat, 0, CY, Z);
  }

  /** Pièce 4/7. Miroir packages/shared/src/survivor-shack-wall-west.mjs */
  function _buildSurvivorShackWallWest(g) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const T = 0.18;
    const H = 2.55;
    const D = 4.15;
    const CY = 1.32;
    const X = -2.54;
    _add(g, new THREE.BoxGeometry(T, H, D), wallMat, X, CY, 0);
  }

  /** Pièce 5/7. Miroir packages/shared/src/survivor-shack-wall-east.mjs */
  function _buildSurvivorShackWallEast(g) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const T = 0.18;
    const H = 2.55;
    const D = 4.15;
    const CY = 1.32;
    const X = 2.54;
    _add(g, new THREE.BoxGeometry(T, H, D), wallMat, X, CY, 0);
  }

  /** Pièce 6/7. Miroir packages/shared/src/survivor-shack-door.mjs */
  function _buildSurvivorShackDoor(g) {
    const M = _campMats();
    const trimMat = M ? M.woodDark(0x5a371d) : new THREE.MeshLambertMaterial({ color: 0x5a371d });
    const DOOR_W = 1.24;
    const DOOR_H = 2.02;
    const DOOR_D = 0.14;
    const DOOR_HX = DOOR_W * 0.5;
    const PIVOT_X = -DOOR_HX + 0.02;
    const PIVOT_Y = 0.08;
    const PIVOT_Z = -2.10;

    _add(g, new THREE.BoxGeometry(1.28, 0.42, 0.2), trimMat, 0, 2.36, -2.04);

    const doorPivot = new THREE.Group();
    doorPivot.name = 'survivorShackDoorPivot';
    doorPivot.position.set(PIVOT_X, PIVOT_Y, PIVOT_Z);
    doorPivot.userData.isDoor = true;
    g.add(doorPivot);
    const door = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, DOOR_H, DOOR_D), trimMat);
    door.name = 'survivorShackDoor';
    door.position.set(DOOR_HX - 0.02, DOOR_H * 0.5, 0);
    door.castShadow = door.receiveShadow = true;
    doorPivot.add(door);
    const handleMat = new THREE.MeshLambertMaterial({ color: 0xb99b52 });
    _add(doorPivot, new THREE.BoxGeometry(0.08, 0.08, 0.08), handleMat, DOOR_W - 0.18, DOOR_H * 0.82, -0.07);

    g.userData.doorPivot = doorPivot;
  }

  /** Pièce 7/7. Miroir packages/shared/src/survivor-shack-roof.mjs */
  function _buildSurvivorShackRoof(g) {
    const M = _campMats();
    const trimMat = M ? M.woodDark(0x5a371d) : new THREE.MeshLambertMaterial({ color: 0x5a371d });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x30353a });
    const gableMat = new THREE.MeshLambertMaterial({ color: 0x30353a, side: THREE.DoubleSide });
    const halfRun = 2.45;
    const rise = 0.93;
    const pitch = Math.atan2(rise, halfRun);
    const eaveY = 2.62;
    const ridgeY = eaveY + rise;
    const panelCY = eaveY + rise * 0.5;
    const roofW = 5.88;
    const roofThick = 0.16;
    const panelLen = halfRun + 0.12;

    const northRoof = new THREE.Mesh(new THREE.BoxGeometry(roofW, roofThick, panelLen), roofMat);
    northRoof.position.set(0, panelCY, -halfRun * 0.5);
    northRoof.rotation.x = -pitch;
    northRoof.castShadow = northRoof.receiveShadow = true;
    g.add(northRoof);

    const southRoof = new THREE.Mesh(new THREE.BoxGeometry(roofW, roofThick, panelLen), roofMat);
    southRoof.position.set(0, panelCY, halfRun * 0.5);
    southRoof.rotation.x = pitch;
    southRoof.castShadow = southRoof.receiveShadow = true;
    g.add(southRoof);

    _add(g, new THREE.BoxGeometry(roofW + 0.14, 0.14, 0.16), trimMat, 0, ridgeY, 0);

    for (const sx of [-1, 1]) {
      const gableGeo = new THREE.BufferGeometry();
      const gx = sx * 2.68;
      gableGeo.setAttribute('position', new THREE.Float32BufferAttribute([
        gx, eaveY, -halfRun - 0.06,
        gx, eaveY, halfRun + 0.06,
        gx, ridgeY, 0,
      ], 3));
      gableGeo.setIndex([0, 1, 2]);
      gableGeo.computeVertexNormals();
      const gable = new THREE.Mesh(gableGeo, gableMat);
      gable.castShadow = gable.receiveShadow = true;
      g.add(gable);
    }
  }

  /** Pièce 3/7. Miroir packages/shared/src/survivor-shack-wall-south.mjs — 2 pans, ouverture porte au centre. */
  function _buildSurvivorShackWallSouth(g) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const H = 2.55;
    const T = 0.18;
    const CY = 1.32;
    const Z = -2.04;
    const SEG_W = 1.98;
    const SEG_X = 1.61;
    _add(g, new THREE.BoxGeometry(SEG_W, H, T), wallMat, -SEG_X, CY, Z);
    _add(g, new THREE.BoxGeometry(SEG_W, H, T), wallMat, SEG_X, CY, Z);
  }

  /** Terrain cabossé : max hauteur sous les coins du sol (miroir survivor-shack-pad.mjs). */
  function sampleShackPadHeight(x, z, rotY) {
    const HW = 5.25 / 2;
    const HD = 4.25 / 2;
    const pts = [
      [-HW, -HD], [HW, -HD], [HW, HD], [-HW, HD], [0, 0],
    ];
    const c = Math.cos(rotY || 0);
    const s = Math.sin(rotY || 0);
    let maxH = -Infinity;
    for (const [lx, lz] of pts) {
      const wx = x + lx * c + lz * s;
      const wz = z - lx * s + lz * c;
      const h = getDecorGroundHeight(wx, wz);
      if (h > maxH) maxH = h;
    }
    return Number.isFinite(maxH) ? maxH : getDecorGroundHeight(x, z);
  }

  /** Pièce 1/?. Miroir packages/shared/src/survivor-shack-floor.mjs */
  function _buildSurvivorShackFloor(g) {
    const M = _campMats();
    const floorMat = M ? M.woodFine(0x8a5f35) : new THREE.MeshLambertMaterial({ color: 0x8a5f35 });
    const FLOOR_W = 5.25;
    const FLOOR_D = 4.25;
    const FLOOR_T = 0.12;
    _add(g, new THREE.BoxGeometry(FLOOR_W, FLOOR_T, FLOOR_D), floorMat, 0, FLOOR_T * 0.5, 0);
  }

  /** Cabane S01 — assemblage progressif (1 pièce validée à la fois). Pivot = root (rotY sur root). */
  function _buildSurvivorShack(parent) {
    _buildSurvivorShackFloor(parent);
    _buildSurvivorShackWallNorth(parent);
    _buildSurvivorShackWallSouth(parent);
    _buildSurvivorShackWallWest(parent);
    _buildSurvivorShackWallEast(parent);
    _buildSurvivorShackDoor(parent);
    _buildSurvivorShackRoof(parent);
    parent.userData.colliderPrefabId = 'building_survivor_shack';
  }

  function _buildStorageChest(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const plank = M ? M.woodFine(0xb47a42) : new THREE.MeshLambertMaterial({ color: 0x8a5a2e });
    const frame = M ? M.woodDark(0x4a2b13) : new THREE.MeshLambertMaterial({ color: 0x4a2b13 });
    const metal = new THREE.MeshLambertMaterial({ color: 0x5d6268 });
    _add(g, new THREE.BoxGeometry(1.15, 0.48, 0.72), plank, 0, 0.24, 0);
    _add(g, new THREE.BoxGeometry(0.98, 0.36, 0.54), new THREE.MeshLambertMaterial({ color: 0x3d2510 }), 0, 0.38, 0);
    _add(g, new THREE.BoxGeometry(1.20, 0.08, 0.78), frame, 0, 0.52, 0);
    _add(g, new THREE.BoxGeometry(0.98, 0.08, 0.56), new THREE.MeshLambertMaterial({ color: 0x2a1a0c }), 0, 0.57, 0);
    _add(g, new THREE.BoxGeometry(1.25, 0.06, 0.08), frame, 0, 0.31, -0.39);
    _add(g, new THREE.BoxGeometry(1.25, 0.06, 0.08), frame, 0, 0.31, 0.39);
    for (const sx of [-0.58, 0.58]) {
      _add(g, new THREE.BoxGeometry(0.08, 0.58, 0.78), frame, sx, 0.29, 0);
    }

    const lidPivot = new THREE.Group();
    lidPivot.name = 'storageChestLidPivot';
    lidPivot.position.set(0, 0.58, 0.39);
    g.add(lidPivot);
    _add(lidPivot, new THREE.BoxGeometry(1.15, 0.14, 0.72), plank, 0, 0, -0.36);
    _add(lidPivot, new THREE.BoxGeometry(1.23, 0.08, 0.80), frame, 0, 0.02, -0.36);
    _add(lidPivot, new THREE.BoxGeometry(0.24, 0.14, 0.10), metal, 0, 0.02, -0.77);
    _add(lidPivot, new THREE.BoxGeometry(0.10, 0.12, 0.08), metal, 0, -0.10, -0.82);

    g.userData.isStorage = true;
    g.userData.storageLidPivot = lidPivot;
    parent.userData.isStorage = true;
    parent.userData.storageLidPivot = lidPivot;
  }

  function _buildWoodCeiling(parent, x, y, z) {
    const M = _campMats();
    const plank = M ? M.woodFine(0xb5894e) : new THREE.MeshLambertMaterial({ color: 0xb5894e });
    const trim = M ? M.woodDark(0x6a421d) : new THREE.MeshLambertMaterial({ color: 0x6a421d });
    _add(parent, new THREE.BoxGeometry(3.0, 0.18, 3.0), plank, x, y + 0.09, z);
    for (let i = -1; i <= 1; i++) {
      _add(parent, new THREE.BoxGeometry(0.1, 0.08, 3.02), trim, x + i * 0.9, y + 0.02, z);
    }
    _add(parent, new THREE.BoxGeometry(3.02, 0.08, 0.1), trim, x, y + 0.02, z - 1.45);
    _add(parent, new THREE.BoxGeometry(3.02, 0.08, 0.1), trim, x, y + 0.02, z + 1.45);
  }

  function _buildWoodWall(parent, x, y, z) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const trimMat = M ? M.woodDark(0x5a371d) : new THREE.MeshLambertMaterial({ color: 0x5a371d });
    _add(parent, new THREE.BoxGeometry(3.0, 2.6, 0.36), wallMat, x, y + 1.3, z);
    for (let i = -1; i <= 1; i++) {
      _add(parent, new THREE.BoxGeometry(0.12, 2.5, 0.40), trimMat, x + i * 0.9, y + 1.3, z);
    }
    _add(parent, new THREE.BoxGeometry(3.05, 0.16, 0.40), trimMat, x, y + 2.5, z);
    _add(parent, new THREE.BoxGeometry(3.05, 0.14, 0.40), trimMat, x, y + 0.2, z);
  }

  function _buildFloorSupports(parent, x, yBottom, yTop, z) {
    const gap = yTop - yBottom;
    if (gap < 0.2) return;
    const M = _campMats();
    const beam = M ? M.woodDark(0x6a421d) : new THREE.MeshLambertMaterial({ color: 0x6a421d });
    const brace = M ? M.wood(0x8a5a2e) : new THREE.MeshLambertMaterial({ color: 0x8a5a2e });
    const midY = yBottom + gap / 2;
    const postR = 0.08;
    const corners = [[-1.35, -1.35], [1.35, -1.35], [-1.35, 1.35], [1.35, 1.35]];
    for (const [px, pz] of corners) {
      _add(parent, new THREE.BoxGeometry(postR, gap, postR), beam, x + px, yBottom + gap / 2, z + pz);
    }
    const ringY = yBottom + gap * 0.12;
    _add(parent, new THREE.BoxGeometry(3.0, postR * 0.85, postR * 0.85), brace, x, ringY, z - 1.35);
    _add(parent, new THREE.BoxGeometry(3.0, postR * 0.85, postR * 0.85), brace, x, ringY, z + 1.35);
    _add(parent, new THREE.BoxGeometry(postR * 0.85, postR * 0.85, 3.0), brace, x - 1.35, ringY, z);
    _add(parent, new THREE.BoxGeometry(postR * 0.85, postR * 0.85, 3.0), brace, x + 1.35, ringY, z);
    _add(parent, new THREE.BoxGeometry(3.6, postR * 0.9, postR * 0.9), beam, x, midY, z);
    _add(parent, new THREE.BoxGeometry(postR * 0.9, postR * 0.9, 3.6), beam, x, midY, z);
    const mkDiag = (dx, dz) => {
      const len = Math.hypot(dx, dz) * 1.35;
      const m = new THREE.Mesh(new THREE.BoxGeometry(postR * 0.75, postR * 0.75, len), brace);
      m.position.set(x + dx * 0.5, midY, z + dz * 0.5);
      m.rotation.y = Math.atan2(dx, dz);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
    };
    mkDiag(2.7, 2.7);
    mkDiag(-2.7, 2.7);
  }

  function _buildWoodFloor(parent, x, y, z, opts = {}) {
    const M = _campMats();
    const plank = M ? M.woodFine(0xb5894e) : new THREE.MeshLambertMaterial({ color: 0xb5894e });
    const trim = M ? M.woodDark(0x6a421d) : new THREE.MeshLambertMaterial({ color: 0x6a421d });
    const supportDrop = Number.isFinite(opts.supportDrop) ? opts.supportDrop : 0;
    if (supportDrop > 0.2) {
      _buildFloorSupports(parent, x, y - supportDrop, y, z);
    }
    _add(parent, new THREE.BoxGeometry(3.0, 0.18, 3.0), plank, x, y + 0.09, z);
    for (let i = -1; i <= 1; i++) {
      _add(parent, new THREE.BoxGeometry(0.1, 0.2, 3.02), trim, x + i * 0.9, y + 0.11, z);
    }
    _add(parent, new THREE.BoxGeometry(3.02, 0.14, 0.1), trim, x, y + 0.13, z - 1.45);
    _add(parent, new THREE.BoxGeometry(3.02, 0.14, 0.1), trim, x, y + 0.13, z + 1.45);
  }

  function _buildWoodStair(parent, x, y, z) {
    const M = _campMats();
    const a = M ? M.wood(0xb5894e) : new THREE.MeshLambertMaterial({ color: 0xb5894e });
    const b = M ? M.woodDark(0x8a5a2e) : new THREE.MeshLambertMaterial({ color: 0x8a5a2e });
    const steps = 6;
    const stepH = 2.6 / steps;
    const stepD = 3.0 / steps;
    for (let i = 0; i < steps; i++) {
      const zc = z - 1.5 + stepD * (i + 0.5);
      _add(parent, new THREE.BoxGeometry(1.8, stepH * (i + 1), stepD), i % 2 ? b : a, x, y + stepH * (i + 1) / 2, zc);
    }
    _add(parent, new THREE.BoxGeometry(0.14, 2.4, 3.0), b, x - 0.97, y + 1.2, z);
    _add(parent, new THREE.BoxGeometry(0.14, 2.4, 3.0), b, x + 0.97, y + 1.2, z);
  }

  function _buildWoodDoorway(parent, x, y, z, gap) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const trimMat = M ? M.woodDark(0x5a371d) : new THREE.MeshLambertMaterial({ color: 0x5a371d });
    const side = (3.0 - gap) / 2;
    for (const sgn of [-1, 1]) {
      _add(parent, new THREE.BoxGeometry(side, 2.6, 0.36), wallMat, x + sgn * (gap / 2 + side / 2), y + 1.3, z);
    }
    _add(parent, new THREE.BoxGeometry(3.0, 0.4, 0.38), wallMat, x, y + 2.4, z);
    _add(parent, new THREE.BoxGeometry(0.16, 2.45, 0.42), trimMat, x - gap / 2, y + 1.25, z - 0.02);
    _add(parent, new THREE.BoxGeometry(0.16, 2.45, 0.42), trimMat, x + gap / 2, y + 1.25, z - 0.02);
    _add(parent, new THREE.BoxGeometry(gap + 0.2, 0.14, 0.42), trimMat, x, y + 2.15, z - 0.02);
  }

  function _buildWoodDoor(parent, x, y, z, gap) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const trimMat = M ? M.woodDark(0x5a371d) : new THREE.MeshLambertMaterial({ color: 0x5a371d });
    const side = (3.0 - gap) / 2;
    for (const sgn of [-1, 1]) {
      _add(parent, new THREE.BoxGeometry(side, 2.6, 0.36), wallMat, x + sgn * (gap / 2 + side / 2), y + 1.3, z);
    }
    _add(parent, new THREE.BoxGeometry(3.0, 0.4, 0.38), wallMat, x, y + 2.4, z);
    _add(parent, new THREE.BoxGeometry(0.16, 2.45, 0.42), trimMat, x - gap / 2, y + 1.25, z - 0.02);
    _add(parent, new THREE.BoxGeometry(0.16, 2.45, 0.42), trimMat, x + gap / 2, y + 1.25, z - 0.02);
    _add(parent, new THREE.BoxGeometry(gap + 0.2, 0.14, 0.42), trimMat, x, y + 2.15, z - 0.02);

    const doorW = Math.max(0.9, gap - 0.1);
    const doorPivot = new THREE.Group();
    doorPivot.name = 'buildDoorPivot';
    doorPivot.position.set(x - doorW / 2, y + 0.08, z - 0.11);
    doorPivot.userData.isDoor = true;
    parent.add(doorPivot);
    _add(doorPivot, new THREE.BoxGeometry(doorW, 2.02, 0.12), trimMat, doorW / 2, 1.01, 0);
    _add(doorPivot, new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshLambertMaterial({ color: 0xb99b52 }), doorW - 0.18, 1.55, -0.07);
    parent.userData.doorPivot = doorPivot;
  }

  function _houseMats() {
    const M = _campMats();
    return {
      wallA: M ? M.wood(0xa47b55) : new THREE.MeshLambertMaterial({ color: 0xa47b55 }),
      wallB: new THREE.MeshLambertMaterial({ color: 0xb6b0a0 }),
      trim: M ? M.woodDark(0x4b3320) : new THREE.MeshLambertMaterial({ color: 0x4b3320 }),
      door: M ? M.woodDark(0x3a1f12) : new THREE.MeshLambertMaterial({ color: 0x3a1f12 }),
      roofRed: new THREE.MeshLambertMaterial({ color: 0x7d2f24 }),
      roofDark: new THREE.MeshLambertMaterial({ color: 0x303238 }),
      floor: M ? M.woodFine(0x9a6a3a) : new THREE.MeshLambertMaterial({ color: 0x9a6a3a }),
      plaster: new THREE.MeshLambertMaterial({ color: 0xd8d0be }),
      tile: new THREE.MeshLambertMaterial({ color: 0xb7c4c8 }),
      glass: new THREE.MeshLambertMaterial({ color: 0x7fb1c1, transparent: true, opacity: 0.55, emissive: 0x0b1a20, emissiveIntensity: 0.12 }),
      sofa: new THREE.MeshLambertMaterial({ color: 0x4b526f }),
      bed: new THREE.MeshLambertMaterial({ color: 0xd8c8b8 }),
      water: new THREE.MeshLambertMaterial({ color: 0xe7ece8 }),
    };
  }

  function _raisedHouseFloor(parent, M, W, D) {
    _box(parent, M.trim, W + 0.25, 0.16, D + 0.25, 0, 0.08, 0);
    _box(parent, M.floor, W, 0.18, D, 0, 0.20, 0);
  }

  function _box(parent, mat, w, h, d, x, y, z) {
    return _add(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  }

  function _shackStyleDoor(parent, M, x, z, closedRotY, openAngle, name) {
    const DOOR_W = 2.08;
    const DOOR_H = 2.34;
    const DOOR_D = 0.14;
    const DOOR_HX = DOOR_W * 0.5;
    const base = new THREE.Group();
    base.name = `${name || 'smallCityHouseDoor'}Base`;
    base.position.set(x, 0.08, z);
    base.rotation.y = closedRotY || 0;
    parent.add(base);

    const doorPivot = new THREE.Group();
    doorPivot.name = name || 'smallCityHouseDoorPivot';
    doorPivot.position.set(0, 0, 0);
    doorPivot.userData.isDoor = true;
    doorPivot.userData.openAngle = Number.isFinite(openAngle) ? openAngle : DOOR_OPEN_ANGLE;
    base.add(doorPivot);
    const door = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, DOOR_H, DOOR_D), M.door);
    door.name = 'smallCityHouseDoor';
    door.position.set(DOOR_HX - 0.02, DOOR_H * 0.5, 0);
    door.castShadow = door.receiveShadow = true;
    doorPivot.add(door);
    _add(doorPivot, new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshLambertMaterial({ color: 0xb99b52 }), DOOR_W - 0.22, DOOR_H * 0.82, -0.07);
    parent.userData.doorPivot = doorPivot;
    return doorPivot;
  }

  function _openSouthEntry(parent, M, D) {
    const z = D / 2 + 0.055;
    _box(parent, M.trim, 0.18, 2.55, 0.22, -1.18, 1.27, z);
    _box(parent, M.trim, 0.18, 2.55, 0.22, 1.18, 1.27, z);
    _box(parent, M.trim, 2.55, 0.20, 0.22, 0, 2.42, z);
    _box(parent, M.trim, 2.55, 0.12, 0.28, 0, 0.28, z);
    _shackStyleDoor(parent, M, -1.04, z + 0.01, 0, Math.PI * 0.52, 'smallCitySouthDoorPivot');
  }

  function _openWestEntry(parent, M, W) {
    const x = -W / 2 - 0.055;
    _box(parent, M.trim, 0.22, 2.55, 0.18, x, 1.27, -1.18);
    _box(parent, M.trim, 0.22, 2.55, 0.18, x, 1.27, 1.18);
    _box(parent, M.trim, 0.22, 0.20, 2.55, x, 2.42, 0);
    _box(parent, M.trim, 0.28, 0.12, 2.55, x, 0.28, 0);
    _shackStyleDoor(parent, M, x + 0.01, 1.04, Math.PI / 2, -Math.PI * 0.52, 'smallCityWestDoorPivot');
  }

  function _buildSmallCityHouseA(parent) {
    const M = _houseMats();
    const W = 11.0, D = 9.5, H = 3.1, T = 0.22;
    _raisedHouseFloor(parent, M, W, D);
    _box(parent, M.wallA, W, H, T, 0, H / 2, -D / 2);
    _box(parent, M.wallA, T, H, D, -W / 2, H / 2, 0);
    _box(parent, M.wallA, T, H, D, W / 2, H / 2, 0);
    _box(parent, M.wallA, 4.5, H, T, -3.25, H / 2, D / 2);
    _box(parent, M.wallA, 4.5, H, T, 3.25, H / 2, D / 2);
    _box(parent, M.wallA, 2.0, 0.65, T, 0, 2.78, D / 2);
    _openSouthEntry(parent, M, D);

    _box(parent, M.plaster, T, H, 2.6, -1.8, H / 2, -2.65);
    _box(parent, M.plaster, T, H, 1.8, -1.8, H / 2, 2.85);
    _box(parent, M.plaster, T, 0.35, 3.3, -1.8, H - 0.18, 0.3);
    _box(parent, M.plaster, 1.8, H, T, -2.0, H / 2, 1.0);
    _box(parent, M.plaster, 4.2, H, T, 3.2, H / 2, 1.0);
    _box(parent, M.plaster, 2.2, 0.35, T, 0, H - 0.18, 1.0);

    for (const [wx, wz, ww, wd] of [[-3.6, -D / 2 - 0.02, 1.35, 0.06], [3.4, -D / 2 - 0.02, 1.35, 0.06], [-W / 2 - 0.02, -1.7, 0.06, 1.25], [W / 2 + 0.02, 1.6, 0.06, 1.15]]) {
      _box(parent, M.glass, ww, 0.75, wd, wx, 1.55, wz);
    }

    _box(parent, M.sofa, 2.4, 0.45, 0.82, 2.8, 0.36, 3.0);
    _box(parent, M.sofa, 2.4, 0.65, 0.14, 2.8, 0.78, 2.6);
    _box(parent, M.trim, 1.55, 0.08, 0.95, 2.5, 0.5, 1.2);
    _box(parent, M.bed, 1.65, 0.32, 2.25, -3.75, 0.38, -2.0);
    _box(parent, M.trim, 1.75, 0.62, 0.12, -3.75, 0.72, -3.15);
    _box(parent, M.water, 0.78, 0.42, 0.78, 3.35, 0.62, -1.4);
    _box(parent, M.water, 1.18, 0.42, 0.62, 3.25, 0.60, -3.0);

    _box(parent, M.plaster, W - 0.15, 0.12, D - 0.15, 0, H + 0.06, 0);
    _add(parent, new THREE.BoxGeometry(W + 1.35, 0.22, D / 2 + 1.05), M.roofRed, 0, H + 0.66, -D / 4 - 0.12, -0.20, 0, 0);
    _add(parent, new THREE.BoxGeometry(W + 1.35, 0.22, D / 2 + 1.05), M.roofRed, 0, H + 0.66, D / 4 + 0.12, 0.20, 0, 0);
    _box(parent, M.trim, W + 1.45, 0.22, 0.24, 0, H + 0.86, 0);
    _box(parent, M.roofRed, W + 0.75, 0.45, 0.28, 0, H + 0.35, -D / 2 - 0.06);
    _box(parent, M.roofRed, W + 0.75, 0.45, 0.28, 0, H + 0.35, D / 2 + 0.06);
  }

  function _buildSmallCityHouseB(parent) {
    const M = _houseMats();
    const W = 10.0, D = 10.5, H = 3.2, T = 0.24;
    _raisedHouseFloor(parent, M, W, D);
    _box(parent, M.wallB, W, H, T, 0, H / 2, -D / 2);
    _box(parent, M.wallB, W, H, T, 0, H / 2, D / 2);
    _box(parent, M.wallB, T, H, 4.25, -W / 2, H / 2, -3.125);
    _box(parent, M.wallB, T, H, 4.25, -W / 2, H / 2, 3.125);
    _box(parent, M.wallB, T, H, D, W / 2, H / 2, 0);
    _box(parent, M.wallB, T, 0.65, 2.0, -W / 2, 2.78, 0);
    _openWestEntry(parent, M, W);

    _box(parent, M.plaster, 2.6, H, T, -2.65, H / 2, -1.0);
    _box(parent, M.plaster, 4.1, H, T, 2.6, H / 2, -1.0);
    _box(parent, M.plaster, 1.85, 0.35, T, -0.4, H - 0.18, -1.0);
    _box(parent, M.plaster, T, H, 1.7, 2.4, H / 2, 2.9);
    _box(parent, M.plaster, T, 0.35, 1.55, 2.4, H - 0.18, 1.15);

    for (const [wx, wz, ww, wd] of [[-2.5, -D / 2 - 0.02, 1.35, 0.06], [2.8, -D / 2 - 0.02, 1.25, 0.06], [W / 2 + 0.02, -2.0, 0.06, 1.35], [W / 2 + 0.02, 2.8, 0.06, 1.2]]) {
      _box(parent, M.glass, ww, 0.75, wd, wx, 1.55, wz);
    }

    _box(parent, M.sofa, 0.45, 0.45, 2.35, -2.15, 0.36, 3.0);
    _box(parent, M.sofa, 0.14, 0.65, 2.35, -2.55, 0.78, 3.0);
    _box(parent, M.trim, 1.35, 0.08, 1.0, -0.5, 0.5, 1.4);
    _box(parent, M.bed, 1.65, 0.32, 2.25, -2.7, 0.38, -3.0);
    _box(parent, M.trim, 1.75, 0.62, 0.12, -2.7, 0.72, -4.15);
    _box(parent, M.tile, 1.55, 0.05, 2.0, 3.45, 0.19, 1.9);
    _box(parent, M.water, 0.78, 0.42, 0.78, 3.1, 0.62, 1.0);
    _box(parent, M.water, 1.22, 0.40, 0.62, 3.1, 0.61, 3.0);

    _box(parent, M.plaster, W - 0.15, 0.12, D - 0.15, 0, H + 0.06, 0);
    _box(parent, M.roofDark, W + 0.9, 0.28, D + 0.9, 0, H + 0.28, 0);
    _box(parent, M.trim, W + 0.65, 0.45, 0.22, 0, H + 0.42, -D / 2);
    _box(parent, M.trim, W + 0.65, 0.45, 0.22, 0, H + 0.42, D / 2);
  }

  /** Vertical marker that stays readable from far away. */
  function _buildMarkerPole(parent, x, y, z, side) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);

    const poleMat = M ? M.woodPole(0x6b4a20) : new THREE.MeshLambertMaterial({ color: 0x6b4a20 });
    const flagMat = new THREE.MeshLambertMaterial({
      color: side < 0 ? 0xd7c24a : 0xb86235,
      emissive: side < 0 ? 0x251e08 : 0x240f08,
      emissiveIntensity: 0.18,
    });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffc56d });

    _add(g, new THREE.CylinderGeometry(0.07, 0.09, 4.2, 6), poleMat, 0, 2.1, 0);
    _add(g, new THREE.BoxGeometry(0.95, 0.06, 0.06), poleMat, side * 0.32, 3.92, 0);

    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.74, 0.05), flagMat);
    flag.position.set(side * 0.72, 3.62, 0);
    flag.rotation.z = side * 0.08;
    flag.castShadow = flag.receiveShadow = true;
    g.add(flag);

    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), lampMat);
    lamp.position.set(side * 0.92, 3.84, 0.02);
    g.add(lamp);

    const light = new THREE.PointLight(0xffc46a, 0.55, 8, 2);
    light.position.set(side * 0.92, 3.84, 0.02);
    g.add(light);
  }

  /** Rondin de lisière — un segment ; scale = longueur / 0.42 m */
  function _buildBorderLog(root) {
    const M = _campMats();
    const bark = M ? M.bark() : new THREE.MeshLambertMaterial({ color: 0x4a3018 });
    const baseLen = 0.42;
    const r = 0.055;
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.92, r, baseLen, 6), bark);
    log.rotation.order = 'YXZ';
    log.rotation.y = 0;
    log.rotation.x = Math.PI / 2;
    log.position.set(0, r + 0.015, 0);
    log.castShadow = true;
    log.receiveShadow = true;
    root.add(log);
  }

  /** Lisière de rondins + pierres — jointure douce clairière / herbe */
