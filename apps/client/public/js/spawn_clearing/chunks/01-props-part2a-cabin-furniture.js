// Mobilier cabine leger
function _buildCabinTable(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const topMat = M?.tableTop?.() || new THREE.MeshLambertMaterial({ color: 0xb8875a });
    const legMat = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x4a3224 });
    const metal = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x8a9098 });

    const HW = 0.575;
    const HD = 0.35;
    const LEG = 0.06;
    const TOP_T = 0.038;
    const LEG_H = 0.72;
    const TOP_Y = LEG_H + TOP_T * 0.5;
    const inset = 0.09;

    const legPos = [
      [-HW + inset, HD - inset],
      [HW - inset, HD - inset],
      [-HW + inset, -HD + inset],
      [HW - inset, -HD + inset],
    ];
    for (const [lx, lz] of legPos) {
      const leg = _add(g, new THREE.BoxGeometry(LEG, LEG_H, LEG), legMat, lx, LEG_H * 0.5, lz);
      leg.castShadow = leg.receiveShadow = true;
    }

    for (const lz of [HD - inset * 0.6, -HD + inset * 0.6]) {
      const rail = _add(g, new THREE.BoxGeometry(HW * 2 - inset * 2, 0.05, 0.035), legMat, 0, LEG_H - 0.025, lz);
      rail.castShadow = true;
    }
    for (const lx of [-HW + inset * 0.6, HW - inset * 0.6]) {
      const rail = _add(g, new THREE.BoxGeometry(0.035, 0.05, HD * 2 - inset * 2), legMat, lx, LEG_H - 0.025, 0);
      rail.castShadow = true;
    }

    const stretch = _add(g, new THREE.BoxGeometry(HW * 2 - inset * 2.2, 0.04, 0.035), legMat, 0, 0.12, 0);
    stretch.castShadow = true;

    const top = _add(g, new THREE.BoxGeometry(HW * 2, TOP_T, HD * 2), topMat, 0, TOP_Y, 0);
    top.castShadow = top.receiveShadow = true;

    const mugY = TOP_Y + TOP_T * 0.5;
    const mug = _add(g, new THREE.CylinderGeometry(0.034, 0.037, 0.055, 8), metal, 0.24, mugY + 0.028, 0.1);
    mug.castShadow = true;
    _add(g, new THREE.CylinderGeometry(0.026, 0.026, 0.022, 6), metal, 0.24, mugY + 0.058, 0.1);
    const plate = _add(g, new THREE.CylinderGeometry(0.09, 0.088, 0.012, 12),
      new THREE.MeshLambertMaterial({ color: 0xd8dce0 }), -0.18, mugY + 0.006, -0.06);
    plate.castShadow = true;
  }

  /**
   * Chaise rustique cabane — ~0,42 × 0,40 m, assise ~0,45 m, dossier ~0,86 m total.
   * Pivot = centre sol ; face avant local −Z, dossier +Z.
   */
  function _buildCabinChair(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const seatMat = M?.tableTop?.() || new THREE.MeshLambertMaterial({ color: 0xb8875a });
    const frameMat = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x4a3224 });

    const HW = 0.21;
    const HD = 0.19;
    const LEG = 0.045;
    const SEAT_T = 0.032;
    const SEAT_Y = 0.44;
    const inset = 0.06;

    const legPos = [
      [-HW + inset, HD - inset],
      [HW - inset, HD - inset],
      [-HW + inset, -HD + inset],
      [HW - inset, -HD + inset],
    ];
    for (const [lx, lz] of legPos) {
      const leg = _add(g, new THREE.BoxGeometry(LEG, SEAT_Y, LEG), frameMat, lx, SEAT_Y * 0.5, lz);
      leg.castShadow = leg.receiveShadow = true;
    }

    _add(g, new THREE.BoxGeometry(HW * 2 - inset * 1.6, 0.035, 0.03), frameMat, 0, 0.11, 0);

    const seat = _add(g, new THREE.BoxGeometry(HW * 2, SEAT_T, HD * 2), seatMat, 0, SEAT_Y + SEAT_T * 0.5, 0);
    seat.castShadow = seat.receiveShadow = true;

    const backPostZ = HD - inset * 0.5;
    for (const lx of [-HW + inset * 0.8, HW - inset * 0.8]) {
      const post = _add(g, new THREE.BoxGeometry(LEG * 0.95, 0.42, LEG * 0.95), frameMat,
        lx, SEAT_Y + 0.21, backPostZ);
      post.castShadow = post.receiveShadow = true;
    }

    for (let i = 0; i < 3; i++) {
      const slat = _add(g, new THREE.BoxGeometry(HW * 2 - inset * 1.4, 0.028, 0.025), seatMat,
        0, SEAT_Y + 0.12 + i * 0.11, backPostZ - 0.01);
      slat.castShadow = true;
    }

    const rail = _add(g, new THREE.BoxGeometry(HW * 2 - inset * 1.2, 0.03, 0.025), frameMat,
      0, SEAT_Y - 0.02, -HD + inset * 0.7);
    rail.castShadow = true;
  }

  /**
   * Étagère cabane — ~0,78 × 0,24 m, 3 niveaux + fond lattes, ~1,12 m.
   * Pivot = centre sol ; face ouverte −Z, dos +Z (contre mur).
   */
  function _buildCabinShelf(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const shelfMat = M?.tableTop?.() || new THREE.MeshLambertMaterial({ color: 0xb8875a });
    const frameMat = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x4a3224 });
    const tinMat = new THREE.MeshLambertMaterial({ color: 0x8a9098 });
    const jarMat = new THREE.MeshLambertMaterial({ color: 0x6a8070 });

    const HW = 0.39;
    const HD = 0.12;
    const POST = 0.038;
    const SHELF_T = 0.024;
    const TOTAL_H = 1.10;
    const inset = 0.04;

    const postPos = [
      [-HW + inset, HD - inset],
      [HW - inset, HD - inset],
      [-HW + inset, -HD + inset],
      [HW - inset, -HD + inset],
    ];
    for (const [px, pz] of postPos) {
      const post = _add(g, new THREE.BoxGeometry(POST, TOTAL_H, POST), frameMat, px, TOTAL_H * 0.5, pz);
      post.castShadow = post.receiveShadow = true;
    }

    const shelfYs = [0.04, 0.38, 0.72, 1.06];
    for (const sy of shelfYs) {
      const board = _add(g, new THREE.BoxGeometry(HW * 2 - inset * 1.2, SHELF_T, HD * 2 - inset * 0.8),
        shelfMat, 0, sy, 0);
      board.castShadow = board.receiveShadow = true;
    }

    const backZ = HD - inset * 0.6;
    for (let i = -2; i <= 2; i++) {
      const slat = _add(g, new THREE.BoxGeometry(0.028, TOTAL_H - 0.12, 0.018), frameMat,
        i * 0.14, TOTAL_H * 0.5, backZ);
      slat.castShadow = true;
    }

    _add(g, new THREE.BoxGeometry(HW * 2 - inset * 2, 0.022, 0.018), frameMat, 0, TOTAL_H - 0.01, backZ);

    const midY = 0.38 + SHELF_T * 0.5;
    const can = _add(g, new THREE.CylinderGeometry(0.038, 0.038, 0.09, 10), tinMat, -0.12, midY + 0.045, 0.02);
    can.castShadow = true;
    const jar = _add(g, new THREE.CylinderGeometry(0.032, 0.028, 0.11, 8), jarMat, 0.14, midY + 0.055, -0.03);
    jar.castShadow = true;
    _add(g, new THREE.CylinderGeometry(0.022, 0.022, 0.025, 6), tinMat, 0.14, midY + 0.115, -0.03);
  }

  /**
   * Poêle à bois cabane — ~0,52 × 0,40 m, corps ~0,62 m + conduit ~0,45 m.
   * Pivot = centre sol ; porte foyer −Z, conduit vers +Z/arrière.
   */
  function _buildCabinStove(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const bodyMat = M?.stoveBody?.() || new THREE.MeshLambertMaterial({ color: 0x3a3c40 });
    const doorMat = M?.stoveDoor?.() || new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.78, depthWrite: false, side: THREE.DoubleSide,
    });
    const metal = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x6a6e74 });

    const HW = 0.26;
    const HD = 0.20;
    const LEG_H = 0.09;
    const BODY_H = 0.58;
    const BODY_Y = LEG_H + BODY_H * 0.5;
    const DOOR_Y = LEG_H + 0.30;
    const DOOR_Z = -HD - 0.012;

    for (const [lx, lz] of [
      [-HW + 0.06, HD - 0.05],
      [HW - 0.06, HD - 0.05],
      [-HW + 0.06, -HD + 0.05],
      [HW - 0.06, -HD + 0.05],
    ]) {
      const leg = _add(g, new THREE.BoxGeometry(0.05, LEG_H, 0.05), bodyMat, lx, LEG_H * 0.5, lz);
      leg.castShadow = leg.receiveShadow = true;
    }

    const body = _add(g, new THREE.BoxGeometry(HW * 2, BODY_H, HD * 2), bodyMat, 0, BODY_Y, 0);
    body.castShadow = body.receiveShadow = true;

    const topPlate = _add(g, new THREE.BoxGeometry(HW * 2 - 0.04, 0.025, HD * 2 - 0.04), metal, 0, LEG_H + BODY_H + 0.012, 0);
    topPlate.castShadow = true;

    if (ZS.attachStoveFire) {
      ZS.attachStoveFire(g, { x: 0, y: DOOR_Y, z: -HD + 0.05 });
    }

    const doorW = 0.30;
    const doorH = 0.34;
    const frameT = 0.028;
    for (const [fw, fh, fx, fy] of [
      [doorW + frameT * 2, frameT, 0, DOOR_Y + doorH * 0.5 - frameT * 0.5],
      [doorW + frameT * 2, frameT, 0, DOOR_Y - doorH * 0.5 + frameT * 0.5],
      [frameT, doorH, -doorW * 0.5 - frameT * 0.5, DOOR_Y],
      [frameT, doorH, doorW * 0.5 + frameT * 0.5, DOOR_Y],
    ]) {
      const fr = _add(g, new THREE.BoxGeometry(fw, fh, 0.025), bodyMat, fx, fy, DOOR_Z);
      fr.castShadow = true;
    }

    const door = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), doorMat);
    door.position.set(0, DOOR_Y, DOOR_Z);
    door.rotation.y = Math.PI;
    door.renderOrder = 9;
    g.add(door);

    const handle = _add(g, new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), metal, 0, LEG_H + 0.18, DOOR_Z - 0.04);
    handle.rotation.x = Math.PI / 2;
    handle.castShadow = true;

    const pipeBase = _add(g, new THREE.BoxGeometry(0.14, 0.08, 0.14), bodyMat, 0.06, LEG_H + BODY_H + 0.04, HD - 0.08);
    pipeBase.castShadow = true;
    const pipe = _add(g, new THREE.BoxGeometry(0.10, 0.42, 0.10), bodyMat, 0.06, LEG_H + BODY_H + 0.29, HD - 0.08);
    pipe.castShadow = true;
    const pipeCap = _add(g, new THREE.BoxGeometry(0.12, 0.04, 0.12), metal, 0.06, LEG_H + BODY_H + 0.52, HD - 0.08);
    pipeCap.castShadow = true;

    const ash = _add(g, new THREE.BoxGeometry(0.08, 0.04, 0.06), metal, -HW + 0.12, LEG_H + 0.06, -HD + 0.06);
    ash.castShadow = true;
  }

  /**
   * Lanterne suspendue cabane — crochet plafond ~2,30 m, cage métal + flamme animée.
   * Pivot = centre sol sous la lanterne ; face vitrée −Z.
   */
  function _buildCabinLantern(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const metalMat = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x6a6e74 });
    const ironMat = M?.stoveBody?.() || new THREE.MeshLambertMaterial({ color: 0x3a3c40 });
    const glassMat = new THREE.MeshBasicMaterial({
      color: 0xfff0c8, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide,
    });

    const HOOK_Y = 2.30;
    const LANTERN_Y = 1.72;
    const CAGE_H = 0.26;
    const CAGE_HW = 0.075;
    const CAGE_HD = 0.075;

    const hook = _add(g, new THREE.TorusGeometry(0.035, 0.008, 6, 10), metalMat, 0, HOOK_Y, 0);
    hook.rotation.x = Math.PI / 2;
    hook.castShadow = true;

    const chainTop = HOOK_Y - 0.04;
    const chainBot = LANTERN_Y + CAGE_H * 0.5 + 0.06;
    const linkCount = 4;
    const linkSpan = (chainTop - chainBot) / linkCount;
    for (let i = 0; i < linkCount; i++) {
      const ly = chainTop - linkSpan * (i + 0.5);
      const link = _add(g, new THREE.TorusGeometry(0.014, 0.004, 5, 8), metalMat, 0, ly, 0);
      link.rotation.x = Math.PI / 2;
      link.castShadow = true;
    }

    const cap = _add(g, new THREE.CylinderGeometry(0.09, 0.10, 0.05, 10), ironMat, 0, LANTERN_Y + CAGE_H * 0.5 + 0.025, 0);
    cap.castShadow = true;
    const vent = _add(g, new THREE.CylinderGeometry(0.04, 0.04, 0.03, 8), metalMat, 0, LANTERN_Y + CAGE_H * 0.5 + 0.055, 0);
    vent.castShadow = true;

    const topRing = _add(g, new THREE.BoxGeometry(CAGE_HW * 2 + 0.02, 0.018, CAGE_HD * 2 + 0.02), ironMat, 0, LANTERN_Y + CAGE_H * 0.5 - 0.01, 0);
    topRing.castShadow = true;
    const botRing = _add(g, new THREE.BoxGeometry(CAGE_HW * 2 + 0.02, 0.018, CAGE_HD * 2 + 0.02), ironMat, 0, LANTERN_Y - CAGE_H * 0.5 + 0.01, 0);
    botRing.castShadow = true;

    for (const [lx, lz] of [
      [-CAGE_HW, 0],
      [CAGE_HW, 0],
      [0, -CAGE_HD],
      [0, CAGE_HD],
    ]) {
      const bar = _add(g, new THREE.BoxGeometry(0.012, CAGE_H - 0.03, 0.012), ironMat, lx, LANTERN_Y, lz);
      bar.castShadow = true;
    }

    for (const [lx, lz, rw, rh] of [
      [0, -CAGE_HD - 0.004, CAGE_HW * 2 - 0.02, CAGE_H - 0.04],
      [0, CAGE_HD + 0.004, CAGE_HW * 2 - 0.02, CAGE_H - 0.04],
      [-CAGE_HW - 0.004, 0, CAGE_H - 0.04, CAGE_HW * 2 - 0.02],
      [CAGE_HW + 0.004, 0, CAGE_H - 0.04, CAGE_HW * 2 - 0.02],
    ]) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(rw, rh), glassMat);
      pane.position.set(lx, LANTERN_Y, lz);
      if (lz < 0) pane.rotation.y = Math.PI;
      if (lx < 0) pane.rotation.y = Math.PI / 2;
      if (lx > 0) pane.rotation.y = -Math.PI / 2;
      pane.renderOrder = 5;
      g.add(pane);
    }

    const drip = _add(g, new THREE.CylinderGeometry(0.05, 0.07, 0.03, 8), ironMat, 0, LANTERN_Y - CAGE_H * 0.5 - 0.015, 0);
    drip.castShadow = true;

    if (ZS.attachLanternFlame) {
      ZS.attachLanternFlame(g, { x: 0, y: LANTERN_Y - 0.02, z: 0 });
    }
  }

  /**
   * Caisse à bûches cabane — ~0,50 × 0,34 m, face ouverte −Z (vers poêle / pièce).
   * Pivot = centre sol ; dos +Z contre mur.
   */
  function _buildCabinWoodBox(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const plankMat = M?.tableTop?.() || new THREE.MeshLambertMaterial({ color: 0xb8875a });
    const frameMat = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x4a3224 });
    const bark = M?.bark?.() || new THREE.MeshLambertMaterial({ color: 0x4a3018 });
    const endW = M?.endWood?.() || new THREE.MeshLambertMaterial({ color: 0xc4a070 });

    const HW = 0.25;
    const HD = 0.17;
    const BOX_H = 0.36;
    const WALL_T = 0.022;
    const FRONT_Z = -HD;

    const floor = _add(g, new THREE.BoxGeometry(HW * 2, 0.028, HD * 2), plankMat, 0, 0.014, 0);
    floor.castShadow = floor.receiveShadow = true;

    const backZ = HD - WALL_T * 0.5;
    const back = _add(g, new THREE.BoxGeometry(HW * 2, BOX_H, WALL_T), frameMat, 0, BOX_H * 0.5, backZ);
    back.castShadow = true;

    for (const sx of [-HW + WALL_T * 0.5, HW - WALL_T * 0.5]) {
      const side = _add(g, new THREE.BoxGeometry(WALL_T, BOX_H, HD * 2 - WALL_T), frameMat, sx, BOX_H * 0.5, -WALL_T * 0.5);
      side.castShadow = true;
    }

    for (let i = -2; i <= 2; i++) {
      const slat = _add(g, new THREE.BoxGeometry(0.032, BOX_H - 0.06, 0.016), frameMat,
        i * 0.09, BOX_H * 0.5, backZ - 0.008);
      slat.castShadow = true;
    }

    const lip = _add(g, new THREE.BoxGeometry(HW * 2 - 0.04, 0.024, 0.028), frameMat, 0, 0.04, FRONT_Z + 0.014);
    lip.castShadow = true;

    const logs = [
      { lx: -0.10, lz: 0.02, ry: 0.08, len: 0.30, r: 0.052, lift: 0.06 },
      { lx: 0.04, lz: -0.03, ry: -0.12, len: 0.28, r: 0.048, lift: 0.06 },
      { lx: 0.12, lz: 0.04, ry: 0.22, len: 0.26, r: 0.045, lift: 0.06 },
      { lx: -0.02, lz: 0.05, ry: Math.PI / 2 + 0.1, len: 0.24, r: 0.042, lift: 0.14 },
      { lx: 0.08, lz: -0.02, ry: Math.PI / 2 - 0.15, len: 0.22, r: 0.04, lift: 0.13 },
    ];
    for (const lg of logs) {
      const lift = lg.lift || 0.05;
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(lg.r * 0.9, lg.r, lg.len, 7), bark);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = lg.ry;
      log.position.set(lg.lx, lift + lg.r, lg.lz);
      log.castShadow = true;
      g.add(log);
      const cap = new THREE.Mesh(new THREE.CircleGeometry(lg.r * 0.82, 7), endW);
      cap.rotation.y = lg.ry;
      cap.rotation.x = Math.PI / 2;
      cap.position.set(
        lg.lx + Math.cos(lg.ry) * lg.len * 0.44,
        lift + lg.r,
        lg.lz + Math.sin(lg.ry) * lg.len * 0.44,
      );
      g.add(cap);
    }

    const axeHandle = _add(g, new THREE.BoxGeometry(0.028, 0.34, 0.028), frameMat, HW - 0.05, BOX_H + 0.17, FRONT_Z + 0.06);
    axeHandle.castShadow = true;
    const axeHead = _add(g, new THREE.BoxGeometry(0.11, 0.06, 0.024),
      M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x6a6e74 }),
      HW - 0.02, BOX_H + 0.30, FRONT_Z + 0.06);
    axeHead.rotation.z = -0.35;
    axeHead.castShadow = true;
  }

  /**
   * Tapis tissé cabane — ~0,96 × 0,62 m au sol, bande décorative côté −Z.
   * Pivot = centre sol ; tête / franges avant −Z (vers table ou porte).
   */
  function _buildCabinRug(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const rugMat = M?.cabinRug?.() || new THREE.MeshLambertMaterial({ color: 0x6a4a32 });
    const borderMat = M?.cabinRugBorder?.() || new THREE.MeshLambertMaterial({ color: 0x3e2a1c });
    const fringeMat = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x4a3224 });

    const W = 0.96;
    const D = 0.62;
    const THICK = 0.014;

    const body = _add(g, new THREE.BoxGeometry(W, THICK, D), rugMat, 0, THICK * 0.5, 0);
    body.receiveShadow = true;

    const bandZ = -D * 0.5 + 0.05;
    const headBand = _add(g, new THREE.BoxGeometry(W - 0.10, 0.006, 0.09), borderMat, 0, THICK + 0.002, bandZ);
    headBand.receiveShadow = true;

    for (const [lx, lz, bw, bd] of [
      [0, -D * 0.5 + 0.018, W - 0.06, 0.028],
      [0, D * 0.5 - 0.018, W - 0.06, 0.028],
      [-W * 0.5 + 0.018, 0, 0.028, D - 0.10],
      [W * 0.5 - 0.018, 0, 0.028, D - 0.10],
    ]) {
      const rim = _add(g, new THREE.BoxGeometry(bw, 0.005, bd), borderMat, lx, THICK + 0.001, lz);
      rim.receiveShadow = true;
    }

    const tasselCount = 13;
    for (let i = 0; i < tasselCount; i++) {
      const tx = -W * 0.44 + (i / (tasselCount - 1)) * W * 0.88;
      for (const tz of [-D * 0.5 - 0.018, D * 0.5 + 0.018]) {
        const tassel = _add(g, new THREE.BoxGeometry(0.010, 0.006, 0.032), fringeMat, tx, 0.003, tz);
        tassel.receiveShadow = true;
      }
    }
  }

  /**
   * Banc mural cabane — ~1,02 × 0,36 m, fixé au mur (+Z), cubby sous assise.
   * Pivot = centre sol ; assise −Z, dossier incliné contre mur.
   */
  function _buildCabinBench(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const seatMat = M?.tableTop?.() || new THREE.MeshLambertMaterial({ color: 0xb8875a });
    const frameMat = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x4a3224 });
    const metal = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x7d7f84 });
    const blanketMat = M?.bedBlanket?.() || new THREE.MeshLambertMaterial({ color: 0x5a4a38 });

    const HW = 0.51;
    const HD = 0.18;
    const SEAT_Y = 0.42;
    const SEAT_T = 0.028;
    const inset = 0.055;
    const wallZ = HD - 0.02;
    const frontZ = -HD + inset;

    const cleat = _add(g, new THREE.BoxGeometry(HW * 2, 0.10, 0.032), frameMat, 0, SEAT_Y + 0.22, wallZ + 0.012);
    cleat.castShadow = true;
    for (const lx of [-HW + 0.12, 0, HW - 0.12]) {
      const bolt = _add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.012, 6), metal, lx, SEAT_Y + 0.28, wallZ + 0.028);
      bolt.rotation.x = Math.PI / 2;
    }

    for (const lx of [-HW + inset, HW - inset]) {
      const leg = _add(g, new THREE.BoxGeometry(0.05, SEAT_Y, 0.05), frameMat, lx, SEAT_Y * 0.5, frontZ);
      leg.castShadow = leg.receiveShadow = true;
      const brace = _add(g, new THREE.BoxGeometry(0.028, 0.16, 0.028), frameMat, lx, SEAT_Y - 0.06, frontZ + 0.06);
      brace.rotation.x = -0.55;
      brace.castShadow = true;
    }

    const midLeg = _add(g, new THREE.BoxGeometry(0.04, SEAT_Y - 0.08, 0.04), frameMat, 0, (SEAT_Y - 0.08) * 0.5, frontZ + 0.04);
    midLeg.castShadow = true;

    for (const lz of [frontZ + 0.02, wallZ - 0.04]) {
      const rail = _add(g, new THREE.BoxGeometry(HW * 2 - inset * 2, 0.038, 0.03), frameMat, 0, SEAT_Y - 0.02, lz);
      rail.castShadow = true;
    }
    for (const lx of [-HW + inset, HW - inset]) {
      const side = _add(g, new THREE.BoxGeometry(0.03, 0.038, HD * 2 - inset * 2), frameMat, lx, SEAT_Y - 0.02, 0);
      side.castShadow = true;
    }

    const plankW = (HW * 2 - inset * 2.4) / 3;
    for (let i = 0; i < 3; i++) {
      const px = -HW + inset * 1.2 + plankW * 0.5 + i * (plankW + 0.012);
      const plank = _add(g, new THREE.BoxGeometry(plankW, SEAT_T, HD * 2 - inset * 1.6), seatMat,
        px, SEAT_Y + SEAT_T * 0.5, -inset * 0.3);
      plank.castShadow = plank.receiveShadow = true;
    }

    const cubbyFloor = _add(g, new THREE.BoxGeometry(HW * 2 - inset * 2, 0.02, HD * 2 - inset * 2.4), seatMat,
      0, 0.10, -inset * 0.3);
    cubbyFloor.castShadow = true;
    const cubbyLip = _add(g, new THREE.BoxGeometry(HW * 2 - inset * 2, 0.024, 0.022), frameMat,
      0, 0.12, frontZ + 0.01);
    cubbyLip.castShadow = true;
    const cubbyBack = _add(g, new THREE.BoxGeometry(HW * 2 - inset * 2, SEAT_Y - 0.14, 0.018), frameMat,
      0, (SEAT_Y - 0.14) * 0.5 + 0.10, wallZ - 0.01);
    cubbyBack.castShadow = true;
    const divider = _add(g, new THREE.BoxGeometry(0.022, SEAT_Y - 0.16, HD * 2 - inset * 2.6), frameMat,
      0.08, (SEAT_Y - 0.16) * 0.5 + 0.10, -inset * 0.3);
    divider.castShadow = true;

    const bootL = _add(g, new THREE.BoxGeometry(0.14, 0.12, 0.22),
      new THREE.MeshLambertMaterial({ color: 0x3a2e24 }), -0.22, 0.16, -0.02);
    bootL.castShadow = true;
    const bootR = _add(g, new THREE.BoxGeometry(0.13, 0.11, 0.20),
      new THREE.MeshLambertMaterial({ color: 0x4a3828 }), 0.24, 0.15, 0.04);
    bootR.castShadow = true;

    const backRoot = new THREE.Group();
    backRoot.position.set(0, SEAT_Y + 0.08, wallZ - 0.03);
    backRoot.rotation.x = -0.14;
    g.add(backRoot);

    for (const lx of [-HW + inset, HW - inset]) {
      const post = _add(backRoot, new THREE.BoxGeometry(0.042, 0.44, 0.042), frameMat, lx, 0.22, 0);
      post.castShadow = true;
    }
    for (let i = 0; i < 5; i++) {
      const slat = _add(backRoot, new THREE.BoxGeometry(HW * 2 - inset * 2, 0.024, 0.026), seatMat,
        0, 0.06 + i * 0.085, -0.01);
      slat.castShadow = true;
    }
    const backCap = _add(backRoot, new THREE.BoxGeometry(HW * 2 - inset, 0.03, 0.028), frameMat, 0, 0.46, -0.01);
    backCap.castShadow = true;

    for (const lx of [-HW + 0.04, HW - 0.04]) {
      const arm = _add(g, new THREE.BoxGeometry(0.07, 0.026, 0.10), seatMat, lx, SEAT_Y + 0.02, frontZ - 0.04);
      arm.castShadow = true;
    }

    const blanket = _add(g, new THREE.BoxGeometry(0.22, 0.04, 0.16), blanketMat, 0.28, SEAT_Y + SEAT_T + 0.02, -0.04);
    blanket.rotation.y = 0.12;
    blanket.castShadow = true;
    const blanketFold = _add(g, new THREE.BoxGeometry(0.14, 0.055, 0.12), blanketMat, 0.36, SEAT_Y + SEAT_T + 0.045, -0.02);
    blanketFold.rotation.y = 0.2;
    blanketFold.castShadow = true;
  }

  /**
   * Lavabo cabane — meuble bois ~0,46 m, cuvette porcelaine encastrée, robinet mural.
   * Pivot = centre sol ; face −Z, dos +Z contre mur.
   */
