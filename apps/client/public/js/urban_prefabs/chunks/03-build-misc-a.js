// Divers urbain A — extrait de urban_prefabs.js (IIFE)
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
