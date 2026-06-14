// Banque, parking, résidentiel
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
    ZS.registerLoot('maison', cx, cz, W, D);
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
