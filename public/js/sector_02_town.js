// SECTOR 02 — SMALL TOWN
// Ville abandonnée, loot intermédiaire, premiers grands groupes de zombies.
(function () {
  'use strict';

  // ── Flat zone étendue ─────────────────────────────────────────────────────────
  ZS.registerFlatZone(-177, 0, 78, 50, 12);

  // ── Build ─────────────────────────────────────────────────────────────────────

  function build(scene) {
    const B = ZS.B;
    _buildAllRoads(scene, B);
    _buildMiniMarket(scene, B);
    _buildPharmacy(scene, B);
    _buildPoliceStation(scene, B);
    _buildSuperMarche(scene, B);
    _buildChapel(scene, B);
    _buildHouses(scene, B);
    _buildApartment(scene, B);
    _buildParking(scene, B);
    _buildStreetLights(scene, B);
    _buildAbandonedVehicles(scene, B);
    _buildStreetProps(scene, B);
  }

  // ── Routes ────────────────────────────────────────────────────────────────────

  function _buildAllRoads(scene, B) {
    const { M, ribbon } = B;

    // Route principale E-O (connexion S01 → S02, continue vers ouest)
    ribbon(scene, [
      [2,0],[-28,1],[-62,-1],[-98,0],[-128,1],
      [-155,0],[-180,1],[-210,0],[-250,1],[-295,0]
    ], 6.2, M.road, true);

    // Rue résidentielle nord
    ribbon(scene, [[-118,-16],[-145,-16],[-170,-16],[-198,-16],[-228,-16],[-252,-16]], 4.0, M.road, false);
    // Rue résidentielle sud
    ribbon(scene, [[-118,16],[-145,16],[-170,16],[-198,16],[-228,16],[-252,16]], 4.0, M.road, false);

    // Ruelle arrière nord (derrière les maisons)
    ribbon(scene, [[-118,-30],[-145,-30],[-170,-30],[-200,-30],[-230,-30],[-252,-30]], 3.2, M.roadDirt, false);
    // Ruelle arrière sud
    ribbon(scene, [[-118,30],[-145,30],[-170,30],[-200,30],[-230,30],[-252,30]], 3.2, M.roadDirt, false);

    // Rue transversale N-S — centre-ville
    ribbon(scene, [[-170,-48],[-170,-30],[-170,-16],[-170,0],[-170,16],[-170,30],[-170,46]], 4.5, M.road, false);
    // Rue transversale est
    ribbon(scene, [[-136,-46],[-136,-30],[-136,-16],[-136,0],[-136,16],[-136,30],[-136,46]], 3.8, M.road, false);
    // Rue transversale ouest
    ribbon(scene, [[-210,-46],[-210,-30],[-210,-16],[-210,0],[-210,16],[-210,30],[-210,46]], 3.8, M.road, false);

    // Trottoirs béton le long de la route principale (nord et sud)
    B.slab(scene, -177, -4.5, ZS.getTerrainHeight(-177,-4.5)+0.07, 120, 2.2, B.M.concDark);
    B.slab(scene, -177,  4.5, ZS.getTerrainHeight(-177, 4.5)+0.07, 120, 2.2, B.M.concDark);
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

    // Parvis + voiture de police
    B.slab(scene, cx, cz+D/2+2.5, baseY+0.07, W+2.0, 5.0, B.M.concDark);
    B.car(scene, cx-3, cz+D/2+4.0,  0.05, 0x111133);
    B.car(scene, cx+3, cz+D/2+4.0, -0.05, 0x111133);

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

    // Voiture + établi + étagère
    B.car(scene, cx, cz-0.8, 0);
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

  // ── Véhicules abandonnés ──────────────────────────────────────────────────────

  function _buildAbandonedVehicles(scene, B) {
    _buildBus(scene, B, -158, 3.5, 0.18);
    // Embouteillage — couleurs variées
    for (const [x,z,r,c] of [
      [-136,-2,   0.08, 0x5a3015], [-144, 2.2,-0.05, 0x2a4a2a],
      [-157,-1.8, 3.18, 0x1a2a4a], [-182, 2,   0.10, 0x4a3a10],
      [-196,-1.5,-0.08, 0x3a3a3a], [-209, 2.2, 3.12, 0x5a1a1a],
      [-222,-1,   0.06, 0x4a4010], [-240, 1.8,-0.10, 0x2a3a2a],
    ]) B.car(scene, x, z, r, c);
    // Rues résidentielles
    for (const [x,z,r,c] of [
      [-146,-19, 0.5,  0x3a3a3a], [-183,-20,-0.4,  0x5a1a1a],
      [-145, 19, 3.2,  0x2a4a2a], [-200, 20, 0.25, 0x4a3a10],
      [-145,-32, 0.3,  0x1a2a4a], [-220,-26,-0.2,  0x5a3015],
      [-145, 32, 0.15, 0x4a4010],
    ]) B.car(scene, x, z, r, c);
    // Parking
    B.car(scene, -143, 5.5, -0.15, 0x3a3a3a);
    B.car(scene, -158, 5.5,  0.05, 0x2a4a2a);
    B.car(scene, -174, 5.5,  0.08, 0x5a3015);
  }

  function _buildBus(scene, B, cx, cz, rotY) {
    const py=ZS.getTerrainHeight(cx,cz);
    const bodyMat=new THREE.MeshLambertMaterial({color:0x1e2a6a});
    const darkMat=new THREE.MeshLambertMaterial({color:0x181818});
    const glassMat=new THREE.MeshLambertMaterial({color:0x3a5566,transparent:true,opacity:0.55});
    const stripMat=new THREE.MeshLambertMaterial({color:0xddcc00});
    const g=new THREE.Group();
    const busBody=new THREE.Mesh(new THREE.BoxGeometry(2.5,2.1,9.0),bodyMat);
    busBody.position.set(0,1.12,0); busBody.castShadow=true; busBody.receiveShadow=true; g.add(busBody);
    const busRoof=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.28,8.8),bodyMat);
    busRoof.position.set(0,2.24,0); g.add(busRoof);
    for(let i=0;i<5;i++) for(const sx of[-1.27,1.27]){
      const w=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.75,1.3),glassMat);
      w.position.set(sx,1.65,-3.0+i*1.52); g.add(w);
    }
    const fw=new THREE.Mesh(new THREE.BoxGeometry(2.1,1.0,0.05),glassMat); fw.position.set(0,1.65,-4.46); g.add(fw);
    const bw=new THREE.Mesh(new THREE.BoxGeometry(2.1,1.0,0.05),glassMat); bw.position.set(0,1.65,4.46);  g.add(bw);
    for(const sx of[-1.27,1.27]){const s=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.22,8.6),stripMat);s.position.set(sx,0.6,0);g.add(s);}
    for(const[ox,oz]of[[-1.3,-3.1],[1.3,-3.1],[-1.3,0],[1.3,0],[-1.3,3.1],[1.3,3.1]]){
      const w=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.46,0.28,9),darkMat);
      w.rotation.z=Math.PI/2; w.position.set(ox,0.48,oz); g.add(w);
    }
    g.position.set(cx,py,cz); g.rotation.y=rotY; scene.add(g);
    // maxY = toit du bus (~2.38m) — accessible depuis le toit d'une voiture
    B.addCollider({type:'box',cx,cz,hw:1.35,hd:4.6,maxY:py+2.38});
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

  // ─────────────────────────────────────────────────────────────────────────────

  ZS.Buildings.registerSector({ build });
}());
