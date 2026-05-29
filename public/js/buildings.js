// Buildings — flat-zone aligned, walkable structures with 2-storey support + roads
(function () {
  'use strict';

  // ── Register flat zones BEFORE world.js calls buildTerrain ───────────────────
  // Each zone flattens terrain to the noise height at its centre point.
  // Buildings placed inside a zone will all share the same base Y.
  ZS.registerFlatZone(-58, -44, 16, 14, 6);   // Village Ashwood
  ZS.registerFlatZone( 63,  47, 16, 14, 6);   // Ferme nord-est
  ZS.registerFlatZone( 34, -60, 14,  9, 5);   // Station service
  ZS.registerFlatZone(-60,  51, 16, 12, 6);   // Avant-poste militaire
  ZS.registerFlatZone(-26,  35, 10,  9, 4);   // Cabane forestière
  ZS.registerFlatZone( 44,  14, 10, 10, 4);   // Ruines
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

  // noCollide=true → visuel uniquement (ex: linteaux de porte au-dessus de la tête)
  // maxY → hauteur max : le joueur peut sauter par-dessus si ses pieds dépassent maxY
  // minY → hauteur min : le mur n'est solide que si les pieds sont au-dessus de minY
  //        (murs d'étage / parapets ; sinon ils rebouchent la porte du rez en 2D)
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

  // Dalle percée d'une trémie rectangulaire (cage d'escalier) — émet jusqu'à 4 bandes.
  // hole = { cx, cz, hw, hd } en coordonnées monde.
  function _slabWithHole(scene, cx, cz, y, w, d, mat, hole) {
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const z0 = cz - d / 2, z1 = cz + d / 2;
    const hx0 = Math.max(x0, hole.cx - hole.hw), hx1 = Math.min(x1, hole.cx + hole.hw);
    const hz0 = Math.max(z0, hole.cz - hole.hd), hz1 = Math.min(z1, hole.cz + hole.hd);
    if (hz0 - z0 > 0.02) _slab(scene, cx, (z0 + hz0) / 2, y, w, hz0 - z0, mat);          // nord
    if (z1 - hz1 > 0.02) _slab(scene, cx, (hz1 + z1) / 2, y, w, z1 - hz1, mat);          // sud
    if (hx0 - x0 > 0.02) _slab(scene, (x0 + hx0) / 2, (hz0 + hz1) / 2, y, hx0 - x0, hz1 - hz0, mat); // ouest
    if (x1 - hx1 > 0.02) _slab(scene, (hx1 + x1) / 2, (hz0 + hz1) / 2, y, x1 - hx1, hz1 - hz0, mat); // est
  }

  function _box(scene, x, z, y, w, h, d, mat) {
    _mesh(scene, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  }

  // ── Single-storey house ───────────────────────────────────────────────────────
  function _house(scene, cx, cz, W, D, wallH, wallMat, roofMat, doorDir) {
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
    const doorW = 2.0, doorH = 2.4;
    const baseY = ZS.getTerrainHeight(cx, cz);

    // Staircase in NW interior corner, running along Z
    const sCX  = cx - W / 2 + T + 1.0; // x centre of stairs
    const sCZ  = cz - D / 2 + T + 1.6; // z centre of stairs
    const sHW  = 0.95;                  // x half-width
    const sHD  = 1.6;                   // z half-depth (3.2 m run)
    ZS.registerRamp(sCX, sCZ, sHW, sHD, baseY, baseY + floorH, 'z');
    // Upper floor covers interior, sauf la trémie d'escalier (pour pouvoir redescendre)
    ZS.registerUpperFloor(cx, cz, W / 2 - T - 0.05, D / 2 - T - 0.05, baseY + floorH,
                          { cx: sCX, cz: sCZ, hw: sHW, hd: sHD });

    // Ground floor slab
    _slab(scene, cx, cz, baseY, W, D, M.floor);

    // Ground floor walls
    _wall(scene, cx, cz - D / 2, baseY, W, T, floorH, M.concrete);          // N
    const g = doorW / 2, side = W / 2 - g;
    _wall(scene, cx - g - side / 2, cz + D / 2, baseY, side,  T, floorH, M.concrete); // S left
    _wall(scene, cx + g + side / 2, cz + D / 2, baseY, side,  T, floorH, M.concrete); // S right
    _wall(scene, cx, cz + D / 2, baseY + doorH, doorW, T, floorH - doorH, M.concrete, true); // S header
    _wall(scene, cx - W / 2, cz, baseY, T, D, floorH, M.concrete);           // W
    _wall(scene, cx + W / 2, cz, baseY, T, D, floorH, M.concrete);           // E

    // Inter-floor slab (visible ceiling/floor) — percée au-dessus de l'escalier
    _slabWithHole(scene, cx, cz, baseY + floorH, W - T, D - T, M.concDark,
                  { cx: sCX, cz: sCZ, hw: sHW, hd: sHD });

    // Visual staircase
    _visualStairs(scene, sCX, sCZ, baseY, baseY + floorH, 'z', sHW * 2 - 0.1, sHD);
    // Railing
    _box(scene, sCX - sHW + 0.04, sCZ, baseY + floorH * 0.5 + 0.3, 0.06, floorH + 0.6, sHD * 2, M.metal);

    // Second floor walls (full, no door). minY → solides seulement quand le joueur
    // est à l'étage, sinon leur collider reboucherait la porte du rez (collision 2D).
    const upMinY = baseY + floorH - 0.6;
    _wall(scene, cx, cz - D / 2, baseY + floorH, W, T, floorH, M.concrete, false, undefined, upMinY);
    _wall(scene, cx, cz + D / 2, baseY + floorH, W, T, floorH, M.concrete, false, undefined, upMinY);
    _wall(scene, cx - W / 2, cz, baseY + floorH, T, D, floorH, M.concrete, false, undefined, upMinY);
    _wall(scene, cx + W / 2, cz, baseY + floorH, T, D, floorH, M.concrete, false, undefined, upMinY);

    // Roof + parapet
    const roofY = baseY + floorH * 2;
    _slab(scene, cx, cz, roofY, W + 0.4, D + 0.4, M.roofGray);
    // Parapet : même problème, on ne le rend solide qu'au niveau du toit.
    const parapetMinY = roofY - 0.6;
    _wall(scene, cx, cz - D / 2 - 0.02, roofY, W + 0.44, T * 0.8, 0.5, M.concDark, false, undefined, parapetMinY);
    _wall(scene, cx, cz + D / 2 + 0.02, roofY, W + 0.44, T * 0.8, 0.5, M.concDark, false, undefined, parapetMinY);
    _wall(scene, cx - W / 2 - 0.02, cz, roofY, T * 0.8, D + 0.44, 0.5, M.concDark, false, undefined, parapetMinY);
    _wall(scene, cx + W / 2 + 0.02, cz, roofY, T * 0.8, D + 0.44, 0.5, M.concDark, false, undefined, parapetMinY);

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
    ZS.registerUpperFloor(cx, cz, W / 2 - T - 0.05, D / 2 - T - 0.05, baseY + floorH,
                          { cx: sCX, cz: sCZ, hw: 0.9, hd: 2.2 });

    // Ground floor (door west)
    _slab(scene, cx, cz, baseY, W, D, M.wood);
    const doorW = 2.0, doorH = 2.4, topH = floorH - doorH;
    // N / S walls
    _wall(scene, cx, cz - D / 2, baseY, W, T, floorH, M.wood);
    _wall(scene, cx, cz + D / 2, baseY, W, T, floorH, M.wood);
    // E wall (full)
    _wall(scene, cx + W / 2, cz, baseY, T, D, floorH, M.wood);
    // W wall with door
    const g = doorW / 2, sideD = D / 2 - g;
    _wall(scene, cx - W / 2, cz - g - sideD / 2, baseY, T, sideD, floorH, M.wood);
    _wall(scene, cx - W / 2, cz + g + sideD / 2, baseY, T, sideD, floorH, M.wood);
    if (topH > 0.05) _wall(scene, cx - W / 2, cz, baseY + doorH, T, doorW, topH, M.wood, true);

    // Inter-floor slab — percée au-dessus de l'escalier
    _slabWithHole(scene, cx, cz, baseY + floorH, W - T, D - T, M.floor,
                  { cx: sCX, cz: sCZ, hw: 0.9, hd: 2.2 });

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
    _buildImmeuble2F(scene, -47, -43);

    // Single-storey houses
    _house(scene, -63, -35, 5.5, 5.0, 2.8, M.brick,    M.roofRed,  'S');
    _house(scene, -63, -45, 6.0, 5.0, 3.0, M.wood,     M.roofDark, 'E');
    _house(scene, -61, -53, 5.0, 4.5, 2.7, M.concrete, M.roofGray, 'N');
    _house(scene, -69, -41, 3.2, 3.0, 2.2, M.wood2,    M.roofDark, 'E');

    // Village square — central dirt patch
    const sqY = ZS.getTerrainHeight(-55, -44);
    _slab(scene, -55, -44, sqY + 0.01, 5, 5, M.dirt);
    // Puits (solide)
    _box(scene, -55, -44, sqY + 0.55, 1.2, 1.1, 1.2, M.brick2);
    _colliders.push({ type: 'box', cx: -55, cz: -44, hw: 0.6, hd: 0.6 });
    _box(scene, -55, -44, sqY + 1.1,  1.4, 0.18, 1.4, M.wood2);
  }

  // ── Ferme nord-est ────────────────────────────────────────────────────────────
  function _buildFarm(scene) {
    // 2-storey farmhouse
    _buildFarmhouse2F(scene, 60, 47);

    // Grande grange
    _buildBarn(scene, 70, 42);

    // Petit poulailler
    _house(scene, 55, 55, 3.5, 3.0, 2.2, M.wood2, M.roofDark, 'S');

    // Puits (solide)
    const wy = ZS.getTerrainHeight(65, 50);
    _box(scene, 65, 50, wy + 0.6, 1.2, 1.2, 1.2, M.brick2);
    _colliders.push({ type: 'box', cx: 65, cz: 50, hw: 0.6, hd: 0.6 });
    _box(scene, 65, 50, wy + 1.2, 1.4, 0.18, 1.4, M.wood2);
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
    _wall(scene, cx, cz + D / 2, baseY + 3.0, doorW, T, wallH - 3.0, M.wood2, true);
    _wall(scene, cx - W / 2, cz, baseY, T, D, wallH, M.wood2);
    _wall(scene, cx + W / 2, cz, baseY, T, D, wallH, M.wood2);
    _slab(scene, cx, cz, baseY + wallH, W + 0.5, D + 0.5, M.roofDark);
    for (let i = -1; i <= 1; i++) {
      _box(scene, cx + i * W * 0.3, cz, baseY + wallH - 0.4, 0.15, 0.2, D, M.wood2);
    }
  }

  // ── Station service ───────────────────────────────────────────────────────────
  function _buildGasStation(scene) {
    const cx = 39, cz = -60;
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
    const canX = cx - W / 2 - 4.5;
    const canY = baseY + 3.8;
    _slab(scene, canX, cz, canY, 5.5, 7, M.metal);
    for (const pz of [cz - 2.8, cz + 2.8]) {
      _box(scene, canX - 2.2, pz, baseY + 1.9, 0.22, 3.8, 0.22, M.metal);
      _colliders.push({ x: canX - 2.2, z: pz, r: 0.16 });
      _box(scene, canX + 2.2, pz, baseY + 1.9, 0.22, 3.8, 0.22, M.metal);
      _colliders.push({ x: canX + 2.2, z: pz, r: 0.16 });
    }
    for (const pz of [cz - 1.6, cz + 1.6]) {
      _box(scene, canX, pz, baseY + 0.85, 0.55, 1.7, 0.38, M.rust);
      _colliders.push({ x: canX, z: pz, r: 0.32 }); // pompe à essence
      _box(scene, canX, pz, baseY + 0.55, 0.58, 0.1, 0.42, M.metal);
    }
    const apronY = ZS.getTerrainHeight(canX, cz);
    _slab(scene, canX, cz, apronY + 0.01, 6, 8, M.concDark);
  }

  // ── Avant-poste militaire ─────────────────────────────────────────────────────
  function _buildOutpost(scene) {
    const cx = -60, cz = 52;
    const W = 7.5, D = 5.5, wallH = 2.6;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.35, doorW = 2.0;

    _slab(scene, cx, cz, baseY, W, D, M.concDark);
    _wall(scene, cx, cz - D / 2, baseY, W, T, wallH, M.concDark);
    const g = doorW / 2, side = W / 2 - g;
    _wall(scene, cx - g - side / 2, cz + D / 2, baseY, side, T, wallH, M.concDark);
    _wall(scene, cx + g + side / 2, cz + D / 2, baseY, side, T, wallH, M.concDark);
    _wall(scene, cx, cz + D / 2, baseY + 2.0, doorW, T, wallH - 2.0, M.concDark, true);
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
      _colliders.push({ x: fx, z: fz, r: 0.12 }); // poteau solide
    }

    // Sacs de sable — flanquent l'entrée sur les côtés, ne bloquent pas la porte
    for (const sx of [cx - 2.8, cx + 2.8]) {
      const sz = cz + D / 2 + 0.6;
      const sy = ZS.getTerrainHeight(sx, sz);
      _box(scene, sx, sz, sy + 0.3, 1.6, 0.6, 0.6, M.dirt);
      _colliders.push({ type: 'box', cx: sx, cz: sz, hw: 0.8, hd: 0.3, maxY: sy + 0.6 });
    }
  }

  function _buildWatchtower(scene, cx, cz) {
    const baseY = ZS.getTerrainHeight(cx, cz);
    const h = 5.5, leg = 0.14;
    for (const [ox, oz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
      _box(scene, cx + ox, cz + oz, baseY + h / 2, leg, h, leg, M.metal);
      _colliders.push({ x: cx + ox, z: cz + oz, r: 0.12 });
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
    _house(scene, -26, 35, 5.5, 4.5, 2.9, M.wood, M.roofDark, 'E');
    const ty = ZS.getTerrainHeight(-22.5, 35);
    _slab(scene, -22.5, 35, ty + 0.01, 3.0, 4.0, M.wood2);
    _box(scene, -21,    35, ty + 0.6, 0.1, 1.2, 4.0, M.wood2);
    _box(scene, -22.5, 33, ty + 0.6, 3.0, 1.2, 0.1, M.wood2);
    _box(scene, -22.5, 37, ty + 0.6, 3.0, 1.2, 0.1, M.wood2);
  }

  // ── Ruines ────────────────────────────────────────────────────────────────────
  function _buildRuins(scene) {
    const cx = 44, cz = 14;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.22;

    _wall(scene, cx,       cz - 4, baseY, 8,  T,   2.8, M.brick2);                      // mur nord — non franchissable
    _wall(scene, cx - 4,   cz,     baseY, T,  8,   1.4, M.brick2);                      // mur ouest
    _wall(scene, cx + 4,   cz - 2, baseY, T,  4,   2.5, M.brick2);                      // fragment est haut
    _wall(scene, cx + 4,   cz + 3, baseY, T,  2,   0.9, M.brick2, false, baseY + 0.9);  // bas — franchissable en sautant
    _wall(scene, cx - 1.5, cz + 4, baseY, 5,  T,   0.7, M.brick2, false, baseY + 0.7);  // très bas — franchissable
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

  // ── Routes — géométrie ribbon collée au terrain ───────────────────────────────
  // Chaque vertex est positionné exactement à getTerrainHeight + 0.05 m.
  // Aucun segment flottant possible.
  function _ribbon(scene, pts, width, mat, withLine) {
    const STEP = 0.7; // densité d'échantillonnage en mètres
    const pos  = [];  // positions flat Float32 [x,y,z, x,y,z, ...]
    const idx  = [];
    let prevL  = -1;  // index du vertex gauche de la ligne précédente

    for (let si = 0; si < pts.length - 1; si++) {
      const [x0, z0] = pts[si];
      const [x1, z1] = pts[si + 1];
      const sdx = x1 - x0, sdz = z1 - z0;
      const sLen = Math.hypot(sdx, sdz);
      if (sLen < 0.01) continue;
      // Normale perpendiculaire à gauche du sens de marche
      const nx = -sdz / sLen, nz = sdx / sLen;
      const hw = width / 2;
      const steps = Math.max(1, Math.ceil(sLen / STEP));

      for (let i = (si === 0 ? 0 : 1); i <= steps; i++) {
        const t  = i / steps;
        const x  = x0 + sdx * t;
        const z  = z0 + sdz * t;
        const y  = ZS.getTerrainHeight(x, z) + 0.12;
        const li = pos.length / 3; // index gauche de cette ligne
        pos.push(x - nx * hw, y, z - nz * hw); // gauche
        pos.push(x + nx * hw, y, z + nz * hw); // droite

        if (prevL >= 0) {
          // Quad entre ligne précédente et ligne courante
          idx.push(prevL, li, prevL + 1,  prevL + 1, li, li + 1);
        }
        prevL = li;
      }
    }

    if (pos.length < 6) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo, mat));

    // Ligne centrale pointillée (ribbon étroit)
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
          const y = ZS.getTerrainHeight(x, z) + 0.16;
          const li = lPos.length / 3;
          lPos.push(x - nx * lW, y, z - nz * lW,
                    x + nx * lW, y, z + nz * lW);
          if (lprev >= 0 && dashToggle % 4 < 2) {
            lIdx.push(lprev, li, lprev+1,  lprev+1, li, li+1);
          }
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

  // Routes pavées — segments courts autour des zones bâties uniquement
  function _buildRoads(scene) {
    // Rue principale du Village Ashwood
    _ribbon(scene, [[-71,-34],[-63,-39],[-55,-44],[-48,-44]], 3.5, M.road, true);
    // Allée de la Ferme nord-est
    _ribbon(scene, [[56,55],[60,47],[70,42]], 2.8, M.road, false);
    // Parvis + accès de la Station service
    _ribbon(scene, [[27,-56],[39,-60],[46,-63]], 3.2, M.road, false);
    // Chemin d'accès à l'Avant-poste
    _ribbon(scene, [[-52,44],[-60,51],[-66,58]], 2.6, M.road, false);
  }

  // Chemins de terre — reliant les zones entre elles
  function _buildDirtPaths(scene) {
    // Zone de départ → Village Ashwood
    _ribbon(scene, [[0,0],[-18,-14],[-38,-28],[-52,-40]], 2.0, M.path, false);
    // Zone de départ → Station service
    _ribbon(scene, [[0,0],[16,-22],[28,-44],[34,-56]], 1.8, M.path, false);
    // Village → Cabane forestière
    _ribbon(scene, [[-55,-44],[-44,-18],[-32,8],[-26,35]], 1.8, M.path, false);
    // Cabane forestière → Avant-poste
    _ribbon(scene, [[-26,35],[-40,42],[-52,48],[-60,51]], 1.8, M.path, false);
    // Zone de départ → Ruines → Ferme
    _ribbon(scene, [[0,0],[20,6],[38,12],[44,14],[54,30],[63,47]], 1.6, M.path, false);
  }

  // ── Voitures abandonnées ──────────────────────────────────────────────────────
  function _buildAbandonedCars(scene) {
    const rustedMat = new THREE.MeshLambertMaterial({ color: 0x5a3015 });
    const darkMat   = new THREE.MeshLambertMaterial({ color: 0x181818 });
    const glassMat  = new THREE.MeshLambertMaterial({ color: 0x334444, transparent: true, opacity: 0.5 });

    function _car(cx, cz, rotY) {
      const cy = ZS.getTerrainHeight(cx, cz);
      const g  = new THREE.Group();

      const body = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.72, 4.1), rustedMat);
      body.position.y = 0.62; body.castShadow = true; body.receiveShadow = true;

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.62, 2.15), rustedMat);
      cabin.position.set(0, 1.25, -0.18); cabin.castShadow = true;

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.06), glassMat);
      windshield.position.set(0, 1.3, -1.2);

      for (const [ox, oz] of [[-0.97,-1.38],[0.97,-1.38],[-0.97,1.38],[0.97,1.38]]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 9), darkMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(ox, 0.37, oz);
        g.add(w);
      }

      g.add(body); g.add(cabin); g.add(windshield);
      g.position.set(cx, cy, cz);
      g.rotation.y = rotY;
      scene.add(g);
      _colliders.push({ type: 'box', cx, cz, hw: 1.0, hd: 2.2 });
    }

    _car(-60, -38,  0.55);   // rue principale Ashwood
    _car( 34, -57, -0.28);   // accès station service
    _car(-55,  47,  1.18);   // route avant-poste
    _car( 52,  33,  2.40);   // entre ruines et ferme
  }

  // ── Entry point ───────────────────────────────────────────────────────────────
  function buildAll(scene) {
    _buildDirtPaths(scene);
    _buildRoads(scene);
    _buildVillage(scene);
    _buildFarm(scene);
    _buildGasStation(scene);
    _buildOutpost(scene);
    _buildForestCabin(scene);
    _buildRuins(scene);
    _buildAbandonedCars(scene);
    return _colliders;
  }

  window.ZS = window.ZS || {};
  ZS.Buildings = { buildAll };
}());
