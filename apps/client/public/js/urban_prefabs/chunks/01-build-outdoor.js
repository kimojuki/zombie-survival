// Props rue / extérieur — extrait de urban_prefabs.js (IIFE)
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
