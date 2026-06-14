// Casernes + mess + médical
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
