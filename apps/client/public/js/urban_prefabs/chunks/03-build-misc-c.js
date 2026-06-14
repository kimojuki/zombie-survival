// Divers urbain C — extrait de urban_prefabs.js (IIFE)
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
