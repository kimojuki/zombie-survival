// Config + clôtures + routes
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
