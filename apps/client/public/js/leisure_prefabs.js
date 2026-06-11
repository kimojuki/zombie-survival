// Prefabs sport, jeux et loisirs — catalogue RCON (salles de jeux, gyms, parcs, campings).
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

  function _buildDartboard(root) {
    const board = new THREE.MeshLambertMaterial({ color: 0x3a2820 });
    const ring = new THREE.MeshLambertMaterial({ color: 0xe8e0d0 });
    const red = new THREE.MeshLambertMaterial({ color: 0xb82828 });
    _add(root, new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16), board, 0, 1.42, 0, Math.PI / 2, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.20, 0.20, 0.012, 16), ring, 0, 1.44, -0.02, Math.PI / 2, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.014, 12), red, 0, 1.44, -0.025, Math.PI / 2, 0, 0);
    for (let i = 0; i < 3; i++) {
      _add(root, new THREE.CylinderGeometry(0.004, 0.004, 0.18, 4),
        new THREE.MeshLambertMaterial({ color: 0x9a9890 }), 0.06 + i * 0.04, 1.22, -0.08, 0.4, 0, 0.2);
    }
  }

  function _buildFoosball(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x286838 });
    const leg = new THREE.MeshLambertMaterial({ color: 0x4a4038 });
    const player = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    _add(root, new THREE.BoxGeometry(1.22, 0.12, 0.62), body, 0, 0.72, 0);
    _add(root, new THREE.BoxGeometry(1.12, 0.04, 0.52), new THREE.MeshLambertMaterial({ color: 0x3a6848 }), 0, 0.80, 0);
    for (const sx of [-0.48, 0.48]) {
      _add(root, new THREE.BoxGeometry(0.06, 0.72, 0.06), leg, sx, 0.36, 0.22);
      _add(root, new THREE.BoxGeometry(0.06, 0.72, 0.06), leg, sx, 0.36, -0.22);
    }
    for (const z of [-0.18, 0, 0.18]) {
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, 1.05, 6), leg, 0, 0.78, z, 0, 0, Math.PI / 2);
    }
    for (let i = 0; i < 4; i++) {
      _add(root, new THREE.BoxGeometry(0.04, 0.08, 0.03), player, -0.42 + i * 0.28, 0.86, -0.12);
      _add(root, new THREE.BoxGeometry(0.04, 0.08, 0.03), player, -0.42 + i * 0.28, 0.86, 0.12);
    }
  }

  function _buildPingPong(root) {
    const top = new THREE.MeshLambertMaterial({ color: 0x286878 });
    const leg = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const net = new THREE.MeshLambertMaterial({ color: 0xf0f0e8 });
    _add(root, new THREE.BoxGeometry(1.52, 0.04, 0.82), top, 0, 0.76, 0);
    for (const [x, z] of [[-0.62, 0.32], [0.62, 0.32], [-0.62, -0.32], [0.62, -0.32]]) {
      _add(root, new THREE.BoxGeometry(0.05, 0.76, 0.05), leg, x, 0.38, z);
    }
    _add(root, new THREE.BoxGeometry(0.02, 0.14, 0.78), net, 0, 0.84, 0);
    for (const sx of [-0.08, 0.08]) {
      _add(root, new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshLambertMaterial({ color: 0xf8f8f0 }), sx, 0.82, 0.22);
    }
  }

  function _buildChessTable(root) {
    const M = _M();
    const wood = M?.woodFine?.(0x6a5038) || new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    const light = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x4a3828 });
    _add(root, new THREE.BoxGeometry(0.62, 0.06, 0.62), wood, 0, 0.72, 0);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        _add(root, new THREE.BoxGeometry(0.07, 0.008, 0.07),
          (i + j) % 2 ? light : dark, -0.105 + i * 0.07, 0.76, -0.105 + j * 0.07);
      }
    }
    for (const sx of [-0.22, 0.22]) {
      _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.72, 8), wood, sx, 0.36, sx);
    }
    _add(root, new THREE.CylinderGeometry(0.03, 0.04, 0.08, 8), light, 0.08, 0.78, 0.08);
    _add(root, new THREE.CylinderGeometry(0.03, 0.04, 0.08, 8), dark, -0.08, 0.78, -0.08);
  }

  function _buildPokerTable(root) {
    const felt = new THREE.MeshLambertMaterial({ color: 0x286838 });
    const rail = new THREE.MeshLambertMaterial({ color: 0x4a3020 });
    const leg = new THREE.MeshLambertMaterial({ color: 0x3a2820 });
    _add(root, new THREE.CylinderGeometry(0.52, 0.55, 0.08, 16), felt, 0, 0.74, 0);
    _add(root, new THREE.TorusGeometry(0.54, 0.05, 8, 24), rail, 0, 0.78, 0, Math.PI / 2, 0, 0);
    for (let a = 0; a < 4; a++) {
      const ang = a * Math.PI / 2;
      _add(root, new THREE.CylinderGeometry(0.05, 0.06, 0.74, 8), leg, Math.cos(ang) * 0.32, 0.37, Math.sin(ang) * 0.32);
    }
    for (let i = 0; i < 5; i++) {
      _add(root, new THREE.BoxGeometry(0.03, 0.002, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xf0ece0 }), -0.12 + i * 0.06, 0.80, 0.04);
    }
  }

  function _buildJengaTower(root) {
    const wood = new THREE.MeshLambertMaterial({ color: 0xc8a878 });
    for (let layer = 0; layer < 8; layer++) {
      const rot = layer % 2 === 0;
      for (let i = 0; i < 3; i++) {
        const x = rot ? -0.08 + i * 0.08 : 0;
        const z = rot ? 0 : -0.08 + i * 0.08;
        _add(root, new THREE.BoxGeometry(rot ? 0.22 : 0.06, 0.025, rot ? 0.06 : 0.22),
          wood, x, 0.02 + layer * 0.028, z);
      }
    }
  }

  function _buildPinball(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xb82828 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x88c8e8, transparent: true, opacity: 0.35 });
    const legs = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.52, 0.92, 1.02), body, 0, 0.46, 0);
    _add(root, new THREE.BoxGeometry(0.46, 0.72, 0.012), glass, 0, 0.58, -0.51);
    _add(root, new THREE.BoxGeometry(0.38, 0.12, 0.04), new THREE.MeshLambertMaterial({ color: 0x1a2838 }), 0, 0.88, -0.48, -0.55, 0, 0);
    for (const sx of [-0.18, 0.18]) {
      _add(root, new THREE.BoxGeometry(0.04, 0.12, 0.04), legs, sx, 0.06, 0.38);
      _add(root, new THREE.BoxGeometry(0.04, 0.12, 0.04), legs, sx, 0.06, -0.38);
    }
    _add(root, new THREE.SphereGeometry(0.018, 8, 8), new THREE.MeshLambertMaterial({ color: 0xe8e8e0 }), 0.12, 0.42, -0.2);
  }

  function _buildBasketballHoop(root) {
    const pole = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const board = new THREE.MeshLambertMaterial({ color: 0xe8ece8 });
    const rim = new THREE.MeshLambertMaterial({ color: 0xc84828 });
    const net = new THREE.MeshLambertMaterial({ color: 0xf0f0e8 });
    _add(root, new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8), pole, 0, 0.04, 0);
    _add(root, new THREE.CylinderGeometry(0.035, 0.04, 2.82, 8), pole, 0, 1.45, 0);
    _add(root, new THREE.BoxGeometry(0.72, 0.48, 0.04), board, 0, 2.72, -0.12);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.012, 6, 16), rim);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set(0, 2.52, -0.14);
    hoop.castShadow = true;
    root.add(hoop);
    _add(root, new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10, 1, true), net, 0, 2.44, -0.14);
  }

  function _buildSoccerGoal(root) {
    const post = new THREE.MeshLambertMaterial({ color: 0xf0f0e8 });
    const net = new THREE.MeshLambertMaterial({ color: 0xe8ece8, transparent: true, opacity: 0.55 });
    for (const sx of [-1.1, 1.1]) {
      _add(root, new THREE.CylinderGeometry(0.035, 0.04, 1.22, 8), post, sx, 0.61, 0);
    }
    _add(root, new THREE.CylinderGeometry(0.035, 0.04, 2.22, 8), post, 0, 1.22, 0, 0, 0, Math.PI / 2);
    _add(root, new THREE.BoxGeometry(2.22, 1.12, 0.02), net, 0, 0.58, -0.02);
    _add(root, new THREE.SphereGeometry(0.09, 10, 10), new THREE.MeshLambertMaterial({ color: 0xf8f8f0 }), 0.42, 0.09, 0.38);
  }

  function _buildPunchingBag(root) {
    const chain = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const bag = new THREE.MeshLambertMaterial({ color: 0x8a2828 });
    const base = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    _add(root, new THREE.CylinderGeometry(0.22, 0.28, 0.12, 10), base, 0, 0.06, 0);
    _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6), chain, 0, 0.92, 0);
    _add(root, new THREE.CylinderGeometry(0.18, 0.22, 0.92, 12), bag, 0, 0.48, 0);
    _add(root, new THREE.SphereGeometry(0.14, 10, 8), bag, 0, 0.02, 0);
  }

  function _buildTennisNet(root) {
    const post = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const net = new THREE.MeshLambertMaterial({ color: 0xf0f0e8 });
    const band = new THREE.MeshLambertMaterial({ color: 0xf8f8f0 });
    for (const sx of [-5.2, 5.2]) {
      _add(root, new THREE.CylinderGeometry(0.03, 0.035, 0.92, 8), post, sx, 0.46, 0);
    }
    _add(root, new THREE.BoxGeometry(10.42, 0.82, 0.02), net, 0, 0.52, 0);
    _add(root, new THREE.BoxGeometry(10.42, 0.06, 0.04), band, 0, 0.92, 0);
  }

  function _buildGolfBag(root) {
    const bag = new THREE.MeshLambertMaterial({ color: 0x286848 });
    const club = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.CylinderGeometry(0.14, 0.18, 0.82, 10), bag, 0, 0.41, 0);
    _add(root, new THREE.CylinderGeometry(0.16, 0.16, 0.04, 10), bag, 0, 0.84, 0);
    for (let i = 0; i < 4; i++) {
      _add(root, new THREE.CylinderGeometry(0.008, 0.008, 0.72, 6), club, -0.06 + i * 0.04, 0.78, 0, 0.15 + i * 0.08, 0, 0);
    }
    _add(root, new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshLambertMaterial({ color: 0xf8f8f0 }), 0.28, 0.025, 0.18);
  }

  function _buildSkateboard(root) {
    const deck = new THREE.MeshLambertMaterial({ color: 0x4a5068 });
    const wheel = new THREE.MeshLambertMaterial({ color: 0xf0f0e8 });
    _add(root, new THREE.BoxGeometry(0.72, 0.04, 0.18), deck, 0, 0.08, 0, 0, 0.12, 0);
    for (const [x, z] of [[-0.26, 0.06], [0.26, 0.06], [-0.26, -0.06], [0.26, -0.06]]) {
      _add(root, new THREE.CylinderGeometry(0.028, 0.028, 0.04, 10), wheel, x, 0.04, z, 0, 0, Math.PI / 2);
    }
  }

  function _buildSurfboard(root) {
    const foam = new THREE.MeshLambertMaterial({ color: 0x88c8d8 });
    const fin = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    _add(root, new THREE.BoxGeometry(0.48, 0.05, 1.72), foam, 0, 0.12, 0, 0, 0.08, 0);
    _add(root, new THREE.BoxGeometry(0.08, 0.12, 0.02), fin, 0, 0.08, -0.72);
    _add(root, new THREE.BoxGeometry(0.22, 0.04, 0.18), foam, 0, 0.16, 0.42, -0.2, 0, 0);
  }

  function _buildFishingRod(root) {
    const pole = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    const reel = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    const stand = new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    _add(root, new THREE.BoxGeometry(0.08, 0.04, 0.32), stand, 0, 0.02, 0);
    _add(root, new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), stand, 0, 0.24, 0);
    _add(root, new THREE.CylinderGeometry(0.006, 0.012, 1.42, 6), pole, 0, 0.72, 0.08, 0.35, 0.2, 0);
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8), reel, 0, 0.52, 0.06);
    _add(root, new THREE.BoxGeometry(0.18, 0.04, 0.12), new THREE.MeshLambertMaterial({ color: 0x4a6848 }), 0.12, 0.02, 0.08);
  }

  function _buildCampingTent(root) {
    const fabric = new THREE.MeshLambertMaterial({ color: 0x486878 });
    const pole = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.ConeGeometry(0.92, 1.12, 4), fabric, 0, 0.56, 0, 0, Math.PI / 4, 0);
    _add(root, new THREE.BoxGeometry(1.42, 0.02, 1.42), fabric, 0, 0.02, 0);
    for (const [x, z] of [[-0.52, 0.52], [0.52, 0.52], [-0.52, -0.52], [0.52, -0.52]]) {
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), pole, x, 0.21, z);
    }
    _add(root, new THREE.BoxGeometry(0.32, 0.48, 0.02), new THREE.MeshLambertMaterial({ color: 0x2a3848 }), 0, 0.28, -0.42);
  }

  function _buildHammock(root) {
    const rope = new THREE.MeshLambertMaterial({ color: 0xc8a878 });
    const cloth = new THREE.MeshLambertMaterial({ color: 0x4a7868 });
    const post = new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    for (const sx of [-1.42, 1.42]) {
      _add(root, new THREE.CylinderGeometry(0.06, 0.08, 0.08, 8), post, sx, 0.04, 0);
      _add(root, new THREE.CylinderGeometry(0.05, 0.055, 1.62, 8), post, sx, 0.85, 0);
    }
    _add(root, new THREE.BoxGeometry(2.62, 0.04, 0.72), cloth, 0, 0.92, 0, 0.08, 0, 0);
    for (const sx of [-1.2, 1.2]) {
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6), rope, sx, 1.22, 0, 0.35, 0, sx < 0 ? 0.3 : -0.3);
    }
  }

  function _buildAcousticGuitar(root) {
    const wood = new THREE.MeshLambertMaterial({ color: 0xc8a060 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x4a3020 });
    const stand = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    _add(root, new THREE.BoxGeometry(0.22, 0.02, 0.18), stand, 0, 0.01, 0);
    _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), stand, 0, 0.22, 0);
    _add(root, new THREE.BoxGeometry(0.28, 0.08, 0.04), wood, 0, 0.48, 0, 0.25, 0, 0);
    _add(root, new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), wood, 0, 0.38, 0.02);
    _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.22, 8), dark, 0, 0.58, -0.02);
  }

  function _buildPlaygroundSlide(root) {
    const metal = new THREE.MeshLambertMaterial({ color: 0xc84828 });
    const rail = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const platform = new THREE.MeshLambertMaterial({ color: 0x4868a8 });
    for (const [x, z] of [[-0.42, 0.28], [0.42, 0.28], [-0.42, -0.28], [0.42, -0.28]]) {
      _add(root, new THREE.CylinderGeometry(0.04, 0.04, 1.82, 8), rail, x, 0.91, z);
    }
    _add(root, new THREE.BoxGeometry(0.92, 0.06, 0.62), platform, 0, 1.82, 0);
    _add(root, new THREE.BoxGeometry(0.52, 0.04, 1.42), metal, 0.28, 1.12, 0, 0, 0, -0.55);
    _add(root, new THREE.BoxGeometry(0.08, 0.72, 0.04), rail, -0.38, 1.48, 0);
    _add(root, new THREE.BoxGeometry(0.08, 0.72, 0.04), rail, 0.38, 1.48, 0);
  }

  function _buildBowlingPins(root) {
    const pin = new THREE.MeshLambertMaterial({ color: 0xf0ece0 });
    const stripe = new THREE.MeshLambertMaterial({ color: 0xc82828 });
    const ball = new THREE.MeshLambertMaterial({ color: 0x284868 });
    const positions = [[0, 0.32], [-0.12, 0.18], [0.12, 0.18], [-0.24, 0.04], [0, 0.04], [0.24, 0.04], [-0.12, -0.1], [0.12, -0.1], [0, -0.24], [-0.24, -0.24]];
    for (const [x, z] of positions) {
      _add(root, new THREE.CylinderGeometry(0.035, 0.055, 0.22, 8), pin, x, 0.11, z);
      _add(root, new THREE.CylinderGeometry(0.038, 0.038, 0.03, 8), stripe, x, 0.14, z);
    }
    _add(root, new THREE.SphereGeometry(0.1, 12, 12), ball, 0.42, 0.1, 0.42);
  }

  function _buildPetanqueSet(root) {
    const steel = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const jack = new THREE.MeshLambertMaterial({ color: 0xf0ece0 });
    for (let i = 0; i < 6; i++) {
      const ang = i * 1.05;
      _add(root, new THREE.SphereGeometry(0.042, 8, 8), steel, Math.cos(ang) * 0.18, 0.042, Math.sin(ang) * 0.18);
    }
    _add(root, new THREE.SphereGeometry(0.025, 8, 8), jack, 0.08, 0.025, -0.12);
    _add(root, new THREE.CylinderGeometry(0.18, 0.2, 0.02, 16), new THREE.MeshLambertMaterial({ color: 0xc8a878 }), 0, 0.01, 0);
  }

  function _buildShuffleboard(root) {
    const wood = new THREE.MeshLambertMaterial({ color: 0xc8a878 });
    const leg = new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    const wax = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    _add(root, new THREE.BoxGeometry(2.82, 0.06, 0.52), wood, 0, 0.82, 0);
    _add(root, new THREE.BoxGeometry(2.72, 0.012, 0.42), wax, 0, 0.86, 0);
    for (const sx of [-1.22, 1.22]) {
      _add(root, new THREE.BoxGeometry(0.06, 0.82, 0.06), leg, sx, 0.41, 0.18);
      _add(root, new THREE.BoxGeometry(0.06, 0.82, 0.06), leg, sx, 0.41, -0.18);
    }
    _add(root, new THREE.CylinderGeometry(0.05, 0.05, 0.32, 10), wood, -0.82, 0.88, 0, 0, 0, Math.PI / 2);
  }

  function _buildAirHockey(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    const rail = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const leg = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    _add(root, new THREE.BoxGeometry(1.42, 0.08, 0.82), body, 0, 0.72, 0);
    _add(root, new THREE.BoxGeometry(1.32, 0.02, 0.72), new THREE.MeshLambertMaterial({ color: 0xa8d8f0 }), 0, 0.78, 0);
    _add(root, new THREE.BoxGeometry(1.38, 0.04, 0.78), rail, 0, 0.80, 0);
    for (const sx of [-0.58, 0.58]) {
      _add(root, new THREE.BoxGeometry(0.05, 0.72, 0.05), leg, sx, 0.36, 0.32);
      _add(root, new THREE.BoxGeometry(0.05, 0.72, 0.05), leg, sx, 0.36, -0.32);
    }
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.12, 10), rail, 0, 0.84, 0);
  }

  function _buildCroquetSet(root) {
    const wood = new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    const ball = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    for (let i = 0; i < 4; i++) {
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6), wood, -0.18 + i * 0.12, 0.31, 0.12, 0.2, 0, 0);
    }
    for (const [x, z, c] of [[0.22, -0.08, 0xc82828], [0.32, 0.02, 0x2868a8], [0.18, 0.12, 0x286838]]) {
      _add(root, new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshLambertMaterial({ color: c }), x, 0.035, z);
    }
    for (const x of [-0.28, -0.12, 0.04, 0.2]) {
      _add(root, new THREE.CylinderGeometry(0.018, 0.018, 0.28, 8), wood, x, 0.14, -0.12);
    }
    _add(root, new THREE.SphereGeometry(0.04, 8, 8), ball, -0.32, 0.04, 0.22);
  }

  function _buildHorseshoes(root) {
    const sand = new THREE.MeshLambertMaterial({ color: 0xc8a878 });
    const iron = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
    const stake = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.82, 0.04, 0.62), sand, 0, 0.02, 0);
    _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), stake, 0, 0.13, 0);
    for (const [x, z] of [[-0.18, 0.12], [0.22, -0.14]]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 10), iron);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(x, 0.05, z);
      hoop.castShadow = true;
      root.add(hoop);
    }
  }

  function _buildVolleyballNet(root) {
    const post = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const net = new THREE.MeshLambertMaterial({ color: 0xf0f0e8, transparent: true, opacity: 0.7 });
    const band = new THREE.MeshLambertMaterial({ color: 0xf8f8f0 });
    for (const sx of [-4.8, 4.8]) {
      _add(root, new THREE.CylinderGeometry(0.03, 0.035, 1.82, 8), post, sx, 0.91, 0);
    }
    _add(root, new THREE.BoxGeometry(9.62, 0.72, 0.02), net, 0, 1.12, 0);
    _add(root, new THREE.BoxGeometry(9.62, 0.06, 0.04), band, 0, 1.48, 0);
    _add(root, new THREE.SphereGeometry(0.09, 10, 10), new THREE.MeshLambertMaterial({ color: 0xf8f8f0 }), 0.52, 0.09, 0.42);
  }

  function _buildBaseballSet(root) {
    const wood = new THREE.MeshLambertMaterial({ color: 0xc8a878 });
    const leather = new THREE.MeshLambertMaterial({ color: 0xf0ece0 });
    _add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8), wood, 0, 0.36, 0, 0.15, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.035, 0.028, 0.12, 8), wood, 0, 0.78, 0, 0.15, 0, 0);
    _add(root, new THREE.SphereGeometry(0.038, 8, 8), leather, 0.22, 0.038, 0.18);
    _add(root, new THREE.BoxGeometry(0.28, 0.04, 0.22), leather, -0.12, 0.02, -0.08);
  }

  function _buildBoxingRingCorner(root) {
    const post = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const rope = new THREE.MeshLambertMaterial({ color: 0xc82828 });
    const pad = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    for (const y of [0.42, 0.72, 1.02]) {
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, 1.12, 6), rope, 0.52, y, 0, 0, 0, Math.PI / 2);
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, 1.12, 6), rope, 0, y, 0.52, Math.PI / 2, 0, 0);
    }
    _add(root, new THREE.CylinderGeometry(0.05, 0.055, 1.22, 8), post, 0, 0.61, 0);
    _add(root, new THREE.BoxGeometry(0.42, 0.12, 0.42), pad, 0, 0.06, 0);
  }

  function _buildHockeySticks(root) {
    const stick = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
    const blade = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const puck = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    for (const sx of [-0.12, 0.12]) {
      _add(root, new THREE.CylinderGeometry(0.018, 0.018, 0.82, 6), stick, sx, 0.41, 0, 0.25, 0, sx < 0 ? 0.15 : -0.15);
      _add(root, new THREE.BoxGeometry(0.14, 0.04, 0.06), blade, sx, 0.06, sx < 0 ? 0.08 : -0.08, 0.4, sx < 0 ? 0.2 : -0.2, 0);
    }
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12), puck, 0.28, 0.01, 0.18);
  }

  function _buildKayak(root) {
    const hull = new THREE.MeshLambertMaterial({ color: 0xf87828 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2828 });
    _add(root, new THREE.BoxGeometry(0.42, 0.14, 2.82), hull, 0, 0.12, 0, 0, 0, 0);
    _add(root, new THREE.BoxGeometry(0.28, 0.06, 0.48), dark, 0, 0.22, 0.42);
    _add(root, new THREE.BoxGeometry(0.04, 0.02, 1.82), dark, 0, 0.20, -0.22);
    _add(root, new THREE.CylinderGeometry(0.012, 0.012, 1.62, 6), dark, 0.08, 0.28, 0.62, 0.35, 0.1, 0);
  }

  function _buildMountainBike(root) {
    const frame = new THREE.MeshLambertMaterial({ color: 0x286838 });
    const tire = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const rim = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16), tire, 0, 0.32, 0.42, Math.PI / 2, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16), tire, 0, 0.32, -0.38, Math.PI / 2, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.26, 0.26, 0.02, 16), rim, 0, 0.32, 0.42, Math.PI / 2, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16), rim, 0, 0.32, -0.38, Math.PI / 2, 0, 0);
    _add(root, new THREE.BoxGeometry(0.06, 0.42, 0.32), frame, 0, 0.48, 0);
    _add(root, new THREE.BoxGeometry(0.42, 0.04, 0.06), frame, 0, 0.62, -0.12, -0.4, 0, 0);
    _add(root, new THREE.BoxGeometry(0.18, 0.04, 0.04), frame, 0, 0.78, -0.28, -0.55, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.52, 6), frame, 0, 0.88, -0.38);
  }

  function _buildCampStove(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const burner = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const tank = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    _add(root, new THREE.BoxGeometry(0.28, 0.06, 0.22), body, 0, 0.03, 0);
    _add(root, new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12), burner, 0, 0.08, 0);
    _add(root, new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10), tank, 0.12, 0.08, 0);
    for (const a of [0, Math.PI * 0.66, Math.PI * 1.33]) {
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), body, Math.cos(a) * 0.12, 0.04, Math.sin(a) * 0.1);
    }
    _add(root, new THREE.BoxGeometry(0.18, 0.02, 0.14), new THREE.MeshLambertMaterial({ color: 0x2a2828 }), -0.08, 0.09, 0);
  }

  function _buildCooler(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x4868a8 });
    const lid = new THREE.MeshLambertMaterial({ color: 0x6888b8 });
    const handle = new THREE.MeshLambertMaterial({ color: 0xf0f0e8 });
    _add(root, new THREE.BoxGeometry(0.52, 0.38, 0.32), body, 0, 0.19, 0);
    _add(root, new THREE.BoxGeometry(0.48, 0.06, 0.28), lid, 0, 0.41, 0);
    _add(root, new THREE.TorusGeometry(0.08, 0.012, 6, 12), handle, 0, 0.46, 0, 0, 0, Math.PI / 2);
    _add(root, new THREE.BoxGeometry(0.12, 0.04, 0.04), handle, 0, 0.44, -0.14);
  }

  function _buildFoldingChair(root) {
    const fabric = new THREE.MeshLambertMaterial({ color: 0x4a6848 });
    const frame = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.42, 0.04, 0.38), fabric, 0, 0.42, 0);
    _add(root, new THREE.BoxGeometry(0.42, 0.48, 0.04), fabric, 0, 0.66, -0.16, -0.25, 0, 0);
    for (const sx of [-0.16, 0.16]) {
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), frame, sx, 0.21, sx * 0.8, 0.2, 0, 0);
      _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.52, 6), frame, sx, 0.48, -sx * 0.4, -0.35, 0, 0);
    }
  }

  function _buildCampLantern(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0x286848 });
    const glass = new THREE.MeshLambertMaterial({ color: 0xfff0c8, emissive: 0x4a3810, emissiveIntensity: 0.45 });
    const top = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    _add(root, new THREE.CylinderGeometry(0.08, 0.1, 0.06, 10), top, 0, 0.03, 0);
    _add(root, new THREE.CylinderGeometry(0.1, 0.12, 0.22, 10), glass, 0, 0.17, 0);
    _add(root, new THREE.CylinderGeometry(0.08, 0.1, 0.12, 10), body, 0, 0.34, 0);
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8), top, 0, 0.44, 0);
    const light = new THREE.PointLight(0xffc880, 0.6, 6, 1.6);
    light.position.set(0, 0.22, 0);
    root.add(light);
  }

  function _buildDrumKit(root) {
    const chrome = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const skin = new THREE.MeshLambertMaterial({ color: 0xf0ece0 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2828 });
    _add(root, new THREE.CylinderGeometry(0.28, 0.28, 0.32, 16), dark, 0, 0.16, 0);
    _add(root, new THREE.CylinderGeometry(0.26, 0.26, 0.02, 16), skin, 0, 0.33, 0);
    _add(root, new THREE.CylinderGeometry(0.16, 0.16, 0.22, 14), dark, -0.32, 0.52, 0.12);
    _add(root, new THREE.CylinderGeometry(0.14, 0.14, 0.02, 14), skin, -0.32, 0.64, 0.12);
    _add(root, new THREE.CylinderGeometry(0.14, 0.14, 0.18, 12), dark, 0.38, 0.58, -0.08);
    _add(root, new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12), skin, 0.38, 0.68, -0.08);
    _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.72, 6), chrome, -0.18, 0.72, 0.22, 0.4, 0, 0.3);
    _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6), chrome, 0.22, 0.68, -0.18, 0.5, 0, -0.2);
    _add(root, new THREE.CylinderGeometry(0.22, 0.24, 0.04, 14), chrome, 0.08, 0.82, 0.02);
  }

  function _buildKeyboardStand(root) {
    const keys = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const white = new THREE.MeshLambertMaterial({ color: 0xf0f0e8 });
    const stand = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    _add(root, new THREE.BoxGeometry(0.92, 0.06, 0.28), keys, 0, 0.72, 0);
    for (let i = 0; i < 14; i++) {
      _add(root, new THREE.BoxGeometry(0.04, 0.012, 0.18), white, -0.38 + i * 0.055, 0.76, -0.02);
    }
    for (const sx of [-0.32, 0.32]) {
      _add(root, new THREE.CylinderGeometry(0.02, 0.02, 0.72, 8), stand, sx, 0.36, 0.08);
    }
    _add(root, new THREE.BoxGeometry(0.72, 0.03, 0.06), stand, 0, 0.02, 0.12);
  }

  function _buildPlaygroundSwing(root) {
    const metal = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const seat = new THREE.MeshLambertMaterial({ color: 0x4868a8 });
    const chain = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    for (const sx of [-0.62, 0.62]) {
      _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8), metal, sx, 0.04, 0);
      _add(root, new THREE.CylinderGeometry(0.035, 0.04, 2.12, 8), metal, sx, 1.1, 0);
    }
    _add(root, new THREE.CylinderGeometry(0.03, 0.035, 1.32, 8), metal, 0, 2.18, 0, 0, 0, Math.PI / 2);
    for (const sx of [-0.18, 0.18]) {
      _add(root, new THREE.CylinderGeometry(0.008, 0.008, 0.82, 6), chain, sx, 1.52, 0);
    }
    _add(root, new THREE.BoxGeometry(0.42, 0.04, 0.18), seat, 0, 1.08, 0);
  }

  function _buildSandbox(root) {
    const wood = new THREE.MeshLambertMaterial({ color: 0xc8a878 });
    const sand = new THREE.MeshLambertMaterial({ color: 0xd8c8a0 });
    const toy = new THREE.MeshLambertMaterial({ color: 0xc84828 });
    _add(root, new THREE.BoxGeometry(1.22, 0.12, 1.22), wood, 0, 0.06, 0);
    _add(root, new THREE.BoxGeometry(1.08, 0.08, 1.08), sand, 0, 0.14, 0);
    _add(root, new THREE.BoxGeometry(0.12, 0.08, 0.18), toy, 0.22, 0.2, 0.12);
    _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.12, 8), toy, -0.18, 0.2, -0.08);
  }

  function _buildTrampoline(root) {
    const leg = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const pad = new THREE.MeshLambertMaterial({ color: 0x2868a8 });
    const rim = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.CylinderGeometry(0.92, 0.92, 0.06, 20), pad, 0, 0.52, 0);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.04, 8, 24), rim);
    torus.rotation.x = Math.PI / 2;
    torus.position.set(0, 0.48, 0);
    torus.castShadow = true;
    root.add(torus);
    for (let a = 0; a < 6; a++) {
      const ang = a * Math.PI / 3;
      _add(root, new THREE.CylinderGeometry(0.03, 0.035, 0.48, 8), leg, Math.cos(ang) * 0.72, 0.24, Math.sin(ang) * 0.72);
    }
  }

  function _buildCanoe(root) {
    const hull = new THREE.MeshLambertMaterial({ color: 0x486878 });
    const wood = new THREE.MeshLambertMaterial({ color: 0x6a5038 });
    _add(root, new THREE.BoxGeometry(0.38, 0.12, 2.42), hull, 0, 0.38, 0, 0, 0, 0);
    for (const sx of [-0.42, 0.42]) {
      _add(root, new THREE.BoxGeometry(0.06, 0.52, 0.06), wood, sx, 0.26, 0);
    }
    _add(root, new THREE.BoxGeometry(0.42, 0.04, 0.08), wood, 0, 0.52, 0);
    _add(root, new THREE.CylinderGeometry(0.012, 0.012, 1.42, 6), wood, 0.06, 0.58, 0.42, 0.3, 0.15, 0);
  }

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

  function _buildSolarShower(root) {
    const bag = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const tube = new THREE.MeshLambertMaterial({ color: 0x4868a8 });
    _add(root, new THREE.BoxGeometry(0.32, 0.52, 0.12), bag, 0, 1.12, 0);
    _add(root, new THREE.BoxGeometry(0.28, 0.08, 0.1), bag, 0, 1.4, 0);
    _add(root, new THREE.CylinderGeometry(0.018, 0.018, 1.02, 8), tube, 0, 0.55, 0);
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8), tube, 0, 0.04, 0);
    _add(root, new THREE.BoxGeometry(0.12, 0.04, 0.08), new THREE.MeshLambertMaterial({ color: 0x9a9890 }), 0.08, 0.08, 0);
  }

  function _buildBirdBath(root) {
    const bowl = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    const stem = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const water = new THREE.MeshLambertMaterial({ color: 0x88c8e8, transparent: true, opacity: 0.6 });
    _add(root, new THREE.CylinderGeometry(0.08, 0.1, 0.08, 10), stem, 0, 0.04, 0);
    _add(root, new THREE.CylinderGeometry(0.04, 0.045, 0.62, 8), stem, 0, 0.35, 0);
    _add(root, new THREE.CylinderGeometry(0.22, 0.18, 0.12, 12), bowl, 0, 0.72, 0);
    _add(root, new THREE.CylinderGeometry(0.16, 0.16, 0.02, 12), water, 0, 0.76, 0);
  }

  function _buildRedWagon(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xc84828 });
    const wheel = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const handle = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.52, 0.18, 0.72), body, 0, 0.22, 0);
    for (const [x, z] of [[-0.22, 0.28], [0.22, 0.28], [-0.22, -0.28], [0.22, -0.28]]) {
      _add(root, new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), wheel, x, 0.08, z, Math.PI / 2, 0, 0);
    }
    _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6), handle, 0, 0.28, -0.52, -0.25, 0, 0);
    _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.12), handle, 0, 0.12, -0.82);
  }

  if (ZS.registerDecorPrefab) {
    ZS.registerDecorPrefab('spawn_game_dartboard', { build: _buildDartboard, label: 'Cible fléchettes', category: 'jeux', desc: 'Cible murale ~0,48 m — bar / salle de jeux.' });
    ZS.registerDecorPrefab('spawn_game_foosball', { build: _buildFoosball, label: 'Baby-foot', category: 'jeux', desc: 'Table baby-foot ~1,22 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_game_ping_pong', { build: _buildPingPong, label: 'Table ping-pong', category: 'jeux', desc: 'Table tennis ~1,52 m — filet centré.' });
    ZS.registerDecorPrefab('spawn_game_chess_table', { build: _buildChessTable, label: 'Table échecs', category: 'jeux', desc: 'Table damier ~0,62 m — parc / jardin.' });
    ZS.registerDecorPrefab('spawn_game_poker_table', { build: _buildPokerTable, label: 'Table poker', category: 'jeux', desc: 'Table ronde feutre ~1,08 m — casino / bar.' });
    ZS.registerDecorPrefab('spawn_game_jenga', { build: _buildJengaTower, label: 'Tour Jenga', category: 'jeux', desc: 'Pile de blocs ~0,24 m — salon / auberge.' });
    ZS.registerDecorPrefab('spawn_game_pinball', { build: _buildPinball, label: 'Flipper', category: 'jeux', desc: 'Flipper rétro ~1,02 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_game_bowling_pins', { build: _buildBowlingPins, label: 'Quilles bowling', category: 'jeux', desc: '10 quilles + boule ~0,72 m — bowling / bar.' });
    ZS.registerDecorPrefab('spawn_game_petanque', { build: _buildPetanqueSet, label: 'Set pétanque', category: 'jeux', desc: 'Boules + cochonnet ~0,42 m — terrain extérieur.' });
    ZS.registerDecorPrefab('spawn_sport_basketball_hoop', { build: _buildBasketballHoop, label: 'Panier basket', category: 'sport', desc: 'Panier ~2,8 m — playground / gym.' });
    ZS.registerDecorPrefab('spawn_sport_soccer_goal', { build: _buildSoccerGoal, label: 'But football', category: 'sport', desc: 'But portable ~2,2 m — terrain herbe.' });
    ZS.registerDecorPrefab('spawn_sport_punching_bag', { build: _buildPunchingBag, label: 'Sac de frappe', category: 'sport', desc: 'Sac sur pied ~1,02 m — salle de boxe.' });
    ZS.registerDecorPrefab('spawn_sport_tennis_net', { build: _buildTennisNet, label: 'Filet tennis', category: 'sport', desc: 'Filet ~10,4 m — court extérieur.' });
    ZS.registerDecorPrefab('spawn_sport_golf_bag', { build: _buildGolfBag, label: 'Sac de golf', category: 'sport', desc: 'Sac + clubs ~0,92 m — practice / club house.' });
    ZS.registerDecorPrefab('spawn_sport_skateboard', { build: _buildSkateboard, label: 'Skateboard', category: 'sport', desc: 'Planche posée ~0,72 m — skatepark / trottoir.' });
    ZS.registerDecorPrefab('spawn_sport_surfboard', { build: _buildSurfboard, label: 'Planche de surf', category: 'sport', desc: 'Surf ~1,72 m — plage / van life.' });
    ZS.registerDecorPrefab('spawn_loisir_fishing_rod', { build: _buildFishingRod, label: 'Poste pêche', category: 'loisirs', desc: 'Canne + trépied ~1,42 m — lac / rivière.' });
    ZS.registerDecorPrefab('spawn_loisir_camping_tent', { build: _buildCampingTent, label: 'Tente camping', category: 'loisirs', desc: 'Tente 2 places ~1,42 m — bivouac.' });
    ZS.registerDecorPrefab('spawn_loisir_hammock', { build: _buildHammock, label: 'Hamac', category: 'loisirs', desc: 'Hamac entre poteaux ~2,9 m — jardin / camp.' });
    ZS.registerDecorPrefab('spawn_loisir_acoustic_guitar', { build: _buildAcousticGuitar, label: 'Guitare acoustique', category: 'loisirs', desc: 'Guitare sur pied ~0,62 m — scène / feu de camp.' });
    ZS.registerDecorPrefab('spawn_loisir_playground_slide', { build: _buildPlaygroundSlide, label: 'Toboggan playground', category: 'loisirs', desc: 'Toboggan ~1,82 m — aire de jeux.' });
    ZS.registerDecorPrefab('spawn_game_shuffleboard', { build: _buildShuffleboard, label: 'Table shuffleboard', category: 'jeux', desc: 'Table cire ~2,82 m — bar / salle de jeux.' });
    ZS.registerDecorPrefab('spawn_game_air_hockey', { build: _buildAirHockey, label: 'Table air hockey', category: 'jeux', desc: 'Air hockey ~1,42 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_game_croquet', { build: _buildCroquetSet, label: 'Set croquet', category: 'jeux', desc: 'Maillets + arches ~0,72 m — pelouse.' });
    ZS.registerDecorPrefab('spawn_game_horseshoes', { build: _buildHorseshoes, label: 'Jeu de fer à cheval', category: 'jeux', desc: 'Bac sable + fers ~0,82 m — jardin.' });
    ZS.registerDecorPrefab('spawn_sport_volleyball_net', { build: _buildVolleyballNet, label: 'Filet volley', category: 'sport', desc: 'Filet ~9,6 m — plage / terrain.' });
    ZS.registerDecorPrefab('spawn_sport_baseball_set', { build: _buildBaseballSet, label: 'Batte + balle', category: 'sport', desc: 'Baseball ~0,82 m — terrain / dugout.' });
    ZS.registerDecorPrefab('spawn_sport_boxing_corner', { build: _buildBoxingRingCorner, label: 'Coin ring boxe', category: 'sport', desc: 'Poteau + cordes ~1,22 m — gym.' });
    ZS.registerDecorPrefab('spawn_sport_hockey_sticks', { build: _buildHockeySticks, label: 'Crosses hockey', category: 'sport', desc: 'Crosses + palet ~0,92 m — vestiaire.' });
    ZS.registerDecorPrefab('spawn_sport_kayak', { build: _buildKayak, label: 'Kayak', category: 'sport', desc: 'Kayak ~2,82 m — rivage / rack.' });
    ZS.registerDecorPrefab('spawn_sport_mountain_bike', { build: _buildMountainBike, label: 'VTT', category: 'sport', desc: 'Vélo tout-terrain ~0,92 m — sentier / garage.' });
    ZS.registerDecorPrefab('spawn_loisir_camp_stove', { build: _buildCampStove, label: 'Réchaud camping', category: 'loisirs', desc: 'Réchaud gaz ~0,12 m — bivouac.' });
    ZS.registerDecorPrefab('spawn_loisir_cooler', { build: _buildCooler, label: 'Glacière', category: 'loisirs', desc: 'Glacière ~0,52 m — picnic / camp.' });
    ZS.registerDecorPrefab('spawn_loisir_folding_chair', { build: _buildFoldingChair, label: 'Chaise pliante', category: 'loisirs', desc: 'Chaise camping ~0,82 m — assise −Z.' });
    ZS.registerDecorPrefab('spawn_loisir_camp_lantern', { build: _buildCampLantern, label: 'Lanterne camping', category: 'loisirs', desc: 'Lanterne ~0,48 m + lumière — tente.' });
    ZS.registerDecorPrefab('spawn_loisir_drum_kit', { build: _buildDrumKit, label: 'Batterie', category: 'loisirs', desc: 'Kit batterie ~0,88 m — scène / garage.' });
    ZS.registerDecorPrefab('spawn_loisir_keyboard', { build: _buildKeyboardStand, label: 'Clavier synthé', category: 'loisirs', desc: 'Clavier sur pied ~0,78 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_loisir_playground_swing', { build: _buildPlaygroundSwing, label: 'Balançoire', category: 'loisirs', desc: 'Portique balançoire ~2,2 m — playground.' });
    ZS.registerDecorPrefab('spawn_loisir_sandbox', { build: _buildSandbox, label: 'Bac à sable', category: 'loisirs', desc: 'Bac ~1,22 m — aire enfants.' });
    ZS.registerDecorPrefab('spawn_loisir_trampoline', { build: _buildTrampoline, label: 'Trampoline', category: 'loisirs', desc: 'Trampoline ~1,84 m — jardin.' });
    ZS.registerDecorPrefab('spawn_loisir_canoe', { build: _buildCanoe, label: 'Canoë sur rack', category: 'loisirs', desc: 'Canoë ~2,42 m — club nautique / lac.' });
    ZS.registerDecorPrefab('spawn_game_roulette_table', { build: _buildRouletteTable, label: 'Table roulette', category: 'jeux', desc: 'Roulette casino ~1,42 m — face −Z.' });
    ZS.registerDecorPrefab('spawn_game_craps_table', { build: _buildCrapsTable, label: 'Table craps', category: 'jeux', desc: 'Table dés ~1,82 m — casino / bar.' });
    ZS.registerDecorPrefab('spawn_game_skee_ball', { build: _buildSkeeBall, label: 'Skee-ball', category: 'jeux', desc: 'Borne skee-ball ~1,42 m — arcade.' });
    ZS.registerDecorPrefab('spawn_game_board_game', { build: _buildBoardGame, label: 'Plateau de société', category: 'jeux', desc: 'Table + pions ~0,72 m — salon / refuge.' });
    ZS.registerDecorPrefab('spawn_sport_climbing_wall', { build: _buildClimbingWall, label: 'Mur d\'escalade', category: 'sport', desc: 'Pan escalade ~2,42 m — gym / parc.' });
    ZS.registerDecorPrefab('spawn_sport_archery_target', { build: _buildArcheryTarget, label: 'Cible tir à l\'arc', category: 'sport', desc: 'Cible + arc ~1,22 m — stand de tir.' });
    ZS.registerDecorPrefab('spawn_sport_ski_set', { build: _buildSkiSet, label: 'Skis + bâtons', category: 'sport', desc: 'Matériel ski ~1,62 m — station / chalet.' });
    ZS.registerDecorPrefab('spawn_sport_dumbbell_rack', { build: _buildDumbbellRack, label: 'Rack haltères', category: 'sport', desc: 'Haltères ~0,82 m — salle de sport.' });
    ZS.registerDecorPrefab('spawn_sport_badminton_net', { build: _buildBadmintonNet, label: 'Filet badminton', category: 'sport', desc: 'Filet ~5,28 m — jardin / gym.' });
    ZS.registerDecorPrefab('spawn_sport_lacrosse_sticks', { build: _buildLacrosseSticks, label: 'Crosses lacrosse', category: 'sport', desc: 'Crosses + balle ~0,92 m — terrain.' });
    ZS.registerDecorPrefab('spawn_loisir_microphone_stand', { build: _buildMicrophoneStand, label: 'Pied micro', category: 'loisirs', desc: 'Micro scène ~1,58 m — bar / scène.' });
    ZS.registerDecorPrefab('spawn_loisir_portable_bbq', { build: _buildPortableBbq, label: 'BBQ portable', category: 'loisirs', desc: 'Grill charbon ~0,64 m — picnic.' });
    ZS.registerDecorPrefab('spawn_loisir_picnic_basket', { build: _buildPicnicBasket, label: 'Panier picnic', category: 'loisirs', desc: 'Panier osier ~0,38 m — parc.' });
    ZS.registerDecorPrefab('spawn_loisir_telescope', { build: _buildTelescope, label: 'Télescope', category: 'loisirs', desc: 'Télescope tripode ~1,12 m — observatoire amateur.' });
    ZS.registerDecorPrefab('spawn_loisir_seesaw', { build: _buildSeesaw, label: 'Balançoire à bascule', category: 'loisirs', desc: 'Bascule ~2,42 m — playground.' });
    ZS.registerDecorPrefab('spawn_loisir_spinning_playground', { build: _buildSpinningPlayground, label: 'Manège playground', category: 'loisirs', desc: 'Toupie ~1,44 m — aire enfants.' });
    ZS.registerDecorPrefab('spawn_loisir_camp_table', { build: _buildCampTable, label: 'Table camping', category: 'loisirs', desc: 'Table pliante ~0,92 m — bivouac.' });
    ZS.registerDecorPrefab('spawn_loisir_sleeping_pad', { build: _buildSleepingPad, label: 'Tapis de sol', category: 'loisirs', desc: 'Matelas roulé ~0,62 m — tente.' });
    ZS.registerDecorPrefab('spawn_loisir_binoculars_tripod', { build: _buildBinocularsTripod, label: 'Jumelles sur pied', category: 'loisirs', desc: 'Jumelles ~0,82 m — belvédère / chasse.' });
    ZS.registerDecorPrefab('spawn_loisir_ukulele_stand', { build: _buildUkuleleStand, label: 'Ukulélé sur pied', category: 'loisirs', desc: 'Ukulélé ~0,52 m — feu de camp / scène.' });
    ZS.registerDecorPrefab('spawn_game_ring_toss', { build: _buildRingToss, label: 'Jeu des anneaux', category: 'jeux', desc: 'Anneaux ~0,58 m — jardin / fête.' });
    ZS.registerDecorPrefab('spawn_game_lawn_darts', { build: _buildLawnDarts, label: 'Fléchettes lawn', category: 'jeux', desc: 'Cible pelouse ~0,48 m — backyard.' });
    ZS.registerDecorPrefab('spawn_game_kubb', { build: _buildKubbSet, label: 'Set kubb', category: 'jeux', desc: 'Kubb viking ~0,72 m — pelouse.' });
    ZS.registerDecorPrefab('spawn_game_marbles', { build: _buildMarblesCircle, label: 'Cercle billes', category: 'jeux', desc: 'Billes ~0,56 m — cour / école.' });
    ZS.registerDecorPrefab('spawn_sport_disc_golf_basket', { build: _buildDiscGolfBasket, label: 'Panier disc golf', category: 'sport', desc: 'Basket ~1,22 m — parcours disc.' });
    ZS.registerDecorPrefab('spawn_sport_yoga_mat', { build: _buildYogaMat, label: 'Tapis yoga', category: 'sport', desc: 'Tapis roulé ~0,58 m — gym / parc.' });
    ZS.registerDecorPrefab('spawn_sport_pull_up_bar', { build: _buildPullUpBar, label: 'Barre traction', category: 'sport', desc: 'Barre ~2,02 m — parc street workout.' });
    ZS.registerDecorPrefab('spawn_sport_boxing_gloves', { build: _buildBoxingGloves, label: 'Gants de boxe', category: 'sport', desc: 'Gants accrochés ~1,42 m — vestiaire.' });
    ZS.registerDecorPrefab('spawn_sport_curling_stones', { build: _buildCurlingStones, label: 'Pierres curling', category: 'sport', desc: '3 pierres ~0,24 m — patinoire.' });
    ZS.registerDecorPrefab('spawn_sport_football_pad', { build: _buildFootballPad, label: 'Tackle dummy', category: 'sport', desc: 'Mannequin foot US ~0,82 m — terrain.' });
    ZS.registerDecorPrefab('spawn_loisir_beach_chair', { build: _buildBeachChair, label: 'Chaise de plage', category: 'loisirs', desc: 'Chaise pliante ~0,72 m — assise −Z.' });
    ZS.registerDecorPrefab('spawn_loisir_beach_umbrella', { build: _buildBeachUmbrella, label: 'Parasol plage', category: 'loisirs', desc: 'Parasol sable ~1,88 m — rivage.' });
    ZS.registerDecorPrefab('spawn_loisir_life_ring', { build: _buildLifeRing, label: 'Bouée sauvetage', category: 'loisirs', desc: 'Bouée sur poteau ~1,02 m — quai / piscine.' });
    ZS.registerDecorPrefab('spawn_loisir_paddle_board', { build: _buildPaddleBoard, label: 'Paddle SUP', category: 'loisirs', desc: 'Planche + pagaie ~1,82 m — lac / mer.' });
    ZS.registerDecorPrefab('spawn_loisir_snorkel_set', { build: _buildSnorkelSet, label: 'Kit tuba', category: 'loisirs', desc: 'Masque + palmes ~0,28 m — plage.' });
    ZS.registerDecorPrefab('spawn_loisir_camp_cot', { build: _buildCampCot, label: 'Lit de camp', category: 'loisirs', desc: 'Lit pliant ~0,52 m — tente / refuge.' });
    ZS.registerDecorPrefab('spawn_loisir_fire_pit', { build: _buildFirePit, label: 'Brasero', category: 'loisirs', desc: 'Foyer pierres ~0,72 m + lumière — camp.' });
    ZS.registerDecorPrefab('spawn_loisir_solar_shower', { build: _buildSolarShower, label: 'Douche solaire', category: 'loisirs', desc: 'Douche camping ~1,42 m — bivouac.' });
    ZS.registerDecorPrefab('spawn_loisir_bird_bath', { build: _buildBirdBath, label: 'Bain d\'oiseaux', category: 'loisirs', desc: 'Bassin ~0,78 m — jardin.' });
    ZS.registerDecorPrefab('spawn_loisir_red_wagon', { build: _buildRedWagon, label: 'Petit chariot', category: 'loisirs', desc: 'Wagon enfant ~0,92 m — cour / parc.' });
  }
}());
