// Véhicules + props + register
function _buildTents(scene, B) {
    _tent(scene,B,-175,-110,4,6,0x4a5a30);
    _tent(scene,B,-225,-110,4,6,0x9a8460);
    _tent(scene,B,-200,-125,5,8,0x3a4828);
    _tent(scene,B,-175,-205,4,6,0x4a5a30);
    _tent(scene,B,-225,-205,4,6,0x9a8460);
  }

  function _buildVehicles(scene, B) {
    const mg = 0x3a4a2a;
    // Tank devant motor pool
    _buildTank(scene,B,-235,-180,mg);
    // Hélicoptère sur héliport
    _buildHelicopter(scene,-147,-213);
    // Camion citerne devant dépôt carburant
    _buildTruck(scene,B,-255,-208,mg);
  }

  function _buildTank(scene, B, cx, cz, col) {
    const y=ZS.getTerrainHeight(cx,cz);
    const hM=new THREE.MeshLambertMaterial({color:col});
    const dM=new THREE.MeshLambertMaterial({color:0x1a1a18});
    const g=new THREE.Group();
    const hull=new THREE.Mesh(new THREE.BoxGeometry(3.8,1.1,6.5),hM);
    hull.position.y=0.8; hull.castShadow=true; g.add(hull);
    const turret=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.9,3.2),hM);
    turret.position.set(0,1.75,-0.4); turret.castShadow=true; g.add(turret);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.15,4.5,8),dM);
    barrel.rotation.x=Math.PI/2; barrel.position.set(0,1.9,-3.2); g.add(barrel);
    for(const ox of [-2.0,2.0]) {
      const tr=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.72,6.8),dM);
      tr.position.set(ox,0.42,0); g.add(tr);
    }
    for(const[ox,oz] of [[-2,-2.5],[-2,0],[-2,2.5],[2,-2.5],[2,0],[2,2.5]]) {
      const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.44,0.6,8),dM);
      wh.rotation.z=Math.PI/2; wh.position.set(ox,0.44,oz); g.add(wh);
    }
    g.position.set(cx,y,cz); g.rotation.y=0.2; scene.add(g);
    B.addCollider({type:'box',cx,cz,hw:2.0,hd:3.5,maxY:y+1.7});
  }

  function _buildTruck(scene, B, cx, cz, col) {
    const y=ZS.getTerrainHeight(cx,cz);
    const bM=new THREE.MeshLambertMaterial({color:col});
    const dM=new THREE.MeshLambertMaterial({color:0x181818});
    const g=new THREE.Group();
    const cab=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.0,3.0),bM);
    cab.position.set(0,1.1,-3.0); cab.castShadow=true; g.add(cab);
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,4.5,10),
      new THREE.MeshLambertMaterial({color:0x3a5a3a}));
    tank.rotation.z=Math.PI/2; tank.position.set(0,1.5,1.5); g.add(tank);
    const frame=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.4,9.0),bM);
    frame.position.set(0,0.3,0); g.add(frame);
    for(const[ox,oz] of [[-1.3,-3.5],[1.3,-3.5],[-1.3,-1.5],[1.3,-1.5],[-1.3,1.5],[1.3,1.5],[-1.3,3.5],[1.3,3.5]]) {
      const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.3,8),dM);
      wh.rotation.z=Math.PI/2; wh.position.set(ox,0.5,oz); g.add(wh);
    }
    g.position.set(cx,y,cz); g.rotation.y=Math.PI/2; scene.add(g);
    B.addCollider({type:'box',cx,cz,hw:4.7,hd:1.4,maxY:y+2.1});
  }

  function _buildHelicopter(scene, cx, cz) {
    const y=ZS.getTerrainHeight(cx,cz);
    const hM=new THREE.MeshLambertMaterial({color:0x3a4830});
    const dM=new THREE.MeshLambertMaterial({color:0x1e2218});
    const gM=new THREE.MeshLambertMaterial({color:0x4a7a88,transparent:true,opacity:0.55});
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.4,5.5),hM);
    body.position.y=0.9; body.castShadow=true; g.add(body);
    const cock=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.1,1.8),gM);
    cock.position.set(0,0.95,-2.7); g.add(cock);
    const tail=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.45,3.5),hM);
    tail.position.set(0,1.3,3.8); g.add(tail);
    for(const ox of [-0.8,0.8]) {
      const sk=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,5.5,6),dM);
      sk.rotation.z=Math.PI/2; sk.rotation.y=Math.PI/2; sk.position.set(ox,0.14,0); g.add(sk);
    }
    g.position.set(cx,y+0.1,cz); g.rotation.y=-0.4; scene.add(g);
  }

  function _buildProps(scene, B) {
    const y=ZS.getTerrainHeight(CX,CZ);
    const oilM=new THREE.MeshLambertMaterial({color:0x1e1e18});
    const cratM=new THREE.MeshLambertMaterial({color:0x5a6230});
    const sandM=new THREE.MeshLambertMaterial({color:0x8a7848});
    const barbCoilM=new THREE.MeshLambertMaterial({color:0x5a4828});
    const coneM=new THREE.MeshLambertMaterial({color:0xdd4411});
    const signPolM=new THREE.MeshLambertMaterial({color:0x3a3a2a});

    // Fûts devant dépôt carburant
    for(const[ox,oz] of [[-2,2],[-1,2],[0,2],[-2,3],[-1,3]])
      B.box(scene,-252+ox,-207+oz,y+0.55,0.55,1.1,0.55,oilM);
    // Caisses munitions zones diverses
    for(const[bx,bz] of [[-197,-128],[-195,-128],[-197,-129.5],[-170,-200],[-168,-200]])
      B.box(scene,bx,bz,y+0.45,1.0,0.9,0.6,cratM);
    // Sacs de sable portail
    for(const[ox,oz] of [[-4,2.5],[-3,2.5],[4,2.5],[3,2.5]])
      B.box(scene,CX+ox,Z1+oz,y+0.3,0.9,0.58,0.55,sandM);
    // Sacs de sable checkpoint intérieur
    for(const[ox,oz] of [[-14,-2],[-14,-1],[-14,0],[14,-2],[14,-1],[14,0]])
      B.box(scene,CX+ox,-100+oz,y+0.3,0.9,0.58,0.55,sandM);
    // Rouleaux barbelés (intérieur)
    for(const rx of [-258,-235,-215,-185,-162,-142]) {
      const coil=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.1,6,12),barbCoilM);
      coil.rotation.x=Math.PI/2; coil.position.set(rx,y+0.5,Z1+1.2); scene.add(coil);
    }
    // Cônes à l'entrée
    for(const cx2 of [GATE_L-2,GATE_L-4,GATE_R+2,GATE_R+4]) {
      const cy=ZS.getTerrainHeight(cx2,Z1-1);
      const cone=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.65,6),coneM);
      cone.position.set(cx2,cy+0.33,Z1-1); scene.add(cone);
    }
    // Panneaux ZONE MILITAIRE
    for(const[sx,sz] of [[GATE_L-6,Z1+1],[GATE_R+6,Z1+1]]) {
      const sy=ZS.getTerrainHeight(sx,sz);
      B.box(scene,sx,sz,sy+1.5,0.1,3.0,0.1,signPolM);
      B.box(scene,sx,sz,sy+2.8,2.2,0.75,0.1,new THREE.MeshLambertMaterial({color:0x882222}));
    }
    // Boîtes électriques / groupes électrogènes
    const genM=new THREE.MeshLambertMaterial({color:0x4a5a30});
    for(const[gx,gz] of [[-268,-130],[-268,-170],[X1-5,-130],[X1-5,-170]]) {
      B.box(scene,gx,gz,y+0.7,1.4,1.4,1.0,genM);
      B.box(scene,gx,gz,y+1.45,1.6,0.12,1.2,genM);
    }
  }

  function _buildLights(scene, B) {
    const polM=new THREE.MeshLambertMaterial({color:0x2a2a22});
    const headM=new THREE.MeshLambertMaterial({color:0xffffcc,emissive:0xffeeaa,emissiveIntensity:2.5});
    // Lampadaires sur axe N-S
    for(const pz of [-100,-130,-165,-195,-220]) {
      for(const px of [CX-5, CX+5]) {
        const py=ZS.getTerrainHeight(px,pz);
        B.box(scene,px,pz,py+4.0,0.12,8.0,0.12,polM);
        B.addCollider({x:px,z:pz,r:0.1});
        B.box(scene,px,pz+(px<CX?0.8:-0.8),py+8.2,0.55,0.32,0.8,headM);
        const pt=new THREE.PointLight(0xffeedd,5.5,50);
        pt.position.set(px,py+7.9,pz+(px<CX?1.0:-1.0)); scene.add(pt);
      }
    }
    // Lampadaires intérieur zones
    for(const[lx,lz] of [[-220,-90],[-180,-90],[-252,-160],[-148,-160],[-252,-210],[-148,-210]]) {
      const ly=ZS.getTerrainHeight(lx,lz);
      B.box(scene,lx,lz,ly+4.0,0.12,8.0,0.12,polM);
      B.addCollider({x:lx,z:lz,r:0.1});
      B.box(scene,lx,lz,ly+8.2,0.55,0.32,0.8,headM);
      const pt=new THREE.PointLight(0xffeedd,5.0,45);
      pt.position.set(lx,ly+7.8,lz); scene.add(pt);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  // Routes désactivées — brick 0 (voir road_network.js)
  ZS.Buildings.registerSector({ build, roads: [] });
