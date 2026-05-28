// Buildings — flat-zone aligned, walkable structures with 2-storey support + roads
(function () {
  'use strict';

  // ── Register flat zones BEFORE world.js calls buildTerrain ───────────────────
  // Each zone flattens terrain to the noise height at its centre point.
  // Buildings placed inside a zone will all share the same base Y.
  ZS.registerFlatZone(-33, -25, 14, 12, 5);   // Village Ashwood
  ZS.registerFlatZone( 36,  27, 14, 12, 5);   // Ferme nord-est
  ZS.registerFlatZone( 19, -34, 12,  7, 5);   // Station service
  ZS.registerFlatZone(-34,  29, 16, 12, 5);   // Avant-poste militaire
  ZS.registerFlatZone(-15,  20,  8,  7, 4);   // Cabane forestière
  ZS.registerFlatZone( 25,   8,  8,  8, 4);   // Ruines
  ZS.registerFlatZone(  0,   0,  5,  5, 3);   // Zone de départ

  const _colliders = [];

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
    road:     new THREE.MeshLambertMaterial({ color: 0x35302a }),
    roadDirt: new THREE.MeshLambertMaterial({ color: 0x7a6648 }),
    stairs:   new THREE.MeshLambertMaterial({ color: 0x6b4f30 }),
  };

  // ── Primitives ────────────────────────────────────────────────────────────────

  function _mesh(scene, geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }

  function _wall(scene, x, z, baseY, lenX, lenZ, height, mat) {
    _mesh(scene, new THREE.BoxGeometry(lenX, height, lenZ), mat, x, baseY + height / 2, z);
    _colliders.push({ type: 'box', cx: x, cz: z, hw: lenX / 2, hd: lenZ / 2 });
  }

  function _slab(scene, x, z, y, w, d, mat) {
    _mesh(scene, new THREE.BoxGeometry(w, 0.14, d), mat, x, y + 0.07, z);
  }

  function _box(scene, x, z, y, w, h, d, mat) {
    _mesh(scene, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  }

  // ── Single-storey house ───────────────────────────────────────────────────────
  function _house(scene, cx, cz, W, D, wallH, wallMat, roofMat, doorDir) {
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T     = 0.22;
    const doorW = 1.4;
    const doorH = Math.min(2.2, wallH - 0.15);
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
        if (topH > 0.05) _wall(scene, cx, z, baseY + doorH, doorW, T, topH, wallMat);
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
        if (topH > 0.05) _wall(scene, x, cz, baseY + doorH, T, doorW, topH, wallMat);
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

  // ── Visual staircase (decorative steps) ──────────────────────────────────────
  // axis='z': steps run along Z from (cz - halfLen) to (cz + halfLen)
  // axis='x': steps run along X
  function _visualStairs(scene, cx, cz, fromY, toY, axis, stairWidth, halfLen) {
    const STEPS = 8;
    const stepH = (toY - fromY) / STEPS;
    const stepRun = (halfLen * 2) / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const cy = fromY + stepH * (i + 0.5);
      const off = -halfLen + stepRun * (i + 0.5);
      const sx = axis === 'x' ? cx + off : cx;
      const sz = axis === 'z' ? cz + off : cz;
      const gw = axis === 'x' ? stepRun + 0.02 : stairWidth;
      const gd = axis === 'z' ? stepRun + 0.02 : stairWidth;
      _box(scene, sx, sz, cy, gw, stepH + 0.02, gd, M.stairs);
    }
  }

  // ── 2-storey apartment (immeuble) ─────────────────────────────────────────────
  function _buildImmeuble2F(scene, cx, cz) {
    const W = 9, D = 6.5;
    const floorH = 2.9; // height of each storey
    const T = 0.28;
    const doorW = 1.8, doorH = 2.4;
    const baseY = ZS.getTerrainHeight(cx, cz);

    // Staircase in NW interior corner, running along Z
    const sCX  = cx - W / 2 + T + 1.0; // x centre of stairs
    const sCZ  = cz - D / 2 + T + 1.6; // z centre of stairs
    const sHW  = 0.95;                  // x half-width
    const sHD  = 1.6;                   // z half-depth (3.2 m run)
    ZS.registerRamp(sCX, sCZ, sHW, sHD, baseY, baseY + floorH, 'z');
    // Upper floor covers interior (all accessible once on staircase)
    ZS.registerUpperFloor(cx, cz, W / 2 - T - 0.05, D / 2 - T - 0.05, baseY + floorH);

    // Ground floor slab
    _slab(scene, cx, cz, baseY, W, D, M.floor);

    // Ground floor walls
    _wall(scene, cx, cz - D / 2, baseY, W, T, floorH, M.concrete);          // N
    const g = doorW / 2, side = W / 2 - g;
    _wall(scene, cx - g - side / 2, cz + D / 2, baseY, side,  T, floorH, M.concrete); // S left
    _wall(scene, cx + g + side / 2, cz + D / 2, baseY, side,  T, floorH, M.concrete); // S right
    _wall(scene, cx, cz + D / 2, baseY + doorH, doorW, T, floorH - doorH, M.concrete); // S header
    _wall(scene, cx - W / 2, cz, baseY, T, D, floorH, M.concrete);           // W
    _wall(scene, cx + W / 2, cz, baseY, T, D, floorH, M.concrete);           // E

    // Inter-floor slab (visible ceiling/floor)
    _slab(scene, cx, cz, baseY + floorH, W - T, D - T, M.concDark);

    // Visual staircase
    _visualStairs(scene, sCX, sCZ, baseY, baseY + floorH, 'z', sHW * 2 - 0.1, sHD);
    // Railing
    _box(scene, sCX - sHW + 0.04, sCZ, baseY + floorH * 0.5 + 0.3, 0.06, floorH + 0.6, sHD * 2, M.metal);

    // Second floor walls (full, no door)
    _wall(scene, cx, cz - D / 2, baseY + floorH, W, T, floorH, M.concrete);
    _wall(scene, cx, cz + D / 2, baseY + floorH, W, T, floorH, M.concrete);
    _wall(scene, cx - W / 2, cz, baseY + floorH, T, D, floorH, M.concrete);
    _wall(scene, cx + W / 2, cz, baseY + floorH, T, D, floorH, M.concrete);

    // Roof + parapet
    const roofY = baseY + floorH * 2;
    _slab(scene, cx, cz, roofY, W + 0.4, D + 0.4, M.roofGray);
    _wall(scene, cx, cz - D / 2 - 0.02, roofY, W + 0.44, T * 0.8, 0.5, M.concDark);
    _wall(scene, cx, cz + D / 2 + 0.02, roofY, W + 0.44, T * 0.8, 0.5, M.concDark);
    _wall(scene, cx - W / 2 - 0.02, cz, roofY, T * 0.8, D + 0.44, 0.5, M.concDark);
    _wall(scene, cx + W / 2 + 0.02, cz, roofY, T * 0.8, D + 0.44, 0.5, M.concDark);

    // Windows floor 1
    const wY1 = baseY + 1.3;
    for (const s of [-1, 1]) {
      _box(scene, cx + s * W * 0.27, cz - D / 2 - 0.02, wY1, 1.1, 0.9, 0.07, M.window);
    }
    _box(scene, cx - W / 2 - 0.02, cz, wY1, 0.07, 0.9, D * 0.3, M.window);
    _box(scene, cx + W / 2 + 0.02, cz, wY1, 0.07, 0.9, D * 0.3, M.window);

    // Windows floor 2
    const wY2 = baseY + floorH + 1.2;
    for (const s of [-1, 1]) {
      _box(scene, cx + s * W * 0.27, cz - D / 2 - 0.02, wY2, 1.1, 0.85, 0.07, M.window);
      _box(scene, cx + s * W * 0.27, cz + D / 2 + 0.02, wY2, 1.1, 0.85, 0.07, M.window);
    }
    _box(scene, cx - W / 2 - 0.02, cz, wY2, 0.07, 0.85, D * 0.3, M.window);
    _box(scene, cx + W / 2 + 0.02, cz, wY2, 0.07, 0.85, D * 0.3, M.window);
  }

  // ── 2-storey farmhouse ────────────────────────────────────────────────────────
  function _buildFarmhouse2F(scene, cx, cz) {
    const W = 7.5, D = 6.0;
    const floorH = 3.0;
    const T = 0.22;
    const baseY = ZS.getTerrainHeight(cx, cz);

    // Staircase along east interior wall, running along Z
    const sCX = cx + W / 2 - T - 1.0;
    const sCZ = cz;
    ZS.registerRamp(sCX, sCZ, 0.9, 2.2, baseY, baseY + floorH, 'z');
    ZS.registerUpperFloor(cx, cz, W / 2 - T - 0.05, D / 2 - T - 0.05, baseY + floorH);

    // Ground floor (door west)
    _slab(scene, cx, cz, baseY, W, D, M.wood);
    const doorW = 1.4, doorH = 2.2, topH = floorH - doorH;
    // N / S walls
    _wall(scene, cx, cz - D / 2, baseY, W, T, floorH, M.wood);
    _wall(scene, cx, cz + D / 2, baseY, W, T, floorH, M.wood);
    // E wall (full)
    _wall(scene, cx + W / 2, cz, baseY, T, D, floorH, M.wood);
    // W wall with door
    const g = doorW / 2, sideD = D / 2 - g;
    _wall(scene, cx - W / 2, cz - g - sideD / 2, baseY, T, sideD, floorH, M.wood);
    _wall(scene, cx - W / 2, cz + g + sideD / 2, baseY, T, sideD, floorH, M.wood);
    if (topH > 0.05) _wall(scene, cx - W / 2, cz, baseY + doorH, T, doorW, topH, M.wood);

    // Inter-floor slab
    _slab(scene, cx, cz, baseY + floorH, W - T, D - T, M.floor);

    // Visual staircase
    _visualStairs(scene, sCX, sCZ, baseY, baseY + floorH, 'z', 1.6, 2.2);
    _box(scene, sCX - 0.85, sCZ, baseY + floorH * 0.5 + 0.3, 0.06, floorH + 0.6, 4.4, M.metal);

    // Second floor walls (full — balcony opening west)
    const f2 = baseY + floorH;
    _wall(scene, cx, cz - D / 2, f2, W, T, floorH * 0.9, M.wood);
    _wall(scene, cx, cz + D / 2, f2, W, T, floorH * 0.9, M.wood);
    _wall(scene, cx + W / 2, cz, f2, T, D, floorH * 0.9, M.wood);
    // West wall 2F with balcony opening (shorter panel + railing)
    const railH = 0.9;
    _wall(scene, cx - W / 2, cz - g - sideD / 2, f2, T, sideD, floorH * 0.9, M.wood);
    _wall(scene, cx - W / 2, cz + g + sideD / 2, f2, T, sideD, floorH * 0.9, M.wood);
    _box(scene, cx - W / 2 - 0.01, cz, f2 + railH / 2, 0.07, railH, doorW + 0.2, M.metal);

    // Roof (gabled — approximated with 2 slabs + peak)
    const roofY = f2 + floorH * 0.9;
    _slab(scene, cx, cz, roofY, W + 0.4, D + 0.4, M.roofRed);
    // Gable peak ridge
    _box(scene, cx, cz, roofY + 0.6, W + 0.5, 0.2, 0.25, M.roofDark);

    // Windows
    const wY1 = baseY + 1.3, wY2 = f2 + 1.2;
    _box(scene, cx, cz - D / 2 - 0.01, wY1, W * 0.3, 0.7, 0.07, M.window);
    _box(scene, cx, cz + D / 2 + 0.01, wY1, W * 0.3, 0.7, 0.07, M.window);
    _box(scene, cx, cz - D / 2 - 0.01, wY2, W * 0.3, 0.7, 0.07, M.window);
    _box(scene, cx, cz + D / 2 + 0.01, wY2, W * 0.3, 0.7, 0.07, M.window);
    _box(scene, cx + W / 2 + 0.01, cz, wY1, 0.07, 0.7, D * 0.3, M.window);
    _box(scene, cx + W / 2 + 0.01, cz, wY2, 0.07, 0.7, D * 0.3, M.window);
  }

  // ── Village Ashwood ───────────────────────────────────────────────────────────
  function _buildVillage(scene) {
    // Place 2-storey immeuble
    _buildImmeuble2F(scene, -22, -24);

    // Single-storey houses
    _house(scene, -38, -16, 5.5, 5.0, 2.8, M.brick,    M.roofRed,  'S');
    _house(scene, -38, -26, 6.0, 5.0, 3.0, M.wood,     M.roofDark, 'E');
    _house(scene, -36, -34, 5.0, 4.5, 2.7, M.concrete, M.roofGray, 'N');
    _house(scene, -44, -22, 3.2, 3.0, 2.2, M.wood2,    M.roofDark, 'E');

    // Village square — central dirt patch
    const sqY = ZS.getTerrainHeight(-30, -25);
    _slab(scene, -30, -25, sqY + 0.01, 5, 5, M.dirt);
    // Well
    _box(scene, -30, -25, sqY + 0.55, 1.2, 1.1, 1.2, M.brick2);
    _box(scene, -30, -25, sqY + 1.1,  1.4, 0.18, 1.4, M.wood2);
  }

  // ── Ferme nord-est ────────────────────────────────────────────────────────────
  function _buildFarm(scene) {
    // 2-storey farmhouse
    _buildFarmhouse2F(scene, 33, 27);

    // Grande grange
    _buildBarn(scene, 43, 22);

    // Petit poulailler
    _house(scene, 28, 35, 3.5, 3.0, 2.2, M.wood2, M.roofDark, 'S');

    // Puits
    const wy = ZS.getTerrainHeight(38, 30);
    _box(scene, 38, 30, wy + 0.6, 1.2, 1.2, 1.2, M.brick2);
    _box(scene, 38, 30, wy + 1.2, 1.4, 0.18, 1.4, M.wood2);
  }

  function _buildBarn(scene, cx, cz) {
    const W = 10, D = 6.5, wallH = 4.2;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.28, doorW = 2.6;

    _slab(scene, cx, cz, baseY, W, D, M.dirt);
    _wall(scene, cx, cz - D / 2, baseY, W, T, wallH, M.wood2);
    const g = doorW / 2, side = W / 2 - g;
    _wall(scene, cx - g - side / 2, cz + D / 2, baseY, side, T, wallH, M.wood2);
    _wall(scene, cx + g + side / 2, cz + D / 2, baseY, side, T, wallH, M.wood2);
    _wall(scene, cx, cz + D / 2, baseY + 3.0, doorW, T, wallH - 3.0, M.wood2);
    _wall(scene, cx - W / 2, cz, baseY, T, D, wallH, M.wood2);
    _wall(scene, cx + W / 2, cz, baseY, T, D, wallH, M.wood2);
    _slab(scene, cx, cz, baseY + wallH, W + 0.5, D + 0.5, M.roofDark);
    for (let i = -1; i <= 1; i++) {
      _box(scene, cx + i * W * 0.3, cz, baseY + wallH - 0.4, 0.15, 0.2, D, M.wood2);
    }
  }

  // ── Station service ───────────────────────────────────────────────────────────
  function _buildGasStation(scene) {
    const cx = 24, cz = -34;
    const W = 8, D = 6, wallH = 3.3;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.22, doorW = 1.5;

    _slab(scene, cx, cz, baseY, W, D, M.floor);
    _wall(scene, cx, cz - D / 2, baseY, W, T, wallH, M.concrete);
    _wall(scene, cx, cz + D / 2, baseY, W, T, wallH, M.concrete);
    _wall(scene, cx + W / 2, cz, baseY, T, D, wallH, M.concrete);
    const g = doorW / 2, side = D / 2 - g;
    _wall(scene, cx - W / 2, cz - g - side / 2, baseY, T, side, wallH, M.concrete);
    _wall(scene, cx - W / 2, cz + g + side / 2, baseY, T, side, wallH, M.concrete);
    _wall(scene, cx - W / 2, cz, baseY + 2.2, T, doorW, wallH - 2.2, M.concrete);
    _slab(scene, cx, cz, baseY + wallH, W + 0.3, D + 0.3, M.roofGray);

    _box(scene, cx, cz - D / 2 - 0.02, baseY + 1.4, 2.2, 1.0, 0.07, M.window);
    _box(scene, cx, cz + D / 2 + 0.02, baseY + 1.4, 2.2, 1.0, 0.07, M.window);

    // Auvent pompes
    const canX = cx - W / 2 - 4.5;
    const canY = baseY + 3.8;
    _slab(scene, canX, cz, canY, 5.5, 7, M.metal);
    for (const pz of [cz - 2.8, cz + 2.8]) {
      _box(scene, canX - 2.2, pz, baseY + 1.9, 0.22, 3.8, 0.22, M.metal);
      _box(scene, canX + 2.2, pz, baseY + 1.9, 0.22, 3.8, 0.22, M.metal);
    }
    for (const pz of [cz - 1.6, cz + 1.6]) {
      _box(scene, canX, pz, baseY + 0.85, 0.55, 1.7, 0.38, M.rust);
      _box(scene, canX, pz, baseY + 0.55, 0.58, 0.1, 0.42, M.metal);
    }
    const apronY = ZS.getTerrainHeight(canX, cz);
    _slab(scene, canX, cz, apronY + 0.01, 6, 8, M.concDark);
  }

  // ── Avant-poste militaire ─────────────────────────────────────────────────────
  function _buildOutpost(scene) {
    const cx = -34, cz = 30;
    const W = 7.5, D = 5.5, wallH = 2.6;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.35, doorW = 1.4;

    _slab(scene, cx, cz, baseY, W, D, M.concDark);
    _wall(scene, cx, cz - D / 2, baseY, W, T, wallH, M.concDark);
    const g = doorW / 2, side = W / 2 - g;
    _wall(scene, cx - g - side / 2, cz + D / 2, baseY, side, T, wallH, M.concDark);
    _wall(scene, cx + g + side / 2, cz + D / 2, baseY, side, T, wallH, M.concDark);
    _wall(scene, cx, cz + D / 2, baseY + 2.0, doorW, T, wallH - 2.0, M.concDark);
    _wall(scene, cx - W / 2, cz, baseY, T, D, wallH, M.concDark);
    _wall(scene, cx + W / 2, cz, baseY, T, D, wallH, M.concDark);
    _slab(scene, cx, cz, baseY + wallH, W + 0.5, D + 0.5, M.concDark);

    _box(scene, cx,          cz - D / 2 - 0.02, baseY + 1.2, 0.9,  0.35, 0.07, M.window);
    _box(scene, cx - W * 0.3, cz + D / 2 + 0.02, baseY + 1.2, 0.6, 0.35, 0.07, M.window);
    _box(scene, cx + W * 0.3, cz + D / 2 + 0.02, baseY + 1.2, 0.6, 0.35, 0.07, M.window);

    _buildWatchtower(scene, cx + 9, cz - 4);
    _house(scene, cx - 8, cz + 4, 3.0, 3.0, 2.4, M.concDark, M.metal, 'S');

    // Palissade
    const posts = [
      [cx + 5, cz - 7], [cx, cz - 8], [cx - 5, cz - 7],
      [cx - 8, cz],     [cx - 7, cz + 6],
      [cx + 8, cz],     [cx + 7, cz + 6],
    ];
    for (const [fx, fz] of posts) {
      const fy = ZS.getTerrainHeight(fx, fz);
      _box(scene, fx, fz, fy + 1.1, 0.14, 2.2, 0.14, M.metal);
      _box(scene, fx, fz, fy + 2.1, 0.6,  0.06, 0.06, M.metal);
    }

    // Sacs de sable
    for (let i = -1; i <= 1; i++) {
      const sx = cx + i * 1.4, sz = cz + D / 2 + 1.2;
      const sy = ZS.getTerrainHeight(sx, sz);
      _box(scene, sx, sz, sy + 0.3, 0.8, 0.6, 0.6, M.dirt);
      _colliders.push({ type: 'box', cx: sx, cz: sz, hw: 0.4, hd: 0.3 });
    }
  }

  function _buildWatchtower(scene, cx, cz) {
    const baseY = ZS.getTerrainHeight(cx, cz);
    const h = 5.5, leg = 0.14;
    for (const [ox, oz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
      _box(scene, cx + ox, cz + oz, baseY + h / 2, leg, h, leg, M.metal);
    }
    _box(scene, cx, cz, baseY + h,       2.4, 0.18, 2.4, M.wood2);
    _box(scene, cx,  cz - 1.2, baseY + h + 0.4, 2.4, 0.6, leg, M.metal);
    _box(scene, cx,  cz + 1.2, baseY + h + 0.4, 2.4, 0.6, leg, M.metal);
    _box(scene, cx - 1.2, cz,  baseY + h + 0.4, leg, 0.6, 2.4, M.metal);
    _box(scene, cx + 1.2, cz,  baseY + h + 0.4, leg, 0.6, 2.4, M.metal);
    _box(scene, cx, cz - 0.6, baseY + h + 1.3, 2.6, 0.1, 1.6, M.roofDark);
    _box(scene, cx, cz + 0.6, baseY + h + 1.3, 2.6, 0.1, 1.6, M.roofDark);
  }

  // ── Cabane forestière ─────────────────────────────────────────────────────────
  function _buildForestCabin(scene) {
    _house(scene, -15, 20, 5.5, 4.5, 2.9, M.wood, M.roofDark, 'E');
    const ty = ZS.getTerrainHeight(-11.5, 20);
    _slab(scene, -11.5, 20, ty + 0.01, 3.0, 4.0, M.wood2);
    _box(scene, -10,    20, ty + 0.6, 0.1, 1.2, 4.0, M.wood2);
    _box(scene, -11.5, 18, ty + 0.6, 3.0, 1.2, 0.1, M.wood2);
    _box(scene, -11.5, 22, ty + 0.6, 3.0, 1.2, 0.1, M.wood2);
  }

  // ── Ruines ────────────────────────────────────────────────────────────────────
  function _buildRuins(scene) {
    const cx = 25, cz = 8;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.22;

    _wall(scene, cx,       cz - 4, baseY, 8,  T,   2.8, M.brick2);
    _wall(scene, cx - 4,   cz,     baseY, T,  8,   1.4, M.brick2);
    _wall(scene, cx + 4,   cz - 2, baseY, T,  4,   2.5, M.brick2);
    _wall(scene, cx + 4,   cz + 3, baseY, T,  2,   0.9, M.brick2);
    _wall(scene, cx - 1.5, cz + 4, baseY, 5,  T,   0.7, M.brick2);
    _slab(scene, cx, cz, baseY + 0.01, 8, 8, M.dirt);

    for (const [rx, rz, rw, rh, rd] of [
      [cx + 2, cz + 1, 0.9, 0.7, 0.8],
      [cx - 2, cz + 2, 1.2, 0.5, 0.6],
      [cx + 3, cz - 1, 0.7, 0.9, 0.7],
    ]) {
      const ry = ZS.getTerrainHeight(rx, rz);
      _box(scene, rx, rz, ry + rh / 2, rw, rh, rd, M.brick2);
    }
  }

  // ── Routes ────────────────────────────────────────────────────────────────────
  function _roadSeg(scene, x0, z0, x1, z1, width, mat) {
    const dx  = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.1) return;
    const angle = Math.atan2(dx, dz);
    const STEP  = 5;
    const steps = Math.max(1, Math.ceil(len / STEP));

    for (let i = 0; i < steps; i++) {
      const t  = (i + 0.5) / steps;
      const x  = x0 + dx * t;
      const z  = z0 + dz * t;
      const y  = ZS.getTerrainHeight(x, z);
      const sl = len / steps;
      const m  = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, sl + 0.3), mat);
      m.rotation.y = angle;
      m.position.set(x, y + 0.04, z);
      scene.add(m);
    }
  }

  function _buildRoads(scene) {
    // Route principale : village → spawn → ferme
    _roadSeg(scene, -28, -22,  -8,  -8, 3.8, M.road);
    _roadSeg(scene,  -8,  -8,   0,   0, 3.8, M.road);
    _roadSeg(scene,   0,   0,  16,  14, 3.8, M.road);
    _roadSeg(scene,  16,  14,  30,  24, 3.8, M.road);

    // Village → station service
    _roadSeg(scene, -28, -26,  -5, -27, 3.2, M.road);
    _roadSeg(scene,  -5, -27,  16, -33, 3.2, M.road);

    // Spawn → avant-poste (chemin de terre)
    _roadSeg(scene,   0,   0, -12,  12, 2.6, M.roadDirt);
    _roadSeg(scene, -12,  12, -28,  27, 2.6, M.roadDirt);

    // Ferme → cabane forestière (sentier)
    _roadSeg(scene,  28,  27,  10,  22, 2.0, M.roadDirt);
    _roadSeg(scene,  10,  22, -12,  20, 2.0, M.roadDirt);
  }

  // ── Entry point ───────────────────────────────────────────────────────────────
  function buildAll(scene) {
    _buildRoads(scene);
    _buildVillage(scene);
    _buildFarm(scene);
    _buildGasStation(scene);
    _buildOutpost(scene);
    _buildForestCabin(scene);
    _buildRuins(scene);
    return _colliders;
  }

  window.ZS = window.ZS || {};
  ZS.Buildings = { buildAll };
}());
