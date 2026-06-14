// Hangar + armurerie + bunker
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
