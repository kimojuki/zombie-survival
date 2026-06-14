// Poteaux + souches + register
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
