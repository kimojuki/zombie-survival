// Tentes + cabanes + essence
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
