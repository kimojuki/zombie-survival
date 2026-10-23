// Mobilier intérieur — extrait de urban_prefabs.js (IIFE)
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
