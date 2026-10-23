// Basin, horloge, portemanteau
function _buildCabinBasin(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const woodMat = M?.tableTop?.() || new THREE.MeshLambertMaterial({ color: 0xb8875a });
    const frameMat = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x4a3224 });
    const iron = new THREE.MeshLambertMaterial({ color: 0x5a5e64 });
    const enamel = new THREE.MeshLambertMaterial({ color: 0xf0f2ee });
    const enamelDark = new THREE.MeshLambertMaterial({ color: 0xd8dcd6 });
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x4a7088 });
    const towelMat = M?.canvas?.(0x6a5a48) || new THREE.MeshLambertMaterial({ color: 0x6a5a48 });
    const bucketMat = new THREE.MeshLambertMaterial({ color: 0x5a4030 });
    const pottery = new THREE.MeshLambertMaterial({ color: 0x9a9088 });

    const HW = 0.23;
    const HD = 0.14;
    const TOP_Y = 0.76;
    const LEG_H = TOP_Y - 0.035;
    const inset = 0.038;
    const wallZ = HD - 0.015;
    const frontZ = -HD + inset;
    const basinX = -0.02;
    const basinZ = -0.03;

    for (const [lx, lz] of [
      [-HW + inset, frontZ],
      [HW - inset, frontZ],
      [-HW + inset, wallZ - 0.025],
      [HW - inset, wallZ - 0.025],
    ]) {
      const leg = _add(g, new THREE.BoxGeometry(0.04, LEG_H, 0.04), frameMat, lx, LEG_H * 0.5, lz);
      leg.castShadow = leg.receiveShadow = true;
    }

    const stretchF = _add(g, new THREE.BoxGeometry(HW * 2 - inset * 2, 0.032, 0.028), frameMat,
      0, 0.09, frontZ + 0.02);
    stretchF.castShadow = true;
    const stretchB = _add(g, new THREE.BoxGeometry(HW * 2 - inset * 2, 0.032, 0.028), frameMat,
      0, 0.09, wallZ - 0.02);
    stretchB.castShadow = true;

    const top = _add(g, new THREE.BoxGeometry(HW * 2, 0.034, HD * 2), woodMat, 0, TOP_Y, 0);
    top.castShadow = top.receiveShadow = true;

    const shelfY = 0.32;
    const shelf = _add(g, new THREE.BoxGeometry(HW * 2 - inset, 0.02, HD * 2 - inset * 1.2), woodMat,
      0, shelfY, -inset * 0.15);
    shelf.castShadow = true;

    const splashW = 0.34;
    const splash = _add(g, new THREE.BoxGeometry(splashW, 0.38, 0.016), woodMat, 0, TOP_Y + 0.19, wallZ + 0.004);
    splash.castShadow = true;
    const splashCap = _add(g, new THREE.BoxGeometry(splashW + 0.02, 0.022, 0.022), frameMat,
      0, TOP_Y + 0.39, wallZ + 0.002);
    splashCap.castShadow = true;

    const bowlY = TOP_Y + 0.018;
    const bowl = _add(g, new THREE.CylinderGeometry(0.10, 0.072, 0.075, 16), enamel,
      basinX, bowlY + 0.038, basinZ);
    bowl.castShadow = true;
    const rim = _add(g, new THREE.CylinderGeometry(0.112, 0.112, 0.014, 16), enamel,
      basinX, bowlY + 0.078, basinZ);
    rim.castShadow = true;
    const bowlInner = _add(g, new THREE.CylinderGeometry(0.092, 0.078, 0.06, 16), enamelDark,
      basinX, bowlY + 0.042, basinZ);
    bowlInner.castShadow = true;

    const water = new THREE.Mesh(new THREE.CircleGeometry(0.078, 18), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(basinX, bowlY + 0.018, basinZ);
    water.renderOrder = 2;
    g.add(water);

    const tapY = TOP_Y + 0.12;
    const tapZ = wallZ - 0.02;
    const tapStem = _add(g, new THREE.CylinderGeometry(0.014, 0.016, 0.08, 8), iron, basinX + 0.08, tapY, tapZ);
    tapStem.castShadow = true;
    const tapArm = _add(g, new THREE.BoxGeometry(0.042, 0.014, 0.014), iron, basinX + 0.05, tapY - 0.02, tapZ - 0.02);
    tapArm.rotation.x = 0.42;
    tapArm.castShadow = true;
    const tapTip = _add(g, new THREE.CylinderGeometry(0.008, 0.01, 0.025, 6), iron,
      basinX + 0.03, tapY - 0.05, tapZ - 0.05);
    tapTip.rotation.x = Math.PI / 2;
    const tapKnob = _add(g, new THREE.CylinderGeometry(0.018, 0.018, 0.012, 8), iron,
      basinX + 0.10, tapY + 0.04, tapZ);
    tapKnob.castShadow = true;

    const pitcher = _add(g, new THREE.CylinderGeometry(0.048, 0.062, 0.14, 10), pottery,
      HW - 0.10, TOP_Y + 0.10, 0.05);
    pitcher.castShadow = true;
    _add(g, new THREE.CylinderGeometry(0.034, 0.038, 0.028, 8), pottery, HW - 0.10, TOP_Y + 0.184, 0.05);
    const soap = _add(g, new THREE.BoxGeometry(0.042, 0.014, 0.028),
      new THREE.MeshLambertMaterial({ color: 0xd4c8b0 }), HW - 0.06, TOP_Y + 0.022, 0.02);
    soap.castShadow = true;

    const bucket = _add(g, new THREE.CylinderGeometry(0.095, 0.082, 0.20, 12), bucketMat, 0.05, shelfY + 0.10, -0.01);
    bucket.castShadow = true;
    const bucketBand = _add(g, new THREE.CylinderGeometry(0.098, 0.098, 0.012, 12), iron, 0.05, shelfY + 0.19, -0.01);
    const bucketWater = new THREE.Mesh(new THREE.CircleGeometry(0.072, 14), waterMat);
    bucketWater.rotation.x = -Math.PI / 2;
    bucketWater.position.set(0.05, shelfY + 0.12, -0.01);
    g.add(bucketWater);

    const hook = _add(g, new THREE.BoxGeometry(0.018, 0.04, 0.018), iron, -HW + 0.06, TOP_Y + 0.08, frontZ - 0.01);
    const towel = _add(g, new THREE.BoxGeometry(0.11, 0.18, 0.01), towelMat, -HW + 0.06, TOP_Y - 0.04, frontZ - 0.015);
    towel.rotation.x = 0.06;
    towel.castShadow = true;

    const mirY = TOP_Y + 0.24;
    const mirZ = wallZ + 0.01;
    const mirW = 0.14;
    const mirH = 0.18;
    const mirT = 0.012;
    for (const [fw, fh, fx, fy] of [
      [mirW + mirT * 2, mirT, 0, mirY + mirH * 0.5 - mirT * 0.5],
      [mirW + mirT * 2, mirT, 0, mirY - mirH * 0.5 + mirT * 0.5],
      [mirT, mirH, -mirW * 0.5 - mirT * 0.5, mirY],
      [mirT, mirH, mirW * 0.5 + mirT * 0.5, mirY],
    ]) {
      _add(g, new THREE.BoxGeometry(fw, fh, mirT), frameMat, fx, fy, mirZ);
    }
    const mirror = new THREE.Mesh(
      new THREE.PlaneGeometry(mirW, mirH),
      new THREE.MeshLambertMaterial({ color: 0xb8ccd8, emissive: 0x1a2830, emissiveIntensity: 0.15 }),
    );
    mirror.position.set(0, mirY, mirZ + mirT * 0.5 + 0.001);
    mirror.rotation.y = Math.PI;
    g.add(mirror);
  }

  /**
   * Horloge murale cabane — cadran face −Z, pendule, dos +Z au mur.
   * Cadran dans un sous-groupe local (plan XY, normale −Z).
   */
  function _buildCabinWallClock(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const frameMat = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x4a3224 });
    const faceMat = new THREE.MeshLambertMaterial({ color: 0xf0ece4, depthWrite: false });
    const metal = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x5a5e64 });
    const handMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

    const CY = 1.44;
    const backZ = 0.028;
    const DIAL_Y = CY + 0.06;
    const DIAL_Z = -0.010;

    const back = _add(g, new THREE.BoxGeometry(0.28, 0.46, 0.016), frameMat, 0, CY - 0.02, backZ);
    back.castShadow = true;

    const dial = new THREE.Group();
    dial.position.set(0, DIAL_Y, DIAL_Z);
    g.add(dial);

    const face = new THREE.Mesh(new THREE.CircleGeometry(0.108, 24), faceMat);
    face.rotation.y = Math.PI;
    face.renderOrder = 0;
    dial.add(face);

    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.013, 8, 24), frameMat);
    bezel.position.z = 0.001;
    bezel.castShadow = true;
    dial.add(bezel);

    const TICK_R = 0.090;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const len = i % 3 === 0 ? 0.018 : 0.010;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.005, len, 0.003), handMat);
      tick.position.set(Math.sin(a) * TICK_R, Math.cos(a) * TICK_R, -0.002);
      tick.rotation.z = -a;
      tick.renderOrder = 4;
      dial.add(tick);
    }

    const handsRoot = new THREE.Group();
    handsRoot.rotation.y = Math.PI;
    handsRoot.position.z = -0.004;
    dial.add(handsRoot);

    const hourPivot = new THREE.Group();
    const hourMesh = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.038, 0.006), handMat);
    hourMesh.position.y = 0.019;
    hourMesh.renderOrder = 6;
    hourPivot.add(hourMesh);
    handsRoot.add(hourPivot);

    const minutePivot = new THREE.Group();
    minutePivot.position.z = -0.001;
    const minuteMesh = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.054, 0.006), handMat);
    minuteMesh.position.y = 0.027;
    minuteMesh.renderOrder = 7;
    minutePivot.add(minuteMesh);
    handsRoot.add(minutePivot);

    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.007, 8), metal);
    pin.rotation.x = Math.PI / 2;
    pin.position.z = -0.007;
    pin.renderOrder = 8;
    dial.add(pin);

    const pendulumHousing = _add(g, new THREE.BoxGeometry(0.09, 0.12, 0.020), frameMat, 0, CY - 0.18, 0);
    pendulumHousing.castShadow = true;

    const pendulumPivot = new THREE.Group();
    pendulumPivot.position.set(0, CY - 0.11, -0.002);
    const pendulumRod = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.09, 0.005), metal);
    pendulumRod.position.y = -0.045;
    pendulumRod.castShadow = true;
    pendulumPivot.add(pendulumRod);
    const pendulumBob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), metal);
    pendulumBob.position.y = -0.09;
    pendulumBob.castShadow = true;
    pendulumPivot.add(pendulumBob);
    g.add(pendulumPivot);

    const cleat = _add(g, new THREE.BoxGeometry(0.12, 0.024, 0.012), frameMat, 0, CY - 0.28, backZ);
    cleat.castShadow = true;

    const wt = ZS.getWorldTime?.() ?? 0.3;
    const clockEntry = { hourHand: hourPivot, minuteHand: minutePivot, pendulum: pendulumPivot };
    if (ZS.applyWallClockHands) ZS.applyWallClockHands([clockEntry], wt);
    if (ZS.registerWallClock) ZS.registerWallClock(clockEntry);
  }

  /**
   * Débris de naufrage (plage) — planches, corde, filet, coin de caisse.
   * Pivot sol · face détail −Z · ~1,0 × 0,9 m.
   */
