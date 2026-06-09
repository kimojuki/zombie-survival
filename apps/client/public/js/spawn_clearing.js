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

  /** Relèvement décor au-dessus du terrain brut (couche 2 camp, sentier, plage, etc.). */
  function getDecorSurfaceLift(x, z) {
    if (ZS.getBeachSurfaceHeight) {
      const sandY = ZS.getBeachSurfaceHeight(x, z);
      if (sandY !== null) {
        const base = ZS.getVisibleTerrainHeight
          ? ZS.getVisibleTerrainHeight(x, z)
          : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
        return Math.max(0, sandY - base);
      }
    }
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
    const lift = Number.isFinite(opts.groundLift) ? opts.groundLift : 0;
    // Construction du mesh camp (pas encore dans la scène) — formule analytique.
    if (opts.layer === 'camp') {
      const base = ZS.getVisibleTerrainHeight
        ? ZS.getVisibleTerrainHeight(x, z)
        : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
      return base + getDecorSurfaceLift(x, z) + lift;
    }
    let h;
    if (ZS.raycastGroundHeight) {
      h = ZS.raycastGroundHeight(x, z);
    } else {
      const base = ZS.getVisibleTerrainHeight
        ? ZS.getVisibleTerrainHeight(x, z)
        : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
      const surface = opts.layer === 'terrain' ? 0 : getDecorSurfaceLift(x, z);
      h = base + surface;
    }
    if (ZS.getBeachSurfaceHeight) {
      const sandY = ZS.getBeachSurfaceHeight(x, z);
      if (sandY !== null && sandY > h) h = sandY;
    }
    return h + lift;
  }

  /** Bouche sud du sentier (languette camp) — tracé complet généré dans proc_roads.js */
  function getSpawnTrailMouth() {
    const rx = CLEAR_RX * 0.98;
    const rz = CLEAR_RZ * 0.98;
    return _gapTongueTip(SPAWN_CX, SPAWN_CZ, rx, rz);
  }

  function _spawnTrailPoints() {
    return (ZS.BEACH_TRAIL_PTS || [
      [242, -8], [215, -8], [175, -7], [130, -6], [85, -6],
      [45, -6], [0, -6], [14, -18],
    ]).map((p) => p.slice());
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
    g.userData.boulderVisual = g;
    parent.userData.boulderVisual = g;
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
  /** Pièce 2/7. Miroir packages/shared/src/survivor-shack-wall-north.mjs */
  function _buildSurvivorShackWallNorth(g) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const W = 5.25;
    const H = 2.55;
    const T = 0.18;
    const CY = 1.32;
    const Z = 2.04;
    _add(g, new THREE.BoxGeometry(W, H, T), wallMat, 0, CY, Z);
  }

  /** Pièce 4/7. Miroir packages/shared/src/survivor-shack-wall-west.mjs */
  function _buildSurvivorShackWallWest(g) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const T = 0.18;
    const H = 2.55;
    const D = 4.15;
    const CY = 1.32;
    const X = -2.54;
    _add(g, new THREE.BoxGeometry(T, H, D), wallMat, X, CY, 0);
  }

  /** Pièce 5/7. Miroir packages/shared/src/survivor-shack-wall-east.mjs */
  function _buildSurvivorShackWallEast(g) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const T = 0.18;
    const H = 2.55;
    const D = 4.15;
    const CY = 1.32;
    const X = 2.54;
    _add(g, new THREE.BoxGeometry(T, H, D), wallMat, X, CY, 0);
  }

  /** Pièce 6/7. Miroir packages/shared/src/survivor-shack-door.mjs */
  function _buildSurvivorShackDoor(g) {
    const M = _campMats();
    const trimMat = M ? M.woodDark(0x5a371d) : new THREE.MeshLambertMaterial({ color: 0x5a371d });
    const DOOR_W = 1.24;
    const DOOR_H = 2.02;
    const DOOR_D = 0.14;
    const DOOR_HX = DOOR_W * 0.5;
    const PIVOT_X = -DOOR_HX + 0.02;
    const PIVOT_Y = 0.08;
    const PIVOT_Z = -2.10;

    _add(g, new THREE.BoxGeometry(1.28, 0.42, 0.2), trimMat, 0, 2.36, -2.04);

    const doorPivot = new THREE.Group();
    doorPivot.name = 'survivorShackDoorPivot';
    doorPivot.position.set(PIVOT_X, PIVOT_Y, PIVOT_Z);
    doorPivot.userData.isDoor = true;
    g.add(doorPivot);
    const door = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, DOOR_H, DOOR_D), trimMat);
    door.name = 'survivorShackDoor';
    door.position.set(DOOR_HX - 0.02, DOOR_H * 0.5, 0);
    door.castShadow = door.receiveShadow = true;
    doorPivot.add(door);
    const handleMat = new THREE.MeshLambertMaterial({ color: 0xb99b52 });
    _add(doorPivot, new THREE.BoxGeometry(0.08, 0.08, 0.08), handleMat, DOOR_W - 0.18, DOOR_H * 0.82, -0.07);

    g.userData.doorPivot = doorPivot;
  }

  /** Pièce 7/7. Miroir packages/shared/src/survivor-shack-roof.mjs */
  function _buildSurvivorShackRoof(g) {
    const M = _campMats();
    const trimMat = M ? M.woodDark(0x5a371d) : new THREE.MeshLambertMaterial({ color: 0x5a371d });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x30353a });
    const gableMat = new THREE.MeshLambertMaterial({ color: 0x30353a, side: THREE.DoubleSide });
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
      const gable = new THREE.Mesh(gableGeo, gableMat);
      gable.castShadow = gable.receiveShadow = true;
      g.add(gable);
    }
  }

  /** Pièce 3/7. Miroir packages/shared/src/survivor-shack-wall-south.mjs — 2 pans, ouverture porte au centre. */
  function _buildSurvivorShackWallSouth(g) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const H = 2.55;
    const T = 0.18;
    const CY = 1.32;
    const Z = -2.04;
    const SEG_W = 1.98;
    const SEG_X = 1.61;
    _add(g, new THREE.BoxGeometry(SEG_W, H, T), wallMat, -SEG_X, CY, Z);
    _add(g, new THREE.BoxGeometry(SEG_W, H, T), wallMat, SEG_X, CY, Z);
  }

  /** Terrain cabossé : max hauteur sous les coins du sol (miroir survivor-shack-pad.mjs). */
  function sampleShackPadHeight(x, z, rotY) {
    const HW = 5.25 / 2;
    const HD = 4.25 / 2;
    const pts = [
      [-HW, -HD], [HW, -HD], [HW, HD], [-HW, HD], [0, 0],
    ];
    const c = Math.cos(rotY || 0);
    const s = Math.sin(rotY || 0);
    let maxH = -Infinity;
    for (const [lx, lz] of pts) {
      const wx = x + lx * c + lz * s;
      const wz = z - lx * s + lz * c;
      const h = getDecorGroundHeight(wx, wz);
      if (h > maxH) maxH = h;
    }
    return Number.isFinite(maxH) ? maxH : getDecorGroundHeight(x, z);
  }

  /** Pièce 1/?. Miroir packages/shared/src/survivor-shack-floor.mjs */
  function _buildSurvivorShackFloor(g) {
    const M = _campMats();
    const floorMat = M ? M.woodFine(0x8a5f35) : new THREE.MeshLambertMaterial({ color: 0x8a5f35 });
    const FLOOR_W = 5.25;
    const FLOOR_D = 4.25;
    const FLOOR_T = 0.12;
    _add(g, new THREE.BoxGeometry(FLOOR_W, FLOOR_T, FLOOR_D), floorMat, 0, FLOOR_T * 0.5, 0);
  }

  /** Cabane S01 — assemblage progressif (1 pièce validée à la fois). Pivot = root (rotY sur root). */
  function _buildSurvivorShack(parent) {
    _buildSurvivorShackFloor(parent);
    _buildSurvivorShackWallNorth(parent);
    _buildSurvivorShackWallSouth(parent);
    _buildSurvivorShackWallWest(parent);
    _buildSurvivorShackWallEast(parent);
    _buildSurvivorShackDoor(parent);
    _buildSurvivorShackRoof(parent);
    parent.userData.colliderPrefabId = 'building_survivor_shack';
  }

  function _buildStorageChest(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const plank = M ? M.woodFine(0xb47a42) : new THREE.MeshLambertMaterial({ color: 0x8a5a2e });
    const frame = M ? M.woodDark(0x4a2b13) : new THREE.MeshLambertMaterial({ color: 0x4a2b13 });
    const metal = new THREE.MeshLambertMaterial({ color: 0x5d6268 });
    _add(g, new THREE.BoxGeometry(1.15, 0.48, 0.72), plank, 0, 0.24, 0);
    _add(g, new THREE.BoxGeometry(0.98, 0.36, 0.54), new THREE.MeshLambertMaterial({ color: 0x3d2510 }), 0, 0.38, 0);
    _add(g, new THREE.BoxGeometry(1.20, 0.08, 0.78), frame, 0, 0.52, 0);
    _add(g, new THREE.BoxGeometry(0.98, 0.08, 0.56), new THREE.MeshLambertMaterial({ color: 0x2a1a0c }), 0, 0.57, 0);
    _add(g, new THREE.BoxGeometry(1.25, 0.06, 0.08), frame, 0, 0.31, -0.39);
    _add(g, new THREE.BoxGeometry(1.25, 0.06, 0.08), frame, 0, 0.31, 0.39);
    for (const sx of [-0.58, 0.58]) {
      _add(g, new THREE.BoxGeometry(0.08, 0.58, 0.78), frame, sx, 0.29, 0);
    }

    const lidPivot = new THREE.Group();
    lidPivot.name = 'storageChestLidPivot';
    lidPivot.position.set(0, 0.58, 0.39);
    g.add(lidPivot);
    _add(lidPivot, new THREE.BoxGeometry(1.15, 0.14, 0.72), plank, 0, 0, -0.36);
    _add(lidPivot, new THREE.BoxGeometry(1.23, 0.08, 0.80), frame, 0, 0.02, -0.36);
    _add(lidPivot, new THREE.BoxGeometry(0.24, 0.14, 0.10), metal, 0, 0.02, -0.77);
    _add(lidPivot, new THREE.BoxGeometry(0.10, 0.12, 0.08), metal, 0, -0.10, -0.82);

    g.userData.isStorage = true;
    g.userData.storageLidPivot = lidPivot;
    parent.userData.isStorage = true;
    parent.userData.storageLidPivot = lidPivot;
  }

  function _buildWoodCeiling(parent, x, y, z) {
    const M = _campMats();
    const plank = M ? M.woodFine(0xb5894e) : new THREE.MeshLambertMaterial({ color: 0xb5894e });
    const trim = M ? M.woodDark(0x6a421d) : new THREE.MeshLambertMaterial({ color: 0x6a421d });
    _add(parent, new THREE.BoxGeometry(3.0, 0.18, 3.0), plank, x, y + 0.09, z);
    for (let i = -1; i <= 1; i++) {
      _add(parent, new THREE.BoxGeometry(0.1, 0.08, 3.02), trim, x + i * 0.9, y + 0.02, z);
    }
    _add(parent, new THREE.BoxGeometry(3.02, 0.08, 0.1), trim, x, y + 0.02, z - 1.45);
    _add(parent, new THREE.BoxGeometry(3.02, 0.08, 0.1), trim, x, y + 0.02, z + 1.45);
  }

  function _buildWoodWall(parent, x, y, z) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const trimMat = M ? M.woodDark(0x5a371d) : new THREE.MeshLambertMaterial({ color: 0x5a371d });
    _add(parent, new THREE.BoxGeometry(3.0, 2.6, 0.36), wallMat, x, y + 1.3, z);
    for (let i = -1; i <= 1; i++) {
      _add(parent, new THREE.BoxGeometry(0.12, 2.5, 0.40), trimMat, x + i * 0.9, y + 1.3, z);
    }
    _add(parent, new THREE.BoxGeometry(3.05, 0.16, 0.40), trimMat, x, y + 2.5, z);
    _add(parent, new THREE.BoxGeometry(3.05, 0.14, 0.40), trimMat, x, y + 0.2, z);
  }

  function _buildFloorSupports(parent, x, yBottom, yTop, z) {
    const gap = yTop - yBottom;
    if (gap < 0.2) return;
    const M = _campMats();
    const beam = M ? M.woodDark(0x6a421d) : new THREE.MeshLambertMaterial({ color: 0x6a421d });
    const brace = M ? M.wood(0x8a5a2e) : new THREE.MeshLambertMaterial({ color: 0x8a5a2e });
    const midY = yBottom + gap / 2;
    const postR = 0.08;
    const corners = [[-1.35, -1.35], [1.35, -1.35], [-1.35, 1.35], [1.35, 1.35]];
    for (const [px, pz] of corners) {
      _add(parent, new THREE.BoxGeometry(postR, gap, postR), beam, x + px, yBottom + gap / 2, z + pz);
    }
    const ringY = yBottom + gap * 0.12;
    _add(parent, new THREE.BoxGeometry(3.0, postR * 0.85, postR * 0.85), brace, x, ringY, z - 1.35);
    _add(parent, new THREE.BoxGeometry(3.0, postR * 0.85, postR * 0.85), brace, x, ringY, z + 1.35);
    _add(parent, new THREE.BoxGeometry(postR * 0.85, postR * 0.85, 3.0), brace, x - 1.35, ringY, z);
    _add(parent, new THREE.BoxGeometry(postR * 0.85, postR * 0.85, 3.0), brace, x + 1.35, ringY, z);
    _add(parent, new THREE.BoxGeometry(3.6, postR * 0.9, postR * 0.9), beam, x, midY, z);
    _add(parent, new THREE.BoxGeometry(postR * 0.9, postR * 0.9, 3.6), beam, x, midY, z);
    const mkDiag = (dx, dz) => {
      const len = Math.hypot(dx, dz) * 1.35;
      const m = new THREE.Mesh(new THREE.BoxGeometry(postR * 0.75, postR * 0.75, len), brace);
      m.position.set(x + dx * 0.5, midY, z + dz * 0.5);
      m.rotation.y = Math.atan2(dx, dz);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
    };
    mkDiag(2.7, 2.7);
    mkDiag(-2.7, 2.7);
  }

  function _buildWoodFloor(parent, x, y, z, opts = {}) {
    const M = _campMats();
    const plank = M ? M.woodFine(0xb5894e) : new THREE.MeshLambertMaterial({ color: 0xb5894e });
    const trim = M ? M.woodDark(0x6a421d) : new THREE.MeshLambertMaterial({ color: 0x6a421d });
    const supportDrop = Number.isFinite(opts.supportDrop) ? opts.supportDrop : 0;
    if (supportDrop > 0.2) {
      _buildFloorSupports(parent, x, y - supportDrop, y, z);
    }
    _add(parent, new THREE.BoxGeometry(3.0, 0.18, 3.0), plank, x, y + 0.09, z);
    for (let i = -1; i <= 1; i++) {
      _add(parent, new THREE.BoxGeometry(0.1, 0.2, 3.02), trim, x + i * 0.9, y + 0.11, z);
    }
    _add(parent, new THREE.BoxGeometry(3.02, 0.14, 0.1), trim, x, y + 0.13, z - 1.45);
    _add(parent, new THREE.BoxGeometry(3.02, 0.14, 0.1), trim, x, y + 0.13, z + 1.45);
  }

  function _buildWoodStair(parent, x, y, z) {
    const M = _campMats();
    const a = M ? M.wood(0xb5894e) : new THREE.MeshLambertMaterial({ color: 0xb5894e });
    const b = M ? M.woodDark(0x8a5a2e) : new THREE.MeshLambertMaterial({ color: 0x8a5a2e });
    const steps = 6;
    const stepH = 2.6 / steps;
    const stepD = 3.0 / steps;
    for (let i = 0; i < steps; i++) {
      const zc = z - 1.5 + stepD * (i + 0.5);
      _add(parent, new THREE.BoxGeometry(1.8, stepH * (i + 1), stepD), i % 2 ? b : a, x, y + stepH * (i + 1) / 2, zc);
    }
    _add(parent, new THREE.BoxGeometry(0.14, 2.4, 3.0), b, x - 0.97, y + 1.2, z);
    _add(parent, new THREE.BoxGeometry(0.14, 2.4, 3.0), b, x + 0.97, y + 1.2, z);
  }

  function _buildWoodDoorway(parent, x, y, z, gap) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const trimMat = M ? M.woodDark(0x5a371d) : new THREE.MeshLambertMaterial({ color: 0x5a371d });
    const side = (3.0 - gap) / 2;
    for (const sgn of [-1, 1]) {
      _add(parent, new THREE.BoxGeometry(side, 2.6, 0.36), wallMat, x + sgn * (gap / 2 + side / 2), y + 1.3, z);
    }
    _add(parent, new THREE.BoxGeometry(3.0, 0.4, 0.38), wallMat, x, y + 2.4, z);
    _add(parent, new THREE.BoxGeometry(0.16, 2.45, 0.42), trimMat, x - gap / 2, y + 1.25, z - 0.02);
    _add(parent, new THREE.BoxGeometry(0.16, 2.45, 0.42), trimMat, x + gap / 2, y + 1.25, z - 0.02);
    _add(parent, new THREE.BoxGeometry(gap + 0.2, 0.14, 0.42), trimMat, x, y + 2.15, z - 0.02);
  }

  function _buildWoodDoor(parent, x, y, z, gap) {
    const M = _campMats();
    const wallMat = M ? M.wood(0x9b6a3c) : new THREE.MeshLambertMaterial({ color: 0x9b6a3c });
    const trimMat = M ? M.woodDark(0x5a371d) : new THREE.MeshLambertMaterial({ color: 0x5a371d });
    const side = (3.0 - gap) / 2;
    for (const sgn of [-1, 1]) {
      _add(parent, new THREE.BoxGeometry(side, 2.6, 0.36), wallMat, x + sgn * (gap / 2 + side / 2), y + 1.3, z);
    }
    _add(parent, new THREE.BoxGeometry(3.0, 0.4, 0.38), wallMat, x, y + 2.4, z);
    _add(parent, new THREE.BoxGeometry(0.16, 2.45, 0.42), trimMat, x - gap / 2, y + 1.25, z - 0.02);
    _add(parent, new THREE.BoxGeometry(0.16, 2.45, 0.42), trimMat, x + gap / 2, y + 1.25, z - 0.02);
    _add(parent, new THREE.BoxGeometry(gap + 0.2, 0.14, 0.42), trimMat, x, y + 2.15, z - 0.02);

    const doorW = Math.max(0.9, gap - 0.1);
    const doorPivot = new THREE.Group();
    doorPivot.name = 'buildDoorPivot';
    doorPivot.position.set(x - doorW / 2, y + 0.08, z - 0.11);
    doorPivot.userData.isDoor = true;
    parent.add(doorPivot);
    _add(doorPivot, new THREE.BoxGeometry(doorW, 2.02, 0.12), trimMat, doorW / 2, 1.01, 0);
    _add(doorPivot, new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshLambertMaterial({ color: 0xb99b52 }), doorW - 0.18, 1.55, -0.07);
    parent.userData.doorPivot = doorPivot;
  }

  function _houseMats() {
    const M = _campMats();
    return {
      wallA: M ? M.wood(0xa47b55) : new THREE.MeshLambertMaterial({ color: 0xa47b55 }),
      wallB: new THREE.MeshLambertMaterial({ color: 0xb6b0a0 }),
      trim: M ? M.woodDark(0x4b3320) : new THREE.MeshLambertMaterial({ color: 0x4b3320 }),
      door: M ? M.woodDark(0x3a1f12) : new THREE.MeshLambertMaterial({ color: 0x3a1f12 }),
      roofRed: new THREE.MeshLambertMaterial({ color: 0x7d2f24 }),
      roofDark: new THREE.MeshLambertMaterial({ color: 0x303238 }),
      floor: M ? M.woodFine(0x9a6a3a) : new THREE.MeshLambertMaterial({ color: 0x9a6a3a }),
      plaster: new THREE.MeshLambertMaterial({ color: 0xd8d0be }),
      tile: new THREE.MeshLambertMaterial({ color: 0xb7c4c8 }),
      glass: new THREE.MeshLambertMaterial({ color: 0x7fb1c1, transparent: true, opacity: 0.55, emissive: 0x0b1a20, emissiveIntensity: 0.12 }),
      sofa: new THREE.MeshLambertMaterial({ color: 0x4b526f }),
      bed: new THREE.MeshLambertMaterial({ color: 0xd8c8b8 }),
      water: new THREE.MeshLambertMaterial({ color: 0xe7ece8 }),
    };
  }

  function _raisedHouseFloor(parent, M, W, D) {
    _box(parent, M.trim, W + 0.25, 0.16, D + 0.25, 0, 0.08, 0);
    _box(parent, M.floor, W, 0.18, D, 0, 0.20, 0);
  }

  function _box(parent, mat, w, h, d, x, y, z) {
    return _add(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  }

  function _shackStyleDoor(parent, M, x, z, closedRotY, openAngle, name) {
    const DOOR_W = 2.08;
    const DOOR_H = 2.34;
    const DOOR_D = 0.14;
    const DOOR_HX = DOOR_W * 0.5;
    const base = new THREE.Group();
    base.name = `${name || 'smallCityHouseDoor'}Base`;
    base.position.set(x, 0.08, z);
    base.rotation.y = closedRotY || 0;
    parent.add(base);

    const doorPivot = new THREE.Group();
    doorPivot.name = name || 'smallCityHouseDoorPivot';
    doorPivot.position.set(0, 0, 0);
    doorPivot.userData.isDoor = true;
    doorPivot.userData.openAngle = Number.isFinite(openAngle) ? openAngle : DOOR_OPEN_ANGLE;
    base.add(doorPivot);
    const door = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, DOOR_H, DOOR_D), M.door);
    door.name = 'smallCityHouseDoor';
    door.position.set(DOOR_HX - 0.02, DOOR_H * 0.5, 0);
    door.castShadow = door.receiveShadow = true;
    doorPivot.add(door);
    _add(doorPivot, new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshLambertMaterial({ color: 0xb99b52 }), DOOR_W - 0.22, DOOR_H * 0.82, -0.07);
    parent.userData.doorPivot = doorPivot;
    return doorPivot;
  }

  function _openSouthEntry(parent, M, D) {
    const z = D / 2 + 0.055;
    _box(parent, M.trim, 0.18, 2.55, 0.22, -1.18, 1.27, z);
    _box(parent, M.trim, 0.18, 2.55, 0.22, 1.18, 1.27, z);
    _box(parent, M.trim, 2.55, 0.20, 0.22, 0, 2.42, z);
    _box(parent, M.trim, 2.55, 0.12, 0.28, 0, 0.28, z);
    _shackStyleDoor(parent, M, -1.04, z + 0.01, 0, Math.PI * 0.52, 'smallCitySouthDoorPivot');
  }

  function _openWestEntry(parent, M, W) {
    const x = -W / 2 - 0.055;
    _box(parent, M.trim, 0.22, 2.55, 0.18, x, 1.27, -1.18);
    _box(parent, M.trim, 0.22, 2.55, 0.18, x, 1.27, 1.18);
    _box(parent, M.trim, 0.22, 0.20, 2.55, x, 2.42, 0);
    _box(parent, M.trim, 0.28, 0.12, 2.55, x, 0.28, 0);
    _shackStyleDoor(parent, M, x + 0.01, 1.04, Math.PI / 2, -Math.PI * 0.52, 'smallCityWestDoorPivot');
  }

  function _buildSmallCityHouseA(parent) {
    const M = _houseMats();
    const W = 11.0, D = 9.5, H = 3.1, T = 0.22;
    _raisedHouseFloor(parent, M, W, D);
    _box(parent, M.wallA, W, H, T, 0, H / 2, -D / 2);
    _box(parent, M.wallA, T, H, D, -W / 2, H / 2, 0);
    _box(parent, M.wallA, T, H, D, W / 2, H / 2, 0);
    _box(parent, M.wallA, 4.5, H, T, -3.25, H / 2, D / 2);
    _box(parent, M.wallA, 4.5, H, T, 3.25, H / 2, D / 2);
    _box(parent, M.wallA, 2.0, 0.65, T, 0, 2.78, D / 2);
    _openSouthEntry(parent, M, D);

    _box(parent, M.plaster, T, H, 2.6, -1.8, H / 2, -2.65);
    _box(parent, M.plaster, T, H, 1.8, -1.8, H / 2, 2.85);
    _box(parent, M.plaster, T, 0.35, 3.3, -1.8, H - 0.18, 0.3);
    _box(parent, M.plaster, 1.8, H, T, -2.0, H / 2, 1.0);
    _box(parent, M.plaster, 4.2, H, T, 3.2, H / 2, 1.0);
    _box(parent, M.plaster, 2.2, 0.35, T, 0, H - 0.18, 1.0);

    for (const [wx, wz, ww, wd] of [[-3.6, -D / 2 - 0.02, 1.35, 0.06], [3.4, -D / 2 - 0.02, 1.35, 0.06], [-W / 2 - 0.02, -1.7, 0.06, 1.25], [W / 2 + 0.02, 1.6, 0.06, 1.15]]) {
      _box(parent, M.glass, ww, 0.75, wd, wx, 1.55, wz);
    }

    _box(parent, M.sofa, 2.4, 0.45, 0.82, 2.8, 0.36, 3.0);
    _box(parent, M.sofa, 2.4, 0.65, 0.14, 2.8, 0.78, 2.6);
    _box(parent, M.trim, 1.55, 0.08, 0.95, 2.5, 0.5, 1.2);
    _box(parent, M.bed, 1.65, 0.32, 2.25, -3.75, 0.38, -2.0);
    _box(parent, M.trim, 1.75, 0.62, 0.12, -3.75, 0.72, -3.15);
    _box(parent, M.water, 0.78, 0.42, 0.78, 3.35, 0.62, -1.4);
    _box(parent, M.water, 1.18, 0.42, 0.62, 3.25, 0.60, -3.0);

    _box(parent, M.plaster, W - 0.15, 0.12, D - 0.15, 0, H + 0.06, 0);
    _add(parent, new THREE.BoxGeometry(W + 1.35, 0.22, D / 2 + 1.05), M.roofRed, 0, H + 0.66, -D / 4 - 0.12, -0.20, 0, 0);
    _add(parent, new THREE.BoxGeometry(W + 1.35, 0.22, D / 2 + 1.05), M.roofRed, 0, H + 0.66, D / 4 + 0.12, 0.20, 0, 0);
    _box(parent, M.trim, W + 1.45, 0.22, 0.24, 0, H + 0.86, 0);
    _box(parent, M.roofRed, W + 0.75, 0.45, 0.28, 0, H + 0.35, -D / 2 - 0.06);
    _box(parent, M.roofRed, W + 0.75, 0.45, 0.28, 0, H + 0.35, D / 2 + 0.06);
  }

  function _buildSmallCityHouseB(parent) {
    const M = _houseMats();
    const W = 10.0, D = 10.5, H = 3.2, T = 0.24;
    _raisedHouseFloor(parent, M, W, D);
    _box(parent, M.wallB, W, H, T, 0, H / 2, -D / 2);
    _box(parent, M.wallB, W, H, T, 0, H / 2, D / 2);
    _box(parent, M.wallB, T, H, 4.25, -W / 2, H / 2, -3.125);
    _box(parent, M.wallB, T, H, 4.25, -W / 2, H / 2, 3.125);
    _box(parent, M.wallB, T, H, D, W / 2, H / 2, 0);
    _box(parent, M.wallB, T, 0.65, 2.0, -W / 2, 2.78, 0);
    _openWestEntry(parent, M, W);

    _box(parent, M.plaster, 2.6, H, T, -2.65, H / 2, -1.0);
    _box(parent, M.plaster, 4.1, H, T, 2.6, H / 2, -1.0);
    _box(parent, M.plaster, 1.85, 0.35, T, -0.4, H - 0.18, -1.0);
    _box(parent, M.plaster, T, H, 1.7, 2.4, H / 2, 2.9);
    _box(parent, M.plaster, T, 0.35, 1.55, 2.4, H - 0.18, 1.15);

    for (const [wx, wz, ww, wd] of [[-2.5, -D / 2 - 0.02, 1.35, 0.06], [2.8, -D / 2 - 0.02, 1.25, 0.06], [W / 2 + 0.02, -2.0, 0.06, 1.35], [W / 2 + 0.02, 2.8, 0.06, 1.2]]) {
      _box(parent, M.glass, ww, 0.75, wd, wx, 1.55, wz);
    }

    _box(parent, M.sofa, 0.45, 0.45, 2.35, -2.15, 0.36, 3.0);
    _box(parent, M.sofa, 0.14, 0.65, 2.35, -2.55, 0.78, 3.0);
    _box(parent, M.trim, 1.35, 0.08, 1.0, -0.5, 0.5, 1.4);
    _box(parent, M.bed, 1.65, 0.32, 2.25, -2.7, 0.38, -3.0);
    _box(parent, M.trim, 1.75, 0.62, 0.12, -2.7, 0.72, -4.15);
    _box(parent, M.tile, 1.55, 0.05, 2.0, 3.45, 0.19, 1.9);
    _box(parent, M.water, 0.78, 0.42, 0.78, 3.1, 0.62, 1.0);
    _box(parent, M.water, 1.22, 0.40, 0.62, 3.1, 0.61, 3.0);

    _box(parent, M.plaster, W - 0.15, 0.12, D - 0.15, 0, H + 0.06, 0);
    _box(parent, M.roofDark, W + 0.9, 0.28, D + 0.9, 0, H + 0.28, 0);
    _box(parent, M.trim, W + 0.65, 0.45, 0.22, 0, H + 0.42, -D / 2);
    _box(parent, M.trim, W + 0.65, 0.45, 0.22, 0, H + 0.42, D / 2);
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
    ZS.registerGroundMesh?.(ground);

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
  const DECOR_STORAGES = new Map();
  const DECOR_SIGNS = new Map();
  const DECOR_BUILDS = new Map();
  const _buildRayHits = [];
  const DOOR_OPEN_ANGLE = -Math.PI * 0.52;
  const CHEST_OPEN_ANGLE = Math.PI * 0.62;
  const DOOR_ANIM_SPEED = 3.2;
  const CHEST_ANIM_SPEED = 2.4;

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
    rock_boulder: { build(root, opts) { ZS.RockWorldPrefabs?.buildBoulder?.(root, opts); } },
    rock_outcrop: { build(root, opts) { ZS.RockWorldPrefabs?.buildOutcrop?.(root, opts); } },
    spawn_workbench: { build(root) { _buildWorkbench(root, 0, 0, 0, 0); } },
    storage_chest: { build(root, opts = {}) {
      root.rotation.y = 0;
      const ry = Number.isFinite(opts.rotY) ? opts.rotY : 0;
      _buildStorageChest(root, 0, 0, 0, ry);
    } },
    build_wall_wood: { build(root) { _buildWoodWall(root, 0, 0, 0); }, buildKind: 'wall', w: 3.0, h: 2.6, t: 0.36 },
    build_doorway_wood: { build(root) { _buildWoodDoorway(root, 0, 0, 0, 1.8); }, buildKind: 'door', w: 3.0, h: 2.6, t: 0.36, gap: 1.8 },
    build_large_doorway_wood: { build(root) { _buildWoodDoorway(root, 0, 0, 0, 2.4); }, buildKind: 'door', w: 3.0, h: 2.6, t: 0.36, gap: 2.4 },
    build_floor_wood: { build(root, opts) { _buildWoodFloor(root, 0, 0, 0, opts); }, buildKind: 'floor', w: 3.0, h: 0.18, t: 3.0 },
    build_ceiling_wood: { build(root) { _buildWoodCeiling(root, 0, 0, 0); }, buildKind: 'ceiling', w: 3.0, h: 0.18, t: 3.0 },
    build_stair_wood: { build(root) { _buildWoodStair(root, 0, 0, 0); }, buildKind: 'stair', w: 1.8, h: 2.6, t: 3.0 },
    build_door_wood: { build(root) { _buildWoodDoor(root, 0, 0, 0, 1.8); }, buildKind: 'door', w: 3.0, h: 2.6, t: 0.36 },
    build_large_door_wood: { build(root) { _buildWoodDoor(root, 0, 0, 0, 2.4); }, buildKind: 'door', w: 3.0, h: 2.6, t: 0.36 },
    building_survivor_shack: { build(root) { _buildSurvivorShack(root); } },
    smallcity_house_a: { build(root) { _buildSmallCityHouseA(root); } },
    smallcity_house_b: { build(root) { _buildSmallCityHouseB(root); } },
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

  /** Yaw décor — coffre : rotation sur le groupe mesh interne, pas le root. */
  function _decorYawFromRoot(root) {
    if (root?.userData?.prefabId === 'storage_chest') {
      const inner = root.children[0];
      if (inner) return inner.rotation.y || 0;
    }
    return root.rotation?.y ?? 0;
  }

  /** Garde decorSpec aligné sur le pivot Three.js (cx/cz/rotY/baseY des colliders). */
  function _syncDecorSpecFromRoot(root) {
    const spec = root?.userData?.decorSpec;
    if (!spec || !root.position) return spec;
    spec.x = root.position.x;
    spec.z = root.position.z;
    spec.baseY = root.position.y;
    spec.rotY = _decorYawFromRoot(root) ?? spec.rotY ?? 0;
    spec.rotZ = root.rotation?.z ?? spec.rotZ ?? 0;
    if (Number.isFinite(root.rotation?.x)) spec.rotX = root.rotation.x;
    spec.scale = root.scale?.x ?? spec.scale ?? 1;
    return spec;
  }

  function _registerDecorCollision(decorId, spec, root) {
    if (!decorId || !ZS.registerDecorColliders || !ZS.buildDecorColliders) return;
    if (root?.userData?.decorSpec) spec = _syncDecorSpecFromRoot(root);
    const cols = ZS.buildDecorColliders(spec);
    ZS.registerDecorColliders(decorId, cols);
    if (spec?.prefabId === 'building_survivor_shack') {
      ZS.BuildingDebug?.onShackCollidersRegistered?.(spec, cols, root || null);
    }
    ZS.Network?.syncWorldColliders?.();
  }

  function _refreshDecorCollision(root) {
    if (!root?.userData?.decorSpec) return;
    if (root.userData.collide === false) return;
    const spec = _syncDecorSpecFromRoot(root);
    _registerDecorCollision(spec.decorId, spec, root);
  }

  function _setDoorVisual(entry, open, opts = {}) {
    if (!entry?.pivot) return false;
    const wantOpen = !!open;
    const prevOpen = !!entry.open;
    entry.open = wantOpen;
    entry.targetOpen = wantOpen;
    const openTarget = Number.isFinite(entry.doorOpenAngle) ? entry.doorOpenAngle : DOOR_OPEN_ANGLE;
    const doorAngle = wantOpen ? openTarget : 0;
    entry.root.userData.doorOpen = wantOpen;
    if (entry.root.userData.decorSpec) {
      entry.root.userData.decorSpec.doorOpen = wantOpen;
      entry.root.userData.decorSpec.doorAngle = doorAngle;
    }
    if (opts.instant) {
      entry.openAngle = wantOpen ? openTarget : 0;
      entry.pivot.rotation.y = entry.openAngle;
    } else if (prevOpen !== wantOpen) {
      const px = entry.root?.position?.x;
      const pz = entry.root?.position?.z;
      const sp = (Number.isFinite(px) && Number.isFinite(pz))
        ? ZS.Audio?.spatialAt?.(px, pz)
        : null;
      ZS.Audio?.door?.(wantOpen ? 1 : 0, sp?.vol ?? 1, sp?.pan);
    }
    _refreshDecorCollision(entry.root);
    return true;
  }

  function _ensureDoorLockMesh(entry) {
    if (!entry?.pivot) return null;
    if (!entry.lockMesh) {
      const g = new THREE.Group();
      g.name = 'door-lock';
      const mat = new THREE.MeshLambertMaterial({ color: 0x666677 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), mat);
      body.position.set(0.52, 1.02, 0.2);
      g.add(body);
      const shackle = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.014, 6, 12, Math.PI),
        mat,
      );
      shackle.rotation.z = Math.PI / 2;
      shackle.position.set(0.52, 1.14, 0.2);
      g.add(shackle);
      entry.pivot.add(g);
      entry.lockMesh = g;
    }
    return entry.lockMesh;
  }

  function setDecorDoorLockState(decorId, data = {}) {
    const entry = DECOR_DOORS.get(decorId);
    if (!entry || !entry.root.parent) return false;
    entry.locked = !!data.locked;
    entry.lockId = data.lockId || null;
    entry.lockOwner = data.lockOwner || null;
    if (entry.root.userData.decorSpec) {
      entry.root.userData.decorSpec.locked = entry.locked;
      entry.root.userData.decorSpec.lockId = entry.lockId;
      entry.root.userData.decorSpec.lockOwner = entry.lockOwner;
    }
    const mesh = _ensureDoorLockMesh(entry);
    if (mesh) mesh.visible = entry.locked;
    return true;
  }

  function tickDecorDoors(dt) {
    for (const entry of DECOR_DOORS.values()) {
      if (!entry?.pivot?.parent) continue;
      const openTarget = Number.isFinite(entry.doorOpenAngle) ? entry.doorOpenAngle : DOOR_OPEN_ANGLE;
      const target = entry.targetOpen ? openTarget : 0;
      let angle = Number.isFinite(entry.openAngle) ? entry.openAngle : entry.pivot.rotation.y;
      const delta = target - angle;
      if (Math.abs(delta) < 0.008) {
        if (angle !== target) {
          angle = target;
          entry.openAngle = target;
          entry.pivot.rotation.y = target;
        }
        continue;
      }
      const step = Math.sign(delta) * Math.min(Math.abs(delta), DOOR_ANIM_SPEED * dt);
      angle += step;
      entry.openAngle = angle;
      entry.pivot.rotation.y = angle;
    }
    for (const entry of DECOR_STORAGES.values()) {
      if (!entry?.lidPivot?.parent) continue;
      const target = entry.targetOpen ? CHEST_OPEN_ANGLE : 0;
      let angle = Number.isFinite(entry.openAngle) ? entry.openAngle : entry.lidPivot.rotation.x;
      const delta = target - angle;
      if (Math.abs(delta) < 0.008) {
        if (angle !== target) {
          angle = target;
          entry.openAngle = target;
          entry.lidPivot.rotation.x = target;
        }
        continue;
      }
      const step = Math.sign(delta) * Math.min(Math.abs(delta), CHEST_ANIM_SPEED * dt);
      angle += step;
      entry.openAngle = angle;
      entry.lidPivot.rotation.x = angle;
    }
  }

  function setDecorDoorState(decorId, open, opts = {}) {
    const entry = DECOR_DOORS.get(decorId);
    if (!entry || !entry.root.parent) return false;
    return _setDoorVisual(entry, !!open, opts);
  }

  function unregisterDecorDoor(decorId) {
    DECOR_DOORS.delete(decorId);
  }

  function unregisterDecorStorage(decorId) {
    DECOR_STORAGES.delete(decorId);
  }

  function unregisterDecorSign(decorId) {
    DECOR_SIGNS.delete(decorId);
  }

  function registerDecorSign(decorId, entry) {
    if (!decorId || !entry?.root) return;
    DECOR_SIGNS.set(decorId, entry);
  }

  function unregisterDecorBuild(decorId) {
    DECOR_BUILDS.delete(decorId);
  }

  function setDecorStorageState(decorId, open, opts = {}) {
    const entry = DECOR_STORAGES.get(decorId);
    if (!entry || !entry.root.parent) return false;
    const wantOpen = !!open;
    entry.open = wantOpen;
    entry.targetOpen = wantOpen;
    entry.root.userData.storageOpen = wantOpen;
    if (entry.root.userData.decorSpec) entry.root.userData.decorSpec.storageOpen = wantOpen;
    if (opts.instant && entry.lidPivot) {
      entry.openAngle = wantOpen ? CHEST_OPEN_ANGLE : 0;
      entry.lidPivot.rotation.x = entry.openAngle;
    }
    return true;
  }

  function findNearestDecorDoor(x, z, maxDist = 3.2) {
    let best = null;
    const pos = new THREE.Vector3();
    for (const [decorId, entry] of DECOR_DOORS) {
      if (!entry.root.parent || !entry.pivot) continue;
      entry.pivot.getWorldPosition(pos);
      const dist = Math.hypot(pos.x - x, pos.z - z);
      if (dist > maxDist) continue;
      if (!best || dist < best.dist) {
        best = {
          decorId,
          open: !!entry.open,
          dist,
          prefabId: entry.root.userData.prefabId,
          locked: !!entry.locked,
          lockId: entry.lockId || null,
          lockOwner: entry.lockOwner || null,
        };
      }
    }
    return best;
  }

  function findNearestDecorStorage(x, z, maxDist = 2.6) {
    let best = null;
    for (const [decorId, entry] of DECOR_STORAGES) {
      if (!entry.root.parent) continue;
      const dist = Math.hypot(entry.root.position.x - x, entry.root.position.z - z);
      if (dist > maxDist) continue;
      if (!best || dist < best.dist) best = { decorId, dist, prefabId: entry.root.userData.prefabId };
    }
    return best;
  }

  function findNearestDecorSign(x, z, maxDist = 3.2) {
    let best = null;
    for (const [decorId, entry] of DECOR_SIGNS) {
      if (!entry.root.parent) continue;
      const dist = Math.hypot(entry.root.position.x - x, entry.root.position.z - z);
      if (dist > maxDist) continue;
      if (!best || dist < best.dist) {
        best = {
          decorId,
          dist,
          prefabId: entry.root.userData.prefabId,
          signKind: entry.signKind,
        };
      }
    }
    return best;
  }

  function hitDecorStorage(ox, oz, dx, dz, maxDist = 2.4) {
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len;
    const nz = dz / len;
    let best = null;
    for (const [decorId, entry] of DECOR_STORAGES) {
      if (!entry.root.parent) continue;
      const vx = entry.root.position.x - ox;
      const vz = entry.root.position.z - oz;
      const forward = vx * nx + vz * nz;
      if (forward < 0 || forward > maxDist) continue;
      const lateral = Math.abs(vx * nz - vz * nx);
      if (lateral > 1.05) continue;
      if (!best || forward < best.dist) {
        best = { decorId, dist: forward, prefabId: entry.root.userData.prefabId };
      }
    }
    return best;
  }

  function hitDecorBuild(ox, oz, dx, dz, maxDist = 2.6) {
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len;
    const nz = dz / len;
    let best = null;
    for (const [decorId, entry] of DECOR_BUILDS) {
      if (!entry.root?.parent) continue;
      const vx = entry.root.position.x - ox;
      const vz = entry.root.position.z - oz;
      const forward = vx * nx + vz * nz;
      if (forward < -0.35 || forward > maxDist) continue;
      const lateral = Math.abs(vx * nz - vz * nx);
      const reach = Math.max(entry.hw || 1.5, entry.hd || 1.5) + 0.65;
      if (lateral > reach) continue;
      if (!best || forward < best.dist) {
        best = { decorId, dist: forward, prefabId: entry.prefabId };
      }
    }
    return best;
  }

  /** Visée écran → mesh construction (prioritaire sur la récolte cone XZ). */
  function hitDecorBuildRay(raycaster, maxDist = 3.5) {
    if (!raycaster) return null;
    _buildRayHits.length = 0;
    for (const entry of DECOR_BUILDS.values()) {
      if (!entry.root?.parent) continue;
      entry.root.traverse((o) => {
        if (o.isMesh) _buildRayHits.push(o);
      });
    }
    if (!_buildRayHits.length) return null;
    const prevFar = raycaster.far;
    raycaster.far = maxDist;
    const hits = raycaster.intersectObjects(_buildRayHits, false);
    raycaster.far = prevFar;
    if (!hits.length) return null;
    let node = hits[0].object;
    while (node) {
      const id = node.userData?.decorId;
      if (id && DECOR_BUILDS.has(id)) {
        return { decorId: id, dist: hits[0].distance, prefabId: DECOR_BUILDS.get(id).prefabId };
      }
      node = node.parent;
    }
    return null;
  }

  const _doorRayHits = [];
  const _storageRayHits = [];

  /**
   * True si un mur décor (cabane, etc.) bloque le rayon avant la cible.
   * Le mesh coffre est testé seul — sans ça on peut interagir à travers les murs.
   */
  function _interactRayOccluded(raycaster, hitDist, excludeDecorId) {
    if (!raycaster?.ray || !ZS.hasHeadLineOfSight || !ZS.getCollidersNear) return false;
    if (!Number.isFinite(hitDist) || hitDist < 0.05) return false;
    const ray = raycaster.ray;
    const ox = ray.origin.x;
    const oz = ray.origin.z;
    const dx = ray.direction.x;
    const dz = ray.direction.z;
    const t = Math.max(0.05, hitDist - 0.12);
    const ex = ox + dx * t;
    const ez = oz + dz * t;
    const eyeY = ray.origin.y;
    const span = Math.hypot(ex - ox, ez - oz);
    const midX = (ox + ex) * 0.5;
    const midZ = (oz + ez) * 0.5;
    const colliders = ZS.getCollidersNear(midX, midZ, span * 0.5 + 8);
    const filtered = [];
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.decorId === excludeDecorId) continue;
      filtered.push(c);
    }
    return !ZS.hasHeadLineOfSight(ox, oz, ex, ez, filtered, eyeY, { endpointShrink: 0.12 });
  }

  function getDecorDoorForInteract(decorId) {
    const entry = DECOR_DOORS.get(decorId);
    if (!entry?.root?.parent) return null;
    return {
      decorId,
      open: !!entry.open,
      dist: 0,
      prefabId: entry.root.userData.prefabId,
      locked: !!entry.locked,
      lockId: entry.lockId || null,
      lockOwner: entry.lockOwner || null,
    };
  }

  function getDecorStorageForInteract(decorId) {
    const entry = DECOR_STORAGES.get(decorId);
    if (!entry?.root?.parent) return null;
    return { decorId, dist: 0, prefabId: entry.root.userData.prefabId };
  }

  /** Visée écran → coffre (mesh décor, prioritaire sur proximité). */
  function hitDecorStorageRay(raycaster, maxDist = 3.5) {
    if (!raycaster) return null;
    _storageRayHits.length = 0;
    for (const [decorId, entry] of DECOR_STORAGES) {
      if (!entry.root?.parent) continue;
      entry.root.traverse((o) => {
        if (o.isMesh) {
          o.userData.decorId = decorId;
          _storageRayHits.push(o);
        }
      });
    }
    if (!_storageRayHits.length) return null;
    const prevFar = raycaster.far;
    raycaster.far = maxDist;
    const hits = raycaster.intersectObjects(_storageRayHits, false);
    raycaster.far = prevFar;
    if (!hits.length) return null;
    let node = hits[0].object;
    while (node) {
      const id = node.userData?.decorId;
      if (id && DECOR_STORAGES.has(id)) {
        const dist = hits[0].distance;
        if (_interactRayOccluded(raycaster, dist, id)) return null;
        return {
          decorId: id,
          dist,
          prefabId: DECOR_STORAGES.get(id).root.userData.prefabId,
        };
      }
      node = node.parent;
    }
    return null;
  }

  /** Visée écran → porte verrouillée (cabanes, etc. hors DECOR_BUILDS). */
  function hitDecorDoorRay(raycaster, maxDist = 3.5) {
    if (!raycaster) return null;
    _doorRayHits.length = 0;
    for (const [decorId, entry] of DECOR_DOORS) {
      if (!entry.root?.parent || !entry.pivot) continue;
      entry.pivot.traverse((o) => {
        if (o.isMesh) {
          o.userData.decorId = decorId;
          _doorRayHits.push(o);
        }
      });
    }
    if (!_doorRayHits.length) return null;
    const prevFar = raycaster.far;
    raycaster.far = maxDist;
    const hits = raycaster.intersectObjects(_doorRayHits, false);
    raycaster.far = prevFar;
    if (!hits.length) return null;
    let node = hits[0].object;
    while (node) {
      const id = node.userData?.decorId;
      const entry = id ? DECOR_DOORS.get(id) : null;
      if (entry) {
        return {
          decorId: id,
          dist: hits[0].distance,
          prefabId: entry.root.userData.prefabId,
          locked: !!entry.locked,
          lockId: entry.lockId || null,
        };
      }
      node = node.parent;
    }
    return null;
  }

  /** Coffre vs porte : le mesh le plus proche sur le rayon caméra (viseur). */
  function pickDecorInteractRay(raycaster, maxDist = 3.5) {
    const storage = hitDecorStorageRay(raycaster, maxDist);
    const door = hitDecorDoorRay(raycaster, maxDist);
    if (storage && door) {
      return storage.dist <= door.dist
        ? { kind: 'storage', ...storage }
        : { kind: 'door', ...door };
    }
    if (storage) return { kind: 'storage', ...storage };
    if (door) return { kind: 'door', ...door };
    return null;
  }

  function getDecorDoorMeta(decorId) {
    const entry = DECOR_DOORS.get(decorId);
    if (!entry?.root?.parent) return null;
    return {
      decorId,
      locked: !!entry.locked,
      lockId: entry.lockId || null,
      prefabId: entry.root.userData.prefabId,
    };
  }

  /** Plus bas vertex du visuel en coordonnées monde (respecte rotY / scale). */
  function _rockWorldBoundsY(root) {
    if (!root) return null;
    root.updateMatrixWorld(true);
    const vis = root.userData.boulderVisual || root;
    let minY = Infinity;
    let maxY = -Infinity;
    const v = new THREE.Vector3();
    vis.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        v.applyMatrix4(o.matrixWorld);
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
      }
    });
    if (!Number.isFinite(minY)) return null;
    return { minY, maxY: Number.isFinite(maxY) ? maxY : minY };
  }

  /** Enfoncement réaliste : ~18 % hauteur, entre 12 et 40 cm selon taille. */
  function _rockEmbedDepth(root) {
    const b = _rockWorldBoundsY(root);
    if (!b) return 0.14;
    const h = Math.max(0.2, b.maxY - b.minY);
    return Math.max(0.12, Math.min(0.40, h * 0.18));
  }

  function _sampleRockSurfaceY(x, z, root) {
    const s = root?.scale?.x || 1;
    const footprint = 0.35 + 0.45 * s;
    const pts = [[x, z]];
    if (footprint > 0.2) {
      pts.push([x + footprint, z], [x - footprint, z], [x, z + footprint], [x, z - footprint]);
    }
    let minH = Infinity;
    for (const [px, pz] of pts) {
      const h = getDecorGroundHeight(px, pz);
      if (h < minH) minH = h;
    }
    return Number.isFinite(minH) ? minH : getDecorGroundHeight(x, z);
  }

  /** Ancre le bas réel (vertices monde) sur la surface décor, légèrement enfoncé. */
  let _deferRockSnap = false;

  function setDeferRockSnap(on) {
    _deferRockSnap = !!on;
  }

  function _snapMinableRockToGround(root, x, z) {
    if (!root) return;
    const vis = root.userData.boulderVisual;
    if (vis) vis.position.set(0, 0, 0);
    const surface = _sampleRockSurfaceY(x || 0, z || 0, root);
    root.position.y = surface;
    const bounds = _rockWorldBoundsY(root);
    if (bounds != null) {
      const embed = _rockEmbedDepth(root);
      root.position.y += surface - bounds.minY - embed;
    }
    if (root.userData.decorSpec) {
      root.userData.decorSpec.baseY = root.position.y;
      _refreshDecorCollision(root);
    }
  }

  function resnapMinableRock(root) {
    if (!root?.userData?.prefabId) return;
    const pid = root.userData.prefabId;
    if (pid !== 'spawn_stone' && !pid.startsWith('rock_')) return;
    _snapMinableRockToGround(root, root.position.x, root.position.z);
  }

  function resnapAllMinableRocks(scene) {
    if (!scene) return;
    scene.traverse((o) => {
      if (!o.userData?.boulderVisual || !o.userData?.decorId) return;
      resnapMinableRock(o);
    });
  }

  function _disposeObject3D(o) {
    if (!o) return;
    o.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
        else c.material.dispose?.();
      }
    });
  }

  /** Remonte une fondation existante + recalcule supports/collisions/registre. */
  function _resyncBuildFloorMesh(root, targetY) {
    const prefab = DECOR_PREFABS.build_floor_wood;
    if (!root || !prefab) return;
    const x = root.position.x;
    const z = root.position.z;
    const decorId = root.userData.decorId;
    const terrainY = ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0;
    const supportDrop = Math.max(0, targetY - terrainY);
    while (root.children.length) {
      const c = root.children[0];
      root.remove(c);
      _disposeObject3D(c);
    }
    root.position.y = targetY;
    prefab.build(root, { supportDrop });
    if (root.userData.decorSpec) root.userData.decorSpec.baseY = targetY;
    ZS.registerUpperFloor?.(x, z, prefab.w / 2, prefab.t / 2, targetY + prefab.h);
    ZS.BuildAnchors?.registerFoundation(decorId, x, z, targetY, {
      hw: prefab.w / 2,
      hd: prefab.t / 2,
      level: 0,
    });
    _refreshDecorCollision(root);
    ZS.Network?.patchDecorFloorHeight?.(decorId, targetY);
  }

  function _liftBuildFloors(toLift, targetY) {
    if (!toLift?.length || !Number.isFinite(targetY)) return;
    for (const f of toLift) {
      const root = ZS.Network?.getDecorRoot?.(f.id);
      if (root) _resyncBuildFloorMesh(root, targetY);
    }
  }

  /** Aligne visuellement toutes les fondations connexes à la hauteur max du groupe. */
  function reconcileAllBuildFloors() {
    const lifts = ZS.BuildAnchors?.reconcileAllFoundationHeights?.() || [];
    for (const l of lifts) {
      const root = ZS.Network?.getDecorRoot?.(l.id);
      if (root) _resyncBuildFloorMesh(root, l.targetY);
    }
  }

  function spawnDecorPrefab(scene, prefabId, x, y, z, opts = {}) {
    const prefab = DECOR_PREFABS[prefabId];
    if (!scene || !prefab) return null;
    const isWreck = prefabId.startsWith('wreck_');
    const isMinableRock = prefabId === 'spawn_stone' || prefabId.startsWith('rock_');
    const sink = Number.isFinite(opts.wreckSink) ? opts.wreckSink : 0;
    const s = Number.isFinite(opts.scale) ? opts.scale : 1;
    const groundAt = (px, pz) => (ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(px, pz)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(px, pz) : 0));
    let groundLift = Number.isFinite(opts.groundLift) ? opts.groundLift : null;
    if (isMinableRock && groundLift == null) groundLift = 0;
    if (groundLift == null) groundLift = 0;
    const isBuildFloor = prefab.buildKind === 'floor';
    const isBuildCeiling = prefab.buildKind === 'ceiling';
    const terrainY = ZS.getTerrainHeight
      ? ZS.getTerrainHeight(x || 0, z || 0)
      : groundAt(x || 0, z || 0);
    const groundY = terrainY;
    let deckY;
    if (isBuildFloor) {
      let buildLevel = Number.isFinite(opts.buildLevel) ? Math.max(0, opts.buildLevel) : 0;
      const rawY = Number.isFinite(opts.baseY) ? opts.baseY : (Number.isFinite(y) ? y : null);
      if (ZS.BuildAnchors?.resolveFloorDeckY) {
        deckY = ZS.BuildAnchors.resolveFloorDeckY(
          x || 0, z || 0,
          rawY ?? (terrainY + buildLevel * 2.6),
          opts.decorId || null,
          buildLevel,
        );
        buildLevel = Math.max(0, Math.min(8, Math.floor(Number(opts.buildLevel) || 0)));
      } else {
        deckY = rawY ?? (terrainY + buildLevel * 2.6);
      }
      opts = { ...opts, buildLevel };
    } else if (isBuildCeiling) {
      const buildLevel = Number.isFinite(opts.buildLevel) ? Math.max(0, opts.buildLevel) : 0;
      const rawY = Number.isFinite(opts.baseY) ? opts.baseY : (Number.isFinite(y) ? y : null);
      if (ZS.BuildAnchors?.resolveCeilingDeckY) {
        deckY = ZS.BuildAnchors.resolveCeilingDeckY(x || 0, z || 0, buildLevel)
          ?? rawY
          ?? (terrainY + (buildLevel + 1) * 2.6);
      } else {
        deckY = rawY ?? (terrainY + (buildLevel + 1) * 2.6);
      }
      opts = { ...opts, buildLevel };
    } else if (prefab.buildKind === 'wall' || prefab.buildKind === 'door' || prefab.buildKind === 'stair'
        || prefabId === 'storage_chest') {
      const buildLevel = Number.isFinite(opts.buildLevel) ? Math.max(0, opts.buildLevel) : 0;
      const rawY = Number.isFinite(opts.baseY) ? opts.baseY : (Number.isFinite(y) ? y : terrainY);
      if (ZS.BuildAnchors?.resolveStructureBaseY) {
        deckY = ZS.BuildAnchors.resolveStructureBaseY(x || 0, z || 0, rawY, buildLevel);
      } else {
        deckY = rawY;
      }
      opts = { ...opts, buildLevel };
    } else if (prefabId === 'building_survivor_shack' && opts.grounded !== false) {
      deckY = sampleShackPadHeight(x || 0, z || 0, opts.rotY || 0) + (Number.isFinite(groundLift) ? groundLift : 0);
    } else if (Number.isFinite(opts.baseY)) {
      deckY = opts.baseY;
    } else if (Number.isFinite(y) && y > 0.25) {
      deckY = y;
    } else if (opts.grounded !== false && !isWreck) {
      deckY = getDecorGroundHeight(x || 0, z || 0, { groundLift });
    } else {
      deckY = y || 0;
    }
    if (isBuildFloor && !ZS.BuildAnchors?.resolveFloorDeckY) {
      deckY = Number.isFinite(opts.baseY) ? opts.baseY : (terrainY + (opts.buildLevel || 0) * 2.6);
    } else if ((prefab.buildKind === 'wall' || prefab.buildKind === 'door' || prefab.buildKind === 'stair'
        || prefabId === 'storage_chest')
        && !ZS.BuildAnchors?.resolveStructureBaseY
        && ZS.BuildAnchors?.clampStructureBaseY) {
      const buildLevel = Number.isFinite(opts.buildLevel) ? Math.max(0, opts.buildLevel) : 0;
      deckY = ZS.BuildAnchors.clampStructureBaseY(x || 0, z || 0, deckY, buildLevel);
    } else if (prefabId === 'storage_chest' && ZS.BuildAnchors?.clampStructureBaseY) {
      const buildLevel = Number.isFinite(opts.buildLevel) ? Math.max(0, opts.buildLevel) : 0;
      deckY = ZS.BuildAnchors.clampStructureBaseY(x || 0, z || 0, deckY, buildLevel);
    }
    const supportGroundY = Number.isFinite(opts.supportGroundY) ? opts.supportGroundY : terrainY;
    const supportDrop = isBuildFloor
      ? Math.max(0, deckY - supportGroundY)
      : 0;
    const groundedY = isWreck
      ? groundY - sink
      : deckY;
    const root = new THREE.Group();
    root.position.set(x || 0, groundedY, z || 0);
    root.rotation.set(
      opts.rotX || 0,
      prefabId === 'storage_chest' ? 0 : (opts.rotY || 0),
      opts.rotZ || 0,
    );
    root.scale.setScalar(s);
    root.userData.prefabId = prefabId;
    root.userData.collide = opts.collide !== false;

    const decorId = opts.decorId || `static_${prefabId}_${(x || 0).toFixed(1)}_${(z || 0).toFixed(1)}`;
    root.userData.decorId = decorId;

    scene.add(root);
    const isTree = prefabId.startsWith('tree_');
    const lp = ZS.Network?.getLocalXZ?.();
    const treeDist2 = lp
      ? ((x || 0) - lp.x) ** 2 + ((z || 0) - lp.z) ** 2
      : 0;
    const useSimpleLod = isTree && (opts.simpleLod || treeDist2 > 42 * 42);
    if (useSimpleLod && ZS.TreePrefabs?.buildSimple) {
      ZS.TreePrefabs.buildSimple(root, prefabId);
      root.userData.simpleLod = true;
    } else {
      prefab.build(root, isBuildFloor ? { supportDrop } : opts);
    }

    const decorSpec = {
        decorId,
        kind: 'prefab',
        prefabId,
        x: root.position.x,
        z: root.position.z,
        baseY: root.position.y,
        rotY: _decorYawFromRoot(root),
        rotZ: root.rotation.z,
        scale: s,
        wreckTilt: isWreck ? root.rotation.z : undefined,
        doorOpen: !!opts.doorOpen,
        railLen: Number.isFinite(opts.railLen) ? opts.railLen : undefined,
        rotX: Number.isFinite(opts.rotX) ? opts.rotX : undefined,
      };
    root.userData.decorSpec = decorSpec;

    if (root.userData.doorPivot) {
      const entry = {
        root,
        pivot: root.userData.doorPivot,
        open: !!opts.doorOpen,
        targetOpen: !!opts.doorOpen,
        openAngle: 0,
        doorOpenAngle: Number.isFinite(root.userData.doorPivot.userData?.openAngle)
          ? root.userData.doorPivot.userData.openAngle
          : DOOR_OPEN_ANGLE,
        locked: !!opts.locked,
        lockId: opts.lockId || null,
        lockOwner: opts.lockOwner || null,
      };
      DECOR_DOORS.set(decorId, entry);
      _setDoorVisual(entry, !!opts.doorOpen, { instant: true });
      if (opts.locked) {
        setDecorDoorLockState(decorId, {
          locked: true,
          lockId: opts.lockId,
          lockOwner: opts.lockOwner,
        });
      }
    }
    if (root.userData.isStorage) {
      const entry = {
        root,
        lidPivot: root.userData.storageLidPivot || null,
        open: !!opts.storageOpen,
        targetOpen: !!opts.storageOpen,
        openAngle: 0,
      };
      DECOR_STORAGES.set(decorId, entry);
      setDecorStorageState(decorId, !!opts.storageOpen, { instant: true });
    }
    if (root.userData.isReadableSign) {
      DECOR_SIGNS.set(decorId, {
        root,
        signKind: root.userData.signKind || opts.signKind || 'beach_safe_zone',
      });
    }

    if (prefab.buildKind) {
      DECOR_BUILDS.set(decorId, {
        root,
        prefabId,
        hw: (prefab.w || 3) / 2,
        hd: (prefab.t || prefab.w || 3) / 2,
      });
      root.traverse((o) => {
        if (o.isMesh) o.userData.decorId = decorId;
      });
    }

    if (opts.collide !== false && !isMinableRock) {
      _registerDecorCollision(decorId, decorSpec, root);
    }

    if (prefab.buildKind === 'floor') {
      ZS.registerUpperFloor?.(root.position.x, root.position.z, prefab.w / 2, prefab.t / 2, root.position.y + prefab.h);
      const buildLevel = Number.isFinite(opts.buildLevel)
        ? Math.max(0, opts.buildLevel)
        : 0;
      ZS.BuildAnchors?.registerFoundation(decorId, root.position.x, root.position.z, root.position.y, {
        hw: prefab.w / 2,
        hd: prefab.t / 2,
        level: buildLevel,
      });
      const sentY = Number.isFinite(opts.baseY) ? opts.baseY : y;
      if (Number.isFinite(sentY) && Math.abs(sentY - root.position.y) > 0.05) {
        ZS.Network?.patchDecorFloorHeight?.(decorId, root.position.y);
        ZS.Network?.syncDecorFloorHeight?.(decorId, root.position.y);
      }
      reconcileAllBuildFloors();
    } else if (prefab.buildKind === 'ceiling') {
      ZS.registerUpperFloor?.(
        root.position.x, root.position.z,
        prefab.w / 2, prefab.t / 2,
        root.position.y + prefab.h,
      );
      const buildLevel = Number.isFinite(opts.buildLevel) ? Math.max(0, opts.buildLevel) : 0;
      ZS.BuildAnchors?.registerFoundation(decorId, root.position.x, root.position.z, root.position.y + prefab.h, {
        hw: prefab.w / 2,
        hd: prefab.t / 2,
        level: buildLevel + 1,
      });
    } else if (prefab.buildKind === 'wall' || prefab.buildKind === 'door' || prefab.buildKind === 'stair') {
      const sentY = Number.isFinite(opts.baseY) ? opts.baseY : y;
      if (Number.isFinite(sentY) && Math.abs(sentY - root.position.y) > 0.05) {
        ZS.Network?.patchDecorFloorHeight?.(decorId, root.position.y);
        ZS.Network?.syncDecorFloorHeight?.(decorId, root.position.y);
      }
      if (prefab.buildKind === 'stair') {
        const rotY = root.rotation.y || 0;
        const alongZ = Math.abs(Math.cos(rotY)) > 0.5;
        const sign = alongZ ? Math.cos(rotY) : Math.sin(rotY);
        const lo = sign >= 0 ? root.position.y : root.position.y + prefab.h;
        const hi = sign >= 0 ? root.position.y + prefab.h : root.position.y;
        ZS.registerRamp?.(
          root.position.x,
          root.position.z,
          alongZ ? prefab.w / 2 : prefab.t / 2,
          alongZ ? prefab.t / 2 : prefab.w / 2,
          lo,
          hi,
          alongZ ? 'z' : 'x'
        );
      }
    } else if (prefabId === 'storage_chest') {
      const sentY = Number.isFinite(opts.baseY) ? opts.baseY : y;
      if (Number.isFinite(sentY) && Math.abs(sentY - root.position.y) > 0.05) {
        ZS.Network?.patchDecorFloorHeight?.(decorId, root.position.y);
        ZS.Network?.syncDecorFloorHeight?.(decorId, root.position.y);
      }
    }

    if (prefabId.startsWith('tree_') && ZS.registerChoppableTree) {
      if (!ZS.Options?.getProfile?.()?.shadows) {
        root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
      }
      ZS.registerChoppableTree(scene, root, root.position.x, root.position.z, decorId, {
        prefabId,
        woodMax: opts.woodMax,
        woodRemaining: opts.woodRemaining,
        growthPhase: Number.isFinite(opts.growthPhase) ? opts.growthPhase : 4,
        baseScale: s,
      });
    }

    if (isMinableRock && ZS.registerMinableRock) {
      ZS.registerMinableRock(scene, root, root.position.x, root.position.z, decorId, {
        prefabId,
        stoneMax: opts.stoneMax,
        stoneRemaining: opts.stoneRemaining,
        baseScale: s,
      });
    }

    if (isMinableRock && !_deferRockSnap) _snapMinableRockToGround(root, x, z);

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
  function upgradeTreeLod(root, prefabId, buildOpts = {}) {
    if (!root?.userData?.simpleLod) return false;
    const prefab = DECOR_PREFABS[prefabId];
    if (!prefab) return false;
    while (root.children.length) root.remove(root.children[0]);
    prefab.build(root, buildOpts);
    root.userData.simpleLod = false;
    if (!ZS.Options?.getProfile?.()?.shadows) {
      root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    }
    return true;
  }

  ZS.registerDecorPrefab = registerDecorPrefab;
  ZS.upgradeTreeLod = upgradeTreeLod;
  ZS.listDecorPrefabs   = listDecorPrefabs;
  ZS.findNearestDecorDoor = findNearestDecorDoor;
  ZS.setDecorDoorLockState = setDecorDoorLockState;
  ZS.setDecorDoorState    = setDecorDoorState;
  ZS.refreshDecorCollision = _refreshDecorCollision;
  ZS.unregisterDecorDoor  = unregisterDecorDoor;
  ZS.findNearestDecorStorage = findNearestDecorStorage;
  ZS.findNearestDecorSign = findNearestDecorSign;
  ZS.hitDecorStorage        = hitDecorStorage;
  ZS.hitDecorStorageRay     = hitDecorStorageRay;
  ZS.hitDecorBuild          = hitDecorBuild;
  ZS.hitDecorBuildRay       = hitDecorBuildRay;
  ZS.hitDecorDoorRay        = hitDecorDoorRay;
  ZS.pickDecorInteractRay   = pickDecorInteractRay;
  ZS.getDecorDoorForInteract = getDecorDoorForInteract;
  ZS.getDecorStorageForInteract = getDecorStorageForInteract;
  ZS.getDecorDoorMeta       = getDecorDoorMeta;
  ZS.setDecorStorageState    = setDecorStorageState;
  ZS.unregisterDecorStorage  = unregisterDecorStorage;
  ZS.unregisterDecorSign     = unregisterDecorSign;
  ZS.registerDecorSign       = registerDecorSign;
  ZS.unregisterDecorBuild    = unregisterDecorBuild;
  ZS.tickDecorDoors       = tickDecorDoors;
  ZS.getDecorGroundHeight = getDecorGroundHeight;
  ZS.sampleShackPadHeight = sampleShackPadHeight;
  ZS.getDecorSurfaceLift  = getDecorSurfaceLift;
  ZS.resyncBuildFloorMesh = _resyncBuildFloorMesh;
  ZS.reconcileAllBuildFloors = reconcileAllBuildFloors;
  ZS.buildFloorSupports   = _buildFloorSupports;
  ZS.resnapMinableRock    = resnapMinableRock;
  ZS.resnapAllMinableRocks = resnapAllMinableRocks;
  ZS.setDeferRockSnap = setDeferRockSnap;
  ZS.CAMP_GROUND_LIFT     = CAMP_GROUND_LIFT;
  ZS.TRAIL_SURFACE_LIFT   = TRAIL_SURFACE_LIFT;
}());
