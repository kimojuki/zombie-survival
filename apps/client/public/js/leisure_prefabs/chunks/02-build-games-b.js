// Jeux de salle B + camp — extrait de leisure_prefabs.js (IIFE)
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
