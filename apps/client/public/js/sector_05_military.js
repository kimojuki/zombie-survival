// SECTOR 05 — MILITARY ZONE
// Base fortifiée 4 zones : Sécurité · Vie · Opérations · Commandement
(function () {
  'use strict';

  const CX = -200, CZ = -160;
  const HW = 75, HD = 80;
  const X0 = CX - HW, X1 = CX + HW;  // -275 … -125
  const Z0 = CZ - HD, Z1 = CZ + HD;  // -240 … -80
  const GATE_W = 14;
  const GATE_L = CX - GATE_W / 2;    // -207
  const GATE_R = CX + GATE_W / 2;    // -193

  ZS.registerFlatZone(CX, CZ, 80, 85, 12);

  const MILITARY_ROADS = [
    { id: 'mil_access', pts: [[-177,-5],[-185,-18],[-194,-36],[-198,-55],[-200,-72],[-200,-80]], width: 6.0, type: 'dirt' },
    { id: 'mil_main_ns', pts: [[CX,Z1],[CX,Z0+5]], width: 8.0, type: 'dirt' },
    { id: 'mil_row_1', pts: [[X0+5,-120],[X1-5,-120]], width: 6.0, type: 'dirt' },
    { id: 'mil_row_2', pts: [[X0+5,-170],[X1-5,-170]], width: 6.0, type: 'dirt' },
    { id: 'mil_row_3', pts: [[X0+5,-212],[X1-5,-212]], width: 6.0, type: 'dirt' },
    { id: 'mil_col_w', pts: [[X0+8,Z1],[X0+8,Z0+5]], width: 5.0, type: 'dirt' },
    { id: 'mil_col_e', pts: [[X1-8,Z1],[X1-8,Z0+5]], width: 5.0, type: 'dirt' },
  ];

  // ── Build ─────────────────────────────────────────────────────────────────────

  function build(scene) {
    const B = ZS.B;
    _buildGround(scene, B);
    _buildAccessRoad(scene, B);
    _buildPerimeterFence(scene, B);
    _buildMainEntrance(scene, B);
    _buildGuardTowers(scene, B);
    _buildInternalRoads(scene, B);
    // Zone 1 — Sécurité
    _buildInnerCheckpoint(scene, B);
    _buildParkingLot(scene, B);
    _buildTrainingRange(scene, B);
    // Zone 2 — Vie quotidienne
    _buildBarracks(scene, B);
    _buildMessHall(scene, B);
    _buildMedical(scene, B);
    // Zone 3 — Opérations
    _buildHangar(scene, B);
    _buildMotorPool(scene, B);
    _buildArmory(scene, B);
    _buildHelipad(scene, B);
    _buildFuelDepot(scene, B);
    // Zone 4 — Commandement
    _buildCommandCenter(scene, B);
    _buildBriefingRoom(scene, B);
    _buildCommsT(scene, B);
    _buildBunker(scene, B);
    // Ambiance
    _buildTents(scene, B);
    _buildVehicles(scene, B);
    _buildProps(scene, B);
    _buildLights(scene, B);
  }

  // ── Matériaux partagés ────────────────────────────────────────────────────────
  const _mConcrete = new THREE.MeshLambertMaterial({ color: 0x7a7268 });
  const _mMilGreen = new THREE.MeshLambertMaterial({ color: 0x5a6040 });
  const _mDark     = new THREE.MeshLambertMaterial({ color: 0x282820 });
  const _mMetal    = new THREE.MeshLambertMaterial({ color: 0x444840 });
  const _mRust     = new THREE.MeshLambertMaterial({ color: 0x7a5830 });
  const _mGlass    = new THREE.MeshLambertMaterial({ color: 0x4a7060, transparent: true, opacity: 0.5 });
  const _mRed      = new THREE.MeshLambertMaterial({ color: 0xaa2222 });
  const _mYellow   = new THREE.MeshLambertMaterial({ color: 0xccaa10 });

  // ── Sol intérieur ─────────────────────────────────────────────────────────────

  function _buildGround(scene, B) {
    const y = ZS.getTerrainHeight(CX, CZ);
    B.slab(scene, CX, CZ, y + 0.02, HW*2, HD*2,
      new THREE.MeshLambertMaterial({ color: 0x6a5a40 }));
    // Zones bétonnées (routes + devant bâtiments)
    B.slab(scene, CX, CZ, y + 0.04, 8, HD*2,
      new THREE.MeshLambertMaterial({ color: 0x555048, polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-3 }));
  }

  // ── Route d'accès ─────────────────────────────────────────────────────────────

  function _buildAccessRoad(scene, B) {
    // Route rendue par ZS.RoadNetwork.buildMeshes
  }

  // ── Clôture périmétrique ──────────────────────────────────────────────────────

  function _buildPerimeterFence(scene, B) {
    const y = ZS.getTerrainHeight(CX, CZ);
    const FH = 3.4;
    const wireMat = new THREE.MeshLambertMaterial({ color: 0x484848 });
    const postMat = new THREE.MeshLambertMaterial({ color: 0x282828 });
    const barbMat = new THREE.MeshLambertMaterial({ color: 0x7a5830 });

    B.wall(scene, CX, Z0, y, HW*2, 0.22, FH, wireMat);
    B.wall(scene, X0, CZ, y, 0.22, HD*2, FH, wireMat);
    B.wall(scene, X1, CZ, y, 0.22, HD*2, FH, wireMat);
    const sw = HW - GATE_W/2;
    B.wall(scene, X0+sw/2,   Z1, y, sw, 0.22, FH, wireMat);
    B.wall(scene, X1-sw/2,   Z1, y, sw, 0.22, FH, wireMat);

    function posts(x0,z0,x1,z1) {
      const dx=x1-x0,dz=z1-z0,n=Math.ceil(Math.hypot(dx,dz)/5);
      for(let i=0;i<=n;i++)
        B.box(scene,x0+dx*i/n,z0+dz*i/n,y+FH/2,0.18,FH,0.18,postMat);
    }
    posts(X0,Z0,X1,Z0); posts(X0,Z0,X0,Z1); posts(X1,Z0,X1,Z1);
    posts(X0,Z1,GATE_L,Z1); posts(GATE_R,Z1,X1,Z1);

    const bT = FH+0.2;
    B.box(scene,CX,Z0,y+bT,HW*2+0.3,0.14,0.36,barbMat);
    B.box(scene,X0,CZ,y+bT,0.36,0.14,HD*2+0.3,barbMat);
    B.box(scene,X1,CZ,y+bT,0.36,0.14,HD*2+0.3,barbMat);
    B.box(scene,X0+sw/2,Z1,y+bT,sw,0.14,0.36,barbMat);
    B.box(scene,X1-sw/2,Z1,y+bT,sw,0.14,0.36,barbMat);
  }

  // ── Entrée principale ─────────────────────────────────────────────────────────

  function _buildMainEntrance(scene, B) {
    const y = ZS.getTerrainHeight(CX, Z1);
    const metMat = new THREE.MeshLambertMaterial({ color: 0x2a3a2a });

    for (const px of [GATE_L-0.5, GATE_R+0.5]) {
      B.wall(scene, px, Z1, y, 1.0, 1.0, 5.0, _mConcrete);
      B.box(scene, px, Z1-0.52, y+3.8, 0.94, 0.8, 0.06, _mDark);
    }
    B.box(scene, CX, Z1, y+4.8, GATE_W+2.2, 0.35, 0.9, metMat);
    B.box(scene, CX, Z1, y+4.4, GATE_W+0.1, 0.18, 0.18, metMat);
    B.box(scene, CX+3.5, Z1+1.5, y+1.15, GATE_W*0.55, 0.12, 0.12, _mRed);
    B.wall(scene, CX-4.0, Z1+1.5, y, 0.22, 0.22, 1.2, _mConcrete);

    // Guérite est
    const gx=GATE_R+3.5, gz=Z1+2.5, gy=ZS.getTerrainHeight(gx,gz);
    B.wall(scene, gx, gz-1.5, gy, 3.0, 0.22, 3.0, _mConcrete);
    B.wall(scene, gx, gz+1.5, gy, 3.0, 0.22, 3.0, _mConcrete);
    B.wall(scene, gx-1.5, gz, gy, 0.22, 3.0, 3.0, _mConcrete);
    B.wall(scene, gx+1.5, gz, gy, 0.22, 3.0, 3.0, _mConcrete, true);
    B.slab(scene, gx, gz, gy+3.0, 3.2, 3.2, _mConcrete);
    B.box(scene, gx-1.52, gz, gy+1.6, 0.06, 0.8, 1.6, _mGlass);

    const lm = new THREE.MeshLambertMaterial({color:0xffffcc,emissive:0xffeeaa,emissiveIntensity:2.0});
    B.box(scene, CX, Z1, y+5.05, 0.55, 0.28, 0.7, lm);
    const sp = new THREE.PointLight(0xffeecc, 5.0, 35);
    sp.position.set(CX, y+4.7, Z1-1.5); scene.add(sp);
  }

  // ── Tours de garde (montables) ────────────────────────────────────────────────

  function _buildGuardTowers(scene, B) {
    const by = ZS.getTerrainHeight(CX, CZ);
    const H  = 6.0;
    const towers = [
      { tx:X0+2, tz:Z0+2, sa:'x', rCx:-269, rCz:Z0+2, rHw:4, rHz:1.2, y0:by+H, y1:by },
      { tx:X1-2, tz:Z0+2, sa:'x', rCx:-131, rCz:Z0+2, rHw:4, rHz:1.2, y0:by,   y1:by+H },
      { tx:X0+2, tz:Z1-2, sa:'z', rCx:X0+2, rCz:-86,  rHw:1.2, rHz:4, y0:by,   y1:by+H },
      { tx:X1-2, tz:Z1-2, sa:'z', rCx:X1-2, rCz:-86,  rHw:1.2, rHz:4, y0:by,   y1:by+H },
    ];
    const lm = new THREE.MeshLambertMaterial({color:0xffffcc,emissive:0xffee88,emissiveIntensity:2.5});
    for (const t of towers) {
      const { tx,tz,sa,rCx,rCz,rHw,rHz,y0,y1 } = t;
      ZS.registerUpperFloor(tx, tz, 1.3, 1.3, by+H);
      ZS.registerRamp(rCx, rCz, rHw, rHz, y0, y1, sa);
      B.visualStairs(scene, rCx, rCz, y0, y1, sa, 2.0, sa==='x'?rHw:rHz);
      for (const [ox,oz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
        B.box(scene,tx+ox,tz+oz,by+H/2,0.16,H,0.16,_mMetal);
        B.addCollider({x:tx+ox,z:tz+oz,r:0.12});
      }
      B.box(scene,tx,tz,by+H,2.6,0.22,2.6,_mDark);
      for (const [gx,gz,gw,gd] of [[0,-1.3,2.6,0.08],[0,1.3,2.6,0.08],[-1.3,0,0.08,2.6],[1.3,0,0.08,2.6]])
        B.box(scene,tx+gx,tz+gz,by+H+0.55,gw,0.9,gd,_mMetal);
      B.box(scene,tx,tz,by+H+1.5,2.8,0.16,2.8,_mDark);
      B.box(scene,tx,tz,by+H+0.5,0.38,0.22,0.5,lm);
      const pt=new THREE.PointLight(0xffeedd,3.5,40);
      pt.position.set(tx,by+H+0.4,tz); scene.add(pt);
    }
  }

  // ── Réseau routier interne ────────────────────────────────────────────────────

  function _buildInternalRoads(scene, B) {
    // Routes internes rendues par ZS.RoadNetwork.buildMeshes
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ZONE 1 — SÉCURITÉ (z -80 → -130)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildInnerCheckpoint(scene, B) {
    const y = ZS.getTerrainHeight(CX, -100);
    // Barrières de part et d'autre de la route
    B.box(scene, CX-7, -100, y+1.0, 6.0, 0.12, 0.12, _mRed);
    B.box(scene, CX+7, -100, y+1.0, 6.0, 0.12, 0.12, _mRed);
    B.wall(scene, CX-10, -100, y, 0.22, 0.22, 1.1, _mConcrete);
    B.wall(scene, CX+10, -100, y, 0.22, 0.22, 1.1, _mConcrete);
    // Sacs de sable fortification
    const sm = new THREE.MeshLambertMaterial({color:0x8a7848});
    for (const [ox,oz] of [[-12,-2],[-12,-1],[-12,0],[-12,1],[12,-2],[12,-1],[12,0],[12,1]])
      B.box(scene,CX+ox,-100+oz,y+0.3,0.9,0.58,0.55,sm);
    // Mât drapeau + drapeau
    const pm = new THREE.MeshLambertMaterial({color:0x3a3a2a});
    B.box(scene, CX, -100, y+5.5, 0.1, 11.0, 0.1, pm);
    const fm = new THREE.MeshLambertMaterial({color:0x3a6a3a,side:THREE.DoubleSide});
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.4),fm);
    flag.position.set(CX+1.2, y+10.5, -100); scene.add(flag);
  }

  function _buildParkingLot(scene, B) {
    const cx=-242, cz=-104, y=ZS.getTerrainHeight(cx,cz);
    B.slab(scene,cx,cz,y+0.04,24,22,new THREE.MeshLambertMaterial({color:0x4a4840,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}));
    const lm = new THREE.MeshLambertMaterial({color:0xddddcc,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
    for(let i=-2;i<=2;i++) B.box(scene,cx+i*4,cz-10,y+0.08,0.1,0.01,20,lm);
    B.box(scene,cx,cz-10,y+0.08,24,0.01,0.1,lm);
    B.box(scene,cx,cz+10,y+0.08,24,0.01,0.1,lm);
    // Panneau PARKING
    B.box(scene,cx-11,cz-12,y+1.6,0.1,3.0,0.1,pm());
    B.box(scene,cx-11,cz-12,y+2.9,2.0,0.7,0.12,new THREE.MeshLambertMaterial({color:0x1e4a1e}));
  }
  function pm(){return new THREE.MeshLambertMaterial({color:0x3a3a2a});}

  function _buildTrainingRange(scene, B) {
    const cx=-155, cz=-108, y=ZS.getTerrainHeight(cx,cz);
    const sm = new THREE.MeshLambertMaterial({color:0x8a7848});
    const wm = new THREE.MeshLambertMaterial({color:0x8a6030});
    // Cible de tir 1
    for(const[tx,tz,h] of [[cx,-100,1.8],[cx-6,-98,1.5],[cx+6,-97,1.8],[cx-3,-115,1.6]]) {
      const ty=ZS.getTerrainHeight(tx,tz);
      B.box(scene,tx,tz,ty+h/2,0.05,h,0.05,wm);
      B.box(scene,tx,tz,ty+h-0.2,0.6,0.9,0.08,new THREE.MeshLambertMaterial({color:0xcc2222}));
    }
    // Murs d'entraînement / haies
    for(const[wx,wz,wl,wd] of [[cx+4,-104,0.25,3],[cx-4,-106,0.25,3],[cx+2,-112,3,0.25]])
      B.wall(scene,wx,wz,y,wl,wd,1.1,sm);
    // Panneaux chrono
    B.box(scene,cx-10,-90,y+1.5,0.1,3.0,0.1,pm());
    B.box(scene,cx-10,-90,y+2.8,2.2,0.65,0.1,new THREE.MeshLambertMaterial({color:0x222288}));
    // Parcours de pneus
    const tyreMat=new THREE.MeshLambertMaterial({color:0x1a1a18});
    for(let i=0;i<5;i++) {
      const tyre=new THREE.Mesh(new THREE.TorusGeometry(0.45,0.12,6,10),tyreMat);
      tyre.rotation.x=Math.PI/2;
      tyre.position.set(cx-6+i*2,-118,y+0.45);
      scene.add(tyre);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ZONE 2 — VIE QUOTIDIENNE (z -130 → -175)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildBarracks(scene, B) {
    const W=16, D=7, wH=3.2;
    // 4 baraquements alignés par paires (ouest et est)
    for(const[cx,cz,doorSide] of [
      [-254,-138, 'E'], [-254,-163, 'E'],
      [-146,-138, 'W'], [-146,-163, 'W'],
    ]) {
      const y=ZS.getTerrainHeight(cx,cz);
      ZS.registerLoot('militaire', cx, cz, W, D);
      B.slab(scene,cx,cz,y,W+0.5,D+0.5,B.M.concDark);
      B.wall(scene,cx,cz-D/2,y,W,0.22,wH,_mMilGreen);
      B.wall(scene,cx,cz+D/2,y,W,0.22,wH,_mMilGreen);
      const dx=doorSide==='W'?-1:1;
      // mur sans porte
      B.wall(scene,cx-dx*W/2,cz,y,0.22,D,wH,_mMilGreen);
      // mur avec porte (2.2m)
      const dw=2.2, sidW=(D-dw)/2;
      B.wall(scene,cx+dx*W/2,cz-dw/2-sidW/2,y,0.22,sidW,wH,_mMilGreen);
      B.wall(scene,cx+dx*W/2,cz+dw/2+sidW/2,y,0.22,sidW,wH,_mMilGreen);
      B.box( scene,cx+dx*W/2,cz,y+wH-0.55,0.22,0.55,dw,_mMilGreen);
      B.slab(scene,cx,cz,y+wH,W+0.4,D+0.4,B.M.roofDark);
      for(const fx of [-5,-1,3,7])
        B.box(scene,cx-W/2+fx+0.5,cz-D/2-0.01,y+1.5,1.4,0.9,0.06,_mGlass);
    }
  }

  function _buildMessHall(scene, B) {
    const cx=-220, cz=-150, W=18, D=11, wH=3.5;
    ZS.registerLoot('supermarche', cx, cz, W, D);
    const y=ZS.getTerrainHeight(cx,cz);
    B.slab(scene,cx,cz,y,W+1,D+1,B.M.concDark);
    B.wall(scene,cx,cz-D/2,y,W,0.25,wH,_mConcrete);
    B.wall(scene,cx,cz+D/2,y,W,0.25,wH,_mConcrete);
    B.wall(scene,cx-W/2,cz,y,0.25,D,wH,_mConcrete);
    // Mur est : 2 portes + fenêtres
    const dw=2.2, sidW=(W-dw*2-2)/2;
    B.wall(scene,cx+W/2,cz-dw-sidW/2-1,y,0.25,sidW,wH,_mConcrete);
    B.wall(scene,cx+W/2,cz+dw+sidW/2+1,y,0.25,sidW,wH,_mConcrete);
    B.wall(scene,cx+W/2,cz,y,0.25,2,wH,_mConcrete);
    for(const dz of [-1.1-dw/2, 1.1+dw/2])
      B.box(scene,cx+W/2,cz+dz,y+wH-0.55,0.25,0.55,dw,_mConcrete);
    B.slab(scene,cx,cz,y+wH,W+0.5,D+0.5,B.M.roofDark);
    for(const fz of [-3,0,3])
      B.box(scene,cx-W/2-0.01,cz+fz,y+1.8,0.06,1.1,1.8,_mGlass);
    // Enseigne (MESS HALL)
    B.box(scene,cx,cz-D/2-0.02,y+2.8,6.0,0.8,0.08,new THREE.MeshLambertMaterial({color:0x3a5a3a}));
    // Tables intérieures (visibles de l'entrée)
    const tblM=new THREE.MeshLambertMaterial({color:0x5a4a30});
    for(const[tx,tz] of [[-226,-148],[-220,-148],[-214,-148],[-226,-152],[-220,-152],[-214,-152]]) {
      B.box(scene,tx,tz,y+0.82,1.8,0.08,0.9,tblM);
      B.box(scene,tx,tz,y+0.5,0.08,1.0,0.08,tblM);
    }
  }

  function _buildMedical(scene, B) {
    const cx=-182, cz=-150, W=12, D=9, wH=3.5;
    ZS.registerLoot('hopital', cx, cz, W, D);
    const y=ZS.getTerrainHeight(cx,cz);
    B.slab(scene,cx,cz,y,W+0.5,D+0.5,B.M.concDark);
    for(const[wx,wz,wl,wd,nc] of [
      [cx,cz-D/2,W,0.25,false],[cx,cz+D/2,W,0.25,false],
      [cx+W/2,cz,0.25,D,false],[cx-W/2,cz-2.5,0.25,4,false],[cx-W/2,cz+2.5,0.25,4,false],
      [cx-W/2,cz,0.25,2.2,true],
    ]) B.wall(scene,wx,wz,y,wl,wd,wH,_mConcrete,nc);
    B.box(scene,cx-W/2,cz,y+wH-0.55,0.25,0.55,2.2,_mConcrete);
    B.slab(scene,cx,cz,y+wH,W+0.4,D+0.4,B.M.roofDark);
    // Croix rouge sur façade
    const redM=new THREE.MeshLambertMaterial({color:0xdd2222});
    B.box(scene,cx+W/2+0.01,cz,y+2.2,0.06,1.0,0.22,redM);
    B.box(scene,cx+W/2+0.01,cz,y+2.2,0.06,0.22,1.0,redM);
    // Lits
    const bedM=new THREE.MeshLambertMaterial({color:0xeeeecc});
    for(const[bx,bz] of [[-187,-148],[-183,-148],[-179,-148],[-187,-153],[-183,-153]])
      B.box(scene,bx,bz,y+0.55,1.9,0.5,0.9,bedM);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ZONE 3 — OPÉRATIONS (z -175 → -215)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildHangar(scene, B) {
    const cx=-200, cz=-193, W=24, D=15, wH=6.5;
    ZS.registerLoot('garage', cx, cz, W, D);
    const y=ZS.getTerrainHeight(cx,cz);
    B.slab(scene,cx,cz,y,W+1,D+1,B.M.concDark);
    B.wall(scene,cx,cz-D/2,y,W,0.28,wH,_mMetal);
    B.wall(scene,cx-W/2,cz,y,0.28,D,wH,_mMetal);
    B.wall(scene,cx+W/2,cz,y,0.28,D,wH,_mMetal);
    const doorW=14, sdW=(W-doorW)/2;
    B.wall(scene,cx-doorW/2-sdW/2,cz+D/2,y,sdW,0.28,wH,_mMetal);
    B.wall(scene,cx+doorW/2+sdW/2,cz+D/2,y,sdW,0.28,wH,_mMetal);
    B.wall(scene,cx,cz+D/2,y+wH-1.5,doorW,0.28,1.5,_mMetal,true);
    B.box(scene,cx-3.5,cz+D/2+0.02,y+wH*0.5-0.75,6.8,wH-1.5,0.06,_mDark);
    B.box(scene,cx+3.5,cz+D/2+0.02,y+wH*0.5-0.75,6.8,wH-1.5,0.06,_mDark);
    B.slab(scene,cx,cz,y+wH,W+0.5,D+0.5,_mMetal);
    for(const px of [-9,-3,3,9])
      B.box(scene,cx+px,cz,y+wH-0.15,0.22,0.38,D,_mDark);
    // Lumière interne
    const il=new THREE.PointLight(0xfff5dd,3.0,30);
    il.position.set(cx,y+5.5,cz); scene.add(il);
  }

  function _buildMotorPool(scene, B) {
    const cx=-253, cz=-193, W=20, D=13, wH=4.5;
    ZS.registerLoot('garage', cx, cz, W, D);
    const y=ZS.getTerrainHeight(cx,cz);
    B.slab(scene,cx,cz,y,W+0.5,D+0.5,B.M.concDark);
    B.wall(scene,cx,cz-D/2,y,W,0.22,wH,_mMilGreen);
    B.wall(scene,cx,cz+D/2,y,W,0.22,wH,_mMilGreen);
    B.wall(scene,cx-W/2,cz,y,0.22,D,wH,_mMilGreen);
    // Façade est : 3 grandes baies
    const bW=4.5, nbayW=(W-bW*3)/4;
    for(const boff of [-1,0,1]) {
      const bx=cx+W/2, bz=cz+boff*5;
      B.wall(scene,bx,bz-bW/2-nbayW/2,y,0.22,nbayW,wH,_mMilGreen);
      B.wall(scene,bx,bz,y+wH-0.6,0.22,bW,0.6,_mMilGreen,true);
      B.box(scene,bx+0.01,bz,y+wH*0.5-0.3,0.07,wH-0.6,bW-0.1,_mDark);
    }
    B.wall(scene,cx+W/2,cz-bW*1.5-nbayW*2,y,0.22,nbayW,wH,_mMilGreen);
    B.wall(scene,cx+W/2,cz+bW*1.5+nbayW*2,y,0.22,nbayW,wH,_mMilGreen);
    B.slab(scene,cx,cz,y+wH,W+0.4,D+0.4,B.M.roofDark);
    // Fosse de graissage (visuel)
    B.slab(scene,cx-5,cz,y-0.3,3,8,new THREE.MeshLambertMaterial({color:0x2a2820}));
    // Outils muraux
    const tkM=new THREE.MeshLambertMaterial({color:0x888880});
    B.box(scene,cx-W/2-0.01,cz-2,y+2.0,0.06,0.8,3.5,tkM);
  }

  function _buildArmory(scene, B) {
    const cx=-147, cz=-193, W=14, D=10, wH=4.0;
    ZS.registerLoot('militaire', cx, cz, W, D);
    const y=ZS.getTerrainHeight(cx,cz);
    B.slab(scene,cx,cz,y,W+0.5,D+0.5,B.M.concDark);
    // Murs épais (armurerie renforcée)
    B.wall(scene,cx,cz-D/2,y,W,0.45,wH,_mConcrete);
    B.wall(scene,cx,cz+D/2,y,W,0.45,wH,_mConcrete);
    B.wall(scene,cx-W/2,cz,y,0.45,D,wH,_mConcrete);
    // Mur ouest : porte blindée unique (1.5m)
    const dw=1.5, sidW=(D-dw)/2;
    B.wall(scene,cx+W/2,cz-dw/2-sidW/2,y,0.45,sidW,wH,_mConcrete);
    B.wall(scene,cx+W/2,cz+dw/2+sidW/2,y,0.45,sidW,wH,_mConcrete);
    B.box(scene,cx+W/2,cz,y+wH-0.55,0.45,0.55,dw,_mConcrete);
    B.box(scene,cx+W/2+0.01,cz,y+1.2,0.06,2.2,1.4,_mDark);  // porte blindée
    B.slab(scene,cx,cz,y+wH,W+0.5,D+0.5,_mConcrete);
    // Barreaux fenêtres
    const barM=new THREE.MeshLambertMaterial({color:0x303028});
    for(const[fx,fz] of [[-3,-D/2],[-3,D/2],[3,-D/2],[3,D/2]])
      B.box(scene,cx+fx,cz+fz*1.01,y+1.8,0.08,1.0,0.08,barM);
    // Râteliers d'armes (intérieur)
    const rkM=new THREE.MeshLambertMaterial({color:0x3a2a10});
    B.box(scene,cx,cz-D/2+0.8,y+1.5,W-1,0.08,0.5,rkM);
    B.box(scene,cx,cz+D/2-0.8,y+1.5,W-1,0.08,0.5,rkM);
    // Panneau ARMURERIE
    B.box(scene,cx-W/2-0.02,cz,y+2.5,0.06,0.8,5.0,new THREE.MeshLambertMaterial({color:0x4a1a1a}));
  }

  function _buildHelipad(scene, B) {
    const cx=-147, cz=-213;
    const y=ZS.getTerrainHeight(cx,cz);
    const padM=new THREE.MeshLambertMaterial({color:0x3a3830,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
    const mkM=new THREE.MeshLambertMaterial({color:0xddcc22,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
    const lm=new THREE.MeshLambertMaterial({color:0xff4422,emissive:0xff2200,emissiveIntensity:2.0});
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(9,9,0.16,16),padM);
    pad.position.set(cx,y+0.08,cz); pad.receiveShadow=true; scene.add(pad);
    B.box(scene,cx,cz,y+0.17,0.6,0.01,6.0,mkM);
    B.box(scene,cx-1.6,cz,y+0.17,0.6,0.01,6.0,mkM);
    B.box(scene,cx+1.6,cz,y+0.17,0.6,0.01,6.0,mkM);
    B.box(scene,cx,cz,y+0.17,4.2,0.01,0.6,mkM);
    for(const[ox,oz] of [[8,0],[-8,0],[0,8],[0,-8]]) {
      B.box(scene,cx+ox,cz+oz,y+0.28,0.5,0.5,0.5,lm);
      const bl=new THREE.PointLight(0xff4400,1.5,12);
      bl.position.set(cx+ox,y+0.5,cz+oz); scene.add(bl);
    }
    // Manches à air
    const wsMat=new THREE.MeshLambertMaterial({color:0xee8822,side:THREE.DoubleSide});
    const ws=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.5,2.0,8,1,true),wsMat);
    ws.position.set(cx+7,y+1.8,cz-7); ws.rotation.z=Math.PI/3; scene.add(ws);
  }

  function _buildFuelDepot(scene, B) {
    const cx=-258, cz=-215;
    const y=ZS.getTerrainHeight(cx,cz);
    const tkM=new THREE.MeshLambertMaterial({color:0x3a5a3a});
    const bM=new THREE.MeshLambertMaterial({color:0xcc2222});
    // 3 cuves cylindriques
    for(const[ox,oz,r,h] of [[0,-4,2.5,5],[4.5,0,2.0,4],[-4.5,0,2.0,4]]) {
      const tank=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),tkM);
      tank.position.set(cx+ox,y+h/2,cz+oz); tank.castShadow=true; scene.add(tank);
      B.addCollider({x:cx+ox,z:cz+oz,r:r+0.1});
      // Bande rouge
      B.box(scene,cx+ox,cz+oz,y+h*0.5,r*2+0.1,0.25,r*2+0.1,bM);
    }
    // Canalisation de connexion
    const pM=new THREE.MeshLambertMaterial({color:0x555550});
    B.box(scene,cx-2,cz,y+1.5,0.2,0.2,4.5,pM);
    B.box(scene,cx+2,cz,y+1.5,0.2,0.2,4.5,pM);
    // Enceinte de rétention
    B.wall(scene,cx,cz-6,y,12,0.25,0.8,_mConcrete);
    B.wall(scene,cx,cz+2.5,y,12,0.25,0.8,_mConcrete);
    B.wall(scene,cx-6,cz-1.75,y,0.25,9.0,0.8,_mConcrete);
    B.wall(scene,cx+6,cz-1.75,y,0.25,9.0,0.8,_mConcrete);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ZONE 4 — COMMANDEMENT (z -215 → -240)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildCommandCenter(scene, B) {
    const cx=-200, cz=-228, W=18, D=12, wH=4.5;
    ZS.registerLoot('militaire', cx, cz, W, D);
    const y=ZS.getTerrainHeight(cx,cz);
    B.slab(scene,cx,cz,y,W+1,D+1,B.M.concDark);
    B.wall(scene,cx,cz-D/2,y,W,0.30,wH,_mConcrete);
    B.wall(scene,cx,cz+D/2,y,W,0.30,wH,_mConcrete);
    B.wall(scene,cx-W/2,cz,y,0.30,D,wH,_mConcrete);
    // Façade sud : 2 portes + fenêtres panoramiques
    const dw=2.2;
    B.wall(scene,cx+W/2,cz-dw-2,y,0.30,D/2-dw-2,wH,_mConcrete);
    B.wall(scene,cx+W/2,cz+D/2-1,y,0.30,1,wH,_mConcrete);
    B.wall(scene,cx+W/2,cz-D/2+1,y,0.30,1,wH,_mConcrete);
    B.box(scene,cx+W/2,cz-dw-2,y+wH-0.6,0.30,0.6,D/2-dw-2,_mConcrete);
    B.box(scene,cx+W/2,cz-dw/2,y+wH-0.6,0.30,0.6,dw,_mConcrete);
    B.box(scene,cx+W/2,cz,y+1.5,0.04,1.8,D-4,_mGlass);  // grande baie vitrée
    B.slab(scene,cx,cz,y+wH,W+0.5,D+0.5,_mConcrete);
    // Antenne principale
    const am=new THREE.MeshLambertMaterial({color:0x505050});
    B.box(scene,cx+6,cz-4,y+wH+4,0.1,8.0,0.1,am);
    B.box(scene,cx+6,cz-4,y+wH+1.5,1.2,0.08,0.08,am);
    B.box(scene,cx+6,cz-4,y+wH+3.0,0.9,0.08,0.08,am);
    B.box(scene,cx+6,cz-4,y+wH+4.5,0.6,0.08,0.08,am);
    // Mât + drapeau
    B.box(scene,cx-7,cz+D/2+1,y+5.0,0.1,10.0,0.1,am);
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.4),
      new THREE.MeshLambertMaterial({color:0x3a6a3a,side:THREE.DoubleSide}));
    fl.position.set(cx-5.7,y+9.6,cz+D/2+1); fl.rotation.y=0.3; scene.add(fl);
    // Table de commandement
    B.box(scene,cx,cz,y+0.95,8,0.1,3,new THREE.MeshLambertMaterial({color:0x3a3228}));
    B.box(scene,cx,cz,y+0.5,0.1,0.95,3,new THREE.MeshLambertMaterial({color:0x3a3228}));
  }

  function _buildBriefingRoom(scene, B) {
    const cx=-240, cz=-226, W=12, D=9, wH=3.5;
    ZS.registerLoot('militaire', cx, cz, W, D);
    const y=ZS.getTerrainHeight(cx,cz);
    B.slab(scene,cx,cz,y,W+0.5,D+0.5,B.M.concDark);
    B.wall(scene,cx,cz-D/2,y,W,0.25,wH,_mMilGreen);
    B.wall(scene,cx,cz+D/2,y,W,0.25,wH,_mMilGreen);
    B.wall(scene,cx-W/2,cz,y,0.25,D,wH,_mMilGreen);
    const dw=1.8,sidW=(D-dw)/2;
    B.wall(scene,cx+W/2,cz-dw/2-sidW/2,y,0.25,sidW,wH,_mMilGreen);
    B.wall(scene,cx+W/2,cz+dw/2+sidW/2,y,0.25,sidW,wH,_mMilGreen);
    B.box(scene,cx+W/2,cz,y+wH-0.5,0.25,0.5,dw,_mMilGreen);
    B.slab(scene,cx,cz,y+wH,W+0.4,D+0.4,B.M.roofDark);
    // Grande carte murale
    B.box(scene,cx-W/2-0.01,cz,y+2.1,0.06,1.6,6.0,new THREE.MeshLambertMaterial({color:0x3a5a7a}));
    // Table de briefing + chaises
    const tM=new THREE.MeshLambertMaterial({color:0x4a3a20});
    B.box(scene,cx,cz,y+0.88,6,0.1,2.5,tM);
    for(const[rx,rz] of [[-2.5,-1.2],[-2.5,0],[-2.5,1.2],[0,-1.2],[0,1.2],[2.5,-1.2],[2.5,0],[2.5,1.2]])
      B.box(scene,cx+rx,cz+rz,y+0.5,0.55,1.0,0.55,tM);
  }

  function _buildCommsT(scene, B) {
    const cx=-163, cz=-230, y=ZS.getTerrainHeight(cx,cz);
    const H=18, lm=new THREE.MeshLambertMaterial({color:0x404038});
    // Treillis de la tour
    for(const[ox,oz] of [[-0.8,-0.8],[0.8,-0.8],[-0.8,0.8],[0.8,0.8]]) {
      B.box(scene,cx+ox,cz+oz,y+H/2,0.12,H,0.12,lm);
      B.addCollider({x:cx+ox,z:cz+oz,r:0.1});
    }
    for(const bH of [3,6,9,12,15]) {
      B.box(scene,cx,cz,y+bH,2.2,0.1,2.2,lm);
      B.box(scene,cx,cz,y+bH,0.1,0.1,2.2,lm);
    }
    // Flèche
    B.box(scene,cx,cz,y+H,0.12,4.0,0.12,lm);
    // Antennes / paraboles
    const dm=new THREE.MeshLambertMaterial({color:0x909088});
    for(const[oz,sz] of [[0,1.4],[-1,0.9],[1,0.9]]) {
      const dish=new THREE.Mesh(new THREE.SphereGeometry(sz*0.4,8,6,0,Math.PI*2,0,Math.PI/2),dm);
      dish.position.set(cx+1,y+H-3+oz,cz+oz);
      dish.rotation.z=-Math.PI/2; scene.add(dish);
    }
    // Lumière clignotante (simulée : rouge au sommet)
    const blM=new THREE.MeshLambertMaterial({color:0xff2200,emissive:0xff0000,emissiveIntensity:2.5});
    B.box(scene,cx,cz,y+H+2.1,0.25,0.25,0.25,blM);
  }

  function _buildBunker(scene, B) {
    const cx=-200, cz=-237, W=10, D=7, wH=2.5;
    ZS.registerLoot('militaire', cx, cz, W, D);
    const y=ZS.getTerrainHeight(cx,cz);
    const bkM=new THREE.MeshLambertMaterial({color:0x6a6860});
    B.slab(scene,cx,cz,y-0.3,W+4,D+4,B.M.dirt);
    B.slab(scene,cx,cz,y,W+1,D+1,bkM);
    B.wall(scene,cx,cz-D/2,y,W,0.6,wH,bkM);
    B.wall(scene,cx,cz+D/2,y,W,0.6,wH,bkM);
    B.wall(scene,cx-W/2,cz,y,0.6,D,wH,bkM);
    B.wall(scene,cx+W/2,cz,y,0.6,D,wH,bkM);
    B.slab(scene,cx,cz,y+wH,W+0.9,D+0.9,bkM);
    B.slab(scene,cx,cz,y+wH+0.6,W+0.7,D+0.7,bkM);
    B.box(scene,cx+W/2+0.01,cz,y+1.2,0.1,2.4,1.8,_mDark);  // porte blindée
    for(const[ox,oz] of [[-3,0],[3,0]])
      B.box(scene,cx+ox,cz-D/2,y+wH+0.7,0.8,0.8,0.8,_mDark);
    // Entrée souterraine (marches vers le bas)
    B.slab(scene,cx+W/2+2,cz,y,3,3,_mConcrete);
    for(let i=0;i<4;i++) B.box(scene,cx+W/2+1.2+i*0.5,cz,y-i*0.25+0.2,0.5,0.1,2.5,bkM);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // AMBIANCE
  // ══════════════════════════════════════════════════════════════════════════════

  function _tent(scene, B, cx, cz, W, D, col) {
    const y=ZS.getTerrainHeight(cx,cz);
    const wH=1.7, rH=3.4;
    const cv=new THREE.MeshLambertMaterial({color:col,side:THREE.DoubleSide});
    const pl=new THREE.MeshLambertMaterial({color:0x3a2a10});
    B.slab(scene,cx,cz,y+0.02,W+0.6,D+0.6,new THREE.MeshLambertMaterial({color:0x7a6a4a}));
    B.wall(scene,cx,cz-D/2,y,W,0.08,wH,cv);
    B.wall(scene,cx,cz+D/2,y,W,0.08,wH,cv);
    B.wall(scene,cx-W/2,cz,y,0.08,D,wH,cv);
    B.wall(scene,cx+W/2,cz,y,0.08,D,wH,cv);
    for(const ox of [-W/2+0.3, W/2-0.3])
      B.box(scene,cx+ox,cz,y+rH/2,0.1,rH,0.1,pl);
    B.box(scene,cx,cz,y+rH,W-0.5,0.1,0.1,pl);
    const span=Math.hypot(W/2,rH-wH), angle=Math.atan2(rH-wH,W/2);
    const midH=y+wH+(rH-wH)/2;
    for(const side of [-1,1]) {
      const pan=new THREE.Mesh(new THREE.PlaneGeometry(span+0.15,D+0.25),cv);
      pan.rotation.z=side*angle; pan.position.set(cx+side*W/4,midH,cz); scene.add(pan);
    }
  }

  function _buildTents(scene, B) {
    _tent(scene,B,-175,-110,4,6,0x4a5a30);
    _tent(scene,B,-225,-110,4,6,0x9a8460);
    _tent(scene,B,-200,-125,5,8,0x3a4828);
    _tent(scene,B,-175,-205,4,6,0x4a5a30);
    _tent(scene,B,-225,-205,4,6,0x9a8460);
  }

  function _buildVehicles(scene, B) {
    const mg = 0x3a4a2a;
    // Tank devant motor pool
    _buildTank(scene,B,-235,-180,mg);
    // Hélicoptère sur héliport
    _buildHelicopter(scene,-147,-213);
    // Camion citerne devant dépôt carburant
    _buildTruck(scene,B,-255,-208,mg);
  }

  function _buildTank(scene, B, cx, cz, col) {
    const y=ZS.getTerrainHeight(cx,cz);
    const hM=new THREE.MeshLambertMaterial({color:col});
    const dM=new THREE.MeshLambertMaterial({color:0x1a1a18});
    const g=new THREE.Group();
    const hull=new THREE.Mesh(new THREE.BoxGeometry(3.8,1.1,6.5),hM);
    hull.position.y=0.8; hull.castShadow=true; g.add(hull);
    const turret=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.9,3.2),hM);
    turret.position.set(0,1.75,-0.4); turret.castShadow=true; g.add(turret);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.15,4.5,8),dM);
    barrel.rotation.x=Math.PI/2; barrel.position.set(0,1.9,-3.2); g.add(barrel);
    for(const ox of [-2.0,2.0]) {
      const tr=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.72,6.8),dM);
      tr.position.set(ox,0.42,0); g.add(tr);
    }
    for(const[ox,oz] of [[-2,-2.5],[-2,0],[-2,2.5],[2,-2.5],[2,0],[2,2.5]]) {
      const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.44,0.6,8),dM);
      wh.rotation.z=Math.PI/2; wh.position.set(ox,0.44,oz); g.add(wh);
    }
    g.position.set(cx,y,cz); g.rotation.y=0.2; scene.add(g);
    B.addCollider({type:'box',cx,cz,hw:2.0,hd:3.5,maxY:y+1.7});
  }

  function _buildTruck(scene, B, cx, cz, col) {
    const y=ZS.getTerrainHeight(cx,cz);
    const bM=new THREE.MeshLambertMaterial({color:col});
    const dM=new THREE.MeshLambertMaterial({color:0x181818});
    const g=new THREE.Group();
    const cab=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.0,3.0),bM);
    cab.position.set(0,1.1,-3.0); cab.castShadow=true; g.add(cab);
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,4.5,10),
      new THREE.MeshLambertMaterial({color:0x3a5a3a}));
    tank.rotation.z=Math.PI/2; tank.position.set(0,1.5,1.5); g.add(tank);
    const frame=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.4,9.0),bM);
    frame.position.set(0,0.3,0); g.add(frame);
    for(const[ox,oz] of [[-1.3,-3.5],[1.3,-3.5],[-1.3,-1.5],[1.3,-1.5],[-1.3,1.5],[1.3,1.5],[-1.3,3.5],[1.3,3.5]]) {
      const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.3,8),dM);
      wh.rotation.z=Math.PI/2; wh.position.set(ox,0.5,oz); g.add(wh);
    }
    g.position.set(cx,y,cz); g.rotation.y=Math.PI/2; scene.add(g);
    B.addCollider({type:'box',cx,cz,hw:4.7,hd:1.4,maxY:y+2.1});
  }

  function _buildHelicopter(scene, cx, cz) {
    const y=ZS.getTerrainHeight(cx,cz);
    const hM=new THREE.MeshLambertMaterial({color:0x3a4830});
    const dM=new THREE.MeshLambertMaterial({color:0x1e2218});
    const gM=new THREE.MeshLambertMaterial({color:0x4a7a88,transparent:true,opacity:0.55});
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.4,5.5),hM);
    body.position.y=0.9; body.castShadow=true; g.add(body);
    const cock=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.1,1.8),gM);
    cock.position.set(0,0.95,-2.7); g.add(cock);
    const tail=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.45,3.5),hM);
    tail.position.set(0,1.3,3.8); g.add(tail);
    for(const ox of [-0.8,0.8]) {
      const sk=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,5.5,6),dM);
      sk.rotation.z=Math.PI/2; sk.rotation.y=Math.PI/2; sk.position.set(ox,0.14,0); g.add(sk);
    }
    g.position.set(cx,y+0.1,cz); g.rotation.y=-0.4; scene.add(g);
  }

  function _buildProps(scene, B) {
    const y=ZS.getTerrainHeight(CX,CZ);
    const oilM=new THREE.MeshLambertMaterial({color:0x1e1e18});
    const cratM=new THREE.MeshLambertMaterial({color:0x5a6230});
    const sandM=new THREE.MeshLambertMaterial({color:0x8a7848});
    const barbCoilM=new THREE.MeshLambertMaterial({color:0x5a4828});
    const coneM=new THREE.MeshLambertMaterial({color:0xdd4411});
    const signPolM=new THREE.MeshLambertMaterial({color:0x3a3a2a});

    // Fûts devant dépôt carburant
    for(const[ox,oz] of [[-2,2],[-1,2],[0,2],[-2,3],[-1,3]])
      B.box(scene,-252+ox,-207+oz,y+0.55,0.55,1.1,0.55,oilM);
    // Caisses munitions zones diverses
    for(const[bx,bz] of [[-197,-128],[-195,-128],[-197,-129.5],[-170,-200],[-168,-200]])
      B.box(scene,bx,bz,y+0.45,1.0,0.9,0.6,cratM);
    // Sacs de sable portail
    for(const[ox,oz] of [[-4,2.5],[-3,2.5],[4,2.5],[3,2.5]])
      B.box(scene,CX+ox,Z1+oz,y+0.3,0.9,0.58,0.55,sandM);
    // Sacs de sable checkpoint intérieur
    for(const[ox,oz] of [[-14,-2],[-14,-1],[-14,0],[14,-2],[14,-1],[14,0]])
      B.box(scene,CX+ox,-100+oz,y+0.3,0.9,0.58,0.55,sandM);
    // Rouleaux barbelés (intérieur)
    for(const rx of [-258,-235,-215,-185,-162,-142]) {
      const coil=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.1,6,12),barbCoilM);
      coil.rotation.x=Math.PI/2; coil.position.set(rx,y+0.5,Z1+1.2); scene.add(coil);
    }
    // Cônes à l'entrée
    for(const cx2 of [GATE_L-2,GATE_L-4,GATE_R+2,GATE_R+4]) {
      const cy=ZS.getTerrainHeight(cx2,Z1-1);
      const cone=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.65,6),coneM);
      cone.position.set(cx2,cy+0.33,Z1-1); scene.add(cone);
    }
    // Panneaux ZONE MILITAIRE
    for(const[sx,sz] of [[GATE_L-6,Z1+1],[GATE_R+6,Z1+1]]) {
      const sy=ZS.getTerrainHeight(sx,sz);
      B.box(scene,sx,sz,sy+1.5,0.1,3.0,0.1,signPolM);
      B.box(scene,sx,sz,sy+2.8,2.2,0.75,0.1,new THREE.MeshLambertMaterial({color:0x882222}));
    }
    // Boîtes électriques / groupes électrogènes
    const genM=new THREE.MeshLambertMaterial({color:0x4a5a30});
    for(const[gx,gz] of [[-268,-130],[-268,-170],[X1-5,-130],[X1-5,-170]]) {
      B.box(scene,gx,gz,y+0.7,1.4,1.4,1.0,genM);
      B.box(scene,gx,gz,y+1.45,1.6,0.12,1.2,genM);
    }
  }

  function _buildLights(scene, B) {
    const polM=new THREE.MeshLambertMaterial({color:0x2a2a22});
    const headM=new THREE.MeshLambertMaterial({color:0xffffcc,emissive:0xffeeaa,emissiveIntensity:2.5});
    // Lampadaires sur axe N-S
    for(const pz of [-100,-130,-165,-195,-220]) {
      for(const px of [CX-5, CX+5]) {
        const py=ZS.getTerrainHeight(px,pz);
        B.box(scene,px,pz,py+4.0,0.12,8.0,0.12,polM);
        B.addCollider({x:px,z:pz,r:0.1});
        B.box(scene,px,pz+(px<CX?0.8:-0.8),py+8.2,0.55,0.32,0.8,headM);
        const pt=new THREE.PointLight(0xffeedd,5.5,50);
        pt.position.set(px,py+7.9,pz+(px<CX?1.0:-1.0)); scene.add(pt);
      }
    }
    // Lampadaires intérieur zones
    for(const[lx,lz] of [[-220,-90],[-180,-90],[-252,-160],[-148,-160],[-252,-210],[-148,-210]]) {
      const ly=ZS.getTerrainHeight(lx,lz);
      B.box(scene,lx,lz,ly+4.0,0.12,8.0,0.12,polM);
      B.addCollider({x:lx,z:lz,r:0.1});
      B.box(scene,lx,lz,ly+8.2,0.55,0.32,0.8,headM);
      const pt=new THREE.PointLight(0xffeedd,5.0,45);
      pt.position.set(lx,ly+7.8,lz); scene.add(pt);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  // Routes désactivées — brick 0 (voir road_network.js)
  ZS.Buildings.registerSector({ build, roads: [] });
}());
