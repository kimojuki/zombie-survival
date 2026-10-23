// Spawn + campement
// ── Carte locale spawn (rayon ~45 m) ─────────────────────────────────────────
  // Clairière au centre → 1 sentier de sortie sud → jonction ville (14,-18)
  // Carrefour forestier isolé à (28,-42) : branches vers cabanes / sud / essence
  // Aucune autre route ne traverse la clairière.
  const SPAWN_CX = 0, SPAWN_CZ = -6;
  const TOWN_JUNCTION = [14, -18];
  const FOREST_HUB    = [28, -42];

  // ── Flat zones ────────────────────────────────────────────────────────────────
  // Spawn : clairière circulaire via RoadNetwork.defineClearing (plus de boîte rectangulaire)
  ZS.registerFlatZone(FOREST_HUB[0], FOREST_HUB[1], 7, 7, 6);
  ZS.registerFlatZone(-20,  33, 22, 18, 8);   // Campement + grande tente
  ZS.registerFlatZone(-60, -70, 13, 11, 6);   // Cabane forestière nord
  ZS.registerFlatZone(-80,  42, 13, 11, 6);   // Cabane forestière sud
  ZS.registerFlatZone( 82,-100, 18, 11, 7);   // Station essence

  const RIVER_PTS = [
    [-118, -270], [-112, -210], [-106, -150], [-100, -85],
    [ -96,    0], [-100,   75], [-105,  150], [ -98,  210]
  ];
  const RIVER_WIDTH = 12;
  const RIVER_WATER_WIDTH = 10;
  const RIVER_DEPTH = 0.18;
  const RIVER_WATER_RISE = 0.26;
  ZS.registerRiverChannel(RIVER_PTS, RIVER_WIDTH, RIVER_DEPTH, 14);
  ZS.registerFlatZone(-104, -9, 18, 5, 5);   // Pont S01→S02

  function _forestRoads() {
    const fallback = (ZS.BEACH_TRAIL_PTS || [
      [242, -8], [215, -8], [175, -7], [130, -6], [85, -6],
      [45, -6], [0, -6], [14, -18],
    ]).map(p => p.slice());
    const trail = (ZS.SPAWN_TRAIL_PTS?.length ? ZS.SPAWN_TRAIL_PTS : fallback).map(p => p.slice());
    return [
      { id: 'spawn_trail', pts: trail, width: 1.25, type: 'dirt', smooth: true },
    ];
  }

  // ── Build ─────────────────────────────────────────────────────────────────────

  function     build(scene) {
    const B = ZS.B;
    _buildSpawn(scene, B);
    if (ZS.buildClearingRing) ZS.buildClearingRing(scene, SPAWN_CX, SPAWN_CZ, B);
    if (ZS.buildSpawnTrail && ZS.SPAWN_TRAIL_PTS) {
      ZS.buildSpawnTrail(scene, ZS.SPAWN_TRAIL_PTS, B);
    } else if (ZS.buildClearingExit) {
      ZS.buildClearingExit(scene, SPAWN_CX, -20, B);
    }
    _buildCampsite(scene, B);
    _buildCabinNorth(scene, B);
    _buildCabinSouth(scene, B);
    _buildGasStation(scene, B);
    _buildUtilityPoles(scene, B);
    _buildTreeStumps(scene, B);
    _buildRiver(scene);
    // Arbres : prefabs seed serveur (decorseed trees) — plus de spawn procédural local
  }

  // ── Zone de spawn ─────────────────────────────────────────────────────────────

  function _buildSpawn(scene, B) {
    const cx = SPAWN_CX, cz = SPAWN_CZ;
    const baseY = ZS.getTerrainHeight(cx, cz);
    ZS.registerLoot('maison', cx, cz, 5, 5);

    if (ZS.buildCampfire) ZS.buildCampfire(scene, cx, cz, baseY);
    if (ZS.buildCampLayout) ZS.buildCampLayout(scene, cx, cz, baseY, B);
    if (ZS.buildCampProps) ZS.buildCampProps(scene, cx, cz, baseY, B);
  }

  // ── Campement abandonné ───────────────────────────────────────────────────────

  function _buildCampsite(scene, B) {
    const cx = -20, cz = 33;
    const baseY = ZS.getTerrainHeight(cx, cz);
    ZS.registerLoot('maison', cx, cz, 18, 14);   // ravitaillement de base au campement

    // Sol du campement temporairement désactivé pour isoler les grands aplats bruns.

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

    // Table de pique-nique renversée (à gauche du feu)
    _buildPicnicTable(scene, B, cx - 6, cz - 6, baseY);

    // Palettes en bois (marchandises abandonnées)
    for (const [px, pz] of [[cx + 5, cz + 6], [cx + 6.5, cz + 6]]) {
      B.slab(scene, px, pz, baseY + 0.06, 1.2, 0.9, B.M.wood2);
      for (let i = 0; i < 3; i++) {
        B.box(scene, px, pz, baseY + 0.14, 1.2, 0.06, 0.12, B.M.wood2);
        B.box(scene, px, pz - 0.3 + i * 0.3, baseY + 0.09, 0.1, 0.06, 0.9, B.M.wood2);
      }
    }

    // Palissade brisée côté est du camp
    _buildBrokenFence(scene, B, cx + 10, cz, baseY, 10, 'z');
  }

  // ── Grande tente militaire walkable ───────────────────────────────────────────
  // Entrée face au sud (-Z). Le joueur peut entrer librement par l'avant.
