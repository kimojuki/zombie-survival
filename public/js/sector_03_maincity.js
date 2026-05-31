// SECTOR 03 — MAIN CITY  (CX=-20, CZ=-185 | X:-85→+45, Z:-250→-120)
// Tous les bâtiments sont accessibles + montables étage par étage
(function () {
  'use strict';

  const CX = -20, CZ = -185;
  ZS.registerFlatZone(CX, CZ, 65, 65, 15);

  function build(scene) {
    const B = ZS.B;
    _buildAllRoads(scene, B);
    _buildHospital(scene, B);
    _buildSupermarket(scene, B);
    _buildPoliceStation(scene, B);
    _buildSchool(scene, B);
    _buildShoppingCenter(scene, B);
    _buildHotel(scene, B);
    _buildOfficeA(scene, B);
    _buildBank(scene, B);
    _buildGasStation(scene, B);
    _buildParkingStructure(scene, B);
    _buildResidential(scene, B);
    _buildVehicles(scene, B);
    _buildStreetLights(scene, B);
    _buildStreetFurniture(scene, B);
    _buildDebris(scene, B);
  }

  // ── Matériaux ─────────────────────────────────────────────────────────────────
  const mConc = new THREE.MeshLambertMaterial({ color: 0x8a8070 });
  const mDark = new THREE.MeshLambertMaterial({ color: 0x2a2820 });
  const mGlass = new THREE.MeshLambertMaterial({ color: 0x5a8898, transparent: true, opacity: 0.55 });
  const mGlDk  = new THREE.MeshLambertMaterial({ color: 0x3a5560, transparent: true, opacity: 0.45 });
  const mRoof  = new THREE.MeshLambertMaterial({ color: 0x3e3228 });
  const mAsph  = new THREE.MeshLambertMaterial({ color: 0x323028, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
  const mRed   = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
  const mSign  = new THREE.MeshLambertMaterial({ color: 0x1a3a5a });
  const mFloor = new THREE.MeshLambertMaterial({ color: 0x5a5248 });
  const mStair = new THREE.MeshLambertMaterial({ color: 0x6a5a38 });

  // ── Routes ────────────────────────────────────────────────────────────────────

  function _buildAllRoads(scene, B) {
    const M = B.M;
    const ty = ZS.getTerrainHeight(CX, CZ);
    B.ribbon(scene, [[0,-5],[-4,-42],[-10,-82],[-16,-112],[-20,-120]], 5.5, M.roadDirt, false);
    B.ribbon(scene, [[-85,-185],[-50,-185],[-20,-185],[10,-185],[42,-185]], 7.0, M.road, false);
    B.ribbon(scene, [[-85,-240],[-50,-240],[-20,-240],[10,-240],[42,-240]], 5.5, M.road, false);
    B.ribbon(scene, [[-85,-135],[-50,-135],[-20,-135],[10,-135],[42,-135]], 5.5, M.road, false);
    B.ribbon(scene, [[-20,-120],[-20,-135],[-20,-185],[-20,-240],[-20,-250]], 6.0, M.road, false);
    B.ribbon(scene, [[36,-120],[36,-135],[36,-185],[36,-240],[36,-250]], 4.5, M.road, false);
    B.ribbon(scene, [[-64,-120],[-64,-135],[-64,-185],[-64,-240],[-64,-250]], 4.5, M.road, false);
    const trot = new THREE.MeshLambertMaterial({ color: 0x7a7268, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -5 });
    B.slab(scene, CX, -190, ty+0.07, 132, 2.2, trot);
    B.slab(scene, CX, -180, ty+0.07, 132, 2.2, trot);
    const zebM = new THREE.MeshLambertMaterial({ color: 0xc8c0b0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
    for (const [zx,zz] of [[-20,-185],[36,-185],[-64,-185]])
      for (let k=-3;k<=3;k++) B.box(scene,zx,zz+k*1.3,ty+0.09,5.5,0.01,0.48,zebM);
    const gM = new THREE.MeshLambertMaterial({ color: 0x3a5a28, polygonOffset: true, polygonOffsetFactor:-1, polygonOffsetUnits:-3 });
    B.slab(scene,CX,-240,ty+0.04,2.5,20,gM); B.slab(scene,CX,-135,ty+0.04,2.5,16,gM);
  }

  // ─── Helper : planchers intérieurs + escalier intérieur ──────────────────────
  // stairSide : 'north' (escalier au nord) ou 'south' (escalier au sud)
  function _addFloorsAndStairs(scene, B, cx, cz, W, D, floors, flH, y, stairSide) {
    const hd = D / 2 - 0.3;
    const sCx = cx + W / 4; // escalier côté est-intérieur
    // Planchers + upper floors
    for (let fl = 1; fl < floors; fl++) {
      const fy = y + fl * flH;
      B.slab(scene, cx, cz, fy, W - 0.5, D - 0.5, mFloor);
      ZS.registerUpperFloor(cx, cz, (W-0.5)/2, (D-0.5)/2, fy);
    }
    // Escalier intérieur (du sud vers le nord pour monter)
    const topH = y + (floors - 1) * flH;
    ZS.registerRamp(sCx, cz, 0.9, hd, topH, y, 'z');
    B.visualStairs(scene, sCx, cz, topH, y, 'z', 1.6, hd);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HÔPITAL — NW  (porte côté SUD vers rue nord)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildHospital(scene, B) {
    const cx=-55, cz=-244, W=16, D=9, wH=14.0, flH=2.8, floors=5;
    const y=ZS.getTerrainHeight(cx,cz);
    const hM=new THREE.MeshLambertMaterial({color:0x9aa8b0});
    B.slab(scene,cx,cz,y,W+0.8,D+0.8,mConc);
    // Murs N, E, O — complets
    B.wall(scene,cx,cz-D/2,y,W,0.26,wH,hM);
    B.wall(scene,cx-W/2,cz,y,0.26,D,wH,hM);
    B.wall(scene,cx+W/2,cz,y,0.26,D,wH,hM);
    // Mur SUD : porte double (2.8m) au centre → accès depuis rue nord
    const dw=2.8, sw=(D-dw)/2;
    B.wall(scene,cx,cz+D/2,y,     W, 0.26, 0.26, hM); // seuil bas (optique)
    // On coupe le mur sud en 2 segments avec gap
    B.wall(scene,cx-dw/2-sw/2, cz+D/2, y, W/2-dw/2, 0.26, wH, hM);
    B.wall(scene,cx+dw/2+sw/2, cz+D/2, y, W/2-dw/2, 0.26, wH, hM);
    B.box(scene, cx, cz+D/2, y+wH-0.6, dw, 0.6, 0.26, hM); // linteau
    // Toit
    B.slab(scene,cx,cz,y+wH,W+0.3,D+0.3,new THREE.MeshLambertMaterial({color:0x4a4840}));
    // Fenêtres
    for(let fl=0;fl<floors;fl++){const fy=y+1.4+fl*flH;
      for(const fx of[-4.5,0,4.5]){B.box(scene,cx+fx,cz-D/2-0.01,fy,1.7,1.4,0.07,mGlass);}
      for(const fz of[-2.5,2.5]){B.box(scene,cx-W/2-0.01,cz+fz,fy,0.07,1.4,1.5,mGlass);B.box(scene,cx+W/2+0.01,cz+fz,fy,0.07,1.4,1.5,mGlass);}
    }
    // Croix rouge + enseigne
    B.box(scene,cx,cz-D/2-0.02,y+8,0.06,2.8,0.45,mRed);
    B.box(scene,cx,cz-D/2-0.02,y+8,0.06,0.45,2.8,mRed);
    B.box(scene,cx,cz-D/2-0.02,y+wH-1.0,0.06,1.2,8,new THREE.MeshLambertMaterial({color:0x1a4a6a}));
    // Hélipad toit
    B.slab(scene,cx-3,cz-2.5,y+wH+0.15,5.5,5.5,new THREE.MeshLambertMaterial({color:0x3a3830}));
    const mk=new THREE.MeshLambertMaterial({color:0xddcc22});
    B.box(scene,cx-3,cz-2.5,y+wH+0.2,1.0,0.01,5.5,mk); B.box(scene,cx-3,cz-2.5,y+wH+0.2,5.5,0.01,1.0,mk);
    // Ambulances
    _amb(scene,B,cx-7,cz+D/2+2,0); _amb(scene,B,cx-7,cz+D/2+5.5,0);
    // Planchers + escalier
    _addFloorsAndStairs(scene,B,cx,cz,W,D,floors,flH,y,'south');
  }

  function _amb(scene,B,cx,cz,ry){
    const y=ZS.getTerrainHeight(cx,cz);
    const wM=new THREE.MeshLambertMaterial({color:0xeeeedd}),rM=new THREE.MeshLambertMaterial({color:0xcc2222}),dM=new THREE.MeshLambertMaterial({color:0x181818});
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.5,4.0),wM);body.position.y=0.88;body.castShadow=true;g.add(body);
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(1.95,0.28,4.05),rM);stripe.position.y=0.66;g.add(stripe);
    const glass=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.58,0.05),mGlass);glass.position.set(0,1.32,-2.02);g.add(glass);
    for(const[ox,oz]of[[-0.95,-1.25],[0.95,-1.25],[-0.95,1.25],[0.95,1.25]]){
      const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.2,8),dM);wh.rotation.z=Math.PI/2;wh.position.set(ox,0.34,oz);g.add(wh);
    }
    g.position.set(cx,y,cz);g.rotation.y=ry;scene.add(g);
    B.addCollider({type:'box',cx,cz,hw:1.0,hd:2.1,maxY:y+1.55});
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SUPERMARCHÉ — NE  (porte côté SUD)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildSupermarket(scene,B){
    const cx=14,cz=-244,W=22,D=10,wH=5.0;
    const y=ZS.getTerrainHeight(cx,cz);
    const sM=new THREE.MeshLambertMaterial({color:0x6a7880});
    B.slab(scene,cx,cz,y,W+0.8,D+0.8,mConc);
    B.wall(scene,cx,cz-D/2,y,W,0.24,wH,sM);
    B.wall(scene,cx-W/2,cz,y,0.24,D,wH,sM);
    B.wall(scene,cx+W/2,cz,y,0.24,D,wH,sM);
    // Porte SUD (face rue nord) — 3.5m
    const dw=3.5, sw=(W-dw)/2;
    B.wall(scene,cx-dw/2-sw/2,cz+D/2,y,sw,0.24,wH,sM);
    B.wall(scene,cx+dw/2+sw/2,cz+D/2,y,sw,0.24,wH,sM);
    B.box(scene,cx,cz+D/2,y+wH-0.6,dw,0.6,0.24,sM);
    // Vitrine face sud (côtés de la porte)
    B.box(scene,cx-dw/2-1.5,cz+D/2+0.01,y+2.0,0.07,1.8,sw-0.1,mGlass);
    B.box(scene,cx+dw/2+1.5,cz+D/2+0.01,y+2.0,0.07,1.8,sw-0.1,mGlass);
    B.slab(scene,cx,cz,y+wH,W+0.4,D+0.4,mRoof);
    B.box(scene,cx,cz+D/2+0.01,y+wH-1.4,0.06,1.0,13,new THREE.MeshLambertMaterial({color:0x1a5a28}));
    // Parking + chariots
    B.slab(scene,cx+W/2+5,cz,y+0.04,6,10,mAsph);
    B.car(scene,cx+W/2+4,cz-3.5,0.1,0x3a2818);
    const cM=new THREE.MeshLambertMaterial({color:0x888880});
    for(const[ox,oz]of[[cx+W/2+3,cz-1],[cx+W/2+5,cz+2],[cx+W/2+7,cz-3]])B.box(scene,ox,oz,ZS.getTerrainHeight(ox,oz)+0.3,0.85,0.6,0.4,cM);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // COMMISSARIAT — SW  (porte côté NORD vers rue sud)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildPoliceStation(scene,B){
    const cx=-55,cz=-128,W=15,D=11,wH=6.5,flH=3.25,floors=2;
    const y=ZS.getTerrainHeight(cx,cz);
    const pM=new THREE.MeshLambertMaterial({color:0x6a6a78});
    B.slab(scene,cx,cz,y,W+0.8,D+0.8,mConc);
    B.wall(scene,cx,cz+D/2,y,W,0.24,wH,pM);
    B.wall(scene,cx-W/2,cz,y,0.24,D,wH,pM);
    B.wall(scene,cx+W/2,cz,y,0.24,D,wH,pM);
    // Porte NORD (face rue sud) — 2.8m
    const dw=2.8, sw=(W-dw)/2;
    B.wall(scene,cx-dw/2-sw/2,cz-D/2,y,sw,0.24,wH,pM);
    B.wall(scene,cx+dw/2+sw/2,cz-D/2,y,sw,0.24,wH,pM);
    B.box(scene,cx,cz-D/2,y+wH-0.55,dw,0.55,0.24,pM);
    B.slab(scene,cx,cz,y+wH,W+0.3,D+0.3,new THREE.MeshLambertMaterial({color:0x3a3830}));
    for(let fl=0;fl<2;fl++){const fy=y+1.6+fl*3.2;
      for(const fz of[-3.5,0,3.5])B.box(scene,cx,cz+fz,fy,1.4,1.2,0.06,mGlDk);
    }
    B.box(scene,cx+W/2+0.8,cz+D/2,y+5.0,0.07,4.0,0.07,new THREE.MeshLambertMaterial({color:0x2a2a22}));
    const f=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.0),new THREE.MeshLambertMaterial({color:0x1a3a8a,side:THREE.DoubleSide}));
    f.position.set(cx+W/2+1.6,y+8.7,cz+D/2);scene.add(f);
    B.box(scene,cx+W/2+0.01,cz,y+wH-1.8,0.06,0.8,8,mSign);
    for(const bz of[-4,-2,0,2,4])B.box(scene,cx+W/2+2,cz+bz,y+0.5,0.5,1.0,0.48,mConc);
    B.car(scene,cx+W/2+5,cz-2,0.1,0x1a1a3a); B.car(scene,cx+W/2+5,cz+2,-0.1,0x1a1a3a);
    _addFloorsAndStairs(scene,B,cx,cz,W,D,floors,flH,y,'north');
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ÉCOLE — SE  (porte côté NORD)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildSchool(scene,B){
    const cx=14,cz=-128,W=16,D=10,wH=5.8,flH=2.9,floors=2;
    const y=ZS.getTerrainHeight(cx,cz);
    const eM=new THREE.MeshLambertMaterial({color:0xa07848});
    B.slab(scene,cx,cz,y,W+0.8,D+1,mConc);
    B.wall(scene,cx,cz+D/2,y,W,0.22,wH,eM);
    B.wall(scene,cx-W/2,cz,y,0.22,D,wH,eM);
    B.wall(scene,cx+W/2,cz,y,0.22,D,wH,eM);
    // Porte NORD (face rue sud) — 2.5m
    const dw=2.5, sw=(W-dw)/2;
    B.wall(scene,cx-dw/2-sw/2,cz-D/2,y,sw,0.22,wH,eM);
    B.wall(scene,cx+dw/2+sw/2,cz-D/2,y,sw,0.22,wH,eM);
    B.box(scene,cx,cz-D/2,y+wH-0.48,dw,0.48,0.22,eM);
    B.slab(scene,cx,cz,y+wH,W+0.3,D+0.3,B.M.roofRed);
    for(let fl=0;fl<2;fl++){const fy=y+1.5+fl*2.7;
      for(const fx of[-5.5,-1.5,2.5,6.5])B.box(scene,cx-W/2+fx+0.5,cz+D/2+0.01,fy,1.4,1.2,0.07,mGlass);
    }
    B.box(scene,cx+W/2+0.01,cz,y+3.6,0.06,0.65,6.5,new THREE.MeshLambertMaterial({color:0x1a4a1a}));
    B.slab(scene,cx-1,cz-D/2-6,y+0.04,18,8,new THREE.MeshLambertMaterial({color:0x4a5038}));
    const fM=new THREE.MeshLambertMaterial({color:0x444444});
    B.box(scene,cx-1,cz-D/2-10,y+1.3,19,2.6,0.12,fM);
    B.box(scene,cx-10,cz-D/2-6,y+1.3,0.12,2.6,8,fM); B.box(scene,cx+8,cz-D/2-6,y+1.3,0.12,2.6,8,fM);
    _schoolBus(scene,B,cx+W/2+4,cz-D/2-3,0);
    _addFloorsAndStairs(scene,B,cx,cz,W,D,floors,flH,y,'north');
  }

  function _schoolBus(scene,B,cx,cz,ry){
    const y=ZS.getTerrainHeight(cx,cz);
    const yM=new THREE.MeshLambertMaterial({color:0xddbb00}),dM=new THREE.MeshLambertMaterial({color:0x181818});
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(2.3,1.95,7.5),yM);body.position.y=1.05;body.castShadow=true;g.add(body);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.22,7.3),yM);roof.position.set(0,2.1,0);g.add(roof);
    const fw=new THREE.Mesh(new THREE.BoxGeometry(1.95,0.88,0.07),mGlass);fw.position.set(0,1.6,-3.72);g.add(fw);
    for(let i=0;i<3;i++)for(const sx of[-1.17,1.17]){const w=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.62,1.2),mGlass);w.position.set(sx,1.55,-2.1+i*1.4);g.add(w);}
    for(const[ox,oz]of[[-1.15,-2.6],[1.15,-2.6],[-1.15,0],[1.15,0],[-1.15,2.6],[1.15,2.6]]){
      const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,0.23,9),dM);wh.rotation.z=Math.PI/2;wh.position.set(ox,0.42,oz);g.add(wh);
    }
    g.position.set(cx,y,cz);g.rotation.y=ry;scene.add(g);
    B.addCollider({type:'box',cx,cz,hw:1.22,hd:3.85,maxY:y+2.15});
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CENTRE COMMERCIAL — centre  (porte EST et OUEST)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildShoppingCenter(scene,B){
    const cx=-30,cz=-185,W=22,D=15,wH=4.8;
    const y=ZS.getTerrainHeight(cx,cz);
    const cM=new THREE.MeshLambertMaterial({color:0x7a7880});
    B.slab(scene,cx,cz,y,W+0.8,D+0.8,mConc);
    B.wall(scene,cx,cz-D/2,y,W,0.24,wH,cM); B.wall(scene,cx,cz+D/2,y,W,0.24,wH,cM);
    // Mur OUEST : porte 2.5m (vers rue N-S ouest)
    const dw=2.5, sw=(D-dw)/2;
    B.wall(scene,cx-W/2,cz-dw/2-sw/2,y,0.24,sw,wH,cM);
    B.wall(scene,cx-W/2,cz+dw/2+sw/2,y,0.24,sw,wH,cM);
    B.box(scene,cx-W/2,cz,y+wH-0.5,0.24,0.5,dw,cM);
    // Mur EST : vitrine + porte 3.5m (vers avenue centrale)
    const dw2=3.5, sw2=(D-dw2)/2;
    B.wall(scene,cx+W/2,cz-dw2/2-sw2/2,y,0.24,sw2,wH,cM);
    B.wall(scene,cx+W/2,cz+dw2/2+sw2/2,y,0.24,sw2,wH,cM);
    B.box(scene,cx+W/2,cz,y+wH-0.5,0.24,0.5,dw2,cM);
    B.box(scene,cx+W/2+0.01,cz,y+2.0,0.07,2.0,dw2-0.2,mGlass);
    B.slab(scene,cx,cz,y+wH,W+0.4,D+0.4,mRoof);
    B.box(scene,cx+W/2+1.8,cz,y+wH-0.3,3.6,0.14,D-10,new THREE.MeshLambertMaterial({color:0x3a4860}));
    B.box(scene,cx+W/2+0.01,cz-4,y+wH-1.1,0.06,0.7,4,new THREE.MeshLambertMaterial({color:0x884422}));
    B.box(scene,cx+W/2+0.01,cz+4,y+wH-1.1,0.06,0.7,4,new THREE.MeshLambertMaterial({color:0x224488}));
    for(const fz of[-5,-1,3])B.box(scene,cx-W/2-0.01,cz+fz,y+2.2,0.07,1.6,2.0,mGlass);
    const shM=new THREE.MeshLambertMaterial({color:0x6a5a38});
    for(const[sx,sz]of[[-34,-190],[-30,-190],[-26,-190],[-34,-180],[-30,-180],[-26,-180]])B.box(scene,sx,sz,y+1.4,0.1,2.8,4.5,shM);
    B.car(scene,cx-W/2-4,cz-5,Math.PI*0.55,0x2a2a28);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HÔTEL TOUR — est  (aligné à droite de la rue N-S est à x=36)
  // porte côté OUEST (face avenue centrale)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildHotel(scene,B){
    const cx=41,cz=-208,W=8,D=7,wH=19.0,flH=2.7,floors=7;
    const y=ZS.getTerrainHeight(cx,cz);
    const htM=new THREE.MeshLambertMaterial({color:0x606870});
    B.slab(scene,cx,cz,y,W+0.8,D+0.8,mConc);
    B.wall(scene,cx,cz-D/2,y,W,0.24,wH,htM); B.wall(scene,cx,cz+D/2,y,W,0.24,wH,htM);
    B.wall(scene,cx+W/2,cz,y,0.24,D,wH,htM);
    // Mur OUEST : porte 2.0m + grande vitrine glass
    const dw=2.0, sw=(D-dw)/2;
    B.wall(scene,cx-W/2,cz-dw/2-sw/2,y,0.24,sw,wH,htM);
    B.wall(scene,cx-W/2,cz+dw/2+sw/2,y,0.24,sw,wH,htM);
    B.box(scene,cx-W/2,cz,y+wH-0.5,0.24,0.5,dw,htM);
    B.box(scene,cx-W/2-0.01,cz,y+2.5,0.07,wH-4.5,D-0.5,mGlass);
    B.slab(scene,cx,cz,y+wH,W+0.3,D+0.3,mDark);
    B.box(scene,cx,cz,y+wH+0.45,W-0.8,1.0,D-0.8,htM);
    for(let fl=1;fl<floors;fl++)B.box(scene,cx,cz,y+fl*flH,W+0.1,0.1,D+0.1,new THREE.MeshLambertMaterial({color:0x8a9098}));
    B.box(scene,cx+W/2+0.01,cz,y+wH-2.5,0.06,1.5,5.5,mSign);
    // Balcon effondré déco
    const rubM=new THREE.MeshLambertMaterial({color:0x706a60});
    B.box(scene,cx+W/2+0.8,cz+1.2,y+2.2,1.6,0.35,2.0,rubM);
    _addFloorsAndStairs(scene,B,cx,cz,W,D,floors,flH,y,'south');
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // BUREAUX — ouest  (aligné, porte côté EST vers avenue)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildOfficeA(scene,B){
    const cx=-56,cz=-212,W=12,D=9,wH=9.5,flH=2.6,floors=4;
    const y=ZS.getTerrainHeight(cx,cz);
    const oM=new THREE.MeshLambertMaterial({color:0x7a8090});
    B.slab(scene,cx,cz,y,W+0.8,D+0.8,mConc);
    B.wall(scene,cx,cz-D/2,y,W,0.24,wH,oM); B.wall(scene,cx,cz+D/2,y,W,0.24,wH,oM);
    B.wall(scene,cx-W/2,cz,y,0.24,D,wH,oM);
    // Porte EST (face avenue N-S)
    const dw=2.2, sw=(D-dw)/2;
    B.wall(scene,cx+W/2,cz-dw/2-sw/2,y,0.24,sw,wH,oM);
    B.wall(scene,cx+W/2,cz+dw/2+sw/2,y,0.24,sw,wH,oM);
    B.box(scene,cx+W/2,cz,y+wH-0.52,0.24,0.52,dw,oM);
    B.slab(scene,cx,cz,y+wH,W+0.3,D+0.3,mDark);
    for(let fl=0;fl<floors;fl++){const fy=y+1.4+fl*flH;
      B.box(scene,cx,cz-D/2-0.01,fy,W*0.6,1.2,0.07,mGlDk); B.box(scene,cx,cz+D/2+0.01,fy,W*0.6,1.2,0.07,mGlDk);
    }
    _addFloorsAndStairs(scene,B,cx,cz,W,D,floors,flH,y,'south');
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // BANQUE — ouest  (porte côté EST)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildBank(scene,B){
    const cx=-56,cz=-168,W=12,D=9,wH=6.0,flH=3.0,floors=2;
    const y=ZS.getTerrainHeight(cx,cz);
    const bnM=new THREE.MeshLambertMaterial({color:0x8a7860});
    B.slab(scene,cx,cz,y,W+0.8,D+0.8,mConc);
    B.wall(scene,cx,cz-D/2,y,W,0.26,wH,bnM); B.wall(scene,cx,cz+D/2,y,W,0.26,wH,bnM);
    B.wall(scene,cx-W/2,cz,y,0.26,D,wH,bnM);
    // Porte EST avec colonnes
    const dw=2.2, sw=(D-dw)/2;
    B.wall(scene,cx+W/2,cz-dw/2-sw/2,y,0.26,sw,wH,bnM);
    B.wall(scene,cx+W/2,cz+dw/2+sw/2,y,0.26,sw,wH,bnM);
    B.box(scene,cx+W/2,cz,y+wH-0.5,0.26,0.5,dw,bnM);
    B.slab(scene,cx,cz,y+wH,W+0.3,D+0.3,mRoof);
    const colM=new THREE.MeshLambertMaterial({color:0xc8bea8});
    for(const bz of[-2.8,0,2.8])B.box(scene,cx+W/2+0.28,cz+bz,y+wH*0.5,0.48,wH,0.48,colM);
    B.box(scene,cx+W/2+0.01,cz,y+1.7,0.06,1.6,D-2,mGlass);
    B.box(scene,cx,cz-D/2-0.01,y+wH-1.2,0.06,0.8,7,new THREE.MeshLambertMaterial({color:0x8a6020}));
    _addFloorsAndStairs(scene,B,cx,cz,W,D,floors,flH,y,'south');
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // STATION ESSENCE & PARKING (3 niveaux accessibles)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildGasStation(scene,B){
    B.gasStation(scene,-72,-132);
    B.car(scene,-62,-126,0.2,0x5a4a30); B.car(scene,-62,-132,-0.1,0x3a3a28);
  }

  function _buildParkingStructure(scene,B){
    const cx=36,cz=-128,W=14,D=11;
    const y=ZS.getTerrainHeight(cx,cz);
    const pkM=new THREE.MeshLambertMaterial({color:0x707468});
    const lnM=new THREE.MeshLambertMaterial({color:0xf0e8cc,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});

    for(let lvl=0;lvl<3;lvl++){
      const ly=y+lvl*3.2;
      B.slab(scene,cx,cz,ly,W,D,pkM);
      for(const[px,pz]of[[-4.5,-3.5],[0,-3.5],[4.5,-3.5],[-4.5,3.5],[0,3.5],[4.5,3.5]])
        B.box(scene,cx+px,cz+pz,ly+1.6,0.42,3.2,0.42,pkM);
      B.box(scene,cx-W/2,cz,ly+2.6,0.14,0.8,D,pkM);
      B.box(scene,cx+W/2,cz,ly+2.6,0.14,0.8,D,pkM);
      B.box(scene,cx,cz-D/2,ly+2.6,W,0.8,0.14,pkM);
      for(let i=-3;i<=3;i++) B.box(scene,cx+i*1.9,cz-2,ly+0.07,0.1,0.01,7,lnM);
      if(lvl<2){
        B.car(scene,cx-4,cz-2,0,0x2a2a22+lvl*0x0f0f0f);
        B.car(scene,cx,cz-2,0.05,0x3a4a2a);
        B.car(scene,cx+4,cz-2,-0.07,0x4a3a20);
      }
    }

    // ──  PLANCHERS PHYSIQUES (fix chute) ──────────────────────────────────────
    ZS.registerUpperFloor(cx, cz, W/2 - 0.3, D/2 - 0.3, y + 3.2);  // niveau 2
    ZS.registerUpperFloor(cx, cz, W/2 - 0.3, D/2 - 0.3, y + 6.4);  // niveau 3

    // Rampe d'accès (nord du parking, monte les 3 niveaux)
    ZS.registerRamp(cx-W/2-2.5, cz, 2.2, D*0.48, y, y+6.4, 'z');
    B.visualStairs(scene, cx-W/2-2.5, cz, y, y+6.4, 'z', 3.5, D*0.48);

    // Entrée nord (porte ouverte au rez)
    B.box(scene,cx+W/2+0.01,cz,y+4.5,0.06,2.8,5,new THREE.MeshLambertMaterial({color:0x1a3888}));
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // IMMEUBLES RÉSIDENTIELS — tous montables
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildResidential(scene,B){
    for(const t of[
      {cx:-78,cz:-244,W:8,D:7,floors:5,col:0x8a8070},
      {cx:40, cz:-244,W:8,D:7,floors:7,col:0x788090},
      {cx:-78,cz:-128,W:8,D:7,floors:4,col:0x988060},
      {cx:40, cz:-128,W:8,D:7,floors:3,col:0x8a7060},
      {cx:-15,cz:-244,W:10,D:7,floors:5,col:0x907858},
      {cx:-15,cz:-128,W:10,D:7,floors:3,col:0x8a7060},
    ]) _tower(scene,B,t.cx,t.cz,t.W,t.D,t.floors,t.col);
    for(const[hx,hz]of[[42,-244],[42,-235],[42,-128],[42,-120]])B.house(scene,hx,hz);
  }

  function _tower(scene,B,cx,cz,W,D,floors,col){
    const flH=2.8, wH=floors*flH;
    const y=ZS.getTerrainHeight(cx,cz);
    const tM=new THREE.MeshLambertMaterial({color:col});

    B.slab(scene,cx,cz,y,W+0.4,D+0.4,mConc);
    // N, S, O — pleins
    B.wall(scene,cx,cz-D/2,y,W,0.22,wH,tM);
    B.wall(scene,cx,cz+D/2,y,W,0.22,wH,tM);
    B.wall(scene,cx-W/2,cz,y,0.22,D,wH,tM);
    // EST : porte 2.0m
    const dw=2.0, sw=(D-dw)/2;
    B.wall(scene,cx+W/2,cz-dw/2-sw/2,y,0.22,sw,wH,tM);
    B.wall(scene,cx+W/2,cz+dw/2+sw/2,y,0.22,sw,wH,tM);
    B.box(scene,cx+W/2,cz,y+wH-0.4,0.22,0.4,dw,tM);

    B.slab(scene,cx,cz,y+wH,W+0.28,D+0.28,mRoof);
    // Fenêtres
    for(let fl=0;fl<floors;fl++){const fy=y+1.2+fl*flH;
      for(const fx of[-W/2+1.0,0,W/2-1.0]){
        B.box(scene,cx+fx,cz-D/2-0.01,fy,1.3,1.1,0.06,mGlass);
        B.box(scene,cx+fx,cz+D/2+0.01,fy,1.3,1.1,0.06,mGlass);
      }
    }
    for(let fl=1;fl<floors;fl++)
      B.box(scene,cx,cz,y+fl*flH,W+0.08,0.08,D+0.08,new THREE.MeshLambertMaterial({color:Math.max(0,col-0x101010)}));

    // Planchers physiques + escalier intérieur
    _addFloorsAndStairs(scene,B,cx,cz,W,D,floors,flH,y,'south');
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // VÉHICULES
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildVehicles(scene,B){
    for(const[vx,vz,vr,vc]of[
      [42,-186.5,0.05,0x3a2a18],[32,-183.5,-0.07,0x2a3a2a],[22,-186,-0.08,0x4a3818],
      [12,-184,0.10,0x1a2a3a],[2,-186.8,-0.05,0x3a3a28],[-8,-183,0.08,0x2a1a18],
      [-18,-186,3.1,0x4a4030],[-28,-183.5,-0.09,0x3a2820],[-38,-186.5,0.06,0x1a3a2a],
      [-48,-183,0.0,0x2a3030],[-58,-186.8,-0.07,0x4a2a18],[-68,-183.5,0.09,0x3a3828],
      [-78,-186,3.18,0x2a2a20],
    ])B.car(scene,vx,vz,vr,vc);
    B.car(scene,16,-183.5,-0.12,0xddbb00); B.car(scene,-22,-186,0.08,0xddbb00);
    for(const[vx,vc]of[[40,0x3a2a18],[15,0x2a3a2a],[-10,0x4a3018],[-35,0x1a2a3a],[-60,0x3a3028]])B.car(scene,vx,-240,0.1,vc);
    for(const[vx,vc]of[[38,0x2a2a20],[12,0x3a2818],[-14,0x4a3a28],[-38,0x2a3a2a],[-62,0x1a2820]])B.car(scene,vx,-135,Math.PI+0.1,vc);
    for(const[vx,vz]of[[42,-185],[-8,-186.5],[-58,-183]])B.car(scene,vx,vz,0.22,0x1a1a18);
    _bus(scene,B,26,-185.5,0.10); _bus(scene,B,-42,-184.5,Math.PI);
  }

  function _bus(scene,B,cx,cz,ry){
    const py=ZS.getTerrainHeight(cx,cz);
    const bodyM=new THREE.MeshLambertMaterial({color:0x1e2a6a}),dM=new THREE.MeshLambertMaterial({color:0x181818});
    const g=new THREE.Group();
    const b=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.0,8.5),bodyM);b.position.y=1.08;b.castShadow=true;g.add(b);
    for(let i=0;i<5;i++)for(const sx of[-1.22,1.22]){const w=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.72,1.25),mGlass);w.position.set(sx,1.6,-2.88+i*1.45);g.add(w);}
    for(const[ox,oz]of[[-1.25,-3.0],[1.25,-3.0],[-1.25,0],[1.25,0],[-1.25,3.0],[1.25,3.0]]){
      const w=new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.44,0.26,9),dM);w.rotation.z=Math.PI/2;w.position.set(ox,0.46,oz);g.add(w);
    }
    g.position.set(cx,py,cz);g.rotation.y=ry;scene.add(g);
    B.addCollider({type:'box',cx,cz,hw:1.3,hd:4.4,maxY:py+2.2});
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // LAMPADAIRES
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildStreetLights(scene,B){
    const polM=new THREE.MeshLambertMaterial({color:0x3a3a3a});
    const lmM=new THREE.MeshLambertMaterial({color:0xffffcc,emissive:0xffeeaa,emissiveIntensity:2.5});
    for(const[lx,lz,side]of[
      [42,-190,-1],[30,-180,1],[18,-190,-1],[6,-180,1],[-6,-190,-1],
      [-18,-180,1],[-30,-190,-1],[-42,-180,1],[-54,-190,-1],[-66,-180,1],
    ]){
      const ly=ZS.getTerrainHeight(lx,lz);
      B.box(scene,lx,lz,ly+2.7,0.09,5.4,0.09,polM);
      const arm=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,1.5),polM);arm.position.set(lx,ly+5.2,lz+side*0.62);scene.add(arm);
      const fix=new THREE.Mesh(new THREE.BoxGeometry(0.38,0.2,0.55),lmM);fix.position.set(lx,ly+5.0,lz+side*1.38);scene.add(fix);
      const pt=new THREE.PointLight(0xffeecc,4.5,34);pt.position.set(lx,ly+4.8,lz+side*1.42);scene.add(pt);
      B.addCollider({x:lx,z:lz,r:0.1});
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MOBILIER URBAIN
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildStreetFurniture(scene,B){
    const bnM=new THREE.MeshLambertMaterial({color:0x2a2820});
    const trM=new THREE.MeshLambertMaterial({color:0x1a3a18}),dTrM=new THREE.MeshLambertMaterial({color:0x4a3818});
    for(const[bx,bz]of[[40,-190],[26,-180],[12,-190],[-2,-180],[-16,-190],[-30,-180],[-44,-190],[-58,-180]]){
      const by=ZS.getTerrainHeight(bx,bz);
      B.box(scene,bx,bz,by+0.5,1.6,0.08,0.38,bnM);B.box(scene,bx,bz+0.18,by+0.34,1.6,0.6,0.07,bnM);
      for(const ox of[-0.62,0.62])B.box(scene,bx+ox,bz,by+0.24,0.08,0.48,0.38,bnM);
    }
    const tGeo=new THREE.SphereGeometry(1.6,7,5);
    const tTrk=new THREE.CylinderGeometry(0.12,0.16,4.0,7);
    for(const[tx,tz,alive]of[
      [40,-190,true],[28,-180,true],[14,-190,false],[0,-180,true],[-14,-190,true],
      [-28,-180,false],[-42,-190,true],[-56,-180,true],[-70,-190,false],
    ]){
      const ty=ZS.getTerrainHeight(tx,tz);
      const trunk=new THREE.Mesh(tTrk,alive?trM:dTrM);trunk.position.set(tx,ty+2.0,tz);trunk.castShadow=true;scene.add(trunk);
      if(alive){const crown=new THREE.Mesh(tGeo,new THREE.MeshLambertMaterial({color:0x2a5018}));crown.position.set(tx,ty+5.0,tz);crown.castShadow=true;scene.add(crown);}
      B.addCollider({x:tx,z:tz,r:0.14});
    }
    for(const[sx,sz,ry]of[[26,-190.8,0],[-18,-179.2,Math.PI],[-54,-190.8,0]])_busStop(scene,B,sx,sz,ry);
    const tfM=new THREE.MeshLambertMaterial({color:0x1a1a18});
    for(const[ix,iz]of[[-20,-185],[36,-185],[-64,-185]]){
      const iy=ZS.getTerrainHeight(ix,iz);
      B.box(scene,ix,iz-4.5,iy+2.5,0.09,5.0,0.09,tfM);B.box(scene,ix,iz-4.5,iy+5.0,0.38,1.0,0.48,tfM);
      B.box(scene,ix,iz-4.5,iy+4.65,0.34,0.28,0.4,new THREE.MeshLambertMaterial({color:0x991111}));
    }
    const pbM=new THREE.MeshLambertMaterial({color:0x2a2a22});
    for(const[px,pz,pr]of[[42,-183,0.4],[16,-187,-0.3],[-8,-183,0.5],[-32,-187,0.2],[-56,-183,0.35]]){
      const py=ZS.getTerrainHeight(px,pz);
      const bin=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,7),pbM);bin.rotation.z=pr;bin.position.set(px,py+0.2,pz);bin.castShadow=true;scene.add(bin);
    }
  }

  function _busStop(scene,B,sx,sz,ry){
    const by=ZS.getTerrainHeight(sx,sz);
    const frM=new THREE.MeshLambertMaterial({color:0x2a3a52}),rfM=new THREE.MeshLambertMaterial({color:0x1e2a40});
    const g=new THREE.Group();g.position.set(sx,by,sz);g.rotation.y=ry;
    const sl=new THREE.Mesh(new THREE.BoxGeometry(3.2,0.08,1.4),new THREE.MeshLambertMaterial({color:0x7a7268}));sl.position.set(0,0.04,0);g.add(sl);
    for(const px of[-1.4,1.4]){const p=new THREE.Mesh(new THREE.BoxGeometry(0.09,2.6,0.09),frM);p.position.set(px,1.3,0.5);g.add(p);}
    const roof=new THREE.Mesh(new THREE.BoxGeometry(3.15,0.10,1.5),rfM);roof.position.set(0,2.65,0.1);g.add(roof);
    const pan=new THREE.Mesh(new THREE.BoxGeometry(2.95,2.3,0.06),mGlass);pan.position.set(0,1.25,0.54);g.add(pan);
    scene.add(g);B.addCollider({type:'box',cx:sx,cz:sz,hw:1.7,hd:0.82});
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
    for(const[bx,bz]of[[42,-191],[42,-179],[-20,-191],[-20,-179],[-64,-191],[-64,-179]])
      B.box(scene,bx,bz,y+0.52,1.6,0.95,0.82,cncM);
    for(const[rx,rz,rw,rd,rh]of[[36,-193,3.2,2.2,0.55],[3,-193,3.5,2.8,0.72],[-28,-193,2.8,1.8,0.48],[-60,-193,3.2,2.2,0.62]])
      B.box(scene,rx,rz,ZS.getTerrainHeight(rx,rz)+rh/2,rw,rh,rd,rubM);
    for(const[sx,sz]of[[30,-193],[-5,-177],[-38,-193],[-68,-177]])
      for(let i=0;i<3;i++)B.box(scene,sx+i*0.95,sz,y+0.28,0.88,0.52,0.48,sandM);
    for(const[px,pz]of[[42,-183],[28,-187],[14,-183],[0,-187],[-14,-183],[-28,-187],[-42,-183],[-56,-187],[-70,-183]]){
      const py=ZS.getTerrainHeight(px,pz);
      const c=new THREE.Mesh(new THREE.ConeGeometry(0.19,0.60,6),coneM);c.position.set(px,py+0.31,pz);c.rotation.z=(Math.random()-0.5)*1.0;scene.add(c);
    }
    const helpM=new THREE.MeshLambertMaterial({color:0xcc3311});
    const hb=new THREE.Mesh(new THREE.BoxGeometry(3.5,1.8,0.05),helpM);
    hb.position.set(12,ZS.getTerrainHeight(12,-240)+2.2,-240.18);scene.add(hb);
    const wM=new THREE.MeshLambertMaterial({color:0x1a1a18});
    B.box(scene,-10,-185,y+0.14,6,0.05,0.05,wM); B.box(scene,-10,-185,y+0.14,0.05,2.5,0.05,wM);
    const crM=new THREE.MeshLambertMaterial({color:0x3a3630,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-5});
    for(const[fx,fz]of[[40,-185],[14,-185],[-8,-185],[-32,-185],[-56,-185]])B.box(scene,fx,fz,y+0.06,3.0,0.01,2.1,crM);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  ZS.Buildings.registerSector({ build });
}());
