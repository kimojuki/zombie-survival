// SECTOR 01 — START FOREST
// Zone de spawn. Calme, dense en arbres, peu de zombies.
(function () {
  'use strict';

  // ── Flat zones (exécutées avant buildTerrain) ─────────────────────────────────
  ZS.registerFlatZone(  0,   0,  6,  6, 3);   // Spawn / feu de camp
  ZS.registerFlatZone(-20,  30, 14, 12, 4);   // Campement abandonné
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

    // Caisses de départ
    B.box(scene,  2.5,  2.2, baseY + 0.4, 0.7, 0.7, 0.7, B.M.wood2);
    B.box(scene,  2.5,  2.2, baseY + 1.1, 0.7, 0.7, 0.7, B.M.wood2);
    B.box(scene,  3.3,  1.6, baseY + 0.4, 0.8, 0.8, 0.8, B.M.wood2);
    B.addCollider({ type: 'box', cx: 2.8, cz: 2.0, hw: 1.2, hd: 1.0 });

    // Sac à dos (mesh décoratif)
    const bagMat = new THREE.MeshLambertMaterial({ color: 0x3a4a2a });
    B.box(scene, -1.8, 1.2, baseY + 0.3, 0.45, 0.6, 0.3, bagMat);
  }

  // ── Campement abandonné ───────────────────────────────────────────────────────

  function _buildCampsite(scene, B) {
    const cx = -20, cz = 30;
    const baseY = ZS.getTerrainHeight(cx, cz);

    B.slab(scene, cx, cz, baseY + 0.01, 12, 10, B.M.dirt);

    // Tente 1
    _buildTent(scene, cx - 3, cz - 2, baseY, 0);
    // Tente 2
    _buildTent(scene, cx + 3.5, cz + 1.5, baseY, Math.PI * 0.4);

    // Feu éteint — cercle de cendres + bûches calcinées
    const ashMat = new THREE.MeshLambertMaterial({ color: 0x252018 });
    scene.add(Object.assign(
      new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.1, 8), ashMat),
      { position: new THREE.Vector3(cx, baseY + 0.06, cz - 4) }
    ));
    const charMat = new THREE.MeshLambertMaterial({ color: 0x181410 });
    for (let i = 0; i < 3; i++) {
      const a   = i / 3 * Math.PI * 2;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.85, 5), charMat);
      log.position.set(cx + Math.cos(a) * 0.22, baseY + 0.12, cz - 4 + Math.sin(a) * 0.22);
      log.rotation.z = 0.9; log.rotation.y = a;
      scene.add(log);
    }

    // Barrique renversée
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x4a3820 });
    const barrel    = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.88, 8), barrelMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(cx + 4.2, baseY + 0.42, cz - 0.5);
    barrel.castShadow = true;
    scene.add(barrel);
    B.addCollider({ x: cx + 4.2, z: cz - 0.5, r: 0.45 });

    // Caisses empilées
    B.box(scene, cx - 4, cz + 2.5, baseY + 0.4,  0.8, 0.8, 0.8, B.M.wood2);
    B.box(scene, cx - 4, cz + 2.5, baseY + 1.2,  0.8, 0.8, 0.8, B.M.wood2);
    B.box(scene, cx - 3.2, cz + 3.3, baseY + 0.4, 0.75, 0.75, 0.75, B.M.wood2);
    B.addCollider({ type: 'box', cx: cx - 3.6, cz: cz + 2.9, hw: 0.9, hd: 0.7 });

    // Section de palissade brisée
    _buildBrokenFence(scene, B, cx + 5.5, cz - 2, baseY, 6, 'z');
  }

  function _buildTent(scene, cx, cz, baseY, rotY) {
    const tentMat = new THREE.MeshLambertMaterial({ color: 0x4a5a3a });
    const geo     = new THREE.ConeGeometry(1.4, 1.6, 4);
    geo.rotateY(Math.PI / 4);
    const tent    = new THREE.Mesh(geo, tentMat);
    tent.position.set(cx, baseY + 0.85, cz);
    tent.rotation.y = rotY;
    tent.castShadow = true;
    scene.add(tent);
    // Sol de tente
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x3a3028 });
    const floor    = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.06, 4), floorMat);
    floor.position.set(cx, baseY + 0.03, cz);
    floor.rotation.y = rotY;
    scene.add(floor);
  }

  function _buildBrokenFence(scene, B, cx, cz, baseY, length, axis) {
    // Palissade partiellement détruite — certains poteaux manquants
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
    // Poteau tombé au sol
    B.box(scene, cx + (axis === 'x' ? 2 : 0), cz + (axis === 'z' ? 2 : 0), baseY + 0.06, axis === 'x' ? 0.1 : 2.0, 0.1, axis === 'z' ? 0.1 : 2.0, B.M.wood2);
  }

  // ── Cabanes forestières ───────────────────────────────────────────────────────

  function _buildCabinNorth(scene, B) {
    const cx = -60, cz = -70;
    B.house(scene, cx, cz, 5.5, 4.5, 2.9, B.M.wood, B.M.roofDark, 'E');

    // Terrasse en bois côté est
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

    // Petite clôture jardin côté sud
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
          cx + (row % 2 === 0 ? 0     : (i - 1.5) * 0.28),
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

    // Panneau indicateur à l'entrée
    const baseY = ZS.getTerrainHeight(72, -95);
    B.box(scene, 72, -95, baseY + 1.8, 0.1, 0.1, 2.8, B.M.metal);
    B.box(scene, 72, -95, baseY + 3.4, 2.2, 0.6, 0.12, B.M.concDark);
  }

  // ── Routes forestières ────────────────────────────────────────────────────────

  function _buildForestRoads(scene, B) {
    const { M, ribbon } = B;

    // Route principale N-S traversant la forêt
    ribbon(scene, [
      [ 18, -135], [ 12, -100], [  8,  -65], [  4,  -30],
      [  0,    0], [ -4,   30], [ -8,   60], [-12,   90], [-16,  130]
    ], 4.2, M.roadDirt, false);

    // Embranchement → cabane nord
    ribbon(scene, [
      [  4, -30], [-10, -42], [-28, -56], [-52, -67]
    ], 2.6, M.path, false);

    // Embranchement → station essence
    ribbon(scene, [
      [  8, -65], [ 32, -76], [ 56, -88], [ 80, -98]
    ], 3.2, M.roadDirt, false);

    // Chemin → campement
    ribbon(scene, [
      [  0,   0], [ -8,  12], [-14,  22], [-20,  30]
    ], 2.2, M.path, false);

    // Chemin → cabane sud
    ribbon(scene, [
      [ -4,  30], [-22,  34], [-46,  37], [-72,  40]
    ], 2.2, M.path, false);
  }

  // ── Rivière ───────────────────────────────────────────────────────────────────

  function _buildRiver(scene) {
    const riverMat = new THREE.MeshLambertMaterial({
      color: 0x2a6e9e, transparent: true, opacity: 0.78,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
    });
    const pts = [
      [-118, -270], [-112, -210], [-106, -150], [-100, -85],
      [ -96,    0], [-100,   75], [-105,  150], [ -98,  210]
    ];
    const width = 9, STEP = 2.0;
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
        const y  = ZS.getTerrainHeight(x, z) + 0.05;
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

  // ── Végétation dense (forêt S01) ──────────────────────────────────────────────

  function _spawnForestTrees(scene) {
    // Zones à éviter (proches de structures)
    const noSpawn = [
      [  0,    0,  8],  // spawn
      [-20,   30, 16],  // campement
      [-60,  -70, 14],  // cabane nord
      [-80,   42, 14],  // cabane sud
      [ 82, -100, 20],  // station
    ];

    ZS.spawnTreesAt(scene, 0, 0, 220, 135, 0.55, noSpawn);
  }

  function _spawnDeadTrees(scene) {
    ZS.spawnDeadTreesAt(scene,  30, -50, 9,  14);   // lisière est
    ZS.spawnDeadTreesAt(scene, -40,  60, 7,  12);   // lisière nord
    ZS.spawnDeadTreesAt(scene,  -5, -90, 6,  10);   // bord sud
  }

  // ── Voitures abandonnées ──────────────────────────────────────────────────────

  function _buildAbandonedCars(scene, B) {
    B.car(scene,  14,  -95, -0.3);   // route menant à la station
    B.car(scene, -35,  -48,  0.8);   // au croisement forêt
    B.car(scene, -92,  -28,  2.1);   // près de la rivière
  }

  // ─────────────────────────────────────────────────────────────────────────────

  ZS.Buildings.registerSector({ build });
}());
