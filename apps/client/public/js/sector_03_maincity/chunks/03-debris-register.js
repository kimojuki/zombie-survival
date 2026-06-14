// Décombres + register
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
  ZS.Buildings.registerSector({ build, roads: [CITY_ROADS[0]] });
