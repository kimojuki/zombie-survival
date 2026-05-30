// SECTOR 03 — MAIN CITY  (nord-est de la forêt de départ)
// Grande ville abandonnée : hôpital, commissariat, école, shopping, résidentiel.
(function () {
  'use strict';

  // Centre de la ville (nord-est de la forêt, secteur 01)
  const CX = 250, CZ = -200;

  ZS.registerFlatZone(CX, CZ, 122, 115, 15);

  // ── Build ─────────────────────────────────────────────────────────────────────

  function build(scene) {
    const B = ZS.B;
    _buildAllRoads(scene, B);
    _buildHospital(scene, B);
    _buildSupermarket(scene, B);
    _buildPoliceStation(scene, B);
    _buildSchool(scene, B);
    _buildShoppingCenter(scene, B);
    _buildHotel(scene, B);
    _buildOffices(scene, B);
    _buildGasStation(scene, B);
    _buildParkingStructure(scene, B);
    _buildResidential(scene, B);
    _buildVehicles(scene, B);
    _buildStreetLights(scene, B);
    _buildStreetFurniture(scene, B);
    _buildDebrisAndBarriers(scene, B);
  }

  // ── Matériaux partagés ────────────────────────────────────────────────────────
  const mConcrete  = new THREE.MeshLambertMaterial({ color: 0x8a8070 });
  const mDark      = new THREE.MeshLambertMaterial({ color: 0x2a2820 });
  const mGlass     = new THREE.MeshLambertMaterial({ color: 0x5a8898, transparent: true, opacity: 0.55 });
  const mGlassDark = new THREE.MeshLambertMaterial({ color: 0x3a5560, transparent: true, opacity: 0.45 });
  const mRoof      = new THREE.MeshLambertMaterial({ color: 0x3e3228 });
  const mAsphalt   = new THREE.MeshLambertMaterial({ color: 0x323028, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
  const mMilGreen  = new THREE.MeshLambertMaterial({ color: 0x5a6040 });
  const mRed       = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
  const mSign      = new THREE.MeshLambertMaterial({ color: 0x1a3a5a });

  // ── Réseau routier ────────────────────────────────────────────────────────────

  function _buildAllRoads(scene, B) {
    const M = B.M;

    // Route d'accès depuis la forêt (NE) — chemin en terre
    B.ribbon(scene, [[0,-5],[40,-55],[88,-115],[135,-162],[165,-195],[200,-200]], 6.5, M.roadDirt, false);

    // Route principale E-O de la ville (z=-200)
    B.ribbon(scene, [[405,-200],[360,-200],[315,-200],[275,-200],[250,-200],[220,-200],[185,-200],[165,-200],[130,-200]], 9.0, M.road, false);
    // Rue nord (z=-255)
    B.ribbon(scene, [[370,-255],[315,-255],[275,-255],[250,-255],[220,-255],[185,-255],[130,-255]], 6.5, M.road, false);
    // Rue sud (z=-145)
    B.ribbon(scene, [[370,-145],[315,-145],[275,-145],[250,-145],[215,-145],[180,-145],[130,-145]], 6.5, M.road, false);
    // Avenue principale N-S (x=250)
    B.ribbon(scene, [[250,-315],[250,-275],[250,-230],[250,-200],[250,-170],[250,-130],[250,-85]], 7.5, M.road, false);
    // Rue N-S est (x=340)
    B.ribbon(scene, [[340,-315],[340,-275],[340,-230],[340,-200],[340,-170],[340,-130],[340,-85]], 6.0, M.road, false);
    // Rue N-S ouest (x=165)
    B.ribbon(scene, [[165,-315],[165,-275],[165,-230],[165,-200],[165,-170],[165,-130],[165,-85]], 5.5, M.road, false);

    // Trottoirs route principale
    const trot = new THREE.MeshLambertMaterial({ color: 0x7a7268, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -5 });
    const ty = ZS.getTerrainHeight(CX, CZ);
    B.slab(scene, CX, -205.8, ty + 0.07, 240, 2.6, trot);
    B.slab(scene, CX, -194.2, ty + 0.07, 240, 2.6, trot);
    // Trottoirs rues latérales
    B.slab(scene, CX, -259.5, ty + 0.06, 240, 2.0, trot);
    B.slab(scene, CX, -250.5, ty + 0.06, 240, 2.0, trot);
    B.slab(scene, CX, -149.5, ty + 0.06, 240, 2.0, trot);
    B.slab(scene, CX, -140.5, ty + 0.06, 240, 2.0, trot);

    // Passages piétons
    const zebM = new THREE.MeshLambertMaterial({ color: 0xc8c0b0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
    for (const [zx, zz] of [[250,-200],[340,-200],[165,-200]]) {
      for (let k = -3; k <= 3; k++)
        B.box(scene, zx, zz + k*1.5, ty + 0.09, 7.5, 0.01, 0.55, zebM);
    }

    // Espaces verts (séparateurs)
    const grassM = new THREE.MeshLambertMaterial({ color: 0x3a5a28, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 });
    B.slab(scene, 200, -285, ty + 0.04, 4, 30, grassM);
    B.slab(scene, 295, -285, ty + 0.04, 80, 2, grassM);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HÔPITAL (NW — x≈198, z≈-282)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildHospital(scene, B) {
    const cx = 198, cz = -282;
    const y  = ZS.getTerrainHeight(cx, cz);
    const W = 22, D = 14, wH = 14.0;
    const hMat = new THREE.MeshLambertMaterial({ color: 0x9aa8b0 });

    B.slab(scene, cx, cz, y, W+1, D+1, mConcrete);
    B.wall(scene, cx, cz-D/2, y, W, 0.30, wH, hMat);
    B.wall(scene, cx, cz+D/2, y, W, 0.30, wH, hMat);
    B.wall(scene, cx-W/2, cz, y, 0.30, D, wH, hMat);
    B.wall(scene, cx+W/2, cz, y, 0.30, D, wH, hMat);
    B.slab(scene, cx, cz, y+wH, W+0.4, D+0.4, new THREE.MeshLambertMaterial({color:0x4a4840}));
    // Fenêtres (5 étages)
    for (let fl = 0; fl < 5; fl++) {
      const fy = y + 1.5 + fl*2.8;
      for (const fx of [-7,-2,3,8]) {
        B.box(scene, cx+fx, cz-D/2-0.01, fy, 1.8, 1.5, 0.07, mGlass);
        B.box(scene, cx+fx, cz+D/2+0.01, fy, 1.8, 1.5, 0.07, mGlass);
      }
      for (const fz of [-4,0,4]) {
        B.box(scene, cx-W/2-0.01, cz+fz, fy, 0.07, 1.5, 1.8, mGlass);
        B.box(scene, cx+W/2+0.01, cz+fz, fy, 0.07, 1.5, 1.8, mGlass);
      }
    }
    // Aile urgences
    const ex = cx+4, ez = cz+D/2+5;
    B.slab(scene, ex, ez, y, 12, 8, mConcrete);
    B.wall(scene, ex, ez-4, y, 12, 0.25, 4.5, hMat);
    B.wall(scene, ex, ez+4, y, 12, 0.25, 4.5, hMat);
    B.wall(scene, ex+6, ez, y, 0.25, 8, 4.5, hMat);
    B.slab(scene, ex, ez, y+4.5, 12.4, 8.4, new THREE.MeshLambertMaterial({color:0x4a4840}));
    B.box(scene, ex-6, ez, y+1.8, 0.07, 3.2, 3.5, mGlassDark);
    // Croix rouge
    B.box(scene, cx, cz-D/2-0.02, y+8, 0.06, 3.0, 0.5, mRed);
    B.box(scene, cx, cz-D/2-0.02, y+8, 0.06, 0.5, 3.0, mRed);
    // Enseigne
    B.box(scene, cx, cz-D/2-0.02, y+wH-1.2, 0.06, 1.4, 10, new THREE.MeshLambertMaterial({color:0x1a4a6a}));
    // Hélipad toit
    B.slab(scene, cx-6, cz-4, y+wH+0.2, 7, 7, new THREE.MeshLambertMaterial({color:0x3a3830}));
    const mkM = new THREE.MeshLambertMaterial({color:0xddcc22});
    B.box(scene, cx-6, cz-4, y+wH+0.25, 1.5, 0.01, 7, mkM);
    B.box(scene, cx-6, cz-4, y+wH+0.25, 7, 0.01, 1.5, mkM);
    // Ambulances
    _ambulance(scene, B, cx-9, cz+D/2+3, 0);
    _ambulance(scene, B, cx-9, cz+D/2+8, 0);
  }

  function _ambulance(scene, B, cx, cz, ry) {
    const y = ZS.getTerrainHeight(cx, cz);
    const wM = new THREE.MeshLambertMaterial({color:0xeeeedd});
    const rM = new THREE.MeshLambertMaterial({color:0xcc2222});
    const dM = new THREE.MeshLambertMaterial({color:0x181818});
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0,1.6,4.4),wM); body.position.y=0.95; body.castShadow=true; g.add(body);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.05,0.35,4.45),rM); stripe.position.y=0.72; g.add(stripe);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7,0.65,0.05),mGlass); glass.position.set(0,1.4,-2.22); g.add(glass);
    for (const [ox,oz] of [[-1.1,-1.4],[1.1,-1.4],[-1.1,1.4],[1.1,1.4]]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.22,8),dM);
      wh.rotation.z = Math.PI/2; wh.position.set(ox,0.38,oz); g.add(wh);
    }
    g.position.set(cx, y, cz); g.rotation.y = ry; scene.add(g);
    B.addCollider({type:'box', cx, cz, hw:1.1, hd:2.3, maxY:y+1.75});
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SUPERMARCHÉ (NE — x≈310, z≈-282)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildSupermarket(scene, B) {
    const cx = 310, cz = -282, W = 30, D = 18, wH = 5.5;
    const y = ZS.getTerrainHeight(cx, cz);
    const sMat = new THREE.MeshLambertMaterial({color:0x6a7880});

    B.slab(scene, cx, cz, y, W+2, D+2, mConcrete);
    B.wall(scene, cx, cz-D/2, y, W, 0.28, wH, sMat);
    B.wall(scene, cx, cz+D/2, y, W, 0.28, wH, sMat);
    B.wall(scene, cx-W/2, cz, y, 0.28, D, wH, sMat);
    const dw=4.0, mid=(D-dw*2-4)/2;
    B.wall(scene, cx+W/2, cz+mid/2+dw+2, y, 0.28, mid, wH, sMat);
    B.wall(scene, cx+W/2, cz-mid/2-dw-2, y, 0.28, mid, wH, sMat);
    B.box(scene, cx+W/2, cz-dw/2-1, y+wH-0.6, 0.28, 0.6, dw, sMat);
    B.box(scene, cx+W/2, cz+dw/2+1, y+wH-0.6, 0.28, 0.6, dw, sMat);
    B.box(scene, cx+W/2+0.01, cz, y+2.2, 0.07, 2.5, D-mid*2-dw*2-4, mGlass);
    B.slab(scene, cx, cz, y+wH, W+0.5, D+0.5, mRoof);
    B.box(scene, cx+W/2+2, cz, y+wH-0.3, 4.5, 0.18, D+1, new THREE.MeshLambertMaterial({color:0x3a5878}));
    B.box(scene, cx+W/2+0.01, cz, y+wH-1.8, 0.06, 1.4, 18, new THREE.MeshLambertMaterial({color:0x1a5a28}));
    B.slab(scene, cx+W/2+8, cz, y+0.05, 12, 18, mAsphalt);
    const cartM = new THREE.MeshLambertMaterial({color:0x888880});
    for (const [ox,oz] of [[cx+W/2+4,cz-3],[cx+W/2+6,cz+2],[cx+W/2+9,cz-5]])
      B.box(scene, ox, oz, ZS.getTerrainHeight(ox,oz)+0.35, 1.0, 0.7, 0.5, cartM);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // COMMISSARIAT (SW — x≈198, z≈-118)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildPoliceStation(scene, B) {
    const cx = 198, cz = -118, W = 18, D = 13, wH = 7.5;
    const y = ZS.getTerrainHeight(cx, cz);
    const pMat = new THREE.MeshLambertMaterial({color:0x6a6a78});

    B.slab(scene, cx, cz, y, W+1, D+1, mConcrete);
    B.wall(scene, cx, cz-D/2, y, W, 0.28, wH, pMat);
    B.wall(scene, cx, cz+D/2, y, W, 0.28, wH, pMat);
    B.wall(scene, cx-W/2, cz, y, 0.28, D, wH, pMat);
    const dw=3.0, sidW=(D-dw)/2;
    B.wall(scene, cx+W/2, cz-dw/2-sidW/2, y, 0.28, sidW, wH, pMat);
    B.wall(scene, cx+W/2, cz+dw/2+sidW/2, y, 0.28, sidW, wH, pMat);
    B.box(scene, cx+W/2, cz, y+wH-0.6, 0.28, 0.6, dw, pMat);
    B.slab(scene, cx, cz, y+wH, W+0.4, D+0.4, new THREE.MeshLambertMaterial({color:0x3a3830}));
    for (let fl=0; fl<2; fl++) {
      const fy = y+1.8+fl*3.5;
      for (const fz of [-4.5,0,4.5]) B.box(scene, cx, cz+fz, fy, 1.6, 1.4, 0.06, mGlassDark);
    }
    // Drapeau
    const pm = new THREE.MeshLambertMaterial({color:0x2a2a22});
    B.box(scene, cx+W/2+1, cz-D/2, y+6, 0.08, 5.0, 0.08, pm);
    const fl2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0,1.2), new THREE.MeshLambertMaterial({color:0x1a3a8a,side:THREE.DoubleSide}));
    fl2.position.set(cx+W/2+2.1, y+10.2, cz-D/2); scene.add(fl2);
    B.box(scene, cx+W/2+0.01, cz, y+wH-2, 0.06, 1.0, 10, mSign);
    for (const bz of [-5,-3,-1,1,3,5]) B.box(scene, cx+W/2+2.5, cz+bz, y+0.55, 0.6, 1.1, 0.55, mConcrete);
    B.car(scene, cx+W/2+6, cz-3, 0.1, 0x1a1a3a);
    B.car(scene, cx+W/2+6, cz+3, -0.1, 0x1a1a3a);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ÉCOLE (SE — x≈292, z≈-114)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildSchool(scene, B) {
    const cx = 292, cz = -114, W = 20, D = 12, wH = 6.5;
    const y = ZS.getTerrainHeight(cx, cz);
    const eMat = new THREE.MeshLambertMaterial({color:0xa07848});

    B.slab(scene, cx, cz, y, W+1, D+2, mConcrete);
    B.wall(scene, cx, cz-D/2, y, W, 0.25, wH, eMat);
    B.wall(scene, cx, cz+D/2, y, W, 0.25, wH, eMat);
    B.wall(scene, cx-W/2, cz, y, 0.25, D, wH, eMat);
    const dw=2.5, sidW=(D-dw)/2;
    B.wall(scene, cx+W/2, cz-dw/2-sidW/2, y, 0.25, sidW, wH, eMat);
    B.wall(scene, cx+W/2, cz+dw/2+sidW/2, y, 0.25, sidW, wH, eMat);
    B.box(scene, cx+W/2, cz, y+wH-0.5, 0.25, 0.5, dw, eMat);
    B.slab(scene, cx, cz, y+wH, W+0.4, D+0.4, B.M.roofRed);
    for (let fl=0; fl<2; fl++) {
      const fy = y+1.8+fl*3.0;
      for (const fx of [-7,-3,1,5,9]) {
        B.box(scene, cx-W/2+fx, cz-D/2-0.01, fy, 1.6, 1.4, 0.07, mGlass);
        B.box(scene, cx-W/2+fx, cz+D/2+0.01, fy, 1.6, 1.4, 0.07, mGlass);
      }
    }
    B.box(scene, cx+W/2+0.01, cz, y+4.5, 0.06, 0.8, 8, new THREE.MeshLambertMaterial({color:0x1a4a1a}));
    // Cour
    B.slab(scene, cx-3, cz-D/2-8, y+0.04, 26, 10, new THREE.MeshLambertMaterial({color:0x4a5038}));
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.6,1.0,0.08), new THREE.MeshLambertMaterial({color:0xeeeedd}));
    board.position.set(cx+7, y+6.0, cz-D/2-8); scene.add(board);
    B.box(scene, cx+7, cz-D/2-8, y+3.2, 0.1, 6.0, 0.1, new THREE.MeshLambertMaterial({color:0x3a3a30}));
    const fM = new THREE.MeshLambertMaterial({color:0x444444});
    B.box(scene, cx-3, cz-D/2-13, y+1.5, 27, 3.0, 0.12, fM);
    B.box(scene, cx-16.5, cz-D/2-8, y+1.5, 0.12, 3.0, 10, fM);
    B.box(scene, cx+10.5, cz-D/2-8, y+1.5, 0.12, 3.0, 10, fM);
    // Bus scolaire
    _schoolBus(scene, B, cx+W/2+5, cz-D/2-4, 0);
  }

  function _schoolBus(scene, B, cx, cz, ry) {
    const y = ZS.getTerrainHeight(cx,cz);
    const yM = new THREE.MeshLambertMaterial({color:0xddbb00});
    const dM = new THREE.MeshLambertMaterial({color:0x181818});
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5,2.1,8.5),yM); body.position.y=1.15; body.castShadow=true; g.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4,0.25,8.3),yM); roof.position.set(0,2.27,0); g.add(roof);
    const fw = new THREE.Mesh(new THREE.BoxGeometry(2.1,1.0,0.07),mGlass); fw.position.set(0,1.7,-4.26); g.add(fw);
    for (let i=0;i<4;i++) for (const sx of [-1.27,1.27]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.7,1.4),mGlass); w.position.set(sx,1.65,-2.5+i*1.65); g.add(w);
    }
    for (const [ox,oz] of [[-1.3,-3.0],[1.3,-3.0],[-1.3,0],[1.3,0],[-1.3,3.0],[1.3,3.0]]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.44,0.26,9),dM); wh.rotation.z=Math.PI/2; wh.position.set(ox,0.46,oz); g.add(wh);
    }
    g.position.set(cx,y,cz); g.rotation.y=ry; scene.add(g);
    B.addCollider({type:'box',cx,cz,hw:1.35,hd:4.4,maxY:y+2.35});
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CENTRE COMMERCIAL (centre — x≈262, z≈-188)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildShoppingCenter(scene, B) {
    const cx = 262, cz = -188, W = 32, D = 20, wH = 5.0;
    const y = ZS.getTerrainHeight(cx, cz);
    const cMat = new THREE.MeshLambertMaterial({color:0x7a7880});

    B.slab(scene, cx, cz, y, W+1, D+1, mConcrete);
    B.wall(scene, cx, cz-D/2, y, W, 0.28, wH, cMat);
    B.wall(scene, cx, cz+D/2, y, W, 0.28, wH, cMat);
    B.wall(scene, cx-W/2, cz, y, 0.28, D, wH, cMat);
    B.box(scene, cx+W/2+0.01, cz, y+2.2, 0.07, 2.5, D*0.7, mGlass);
    B.wall(scene, cx+W/2, cz-D/2+3, y, 0.28, 6, wH, cMat);
    B.wall(scene, cx+W/2, cz+D/2-3, y, 0.28, 6, wH, cMat);
    B.box(scene, cx+W/2, cz, y+wH-0.5, 0.28, 0.5, D-14, cMat);
    B.slab(scene, cx, cz, y+wH, W+0.5, D+0.5, mRoof);
    B.box(scene, cx+W/2+2.5, cz, y+wH-0.4, 5.5, 0.18, D-12, new THREE.MeshLambertMaterial({color:0x3a4860}));
    B.box(scene, cx+W/2+0.01, cz-5, y+wH-1.2, 0.06, 0.8, 6, new THREE.MeshLambertMaterial({color:0x884422}));
    B.box(scene, cx+W/2+0.01, cz+5, y+wH-1.2, 0.06, 0.8, 6, new THREE.MeshLambertMaterial({color:0x224488}));
    for (const fz of [-7,-2,3,8]) B.box(scene, cx-W/2-0.01, cz+fz, y+2.5, 0.07, 1.8, 2.5, mGlass);
    const shM = new THREE.MeshLambertMaterial({color:0x6a5a38});
    for (const [sx,sz] of [[255,-195],[260,-195],[265,-195],[255,-185],[260,-185],[265,-185]])
      B.box(scene, sx, sz, y+1.5, 0.1, 3.0, 6, shM);
    B.car(scene, cx+W/2+4, cz-8, Math.PI*0.52, 0x2a2a28);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HÔTEL TOUR (centre-est — x≈355, z≈-228)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildHotel(scene, B) {
    const cx = 355, cz = -228, W = 11, D = 9, wH = 22;
    const y = ZS.getTerrainHeight(cx, cz);
    const htMat = new THREE.MeshLambertMaterial({color:0x606870});

    B.slab(scene, cx, cz, y, W+1, D+2, mConcrete);
    B.wall(scene, cx, cz-D/2, y, W, 0.26, wH, htMat);
    B.wall(scene, cx, cz+D/2, y, W, 0.26, wH, htMat);
    B.wall(scene, cx-W/2, cz, y, 0.26, D, wH, htMat);
    B.box(scene, cx+W/2+0.01, cz, y+2.0, 0.07, wH-3.5, D-0.6, mGlass);
    B.slab(scene, cx, cz, y+wH, W+0.4, D+0.4, mDark);
    B.box(scene, cx, cz, y+wH+0.6, W-1, 1.2, D-1, htMat);
    for (let fl=1; fl<8; fl++) B.box(scene, cx, cz, y+fl*2.75, W+0.12, 0.12, D+0.12, new THREE.MeshLambertMaterial({color:0x8a9098}));
    B.box(scene, cx-W/2-0.01, cz, y+wH-3, 0.06, 1.8, 7, mSign);
    // Balcon effondré
    const rubM = new THREE.MeshLambertMaterial({color:0x706a60});
    B.box(scene, cx-W/2-1.5, cz+2, y+2.8, 3.2, 0.4, 2.5, rubM);
    B.box(scene, cx-W/2-0.8, cz+1, y+1.2, 2.0, 0.4, 1.5, rubM);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // BUREAUX & BANQUE (centre-ouest — x≈195)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildOffices(scene, B) {
    // Bâtiment A — bureaux
    const bAx=195, bAz=-220, bAW=16, bAD=11, bAwH=11.5;
    const y1 = ZS.getTerrainHeight(bAx, bAz);
    const oMat = new THREE.MeshLambertMaterial({color:0x7a8090});
    B.slab(scene, bAx, bAz, y1, bAW+1, bAD+1, mConcrete);
    B.wall(scene, bAx, bAz-bAD/2, y1, bAW, 0.27, bAwH, oMat);
    B.wall(scene, bAx, bAz+bAD/2, y1, bAW, 0.27, bAwH, oMat);
    B.wall(scene, bAx-bAW/2, bAz, y1, 0.27, bAD, bAwH, oMat);
    B.wall(scene, bAx+bAW/2, bAz, y1, 0.27, bAD, bAwH, oMat);
    B.slab(scene, bAx, bAz, y1+bAwH, bAW+0.4, bAD+0.4, mDark);
    for (let fl=0; fl<4; fl++) {
      const fy = y1+1.5+fl*2.8;
      B.box(scene, bAx, bAz-bAD/2-0.01, fy, bAW*0.65, 1.4, 0.07, mGlassDark);
      B.box(scene, bAx, bAz+bAD/2+0.01, fy, bAW*0.65, 1.4, 0.07, mGlassDark);
    }
    // Bâtiment B — banque
    const bBx=195, bBz=-170, bBW=13, bBD=10, bBwH=7.0;
    const y2 = ZS.getTerrainHeight(bBx, bBz);
    const bnMat = new THREE.MeshLambertMaterial({color:0x8a7860});
    B.slab(scene, bBx, bBz, y2, bBW+1, bBD+1, mConcrete);
    B.wall(scene, bBx, bBz-bBD/2, y2, bBW, 0.30, bBwH, bnMat);
    B.wall(scene, bBx, bBz+bBD/2, y2, bBW, 0.30, bBwH, bnMat);
    B.wall(scene, bBx-bBW/2, bBz, y2, 0.30, bBD, bBwH, bnMat);
    B.wall(scene, bBx+bBW/2, bBz, y2, 0.30, bBD, bBwH, bnMat);
    B.slab(scene, bBx, bBz, y2+bBwH, bBW+0.4, bBD+0.4, mRoof);
    const colM = new THREE.MeshLambertMaterial({color:0xc8bea8});
    for (const bz of [-3.5,0,3.5]) B.box(scene, bBx+bBW/2+0.3, bBz+bz, y2+bBwH*0.5, 0.55, bBwH, 0.55, colM);
    B.box(scene, bBx+bBW/2+0.01, bBz, y2+2, 0.06, 2.0, bBD-2, mGlass);
    B.box(scene, bBx, bBz-bBD/2-0.01, y2+bBwH-1.5, 0.06, 1.0, 9, new THREE.MeshLambertMaterial({color:0x8a6020}));
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // STATION ESSENCE & PARKING
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildGasStation(scene, B) {
    B.gasStation(scene, 160, -128);
    B.car(scene, 170, -122, 0.2, 0x5a4a30);
    B.car(scene, 170, -128, -0.1, 0x3a3a28);
  }

  function _buildParkingStructure(scene, B) {
    const cx=345, cz=-115, W=20, D=14;
    const y = ZS.getTerrainHeight(cx, cz);
    const pkM = new THREE.MeshLambertMaterial({color:0x707468});
    const lineM = new THREE.MeshLambertMaterial({color:0xf0e8cc,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
    for (let lvl=0; lvl<3; lvl++) {
      const ly = y+lvl*3.2;
      B.slab(scene, cx, cz, ly, W, D, pkM);
      for (const [px,pz] of [[-8,-5.5],[0,-5.5],[8,-5.5],[-8,5.5],[0,5.5],[8,5.5]])
        B.box(scene, cx+px, cz+pz, ly+1.6, 0.45, 3.2, 0.45, pkM);
      B.box(scene, cx-W/2, cz, ly+2.8, 0.18, 0.9, D, pkM);
      B.box(scene, cx+W/2, cz, ly+2.8, 0.18, 0.9, D, pkM);
      B.box(scene, cx, cz-D/2, ly+2.8, W, 0.9, 0.18, pkM);
      for (let i=-4; i<=4; i++) B.box(scene, cx+i*2.2, cz-2, ly+0.08, 0.1, 0.01, 9, lineM);
      if (lvl < 2) {
        B.car(scene, cx-6, cz-2, 0.0, 0x2a2a22+lvl*0x101010);
        B.car(scene, cx,   cz-2, 0.05, 0x3a4a2a);
        B.car(scene, cx+6, cz-2, -0.08, 0x4a3a20);
      }
    }
    ZS.registerRamp(cx-W/2-3, cz, 3, D*0.5, y, y+6.4, 'z');
    B.visualStairs(scene, cx-W/2-3, cz, y, y+6.4, 'z', 5, D*0.5);
    B.box(scene, cx+W/2+0.01, cz, y+5.5, 0.06, 3.5, 7, new THREE.MeshLambertMaterial({color:0x1a3888}));
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // IMMEUBLES RÉSIDENTIELS
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildResidential(scene, B) {
    const towers = [
      { cx:220, cz:-285, W:14, D:9, floors:6, col:0x8a8070 },
      { cx:282, cz:-285, W:12, D:8, floors:5, col:0x907858 },
      { cx:355, cz:-282, W:10, D:8, floors:8, col:0x788090 },
      { cx:220, cz:-115, W:14, D:9, floors:4, col:0x988060 },
      { cx:282, cz:-115, W:12, D:8, floors:3, col:0x8a7060 },
    ];
    for (const t of towers) _buildTower(scene, B, t.cx, t.cz, t.W, t.D, t.floors, t.col);
    for (const [hx,hz] of [[362,-285],[362,-272],[362,-115],[362,-128]])
      B.house(scene, hx, hz);
  }

  function _buildTower(scene, B, cx, cz, W, D, floors, col) {
    const wH = floors*3.0;
    const y = ZS.getTerrainHeight(cx, cz);
    const tMat = new THREE.MeshLambertMaterial({color:col});
    B.slab(scene, cx, cz, y, W+0.5, D+0.5, mConcrete);
    B.wall(scene, cx, cz-D/2, y, W, 0.25, wH, tMat);
    B.wall(scene, cx, cz+D/2, y, W, 0.25, wH, tMat);
    B.wall(scene, cx-W/2, cz, y, 0.25, D, wH, tMat);
    B.wall(scene, cx+W/2, cz, y, 0.25, D, wH, tMat);
    B.slab(scene, cx, cz, y+wH, W+0.3, D+0.3, mRoof);
    for (let fl=0; fl<floors; fl++) {
      const fy = y+1.4+fl*3.0;
      for (const fx of [-W/2+1.5, 0, W/2-1.5]) {
        B.box(scene, cx+fx, cz-D/2-0.01, fy, 1.5, 1.3, 0.06, mGlass);
        B.box(scene, cx+fx, cz+D/2+0.01, fy, 1.5, 1.3, 0.06, mGlass);
      }
    }
    for (let fl=1; fl<floors; fl++) B.box(scene, cx, cz, y+fl*3.0, W+0.1, 0.1, D+0.1, new THREE.MeshLambertMaterial({color:Math.max(0,col-0x101010)}));
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // VÉHICULES
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildVehicles(scene, B) {
    // Embouteillage route principale
    for (const [vx,vz,vr,vc] of [
      [405,-201.5,0.05,0x3a2a18],[390,-198,-0.08,0x2a3a2a],[375,-201,-0.1,0x4a3818],
      [360,-198.5,0.12,0x1a2a3a],[345,-201.8,-0.05,0x3a3a28],[330,-199,0.08,0x2a1a18],
      [315,-202,3.1,0x4a4030],[300,-198.5,-0.1,0x3a2820],[285,-201.5,0.06,0x1a3a2a],
      [270,-199,0.0,0x2a3030],[255,-201.8,-0.08,0x4a2a18],[240,-198.5,0.1,0x3a3828],
      [225,-202,3.18,0x2a2a20],[210,-199,0.0,0x4a3018],[196,-201.5,-0.12,0x1a2820],
    ]) B.car(scene, vx, vz, vr, vc);

    // Taxis jaunes
    B.car(scene, 322, -201.5, -0.15, 0xddbb00);
    B.car(scene, 268, -198.5, 0.1, 0xddbb00);

    // Rue nord
    for (const [vx,vz,vc] of [[370,-255,0x3a2a18],[330,-256,0x2a3a2a],[290,-255,0x4a3018],[250,-256,0x1a2a3a],[210,-255,0x3a3028]])
      B.car(scene, vx, vz, Math.random()*0.3-0.15, vc);

    // Rue sud
    for (const [vx,vz,vc] of [[370,-145,0x2a2a20],[330,-144,0x3a2818],[290,-145,0x4a3a28],[250,-144,0x2a3a2a],[210,-145,0x1a2820]])
      B.car(scene, vx, vz, Math.PI+Math.random()*0.3-0.15, vc);

    // Épaves brûlées
    for (const [vx,vz] of [[405,-199],[280,-202],[220,-198.5]])
      B.car(scene, vx, vz, 0.25, 0x1a1a18);

    // Bus
    _bus(scene, B, 368, -200.5, 0.15);
    _bus(scene, B, 252, -199.5, Math.PI);
  }

  function _bus(scene, B, cx, cz, ry) {
    const py = ZS.getTerrainHeight(cx, cz);
    const bodyM = new THREE.MeshLambertMaterial({color:0x1e2a6a});
    const dM = new THREE.MeshLambertMaterial({color:0x181818});
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.5,2.1,9.0),bodyM); b.position.y=1.12; b.castShadow=true; g.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4,0.28,8.8),bodyM); roof.position.set(0,2.24,0); g.add(roof);
    for (let i=0; i<5; i++) for (const sx of [-1.27,1.27]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.75,1.3),mGlass); w.position.set(sx,1.65,-3.0+i*1.52); g.add(w);
    }
    for (const [ox,oz] of [[-1.3,-3.1],[1.3,-3.1],[-1.3,0],[1.3,0],[-1.3,3.1],[1.3,3.1]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.46,0.28,9),dM); w.rotation.z=Math.PI/2; w.position.set(ox,0.48,oz); g.add(w);
    }
    g.position.set(cx, py, cz); g.rotation.y=ry; scene.add(g);
    B.addCollider({type:'box',cx,cz,hw:1.35,hd:4.6,maxY:py+2.38});
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MOBILIER URBAIN
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildStreetLights(scene, B) {
    const polM = new THREE.MeshLambertMaterial({color:0x3a3a3a});
    const lmM  = new THREE.MeshLambertMaterial({color:0xffffcc,emissive:0xffeeaa,emissiveIntensity:2.5});
    for (const [lx,lz,side] of [
      [410,-204,-1],[390,-196,1],[370,-204,-1],[350,-196,1],[330,-204,-1],[310,-196,1],
      [290,-204,-1],[270,-196,1],[250,-204,-1],[230,-196,1],[210,-204,-1],[190,-196,1],
    ]) {
      const ly = ZS.getTerrainHeight(lx,lz);
      B.box(scene, lx, lz, ly+2.9, 0.09, 5.8, 0.09, polM);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,1.8),polM);
      arm.position.set(lx, ly+5.6, lz+side*0.7); scene.add(arm);
      const fix = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.24,0.65),lmM);
      fix.position.set(lx, ly+5.4, lz+side*1.55); scene.add(fix);
      const pt = new THREE.PointLight(0xffeecc,5.0,38); pt.position.set(lx,ly+5.2,lz+side*1.6); scene.add(pt);
      B.addCollider({x:lx, z:lz, r:0.1});
    }
  }

  function _buildStreetFurniture(scene, B) {
    const y = ZS.getTerrainHeight(CX, CZ);
    const bnM = new THREE.MeshLambertMaterial({color:0x2a2820});
    const trM = new THREE.MeshLambertMaterial({color:0x1a3a18});
    const dTrM = new THREE.MeshLambertMaterial({color:0x4a3818});

    // Bancs
    for (const [bx,bz] of [[398,-207],[375,-193],[350,-207],[325,-193],[300,-207],[275,-193],[250,-207],[225,-193],[200,-207]]) {
      const by = ZS.getTerrainHeight(bx,bz);
      B.box(scene, bx, bz, by+0.52, 1.8, 0.08, 0.42, bnM);
      B.box(scene, bx, bz+0.22, by+0.36, 1.8, 0.7, 0.07, bnM);
      for (const ox of [-0.7,0.7]) B.box(scene, bx+ox, bz, by+0.26, 0.08, 0.52, 0.42, bnM);
    }
    // Arbres
    const treeGeo = new THREE.SphereGeometry(1.8,7,5);
    const treeTrk = new THREE.CylinderGeometry(0.14,0.18,4.5,7);
    for (const [tx,tz,alive] of [
      [405,-207.5,true],[380,-192.5,true],[355,-207.5,false],[330,-192.5,true],
      [305,-207.5,false],[280,-192.5,true],[255,-207.5,true],[230,-192.5,false],
      [205,-207.5,true],[390,-192.5,true],[360,-207.5,true],[335,-192.5,false],
    ]) {
      const ty = ZS.getTerrainHeight(tx,tz);
      const trunk = new THREE.Mesh(treeTrk, alive?trM:dTrM);
      trunk.position.set(tx,ty+2.25,tz); trunk.castShadow=true; scene.add(trunk);
      if (alive) {
        const crown = new THREE.Mesh(treeGeo, new THREE.MeshLambertMaterial({color:0x2a5018}));
        crown.position.set(tx,ty+5.5,tz); crown.castShadow=true; scene.add(crown);
      }
      B.addCollider({x:tx, z:tz, r:0.16});
    }
    // Abribus
    for (const [sx,sz,ry] of [[375,-204.8,0],[295,-195.2,Math.PI],[215,-204.8,0]]) _busStop(scene,B,sx,sz,ry);
    // Feux de circulation
    const tfM = new THREE.MeshLambertMaterial({color:0x1a1a18});
    const rdM = new THREE.MeshLambertMaterial({color:0x991111});
    for (const [ix,iz] of [[250,-200.5],[340,-200.5],[165,-200.5]]) {
      const iy = ZS.getTerrainHeight(ix,iz);
      B.box(scene, ix, iz-5.5, iy+2.8, 0.09, 5.5, 0.09, tfM);
      B.box(scene, ix, iz-5.5, iy+5.5, 0.42, 1.2, 0.55, tfM);
      B.box(scene, ix, iz-5.5, iy+5.1, 0.38, 0.35, 0.45, rdM);
    }
    // Poubelles renversées
    const pbM = new THREE.MeshLambertMaterial({color:0x2a2a22});
    for (const [px,pz,pr] of [[411,-197,0.4],[378,-203,-0.3],[338,-197,0.5],[298,-203,0.2],[258,-197,0.35]]) {
      const py = ZS.getTerrainHeight(px,pz);
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,0.68,7),pbM);
      bin.rotation.z=pr; bin.position.set(px,py+0.22,pz); bin.castShadow=true; scene.add(bin);
    }
  }

  function _busStop(scene, B, sx, sz, ry) {
    const by = ZS.getTerrainHeight(sx,sz);
    const frM = new THREE.MeshLambertMaterial({color:0x2a3a52});
    const rfM = new THREE.MeshLambertMaterial({color:0x1e2a40});
    const g = new THREE.Group(); g.position.set(sx,by,sz); g.rotation.y=ry;
    const sl = new THREE.Mesh(new THREE.BoxGeometry(3.4,0.08,1.5),new THREE.MeshLambertMaterial({color:0x7a7268}));
    sl.position.set(0,0.04,0); g.add(sl);
    for (const px of [-1.45,1.45]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.09,2.7,0.09),frM); p.position.set(px,1.35,0.52); g.add(p); }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3,0.10,1.55),rfM); roof.position.set(0,2.75,0.12); g.add(roof);
    const pan = new THREE.Mesh(new THREE.BoxGeometry(3.1,2.4,0.06),mGlass); pan.position.set(0,1.30,0.56); g.add(pan);
    scene.add(g);
    B.addCollider({type:'box',cx:sx,cz:sz,hw:1.8,hd:0.85});
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // DÉCOMBRES & AMBIANCE
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildDebrisAndBarriers(scene, B) {
    const y = ZS.getTerrainHeight(CX, CZ);
    const rubM = new THREE.MeshLambertMaterial({color:0x706a58});
    const cncM = new THREE.MeshLambertMaterial({color:0x8a8070});
    const sandM = new THREE.MeshLambertMaterial({color:0x8a7848});
    const coneM = new THREE.MeshLambertMaterial({color:0xdd4411});
    const barM  = new THREE.MeshLambertMaterial({color:0x2a2a22});

    // Blocs béton
    for (const [bx,bz] of [[413,-205],[413,-195],[258,-191],[258,-209],[165,-206],[165,-194]])
      B.box(scene, bx, bz, y+0.55, 1.8, 1.1, 0.9, cncM);

    // Gravats
    for (const [rx,rz,rw,rd,rh] of [
      [396,-208,3.5,2.5,0.6],[335,-208,4,3,0.8],[280,-208,3,2,0.5],
      [210,-208,4,2.5,0.7],[360,-192,3,2,0.55],[310,-192,3.5,3,0.65],
    ]) B.box(scene, rx, rz, ZS.getTerrainHeight(rx,rz)+rh/2, rw, rh, rd, rubM);

    // Sacs de sable
    for (const [sx,sz,count,axis] of [
      [350,-208,4,'x'],[300,-192,4,'x'],[248,-208,4,'x'],[208,-192,4,'x'],
    ]) {
      for (let i=0; i<count; i++) {
        const ox=axis==='x'?i*1.0:0, oz=axis==='z'?i*1.0:0;
        B.box(scene, sx+ox, sz+oz, y+0.3, 0.9, 0.58, 0.55, sandM);
      }
    }

    // Cônes
    for (const [px,pz] of [[413,-203],[413,-197],[378,-196],[345,-204],[318,-196],[285,-204],[258,-193],[225,-204],[198,-193]]) {
      const py = ZS.getTerrainHeight(px,pz);
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.2,0.65,6),coneM);
      c.position.set(px, py+0.33, pz); c.rotation.z=(Math.random()-0.5)*1.2; scene.add(c);
    }

    // Barrières New Jersey
    B.wall(scene, 250,-215, y, 20, 0.45, 1.0, barM);
    B.wall(scene, 250,-185, y, 20, 0.45, 1.0, barM);

    // Graffiti HELP sur mur
    const helpM = new THREE.MeshLambertMaterial({color:0xcc3311});
    const helpBoard = new THREE.Mesh(new THREE.BoxGeometry(4,2,0.05),helpM);
    helpBoard.position.set(310, ZS.getTerrainHeight(310,-255)+2.5, -255.18); scene.add(helpBoard);

    // Fils électriques tombés
    const wireM = new THREE.MeshLambertMaterial({color:0x1a1a18});
    B.box(scene, 315, -200, y+0.15, 8, 0.06, 0.06, wireM);
    B.box(scene, 315, -200, y+0.15, 0.06, 3, 0.06, wireM);

    // Sol fissuré
    const crackM = new THREE.MeshLambertMaterial({color:0x3a3630,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-5});
    for (const [fx,fz] of [[408,-200],[340,-201],[283,-200],[228,-199],[170,-200]])
      B.box(scene, fx, fz, y+0.06, 3.5, 0.01, 2.5, crackM);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  ZS.Buildings.registerSector({ build });
}());
