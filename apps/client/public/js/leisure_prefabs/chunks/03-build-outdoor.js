// Sports extérieur + plage — extrait de leisure_prefabs.js (IIFE)
function _buildRouletteTable(root) {
    const felt = new THREE.MeshLambertMaterial({ color: 0x286838 });
    const wood = new THREE.MeshLambertMaterial({ color: 0x4a3020 });
    const wheel = new THREE.MeshLambertMaterial({ color: 0xc8a060 });
    _add(root, new THREE.BoxGeometry(1.42, 0.08, 0.82), felt, 0, 0.74, 0);
    _add(root, new THREE.BoxGeometry(1.48, 0.12, 0.88), wood, 0, 0.68, 0);
    for (const sx of [-0.58, 0.58]) {
      _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.68, 8), wood, sx, 0.34, 0.32);
      _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.68, 8), wood, sx, 0.34, -0.32);
    }
    _add(root, new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), wheel, 0.42, 0.82, 0);
    _add(root, new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12), new THREE.MeshLambertMaterial({ color: 0xe8e0d0 }), 0.42, 0.84, 0);
  }

  function _buildCrapsTable(root) {
    const felt = new THREE.MeshLambertMaterial({ color: 0x286838 });
    const rail = new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    _add(root, new THREE.BoxGeometry(1.82, 0.08, 0.92), felt, 0, 0.76, 0);
    _add(root, new THREE.BoxGeometry(1.88, 0.14, 0.98), rail, 0, 0.70, 0);
    for (const sx of [-0.72, 0.72]) {
      _add(root, new THREE.BoxGeometry(0.06, 0.72, 0.06), rail, sx, 0.36, 0.38);
      _add(root, new THREE.BoxGeometry(0.06, 0.72, 0.06), rail, sx, 0.36, -0.38);
    }
    for (let i = 0; i < 3; i++) {
      _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.04), new THREE.MeshLambertMaterial({ color: 0xf0ece0 }), -0.12 + i * 0.12, 0.82, 0.08);
    }
  }

  function _buildSkeeBall(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xc84828 });
    const ramp = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const hole = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    _add(root, new THREE.BoxGeometry(0.62, 0.92, 1.42), body, 0, 0.46, 0);
    _add(root, new THREE.BoxGeometry(0.48, 0.04, 1.22), ramp, 0, 0.52, -0.08, -0.35, 0, 0);
    _add(root, new THREE.BoxGeometry(0.42, 0.32, 0.04), ramp, 0, 0.78, -0.52, -0.55, 0, 0);
    for (const [x, y] of [[-0.12, 0.88], [0, 0.92], [0.12, 0.86]]) {
      _add(root, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), hole, x, y, -0.68);
    }
    _add(root, new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshLambertMaterial({ color: 0xf87828 }), 0.18, 0.58, 0.22);
  }

  function _buildBoardGame(root) {
    const M = _M();
    const top = M?.tableTop?.(0xc8a878) || new THREE.MeshLambertMaterial({ color: 0xc8a878 });
    const box = new THREE.MeshLambertMaterial({ color: 0x4868a8 });
    _add(root, new THREE.BoxGeometry(0.72, 0.05, 0.52), top, 0, 0.38, 0);
    for (const sx of [-0.28, 0.28]) {
      _add(root, new THREE.CylinderGeometry(0.03, 0.04, 0.38, 8), top, sx, 0.19, 0.18);
    }
    _add(root, new THREE.BoxGeometry(0.22, 0.06, 0.28), box, 0.22, 0.43, -0.12);
    for (const [x, z, c] of [[-0.08, 0.02, 0xc82828], [0.04, -0.04, 0x2868a8], [-0.14, -0.08, 0x286838]]) {
      _add(root, new THREE.CylinderGeometry(0.018, 0.02, 0.04, 8), new THREE.MeshLambertMaterial({ color: c }), x, 0.42, z);
    }
  }

  function _buildClimbingWall(root) {
    const panel = new THREE.MeshLambertMaterial({ color: 0x686878 });
    const hold = new THREE.MeshLambertMaterial({ color: 0xf87828 });
    const frame = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    _add(root, new THREE.BoxGeometry(1.82, 2.42, 0.12), panel, 0, 1.21, 0);
    for (const sx of [-0.78, 0.78]) {
      _add(root, new THREE.BoxGeometry(0.08, 2.52, 0.08), frame, sx, 1.26, -0.08);
    }
    const holdColors = [0xf87828, 0x48c878, 0x4888c8, 0xc84848, 0xf8c848];
    for (let i = 0; i < 12; i++) {
      _add(root, new THREE.SphereGeometry(0.04, 6, 6),
        new THREE.MeshLambertMaterial({ color: holdColors[i % 5] }), -0.52 + (i % 4) * 0.35, 0.42 + Math.floor(i / 4) * 0.55, -0.07);
    }
  }

  function _buildArcheryTarget(root) {
    const post = new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    const ringColors = [0xf0ece0, 0x2a2a2a, 0xc82828, 0x2868a8, 0xf8c828];
    _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8), post, 0, 0.04, 0);
    _add(root, new THREE.CylinderGeometry(0.03, 0.035, 1.22, 8), post, 0, 0.65, 0);
    for (let i = 0; i < 5; i++) {
      _add(root, new THREE.CylinderGeometry(0.32 - i * 0.06, 0.32 - i * 0.06, 0.04, 16),
        new THREE.MeshLambertMaterial({ color: ringColors[i] }), 0, 1.22, 0, Math.PI / 2, 0, 0);
    }
    _add(root, new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), new THREE.MeshLambertMaterial({ color: 0x8a7868 }), 0.08, 1.18, 0.12, 0.2, 0.3, 0);
  }

  function _buildSkiSet(root) {
    const ski = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    const pole = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const boot = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    for (const sx of [-0.08, 0.08]) {
      _add(root, new THREE.BoxGeometry(0.08, 0.03, 1.62), ski, sx, 0.08, 0, 0.05, sx < 0 ? 0.1 : -0.1, 0);
      _add(root, new THREE.BoxGeometry(0.12, 0.08, 0.22), boot, sx, 0.04, 0.42);
    }
    for (const sx of [-0.22, 0.22]) {
      _add(root, new THREE.CylinderGeometry(0.01, 0.01, 1.02, 6), pole, sx, 0.51, 0.18);
      _add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.04, 6), pole, sx, 1.02, 0.18);
    }
  }

  function _buildDumbbellRack(root) {
    const rack = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const weight = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    _add(root, new THREE.BoxGeometry(0.82, 0.06, 0.32), rack, 0, 0.38, 0);
    for (const sx of [-0.28, 0.28]) {
      _add(root, new THREE.BoxGeometry(0.06, 0.38, 0.06), rack, sx, 0.19, 0);
    }
    for (const [x, w] of [[-0.22, 0.14], [0, 0.1], [0.22, 0.16]]) {
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, w * 2, 8), weight, x, 0.42, 0, 0, 0, Math.PI / 2);
      _add(root, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), weight, x - w, 0.42, 0);
      _add(root, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), weight, x + w, 0.42, 0);
    }
  }

  function _buildBadmintonNet(root) {
    const post = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const net = new THREE.MeshLambertMaterial({ color: 0xf0f0e8, transparent: true, opacity: 0.65 });
    for (const sx of [-2.62, 2.62]) {
      _add(root, new THREE.CylinderGeometry(0.025, 0.03, 1.22, 8), post, sx, 0.61, 0);
    }
    _add(root, new THREE.BoxGeometry(5.28, 0.62, 0.02), net, 0, 0.92, 0);
    _add(root, new THREE.BoxGeometry(5.28, 0.04, 0.04), post, 0, 1.22, 0);
  }

  function _buildLacrosseSticks(root) {
    const stick = new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    const mesh = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    const ball = new THREE.MeshLambertMaterial({ color: 0xf8f8f0 });
    for (const sx of [-0.14, 0.14]) {
      _add(root, new THREE.CylinderGeometry(0.018, 0.018, 0.92, 6), stick, sx, 0.46, 0, 0.2, 0, sx < 0 ? 0.15 : -0.15);
      _add(root, new THREE.BoxGeometry(0.12, 0.14, 0.04), mesh, sx, 0.06, sx < 0 ? 0.1 : -0.1, 0.5, sx < 0 ? 0.3 : -0.3, 0);
    }
    _add(root, new THREE.SphereGeometry(0.035, 8, 8), ball, 0.28, 0.035, 0.18);
  }

  function _buildMicrophoneStand(root) {
    const base = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    const pole = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const mic = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    _add(root, new THREE.CylinderGeometry(0.14, 0.16, 0.04, 12), base, 0, 0.02, 0);
    _add(root, new THREE.CylinderGeometry(0.018, 0.018, 1.42, 8), pole, 0, 0.75, 0);
    _add(root, new THREE.CylinderGeometry(0.025, 0.03, 0.12, 8), mic, 0, 1.48, 0);
    _add(root, new THREE.SphereGeometry(0.035, 8, 8), mic, 0, 1.56, 0);
  }

  function _buildPortableBbq(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const leg = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const grate = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    _add(root, new THREE.BoxGeometry(0.42, 0.22, 0.28), body, 0, 0.52, 0);
    _add(root, new THREE.BoxGeometry(0.38, 0.02, 0.24), grate, 0, 0.64, 0);
    for (const [x, z] of [[-0.16, 0.1], [0.16, 0.1], [-0.16, -0.1], [0.16, -0.1]]) {
      _add(root, new THREE.CylinderGeometry(0.015, 0.015, 0.52, 6), leg, x, 0.26, z);
    }
    _add(root, new THREE.BoxGeometry(0.32, 0.04, 0.02), body, 0, 0.58, -0.14);
  }

  function _buildPicnicBasket(root) {
    const wicker = new THREE.MeshLambertMaterial({ color: 0xc8a878 });
    const cloth = new THREE.MeshLambertMaterial({ color: 0x4868a8 });
    _add(root, new THREE.BoxGeometry(0.38, 0.22, 0.28), wicker, 0, 0.11, 0);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 6, 12, Math.PI), wicker);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 0.28, 0);
    handle.castShadow = true;
    root.add(handle);
    _add(root, new THREE.BoxGeometry(0.28, 0.02, 0.22), cloth, 0, 0.24, 0);
    _add(root, new THREE.BoxGeometry(0.08, 0.06, 0.06), new THREE.MeshLambertMaterial({ color: 0xc84848 }), 0.08, 0.26, 0.04);
  }

  function _buildTelescope(root) {
    const tripod = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const tube = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    for (let a = 0; a < 3; a++) {
      const ang = a * Math.PI * 2 / 3;
      _add(root, new THREE.CylinderGeometry(0.015, 0.015, 0.82, 6), tripod, Math.cos(ang) * 0.22, 0.41, Math.sin(ang) * 0.22);
    }
    _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.32, 10), tube, 0, 0.88, 0, 0.6, 0.2, 0);
    _add(root, new THREE.CylinderGeometry(0.06, 0.04, 0.42, 10), tube, 0.22, 1.02, -0.08, 0.55, 0.15, 0);
  }

  function _buildSeesaw(root) {
    const plank = new THREE.MeshLambertMaterial({ color: 0xc84828 });
    const post = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const handle = new THREE.MeshLambertMaterial({ color: 0xf0f0e8 });
    _add(root, new THREE.CylinderGeometry(0.06, 0.08, 0.12, 10), post, 0, 0.06, 0);
    _add(root, new THREE.CylinderGeometry(0.04, 0.045, 0.42, 8), post, 0, 0.32, 0);
    _add(root, new THREE.BoxGeometry(2.42, 0.06, 0.22), plank, 0, 0.48, 0, 0, 0, 0.12);
    for (const sx of [-0.98, 0.98]) {
      _add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), handle, sx, 0.58, 0);
    }
  }

  function _buildSpinningPlayground(root) {
    const pole = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const disk = new THREE.MeshLambertMaterial({ color: 0x4868a8 });
    const rail = new THREE.MeshLambertMaterial({ color: 0xc84828 });
    _add(root, new THREE.CylinderGeometry(0.06, 0.08, 0.08, 10), pole, 0, 0.04, 0);
    _add(root, new THREE.CylinderGeometry(0.045, 0.05, 0.92, 10), pole, 0, 0.5, 0);
    _add(root, new THREE.CylinderGeometry(0.72, 0.72, 0.06, 20), disk, 0, 0.12, 0);
    _add(root, new THREE.TorusGeometry(0.72, 0.03, 8, 24), rail, 0, 0.18, 0, Math.PI / 2, 0, 0);
    for (let a = 0; a < 4; a++) {
      const ang = a * Math.PI / 2;
      _add(root, new THREE.BoxGeometry(0.04, 0.42, 0.04), rail, Math.cos(ang) * 0.62, 0.34, Math.sin(ang) * 0.62);
    }
  }

  function _buildCampTable(root) {
    const top = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const leg = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    _add(root, new THREE.BoxGeometry(0.92, 0.04, 0.52), top, 0, 0.52, 0);
    for (const [x, z] of [[-0.38, 0.2], [0.38, 0.2], [-0.38, -0.2], [0.38, -0.2]]) {
      _add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.52, 6), leg, x, 0.26, z);
    }
    _add(root, new THREE.BoxGeometry(0.18, 0.04, 0.12), new THREE.MeshLambertMaterial({ color: 0x4868a8 }), 0.22, 0.56, 0);
  }

  function _buildSleepingPad(root) {
    const pad = new THREE.MeshLambertMaterial({ color: 0x486878 });
    const strap = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    _add(root, new THREE.CylinderGeometry(0.14, 0.16, 0.62, 12), pad, 0, 0.14, 0, 0, 0, Math.PI / 2);
    _add(root, new THREE.BoxGeometry(0.04, 0.08, 0.18), strap, 0, 0.14, 0);
    _add(root, new THREE.BoxGeometry(0.22, 0.02, 0.14), pad, 0.12, 0.02, 0.08, 0, 0.4, 0);
  }

  function _buildBinocularsTripod(root) {
    const tripod = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const binoc = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    for (let a = 0; a < 3; a++) {
      const ang = a * Math.PI * 2 / 3 + Math.PI / 6;
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.72, 6), tripod, Math.cos(ang) * 0.18, 0.36, Math.sin(ang) * 0.18);
    }
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.12, 10), binoc, -0.05, 0.78, 0, 0, 0, Math.PI / 2);
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.12, 10), binoc, 0.05, 0.78, 0, 0, 0, Math.PI / 2);
    _add(root, new THREE.BoxGeometry(0.08, 0.04, 0.06), binoc, 0, 0.74, 0);
  }

  function _buildUkuleleStand(root) {
    const wood = new THREE.MeshLambertMaterial({ color: 0xc8a060 });
    const stand = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    _add(root, new THREE.BoxGeometry(0.18, 0.02, 0.14), stand, 0, 0.01, 0);
    _add(root, new THREE.CylinderGeometry(0.01, 0.01, 0.38, 6), stand, 0, 0.2, 0);
    _add(root, new THREE.BoxGeometry(0.16, 0.06, 0.04), wood, 0, 0.42, 0, 0.2, 0, 0);
    _add(root, new THREE.SphereGeometry(0.08, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), wood, 0, 0.34, 0.02);
    _add(root, new THREE.CylinderGeometry(0.02, 0.025, 0.14, 6), wood, 0, 0.48, -0.02);
  }

  function _buildRingToss(root) {
    const post = new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    const ring = new THREE.MeshLambertMaterial({ color: 0xc84828 });
    _add(root, new THREE.CylinderGeometry(0.03, 0.04, 0.08, 8), post, 0, 0.04, 0);
    _add(root, new THREE.CylinderGeometry(0.018, 0.02, 0.52, 8), post, 0, 0.3, 0);
    for (const [x, z, c] of [[-0.18, 0.12, 0x2868a8], [0.14, -0.08, 0x286838], [0.08, 0.18, 0xf8c828]]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12), new THREE.MeshLambertMaterial({ color: c }));
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(x, 0.04, z);
      hoop.castShadow = true;
      root.add(hoop);
    }
    const top = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 10), ring);
    top.rotation.x = Math.PI / 2;
    top.position.set(0, 0.58, 0);
    top.castShadow = true;
    root.add(top);
  }

  function _buildLawnDarts(root) {
    const grass = new THREE.MeshLambertMaterial({ color: 0x486838 });
    const target = new THREE.MeshLambertMaterial({ color: 0xf8c828 });
    const dart = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    _add(root, new THREE.CylinderGeometry(0.22, 0.24, 0.02, 16), grass, 0, 0.01, 0);
    _add(root, new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12), target, 0, 0.03, 0);
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10), new THREE.MeshLambertMaterial({ color: 0xc82828 }), 0, 0.04, 0);
    for (const [x, z] of [[0.28, 0.18], [-0.22, -0.14]]) {
      _add(root, new THREE.CylinderGeometry(0.012, 0.02, 0.18, 6), dart, x, 0.09, z, 0.5, 0.2, 0.3);
      _add(root, new THREE.CylinderGeometry(0.03, 0.02, 0.04, 6), dart, x, 0.02, z);
    }
  }

  function _buildKubbSet(root) {
    const wood = new THREE.MeshLambertMaterial({ color: 0xc8a878 });
    for (let i = 0; i < 5; i++) {
      _add(root, new THREE.BoxGeometry(0.05, 0.18, 0.05), wood, -0.16 + i * 0.08, 0.09, 0.12);
      _add(root, new THREE.BoxGeometry(0.05, 0.18, 0.05), wood, -0.16 + i * 0.08, 0.09, -0.12);
    }
    _add(root, new THREE.BoxGeometry(0.08, 0.32, 0.08), wood, 0, 0.16, 0.28);
    _add(root, new THREE.BoxGeometry(0.08, 0.32, 0.08), wood, 0, 0.16, -0.28);
    for (let i = 0; i < 3; i++) {
      _add(root, new THREE.CylinderGeometry(0.018, 0.02, 0.22, 6), wood, 0.22 + i * 0.06, 0.11, 0.04, 0.2, 0, 0);
    }
  }

  function _buildMarblesCircle(root) {
    const sand = new THREE.MeshLambertMaterial({ color: 0xd8c8a0 });
    const colors = [0xc82828, 0x2868a8, 0x286838, 0xf8c828, 0x2a2a2a, 0xf0ece0];
    _add(root, new THREE.CylinderGeometry(0.28, 0.3, 0.02, 16), sand, 0, 0.01, 0);
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3;
      _add(root, new THREE.SphereGeometry(0.018, 8, 8), new THREE.MeshLambertMaterial({ color: colors[i] }),
        Math.cos(ang) * 0.14, 0.02, Math.sin(ang) * 0.14);
    }
    _add(root, new THREE.SphereGeometry(0.028, 8, 8), new THREE.MeshLambertMaterial({ color: 0x8848c8 }), 0, 0.028, 0);
  }

  function _buildDiscGolfBasket(root) {
    const pole = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const chain = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    const basket = new THREE.MeshLambertMaterial({ color: 0xc84828 });
    _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8), pole, 0, 0.04, 0);
    _add(root, new THREE.CylinderGeometry(0.025, 0.03, 1.22, 8), pole, 0, 0.65, 0);
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      _add(root, new THREE.CylinderGeometry(0.004, 0.004, 0.32, 4), chain, Math.cos(ang) * 0.14, 1.08, Math.sin(ang) * 0.14);
    }
    _add(root, new THREE.CylinderGeometry(0.22, 0.18, 0.32, 12, 1, true), basket, 0, 1.02, 0);
    _add(root, new THREE.CylinderGeometry(0.24, 0.24, 0.04, 12), basket, 0, 1.2, 0);
    _add(root, new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12), new THREE.MeshLambertMaterial({ color: 0xf87828 }), 0.32, 0.015, 0.22);
  }

  function _buildYogaMat(root) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x6848a8 });
    const strap = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    _add(root, new THREE.CylinderGeometry(0.12, 0.14, 0.58, 12), mat, 0, 0.12, 0, 0, 0, Math.PI / 2);
    _add(root, new THREE.BoxGeometry(0.04, 0.06, 0.16), strap, 0, 0.12, 0);
    _add(root, new THREE.BoxGeometry(0.52, 0.012, 0.18), mat, 0.18, 0.006, 0.08, 0, 0.15, 0);
  }

  function _buildPullUpBar(root) {
    const post = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const bar = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    for (const sx of [-0.62, 0.62]) {
      _add(root, new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8), post, sx, 0.04, 0);
      _add(root, new THREE.CylinderGeometry(0.04, 0.045, 2.12, 8), post, sx, 1.1, 0);
    }
    _add(root, new THREE.CylinderGeometry(0.035, 0.035, 1.32, 10), bar, 0, 2.02, 0, 0, 0, Math.PI / 2);
  }

  function _buildBoxingGloves(root) {
    const hook = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const glove = new THREE.MeshLambertMaterial({ color: 0x8a2828 });
    _add(root, new THREE.BoxGeometry(0.32, 0.04, 0.08), hook, 0, 1.42, -0.04);
    for (const sx of [-0.1, 0.1]) {
      _add(root, new THREE.BoxGeometry(0.02, 0.12, 0.02), hook, sx, 1.28, -0.04);
      _add(root, new THREE.BoxGeometry(0.1, 0.12, 0.14), glove, sx, 1.14, 0.02);
      _add(root, new THREE.BoxGeometry(0.08, 0.08, 0.1), glove, sx, 1.04, 0.06);
    }
  }

  function _buildCurlingStones(root) {
    const stone = new THREE.MeshLambertMaterial({ color: 0x686878 });
    const handle = new THREE.MeshLambertMaterial({ color: 0xc84828 });
    for (const [x, z] of [[0, 0], [-0.22, 0.14], [0.18, -0.12]]) {
      _add(root, new THREE.CylinderGeometry(0.1, 0.12, 0.1, 12), stone, x, 0.05, z);
      _add(root, new THREE.TorusGeometry(0.05, 0.012, 6, 10), handle, x, 0.12, z, Math.PI / 2, 0, 0);
    }
  }

  function _buildFootballPad(root) {
    const pad = new THREE.MeshLambertMaterial({ color: 0x4868a8 });
    const base = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    _add(root, new THREE.BoxGeometry(0.52, 0.12, 0.82), pad, 0, 0.52, 0, -0.15, 0, 0);
    _add(root, new THREE.BoxGeometry(0.42, 0.08, 0.12), base, 0, 0.04, 0.28);
    _add(root, new THREE.BoxGeometry(0.08, 0.48, 0.08), base, -0.18, 0.24, 0.28);
    _add(root, new THREE.BoxGeometry(0.08, 0.48, 0.08), base, 0.18, 0.24, 0.28);
  }

  function _buildBeachChair(root) {
    const fabric = new THREE.MeshLambertMaterial({ color: 0x48a8c8 });
    const frame = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.48, 0.04, 0.42), fabric, 0, 0.22, 0);
    _add(root, new THREE.BoxGeometry(0.48, 0.52, 0.04), fabric, 0, 0.48, -0.16, -0.45, 0, 0);
    for (const sx of [-0.2, 0.2]) {
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), frame, sx, 0.21, 0.18, -0.5, 0, 0);
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.28, 6), frame, sx, 0.38, -0.08, -0.35, 0, 0);
    }
  }

  function _buildBeachUmbrella(root) {
    const pole = new THREE.MeshLambertMaterial({ color: 0xf0f0e8 });
    const canopy = new THREE.MeshLambertMaterial({ color: 0xf87828 });
    const sand = new THREE.MeshLambertMaterial({ color: 0xd8c8a0 });
    _add(root, new THREE.CylinderGeometry(0.18, 0.22, 0.08, 10), sand, 0, 0.04, 0);
    _add(root, new THREE.CylinderGeometry(0.025, 0.03, 1.82, 8), pole, 0, 0.95, 0);
    _add(root, new THREE.ConeGeometry(0.92, 0.32, 8), canopy, 0, 1.88, 0);
    _add(root, new THREE.BoxGeometry(0.42, 0.04, 0.32), new THREE.MeshLambertMaterial({ color: 0x48a8c8 }), 0, 0.08, 0.12);
  }

  function _buildLifeRing(root) {
    const post = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const ring = new THREE.MeshLambertMaterial({ color: 0xc84828 });
    const white = new THREE.MeshLambertMaterial({ color: 0xf0f0e8 });
    _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8), post, 0, 0.04, 0);
    _add(root, new THREE.CylinderGeometry(0.03, 0.035, 1.02, 8), post, 0, 0.55, 0);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 16), ring);
    torus.rotation.y = Math.PI / 2;
    torus.position.set(0, 0.82, 0);
    torus.castShadow = true;
    root.add(torus);
    _add(root, new THREE.BoxGeometry(0.32, 0.06, 0.04), white, 0, 0.82, 0.24);
  }

  function _buildPaddleBoard(root) {
    const board = new THREE.MeshLambertMaterial({ color: 0x88d8e8 });
    const paddle = new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    _add(root, new THREE.BoxGeometry(0.52, 0.06, 1.82), board, 0, 0.12, 0, 0, 0.05, 0);
    _add(root, new THREE.CylinderGeometry(0.012, 0.012, 1.62, 6), paddle, 0.18, 0.42, 0.32, 0.15, 0.25, 0);
    _add(root, new THREE.BoxGeometry(0.18, 0.04, 0.08), paddle, 0.28, 0.82, 0.48, 0.2, 0.3, 0);
  }

  function _buildSnorkelSet(root) {
    const mask = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    const fin = new THREE.MeshLambertMaterial({ color: 0x484848 });
    const tube = new THREE.MeshLambertMaterial({ color: 0xc84828 });
    _add(root, new THREE.BoxGeometry(0.18, 0.08, 0.12), mask, 0, 0.04, 0);
    _add(root, new THREE.BoxGeometry(0.14, 0.04, 0.02), new THREE.MeshLambertMaterial({ color: 0x88c8e8, transparent: true, opacity: 0.5 }), 0, 0.06, -0.06);
    _add(root, new THREE.BoxGeometry(0.22, 0.04, 0.08), fin, 0.22, 0.02, 0.08, 0, 0.2, 0);
    _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.28, 6), tube, -0.12, 0.18, 0.04);
  }

  function _buildCampCot(root) {
    const fabric = new THREE.MeshLambertMaterial({ color: 0x486878 });
    const frame = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.62, 0.04, 1.82), fabric, 0, 0.32, 0);
    for (const [x, z] of [[-0.26, 0.78], [0.26, 0.78], [-0.26, -0.78], [0.26, -0.78]]) {
      _add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.32, 6), frame, x, 0.16, z);
      _add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.32, 6), frame, x, 0.48, z);
    }
    _add(root, new THREE.BoxGeometry(0.58, 0.02, 1.78), fabric, 0, 0.34, 0);
  }

  function _buildFirePit(root) {
    const stone = new THREE.MeshLambertMaterial({ color: 0x686868 });
    const ash = new THREE.MeshLambertMaterial({ color: 0x3a3838 });
    const log = new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      _add(root, new THREE.BoxGeometry(0.18, 0.14, 0.12), stone, Math.cos(ang) * 0.32, 0.07, Math.sin(ang) * 0.32, 0, ang, 0);
    }
    _add(root, new THREE.CylinderGeometry(0.22, 0.24, 0.04, 12), ash, 0, 0.02, 0);
    for (const r of [0, Math.PI / 2]) {
      _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.42, 8), log, 0, 0.12, 0, 0.2, r, 0);
    }
    const ember = new THREE.PointLight(0xff8840, 0.5, 4, 1.6);
    ember.position.set(0, 0.18, 0);
    root.add(ember);
  }
