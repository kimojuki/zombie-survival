// Buildings — shared utilities + sector registry
(function () {
  'use strict';

  const _colliders = [];
  const _sectors   = [];

  // ── Registre de loot ────────────────────────────────────────────────────────
  // Chaque bâtiment "lootable" déclare son empreinte + sa catégorie. Le serveur
  // s'en sert pour générer les objets au sol (voir worlDesign/items/items.md).
  const _lootBuildings = [];
  function registerLoot(category, cx, cz, w, d) {
    _lootBuildings.push({ category, cx, cz, w: w || 8, d: d || 7 });
  }

  // ── Materials ─────────────────────────────────────────────────────────────────
  const M = {
    brick:    new THREE.MeshLambertMaterial({ color: 0xb55a3a }),
    brick2:   new THREE.MeshLambertMaterial({ color: 0x9c4a2e }),
    concrete: new THREE.MeshLambertMaterial({ color: 0xa09488 }),
    concDark: new THREE.MeshLambertMaterial({ color: 0x787060 }),
    wood:     new THREE.MeshLambertMaterial({ color: 0x9c6b3c }),
    wood2:    new THREE.MeshLambertMaterial({ color: 0x7a4f2e }),
    roofRed:  new THREE.MeshLambertMaterial({ color: 0x8a2020 }),
    roofDark: new THREE.MeshLambertMaterial({ color: 0x3e2c1a }),
    roofGray: new THREE.MeshLambertMaterial({ color: 0x5e5e52 }),
    floor:    new THREE.MeshLambertMaterial({ color: 0x7a6a5a }),
    dirt:     new THREE.MeshLambertMaterial({ color: 0x5a4a3a }),
    window:   new THREE.MeshLambertMaterial({ color: 0x5a8aaa, transparent: true, opacity: 0.55 }),
    metal:    new THREE.MeshLambertMaterial({ color: 0x778899 }),
    rust:     new THREE.MeshLambertMaterial({ color: 0x8a5a30 }),
    road:     new THREE.MeshLambertMaterial({ color: 0x35302a, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }),
    roadLine: new THREE.MeshLambertMaterial({ color: 0xeecc22, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }),
    roadDirt: new THREE.MeshLambertMaterial({ color: 0x7a6648, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }),
    path:     new THREE.MeshLambertMaterial({ color: 0x5e4a34, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 }),
    stairs:   new THREE.MeshLambertMaterial({ color: 0x6b4f30 }),
  };

  // ── Primitives ────────────────────────────────────────────────────────────────

  function _mesh(scene, geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  // noCollide=true → visuel uniquement
  // maxY → le joueur peut sauter par-dessus si ses pieds dépassent maxY
  // minY → collider actif seulement si les pieds du joueur sont au-dessus de minY
  function _wall(scene, x, z, baseY, lenX, lenZ, height, mat, noCollide, maxY, minY) {
    _mesh(scene, new THREE.BoxGeometry(lenX, height, lenZ), mat, x, baseY + height / 2, z);
    if (!noCollide) {
      const col = { type: 'box', cx: x, cz: z, hw: lenX / 2, hd: lenZ / 2 };
      if (maxY !== undefined) col.maxY = maxY;
      if (minY !== undefined) col.minY = minY;
      _colliders.push(col);
    }
  }

  function _slab(scene, x, z, y, w, d, mat) {
    _mesh(scene, new THREE.BoxGeometry(w, 0.14, d), mat, x, y + 0.07, z);
  }

  // Dalle percée d'une trémie rectangulaire (cage d'escalier)
  function _slabWithHole(scene, cx, cz, y, w, d, mat, hole) {
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const z0 = cz - d / 2, z1 = cz + d / 2;
    const hx0 = Math.max(x0, hole.cx - hole.hw), hx1 = Math.min(x1, hole.cx + hole.hw);
    const hz0 = Math.max(z0, hole.cz - hole.hd), hz1 = Math.min(z1, hole.cz + hole.hd);
    if (hz0 - z0 > 0.02) _slab(scene, cx, (z0 + hz0) / 2, y, w, hz0 - z0, mat);
    if (z1 - hz1 > 0.02) _slab(scene, cx, (hz1 + z1) / 2, y, w, z1 - hz1, mat);
    if (hx0 - x0 > 0.02) _slab(scene, (x0 + hx0) / 2, (hz0 + hz1) / 2, y, hx0 - x0, hz1 - hz0, mat);
    if (x1 - hx1 > 0.02) _slab(scene, (hx1 + x1) / 2, (hz0 + hz1) / 2, y, x1 - hx1, hz1 - hz0, mat);
  }

  function _box(scene, x, z, y, w, h, d, mat) {
    _mesh(scene, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  }

  function _visualStairs(scene, cx, cz, fromY, toY, axis, stairWidth, halfLen) {
    const STEPS = 8;
    const stepH = (toY - fromY) / STEPS;
    const stepRun = (halfLen * 2) / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const cy  = fromY + stepH * (i + 0.5);
      const off = -halfLen + stepRun * (i + 0.5);
      const sx  = axis === 'x' ? cx + off : cx;
      const sz  = axis === 'z' ? cz + off : cz;
      const gw  = axis === 'x' ? stepRun + 0.02 : stairWidth;
      const gd  = axis === 'z' ? stepRun + 0.02 : stairWidth;
      _box(scene, sx, sz, cy, gw, stepH + 0.02, gd, M.stairs);
    }
  }

  // Ruban de route/chemin collé au terrain
  function _ribbon(scene, pts, width, mat, withLine) {
    const STEP = 0.7;
    const pos  = [];
    const idx  = [];
    let prevL  = -1;

    for (let si = 0; si < pts.length - 1; si++) {
      const [x0, z0] = pts[si];
      const [x1, z1] = pts[si + 1];
      const sdx = x1 - x0, sdz = z1 - z0;
      const sLen = Math.hypot(sdx, sdz);
      if (sLen < 0.01) continue;
      const nx = -sdz / sLen, nz = sdx / sLen;
      const hw = width / 2;
      const steps = Math.max(1, Math.ceil(sLen / STEP));

      for (let i = (si === 0 ? 0 : 1); i <= steps; i++) {
        const t  = i / steps;
        const x  = x0 + sdx * t;
        const z  = z0 + sdz * t;
        const y  = ZS.getTerrainHeight(x, z) + 0.55;
        const li = pos.length / 3;
        pos.push(x - nx * hw, y, z - nz * hw);
        pos.push(x + nx * hw, y, z + nz * hw);
        if (prevL >= 0) idx.push(prevL, li, prevL + 1, prevL + 1, li, li + 1);
        prevL = li;
      }
    }

    if (pos.length < 6) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo, mat));

    if (withLine) {
      const lPos = [], lIdx = [];
      let lprev = -1, dashToggle = 0;
      for (let si = 0; si < pts.length - 1; si++) {
        const [x0, z0] = pts[si];
        const [x1, z1] = pts[si + 1];
        const sdx = x1 - x0, sdz = z1 - z0;
        const sLen = Math.hypot(sdx, sdz);
        if (sLen < 0.01) continue;
        const nx = -sdz / sLen, nz = sdx / sLen;
        const lW = 0.14;
        const steps = Math.max(1, Math.ceil(sLen / STEP));
        for (let i = (si === 0 ? 0 : 1); i <= steps; i++) {
          const t = i / steps;
          const x = x0 + sdx * t, z = z0 + sdz * t;
          const y = ZS.getTerrainHeight(x, z) + 0.60;
          const li = lPos.length / 3;
          lPos.push(x - nx * lW, y, z - nz * lW, x + nx * lW, y, z + nz * lW);
          if (lprev >= 0 && dashToggle % 4 < 2) lIdx.push(lprev, li, lprev + 1, lprev + 1, li, li + 1);
          lprev = li; dashToggle++;
        }
      }
      if (lPos.length >= 6 && lIdx.length > 0) {
        const lGeo = new THREE.BufferGeometry();
        lGeo.setAttribute('position', new THREE.Float32BufferAttribute(lPos, 3));
        lGeo.setIndex(lIdx);
        lGeo.computeVertexNormals();
        scene.add(new THREE.Mesh(lGeo, M.roadLine));
      }
    }
  }

  // ── Reusable building templates ───────────────────────────────────────────────

  function _house(scene, cx, cz, W, D, wallH, wallMat, roofMat, doorDir) {
    registerLoot('maison', cx, cz, W, D);
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T     = 0.22;
    const doorW = 2.0;
    const doorH = Math.min(2.4, wallH - 0.1);
    const topH  = wallH - doorH;

    _slab(scene, cx, cz, baseY, W, D, M.floor);

    function xWall(z, withDoor) {
      if (!withDoor) {
        _wall(scene, cx, z, baseY, W, T, wallH, wallMat);
      } else {
        const g = doorW / 2, side = W / 2 - g;
        if (side > 0.05) {
          _wall(scene, cx - g - side / 2, z, baseY, side, T, wallH, wallMat);
          _wall(scene, cx + g + side / 2, z, baseY, side, T, wallH, wallMat);
        }
        if (topH > 0.05) _wall(scene, cx, z, baseY + doorH, doorW, T, topH, wallMat, true);
      }
    }

    function zWall(x, withDoor) {
      if (!withDoor) {
        _wall(scene, x, cz, baseY, T, D, wallH, wallMat);
      } else {
        const g = doorW / 2, side = D / 2 - g;
        if (side > 0.05) {
          _wall(scene, x, cz - g - side / 2, baseY, T, side, wallH, wallMat);
          _wall(scene, x, cz + g + side / 2, baseY, T, side, wallH, wallMat);
        }
        if (topH > 0.05) _wall(scene, x, cz, baseY + doorH, T, doorW, topH, wallMat, true);
      }
    }

    xWall(cz - D / 2, doorDir === 'N');
    xWall(cz + D / 2, doorDir === 'S');
    zWall(cx - W / 2, doorDir === 'W');
    zWall(cx + W / 2, doorDir === 'E');

    _slab(scene, cx, cz, baseY + wallH, W + 0.35, D + 0.35, roofMat);

    const winY = baseY + wallH * 0.52;
    if (doorDir !== 'N') _box(scene, cx,          cz - D / 2 - 0.01, winY, W * 0.33, 0.7, 0.07, M.window);
    if (doorDir !== 'S') _box(scene, cx,          cz + D / 2 + 0.01, winY, W * 0.33, 0.7, 0.07, M.window);
    if (doorDir !== 'W') _box(scene, cx - W / 2 - 0.01, cz,          winY, 0.07, 0.7, D * 0.28, M.window);
    if (doorDir !== 'E') _box(scene, cx + W / 2 + 0.01, cz,          winY, 0.07, 0.7, D * 0.28, M.window);
  }

  function _buildImmeuble2F(scene, cx, cz) {
    registerLoot('maison', cx, cz, 9, 6.5);
    const W = 9, D = 6.5;
    const floorH = 2.9;
    const T = 0.28;
    const doorW = 2.0, doorH = 2.4;
    const baseY = ZS.getTerrainHeight(cx, cz);

    const sCX = cx - W / 2 + T + 1.0;
    const sCZ = cz - D / 2 + T + 1.6;
    const sHW = 0.95;
    const sHD = 1.6;
    ZS.registerRamp(sCX, sCZ, sHW, sHD, baseY, baseY + floorH, 'z');
    ZS.registerUpperFloor(cx, cz, W / 2 - T - 0.05, D / 2 - T - 0.05, baseY + floorH,
                          { cx: sCX, cz: sCZ, hw: sHW, hd: sHD });

    _slab(scene, cx, cz, baseY, W, D, M.floor);
    _wall(scene, cx, cz - D / 2, baseY, W, T, floorH, M.concrete);
    const g = doorW / 2, side = W / 2 - g;
    _wall(scene, cx - g - side / 2, cz + D / 2, baseY, side, T, floorH, M.concrete);
    _wall(scene, cx + g + side / 2, cz + D / 2, baseY, side, T, floorH, M.concrete);
    _wall(scene, cx, cz + D / 2, baseY + doorH, doorW, T, floorH - doorH, M.concrete, true);
    _wall(scene, cx - W / 2, cz, baseY, T, D, floorH, M.concrete);
    _wall(scene, cx + W / 2, cz, baseY, T, D, floorH, M.concrete);

    _slabWithHole(scene, cx, cz, baseY + floorH, W - T, D - T, M.concDark,
                  { cx: sCX, cz: sCZ, hw: sHW, hd: sHD });
    _visualStairs(scene, sCX, sCZ, baseY, baseY + floorH, 'z', sHW * 2 - 0.1, sHD);
    _box(scene, sCX - sHW + 0.04, sCZ, baseY + floorH * 0.5 + 0.3, 0.06, floorH + 0.6, sHD * 2, M.metal);

    const upMinY = baseY + floorH - 0.6;
    _wall(scene, cx, cz - D / 2, baseY + floorH, W, T, floorH, M.concrete, false, undefined, upMinY);
    _wall(scene, cx, cz + D / 2, baseY + floorH, W, T, floorH, M.concrete, false, undefined, upMinY);
    _wall(scene, cx - W / 2, cz, baseY + floorH, T, D, floorH, M.concrete, false, undefined, upMinY);
    _wall(scene, cx + W / 2, cz, baseY + floorH, T, D, floorH, M.concrete, false, undefined, upMinY);

    const roofY = baseY + floorH * 2;
    _slab(scene, cx, cz, roofY, W + 0.4, D + 0.4, M.roofGray);
    const parapetMinY = roofY - 0.6;
    _wall(scene, cx, cz - D / 2 - 0.02, roofY, W + 0.44, T * 0.8, 0.5, M.concDark, false, undefined, parapetMinY);
    _wall(scene, cx, cz + D / 2 + 0.02, roofY, W + 0.44, T * 0.8, 0.5, M.concDark, false, undefined, parapetMinY);
    _wall(scene, cx - W / 2 - 0.02, cz, roofY, T * 0.8, D + 0.44, 0.5, M.concDark, false, undefined, parapetMinY);
    _wall(scene, cx + W / 2 + 0.02, cz, roofY, T * 0.8, D + 0.44, 0.5, M.concDark, false, undefined, parapetMinY);

    const wY1 = baseY + 1.3;
    for (const s of [-1, 1]) _box(scene, cx + s * W * 0.27, cz - D / 2 - 0.02, wY1, 1.1, 0.9, 0.07, M.window);
    _box(scene, cx - W / 2 - 0.02, cz, wY1, 0.07, 0.9, D * 0.3, M.window);
    _box(scene, cx + W / 2 + 0.02, cz, wY1, 0.07, 0.9, D * 0.3, M.window);

    const wY2 = baseY + floorH + 1.2;
    for (const s of [-1, 1]) {
      _box(scene, cx + s * W * 0.27, cz - D / 2 - 0.02, wY2, 1.1, 0.85, 0.07, M.window);
      _box(scene, cx + s * W * 0.27, cz + D / 2 + 0.02, wY2, 1.1, 0.85, 0.07, M.window);
    }
    _box(scene, cx - W / 2 - 0.02, cz, wY2, 0.07, 0.85, D * 0.3, M.window);
    _box(scene, cx + W / 2 + 0.02, cz, wY2, 0.07, 0.85, D * 0.3, M.window);
  }

  function _buildFarmhouse2F(scene, cx, cz) {
    registerLoot('maison', cx, cz, 7.5, 6.0);
    const W = 7.5, D = 6.0;
    const floorH = 3.0;
    const T = 0.22;
    const baseY = ZS.getTerrainHeight(cx, cz);

    const sCX = cx + W / 2 - T - 1.0;
    const sCZ = cz;
    ZS.registerRamp(sCX, sCZ, 0.9, 2.2, baseY, baseY + floorH, 'z');
    ZS.registerUpperFloor(cx, cz, W / 2 - T - 0.05, D / 2 - T - 0.05, baseY + floorH,
                          { cx: sCX, cz: sCZ, hw: 0.9, hd: 2.2 });

    _slab(scene, cx, cz, baseY, W, D, M.wood);
    const doorW = 2.0, doorH = 2.4, topH = floorH - doorH;
    _wall(scene, cx, cz - D / 2, baseY, W, T, floorH, M.wood);
    _wall(scene, cx, cz + D / 2, baseY, W, T, floorH, M.wood);
    _wall(scene, cx + W / 2, cz, baseY, T, D, floorH, M.wood);
    const g = doorW / 2, sideD = D / 2 - g;
    _wall(scene, cx - W / 2, cz - g - sideD / 2, baseY, T, sideD, floorH, M.wood);
    _wall(scene, cx - W / 2, cz + g + sideD / 2, baseY, T, sideD, floorH, M.wood);
    if (topH > 0.05) _wall(scene, cx - W / 2, cz, baseY + doorH, T, doorW, topH, M.wood, true);

    _slabWithHole(scene, cx, cz, baseY + floorH, W - T, D - T, M.floor,
                  { cx: sCX, cz: sCZ, hw: 0.9, hd: 2.2 });
    _visualStairs(scene, sCX, sCZ, baseY, baseY + floorH, 'z', 1.6, 2.2);
    _box(scene, sCX - 0.85, sCZ, baseY + floorH * 0.5 + 0.3, 0.06, floorH + 0.6, 4.4, M.metal);

    const f2 = baseY + floorH;
    _wall(scene, cx, cz - D / 2, f2, W, T, floorH * 0.9, M.wood);
    _wall(scene, cx, cz + D / 2, f2, W, T, floorH * 0.9, M.wood);
    _wall(scene, cx + W / 2, cz, f2, T, D, floorH * 0.9, M.wood);
    const railH = 0.9;
    _wall(scene, cx - W / 2, cz - g - sideD / 2, f2, T, sideD, floorH * 0.9, M.wood);
    _wall(scene, cx - W / 2, cz + g + sideD / 2, f2, T, sideD, floorH * 0.9, M.wood);
    _box(scene, cx - W / 2 - 0.01, cz, f2 + railH / 2, 0.07, railH, doorW + 0.2, M.metal);

    const roofY = f2 + floorH * 0.9;
    _slab(scene, cx, cz, roofY, W + 0.4, D + 0.4, M.roofRed);
    _box(scene, cx, cz, roofY + 0.6, W + 0.5, 0.2, 0.25, M.roofDark);

    const wY1 = baseY + 1.3, wY2 = f2 + 1.2;
    _box(scene, cx, cz - D / 2 - 0.01, wY1, W * 0.3, 0.7, 0.07, M.window);
    _box(scene, cx, cz + D / 2 + 0.01, wY1, W * 0.3, 0.7, 0.07, M.window);
    _box(scene, cx, cz - D / 2 - 0.01, wY2, W * 0.3, 0.7, 0.07, M.window);
    _box(scene, cx, cz + D / 2 + 0.01, wY2, W * 0.3, 0.7, 0.07, M.window);
    _box(scene, cx + W / 2 + 0.01, cz, wY1, 0.07, 0.7, D * 0.3, M.window);
    _box(scene, cx + W / 2 + 0.01, cz, wY2, 0.07, 0.7, D * 0.3, M.window);
  }

  function _buildBarn(scene, cx, cz) {
    registerLoot('chantier', cx, cz, 10, 6.5);
    const W = 10, D = 6.5, wallH = 4.2;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.28, doorW = 2.6;

    _slab(scene, cx, cz, baseY, W, D, M.dirt);
    _wall(scene, cx, cz - D / 2, baseY, W, T, wallH, M.wood2);
    const g = doorW / 2, side = W / 2 - g;
    _wall(scene, cx - g - side / 2, cz + D / 2, baseY, side, T, wallH, M.wood2);
    _wall(scene, cx + g + side / 2, cz + D / 2, baseY, side, T, wallH, M.wood2);
    _wall(scene, cx, cz + D / 2, baseY + 3.0, doorW, T, wallH - 3.0, M.wood2, true);
    _wall(scene, cx - W / 2, cz, baseY, T, D, wallH, M.wood2);
    _wall(scene, cx + W / 2, cz, baseY, T, D, wallH, M.wood2);
    _slab(scene, cx, cz, baseY + wallH, W + 0.5, D + 0.5, M.roofDark);
    for (let i = -1; i <= 1; i++) _box(scene, cx + i * W * 0.3, cz, baseY + wallH - 0.4, 0.15, 0.2, D, M.wood2);
  }

  function _buildWatchtower(scene, cx, cz) {
    const baseY = ZS.getTerrainHeight(cx, cz);
    const h = 5.5, leg = 0.14;
    for (const [ox, oz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
      _box(scene, cx + ox, cz + oz, baseY + h / 2, leg, h, leg, M.metal);
      _colliders.push({ x: cx + ox, z: cz + oz, r: 0.12 });
    }
    _box(scene, cx, cz, baseY + h, 2.4, 0.18, 2.4, M.wood2);
    _box(scene, cx, cz - 1.2, baseY + h + 0.4, 2.4, 0.6, leg, M.metal);
    _box(scene, cx, cz + 1.2, baseY + h + 0.4, 2.4, 0.6, leg, M.metal);
    _box(scene, cx - 1.2, cz, baseY + h + 0.4, leg, 0.6, 2.4, M.metal);
    _box(scene, cx + 1.2, cz, baseY + h + 0.4, leg, 0.6, 2.4, M.metal);
    _box(scene, cx, cz - 0.6, baseY + h + 1.3, 2.6, 0.1, 1.6, M.roofDark);
    _box(scene, cx, cz + 0.6, baseY + h + 1.3, 2.6, 0.1, 1.6, M.roofDark);
  }

  function _buildGasStation(scene, cx, cz) {
    registerLoot('garage', cx, cz, 8, 6);
    const W = 8, D = 6, wallH = 3.3;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.22, doorW = 2.0;

    _slab(scene, cx, cz, baseY, W, D, M.floor);
    _wall(scene, cx, cz - D / 2, baseY, W, T, wallH, M.concrete);
    _wall(scene, cx, cz + D / 2, baseY, W, T, wallH, M.concrete);
    _wall(scene, cx + W / 2, cz, baseY, T, D, wallH, M.concrete);
    const g = doorW / 2, side = D / 2 - g;
    _wall(scene, cx - W / 2, cz - g - side / 2, baseY, T, side, wallH, M.concrete);
    _wall(scene, cx - W / 2, cz + g + side / 2, baseY, T, side, wallH, M.concrete);
    _wall(scene, cx - W / 2, cz, baseY + 2.2, T, doorW, wallH - 2.2, M.concrete, true);
    _slab(scene, cx, cz, baseY + wallH, W + 0.3, D + 0.3, M.roofGray);
    _box(scene, cx, cz - D / 2 - 0.02, baseY + 1.4, 2.2, 1.0, 0.07, M.window);
    _box(scene, cx, cz + D / 2 + 0.02, baseY + 1.4, 2.2, 1.0, 0.07, M.window);

    // Auvent pompes
    const canX  = cx - W / 2 - 4.5;
    const canY  = baseY + 3.8;
    _slab(scene, canX, cz, canY, 5.5, 7, M.metal);
    for (const pz of [cz - 2.8, cz + 2.8]) {
      _box(scene, canX - 2.2, pz, baseY + 1.9, 0.22, 3.8, 0.22, M.metal);
      _colliders.push({ x: canX - 2.2, z: pz, r: 0.16 });
      _box(scene, canX + 2.2, pz, baseY + 1.9, 0.22, 3.8, 0.22, M.metal);
      _colliders.push({ x: canX + 2.2, z: pz, r: 0.16 });
    }
    for (const pz of [cz - 1.6, cz + 1.6]) {
      _box(scene, canX, pz, baseY + 0.85, 0.55, 1.7, 0.38, M.rust);
      _colliders.push({ x: canX, z: pz, r: 0.32 });
      _box(scene, canX, pz, baseY + 0.55, 0.58, 0.1, 0.42, M.metal);
    }
    const apronY = ZS.getTerrainHeight(canX, cz);
    _slab(scene, canX, cz, apronY + 0.01, 6, 8, M.concDark);
  }

  function _car(scene, cx, cz, rotY, colorHex) {
    const cy     = ZS.getTerrainHeight(cx, cz);
    const rusted = new THREE.MeshLambertMaterial({ color: colorHex || 0x5a3015 });
    const dark   = new THREE.MeshLambertMaterial({ color: 0x181818 });
    const glass  = new THREE.MeshLambertMaterial({ color: 0x334444, transparent: true, opacity: 0.5 });
    const g      = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.72, 4.1), rusted);
    body.position.y = 0.62; body.castShadow = true; body.receiveShadow = true;

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.62, 2.15), rusted);
    cabin.position.set(0, 1.25, -0.18); cabin.castShadow = true;

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.06), glass);
    windshield.position.set(0, 1.3, -1.2);

    for (const [ox, oz] of [[-0.97,-1.38],[0.97,-1.38],[-0.97,1.38],[0.97,1.38]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 9), dark);
      w.rotation.z = Math.PI / 2;
      w.position.set(ox, 0.37, oz);
      g.add(w);
    }
    g.add(body); g.add(cabin); g.add(windshield);
    g.position.set(cx, cy, cz);
    g.rotation.y = rotY;
    scene.add(g);
    // maxY = dessus de la carrosserie (~0.98m) — le joueur peut sauter dessus
    _colliders.push({ type: 'box', cx, cz, hw: 1.0, hd: 2.2, maxY: cy + 0.98 });
  }

  // ── Sector registry ───────────────────────────────────────────────────────────

  function registerSector(sectorObj) {
    _sectors.push(sectorObj);
  }

  function buildAll(scene) {
    for (const s of _sectors) s.build(scene);
    return _colliders;
  }

  // ── Exports ───────────────────────────────────────────────────────────────────

  window.ZS = window.ZS || {};
  ZS.B = {
    M,
    mesh:         _mesh,
    wall:         _wall,
    slab:         _slab,
    slabWithHole: _slabWithHole,
    box:          _box,
    visualStairs: _visualStairs,
    ribbon:       _ribbon,
    house:        _house,
    immeuble2F:   _buildImmeuble2F,
    farmhouse2F:  _buildFarmhouse2F,
    barn:         _buildBarn,
    watchtower:   _buildWatchtower,
    gasStation:   _buildGasStation,
    car:          _car,
    addCollider:  (c) => _colliders.push(c),
  };
  ZS.registerLoot = registerLoot;
  ZS.Buildings = { buildAll, registerSector, getLootBuildings: () => _lootBuildings };
}());
