// Jeux de salle A — extrait de leisure_prefabs.js (IIFE)
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
