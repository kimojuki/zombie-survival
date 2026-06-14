// Divers urbain D — extrait de urban_prefabs.js (IIFE)
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
