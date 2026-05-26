// World: terrain, vegetation, lights, sky
(function () {
  'use strict';

  function buildWorld(scene) {
    scene.background = new THREE.Color(0x7ec8e3);
    scene.fog = new THREE.Fog(0x7ec8e3, 50, 110);

    scene.add(new THREE.AmbientLight(0xfff8e7, 0.6));
    const sun = new THREE.DirectionalLight(0xfff8e7, 1.2);
    sun.position.set(50, 80, 30);
    scene.add(sun);

    buildTerrain(scene);
    spawnTrees(scene, 80);
    spawnRocks(scene, 40);
    buildSafeZone(scene);
  }

  function buildTerrain(scene) {
    const SIZE = 130, SEG = 100;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, ZS.getTerrainHeight(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({ color: 0x4a7c59 });
    scene.add(new THREE.Mesh(geo, mat));
  }

  function spawnTrees(scene, count) {
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 110;
      const z = (Math.random() - 0.5) * 110;
      if (Math.hypot(x, z) < 4) continue; // keep spawn clear
      const tree = makeTree();
      tree.position.set(x, ZS.getTerrainHeight(x, z), z);
      scene.add(tree);
    }
  }

  function spawnRocks(scene, count) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 110;
      const z = (Math.random() - 0.5) * 110;
      const s = 0.3 + Math.random() * 0.7;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(s, 0),
        mat
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.position.set(x, ZS.getTerrainHeight(x, z) + s * 0.3, z);
      scene.add(rock);
    }
  }

  function buildSafeZone(scene) {
    // Small raised platform at origin — spawn area
    const mat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 0.4, 16), mat);
    base.position.set(0, ZS.getTerrainHeight(0, 0) + 0.2, 0);
    scene.add(base);
  }

  function makeTree() {
    const g = new THREE.Group();
    const trunkH = 1.8 + Math.random() * 1.5;
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1 + Math.random() * 0.05, 0.18 + Math.random() * 0.05, trunkH, 7),
      trunkMat
    );
    trunk.position.y = trunkH / 2;
    g.add(trunk);

    // Natural round canopy
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x1e7a3c });
    const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x2d9e52 });
    const clusters = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < clusters; i++) {
      const r = 0.8 + Math.random() * 0.7;
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(r, 7, 5),
        i % 2 === 0 ? leafMat : leafMat2
      );
      leaf.position.set(
        (Math.random() - 0.5) * 0.9,
        trunkH + r * 0.5 + Math.random() * 0.6,
        (Math.random() - 0.5) * 0.9
      );
      g.add(leaf);
    }
    return g;
  }

  window.ZS = window.ZS || {};
  ZS.buildWorld = buildWorld;
}());
