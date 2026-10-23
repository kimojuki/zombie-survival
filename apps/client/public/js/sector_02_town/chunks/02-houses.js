// Maisons + garages — extrait de sector_02_town.js (IIFE)
  // ── Maisons résidentielles + intérieurs ───────────────────────────────────────

  function _buildHouses(scene, B) {
    _buildPrefabHouse(scene, 'smallcity_house_a', -141, -22, 0, 11.0, 9.5);
    _buildPrefabHouse(scene, 'smallcity_house_b', -141,  23, Math.PI, 10.0, 10.5);

    const houses = [
      // [cx, cz, W, D, wallH, wallMat, roofMat, door]
      // Rangée nord (cz=-22, porte vers rue sud)
      [-163, -22, 9.0, 8.0, 3.1, B.M.wood,     B.M.roofDark, 'S'],
      [-192, -22, 9.0, 8.0, 3.0, B.M.concrete, B.M.roofGray, 'S'],
      [-212, -22, 9.0, 8.0, 3.0, B.M.brick2,   B.M.roofDark, 'S'],
      // Rangée sud (cz=+23, porte vers rue nord)
      [-163,  23, 9.0, 8.0, 3.0, B.M.brick,    B.M.roofDark, 'N'],
      [-192,  23, 9.0, 8.0, 2.8, B.M.wood2,    B.M.roofGray, 'N'],
      [-212,  23, 9.0, 8.0, 2.9, B.M.concrete, B.M.roofDark, 'N'],
    ];

    for (const [cx, cz, W, D, wH, wM, rM, door] of houses) {
      B.house(scene, cx, cz, W, D, wH, wM, rM, door);
      _furnishHouse(scene, B, cx, cz, ZS.getTerrainHeight(cx, cz), W, D, door);
    }

    _buildRuinedHouse(scene, B, -205, -32);
    _buildGarage(scene, B, -245, -6);
    // Deuxième rangée nord (derrière la principale)
    B.house(scene, -145, -33, 6.5, 6.0, 2.9, B.M.wood2,    B.M.roofDark, 'S');
    B.house(scene, -220, -28, 6.5, 6.0, 2.8, B.M.brick,    B.M.roofRed,  'S');
    // Deuxième rangée sud
    B.house(scene, -145,  33, 6.5, 6.0, 2.8, B.M.brick2,   B.M.roofGray, 'N');
    B.house(scene, -220,  27, 6.5, 6.0, 2.7, B.M.concrete, B.M.roofDark, 'N');
  }

  function _buildPrefabHouse(scene, prefabId, cx, cz, rotY, w, d) {
    ZS.registerLoot('maison', cx, cz, w, d);
    if (!ZS.spawnDecorPrefab) return;
    ZS.spawnDecorPrefab(scene, prefabId, cx, 0, cz, {
      decorId: `static_s02_${prefabId}_${Math.round(cx)}_${Math.round(cz)}`,
      rotY,
      scale: 1,
      doorOpen: true,
    });
  }

  function _furnishHouse(scene, B, cx, cz, baseY, W, D, doorDir) {
    const T   = 0.16;  // épaisseur cloison
    const pdW = 1.8;   // largeur porte de cloison (joueur passe confortablement)
    const wH  = 2.5;   // hauteur cloison
    const sDir = doorDir === 'S' ? 1 : -1; // +1 = salon côté sud, -1 = salon côté nord

    const salZ  = cz + sDir * D / 4;  // centre du salon
    const chamZ = cz - sDir * D / 4;  // centre de la chambre
    const sw    = (W - pdW) / 2;      // largeur de chaque segment de cloison

    // ── Cloison séparatrice salon / chambre ─────────────────────────────────
    B.wall(scene, cx - pdW/2 - sw/2, cz, baseY, sw,  T,    wH,  B.M.wood2);
    B.wall(scene, cx + pdW/2 + sw/2, cz, baseY, sw,  T,    wH,  B.M.wood2);
    B.box (scene, cx, cz, baseY + 2.25, pdW, 0.28, T, B.M.wood2); // linteau

    // ── Salon (côté porte) ───────────────────────────────────────────────────
    // Canapé : dos vers la cloison, face vers la porte
    _fSofa(scene, cx, salZ - sDir * 0.8, baseY, sDir > 0 ? Math.PI : 0);
    // Table + chaises dans la moitié salon
    _fTable(scene, B, cx - W * 0.1, salZ + sDir * 0.9, baseY);
    // Cuisine contre le mur est du salon
    _fCounter(scene, B, cx + W/2 - 0.7, salZ, baseY, 0.8, D * 0.28);

    // ── Chambre ──────────────────────────────────────────────────────────────
    _fBed     (scene, cx + W * 0.15,  chamZ,            baseY, 0);
    _fWardrobe(scene, B, cx - W * 0.25, chamZ + sDir * 0.4, baseY);

    // ── Colliders mobilier ───────────────────────────────────────────────────
    // Canapé (sautables : height ~0.6)
    B.addCollider({ type:'box', cx,            cz: salZ  - sDir*0.8, hw:1.1,  hd:0.5,  maxY: baseY + 0.6  });
    // Lit (sautables : height ~0.55)
    B.addCollider({ type:'box', cx: cx+W*0.15, cz: chamZ,            hw:0.9,  hd:1.2,  maxY: baseY + 0.55 });
    // Armoire (mur solide, pas de saut)
    B.addCollider({ type:'box', cx: cx-W*0.25, cz: chamZ+sDir*0.4,   hw:0.75, hd:0.3               });
    // Comptoir cuisine
    B.addCollider({ type:'box', cx: cx+W/2-0.7, cz: salZ,            hw:0.45, hd: D * 0.14          });
  }

  function _buildRuinedHouse(scene, B, cx, cz) {
    const baseY = ZS.getTerrainHeight(cx, cz);
    B.slab(scene, cx, cz, baseY, 5.5, 4.5, B.M.dirt);
    B.wall(scene, cx,       cz-2.25, baseY, 5.5, 0.22, 1.6, B.M.brick2);
    B.wall(scene, cx-2.75,  cz,      baseY, 0.22, 4.5, 2.6, B.M.brick2);
    B.wall(scene, cx+2.75,  cz-1.0,  baseY, 0.22, 2.5, 2.0, B.M.brick2);
    for (const [rx,rz,rw,rh,rd] of [
      [cx+1.5,cz+0.5,1.0,0.5,0.8],[cx-1.0,cz+1.5,0.8,0.4,0.6],[cx+0.5,cz-1.0,1.2,0.3,0.7],
    ]) B.box(scene, rx, rz, ZS.getTerrainHeight(rx,rz)+rh/2, rw, rh, rd, B.M.brick2);
  }

  function _buildGarage(scene, B, cx, cz) {
    const baseY = ZS.getTerrainHeight(cx, cz);
    const W = 7.0, D = 6.0, wallH = 3.2;
    ZS.registerLoot('garage', cx, cz, W, D);
    B.slab(scene, cx, cz, baseY, W, D, B.M.concDark);
    B.slab(scene, cx, cz, baseY+wallH, W+0.3, D+0.3, B.M.concDark);
    B.wall(scene, cx,     cz-D/2, baseY, W, 0.25, wallH, B.M.concrete);
    B.wall(scene, cx-W/2, cz,     baseY, 0.25, D, wallH, B.M.concrete);
    B.wall(scene, cx+W/2, cz,     baseY, 0.25, D, wallH, B.M.concrete);
    const doorW = 3.5, doorH = 2.8, sideW = (W-doorW)/2;
    B.wall(scene, cx-doorW/2-sideW/2, cz+D/2, baseY, sideW, 0.25, wallH, B.M.concrete);
    B.wall(scene, cx+doorW/2+sideW/2, cz+D/2, baseY, sideW, 0.25, wallH, B.M.concrete);
    B.wall(scene, cx, cz+D/2, baseY+doorH, doorW, 0.25, wallH-doorH, B.M.concrete, true);
    B.box(scene, cx, cz+D/2+0.01, baseY+doorH/2, doorW-0.1, doorH, 0.06, B.M.metal);

    _fCounter(scene, B, cx-W/2+1.0, cz-D/2+0.9, baseY, 0.9, 2.5);
    _fShelf(scene, B, cx+W/2-0.12, cz-0.5, baseY, 3.5, 'z');
    // Tonneaux de pétrole
    const oilMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    for (const [ox,oz] of [[cx-2.5, cz-2.0],[cx-2.5, cz-1.1]]) {
      const oy = ZS.getTerrainHeight(ox,oz);
      B.box(scene, ox, oz, oy+0.46, 0.55, 0.92, 0.55, oilMat);
    }
  }
