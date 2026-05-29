// SECTOR 02 — SMALL TOWN
// Premier vrai point d'intérêt. Ville abandonnée, voitures partout, loot intermédiaire.
(function () {
  'use strict';

  // ── Flat zone — couvre toute la ville ─────────────────────────────────────────
  ZS.registerFlatZone(-170, -2, 60, 40, 10);

  // ── Build ─────────────────────────────────────────────────────────────────────

  function build(scene) {
    const B = ZS.B;
    _buildConnectingRoad(scene, B);
    _buildTownStreets(scene, B);
    _buildMiniMarket(scene, B);
    _buildPharmacy(scene, B);
    _buildHouses(scene, B);
    _buildApartment(scene, B);
    _buildParking(scene, B);
    _buildStreetLights(scene, B);
    _buildAbandonedVehicles(scene, B);
    _buildStreetProps(scene, B);
  }

  // ── Route de connexion S01 → S02 (route asphaltée principale) ────────────────

  function _buildConnectingRoad(scene, B) {
    B.ribbon(scene, [
      [  2,  0], [-28,  1], [-62, -1], [-98,  0],
      [-128, 1], [-155,  0], [-180, 1], [-210,  0], [-238,  1]
    ], 6.2, B.M.road, true);
  }

  // ── Rues internes ─────────────────────────────────────────────────────────────

  function _buildTownStreets(scene, B) {
    const { M, ribbon } = B;

    // Rue résidentielle nord
    ribbon(scene, [
      [-128, -16], [-150, -16], [-172, -16], [-196, -16], [-222, -16]
    ], 4.0, M.road, false);

    // Rue résidentielle sud
    ribbon(scene, [
      [-128, 16], [-150, 16], [-172, 16], [-196, 16], [-222, 16]
    ], 4.0, M.road, false);

    // Rue transversale N-S (centre-ville)
    ribbon(scene, [
      [-170, -40], [-170, -20], [-170, 0], [-170, 20], [-170, 38]
    ], 4.5, M.road, false);
  }

  // ── Mini marché ───────────────────────────────────────────────────────────────

  function _buildMiniMarket(scene, B) {
    const cx = -152, cz = -9;
    const W = 12, D = 8, wallH = 3.4;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.24;

    // Sol + toit plat
    B.slab(scene, cx, cz, baseY, W, D, B.M.floor);
    B.slab(scene, cx, cz, baseY + wallH, W + 0.3, D + 0.3, B.M.concDark);

    // Parapet sur le toit (décoratif, pas de collision)
    B.box(scene, cx, cz - D/2 - 0.01, baseY + wallH + 0.28, W + 0.34, 0.55, T * 0.7, B.M.concDark);
    B.box(scene, cx, cz + D/2 + 0.01, baseY + wallH + 0.28, W + 0.34, 0.55, T * 0.7, B.M.concDark);
    B.box(scene, cx - W/2 - 0.01, cz,  baseY + wallH + 0.28, T * 0.7, 0.55, D + 0.34, B.M.concDark);
    B.box(scene, cx + W/2 + 0.01, cz,  baseY + wallH + 0.28, T * 0.7, 0.55, D + 0.34, B.M.concDark);

    // Murs (nord, est, ouest)
    B.wall(scene, cx,       cz - D/2, baseY, W, T, wallH, B.M.concrete);
    B.wall(scene, cx - W/2, cz,       baseY, T, D, wallH, B.M.concrete);
    B.wall(scene, cx + W/2, cz,       baseY, T, D, wallH, B.M.concrete);

    // Façade sud — porte centrale + deux vitrines
    const doorW = 2.6;
    const winW  = (W - doorW - 1.0) / 2;   // ~4.2
    const lX    = cx - doorW / 2 - 0.5 - winW / 2;
    const rX    = cx + doorW / 2 + 0.5 + winW / 2;
    B.wall(scene, lX, cz + D/2, baseY, winW, T, wallH, B.M.concrete);
    B.wall(scene, rX, cz + D/2, baseY, winW, T, wallH, B.M.concrete);
    B.wall(scene, cx, cz + D/2, baseY + 2.6, doorW, T, wallH - 2.6, B.M.concrete, true);
    // Grandes vitrines
    B.box(scene, lX, cz + D/2 + 0.01, baseY + 1.3, winW * 0.82, 1.9, 0.06, B.M.window);
    B.box(scene, rX, cz + D/2 + 0.01, baseY + 1.3, winW * 0.82, 1.9, 0.06, B.M.window);

    // Enseigne verte
    const signMat = new THREE.MeshLambertMaterial({ color: 0x1e5a2a });
    B.box(scene, cx, cz + D/2 + 0.22, baseY + wallH - 0.5, W - 0.4, 0.68, 0.28, signMat);

    // Auvent rouge au-dessus de l'entrée
    const awningMat = new THREE.MeshLambertMaterial({ color: 0x8a2a10 });
    B.box(scene, cx, cz + D/2 + 1.0, baseY + 2.5, doorW + 1.2, 0.12, 2.0, awningMat);

    // Trottoir béton devant
    B.slab(scene, cx, cz + D/2 + 1.6, baseY + 0.06, W + 1.0, 3.2, B.M.concDark);
  }

  // ── Pharmacie ─────────────────────────────────────────────────────────────────

  function _buildPharmacy(scene, B) {
    const cx = -190, cz = -9;
    const W = 9, D = 7, wallH = 3.2;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.22;

    B.slab(scene, cx, cz, baseY, W, D, B.M.floor);
    B.slab(scene, cx, cz, baseY + wallH, W + 0.28, D + 0.28, B.M.roofGray);

    // Murs
    B.wall(scene, cx,       cz - D/2, baseY, W, T, wallH, B.M.brick);
    B.wall(scene, cx - W/2, cz,       baseY, T, D, wallH, B.M.brick);
    B.wall(scene, cx + W/2, cz,       baseY, T, D, wallH, B.M.brick);

    // Façade sud — porte + fenêtres latérales
    const doorW = 1.8;
    const side  = W / 2 - doorW / 2 - 0.15;
    B.wall(scene, cx - doorW/2 - side/2, cz + D/2, baseY, side, T, wallH, B.M.brick);
    B.wall(scene, cx + doorW/2 + side/2, cz + D/2, baseY, side, T, wallH, B.M.brick);
    B.wall(scene, cx, cz + D/2, baseY + 2.4, doorW, T, wallH - 2.4, B.M.brick, true);
    B.box(scene, cx - doorW/2 - side/2, cz + D/2 + 0.01, baseY + 1.2, side * 0.72, 1.5, 0.06, B.M.window);
    B.box(scene, cx + doorW/2 + side/2, cz + D/2 + 0.01, baseY + 1.2, side * 0.72, 1.5, 0.06, B.M.window);

    // Croix de pharmacie (verte)
    const crossMat = new THREE.MeshLambertMaterial({ color: 0x10aa44 });
    B.box(scene, cx, cz + D/2 + 0.18, baseY + wallH - 0.65, 1.1, 0.2, 0.2, crossMat);
    B.box(scene, cx, cz + D/2 + 0.18, baseY + wallH - 0.65, 0.2, 1.1, 0.2, crossMat);

    // Trottoir
    B.slab(scene, cx, cz + D/2 + 1.3, baseY + 0.06, W + 0.8, 2.6, B.M.concDark);
  }

  // ── Maisons résidentielles ────────────────────────────────────────────────────

  function _buildHouses(scene, B) {
    // Nord de la route principale
    B.house(scene, -141, -22, 5.5, 5.0, 2.9, B.M.brick,    B.M.roofRed,  'S');
    B.house(scene, -162, -24, 6.2, 5.5, 3.0, B.M.wood,     B.M.roofDark, 'E');
    B.house(scene, -192, -22, 5.2, 4.8, 2.8, B.M.concrete, B.M.roofGray, 'S');
    B.house(scene, -215, -17, 4.8, 4.5, 2.7, B.M.brick2,   B.M.roofDark, 'W');

    // Sud de la route principale
    B.house(scene, -140, 22, 5.5, 5.0, 2.8, B.M.wood,     B.M.roofRed,  'N');
    B.house(scene, -163, 25, 6.0, 5.2, 3.0, B.M.brick,    B.M.roofDark, 'N');
    B.house(scene, -191, 22, 5.2, 4.8, 2.7, B.M.wood2,    B.M.roofGray, 'N');
    B.house(scene, -214, 17, 5.0, 4.5, 2.8, B.M.concrete, B.M.roofDark, 'E');

    // Maison partiellement détruite (ambiance zombie)
    _buildRuinedHouse(scene, B, -204, -31);

    // Garage isolé côté ouest
    _buildGarage(scene, B, -228, -7);
  }

  function _buildRuinedHouse(scene, B, cx, cz) {
    const baseY = ZS.getTerrainHeight(cx, cz);
    const W = 5.5, D = 4.5;
    const T = 0.22;

    B.slab(scene, cx, cz, baseY, W, D, B.M.dirt);
    // Murs partiels
    B.wall(scene, cx,       cz - D/2, baseY, W, T, 1.6, B.M.brick2);
    B.wall(scene, cx - W/2, cz,       baseY, T, D, 2.6, B.M.brick2);
    B.wall(scene, cx + W/2, cz - 1.0, baseY, T, 3.5, 2.0, B.M.brick2);
    // Débris au sol
    for (const [rx, rz, rw, rh, rd] of [
      [cx + 1.5, cz + 0.5, 1.0, 0.5, 0.8],
      [cx - 1.0, cz + 1.5, 0.8, 0.4, 0.6],
      [cx + 0.5, cz - 1.2, 1.2, 0.3, 0.7],
      [cx - 0.5, cz - 0.5, 0.6, 0.6, 0.5],
    ]) {
      const ry = ZS.getTerrainHeight(rx, rz);
      B.box(scene, rx, rz, ry + rh / 2, rw, rh, rd, B.M.brick2);
    }
  }

  function _buildGarage(scene, B, cx, cz) {
    const baseY = ZS.getTerrainHeight(cx, cz);
    const W = 6.5, D = 5.5, wallH = 3.0;
    const T = 0.25;

    B.slab(scene, cx, cz, baseY, W, D, B.M.concDark);
    B.slab(scene, cx, cz, baseY + wallH, W + 0.3, D + 0.3, B.M.concDark);

    B.wall(scene, cx,       cz - D/2, baseY, W, T, wallH, B.M.concrete);
    B.wall(scene, cx - W/2, cz,       baseY, T, D, wallH, B.M.concrete);
    B.wall(scene, cx + W/2, cz,       baseY, T, D, wallH, B.M.concrete);

    // Porte de garage (ouverture côté sud, métal rouillé)
    const doorW = 3.2, doorH = 2.6;
    const side  = (W - doorW) / 2;
    B.wall(scene, cx - doorW/2 - side/2, cz + D/2, baseY, side, T, wallH, B.M.concrete);
    B.wall(scene, cx + doorW/2 + side/2, cz + D/2, baseY, side, T, wallH, B.M.concrete);
    B.wall(scene, cx, cz + D/2, baseY + doorH, doorW, T, wallH - doorH, B.M.concrete, true);
    // Panneau de porte (visuel uniquement)
    B.box(scene, cx, cz + D/2 + 0.01, baseY + doorH / 2, doorW - 0.1, doorH, 0.06, B.M.metal);

    // Voiture à l'intérieur (partiellement visible)
    B.car(scene, cx, cz - 0.5, 0);
  }

  // ── Immeuble 2 étages (point de repère visuel dominant) ──────────────────────

  function _buildApartment(scene, B) {
    B.immeuble2F(scene, -170, -31);
  }

  // ── Parking devant le mini-marché ─────────────────────────────────────────────

  function _buildParking(scene, B) {
    const cx = -152, cz = 5;
    const baseY = ZS.getTerrainHeight(cx, cz);

    // Dalle béton
    B.slab(scene, cx, cz, baseY + 0.05, 18, 9, B.M.concDark);

    // Marquage au sol (lignes de places)
    const lineMat = new THREE.MeshLambertMaterial({
      color: 0xcccccc,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    });
    for (let i = -3; i <= 3; i++) {
      B.box(scene, cx + i * 2.5, cz - 4.2, baseY + 0.09, 0.1, 0.01, 7.8, lineMat);
    }
    B.box(scene, cx, cz,       baseY + 0.09, 18.2, 0.01, 0.1, lineMat);
    B.box(scene, cx, cz - 4.2, baseY + 0.09, 18.2, 0.01, 0.1, lineMat);
  }

  // ── Lampadaires ───────────────────────────────────────────────────────────────

  function _buildStreetLights(scene, B) {
    const poleMat  = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const lightMat = new THREE.MeshLambertMaterial({
      color: 0xffffcc, emissive: 0xffeeaa, emissiveIntensity: 2.5,
    });

    // [x, z, côté bras vers la route]
    const lamps = [
      [-132, -3.5, -1], [-158, -3.5, -1], [-180, -3.5, -1], [-202, -3.5, -1], [-222, -3.5, -1],
      [-144,  3.5,  1], [-168,  3.5,  1], [-192,  3.5,  1], [-215,  3.5,  1],
    ];

    for (const [lx, lz, armSide] of lamps) {
      const ly = ZS.getTerrainHeight(lx, lz);
      const fixtureZ = lz + armSide * 1.55;
      const fixtureY = ly + 5.5;

      // Poteau
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 5.8, 7), poleMat);
      pole.position.set(lx, ly + 2.9, lz);
      pole.castShadow = true;
      scene.add(pole);

      // Bras
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.8), poleMat);
      arm.position.set(lx, ly + 5.6, lz + armSide * 0.7);
      scene.add(arm);

      // Fixture (émissive visible de jour)
      const fix = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.65), lightMat);
      fix.position.set(lx, fixtureY, fixtureZ);
      scene.add(fix);

      // PointLight — éclaire la route autour du lampadaire
      const ptLight = new THREE.PointLight(0xffeecc, 6.0, 40);
      ptLight.position.set(lx, fixtureY - 0.15, fixtureZ);
      scene.add(ptLight);

      B.addCollider({ x: lx, z: lz, r: 0.12 });
    }
  }

  // ── Véhicules abandonnés ──────────────────────────────────────────────────────

  function _buildAbandonedVehicles(scene, B) {
    // Bus en travers de la route — déplacé loin du spawn (-170,0)
    _buildBus(scene, B, -158, 3.5, 0.18);

    // Embouteillage sur la route principale
    B.car(scene, -136, -2.0,  0.08);
    B.car(scene, -144,  2.2, -0.05);
    B.car(scene, -157, -1.8,  3.18);
    B.car(scene, -182,  2.0,  0.10);
    B.car(scene, -196, -1.5, -0.08);
    B.car(scene, -209,  2.2,  3.12);
    B.car(scene, -222, -1.0,  0.06);

    // Voitures dans les rues résidentielles
    B.car(scene, -146, -19,  0.50);
    B.car(scene, -183, -20, -0.40);
    B.car(scene, -145,  19,  3.20);
    B.car(scene, -200,  20,  0.25);

    // Parking (quelques voitures restées)
    B.car(scene, -143, 4.5, -0.15);
    B.car(scene, -158, 4.5,  0.05);
  }

  function _buildBus(scene, B, cx, cz, rotY) {
    const py      = ZS.getTerrainHeight(cx, cz);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1e2a6a });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x181818 });
    const glassMat= new THREE.MeshLambertMaterial({ color: 0x3a5566, transparent: true, opacity: 0.55 });
    const g       = new THREE.Group();

    // Corps
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.1, 9.0), bodyMat);
    body.position.y = 1.12; body.castShadow = true; body.receiveShadow = true;
    g.add(body);

    // Toit
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 8.8), bodyMat);
    roof.position.y = 2.24; g.add(roof);

    // Fenêtres latérales (5 de chaque côté)
    for (let i = 0; i < 5; i++) {
      for (const sx of [-1.27, 1.27]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 1.3), glassMat);
        win.position.set(sx, 1.65, -3.0 + i * 1.52);
        g.add(win);
      }
    }
    // Pare-brises
    const fw = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.0, 0.05), glassMat);
    fw.position.set(0, 1.65, -4.46); g.add(fw);
    const bw = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.0, 0.05), glassMat);
    bw.position.set(0, 1.65, 4.46); g.add(bw);

    // Bande jaune de flanc
    const stripMat = new THREE.MeshLambertMaterial({ color: 0xddcc00 });
    for (const sx of [-1.27, 1.27]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 8.6), stripMat);
      strip.position.set(sx, 0.6, 0); g.add(strip);
    }

    // Roues (6)
    for (const [ox, oz] of [[-1.3,-3.1],[1.3,-3.1],[-1.3,0],[1.3,0],[-1.3,3.1],[1.3,3.1]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.28, 9), darkMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(ox, 0.48, oz);
      g.add(w);
    }

    g.position.set(cx, py, cz);
    g.rotation.y = rotY;
    scene.add(g);
    B.addCollider({ type: 'box', cx, cz, hw: 1.35, hd: 4.6 });
  }

  // ── Décors de rue ─────────────────────────────────────────────────────────────

  function _buildStreetProps(scene, B) {
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const redMat  = new THREE.MeshLambertMaterial({ color: 0x992222 });

    // Poubelles renversées
    for (const [bx, bz, rz] of [
      [-143,  3.5, 0    ], [-161, -4.0,  Math.PI/2],
      [-196,  3.5, 0.3  ], [-183, -3.5, -0.4      ],
      [-225,  4.0, 0.1  ],
    ]) {
      const by = ZS.getTerrainHeight(bx, bz);
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.68, 7), darkMat);
      bin.rotation.z = rz;
      bin.position.set(bx, by + (Math.abs(rz) > 0.2 ? 0.22 : 0.35), bz);
      bin.castShadow = true;
      scene.add(bin);
      B.addCollider({ x: bx, z: bz, r: 0.3 });
    }

    // Cônes de signalisation
    for (const [cx, cz] of [[-160, 1.2], [-178, -1.8], [-194, 1.5]]) {
      const cy = ZS.getTerrainHeight(cx, cz);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.58, 6), redMat);
      cone.position.set(cx, cy + 0.30, cz);
      scene.add(cone);
    }

    // Barricades (blocs de béton anti-véhicule)
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x888070 });
    for (const [bx, bz, rotY] of [
      [-130, -1.5, 0.1], [-130, 1.8, -0.05],
    ]) {
      const by = ZS.getTerrainHeight(bx, bz);
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 1.6), concreteMat);
      block.position.set(bx, by + 0.48, bz);
      block.rotation.y = rotY;
      block.castShadow = true;
      scene.add(block);
      B.addCollider({ type: 'box', cx: bx, cz: bz, hw: 0.85, hd: 0.3 });
    }

    // Bancs sur trottoir nord
    for (const lx of [-144, -196]) {
      const by = ZS.getTerrainHeight(lx, -6.5);
      _buildBench(scene, B, lx, -6.5, by);
    }

    // Boîtes aux lettres
    const mailMat = new THREE.MeshLambertMaterial({ color: 0x3a5a8a });
    for (const [mx, mz] of [[-143, -8], [-190, -8]]) {
      const my = ZS.getTerrainHeight(mx, mz);
      B.box(scene, mx, mz, my + 1.1, 0.22, 0.28, 0.28, mailMat);
      B.box(scene, mx, mz, my + 0.55, 0.1, 1.1, 0.1, mailMat);
    }
  }

  function _buildBench(scene, B, cx, cz, baseY) {
    const benchMat = new THREE.MeshLambertMaterial({ color: 0x6a4a20 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });

    // Assise
    B.box(scene, cx, cz, baseY + 0.48, 1.9, 0.08, 0.4, benchMat);
    // Dossier
    B.box(scene, cx, cz - 0.16, baseY + 0.74, 1.9, 0.06, 0.28, benchMat);
    // Pieds métalliques
    for (const lx of [cx - 0.72, cx + 0.72]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.42), metalMat);
      leg.position.set(lx, baseY + 0.26, cz);
      scene.add(leg);
    }
    B.addCollider({ type: 'box', cx, cz, hw: 1.0, hd: 0.25 });
  }

  // ─────────────────────────────────────────────────────────────────────────────

  ZS.Buildings.registerSector({ build });
}());
