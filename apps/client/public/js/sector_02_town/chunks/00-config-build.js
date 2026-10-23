// Routes + build principal — extrait de sector_02_town.js (IIFE)
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

  // Maisons prefab S02 : terrain aplati avant génération pour éviter que la terre
  // traverse le plancher des pièces.
  ZS.registerFlatZone?.(-141, -22, 6.4, 5.6, 4);
  ZS.registerFlatZone?.(-141,  23, 5.9, 6.1, 4);
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
