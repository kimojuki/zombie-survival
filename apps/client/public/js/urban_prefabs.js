// Prefabs ville / urbain — catalogue RCON pour construction de map (S02+).
(function () {
  'use strict';

  function _add(parent, geo, mat, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function _M() {
    return ZS.CampTextures?.materials?.() || null;
  }

  function _buildTrashBin(root) {
    const metal = new THREE.MeshLambertMaterial({ color: 0x3a5a38 });
    const rim = new THREE.MeshLambertMaterial({ color: 0x2a3a28 });
    _add(root, new THREE.CylinderGeometry(0.22, 0.26, 0.72, 10), metal, 0, 0.36, 0);
    _add(root, new THREE.CylinderGeometry(0.28, 0.28, 0.05, 10), rim, 0, 0.74, 0);
    _add(root, new THREE.BoxGeometry(0.04, 0.12, 0.18), rim, 0.18, 0.62, -0.02, 0, 0.25, 0);
  }

  function _buildParkBench(root) {
    const M = _M();
    const wood = M?.woodFine?.(0x6a5038) || new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    const iron = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    for (const sx of [-0.48, 0.48]) {
      _add(root, new THREE.BoxGeometry(0.06, 0.42, 0.06), iron, sx, 0.21, 0);
      _add(root, new THREE.BoxGeometry(0.06, 0.42, 0.06), iron, sx, 0.21, -0.38);
    }
    _add(root, new THREE.BoxGeometry(1.05, 0.05, 0.42), wood, 0, 0.38, -0.19);
    _add(root, new THREE.BoxGeometry(1.05, 0.05, 0.08), wood, 0, 0.52, -0.36);
    _add(root, new THREE.BoxGeometry(1.05, 0.04, 0.06), wood, 0, 0.22, -0.02);
    _add(root, new THREE.BoxGeometry(0.08, 0.34, 0.42), iron, -0.52, 0.17, -0.19);
    _add(root, new THREE.BoxGeometry(0.08, 0.34, 0.42), iron, 0.52, 0.17, -0.19);
  }

  function _buildStreetLamp(root) {
    const iron = new THREE.MeshLambertMaterial({ color: 0x2a2e34 });
    const glass = new THREE.MeshLambertMaterial({ color: 0xfff0c8, emissive: 0x3a2808, emissiveIntensity: 0.35 });
    _add(root, new THREE.CylinderGeometry(0.07, 0.09, 0.08, 8), iron, 0, 0.04, 0);
    _add(root, new THREE.CylinderGeometry(0.045, 0.055, 3.05, 8), iron, 0, 1.57, 0);
    _add(root, new THREE.BoxGeometry(0.55, 0.05, 0.08), iron, 0.22, 3.08, 0);
    _add(root, new THREE.BoxGeometry(0.22, 0.28, 0.18), glass, 0.42, 2.92, 0);
    const light = new THREE.PointLight(0xffd080, 1.1, 14, 1.4);
    light.position.set(0.42, 2.88, 0);
    root.add(light);
  }

  function _buildFireHydrant(root) {
    const red = new THREE.MeshLambertMaterial({ color: 0xb82828 });
    const cap = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    _add(root, new THREE.CylinderGeometry(0.14, 0.16, 0.52, 10), red, 0, 0.26, 0);
    _add(root, new THREE.SphereGeometry(0.17, 10, 8), red, 0, 0.58, 0);
    for (const sx of [-1, 1]) {
      _add(root, new THREE.CylinderGeometry(0.045, 0.045, 0.18, 8), cap, sx * 0.18, 0.42, 0, 0, 0, Math.PI / 2);
    }
    _add(root, new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8), cap, 0, 0.72, 0);
  }

  function _buildMailbox(root) {
    const blue = new THREE.MeshLambertMaterial({ color: 0x284868 });
    const post = new THREE.MeshLambertMaterial({ color: 0x4a4038 });
    _add(root, new THREE.BoxGeometry(0.08, 0.08, 0.08), post, 0, 0.04, 0);
    _add(root, new THREE.CylinderGeometry(0.035, 0.04, 0.95, 8), post, 0, 0.52, 0);
    _add(root, new THREE.BoxGeometry(0.32, 0.28, 0.22), blue, 0, 1.08, 0);
    _add(root, new THREE.BoxGeometry(0.28, 0.04, 0.02), new THREE.MeshLambertMaterial({ color: 0x88a8c8 }), 0, 1.08, -0.12);
  }

  function _buildBicycleRack(root) {
    const iron = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    _add(root, new THREE.BoxGeometry(1.35, 0.04, 0.06), iron, 0, 0.02, 0);
    for (let i = -2; i <= 2; i++) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 6, 12, Math.PI), iron);
      hoop.rotation.y = Math.PI / 2;
      hoop.position.set(i * 0.28, 0.18, 0);
      hoop.castShadow = true;
      root.add(hoop);
    }
  }

  function _buildTrafficCone(root) {
    const orange = new THREE.MeshLambertMaterial({ color: 0xd85818 });
    const white = new THREE.MeshLambertMaterial({ color: 0xe8e8e0 });
    _add(root, new THREE.CylinderGeometry(0.14, 0.18, 0.04, 10), orange, 0, 0.02, 0);
    _add(root, new THREE.CylinderGeometry(0.02, 0.14, 0.38, 10), orange, 0, 0.23, 0);
    _add(root, new THREE.CylinderGeometry(0.028, 0.11, 0.06, 10), white, 0, 0.18, 0);
  }

  function _buildDumpster(root) {
    const green = new THREE.MeshLambertMaterial({ color: 0x3a5840 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a3828 });
    _add(root, new THREE.BoxGeometry(1.65, 0.12, 0.95), dark, 0, 0.06, 0);
    _add(root, new THREE.BoxGeometry(1.55, 0.95, 0.88), green, 0, 0.56, 0);
    _add(root, new THREE.BoxGeometry(1.55, 0.08, 0.88), dark, 0, 1.06, 0);
    for (const sx of [-0.62, 0.62]) {
      _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8), dark, sx, 1.18, 0);
    }
    _add(root, new THREE.BoxGeometry(0.42, 0.05, 0.04), dark, 0, 0.92, -0.46);
  }

  function _lam(topColor, sideColor) {
    const top = new THREE.MeshLambertMaterial({ color: topColor || 0xd8d0c0 });
    const side = new THREE.MeshLambertMaterial({ color: sideColor || 0x9a9088 });
    return [top, side];
  }

  /** Palette EUR simplifiée — lattes + calots (pivot centre sol). */
  function _addEuroPallet(parent, y, rotY, scaleW, scaleD) {
    const M = _M();
    const deck = M?.woodFine?.(0xc8a878) || new THREE.MeshLambertMaterial({ color: 0xc8a878 });
    const block = M?.woodDark?.(0x6a5038) || new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    const W = 1.0 * scaleW;
    const D = 0.72 * scaleD;
    const g = new THREE.Group();
    g.position.set(0, y, 0);
    g.rotation.y = rotY || 0;
    parent.add(g);
    for (let i = -2; i <= 2; i++) {
      _add(g, new THREE.BoxGeometry(W * 0.92, 0.022, 0.09), deck, i * W * 0.19, 0.138, 0);
    }
    for (const [bx, bz] of [[-0.38, 0], [0.38, 0], [0, 0.24], [0, -0.24]]) {
      _add(g, new THREE.BoxGeometry(0.09, 0.078, 0.09), block, bx * scaleW, 0.078, bz * scaleD);
    }
    for (let i = -2; i <= 2; i++) {
      _add(g, new THREE.BoxGeometry(W * 0.92, 0.022, 0.09), deck, i * W * 0.19, 0.018, 0);
    }
    return g;
  }

  function _addCardboardBox(parent, x, y, z, w, h, d, ry, tape) {
    const M = _M();
    const box = M?.canvasTight?.(0x9a7848) || new THREE.MeshLambertMaterial({ color: 0x9a7848 });
    const flap = M?.canvas?.(0xa88868) || new THREE.MeshLambertMaterial({ color: 0xa88868 });
    const tapeMat = new THREE.MeshLambertMaterial({ color: 0xc8b878 });
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);
    const body = _add(g, new THREE.BoxGeometry(w, h, d), box, 0, h * 0.5, 0);
    body.castShadow = body.receiveShadow = true;
    _add(g, new THREE.BoxGeometry(w * 0.96, 0.012, d * 0.96), flap, 0, h - 0.006, 0);
    if (tape !== false) {
      _add(g, new THREE.BoxGeometry(w * 1.02, 0.018, 0.05), tapeMat, 0, h * 0.52, 0);
      _add(g, new THREE.BoxGeometry(0.05, 0.018, d * 1.02), tapeMat, 0, h * 0.52, 0);
    }
    return g;
  }

  function _buildPalletStack(root) {
    _addEuroPallet(root, 0, 0.04, 1, 1);
    _addEuroPallet(root, 0.14, Math.PI * 0.5, 0.92, 0.92);
    _addCardboardBox(root, -0.12, 0.16, 0.08, 0.42, 0.34, 0.36, 0.08, true);
    _addCardboardBox(root, 0.22, 0.16, -0.14, 0.36, 0.28, 0.32, -0.22, true);
    _addCardboardBox(root, 0.05, 0.48, 0.02, 0.38, 0.26, 0.30, 0.15, true);
    const M = _M();
    const wrap = M?.canvas?.(0x8a6848) || new THREE.MeshLambertMaterial({ color: 0x8a6848 });
    const shrink = _add(root, new THREE.BoxGeometry(0.44, 0.22, 0.40), wrap, -0.28, 0.52, 0.18, 0, -0.12, 0.05);
    shrink.castShadow = true;
    _add(root, new THREE.BoxGeometry(0.46, 0.024, 0.42), new THREE.MeshLambertMaterial({ color: 0xb8c8d8, transparent: true, opacity: 0.35 }),
      -0.28, 0.63, 0.18, 0, -0.12, 0.05);
  }

  function _buildBarrel(root) {
    const drum = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const band = new THREE.MeshLambertMaterial({ color: 0x2a3038 });
    _add(root, new THREE.CylinderGeometry(0.28, 0.30, 0.82, 12), drum, 0, 0.41, 0);
    for (const y of [0.18, 0.41, 0.64]) {
      _add(root, new THREE.TorusGeometry(0.29, 0.018, 6, 14), band, 0, y, 0, Math.PI / 2, 0, 0);
    }
  }

  function _buildFencePanel(root) {
    const post = new THREE.MeshLambertMaterial({ color: 0x5a5a58 });
    const wire = new THREE.MeshLambertMaterial({ color: 0x8a9098, transparent: true, opacity: 0.55 });
    for (const sx of [-0.92, 0.92]) {
      _add(root, new THREE.BoxGeometry(0.06, 1.05, 0.06), post, sx, 0.52, 0);
    }
    _add(root, new THREE.BoxGeometry(1.78, 0.04, 0.02), post, 0, 0.18, 0);
    _add(root, new THREE.BoxGeometry(1.78, 0.04, 0.02), post, 0, 0.98, 0);
    const mesh = _add(root, new THREE.BoxGeometry(1.68, 0.72, 0.02), wire, 0, 0.58, 0);
    mesh.castShadow = false;
  }

  function _buildBollard(root) {
    const concrete = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const cap = new THREE.MeshLambertMaterial({ color: 0xd8d4c8 });
    _add(root, new THREE.CylinderGeometry(0.12, 0.14, 0.78, 10), concrete, 0, 0.39, 0);
    _add(root, new THREE.CylinderGeometry(0.14, 0.14, 0.06, 10), cap, 0, 0.81, 0);
    _add(root, new THREE.CylinderGeometry(0.18, 0.18, 0.04, 10), concrete, 0, 0.02, 0);
  }

  function _buildFridge(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xc8d0d8 });
    const handle = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    const seal = new THREE.MeshLambertMaterial({ color: 0x2a3038 });
    _add(root, new THREE.BoxGeometry(0.58, 1.62, 0.58), body, 0, 0.81, 0);
    _add(root, new THREE.BoxGeometry(0.54, 0.02, 0.54), seal, 0, 0.82, 0);
    _add(root, new THREE.BoxGeometry(0.04, 0.42, 0.04), handle, 0.26, 1.02, -0.30);
    _add(root, new THREE.BoxGeometry(0.04, 0.28, 0.04), handle, 0.26, 0.38, -0.30);
  }

  function _buildGroceryShelf(root) {
    const frame = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    const shelf = new THREE.MeshLambertMaterial({ color: 0x9098a0 });
    const can = new THREE.MeshLambertMaterial({ color: 0x8a3828 });
    const box = new THREE.MeshLambertMaterial({ color: 0x6a6848 });
    for (const sx of [-0.52, 0.52]) {
      _add(root, new THREE.BoxGeometry(0.04, 1.72, 0.38), frame, sx, 0.86, 0);
    }
    for (const y of [0.08, 0.58, 1.08, 1.58]) {
      _add(root, new THREE.BoxGeometry(1.02, 0.03, 0.36), shelf, 0, y, 0);
    }
    for (let i = 0; i < 5; i++) {
      _add(root, new THREE.CylinderGeometry(0.035, 0.035, 0.11, 8), can, -0.36 + i * 0.18, 0.64, 0.06);
    }
    _add(root, new THREE.BoxGeometry(0.22, 0.14, 0.16), box, 0.18, 0.65, -0.08);
    _add(root, new THREE.BoxGeometry(0.18, 0.12, 0.14), box, -0.12, 1.14, -0.06);
  }

  function _buildShopCounter(root) {
    const M = _M();
    const [topMat, sideMat] = _lam(0xe8e0d4, 0x5a5048);
    const topTex = M?.tableTop?.() || topMat;
    const panel = M?.woodDark?.(0x4a4038) || new THREE.MeshLambertMaterial({ color: 0x4a4038 });
    const kick = new THREE.MeshLambertMaterial({ color: 0x2a2828 });
    const metal = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x7a8088 });

    const COUNTER_H = 0.90;
    const TOP_T = 0.045;
    const TOP_Y = COUNTER_H + TOP_T * 0.5;
    const MAIN_W = 1.58;
    const MAIN_D = 0.58;
    const WING_W = 0.52;
    const WING_D = 0.52;

    // Corps principal — face client −Z
    _add(root, new THREE.BoxGeometry(MAIN_W, COUNTER_H, MAIN_D), panel, 0, COUNTER_H * 0.5, 0);
    for (let i = -3; i <= 3; i++) {
      _add(root, new THREE.BoxGeometry(MAIN_W * 0.92, 0.012, 0.008), sideMat, 0, 0.22 + i * 0.11, -MAIN_D * 0.5 - 0.004);
    }
    _add(root, new THREE.BoxGeometry(MAIN_W, 0.06, MAIN_D + 0.02), kick, 0, 0.03, 0);

    // Aile caisse (+X, +Z)
    _add(root, new THREE.BoxGeometry(WING_W, COUNTER_H * 0.96, WING_D), panel,
      MAIN_W * 0.5 - WING_W * 0.5 + 0.02, COUNTER_H * 0.48, MAIN_D * 0.5 + WING_D * 0.5 - 0.04);
    _add(root, new THREE.BoxGeometry(WING_W, 0.06, WING_D), kick,
      MAIN_W * 0.5 - WING_W * 0.5 + 0.02, 0.03, MAIN_D * 0.5 + WING_D * 0.5 - 0.04);

    // Plateau principal + retour
    _add(root, new THREE.BoxGeometry(MAIN_W + 0.06, TOP_T, MAIN_D + 0.05), topTex, 0, TOP_Y, 0);
    _add(root, new THREE.BoxGeometry(WING_W + 0.04, TOP_T, WING_D + 0.04), topTex,
      MAIN_W * 0.5 - WING_W * 0.5 + 0.02, TOP_Y, MAIN_D * 0.5 + WING_D * 0.5 - 0.04);

    // Bandeau avant
    _add(root, new THREE.BoxGeometry(MAIN_W * 0.88, 0.08, 0.018),
      new THREE.MeshLambertMaterial({ color: 0x8a3828 }), 0, COUNTER_H - 0.06, -MAIN_D * 0.5 - 0.008);

    // Caisse enregistreuse
    const regX = MAIN_W * 0.5 - WING_W * 0.5 + 0.02;
    const regZ = MAIN_D * 0.5 + WING_D * 0.5 - 0.04;
    _add(root, new THREE.BoxGeometry(0.28, 0.12, 0.22), metal, regX, TOP_Y + 0.08, regZ);
    _add(root, new THREE.BoxGeometry(0.22, 0.14, 0.018),
      new THREE.MeshLambertMaterial({ color: 0x1a2838 }), regX, TOP_Y + 0.16, regZ - 0.12);
    _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.04),
      new THREE.MeshLambertMaterial({ color: 0x3a8838 }), regX + 0.08, TOP_Y + 0.10, regZ + 0.08);

    // Vitre protection client (disque plat)
    const glass = new THREE.MeshLambertMaterial({ color: 0xc8d8e8, transparent: true, opacity: 0.42 });
    const sneeze = _add(root, new THREE.BoxGeometry(0.72, 0.38, 0.012), glass, -0.18, TOP_Y + 0.22, -MAIN_D * 0.5 - 0.006);
    sneeze.castShadow = false;
    _add(root, new THREE.BoxGeometry(0.74, 0.04, 0.04), metal, -0.18, TOP_Y + 0.04, -MAIN_D * 0.5 - 0.01);

    // Tiroir-caisse côté employé
    _add(root, new THREE.BoxGeometry(0.38, 0.08, 0.32), metal, 0.42, TOP_Y - 0.02, 0.12);
  }

  function _buildSofa(root) {
    const M = _M();
    const fabric = M?.canvasTight?.(0x4a5848) || new THREE.MeshLambertMaterial({ color: 0x4a5848 });
    const fabricLight = M?.canvas?.(0x5a6858) || new THREE.MeshLambertMaterial({ color: 0x5a6858 });
    const leg = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x3a2820 });
    const W = 1.82;
    const D = 0.78;
    const SEAT_Y = 0.40;
    const ARM_W = 0.16;
    const ARM_H = 0.58;

    // Socle + pieds
    _add(root, new THREE.BoxGeometry(W - ARM_W * 2 + 0.04, 0.14, D - 0.12), fabric, 0, 0.07, 0.02);
    for (const [lx, lz] of [[-0.72, 0.28], [0.72, 0.28], [-0.72, -0.28], [0.72, -0.28]]) {
      _add(root, new THREE.BoxGeometry(0.05, 0.11, 0.05), leg, lx, 0.055, lz);
    }

    // Assise (3 coussins)
    for (const sx of [-0.52, 0, 0.52]) {
      const seat = _add(root, new THREE.BoxGeometry(0.54, 0.12, D - 0.22), fabricLight, sx, SEAT_Y, 0.02);
      seat.castShadow = seat.receiveShadow = true;
      _add(root, new THREE.BoxGeometry(0.50, 0.018, D - 0.28), fabric, sx, SEAT_Y + 0.07, 0.02);
    }

    // Accoudoirs arrondis
    for (const sx of [-1, 1]) {
      const ax = sx * (W * 0.5 - ARM_W * 0.5);
      _add(root, new THREE.BoxGeometry(ARM_W, ARM_H, D), fabric, ax, SEAT_Y - 0.02 + ARM_H * 0.45, 0.02);
      _add(root, new THREE.BoxGeometry(ARM_W * 0.85, 0.08, D - 0.08), fabricLight, ax, SEAT_Y + 0.02, 0.02);
    }

    // Dossier (3 coussins inclinés)
    for (const sx of [-0.52, 0, 0.52]) {
      const back = _add(root, new THREE.BoxGeometry(0.52, 0.48, 0.14), fabricLight, sx, SEAT_Y + 0.38, D * 0.5 - 0.08, -0.22, 0, 0);
      back.castShadow = true;
      _add(root, new THREE.BoxGeometry(0.48, 0.42, 0.025), fabric, sx, SEAT_Y + 0.36, D * 0.5 - 0.02, -0.2, 0, 0);
    }

    // Barre dossier + coussin central déco
    _add(root, new THREE.BoxGeometry(W - ARM_W * 2.2, 0.06, 0.08), fabric, 0, SEAT_Y + 0.22, D * 0.5 - 0.04);
    const throwPillow = _add(root, new THREE.BoxGeometry(0.38, 0.10, 0.38), fabricLight, 0.48, SEAT_Y + 0.14, -0.08, 0.12, 0.35, 0);
    throwPillow.castShadow = true;

    // Usure — patch plus clair
    _add(root, new THREE.BoxGeometry(0.22, 0.08, 0.18),
      new THREE.MeshLambertMaterial({ color: 0x6a7868 }), -0.38, SEAT_Y + 0.08, 0.12, 0, 0.1, 0);
  }

  function _buildPlanter(root) {
    const pot = new THREE.MeshLambertMaterial({ color: 0x6a5848 });
    const soil = new THREE.MeshLambertMaterial({ color: 0x3a3028 });
    const leaf = new THREE.MeshLambertMaterial({ color: 0x4a6840 });
    _add(root, new THREE.BoxGeometry(0.62, 0.42, 0.42), pot, 0, 0.21, 0);
    _add(root, new THREE.BoxGeometry(0.54, 0.06, 0.34), soil, 0, 0.45, 0);
    _add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.38, 6), leaf, -0.08, 0.62, 0.04, 0.15, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.32, 6), leaf, 0.06, 0.58, -0.06, -0.1, 0.4, 0);
    _add(root, new THREE.SphereGeometry(0.14, 7, 6), leaf, 0, 0.78, 0);
  }

  function _buildStopSign(root) {
    const red = new THREE.MeshLambertMaterial({ color: 0xa81818 });
    const white = new THREE.MeshLambertMaterial({ color: 0xe8e8e0 });
    const pole = new THREE.MeshLambertMaterial({ color: 0x6a6860 });
    _add(root, new THREE.CylinderGeometry(0.035, 0.04, 2.05, 8), pole, 0, 1.02, 0);
    const sign = _add(root, new THREE.CylinderGeometry(0.28, 0.28, 0.018, 8), red, 0, 2.08, 0);
    sign.rotation.x = Math.PI / 2;
    _add(root, new THREE.BoxGeometry(0.22, 0.06, 0.004), white, 0, 2.09, -0.08);
    _add(root, new THREE.BoxGeometry(0.06, 0.18, 0.004), white, 0, 2.09, -0.02);
  }

  function _buildNewspaperBox(root) {
    const M = _M();
    const metal = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    const glass = new THREE.MeshLambertMaterial({ color: 0xa8c8d8, transparent: true, opacity: 0.45 });
    const paper = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    _add(root, new THREE.BoxGeometry(0.52, 0.72, 0.38), metal, 0, 0.36, 0);
    _add(root, new THREE.BoxGeometry(0.44, 0.48, 0.012), glass, 0, 0.48, -0.19);
    for (let i = 0; i < 4; i++) {
      _add(root, new THREE.BoxGeometry(0.38, 0.018, 0.28), paper, 0, 0.28 + i * 0.06, -0.08, 0.08, 0, 0);
    }
    _add(root, new THREE.BoxGeometry(0.48, 0.04, 0.04), metal, 0, 0.74, -0.18);
  }

  function _buildShoppingCart(root) {
    const wire = new THREE.MeshLambertMaterial({ color: 0x8a9098 });
    const handle = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    _add(root, new THREE.BoxGeometry(0.52, 0.28, 0.38), wire, 0, 0.42, 0.02);
    _add(root, new THREE.BoxGeometry(0.48, 0.04, 0.34), wire, 0, 0.58, 0.02);
    for (const [x, z] of [[-0.18, 0.14], [0.18, 0.14], [-0.18, -0.14], [0.18, -0.14]]) {
      _add(root, new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8), handle, x, 0.04, z);
    }
    _add(root, new THREE.BoxGeometry(0.04, 0.72, 0.04), handle, 0, 0.78, -0.22);
    _add(root, new THREE.BoxGeometry(0.32, 0.03, 0.03), handle, 0, 1.12, -0.22, -0.35, 0, 0);
  }

  function _buildVendingMachine(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x384858 });
    const trim = new THREE.MeshLambertMaterial({ color: 0x8a3828 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x88a8c8, transparent: true, opacity: 0.5 });
    _add(root, new THREE.BoxGeometry(0.72, 1.72, 0.58), body, 0, 0.86, 0);
    _add(root, new THREE.BoxGeometry(0.58, 1.02, 0.012), glass, 0, 1.02, -0.29);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        _add(root, new THREE.BoxGeometry(0.14, 0.18, 0.08),
          new THREE.MeshLambertMaterial({ color: 0x6a8090 + row * 0x020202 }),
          -0.16 + col * 0.16, 1.38 - row * 0.22, -0.24);
      }
    }
    _add(root, new THREE.BoxGeometry(0.62, 0.08, 0.04), trim, 0, 1.68, -0.30);
    _add(root, new THREE.BoxGeometry(0.22, 0.12, 0.14), trim, 0, 0.38, -0.28);
  }

  function _buildPoliceBarrier(root) {
    const yellow = new THREE.MeshLambertMaterial({ color: 0xd8a818 });
    const stripe = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const leg = new THREE.MeshLambertMaterial({ color: 0x4a4048 });
    _add(root, new THREE.BoxGeometry(1.05, 0.52, 0.06), yellow, 0, 0.48, 0);
    for (let i = -2; i <= 2; i++) {
      _add(root, new THREE.BoxGeometry(0.12, 0.52, 0.062), stripe, i * 0.18, 0.48, 0);
    }
    for (const sx of [-0.42, 0.42]) {
      _add(root, new THREE.BoxGeometry(0.04, 0.48, 0.04), leg, sx, 0.24, 0.04, 0.15, 0, 0);
    }
  }

  function _buildRoadSign(root) {
    const pole = new THREE.MeshLambertMaterial({ color: 0x7a7870 });
    const board = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    const white = new THREE.MeshLambertMaterial({ color: 0xe8e8e0 });
    _add(root, new THREE.CylinderGeometry(0.035, 0.04, 2.35, 8), pole, 0, 1.17, 0);
    _add(root, new THREE.BoxGeometry(0.72, 0.52, 0.018), board, 0, 2.42, 0);
    _add(root, new THREE.BoxGeometry(0.08, 0.32, 0.02), white, 0, 2.42, -0.012);
    _add(root, new THREE.BoxGeometry(0.32, 0.08, 0.02), white, 0.12, 2.48, -0.012, 0, 0, -0.6);
  }

  function _buildPropaneTank(root) {
    const tank = new THREE.MeshLambertMaterial({ color: 0xc8d0d8 });
    const band = new THREE.MeshLambertMaterial({ color: 0x8a3828 });
    const valve = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    _add(root, new THREE.CylinderGeometry(0.24, 0.26, 0.88, 12), tank, 0, 0.44, 0);
    _add(root, new THREE.TorusGeometry(0.25, 0.018, 6, 14), band, 0, 0.72, 0, Math.PI / 2, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), valve, 0, 0.94, 0);
    _add(root, new THREE.BoxGeometry(0.08, 0.04, 0.08), valve, 0, 1.02, 0);
  }

  function _buildTireStack(root) {
    const rubber = new THREE.MeshLambertMaterial({ color: 0x2a2828 });
    const rim = new THREE.MeshLambertMaterial({ color: 0x6a6860 });
    for (let i = 0; i < 3; i++) {
      _add(root, new THREE.TorusGeometry(0.32, 0.11, 8, 16), rubber, 0, 0.14 + i * 0.22, 0, Math.PI / 2, 0, 0);
      _add(root, new THREE.CylinderGeometry(0.16, 0.16, 0.04, 10), rim, 0, 0.14 + i * 0.22, 0);
    }
  }

  function _buildWheelbarrow(root) {
    const M = _M();
    const metal = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x7a8088 });
    const tray = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    const wood = M?.woodFine?.(0x6a5038) || new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    _add(root, new THREE.CylinderGeometry(0.22, 0.22, 0.08, 14), metal, 0, 0.22, 0.28, Math.PI / 2, 0, 0);
    _add(root, new THREE.BoxGeometry(0.02, 0.68, 0.02), wood, 0, 0.52, 0.08);
    _add(root, new THREE.BoxGeometry(0.62, 0.14, 0.48), tray, 0, 0.62, -0.12, -0.35, 0, 0);
    _add(root, new THREE.BoxGeometry(0.02, 0.02, 0.42), wood, -0.28, 0.72, -0.12, -0.35, 0, 0);
    _add(root, new THREE.BoxGeometry(0.02, 0.02, 0.42), wood, 0.28, 0.72, -0.12, -0.35, 0, 0);
  }

  function _buildAbandonedBike(root) {
    const frame = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    const tire = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const seat = new THREE.MeshLambertMaterial({ color: 0x4a2828 });
    root.rotation.y = 0.4;
    _add(root, new THREE.CylinderGeometry(0.32, 0.32, 0.04, 12), tire, -0.42, 0.32, 0.08, Math.PI / 2, 0.3, 0);
    _add(root, new THREE.CylinderGeometry(0.32, 0.32, 0.04, 12), tire, 0.38, 0.32, -0.12, Math.PI / 2, 0.3, 0);
    _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.72), frame, 0, 0.34, -0.02, 0, 0.2, 0.5);
    _add(root, new THREE.BoxGeometry(0.04, 0.38, 0.04), frame, -0.02, 0.52, 0.12, 0, 0.2, -0.4);
    _add(root, new THREE.BoxGeometry(0.12, 0.04, 0.08), seat, -0.02, 0.58, 0.08, 0, 0.2, 0.3);
    _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.28), frame, 0.08, 0.42, -0.28, 0, 0.2, 0.8);
  }

  function _buildOfficeDesk(root) {
    const M = _M();
    const top = M?.tableTop?.() || new THREE.MeshLambertMaterial({ color: 0x8a7868 });
    const leg = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x3a2820 });
    const panel = new THREE.MeshLambertMaterial({ color: 0x5a5048 });
    _add(root, new THREE.BoxGeometry(1.22, 0.045, 0.62), top, 0, 0.74, 0);
    for (const [x, z] of [[-0.54, 0.26], [0.54, 0.26], [-0.54, -0.26], [0.54, -0.26]]) {
      _add(root, new THREE.BoxGeometry(0.05, 0.74, 0.05), leg, x, 0.37, z);
    }
    _add(root, new THREE.BoxGeometry(0.42, 0.52, 0.04), panel, 0.38, 0.48, -0.30);
    _add(root, new THREE.BoxGeometry(0.38, 0.24, 0.018),
      new THREE.MeshLambertMaterial({ color: 0x1a2838 }), -0.12, 0.88, -0.30);
    _add(root, new THREE.BoxGeometry(0.34, 0.04, 0.12), panel, -0.12, 0.76, -0.30);
    _add(root, new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x2a2828 }), 0.28, 0.78, -0.08);
  }

  function _buildOfficeChair(root) {
    const fabric = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    const metal = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    const base = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    _add(root, new THREE.CylinderGeometry(0.22, 0.24, 0.06, 10), base, 0, 0.03, 0);
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8), metal, 0, 0.22, 0);
    _add(root, new THREE.BoxGeometry(0.42, 0.06, 0.40), fabric, 0, 0.44, 0.02);
    _add(root, new THREE.BoxGeometry(0.40, 0.48, 0.04), fabric, 0, 0.72, 0.20, -0.18, 0, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.18), base, Math.cos(a) * 0.22, 0.02, Math.sin(a) * 0.22, 0, a, 0.25);
    }
  }

  function _buildWardrobe(root) {
    const M = _M();
    const wood = M?.woodFine?.(0x5a4838) || new THREE.MeshLambertMaterial({ color: 0x5a4838 });
    const handle = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x8a9098 });
    _add(root, new THREE.BoxGeometry(1.05, 1.92, 0.52), wood, 0, 0.96, 0);
    _add(root, new THREE.BoxGeometry(0.012, 1.82, 0.48), new THREE.MeshLambertMaterial({ color: 0x4a4038 }), 0, 0.96, -0.02);
    for (const sx of [-0.22, 0.22]) {
      _add(root, new THREE.BoxGeometry(0.04, 0.12, 0.04), handle, sx, 0.92, -0.26);
    }
    _add(root, new THREE.BoxGeometry(1.08, 0.06, 0.54), wood, 0, 1.95, 0);
  }

  function _buildKitchenTable(root) {
    const M = _M();
    const top = M?.tableTop?.() || new THREE.MeshLambertMaterial({ color: 0x9a8878 });
    const leg = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x4a3828 });
    _add(root, new THREE.BoxGeometry(0.92, 0.04, 0.92), top, 0, 0.74, 0);
    for (const [x, z] of [[-0.38, 0.38], [0.38, 0.38], [-0.38, -0.38], [0.38, -0.38]]) {
      _add(root, new THREE.BoxGeometry(0.06, 0.74, 0.06), leg, x, 0.37, z);
    }
    _add(root, new THREE.BoxGeometry(0.72, 0.018, 0.72), top, 0, 0.76, 0);
  }

  function _buildKitchenChair(root) {
    const M = _M();
    const wood = M?.woodFine?.(0x6a5038) || new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    _add(root, new THREE.BoxGeometry(0.38, 0.04, 0.38), wood, 0, 0.46, 0);
    for (const [x, z] of [[-0.15, 0.15], [0.15, 0.15], [-0.15, -0.15], [0.15, -0.15]]) {
      _add(root, new THREE.BoxGeometry(0.04, 0.46, 0.04), wood, x, 0.23, z);
    }
    _add(root, new THREE.BoxGeometry(0.36, 0.04, 0.04), wood, 0, 0.88, 0.16);
    _add(root, new THREE.BoxGeometry(0.04, 0.42, 0.04), wood, -0.15, 0.68, 0.16);
    _add(root, new THREE.BoxGeometry(0.04, 0.42, 0.04), wood, 0.15, 0.68, 0.16);
    _add(root, new THREE.BoxGeometry(0.34, 0.32, 0.025), wood, 0, 0.70, 0.18, -0.12, 0, 0);
  }

  function _buildBookshelf(root) {
    const M = _M();
    const wood = M?.woodFine?.(0x5a4838) || new THREE.MeshLambertMaterial({ color: 0x5a4838 });
    const bookColors = [0x8a3828, 0x384868, 0x486838, 0x6a5848, 0x484848];
    _add(root, new THREE.BoxGeometry(0.82, 1.52, 0.28), wood, 0, 0.76, 0);
    for (const y of [0.06, 0.52, 0.98, 1.44]) {
      _add(root, new THREE.BoxGeometry(0.76, 0.03, 0.26), wood, 0, y, 0);
    }
    for (let i = 0; i < 8; i++) {
      const h = 0.22 + (i % 3) * 0.04;
      _add(root, new THREE.BoxGeometry(0.06, h, 0.18),
        new THREE.MeshLambertMaterial({ color: bookColors[i % bookColors.length] }),
        -0.30 + i * 0.08, 0.06 + h * 0.5, -0.02);
    }
    for (let i = 0; i < 6; i++) {
      _add(root, new THREE.BoxGeometry(0.08, 0.32, 0.16),
        new THREE.MeshLambertMaterial({ color: bookColors[(i + 2) % bookColors.length] }),
        -0.28 + i * 0.1, 0.68, -0.02);
    }
  }

  function _buildOldTv(root) {
    const plastic = new THREE.MeshLambertMaterial({ color: 0x4a4848 });
    const screen = new THREE.MeshLambertMaterial({ color: 0x2a3838, emissive: 0x0a1010, emissiveIntensity: 0.2 });
    const stand = new THREE.MeshLambertMaterial({ color: 0x3a3838 });
    _add(root, new THREE.BoxGeometry(0.48, 0.38, 0.42), plastic, 0, 0.62, 0);
    _add(root, new THREE.BoxGeometry(0.38, 0.28, 0.02), screen, 0, 0.64, -0.21);
    _add(root, new THREE.BoxGeometry(0.52, 0.06, 0.32), stand, 0, 0.38, 0.02);
    _add(root, new THREE.BoxGeometry(0.08, 0.08, 0.08), plastic, 0.18, 0.72, -0.18);
    _add(root, new THREE.BoxGeometry(0.12, 0.04, 0.06), stand, 0, 0.35, 0.22);
  }

  function _buildWashingMachine(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xd8dce0 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x88a8c8, transparent: true, opacity: 0.55 });
    const panel = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    _add(root, new THREE.BoxGeometry(0.58, 0.82, 0.58), body, 0, 0.41, 0);
    _add(root, new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16), glass, 0, 0.52, -0.29);
    _add(root, new THREE.BoxGeometry(0.42, 0.12, 0.04), panel, 0, 0.72, -0.28);
    for (let i = 0; i < 3; i++) {
      _add(root, new THREE.BoxGeometry(0.06, 0.02, 0.02), panel, -0.12 + i * 0.12, 0.74, -0.30);
    }
  }

  function _buildMetalShelf(root) {
    const frame = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    const shelf = new THREE.MeshLambertMaterial({ color: 0x7a8088 });
    const box = new THREE.MeshLambertMaterial({ color: 0x6a5848 });
    for (const sx of [-0.68, 0.68]) {
      _add(root, new THREE.BoxGeometry(0.04, 1.82, 0.42), frame, sx, 0.91, 0);
    }
    for (const y of [0.04, 0.58, 1.12, 1.66]) {
      _add(root, new THREE.BoxGeometry(1.32, 0.03, 0.40), shelf, 0, y, 0);
    }
    _add(root, new THREE.BoxGeometry(0.32, 0.22, 0.24), box, -0.22, 0.70, 0.04);
    _add(root, new THREE.BoxGeometry(0.28, 0.18, 0.20), box, 0.28, 0.14, -0.06);
    _add(root, new THREE.BoxGeometry(0.24, 0.16, 0.18), box, 0.08, 1.20, 0.02);
  }

  function _buildWorkbench(root) {
    const M = _M();
    const top = M?.tableTop?.(0x8a7868) || new THREE.MeshLambertMaterial({ color: 0x8a7868 });
    const leg = M?.woodDark?.(0x4a3828) || new THREE.MeshLambertMaterial({ color: 0x4a3828 });
    const metal = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    _add(root, new THREE.BoxGeometry(1.48, 0.06, 0.68), top, 0, 0.88, 0);
    for (const [x, z] of [[-0.66, 0.30], [0.66, 0.30], [-0.66, -0.30], [0.66, -0.30]]) {
      _add(root, new THREE.BoxGeometry(0.08, 0.88, 0.08), leg, x, 0.44, z);
    }
    _add(root, new THREE.BoxGeometry(0.18, 0.12, 0.14), metal, 0.48, 0.94, -0.22);
    _add(root, new THREE.BoxGeometry(0.04, 0.08, 0.04), metal, 0.48, 1.02, -0.22);
    _add(root, new THREE.BoxGeometry(0.22, 0.04, 0.08), metal, -0.42, 0.92, 0.18);
    _add(root, new THREE.BoxGeometry(0.04, 0.02, 0.12), metal, -0.52, 0.94, 0.18);
    _add(root, new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x3a4048 }), -0.18, 0.94, -0.12);
  }

  function _buildDoubleBed(root) {
    const M = _M();
    const fabric = M?.canvasTight?.(0x4a5068) || new THREE.MeshLambertMaterial({ color: 0x4a5068 });
    const pillow = M?.canvas?.(0xd8d4c8) || new THREE.MeshLambertMaterial({ color: 0xd8d4c8 });
    const frame = M?.woodFine?.(0x5a4838) || new THREE.MeshLambertMaterial({ color: 0x5a4838 });
    _add(root, new THREE.BoxGeometry(1.42, 0.22, 1.92), frame, 0, 0.11, 0);
    _add(root, new THREE.BoxGeometry(1.38, 0.14, 1.88), fabric, 0, 0.30, 0.02);
    _add(root, new THREE.BoxGeometry(1.32, 0.08, 0.42), pillow, 0, 0.42, -0.68);
    _add(root, new THREE.BoxGeometry(1.32, 0.06, 0.38), fabric, 0, 0.38, 0.42);
    for (const sx of [-0.62, 0.62]) {
      _add(root, new THREE.BoxGeometry(0.06, 0.38, 1.88), frame, sx, 0.30, 0);
    }
  }

  function _buildNightstand(root) {
    const M = _M();
    const wood = M?.woodFine?.(0x5a4838) || new THREE.MeshLambertMaterial({ color: 0x5a4838 });
    const lamp = new THREE.MeshLambertMaterial({ color: 0xe8e0c8, emissive: 0x2a2010, emissiveIntensity: 0.25 });
    _add(root, new THREE.BoxGeometry(0.42, 0.48, 0.38), wood, 0, 0.24, 0);
    _add(root, new THREE.BoxGeometry(0.38, 0.02, 0.34), wood, 0, 0.49, 0);
    _add(root, new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8), wood, 0, 0.58, -0.08);
    _add(root, new THREE.SphereGeometry(0.08, 8, 6), lamp, 0, 0.72, -0.08);
    _add(root, new THREE.BoxGeometry(0.12, 0.02, 0.08), wood, 0.12, 0.50, 0.08);
  }

  function _buildDresser(root) {
    const M = _M();
    const wood = M?.woodFine?.(0x6a5848) || new THREE.MeshLambertMaterial({ color: 0x6a5848 });
    const handle = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x8a9098 });
    _add(root, new THREE.BoxGeometry(0.92, 0.82, 0.42), wood, 0, 0.41, 0);
    for (const y of [0.18, 0.42, 0.66]) {
      _add(root, new THREE.BoxGeometry(0.86, 0.02, 0.38), wood, 0, y, -0.01);
      _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.02), handle, 0, y + 0.08, -0.22);
    }
    _add(root, new THREE.BoxGeometry(0.94, 0.04, 0.44), wood, 0, 0.84, 0);
  }

  function _buildMicrowave(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x1a2838, emissive: 0x0a1018, emissiveIntensity: 0.15 });
    const trim = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    _add(root, new THREE.BoxGeometry(0.48, 0.28, 0.38), body, 0, 0.14, 0);
    _add(root, new THREE.BoxGeometry(0.32, 0.18, 0.012), glass, -0.04, 0.16, -0.19);
    for (let i = 0; i < 4; i++) {
      _add(root, new THREE.BoxGeometry(0.04, 0.02, 0.02), trim, 0.14, 0.10 + i * 0.04, -0.18);
    }
    _add(root, new THREE.BoxGeometry(0.08, 0.04, 0.04), trim, 0.16, 0.22, -0.18);
  }

  function _buildStove(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x4a4848 });
    const top = new THREE.MeshLambertMaterial({ color: 0x2a2828 });
    const burner = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const glass = new THREE.MeshLambertMaterial({ color: 0x1a2028 });
    _add(root, new THREE.BoxGeometry(0.58, 0.82, 0.58), body, 0, 0.41, 0);
    _add(root, new THREE.BoxGeometry(0.54, 0.04, 0.54), top, 0, 0.84, 0);
    for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) {
      _add(root, new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12), burner, x, 0.87, z);
    }
    _add(root, new THREE.BoxGeometry(0.42, 0.52, 0.02), glass, 0, 0.58, -0.29);
    _add(root, new THREE.BoxGeometry(0.06, 0.12, 0.04), top, 0.22, 0.52, -0.28);
  }

  function _buildKitchenSink(root) {
    const M = _M();
    const cabinet = M?.woodDark?.(0x4a4038) || new THREE.MeshLambertMaterial({ color: 0x4a4038 });
    const top = M?.tableTop?.() || new THREE.MeshLambertMaterial({ color: 0xc8c0b8 });
    const metal = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.82, 0.78, 0.52), cabinet, 0, 0.39, 0);
    _add(root, new THREE.BoxGeometry(0.86, 0.04, 0.56), top, 0, 0.80, 0);
    _add(root, new THREE.BoxGeometry(0.42, 0.14, 0.36), metal, 0, 0.74, -0.02);
    _add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8), metal, -0.12, 0.92, -0.22);
    _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.08), metal, -0.12, 1.02, -0.22);
    _add(root, new THREE.BoxGeometry(0.36, 0.02, 0.28), metal, 0.08, 0.81, -0.02);
  }

  function _buildFloorLamp(root) {
    const base = new THREE.MeshLambertMaterial({ color: 0x3a3838 });
    const pole = new THREE.MeshLambertMaterial({ color: 0x5a5858 });
    const shade = new THREE.MeshLambertMaterial({ color: 0xd8c8a8, emissive: 0x3a2810, emissiveIntensity: 0.35 });
    _add(root, new THREE.CylinderGeometry(0.14, 0.16, 0.04, 10), base, 0, 0.02, 0);
    _add(root, new THREE.CylinderGeometry(0.02, 0.025, 1.42, 8), pole, 0, 0.75, 0);
    _add(root, new THREE.CylinderGeometry(0.18, 0.22, 0.28, 10), shade, 0, 1.52, 0);
    const light = new THREE.PointLight(0xffd8a0, 0.8, 8, 1.5);
    light.position.set(0, 1.45, 0);
    root.add(light);
  }

  function _buildUrbanRug(root) {
    const M = _M();
    const rug = M?.canvasTight?.(0x5a4838) || new THREE.MeshLambertMaterial({ color: 0x5a4838 });
    const border = M?.canvas?.(0x8a6848) || new THREE.MeshLambertMaterial({ color: 0x8a6848 });
    _add(root, new THREE.BoxGeometry(1.62, 0.018, 1.08), rug, 0, 0.009, 0);
    _add(root, new THREE.BoxGeometry(1.52, 0.02, 0.06), border, 0, 0.012, -0.50);
    _add(root, new THREE.BoxGeometry(0.08, 0.02, 0.96), border, -0.78, 0.012, 0);
    _add(root, new THREE.BoxGeometry(0.32, 0.022, 0.18), border, 0, 0.013, -0.38);
  }

  function _buildAtm(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    const panel = new THREE.MeshLambertMaterial({ color: 0x2a3038 });
    const screen = new THREE.MeshLambertMaterial({ color: 0x88c8a8, emissive: 0x1a3828, emissiveIntensity: 0.3 });
    _add(root, new THREE.BoxGeometry(0.72, 1.52, 0.48), body, 0, 0.76, 0);
    _add(root, new THREE.BoxGeometry(0.52, 0.62, 0.04), panel, 0, 1.02, -0.24);
    _add(root, new THREE.BoxGeometry(0.38, 0.22, 0.012), screen, 0, 1.12, -0.26);
    _add(root, new THREE.BoxGeometry(0.28, 0.08, 0.06), panel, 0, 0.72, -0.24);
    for (let i = 0; i < 3; i++) {
      _add(root, new THREE.BoxGeometry(0.06, 0.04, 0.02), panel, -0.08 + i * 0.08, 0.58, -0.24);
    }
  }

  function _buildPhoneBooth(root) {
    const red = new THREE.MeshLambertMaterial({ color: 0x9a2828 });
    const glass = new THREE.MeshLambertMaterial({ color: 0xa8c8d8, transparent: true, opacity: 0.4 });
    const metal = new THREE.MeshLambertMaterial({ color: 0x4a4048 });
    _add(root, new THREE.BoxGeometry(0.92, 2.05, 0.92), red, 0, 1.02, 0);
    _add(root, new THREE.BoxGeometry(0.72, 1.42, 0.012), glass, 0, 1.18, -0.46);
    _add(root, new THREE.BoxGeometry(0.32, 0.48, 0.22), metal, 0, 1.02, -0.32);
    _add(root, new THREE.BoxGeometry(0.88, 0.06, 0.88), red, 0, 2.08, 0);
  }

  function _buildPicnicTable(root) {
    const M = _M();
    const wood = M?.woodFine?.(0x6a5038) || new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    _add(root, new THREE.BoxGeometry(1.52, 0.05, 0.72), wood, 0, 0.74, 0);
    _add(root, new THREE.BoxGeometry(1.52, 0.05, 0.38), wood, 0, 0.46, 0.28);
    for (const [x, z] of [[-0.58, 0], [0.58, 0], [-0.58, 0.42], [0.58, 0.42]]) {
      _add(root, new THREE.BoxGeometry(0.06, 0.74, 0.06), wood, x, 0.37, z);
    }
  }

  function _buildTrashPile(root) {
    const bag = new THREE.MeshLambertMaterial({ color: 0x3a3838 });
    const box = new THREE.MeshLambertMaterial({ color: 0x6a5848 });
    _add(root, new THREE.SphereGeometry(0.22, 8, 6), bag, -0.18, 0.18, 0.08, 0, 0.2, 0);
    _add(root, new THREE.SphereGeometry(0.26, 8, 6), bag, 0.12, 0.22, -0.12, 0, -0.3, 0.15);
    _add(root, new THREE.BoxGeometry(0.32, 0.18, 0.28), box, 0.22, 0.09, 0.14, 0, 0.4, 0);
    _add(root, new THREE.BoxGeometry(0.24, 0.12, 0.22), box, -0.08, 0.06, -0.18, 0.1, 0.6, 0);
    _add(root, new THREE.BoxGeometry(0.38, 0.04, 0.04), bag, 0, 0.38, 0.02, 0.5, 0, 0);
  }

  function _buildWoodCrate(root) {
    const M = _M();
    const wood = M?.woodFine?.(0x8a6848) || new THREE.MeshLambertMaterial({ color: 0x8a6848 });
    const dark = M?.woodDark?.(0x5a4838) || new THREE.MeshLambertMaterial({ color: 0x5a4838 });
    _add(root, new THREE.BoxGeometry(0.62, 0.48, 0.62), wood, 0, 0.24, 0);
    for (const sx of [-1, 1]) {
      _add(root, new THREE.BoxGeometry(0.04, 0.48, 0.62), dark, sx * 0.28, 0.24, 0);
      _add(root, new THREE.BoxGeometry(0.62, 0.48, 0.04), dark, 0, 0.24, sx * 0.28);
    }
    _add(root, new THREE.BoxGeometry(0.58, 0.04, 0.58), dark, 0, 0.48, 0);
  }

  function _buildGenerator(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xd8a818 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x3a3838 });
    const metal = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    _add(root, new THREE.BoxGeometry(0.72, 0.52, 0.48), body, 0, 0.26, 0);
    _add(root, new THREE.BoxGeometry(0.62, 0.08, 0.38), dark, 0, 0.54, 0);
    _add(root, new THREE.CylinderGeometry(0.06, 0.06, 0.22, 8), metal, 0.28, 0.62, 0.12);
    _add(root, new THREE.BoxGeometry(0.12, 0.06, 0.08), dark, -0.22, 0.38, -0.22);
    for (const sx of [-0.28, 0.28]) {
      _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), dark, sx, 0.03, 0.18);
    }
  }

  function _buildFuelCans(root) {
    const red = new THREE.MeshLambertMaterial({ color: 0x9a2828 });
    const cap = new THREE.MeshLambertMaterial({ color: 0x3a3838 });
    for (const [x, z, ry] of [[-0.18, 0, 0], [0.16, 0.08, 0.25], [0.02, -0.14, -0.15]]) {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      root.add(g);
      _add(g, new THREE.BoxGeometry(0.22, 0.32, 0.14), red, 0, 0.16, 0);
      _add(g, new THREE.BoxGeometry(0.08, 0.06, 0.06), cap, 0, 0.34, 0);
      _add(g, new THREE.BoxGeometry(0.04, 0.12, 0.04), cap, 0.08, 0.28, 0, 0, 0, 0.4);
    }
  }

  function _buildBbqGrill(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x2a2828 });
    const lid = new THREE.MeshLambertMaterial({ color: 0x3a3838 });
    const leg = new THREE.MeshLambertMaterial({ color: 0x5a5858 });
    _add(root, new THREE.BoxGeometry(0.82, 0.38, 0.48), body, 0, 0.52, 0);
    _add(root, new THREE.BoxGeometry(0.78, 0.12, 0.44), lid, 0, 0.82, 0, -0.25, 0, 0);
    _add(root, new THREE.BoxGeometry(0.72, 0.04, 0.38), body, 0, 0.56, 0);
    for (const [x, z] of [[-0.32, 0.18], [0.32, 0.18], [-0.32, -0.18], [0.32, -0.18]]) {
      _add(root, new THREE.CylinderGeometry(0.025, 0.025, 0.52, 8), leg, x, 0.26, z);
    }
    _add(root, new THREE.BoxGeometry(0.12, 0.04, 0.04), leg, 0.32, 0.88, 0.18);
  }

  function _buildToolCabinet(root) {
    const red = new THREE.MeshLambertMaterial({ color: 0x9a3028 });
    const metal = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    const handle = new THREE.MeshLambertMaterial({ color: 0x3a3838 });
    _add(root, new THREE.BoxGeometry(0.52, 0.92, 0.38), red, 0, 0.46, 0);
    _add(root, new THREE.BoxGeometry(0.48, 0.02, 0.34), metal, 0, 0.48, -0.01);
    for (const y of [0.22, 0.52, 0.78]) {
      _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.02), handle, 0.18, y, -0.19);
    }
    _add(root, new THREE.BoxGeometry(0.08, 0.04, 0.06), metal, -0.12, 0.72, -0.16);
    _add(root, new THREE.BoxGeometry(0.22, 0.02, 0.02), metal, 0.08, 0.88, -0.16, 0.3, 0, 0);
  }

  function _buildBathtub(root) {
    const enamel = new THREE.MeshLambertMaterial({ color: 0xd8dce0 });
    const inner = new THREE.MeshLambertMaterial({ color: 0xb8c0c8 });
    const chrome = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(1.52, 0.52, 0.68), enamel, 0, 0.26, 0);
    _add(root, new THREE.BoxGeometry(1.38, 0.38, 0.54), inner, 0, 0.32, 0.02);
    _add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), chrome, -0.58, 0.58, -0.22);
    _add(root, new THREE.BoxGeometry(0.08, 0.04, 0.04), chrome, -0.58, 0.66, -0.22);
    _add(root, new THREE.BoxGeometry(0.12, 0.08, 0.04), chrome, 0.62, 0.48, -0.28);
  }

  function _buildBusShelter(root) {
    const frame = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const glass = new THREE.MeshLambertMaterial({ color: 0xa8c8d8, transparent: true, opacity: 0.38 });
    const roof = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    const bench = new THREE.MeshLambertMaterial({ color: 0x5a5048 });
    for (const sx of [-1.12, 1.12]) {
      _add(root, new THREE.BoxGeometry(0.06, 2.18, 0.06), frame, sx, 1.09, 0.38);
    }
    _add(root, new THREE.BoxGeometry(2.28, 0.06, 0.82), roof, 0, 2.18, 0);
    _add(root, new THREE.BoxGeometry(2.18, 1.62, 0.012), glass, 0, 1.12, -0.38);
    _add(root, new THREE.BoxGeometry(2.18, 0.05, 0.38), bench, 0, 0.48, 0.12);
    _add(root, new THREE.BoxGeometry(0.42, 0.28, 0.04), frame, 0, 2.02, -0.40);
  }

  function _buildWindowAc(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xd8dce0 });
    const vent = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    const side = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.52, 0.38, 0.48), body, 0, 0.19, 0);
    _add(root, new THREE.BoxGeometry(0.44, 0.28, 0.012), vent, 0, 0.19, -0.24);
    for (let i = 0; i < 5; i++) {
      _add(root, new THREE.BoxGeometry(0.38, 0.012, 0.014), vent, 0, 0.10 + i * 0.05, -0.245);
    }
    _add(root, new THREE.BoxGeometry(0.08, 0.32, 0.52), side, 0.28, 0.19, 0);
    _add(root, new THREE.BoxGeometry(0.06, 0.06, 0.06), vent, -0.16, 0.28, -0.22);
  }

  function _buildToilet(root) {
    const ceramic = new THREE.MeshLambertMaterial({ color: 0xe8ece8 });
    const seat = new THREE.MeshLambertMaterial({ color: 0xd8dcd8 });
    _add(root, new THREE.BoxGeometry(0.38, 0.38, 0.48), ceramic, 0, 0.19, 0.04);
    _add(root, new THREE.BoxGeometry(0.34, 0.12, 0.42), seat, 0, 0.40, 0.04);
    _add(root, new THREE.BoxGeometry(0.28, 0.42, 0.18), ceramic, 0, 0.52, -0.18);
    _add(root, new THREE.BoxGeometry(0.06, 0.08, 0.04), ceramic, 0, 0.72, -0.24);
  }

  function _buildBathroomSink(root) {
    const ceramic = new THREE.MeshLambertMaterial({ color: 0xe8ece8 });
    const chrome = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const pedestal = new THREE.MeshLambertMaterial({ color: 0xd8dcd8 });
    _add(root, new THREE.CylinderGeometry(0.14, 0.16, 0.72, 10), pedestal, 0, 0.36, 0);
    _add(root, new THREE.BoxGeometry(0.48, 0.08, 0.38), ceramic, 0, 0.76, 0);
    _add(root, new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12), ceramic, 0, 0.82, 0);
    _add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), chrome, 0, 0.98, -0.12);
    _add(root, new THREE.BoxGeometry(0.06, 0.04, 0.04), chrome, 0, 1.06, -0.12);
  }

  function _buildCoffeeTable(root) {
    const M = _M();
    const top = M?.tableTop?.() || new THREE.MeshLambertMaterial({ color: 0x5a4838 });
    const leg = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x3a2820 });
    _add(root, new THREE.BoxGeometry(0.92, 0.04, 0.52), top, 0, 0.38, 0);
    for (const [x, z] of [[-0.38, 0.20], [0.38, 0.20], [-0.38, -0.20], [0.38, -0.20]]) {
      _add(root, new THREE.BoxGeometry(0.05, 0.38, 0.05), leg, x, 0.19, z);
    }
    _add(root, new THREE.BoxGeometry(0.22, 0.04, 0.14), top, 0.12, 0.42, -0.08);
  }

  function _buildDiningTable(root) {
    const M = _M();
    const top = M?.tableTop?.() || new THREE.MeshLambertMaterial({ color: 0x7a6858 });
    const leg = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x4a3828 });
    _add(root, new THREE.BoxGeometry(1.52, 0.045, 0.82), top, 0, 0.74, 0);
    for (const [x, z] of [[-0.68, 0.34], [0.68, 0.34], [-0.68, -0.34], [0.68, -0.34]]) {
      _add(root, new THREE.BoxGeometry(0.06, 0.74, 0.06), leg, x, 0.37, z);
    }
  }

  function _buildBunkBed(root) {
    const M = _M();
    const frame = M?.woodFine?.(0x5a4838) || new THREE.MeshLambertMaterial({ color: 0x5a4838 });
    const fabric = M?.canvasTight?.(0x4a5068) || new THREE.MeshLambertMaterial({ color: 0x4a5068 });
    const ladder = M?.woodDark?.(0x4a3828) || new THREE.MeshLambertMaterial({ color: 0x4a3828 });
    for (const y of [0.22, 1.12]) {
      _add(root, new THREE.BoxGeometry(0.92, 0.08, 1.82), frame, 0, y, 0);
      _add(root, new THREE.BoxGeometry(0.88, 0.10, 1.78), fabric, 0, y + 0.12, 0.02);
    }
    for (const sx of [-0.42, 0.42]) {
      _add(root, new THREE.BoxGeometry(0.06, 1.42, 1.82), frame, sx, 0.71, 0);
    }
    for (let i = 0; i < 4; i++) {
      _add(root, new THREE.BoxGeometry(0.04, 0.22, 0.04), ladder, 0.38, 0.35 + i * 0.22, -0.82);
    }
    _add(root, new THREE.BoxGeometry(0.06, 1.42, 0.04), ladder, 0.42, 0.71, -0.82);
  }

  function _buildFilingCabinet(root) {
    const metal = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    const handle = new THREE.MeshLambertMaterial({ color: 0x3a3838 });
    _add(root, new THREE.BoxGeometry(0.42, 1.22, 0.58), metal, 0, 0.61, 0);
    for (const y of [0.22, 0.52, 0.82, 1.12]) {
      _add(root, new THREE.BoxGeometry(0.38, 0.02, 0.54), metal, 0, y, -0.01);
      _add(root, new THREE.BoxGeometry(0.04, 0.02, 0.02), handle, 0.14, y + 0.08, -0.30);
    }
  }

  function _buildSafe(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const door = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    const dial = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.48, 0.58, 0.48), body, 0, 0.29, 0);
    _add(root, new THREE.BoxGeometry(0.42, 0.52, 0.04), door, 0, 0.29, -0.24);
    _add(root, new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), dial, 0, 0.32, -0.26);
    _add(root, new THREE.BoxGeometry(0.08, 0.04, 0.02), dial, 0.12, 0.28, -0.26);
  }

  function _buildGasPump(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xd8dce0 });
    const panel = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    const hose = new THREE.MeshLambertMaterial({ color: 0x2a2828 });
    _add(root, new THREE.BoxGeometry(0.58, 1.62, 0.42), body, 0, 0.81, 0);
    _add(root, new THREE.BoxGeometry(0.48, 0.72, 0.04), panel, 0, 1.02, -0.22);
    _add(root, new THREE.BoxGeometry(0.22, 0.14, 0.08), panel, 0, 0.48, -0.20);
    _add(root, new THREE.CylinderGeometry(0.025, 0.025, 0.62, 8), hose, 0.22, 0.72, -0.12, 0.4, 0, 0.3);
    _add(root, new THREE.BoxGeometry(0.08, 0.12, 0.06), hose, 0.32, 0.42, -0.28);
    _add(root, new THREE.BoxGeometry(0.62, 0.08, 0.46), body, 0, 1.66, 0);
  }

  function _buildParkingMeter(root) {
    const pole = new THREE.MeshLambertMaterial({ color: 0x6a6860 });
    const head = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x88a8c8, transparent: true, opacity: 0.45 });
    _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.92, 8), pole, 0, 0.46, 0);
    _add(root, new THREE.BoxGeometry(0.22, 0.38, 0.18), head, 0, 1.08, 0);
    _add(root, new THREE.BoxGeometry(0.14, 0.18, 0.012), glass, 0, 1.12, -0.10);
    _add(root, new THREE.CylinderGeometry(0.12, 0.12, 0.04, 10), head, 0, 1.30, 0);
  }

  function _buildStreetClock(root) {
    const pole = new THREE.MeshLambertMaterial({ color: 0x4a4848 });
    const face = new THREE.MeshLambertMaterial({ color: 0xe8e8e0 });
    const rim = new THREE.MeshLambertMaterial({ color: 0x2a2828 });
    _add(root, new THREE.CylinderGeometry(0.05, 0.06, 2.65, 8), pole, 0, 1.32, 0);
    _add(root, new THREE.CylinderGeometry(0.28, 0.28, 0.06, 16), rim, 0, 2.68, 0);
    _add(root, new THREE.CylinderGeometry(0.24, 0.24, 0.02, 16), face, 0, 2.71, 0);
    _add(root, new THREE.BoxGeometry(0.02, 0.10, 0.004), rim, 0, 2.72, -0.08);
    _add(root, new THREE.BoxGeometry(0.08, 0.02, 0.004), rim, 0.04, 2.72, -0.08);
  }

  function _buildFireExtinguisher(root) {
    const red = new THREE.MeshLambertMaterial({ color: 0xb82828 });
    const black = new THREE.MeshLambertMaterial({ color: 0x2a2828 });
    const bracket = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    _add(root, new THREE.BoxGeometry(0.12, 0.32, 0.06), bracket, 0, 0.28, -0.04);
    _add(root, new THREE.CylinderGeometry(0.08, 0.09, 0.42, 10), red, 0, 0.48, 0.02);
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8), black, 0, 0.76, 0.02);
    _add(root, new THREE.BoxGeometry(0.06, 0.04, 0.08), black, 0.06, 0.72, 0.02, 0, 0, -0.5);
  }

  function _buildWaterCooler(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xd8dce0 });
    const jug = new THREE.MeshLambertMaterial({ color: 0x88b8d8, transparent: true, opacity: 0.55 });
    const tap = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    _add(root, new THREE.BoxGeometry(0.32, 0.88, 0.32), body, 0, 0.44, 0);
    _add(root, new THREE.CylinderGeometry(0.14, 0.16, 0.38, 10), jug, 0, 1.08, 0);
    _add(root, new THREE.BoxGeometry(0.08, 0.06, 0.06), tap, 0, 0.62, -0.16);
    _add(root, new THREE.BoxGeometry(0.12, 0.04, 0.04), body, 0, 0.90, 0);
  }

  function _buildOfficePrinter(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xe8ece8 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x3a3838 });
    const paper = new THREE.MeshLambertMaterial({ color: 0xf8f8f0 });
    _add(root, new THREE.BoxGeometry(0.42, 0.22, 0.38), body, 0, 0.11, 0);
    _add(root, new THREE.BoxGeometry(0.38, 0.12, 0.34), dark, 0, 0.28, 0);
    _add(root, new THREE.BoxGeometry(0.28, 0.02, 0.22), paper, 0, 0.36, -0.02);
    for (let i = 0; i < 3; i++) {
      _add(root, new THREE.BoxGeometry(0.04, 0.02, 0.02), dark, -0.10 + i * 0.10, 0.20, -0.16);
    }
  }

  function _buildSatelliteDish(root) {
    const pole = new THREE.MeshLambertMaterial({ color: 0x6a6860 });
    const dish = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const arm = new THREE.MeshLambertMaterial({ color: 0x5a5858 });
    _add(root, new THREE.CylinderGeometry(0.04, 0.05, 1.85, 8), pole, 0, 0.92, 0);
    _add(root, new THREE.BoxGeometry(0.04, 0.42, 0.04), arm, 0, 1.72, 0.12, 0.6, 0, 0);
    const d = _add(root, new THREE.CylinderGeometry(0.42, 0.08, 0.06, 14), dish, 0, 1.92, 0.28, -0.55, 0, 0);
    d.castShadow = true;
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), arm, 0, 1.92, 0.32, -0.55, 0, 0);
  }

  function _buildMattressFloor(root) {
    const M = _M();
    const fabric = M?.canvasTight?.(0x4a5068) || new THREE.MeshLambertMaterial({ color: 0x4a5068 });
    const stain = new THREE.MeshLambertMaterial({ color: 0x5a5848 });
    const pillow = M?.canvas?.(0xd8d4c8) || new THREE.MeshLambertMaterial({ color: 0xd8d4c8 });
    _add(root, new THREE.BoxGeometry(0.92, 0.14, 1.72), fabric, 0, 0.07, 0);
    _add(root, new THREE.BoxGeometry(0.32, 0.06, 0.22), stain, 0.18, 0.15, 0.12);
    _add(root, new THREE.BoxGeometry(0.38, 0.06, 0.28), pillow, -0.22, 0.14, -0.58, 0.1, 0.2, 0);
    _add(root, new THREE.BoxGeometry(0.48, 0.04, 0.38), fabric, 0.08, 0.16, -0.42);
  }

  function _buildBeerCrate(root) {
    const plastic = new THREE.MeshLambertMaterial({ color: 0x286838 });
    const bottle = new THREE.MeshLambertMaterial({ color: 0x4a6840, transparent: true, opacity: 0.7 });
    _add(root, new THREE.BoxGeometry(0.42, 0.14, 0.28), plastic, 0, 0.07, 0);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        _add(root, new THREE.CylinderGeometry(0.028, 0.028, 0.22, 8), bottle,
          -0.10 + col * 0.10, 0.22, -0.06 + row * 0.12);
      }
    }
    _add(root, new THREE.BoxGeometry(0.44, 0.02, 0.30), plastic, 0, 0.15, 0);
  }

  function _buildCoatRackUrban(root) {
    const M = _M();
    const metal = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    const coat = M?.canvas?.(0x4a4848) || new THREE.MeshLambertMaterial({ color: 0x4a4848 });
    _add(root, new THREE.CylinderGeometry(0.03, 0.04, 1.62, 8), metal, 0, 0.81, 0);
    _add(root, new THREE.CylinderGeometry(0.14, 0.14, 0.03, 10), metal, 0, 1.64, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      _add(root, new THREE.BoxGeometry(0.06, 0.02, 0.02), metal, Math.cos(a) * 0.12, 1.58, Math.sin(a) * 0.12, 0, a, 0.4);
    }
    _add(root, new THREE.BoxGeometry(0.32, 0.48, 0.06), coat, 0.08, 1.02, 0.02, 0, 0.15, 0);
    _add(root, new THREE.BoxGeometry(0.18, 0.12, 0.18),
      new THREE.MeshLambertMaterial({ color: 0x3a3838 }), -0.12, 1.48, 0.04);
  }

  function _buildPalletSingle(root) {
    _addEuroPallet(root, 0, 0, 1, 1);
  }

  function _buildMedicineCabinet(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xe8ece8 });
    const mirror = new THREE.MeshLambertMaterial({ color: 0xb8c8d8, transparent: true, opacity: 0.55 });
    const cross = new THREE.MeshLambertMaterial({ color: 0xc82828 });
    _add(root, new THREE.BoxGeometry(0.52, 0.62, 0.14), body, 0, 0.31, 0);
    _add(root, new THREE.BoxGeometry(0.44, 0.54, 0.012), mirror, 0, 0.31, -0.07);
    _add(root, new THREE.BoxGeometry(0.08, 0.02, 0.004), cross, 0, 0.38, -0.075);
    _add(root, new THREE.BoxGeometry(0.02, 0.08, 0.004), cross, 0, 0.38, -0.075);
    _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.02), body, 0.18, 0.28, -0.07);
  }

  function _buildCardboardBox(root) {
    _addCardboardBox(root, 0, 0, 0, 0.52, 0.38, 0.42, 0.12, true);
  }

  function _buildDryer(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xd8dce0 });
    const door = new THREE.MeshLambertMaterial({ color: 0xc8ccd0 });
    const panel = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    _add(root, new THREE.BoxGeometry(0.58, 0.82, 0.58), body, 0, 0.41, 0);
    _add(root, new THREE.BoxGeometry(0.48, 0.52, 0.02), door, 0, 0.48, -0.29);
    _add(root, new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), panel, 0.16, 0.48, -0.30);
    _add(root, new THREE.BoxGeometry(0.42, 0.10, 0.04), panel, 0, 0.72, -0.28);
  }

  function _buildRadiator(root) {
    const metal = new THREE.MeshLambertMaterial({ color: 0xe8ece8 });
    const pipe = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.82, 0.52, 0.12), metal, 0, 0.26, 0);
    for (let i = -3; i <= 3; i++) {
      _add(root, new THREE.BoxGeometry(0.04, 0.48, 0.08), metal, i * 0.11, 0.26, -0.02);
    }
    _add(root, new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8), pipe, -0.38, 0.42, 0, Math.PI / 2, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8), pipe, 0.38, 0.42, 0, Math.PI / 2, 0, 0);
  }

  function _buildFloorFan(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const grill = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    _add(root, new THREE.CylinderGeometry(0.16, 0.18, 0.08, 10), body, 0, 0.04, 0);
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.82, 8), body, 0, 0.49, 0);
    _add(root, new THREE.CylinderGeometry(0.22, 0.22, 0.04, 12), grill, 0, 0.92, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      _add(root, new THREE.BoxGeometry(0.18, 0.02, 0.06), grill, Math.cos(a) * 0.08, 0.94, Math.sin(a) * 0.08, 0, a, 0.2);
    }
    _add(root, new THREE.BoxGeometry(0.28, 0.32, 0.12), body, 0, 0.58, -0.08, -0.2, 0, 0);
  }

  function _buildDishwasher(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xd8dce0 });
    const panel = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    const handle = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.58, 0.82, 0.58), body, 0, 0.41, 0);
    _add(root, new THREE.BoxGeometry(0.52, 0.08, 0.02), panel, 0, 0.72, -0.29);
    _add(root, new THREE.BoxGeometry(0.48, 0.02, 0.02), handle, 0, 0.62, -0.30);
    for (let i = 0; i < 4; i++) {
      _add(root, new THREE.BoxGeometry(0.08, 0.012, 0.008), panel, -0.15 + i * 0.10, 0.74, -0.30);
    }
  }

  function _buildIroningBoard(root) {
    const M = _M();
    const cover = M?.canvas?.(0x4a5068) || new THREE.MeshLambertMaterial({ color: 0x4a5068 });
    const leg = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    _add(root, new THREE.BoxGeometry(0.32, 0.04, 1.12), cover, 0, 0.82, 0, -0.15, 0, 0);
    _add(root, new THREE.BoxGeometry(0.04, 0.78, 0.04), leg, 0, 0.39, 0.48, 0.15, 0, 0);
    _add(root, new THREE.BoxGeometry(0.04, 0.78, 0.04), leg, 0, 0.39, -0.48, -0.15, 0, 0);
    _add(root, new THREE.BoxGeometry(0.18, 0.04, 0.08), leg, 0, 0.02, 0.52);
  }

  function _buildWallMirror(root) {
    const frame = new THREE.MeshLambertMaterial({ color: 0x5a4838 });
    const glass = new THREE.MeshLambertMaterial({ color: 0xb8c8d8, transparent: true, opacity: 0.6 });
    _add(root, new THREE.BoxGeometry(0.62, 0.82, 0.04), frame, 0, 0.41, 0);
    _add(root, new THREE.BoxGeometry(0.54, 0.74, 0.012), glass, 0, 0.41, -0.02);
    _add(root, new THREE.BoxGeometry(0.08, 0.04, 0.06), frame, 0, 0.78, -0.02);
  }

  function _buildShowerStall(root) {
    const frame = new THREE.MeshLambertMaterial({ color: 0x8a9098 });
    const glass = new THREE.MeshLambertMaterial({ color: 0xa8c8d8, transparent: true, opacity: 0.35 });
    const tray = new THREE.MeshLambertMaterial({ color: 0xd8dce0 });
    _add(root, new THREE.BoxGeometry(0.88, 0.06, 0.88), tray, 0, 0.03, 0);
    for (const sx of [-0.42, 0.42]) {
      _add(root, new THREE.BoxGeometry(0.04, 1.92, 0.04), frame, sx, 0.96, 0);
    }
    _add(root, new THREE.BoxGeometry(0.88, 0.04, 0.04), frame, 0, 1.92, 0);
    _add(root, new THREE.BoxGeometry(0.82, 1.82, 0.012), glass, 0, 0.95, -0.42);
    _add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), frame, 0, 1.82, -0.38);
    _add(root, new THREE.BoxGeometry(0.12, 0.04, 0.04), frame, 0, 1.86, -0.42);
  }

  function _buildUrinal(root) {
    const ceramic = new THREE.MeshLambertMaterial({ color: 0xe8ece8 });
    const pipe = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.32, 0.52, 0.28), ceramic, 0, 0.48, 0.04, -0.12, 0, 0);
    _add(root, new THREE.BoxGeometry(0.28, 0.12, 0.22), ceramic, 0, 0.78, -0.08, -0.35, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), pipe, 0, 0.92, -0.18);
    _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.04), pipe, 0, 1.04, -0.18);
  }

  function _buildLocker(root) {
    const metal = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    const vent = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const handle = new THREE.MeshLambertMaterial({ color: 0x3a3838 });
    for (const sx of [-0.28, 0, 0.28]) {
      _add(root, new THREE.BoxGeometry(0.26, 1.52, 0.38), metal, sx, 0.76, 0);
      _add(root, new THREE.BoxGeometry(0.22, 0.02, 0.34), vent, sx, 1.48, -0.01);
      _add(root, new THREE.BoxGeometry(0.04, 0.08, 0.02), handle, sx + 0.08, 0.82, -0.19);
    }
    _add(root, new THREE.BoxGeometry(0.86, 0.04, 0.40), metal, 0, 1.54, 0);
  }

  function _buildSchoolDesk(root) {
    const M = _M();
    const top = M?.tableTop?.() || new THREE.MeshLambertMaterial({ color: 0x8a7868 });
    const leg = M?.woodFine?.(0x5a4838) || new THREE.MeshLambertMaterial({ color: 0x5a4838 });
    const seat = M?.canvas?.(0x4a5048) || new THREE.MeshLambertMaterial({ color: 0x4a5048 });
    _add(root, new THREE.BoxGeometry(0.62, 0.04, 0.42), top, 0, 0.72, -0.12);
    for (const [x, z] of [[-0.26, -0.12], [0.26, -0.12], [-0.26, 0.18], [0.26, 0.18]]) {
      _add(root, new THREE.BoxGeometry(0.04, 0.72, 0.04), leg, x, 0.36, z);
    }
    _add(root, new THREE.BoxGeometry(0.38, 0.04, 0.32), seat, 0, 0.46, 0.22);
    _add(root, new THREE.BoxGeometry(0.04, 0.46, 0.04), leg, -0.16, 0.23, 0.32);
    _add(root, new THREE.BoxGeometry(0.04, 0.46, 0.04), leg, 0.16, 0.23, 0.32);
    _add(root, new THREE.BoxGeometry(0.08, 0.22, 0.02), top, 0.22, 0.62, -0.32);
  }

  function _buildJerseyBarrier(root) {
    const concrete = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const stripe = new THREE.MeshLambertMaterial({ color: 0xd8a818 });
    _add(root, new THREE.BoxGeometry(1.42, 0.52, 0.48), concrete, 0, 0.26, 0);
    _add(root, new THREE.BoxGeometry(1.38, 0.12, 0.44), concrete, 0, 0.52, 0.02, -0.35, 0, 0);
    _add(root, new THREE.BoxGeometry(1.40, 0.06, 0.46), stripe, 0, 0.38, 0);
  }

  function _buildHandTruck(root) {
    const M = _M();
    const metal = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    const wheel = new THREE.MeshLambertMaterial({ color: 0x2a2828 });
    const handle = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    _add(root, new THREE.BoxGeometry(0.04, 0.92, 0.04), metal, 0, 0.58, -0.22);
    _add(root, new THREE.BoxGeometry(0.42, 0.04, 0.04), metal, 0, 0.18, -0.22);
    _add(root, new THREE.BoxGeometry(0.04, 0.38, 0.04), metal, -0.18, 0.38, -0.22);
    _add(root, new THREE.BoxGeometry(0.04, 0.38, 0.04), metal, 0.18, 0.38, -0.22);
    _add(root, new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), wheel, -0.18, 0.08, -0.22, Math.PI / 2, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), wheel, 0.18, 0.08, -0.22, Math.PI / 2, 0, 0);
    _add(root, new THREE.BoxGeometry(0.32, 0.03, 0.03), handle, 0, 1.08, -0.22, -0.25, 0, 0);
    _add(root, new THREE.BoxGeometry(0.38, 0.32, 0.22),
      M?.canvasTight?.(0x6a5848) || new THREE.MeshLambertMaterial({ color: 0x6a5848 }), 0, 0.52, -0.08);
  }

  function _buildShoppingBasket(root) {
    const plastic = new THREE.MeshLambertMaterial({ color: 0xd83838 });
    const handle = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    _add(root, new THREE.BoxGeometry(0.38, 0.22, 0.28), plastic, 0, 0.11, 0);
    _add(root, new THREE.BoxGeometry(0.34, 0.04, 0.24), plastic, 0, 0.24, 0);
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 6, 12, Math.PI), handle);
    h.rotation.z = Math.PI / 2;
    h.position.set(0, 0.38, 0);
    h.castShadow = true;
    root.add(h);
  }

  function _buildSnackMachine(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x8a3828 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x88a8c8, transparent: true, opacity: 0.5 });
    const trim = new THREE.MeshLambertMaterial({ color: 0x3a3838 });
    _add(root, new THREE.BoxGeometry(0.68, 1.52, 0.52), body, 0, 0.76, 0);
    _add(root, new THREE.BoxGeometry(0.54, 0.88, 0.012), glass, 0, 0.92, -0.26);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 4; col++) {
        _add(root, new THREE.BoxGeometry(0.10, 0.12, 0.06),
          new THREE.MeshLambertMaterial({ color: 0xc8a060 + (row + col) * 0x040404 }),
          -0.18 + col * 0.12, 1.28 - row * 0.16, -0.22);
      }
    }
    _add(root, new THREE.BoxGeometry(0.58, 0.06, 0.04), trim, 0, 1.48, -0.27);
    _add(root, new THREE.BoxGeometry(0.18, 0.10, 0.12), trim, 0, 0.38, -0.24);
  }

  function _buildBarberChair(root) {
    const leather = new THREE.MeshLambertMaterial({ color: 0x8a2828 });
    const chrome = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const base = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    _add(root, new THREE.CylinderGeometry(0.22, 0.24, 0.06, 10), base, 0, 0.03, 0);
    _add(root, new THREE.CylinderGeometry(0.05, 0.05, 0.42, 8), chrome, 0, 0.27, 0);
    _add(root, new THREE.BoxGeometry(0.48, 0.08, 0.44), leather, 0, 0.52, 0.02);
    _add(root, new THREE.BoxGeometry(0.46, 0.42, 0.06), leather, 0, 0.78, 0.22, -0.2, 0, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.16), base, Math.cos(a) * 0.22, 0.02, Math.sin(a) * 0.22, 0, a, 0.3);
    }
    _add(root, new THREE.BoxGeometry(0.52, 0.06, 0.08), chrome, 0, 0.48, -0.18);
  }

  function _buildClothesline(root) {
    const wood = new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    const rope = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    const cloth = new THREE.MeshLambertMaterial({ color: 0x4a6878 });
    for (const sx of [-1.12, 1.12]) {
      _add(root, new THREE.BoxGeometry(0.06, 1.42, 0.06), wood, sx, 0.71, 0);
      _add(root, new THREE.BoxGeometry(0.12, 0.04, 0.12), wood, sx, 1.44, 0);
    }
    _add(root, new THREE.BoxGeometry(2.18, 0.02, 0.02), rope, 0, 1.38, 0);
    for (const x of [-0.6, -0.2, 0.2, 0.6]) {
      _add(root, new THREE.BoxGeometry(0.22, 0.32, 0.02), cloth, x, 1.12, 0, 0.05, 0, 0.08);
    }
  }

  function _buildSunLounger(root) {
    const M = _M();
    const fabric = M?.canvas?.(0x4a6878) || new THREE.MeshLambertMaterial({ color: 0x4a6878 });
    const frame = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x7a8088 });
    _add(root, new THREE.BoxGeometry(0.58, 0.06, 1.62), fabric, 0, 0.28, 0, -0.35, 0, 0);
    _add(root, new THREE.BoxGeometry(0.52, 0.04, 0.48), fabric, 0, 0.52, -0.52, -0.55, 0, 0);
    for (const [x, z] of [[-0.24, 0.6], [0.24, 0.6], [-0.24, -0.6], [0.24, -0.6]]) {
      _add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), frame, x, 0.16, z);
    }
  }

  function _buildPatioUmbrella(root) {
    const fabric = new THREE.MeshLambertMaterial({ color: 0xd83838 });
    const pole = new THREE.MeshLambertMaterial({ color: 0x6a6860 });
    const base = new THREE.MeshLambertMaterial({ color: 0x4a4848 });
    _add(root, new THREE.CylinderGeometry(0.18, 0.20, 0.06, 10), base, 0, 0.03, 0);
    _add(root, new THREE.CylinderGeometry(0.035, 0.04, 2.05, 8), pole, 0, 1.04, 0);
    const canopy = _add(root, new THREE.ConeGeometry(1.12, 0.42, 12), fabric, 0, 2.08, 0);
    canopy.castShadow = true;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      _add(root, new THREE.BoxGeometry(0.02, 0.02, 0.52), pole, Math.cos(a) * 0.52, 1.92, Math.sin(a) * 0.52, -0.4, a, 0);
    }
  }

  function _buildUprightPiano(root) {
    const M = _M();
    const wood = M?.woodDark?.(0x3a2820) || new THREE.MeshLambertMaterial({ color: 0x3a2820 });
    const key = new THREE.MeshLambertMaterial({ color: 0xe8e8e0 });
    const black = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    _add(root, new THREE.BoxGeometry(1.28, 1.22, 0.58), wood, 0, 0.61, 0);
    _add(root, new THREE.BoxGeometry(1.12, 0.08, 0.42), key, 0, 0.48, -0.28);
    for (let i = 0; i < 12; i++) {
      if (i % 7 === 0 || i % 7 === 2 || i % 7 === 4) continue;
      _add(root, new THREE.BoxGeometry(0.04, 0.06, 0.02), black, -0.48 + i * 0.08, 0.54, -0.28);
    }
    _add(root, new THREE.BoxGeometry(1.18, 0.52, 0.04), wood, 0, 1.18, -0.28);
    _add(root, new THREE.BoxGeometry(0.08, 0.32, 0.06), wood, 0.52, 0.72, -0.28);
  }

  function _buildManhole(root) {
    const ring = new THREE.MeshLambertMaterial({ color: 0x5a5858 });
    const grate = new THREE.MeshLambertMaterial({ color: 0x4a4848 });
    _add(root, new THREE.CylinderGeometry(0.38, 0.40, 0.06, 14), ring, 0, 0.03, 0);
    _add(root, new THREE.CylinderGeometry(0.34, 0.34, 0.02, 14), grate, 0, 0.06, 0);
    for (let i = -2; i <= 2; i++) {
      _add(root, new THREE.BoxGeometry(0.58, 0.018, 0.04), grate, 0, 0.065, i * 0.12);
      _add(root, new THREE.BoxGeometry(0.04, 0.018, 0.58), grate, i * 0.12, 0.065, 0);
    }
  }

  function _buildChestFreezer(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xe8ece8 });
    const lid = new THREE.MeshLambertMaterial({ color: 0xd8dce0 });
    const handle = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    _add(root, new THREE.BoxGeometry(0.92, 0.72, 0.62), body, 0, 0.36, 0);
    _add(root, new THREE.BoxGeometry(0.88, 0.08, 0.58), lid, 0, 0.76, 0, -0.15, 0, 0);
    _add(root, new THREE.BoxGeometry(0.22, 0.04, 0.04), handle, 0, 0.78, -0.28);
  }

  function _buildKitchenCabinet(root) {
    const M = _M();
    const wood = M?.woodFine?.(0x6a5848) || new THREE.MeshLambertMaterial({ color: 0x6a5848 });
    const handle = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.62, 0.72, 0.32), wood, 0, 0.36, 0);
    _add(root, new THREE.BoxGeometry(0.58, 0.02, 0.28), wood, 0, 0.72, 0);
    _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.02), handle, 0.22, 0.48, -0.16);
    _add(root, new THREE.BoxGeometry(0.52, 0.02, 0.26), wood, 0, 0.36, -0.01);
  }

  function _buildIndoorTrash(root) {
    const plastic = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const lid = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    _add(root, new THREE.CylinderGeometry(0.18, 0.20, 0.42, 10), plastic, 0, 0.21, 0);
    _add(root, new THREE.CylinderGeometry(0.20, 0.18, 0.06, 10), lid, 0, 0.45, 0);
    _add(root, new THREE.BoxGeometry(0.08, 0.04, 0.04), plastic, 0.16, 0.38, 0);
  }

  function _buildSpeedBump(root) {
    const asphalt = new THREE.MeshLambertMaterial({ color: 0x4a4848 });
    const stripe = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    _add(root, new THREE.BoxGeometry(2.8, 0.08, 0.42), asphalt, 0, 0.04, 0);
    _add(root, new THREE.BoxGeometry(2.6, 0.04, 0.38), stripe, 0, 0.08, 0);
  }

  function _buildFencePost(root) {
    const post = new THREE.MeshLambertMaterial({ color: 0x7a7870 });
    const cap = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.08, 1.42, 0.08), post, 0, 0.71, 0);
    _add(root, new THREE.BoxGeometry(0.12, 0.06, 0.12), cap, 0, 1.45, 0);
    _add(root, new THREE.BoxGeometry(0.06, 0.06, 0.72), post, 0.38, 0.72, 0);
    _add(root, new THREE.BoxGeometry(0.06, 0.06, 0.72), post, -0.38, 0.72, 0);
  }

  function _buildStoreAwning(root) {
    const fabric = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    const stripe = new THREE.MeshLambertMaterial({ color: 0xe8e8e0 });
    const frame = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    _add(root, new THREE.BoxGeometry(2.2, 0.06, 0.08), frame, 0, 2.38, 0.42);
    const awning = _add(root, new THREE.BoxGeometry(2.18, 0.04, 0.72), fabric, 0, 2.28, 0.02, -0.35, 0, 0);
    awning.castShadow = true;
    for (let i = -4; i <= 4; i++) {
      _add(root, new THREE.BoxGeometry(0.22, 0.045, 0.70), stripe, i * 0.24, 2.26, 0.02, -0.35, 0, 0);
    }
  }

  function _buildBabyCrib(root) {
    const M = _M();
    const wood = M?.woodFine?.(0x6a5848) || new THREE.MeshLambertMaterial({ color: 0x6a5848 });
    const mattress = M?.canvas?.(0xd8d4c8) || new THREE.MeshLambertMaterial({ color: 0xd8d4c8 });
    _add(root, new THREE.BoxGeometry(0.72, 0.06, 1.12), wood, 0, 0.03, 0);
    for (const sx of [-0.32, 0.32]) {
      _add(root, new THREE.BoxGeometry(0.04, 0.62, 1.08), wood, sx, 0.34, 0);
    }
    for (const sz of [-0.52, 0.52]) {
      _add(root, new THREE.BoxGeometry(0.64, 0.62, 0.04), wood, 0, 0.34, sz);
    }
    _add(root, new THREE.BoxGeometry(0.64, 0.06, 1.0), mattress, 0, 0.12, 0);
    for (let i = -4; i <= 4; i++) {
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.58, 6), wood, i * 0.08, 0.34, -0.52);
    }
  }

  function _buildWheelchair(root) {
    const frame = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    const seat = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    const tire = new THREE.MeshLambertMaterial({ color: 0x2a2828 });
    _add(root, new THREE.BoxGeometry(0.42, 0.04, 0.38), seat, 0, 0.48, 0.02);
    _add(root, new THREE.BoxGeometry(0.04, 0.42, 0.04), frame, -0.18, 0.68, 0.18, -0.15, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12), tire, 0, 0.22, 0.22, Math.PI / 2, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.12, 0.12, 0.03, 10), tire, 0.22, 0.12, -0.18, Math.PI / 2, 0.3, 0);
    _add(root, new THREE.BoxGeometry(0.32, 0.04, 0.04), frame, 0, 0.48, -0.22);
    for (const sx of [-0.14, 0.14]) {
      _add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.48, 6), frame, sx, 0.24, 0.22);
    }
  }

  function _buildHospitalBed(root) {
    const frame = new THREE.MeshLambertMaterial({ color: 0xd8dce0 });
    const mattress = new THREE.MeshLambertMaterial({ color: 0xe8ece8 });
    const rail = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.92, 0.28, 1.92), frame, 0, 0.32, 0);
    _add(root, new THREE.BoxGeometry(0.88, 0.08, 1.88), mattress, 0, 0.48, 0.02);
    _add(root, new THREE.BoxGeometry(0.88, 0.38, 0.06), mattress, 0, 0.58, 0.88, -0.35, 0, 0);
    for (const sx of [-0.42, 0.42]) {
      _add(root, new THREE.BoxGeometry(0.04, 0.32, 1.82), rail, sx, 0.62, 0);
    }
    _add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), rail, 0.38, 0.52, -0.82);
  }

  function _buildGurney(root) {
    const frame = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const pad = new THREE.MeshLambertMaterial({ color: 0x4a6878 });
    _add(root, new THREE.BoxGeometry(0.62, 0.06, 1.72), pad, 0, 0.58, 0);
    _add(root, new THREE.BoxGeometry(0.58, 0.04, 1.68), frame, 0, 0.54, 0);
    for (const [x, z] of [[-0.24, 0.72], [0.24, 0.72], [-0.24, -0.72], [0.24, -0.72]]) {
      _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.52, 8), frame, x, 0.26, z);
    }
    _add(root, new THREE.BoxGeometry(0.04, 0.38, 0.04), frame, 0.28, 0.78, -0.78);
  }

  function _buildSlotMachine(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x9a2828 });
    const trim = new THREE.MeshLambertMaterial({ color: 0xd8a818 });
    const screen = new THREE.MeshLambertMaterial({ color: 0x1a2838, emissive: 0x2a0818, emissiveIntensity: 0.25 });
    _add(root, new THREE.BoxGeometry(0.52, 1.42, 0.48), body, 0, 0.71, 0);
    _add(root, new THREE.BoxGeometry(0.42, 0.28, 0.04), screen, 0, 1.02, -0.24);
    for (let i = 0; i < 3; i++) {
      _add(root, new THREE.BoxGeometry(0.08, 0.12, 0.06), trim, -0.12 + i * 0.12, 0.62, -0.22);
    }
    _add(root, new THREE.BoxGeometry(0.18, 0.08, 0.12), trim, 0, 0.38, -0.22);
    _add(root, new THREE.BoxGeometry(0.48, 0.06, 0.04), trim, 0, 1.38, -0.24);
  }

  function _buildArcadeCabinet(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x384858 });
    const screen = new THREE.MeshLambertMaterial({ color: 0x3a8838, emissive: 0x1a3818, emissiveIntensity: 0.35 });
    const panel = new THREE.MeshLambertMaterial({ color: 0x8a3828 });
    _add(root, new THREE.BoxGeometry(0.62, 1.52, 0.58), body, 0, 0.76, 0);
    _add(root, new THREE.BoxGeometry(0.48, 0.32, 0.04), screen, 0, 1.18, -0.28, -0.2, 0, 0);
    for (let i = 0; i < 4; i++) {
      _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.02, 8), panel, -0.15 + i * 0.10, 0.52, -0.26);
    }
    _add(root, new THREE.BoxGeometry(0.52, 0.08, 0.42), panel, 0, 0.28, -0.24);
  }

  function _buildDeskLamp(root) {
    const base = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const arm = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    const shade = new THREE.MeshLambertMaterial({ color: 0x2a2828, emissive: 0x3a2810, emissiveIntensity: 0.3 });
    _add(root, new THREE.CylinderGeometry(0.10, 0.12, 0.03, 10), base, 0, 0.015, 0);
    _add(root, new THREE.BoxGeometry(0.03, 0.28, 0.03), arm, 0, 0.18, 0);
    _add(root, new THREE.BoxGeometry(0.22, 0.03, 0.03), arm, 0.10, 0.32, 0, 0, 0, -0.4);
    _add(root, new THREE.CylinderGeometry(0.10, 0.14, 0.14, 10), shade, 0.22, 0.30, 0, 0.5, 0, 0);
  }

  function _buildSpaceHeater(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xe8ece8 });
    const grill = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    const glow = new THREE.MeshLambertMaterial({ color: 0xff8840, emissive: 0x4a2810, emissiveIntensity: 0.4 });
    _add(root, new THREE.BoxGeometry(0.32, 0.42, 0.22), body, 0, 0.21, 0);
    _add(root, new THREE.BoxGeometry(0.26, 0.28, 0.012), grill, 0, 0.24, -0.11);
    _add(root, new THREE.BoxGeometry(0.18, 0.12, 0.008), glow, 0, 0.24, -0.115);
    for (let i = 0; i < 3; i++) {
      _add(root, new THREE.BoxGeometry(0.22, 0.012, 0.008), grill, 0, 0.14 + i * 0.08, -0.112);
    }
  }

  function _buildMailDropBox(root) {
    const blue = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    const slot = new THREE.MeshLambertMaterial({ color: 0x1a2838 });
    _add(root, new THREE.BoxGeometry(0.42, 0.52, 0.28), blue, 0, 0.26, 0);
    _add(root, new THREE.BoxGeometry(0.32, 0.04, 0.02), slot, 0, 0.38, -0.14);
    _add(root, new THREE.BoxGeometry(0.38, 0.06, 0.04), blue, 0, 0.52, -0.12);
  }

  function _buildFireHoseCabinet(root) {
    const red = new THREE.MeshLambertMaterial({ color: 0xb82828 });
    const glass = new THREE.MeshLambertMaterial({ color: 0xa8c8d8, transparent: true, opacity: 0.4 });
    const hose = new THREE.MeshLambertMaterial({ color: 0x9a2828 });
    _add(root, new THREE.BoxGeometry(0.62, 0.72, 0.18), red, 0, 0.36, 0);
    _add(root, new THREE.BoxGeometry(0.52, 0.58, 0.012), glass, 0, 0.38, -0.09);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 6, 14), hose);
    coil.rotation.x = Math.PI / 2;
    coil.position.set(0, 0.38, -0.04);
    coil.castShadow = true;
    root.add(coil);
    _add(root, new THREE.BoxGeometry(0.08, 0.04, 0.06), red, 0.18, 0.52, -0.08);
  }

  function _buildPoolTable(root) {
    const felt = new THREE.MeshLambertMaterial({ color: 0x286838 });
    const rail = new THREE.MeshLambertMaterial({ color: 0x4a3828 });
    const leg = new THREE.MeshLambertMaterial({ color: 0x3a2820 });
    _add(root, new THREE.BoxGeometry(1.42, 0.08, 0.72), felt, 0, 0.76, 0);
    _add(root, new THREE.BoxGeometry(1.48, 0.12, 0.78), rail, 0, 0.80, 0);
    for (const [x, z] of [[-0.62, 0.32], [0.62, 0.32], [-0.62, -0.32], [0.62, -0.32]]) {
      _add(root, new THREE.CylinderGeometry(0.05, 0.05, 0.76, 8), leg, x, 0.38, z);
    }
    for (const [x, z] of [[-0.5, 0], [0.5, 0], [0, 0.2]]) {
      _add(root, new THREE.SphereGeometry(0.018, 6, 6),
        new THREE.MeshLambertMaterial({ color: x < 0 ? 0xe8e8e0 : 0x8a2828 }), x, 0.84, z);
    }
  }

  function _buildTreadmill(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    const belt = new THREE.MeshLambertMaterial({ color: 0x2a2828 });
    const panel = new THREE.MeshLambertMaterial({ color: 0x1a2838 });
    _add(root, new THREE.BoxGeometry(0.52, 0.12, 1.32), body, 0, 0.18, 0);
    _add(root, new THREE.BoxGeometry(0.46, 0.02, 1.22), belt, 0, 0.25, 0);
    _add(root, new THREE.BoxGeometry(0.08, 0.72, 0.08), body, 0, 0.58, -0.58);
    _add(root, new THREE.BoxGeometry(0.28, 0.18, 0.04), panel, 0, 0.88, -0.58, -0.15, 0, 0);
    _add(root, new THREE.BoxGeometry(0.42, 0.04, 0.32), body, 0, 0.42, -0.58, -0.35, 0, 0);
  }

  function _buildBakeryRack(root) {
    const metal = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const bread = new THREE.MeshLambertMaterial({ color: 0xc8a060 });
    for (const sx of [-0.42, 0.42]) {
      _add(root, new THREE.BoxGeometry(0.04, 1.32, 0.38), metal, sx, 0.66, 0);
    }
    for (const y of [0.22, 0.62, 1.02]) {
      _add(root, new THREE.BoxGeometry(0.82, 0.03, 0.36), metal, 0, y, 0);
      for (let i = 0; i < 4; i++) {
        _add(root, new THREE.BoxGeometry(0.14, 0.06, 0.08), bread, -0.28 + i * 0.18, y + 0.05, 0.04);
      }
    }
  }

  function _buildClothesRack(root) {
    const metal = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    const cloth = new THREE.MeshLambertMaterial({ color: 0x4a5068 });
    _add(root, new THREE.BoxGeometry(1.12, 0.04, 0.42), metal, 0, 1.42, 0);
    for (const sx of [-0.48, 0.48]) {
      _add(root, new THREE.CylinderGeometry(0.025, 0.025, 1.42, 8), metal, sx, 0.71, 0);
    }
    for (const x of [-0.32, -0.08, 0.16, 0.38]) {
      _add(root, new THREE.BoxGeometry(0.02, 0.48, 0.32), cloth, x, 1.02, 0, 0.05, 0, 0);
    }
    _add(root, new THREE.BoxGeometry(0.28, 0.52, 0.02), cloth, 0.12, 1.0, 0.08, 0, 0.2, 0);
  }

  function _buildHairDryer(root) {
    const white = new THREE.MeshLambertMaterial({ color: 0xe8ece8 });
    const chrome = new THREE.MeshLambertMaterial({ color: 0xb8c0c8 });
    const hose = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    _add(root, new THREE.BoxGeometry(0.12, 0.08, 0.06), white, 0, 1.42, -0.04);
    _add(root, new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), hose, 0, 1.18, -0.04);
    _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.14, 8), chrome, 0, 0.92, -0.04, 0.35, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.025, 0.03, 0.08, 8), white, 0, 0.84, -0.04, 0.5, 0, 0);
  }

  function _buildEvCharger(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x3a4858 });
    const panel = new THREE.MeshLambertMaterial({ color: 0x1a2838 });
    const glow = new THREE.MeshLambertMaterial({ color: 0x48c878, emissive: 0x184828, emissiveIntensity: 0.5 });
    const cable = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    _add(root, new THREE.BoxGeometry(0.08, 0.08, 0.08), body, 0, 0.04, 0);
    _add(root, new THREE.BoxGeometry(0.28, 0.52, 0.18), body, 0, 0.34, 0);
    _add(root, new THREE.BoxGeometry(0.22, 0.18, 0.012), panel, 0, 0.42, -0.09);
    _add(root, new THREE.BoxGeometry(0.06, 0.06, 0.012), glow, 0, 0.38, -0.095);
    _add(root, new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8), cable, 0.14, 0.18, -0.08, 0, 0.3, 0);
    _add(root, new THREE.BoxGeometry(0.08, 0.05, 0.06), body, 0.22, 0.08, -0.06);
  }

  function _buildExerciseBike(root) {
    const frame = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    const seat = new THREE.MeshLambertMaterial({ color: 0x2a2828 });
    const wheel = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    _add(root, new THREE.BoxGeometry(0.42, 0.06, 0.72), frame, 0, 0.22, 0);
    _add(root, new THREE.CylinderGeometry(0.28, 0.28, 0.04, 16), wheel, 0, 0.42, 0.18, Math.PI / 2, 0, 0);
    _add(root, new THREE.BoxGeometry(0.18, 0.04, 0.12), seat, 0, 0.58, -0.12);
    _add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), frame, 0, 0.78, -0.22);
    _add(root, new THREE.BoxGeometry(0.22, 0.04, 0.06), frame, 0, 0.88, -0.28, -0.35, 0, 0);
    for (const sx of [-0.08, 0.08]) {
      _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8), frame, sx, 0.52, -0.28);
    }
  }

  function _buildWeightBench(root) {
    const pad = new THREE.MeshLambertMaterial({ color: 0x2a3040 });
    const frame = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const bar = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.42, 0.08, 1.22), pad, 0, 0.42, 0);
    for (const [x, z] of [[-0.16, 0.48], [0.16, 0.48], [-0.16, -0.48], [0.16, -0.48]]) {
      _add(root, new THREE.BoxGeometry(0.06, 0.42, 0.06), frame, x, 0.21, z);
    }
    _add(root, new THREE.BoxGeometry(0.38, 0.06, 0.28), pad, 0, 0.72, -0.42, -0.25, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.02, 0.02, 1.05, 8), bar, 0, 0.92, 0, 0, 0, Math.PI / 2);
    for (const sx of [-0.48, 0.48]) {
      _add(root, new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10), bar, sx, 0.92, 0);
    }
  }

  function _buildCashRegister(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    const drawer = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    const screen = new THREE.MeshLambertMaterial({ color: 0x1a2838 });
    _add(root, new THREE.BoxGeometry(0.38, 0.22, 0.32), body, 0, 0.11, 0);
    _add(root, new THREE.BoxGeometry(0.32, 0.06, 0.26), drawer, 0, 0.03, 0);
    _add(root, new THREE.BoxGeometry(0.18, 0.12, 0.02), screen, 0, 0.28, -0.16, -0.45, 0, 0);
    _add(root, new THREE.BoxGeometry(0.22, 0.04, 0.18), body, 0, 0.26, -0.08, -0.35, 0, 0);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        _add(root, new THREE.BoxGeometry(0.04, 0.012, 0.04),
          new THREE.MeshLambertMaterial({ color: 0x3a4048 }), -0.1 + j * 0.06, 0.24, -0.14 + i * 0.05);
      }
    }
  }

  function _buildDisplayFridge(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xe8ece8 });
    const glass = new THREE.MeshLambertMaterial({ color: 0xa8d8e8, transparent: true, opacity: 0.35 });
    const shelf = new THREE.MeshLambertMaterial({ color: 0xc8d0d8 });
    _add(root, new THREE.BoxGeometry(0.72, 1.82, 0.62), body, 0, 0.91, 0);
    _add(root, new THREE.BoxGeometry(0.62, 1.62, 0.012), glass, 0, 0.95, -0.31);
    for (const y of [0.42, 0.92, 1.42]) {
      _add(root, new THREE.BoxGeometry(0.58, 0.02, 0.48), shelf, 0, y, -0.02);
    }
    for (let i = 0; i < 6; i++) {
      _add(root, new THREE.BoxGeometry(0.08, 0.12, 0.08),
        new THREE.MeshLambertMaterial({ color: 0xc84848 }), -0.2 + (i % 3) * 0.2, 0.52 + Math.floor(i / 3) * 0.5, -0.08);
    }
    _add(root, new THREE.BoxGeometry(0.68, 0.08, 0.58), body, 0, 0.04, 0);
  }

  function _buildRecyclingDumpster(root) {
    const blue = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    const yellow = new THREE.MeshLambertMaterial({ color: 0xc8a828 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a3828 });
    _add(root, new THREE.BoxGeometry(1.55, 0.12, 0.95), dark, 0, 0.06, 0);
    _add(root, new THREE.BoxGeometry(0.72, 0.95, 0.88), blue, -0.38, 0.56, 0);
    _add(root, new THREE.BoxGeometry(0.72, 0.95, 0.88), yellow, 0.38, 0.56, 0);
    _add(root, new THREE.BoxGeometry(1.55, 0.08, 0.88), dark, 0, 1.06, 0);
    _add(root, new THREE.BoxGeometry(0.28, 0.06, 0.04), dark, -0.38, 0.92, -0.46);
    _add(root, new THREE.BoxGeometry(0.28, 0.06, 0.04), dark, 0.38, 0.92, -0.46);
  }

  function _buildDentistChair(root) {
    const base = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const seat = new THREE.MeshLambertMaterial({ color: 0x4a88a8 });
    const head = new THREE.MeshLambertMaterial({ color: 0x3a7888 });
    _add(root, new THREE.CylinderGeometry(0.22, 0.28, 0.12, 10), base, 0, 0.06, 0);
    _add(root, new THREE.BoxGeometry(0.08, 0.52, 0.08), base, 0, 0.38, 0);
    _add(root, new THREE.BoxGeometry(0.52, 0.08, 0.62), seat, 0, 0.52, 0.02);
    _add(root, new THREE.BoxGeometry(0.48, 0.42, 0.08), head, 0, 0.82, -0.28, -0.55, 0, 0);
    _add(root, new THREE.BoxGeometry(0.12, 0.32, 0.08), base, 0.28, 0.38, 0.22);
    _add(root, new THREE.BoxGeometry(0.08, 0.28, 0.06), base, -0.28, 0.36, 0.22);
  }

  function _buildIvStand(root) {
    const pole = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const bag = new THREE.MeshLambertMaterial({ color: 0xd8e8f0, transparent: true, opacity: 0.75 });
    const wheel = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    _add(root, new THREE.CylinderGeometry(0.018, 0.018, 1.62, 8), pole, 0, 0.81, 0);
    for (const a of [0, Math.PI * 0.66, Math.PI * 1.33]) {
      _add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.32, 8), wheel, Math.cos(a) * 0.18, 0.03, Math.sin(a) * 0.18, 0, a, Math.PI / 2);
    }
    _add(root, new THREE.BoxGeometry(0.22, 0.32, 0.06), bag, 0, 1.42, 0);
    _add(root, new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), pole, 0.04, 1.08, 0);
  }

  function _buildComputerTower(root) {
    const caseMat = new THREE.MeshLambertMaterial({ color: 0x2a2e34 });
    const vent = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const led = new THREE.MeshLambertMaterial({ color: 0x48c878, emissive: 0x184828, emissiveIntensity: 0.6 });
    _add(root, new THREE.BoxGeometry(0.18, 0.42, 0.38), caseMat, 0, 0.21, 0);
    _add(root, new THREE.BoxGeometry(0.14, 0.08, 0.02), vent, 0, 0.38, -0.19);
    _add(root, new THREE.BoxGeometry(0.02, 0.02, 0.02), led, 0.06, 0.08, -0.19);
    _add(root, new THREE.BoxGeometry(0.16, 0.02, 0.34), caseMat, 0, 0.01, 0);
    for (let i = 0; i < 4; i++) {
      _add(root, new THREE.BoxGeometry(0.008, 0.22, 0.008), vent, -0.05 + i * 0.035, 0.22, -0.19);
    }
  }

  function _buildWhiteboard(root) {
    const frame = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const board = new THREE.MeshLambertMaterial({ color: 0xf0f4f0 });
    const tray = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    _add(root, new THREE.BoxGeometry(1.22, 0.04, 0.82), frame, 0, 0.62, 0);
    _add(root, new THREE.BoxGeometry(1.12, 0.012, 0.72), board, 0, 0.64, -0.02);
    _add(root, new THREE.BoxGeometry(1.12, 0.04, 0.06), tray, 0, 0.38, -0.02);
    _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.04), new THREE.MeshLambertMaterial({ color: 0x2868c8 }), -0.42, 0.52, -0.04);
    _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.04), new THREE.MeshLambertMaterial({ color: 0xc82828 }), -0.32, 0.52, -0.04);
  }

  function _buildCorkBoard(root) {
    const cork = new THREE.MeshLambertMaterial({ color: 0xa87848 });
    const frame = new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    _add(root, new THREE.BoxGeometry(0.82, 0.62, 0.04), frame, 0, 0.31, 0);
    _add(root, new THREE.BoxGeometry(0.72, 0.52, 0.012), cork, 0, 0.31, -0.02);
    for (const [x, y, c] of [[-0.18, 0.42, 0xfff8c8], [0.12, 0.38, 0xc8e8f8], [-0.08, 0.22, 0xf8c8c8], [0.22, 0.28, 0xd8f8c8]]) {
      _add(root, new THREE.BoxGeometry(0.12, 0.08, 0.008), new THREE.MeshLambertMaterial({ color: c }), x, y, -0.028);
    }
  }

  function _buildPayPhone(root) {
    const metal = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    const handset = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    _add(root, new THREE.BoxGeometry(0.28, 0.52, 0.12), metal, 0, 0.26, 0);
    _add(root, new THREE.BoxGeometry(0.22, 0.08, 0.02), metal, 0, 0.48, -0.06);
    _add(root, new THREE.BoxGeometry(0.08, 0.14, 0.06), handset, 0.12, 0.38, -0.08);
    _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.28, 6), handset, 0.04, 0.32, -0.06);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.008), metal, -0.06 + j * 0.06, 0.18 + i * 0.06, -0.06);
      }
    }
  }

  function _buildRecycleBinDual(root) {
    const green = new THREE.MeshLambertMaterial({ color: 0x3a6848 });
    const yellow = new THREE.MeshLambertMaterial({ color: 0xc8a828 });
    _add(root, new THREE.BoxGeometry(0.38, 0.52, 0.32), green, -0.2, 0.26, 0);
    _add(root, new THREE.BoxGeometry(0.38, 0.52, 0.32), yellow, 0.2, 0.26, 0);
    _add(root, new THREE.BoxGeometry(0.78, 0.04, 0.34), new THREE.MeshLambertMaterial({ color: 0x4a5058 }), 0, 0.52, 0);
    _add(root, new THREE.BoxGeometry(0.02, 0.48, 0.34), new THREE.MeshLambertMaterial({ color: 0x3a4048 }), 0, 0.26, 0);
  }

  function _buildBookStack(root) {
    const colors = [0x8a4838, 0x386848, 0x484878, 0x786838, 0x684848];
    for (let i = 0; i < 5; i++) {
      const h = 0.04 + (i % 3) * 0.02;
      _add(root, new THREE.BoxGeometry(0.22, h, 0.16),
        new THREE.MeshLambertMaterial({ color: colors[i] }), (i - 2) * 0.04, 0.02 + i * 0.05, (i % 2) * 0.02);
    }
    _add(root, new THREE.BoxGeometry(0.28, 0.18, 0.2),
      new THREE.MeshLambertMaterial({ color: 0x5a4038 }), 0.08, 0.12, -0.04, 0, 0.15, 0);
  }

  function _buildWallTv(root) {
    const frame = new THREE.MeshLambertMaterial({ color: 0x1a1e24 });
    const screen = new THREE.MeshLambertMaterial({ color: 0x182838, emissive: 0x081018, emissiveIntensity: 0.3 });
    _add(root, new THREE.BoxGeometry(1.12, 0.04, 0.68), frame, 0, 0.72, 0);
    _add(root, new THREE.BoxGeometry(1.02, 0.012, 0.58), screen, 0, 0.74, -0.02);
    _add(root, new THREE.BoxGeometry(0.12, 0.08, 0.06), frame, 0, 0.68, 0.02);
  }

  function _buildLedSign(root) {
    const pole = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const panel = new THREE.MeshLambertMaterial({ color: 0x1a2838 });
    const glow = new THREE.MeshLambertMaterial({ color: 0xffa848, emissive: 0x4a2810, emissiveIntensity: 0.55 });
    _add(root, new THREE.CylinderGeometry(0.06, 0.08, 0.08, 8), pole, 0, 0.04, 0);
    _add(root, new THREE.CylinderGeometry(0.04, 0.045, 2.42, 8), pole, 0, 1.29, 0);
    _add(root, new THREE.BoxGeometry(0.82, 0.42, 0.08), panel, 0, 2.38, 0);
    _add(root, new THREE.BoxGeometry(0.72, 0.28, 0.012), glow, 0, 2.38, -0.04);
    _add(root, new THREE.BoxGeometry(0.52, 0.06, 0.012), glow, 0, 2.48, -0.045);
  }

  function _buildGrandfatherClock(root) {
    const wood = new THREE.MeshLambertMaterial({ color: 0x5a4030 });
    const face = new THREE.MeshLambertMaterial({ color: 0xf0ece0 });
    const pend = new THREE.MeshLambertMaterial({ color: 0xc8a060 });
    _add(root, new THREE.BoxGeometry(0.42, 1.92, 0.28), wood, 0, 0.96, 0);
    _add(root, new THREE.BoxGeometry(0.32, 0.32, 0.02), face, 0, 1.62, -0.14);
    _add(root, new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16), face, 0, 1.62, -0.15);
    _add(root, new THREE.BoxGeometry(0.06, 0.42, 0.02), pend, 0, 0.82, -0.12);
    _add(root, new THREE.BoxGeometry(0.38, 0.08, 0.26), wood, 0, 0.04, 0);
    _add(root, new THREE.BoxGeometry(0.36, 0.12, 0.24), wood, 0, 1.88, 0);
  }

  function _buildKitchenIsland(root) {
    const M = _M();
    const top = M?.tableTop?.(0xd8d0c0) || new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    const body = M?.woodFine?.(0x8a7868) || new THREE.MeshLambertMaterial({ color: 0x8a7868 });
    const handle = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(1.22, 0.88, 0.62), body, 0, 0.44, 0);
    _add(root, new THREE.BoxGeometry(1.28, 0.06, 0.68), top, 0, 0.91, 0);
    _add(root, new THREE.BoxGeometry(0.42, 0.02, 0.38), top, 0, 0.86, 0);
    _add(root, new THREE.BoxGeometry(0.08, 0.04, 0.02), handle, 0.28, 0.52, -0.31);
    _add(root, new THREE.BoxGeometry(0.08, 0.04, 0.02), handle, -0.28, 0.52, -0.31);
  }

  if (ZS.registerDecorPrefab) {
    ZS.registerDecorPrefab('spawn_urban_trash_bin', { build: _buildTrashBin, label: 'Poubelle urbaine', category: 'ville', desc: 'Bac métal vert ~0,72 m — trottoir / parc.' });
    ZS.registerDecorPrefab('spawn_urban_bench', { build: _buildParkBench, label: 'Banc public', category: 'ville', desc: 'Banc bois / fer ~1,05 m — assise −Z.' });
    ZS.registerDecorPrefab('spawn_urban_street_lamp', { build: _buildStreetLamp, label: 'Lampadaire', category: 'ville', desc: 'Poteau ~3,1 m + lumière chaude — alignement rue.' });
    ZS.registerDecorPrefab('spawn_urban_fire_hydrant', { build: _buildFireHydrant, label: 'Borne incendie', category: 'ville', desc: 'Hydrant rouge ~0,75 m — coin de rue.' });
    ZS.registerDecorPrefab('spawn_urban_mailbox', { build: _buildMailbox, label: 'Boîte aux lettres', category: 'ville', desc: 'Poteau + boîte bleue ~1,2 m.' });
    ZS.registerDecorPrefab('spawn_urban_bicycle_rack', { build: _buildBicycleRack, label: 'Arceaux vélos', category: 'ville', desc: 'Rail ~1,35 m — 5 arceaux.' });
    ZS.registerDecorPrefab('spawn_urban_traffic_cone', { build: _buildTrafficCone, label: 'Cône de signalisation', category: 'ville', desc: 'Cône orange ~0,42 m.' });
    ZS.registerDecorPrefab('spawn_urban_dumpster', { build: _buildDumpster, label: 'Benne à ordures', category: 'ville', desc: 'Container vert ~1,65 m — ruelle / parking.' });
    ZS.registerDecorPrefab('spawn_urban_pallet_stack', { build: _buildPalletStack, label: 'Palettes + cartons', category: 'ville', desc: '2 palettes EUR + cartons + film — quai / entrepôt.' });
    ZS.registerDecorPrefab('spawn_urban_barrel', { build: _buildBarrel, label: 'Fût métal', category: 'ville', desc: 'Baril ~0,82 m — industrie / garage.' });
    ZS.registerDecorPrefab('spawn_urban_fence_panel', { build: _buildFencePanel, label: 'Panneau clôture', category: 'ville', desc: 'Grillage ~1,8 m — limite terrain.' });
    ZS.registerDecorPrefab('spawn_urban_bollard', { build: _buildBollard, label: 'Borne anti-voiture', category: 'ville', desc: 'Poteau béton ~0,85 m — trottoir.' });
    ZS.registerDecorPrefab('spawn_prop_fridge', { build: _buildFridge, label: 'Réfrigérateur', category: 'ville', desc: 'Frigo usé ~1,62 m — intérieur maison / épicerie.' });
    ZS.registerDecorPrefab('spawn_prop_grocery_shelf', { build: _buildGroceryShelf, label: 'Rayon épicerie', category: 'ville', desc: 'Étagère métal + conserves ~1,72 m.' });
    ZS.registerDecorPrefab('spawn_prop_shop_counter', { build: _buildShopCounter, label: 'Comptoir magasin', category: 'ville', desc: 'Comptoir L ~1,6 m — caisse, vitre, tiroir.' });
    ZS.registerDecorPrefab('spawn_prop_sofa', { build: _buildSofa, label: 'Canapé usé', category: 'ville', desc: 'Canapé 3 places ~1,82 m — tissu et coussins.' });
    ZS.registerDecorPrefab('spawn_urban_planter', { build: _buildPlanter, label: 'Jardinière urbaine', category: 'ville', desc: 'Bac béton + plante ~0,85 m — devanture.' });
    ZS.registerDecorPrefab('spawn_urban_stop_sign', { build: _buildStopSign, label: 'Panneau STOP', category: 'ville', desc: 'Octogone rouge ~2,1 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_urban_newspaper_box', { build: _buildNewspaperBox, label: 'Borne journaux', category: 'ville', desc: 'Distributeur presse métal ~0,72 m.' });
    ZS.registerDecorPrefab('spawn_urban_shopping_cart', { build: _buildShoppingCart, label: 'Chariot courses', category: 'ville', desc: 'Caddie métal renversé ~1,1 m.' });
    ZS.registerDecorPrefab('spawn_urban_vending_machine', { build: _buildVendingMachine, label: 'Distributeur boissons', category: 'ville', desc: 'Automate ~1,72 m — vitrine −Z.' });
    ZS.registerDecorPrefab('spawn_urban_police_barrier', { build: _buildPoliceBarrier, label: 'Barrière police', category: 'ville', desc: 'Barrière plastique jaune/noir ~1,05 m.' });
    ZS.registerDecorPrefab('spawn_urban_road_sign', { build: _buildRoadSign, label: 'Panneau directionnel', category: 'ville', desc: 'Flèche bleue ~2,4 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_urban_propane_tank', { build: _buildPropaneTank, label: 'Bouteille propane', category: 'ville', desc: 'Bonbonne ~1,0 m — cour / garage.' });
    ZS.registerDecorPrefab('spawn_urban_tire_stack', { build: _buildTireStack, label: 'Pile de pneus', category: 'ville', desc: '3 pneus empilés ~0,65 m.' });
    ZS.registerDecorPrefab('spawn_urban_wheelbarrow', { build: _buildWheelbarrow, label: 'Brouette', category: 'ville', desc: 'Brouette métal/bois ~0,75 m.' });
    ZS.registerDecorPrefab('spawn_urban_abandoned_bike', { build: _buildAbandonedBike, label: 'Vélo abandonné', category: 'ville', desc: 'Vélo renversé ~1,0 m — trottoir / parking.' });
    ZS.registerDecorPrefab('spawn_prop_office_desk', { build: _buildOfficeDesk, label: 'Bureau', category: 'ville', desc: 'Bureau ~1,22 m + écran — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_office_chair', { build: _buildOfficeChair, label: 'Chaise de bureau', category: 'ville', desc: 'Fauteuil roulettes ~0,92 m — assise −Z.' });
    ZS.registerDecorPrefab('spawn_prop_wardrobe', { build: _buildWardrobe, label: 'Armoire', category: 'ville', desc: 'Armoire 2 portes ~1,92 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_kitchen_table', { build: _buildKitchenTable, label: 'Table cuisine', category: 'ville', desc: 'Table carrée ~0,92 m — 4 pieds bois.' });
    ZS.registerDecorPrefab('spawn_prop_kitchen_chair', { build: _buildKitchenChair, label: 'Chaise cuisine', category: 'ville', desc: 'Chaise bois ~0,90 m — assise −Z.' });
    ZS.registerDecorPrefab('spawn_prop_bookshelf', { build: _buildBookshelf, label: 'Bibliothèque', category: 'ville', desc: 'Étagère livres ~1,52 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_tv_old', { build: _buildOldTv, label: 'Vieille télévision', category: 'ville', desc: 'TV CRT ~0,78 m — écran −Z.' });
    ZS.registerDecorPrefab('spawn_prop_washing_machine', { build: _buildWashingMachine, label: 'Lave-linge', category: 'ville', desc: 'Lave-linge ~0,82 m — hublot −Z.' });
    ZS.registerDecorPrefab('spawn_prop_metal_shelf', { build: _buildMetalShelf, label: 'Étagère métal', category: 'ville', desc: 'Rayonnage entrepôt ~1,82 m + cartons.' });
    ZS.registerDecorPrefab('spawn_prop_workbench', { build: _buildWorkbench, label: 'Établi garage', category: 'ville', desc: 'Établi ~1,48 m + étau — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_double_bed', { build: _buildDoubleBed, label: 'Lit double', category: 'ville', desc: 'Lit 2 places ~1,92 m — chambre.' });
    ZS.registerDecorPrefab('spawn_prop_nightstand', { build: _buildNightstand, label: 'Table de chevet', category: 'ville', desc: 'Chevet + lampe ~0,72 m.' });
    ZS.registerDecorPrefab('spawn_prop_dresser', { build: _buildDresser, label: 'Commode', category: 'ville', desc: 'Commode 3 tiroirs ~0,82 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_microwave', { build: _buildMicrowave, label: 'Micro-ondes', category: 'ville', desc: 'Micro-ondes ~0,28 m — plan travail.' });
    ZS.registerDecorPrefab('spawn_prop_stove', { build: _buildStove, label: 'Cuisinière', category: 'ville', desc: 'Four + 4 feux ~0,88 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_kitchen_sink', { build: _buildKitchenSink, label: 'Évier cuisine', category: 'ville', desc: 'Meuble évier ~0,82 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_floor_lamp', { build: _buildFloorLamp, label: 'Lampadaire sol', category: 'ville', desc: 'Lampadaire ~1,55 m + lumière.' });
    ZS.registerDecorPrefab('spawn_prop_rug_urban', { build: _buildUrbanRug, label: 'Tapis salon', category: 'ville', desc: 'Tapis ~1,62 × 1,08 m — sol.' });
    ZS.registerDecorPrefab('spawn_urban_atm', { build: _buildAtm, label: 'Distributeur ATM', category: 'ville', desc: 'ATM ~1,52 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_urban_phone_booth', { build: _buildPhoneBooth, label: 'Cabine téléphone', category: 'ville', desc: 'Cabine rouge ~2,1 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_urban_picnic_table', { build: _buildPicnicTable, label: 'Table pique-nique', category: 'ville', desc: 'Table + bancs ~1,52 m — parc.' });
    ZS.registerDecorPrefab('spawn_urban_trash_pile', { build: _buildTrashPile, label: 'Tas de déchets', category: 'ville', desc: 'Sacs + cartons ~0,4 m — ruelle.' });
    ZS.registerDecorPrefab('spawn_urban_wood_crate', { build: _buildWoodCrate, label: 'Caisse bois', category: 'ville', desc: 'Caisse renforcée ~0,62 m.' });
    ZS.registerDecorPrefab('spawn_urban_generator', { build: _buildGenerator, label: 'Groupe électrogène', category: 'ville', desc: 'Générateur ~0,62 m — cour / chantier.' });
    ZS.registerDecorPrefab('spawn_urban_fuel_cans', { build: _buildFuelCans, label: 'Jerricans', category: 'ville', desc: '3 jerricans essence ~0,34 m.' });
    ZS.registerDecorPrefab('spawn_urban_bbq_grill', { build: _buildBbqGrill, label: 'Barbecue', category: 'ville', desc: 'BBQ charbon ~0,88 m — jardin / terrasse.' });
    ZS.registerDecorPrefab('spawn_urban_tool_cabinet', { build: _buildToolCabinet, label: 'Armoire à outils', category: 'ville', desc: 'Armoire rouge ~0,92 m — garage.' });
    ZS.registerDecorPrefab('spawn_prop_bathtub', { build: _buildBathtub, label: 'Baignoire', category: 'ville', desc: 'Baignoire ~1,52 m — salle de bain.' });
    ZS.registerDecorPrefab('spawn_urban_bus_shelter', { build: _buildBusShelter, label: 'Abri bus', category: 'ville', desc: 'Abri ~2,2 m — arrêt transport.' });
    ZS.registerDecorPrefab('spawn_urban_window_ac', { build: _buildWindowAc, label: 'Clim fenêtre', category: 'ville', desc: 'Unité AC ~0,48 m — façade −Z.' });
    ZS.registerDecorPrefab('spawn_prop_toilet', { build: _buildToilet, label: 'WC', category: 'ville', desc: 'Toilettes ~0,72 m — salle de bain.' });
    ZS.registerDecorPrefab('spawn_prop_bathroom_sink', { build: _buildBathroomSink, label: 'Lavabo', category: 'ville', desc: 'Lavabo colonne ~1,06 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_coffee_table', { build: _buildCoffeeTable, label: 'Table basse', category: 'ville', desc: 'Table basse salon ~0,92 m.' });
    ZS.registerDecorPrefab('spawn_prop_dining_table', { build: _buildDiningTable, label: 'Table à manger', category: 'ville', desc: 'Table rectangulaire ~1,52 m — 6 places.' });
    ZS.registerDecorPrefab('spawn_prop_bunk_bed', { build: _buildBunkBed, label: 'Lit superposé', category: 'ville', desc: 'Lits 2 niveaux ~1,42 m — dortoir / chambre enfant.' });
    ZS.registerDecorPrefab('spawn_prop_filing_cabinet', { build: _buildFilingCabinet, label: 'Classeur bureau', category: 'ville', desc: 'Armoire à tiroirs ~1,22 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_safe', { build: _buildSafe, label: 'Coffre-fort', category: 'ville', desc: 'Coffre métal ~0,58 m — banque / bureau.' });
    ZS.registerDecorPrefab('spawn_urban_gas_pump', { build: _buildGasPump, label: 'Pompe à essence', category: 'ville', desc: 'Distributeur ~1,66 m — station-service.' });
    ZS.registerDecorPrefab('spawn_urban_parking_meter', { build: _buildParkingMeter, label: 'Parcmètre', category: 'ville', desc: 'Horodateur ~1,32 m — trottoir.' });
    ZS.registerDecorPrefab('spawn_urban_street_clock', { build: _buildStreetClock, label: 'Horloge de rue', category: 'ville', desc: 'Poteau + cadran ~2,72 m.' });
    ZS.registerDecorPrefab('spawn_urban_fire_extinguisher', { build: _buildFireExtinguisher, label: 'Extincteur', category: 'ville', desc: 'Extincteur mural ~0,78 m.' });
    ZS.registerDecorPrefab('spawn_prop_water_cooler', { build: _buildWaterCooler, label: 'Fontaine à eau', category: 'ville', desc: 'Distributeur bureau ~1,28 m.' });
    ZS.registerDecorPrefab('spawn_prop_office_printer', { build: _buildOfficePrinter, label: 'Imprimante', category: 'ville', desc: 'Imprimante bureau ~0,38 m.' });
    ZS.registerDecorPrefab('spawn_urban_satellite_dish', { build: _buildSatelliteDish, label: 'Parabole', category: 'ville', desc: 'Antenne satellite ~2,0 m — toit / façade.' });
    ZS.registerDecorPrefab('spawn_prop_mattress_floor', { build: _buildMattressFloor, label: 'Matelas au sol', category: 'ville', desc: 'Matelas posé ~1,72 m — squat / refuge.' });
    ZS.registerDecorPrefab('spawn_urban_beer_crate', { build: _buildBeerCrate, label: 'Cageot bières', category: 'ville', desc: 'Cageot 6 bouteilles ~0,28 m.' });
    ZS.registerDecorPrefab('spawn_prop_coat_rack_urban', { build: _buildCoatRackUrban, label: 'Porte-manteau', category: 'ville', desc: 'Poteau + manteau ~1,65 m — entrée.' });
    ZS.registerDecorPrefab('spawn_urban_pallet_single', { build: _buildPalletSingle, label: 'Palette EUR', category: 'ville', desc: 'Palette seule ~0,15 m — quai.' });
    ZS.registerDecorPrefab('spawn_prop_medicine_cabinet', { build: _buildMedicineCabinet, label: 'Armoire pharmacie', category: 'ville', desc: 'Miroir + croix rouge ~0,62 m — SDB.' });
    ZS.registerDecorPrefab('spawn_urban_cardboard_box', { build: _buildCardboardBox, label: 'Carton seul', category: 'ville', desc: 'Carton rubané ~0,38 m — déménagement.' });
    ZS.registerDecorPrefab('spawn_prop_dryer', { build: _buildDryer, label: 'Sèche-linge', category: 'ville', desc: 'Sèche-linge ~0,82 m — buanderie.' });
    ZS.registerDecorPrefab('spawn_prop_radiator', { build: _buildRadiator, label: 'Radiateur', category: 'ville', desc: 'Radiateur fonte ~0,52 m — mur.' });
    ZS.registerDecorPrefab('spawn_prop_floor_fan', { build: _buildFloorFan, label: 'Ventilateur pied', category: 'ville', desc: 'Ventilateur ~0,95 m — bureau / chambre.' });
    ZS.registerDecorPrefab('spawn_prop_dishwasher', { build: _buildDishwasher, label: 'Lave-vaisselle', category: 'ville', desc: 'LV intégré ~0,82 m — cuisine.' });
    ZS.registerDecorPrefab('spawn_prop_ironing_board', { build: _buildIroningBoard, label: 'Planche à repasser', category: 'ville', desc: 'Planche ~1,12 m — buanderie.' });
    ZS.registerDecorPrefab('spawn_prop_wall_mirror', { build: _buildWallMirror, label: 'Miroir mural', category: 'ville', desc: 'Miroir ~0,82 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_shower_stall', { build: _buildShowerStall, label: 'Cabine douche', category: 'ville', desc: 'Douche vitrée ~1,92 m — SDB.' });
    ZS.registerDecorPrefab('spawn_urban_urinal', { build: _buildUrinal, label: 'Urinoir', category: 'ville', desc: 'Urinoir mural ~1,04 m — WC public.' });
    ZS.registerDecorPrefab('spawn_urban_locker', { build: _buildLocker, label: 'Casiers vestiaire', category: 'ville', desc: 'Rangée 3 casiers ~1,52 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_school_desk', { build: _buildSchoolDesk, label: 'Pupitre école', category: 'ville', desc: 'Bureau + siège ~0,72 m — classe.' });
    ZS.registerDecorPrefab('spawn_urban_jersey_barrier', { build: _buildJerseyBarrier, label: 'Borne Jersey', category: 'ville', desc: 'Barrière béton ~1,42 m — chantier.' });
    ZS.registerDecorPrefab('spawn_urban_hand_truck', { build: _buildHandTruck, label: 'Diable', category: 'ville', desc: 'Diable + carton ~1,08 m — quai.' });
    ZS.registerDecorPrefab('spawn_urban_shopping_basket', { build: _buildShoppingBasket, label: 'Panier courses', category: 'ville', desc: 'Panier plastique ~0,38 m — supermarché.' });
    ZS.registerDecorPrefab('spawn_urban_snack_machine', { build: _buildSnackMachine, label: 'Distributeur snacks', category: 'ville', desc: 'Automate chips ~1,52 m — vitrine −Z.' });
    ZS.registerDecorPrefab('spawn_prop_barber_chair', { build: _buildBarberChair, label: 'Fauteuil barbier', category: 'ville', desc: 'Fauteuil cuir ~0,92 m — salon coiffure.' });
    ZS.registerDecorPrefab('spawn_urban_clothesline', { build: _buildClothesline, label: 'Étendoir linge', category: 'ville', desc: 'Corde à linge ~2,2 m — cour.' });
    ZS.registerDecorPrefab('spawn_prop_sun_lounger', { build: _buildSunLounger, label: 'Transat', category: 'ville', desc: 'Chaise longue ~1,62 m — terrasse / plage urbaine.' });
    ZS.registerDecorPrefab('spawn_urban_patio_umbrella', { build: _buildPatioUmbrella, label: 'Parasol terrasse', category: 'ville', desc: 'Parasol ~2,1 m — café / jardin.' });
    ZS.registerDecorPrefab('spawn_prop_upright_piano', { build: _buildUprightPiano, label: 'Piano droit', category: 'ville', desc: 'Piano ~1,22 m — salon / bar.' });
    ZS.registerDecorPrefab('spawn_urban_manhole', { build: _buildManhole, label: 'Regard égout', category: 'ville', desc: 'Plaque égout ~0,76 m — chaussée.' });
    ZS.registerDecorPrefab('spawn_prop_chest_freezer', { build: _buildChestFreezer, label: 'Congélateur coffre', category: 'ville', desc: 'Coffre congélation ~0,76 m — garage / épicerie.' });
    ZS.registerDecorPrefab('spawn_prop_kitchen_cabinet', { build: _buildKitchenCabinet, label: 'Meuble haut cuisine', category: 'ville', desc: 'Armoire murale ~0,72 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_indoor_trash', { build: _buildIndoorTrash, label: 'Poubelle intérieure', category: 'ville', desc: 'Poubelle bureau ~0,45 m.' });
    ZS.registerDecorPrefab('spawn_urban_speed_bump', { build: _buildSpeedBump, label: 'Dos d\'âne', category: 'ville', desc: 'Ralentisseur ~2,8 m — parking.' });
    ZS.registerDecorPrefab('spawn_urban_fence_post', { build: _buildFencePost, label: 'Poteau clôture', category: 'ville', desc: 'Poteau grillage ~1,45 m.' });
    ZS.registerDecorPrefab('spawn_urban_store_awning', { build: _buildStoreAwning, label: 'Auvent magasin', category: 'ville', desc: 'Marquise ~2,2 m — devanture −Z.' });
    ZS.registerDecorPrefab('spawn_prop_baby_crib', { build: _buildBabyCrib, label: 'Lit bébé', category: 'ville', desc: 'Berceau ~1,12 m — chambre enfant.' });
    ZS.registerDecorPrefab('spawn_prop_wheelchair', { build: _buildWheelchair, label: 'Fauteuil roulant', category: 'ville', desc: 'Fauteuil ~0,92 m — hôpital / refuge.' });
    ZS.registerDecorPrefab('spawn_prop_hospital_bed', { build: _buildHospitalBed, label: 'Lit d\'hôpital', category: 'ville', desc: 'Lit médical ~0,92 m — infirmerie.' });
    ZS.registerDecorPrefab('spawn_prop_gurney', { build: _buildGurney, label: 'Brancard', category: 'ville', desc: 'Brancard ~1,72 m — urgences.' });
    ZS.registerDecorPrefab('spawn_prop_slot_machine', { build: _buildSlotMachine, label: 'Machine à sous', category: 'ville', desc: 'Bandit manchot ~1,42 m — casino / bar.' });
    ZS.registerDecorPrefab('spawn_prop_arcade_cabinet', { build: _buildArcadeCabinet, label: 'Borne arcade', category: 'ville', desc: 'Arcade rétro ~1,52 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_desk_lamp', { build: _buildDeskLamp, label: 'Lampe de bureau', category: 'ville', desc: 'Lampe articulée ~0,38 m.' });
    ZS.registerDecorPrefab('spawn_prop_space_heater', { build: _buildSpaceHeater, label: 'Radiateur électrique', category: 'ville', desc: 'Chauffage d\'appoint ~0,42 m.' });
    ZS.registerDecorPrefab('spawn_urban_mail_drop_box', { build: _buildMailDropBox, label: 'Boîte dépôt courrier', category: 'ville', desc: 'Boîte murale ~0,52 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_urban_fire_hose_cabinet', { build: _buildFireHoseCabinet, label: 'Armoire incendie', category: 'ville', desc: 'RIA + tuyau ~0,72 m — couloir.' });
    ZS.registerDecorPrefab('spawn_prop_pool_table', { build: _buildPoolTable, label: 'Table de billard', category: 'ville', desc: 'Billard ~1,48 m — bar / salle de jeux.' });
    ZS.registerDecorPrefab('spawn_prop_treadmill', { build: _buildTreadmill, label: 'Tapis de course', category: 'ville', desc: 'Treadmill ~1,32 m — salle de sport.' });
    ZS.registerDecorPrefab('spawn_urban_bakery_rack', { build: _buildBakeryRack, label: 'Étagère boulangerie', category: 'ville', desc: 'Présentoir pains ~1,32 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_clothes_rack', { build: _buildClothesRack, label: 'Portant vêtements', category: 'ville', desc: 'Râtelier boutique ~1,42 m — magasin.' });
    ZS.registerDecorPrefab('spawn_prop_hair_dryer', { build: _buildHairDryer, label: 'Sèche-cheveux mural', category: 'ville', desc: 'Sèche-cheveux salon ~1,42 m — coiffure / SDB.' });
    ZS.registerDecorPrefab('spawn_urban_ev_charger', { build: _buildEvCharger, label: 'Borne recharge EV', category: 'ville', desc: 'Borne électrique ~0,62 m — parking.' });
    ZS.registerDecorPrefab('spawn_prop_exercise_bike', { build: _buildExerciseBike, label: 'Vélo d\'appartement', category: 'ville', desc: 'Home trainer ~0,92 m — salle de sport.' });
    ZS.registerDecorPrefab('spawn_prop_weight_bench', { build: _buildWeightBench, label: 'Banc de musculation', category: 'ville', desc: 'Bench + barre ~0,92 m — gym.' });
    ZS.registerDecorPrefab('spawn_prop_cash_register', { build: _buildCashRegister, label: 'Caisse enregistreuse', category: 'ville', desc: 'Caisse commerce ~0,32 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_display_fridge', { build: _buildDisplayFridge, label: 'Frigo vitrine', category: 'ville', desc: 'Vitrine réfrigérée ~1,82 m — épicerie.' });
    ZS.registerDecorPrefab('spawn_urban_recycling_dumpster', { build: _buildRecyclingDumpster, label: 'Benne tri sélectif', category: 'ville', desc: 'Container 2 flux ~1,55 m — cour.' });
    ZS.registerDecorPrefab('spawn_prop_dentist_chair', { build: _buildDentistChair, label: 'Fauteuil dentiste', category: 'ville', desc: 'Fauteuil médical ~0,92 m — cabinet.' });
    ZS.registerDecorPrefab('spawn_prop_iv_stand', { build: _buildIvStand, label: 'Pied à perfusion', category: 'ville', desc: 'Perfuseur ~1,62 m — infirmerie.' });
    ZS.registerDecorPrefab('spawn_prop_computer_tower', { build: _buildComputerTower, label: 'Tour PC', category: 'ville', desc: 'Unité centrale ~0,42 m — bureau.' });
    ZS.registerDecorPrefab('spawn_prop_whiteboard', { build: _buildWhiteboard, label: 'Tableau blanc', category: 'ville', desc: 'Tableau ~1,22 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_prop_cork_board', { build: _buildCorkBoard, label: 'Panneau liège', category: 'ville', desc: 'Tableau affichage ~0,82 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_urban_pay_phone', { build: _buildPayPhone, label: 'Téléphone public', category: 'ville', desc: 'Combiné mural ~0,52 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_urban_recycle_bin_dual', { build: _buildRecycleBinDual, label: 'Poubelle tri 2 flux', category: 'ville', desc: 'Bac vert/jaune ~0,52 m — intérieur.' });
    ZS.registerDecorPrefab('spawn_prop_book_stack', { build: _buildBookStack, label: 'Pile de livres', category: 'ville', desc: 'Livres empilés ~0,28 m — bureau / salon.' });
    ZS.registerDecorPrefab('spawn_prop_wall_tv', { build: _buildWallTv, label: 'TV murale', category: 'ville', desc: 'Écran plat ~1,12 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_urban_led_sign', { build: _buildLedSign, label: 'Panneau LED', category: 'ville', desc: 'Affichage lumineux ~2,6 m — rue.' });
    ZS.registerDecorPrefab('spawn_prop_grandfather_clock', { build: _buildGrandfatherClock, label: 'Horloge comtoise', category: 'ville', desc: 'Pendule ~1,92 m — salon.' });
    ZS.registerDecorPrefab('spawn_prop_kitchen_island', { build: _buildKitchenIsland, label: 'Îlot cuisine', category: 'ville', desc: 'Îlot central ~1,22 m — cuisine ouverte.' });
  }
}());
