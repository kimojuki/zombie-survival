// Signalisation + extras + registerSector — extrait de sector_02_town.js (IIFE)
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

  // ── Étals de marché abandonnés ────────────────────────────────────────────────

  function _buildMarketStalls(scene, B) {
    const frMat = new THREE.MeshLambertMaterial({ color: 0x5a4530 });
    const tents = [
      { cx:-162, cz:20, col:0x882822 },
      { cx:-172, cz:20, col:0x224488 },
      { cx:-182, cz:20, col:0x4a7222 },
    ];
    for (const { cx, cz, col } of tents) {
      const by = ZS.getTerrainHeight(cx, cz);
      const tMat = new THREE.MeshLambertMaterial({ color:col, side:THREE.DoubleSide });
      // 4 poteaux
      for (const [ox,oz] of [[-1.4,-1.1],[1.4,-1.1],[-1.4,1.1],[1.4,1.1]]) {
        B.box(scene, cx+ox, cz+oz, by+1.2, 0.09, 2.4, 0.09, frMat);
      }
      // Comptoir
      B.box(scene, cx, cz-0.3, by+0.95, 2.7, 0.08, 0.8, frMat);
      B.box(scene, cx, cz-0.3, by+0.52, 2.7, 1.02, 0.08, frMat); // façade
      // Bâche inclinée
      const tPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), tMat);
      tPlane.rotation.set(-Math.PI/2 + 0.20, 0, 0);
      tPlane.position.set(cx, by+2.45, cz);
      scene.add(tPlane);
      // Objets renversés (ambiance zombie)
      B.box(scene, cx+0.5, cz-1.5, by+0.12, 0.6, 0.22, 0.4, frMat);
      B.addCollider({ type:'box', cx, cz, hw:1.5, hd:0.55 });
    }
  }

  // ── Détails urbains ───────────────────────────────────────────────────────────

  function _buildUrbanExtras(scene, B) {
    // --- Bornes incendie ---
    const hyMat = new THREE.MeshLambertMaterial({ color:0xcc2222 });
    const hyCap = new THREE.MeshLambertMaterial({ color:0xccaa10 });
    for (const [hx,hz] of [[-144,-6.8],[-192,-6.8],[-168,6.8],[-215,6.8],[-141,6.8],[-228,-6.8]]) {
      const hy = ZS.getTerrainHeight(hx,hz);
      B.box(scene,hx,hz,hy+0.32,0.22,0.62,0.22,hyMat);
      B.box(scene,hx,hz,hy+0.68,0.30,0.12,0.30,hyMat);
      B.box(scene,hx,hz,hy+0.80,0.18,0.14,0.18,hyCap);
      B.box(scene,hx,hz+0.12,hy+0.36,0.08,0.10,0.28,hyMat); // pipe latérale
      B.addCollider({ x:hx, z:hz, r:0.16 });
    }

    // --- Dumpsters / grosses poubelles ---
    const dpMat = new THREE.MeshLambertMaterial({ color:0x2a4228 });
    const dpLid = new THREE.MeshLambertMaterial({ color:0x223620 });
    for (const [dx,dz] of [[-155,-14],[-195, 13],[-228,13],[-244,-14]]) {
      const dy = ZS.getTerrainHeight(dx,dz);
      B.box(scene,dx,dz,dy+0.72,1.85,1.44,0.92,dpMat);
      B.box(scene,dx+0.2,dz-0.1,dy+1.48,0.88,0.12,0.90,dpLid); // couvercle ouvert (bascule)
      B.box(scene,dx-0.4,dz+0.5,dy+1.48,0.88,0.12,0.90,dpLid);
      B.addCollider({ type:'box', cx:dx, cz:dz, hw:0.98, hd:0.50, maxY:dy+1.5 });
    }

    // --- Kiosque à journaux (fermé, vitres brisées) ---
    const kMat = new THREE.MeshLambertMaterial({ color:0x3a5a3a });
    const kGl  = new THREE.MeshLambertMaterial({ color:0x5a8080, transparent:true, opacity:0.4 });
    const kRf  = new THREE.MeshLambertMaterial({ color:0x284228 });
    const kCnt = new THREE.MeshLambertMaterial({ color:0x303830 });
    B.box(scene,-145.5,8.0,ZS.getTerrainHeight(-145.5,8.0)+1.1,2.2,2.2,1.8,kMat);
    B.box(scene,-145.5,8.0,ZS.getTerrainHeight(-145.5,8.0)+2.28,2.4,0.18,2.0,kRf);
    B.box(scene,-145.5,8.85,ZS.getTerrainHeight(-145.5,8.85)+1.4,1.8,1.0,0.07,kGl);
    B.box(scene,-145.5,8.9,ZS.getTerrainHeight(-145.5,8.9)+0.55,1.8,0.95,0.10,kCnt);
    B.addCollider({ type:'box', cx:-145.5, cz:8.0, hw:1.2, hd:1.0 });

    // --- Cabine téléphonique renversée ---
    const pbMt = new THREE.MeshLambertMaterial({ color:0xcc4422 });
    const pbGl = new THREE.MeshLambertMaterial({ color:0x6a9898, transparent:true, opacity:0.38 });
    const pby  = ZS.getTerrainHeight(-200, 7);
    const booth = new THREE.Mesh(new THREE.BoxGeometry(1.0,2.2,1.0), pbMt);
    booth.rotation.z = Math.PI/2.05;
    booth.position.set(-200, pby+0.55, 7);
    booth.castShadow = true; scene.add(booth);
    const pbW = new THREE.Mesh(new THREE.BoxGeometry(0.06,1.5,0.72), pbGl);
    pbW.rotation.z = Math.PI/2.05;
    pbW.position.set(-200.12, pby+0.55, 7); scene.add(pbW);
    B.addCollider({ type:'box', cx:-200, cz:7, hw:0.55, hd:1.15 });

    // --- Caddie renversé près du supermarché ---
    const cdM = new THREE.MeshLambertMaterial({ color:0x6e6e6e });
    const cdy = ZS.getTerrainHeight(-183, 25);
    const cart = new THREE.Group();
    cart.position.set(-183, cdy, 25);
    cart.rotation.z = 0.42;
    const cBase = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.65,1.5), cdM); cBase.position.set(0,0.42,0); cart.add(cBase);
    const cTop  = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.08,1.5), cdM); cTop.position.set(0,0.76,0);  cart.add(cTop);
    for (const [ox,oz] of [[-0.38,-0.65],[0.38,-0.65],[-0.38,0.65],[0.38,0.65]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.07,7), cdM);
      w.rotation.z = Math.PI/2; w.position.set(ox,-0.05,oz); cart.add(w);
    }
    scene.add(cart);

    // --- Boîtes de jonction électrique sur poteaux ---
    const utM = new THREE.MeshLambertMaterial({ color:0x4a4838 });
    for (const [ux,uz] of [[-150,-6.8],[-172,-6.8],[-200,-6.8],[-226,-6.8]]) {
      const uy = ZS.getTerrainHeight(ux,uz);
      B.box(scene,ux,uz,uy+1.0,0.09,2.0,0.09,utM);
      B.box(scene,ux,uz,uy+1.85,0.38,0.58,0.24,utM);
      B.addCollider({ x:ux, z:uz, r:0.12 });
    }

    // --- Palettes en bois abandonnées (déchets, ambiance) ---
    const palM = new THREE.MeshLambertMaterial({ color:0x7a5530 });
    for (const [px,pz,ry] of [[-158,-14,0.4],[-243,14,-0.3],[-195,-14,0.1]]) {
      const py = ZS.getTerrainHeight(px,pz);
      const pal = new THREE.Group();
      pal.rotation.y = ry; pal.position.set(px,py,pz);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.06,0.9),palM); top.position.y=0.08; pal.add(top);
      for (let pi=0;pi<3;pi++) { const sl=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.06,0.12),palM); sl.position.set(0,0.0,-0.3+pi*0.3); pal.add(sl); }
      for (const lx of [-0.48,0,0.48]) { const r=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.14,0.9),palM); r.position.set(lx,-0.04,0); pal.add(r); }
      scene.add(pal);
    }

    // --- Pierres / rochers décoratifs le long des trottoirs ---
    const rMat = new THREE.MeshLambertMaterial({ color:0x8a8478 });
    for (const [rx,rz,rs] of [
      [-139,-7.5,0.28],[-175,-7.5,0.22],[-220,-7.5,0.30],
      [-152, 7.5,0.25],[-198, 7.5,0.32],[-235, 7.5,0.20],
      [-165,-19.5,0.24],[-205,-19.5,0.26],[-170,19.5,0.22],[-210,19.5,0.28],
    ]) {
      const ry2 = ZS.getTerrainHeight(rx,rz);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rs,0), rMat);
      rock.rotation.set(rx*0.31, rz*0.47, 0);
      rock.position.set(rx, ry2+rs*0.28, rz);
      rock.castShadow=true; scene.add(rock);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  ZS.Buildings.registerSector({ build, roads: TOWN_ROADS });
