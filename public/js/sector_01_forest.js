// SECTOR 01 — START FOREST
// Zone de spawn. Calme, dense en arbres, peu de zombies.
(function () {
  'use strict';

  // ── Flat zones (exécutées avant buildTerrain) ─────────────────────────────────
  ZS.registerFlatZone(  0,   0,  6,  6, 3);   // Spawn / feu de camp
  ZS.registerFlatZone(-20,  33, 22, 18, 5);   // Campement + grande tente
  ZS.registerFlatZone(-60, -70, 13, 11, 4);   // Cabane forestière nord
  ZS.registerFlatZone(-80,  42, 13, 11, 4);   // Cabane forestière sud
  ZS.registerFlatZone( 82,-100, 18, 11, 5);   // Station essence

  // ── Build ─────────────────────────────────────────────────────────────────────

  function build(scene) {
    const B = ZS.B;
    _buildSpawn(scene, B);
    _buildCampsite(scene, B);
    _buildCabinNorth(scene, B);
    _buildCabinSouth(scene, B);
    _buildGasStation(scene, B);
    _buildForestRoads(scene, B);
    _buildRiver(scene);
    _spawnForestTrees(scene);
    _spawnDeadTrees(scene);
    _buildAbandonedCars(scene, B);
  }

  // ── Zone de spawn ─────────────────────────────────────────────────────────────

  function _buildSpawn(scene, B) {
    const baseY = ZS.getTerrainHeight(0, 0);

    const platMat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
    const plat    = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 0.4, 16), platMat);
    plat.position.set(0, baseY + 0.2, 0);
    plat.receiveShadow = true;
    scene.add(plat);

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x585858 });
    for (let i = 0; i < 7; i++) {
      const a     = i / 7 * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.SphereGeometry(0.18 + (i % 3) * 0.04, 5, 4), stoneMat);
      stone.position.set(Math.cos(a) * 0.62, baseY + 0.34, Math.sin(a) * 0.62);
      stone.castShadow = true;
      scene.add(stone);
    }

    const logMat = new THREE.MeshLambertMaterial({ color: 0x5a3010 });
    for (let i = 0; i < 3; i++) {
      const a   = i / 3 * Math.PI * 2;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.1, 6), logMat);
      log.position.set(Math.cos(a) * 0.28, baseY + 0.38, Math.sin(a) * 0.28);
      log.rotation.z = 0.72;
      log.rotation.y = a;
      log.castShadow = true;
      scene.add(log);
    }

    const fireMat  = new THREE.MeshLambertMaterial({ color: 0xff7700, emissive: 0xff3300, emissiveIntensity: 1.5 });
    const fireMesh = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.82, 7), fireMat);
    fireMesh.position.set(0, baseY + 0.82, 0);
    scene.add(fireMesh);

    const fireLight = new THREE.PointLight(0xff8830, 2.2, 22);
    fireLight.position.set(0, baseY + 1.5, 0);
    scene.add(fireLight);
    ZS.registerFireLight(fireLight, fireMesh);

    B.box(scene,  2.5,  2.2, baseY + 0.4, 0.7, 0.7, 0.7, B.M.wood2);
    B.box(scene,  2.5,  2.2, baseY + 1.1, 0.7, 0.7, 0.7, B.M.wood2);
    B.box(scene,  3.3,  1.6, baseY + 0.4, 0.8, 0.8, 0.8, B.M.wood2);
    B.addCollider({ type: 'box', cx: 2.8, cz: 2.0, hw: 1.2, hd: 1.0 });

    const bagMat = new THREE.MeshLambertMaterial({ color: 0x3a4a2a });
    B.box(scene, -1.8, 1.2, baseY + 0.3, 0.45, 0.6, 0.3, bagMat);
  }

  // ── Campement abandonné ───────────────────────────────────────────────────────

  function _buildCampsite(scene, B) {
    const cx = -20, cz = 33;
    const baseY = ZS.getTerrainHeight(cx, cz);

    // Sol du campement
    B.slab(scene, cx, cz, baseY + 0.01, 40, 32, B.M.dirt);

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
  }

  function _buildCabinSouth(scene, B) {
    const cx = -80, cz = 42;
    B.house(scene, cx, cz, 5.2, 5.2, 2.8, B.M.wood2, B.M.roofDark, 'S');
    _buildBrokenFence(scene, B, cx - 4, cz + 5.5, ZS.getTerrainHeight(cx - 4, cz + 5.5), 8, 'x');
    _buildWoodPile(scene, B, cx + 3.5, cz - 4);
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

  // ── Routes forestières ────────────────────────────────────────────────────────

  function _buildForestRoads(scene, B) {
    const { M, ribbon } = B;

    ribbon(scene, [
      [ 18, -135], [ 12, -100], [  8,  -65], [  4,  -30],
      [  0,    0], [ -4,   30], [ -8,   60], [-12,   90], [-16,  130]
    ], 4.5, M.roadDirt, false);

    ribbon(scene, [
      [  4, -30], [-10, -42], [-28, -56], [-52, -67]
    ], 3.0, M.path, false);

    ribbon(scene, [
      [  8, -65], [ 32, -76], [ 56, -88], [ 80, -98]
    ], 3.5, M.roadDirt, false);

    ribbon(scene, [
      [  0,   0], [ -8,  12], [-14,  22], [-20,  28]
    ], 2.8, M.path, false);

    ribbon(scene, [
      [ -4,  30], [-22,  34], [-46,  37], [-72,  40]
    ], 2.5, M.path, false);
  }

  // ── Rivière ───────────────────────────────────────────────────────────────────

  function _buildRiver(scene) {
    const riverMat = new THREE.MeshLambertMaterial({
      color: 0x1a5e8e, transparent: true, opacity: 0.88,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8,
      depthWrite: false,
    });
    const pts = [
      [-118, -270], [-112, -210], [-106, -150], [-100, -85],
      [ -96,    0], [-100,   75], [-105,  150], [ -98,  210]
    ];
    const width = 10, STEP = 1.5;
    const pos = [], idx = [];
    let prevL = -1;

    for (let si = 0; si < pts.length - 1; si++) {
      const [x0, z0] = pts[si], [x1, z1] = pts[si + 1];
      const sdx = x1 - x0, sdz = z1 - z0;
      const sLen = Math.hypot(sdx, sdz);
      if (sLen < 0.01) continue;
      const nx = -sdz / sLen, nz = sdx / sLen;
      const hw = width / 2;
      const steps = Math.max(1, Math.ceil(sLen / STEP));
      for (let i = (si === 0 ? 0 : 1); i <= steps; i++) {
        const t  = i / steps;
        const x  = x0 + sdx * t, z = z0 + sdz * t;
        // Hauteur fixe légèrement au-dessus du point de terrain le plus bas de la zone
        const y  = ZS.getTerrainHeight(x, z) + 0.55;
        const li = pos.length / 3;
        pos.push(x - nx * hw, y, z - nz * hw, x + nx * hw, y, z + nz * hw);
        if (prevL >= 0) idx.push(prevL, li, prevL + 1, prevL + 1, li, li + 1);
        prevL = li;
      }
    }
    if (pos.length >= 6 && idx.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      scene.add(new THREE.Mesh(geo, riverMat));
    }
  }

  // ── Végétation dense ─────────────────────────────────────────────────────────

  function _spawnForestTrees(scene) {
    const noSpawn = [
      [  0,    0,  8],
      [-20,   33, 24],
      [-60,  -70, 14],
      [-80,   42, 14],
      [ 82, -100, 20],
    ];
    ZS.spawnTreesAt(scene, 0, 0, 80, 130, 0.55, noSpawn);
  }

  function _spawnDeadTrees(scene) {
    ZS.spawnDeadTreesAt(scene,  30, -50, 5, 14);
    ZS.spawnDeadTreesAt(scene, -40,  60, 4, 12);
  }

  // ── Voitures abandonnées ──────────────────────────────────────────────────────

  function _buildAbandonedCars(scene, B) {
    B.car(scene,  14,  -95, -0.3);
    B.car(scene, -35,  -48,  0.8);
    B.car(scene, -92,  -28,  2.1);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  ZS.Buildings.registerSector({ build });
}());
