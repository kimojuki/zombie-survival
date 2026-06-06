// SECTOR 02 — SMALL TOWN
// Ville abandonnée, loot intermédiaire, premiers grands groupes de zombies.
(function () {
  'use strict';

  // Route principale — traverse la map (est → ouest), le sentier spawn arrive sur une ouverture
  const TOWN_MAIN_PTS = [
    [88, -26], [68, -23], [48, -20], [28, -18.5], [14, -18],
    [-8, -18], [-34, -12], [-64, -8], [-78, -9], [-92, -9],
    [-104, -9], [-118, -8], [-155, 0], [-180, 1], [-210, 0], [-250, 1], [-295, 0],
  ];
  const TOWN_ROADS = [
    {
      id: 'town_main',
      pts: TOWN_MAIN_PTS,
      width: 6.2,
      type: 'asphalt',
      line: true,
      broken: true,
      barriers: true,
      smooth: true,
      taperEnd: 14,
    },
  ];
  // ── Build ─────────────────────────────────────────────────────────────────────

  function build(scene) {
    const B = ZS.B;
    _buildAllRoads(scene, B);
    _buildTownSquare(scene, B);
    _buildCemetery(scene, B);
    _buildMiniMarket(scene, B);
    _buildPharmacy(scene, B);
    _buildPoliceStation(scene, B);
    _buildSuperMarche(scene, B);
    _buildChapel(scene, B);
    _buildHouses(scene, B);
    _buildApartment(scene, B);
    _buildParking(scene, B);
    _buildStreetLights(scene, B);
    _buildBusStops(scene, B);
    _buildSignage(scene, B);
    _buildMarketStalls(scene, B);
    _buildUrbanExtras(scene, B);
    _buildStreetProps(scene, B);
  }

  // ── Routes ────────────────────────────────────────────────────────────────────

  function _buildAllRoads(scene, B) {
    // Trottoirs béton le long de la route principale (nord et sud)
    B.slab(scene, -177, -4.5, ZS.getTerrainHeight(-177,-4.5)+0.07, 120, 2.2, B.M.concDark);
    B.slab(scene, -177,  4.5, ZS.getTerrainHeight(-177, 4.5)+0.07, 120, 2.2, B.M.concDark);

    // Trottoirs résidentiels (rues nord et sud des maisons)
    const trotMat = new THREE.MeshLambertMaterial({ color: 0x7e786e, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-3 });
    B.slab(scene, -185, -18.6, ZS.getTerrainHeight(-185,-18.6)+0.05, 136, 1.8, trotMat);
    B.slab(scene, -185,  18.6, ZS.getTerrainHeight(-185, 18.6)+0.05, 136, 1.8, trotMat);

    // Trottoir commercial (entre route principale et façades commerciales côté nord)
    B.slab(scene, -172, -13.2, ZS.getTerrainHeight(-172,-13.2)+0.06, 90, 1.6, trotMat);
    // Trottoir devant le supermarché côté sud
    B.slab(scene, -175,  13.2, ZS.getTerrainHeight(-175, 13.2)+0.06, 80, 1.6, trotMat);

    // Bordures de trottoir (kerb) le long de la route principale
    const kerbMat = new THREE.MeshLambertMaterial({ color: 0xa8a098 });
    B.box(scene, -177, -5.65, ZS.getTerrainHeight(-177,-5.65)+0.09, 120, 0.18, 0.22, kerbMat);
    B.box(scene, -177,  5.65, ZS.getTerrainHeight(-177, 5.65)+0.09, 120, 0.18, 0.22, kerbMat);
  }

  // ── Helpers mobilier ──────────────────────────────────────────────────────────

  // Rayonnage — panneau arrière + 3 étagères
  function _fShelf(scene, B, cx, cz, y, len, axis) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x8a7a4a });
    if (axis === 'x') {
      B.box(scene, cx, cz, y + 1.0, len, 2.0, 0.1, mat);
      for (const h of [0.42, 0.88, 1.45])
        B.box(scene, cx, cz - 0.2, y + h, len, 0.05, 0.44, mat);
    } else {
      B.box(scene, cx, cz, y + 1.0, 0.1, 2.0, len, mat);
      for (const h of [0.42, 0.88, 1.45])
        B.box(scene, cx - 0.2, cz, y + h, 0.44, 0.05, len, mat);
    }
  }

  // Comptoir / bar
  function _fCounter(scene, B, cx, cz, y, lenX, lenZ) {
    B.box(scene, cx, cz, y + 0.52, lenX, 1.04, lenZ, B.M.concDark);
    B.box(scene, cx, cz, y + 1.08, lenX + 0.08, 0.07, lenZ + 0.08, B.M.floor);
  }

  // Canapé simple
  function _fSofa(scene, cx, cz, y, rotY) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x4a4a6a });
    const g   = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 0.8), mat);
    seat.position.set(0, y+0.28, 0); g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 0.14), mat);
    back.position.set(0, y+0.66, -0.33); g.add(back);
    for (const ox of [-0.96, 0.96]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.82), mat);
      arm.position.set(ox, y+0.56, 0); g.add(arm);
    }
    g.rotation.y = rotY || 0;
    g.position.set(cx, 0, cz);
    scene.add(g);
  }

  // Lit
  function _fBed(scene, cx, cz, y, rotY) {
    const frameMat   = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
    const mattMat    = new THREE.MeshLambertMaterial({ color: 0xddccbb });
    const pillowMat  = new THREE.MeshLambertMaterial({ color: 0xeeeedd });
    const g = new THREE.Group();
    const frame1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 2.2), frameMat);
    frame1.position.set(0, y+0.15, 0); g.add(frame1);
    const matt = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 2.0), mattMat);
    matt.position.set(0, y+0.42, 0); g.add(matt);
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 0.1), frameMat);
    headboard.position.set(0, y+0.55, -1.05); g.add(headboard);
    for (const ox of [-0.3, 0.3]) {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.38), pillowMat);
      pillow.position.set(ox, y+0.54, -0.8); g.add(pillow);
    }
    g.rotation.y = rotY || 0;
    g.position.set(cx, 0, cz);
    scene.add(g);
  }

  // Armoire
  function _fWardrobe(scene, B, cx, cz, y) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
    const hdl = new THREE.MeshLambertMaterial({ color: 0xccaa44 });
    B.box(scene, cx, cz, y + 1.0,  1.4, 2.0,  0.55, mat);   // corps
    B.box(scene, cx, cz, y + 2.08, 1.44, 0.16, 0.57, mat);  // corniche
    B.box(scene, cx + 0.32, cz - 0.3, y + 1.0, 0.05, 0.2, 0.08, hdl);
    B.box(scene, cx - 0.32, cz - 0.3, y + 1.0, 0.05, 0.2, 0.08, hdl);
  }

  // Table + 2 chaises
  function _fTable(scene, B, cx, cz, y) {
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x7a5030 });
    B.box(scene, cx, cz, y + 0.76, 1.4, 0.06, 0.85, woodMat);
    for (const [ox,oz] of [[-0.58,-0.33],[0.58,-0.33],[-0.58,0.33],[0.58,0.33]])
      B.box(scene, cx+ox, cz+oz, y+0.38, 0.07, 0.75, 0.07, woodMat);
    for (const oz of [-0.76, 0.76]) {
      B.box(scene, cx, cz+oz, y+0.46, 0.58, 0.06, 0.52, woodMat);
      B.box(scene, cx, cz+oz+(oz<0?-0.21:0.21), y+0.71, 0.58, 0.46, 0.06, woodMat);
    }
  }

  // ── Mini marché (agrandi + intérieur) ─────────────────────────────────────────

  function _buildMiniMarket(scene, B) {
    const cx = -152, cz = -10;
    const W = 15, D = 11, wallH = 3.6;
    ZS.registerLoot('supermarche', cx, cz, W, D);
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.24;

    B.slab(scene, cx, cz, baseY, W, D, B.M.floor);
    B.slab(scene, cx, cz, baseY + wallH, W + 0.3, D + 0.3, B.M.concDark);
    // Parapet
    for (const [ax,az,w,d] of [
      [cx, cz-D/2-0.01, W+0.34, T*0.7], [cx, cz+D/2+0.01, W+0.34, T*0.7],
      [cx-W/2-0.01, cz, T*0.7, D+0.34], [cx+W/2+0.01, cz, T*0.7, D+0.34],
    ]) B.box(scene, ax, az, baseY+wallH+0.28, w, 0.55, d, B.M.concDark);

    // Murs extérieurs
    B.wall(scene, cx,       cz-D/2, baseY, W, T, wallH, B.M.concrete);
    B.wall(scene, cx-W/2,   cz,     baseY, T, D, wallH, B.M.concrete);
    B.wall(scene, cx+W/2,   cz,     baseY, T, D, wallH, B.M.concrete);

    // Façade sud : vitrine large + porte double
    const doorW = 3.2, winW = (W - doorW - 1.2) / 2;
    const lX = cx - doorW/2 - 0.6 - winW/2, rX = cx + doorW/2 + 0.6 + winW/2;
    B.wall(scene, lX, cz+D/2, baseY, winW, T, wallH, B.M.concrete);
    B.wall(scene, rX, cz+D/2, baseY, winW, T, wallH, B.M.concrete);
    B.wall(scene, cx, cz+D/2, baseY+2.8, doorW, T, wallH-2.8, B.M.concrete, true);
    B.box(scene, lX, cz+D/2+0.01, baseY+1.4, winW*0.84, 2.0, 0.06, B.M.window);
    B.box(scene, rX, cz+D/2+0.01, baseY+1.4, winW*0.84, 2.0, 0.06, B.M.window);

    const signMat   = new THREE.MeshLambertMaterial({ color: 0x1e5a2a });
    const awningMat = new THREE.MeshLambertMaterial({ color: 0x8a2a10 });
    B.box(scene, cx, cz+D/2+0.24, baseY+wallH-0.5, W-0.4, 0.72, 0.3, signMat);
    B.box(scene, cx, cz+D/2+1.2,  baseY+2.6, doorW+1.4, 0.12, 2.4, awningMat);
    B.slab(scene, cx, cz+D/2+1.8, baseY+0.07, W+1.0, 3.6, B.M.concDark);

    // ── Intérieur ──
    // 4 rayons d'articles courant le long de Z
    for (const [sx, face] of [[-5.2,'z'],[-2.2,'z'],[0.8,'z'],[3.8,'z']]) {
      _fShelf(scene, B, cx+sx, cz-1.0, baseY, 7.0, face);
    }
    // Comptoir caisse près de l'entrée
    _fCounter(scene, B, cx, cz+3.8, baseY, 5.0, 1.0);
    // Caisse enregistreuse (boîte)
    B.box(scene, cx-1.5, cz+3.8, baseY+1.15, 0.5, 0.3, 0.35, B.M.metal);
    B.box(scene, cx+1.5, cz+3.8, baseY+1.15, 0.5, 0.3, 0.35, B.M.metal);
    // Présentoir réfrigéré (côté est — vitres)
    B.box(scene, cx+W/2-0.6, cz-1.5, baseY+1.0, 0.6, 2.0, 7.5, B.M.metal);
    B.box(scene, cx+W/2-0.35, cz-1.5, baseY+1.0, 0.05, 1.8, 7.3, B.M.window);
    // Rayon renversé au sol (ambiance zombie)
    const shelfMat = new THREE.MeshLambertMaterial({ color: 0x8a7a4a });
    const fallen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 7.0, 2.0), shelfMat);
    fallen.rotation.z = Math.PI / 2;
    fallen.position.set(cx-5.8, baseY+0.55, cz+1.5);
    scene.add(fallen);
    // Produits éparpillés
    const prodMats = [0xcc3322, 0x22aacc, 0xddaa00, 0x44aa22].map(c => new THREE.MeshLambertMaterial({color:c}));
    for (let i = 0; i < 8; i++) {
      const px = cx-5.5 + (i%4)*0.5, pz = cz+0.5+(Math.floor(i/4)*1.2);
      B.box(scene, px, pz, baseY+0.18, 0.28, 0.28, 0.22, prodMats[i%4]);
    }
  }

  // ── Pharmacie (agrandie + intérieur) ──────────────────────────────────────────

  function _buildPharmacy(scene, B) {
    const cx = -192, cz = -10;
    const W = 11, D = 9, wallH = 3.4;
    ZS.registerLoot('hopital', cx, cz, W, D);
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.22;

    B.slab(scene, cx, cz, baseY, W, D, B.M.floor);
    B.slab(scene, cx, cz, baseY+wallH, W+0.28, D+0.28, B.M.roofGray);

    B.wall(scene, cx,       cz-D/2, baseY, W, T, wallH, B.M.brick);
    B.wall(scene, cx-W/2,   cz,     baseY, T, D, wallH, B.M.brick);
    B.wall(scene, cx+W/2,   cz,     baseY, T, D, wallH, B.M.brick);

    const doorW = 1.8, side = W/2 - doorW/2 - 0.15;
    B.wall(scene, cx-doorW/2-side/2, cz+D/2, baseY, side, T, wallH, B.M.brick);
    B.wall(scene, cx+doorW/2+side/2, cz+D/2, baseY, side, T, wallH, B.M.brick);
    B.wall(scene, cx, cz+D/2, baseY+2.4, doorW, T, wallH-2.4, B.M.brick, true);
    B.box(scene, cx-doorW/2-side/2, cz+D/2+0.01, baseY+1.2, side*0.72, 1.5, 0.06, B.M.window);
    B.box(scene, cx+doorW/2+side/2, cz+D/2+0.01, baseY+1.2, side*0.72, 1.5, 0.06, B.M.window);

    const crossMat = new THREE.MeshLambertMaterial({ color: 0x10aa44 });
    B.box(scene, cx, cz+D/2+0.18, baseY+wallH-0.65, 1.1, 0.2, 0.2, crossMat);
    B.box(scene, cx, cz+D/2+0.18, baseY+wallH-0.65, 0.2, 1.1, 0.2, crossMat);
    B.slab(scene, cx, cz+D/2+1.3, baseY+0.07, W+0.8, 2.6, B.M.concDark);

    // ── Intérieur ──
    // Comptoir pharmacien (en L) au fond nord
    _fCounter(scene, B, cx, cz-D/2+1.0, baseY, W-0.6, 1.0);
    _fCounter(scene, B, cx+W/2-1.0, cz-D/2+2.5, baseY, 1.0, 3.5);
    // Rayons muraux nord et est
    _fShelf(scene, B, cx, cz-D/2+0.12, baseY, W-0.6, 'x');
    _fShelf(scene, B, cx+W/2-0.12, cz-1.0, baseY, 5.0, 'z');
    // Zone d'attente (côté sud) — 3 chaises
    const chairMat = new THREE.MeshLambertMaterial({ color: 0x3a6a9a });
    for (let i = 0; i < 3; i++) {
      B.box(scene, cx-2+i*2, cz+D/2-1.5, baseY+0.46, 0.55, 0.06, 0.5, chairMat);
      B.box(scene, cx-2+i*2, cz+D/2-1.72, baseY+0.72, 0.55, 0.48, 0.06, chairMat);
    }
    // Médicaments éparpillés au sol
    const medMat = new THREE.MeshLambertMaterial({ color: 0xaaaaff });
    for (let i = 0; i < 5; i++)
      B.box(scene, cx-2.5+i*0.8, cz+1.0, baseY+0.06, 0.22, 0.12, 0.16, medMat);
  }

  // ── Commissariat de police ────────────────────────────────────────────────────

  function _buildPoliceStation(scene, B) {
    const cx = -138, cz = -36;
    const W = 14, D = 10, wallH = 3.6;
    ZS.registerLoot('police', cx, cz, W, D);
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.28;

    B.slab(scene, cx, cz, baseY, W, D, B.M.concDark);
    B.slab(scene, cx, cz, baseY+wallH, W+0.35, D+0.35, B.M.concDark);
    // Parapet
    for (const [ax,az,w,d] of [
      [cx,cx-0,cz-D/2-0.01,0],[cx,cx-0,cz+D/2+0.01,0],
    ]) {} // skip — use boxes
    B.box(scene,cx,cz-D/2-0.01,baseY+wallH+0.3,W+0.38,0.6,T*0.7,B.M.concDark);
    B.box(scene,cx,cz+D/2+0.01,baseY+wallH+0.3,W+0.38,0.6,T*0.7,B.M.concDark);
    B.box(scene,cx-W/2-0.01,cz,baseY+wallH+0.3,T*0.7,0.6,D+0.38,B.M.concDark);
    B.box(scene,cx+W/2+0.01,cz,baseY+wallH+0.3,T*0.7,0.6,D+0.38,B.M.concDark);

    // Murs
    B.wall(scene, cx,     cz-D/2, baseY, W, T, wallH, B.M.concrete);
    B.wall(scene, cx-W/2, cz,     baseY, T, D, wallH, B.M.concrete);
    B.wall(scene, cx+W/2, cz,     baseY, T, D, wallH, B.M.concrete);

    // Façade sud — porte + deux fenêtres
    const doorW = 2.0, sideW = (W-doorW-1.4)/2;
    B.wall(scene, cx-doorW/2-0.7-sideW/2, cz+D/2, baseY, sideW, T, wallH, B.M.concrete);
    B.wall(scene, cx+doorW/2+0.7+sideW/2, cz+D/2, baseY, sideW, T, wallH, B.M.concrete);
    B.wall(scene, cx, cz+D/2, baseY+2.4, doorW, T, wallH-2.4, B.M.concrete, true);
    B.box(scene, cx-doorW/2-0.7-sideW/2, cz+D/2+0.01, baseY+1.3, sideW*0.75, 1.5, 0.06, B.M.window);
    B.box(scene, cx+doorW/2+0.7+sideW/2, cz+D/2+0.01, baseY+1.3, sideW*0.75, 1.5, 0.06, B.M.window);

    // Bande bleue distinctive
    const blueStripMat = new THREE.MeshLambertMaterial({ color: 0x1a3a8a });
    B.box(scene, cx, cz+D/2+0.01, baseY+wallH*0.4, W-0.02, wallH*0.18, 0.04, blueStripMat);

    // Enseigne POLICE
    const signMat = new THREE.MeshLambertMaterial({ color: 0x0a2060 });
    B.box(scene, cx, cz+D/2+0.22, baseY+wallH-0.55, W-0.4, 0.65, 0.28, signMat);

    // Parvis
    B.slab(scene, cx, cz+D/2+2.5, baseY+0.07, W+2.0, 5.0, B.M.concDark);

    // ── Intérieur ──
    // Accueil (comptoir central)
    _fCounter(scene, B, cx, cz, baseY, 5.0, 1.2);
    // Cellules (côté ouest, barreaux simulés)
    const barMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    for (let bar = 0; bar < 5; bar++)
      B.box(scene, cx-W/2+1.8, cz-D/2+0.5+bar*0.55, baseY+1.35, 0.06, 2.7, 0.06, barMat);
    B.box(scene, cx-W/2+1.8, cz-D/2+1.7, baseY+0.06, 0.06, 0.06, 3.0, barMat); // sol cellule
    // Casiers équipements (côté est)
    for (const oz of [-1.5, -0.5, 0.5]) {
      B.box(scene, cx+W/2-0.8, cz+oz, baseY+1.1, 0.6, 2.2, 0.9, B.M.metal);
      B.box(scene, cx+W/2-0.5, cz+oz, baseY+1.1, 0.02, 2.0, 0.85, B.M.concDark);
    }
    // Bureau avec ordinateur
    _fCounter(scene, B, cx+2.0, cz+D/2-1.5, baseY, 2.5, 0.9);
    B.box(scene, cx+2.0, cz+D/2-1.5, baseY+1.2, 0.5, 0.4, 0.32, B.M.concDark);
  }

  // ── Supermarché ───────────────────────────────────────────────────────────────

  function _buildSuperMarche(scene, B) {
    const cx = -175, cz = 36;
    const W = 20, D = 14, wallH = 4.2;
    ZS.registerLoot('supermarche', cx, cz, W, D);
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.28;

    B.slab(scene, cx, cz, baseY, W, D, B.M.floor);
    B.slab(scene, cx, cz, baseY+wallH, W+0.4, D+0.4, B.M.concDark);
    B.box(scene,cx,cz-D/2-0.01,baseY+wallH+0.3,W+0.44,0.65,T*0.7,B.M.concDark);
    B.box(scene,cx,cz+D/2+0.01,baseY+wallH+0.3,W+0.44,0.65,T*0.7,B.M.concDark);
    B.box(scene,cx-W/2-0.01,cz,baseY+wallH+0.3,T*0.7,0.65,D+0.44,B.M.concDark);
    B.box(scene,cx+W/2+0.01,cz,baseY+wallH+0.3,T*0.7,0.65,D+0.44,B.M.concDark);

    B.wall(scene, cx,     cz+D/2, baseY, W, T, wallH, B.M.concrete);
    B.wall(scene, cx-W/2, cz,     baseY, T, D, wallH, B.M.concrete);
    B.wall(scene, cx+W/2, cz,     baseY, T, D, wallH, B.M.concrete);

    // Façade nord (entrée) — grandes vitrines
    const doorW = 4.0, winW = (W-doorW-1.6)/2;
    const lX = cx-doorW/2-0.8-winW/2, rX = cx+doorW/2+0.8+winW/2;
    B.wall(scene, lX, cz-D/2, baseY, winW, T, wallH, B.M.concrete);
    B.wall(scene, rX, cz-D/2, baseY, winW, T, wallH, B.M.concrete);
    B.wall(scene, cx, cz-D/2, baseY+3.2, doorW, T, wallH-3.2, B.M.concrete, true);
    B.box(scene, lX, cz-D/2-0.01, baseY+1.5, winW*0.85, 2.6, 0.06, B.M.window);
    B.box(scene, rX, cz-D/2-0.01, baseY+1.5, winW*0.85, 2.6, 0.06, B.M.window);

    const signMat = new THREE.MeshLambertMaterial({ color: 0x8a1010 });
    B.box(scene, cx, cz-D/2-0.24, baseY+wallH-0.55, W-0.4, 0.8, 0.32, signMat);
    B.slab(scene, cx, cz-D/2-2.0, baseY+0.07, W+2.0, 4.0, B.M.concDark);

    // ── Intérieur — 5 rayons + caisses + réserve ──
    for (let i = 0; i < 5; i++) {
      const sx = cx - 7.5 + i * 3.5;
      _fShelf(scene, B, sx, cz, baseY, 9.0, 'z');
    }
    // 3 caisses à l'entrée
    for (let i = 0; i < 3; i++)
      _fCounter(scene, B, cx-3+i*3, cz-D/2+1.5, baseY, 1.2, 0.9);
    // Zone fruits/légumes (sol coloré)
    const prodFloor = new THREE.MeshLambertMaterial({ color: 0x3a6a2a });
    B.slab(scene, cx+7, cz+4.5, baseY+0.02, 4.5, 5.0, prodFloor);
    // Présentoirs fruits (boîtes colorées)
    const fruitMats = [0xdd3322,0xffaa00,0x33aa22,0xffdd00].map(c=>new THREE.MeshLambertMaterial({color:c}));
    for (let i = 0; i < 4; i++)
      B.box(scene, cx+5.5+i*0.9, cz+4.5, baseY+0.9, 0.8, 0.6, 0.8, fruitMats[i]);
    // Réserve (cloison arrière)
    B.wall(scene, cx, cz+D/2-2.5, baseY, W, T*0.8, wallH*0.7, B.M.concDark);
    B.wall(scene, cx, cz+D/2-2.5, baseY+wallH*0.7+0.5, 2.5, T*0.8, 1.0, B.M.concDark, true);
  }

  // ── Chapelle ──────────────────────────────────────────────────────────────────

  function _buildChapel(scene, B) {
    const cx = -224, cz = -34;
    const W = 9, D = 13, wallH = 5.0;
    ZS.registerLoot('maison', cx, cz, W, D);
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.32;

    B.slab(scene, cx, cz, baseY, W, D, B.M.floor);
    // Toit pentu (approx avec deux slabs)
    B.slab(scene, cx, cz, baseY+wallH, W+0.4, D+0.4, B.M.roofGray);

    B.wall(scene, cx,     cz-D/2, baseY, W, T, wallH, B.M.brick);
    B.wall(scene, cx,     cz+D/2, baseY, W, T, wallH, B.M.brick);
    B.wall(scene, cx-W/2, cz,     baseY, T, D, wallH, B.M.brick);

    // Façade est (entrée principale) — mur complet + porte en arc + fenêtres
    const chapDoorW = 2.2;
    const chapDoorH = 3.5;
    const eastSide  = (D - chapDoorW) / 2; // 5.4 de chaque côté
    // Deux panneaux latéraux de la façade est
    B.wall(scene, cx+W/2, cz - chapDoorW/2 - eastSide/2, baseY, T, eastSide, wallH, B.M.brick);
    B.wall(scene, cx+W/2, cz + chapDoorW/2 + eastSide/2, baseY, T, eastSide, wallH, B.M.brick);
    // Partie haute au-dessus de la porte (pas de collision)
    B.wall(scene, cx+W/2, cz, baseY+chapDoorH, T, chapDoorW, wallH-chapDoorH, B.M.brick, true);
    // Fenêtres hautes en ogive de chaque côté de l'entrée
    B.box(scene, cx+W/2, cz - chapDoorW/2 - eastSide/2, baseY+1.9, T+0.02, 2.2, eastSide*0.5, B.M.window);
    B.box(scene, cx+W/2, cz + chapDoorW/2 + eastSide/2, baseY+1.9, T+0.02, 2.2, eastSide*0.5, B.M.window);

    // Clocher (tour)
    const towerW = 3.0;
    const towerH = 4.0;
    B.wall(scene, cx, cz-D/2-towerW/2, baseY+wallH, towerW, T, towerH, B.M.brick);
    B.wall(scene, cx, cz-D/2+towerW/2, baseY+wallH, towerW, T, towerH, B.M.brick);
    B.wall(scene, cx-towerW/2, cz-D/2, baseY+wallH, T, towerW, towerH, B.M.brick);
    B.wall(scene, cx+towerW/2, cz-D/2, baseY+wallH, T, towerW, towerH, B.M.brick);
    // Toit du clocher
    const steeple = new THREE.Mesh(new THREE.ConeGeometry(towerW*0.75, 3.5, 4), B.M.roofGray);
    steeple.rotation.y = Math.PI/4;
    steeple.position.set(cx, baseY+wallH+towerH+1.75, cz-D/2);
    scene.add(steeple);

    // ── Intérieur — bancs + autel ──
    const pewMat  = new THREE.MeshLambertMaterial({ color: 0x6a4a1a });
    const altarMat= new THREE.MeshLambertMaterial({ color: 0xf5f0e8 });
    // 4 rangées de bancs (2 côtés)
    for (let row = 0; row < 4; row++) {
      for (const sx of [-2.0, 2.0]) {
        const pz = cz - 3.5 + row * 2.2;
        B.box(scene, cx+sx, pz, baseY+0.5, 1.8, 0.1, 0.5, pewMat);
        B.box(scene, cx+sx, pz-0.22, baseY+0.75, 1.8, 0.48, 0.1, pewMat);
        for (const lx of [cx+sx-0.85, cx+sx+0.85])
          B.box(scene, lx, pz, baseY+0.25, 0.1, 0.5, 0.5, pewMat);
      }
    }
    // Autel
    B.box(scene, cx, cz+D/2-1.5, baseY+0.55, 3.0, 1.1, 1.2, altarMat);
    B.box(scene, cx, cz+D/2-1.5, baseY+1.7,  0.15, 1.8, 0.15, altarMat);
    B.box(scene, cx, cz+D/2-1.5, baseY+2.0,  1.2, 0.12, 0.12, altarMat);
  }

  // ── Maisons résidentielles + intérieurs ───────────────────────────────────────

  function _buildHouses(scene, B) {
    const houses = [
      // [cx, cz, W, D, wallH, wallMat, roofMat, door]
      // Rangée nord (cz=-22, porte vers rue sud)
      [-141, -22, 9.0, 8.0, 3.2, B.M.brick,    B.M.roofRed,  'S'],
      [-163, -22, 9.0, 8.0, 3.1, B.M.wood,     B.M.roofDark, 'S'],
      [-192, -22, 9.0, 8.0, 3.0, B.M.concrete, B.M.roofGray, 'S'],
      [-212, -22, 9.0, 8.0, 3.0, B.M.brick2,   B.M.roofDark, 'S'],
      // Rangée sud (cz=+23, porte vers rue nord)
      [-141,  23, 9.0, 8.0, 3.2, B.M.wood,     B.M.roofRed,  'N'],
      [-163,  23, 9.0, 8.0, 3.0, B.M.brick,    B.M.roofDark, 'N'],
      [-192,  23, 9.0, 8.0, 2.8, B.M.wood2,    B.M.roofGray, 'N'],
      [-212,  23, 9.0, 8.0, 2.9, B.M.concrete, B.M.roofDark, 'N'],
    ];

    for (const [cx, cz, W, D, wH, wM, rM, door] of houses) {
      B.house(scene, cx, cz, W, D, wH, wM, rM, door);
      _furnishHouse(scene, B, cx, cz, ZS.getTerrainHeight(cx, cz), W, D, door);
    }

    _buildRuinedHouse(scene, B, -205, -32);
    _buildGarage(scene, B, -245, -6);
    // Deuxième rangée nord (derrière la principale)
    B.house(scene, -145, -33, 6.5, 6.0, 2.9, B.M.wood2,    B.M.roofDark, 'S');
    B.house(scene, -220, -28, 6.5, 6.0, 2.8, B.M.brick,    B.M.roofRed,  'S');
    // Deuxième rangée sud
    B.house(scene, -145,  33, 6.5, 6.0, 2.8, B.M.brick2,   B.M.roofGray, 'N');
    B.house(scene, -220,  27, 6.5, 6.0, 2.7, B.M.concrete, B.M.roofDark, 'N');
  }

  function _furnishHouse(scene, B, cx, cz, baseY, W, D, doorDir) {
    const T   = 0.16;  // épaisseur cloison
    const pdW = 1.8;   // largeur porte de cloison (joueur passe confortablement)
    const wH  = 2.5;   // hauteur cloison
    const sDir = doorDir === 'S' ? 1 : -1; // +1 = salon côté sud, -1 = salon côté nord

    const salZ  = cz + sDir * D / 4;  // centre du salon
    const chamZ = cz - sDir * D / 4;  // centre de la chambre
    const sw    = (W - pdW) / 2;      // largeur de chaque segment de cloison

    // ── Cloison séparatrice salon / chambre ─────────────────────────────────
    B.wall(scene, cx - pdW/2 - sw/2, cz, baseY, sw,  T,    wH,  B.M.wood2);
    B.wall(scene, cx + pdW/2 + sw/2, cz, baseY, sw,  T,    wH,  B.M.wood2);
    B.box (scene, cx, cz, baseY + 2.25, pdW, 0.28, T, B.M.wood2); // linteau

    // ── Salon (côté porte) ───────────────────────────────────────────────────
    // Canapé : dos vers la cloison, face vers la porte
    _fSofa(scene, cx, salZ - sDir * 0.8, baseY, sDir > 0 ? Math.PI : 0);
    // Table + chaises dans la moitié salon
    _fTable(scene, B, cx - W * 0.1, salZ + sDir * 0.9, baseY);
    // Cuisine contre le mur est du salon
    _fCounter(scene, B, cx + W/2 - 0.7, salZ, baseY, 0.8, D * 0.28);

    // ── Chambre ──────────────────────────────────────────────────────────────
    _fBed     (scene, cx + W * 0.15,  chamZ,            baseY, 0);
    _fWardrobe(scene, B, cx - W * 0.25, chamZ + sDir * 0.4, baseY);

    // ── Colliders mobilier ───────────────────────────────────────────────────
    // Canapé (sautables : height ~0.6)
    B.addCollider({ type:'box', cx,            cz: salZ  - sDir*0.8, hw:1.1,  hd:0.5,  maxY: baseY + 0.6  });
    // Lit (sautables : height ~0.55)
    B.addCollider({ type:'box', cx: cx+W*0.15, cz: chamZ,            hw:0.9,  hd:1.2,  maxY: baseY + 0.55 });
    // Armoire (mur solide, pas de saut)
    B.addCollider({ type:'box', cx: cx-W*0.25, cz: chamZ+sDir*0.4,   hw:0.75, hd:0.3               });
    // Comptoir cuisine
    B.addCollider({ type:'box', cx: cx+W/2-0.7, cz: salZ,            hw:0.45, hd: D * 0.14          });
  }

  function _buildRuinedHouse(scene, B, cx, cz) {
    const baseY = ZS.getTerrainHeight(cx, cz);
    B.slab(scene, cx, cz, baseY, 5.5, 4.5, B.M.dirt);
    B.wall(scene, cx,       cz-2.25, baseY, 5.5, 0.22, 1.6, B.M.brick2);
    B.wall(scene, cx-2.75,  cz,      baseY, 0.22, 4.5, 2.6, B.M.brick2);
    B.wall(scene, cx+2.75,  cz-1.0,  baseY, 0.22, 2.5, 2.0, B.M.brick2);
    for (const [rx,rz,rw,rh,rd] of [
      [cx+1.5,cz+0.5,1.0,0.5,0.8],[cx-1.0,cz+1.5,0.8,0.4,0.6],[cx+0.5,cz-1.0,1.2,0.3,0.7],
    ]) B.box(scene, rx, rz, ZS.getTerrainHeight(rx,rz)+rh/2, rw, rh, rd, B.M.brick2);
  }

  function _buildGarage(scene, B, cx, cz) {
    const baseY = ZS.getTerrainHeight(cx, cz);
    const W = 7.0, D = 6.0, wallH = 3.2;
    ZS.registerLoot('garage', cx, cz, W, D);
    B.slab(scene, cx, cz, baseY, W, D, B.M.concDark);
    B.slab(scene, cx, cz, baseY+wallH, W+0.3, D+0.3, B.M.concDark);
    B.wall(scene, cx,     cz-D/2, baseY, W, 0.25, wallH, B.M.concrete);
    B.wall(scene, cx-W/2, cz,     baseY, 0.25, D, wallH, B.M.concrete);
    B.wall(scene, cx+W/2, cz,     baseY, 0.25, D, wallH, B.M.concrete);
    const doorW = 3.5, doorH = 2.8, sideW = (W-doorW)/2;
    B.wall(scene, cx-doorW/2-sideW/2, cz+D/2, baseY, sideW, 0.25, wallH, B.M.concrete);
    B.wall(scene, cx+doorW/2+sideW/2, cz+D/2, baseY, sideW, 0.25, wallH, B.M.concrete);
    B.wall(scene, cx, cz+D/2, baseY+doorH, doorW, 0.25, wallH-doorH, B.M.concrete, true);
    B.box(scene, cx, cz+D/2+0.01, baseY+doorH/2, doorW-0.1, doorH, 0.06, B.M.metal);

    _fCounter(scene, B, cx-W/2+1.0, cz-D/2+0.9, baseY, 0.9, 2.5);
    _fShelf(scene, B, cx+W/2-0.12, cz-0.5, baseY, 3.5, 'z');
    // Tonneaux de pétrole
    const oilMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    for (const [ox,oz] of [[cx-2.5, cz-2.0],[cx-2.5, cz-1.1]]) {
      const oy = ZS.getTerrainHeight(ox,oz);
      B.box(scene, ox, oz, oy+0.46, 0.55, 0.92, 0.55, oilMat);
    }
  }

  // ── Immeuble ──────────────────────────────────────────────────────────────────

  function _buildApartment(scene, B) {
    B.immeuble2F(scene, -170, -32);
  }

  // ── Parking ───────────────────────────────────────────────────────────────────

  function _buildParking(scene, B) {
    const cx = -152, cz = 7;
    const baseY = ZS.getTerrainHeight(cx, cz);
    B.slab(scene, cx, cz, baseY+0.05, 20, 9, B.M.concDark);
    const lineMat = new THREE.MeshLambertMaterial({
      color: 0xcccccc, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-4
    });
    for (let i = -4; i <= 4; i++)
      B.box(scene, cx+i*2.2, cz-4.3, baseY+0.09, 0.1, 0.01, 8.0, lineMat);
    B.box(scene, cx, cz,     baseY+0.09, 20.4, 0.01, 0.1, lineMat);
    B.box(scene, cx, cz-4.3, baseY+0.09, 20.4, 0.01, 0.1, lineMat);
  }

  // ── Lampadaires ───────────────────────────────────────────────────────────────

  function _buildStreetLights(scene, B) {
    const poleMat  = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const lightMat = new THREE.MeshLambertMaterial({ color:0xffffcc, emissive:0xffeeaa, emissiveIntensity:2.5 });
    const lamps = [
      [-132,-3.5,-1],[-158,-3.5,-1],[-180,-3.5,-1],[-202,-3.5,-1],[-222,-3.5,-1],[-244,-3.5,-1],
      [-144, 3.5, 1],[-168, 3.5, 1],[-192, 3.5, 1],[-215, 3.5, 1],[-238, 3.5, 1],
    ];
    for (const [lx,lz,side] of lamps) {
      const ly = ZS.getTerrainHeight(lx, lz);
      const fz = lz + side*1.55, fy = ly+5.5;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.09,5.8,7), poleMat);
      pole.position.set(lx, ly+2.9, lz); pole.castShadow=true; scene.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,1.8), poleMat);
      arm.position.set(lx, ly+5.6, lz+side*0.7); scene.add(arm);
      const fix = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.24,0.65), lightMat);
      fix.position.set(lx, fy, fz); scene.add(fix);
      const pt = new THREE.PointLight(0xffeecc, 6.0, 40);
      pt.position.set(lx, fy-0.15, fz); scene.add(pt);
      B.addCollider({ x:lx, z:lz, r:0.12 });
    }
  }

  // ── Décors de rue ─────────────────────────────────────────────────────────────

  function _buildStreetProps(scene, B) {
    const darkMat=new THREE.MeshLambertMaterial({color:0x2a2a2a});
    const redMat =new THREE.MeshLambertMaterial({color:0x992222});
    const concMat=new THREE.MeshLambertMaterial({color:0x888070});

    for(const[bx,bz,rz]of[
      [-143,3.5,0],[-161,-4,Math.PI/2],[-196,3.5,0.3],[-183,-3.5,-0.4],[-225,4,0.1],[-243,-3.5,0.2],
    ]){
      const by=ZS.getTerrainHeight(bx,bz);
      const bin=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,0.68,7),darkMat);
      bin.rotation.z=rz; bin.position.set(bx,by+(Math.abs(rz)>0.2?0.22:0.35),bz); bin.castShadow=true;
      scene.add(bin); B.addCollider({x:bx,z:bz,r:0.3});
    }
    for(const[cx,cz]of[[-160,1.2],[-178,-1.8],[-194,1.5],[-215,-2]]){
      const cy=ZS.getTerrainHeight(cx,cz);
      const tc=new THREE.Mesh(new THREE.ConeGeometry(0.18,0.58,6),redMat);
      tc.position.set(cx,cy+0.3,cz); scene.add(tc);
    }
    for(const[bx,bz,ry]of[[-130,-1.5,0.1],[-130,1.8,-0.05],[-248,-2,0.08],[-248,2,0.0]]){
      const by=ZS.getTerrainHeight(bx,bz);
      const bl=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.95,1.6),concMat);
      bl.position.set(bx,by+0.48,bz); bl.rotation.y=ry; bl.castShadow=true; scene.add(bl);
      B.addCollider({type:'box',cx:bx,cz:bz,hw:0.85,hd:0.3});
    }
    for(const lx of[-144,-196,-220]){
      const by=ZS.getTerrainHeight(lx,-6.5);
      _buildBench(scene,B,lx,-6.5,by);
    }
    const mailMat=new THREE.MeshLambertMaterial({color:0x3a5a8a});
    for(const[mx,mz]of[[-141,-8],[-192,-8],[-215,-8]]){
      const my=ZS.getTerrainHeight(mx,mz);
      B.box(scene,mx,mz,my+1.1,0.22,0.28,0.28,mailMat);
      B.box(scene,mx,mz,my+0.55,0.1,1.1,0.1,mailMat);
    }
  }

  function _buildBench(scene, B, cx, cz, baseY) {
    const benchMat=new THREE.MeshLambertMaterial({color:0x6a4a20});
    const metalMat=new THREE.MeshLambertMaterial({color:0x3a3a3a});
    B.box(scene,cx,cz,baseY+0.48,1.9,0.08,0.4,benchMat);
    B.box(scene,cx,cz-0.16,baseY+0.74,1.9,0.06,0.28,benchMat);
    for(const lx of[cx-0.72,cx+0.72]){
      const leg=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.52,0.42),metalMat);
      leg.position.set(lx,baseY+0.26,cz); scene.add(leg);
    }
    B.addCollider({type:'box',cx,cz,hw:1.0,hd:0.25});
  }

  // ── Place centrale ────────────────────────────────────────────────────────────

  function _buildTownSquare(scene, B) {
    const cx = -168, cz = -24;
    const baseY = ZS.getTerrainHeight(cx, cz);

    // Pavés de la place
    const pavMat = new THREE.MeshLambertMaterial({ color: 0x8e8680, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-3 });
    B.slab(scene, cx, cz, baseY+0.03, 20, 10, pavMat);
    // Allée centrale
    const alMat = new THREE.MeshLambertMaterial({ color: 0x7a7268, polygonOffset:true, polygonOffsetFactor:-3, polygonOffsetUnits:-5 });
    B.slab(scene, cx, cz, baseY+0.05, 2.0, 8.8, alMat);

    // Fontaine asséchée (bassin octogonal)
    const stMat = new THREE.MeshLambertMaterial({ color: 0x888078 });
    const msMat = new THREE.MeshLambertMaterial({ color: 0x4a5a48 }); // fond de bassin
    B.box(scene, cx, cz, baseY+0.20, 3.0, 0.40, 3.0, stMat);
    B.slab(scene, cx, cz, baseY+0.42, 2.4, 2.4, msMat);
    B.box(scene, cx, cz-1.2, baseY+0.56, 3.0, 0.28, 0.14, stMat);
    B.box(scene, cx, cz+1.2, baseY+0.56, 3.0, 0.28, 0.14, stMat);
    B.box(scene, cx-1.2, cz, baseY+0.56, 0.14, 0.28, 3.0, stMat);
    B.box(scene, cx+1.2, cz, baseY+0.56, 0.14, 0.28, 3.0, stMat);
    B.box(scene, cx, cz, baseY+0.72, 0.30, 1.30, 0.30, stMat); // colonne
    B.box(scene, cx, cz, baseY+1.72, 0.80, 0.14, 0.80, stMat); // vasque haute
    B.box(scene, cx, cz, baseY+1.10, 0.14, 0.88, 0.14, stMat); // tige médiane
    const plqMat = new THREE.MeshLambertMaterial({ color: 0xb89844 });
    B.box(scene, cx, cz-0.16, baseY+1.05, 0.20, 0.30, 0.05, plqMat); // plaque
    B.addCollider({ type:'box', cx, cz, hw:1.6, hd:1.6 });

    // 4 bacs à fleurs morts aux coins
    const potMat  = new THREE.MeshLambertMaterial({ color: 0x786858 });
    const soilMat = new THREE.MeshLambertMaterial({ color: 0x4a3a28 });
    const stickMat= new THREE.MeshLambertMaterial({ color: 0x6a5030 });
    for (const [ox, oz] of [[-7,-4],[7,-4],[-7,4],[7,4]]) {
      const py = ZS.getTerrainHeight(cx+ox, cz+oz);
      B.box(scene, cx+ox, cz+oz, py+0.30, 0.95, 0.58, 0.95, potMat);
      B.slab(scene, cx+ox, cz+oz, py+0.60, 0.82, 0.82, soilMat);
      B.box(scene, cx+ox, cz+oz, py+0.82, 0.06, 0.48, 0.06, stickMat);
      B.addCollider({ type:'box', cx:cx+ox, cz:cz+oz, hw:0.52, hd:0.52 });
    }

    // Bancs autour de la fontaine
    for (const [bx, bz, ry] of [
      [cx-5, cz, Math.PI/2], [cx+5, cz, -Math.PI/2], [cx, cz-4, 0], [cx, cz+4, Math.PI]
    ]) _buildBench(scene, B, bx, bz, ZS.getTerrainHeight(bx, bz));

    // Panneau d'entrée de ville (côté est de la place)
    const sPole = new THREE.MeshLambertMaterial({ color: 0x4a4a3a });
    const sSign = new THREE.MeshLambertMaterial({ color: 0x1e4a1e });
    const sBord = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const entryX = cx + 9.5, entryZ = cz;
    const eY = ZS.getTerrainHeight(entryX, entryZ);
    B.box(scene, entryX-0.9, entryZ, eY+1.5, 0.10, 3.0, 0.10, sPole);
    B.box(scene, entryX+0.9, entryZ, eY+1.5, 0.10, 3.0, 0.10, sPole);
    B.box(scene, entryX, entryZ, eY+2.9, 2.2, 0.58, 0.14, sSign);
    B.box(scene, entryX, entryZ, eY+2.9, 2.3, 0.60, 0.10, sBord);
  }

  // ── Cimetière ────────────────────────────────────────────────────────────────

  function _buildCemetery(scene, B) {
    const cx = -228, cz = -52;
    const baseY = ZS.getTerrainHeight(cx, cz);

    // Sol sombre du cimetière
    const dkGrass = new THREE.MeshLambertMaterial({ color: 0x283a24, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-3 });
    B.slab(scene, cx, cz, baseY+0.02, 22, 18, dkGrass);
    B.slab(scene, cx, cz, baseY+0.04, 2.0, 14, B.M.concDark); // allée

    // Clôture en fer forgé
    const irMat = new THREE.MeshLambertMaterial({ color: 0x1e1e1e });
    for (const [ax,az,w,d] of [
      [cx,cz-9,22.2,0.07],[cx,cz+9,22.2,0.07],[cx-11,cz,0.07,18.2],[cx+11,cz,0.07,18.2]
    ]) {
      B.box(scene,ax,az,baseY+1.06,w,0.07,d,irMat);
      B.box(scene,ax,az,baseY+0.52,w,0.07,d,irMat);
    }
    for (let i=0;i<=11;i++) { B.box(scene,cx-11+i*2,cz-9,baseY+0.78,0.07,1.56,0.07,irMat); B.box(scene,cx-11+i*2,cz+9,baseY+0.78,0.07,1.56,0.07,irMat); }
    for (let i=0;i<=9;i++)  { B.box(scene,cx-11,cz-9+i*2,baseY+0.78,0.07,1.56,0.07,irMat); B.box(scene,cx+11,cz-9+i*2,baseY+0.78,0.07,1.56,0.07,irMat); }
    // Portail (côté est, face à la chapelle)
    B.box(scene,cx+11,cz+1.6,baseY+1.1,0.12,2.2,0.12,irMat);
    B.box(scene,cx+11,cz-1.6,baseY+1.1,0.12,2.2,0.12,irMat);

    // Pierres tombales (croix + stèles)
    const gSt = new THREE.MeshLambertMaterial({ color: 0x8c8a88 });
    const gDk = new THREE.MeshLambertMaterial({ color: 0x686468 });
    const gMd = new THREE.MeshLambertMaterial({ color: 0x364030, polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-2 });
    for (const [gx,gz,cross] of [
      [-234,-57,true],[-230,-57,false],[-226,-57,true],[-222,-57,false],[-218,-57,true],
      [-232,-51,false],[-228,-51,true],[-224,-51,false],[-220,-51,true],[-216,-51,false],
      [-230,-45,true],[-226,-45,false],[-222,-45,true],[-218,-45,false],
    ]) {
      const gy = ZS.getTerrainHeight(gx,gz);
      B.slab(scene,gx,gz+0.35,gy+0.04,0.52,1.12,gMd);
      if (cross) {
        B.box(scene,gx,gz,gy+0.52,0.12,1.02,0.10,gSt);
        B.box(scene,gx,gz+0.15,gy+0.82,0.46,0.10,0.08,gSt);
      } else {
        B.box(scene,gx,gz-0.1,gy+0.44,0.36,0.88,0.12,gDk);
        B.box(scene,gx,gz-0.1,gy+0.96,0.40,0.14,0.14,gDk);
      }
    }
    // Pierre tombale renversée (atmosphère post-apo)
    const fallen = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.85,0.12), gDk);
    fallen.rotation.z = Math.PI/2.2;
    fallen.position.set(-222, ZS.getTerrainHeight(-222,-45)+0.18, -45);
    scene.add(fallen);

    // Cyprès funèbre
    const cypMat = new THREE.MeshLambertMaterial({ color: 0x0e2818 });
    const cypTrk = new THREE.MeshLambertMaterial({ color: 0x3a2010 });
    const cy2 = ZS.getTerrainHeight(cx-7, cz-7);
    const trC  = new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.16,6.5,8), cypTrk);
    trC.position.set(cx-7, cy2+3.25, cz-7); trC.castShadow=true; scene.add(trC);
    for (const [dy,r] of [[1.0,0.65],[2.1,0.57],[3.2,0.47],[4.2,0.35],[5.2,0.22],[6.1,0.10]]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(r,1.35,7), cypMat);
      c.position.set(cx-7, cy2+dy, cz-7); c.castShadow=true; scene.add(c);
    }
    B.addCollider({ x:cx-7, z:cz-7, r:0.14 });
  }

  // ── Abribus ───────────────────────────────────────────────────────────────────

  function _buildBusStops(scene, B) {
    const frMat  = new THREE.MeshLambertMaterial({ color: 0x2a3a52 });
    const glMat  = new THREE.MeshLambertMaterial({ color: 0x688898, transparent:true, opacity:0.50 });
    const rfMat  = new THREE.MeshLambertMaterial({ color: 0x1e2a40 });
    const slbMat = new THREE.MeshLambertMaterial({ color: 0x7a7268, polygonOffset:true, polygonOffsetFactor:-1 });

    for (const [sx,sz,ry] of [[-148,-4.8,0],[-210,4.8,Math.PI]]) {
      const by = ZS.getTerrainHeight(sx,sz);
      const g  = new THREE.Group();
      g.position.set(sx, by, sz);
      g.rotation.y = ry;

      // Dalle béton devant l'abribus
      const sl = new THREE.Mesh(new THREE.BoxGeometry(3.4,0.08,1.5), slbMat);
      sl.position.set(0,0.04,0); g.add(sl);
      // 2 montants
      for (const px of [-1.45, 1.45]) {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.09,2.7,0.09), frMat);
        pole.position.set(px,1.35,0.52); g.add(pole);
      }
      // Toit
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3,0.10,1.55), rfMat);
      roof.position.set(0,2.75,0.12); g.add(roof);
      // Paroi vitrée arrière
      const pan = new THREE.Mesh(new THREE.BoxGeometry(3.1,2.4,0.06), glMat);
      pan.position.set(0,1.30,0.56); g.add(pan);
      // Panneau publicitaire obstrué
      const adM = new THREE.MeshLambertMaterial({ color:0x3a3a38 });
      const ad  = new THREE.Mesh(new THREE.BoxGeometry(1.1,1.0,0.08), adM);
      ad.position.set(-0.8,1.60,0.59); g.add(ad);
      // Siège
      const stM = new THREE.Mesh(new THREE.BoxGeometry(2.5,0.08,0.36), frMat);
      stM.position.set(0.2,0.52,0.44); g.add(stM);

      scene.add(g);
      B.addCollider({ type:'box', cx:sx, cz:sz, hw:1.8, hd:0.85 });
    }
  }

  // ── Signalisation ────────────────────────────────────────────────────────────

  function _buildSignage(scene, B) {
    const polMat  = new THREE.MeshLambertMaterial({ color: 0x4a4a3a });
    const stopMat = new THREE.MeshLambertMaterial({ color: 0xcc1111 });
    const whtMat  = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    const tfBx    = new THREE.MeshLambertMaterial({ color: 0x181818 });
    const tfRd    = new THREE.MeshLambertMaterial({ color: 0x991111 }); // rouge éteint
    const tfGn    = new THREE.MeshLambertMaterial({ color: 0x113311 }); // vert éteint
    const tfAm    = new THREE.MeshLambertMaterial({ color: 0x442200 }); // orange éteint
    const dirMat  = new THREE.MeshLambertMaterial({ color: 0x1e4a1e });
    const zebMat  = new THREE.MeshLambertMaterial({ color: 0xd4d0c8, polygonOffset:true, polygonOffsetFactor:-3, polygonOffsetUnits:-5 });
    const entMat  = new THREE.MeshLambertMaterial({ color: 0x2a4a22 });

    // --- Panneaux d'entrée / sortie de ville ---
    for (const [ex,ez] of [[-128,-4],[-264, 4]]) {
      const ey = ZS.getTerrainHeight(ex,ez);
      B.box(scene,ex,ez,ey+1.5,0.10,3.0,0.10,polMat);
      B.box(scene,ex,ez,ey+2.9,2.4,0.58,0.14,entMat);
      B.box(scene,ex,ez,ey+2.9,2.5,0.60,0.10,whtMat);
      B.addCollider({ x:ex, z:ez, r:0.10 });
    }

    // --- Feux de circulation (tous éteints/rouges – apocalypse) ---
    for (const [tx,tz] of [[-136,-5.8],[-170,-5.8],[-210,-5.8],[-136,5.8],[-170,5.8],[-210,5.8]]) {
      const ty = ZS.getTerrainHeight(tx,tz);
      B.box(scene,tx,tz,ty+2.5,0.10,5.0,0.10,polMat);
      B.box(scene,tx,tz,ty+5.05,0.38,0.92,0.26,tfBx);
      B.box(scene,tx,tz,ty+5.30,0.26,0.26,0.28,tfRd);
      B.box(scene,tx,tz,ty+5.02,0.26,0.26,0.28,tfAm);
      B.box(scene,tx,tz,ty+4.74,0.26,0.26,0.28,tfGn);
      B.addCollider({ x:tx, z:tz, r:0.10 });
    }

    // --- Panneaux STOP aux intersections ---
    for (const [px,pz] of [[-134,-6.2],[-168,-6.2],[-208,-6.2],[-134,6.2],[-208,6.2]]) {
      const py = ZS.getTerrainHeight(px,pz);
      B.box(scene,px,pz,py+1.5,0.08,3.0,0.08,polMat);
      B.box(scene,px,pz,py+3.12,0.58,0.58,0.10,stopMat);
      B.box(scene,px,pz,py+3.12,0.40,0.40,0.12,whtMat);
      B.addCollider({ x:px, z:pz, r:0.10 });
    }

    // --- Panneaux de direction ---
    for (const [dx,dz,ry] of [[-130,6,0.3],[-130,-5.5,-0.3]]) {
      const dy = ZS.getTerrainHeight(dx,dz);
      B.box(scene,dx,dz,dy+1.5,0.08,4.0,0.08,polMat);
      B.box(scene,dx,dz,dy+3.9,1.8,0.35,0.12,dirMat);
      B.box(scene,dx+0.6,dz,dy+3.9,0.6,0.24,0.14,dirMat); // flèche
      B.addCollider({ x:dx, z:dz, r:0.10 });
    }

    // --- Passages piétons aux transversales ---
    for (const zx of [-136,-170,-210]) {
      for (const zz of [-3.4,-2.2,-1.0,0.2,1.4,2.6]) {
        const zy = ZS.getTerrainHeight(zx,zz)+0.06;
        B.slab(scene,zx,zz,zy,3.2,0.7,zebMat);
      }
    }

    // --- Bollards jaunes le long des trottoirs (toutes les 8m) ---
    const bollMat = new THREE.MeshLambertMaterial({ color: 0xe8b820 });
    for (let bx=-134; bx>=-248; bx-=8) {
      for (const bz of [-5.65, 5.65]) {
        const by = ZS.getTerrainHeight(bx,bz);
        B.box(scene,bx,bz,by+0.52,0.18,1.04,0.18,bollMat);
        B.addCollider({ x:bx, z:bz, r:0.12 });
      }
    }
  }

  // ── Étals de marché abandonnés ────────────────────────────────────────────────

  function _buildMarketStalls(scene, B) {
    const frMat = new THREE.MeshLambertMaterial({ color: 0x5a4530 });
    const tents = [
      { cx:-162, cz:20, col:0x882822 },
      { cx:-172, cz:20, col:0x224488 },
      { cx:-182, cz:20, col:0x4a7222 },
    ];
    for (const { cx, cz, col } of tents) {
      const by = ZS.getTerrainHeight(cx, cz);
      const tMat = new THREE.MeshLambertMaterial({ color:col, side:THREE.DoubleSide });
      // 4 poteaux
      for (const [ox,oz] of [[-1.4,-1.1],[1.4,-1.1],[-1.4,1.1],[1.4,1.1]]) {
        B.box(scene, cx+ox, cz+oz, by+1.2, 0.09, 2.4, 0.09, frMat);
      }
      // Comptoir
      B.box(scene, cx, cz-0.3, by+0.95, 2.7, 0.08, 0.8, frMat);
      B.box(scene, cx, cz-0.3, by+0.52, 2.7, 1.02, 0.08, frMat); // façade
      // Bâche inclinée
      const tPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), tMat);
      tPlane.rotation.set(-Math.PI/2 + 0.20, 0, 0);
      tPlane.position.set(cx, by+2.45, cz);
      scene.add(tPlane);
      // Objets renversés (ambiance zombie)
      B.box(scene, cx+0.5, cz-1.5, by+0.12, 0.6, 0.22, 0.4, frMat);
      B.addCollider({ type:'box', cx, cz, hw:1.5, hd:0.55 });
    }
  }

  // ── Détails urbains ───────────────────────────────────────────────────────────

  function _buildUrbanExtras(scene, B) {
    // --- Bornes incendie ---
    const hyMat = new THREE.MeshLambertMaterial({ color:0xcc2222 });
    const hyCap = new THREE.MeshLambertMaterial({ color:0xccaa10 });
    for (const [hx,hz] of [[-144,-6.8],[-192,-6.8],[-168,6.8],[-215,6.8],[-141,6.8],[-228,-6.8]]) {
      const hy = ZS.getTerrainHeight(hx,hz);
      B.box(scene,hx,hz,hy+0.32,0.22,0.62,0.22,hyMat);
      B.box(scene,hx,hz,hy+0.68,0.30,0.12,0.30,hyMat);
      B.box(scene,hx,hz,hy+0.80,0.18,0.14,0.18,hyCap);
      B.box(scene,hx,hz+0.12,hy+0.36,0.08,0.10,0.28,hyMat); // pipe latérale
      B.addCollider({ x:hx, z:hz, r:0.16 });
    }

    // --- Dumpsters / grosses poubelles ---
    const dpMat = new THREE.MeshLambertMaterial({ color:0x2a4228 });
    const dpLid = new THREE.MeshLambertMaterial({ color:0x223620 });
    for (const [dx,dz] of [[-155,-14],[-195, 13],[-228,13],[-244,-14]]) {
      const dy = ZS.getTerrainHeight(dx,dz);
      B.box(scene,dx,dz,dy+0.72,1.85,1.44,0.92,dpMat);
      B.box(scene,dx+0.2,dz-0.1,dy+1.48,0.88,0.12,0.90,dpLid); // couvercle ouvert (bascule)
      B.box(scene,dx-0.4,dz+0.5,dy+1.48,0.88,0.12,0.90,dpLid);
      B.addCollider({ type:'box', cx:dx, cz:dz, hw:0.98, hd:0.50, maxY:dy+1.5 });
    }

    // --- Kiosque à journaux (fermé, vitres brisées) ---
    const kMat = new THREE.MeshLambertMaterial({ color:0x3a5a3a });
    const kGl  = new THREE.MeshLambertMaterial({ color:0x5a8080, transparent:true, opacity:0.4 });
    const kRf  = new THREE.MeshLambertMaterial({ color:0x284228 });
    const kCnt = new THREE.MeshLambertMaterial({ color:0x303830 });
    B.box(scene,-145.5,8.0,ZS.getTerrainHeight(-145.5,8.0)+1.1,2.2,2.2,1.8,kMat);
    B.box(scene,-145.5,8.0,ZS.getTerrainHeight(-145.5,8.0)+2.28,2.4,0.18,2.0,kRf);
    B.box(scene,-145.5,8.85,ZS.getTerrainHeight(-145.5,8.85)+1.4,1.8,1.0,0.07,kGl);
    B.box(scene,-145.5,8.9,ZS.getTerrainHeight(-145.5,8.9)+0.55,1.8,0.95,0.10,kCnt);
    B.addCollider({ type:'box', cx:-145.5, cz:8.0, hw:1.2, hd:1.0 });

    // --- Cabine téléphonique renversée ---
    const pbMt = new THREE.MeshLambertMaterial({ color:0xcc4422 });
    const pbGl = new THREE.MeshLambertMaterial({ color:0x6a9898, transparent:true, opacity:0.38 });
    const pby  = ZS.getTerrainHeight(-200, 7);
    const booth = new THREE.Mesh(new THREE.BoxGeometry(1.0,2.2,1.0), pbMt);
    booth.rotation.z = Math.PI/2.05;
    booth.position.set(-200, pby+0.55, 7);
    booth.castShadow = true; scene.add(booth);
    const pbW = new THREE.Mesh(new THREE.BoxGeometry(0.06,1.5,0.72), pbGl);
    pbW.rotation.z = Math.PI/2.05;
    pbW.position.set(-200.12, pby+0.55, 7); scene.add(pbW);
    B.addCollider({ type:'box', cx:-200, cz:7, hw:0.55, hd:1.15 });

    // --- Caddie renversé près du supermarché ---
    const cdM = new THREE.MeshLambertMaterial({ color:0x6e6e6e });
    const cdy = ZS.getTerrainHeight(-183, 25);
    const cart = new THREE.Group();
    cart.position.set(-183, cdy, 25);
    cart.rotation.z = 0.42;
    const cBase = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.65,1.5), cdM); cBase.position.set(0,0.42,0); cart.add(cBase);
    const cTop  = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.08,1.5), cdM); cTop.position.set(0,0.76,0);  cart.add(cTop);
    for (const [ox,oz] of [[-0.38,-0.65],[0.38,-0.65],[-0.38,0.65],[0.38,0.65]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.07,7), cdM);
      w.rotation.z = Math.PI/2; w.position.set(ox,-0.05,oz); cart.add(w);
    }
    scene.add(cart);

    // --- Boîtes de jonction électrique sur poteaux ---
    const utM = new THREE.MeshLambertMaterial({ color:0x4a4838 });
    for (const [ux,uz] of [[-150,-6.8],[-172,-6.8],[-200,-6.8],[-226,-6.8]]) {
      const uy = ZS.getTerrainHeight(ux,uz);
      B.box(scene,ux,uz,uy+1.0,0.09,2.0,0.09,utM);
      B.box(scene,ux,uz,uy+1.85,0.38,0.58,0.24,utM);
      B.addCollider({ x:ux, z:uz, r:0.12 });
    }

    // --- Palettes en bois abandonnées (déchets, ambiance) ---
    const palM = new THREE.MeshLambertMaterial({ color:0x7a5530 });
    for (const [px,pz,ry] of [[-158,-14,0.4],[-243,14,-0.3],[-195,-14,0.1]]) {
      const py = ZS.getTerrainHeight(px,pz);
      const pal = new THREE.Group();
      pal.rotation.y = ry; pal.position.set(px,py,pz);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.06,0.9),palM); top.position.y=0.08; pal.add(top);
      for (let pi=0;pi<3;pi++) { const sl=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.06,0.12),palM); sl.position.set(0,0.0,-0.3+pi*0.3); pal.add(sl); }
      for (const lx of [-0.48,0,0.48]) { const r=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.14,0.9),palM); r.position.set(lx,-0.04,0); pal.add(r); }
      scene.add(pal);
    }

    // --- Pierres / rochers décoratifs le long des trottoirs ---
    const rMat = new THREE.MeshLambertMaterial({ color:0x8a8478 });
    for (const [rx,rz,rs] of [
      [-139,-7.5,0.28],[-175,-7.5,0.22],[-220,-7.5,0.30],
      [-152, 7.5,0.25],[-198, 7.5,0.32],[-235, 7.5,0.20],
      [-165,-19.5,0.24],[-205,-19.5,0.26],[-170,19.5,0.22],[-210,19.5,0.28],
    ]) {
      const ry2 = ZS.getTerrainHeight(rx,rz);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rs,0), rMat);
      rock.rotation.set(rx*0.31, rz*0.47, 0);
      rock.position.set(rx, ry2+rs*0.28, rz);
      rock.castShadow=true; scene.add(rock);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  ZS.Buildings.registerSector({ build, roads: TOWN_ROADS });
}());
