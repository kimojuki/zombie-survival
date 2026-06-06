// Décor visuel de la clairière de spawn (lisière, sentier, détails)
(function () {
  'use strict';

  function _rng(seed) {
    let s = seed >>> 0;
    return () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return (s >>> 0) / 0xffffffff;
    };
  }

  const SPAWN_CX = 0, SPAWN_CZ = -6;
  const CLEAR_RX = 5.8, CLEAR_RZ = 5.2;
  const _groundTex = new THREE.TextureLoader().load('/textures/camp/spawn_ground.png?v=20260606-spawn-ground-01');
  _groundTex.wrapS = _groundTex.wrapT = THREE.RepeatWrapping;
  _groundTex.repeat.set(1.2, 1.05);
  _groundTex.magFilter = THREE.NearestFilter;
  _groundTex.minFilter = THREE.NearestMipmapNearestFilter;
  _groundTex.colorSpace = THREE.SRGBColorSpace;

  function _inCamp(x, z, cx, cz) {
    const dx = (x - cx) / CLEAR_RX;
    const dz = (z - cz) / CLEAR_RZ;
    return Math.hypot(dx, dz) < 0.88;
  }

  /** Sentier : clairière → ouverture sud de la route principale */
  const SPAWN_TRAIL_PTS = [
    [0, -11.2],
    [0.6, -12.8],
    [2.2, -14.2],
    [4.5, -15.8],
    [7.0, -17.0],
    [9.5, -18.2],
    [12.0, -19.8],
    [14, -21.0],
  ];

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

  /** Tapis de sol + couverture roulée + oreiller */
  function _buildBedroll(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);
    const mat = M ? M.canvas(0x4a5838) : new THREE.MeshLambertMaterial({ color: 0x4a5838 });
    const blanket = M ? M.canvasTight(0x5a4030) : new THREE.MeshLambertMaterial({ color: 0x5a4030 });
    const pillow = M ? M.canvasTight(0x6a6050) : new THREE.MeshLambertMaterial({ color: 0x6a6050 });
    _add(g, new THREE.BoxGeometry(1.75, 0.05, 0.72), mat, 0, 0.025, 0);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.65, 8), blanket);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0.52, 0.12, 0);
    roll.castShadow = true;
    g.add(roll);
    _add(g, new THREE.BoxGeometry(0.32, 0.08, 0.22), pillow, -0.68, 0.06, 0);
  }

  /** Gourde + tasse près du feu */
  function _buildDrinkSet(parent, x, y, z) {
    const gourde = new THREE.MeshLambertMaterial({ color: 0x6a8070 });
    const cap = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
    _add(parent, new THREE.CylinderGeometry(0.06, 0.07, 0.22, 8), gourde, x, y + 0.11, z);
    _add(parent, new THREE.CylinderGeometry(0.035, 0.035, 0.05, 6), cap, x, y + 0.245, z);
    _add(parent, new THREE.CylinderGeometry(0.045, 0.038, 0.07, 8),
      new THREE.MeshLambertMaterial({ color: 0x5a4030 }), x + 0.18, y + 0.035, z + 0.05);
  }

  function _buildLantern(parent, x, y, z, color) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    _add(g, new THREE.CylinderGeometry(0.06, 0.08, 0.38, 8),
      new THREE.MeshLambertMaterial({ color: 0x6a8070 }), 0, 0.19, 0);
    _add(g, new THREE.BoxGeometry(0.16, 0.18, 0.16),
      new THREE.MeshLambertMaterial({ color: color || 0xd8c57a, emissive: 0x2b2108, emissiveIntensity: 0.25 }), 0, 0.34, 0);
    const light = new THREE.PointLight(color || 0xffda7d, 0.35, 5, 2);
    light.position.set(0, 0.42, 0);
    g.add(light);
  }

  function _buildStone(parent, x, y, z, r, rotY) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY || 0;
    parent.add(g);
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(r || 0.16, 0),
      new THREE.MeshLambertMaterial({ color: 0x7a7468 })
    );
    rock.position.y = (r || 0.16) * 0.7;
    rock.rotation.set(0.25, 0.4, -0.18);
    rock.castShadow = true;
    rock.receiveShadow = true;
    g.add(rock);
  }

  function _buildWorkbench(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const woodMat = M ? M.wood(0xd9a36b) : new THREE.MeshLambertMaterial({ color: 0xd9a36b });
    const darkWoodMat = M ? M.woodDark(0xa16b3f) : new THREE.MeshLambertMaterial({ color: 0xa16b3f });
    const toolMat = M ? M.tool() : new THREE.MeshLambertMaterial({ color: 0x5f6d46 });
    const metalMat = M ? M.metal() : new THREE.MeshLambertMaterial({ color: 0x7d7f84 });

    _add(g, new THREE.BoxGeometry(1.8, 0.1, 0.82), woodMat, 0, 0.88, 0);
    _add(g, new THREE.BoxGeometry(1.64, 0.06, 0.24), darkWoodMat, 0, 0.46, 0.2);
    for (const [px, pz] of [
      [-0.8, -0.32], [0.8, -0.32], [-0.8, 0.32], [0.8, 0.32],
    ]) {
      _add(g, new THREE.CylinderGeometry(0.06, 0.07, 0.84, 6), darkWoodMat, px, 0.42, pz);
    }
    _add(g, new THREE.BoxGeometry(1.54, 0.06, 0.08), darkWoodMat, 0, 0.64, -0.3);
    _add(g, new THREE.BoxGeometry(0.08, 0.48, 0.06), darkWoodMat, -0.68, 0.72, -0.34);
    _add(g, new THREE.BoxGeometry(0.08, 0.48, 0.06), darkWoodMat, 0.68, 0.72, -0.34);
    _add(g, new THREE.BoxGeometry(0.72, 0.08, 0.16), toolMat, -0.22, 0.96, -0.08, 0, -0.2, 0.18);
    _add(g, new THREE.BoxGeometry(0.54, 0.08, 0.14), toolMat, 0.26, 0.94, 0.1, 0, 0.25, -0.12);
    _add(g, new THREE.BoxGeometry(0.14, 0.06, 0.42), metalMat, -0.54, 0.98, 0.12, 0.16, 0.18, 0);
    _add(g, new THREE.BoxGeometry(0.1, 0.22, 0.1), metalMat, 0.58, 1.02, -0.16);
  }

  /** Small lean-to so the camp reads as an actual shelter in wide shots. */
  function _buildLeanToShelter(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const poleMat = M ? M.woodPole(0xb68753) : new THREE.MeshLambertMaterial({ color: 0x6a4a20 });
    const clothMat = M ? M.canvas(0x4b5d39) : new THREE.MeshLambertMaterial({ color: 0x4b5d39 });
    const ropeMat = M ? M.rope() : new THREE.MeshLambertMaterial({ color: 0x3a2a18 });

    for (const [px, pz] of [
      [-0.95, -0.45],
      [0.95, -0.45],
      [-0.95, 0.55],
      [0.95, 0.55],
    ]) {
      _add(g, new THREE.CylinderGeometry(0.06, 0.08, 1.6, 6), poleMat, px, 0.8, pz);
    }

    _add(g, new THREE.CylinderGeometry(0.05, 0.05, 2.1, 6), ropeMat, 0, 1.55, -0.15, 0, 0, Math.PI / 2);

    const roofA = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.10, 0.95), clothMat);
    roofA.position.set(0, 1.2, -0.05);
    roofA.rotation.z = -0.18;
    roofA.castShadow = roofA.receiveShadow = true;
    g.add(roofA);

    const roofB = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.10, 0.58), clothMat);
    roofB.position.set(0, 0.9, 0.20);
    roofB.rotation.z = 0.12;
    roofB.castShadow = roofB.receiveShadow = true;
    g.add(roofB);

    const flap = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.62, 0.06),
      M ? M.canvas(0x5b6f47) : new THREE.MeshLambertMaterial({ color: 0x5b6f47 })
    );
    flap.position.set(0.02, 0.86, 0.55);
    flap.rotation.x = 0.08;
    flap.castShadow = flap.receiveShadow = true;
    g.add(flap);
  }

  /** Vertical marker that stays readable from far away. */
  function _buildMarkerPole(parent, x, y, z, side) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);

    const poleMat = M ? M.woodPole(0x6b4a20) : new THREE.MeshLambertMaterial({ color: 0x6b4a20 });
    const flagMat = new THREE.MeshLambertMaterial({
      color: side < 0 ? 0xd7c24a : 0xb86235,
      emissive: side < 0 ? 0x251e08 : 0x240f08,
      emissiveIntensity: 0.18,
    });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffc56d });

    _add(g, new THREE.CylinderGeometry(0.07, 0.09, 4.2, 6), poleMat, 0, 2.1, 0);
    _add(g, new THREE.BoxGeometry(0.95, 0.06, 0.06), poleMat, side * 0.32, 3.92, 0);

    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.74, 0.05), flagMat);
    flag.position.set(side * 0.72, 3.62, 0);
    flag.rotation.z = side * 0.08;
    flag.castShadow = flag.receiveShadow = true;
    g.add(flag);

    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), lampMat);
    lamp.position.set(side * 0.92, 3.84, 0.02);
    g.add(lamp);

    const light = new THREE.PointLight(0xffc46a, 0.55, 8, 2);
    light.position.set(side * 0.92, 3.84, 0.02);
    g.add(light);
  }

  /** Lisière de rondins + pierres — jointure douce clairière / herbe */
  function buildCampGround(scene, cx, cz, baseY, B) {
    const M = _campMats();
    const bark = M ? M.bark() : new THREE.MeshLambertMaterial({ color: 0x4a3018 });
    const stone = M ? M.stone() : new THREE.MeshLambertMaterial({ color: 0x6a6458 });
    const segs = 28;
    const gapCenter = -Math.PI / 2;
    const gapWidth = 0.62;

    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      let da = a - gapCenter;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) < gapWidth) continue;

      const rx = CLEAR_RX * 0.94;
      const rz = CLEAR_RZ * 0.94;
      const px = cx + Math.cos(a) * rx;
      const pz = cz + Math.sin(a) * rz;
      const py = ZS.getTerrainHeight(px, pz);
      const logLen = 0.55 + (i % 3) * 0.08;
      const logR = 0.07 + (i % 2) * 0.015;

      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(logR * 0.9, logR, logLen, 6), bark);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = a + Math.PI / 2;
      log.position.set(px, py + logR + 0.02, pz);
      log.castShadow = true;
      scene.add(log);

      if (i % 4 === 0) {
        const sx = cx + Math.cos(a) * (rx + 0.35);
        const sz = cz + Math.sin(a) * (rz + 0.35);
        const sy = ZS.getTerrainHeight(sx, sz);
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.12 + (i % 2) * 0.04, 0), stone);
        rock.position.set(sx, sy + 0.08, sz);
        rock.rotation.set(i * 0.3, i * 0.5, 0);
        rock.castShadow = true;
        scene.add(rock);
      }
    }

  }

  const DECOR_PREFABS = {
    spawn_campfire: {
      build(root) {
        if (ZS.buildCampfire) ZS.buildCampfire(root, 0, 0, 0);
      },
    },
    spawn_log_pile: { build(root) { _buildLogPile(root, 0, 0, 0); } },
    spawn_supply_crate: { build(root) { _buildCrate(root, 0, 0, 0, 0); } },
    spawn_marker_left: { build(root) { _buildMarkerPole(root, 0, 0, 0, -1); } },
    spawn_marker_right: { build(root) { _buildMarkerPole(root, 0, 0, 0, 1); } },
    spawn_bedroll: { build(root) { _buildBedroll(root, 0, 0, 0, 0); } },
    spawn_backpack: { build(root) { _buildBackpack(root, 0, 0, 0, 0); } },
    spawn_lean_to: { build(root) { _buildLeanToShelter(root, 0, 0, 0, 0); } },
    spawn_stump_seat: { build(root) { _buildStumpSeat(root, 0, 0, 0, 0.20, 0); } },
    spawn_drink_set: { build(root) { _buildDrinkSet(root, 0, 0, 0); } },
    spawn_lantern: { build(root) { _buildLantern(root, 0, 0, 0); } },
    spawn_stone: { build(root) { _buildStone(root, 0, 0, 0, 0.16, 0); } },
    spawn_workbench: { build(root) { _buildWorkbench(root, 0, 0, 0, 0); } },
    spawn_flat_stone: {
      build(root) {
        _add(root, new THREE.BoxGeometry(0.28, 0.06, 0.22),
          new THREE.MeshLambertMaterial({ color: 0x7a7468 }), 0, 0.05, 0);
      },
    },
  };

  function listDecorPrefabs() {
    return Object.keys(DECOR_PREFABS);
  }

  function _registerDecorCollision(decorId, spec) {
    if (!decorId || !ZS.registerDecorColliders || !ZS.buildDecorColliders) return;
    ZS.registerDecorColliders(decorId, ZS.buildDecorColliders(spec));
  }

  function spawnDecorPrefab(scene, prefabId, x, y, z, opts = {}) {
    const prefab = DECOR_PREFABS[prefabId];
    if (!scene || !prefab) return null;
    const groundedY = opts.grounded !== false && ZS.getTerrainHeight
      ? ZS.getTerrainHeight(x || 0, z || 0) + (Number.isFinite(opts.groundLift) ? opts.groundLift : 0)
      : (y || 0);
    const root = new THREE.Group();
    root.position.set(x || 0, groundedY, z || 0);
    root.rotation.set(opts.rotX || 0, opts.rotY || 0, opts.rotZ || 0);
    const s = Number.isFinite(opts.scale) ? opts.scale : 1;
    root.scale.setScalar(s);
    root.userData.prefabId = prefabId;

    const decorId = opts.decorId || `static_${prefabId}_${(x || 0).toFixed(1)}_${(z || 0).toFixed(1)}`;
    root.userData.decorId = decorId;
    if (opts.collide !== false) {
      _registerDecorCollision(decorId, {
        decorId,
        kind: 'prefab',
        prefabId,
        x: x || 0,
        z: z || 0,
        baseY: groundedY,
        rotY: opts.rotY || 0,
        scale: s,
      });
    }

    scene.add(root);
    prefab.build(root, opts);
    return root;
  }

  /**
   * Camp de spawn complet — zones lisibles :
   *   centre = feu (campfire.js)
   *   sud (-Z) = pile de bois (vers le sentier)
   *   est    = caisse de ravitaillement
   *   ouest  = couchage (sac + bedroll)
   *   nord (+Z) = 2 souches assises
   */
  function buildCampLayout(scene, cx, cz, baseY, B) {

    // ── Sud-est : réserve de bois (hors sentier) ─────────────────────────────
    spawnDecorPrefab(scene, 'spawn_log_pile', cx + 1.85, baseY + 0.02, cz - 1.65);

    // ── Est : caisse de ravitaillement ───────────────────────────────────────
    spawnDecorPrefab(scene, 'spawn_supply_crate', cx + 2.25, baseY, cz + 0.25, { rotY: -0.45 });
    spawnDecorPrefab(scene, 'spawn_marker_right', cx + 1.7, baseY, cz + 0.9);

    // ── Ouest : zone nuit ───────────────────────────────────────────────────
    spawnDecorPrefab(scene, 'spawn_bedroll', cx - 2.05, baseY, cz - 0.15, { rotY: 0.35 });
    spawnDecorPrefab(scene, 'spawn_backpack', cx - 1.55, baseY, cz + 0.55, { rotY: 0.6 });
    spawnDecorPrefab(scene, 'spawn_lean_to', cx - 1.95, baseY + 0.02, cz + 0.05, { rotY: 0.18 });
    spawnDecorPrefab(scene, 'spawn_marker_left', cx - 2.75, baseY, cz + 0.25);

    // ── Nord (derrière le feu) : assises ─────────────────────────────────────
    spawnDecorPrefab(scene, 'spawn_stump_seat', cx - 0.85, baseY, cz + 1.55);
    spawnDecorPrefab(scene, 'spawn_stump_seat', cx + 0.85, baseY, cz + 1.55);
    spawnDecorPrefab(scene, 'spawn_marker_left', cx - 0.25, baseY, cz + 2.35);
    spawnDecorPrefab(scene, 'spawn_marker_right', cx + 0.35, baseY, cz + 2.35);

    // ── Côté feu : gourde sur pierre plate ───────────────────────────────────
    spawnDecorPrefab(scene, 'spawn_flat_stone', cx + 1.05, baseY, cz - 0.45);
    spawnDecorPrefab(scene, 'spawn_drink_set', cx + 1.05, baseY + 0.08, cz - 0.45);

  }

  /** Herbes en lisière uniquement (rien de confus dans le camp) */
  function buildCampProps(scene, cx, cz, baseY, B) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 4.8 + (i % 3) * 0.25;
      const px = cx + Math.cos(a) * r;
      const pz = cz + Math.sin(a) * r;
      if (_onPath(px, pz)) continue;
      const py = ZS.getTerrainHeight(px, pz);
      const tuft = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.15, 4),
        new THREE.MeshLambertMaterial({ color: i % 2 ? 0x3a6828 : 0x4a7830 })
      );
      tuft.position.set(px, py + 0.06, pz);
      tuft.rotation.y = a;
      scene.add(tuft);
    }
  }

  /** Alias regroupé pour le secteur spawn */
  function buildSpawnCamp(scene, cx, cz, baseY, B) {
    buildCampGround(scene, cx, cz, baseY, B);
    buildCampLayout(scene, cx, cz, baseY, B);
    buildCampProps(scene, cx, cz, baseY, B);
  }

  /** Points du sentier spawn → route goudronnée (14, -18) */
  function _onPath(x, z) {
    if (ZS.isNearRoad) return ZS.isNearRoad(x, z, 0.2);
    const pts = ZS.SPAWN_TRAIL_PTS || [];
    const margin = 1.4;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      const dx = x1 - x0, dz = z1 - z0;
      const len2 = dx * dx + dz * dz;
      if (len2 < 0.0001) continue;
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2));
      const px = x0 + dx * t, pz = z0 + dz * t;
      if (Math.hypot(x - px, z - pz) < margin) return true;
    }
    return false;
  }

  function _samplePath(t, pts) {
    if (ZS.RoadNetwork && ZS.RoadNetwork.sampleAlong) {
      const s = ZS.RoadNetwork.sampleAlong('spawn_trail', t);
      if (s) return s;
    }
    return _pointAlongPath(pts, t);
  }

  function _pointAlongPath(pts, t) {
    let total = 0;
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = pts[i + 1][0] - pts[i][0];
      const dz = pts[i + 1][1] - pts[i][1];
      const l = Math.hypot(dx, dz);
      segs.push({ ax: pts[i][0], az: pts[i][1], dx, dz, l });
      total += l;
    }
    let dist = t * total;
    for (const s of segs) {
      if (dist <= s.l || s === segs[segs.length - 1]) {
        const f = s.l > 0 ? Math.min(1, dist / s.l) : 0;
        return {
          x: s.ax + s.dx * f,
          z: s.az + s.dz * f,
          ux: s.l > 0 ? s.dx / s.l : 0,
          uz: s.l > 0 ? s.dz / s.l : 1,
        };
      }
      dist -= s.l;
    }
    const last = pts[pts.length - 1];
    return { x: last[0], z: last[1], ux: 0, uz: 1 };
  }

  /** Rochers, buissons et fleurs en lisière de clairière */
  function buildClearingRing(scene, cx, cz, B) {
    const rr = _rng(0x5a0417 ^ ((cx * 7) | 0) ^ ((cz * 13) | 0));
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMats = [0x7a7068, 0x6a6458, 0x848078, 0x5a5248]
      .map(c => new THREE.MeshLambertMaterial({ color: c }));
    const rockBuckets = rockMats.map(() => []);

    const bushGeo = new THREE.SphereGeometry(1, 5, 4);
    const bushMats = [0x2d5a25, 0x3a6530, 0x4a5828].map(c => new THREE.MeshLambertMaterial({ color: c }));
    const bushBuckets = bushMats.map(() => []);

    const flowerColors = [0xe8c840, 0xd86888, 0xf0f0f0, 0xc878d8];
    const flowerGeo = new THREE.SphereGeometry(1, 4, 3);
    const flowerBuckets = flowerColors.map(c => {
      const m = new THREE.MeshLambertMaterial({ color: c });
      return { mat: m, list: [] };
    });

    const logMat = new THREE.MeshLambertMaterial({ color: 0x4a3018 });
    const logs = [];

    for (let i = 0; i < 52; i++) {
      const a = rr() * Math.PI * 2;
      const dist = 6.2 + rr() * 8.5;
      const x = cx + Math.cos(a) * dist * (CLEAR_RX / 5.5);
      const z = cz + Math.sin(a) * dist * (CLEAR_RZ / 5.5);
      if (_inCamp(x, z, cx, cz) || _onPath(x, z)) continue;

      const roll = rr();
      const y = ZS.getTerrainHeight(x, z);

      if (roll < 0.28) {
        const s = 0.14 + rr() * 0.28;
        rockBuckets[Math.floor(rr() * rockBuckets.length)].push({
          x, y: y + s * 0.25, z, s,
          rx: rr(), ry: rr(), rz: rr(),
        });
      } else if (roll < 0.58) {
        const r = 0.22 + rr() * 0.38;
        bushBuckets[Math.floor(rr() * bushBuckets.length)].push({
          x, y: y + r * 0.3, z, r,
          sx: 1 + rr() * 0.4, sy: 0.5 + rr() * 0.35, sz: 1 + rr() * 0.35,
        });
      } else if (roll < 0.82) {
        const r = 0.06 + rr() * 0.05;
        const fb = flowerBuckets[Math.floor(rr() * flowerBuckets.length)];
        fb.list.push({ x, y: y + 0.12, z, r, stem: y });
      } else {
        logs.push({
          x, z, y,
          len: 0.7 + rr() * 0.9,
          r: 0.06 + rr() * 0.03,
          ry: rr() * Math.PI,
        });
      }
    }

    const dummy = new THREE.Object3D();
    for (let mi = 0; mi < rockMats.length; mi++) {
      const list = rockBuckets[mi];
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(rockGeo, rockMats[mi], list.length);
      im.castShadow = im.receiveShadow = true;
      for (let k = 0; k < list.length; k++) {
        const r = list[k];
        dummy.position.set(r.x, r.y, r.z);
        dummy.rotation.set(r.rx, r.ry, r.rz);
        dummy.scale.setScalar(r.s);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }

    for (let mi = 0; mi < bushMats.length; mi++) {
      const list = bushBuckets[mi];
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(bushGeo, bushMats[mi], list.length);
      im.castShadow = true;
      for (let k = 0; k < list.length; k++) {
        const bush = list[k];
        dummy.position.set(bush.x, bush.y, bush.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(bush.r * bush.sx, bush.r * bush.sy, bush.r * bush.sz);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }

    for (const fb of flowerBuckets) {
      if (!fb.list.length) continue;
      const im = new THREE.InstancedMesh(flowerGeo, fb.mat, fb.list.length);
      for (let k = 0; k < fb.list.length; k++) {
        const f = fb.list[k];
        dummy.position.set(f.x, f.y, f.z);
        dummy.scale.setScalar(f.r);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }

    for (const lg of logs) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(lg.r * 0.9, lg.r, lg.len, 6), logMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = lg.ry;
      log.position.set(lg.x, lg.y + lg.r, lg.z);
      log.castShadow = true;
      scene.add(log);
    }

    // Souches décoratives loin du camp spawn (évite doublons avec les assises)
    const stumpMat = new THREE.MeshLambertMaterial({ color: 0x5a3818 });
    for (const [sx, sz, sr] of [[-4.5, 3.0, 0.20], [4.2, -3.5, 0.18], [-3.8, -4.2, 0.19]]) {
      const sy = ZS.getTerrainHeight(cx + sx, cz + sz);
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(sr * 0.8, sr, 0.28, 7), stumpMat);
      stump.position.set(cx + sx, sy + 0.14, cz + sz);
      stump.castShadow = true;
      scene.add(stump);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(sr * 0.75, sr * 0.75, 0.04, 7),
        new THREE.MeshLambertMaterial({ color: 0x3a2510 }));
      top.position.set(cx + sx, sy + 0.29, cz + sz);
      scene.add(top);
    }
  }

  /** Sentier spawn → route : pierres bordure, lanterne, panneau */
  function buildSpawnTrail(scene, pts, B) {
    const rr = _rng(0x0a7001);
    const postMat = new THREE.MeshLambertMaterial({ color: 0x4a3020 });
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x7a7468 });

    // ── Pierres en bordure alternées (délimitent le sentier) ───────────────────
    const stoneGeo = new THREE.BoxGeometry(0.12, 0.04, 0.09);
    for (let t = 0.04; t < 0.92; t += 0.11) {
      const p = _samplePath(t, pts);
      const side = (Math.floor(t * 24) % 2 === 0) ? 1 : -1;
      const px = p.x + (-p.uz) * side * 1.25;
      const pz = p.z + p.ux * side * 1.25;
      const py = ZS.getTerrainHeight(px, pz);
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(px, py + 0.03, pz);
      stone.rotation.y = Math.atan2(p.ux, p.uz) + rr() * 0.25;
      stone.castShadow = true;
      scene.add(stone);
    }

    // ── Lanterne au milieu du sentier (bord du chemin) ────────────────────────
    const mid = _samplePath(0.48, pts);
    const my = ZS.getTerrainHeight(mid.x, mid.z);
    const mnx = -mid.uz, mnz = mid.ux;
    const lx = mid.x + mnx * 1.45, lz = mid.z + mnz * 1.45;
    const ly = ZS.getTerrainHeight(lx, lz);
    const mPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 1.25, 6), postMat);
    mPost.position.set(lx, ly + 0.62, lz);
    mPost.castShadow = true;
    scene.add(mPost);
    const lampMat = new THREE.MeshLambertMaterial({
      color: 0xffcc66, emissive: 0xff9922, emissiveIntensity: 0.75,
    });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.18), lampMat);
    lamp.position.set(lx, ly + 1.28, lz);
    scene.add(lamp);
    const lampLight = new THREE.PointLight(0xffaa55, 0.55, 10, 2);
    lampLight.position.set(lx, ly + 1.35, lz);
    scene.add(lampLight);

    // ── Panneau « Ville » à côté de l'ouverture (hors chaussée) ───────────────
    const end = _samplePath(0.96, pts);
    const sx = end.x + 3.2, sz = end.z + 0.8;
    const sy = ZS.getTerrainHeight(sx, sz);
    const jPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6), postMat);
    jPost.position.set(sx, sy + 0.7, sz);
    jPost.castShadow = true;
    scene.add(jPost);
    const signMat = new THREE.MeshLambertMaterial({ color: 0x3a5a28 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.4, 0.04), signMat);
    board.position.set(sx, sy + 1.28, sz);
    board.rotation.y = -0.35;
    scene.add(board);
    const arrow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04),
      new THREE.MeshLambertMaterial({ color: 0xc8b878 }));
    arrow.position.set(sx - 0.22, sy + 1.3, sz - 0.12);
    arrow.rotation.y = -Math.PI / 2;
    scene.add(arrow);
  }

  /** @deprecated alias */
  function buildClearingExit(scene, cx, ez, B) {
    buildSpawnTrail(scene, SPAWN_TRAIL_PTS, B);
  }

  window.ZS = window.ZS || {};
  ZS.buildClearingRing  = buildClearingRing;
  ZS.buildSpawnTrail     = buildSpawnTrail;
  ZS.buildClearingExit   = buildClearingExit;
  ZS.SPAWN_TRAIL_PTS     = SPAWN_TRAIL_PTS;
  ZS.buildCampGround    = buildCampGround;
  ZS.buildCampLayout    = buildCampLayout;
  ZS.buildCampProps     = buildCampProps;
  ZS.buildSpawnCamp     = buildSpawnCamp;
  ZS.spawnDecorPrefab   = spawnDecorPrefab;
  ZS.listDecorPrefabs   = listDecorPrefabs;
}());
