// Spawn procédural végétation — extrait de world.js (IIFE)
function spawnTrees(scene, count) {
    for (let i = 0; i < count; i++) {
      const x = (_rng() - 0.5) * 560, z = (_rng() - 0.5) * 560;
      if (Math.hypot(x, z) < 4) continue;
      if (_blockedSpawn(x, z)) continue;
      const col = { x, z, r: 0.55 };
      _colliders.push(col);
      const r = _rng();
      const tree = r < 0.18 ? makePineTree() : r < 0.32 ? makeBirchTree() : makeTree();
      tree.position.set(x, ZS.getTerrainHeight(x, z), z);
      scene.add(tree);
      _registerTree(scene, tree, x, z, col);
    }
  }

  function makeTree() {
    const g = new THREE.Group();
    const trunkH   = 3.2 + _rng() * 2.8; // plus grand : 3.2 – 6m
    const trunkR   = 0.12 + _rng() * 0.08;
    const trunkMat = new THREE.MeshLambertMaterial({ map: _barkTex, color: 0xd8c6a8 });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.65, trunkR * 1.4, trunkH, 7), trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    g.add(trunk);

    // Racines saillantes (40% des arbres)
    if (_rng() < 0.40) {
      for (let r = 0; r < 3; r++) {
        const ra   = _rng() * Math.PI * 2;
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.4, 4), trunkMat);
        root.position.set(Math.cos(ra) * trunkR, 0.1, Math.sin(ra) * trunkR);
        root.rotation.set(0.85 + _rng() * 0.4, ra, 0);
        g.add(root);
      }
    }

    // Feuillage : 4 – 6 sphères (moins de draw calls par arbre)
    const leafCols = [0x6d9850, 0x4f7e3f, 0x7ea857, 0x3f6c35];
    const lm1  = new THREE.MeshLambertMaterial({ map: _leafTex, color: leafCols[Math.floor(_rng() * leafCols.length)] });
    const lm2  = new THREE.MeshLambertMaterial({ map: _leafTex, color: leafCols[Math.floor(_rng() * leafCols.length)] });
    const leafN = 4 + Math.floor(_rng() * 3);
    for (let i = 0; i < leafN; i++) {
      const r    = 0.9 + _rng() * 1.2;
      const ang  = (i / leafN) * Math.PI * 2 + _rng() * 0.8;
      const dist = 0.3 + _rng() * 1.2;
      const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), i % 2 === 0 ? lm1 : lm2);
      leaf.position.set(Math.cos(ang) * dist, trunkH * 0.62 + _rng() * 1.8, Math.sin(ang) * dist);
      leaf.scale.y = 0.72 + _rng() * 0.3;
      g.add(leaf);
    }
    return g;
  }

  function makePineTree() {
    const g = new THREE.Group();
    const h        = 5.5 + _rng() * 4.5; // 5.5 – 10m
    const trunkMat = new THREE.MeshLambertMaterial({ map: _barkTex, color: 0xc7b191 });
    const trunk    = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.24, h, 9), trunkMat);
    trunk.position.y = h / 2; trunk.castShadow = true; g.add(trunk);

    const pCols = [0x355f30, 0x456f38, 0x50773c, 0x284d2a];
    const pMat  = new THREE.MeshLambertMaterial({ map: _leafTex, color: pCols[Math.floor(_rng() * pCols.length)] });
    const layers = 4 + Math.floor(_rng() * 3);
    for (let i = 0; i < layers; i++) {
      const t   = i / (layers - 1);
      const r   = (1.35 - t * 0.85) * (0.82 + _rng() * 0.5);
      const cH  = 1.3 + _rng() * 0.7;
      const yP  = h * (0.25 + t * 0.62);
      const c1  = new THREE.Mesh(new THREE.ConeGeometry(r, cH, 9), pMat);
      c1.position.y = yP; c1.castShadow = true; g.add(c1);
      // Petite couronne secondaire entre deux couches
      if (i < layers - 1) {
        const c2 = new THREE.Mesh(new THREE.ConeGeometry(r * 0.65, cH * 0.55, 9), pMat);
        c2.position.y = yP + cH * 0.38; g.add(c2);
      }
    }
    return g;
  }

  function makeBirchTree() {
    const g = new THREE.Group();
    const h        = 5.0 + _rng() * 3.0; // 5 – 8m
    const trunkMat = new THREE.MeshLambertMaterial({ map: _barkTex, color: 0xe6e0d0 });
    const markMat  = new THREE.MeshLambertMaterial({ color: 0x302820 });
    const trunk    = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, h, 9), trunkMat);
    trunk.position.y = h / 2; trunk.castShadow = true; g.add(trunk);
    // Marques sombres horizontales
    for (let m = 0; m < 5; m++) {
      const mark = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), markMat);
      mark.position.y = h * (0.18 + m * 0.15);
      mark.rotation.y = _rng() * Math.PI;
      g.add(mark);
    }
    // Feuilles légères (or-vert)
    const lCols = [0x8aba30, 0x9acc28, 0x7aa828, 0xb8a828, 0x70a830];
    const lMat  = new THREE.MeshLambertMaterial({ map: _leafTex, color: lCols[Math.floor(_rng() * lCols.length)] });
    for (let i = 0; i < 6 + Math.floor(_rng() * 4); i++) {
      const r    = 0.55 + _rng() * 0.7;
      const ang  = _rng() * Math.PI * 2;
      const dist = 0.3 + _rng() * 0.9;
      const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), lMat);
      leaf.position.set(Math.cos(ang) * dist, h * 0.68 + _rng() * h * 0.28, Math.sin(ang) * dist);
      leaf.scale.set(1.3, 0.60 + _rng() * 0.25, 1.1);
      leaf.castShadow = true;
      g.add(leaf);
    }
    return g;
  }

  function makeDeadTree() {
    const g   = new THREE.Group();
    const h   = 3.0 + _rng() * 3.2;
    const mat = new THREE.MeshLambertMaterial({ color: 0x483828 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.18, h, 6), mat);
    trunk.position.y = h / 2; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 4 + Math.floor(_rng() * 3); i++) {
      const ba = _rng() * Math.PI * 2, bl = 0.6 + _rng() * 1.2, by = h * (0.45 + _rng() * 0.48);
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.055, bl, 4), mat);
      br.position.set(Math.cos(ba) * bl * 0.35, by, Math.sin(ba) * bl * 0.35);
      br.rotation.z = (_rng() > 0.5 ? 1 : -1) * (Math.PI * 0.42 + _rng() * 0.25);
      br.rotation.y = ba; br.castShadow = true; g.add(br);
    }
    return g;
  }

  function spawnDeadTreesAt(scene, cx, cz, count, spread) {
    for (let i = 0; i < count; i++) {
      const a = _rng() * Math.PI * 2, d = 2 + _rng() * spread;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      const tree = makeDeadTree();
      tree.position.set(x, ZS.getTerrainHeight(x, z), z);
      scene.add(tree); _colliders.push({ x, z, r: 0.25 });
    }
  }

  function spawnTreesAt(scene, cx, cz, count, radius, pineRatio, skipNear) {
    for (let i = 0; i < count; i++) {
      const a = _rng() * Math.PI * 2, r = _rng() * radius;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (skipNear && skipNear.some(s => Math.hypot(x - s[0], z - s[1]) < s[2])) continue;
      if (_blockedSpawn(x, z)) continue;
      const col = { x, z, r: 0.55 };
      _colliders.push(col);
      const tree = _rng() < (pineRatio || 0.28) ? makePineTree() : makeTree();
      tree.position.set(x, ZS.getTerrainHeight(x, z), z);
      scene.add(tree);
      _registerTree(scene, tree, x, z, col);
    }
  }

  function spawnRocks(scene, count) {
    const geo  = new THREE.DodecahedronGeometry(1, 0);
    const mats = [0x888888, 0x7a6850, 0x6a6872, 0x9a8870]
      .map(c => new THREE.MeshLambertMaterial({ color: c }));
    const perMat = mats.map(() => []);

    for (let i = 0; i < count; i++) {
      const x  = (_rng()-0.5)*560, z = (_rng()-0.5)*560;
      if (_blockedSpawn(x, z)) continue;
      const s  = 0.3 + _rng() * 0.85;
      const by = ZS.getTerrainHeight(x, z);
      _colliders.push({ x, z, r: s + 0.25, topY: by + s * 1.4 });
      const mi = Math.floor(_rng() * mats.length);
      perMat[mi].push({ x, y: by + s * 0.3, z, s,
        rx: _rng()*Math.PI, ry: _rng()*Math.PI, rz: _rng()*Math.PI });
    }

    const dummy = new THREE.Object3D();
    for (let mi = 0; mi < mats.length; mi++) {
      const rocks = perMat[mi];
      if (!rocks.length) continue;
      const im = new THREE.InstancedMesh(geo, mats[mi], rocks.length);
      im.castShadow = true; im.receiveShadow = true;
      for (let k = 0; k < rocks.length; k++) {
        const r = rocks[k];
        dummy.position.set(r.x, r.y, r.z);
        dummy.rotation.set(r.rx, r.ry, r.rz);
        dummy.scale.setScalar(r.s);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }
  }

  function spawnBushes(scene, count) {
    const geo  = new THREE.SphereGeometry(1, 5, 4);
    const mats = [0x2d5a25, 0x3a6530, 0x4a5828, 0x2a5020, 0x4a6a20]
      .map(c => new THREE.MeshLambertMaterial({ color: c }));
    const perMat = mats.map(() => []);

    for (let i = 0; i < count; i++) {
      const x = (_rng()-0.5)*540, z = (_rng()-0.5)*540;
      if (Math.hypot(x, z) < 5) continue;
      if (_blockedSpawn(x, z)) continue;
      const r  = 0.28 + _rng() * 0.55;
      const mi = Math.floor(_rng() * mats.length);
      const sx = 1.0 + _rng()*0.5, sy = 0.55 + _rng()*0.4, sz = 1.0 + _rng()*0.4;
      perMat[mi].push({ x, y: ZS.getTerrainHeight(x, z) + r*0.35, z, r, sx, sy, sz });
    }

    const dummy = new THREE.Object3D();
    for (let mi = 0; mi < mats.length; mi++) {
      const bushes = perMat[mi];
      if (!bushes.length) continue;
      const im = new THREE.InstancedMesh(geo, mats[mi], bushes.length);
      im.castShadow = true;
      for (let k = 0; k < bushes.length; k++) {
        const b = bushes[k];
        dummy.position.set(b.x, b.y, b.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(b.r*b.sx, b.r*b.sy, b.r*b.sz);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }
  }
