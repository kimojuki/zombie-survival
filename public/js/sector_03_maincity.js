// SECTOR 03 — MAIN CITY  (nord-est de la forêt, dans les limites de la carte)
// Terrain : X -300→+300, Z -300→+300. Ville dans X:90-260, Z:-110 à -280
(function () {
  'use strict';

  // Centre ville — bien dans les limites monde
  const CX = 175, CZ = -195;

  ZS.registerFlatZone(CX, CZ, 85, 90, 15);

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
    _buildDebris(scene, B);
  }

  // ── Matériaux ─────────────────────────────────────────────────────────────────
  const mConc  = new THREE.MeshLambertMaterial({ color: 0x8a8070 });
  const mDark  = new THREE.MeshLambertMaterial({ color: 0x2a2820 });
  const mGlass = new THREE.MeshLambertMaterial({ color: 0x5a8898, transparent: true, opacity: 0.55 });
  const mGlDk  = new THREE.MeshLambertMaterial({ color: 0x3a5560, transparent: true, opacity: 0.45 });
  const mRoof  = new THREE.MeshLambertMaterial({ color: 0x3e3228 });
  const mAsph  = new THREE.MeshLambertMaterial({ color: 0x323028, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
  const mRed   = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
  const mSign  = new THREE.MeshLambertMaterial({ color: 0x1a3a5a });

  // ── Réseau routier ────────────────────────────────────────────────────────────

  function _buildAllRoads(scene, B) {
    const M = B.M;
    const ty = ZS.getTerrainHeight(CX, CZ);

    // Route d'accès depuis la forêt (sud-ouest → nord-est)
    B.ribbon(scene, [[0,-5],[28,-45],[58,-90],[82,-138],[90,-175],[90,-195]], 6.0, M.roadDirt, false);

    // Route principale E-O (z=-195, spine de la ville)
    B.ribbon(scene, [[90,-195],[120,-195],[155,-195],[175,-195],[200,-195],[230,-195],[258,-195]], 8.0, M.road, false);
    // Rue nord (z=-252)
    B.ribbon(scene, [[90,-252],[120,-252],[155,-252],[175,-252],[210,-252],[248,-252]], 6.0, M.road, false);
    // Rue sud (z=-142)
    B.ribbon(scene, [[90,-142],[120,-142],[155,-142],[175,-142],[210,-142],[248,-142]], 6.0, M.road, false);

    // Avenue principale N-S (x=175)
    B.ribbon(scene, [[175,-108],[175,-145],[175,-195],[175,-252],[175,-278]], 7.0, M.road, false);
    // Rue N-S est (x=240)
    B.ribbon(scene, [[240,-108],[240,-145],[240,-195],[240,-252],[240,-278]], 5.5, M.road, false);
    // Rue N-S ouest (x=112)
    B.ribbon(scene, [[112,-108],[112,-145],[112,-195],[112,-252],[112,-278]], 5.0, M.road, false);

    // Trottoirs route principale
    const trot = new THREE.MeshLambertMaterial({ color: 0x7a7268, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -5 });
    B.slab(scene, 174, -200, ty+0.07, 170, 2.5, trot);
    B.slab(scene, 174, -190, ty+0.07, 170, 2.5, trot);

    // Passages piétons
    const zebM = new THREE.MeshLambertMaterial({ color: 0xc8c0b0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
    for (const [zx,zz] of [[175,-195],[240,-195],[112,-195]]) {
      for (let k = -3; k <= 3; k++)
        B.box(scene, zx, zz+k*1.4, ty+0.09, 6.5, 0.01, 0.5, zebM);
    }

    // Bandes vertes séparatrices
    const gM = new THREE.MeshLambertMaterial({ color: 0x3a5a28, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 });
    B.slab(scene, 174, -252, ty+0.04, 3, 30, gM);
    B.slab(scene, 174, -142, ty+0.04, 3, 25, gM);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HÔPITAL — NW (x≈125, z≈-263)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildHospital(scene, B) {
    const cx=125, cz=-263, W=20, D=13, wH=14.0;
    const y=ZS.getTerrainHeight(cx,cz);
    const hM=new THREE.MeshLambertMaterial({color:0x9aa8b0});
    B.slab(scene,cx,cz,y,W+1,D+1,mConc);
    B.wall(scene,cx,cz-D/2,y,W,0.28,wH,hM); B.wall(scene,cx,cz+D/2,y,W,0.28,wH,hM);
    B.wall(scene,cx-W/2,cz,y,0.28,D,wH,hM); B.wall(scene,cx+W/2,cz,y,0.28,D,wH,hM);
    B.slab(scene,cx,cz,y+wH,W+0.4,D+0.4,new THREE.MeshLambertMaterial({color:0x4a4840}));
    for(let fl=0;fl<5;fl++){const fy=y+1.5+fl*2.8;
      for(const fx of[-6,-1,4]){B.box(scene,cx+fx,cz-D/2-0.01,fy,1.8,1.5,0.07,mGlass);B.box(scene,cx+fx,cz+D/2+0.01,fy,1.8,1.5,0.07,mGlass);}
      for(const fz of[-4,0,4]){B.box(scene,cx-W/2-0.01,cz+fz,fy,0.07,1.5,1.6,mGlass);B.box(scene,cx+W/2+0.01,cz+fz,fy,0.07,1.5,1.6,mGlass);}
    }
    // Aile urgences (extension sud)
    const ex=cx+3,ez=cz+D/2+4.5,ey=y;
    B.slab(scene,ex,ez,ey,10,7,mConc);
    B.wall(scene,ex,ez-3.5,ey,10,0.22,4.5,hM); B.wall(scene,ex,ez+3.5,ey,10,0.22,4.5,hM);
    B.wall(scene,ex+5,ez,ey,0.22,7,4.5,hM);
    B.slab(scene,ex,ez,ey+4.5,10.4,7.4,new THREE.MeshLambertMaterial({color:0x4a4840}));
    B.box(scene,ex-5,ez,ey+1.8,0.07,3.0,3.0,mGlDk);
    // Croix rouge
    B.box(scene,cx,cz-D/2-0.02,y+8,0.06,3.0,0.5,mRed);
    B.box(scene,cx,cz-D/2-0.02,y+8,0.06,0.5,3.0,mRed);
    B.box(scene,cx,cz-D/2-0.02,y+wH-1.2,0.06,1.4,9,new THREE.MeshLambertMaterial({color:0x1a4a6a}));
    // Hélipad
    B.slab(scene,cx-4,cz-3,y+wH+0.2,6,6,new THREE.MeshLambertMaterial({color:0x3a3830}));
    const mk=new THREE.MeshLambertMaterial({color:0xddcc22});
    B.box(scene,cx-4,cz-3,y+wH+0.25,1.2,0.01,6,mk); B.box(scene,cx-4,cz-3,y+wH+0.25,6,0.01,1.2,mk);
    // Ambulances
    _ambulance(scene,B,cx-8,cz+D/2+2,0); _ambulance(scene,B,cx-8,cz+D/2+6,0);
  }

  function _ambulance(scene,B,cx,cz,ry){
    const y=ZS.getTerrainHeight(cx,cz);
    const wM=new THREE.MeshLambertMaterial({color:0xeeeedd}),rM=new THREE.MeshLambertMaterial({color:0xcc2222}),dM=new THREE.MeshLambertMaterial({color:0x181818});
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(2.0,1.6,4.2),wM);body.position.y=0.93;body.castShadow=true;g.add(body);
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.05,0.32,4.25),rM);stripe.position.y=0.7;g.add(stripe);
    const glass=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.6,0.05),mGlass);glass.position.set(0,1.38,-2.12);g.add(glass);
    for(const[ox,oz]of[[-1.0,-1.3],[1.0,-1.3],[-1.0,1.3],[1.0,1.3]]){
      const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.22,8),dM);wh.rotation.z=Math.PI/2;wh.position.set(ox,0.36,oz);g.add(wh);
    }
    g.position.set(cx,y,cz);g.rotation.y=ry;scene.add(g);
    B.addCollider({type:'box',cx,cz,hw:1.05,hd:2.2,maxY:y+1.7});
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SUPERMARCHÉ — NE (x≈222, z≈-263)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildSupermarket(scene,B){
    const cx=222,cz=-263,W=26,D=16,wH=5.0;
    const y=ZS.getTerrainHeight(cx,cz);
    const sM=new THREE.MeshLambertMaterial({color:0x6a7880});
    B.slab(scene,cx,cz,y,W+2,D+2,mConc);
    B.wall(scene,cx,cz-D/2,y,W,0.26,wH,sM); B.wall(scene,cx,cz+D/2,y,W,0.26,wH,sM);
    B.wall(scene,cx-W/2,cz,y,0.26,D,wH,sM);
    // Façade est : vitrine + 2 entrées
    const dw=3.5,midW=(D-dw*2-3)/2;
    B.wall(scene,cx+W/2,cz+midW/2+dw+1.5,y,0.26,midW,wH,sM);
    B.wall(scene,cx+W/2,cz-midW/2-dw-1.5,y,0.26,midW,wH,sM);
    B.box(scene,cx+W/2,cz,y+2.0,0.07,2.2,D-midW*2-dw*2-3,mGlass);
    B.box(scene,cx+W/2,cz-dw/2-0.8,y+wH-0.6,0.26,0.6,dw,sM);
    B.box(scene,cx+W/2,cz+dw/2+0.8,y+wH-0.6,0.26,0.6,dw,sM);
    B.slab(scene,cx,cz,y+wH,W+0.5,D+0.5,mRoof);
    B.box(scene,cx+W/2+2,cz,y+wH-0.3,4,0.16,D+1,new THREE.MeshLambertMaterial({color:0x3a5878}));
    B.box(scene,cx+W/2+0.01,cz,y+wH-1.6,0.06,1.2,15,new THREE.MeshLambertMaterial({color:0x1a5a28}));
    // Parking + chariots
    B.slab(scene,cx+W/2+6,cz,y+0.05,8,15,mAsph);
    const cM=new THREE.MeshLambertMaterial({color:0x888880});
    for(const[ox,oz]of[[cx+W/2+3,cz-3],[cx+W/2+5,cz+2],[cx+W/2+7,cz-4]])B.box(scene,ox,oz,ZS.getTerrainHeight(ox,oz)+0.32,0.9,0.65,0.45,cM);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // COMMISSARIAT — SW (x≈122, z≈-128)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildPoliceStation(scene,B){
    const cx=122,cz=-128,W=16,D=12,wH=7.0;
    const y=ZS.getTerrainHeight(cx,cz);
    const pM=new THREE.MeshLambertMaterial({color:0x6a6a78});
    B.slab(scene,cx,cz,y,W+1,D+1,mConc);
    B.wall(scene,cx,cz-D/2,y,W,0.26,wH,pM); B.wall(scene,cx,cz+D/2,y,W,0.26,wH,pM);
    B.wall(scene,cx-W/2,cz,y,0.26,D,wH,pM);
    const dw=2.8,sidW=(D-dw)/2;
    B.wall(scene,cx+W/2,cz-dw/2-sidW/2,y,0.26,sidW,wH,pM);
    B.wall(scene,cx+W/2,cz+dw/2+sidW/2,y,0.26,sidW,wH,pM);
    B.box(scene,cx+W/2,cz,y+wH-0.55,0.26,0.55,dw,pM);
    B.slab(scene,cx,cz,y+wH,W+0.4,D+0.4,new THREE.MeshLambertMaterial({color:0x3a3830}));
    for(let fl=0;fl<2;fl++){const fy=y+1.8+fl*3.2;
      for(const fz of[-4,0,4])B.box(scene,cx,cz+fz,fy,1.6,1.3,0.06,mGlDk);
    }
    // Drapeau
    B.box(scene,cx+W/2+1,cz-D/2,y+5.5,0.08,4.5,0.08,new THREE.MeshLambertMaterial({color:0x2a2a22}));
    const f=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.1),new THREE.MeshLambertMaterial({color:0x1a3a8a,side:THREE.DoubleSide}));
    f.position.set(cx+W/2+2,y+9.4,cz-D/2);scene.add(f);
    B.box(scene,cx+W/2+0.01,cz,y+wH-2,0.06,0.9,9,mSign);
    for(const bz of[-4.5,-2.5,-0.5,1.5,3.5])B.box(scene,cx+W/2+2,cz+bz,y+0.5,0.55,1.0,0.5,mConc);
    B.car(scene,cx+W/2+5.5,cz-2.5,0.1,0x1a1a3a); B.car(scene,cx+W/2+5.5,cz+2.5,-0.1,0x1a1a3a);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ÉCOLE — SE (x≈222, z≈-126)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildSchool(scene,B){
    const cx=222,cz=-126,W=18,D=11,wH=6.0;
    const y=ZS.getTerrainHeight(cx,cz);
    const eM=new THREE.MeshLambertMaterial({color:0xa07848});
    B.slab(scene,cx,cz,y,W+1,D+2,mConc);
    B.wall(scene,cx,cz-D/2,y,W,0.24,wH,eM); B.wall(scene,cx,cz+D/2,y,W,0.24,wH,eM);
    B.wall(scene,cx-W/2,cz,y,0.24,D,wH,eM);
    const dw=2.2,sidW=(D-dw)/2;
    B.wall(scene,cx+W/2,cz-dw/2-sidW/2,y,0.24,sidW,wH,eM);
    B.wall(scene,cx+W/2,cz+dw/2+sidW/2,y,0.24,sidW,wH,eM);
    B.box(scene,cx+W/2,cz,y+wH-0.5,0.24,0.5,dw,eM);
    B.slab(scene,cx,cz,y+wH,W+0.4,D+0.4,B.M.roofRed);
    for(let fl=0;fl<2;fl++){const fy=y+1.7+fl*2.8;
      for(const fx of[-6,-2,2,6]){B.box(scene,cx+fx,cz-D/2-0.01,fy,1.5,1.3,0.07,mGlass);B.box(scene,cx+fx,cz+D/2+0.01,fy,1.5,1.3,0.07,mGlass);}
    }
    B.box(scene,cx+W/2+0.01,cz,y+4,0.06,0.7,7,new THREE.MeshLambertMaterial({color:0x1a4a1a}));
    // Cour
    B.slab(scene,cx-1,cz-D/2-7,y+0.04,20,9,new THREE.MeshLambertMaterial({color:0x4a5038}));
    const fM=new THREE.MeshLambertMaterial({color:0x444444});
    B.box(scene,cx-1,cz-D/2-12,y+1.5,21,2.8,0.12,fM);
    B.box(scene,cx-11.5,cz-D/2-7,y+1.5,0.12,2.8,9,fM);
    B.box(scene,cx+9.5,cz-D/2-7,y+1.5,0.12,2.8,9,fM);
    // Bus scolaire
    _schoolBus(scene,B,cx+W/2+4.5,cz-D/2-3,0);
  }

  function _schoolBus(scene,B,cx,cz,ry){
    const y=ZS.getTerrainHeight(cx,cz);
    const yM=new THREE.MeshLambertMaterial({color:0xddbb00}),dM=new THREE.MeshLambertMaterial({color:0x181818});
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.0,8.0),yM);body.position.y=1.1;body.castShadow=true;g.add(body);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(2.3,0.24,7.8),yM);roof.position.set(0,2.2,0);g.add(roof);
    const fw=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.95,0.07),mGlass);fw.position.set(0,1.65,-3.97);g.add(fw);
    for(let i=0;i<4;i++)for(const sx of[-1.22,1.22]){const w=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.65,1.3),mGlass);w.position.set(sx,1.6,-2.3+i*1.5);g.add(w);}
    for(const[ox,oz]of[[-1.2,-2.8],[1.2,-2.8],[-1.2,0],[1.2,0],[-1.2,2.8],[1.2,2.8]]){
      const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.43,0.43,0.25,9),dM);wh.rotation.z=Math.PI/2;wh.position.set(ox,0.44,oz);g.add(wh);
    }
    g.position.set(cx,y,cz);g.rotation.y=ry;scene.add(g);
    B.addCollider({type:'box',cx,cz,hw:1.3,hd:4.1,maxY:y+2.25});
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CENTRE COMMERCIAL — centre-ouest (x≈145, z≈-195)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildShoppingCenter(scene,B){
    const cx=145,cz=-195,W=24,D=18,wH=5.0;
    const y=ZS.getTerrainHeight(cx,cz);
    const cM=new THREE.MeshLambertMaterial({color:0x7a7880});
    B.slab(scene,cx,cz,y,W+1,D+1,mConc);
    B.wall(scene,cx,cz-D/2,y,W,0.26,wH,cM); B.wall(scene,cx,cz+D/2,y,W,0.26,wH,cM); B.wall(scene,cx-W/2,cz,y,0.26,D,wH,cM);
    // Façade est : vitrines
    B.box(scene,cx+W/2+0.01,cz,y+2.0,0.07,2.2,D*0.65,mGlass);
    B.wall(scene,cx+W/2,cz-D/2+2.5,y,0.26,5,wH,cM); B.wall(scene,cx+W/2,cz+D/2-2.5,y,0.26,5,wH,cM);
    B.box(scene,cx+W/2,cz,y+wH-0.5,0.26,0.5,D-12,cM);
    B.slab(scene,cx,cz,y+wH,W+0.5,D+0.5,mRoof);
    B.box(scene,cx+W/2+2,cz,y+wH-0.35,4,0.16,D-10,new THREE.MeshLambertMaterial({color:0x3a4860}));
    B.box(scene,cx+W/2+0.01,cz-4,y+wH-1.2,0.06,0.75,5,new THREE.MeshLambertMaterial({color:0x884422}));
    B.box(scene,cx+W/2+0.01,cz+4,y+wH-1.2,0.06,0.75,5,new THREE.MeshLambertMaterial({color:0x224488}));
    // Rayonnages intérieurs
    const shM=new THREE.MeshLambertMaterial({color:0x6a5a38});
    for(const[sx,sz]of[[140,-200],[145,-200],[150,-200],[140,-190],[145,-190],[150,-190]])B.box(scene,sx,sz,y+1.5,0.1,3.0,5,shM);
    B.car(scene,cx+W/2+3,cz-6,Math.PI*0.55,0x2a2a28);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HÔTEL TOUR — centre-est (x≈242, z≈-215)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildHotel(scene,B){
    const cx=242,cz=-215,W=10,D=8,wH=20;
    const y=ZS.getTerrainHeight(cx,cz);
    const htM=new THREE.MeshLambertMaterial({color:0x606870});
    B.slab(scene,cx,cz,y,W+1,D+1,mConc);
    B.wall(scene,cx,cz-D/2,y,W,0.25,wH,htM); B.wall(scene,cx,cz+D/2,y,W,0.25,wH,htM); B.wall(scene,cx-W/2,cz,y,0.25,D,wH,htM);
    B.box(scene,cx+W/2+0.01,cz,y+2.0,0.07,wH-3,D-0.5,mGlass);
    B.slab(scene,cx,cz,y+wH,W+0.4,D+0.4,mDark);
    B.box(scene,cx,cz,y+wH+0.5,W-1,1.1,D-1,htM);
    for(let fl=1;fl<8;fl++)B.box(scene,cx,cz,y+fl*2.5,W+0.1,0.1,D+0.1,new THREE.MeshLambertMaterial({color:0x8a9098}));
    B.box(scene,cx-W/2-0.01,cz,y+wH-3,0.06,1.6,6,mSign);
    // Balcon effondré
    const rubM=new THREE.MeshLambertMaterial({color:0x706a60});
    B.box(scene,cx-W/2-1.2,cz+1.5,y+2.5,2.8,0.38,2.2,rubM);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // BUREAUX & BANQUE — centre-ouest (x≈108)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildOffices(scene,B){
    // Bureaux nord
    const bAx=108,bAz=-218,bAW=14,bAD=10,bAwH=10.5;
    const y1=ZS.getTerrainHeight(bAx,bAz);
    const oM=new THREE.MeshLambertMaterial({color:0x7a8090});
    B.slab(scene,bAx,bAz,y1,bAW+1,bAD+1,mConc);
    for(const[x,z,lx,lz,h]of[[bAx,bAz-bAD/2,bAW,0.25,bAwH],[bAx,bAz+bAD/2,bAW,0.25,bAwH],[bAx-bAW/2,bAz,0.25,bAD,bAwH],[bAx+bAW/2,bAz,0.25,bAD,bAwH]])B.wall(scene,x,z,y1,lx,lz,h,oM);
    B.slab(scene,bAx,bAz,y1+bAwH,bAW+0.4,bAD+0.4,mDark);
    for(let fl=0;fl<4;fl++){const fy=y1+1.5+fl*2.6;
      B.box(scene,bAx,bAz-bAD/2-0.01,fy,bAW*0.6,1.3,0.07,mGlDk);B.box(scene,bAx,bAz+bAD/2+0.01,fy,bAW*0.6,1.3,0.07,mGlDk);
    }
    // Banque sud
    const bBx=108,bBz=-172,bBW=12,bBD=9,bBwH=6.5;
    const y2=ZS.getTerrainHeight(bBx,bBz);
    const bnM=new THREE.MeshLambertMaterial({color:0x8a7860});
    B.slab(scene,bBx,bBz,y2,bBW+1,bBD+1,mConc);
    for(const[x,z,lx,lz,h]of[[bBx,bBz-bBD/2,bBW,0.28,bBwH],[bBx,bBz+bBD/2,bBW,0.28,bBwH],[bBx-bBW/2,bBz,0.28,bBD,bBwH],[bBx+bBW/2,bBz,0.28,bBD,bBwH]])B.wall(scene,x,z,y2,lx,lz,h,bnM);
    B.slab(scene,bBx,bBz,y2+bBwH,bBW+0.4,bBD+0.4,mRoof);
    const colM=new THREE.MeshLambertMaterial({color:0xc8bea8});
    for(const bz of[-3,0,3])B.box(scene,bBx+bBW/2+0.3,bBz+bz,y2+bBwH*0.5,0.5,bBwH,0.5,colM);
    B.box(scene,bBx+bBW/2+0.01,bBz,y2+1.8,0.06,1.8,bBD-2,mGlass);
    B.box(scene,bBx,bBz-bBD/2-0.01,y2+bBwH-1.4,0.06,0.9,8,new THREE.MeshLambertMaterial({color:0x8a6020}));
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // STATION ESSENCE & PARKING
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildGasStation(scene,B){
    B.gasStation(scene,102,-120);
    B.car(scene,112,-114,0.2,0x5a4a30); B.car(scene,112,-120,-0.1,0x3a3a28);
  }

  function _buildParkingStructure(scene,B){
    const cx=245,cz=-118,W=18,D=13;
    const y=ZS.getTerrainHeight(cx,cz);
    const pkM=new THREE.MeshLambertMaterial({color:0x707468});
    const lnM=new THREE.MeshLambertMaterial({color:0xf0e8cc,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
    for(let lvl=0;lvl<3;lvl++){
      const ly=y+lvl*3.2;
      B.slab(scene,cx,cz,ly,W,D,pkM);
      for(const[px,pz]of[[-6,-4.5],[0,-4.5],[6,-4.5],[-6,4.5],[0,4.5],[6,4.5]])B.box(scene,cx+px,cz+pz,ly+1.6,0.42,3.2,0.42,pkM);
      B.box(scene,cx-W/2,cz,ly+2.8,0.16,0.9,D,pkM); B.box(scene,cx+W/2,cz,ly+2.8,0.16,0.9,D,pkM); B.box(scene,cx,cz-D/2,ly+2.8,W,0.9,0.16,pkM);
      for(let i=-4;i<=4;i++)B.box(scene,cx+i*2.0,cz-2,ly+0.08,0.1,0.01,8,lnM);
      if(lvl<2){B.car(scene,cx-5,cz-2,0,0x2a2a22+lvl*0x0f0f0f);B.car(scene,cx,cz-2,0.05,0x3a4a2a);B.car(scene,cx+5,cz-2,-0.08,0x4a3a20);}
    }
    ZS.registerRamp(cx-W/2-3,cz,2.5,D*0.5,y,y+6.4,'z');
    B.visualStairs(scene,cx-W/2-3,cz,y,y+6.4,'z',4,D*0.5);
    B.box(scene,cx+W/2+0.01,cz,y+5,0.06,3.2,6,new THREE.MeshLambertMaterial({color:0x1a3888}));
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // IMMEUBLES RÉSIDENTIELS
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildResidential(scene,B){
    for(const t of[
      {cx:96,cz:-263,W:10,D:8,floors:6,col:0x8a8070},{cx:252,cz:-263,W:10,D:8,floors:8,col:0x788090},
      {cx:96,cz:-127,W:10,D:8,floors:4,col:0x988060},{cx:252,cz:-127,W:10,D:8,floors:3,col:0x8a7060},
      {cx:185,cz:-263,W:12,D:9,floors:5,col:0x907858},{cx:200,cz:-127,W:12,D:8,floors:4,col:0x8a7060},
    ])_tower(scene,B,t.cx,t.cz,t.W,t.D,t.floors,t.col);
    for(const[hx,hz]of[[258,-263],[258,-248],[258,-132],[258,-118]])B.house(scene,hx,hz);
  }

  function _tower(scene,B,cx,cz,W,D,floors,col){
    const wH=floors*3.0,y=ZS.getTerrainHeight(cx,cz);
    const tM=new THREE.MeshLambertMaterial({color:col});
    B.slab(scene,cx,cz,y,W+0.5,D+0.5,mConc);
    B.wall(scene,cx,cz-D/2,y,W,0.24,wH,tM); B.wall(scene,cx,cz+D/2,y,W,0.24,wH,tM);
    B.wall(scene,cx-W/2,cz,y,0.24,D,wH,tM); B.wall(scene,cx+W/2,cz,y,0.24,D,wH,tM);
    B.slab(scene,cx,cz,y+wH,W+0.3,D+0.3,mRoof);
    for(let fl=0;fl<floors;fl++){const fy=y+1.3+fl*3.0;
      for(const fx of[-W/2+1.2,0,W/2-1.2]){B.box(scene,cx+fx,cz-D/2-0.01,fy,1.4,1.2,0.06,mGlass);B.box(scene,cx+fx,cz+D/2+0.01,fy,1.4,1.2,0.06,mGlass);}
    }
    for(let fl=1;fl<floors;fl++)B.box(scene,cx,cz,y+fl*3.0,W+0.1,0.1,D+0.1,new THREE.MeshLambertMaterial({color:Math.max(0,col-0x101010)}));
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // VÉHICULES
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildVehicles(scene,B){
    // Embouteillage route principale (z=-195)
    for(const[vx,vz,vr,vc]of[
      [258,-196.5,0.05,0x3a2a18],[248,-193.5,-0.08,0x2a3a2a],[238,-196,-0.1,0x4a3818],
      [228,-194,0.12,0x1a2a3a],[218,-196.8,-0.05,0x3a3a28],[208,-193,0.08,0x2a1a18],
      [198,-196,3.1,0x4a4030],[188,-193.5,-0.1,0x3a2820],[178,-196.5,0.06,0x1a3a2a],
      [168,-193,0.0,0x2a3030],[158,-196.8,-0.08,0x4a2a18],[148,-193.5,0.1,0x3a3828],
      [138,-196,3.18,0x2a2a20],[128,-193,0.0,0x4a3018],[118,-196.5,-0.12,0x1a2820],
    ])B.car(scene,vx,vz,vr,vc);
    // Taxis jaunes
    B.car(scene,228,-193.5,-0.15,0xddbb00); B.car(scene,172,-196,0.1,0xddbb00);
    // Rue nord z=-252
    for(const[vx,vc]of[[258,0x3a2a18],[228,0x2a3a2a],[198,0x4a3018],[168,0x1a2a3a],[138,0x3a3028]])B.car(scene,vx,-252,Math.random()*0.3-0.15,vc);
    // Rue sud z=-142
    for(const[vx,vc]of[[248,0x2a2a20],[218,0x3a2818],[188,0x4a3a28],[158,0x2a3a2a],[128,0x1a2820]])B.car(scene,vx,-142,Math.PI+Math.random()*0.3-0.15,vc);
    // Épaves
    for(const[vx,vz]of[[257,-195],[190,-197],[128,-193]])B.car(scene,vx,vz,0.25,0x1a1a18);
    // Bus
    _bus(scene,B,232,-195.5,0.12); _bus(scene,B,155,-194.5,Math.PI);
  }

  function _bus(scene,B,cx,cz,ry){
    const py=ZS.getTerrainHeight(cx,cz);
    const bodyM=new THREE.MeshLambertMaterial({color:0x1e2a6a}),dM=new THREE.MeshLambertMaterial({color:0x181818});
    const g=new THREE.Group();
    const b=new THREE.Mesh(new THREE.BoxGeometry(2.5,2.1,9.0),bodyM);b.position.y=1.12;b.castShadow=true;g.add(b);
    new THREE.Mesh(new THREE.BoxGeometry(2.4,0.28,8.8),bodyM);
    for(let i=0;i<5;i++)for(const sx of[-1.27,1.27]){const w=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.75,1.3),mGlass);w.position.set(sx,1.65,-3.0+i*1.52);g.add(w);}
    for(const[ox,oz]of[[-1.3,-3.1],[1.3,-3.1],[-1.3,0],[1.3,0],[-1.3,3.1],[1.3,3.1]]){
      const w=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.46,0.28,9),dM);w.rotation.z=Math.PI/2;w.position.set(ox,0.48,oz);g.add(w);
    }
    g.position.set(cx,py,cz);g.rotation.y=ry;scene.add(g);
    B.addCollider({type:'box',cx,cz,hw:1.35,hd:4.6,maxY:py+2.38});
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // LAMPADAIRES
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildStreetLights(scene,B){
    const polM=new THREE.MeshLambertMaterial({color:0x3a3a3a});
    const lmM=new THREE.MeshLambertMaterial({color:0xffffcc,emissive:0xffeeaa,emissiveIntensity:2.5});
    for(const[lx,lz,side]of[
      [258,-200,-1],[242,-190,1],[225,-200,-1],[208,-190,1],[192,-200,-1],
      [175,-190,1],[158,-200,-1],[142,-190,1],[125,-200,-1],[108,-190,1],
    ]){
      const ly=ZS.getTerrainHeight(lx,lz);
      B.box(scene,lx,lz,ly+2.9,0.09,5.8,0.09,polM);
      const arm=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,1.6),polM);arm.position.set(lx,ly+5.5,lz+side*0.65);scene.add(arm);
      const fix=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.22,0.6),lmM);fix.position.set(lx,ly+5.3,lz+side*1.45);scene.add(fix);
      const pt=new THREE.PointLight(0xffeecc,4.8,36);pt.position.set(lx,ly+5.1,lz+side*1.5);scene.add(pt);
      B.addCollider({x:lx,z:lz,r:0.1});
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MOBILIER URBAIN
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildStreetFurniture(scene,B){
    const y=ZS.getTerrainHeight(CX,CZ);
    const bnM=new THREE.MeshLambertMaterial({color:0x2a2820});
    const trM=new THREE.MeshLambertMaterial({color:0x1a3a18}),dTrM=new THREE.MeshLambertMaterial({color:0x4a3818});
    // Bancs
    for(const[bx,bz]of[[255,-200],[230,-190],[205,-200],[180,-190],[155,-200],[130,-190],[105,-200]]){
      const by=ZS.getTerrainHeight(bx,bz);
      B.box(scene,bx,bz,by+0.5,1.7,0.08,0.4,bnM);B.box(scene,bx,bz+0.2,by+0.35,1.7,0.65,0.07,bnM);
      for(const ox of[-0.65,0.65])B.box(scene,bx+ox,bz,by+0.25,0.08,0.5,0.4,bnM);
    }
    // Arbres
    const tGeo=new THREE.SphereGeometry(1.7,7,5);
    const tTrk=new THREE.CylinderGeometry(0.13,0.17,4.2,7);
    for(const[tx,tz,alive]of[
      [260,-200,true],[245,-190,true],[228,-200,false],[212,-190,true],[195,-200,true],
      [178,-190,false],[162,-200,true],[145,-190,true],[128,-200,false],[112,-190,true],
    ]){
      const ty=ZS.getTerrainHeight(tx,tz);
      const trunk=new THREE.Mesh(tTrk,alive?trM:dTrM);trunk.position.set(tx,ty+2.1,tz);trunk.castShadow=true;scene.add(trunk);
      if(alive){const crown=new THREE.Mesh(tGeo,new THREE.MeshLambertMaterial({color:0x2a5018}));crown.position.set(tx,ty+5.2,tz);crown.castShadow=true;scene.add(crown);}
      B.addCollider({x:tx,z:tz,r:0.15});
    }
    // Abribus
    for(const[sx,sz,ry]of[[240,-200.8,0],[175,-189.2,Math.PI],[120,-200.8,0]])_busStop(scene,B,sx,sz,ry);
    // Feux de circulation
    const tfM=new THREE.MeshLambertMaterial({color:0x1a1a18});
    for(const[ix,iz]of[[175,-195.5],[240,-195.5],[112,-195.5]]){
      const iy=ZS.getTerrainHeight(ix,iz);
      B.box(scene,ix,iz-5,iy+2.7,0.09,5.2,0.09,tfM);B.box(scene,ix,iz-5,iy+5.3,0.4,1.1,0.5,tfM);
      B.box(scene,ix,iz-5,iy+4.9,0.36,0.32,0.42,new THREE.MeshLambertMaterial({color:0x991111}));
    }
    // Poubelles renversées
    const pbM=new THREE.MeshLambertMaterial({color:0x2a2a22});
    for(const[px,pz,pr]of[[258,-193,0.4],[225,-197,-0.3],[192,-193,0.5],[159,-197,0.2],[126,-193,0.35]]){
      const py=ZS.getTerrainHeight(px,pz);
      const bin=new THREE.Mesh(new THREE.CylinderGeometry(0.21,0.25,0.65,7),pbM);bin.rotation.z=pr;bin.position.set(px,py+0.21,pz);bin.castShadow=true;scene.add(bin);
    }
  }

  function _busStop(scene,B,sx,sz,ry){
    const by=ZS.getTerrainHeight(sx,sz);
    const frM=new THREE.MeshLambertMaterial({color:0x2a3a52}),rfM=new THREE.MeshLambertMaterial({color:0x1e2a40});
    const g=new THREE.Group();g.position.set(sx,by,sz);g.rotation.y=ry;
    const sl=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.08,1.5),new THREE.MeshLambertMaterial({color:0x7a7268}));sl.position.set(0,0.04,0);g.add(sl);
    for(const px of[-1.45,1.45]){const p=new THREE.Mesh(new THREE.BoxGeometry(0.09,2.7,0.09),frM);p.position.set(px,1.35,0.52);g.add(p);}
    const roof=new THREE.Mesh(new THREE.BoxGeometry(3.3,0.10,1.55),rfM);roof.position.set(0,2.75,0.12);g.add(roof);
    const pan=new THREE.Mesh(new THREE.BoxGeometry(3.1,2.4,0.06),mGlass);pan.position.set(0,1.30,0.56);g.add(pan);
    scene.add(g);B.addCollider({type:'box',cx:sx,cz:sz,hw:1.8,hd:0.85});
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // DÉCOMBRES
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildDebris(scene,B){
    const y=ZS.getTerrainHeight(CX,CZ);
    const rubM=new THREE.MeshLambertMaterial({color:0x706a58});
    const cncM=new THREE.MeshLambertMaterial({color:0x8a8070});
    const sandM=new THREE.MeshLambertMaterial({color:0x8a7848});
    const coneM=new THREE.MeshLambertMaterial({color:0xdd4411});

    // Blocs béton
    for(const[bx,bz]of[[258,-205],[258,-185],[175,-205],[175,-185],[90,-205],[90,-185]])
      B.box(scene,bx,bz,y+0.55,1.7,1.0,0.85,cncM);
    // Gravats
    for(const[rx,rz,rw,rd,rh]of[[245,-208,3.5,2.5,0.6],[202,-208,4,3,0.8],[165,-208,3,2,0.5],[128,-208,3.5,2.5,0.7]])
      B.box(scene,rx,rz,ZS.getTerrainHeight(rx,rz)+rh/2,rw,rh,rd,rubM);
    // Sacs de sable
    for(const[sx,sz]of[[240,-208],[205,-192],[170,-208],[135,-192]])
      for(let i=0;i<4;i++)B.box(scene,sx+i*1.0,sz,y+0.3,0.9,0.55,0.5,sandM);
    // Cônes
    for(const[px,pz]of[[258,-203],[238,-197],[218,-203],[198,-197],[178,-203],[158,-197],[138,-203],[118,-197],[98,-203]]){
      const py=ZS.getTerrainHeight(px,pz);
      const c=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.62,6),coneM);c.position.set(px,py+0.32,pz);c.rotation.z=(Math.random()-0.5)*1.1;scene.add(c);
    }
    // Graffiti HELP
    const helpM=new THREE.MeshLambertMaterial({color:0xcc3311});
    const hb=new THREE.Mesh(new THREE.BoxGeometry(3.8,1.9,0.05),helpM);
    hb.position.set(215,ZS.getTerrainHeight(215,-252)+2.4,-252.18);scene.add(hb);
    // Fils électriques
    const wM=new THREE.MeshLambertMaterial({color:0x1a1a18});
    B.box(scene,190,-195,y+0.15,7,0.05,0.05,wM); B.box(scene,190,-195,y+0.15,0.05,2.8,0.05,wM);
    // Fissures sol
    const crM=new THREE.MeshLambertMaterial({color:0x3a3630,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-5});
    for(const[fx,fz]of[[255,-195],[218,-195],[175,-195],[138,-195],[105,-195]])B.box(scene,fx,fz,y+0.06,3.2,0.01,2.3,crM);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  ZS.Buildings.registerSector({ build });
}());
