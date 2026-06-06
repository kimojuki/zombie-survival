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

  /** Ellipse spawn : angle a → offset shape Three.js (rotateX -90° → monde XZ). */
  function _shapeEllipsePoint(a, rx, rz) {
    return new THREE.Vector2(Math.cos(a) * rx, -Math.sin(a) * rz);
  }

  function _ellipseWorld(a, rx, rz, cx, cz) {
    return [cx + Math.cos(a) * rx, cz + Math.sin(a) * rz];
  }

  /** Tangente à l'ellipse au paramètre a (axe du rondin). */
  function _ellipseTangentYaw(a, rx, rz) {
    return Math.atan2(-rx * Math.sin(a), rz * Math.cos(a));
  }

  function _pointInTriangle(px, pz, ax, az, bx, bz, cx, cz) {
    const v0x = cx - ax; const v0z = cz - az;
    const v1x = bx - ax; const v1z = bz - az;
    const v2x = px - ax; const v2z = pz - az;
    const dot00 = v0x * v0x + v0z * v0z;
    const dot01 = v0x * v1x + v0z * v1z;
    const dot02 = v0x * v2x + v0z * v2z;
    const dot11 = v1x * v1x + v1z * v1z;
    const dot12 = v1x * v2x + v1z * v2z;
    const inv = dot00 * dot11 - dot01 * dot01;
    if (Math.abs(inv) < 1e-8) return false;
    const u = (dot11 * dot02 - dot01 * dot12) / inv;
    const v = (dot00 * dot12 - dot01 * dot02) / inv;
    return u >= -0.02 && v >= -0.02 && (u + v) <= 1.02;
  }

  function _ellipseArcLength(rx, rz, a0, a1, steps) {
    let len = 0;
    let px = null; let pz = null;
    const n = steps || 80;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (a1 - a0);
      const x = rx * Math.cos(a);
      const z = rz * Math.sin(a);
      if (px !== null) len += Math.hypot(x - px, z - pz);
      px = x; pz = z;
    }
    return len;
  }

  function _gapTongueTip(cx, cz, rx, rz) {
    return [cx, cz + Math.sin(CAMP_GAP_CENTER) * rz * 1.05];
  }

  function _inGapTongue(x, z, cx, cz) {
    const rx = CLEAR_RX * 0.98;
    const rz = CLEAR_RZ * 0.98;
    const aL = CAMP_GAP_CENTER + CAMP_GAP_WIDTH;
    const aR = CAMP_GAP_CENTER - CAMP_GAP_WIDTH;
    const [xL, zL] = _ellipseWorld(aL, rx, rz, cx, cz);
    const [xR, zR] = _ellipseWorld(aR, rx, rz, cx, cz);
    const [xT, zT] = _gapTongueTip(cx, cz, rx, rz);
    return _pointInTriangle(x, z, xL, zL, xR, zR, xT, zT);
  }

  function _orientLogTangent(log, x, y, z, yaw) {
    log.position.set(x, y, z);
    log.rotation.order = 'YXZ';
    log.rotation.y = yaw;
    log.rotation.x = Math.PI / 2;
    log.rotation.z = 0;
  }

  const CAMP_GAP_CENTER = -Math.PI / 2;
  const CAMP_GAP_WIDTH = 0.52;
  const CAMP_GROUND_LIFT = 0.07;
  const TRAIL_SURFACE_LIFT = 0.08;

  /** Zone couverte par le mesh sol camp (ellipse + languette sud vers le sentier). */
  function _onCampGroundPatch(x, z, cx, cz) {
    if (_inGapTongue(x, z, cx, cz)) return true;
    const rx = CLEAR_RX * 0.98;
    const rz = CLEAR_RZ * 0.98;
    const dx = (x - cx) / rx;
    const dz = (z - cz) / rz;
    if (Math.hypot(dx, dz) > 1.0) return false;
    const a = Math.atan2(z - cz, x - cx);
    let da = a - CAMP_GAP_CENTER;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    return Math.abs(da) >= CAMP_GAP_WIDTH;
  }

  /** Relèvement décor au-dessus du terrain brut (couche 2 camp, sentier, etc.). */
  function getDecorSurfaceLift(x, z) {
    if (_onCampGroundPatch(x, z, SPAWN_CX, SPAWN_CZ)) return CAMP_GROUND_LIFT;
    if (ZS.Trails?.isNear && ZS.SPAWN_TRAIL_PTS
        && ZS.Trails.isNear(ZS.SPAWN_TRAIL_PTS, x, z, 0.75)) {
      return TRAIL_SURFACE_LIFT;
    }
    return 0;
  }

  /**
   * Hauteur de pose props / items / joueur : terrain (couche 1) + surface décor.
   * opts.groundLift = offset local au-dessus de la surface (ex. y serveur RCON).
   */
  function getDecorGroundHeight(x, z, opts) {
    opts = opts || {};
    const base = ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0;
    const surface = opts.layer === 'terrain' ? 0 : getDecorSurfaceLift(x, z);
    const lift = Number.isFinite(opts.groundLift) ? opts.groundLift : 0;
    return base + surface + lift;
  }

  /** Bouche sud du sentier (languette camp) — tracé complet généré dans proc_roads.js */
  function getSpawnTrailMouth() {
    const rx = CLEAR_RX * 0.98;
    const rz = CLEAR_RZ * 0.98;
    return _gapTongueTip(SPAWN_CX, SPAWN_CZ, rx, rz);
  }

  function _spawnTrailPoints() {
    const [mx, mz] = getSpawnTrailMouth();
    return [[mx, mz], [mx - 1, mz - 4], [mx - 4, mz - 10]];
  }

  const SPAWN_TRAIL_PTS = _spawnTrailPoints();

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

  /** Premier prefab bâtiment RCON : cabane simple, procédurale et réutilisable. */
  function _buildSurvivorShack(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const trimMat = M ? M.woodDark(0x5a371d) : new THREE.MeshLambertMaterial({ color: 0x5a371d });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x30353a });
    const floorMat = M ? M.woodFine(0x8a5f35) : new THREE.MeshLambertMaterial({ color: 0x8a5f35 });
    const clothMat = M ? M.canvas(0x4b5d39) : new THREE.MeshLambertMaterial({ color: 0x4b5d39 });

    _add(g, new THREE.BoxGeometry(5.25, 0.12, 4.25), floorMat, 0, 0.06, 0);

    // Murs, avec ouverture de porte côté -Z.
    _add(g, new THREE.BoxGeometry(5.25, 2.55, 0.18), wallMat, 0, 1.32, 2.04);
    _add(g, new THREE.BoxGeometry(0.18, 2.55, 4.15), wallMat, -2.54, 1.32, 0);
    _add(g, new THREE.BoxGeometry(0.18, 2.55, 4.15), wallMat, 2.54, 1.32, 0);
    _add(g, new THREE.BoxGeometry(1.98, 2.55, 0.18), wallMat, -1.61, 1.32, -2.04);
    _add(g, new THREE.BoxGeometry(1.98, 2.55, 0.18), wallMat, 1.61, 1.32, -2.04);
    _add(g, new THREE.BoxGeometry(1.28, 0.42, 0.2), trimMat, 0, 2.36, -2.04);

    // Renforts lisibles sur les murs.
    for (const sx of [-2.64, 2.64]) {
      for (const pz of [-1.2, 0, 1.2]) {
        _add(g, new THREE.BoxGeometry(0.08, 2.62, 0.09), trimMat, sx, 1.34, pz);
      }
    }
    for (const px of [-1.9, 0, 1.9]) {
      _add(g, new THREE.BoxGeometry(0.09, 2.62, 0.08), trimMat, px, 1.34, 2.16);
    }
    _add(g, new THREE.BoxGeometry(0.1, 2.2, 0.08), trimMat, -2.05, 1.16, -2.16);
    _add(g, new THREE.BoxGeometry(0.1, 2.2, 0.08), trimMat, 2.05, 1.16, -2.16);

    const doorPivot = new THREE.Group();
    doorPivot.name = 'survivorShackDoorPivot';
    doorPivot.position.set(-0.46, 0.08, -2.18);
    doorPivot.userData.isDoor = true;
    g.add(doorPivot);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.82, 0.12), trimMat);
    door.name = 'survivorShackDoor';
    door.position.set(0.46, 0.91, 0);
    door.castShadow = door.receiveShadow = true;
    doorPivot.add(door);
    const handleMat = new THREE.MeshLambertMaterial({ color: 0xb99b52 });
    _add(doorPivot, new THREE.BoxGeometry(0.08, 0.08, 0.08), handleMat, 0.82, 0.96, -0.08);

    const windowMat = new THREE.MeshLambertMaterial({
      color: 0x93b7c4,
      emissive: 0x0b1a20,
      emissiveIntensity: 0.18,
    });
    _add(g, new THREE.BoxGeometry(0.74, 0.55, 0.08), windowMat, -2.64, 1.55, 0.62);
    _add(g, new THREE.BoxGeometry(0.74, 0.08, 0.11), trimMat, -2.66, 1.86, 0.62);
    _add(g, new THREE.BoxGeometry(0.74, 0.08, 0.11), trimMat, -2.66, 1.24, 0.62);
    _add(g, new THREE.BoxGeometry(0.08, 0.62, 0.11), trimMat, -2.66, 1.55, 0.62);

    // Toit à deux pans — ridge le long de X, pente en Z (rotations opposées corrigées).
    const halfRun = 2.45;
    const rise = 0.93;
    const pitch = Math.atan2(rise, halfRun);
    const eaveY = 2.62;
    const ridgeY = eaveY + rise;
    const panelCY = eaveY + rise * 0.5;
    const roofW = 5.88;
    const roofThick = 0.16;
    const panelLen = halfRun + 0.12;

    const northRoof = new THREE.Mesh(new THREE.BoxGeometry(roofW, roofThick, panelLen), roofMat);
    northRoof.position.set(0, panelCY, -halfRun * 0.5);
    northRoof.rotation.x = -pitch;
    northRoof.castShadow = northRoof.receiveShadow = true;
    g.add(northRoof);

    const southRoof = new THREE.Mesh(new THREE.BoxGeometry(roofW, roofThick, panelLen), roofMat);
    southRoof.position.set(0, panelCY, halfRun * 0.5);
    southRoof.rotation.x = pitch;
    southRoof.castShadow = southRoof.receiveShadow = true;
    g.add(southRoof);

    _add(g, new THREE.BoxGeometry(roofW + 0.14, 0.14, 0.16), trimMat, 0, ridgeY, 0);

    // Pignons est / ouest (ferment les triangles aux extrémités du faîtage).
    for (const sx of [-1, 1]) {
      const gableGeo = new THREE.BufferGeometry();
      const gx = sx * 2.68;
      gableGeo.setAttribute('position', new THREE.Float32BufferAttribute([
        gx, eaveY, -halfRun - 0.06,
        gx, eaveY, halfRun + 0.06,
        gx, ridgeY, 0,
      ], 3));
      gableGeo.setIndex([0, 1, 2]);
      gableGeo.computeVertexNormals();
      const gable = new THREE.Mesh(gableGeo, roofMat);
      gable.castShadow = gable.receiveShadow = true;
      g.add(gable);
    }

    _add(g, new THREE.BoxGeometry(1.2, 0.08, 0.54), clothMat, -1.15, 0.08, -2.62, 0, 0.12, 0);

    g.userData.doorPivot = doorPivot;
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

  /** Rondin de lisière — un segment ; scale = longueur / 0.42 m */
  function _buildBorderLog(root) {
    const M = _campMats();
    const bark = M ? M.bark() : new THREE.MeshLambertMaterial({ color: 0x4a3018 });
    const baseLen = 0.42;
    const r = 0.055;
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.92, r, baseLen, 6), bark);
    log.rotation.order = 'YXZ';
    log.rotation.y = 0;
    log.rotation.x = Math.PI / 2;
    log.position.set(0, r + 0.015, 0);
    log.castShadow = true;
    log.receiveShadow = true;
    root.add(log);
  }

  /** Lisière de rondins + pierres — jointure douce clairière / herbe */
  function buildCampGround(scene, cx, cz, baseY, B) {
    const M = _campMats();
    const stone = M ? M.stone() : new THREE.MeshLambertMaterial({ color: 0x6a6458 });
    const gapCenter = CAMP_GAP_CENTER;
    const gapWidth = CAMP_GAP_WIDTH;
    const groundRx = CLEAR_RX * 0.98;
    const groundRz = CLEAR_RZ * 0.98;
    const ringRx = CLEAR_RX * 0.94;
    const ringRz = CLEAR_RZ * 0.94;
    const arcStart = gapCenter + gapWidth;
    const arcSpan = Math.PI * 2 - gapWidth * 2;

    const shape = new THREE.Shape();
    const groundSteps = 56;
    for (let i = 0; i <= groundSteps; i++) {
      const a = arcStart + (i / groundSteps) * arcSpan;
      const p = _shapeEllipsePoint(a, groundRx, groundRz);
      if (i === 0) shape.moveTo(p.x, p.y);
      else shape.lineTo(p.x, p.y);
    }
    const tongue = _shapeEllipsePoint(
      CAMP_GAP_CENTER,
      groundRx * 0.38,
      groundRz * 1.05
    );
    shape.lineTo(tongue.x, tongue.y);
    shape.closePath();

    const gGeo = new THREE.ShapeGeometry(shape, 4);
    gGeo.rotateX(-Math.PI / 2);
    const gPos = gGeo.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      const lx = gPos.getX(i);
      const lz = gPos.getZ(i);
      const x = cx + lx;
      const z = cz + lz;
      gPos.setY(i, getDecorGroundHeight(x, z, { layer: 'camp' }));
    }
    gGeo.computeVertexNormals();
    const ground = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({
      map: _groundTex,
      color: 0xffffff,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -10,
    }));
    ground.position.set(cx, 0, cz);
    ground.renderOrder = 3;
    ground.receiveShadow = true;
    scene.add(ground);

    const arcLen = _ellipseArcLength(ringRx, ringRz, arcStart, arcStart + arcSpan);
    const logCount = Math.max(16, Math.round(arcLen / 0.42));
    const rockEvery = Math.max(4, Math.round(logCount / 10));

    for (let i = 0; i < logCount; i += rockEvery) {
      const tMid = (i + 0.5) / logCount;
      const a = arcStart + tMid * arcSpan;
      const [px, pz] = _ellipseWorld(a, ringRx, ringRz, cx, cz);
      const outA = Math.atan2((pz - cz) / ringRz, (px - cx) / ringRx);
      const sx = cx + Math.cos(outA) * (ringRx + 0.28);
      const sz = cz + Math.sin(outA) * (ringRz + 0.28);
      const sy = getDecorGroundHeight(sx, sz, { layer: 'terrain' });
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.10 + (i % 2) * 0.025, 0), stone);
      rock.position.set(sx, sy + 0.06, sz);
      rock.rotation.set(i * 0.25, i * 0.45, 0);
      rock.castShadow = true;
      scene.add(rock);
    }

  }

  const DECOR_DOORS = new Map();

  const DECOR_PREFABS = {
    spawn_campfire: {
      build(root) {
        if (ZS.buildCampfire) ZS.buildCampfire(root, 0, 0, 0);
      },
    },
    spawn_log_pile: { build(root) { _buildLogPile(root, 0, 0, 0); } },
    spawn_border_log: { build(root) { _buildBorderLog(root); } },
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
    building_survivor_shack: { build(root) { _buildSurvivorShack(root, 0, 0, 0, 0); } },
    spawn_flat_stone: {
      build(root) {
        _add(root, new THREE.BoxGeometry(0.28, 0.06, 0.22),
          new THREE.MeshLambertMaterial({ color: 0x7a7468 }), 0, 0.05, 0);
      },
    },
  };

  function registerDecorPrefab(id, def) {
    if (id && def) DECOR_PREFABS[id] = def;
  }

  function listDecorPrefabs() {
    return Object.keys(DECOR_PREFABS);
  }

  function _registerDecorCollision(decorId, spec) {
    if (!decorId || !ZS.registerDecorColliders || !ZS.buildDecorColliders) return;
    ZS.registerDecorColliders(decorId, ZS.buildDecorColliders(spec));
  }

  function _refreshDecorCollision(root) {
    if (!root?.userData?.decorSpec) return;
    if (root.userData.collide === false) return;
    _registerDecorCollision(root.userData.decorSpec.decorId, root.userData.decorSpec);
  }

  function _setDoorVisual(entry, open) {
    if (!entry?.pivot) return false;
    entry.open = !!open;
    entry.root.userData.doorOpen = entry.open;
    entry.root.userData.decorSpec.doorOpen = entry.open;
    entry.pivot.rotation.y = entry.open ? -Math.PI / 2 : 0;
    _refreshDecorCollision(entry.root);
    return true;
  }

  function setDecorDoorState(decorId, open) {
    const entry = DECOR_DOORS.get(decorId);
    if (!entry || !entry.root.parent) return false;
    return _setDoorVisual(entry, !!open);
  }

  function unregisterDecorDoor(decorId) {
    DECOR_DOORS.delete(decorId);
  }

  function findNearestDecorDoor(x, z, maxDist = 2.4) {
    let best = null;
    const pos = new THREE.Vector3();
    for (const [decorId, entry] of DECOR_DOORS) {
      if (!entry.root.parent || !entry.pivot) continue;
      entry.pivot.getWorldPosition(pos);
      const dist = Math.hypot(pos.x - x, pos.z - z);
      if (dist > maxDist) continue;
      if (!best || dist < best.dist) {
        best = { decorId, open: !!entry.open, dist, prefabId: entry.root.userData.prefabId };
      }
    }
    return best;
  }

  function spawnDecorPrefab(scene, prefabId, x, y, z, opts = {}) {
    const prefab = DECOR_PREFABS[prefabId];
    if (!scene || !prefab) return null;
    const isWreck = prefabId.startsWith('wreck_');
    const sink = Number.isFinite(opts.wreckSink) ? opts.wreckSink : 0;
    const groundAt = (px, pz) => (ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(px, pz)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(px, pz) : 0));
    const groundedY = isWreck
      ? groundAt(x || 0, z || 0) - sink
      : (opts.grounded !== false
        ? getDecorGroundHeight(x || 0, z || 0, { groundLift: opts.groundLift })
        : (y || 0));
    const root = new THREE.Group();
    root.position.set(x || 0, groundedY, z || 0);
    root.rotation.set(opts.rotX || 0, opts.rotY || 0, opts.rotZ || 0);
    const s = Number.isFinite(opts.scale) ? opts.scale : 1;
    root.scale.setScalar(s);
    root.userData.prefabId = prefabId;
    root.userData.collide = opts.collide !== false;

    const decorId = opts.decorId || `static_${prefabId}_${(x || 0).toFixed(1)}_${(z || 0).toFixed(1)}`;
    root.userData.decorId = decorId;

    scene.add(root);
    prefab.build(root, opts);

    const decorSpec = {
        decorId,
        kind: 'prefab',
        prefabId,
        x: root.position.x,
        z: root.position.z,
        baseY: root.position.y,
        rotY: root.rotation.y,
        rotZ: root.rotation.z,
        scale: s,
        wreckTilt: isWreck ? root.rotation.z : undefined,
        doorOpen: !!opts.doorOpen,
      };
    root.userData.decorSpec = decorSpec;

    if (root.userData.doorPivot) {
      const entry = {
        root,
        pivot: root.userData.doorPivot,
        open: !!opts.doorOpen,
      };
      DECOR_DOORS.set(decorId, entry);
      _setDoorVisual(entry, !!opts.doorOpen);
    }

    if (opts.collide !== false) {
      _registerDecorCollision(decorId, decorSpec);
    }

    if (prefabId.startsWith('tree_') && ZS.registerChoppableTree) {
      ZS.registerChoppableTree(scene, root, root.position.x, root.position.z, decorId, {
        prefabId,
        woodMax: opts.woodMax,
        woodRemaining: opts.woodRemaining,
      });
    }

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
    if (ZS.Trails?.isNear) return ZS.Trails.isNear(SPAWN_TRAIL_PTS, x, z, 1.15);
    const margin = 1.2;
    for (let i = 0; i < SPAWN_TRAIL_PTS.length - 1; i++) {
      const [x0, z0] = SPAWN_TRAIL_PTS[i];
      const [x1, z1] = SPAWN_TRAIL_PTS[i + 1];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len2 = dx * dx + dz * dz;
      if (len2 < 0.0001) continue;
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2));
      const px = x0 + dx * t;
      const pz = z0 + dz * t;
      if (Math.hypot(x - px, z - pz) < margin) return true;
    }
    return false;
  }

  function _samplePath(t, pts) {
    if (ZS.Trails?.sample) return ZS.Trails.sample(pts || SPAWN_TRAIL_PTS, t);
    return _pointAlongPath(pts || SPAWN_TRAIL_PTS, t);
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
  /** Décor léger le long du sentier (pierres de bordure). */
  function buildSpawnTrailDecor(scene, pts, B) {
    const rr = _rng(0x0a7001);
    const stoneMat = ZS.CampTextures?.materials
      ? ZS.CampTextures.materials().stone()
      : new THREE.MeshLambertMaterial({ color: 0x6a6458 });

    for (let t = 0.12; t < 0.86; t += 0.18) {
      const p = _samplePath(t, pts);
      if (!p) continue;
      const side = (Math.floor(t * 20) % 2 === 0) ? 1 : -1;
      const px = p.x + (-p.uz) * side * 1.15;
      const pz = p.z + p.ux * side * 1.15;
      const py = ZS.getTerrainHeight(px, pz);
      const r = 0.07 + rr() * 0.04;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(r, 0),
        stoneMat
      );
      rock.position.set(px, py + r * 0.55, pz);
      rock.rotation.set(rr() * 0.4, Math.atan2(p.ux, p.uz) + rr() * 0.5, rr() * 0.3);
      rock.castShadow = true;
      scene.add(rock);
    }
  }

  /** Mesh sentier + décor ; jonction RN via RoadNetwork.buildMeshes */
  function buildSpawnTrail(scene, pts, B) {
    const path = pts || SPAWN_TRAIL_PTS;
    if (ZS.Trails?.buildMesh) {
      ZS.Trails.buildMesh(scene, path, {
        width: 1.55,
        taperStart: 0,
        taperEnd: 0,
        skipEnd: 2.2,
        roadBlend: 3.5,
        step: 0.2,
        smooth: true,
      });
    }
    buildSpawnTrailDecor(scene, path, B);
  }

  /** @deprecated alias */
  function buildClearingExit(scene, cx, ez, B) {
    buildSpawnTrail(scene, SPAWN_TRAIL_PTS, B);
  }

  window.ZS = window.ZS || {};
  ZS.buildClearingRing  = buildClearingRing;
  ZS.buildSpawnTrail     = buildSpawnTrail;
  ZS.buildSpawnTrailDecor = buildSpawnTrailDecor;
  ZS.buildClearingExit   = buildClearingExit;
  ZS.SPAWN_TRAIL_PTS     = SPAWN_TRAIL_PTS;
  ZS.getSpawnTrailMouth  = getSpawnTrailMouth;
  ZS.buildCampGround    = buildCampGround;
  ZS.buildCampLayout    = buildCampLayout;
  ZS.buildCampProps     = buildCampProps;
  ZS.buildSpawnCamp     = buildSpawnCamp;
  ZS.spawnDecorPrefab   = spawnDecorPrefab;
  ZS.registerDecorPrefab = registerDecorPrefab;
  ZS.listDecorPrefabs   = listDecorPrefabs;
  ZS.findNearestDecorDoor = findNearestDecorDoor;
  ZS.setDecorDoorState    = setDecorDoorState;
  ZS.unregisterDecorDoor  = unregisterDecorDoor;
  ZS.getDecorGroundHeight = getDecorGroundHeight;
  ZS.getDecorSurfaceLift  = getDecorSurfaceLift;
  ZS.CAMP_GROUND_LIFT     = CAMP_GROUND_LIFT;
  ZS.TRAIL_SURFACE_LIFT   = TRAIL_SURFACE_LIFT;
}());
