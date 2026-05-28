// Buildings — walkable structures: village, farmhouse, gas station, military outpost
(function () {
  'use strict';

  const _colliders = []; // { type:'box', cx, cz, hw, hd }

  // ── Materials ────────────────────────────────────────────────────────────────
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
  };

  // ── Low-level helpers ─────────────────────────────────────────────────────────

  function _mesh(scene, geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }

  // Solid wall with box collider (lenX × height × lenZ)
  function _wall(scene, x, z, baseY, lenX, lenZ, height, mat) {
    _mesh(scene, new THREE.BoxGeometry(lenX, height, lenZ), mat,
      x, baseY + height / 2, z);
    _colliders.push({ type: 'box', cx: x, cz: z, hw: lenX / 2, hd: lenZ / 2 });
  }

  // Thin slab (floor/ceiling/roof) — no collider, player uses terrain height
  function _slab(scene, x, z, y, w, d, mat) {
    _mesh(scene, new THREE.BoxGeometry(w, 0.14, d), mat, x, y + 0.07, z);
  }

  // Purely visual box (no collider)
  function _box(scene, x, z, y, w, h, d, mat) {
    _mesh(scene, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  }

  // ── House builder ─────────────────────────────────────────────────────────────
  // doorDir: 'N'|'S'|'E'|'W' — which side has the door opening
  function _house(scene, cx, cz, W, D, wallH, wallMat, roofMat, doorDir) {
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T     = 0.22;
    const doorW = 1.4;
    const doorH = Math.min(2.2, wallH - 0.15);
    const sideH = wallH - doorH; // header height

    // Floor
    _slab(scene, cx, cz, baseY, W, D, M.floor);

    // Wall along X axis (north or south face), optional door gap
    function xWall(z, withDoor) {
      if (!withDoor) {
        _wall(scene, cx, z, baseY, W, T, wallH, wallMat);
      } else {
        const gap  = doorW / 2;
        const side = W / 2 - gap;
        if (side > 0.05) {
          _wall(scene, cx - gap - side / 2, z, baseY, side, T, wallH, wallMat);
          _wall(scene, cx + gap + side / 2, z, baseY, side, T, wallH, wallMat);
        }
        if (sideH > 0.05) _wall(scene, cx, z, baseY + doorH, doorW, T, sideH, wallMat);
      }
    }

    // Wall along Z axis (east or west face), optional door gap
    function zWall(x, withDoor) {
      if (!withDoor) {
        _wall(scene, x, cz, baseY, T, D, wallH, wallMat);
      } else {
        const gap  = doorW / 2;
        const side = D / 2 - gap;
        if (side > 0.05) {
          _wall(scene, x, cz - gap - side / 2, baseY, T, side, wallH, wallMat);
          _wall(scene, x, cz + gap + side / 2, baseY, T, side, wallH, wallMat);
        }
        if (sideH > 0.05) _wall(scene, x, cz, baseY + doorH, T, doorW, sideH, wallMat);
      }
    }

    xWall(cz - D / 2, doorDir === 'N');
    xWall(cz + D / 2, doorDir === 'S');
    zWall(cx - W / 2, doorDir === 'W');
    zWall(cx + W / 2, doorDir === 'E');

    // Roof overhang
    _slab(scene, cx, cz, baseY + wallH, W + 0.35, D + 0.35, roofMat);

    // Windows (decorative, no collision)
    const winY = baseY + wallH * 0.52;
    if (doorDir !== 'N') _box(scene, cx,         cz - D / 2 - 0.01, winY, W * 0.33, 0.7, 0.07, M.window);
    if (doorDir !== 'S') _box(scene, cx,         cz + D / 2 + 0.01, winY, W * 0.33, 0.7, 0.07, M.window);
    if (doorDir !== 'W') _box(scene, cx - W / 2 - 0.01, cz,         winY, 0.07, 0.7, D * 0.28, M.window);
    if (doorDir !== 'E') _box(scene, cx + W / 2 + 0.01, cz,         winY, 0.07, 0.7, D * 0.28, M.window);
  }

  // ── Village "Ashwood" ─── SW quadrant (~-28, -22) ─────────────────────────────

  function _buildVillage(scene) {
    // Rue principale (bande de terre)
    const roadY = ZS.getTerrainHeight(-30, -22);
    _slab(scene, -30, -22, roadY + 0.01, 4, 24, M.dirt);

    // House A — petite maison en brique, porte au sud
    _house(scene, -38, -16, 5.5, 5.0, 2.8, M.brick, M.roofRed, 'S');

    // House B — maison en bois, porte à l'est (vers la rue)
    _house(scene, -38, -26, 6.0, 5.0, 3.0, M.wood,  M.roofDark, 'E');

    // House C — chalet en béton, porte au nord
    _house(scene, -36, -34, 5.0, 4.5, 2.7, M.concrete, M.roofGray, 'N');

    // Immeuble 2 façades
    _buildImmeuble(scene, -22, -24);

    // Petit cabanon à l'ouest du village
    _house(scene, -44, -22, 3.2, 3.0, 2.2, M.wood2, M.roofDark, 'E');
  }

  // Immeuble — aspect 2 étages visuels, 1 étage accessible, grande porte
  function _buildImmeuble(scene, cx, cz) {
    const W = 9, D = 6.5, wallH = 5.2;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T     = 0.28;
    const doorW = 1.8;
    const doorH = 2.4;

    _slab(scene, cx, cz, baseY, W, D, M.floor);

    // Mur nord (plein)
    _wall(scene, cx, cz - D / 2, baseY, W, T, wallH, M.concrete);

    // Mur sud avec porte
    const gap  = doorW / 2;
    const side = W / 2 - gap;
    _wall(scene, cx - gap - side / 2, cz + D / 2, baseY, side, T, wallH, M.concrete);
    _wall(scene, cx + gap + side / 2, cz + D / 2, baseY, side, T, wallH, M.concrete);
    _wall(scene, cx, cz + D / 2, baseY + doorH, doorW, T, wallH - doorH, M.concrete);

    // Murs latéraux
    _wall(scene, cx - W / 2, cz, baseY, T, D, wallH, M.concrete);
    _wall(scene, cx + W / 2, cz, baseY, T, D, wallH, M.concrete);

    // Plancher intermédiaire visuel (plafond du RDC)
    _slab(scene, cx, cz, baseY + wallH * 0.47, W - 0.1, D - 0.1, M.concDark);

    // Toit
    _slab(scene, cx, cz, baseY + wallH, W + 0.4, D + 0.4, M.roofGray);
    // Rebord de toit
    _wall(scene, cx, cz - D / 2 - 0.02, baseY + wallH, W + 0.44, T * 0.8, 0.45, M.concDark);
    _wall(scene, cx, cz + D / 2 + 0.02, baseY + wallH, W + 0.44, T * 0.8, 0.45, M.concDark);
    _wall(scene, cx - W / 2 - 0.02, cz, baseY + wallH, T * 0.8, D + 0.44, 0.45, M.concDark);
    _wall(scene, cx + W / 2 + 0.02, cz, baseY + wallH, T * 0.8, D + 0.44, 0.45, M.concDark);

    // Fenêtres RDC (2 par côté)
    const winY1 = baseY + 1.3;
    const winY2 = baseY + wallH * 0.47 + 1.2;
    for (const side of [-1, 1]) {
      // façade nord
      _box(scene, cx + side * W * 0.27, cz - D / 2 - 0.02, winY1, 1.1, 0.9, 0.07, M.window);
      _box(scene, cx + side * W * 0.27, cz - D / 2 - 0.02, winY2, 1.1, 0.8, 0.07, M.window);
      // façade sud (à côté de la porte)
      _box(scene, cx + side * (gap + side * 0.8 + 0.35), cz + D / 2 + 0.02, winY1, 0.9, 0.8, 0.07, M.window);
    }
    // Côtés
    _box(scene, cx - W / 2 - 0.02, cz, winY1, 0.07, 0.9, D * 0.3, M.window);
    _box(scene, cx + W / 2 + 0.02, cz, winY1, 0.07, 0.9, D * 0.3, M.window);
    _box(scene, cx - W / 2 - 0.02, cz, winY2, 0.07, 0.8, D * 0.3, M.window);
    _box(scene, cx + W / 2 + 0.02, cz, winY2, 0.07, 0.8, D * 0.3, M.window);
  }

  // ── Ferme isolée ─── NE quadrant (~35, 28) ────────────────────────────────────

  function _buildFarm(scene) {
    // Maison principale
    _house(scene, 33, 27, 7.0, 5.5, 3.1, M.wood, M.roofRed, 'W');

    // Grande grange
    _buildBarn(scene, 42, 22);

    // Petit poulailler
    _house(scene, 28, 35, 3.5, 3.0, 2.2, M.wood2, M.roofDark, 'S');

    // Puits (décoratif)
    const wy = ZS.getTerrainHeight(37, 30);
    _box(scene, 37, 30, wy + 0.6, 1.2, 1.2, 1.2, M.brick2);
    _box(scene, 37, 30, wy + 1.2, 1.4, 0.18, 1.4, M.wood2);
  }

  function _buildBarn(scene, cx, cz) {
    const W = 10, D = 6.5, wallH = 4.2;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T     = 0.28;
    const doorW = 2.6; // grande porte de grange

    _slab(scene, cx, cz, baseY, W, D, M.dirt);

    // Mur nord
    _wall(scene, cx, cz - D / 2, baseY, W, T, wallH, M.wood2);
    // Mur sud avec grande porte
    const gap  = doorW / 2;
    const side = W / 2 - gap;
    _wall(scene, cx - gap - side / 2, cz + D / 2, baseY, side, T, wallH, M.wood2);
    _wall(scene, cx + gap + side / 2, cz + D / 2, baseY, side, T, wallH, M.wood2);
    _wall(scene, cx, cz + D / 2, baseY + 3.0, doorW, T, wallH - 3.0, M.wood2);
    // Côtés
    _wall(scene, cx - W / 2, cz, baseY, T, D, wallH, M.wood2);
    _wall(scene, cx + W / 2, cz, baseY, T, D, wallH, M.wood2);
    // Toit
    _slab(scene, cx, cz, baseY + wallH, W + 0.5, D + 0.5, M.roofDark);

    // Poutres de toit (visuel)
    for (let i = -1; i <= 1; i++) {
      _box(scene, cx + i * W * 0.3, cz, baseY + wallH - 0.4, 0.15, 0.2, D, M.wood2);
    }
  }

  // ── Station service abandonnée ─── SE quadrant (~24, -34) ────────────────────

  function _buildGasStation(scene) {
    const cx = 24, cz = -34;
    const W = 8, D = 6, wallH = 3.3;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T     = 0.22;
    const doorW = 1.5;

    _slab(scene, cx, cz, baseY, W, D, M.floor);

    // Mur nord
    _wall(scene, cx, cz - D / 2, baseY, W, T, wallH, M.concrete);
    // Mur sud
    _wall(scene, cx, cz + D / 2, baseY, W, T, wallH, M.concrete);
    // Mur est (plein)
    _wall(scene, cx + W / 2, cz, baseY, T, D, wallH, M.concrete);
    // Mur ouest — porte
    const gap  = doorW / 2;
    const side = D / 2 - gap;
    _wall(scene, cx - W / 2, cz - gap - side / 2, baseY, T, side, wallH, M.concrete);
    _wall(scene, cx - W / 2, cz + gap + side / 2, baseY, T, side, wallH, M.concrete);
    _wall(scene, cx - W / 2, cz, baseY + 2.2, T, doorW, wallH - 2.2, M.concrete);
    // Toit
    _slab(scene, cx, cz, baseY + wallH, W + 0.3, D + 0.3, M.roofGray);

    // Fenêtres cassées (vitrines)
    _box(scene, cx,         cz - D / 2 - 0.02, baseY + 1.4, 2.2, 1.0, 0.07, M.window);
    _box(scene, cx,         cz + D / 2 + 0.02, baseY + 1.4, 2.2, 1.0, 0.07, M.window);

    // Auvent sur les pompes (à l'ouest)
    const canX  = cx - W / 2 - 4.5;
    const canY  = baseY + 3.8;
    _slab(scene, canX, cz, canY, 5.5, 7, M.metal);
    // 4 piliers (visuels, trop fins pour collision)
    for (const pz of [cz - 2.8, cz + 2.8]) {
      _box(scene, canX - 2.2, pz, baseY + 1.9, 0.22, 3.8, 0.22, M.metal);
      _box(scene, canX + 2.2, pz, baseY + 1.9, 0.22, 3.8, 0.22, M.metal);
    }

    // Pompes à essence
    for (const pz of [cz - 1.6, cz + 1.6]) {
      _box(scene, canX, pz, baseY + 0.85, 0.55, 1.7, 0.38, M.rust);
      _box(scene, canX, pz, baseY + 0.55, 0.58, 0.1, 0.42, M.metal);
    }

    // Zone béton devant la station
    const apronY = ZS.getTerrainHeight(canX, cz);
    _slab(scene, canX, cz, apronY + 0.01, 6, 8, M.concDark);
  }

  // ── Avant-poste militaire ─── NW quadrant (~-34, 30) ─────────────────────────

  function _buildOutpost(scene) {
    const cx = -34, cz = 30;

    // Bunker principal — béton épais, faible hauteur
    const W = 7.5, D = 5.5, wallH = 2.6;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T     = 0.35;
    const doorW = 1.4;

    _slab(scene, cx, cz, baseY, W, D, M.concDark);

    // Mur nord (plein)
    _wall(scene, cx, cz - D / 2, baseY, W, T, wallH, M.concDark);
    // Mur sud avec porte
    const gap  = doorW / 2;
    const side = W / 2 - gap;
    _wall(scene, cx - gap - side / 2, cz + D / 2, baseY, side, T, wallH, M.concDark);
    _wall(scene, cx + gap + side / 2, cz + D / 2, baseY, side, T, wallH, M.concDark);
    _wall(scene, cx, cz + D / 2, baseY + 2.0, doorW, T, wallH - 2.0, M.concDark);
    // Côtés
    _wall(scene, cx - W / 2, cz, baseY, T, D, wallH, M.concDark);
    _wall(scene, cx + W / 2, cz, baseY, T, D, wallH, M.concDark);
    // Toit épais
    _slab(scene, cx, cz, baseY + wallH, W + 0.5, D + 0.5, M.concDark);

    // Meurtrières (fenêtres basses et étroites)
    _box(scene, cx,         cz - D / 2 - 0.02, baseY + 1.2, 0.9, 0.35, 0.07, M.window);
    _box(scene, cx - W * 0.3, cz + D / 2 + 0.02, baseY + 1.2, 0.6, 0.35, 0.07, M.window);
    _box(scene, cx + W * 0.3, cz + D / 2 + 0.02, baseY + 1.2, 0.6, 0.35, 0.07, M.window);

    // Tour de guet
    _buildWatchtower(scene, cx + 9, cz - 4);

    // Deuxième petite guérite
    _house(scene, cx - 8, cz + 4, 3.0, 3.0, 2.4, M.concDark, M.metal, 'S');

    // Barbelés / palissade (poteaux visuels)
    const fenceR = [
      [cx + 5, cz - 7], [cx, cz - 8], [cx - 5, cz - 7],
      [cx - 8, cz], [cx - 7, cz + 6],
      [cx + 8, cz], [cx + 7, cz + 6],
    ];
    for (const [fx, fz] of fenceR) {
      const fy = ZS.getTerrainHeight(fx, fz);
      _box(scene, fx, fz, fy + 1.1, 0.14, 2.2, 0.14, M.metal);
      _box(scene, fx, fz, fy + 2.1, 0.6, 0.06, 0.06, M.metal);
    }

    // Sacs de sable empilés devant l'entrée (colliders circulaires dans _colliders)
    for (let i = -1; i <= 1; i++) {
      const sx = cx + i * 1.4, sz = cz + D / 2 + 1.2;
      const sy = ZS.getTerrainHeight(sx, sz);
      _box(scene, sx, sz, sy + 0.3, 0.8, 0.6, 0.6, M.dirt);
      _colliders.push({ type: 'box', cx: sx, cz: sz, hw: 0.4, hd: 0.3 });
    }
  }

  function _buildWatchtower(scene, cx, cz) {
    const baseY = ZS.getTerrainHeight(cx, cz);
    const h      = 5.5;
    const legS   = 0.14;

    // 4 montants
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      _box(scene, cx + ox, cz + oz, baseY + h / 2, legS, h, legS, M.metal);
    }

    // Plancher de la tour
    _box(scene, cx, cz, baseY + h, 2.4, 0.18, 2.4, M.wood2);

    // Garde-corps (4 côtés)
    _box(scene, cx,  cz - 1.2, baseY + h + 0.4, 2.4, 0.6, legS, M.metal);
    _box(scene, cx,  cz + 1.2, baseY + h + 0.4, 2.4, 0.6, legS, M.metal);
    _box(scene, cx - 1.2, cz,  baseY + h + 0.4, legS, 0.6, 2.4, M.metal);
    _box(scene, cx + 1.2, cz,  baseY + h + 0.4, legS, 0.6, 2.4, M.metal);

    // Toit incliné (2 pans)
    _box(scene, cx, cz - 0.6, baseY + h + 1.3, 2.6, 0.1, 1.6, M.roofDark);
    _box(scene, cx, cz + 0.6, baseY + h + 1.3, 2.6, 0.1, 1.6, M.roofDark);
  }

  // ── Maison forestière isolée ─── centre-ouest (~-15, 18) ─────────────────────

  function _buildForestCabin(scene) {
    _house(scene, -15, 20, 5.5, 4.5, 2.9, M.wood, M.roofDark, 'E');

    // Terrasse en bois
    const ty = ZS.getTerrainHeight(-11.5, 20);
    _slab(scene, -11.5, 20, ty + 0.01, 3.0, 4.0, M.wood2);
    // Rambarde terrasse
    _box(scene, -10, 20, ty + 0.6, 0.1, 1.2, 4.0, M.wood2);
    _box(scene, -11.5, 18, ty + 0.6, 3.0, 1.2, 0.1, M.wood2);
    _box(scene, -11.5, 22, ty + 0.6, 3.0, 1.2, 0.1, M.wood2);
  }

  // ── Ruines ─── centre-est (~25, 8) ───────────────────────────────────────────

  function _buildRuins(scene) {
    const cx = 25, cz = 8;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const T = 0.22;

    // Murs partiellement effondrés — hauteurs irrégulières
    _wall(scene, cx,           cz - 4, baseY, 8, T, 2.8, M.brick2); // mur nord presque intact
    _wall(scene, cx - 4,       cz,     baseY, T, 8, 1.4, M.brick2); // mur ouest à moitié
    _wall(scene, cx + 4,       cz - 2, baseY, T, 4, 2.5, M.brick2); // fragment est nord
    _wall(scene, cx + 4,       cz + 3, baseY, T, 2, 0.9, M.brick2); // fragment est bas
    _wall(scene, cx - 1.5,    cz + 4, baseY, 5, T, 0.7, M.brick2); // fragment sud

    // Sol avec herbe envahissante (dalle de couleur différente)
    _slab(scene, cx, cz, baseY + 0.01, 8, 8, M.dirt);

    // Décombres (blocs visuels)
    for (const [rx, rz, rw, rh, rd] of [
      [cx + 2, cz + 1,  0.9, 0.7, 0.8],
      [cx - 2, cz + 2,  1.2, 0.5, 0.6],
      [cx + 3, cz - 1,  0.7, 0.9, 0.7],
    ]) {
      const ry = ZS.getTerrainHeight(rx, rz);
      _box(scene, rx, rz, ry + rh / 2, rw, rh, rd, M.brick2);
    }
  }

  // ── Entry point ───────────────────────────────────────────────────────────────

  function buildAll(scene) {
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
