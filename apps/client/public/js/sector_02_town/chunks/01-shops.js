// Marché, pharmacie, police, supermarché — extrait de sector_02_town.js (IIFE)
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
