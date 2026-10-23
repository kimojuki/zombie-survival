// Hôpital, commerces, école
function _buildHospital(scene, B) {
    const cx=-55, cz=-244, W=16, D=9, wH=14.0, flH=2.8, floors=5;
    ZS.registerLoot('hopital', cx, cz, W, D);
    const y=ZS.getTerrainHeight(cx,cz);
    const hM=new THREE.MeshLambertMaterial({color:0x9aa8b0});
    B.slab(scene,cx,cz,y,W+0.8,D+0.8,mConc);
    // Murs N, E, O — complets
    B.wall(scene,cx,cz-D/2,y,W,0.26,wH,hM);
    B.wall(scene,cx-W/2,cz,y,0.26,D,wH,hM);
    B.wall(scene,cx+W/2,cz,y,0.26,D,wH,hM);
    // Mur SUD : porte 2.8m centrée
    const dw=2.8, sw=(W-dw)/2;
    B.wall(scene,cx-dw/2-sw/2,cz+D/2,y,sw,0.26,wH,hM);
    B.wall(scene,cx+dw/2+sw/2,cz+D/2,y,sw,0.26,wH,hM);
    B.box(scene,cx,cz+D/2,y+wH-0.6,dw,0.6,0.26,hM);
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
    ZS.registerLoot('supermarche', cx, cz, W, D);
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
    const cM=new THREE.MeshLambertMaterial({color:0x888880});
    for(const[ox,oz]of[[cx+W/2+3,cz-1],[cx+W/2+5,cz+2],[cx+W/2+7,cz-3]])B.box(scene,ox,oz,ZS.getTerrainHeight(ox,oz)+0.3,0.85,0.6,0.4,cM);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // COMMISSARIAT — SW  (porte côté NORD vers rue sud)
  // ══════════════════════════════════════════════════════════════════════════════

  function _buildPoliceStation(scene,B){
    const cx=-55,cz=-128,W=15,D=11,wH=6.5,flH=3.25,floors=2;
    ZS.registerLoot('police', cx, cz, W, D);
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
    // Murs NORD et SUD : porte 3.0m centrée (accès rue principale)
    const dw_ns=3.0, sw_ns=(W-dw_ns)/2;
    B.wall(scene,cx-dw_ns/2-sw_ns/2,cz-D/2,y,sw_ns,0.24,wH,cM);
    B.wall(scene,cx+dw_ns/2+sw_ns/2,cz-D/2,y,sw_ns,0.24,wH,cM);
    B.box(scene,cx,cz-D/2,y+wH-0.5,dw_ns,0.5,0.24,cM);
    B.wall(scene,cx-dw_ns/2-sw_ns/2,cz+D/2,y,sw_ns,0.24,wH,cM);
    B.wall(scene,cx+dw_ns/2+sw_ns/2,cz+D/2,y,sw_ns,0.24,wH,cM);
    B.box(scene,cx,cz+D/2,y+wH-0.5,dw_ns,0.5,0.24,cM);
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
