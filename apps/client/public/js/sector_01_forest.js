// SECTOR 01 — START FOREST
// Zone de spawn. Calme, dense en arbres, peu de zombies.
(function () {
  'use strict';

  // ── Carte locale spawn (rayon ~45 m) ─────────────────────────────────────────
  // Clairière au centre → 1 sentier de sortie sud → jonction ville (14,-18)
  // Carrefour forestier isolé à (28,-42) : branches vers cabanes / sud / essence
  // Aucune autre route ne traverse la clairière.
  const SPAWN_CX = 0, SPAWN_CZ = -6;
  const TOWN_JUNCTION = [14, -18];
  const FOREST_HUB    = [28, -42];

  // ── Flat zones ────────────────────────────────────────────────────────────────
  // Spawn : clairière circulaire via RoadNetwork.defineClearing (plus de boîte rectangulaire)
  ZS.registerFlatZone(FOREST_HUB[0], FOREST_HUB[1], 7, 7, 6);
  ZS.registerFlatZone(-20,  33, 22, 18, 8);   // Campement + grande tente
  ZS.registerFlatZone(-60, -70, 13, 11, 6);   // Cabane forestière nord
  ZS.registerFlatZone(-80,  42, 13, 11, 6);   // Cabane forestière sud
  ZS.registerFlatZone( 82,-100, 18, 11, 7);   // Station essence

  const RIVER_PTS = [
    [-118, -270], [-112, -210], [-106, -150], [-100, -85],
    [ -96,    0], [-100,   75], [-105,  150], [ -98,  210]
  ];
  const RIVER_WIDTH = 12;
  const RIVER_WATER_WIDTH = 10;
  const RIVER_DEPTH = 0.18;
  const RIVER_WATER_RISE = 0.26;
  ZS.registerRiverChannel(RIVER_PTS, RIVER_WIDTH, RIVER_DEPTH, 14);
  ZS.registerFlatZone(-104, -9, 18, 5, 5);   // Pont S01→S02

  function _forestRoads() {
    const fallback = (ZS.BEACH_TRAIL_PTS || [
      [242, -8], [215, -8], [175, -7], [130, -6], [85, -6],
      [45, -6], [0, -6], [14, -18],
    ]).map(p => p.slice());
    const trail = (ZS.SPAWN_TRAIL_PTS?.length ? ZS.SPAWN_TRAIL_PTS : fallback).map(p => p.slice());
    return [
      { id: 'spawn_trail', pts: trail, width: 1.25, type: 'dirt', smooth: true },
    ];
  }

  // ── Build ─────────────────────────────────────────────────────────────────────

  function     build(scene) {
    const B = ZS.B;
    _buildSpawn(scene, B);
    if (ZS.buildClearingRing) ZS.buildClearingRing(scene, SPAWN_CX, SPAWN_CZ, B);
    if (ZS.buildSpawnTrail && ZS.SPAWN_TRAIL_PTS) {
      ZS.buildSpawnTrail(scene, ZS.SPAWN_TRAIL_PTS, B);
    } else if (ZS.buildClearingExit) {
      ZS.buildClearingExit(scene, SPAWN_CX, -20, B);
    }
    _buildCampsite(scene, B);
    _buildCabinNorth(scene, B);
    _buildCabinSouth(scene, B);
    _buildGasStation(scene, B);
    _buildUtilityPoles(scene, B);
    _buildTreeStumps(scene, B);
    _buildRiver(scene);
    // Arbres : prefabs seed serveur (decorseed trees) — plus de spawn procédural local
  }

  // ── Zone de spawn ─────────────────────────────────────────────────────────────

  function _buildSpawn(scene, B) {
    const cx = SPAWN_CX, cz = SPAWN_CZ;
    const baseY = ZS.getTerrainHeight(cx, cz);
    ZS.registerLoot('maison', cx, cz, 5, 5);

    if (ZS.buildCampfire) ZS.buildCampfire(scene, cx, cz, baseY);
    if (ZS.buildCampLayout) ZS.buildCampLayout(scene, cx, cz, baseY, B);
    if (ZS.buildCampProps) ZS.buildCampProps(scene, cx, cz, baseY, B);
  }

  // ── Campement abandonné ───────────────────────────────────────────────────────

  function _buildCampsite(scene, B) {
    const cx = -20, cz = 33;
    const baseY = ZS.getTerrainHeight(cx, cz);
    ZS.registerLoot('maison', cx, cz, 18, 14);   // ravitaillement de base au campement

    // Sol du campement temporairement désactivé pour isoler les grands aplats bruns.

    // Grande tente militaire — centre à (-22, 38), entrée vers le sud (z=-D/2)
    _buildLargeTent(scene, B, cx - 2, cz + 5, baseY);

    // Feu éteint en face de l'entrée de la tente
    const ashMat = new THREE.MeshLambertMaterial({ color: 0x252018 });
    const ashMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.1, 8), ashMat);
    ashMesh.position.set(cx, baseY + 0.06, cz - 5);
    scene.add(ashMesh);
    const charMat = new THREE.MeshLambertMaterial({ color: 0x181410 });
    for (let i = 0; i < 4; i++) {
      const a   = i / 4 * Math.PI * 2;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.0, 5), charMat);
      log.position.set(cx + Math.cos(a) * 0.28, baseY + 0.12, cz - 5 + Math.sin(a) * 0.28);
      log.rotation.z = 0.9; log.rotation.y = a;
      scene.add(log);
    }
    // Pierres autour des cendres
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x505050 });
    for (let i = 0; i < 6; i++) {
      const a     = i / 6 * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.SphereGeometry(0.16 + (i % 2) * 0.05, 5, 4), stoneMat);
      stone.position.set(cx + Math.cos(a) * 0.7, baseY + 0.12, cz - 5 + Math.sin(a) * 0.7);
      scene.add(stone);
    }

    // Barriques debout et couchées (à droite de la tente)
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x4a3820 });
    for (const [bx, bz, rz] of [
      [cx + 7, cz - 2, 0],
      [cx + 8.5, cz - 2, 0],
      [cx + 7.8, cz + 0.5, Math.PI / 2],
    ]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.88, 8), barrelMat);
      b.rotation.z = rz;
      b.position.set(bx, baseY + (rz ? 0.42 : 0.46), bz);
      b.castShadow = true;
      scene.add(b);
    }
    B.addCollider({ type: 'box', cx: cx + 8, cz: cz - 0.8, hw: 1.5, hd: 1.6 });

    // Caisses empilées (à gauche)
    B.box(scene, cx - 8,  cz - 3, baseY + 0.4,  0.85, 0.85, 0.85, B.M.wood2);
    B.box(scene, cx - 8,  cz - 3, baseY + 1.25, 0.85, 0.85, 0.85, B.M.wood2);
    B.box(scene, cx - 7,  cz - 2, baseY + 0.4,  0.85, 0.85, 0.85, B.M.wood2);
    B.addCollider({ type: 'box', cx: cx - 7.5, cz: cz - 2.5, hw: 1.2, hd: 1.0 });

    // Table renversée (bois)
    const tableMat = new THREE.MeshLambertMaterial({ color: 0x7a5530 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.0), tableMat);
    table.rotation.z = Math.PI * 0.55;
    table.position.set(cx + 3, baseY + 0.6, cz - 7);
    table.castShadow = true;
    scene.add(table);
    for (const [lx, lz] of [[-0.8,-0.3],[0.8,-0.3],[-0.8,0.3],[0.8,0.3]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 5), tableMat);
      leg.position.set(cx + 3 + lx, baseY + 0.2, cz - 7 + lz);
      scene.add(leg);
    }

    // Table de pique-nique renversée (à gauche du feu)
    _buildPicnicTable(scene, B, cx - 6, cz - 6, baseY);

    // Palettes en bois (marchandises abandonnées)
    for (const [px, pz] of [[cx + 5, cz + 6], [cx + 6.5, cz + 6]]) {
      B.slab(scene, px, pz, baseY + 0.06, 1.2, 0.9, B.M.wood2);
      for (let i = 0; i < 3; i++) {
        B.box(scene, px, pz, baseY + 0.14, 1.2, 0.06, 0.12, B.M.wood2);
        B.box(scene, px, pz - 0.3 + i * 0.3, baseY + 0.09, 0.1, 0.06, 0.9, B.M.wood2);
      }
    }

    // Palissade brisée côté est du camp
    _buildBrokenFence(scene, B, cx + 10, cz, baseY, 10, 'z');
  }

  // ── Grande tente militaire walkable ───────────────────────────────────────────
  // Entrée face au sud (-Z). Le joueur peut entrer librement par l'avant.

  function _buildLargeTent(scene, B, cx, cz, baseY) {
    const W = 11, D = 7.5;
    const eaveH = 2.1;
    const peakH = 3.7;
    const T = 0.14;

    const canvasMat = new THREE.MeshLambertMaterial({ color: 0x4a5a32 });
    const poleMat   = new THREE.MeshLambertMaterial({ color: 0x5c3e18 });

    function panel(px, py, pz, w, h, d, rz) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), canvasMat);
      m.position.set(px, py, pz);
      if (rz) m.rotation.z = rz;
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
    }

    // Sol intérieur
    B.slab(scene, cx, cz, baseY + 0.02, W - 0.2, D - 0.2, B.M.floor);

    // Mur gauche
    panel(cx - W / 2, baseY + eaveH / 2, cz, T, eaveH, D);
    B.addCollider({ type: 'box', cx: cx - W / 2, cz, hw: 0.14, hd: D / 2 });

    // Mur droit
    panel(cx + W / 2, baseY + eaveH / 2, cz, T, eaveH, D);
    B.addCollider({ type: 'box', cx: cx + W / 2, cz, hw: 0.14, hd: D / 2 });

    // Mur arrière (nord, fermé)
    panel(cx, baseY + eaveH / 2, cz + D / 2, W, eaveH, T);
    B.addCollider({ type: 'box', cx, cz: cz + D / 2, hw: W / 2, hd: 0.14 });

    // Avant OUVERT — poteaux d'entrée seulement (pas de collider → le joueur entre)
    const frontZ = cz - D / 2;
    for (const px of [cx - W / 2 + 0.15, cx + W / 2 - 0.15]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, eaveH, 7), poleMat);
      post.position.set(px, baseY + eaveH / 2, frontZ);
      post.castShadow = true;
      scene.add(post);
    }
    // Traverse horizontale au-dessus de l'entrée
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, W - 0.3, 6), poleMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(cx, baseY + eaveH + 0.04, frontZ);
    scene.add(bar);

    // Toit en V — deux panneaux inclinés
    const roofRise = peakH - eaveH;
    const roofRun  = W / 2;
    const roofLen  = Math.sqrt(roofRun * roofRun + roofRise * roofRise);
    const roofAng  = Math.atan2(roofRise, roofRun);
    const midY     = baseY + (eaveH + peakH) / 2;

    panel(cx - W / 4, midY, cz, roofLen, T, D + 0.6,  roofAng);
    panel(cx + W / 4, midY, cz, roofLen, T, D + 0.6, -roofAng);

    // Faîtage (ridge pole)
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, D + 0.8, 6), poleMat);
    ridge.rotation.x = Math.PI / 2;
    ridge.position.set(cx, baseY + peakH + 0.04, cz);
    scene.add(ridge);

    // Poteaux intérieurs portant le faîtage
    for (const pz of [cz - 1.8, cz + 1.8]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, peakH, 7), poleMat);
      pole.position.set(cx, baseY + peakH / 2, pz);
      pole.castShadow = true;
      scene.add(pole);
      B.addCollider({ x: cx, z: pz, r: 0.11 });
    }

    // Mobilier intérieur — caisses de ravitaillement
    B.box(scene, cx - 3, cz + 2.5, baseY + 0.4, 0.8, 0.8, 0.8, B.M.wood2);
    B.box(scene, cx - 2, cz + 2.5, baseY + 0.4, 0.8, 0.8, 0.8, B.M.wood2);
    B.addCollider({ type: 'box', cx: cx - 2.5, cz: cz + 2.5, hw: 1.0, hd: 0.5 });

    // Sac de couchage (décoratif)
    const bagMat = new THREE.MeshLambertMaterial({ color: 0x2a3a22 });
    const bag    = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 1.7, 7), bagMat);
    bag.rotation.z = Math.PI / 2;
    bag.position.set(cx + 3, baseY + 0.3, cz + 2);
    scene.add(bag);
  }

  function _buildBrokenFence(scene, B, cx, cz, baseY, length, axis) {
    const skip = new Set([2]);
    const n    = Math.floor(length / 2);
    for (let i = 0; i <= n; i++) {
      const fx = axis === 'x' ? cx - length / 2 + i * 2 : cx;
      const fz = axis === 'z' ? cz - length / 2 + i * 2 : cz;
      const fy = ZS.getTerrainHeight(fx, fz);
      if (!skip.has(i)) {
        B.box(scene, fx, fz, fy + 0.65, 0.1, 1.3, 0.1, B.M.wood2);
      }
      if (i < n && !skip.has(i)) {
        const rx = axis === 'x' ? fx + 1 : cx;
        const rz = axis === 'z' ? fz + 1 : cz;
        B.box(scene, rx, rz, fy + 1.05, axis === 'x' ? 2.0 : 0.06, 0.06, axis === 'z' ? 2.0 : 0.06, B.M.wood2);
        if (i !== 1)
          B.box(scene, rx, rz, fy + 0.48, axis === 'x' ? 2.0 : 0.06, 0.06, axis === 'z' ? 2.0 : 0.06, B.M.wood2);
      }
    }
    B.box(scene, cx + (axis === 'x' ? 2 : 0), cz + (axis === 'z' ? 2 : 0), baseY + 0.06,
      axis === 'x' ? 0.1 : 2.0, 0.1, axis === 'z' ? 0.1 : 2.0, B.M.wood2);
  }

  // ── Cabanes forestières ───────────────────────────────────────────────────────

  function _buildCabinNorth(scene, B) {
    const cx = -60, cz = -70;
    B.house(scene, cx, cz, 5.5, 4.5, 2.9, B.M.wood, B.M.roofDark, 'E');

    const ty = ZS.getTerrainHeight(cx + 4.2, cz);
    B.slab(scene, cx + 4.2, cz, ty + 0.01, 3.2, 4.2, B.M.wood2);
    B.box(scene, cx + 5.7,  cz,          ty + 0.5, 0.1, 1.0, 4.3, B.M.wood2);
    B.box(scene, cx + 4.2, cz - 2.05,    ty + 0.5, 3.1, 1.0, 0.1, B.M.wood2);
    B.box(scene, cx + 4.2, cz + 2.05,    ty + 0.5, 3.1, 1.0, 0.1, B.M.wood2);

    _buildWoodPile(scene, B, cx - 2, cz - 3);
    _buildWoodPile(scene, B, cx + 1, cz - 3.5);
    // Cabanon de rangement au nord-ouest
    _buildShed(scene, B, cx - 8, cz - 6);
  }

  function _buildCabinSouth(scene, B) {
    const cx = -80, cz = 42;
    B.house(scene, cx, cz, 5.2, 5.2, 2.8, B.M.wood2, B.M.roofDark, 'S');
    _buildBrokenFence(scene, B, cx - 4, cz + 5.5, ZS.getTerrainHeight(cx - 4, cz + 5.5), 8, 'x');
    _buildWoodPile(scene, B, cx + 3.5, cz - 4);
    // Cabanon de rangement à l'est
    _buildShed(scene, B, cx + 8, cz + 2);
  }

  function _buildWoodPile(scene, B, cx, cz) {
    const baseY  = ZS.getTerrainHeight(cx, cz);
    const logMat = new THREE.MeshLambertMaterial({ color: 0x6a3e1a });
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 4; i++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 6), logMat);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = row % 2 === 0 ? 0 : Math.PI / 2;
        log.position.set(
          cx + (row % 2 === 0 ? 0 : (i - 1.5) * 0.28),
          baseY + 0.14 + row * 0.26,
          cz + (row % 2 === 0 ? (i - 1.5) * 0.28 : 0)
        );
        log.castShadow = true;
        scene.add(log);
      }
    }
    B.addCollider({ type: 'box', cx, cz, hw: 0.65, hd: 0.65, maxY: baseY + 0.55 });
  }

  // ── Station essence ───────────────────────────────────────────────────────────

  function _buildGasStation(scene, B) {
    B.gasStation(scene, 82, -100);

    const baseY = ZS.getTerrainHeight(72, -95);
    B.box(scene, 72, -95, baseY + 1.8, 0.1, 0.1, 2.8, B.M.metal);
    B.box(scene, 72, -95, baseY + 3.4, 2.2, 0.6, 0.12, B.M.concDark);
  }

  // ── Rivière ───────────────────────────────────────────────────────────────────

  function _buildRiver(scene) {
    const riverMat = new THREE.MeshLambertMaterial({
      color: 0x1a5e8e, emissive: 0x0a3a6a, emissiveIntensity: 0.14,
      transparent: true, opacity: 0.88,
      side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12,
      depthWrite: false,
    });
    ZS.registerWaterMaterial(riverMat);

    const pts = RIVER_PTS;
    const width = RIVER_WATER_WIDTH;
    const STEP = 1.0;
    const CROSS_SEGS = 10;
    const WATER_LIFT = 0.10;
    const pos = [], idx = [];
    let prevRow = null;

    for (let si = 0; si < pts.length - 1; si++) {
      const [x0, z0] = pts[si], [x1, z1] = pts[si + 1];
      const sdx = x1 - x0, sdz = z1 - z0;
      const sLen = Math.hypot(sdx, sdz);
      if (sLen < 0.01) continue;
      const nx = -sdz / sLen, nz = sdx / sLen;
      const steps = Math.max(1, Math.ceil(sLen / STEP));
      for (let i = (si === 0 ? 0 : 1); i <= steps; i++) {
        const t = i / steps;
        const x = x0 + sdx * t, z = z0 + sdz * t;
        const row = [];
        for (let ci = 0; ci <= CROSS_SEGS; ci++) {
          const u = ci / CROSS_SEGS;
          const off = (u - 0.5) * width;
          const vx = x + nx * off;
          const vz = z + nz * off;
          const bedY = ZS.getTerrainHeight(vx, vz);
          row.push(pos.length / 3);
          pos.push(vx, bedY + RIVER_WATER_RISE + WATER_LIFT, vz);
        }
        if (prevRow) {
          for (let ci = 0; ci < CROSS_SEGS; ci++) {
            const a = prevRow[ci], b = prevRow[ci + 1];
            const c = row[ci], d = row[ci + 1];
            idx.push(a, c, b, c, d, b);
          }
        }
        prevRow = row;
      }
    }
    if (pos.length >= 9 && idx.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, riverMat);
      mesh.renderOrder = 5;
      scene.add(mesh);
      ZS.registerWaterSurface(mesh, 0.04, 1.0);
    }

    for (let si = 0; si < pts.length - 1; si++) {
      const [x0, z0] = pts[si], [x1, z1] = pts[si + 1];
      const sdx = x1 - x0, sdz = z1 - z0;
      const sLen = Math.hypot(sdx, sdz);
      const steps = Math.max(1, Math.floor(sLen / 8));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const wx = x0 + sdx * t, wz = z0 + sdz * t;
        const waterY = ZS.getTerrainHeight(wx, wz) + RIVER_WATER_RISE;
        ZS.registerWaterZone(wx, wz, RIVER_WATER_WIDTH * 0.52, waterY);
      }
    }

    _buildRiverBanks(scene);
  }

  function _buildRiverBanks(scene) {
    const stoneGeo = new THREE.DodecahedronGeometry(1, 0);
    const mudGeo   = new THREE.CylinderGeometry(1, 1, 0.18, 6);
    const stoneMats = [0x6a6872, 0x7a7060, 0x888888, 0x5a5a68]
      .map(c => new THREE.MeshLambertMaterial({ color: c }));
    const mudMat = new THREE.MeshLambertMaterial({ color: 0x4a3828 });

    const bankPts = RIVER_PTS;
    let seed = 0x1A2B3C4D;
    function rr() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 0xffffffff; }

    const perStone = stoneMats.map(() => []);
    const muds     = [];

    for (let si = 0; si < bankPts.length - 1; si++) {
      const [x0, z0] = bankPts[si], [x1, z1] = bankPts[si + 1];
      const sdx = x1 - x0, sdz = z1 - z0;
      const sLen = Math.hypot(sdx, sdz);
      if (sLen < 0.01) continue;
      const nx = -sdz / sLen, nz = sdx / sLen;
      const steps = Math.max(2, Math.ceil(sLen / 14)); // espacés tous les 14 (était 8)

      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const cx = x0 + sdx * t, cz = z0 + sdz * t;

        for (const side of [-1, 1]) {
          const bx = cx + nx * (6 + rr() * 2) * side;
          const bz = cz + nz * (6 + rr() * 2) * side;
          const by = ZS.getTerrainHeight(bx, bz);
          muds.push({ x: bx, y: by + 0.08, z: bz, ry: rr() * Math.PI,
            rx: 1.4 + rr() * 0.8, rz: 1.6 + rr() * 0.8 });

          const nStones = 1 + Math.floor(rr() * 2); // 1-2 (était 2-3)
          for (let k = 0; k < nStones; k++) {
            const sx = bx + (rr() - 0.5) * 3.5, sz = bz + (rr() - 0.5) * 3.5;
            const sy = ZS.getTerrainHeight(sx, sz);
            const sr = 0.12 + rr() * 0.22;
            const mi = Math.floor(rr() * stoneMats.length);
            perStone[mi].push({ x: sx, y: sy + sr * 0.2, z: sz, sr,
              sy: 0.45 + rr() * 0.3,
              rx: rr()*Math.PI, ry: rr()*Math.PI, rz: rr()*Math.PI });
          }
        }
      }
    }

    const dummy = new THREE.Object3D();

    // Galets en InstancedMesh par couleur
    for (let mi = 0; mi < stoneMats.length; mi++) {
      const list = perStone[mi];
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(stoneGeo, stoneMats[mi], list.length);
      im.castShadow = false;
      for (let k = 0; k < list.length; k++) {
        const s = list[k];
        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(s.rx, s.ry, s.rz);
        dummy.scale.set(s.sr, s.sr * s.sy, s.sr);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }

    // Vase en InstancedMesh
    if (muds.length > 0) {
      const im = new THREE.InstancedMesh(mudGeo, mudMat, muds.length);
      im.castShadow = false;
      for (let k = 0; k < muds.length; k++) {
        const m = muds[k];
        dummy.position.set(m.x, m.y, m.z);
        dummy.rotation.set(0, m.ry, 0);
        dummy.scale.set(m.rx, 1, m.rz);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }
  }

  // ── Végétation dense ─────────────────────────────────────────────────────────
  // Arbres prefab : seed serveur (ensureWorldTrees / RCON decorseed trees)

  // ── Poteaux électriques le long de la route principale ───────────────────────

  function _buildUtilityPoles(scene, B) {
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x6a4a20 });
    const wireMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const insMat  = new THREE.MeshLambertMaterial({ color: 0x8a8a8a });

    const poleDefs = [
      [  9, -18.4, 0.03],
      [ 28, -58, 0.06], [ 26, -86, 0.04], [ 22, -116, 0.08], [ 18, -140, 0.05],
    ];

    // ── Phase 1 : poteaux + traverses + isolateurs ────────────────────────────
    // On mémorise la position exacte de chaque isolateur pour la phase 2.
    const isoPositions = []; // [[left3D, right3D], ...]

    for (const [px, pz, tilt] of poleDefs) {
      const py = ZS.getTerrainHeight(px, pz);

      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 5.8, 6), poleMat);
      p.position.set(px, py + 2.9, pz);
      p.rotation.z = tilt * 0.15;
      p.castShadow = true;
      scene.add(p);

      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), poleMat);
      bar.position.set(px, py + 5.52, pz);
      scene.add(bar);

      // Isolateurs — position exacte en 3D enregistrée
      const isoY = py + 5.46;
      const row  = [];
      for (const ox of [-0.95, 0.95]) {
        const ins = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), insMat);
        ins.position.set(px + ox, isoY, pz);
        scene.add(ins);
        row.push(new THREE.Vector3(px + ox, isoY, pz));
      }
      isoPositions.push(row);

      B.addCollider({ x: px, z: pz, r: 0.16 });
    }

    // ── Phase 2 : fils connectés précisément aux isolateurs ───────────────────
    const yAxis = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < isoPositions.length - 1; i++) {
      // 2 fils : gauche (index 0) et droit (index 1)
      for (let side = 0; side < 2; side++) {
        const A = isoPositions[i][side];
        const B2 = isoPositions[i + 1][side];

        const dir    = new THREE.Vector3().subVectors(B2, A);
        const length = dir.length();
        const dirN   = dir.clone().normalize();

        const wire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.022, length, 4),
          wireMat
        );

        // Centre du fil — légère courbure vers le bas (caténaire visuel)
        wire.position.set(
          (A.x + B2.x) / 2,
          (A.y + B2.y) / 2 - 0.18,
          (A.z + B2.z) / 2
        );

        // Orientation 3D correcte : axe Y du cylindre → direction A→B
        wire.quaternion.setFromUnitVectors(yAxis, dirN);

        scene.add(wire);
      }
    }
  }

  // ── Souches d'arbres (forêt exploitée) ───────────────────────────────────────

  function _buildTreeStumps(scene, B) {
    const stumpMat = new THREE.MeshLambertMaterial({ color: 0x5a3818 });
    const cutMat   = new THREE.MeshLambertMaterial({ color: 0x3a2510 });
    const mossMat  = new THREE.MeshLambertMaterial({ color: 0x3a5228 });

    const stumps = [
      [  6, -22, 0.32, 0.38], [ 24, -48, 0.34, 0.40], [-12, -50, 0.28, 0.32],
      [-33, -22, 0.30, 0.34], [ 42,  12, 0.26, 0.28], [-16, -87, 0.40, 0.48],
      [ 30,  58, 0.30, 0.36], [-48, -38, 0.28, 0.32], [ 55, -42, 0.32, 0.38],
      [-24,  65, 0.26, 0.28],
    ];

    for (const [sx, sz, r, h] of stumps) {
      const sy = ZS.getTerrainHeight(sx, sz);

      // Corps de la souche
      const s = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r, h, 7), stumpMat);
      s.position.set(sx, sy + h / 2, sz);
      s.castShadow = true;
      scene.add(s);

      // Dessus de coupe
      const t = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.73, r * 0.73, 0.05, 7), cutMat);
      t.position.set(sx, sy + h + 0.01, sz);
      scene.add(t);

      // Mousse sur le côté (tache verte décorative)
      if (r > 0.30) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 5, 4), mossMat);
        m.position.set(sx + r * 0.4, sy + h * 0.6, sz + r * 0.3);
        m.scale.set(1, 0.5, 0.8);
        scene.add(m);
      }

      B.addCollider({ x: sx, z: sz, r: r + 0.08 });
    }
  }

  // ── Cabanon en bois (petit bâtiment de rangement) ────────────────────────────

  function _buildShed(scene, B, cx, cz) {
    const baseY = ZS.getTerrainHeight(cx, cz);
    const W = 3.4, D = 2.8, wallH = 2.4;
    ZS.registerLoot('chantier', cx, cz, W, D);
    const T = 0.14;

    B.slab(scene, cx, cz, baseY, W, D, B.M.wood2);

    // Murs
    B.wall(scene, cx,        cz - D / 2, baseY, W, T, wallH, B.M.wood2);
    B.wall(scene, cx,        cz + D / 2, baseY, W, T, wallH, B.M.wood2);
    B.wall(scene, cx - W / 2, cz,        baseY, T, D, wallH, B.M.wood2);
    // Mur droit avec petite ouverture (entrée sans porte)
    const g = 0.9, sD = D / 2 - g;
    if (sD > 0.1) {
      B.wall(scene, cx + W / 2, cz - g - sD / 2, baseY, T, sD, wallH, B.M.wood2);
      B.wall(scene, cx + W / 2, cz + g + sD / 2, baseY, T, sD, wallH, B.M.wood2);
      B.wall(scene, cx + W / 2, cz, baseY + 2.0, T, g * 2, wallH - 2.0, B.M.wood2, true);
    }

    // Toit en pignon
    B.slab(scene, cx, cz, baseY + wallH, W + 0.3, D + 0.3, B.M.roofDark);

    // Boîte à outils / objets rangés à l'intérieur
    B.box(scene, cx - 0.8, cz + 0.6, baseY + 0.35, 0.6, 0.5, 0.4, B.M.rust);
    B.box(scene, cx + 0.5, cz - 0.5, baseY + 0.4,  0.7, 0.7, 0.7, B.M.wood2);
  }

  // ── Table de pique-nique ──────────────────────────────────────────────────────

  function _buildPicnicTable(scene, B, cx, cz, baseY) {
    const tableMat = new THREE.MeshLambertMaterial({ color: 0x7a5530 });
    const legMat   = new THREE.MeshLambertMaterial({ color: 0x5c3e20 });

    // Plateau
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.9), tableMat);
    top.position.set(cx, baseY + 0.78, cz);
    top.castShadow = true;
    scene.add(top);

    // Bancs
    for (const bz of [-0.8, 0.8]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.4), tableMat);
      bench.position.set(cx, baseY + 0.46, cz + bz);
      scene.add(bench);
    }

    // Pieds en X (4 paires)
    for (const bx of [-0.75, 0.75]) {
      for (const [ay, az] of [[0.55, -0.4],[0.55, 0.4]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), legMat);
        leg.position.set(cx + bx, baseY + ay / 2, cz + az);
        leg.rotation.x = az > 0 ? 0.45 : -0.45;
        scene.add(leg);
      }
    }

    B.addCollider({ type: 'box', cx, cz, hw: 1.2, hd: 0.5 });
  }

  // ─────────────────────────────────────────────────────────────────────────────

  ZS.registerFlatZone(SPAWN_CX, SPAWN_CZ, 11, 10, 8);
  ZS.Buildings.registerSector({ build, roads: _forestRoads() });
}());
