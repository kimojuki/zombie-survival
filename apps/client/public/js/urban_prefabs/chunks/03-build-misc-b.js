// Divers urbain B — extrait de urban_prefabs.js (IIFE)
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
