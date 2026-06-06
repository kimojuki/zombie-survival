// Prefabs arbres — visuels procéduraux (atlas écorce/feuillage), seedable via treeSeed.
(function () {
  'use strict';

  const _treeAtlas = new THREE.TextureLoader().load('/img/tree_atlas.png');
  _treeAtlas.wrapS = _treeAtlas.wrapT = THREE.RepeatWrapping;
  _treeAtlas.magFilter = THREE.NearestFilter;
  _treeAtlas.minFilter = THREE.NearestMipmapLinearFilter;
  _treeAtlas.colorSpace = THREE.SRGBColorSpace;

  function _atlasSlice(texture, offsetX, repeatX) {
    const t = texture.clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(repeatX, 1);
    t.offset.set(offsetX, 0);
    return t;
  }

  const _barkTex = _atlasSlice(_treeAtlas, 0.0, 0.5);
  const _leafTex = _atlasSlice(_treeAtlas, 0.5, 0.5);

  function _seededRng(seed) {
    let s = (Number(seed) || 1) >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _rngFromOpts(opts) {
    return _seededRng(opts.treeSeed ?? opts.decorId?.length ?? 42);
  }

  function buildOak(root, opts) {
    const rng = _rngFromOpts(opts);
    const trunkH = 3.2 + rng() * 2.8;
    const trunkR = 0.12 + rng() * 0.08;
    const trunkMat = new THREE.MeshLambertMaterial({ map: _barkTex, color: 0xd8c6a8 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.65, trunkR * 1.4, trunkH, 7), trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    root.add(trunk);
    if (rng() < 0.40) {
      for (let r = 0; r < 3; r++) {
        const ra = rng() * Math.PI * 2;
        const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.4, 4), trunkMat);
        rt.position.set(Math.cos(ra) * trunkR, 0.1, Math.sin(ra) * trunkR);
        rt.rotation.set(0.85 + rng() * 0.4, ra, 0);
        root.add(rt);
      }
    }
    const leafCols = [0x6d9850, 0x4f7e3f, 0x7ea857, 0x3f6c35];
    const lm1 = new THREE.MeshLambertMaterial({ map: _leafTex, color: leafCols[Math.floor(rng() * leafCols.length)] });
    const lm2 = new THREE.MeshLambertMaterial({ map: _leafTex, color: leafCols[Math.floor(rng() * leafCols.length)] });
    const leafN = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < leafN; i++) {
      const r = 0.9 + rng() * 1.2;
      const ang = (i / leafN) * Math.PI * 2 + rng() * 0.8;
      const dist = 0.3 + rng() * 1.2;
      const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), i % 2 === 0 ? lm1 : lm2);
      leaf.position.set(Math.cos(ang) * dist, trunkH * 0.62 + rng() * 1.8, Math.sin(ang) * dist);
      leaf.scale.y = 0.72 + rng() * 0.3;
      root.add(leaf);
    }
    root.userData.treeKind = 'oak';
  }

  function buildPine(root, opts) {
    const rng = _rngFromOpts(opts);
    const h = 5.5 + rng() * 4.5;
    const trunkMat = new THREE.MeshLambertMaterial({ map: _barkTex, color: 0xc7b191 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.24, h, 9), trunkMat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    root.add(trunk);
    const pCols = [0x355f30, 0x456f38, 0x50773c, 0x284d2a];
    const pMat = new THREE.MeshLambertMaterial({ map: _leafTex, color: pCols[Math.floor(rng() * pCols.length)] });
    const layers = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const r = (1.35 - t * 0.85) * (0.82 + rng() * 0.5);
      const cH = 1.3 + rng() * 0.7;
      const yP = h * (0.25 + t * 0.62);
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(r, cH, 9), pMat);
      c1.position.y = yP;
      c1.castShadow = true;
      root.add(c1);
      if (i < layers - 1) {
        const c2 = new THREE.Mesh(new THREE.ConeGeometry(r * 0.65, cH * 0.55, 9), pMat);
        c2.position.y = yP + cH * 0.38;
        root.add(c2);
      }
    }
    root.userData.treeKind = 'pine';
  }

  function buildBirch(root, opts) {
    const rng = _rngFromOpts(opts);
    const h = 5.0 + rng() * 3.0;
    const trunkMat = new THREE.MeshLambertMaterial({ map: _barkTex, color: 0xe6e0d0 });
    const markMat = new THREE.MeshLambertMaterial({ color: 0x302820 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, h, 9), trunkMat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    root.add(trunk);
    for (let m = 0; m < 5; m++) {
      const mark = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), markMat);
      mark.position.y = h * (0.18 + m * 0.15);
      mark.rotation.y = rng() * Math.PI;
      root.add(mark);
    }
    const lCols = [0x8aba30, 0x9acc28, 0x7aa828, 0xb8a828, 0x70a830];
    const lMat = new THREE.MeshLambertMaterial({ map: _leafTex, color: lCols[Math.floor(rng() * lCols.length)] });
    for (let i = 0; i < 6 + Math.floor(rng() * 4); i++) {
      const r = 0.55 + rng() * 0.7;
      const ang = rng() * Math.PI * 2;
      const dist = 0.3 + rng() * 0.9;
      const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), lMat);
      leaf.position.set(Math.cos(ang) * dist, h * 0.68 + rng() * h * 0.28, Math.sin(ang) * dist);
      leaf.scale.set(1.3, 0.60 + rng() * 0.25, 1.1);
      leaf.castShadow = true;
      root.add(leaf);
    }
    root.userData.treeKind = 'birch';
  }

  function buildDead(root, opts) {
    const rng = _rngFromOpts(opts);
    const h = 3.0 + rng() * 3.2;
    const mat = new THREE.MeshLambertMaterial({ color: 0x483828 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.18, h, 6), mat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    root.add(trunk);
    for (let i = 0; i < 4 + Math.floor(rng() * 3); i++) {
      const ba = rng() * Math.PI * 2;
      const bl = 0.6 + rng() * 1.2;
      const by = h * (0.45 + rng() * 0.48);
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.055, bl, 4), mat);
      br.position.set(Math.cos(ba) * bl * 0.35, by, Math.sin(ba) * bl * 0.35);
      br.rotation.z = (rng() > 0.5 ? 1 : -1) * (Math.PI * 0.42 + rng() * 0.25);
      br.rotation.y = ba;
      br.castShadow = true;
      root.add(br);
    }
    root.userData.treeKind = 'dead';
  }

  const TREE_PREFABS = {
    tree_oak: { build: buildOak, label: 'Chêne / feuillu' },
    tree_pine: { build: buildPine, label: 'Pin' },
    tree_birch: { build: buildBirch, label: 'Bouleau' },
    tree_dead: { build: buildDead, label: 'Arbre mort' },
  };

  function listTreePrefabIds() {
    return Object.keys(TREE_PREFABS);
  }

  function registerTreePrefabs() {
    if (!ZS.registerDecorPrefab) return;
    for (const [id, def] of Object.entries(TREE_PREFABS)) {
      ZS.registerDecorPrefab(id, def);
    }
  }

  registerTreePrefabs();

  window.ZS = window.ZS || {};
  ZS.TreePrefabs = { listTreePrefabIds, TREE_PREFABS, buildOak, buildPine, buildBirch, buildDead };
}());
