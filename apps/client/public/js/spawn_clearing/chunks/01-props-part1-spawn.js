// Props spawn basiques
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

  function _campMats() {
    return ZS.CampTextures?.materials() || null;
  }

  /** Souche assise (anneaux visibles sur le dessus) */
  function _buildStumpSeat(parent, x, y, z, r, faceAngle) {
    const M = _campMats();
    const bark = M ? M.bark() : new THREE.MeshLambertMaterial({ color: 0x5a3818 });
    const ring = M ? M.ring() : new THREE.MeshLambertMaterial({ color: 0xc8a878 });
    _add(parent, new THREE.CylinderGeometry(r * 0.82, r, 0.38, 8), bark, x, y + 0.19, z);
    _add(parent, new THREE.CylinderGeometry(r * 0.78, r * 0.78, 0.04, 8), ring, x, y + 0.39, z);
    _add(parent, new THREE.CylinderGeometry(r * 0.22, r * 0.22, 0.025, 8),
      new THREE.MeshLambertMaterial({ color: 0x9a7858 }), x, y + 0.415, z);
  }

  /** Pile de bois (bûches empilées en croix — très lisible) */
  function _buildLogPile(parent, x, y, z) {
    const M = _campMats();
    const bark = M ? M.bark() : new THREE.MeshLambertMaterial({ color: 0x4a3018 });
    const endW = M ? M.endWood() : new THREE.MeshLambertMaterial({ color: 0xc4a070 });
    const logs = [
      { ox: 0, oz: 0, ry: 0, len: 0.95, r: 0.085 },
      { ox: 0.05, oz: 0.08, ry: Math.PI / 2, len: 0.88, r: 0.08 },
      { ox: -0.02, oz: 0.04, ry: 0.15, len: 0.82, r: 0.075, lift: 0.16 },
      { ox: 0.04, oz: -0.03, ry: Math.PI / 2 + 0.2, len: 0.78, r: 0.072, lift: 0.15 },
    ];
    for (const lg of logs) {
      const lift = lg.lift || 0;
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(lg.r * 0.9, lg.r, lg.len, 8), bark);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = lg.ry;
      log.position.set(x + lg.ox, y + lg.r + lift, z + lg.oz);
      log.castShadow = true;
      parent.add(log);
      const cap = new THREE.Mesh(new THREE.CircleGeometry(lg.r * 0.85, 8), endW);
      cap.rotation.y = lg.ry;
      cap.rotation.x = Math.PI / 2;
      cap.position.set(x + lg.ox + Math.cos(lg.ry) * lg.len * 0.42, y + lg.r + lift, z + lg.oz + Math.sin(lg.ry) * lg.len * 0.42);
      parent.add(cap);
    }
  }

  /** Caisse en bois avec planches visibles */
  function _buildCrate(parent, x, y, z, ry) {
    const M = _campMats();
    const plank = M ? M.woodFine(0xc69158) : new THREE.MeshLambertMaterial({ color: 0x7a5530 });
    const frame = M ? M.woodFrame() : new THREE.MeshLambertMaterial({ color: 0x4a3018 });
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);
    _add(g, new THREE.BoxGeometry(0.62, 0.48, 0.58), plank, 0, 0.24, 0);
    for (const sx of [-0.28, 0.28]) {
      _add(g, new THREE.BoxGeometry(0.05, 0.50, 0.60), frame, sx, 0.25, 0);
    }
    for (let i = -1; i <= 1; i++) {
      _add(g, new THREE.BoxGeometry(0.58, 0.04, 0.05), frame, 0, 0.12 + i * 0.14, 0.28);
    }
    // couvercle entrouvert
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.04, 0.56), plank);
    lid.position.set(0, 0.52, -0.08);
    lid.rotation.x = -0.55;
    lid.castShadow = true;
    g.add(lid);
    _add(g, new THREE.CylinderGeometry(0.055, 0.055, 0.11, 8),
      new THREE.MeshLambertMaterial({ color: 0x8a9098 }), 0.38, 0.52, 0.15);
  }

  /** Sac à dos reconnaissable */
  function _buildBackpack(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);
    const body = M ? M.canvas(0x3d5028) : new THREE.MeshLambertMaterial({ color: 0x3d5028 });
    const strap = M ? M.strap() : new THREE.MeshLambertMaterial({ color: 0x2a3818 });
    _add(g, new THREE.BoxGeometry(0.32, 0.42, 0.16), body, 0, 0.21, 0);
    _add(g, new THREE.BoxGeometry(0.28, 0.12, 0.14), body, 0, 0.44, -0.02, -0.25, 0, 0);
    for (const sx of [-0.09, 0.09]) {
      _add(g, new THREE.BoxGeometry(0.04, 0.38, 0.03), strap, sx, 0.22, 0.09);
    }
    _add(g, new THREE.BoxGeometry(0.08, 0.06, 0.04), strap, 0, 0.38, 0.08);
  }

  /** Sac de couchage déroulé — tapis + rouleau + capuche (prefab `spawn_bedroll`, pas un lit). */
  function _buildBedroll(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);
    const mat = M?.bedrollBody?.() || new THREE.MeshLambertMaterial({ color: 0x3a4548 });
    const blanket = M?.bedrollRoll?.() || new THREE.MeshLambertMaterial({ color: 0x2e3638 });
    const pillow = M?.bedrollPillow?.() || new THREE.MeshLambertMaterial({ color: 0x5a6468 });
    const body = _add(g, new THREE.BoxGeometry(1.75, 0.05, 0.72), mat, 0, 0.025, 0);
    body.castShadow = body.receiveShadow = true;
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.65, 10), blanket);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0.52, 0.12, 0);
    roll.castShadow = roll.receiveShadow = true;
    g.add(roll);
    const hood = _add(g, new THREE.BoxGeometry(0.32, 0.08, 0.22), pillow, -0.68, 0.06, 0);
    hood.castShadow = hood.receiveShadow = true;
  }

  /**
   * Lit une place — ~0,92 × 1,78 m (réaliste pour un perso).
   * Pivot = centre sol ; tête local +Z, pieds −Z.
   */
  function _buildSingleBed(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const frame = M?.bedFrame?.() || new THREE.MeshLambertMaterial({ color: 0x5c4030 });
    const mattress = M?.bedMattress?.() || new THREE.MeshLambertMaterial({ color: 0xc8c4b8 });
    const blanket = M?.bedBlanket?.() || new THREE.MeshLambertMaterial({ color: 0x4a5a48 });
    const pillow = M?.bedPillow?.() || new THREE.MeshLambertMaterial({ color: 0xd8dce0 });

    const HW = 0.46;
    const HL = 0.89;
    const LEG = 0.07;
    const RAIL_H = 0.22;
    const RAIL_Y = 0.11;

    const legPos = [
      [-HW + LEG * 0.5, HL - LEG * 0.5],
      [HW - LEG * 0.5, HL - LEG * 0.5],
      [-HW + LEG * 0.5, -HL + LEG * 0.5],
      [HW - LEG * 0.5, -HL + LEG * 0.5],
    ];
    for (const [lx, lz] of legPos) {
      const leg = _add(g, new THREE.BoxGeometry(LEG, RAIL_Y, LEG), frame, lx, RAIL_Y * 0.5, lz);
      leg.castShadow = leg.receiveShadow = true;
    }

    for (const lz of [HL - LEG * 0.5, -HL + LEG * 0.5]) {
      const rail = _add(g, new THREE.BoxGeometry(HW * 2 - LEG, 0.06, LEG * 0.9), frame, 0, RAIL_Y, lz);
      rail.castShadow = rail.receiveShadow = true;
    }
    for (const lx of [-HW + LEG * 0.5, HW - LEG * 0.5]) {
      const rail = _add(g, new THREE.BoxGeometry(LEG * 0.9, 0.06, HL * 2 - LEG * 1.2), frame, lx, RAIL_Y, 0);
      rail.castShadow = rail.receiveShadow = true;
    }

    const head = _add(g, new THREE.BoxGeometry(HW * 2, 0.48, 0.06), frame, 0, 0.24, HL - 0.03);
    head.castShadow = head.receiveShadow = true;
    const foot = _add(g, new THREE.BoxGeometry(HW * 2, 0.28, 0.05), frame, 0, 0.14, -HL + 0.025);
    foot.castShadow = foot.receiveShadow = true;

    for (let i = -3; i <= 3; i++) {
      const slat = _add(g, new THREE.BoxGeometry(HW * 2 - 0.12, 0.03, 0.08), frame, 0, RAIL_Y + 0.02, i * 0.22);
      slat.castShadow = true;
    }

    const mat = _add(g, new THREE.BoxGeometry(0.88, 0.11, 1.72), mattress, 0, RAIL_Y + 0.075, 0);
    mat.castShadow = mat.receiveShadow = true;

    const pil = _add(g, new THREE.BoxGeometry(0.42, 0.1, 0.28), pillow, 0, RAIL_Y + 0.16, HL - 0.38);
    pil.castShadow = pil.receiveShadow = true;

    const cov = _add(g, new THREE.BoxGeometry(0.78, 0.05, 1.22), blanket, 0.04, RAIL_Y + 0.155, -0.12, 0.04, 0, 0);
    cov.castShadow = cov.receiveShadow = true;
  }

  /**
   * Table rustique cabane — ~1,15 × 0,70 m, hauteur ~0,74 m.
   * Pivot = centre sol ; plateau horizontal (XZ).
   */
