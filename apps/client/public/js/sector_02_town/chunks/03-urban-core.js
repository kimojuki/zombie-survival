// Immeuble, parking, lampadaires, props — extrait de sector_02_town.js (IIFE)
  // ── Immeuble ──────────────────────────────────────────────────────────────────

  function _buildApartment(scene, B) {
    B.immeuble2F(scene, -170, -32);
  }

  // ── Parking ───────────────────────────────────────────────────────────────────

  function _buildParking(scene, B) {
    const cx = -152, cz = 7;
    const baseY = ZS.getTerrainHeight(cx, cz);
    B.slab(scene, cx, cz, baseY+0.05, 20, 9, B.M.concDark);
    const lineMat = new THREE.MeshLambertMaterial({
      color: 0xcccccc, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-4
    });
    for (let i = -4; i <= 4; i++)
      B.box(scene, cx+i*2.2, cz-4.3, baseY+0.09, 0.1, 0.01, 8.0, lineMat);
    B.box(scene, cx, cz,     baseY+0.09, 20.4, 0.01, 0.1, lineMat);
    B.box(scene, cx, cz-4.3, baseY+0.09, 20.4, 0.01, 0.1, lineMat);
  }

  // ── Lampadaires ───────────────────────────────────────────────────────────────

  function _buildStreetLights(scene, B) {
    const poleMat  = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const lightMat = new THREE.MeshLambertMaterial({ color:0xffffcc, emissive:0xffeeaa, emissiveIntensity:2.5 });
    const lamps = [
      [-132,-3.5,-1],[-158,-3.5,-1],[-180,-3.5,-1],[-202,-3.5,-1],[-222,-3.5,-1],[-244,-3.5,-1],
      [-144, 3.5, 1],[-168, 3.5, 1],[-192, 3.5, 1],[-215, 3.5, 1],[-238, 3.5, 1],
    ];
    for (const [lx,lz,side] of lamps) {
      const ly = ZS.getTerrainHeight(lx, lz);
      const fz = lz + side*1.55, fy = ly+5.5;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.09,5.8,7), poleMat);
      pole.position.set(lx, ly+2.9, lz); pole.castShadow=true; scene.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,1.8), poleMat);
      arm.position.set(lx, ly+5.6, lz+side*0.7); scene.add(arm);
      const fix = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.24,0.65), lightMat);
      fix.position.set(lx, fy, fz); scene.add(fix);
      const pt = new THREE.PointLight(0xffeecc, 6.0, 40);
      pt.position.set(lx, fy-0.15, fz); scene.add(pt);
      B.addCollider({ x:lx, z:lz, r:0.12 });
    }
  }

  // ── Décors de rue ─────────────────────────────────────────────────────────────

  function _buildStreetProps(scene, B) {
    const darkMat=new THREE.MeshLambertMaterial({color:0x2a2a2a});
    const redMat =new THREE.MeshLambertMaterial({color:0x992222});
    const concMat=new THREE.MeshLambertMaterial({color:0x888070});

    for(const[bx,bz,rz]of[
      [-143,3.5,0],[-161,-4,Math.PI/2],[-196,3.5,0.3],[-183,-3.5,-0.4],[-225,4,0.1],[-243,-3.5,0.2],
    ]){
      const by=ZS.getTerrainHeight(bx,bz);
      const bin=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,0.68,7),darkMat);
      bin.rotation.z=rz; bin.position.set(bx,by+(Math.abs(rz)>0.2?0.22:0.35),bz); bin.castShadow=true;
      scene.add(bin); B.addCollider({x:bx,z:bz,r:0.3});
    }
    for(const[cx,cz]of[[-160,1.2],[-178,-1.8],[-194,1.5],[-215,-2]]){
      const cy=ZS.getTerrainHeight(cx,cz);
      const tc=new THREE.Mesh(new THREE.ConeGeometry(0.18,0.58,6),redMat);
      tc.position.set(cx,cy+0.3,cz); scene.add(tc);
    }
    for(const[bx,bz,ry]of[[-130,-1.5,0.1],[-130,1.8,-0.05],[-248,-2,0.08],[-248,2,0.0]]){
      const by=ZS.getTerrainHeight(bx,bz);
      const bl=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.95,1.6),concMat);
      bl.position.set(bx,by+0.48,bz); bl.rotation.y=ry; bl.castShadow=true; scene.add(bl);
      B.addCollider({type:'box',cx:bx,cz:bz,hw:0.85,hd:0.3});
    }
    for(const lx of[-144,-196,-220]){
      const by=ZS.getTerrainHeight(lx,-6.5);
      _buildBench(scene,B,lx,-6.5,by);
    }
    const mailMat=new THREE.MeshLambertMaterial({color:0x3a5a8a});
    for(const[mx,mz]of[[-141,-8],[-192,-8],[-215,-8]]){
      const my=ZS.getTerrainHeight(mx,mz);
      B.box(scene,mx,mz,my+1.1,0.22,0.28,0.28,mailMat);
      B.box(scene,mx,mz,my+0.55,0.1,1.1,0.1,mailMat);
    }
  }

  function _buildBench(scene, B, cx, cz, baseY) {
    const benchMat=new THREE.MeshLambertMaterial({color:0x6a4a20});
    const metalMat=new THREE.MeshLambertMaterial({color:0x3a3a3a});
    B.box(scene,cx,cz,baseY+0.48,1.9,0.08,0.4,benchMat);
    B.box(scene,cx,cz-0.16,baseY+0.74,1.9,0.06,0.28,benchMat);
    for(const lx of[cx-0.72,cx+0.72]){
      const leg=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.52,0.42),metalMat);
      leg.position.set(lx,baseY+0.26,cz); scene.add(leg);
    }
    B.addCollider({type:'box',cx,cz,hw:1.0,hd:0.25});
  }
