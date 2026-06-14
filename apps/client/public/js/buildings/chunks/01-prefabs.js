// Maisons, fermes, tours
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
