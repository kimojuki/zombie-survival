// Config + routes + matériaux
const CX = -20, CZ = -185;
  ZS.registerFlatZone(CX, CZ, 65, 65, 15);

  const CITY_ROADS = [
    { id: 'city_highway', pts: [[-104,-9],[-96,-32],[-82,-58],[-65,-85],[-48,-105],[-32,-116],[-20,-122]], width: 12, type: 'asphalt', line: true, barriers: true, smooth: true, taperEnd: 10 },
    { id: 'city_row_s', pts: [[-85,-185],[-50,-185],[-20,-185],[10,-185],[42,-185]], width: 7.0, type: 'asphalt' },
    { id: 'city_row_n', pts: [[-85,-240],[-50,-240],[-20,-240],[10,-240],[42,-240]], width: 5.5, type: 'asphalt' },
    { id: 'city_row_m', pts: [[-85,-135],[-50,-135],[-20,-135],[10,-135],[42,-135]], width: 5.5, type: 'asphalt' },
    { id: 'city_col_c', pts: [[-20,-120],[-20,-135],[-20,-185],[-20,-240],[-20,-250]], width: 6.0, type: 'asphalt' },
    { id: 'city_col_e', pts: [[36,-120],[36,-135],[36,-185],[36,-240],[36,-250]], width: 4.5, type: 'asphalt' },
    { id: 'city_col_w', pts: [[-64,-120],[-64,-135],[-64,-185],[-64,-240],[-64,-250]], width: 4.5, type: 'asphalt' },
  ];

  function build(scene) {
    const B = ZS.B;
    _buildAllRoads(scene, B);
    _buildHospital(scene, B);
    _buildSupermarket(scene, B);
    _buildPoliceStation(scene, B);
    _buildSchool(scene, B);
    _buildShoppingCenter(scene, B);
    _buildHotel(scene, B);
    _buildOfficeA(scene, B);
    _buildBank(scene, B);
    _buildGasStation(scene, B);
    _buildParkingStructure(scene, B);
    _buildResidential(scene, B);
    _buildStreetLights(scene, B);
    _buildStreetFurniture(scene, B);
    _buildDebris(scene, B);
  }

  // ── Matériaux ─────────────────────────────────────────────────────────────────
  const mConc = new THREE.MeshLambertMaterial({ color: 0x8a8070 });
  const mDark = new THREE.MeshLambertMaterial({ color: 0x2a2820 });
  const mGlass = new THREE.MeshLambertMaterial({ color: 0x5a8898, transparent: true, opacity: 0.55 });
  const mGlDk  = new THREE.MeshLambertMaterial({ color: 0x3a5560, transparent: true, opacity: 0.45 });
  const mRoof  = new THREE.MeshLambertMaterial({ color: 0x3e3228 });
  const mAsph  = new THREE.MeshLambertMaterial({ color: 0x323028, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
  const mRed   = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
  const mSign  = new THREE.MeshLambertMaterial({ color: 0x1a3a5a });
  const mFloor = new THREE.MeshLambertMaterial({ color: 0x5a5248 });
  const mStair = new THREE.MeshLambertMaterial({ color: 0x6a5a38 });

  // ── Routes ────────────────────────────────────────────────────────────────────

  function _buildAllRoads(scene, B) {
    const ty = ZS.getTerrainHeight(CX, CZ);
    _buildHighway(scene, B);
    const trot = new THREE.MeshLambertMaterial({ color: 0x7a7268, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -5 });
    B.slab(scene, CX, -190, ty+0.07, 132, 2.2, trot);
    B.slab(scene, CX, -180, ty+0.07, 132, 2.2, trot);
    const zebM = new THREE.MeshLambertMaterial({ color: 0xc8c0b0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
    for (const [zx,zz] of [[-20,-185],[36,-185],[-64,-185]])
      for (let k=-3;k<=3;k++) B.box(scene,zx,zz+k*1.3,ty+0.09,5.5,0.01,0.48,zebM);
    const gM = new THREE.MeshLambertMaterial({ color: 0x3a5a28, polygonOffset: true, polygonOffsetFactor:-1, polygonOffsetUnits:-3 });
    B.slab(scene,CX,-240,ty+0.04,2.5,20,gM); B.slab(scene,CX,-135,ty+0.04,2.5,16,gM);
  }

  // ── Autoroute reliant la petite ville (S02, route principale ~Z0) à la main city ──
  // Large chaussée asphaltée (texture tileset : axe jaune + bords blancs) bordée de
  // glissières de sécurité métalliques.
  function _buildHighway(scene, B) {
    // Chaussée + glissières rendues par ZS.RoadNetwork.buildMeshes (city_highway)
  }

  // ─── Helper : planchers intérieurs + escalier intérieur ──────────────────────
  // stairSide : 'north' (escalier au nord) ou 'south' (escalier au sud)
  function _addFloorsAndStairs(scene, B, cx, cz, W, D, floors, flH, y, stairSide) {
    const hd = D / 2 - 0.3;
    const sCx = cx + W / 4; // escalier côté est-intérieur
    // Planchers + upper floors
    for (let fl = 1; fl < floors; fl++) {
      const fy = y + fl * flH;
      B.slab(scene, cx, cz, fy, W - 0.5, D - 0.5, mFloor);
      ZS.registerUpperFloor(cx, cz, (W-0.5)/2, (D-0.5)/2, fy);
    }
    // Escalier intérieur (du sud vers le nord pour monter)
    const topH = y + (floors - 1) * flH;
    ZS.registerRamp(sCx, cz, 0.9, hd, topH, y, 'z');
    B.visualStairs(scene, sCx, cz, topH, y, 'z', 1.6, hd);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HÔPITAL — NW  (porte côté SUD vers rue nord)
  // ══════════════════════════════════════════════════════════════════════════════
