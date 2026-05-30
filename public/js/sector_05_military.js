// SECTOR 05 — MILITARY ZONE
// Base fortifiée : clôture périmétrique, portail unique, bunker, hangar, véhicules.
(function () {
  'use strict';

  // ── Constantes périmètre ──────────────────────────────────────────────────────
  const CX = -200, CZ = -160;
  const HW = 75,   HD = 80;
  const X0 = CX - HW, X1 = CX + HW;  // -275 … -125
  const Z0 = CZ - HD, Z1 = CZ + HD;  // -240 … -80
  const GATE_W = 14;                  // portail unique (côté sud)
  const GATE_L = CX - GATE_W / 2;    // x=-207
  const GATE_R = CX + GATE_W / 2;    // x=-193

  ZS.registerFlatZone(CX, CZ, 80, 85, 12);

  // ── Build ─────────────────────────────────────────────────────────────────────

  function build(scene) {
    const B = ZS.B;
    _buildGround(scene, B);
    _buildAccessRoad(scene, B);
    _buildPerimeterFence(scene, B);
    _buildMainEntrance(scene, B);
    _buildGuardTowers(scene, B);
    _buildInternalRoads(scene, B);
    _buildCommandCenter(scene, B);
    _buildBarracks(scene, B);
    _buildHangar(scene, B);
    _buildHelipad(scene, B);
    _buildBunker(scene, B);
    _buildDepot(scene, B);
    _buildVehicles(scene, B);
    _buildProps(scene, B);
    _buildLights(scene, B);
  }

  // ── Sol intérieur ─────────────────────────────────────────────────────────────

  function _buildGround(scene, B) {
    const y = ZS.getTerrainHeight(CX, CZ);
    const gndMat = new THREE.MeshLambertMaterial({ color: 0x6a5a40 });
    B.slab(scene, CX, CZ, y + 0.02, HW * 2, HD * 2, gndMat);
  }

  // ── Route d'accès (ville → portail) ──────────────────────────────────────────

  function _buildAccessRoad(scene, B) {
    B.ribbon(scene, [
      [-177, -5], [-185, -18], [-194, -36],
      [-198, -55], [-200, -72], [-200, -80]
    ], 6.0, B.M.roadDirt, false);
  }

  // ── Clôture périmétrique ──────────────────────────────────────────────────────

  function _buildPerimeterFence(scene, B) {
    const y      = ZS.getTerrainHeight(CX, CZ);
    const FH     = 3.4;   // hauteur clôture
    const wireMat = new THREE.MeshLambertMaterial({ color: 0x484848 });
    const postMat = new THREE.MeshLambertMaterial({ color: 0x282828 });
    const barbMat = new THREE.MeshLambertMaterial({ color: 0x7a5830 });

    // ── Murs (colliders inclus) ───────────────────────────────────────────────
    // Nord
    B.wall(scene, CX,           Z0, y, HW * 2,           0.22, FH, wireMat);
    // Ouest
    B.wall(scene, X0,           CZ, y, 0.22,              HD * 2, FH, wireMat);
    // Est
    B.wall(scene, X1,           CZ, y, 0.22,              HD * 2, FH, wireMat);
    // Sud gauche (X0 → GATE_L)
    const sideW = HW - GATE_W / 2;  // 68 m
    B.wall(scene, X0 + sideW / 2,   Z1, y, sideW, 0.22, FH, wireMat);
    // Sud droit  (GATE_R → X1)
    B.wall(scene, X1 - sideW / 2,   Z1, y, sideW, 0.22, FH, wireMat);

    // ── Poteaux décoratifs ────────────────────────────────────────────────────
    const POST = 5; // espacement
    function posts(x0, z0, x1, z1) {
      const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
      const n = Math.ceil(len / POST);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        B.box(scene, x0 + dx * t, z0 + dz * t, y + FH / 2, 0.18, FH, 0.18, postMat);
      }
    }
    posts(X0, Z0, X1, Z0);           // nord
    posts(X0, Z0, X0, Z1);           // ouest
    posts(X1, Z0, X1, Z1);           // est
    posts(X0, Z1, GATE_L, Z1);       // sud gauche
    posts(GATE_R, Z1, X1, Z1);       // sud droit

    // ── Barbelés au sommet ────────────────────────────────────────────────────
    const bT = FH + 0.2;
    B.box(scene, CX,            Z0, y + bT, HW * 2 + 0.3, 0.14, 0.36, barbMat);
    B.box(scene, X0,            CZ, y + bT, 0.36, 0.14, HD * 2 + 0.3, barbMat);
    B.box(scene, X1,            CZ, y + bT, 0.36, 0.14, HD * 2 + 0.3, barbMat);
    B.box(scene, X0 + sideW / 2, Z1, y + bT, sideW, 0.14, 0.36, barbMat);
    B.box(scene, X1 - sideW / 2, Z1, y + bT, sideW, 0.14, 0.36, barbMat);
  }

  // ── Entrée principale ─────────────────────────────────────────────────────────

  function _buildMainEntrance(scene, B) {
    const y       = ZS.getTerrainHeight(CX, Z1);
    const concMat = new THREE.MeshLambertMaterial({ color: 0x8a8070 });
    const metMat  = new THREE.MeshLambertMaterial({ color: 0x2a3a2a });
    const signMat = new THREE.MeshLambertMaterial({ color: 0x182818 });
    const redMat  = new THREE.MeshLambertMaterial({ color: 0xaa2222 });

    // Piliers de portail (béton épais, 5m de haut)
    for (const px of [GATE_L - 0.5, GATE_R + 0.5]) {
      B.wall(scene, px, Z1, y, 1.0, 1.0, 5.0, concMat);
      // Signalétique sur les piliers
      B.box(scene, px, Z1 - 0.52, y + 3.8, 0.94, 0.8, 0.06, signMat);
    }
    // Portique supérieur reliant les deux piliers
    B.box(scene, CX, Z1, y + 4.8, GATE_W + 2.2, 0.35, 0.9, metMat);
    B.box(scene, CX, Z1, y + 4.4, GATE_W + 0.1, 0.18, 0.18, metMat);

    // Barrière (bras horizontal bloquant l'accès)
    B.box(scene, CX + 3.0, Z1 + 1.5, y + 1.15, GATE_W * 0.6, 0.12, 0.12, redMat);
    // Poteau de barrière
    B.wall(scene, CX - 3.5, Z1 + 1.5, y, 0.22, 0.22, 1.2, concMat);

    // Guérite garde-corps (côté est du portail)
    const gx = GATE_R + 3.5, gz = Z1 + 2.5;
    const gy = ZS.getTerrainHeight(gx, gz);
    B.wall(scene, gx,     gz - 1.5, gy, 3.0, 0.22, 3.0, concMat);
    B.wall(scene, gx,     gz + 1.5, gy, 3.0, 0.22, 3.0, concMat);
    B.wall(scene, gx - 1.5, gz,   gy, 0.22, 3.0, 3.0, concMat);
    B.wall(scene, gx + 1.5, gz,   gy, 0.22, 3.0, 3.0, concMat, true); // ouverture côté route
    B.slab(scene, gx, gz, gy + 3.0, 3.2, 3.2, concMat);
    // Fenêtre de guérite
    B.box(scene, gx - 1.52, gz, gy + 1.6, 0.06, 0.8, 1.6,
      new THREE.MeshLambertMaterial({ color: 0x4a7888, transparent: true, opacity: 0.55 }));

    // Projecteur sur portique
    const spotMat = new THREE.MeshLambertMaterial({ color: 0xffffcc, emissive: 0xffeeaa, emissiveIntensity: 2.0 });
    B.box(scene, CX, Z1, y + 5.05, 0.55, 0.28, 0.7, spotMat);
    const spot = new THREE.PointLight(0xffeecc, 5.0, 35);
    spot.position.set(CX, y + 4.7, Z1 - 1.5);
    scene.add(spot);
  }

  // ── Tours de garde (4 coins) ──────────────────────────────────────────────────

  function _buildGuardTowers(scene, B) {
    const positions = [
      [X0 + 2, Z0 + 2], [X1 - 2, Z0 + 2],
      [X0 + 2, Z1 - 2], [X1 - 2, Z1 - 2],
    ];
    const legMat  = new THREE.MeshLambertMaterial({ color: 0x303830 });
    const platMat = new THREE.MeshLambertMaterial({ color: 0x3a3a32 });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x222820 });
    const lightMat = new THREE.MeshLambertMaterial({ color: 0xffffcc, emissive: 0xffee88, emissiveIntensity: 2.5 });

    for (const [tx, tz] of positions) {
      const ty = ZS.getTerrainHeight(tx, tz);
      const H  = 6.0;
      // 4 poteaux
      for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        B.box(scene, tx + ox, tz + oz, ty + H / 2, 0.16, H, 0.16, legMat);
        B.addCollider({ x: tx + ox, z: tz + oz, r: 0.12 });
      }
      // Plateforme
      B.box(scene, tx, tz, ty + H, 2.6, 0.22, 2.6, platMat);
      // Garde-fous
      for (const [gox, goz, gw, gd] of [
        [0, -1.3, 2.6, 0.08], [0, 1.3, 2.6, 0.08],
        [-1.3, 0, 0.08, 2.6], [1.3, 0, 0.08, 2.6],
      ]) B.box(scene, tx + gox, tz + goz, ty + H + 0.55, gw, 0.9, gd, legMat);
      // Toit
      B.box(scene, tx, tz, ty + H + 1.5, 2.8, 0.16, 2.8, roofMat);
      // Projecteur
      B.box(scene, tx, tz, ty + H + 0.5, 0.38, 0.22, 0.5, lightMat);
      const pt = new THREE.PointLight(0xffeedd, 3.5, 40);
      pt.position.set(tx, ty + H + 0.4, tz);
      scene.add(pt);
    }
  }

  // ── Routes internes ───────────────────────────────────────────────────────────

  function _buildInternalRoads(scene, B) {
    const concMat = new THREE.MeshLambertMaterial({
      color: 0x5a5248, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3
    });
    // Axe principal N-S
    B.ribbon(scene, [[CX, Z1], [CX, Z1 - 30], [CX, CZ], [CX, Z0 + 5]], 7.0, concMat, false);
    // Axe E-O centre
    B.ribbon(scene, [[X0 + 5, CZ], [CX - 20, CZ], [CX + 20, CZ], [X1 - 5, CZ]], 5.5, concMat, false);
    // Axe vers commandement (nord-est)
    B.ribbon(scene, [[CX, CZ - 30], [-165, CZ - 30], [-148, Z0 + 22]], 5.0, concMat, false);
    // Axe vers dépôt (nord-ouest)
    B.ribbon(scene, [[CX, CZ - 30], [-230, CZ - 30], [-250, Z0 + 22]], 5.0, concMat, false);
  }

  // ── Centre de commandement ────────────────────────────────────────────────────

  function _buildCommandCenter(scene, B) {
    const cx = -148, cz = -220;
    const W = 14, D = 10, wH = 4.2;
    const y    = ZS.getTerrainHeight(cx, cz);
    const cMat = new THREE.MeshLambertMaterial({ color: 0x6a7060 });
    const wMat = new THREE.MeshLambertMaterial({ color: 0x4a6060, transparent: true, opacity: 0.55 });
    const mMat = new THREE.MeshLambertMaterial({ color: 0x303828 });

    B.slab(scene, cx, cz, y, W + 1, D + 1, B.M.concDark);
    B.wall(scene, cx, cz - D / 2, y, W, 0.28, wH, cMat);
    B.wall(scene, cx, cz + D / 2, y, W, 0.28, wH, cMat);
    B.wall(scene, cx - W / 2, cz, y, 0.28, D, wH, cMat);
    B.wall(scene, cx + W / 2, cz, y, 0.28, D, wH, cMat);
    B.slab(scene, cx, cz, y + wH, W + 0.4, D + 0.4, mMat);
    // Fenêtres
    B.box(scene, cx - 3, cz - D / 2 - 0.01, y + 1.8, 2.2, 1.2, 0.06, wMat);
    B.box(scene, cx + 3, cz - D / 2 - 0.01, y + 1.8, 2.2, 1.2, 0.06, wMat);
    B.box(scene, cx, cz + D / 2 + 0.01, y + 1.8, 3.0, 1.2, 0.06, wMat);
    // Antenne radio
    const antMat = new THREE.MeshLambertMaterial({ color: 0x505050 });
    B.box(scene, cx + 4, cz - 2, y + wH + 2.5, 0.08, 5.0, 0.08, antMat);
    B.box(scene, cx + 4, cz - 2, y + wH + 1.2, 0.8, 0.08, 0.08, antMat);
    B.box(scene, cx + 4, cz - 2, y + wH + 2.0, 0.6, 0.08, 0.08, antMat);
    // Mât drapeau
    B.box(scene, cx - 5, cz + D / 2 + 1, y + 4.0, 0.1, 8.0, 0.1, antMat);
    const flagMat = new THREE.MeshLambertMaterial({ color: 0x3a6a3a, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.2), flagMat);
    flag.position.set(cx - 4, y + 7.8, cz + D / 2 + 1);
    flag.rotation.y = 0.2;
    scene.add(flag);
  }

  // ── Baraquements (2 bâtiments) ────────────────────────────────────────────────

  function _buildBarracks(scene, B) {
    for (const bz of [-135, -190]) {
      const cx = -252, cz = bz;
      const W = 16, D = 7, wH = 3.2;
      const y    = ZS.getTerrainHeight(cx, cz);
      const bMat = new THREE.MeshLambertMaterial({ color: 0x5a6040 });
      const wMat = new THREE.MeshLambertMaterial({ color: 0x4a7060, transparent: true, opacity: 0.5 });

      B.slab(scene, cx, cz, y, W + 0.5, D + 0.5, B.M.concDark);
      B.wall(scene, cx,     cz - D / 2, y, W, 0.22, wH, bMat);
      B.wall(scene, cx,     cz + D / 2, y, W, 0.22, wH, bMat);
      B.wall(scene, cx - W / 2, cz,   y, 0.22, D, wH, bMat);
      // Mur est : porte centrale (2.2m)
      const dw = 2.2, sw = (D - dw) / 2;
      B.wall(scene, cx + W / 2, cz - dw / 2 - sw / 2, y, 0.22, sw, wH, bMat);
      B.wall(scene, cx + W / 2, cz + dw / 2 + sw / 2, y, 0.22, sw, wH, bMat);
      B.box( scene, cx + W / 2, cz, y + wH - 0.55, 0.22, 0.55, dw, bMat);
      // Toit
      B.slab(scene, cx, cz, y + wH, W + 0.4, D + 0.4, B.M.roofDark);
      // Fenêtres
      for (const fx of [-5, -1, 3, 7]) {
        B.box(scene, cx - W / 2 + fx, cz - D / 2 - 0.01, y + 1.5, 1.4, 0.9, 0.06, wMat);
        B.box(scene, cx - W / 2 + fx, cz + D / 2 + 0.01, y + 1.5, 1.4, 0.9, 0.06, wMat);
      }
    }
  }

  // ── Hangar central ────────────────────────────────────────────────────────────

  function _buildHangar(scene, B) {
    const cx = -200, cz = -155;
    const W = 22, D = 15, wH = 6.0;
    const y    = ZS.getTerrainHeight(cx, cz);
    const hMat = new THREE.MeshLambertMaterial({ color: 0x5a5848 });
    const dMat = new THREE.MeshLambertMaterial({ color: 0x383830 });
    const metMat = new THREE.MeshLambertMaterial({ color: 0x444840 });

    B.slab(scene, cx, cz, y, W + 1, D + 1, B.M.concDark);
    // Murs
    B.wall(scene, cx,     cz - D / 2, y, W, 0.28, wH, hMat);
    B.wall(scene, cx - W / 2, cz,   y, 0.28, D, wH, hMat);
    B.wall(scene, cx + W / 2, cz,   y, 0.28, D, wH, hMat);
    // Mur sud : grande porte (12m large)
    const doorW = 12, sdW = (W - doorW) / 2;
    B.wall(scene, cx - doorW / 2 - sdW / 2, cz + D / 2, y, sdW, 0.28, wH, hMat);
    B.wall(scene, cx + doorW / 2 + sdW / 2, cz + D / 2, y, sdW, 0.28, wH, hMat);
    B.wall(scene, cx, cz + D / 2, y + wH - 1.2, doorW, 0.28, 1.2, hMat, true);
    // Portail métal (visuel)
    B.box(scene, cx - 3, cz + D / 2 + 0.02, y + wH * 0.5 - 0.6, 5.8, wH - 1.2, 0.06, dMat);
    B.box(scene, cx + 3, cz + D / 2 + 0.02, y + wH * 0.5 - 0.6, 5.8, wH - 1.2, 0.06, dMat);
    // Toit
    B.slab(scene, cx, cz, y + wH, W + 0.5, D + 0.5, metMat);
    // Poutres de toit
    for (const px of [-8, -2, 4, 10]) {
      B.box(scene, cx - W / 2 + px, cz, y + wH - 0.1, 0.22, 0.35, D, metMat);
    }
  }

  // ── Héliport ──────────────────────────────────────────────────────────────────

  function _buildHelipad(scene, B) {
    const cx = -155, cz = -190;
    const y  = ZS.getTerrainHeight(cx, cz);
    const padMat  = new THREE.MeshLambertMaterial({ color: 0x3a3830, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const markMat = new THREE.MeshLambertMaterial({ color: 0xddcc22, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    const lightMat = new THREE.MeshLambertMaterial({ color: 0xff4422, emissive: 0xff2200, emissiveIntensity: 2.0 });

    // Dalle héliport
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.16, 16), padMat);
    pad.position.set(cx, y + 0.08, cz);
    pad.receiveShadow = true;
    scene.add(pad);
    // Marquage H
    B.box(scene, cx,       cz, y + 0.17, 0.6, 0.01, 5.5, markMat);
    B.box(scene, cx - 1.5, cz, y + 0.17, 0.6, 0.01, 5.5, markMat);
    B.box(scene, cx + 1.5, cz, y + 0.17, 0.6, 0.01, 5.5, markMat);
    B.box(scene, cx,       cz, y + 0.17, 3.8, 0.01, 0.6, markMat);
    // Cercle d'approche (4 balises)
    for (const [ox, oz] of [[7, 0], [-7, 0], [0, 7], [0, -7]]) {
      B.box(scene, cx + ox, cz + oz, y + 0.25, 0.45, 0.45, 0.45, lightMat);
    }
  }

  // ── Bunker ────────────────────────────────────────────────────────────────────

  function _buildBunker(scene, B) {
    const cx = -200, cz = -228;
    const W = 10, D = 7, wH = 2.8;
    const y    = ZS.getTerrainHeight(cx, cz);
    const bkMat = new THREE.MeshLambertMaterial({ color: 0x6a6860 });
    const dMat  = new THREE.MeshLambertMaterial({ color: 0x282820 });

    // Remblai
    B.slab(scene, cx, cz, y - 0.5, W + 3, D + 3, B.M.dirt);
    B.slab(scene, cx, cz, y, W + 1, D + 1, bkMat);
    // Murs épais (béton bunker)
    B.wall(scene, cx,     cz - D / 2, y, W, 0.55, wH, bkMat);
    B.wall(scene, cx,     cz + D / 2, y, W, 0.55, wH, bkMat);
    B.wall(scene, cx - W / 2, cz,   y, 0.55, D, wH, bkMat);
    B.wall(scene, cx + W / 2, cz,   y, 0.55, D, wH, bkMat);
    // Toit épais
    B.slab(scene, cx, cz, y + wH, W + 0.8, D + 0.8, bkMat);
    B.slab(scene, cx, cz, y + wH + 0.55, W + 0.6, D + 0.6, bkMat);
    // Porte blindée
    B.box(scene, cx - W / 2 - 0.01, cz, y + 1.25, 0.1, 2.5, 1.8, dMat);
    // Ventilations
    for (const [ox, oz] of [[-3, 0], [3, 0]]) {
      B.box(scene, cx + ox, cz - D / 2, y + wH + 0.6, 0.7, 0.7, 0.7, dMat);
    }
  }

  // ── Dépôt / entrepôt ──────────────────────────────────────────────────────────

  function _buildDepot(scene, B) {
    const cx = -250, cz = -218;
    const W = 14, D = 9, wH = 3.8;
    const y    = ZS.getTerrainHeight(cx, cz);
    const dMat = new THREE.MeshLambertMaterial({ color: 0x5c5848 });

    B.slab(scene, cx, cz, y, W + 0.5, D + 0.5, B.M.concDark);
    B.wall(scene, cx, cz - D / 2, y, W, 0.22, wH, dMat);
    B.wall(scene, cx, cz + D / 2, y, W, 0.22, wH, dMat);
    B.wall(scene, cx - W / 2, cz, y, 0.22, D, wH, dMat);
    // Mur est : large porte (4.5m)
    const dw = 4.5, sw = (D - dw) / 2;
    B.wall(scene, cx + W / 2, cz - dw / 2 - sw / 2, y, 0.22, sw, wH, dMat);
    B.wall(scene, cx + W / 2, cz + dw / 2 + sw / 2, y, 0.22, sw, wH, dMat);
    B.wall(scene, cx + W / 2, cz, y + wH - 0.8, 0.22, dw, 0.8, dMat, true);
    B.slab(scene, cx, cz, y + wH, W + 0.4, D + 0.4, B.M.roofDark);
  }

  // ── Véhicules ─────────────────────────────────────────────────────────────────

  function _buildVehicles(scene, B) {
    const milGreen = 0x3a4a2a;
    // Jeeps devant le commandement
    B.car(scene, -162, -206, 0.1, milGreen);
    B.car(scene, -162, -215, -0.1, milGreen);
    // Camion devant dépôt
    B.car(scene, -232, -208, Math.PI / 2, 0x2a3020);
    // Voitures à l'entrée
    B.car(scene, -200, -100, 0.05, milGreen);
    B.car(scene, -188, -108, 3.1, 0x3a3a30);
    // Tank (géométrie custom)
    _buildTank(scene, B, -215, -165, milGreen);
    // Hélicoptère sur héliport
    _buildHelicopter(scene, -155, -190);
  }

  function _buildTank(scene, B, cx, cz, col) {
    const y   = ZS.getTerrainHeight(cx, cz);
    const hMat = new THREE.MeshLambertMaterial({ color: col });
    const dkMat = new THREE.MeshLambertMaterial({ color: 0x1a1a18 });
    const g = new THREE.Group();
    // Caisse
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.1, 6.5), hMat);
    hull.position.y = 0.8; hull.castShadow = true; g.add(hull);
    // Tourelle
    const turret = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 3.2), hMat);
    turret.position.set(0, 1.75, -0.4); turret.castShadow = true; g.add(turret);
    // Canon
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 4.5, 8), dkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 1.9, -3.2); g.add(barrel);
    // Chenilles
    for (const ox of [-2.0, 2.0]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 6.8), dkMat);
      track.position.set(ox, 0.42, 0); g.add(track);
    }
    // Roues
    for (const [ox, oz] of [[-2, -2.5], [-2, 0], [-2, 2.5], [2, -2.5], [2, 0], [2, 2.5]]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.6, 8), dkMat);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(ox, 0.44, oz); g.add(wh);
    }
    g.position.set(cx, y, cz);
    g.rotation.y = 0.35;
    scene.add(g);
    B.addCollider({ type: 'box', cx, cz, hw: 2.0, hd: 3.5, maxY: y + 1.7 });
  }

  function _buildHelicopter(scene, cx, cz) {
    const y    = ZS.getTerrainHeight(cx, cz);
    const hMat = new THREE.MeshLambertMaterial({ color: 0x3a4830 });
    const dkMat = new THREE.MeshLambertMaterial({ color: 0x1e2218 });
    const gMat = new THREE.MeshLambertMaterial({ color: 0x4a7a88, transparent: true, opacity: 0.55 });
    const g    = new THREE.Group();
    // Fuselage
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 5.5), hMat);
    body.position.y = 0.9; body.castShadow = true; g.add(body);
    // Cockpit vitré
    const cock = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.8), gMat);
    cock.position.set(0, 0.95, -2.7); g.add(cock);
    // Queue
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 3.5), hMat);
    tail.position.set(0, 1.3, 3.8); g.add(tail);
    // Patins
    for (const ox of [-0.8, 0.8]) {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5.5, 6), dkMat);
      skid.rotation.z = Math.PI / 2; skid.rotation.y = Math.PI / 2;
      skid.position.set(ox, 0.14, 0); g.add(skid);
    }
    g.position.set(cx, y + 0.1, cz);
    g.rotation.y = -0.4;
    scene.add(g);
  }

  // ── Décors & Props ────────────────────────────────────────────────────────────

  function _buildProps(scene, B) {
    const y   = ZS.getTerrainHeight(CX, CZ);
    const oilMat  = new THREE.MeshLambertMaterial({ color: 0x1e1e18 });
    const cratMat = new THREE.MeshLambertMaterial({ color: 0x5a6230 });
    const sandMat = new THREE.MeshLambertMaterial({ color: 0x8a7848 });
    const barbMat = new THREE.MeshLambertMaterial({ color: 0x6a5430 });

    // Fûts de carburant devant le dépôt
    for (const [ox, oz] of [[-2, 2], [-1, 2], [0, 2], [-2, 3], [-1, 3]]) {
      B.box(scene, -244 + ox, -210 + oz, y + 0.55, 0.55, 1.1, 0.55, oilMat);
    }
    // Caisses de munitions (centre)
    for (const [ox, oz] of [[3, 1], [5, 1], [3, 2.4], [5, 2.4]]) {
      B.box(scene, -198 + ox, -130 + oz, y + 0.45, 1.0, 0.9, 0.6, cratMat);
    }
    // Sacs de sable (entrée)
    for (const [ox, oz] of [[-4, 2.5], [-3, 2.5], [4, 2.5], [3, 2.5]]) {
      B.box(scene, CX + ox, Z1 + oz, y + 0.3, 0.9, 0.58, 0.55, sandMat);
    }
    // Rouleaux de barbelés (le long de la clôture intérieure)
    for (const rx of [-260, -235, -215, -185, -160, -140]) {
      const rBarbMat = new THREE.MeshLambertMaterial({ color: 0x5a4828 });
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 6, 12), rBarbMat);
      coil.rotation.x = Math.PI / 2;
      coil.position.set(rx, y + 0.5, Z1 + 1.2);
      scene.add(coil);
    }
    // Panneaux militaires
    const signPolMat = new THREE.MeshLambertMaterial({ color: 0x3a3a2a });
    const signBrdMat = new THREE.MeshLambertMaterial({ color: 0x882222 });
    for (const [sx, sz] of [[GATE_L - 5, Z1 + 1], [GATE_R + 5, Z1 + 1]]) {
      const sy = ZS.getTerrainHeight(sx, sz);
      B.box(scene, sx, sz, sy + 1.5, 0.1, 3.0, 0.1, signPolMat);
      B.box(scene, sx, sz, sy + 2.8, 1.8, 0.65, 0.1, signBrdMat);
    }
    // Cônes de signalisation à l'entrée
    const coneMat = new THREE.MeshLambertMaterial({ color: 0xdd4411 });
    for (const cx2 of [GATE_L - 2, GATE_L - 4, GATE_R + 2, GATE_R + 4]) {
      const cy = ZS.getTerrainHeight(cx2, Z1 - 1);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.65, 6), coneMat);
      cone.position.set(cx2, cy + 0.33, Z1 - 1);
      scene.add(cone);
    }
  }

  // ── Éclairage intérieur ───────────────────────────────────────────────────────

  function _buildLights(scene, B) {
    const polMat  = new THREE.MeshLambertMaterial({ color: 0x2a2a22 });
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffffcc, emissive: 0xffeeaa, emissiveIntensity: 2.5 });

    const poles = [
      [-220, -115], [-180, -115],
      [-240, -160], [-160, -160],
      [-220, -200], [-180, -200],
    ];
    for (const [px, pz] of poles) {
      const py = ZS.getTerrainHeight(px, pz);
      // Poteau
      B.box(scene, px, pz, py + 4.0, 0.12, 8.0, 0.12, polMat);
      B.addCollider({ x: px, z: pz, r: 0.1 });
      // Tête de lampe
      B.box(scene, px, pz + 0.8, py + 8.2, 0.55, 0.32, 0.8, headMat);
      const pt = new THREE.PointLight(0xffeedd, 5.5, 50);
      pt.position.set(px, py + 7.9, pz + 1.0);
      scene.add(pt);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  ZS.Buildings.registerSector({ build });
}());
