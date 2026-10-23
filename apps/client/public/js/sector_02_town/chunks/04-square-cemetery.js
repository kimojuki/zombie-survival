// Place + cimetière + abribus — extrait de sector_02_town.js (IIFE)
  // ── Place centrale ────────────────────────────────────────────────────────────

  function _buildTownSquare(scene, B) {
    const cx = -168, cz = -24;
    const baseY = ZS.getTerrainHeight(cx, cz);

    // Pavés de la place
    const pavMat = new THREE.MeshLambertMaterial({ color: 0x8e8680, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-3 });
    B.slab(scene, cx, cz, baseY+0.03, 20, 10, pavMat);
    // Allée centrale
    const alMat = new THREE.MeshLambertMaterial({ color: 0x7a7268, polygonOffset:true, polygonOffsetFactor:-3, polygonOffsetUnits:-5 });
    B.slab(scene, cx, cz, baseY+0.05, 2.0, 8.8, alMat);

    // Fontaine asséchée (bassin octogonal)
    const stMat = new THREE.MeshLambertMaterial({ color: 0x888078 });
    const msMat = new THREE.MeshLambertMaterial({ color: 0x4a5a48 }); // fond de bassin
    B.box(scene, cx, cz, baseY+0.20, 3.0, 0.40, 3.0, stMat);
    B.slab(scene, cx, cz, baseY+0.42, 2.4, 2.4, msMat);
    B.box(scene, cx, cz-1.2, baseY+0.56, 3.0, 0.28, 0.14, stMat);
    B.box(scene, cx, cz+1.2, baseY+0.56, 3.0, 0.28, 0.14, stMat);
    B.box(scene, cx-1.2, cz, baseY+0.56, 0.14, 0.28, 3.0, stMat);
    B.box(scene, cx+1.2, cz, baseY+0.56, 0.14, 0.28, 3.0, stMat);
    B.box(scene, cx, cz, baseY+0.72, 0.30, 1.30, 0.30, stMat); // colonne
    B.box(scene, cx, cz, baseY+1.72, 0.80, 0.14, 0.80, stMat); // vasque haute
    B.box(scene, cx, cz, baseY+1.10, 0.14, 0.88, 0.14, stMat); // tige médiane
    const plqMat = new THREE.MeshLambertMaterial({ color: 0xb89844 });
    B.box(scene, cx, cz-0.16, baseY+1.05, 0.20, 0.30, 0.05, plqMat); // plaque
    B.addCollider({ type:'box', cx, cz, hw:1.6, hd:1.6 });

    // 4 bacs à fleurs morts aux coins
    const potMat  = new THREE.MeshLambertMaterial({ color: 0x786858 });
    const soilMat = new THREE.MeshLambertMaterial({ color: 0x4a3a28 });
    const stickMat= new THREE.MeshLambertMaterial({ color: 0x6a5030 });
    for (const [ox, oz] of [[-7,-4],[7,-4],[-7,4],[7,4]]) {
      const py = ZS.getTerrainHeight(cx+ox, cz+oz);
      B.box(scene, cx+ox, cz+oz, py+0.30, 0.95, 0.58, 0.95, potMat);
      B.slab(scene, cx+ox, cz+oz, py+0.60, 0.82, 0.82, soilMat);
      B.box(scene, cx+ox, cz+oz, py+0.82, 0.06, 0.48, 0.06, stickMat);
      B.addCollider({ type:'box', cx:cx+ox, cz:cz+oz, hw:0.52, hd:0.52 });
    }

    // Bancs autour de la fontaine
    for (const [bx, bz, ry] of [
      [cx-5, cz, Math.PI/2], [cx+5, cz, -Math.PI/2], [cx, cz-4, 0], [cx, cz+4, Math.PI]
    ]) _buildBench(scene, B, bx, bz, ZS.getTerrainHeight(bx, bz));

    // Panneau d'entrée de ville (côté est de la place)
    const sPole = new THREE.MeshLambertMaterial({ color: 0x4a4a3a });
    const sSign = new THREE.MeshLambertMaterial({ color: 0x1e4a1e });
    const sBord = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const entryX = cx + 9.5, entryZ = cz;
    const eY = ZS.getTerrainHeight(entryX, entryZ);
    B.box(scene, entryX-0.9, entryZ, eY+1.5, 0.10, 3.0, 0.10, sPole);
    B.box(scene, entryX+0.9, entryZ, eY+1.5, 0.10, 3.0, 0.10, sPole);
    B.box(scene, entryX, entryZ, eY+2.9, 2.2, 0.58, 0.14, sSign);
    B.box(scene, entryX, entryZ, eY+2.9, 2.3, 0.60, 0.10, sBord);
  }

  // ── Cimetière ────────────────────────────────────────────────────────────────

  function _buildCemetery(scene, B) {
    const cx = -228, cz = -52;
    const baseY = ZS.getTerrainHeight(cx, cz);

    // Sol sombre du cimetière
    const dkGrass = new THREE.MeshLambertMaterial({ color: 0x283a24, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-3 });
    B.slab(scene, cx, cz, baseY+0.02, 22, 18, dkGrass);
    B.slab(scene, cx, cz, baseY+0.04, 2.0, 14, B.M.concDark); // allée

    // Clôture en fer forgé
    const irMat = new THREE.MeshLambertMaterial({ color: 0x1e1e1e });
    for (const [ax,az,w,d] of [
      [cx,cz-9,22.2,0.07],[cx,cz+9,22.2,0.07],[cx-11,cz,0.07,18.2],[cx+11,cz,0.07,18.2]
    ]) {
      B.box(scene,ax,az,baseY+1.06,w,0.07,d,irMat);
      B.box(scene,ax,az,baseY+0.52,w,0.07,d,irMat);
    }
    for (let i=0;i<=11;i++) { B.box(scene,cx-11+i*2,cz-9,baseY+0.78,0.07,1.56,0.07,irMat); B.box(scene,cx-11+i*2,cz+9,baseY+0.78,0.07,1.56,0.07,irMat); }
    for (let i=0;i<=9;i++)  { B.box(scene,cx-11,cz-9+i*2,baseY+0.78,0.07,1.56,0.07,irMat); B.box(scene,cx+11,cz-9+i*2,baseY+0.78,0.07,1.56,0.07,irMat); }
    // Portail (côté est, face à la chapelle)
    B.box(scene,cx+11,cz+1.6,baseY+1.1,0.12,2.2,0.12,irMat);
    B.box(scene,cx+11,cz-1.6,baseY+1.1,0.12,2.2,0.12,irMat);

    // Pierres tombales (croix + stèles)
    const gSt = new THREE.MeshLambertMaterial({ color: 0x8c8a88 });
    const gDk = new THREE.MeshLambertMaterial({ color: 0x686468 });
    const gMd = new THREE.MeshLambertMaterial({ color: 0x364030, polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-2 });
    for (const [gx,gz,cross] of [
      [-234,-57,true],[-230,-57,false],[-226,-57,true],[-222,-57,false],[-218,-57,true],
      [-232,-51,false],[-228,-51,true],[-224,-51,false],[-220,-51,true],[-216,-51,false],
      [-230,-45,true],[-226,-45,false],[-222,-45,true],[-218,-45,false],
    ]) {
      const gy = ZS.getTerrainHeight(gx,gz);
      B.slab(scene,gx,gz+0.35,gy+0.04,0.52,1.12,gMd);
      if (cross) {
        B.box(scene,gx,gz,gy+0.52,0.12,1.02,0.10,gSt);
        B.box(scene,gx,gz+0.15,gy+0.82,0.46,0.10,0.08,gSt);
      } else {
        B.box(scene,gx,gz-0.1,gy+0.44,0.36,0.88,0.12,gDk);
        B.box(scene,gx,gz-0.1,gy+0.96,0.40,0.14,0.14,gDk);
      }
    }
    // Pierre tombale renversée (atmosphère post-apo)
    const fallen = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.85,0.12), gDk);
    fallen.rotation.z = Math.PI/2.2;
    fallen.position.set(-222, ZS.getTerrainHeight(-222,-45)+0.18, -45);
    scene.add(fallen);

    // Cyprès funèbre
    const cypMat = new THREE.MeshLambertMaterial({ color: 0x0e2818 });
    const cypTrk = new THREE.MeshLambertMaterial({ color: 0x3a2010 });
    const cy2 = ZS.getTerrainHeight(cx-7, cz-7);
    const trC  = new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.16,6.5,8), cypTrk);
    trC.position.set(cx-7, cy2+3.25, cz-7); trC.castShadow=true; scene.add(trC);
    for (const [dy,r] of [[1.0,0.65],[2.1,0.57],[3.2,0.47],[4.2,0.35],[5.2,0.22],[6.1,0.10]]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(r,1.35,7), cypMat);
      c.position.set(cx-7, cy2+dy, cz-7); c.castShadow=true; scene.add(c);
    }
    B.addCollider({ x:cx-7, z:cz-7, r:0.14 });
  }

  // ── Abribus ───────────────────────────────────────────────────────────────────

  function _buildBusStops(scene, B) {
    const frMat  = new THREE.MeshLambertMaterial({ color: 0x2a3a52 });
    const glMat  = new THREE.MeshLambertMaterial({ color: 0x688898, transparent:true, opacity:0.50 });
    const rfMat  = new THREE.MeshLambertMaterial({ color: 0x1e2a40 });
    const slbMat = new THREE.MeshLambertMaterial({ color: 0x7a7268, polygonOffset:true, polygonOffsetFactor:-1 });

    for (const [sx,sz,ry] of [[-148,-4.8,0],[-210,4.8,Math.PI]]) {
      const by = ZS.getTerrainHeight(sx,sz);
      const g  = new THREE.Group();
      g.position.set(sx, by, sz);
      g.rotation.y = ry;

      // Dalle béton devant l'abribus
      const sl = new THREE.Mesh(new THREE.BoxGeometry(3.4,0.08,1.5), slbMat);
      sl.position.set(0,0.04,0); g.add(sl);
      // 2 montants
      for (const px of [-1.45, 1.45]) {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.09,2.7,0.09), frMat);
        pole.position.set(px,1.35,0.52); g.add(pole);
      }
      // Toit
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3,0.10,1.55), rfMat);
      roof.position.set(0,2.75,0.12); g.add(roof);
      // Paroi vitrée arrière
      const pan = new THREE.Mesh(new THREE.BoxGeometry(3.1,2.4,0.06), glMat);
      pan.position.set(0,1.30,0.56); g.add(pan);
      // Panneau publicitaire obstrué
      const adM = new THREE.MeshLambertMaterial({ color:0x3a3a38 });
      const ad  = new THREE.Mesh(new THREE.BoxGeometry(1.1,1.0,0.08), adM);
      ad.position.set(-0.8,1.60,0.59); g.add(ad);
      // Siège
      const stM = new THREE.Mesh(new THREE.BoxGeometry(2.5,0.08,0.36), frMat);
      stM.position.set(0.2,0.52,0.44); g.add(stM);

      scene.add(g);
      B.addCollider({ type:'box', cx:sx, cz:sz, hw:1.8, hd:0.85 });
    }
  }

  // ── Signalisation ────────────────────────────────────────────────────────────

  function _buildSignage(scene, B) {
    const polMat  = new THREE.MeshLambertMaterial({ color: 0x4a4a3a });
    const stopMat = new THREE.MeshLambertMaterial({ color: 0xcc1111 });
    const whtMat  = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    const tfBx    = new THREE.MeshLambertMaterial({ color: 0x181818 });
    const tfRd    = new THREE.MeshLambertMaterial({ color: 0x991111 }); // rouge éteint
    const tfGn    = new THREE.MeshLambertMaterial({ color: 0x113311 }); // vert éteint
    const tfAm    = new THREE.MeshLambertMaterial({ color: 0x442200 }); // orange éteint
    const dirMat  = new THREE.MeshLambertMaterial({ color: 0x1e4a1e });
    const zebMat  = new THREE.MeshLambertMaterial({ color: 0xd4d0c8, polygonOffset:true, polygonOffsetFactor:-3, polygonOffsetUnits:-5 });
    const entMat  = new THREE.MeshLambertMaterial({ color: 0x2a4a22 });

    // --- Panneaux d'entrée / sortie de ville ---
    for (const [ex,ez] of [[-128,-4],[-264, 4]]) {
      const ey = ZS.getTerrainHeight(ex,ez);
      B.box(scene,ex,ez,ey+1.5,0.10,3.0,0.10,polMat);
      B.box(scene,ex,ez,ey+2.9,2.4,0.58,0.14,entMat);
      B.box(scene,ex,ez,ey+2.9,2.5,0.60,0.10,whtMat);
      B.addCollider({ x:ex, z:ez, r:0.10 });
    }

    // --- Feux de circulation (tous éteints/rouges – apocalypse) ---
    for (const [tx,tz] of [[-136,-5.8],[-170,-5.8],[-210,-5.8],[-136,5.8],[-170,5.8],[-210,5.8]]) {
      const ty = ZS.getTerrainHeight(tx,tz);
      B.box(scene,tx,tz,ty+2.5,0.10,5.0,0.10,polMat);
      B.box(scene,tx,tz,ty+5.05,0.38,0.92,0.26,tfBx);
      B.box(scene,tx,tz,ty+5.30,0.26,0.26,0.28,tfRd);
      B.box(scene,tx,tz,ty+5.02,0.26,0.26,0.28,tfAm);
      B.box(scene,tx,tz,ty+4.74,0.26,0.26,0.28,tfGn);
      B.addCollider({ x:tx, z:tz, r:0.10 });
    }

    // --- Panneaux STOP aux intersections ---
    for (const [px,pz] of [[-134,-6.2],[-168,-6.2],[-208,-6.2],[-134,6.2],[-208,6.2]]) {
      const py = ZS.getTerrainHeight(px,pz);
      B.box(scene,px,pz,py+1.5,0.08,3.0,0.08,polMat);
      B.box(scene,px,pz,py+3.12,0.58,0.58,0.10,stopMat);
      B.box(scene,px,pz,py+3.12,0.40,0.40,0.12,whtMat);
      B.addCollider({ x:px, z:pz, r:0.10 });
    }

    // --- Panneaux de direction ---
    for (const [dx,dz,ry] of [[-130,6,0.3],[-130,-5.5,-0.3]]) {
      const dy = ZS.getTerrainHeight(dx,dz);
      B.box(scene,dx,dz,dy+1.5,0.08,4.0,0.08,polMat);
      B.box(scene,dx,dz,dy+3.9,1.8,0.35,0.12,dirMat);
      B.box(scene,dx+0.6,dz,dy+3.9,0.6,0.24,0.14,dirMat); // flèche
      B.addCollider({ x:dx, z:dz, r:0.10 });
    }

    // --- Passages piétons aux transversales ---
    for (const zx of [-136,-170,-210]) {
      for (const zz of [-3.4,-2.2,-1.0,0.2,1.4,2.6]) {
        const zy = ZS.getTerrainHeight(zx,zz)+0.06;
        B.slab(scene,zx,zz,zy,3.2,0.7,zebMat);
      }
    }

    // --- Bollards jaunes le long des trottoirs (toutes les 8m) ---
    const bollMat = new THREE.MeshLambertMaterial({ color: 0xe8b820 });
    for (let bx=-134; bx>=-248; bx-=8) {
      for (const bz of [-5.65, 5.65]) {
        const by = ZS.getTerrainHeight(bx,bz);
        B.box(scene,bx,bz,by+0.52,0.18,1.04,0.18,bollMat);
        B.addCollider({ x:bx, z:bz, r:0.12 });
      }
    }
  }
