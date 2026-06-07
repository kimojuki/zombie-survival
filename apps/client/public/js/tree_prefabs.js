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
  const _litMats = new Set();
  const _trunkMatCache = new Map();
  const _leafMatCache = new Map();
  const _geoCache = new Map();
  let _foliageDayCache = 1;

  const _LEAF_EMISSIVE = 0x142010;
  const _TRUNK_EMISSIVE = 0x100808;

  function _cachedGeo(key, factory) {
    let geo = _geoCache.get(key);
    if (!geo) {
      geo = factory();
      _geoCache.set(key, geo);
    }
    return geo;
  }

  function _cylGeo(rt, rb, h, seg) {
    const k = `c:${rt.toFixed(2)}:${rb.toFixed(2)}:${h.toFixed(2)}:${seg}`;
    return _cachedGeo(k, () => new THREE.CylinderGeometry(rt, rb, h, seg));
  }

  function _dodecaGeo(r) {
    const k = `d:${r.toFixed(2)}`;
    return _cachedGeo(k, () => new THREE.DodecahedronGeometry(r, 0));
  }

  function _sphereGeo(r, w, h) {
    const k = `s:${r.toFixed(2)}:${w}:${h}`;
    return _cachedGeo(k, () => new THREE.SphereGeometry(r, w, h));
  }

  function _coneGeo(r, h, seg) {
    const k = `o:${r.toFixed(2)}:${h.toFixed(2)}:${seg}`;
    return _cachedGeo(k, () => new THREE.ConeGeometry(r, h, seg));
  }

  function _detailMul() {
    const tier = ZS.Options?.getResolvedTier?.();
    if (tier === 'potato') return 0.32;
    if (tier === 'low') return 0.42;
    if (ZS._isMobile || window.__ZS_TOUCH_MODE) return 0.52;
    return 0.78;
  }

  function _detailCount(min, base, spread, rng) {
    return Math.max(min, Math.floor((base + rng() * spread) * _detailMul()));
  }

  function _applyMatDay(mat, dayBlend) {
    const d = Math.max(0, Math.min(1, dayBlend));
    const base = mat.userData._baseEmissiveI ?? 0;
    mat.emissiveIntensity = base * d;
    if (d < 0.02) mat.emissive.setHex(0x000000);
    else if (mat.userData._emissiveTint != null) mat.emissive.setHex(mat.userData._emissiveTint);
  }

  function _trackLitMat(mat, baseEmissive, emissiveTint) {
    if (!mat) return mat;
    mat.userData._baseEmissiveI = baseEmissive;
    mat.userData._emissiveTint = emissiveTint;
    _litMats.add(mat);
    const d = ZS.getFoliageDayBlend?.() ?? _foliageDayCache;
    _applyMatDay(mat, d);
    return mat;
  }

  /** Ajuste l'emissive feuillage/tronc selon le jour (0 = nuit, 1 = plein jour). */
  function tickTreeLighting(dayBlend) {
    _foliageDayCache = Math.max(0, Math.min(1, dayBlend));
    for (const mat of _litMats) _applyMatDay(mat, _foliageDayCache);
  }

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

  function _trunkMat(color) {
    let mat = _trunkMatCache.get(color);
    if (!mat) {
      mat = _trackLitMat(new THREE.MeshLambertMaterial({
        map: _barkTex,
        color,
        emissive: _TRUNK_EMISSIVE,
        emissiveIntensity: 0.05,
      }), 0.05, _TRUNK_EMISSIVE);
      _trunkMatCache.set(color, mat);
    }
    return mat;
  }

  function _leafMat(tint) {
    const key = String(tint);
    let mat = _leafMatCache.get(key);
    if (!mat) {
      mat = _trackLitMat(new THREE.MeshLambertMaterial({
        map: _leafTex,
        color: tint,
        emissive: _LEAF_EMISSIVE,
        emissiveIntensity: 0.08,
        side: THREE.DoubleSide,
      }), 0.08, _LEAF_EMISSIVE);
      _leafMatCache.set(key, mat);
    }
    return mat;
  }

  function _pickLeafTint(rng, palette) {
    return palette[Math.floor(rng() * palette.length)];
  }

  function _addRoots(root, trunkMat, baseR, rng) {
    const n = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng() * 0.5;
      const rh = 0.28 + rng() * 0.22;
      const rt = new THREE.Mesh(
        _cylGeo(baseR * 0.3, baseR * 0.9, rh, 5), trunkMat);
      rt.position.set(Math.cos(a) * baseR * 0.55, 0.1, Math.sin(a) * baseR * 0.55);
      rt.rotation.set(0.75 + rng() * 0.4, a, (rng() - 0.5) * 0.15);
      rt.castShadow = true;
      root.add(rt);
    }
  }

  function _addGroundTuft(root, rng, tint) {
    const mat = _leafMat(tint || 0x88b858);
    for (let g = 0; g < 2 + Math.floor(rng() * 3); g++) {
      const ga = rng() * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.36 + rng() * 0.12), mat);
      blade.position.set(Math.cos(ga) * (0.2 + rng() * 0.25), 0.16, Math.sin(ga) * (0.2 + rng() * 0.25));
      blade.rotation.y = ga;
      blade.rotation.x = -0.28 - rng() * 0.15;
      blade.castShadow = false;
      root.add(blade);
    }
  }

  function _stackTrunk(root, trunkMat, h, baseR, topR, segN, rng) {
    const pieceH = h / segN;
    for (let s = 0; s < segN; s++) {
      const t0 = s / segN;
      const t1 = (s + 1) / segN;
      const rBot = baseR + (topR - baseR) * t0;
      const rTop = baseR + (topR - baseR) * t1;
      const seg = new THREE.Mesh(
        _cylGeo(rTop * 0.96, rBot, pieceH, 8), trunkMat);
      seg.position.y = pieceH * s + pieceH * 0.5;
      seg.rotation.z = (rng() - 0.5) * 0.04 * s;
      seg.castShadow = true;
      root.add(seg);
    }
  }

  function _addLeafBlob(root, mat, x, y, z, r, scaleY) {
    const leaf = new THREE.Mesh(_dodecaGeo(r), mat);
    leaf.position.set(x, y, z);
    if (scaleY != null) leaf.scale.y = scaleY;
    leaf.castShadow = false;
    leaf.receiveShadow = true;
    root.add(leaf);
  }

  function buildOak(root, opts) {
    const rng = _rngFromOpts(opts);
    const trunkH = 3.4 + rng() * 2.6;
    const trunkR = 0.14 + rng() * 0.07;
    const trunkMat = _trunkMat(0xe8d8b8);
    _stackTrunk(root, trunkMat, trunkH, trunkR * 1.35, trunkR * 0.7, 3 + Math.floor(rng() * 2), rng);
    _addRoots(root, trunkMat, trunkR * 1.2, rng);

    const leafCols = [0xa0d070, 0x90c060, 0xb0e080, 0x80b858, 0x98c868];
    const lm1 = _leafMat(_pickLeafTint(rng, leafCols));
    const lm2 = _leafMat(_pickLeafTint(rng, leafCols));
    const crownY = trunkH * 0.72 + rng() * 0.4;

    const hub = new THREE.Mesh(
      _sphereGeo(trunkR * 2.2, 7, 6),
      _leafMat(_pickLeafTint(rng, leafCols)));
    hub.position.y = crownY;
    hub.scale.set(1.2, 0.75, 1.2);
    hub.castShadow = false;
    root.add(hub);

    const branchN = _detailCount(2, 3, 3, rng);
    for (let b = 0; b < branchN; b++) {
      const ang = (b / branchN) * Math.PI * 2 + rng() * 0.6;
      const bLen = 0.55 + rng() * 0.75;
      const bY = trunkH * (0.42 + rng() * 0.28);
      const branch = new THREE.Mesh(
        _cylGeo(0.04, 0.07, bLen, 5), trunkMat);
      branch.position.set(Math.cos(ang) * bLen * 0.4, bY, Math.sin(ang) * bLen * 0.4);
      branch.rotation.set(0.2, ang, Math.PI / 2 + (rng() - 0.5) * 0.35);
      branch.castShadow = true;
      root.add(branch);
      _addLeafBlob(root, b % 2 ? lm1 : lm2,
        Math.cos(ang) * bLen * 0.85, bY + 0.15, Math.sin(ang) * bLen * 0.85,
        0.45 + rng() * 0.35, 0.65 + rng() * 0.2);
    }

    const leafN = _detailCount(4, 5, 4, rng);
    for (let i = 0; i < leafN; i++) {
      const r = 0.75 + rng() * 1.1;
      const ang = (i / leafN) * Math.PI * 2 + rng() * 0.9;
      const dist = 0.35 + rng() * 1.3;
      _addLeafBlob(root, i % 2 ? lm1 : lm2,
        Math.cos(ang) * dist, crownY - 0.2 + rng() * 1.6, Math.sin(ang) * dist,
        r, 0.68 + rng() * 0.28);
    }
    const lowN = _detailCount(1, 2, 2, rng);
    for (let i = 0; i < lowN; i++) {
      const ang = rng() * Math.PI * 2;
      _addLeafBlob(root, lm2,
        Math.cos(ang) * (0.5 + rng() * 0.4), trunkH * (0.35 + rng() * 0.2), Math.sin(ang) * (0.5 + rng() * 0.4),
        0.35 + rng() * 0.25, 0.55);
    }
    if (_detailMul() > 0.6) _addGroundTuft(root, rng, _pickLeafTint(rng, leafCols));
    root.userData.treeKind = 'oak';
  }

  function buildPine(root, opts) {
    const rng = _rngFromOpts(opts);
    const h = 5.5 + rng() * 4.5;
    const trunkMat = _trunkMat(0xd8c8a8);
    _stackTrunk(root, trunkMat, h, 0.22, 0.07, 4, rng);
    _addRoots(root, trunkMat, 0.18, rng);

    const pCols = [0x68a858, 0x78b868, 0x5a9850, 0x88c070, 0x70b060];
    const pMat = _leafMat(_pickLeafTint(rng, pCols));
    const pMat2 = _leafMat(_pickLeafTint(rng, pCols));
    const layers = _detailCount(4, 4, 3, rng);
    const leanDetail = _detailMul() > 0.6;
    for (let i = 0; i < layers; i++) {
      const t = i / Math.max(1, layers - 1);
      const r = (1.4 - t * 0.88) * (0.85 + rng() * 0.45);
      const cH = 1.2 + rng() * 0.75;
      const yP = h * (0.22 + t * 0.64);
      const rotY = i * 0.55 + rng() * 0.4;
      const c1 = new THREE.Mesh(_coneGeo(r, cH, 9), i % 2 ? pMat : pMat2);
      c1.position.y = yP;
      c1.rotation.y = rotY;
      c1.castShadow = false;
      c1.receiveShadow = true;
      root.add(c1);
      if (leanDetail && i < layers - 1) {
        const c2 = new THREE.Mesh(_coneGeo(r * 0.62, cH * 0.5, 8), pMat);
        c2.position.y = yP + cH * 0.36;
        c2.rotation.y = rotY + 0.8;
        c2.castShadow = false;
        root.add(c2);
      }
      if (leanDetail && i > 0 && i < layers - 1 && rng() < 0.7) {
        for (let s = 0; s < 2; s++) {
          const sa = rotY + (s ? Math.PI : 0) + rng() * 0.5;
          const nub = new THREE.Mesh(_coneGeo(r * 0.28, 0.45 + rng() * 0.3, 6), pMat2);
          nub.position.set(Math.cos(sa) * r * 0.55, yP - cH * 0.15, Math.sin(sa) * r * 0.55);
          nub.rotation.z = Math.PI / 2 + 0.35;
          nub.rotation.y = sa;
          nub.castShadow = false;
          root.add(nub);
        }
      }
    }
    const tip = new THREE.Mesh(_coneGeo(0.12, 0.9 + rng() * 0.5, 6), pMat);
    tip.position.y = h * 0.92;
    tip.castShadow = false;
    root.add(tip);
    _addGroundTuft(root, rng, 0x6a9850);
    root.userData.treeKind = 'pine';
  }

  function buildBirch(root, opts) {
    const rng = _rngFromOpts(opts);
    const h = 5.0 + rng() * 3.0;
    const trunkMat = _trunkMat(0xf0ece0);
    const markMat = new THREE.MeshLambertMaterial({ color: 0x403028 });
    _stackTrunk(root, trunkMat, h, 0.13, 0.06, 3, rng);

    for (let m = 0; m < 7 + Math.floor(rng() * 4); m++) {
      const my = h * (0.12 + m * (0.72 / 10) + rng() * 0.04);
      const mw = 0.06 + rng() * 0.05;
      const mark = new THREE.Mesh(new THREE.BoxGeometry(mw, 0.04 + rng() * 0.05, 0.09), markMat);
      mark.position.y = my;
      mark.rotation.y = rng() * Math.PI;
      root.add(mark);
    }

    const lCols = [0xa8d848, 0xb8e850, 0x98c838, 0xc8d858, 0x88c040];
    const lMat = _leafMat(_pickLeafTint(rng, lCols));
    const lMat2 = _leafMat(_pickLeafTint(rng, lCols));

    const branchN = 4 + Math.floor(rng() * 3);
    for (let b = 0; b < branchN; b++) {
      const ang = (b / branchN) * Math.PI * 2 + rng() * 0.5;
      const bLen = 0.7 + rng() * 0.9;
      const bY = h * (0.55 + rng() * 0.35);
      const twig = new THREE.Mesh(
        _cylGeo(0.025, 0.04, bLen, 5), trunkMat);
      twig.position.set(Math.cos(ang) * bLen * 0.35, bY, Math.sin(ang) * bLen * 0.35);
      twig.rotation.set(0.45 + rng() * 0.25, ang, Math.PI / 2.2);
      twig.castShadow = true;
      root.add(twig);
      const droop = new THREE.Mesh(
        _sphereGeo(0.28 + rng() * 0.22, 6, 5), b % 2 ? lMat : lMat2);
      droop.position.set(
        Math.cos(ang) * bLen * 0.75, bY - 0.25 - rng() * 0.2, Math.sin(ang) * bLen * 0.75);
      droop.scale.set(1.1, 0.55, 1.0);
      droop.castShadow = false;
      root.add(droop);
    }

    for (let i = 0; i < 8 + Math.floor(rng() * 4); i++) {
      const r = 0.45 + rng() * 0.65;
      const ang = rng() * Math.PI * 2;
      const dist = 0.25 + rng() * 0.85;
      const leaf = new THREE.Mesh(_dodecaGeo(r), i % 2 ? lMat : lMat2);
      leaf.position.set(Math.cos(ang) * dist, h * 0.7 + rng() * h * 0.26, Math.sin(ang) * dist);
      leaf.scale.set(1.25, 0.58 + rng() * 0.22, 1.05);
      leaf.castShadow = false;
      leaf.receiveShadow = true;
      root.add(leaf);
    }
    _addGroundTuft(root, rng, _pickLeafTint(rng, lCols));
    root.userData.treeKind = 'birch';
  }

  function _palmFrondMat(tint) {
    return _leafMat(tint);
  }

  function buildPalm(root, opts) {
    const rng = _rngFromOpts(opts);
    const lean = (rng() - 0.5) * 0.07;
    const h = 4.8 + rng() * 2.4;
    const trunkR = 0.13 + rng() * 0.05;
    const trunkMat = _trunkMat(0xf2e0c0);
    const scarMat = new THREE.MeshLambertMaterial({ color: 0x9a8868 });

    const segN = 5 + Math.floor(rng() * 2);
    const pieceH = h / segN;
    for (let s = 0; s < segN; s++) {
      const tBot = s / segN;
      const tTop = (s + 1) / segN;
      const rBot = trunkR * (1.14 - tBot * 0.22);
      const rTop = trunkR * (1.10 - tTop * 0.18);
      const leanS = lean * ((tBot + tTop) * 0.5);
      const seg = new THREE.Mesh(
        _cylGeo(rTop, rBot, pieceH, 8), trunkMat);
      seg.position.y = pieceH * s + pieceH * 0.5;
      seg.rotation.z = leanS;
      seg.castShadow = true;
      root.add(seg);
      if (s > 0) {
        const scarH = Math.min(0.07, pieceH * 0.12);
        const scar = new THREE.Mesh(
          _cylGeo(rBot * 1.05, rBot * 1.02, scarH, 8), scarMat);
        scar.position.y = pieceH * s;
        scar.rotation.z = leanS;
        scar.castShadow = true;
        root.add(scar);
      }
    }

    const crownY = h - pieceH * 0.12 + rng() * 0.08;
    const hub = new THREE.Mesh(
      _sphereGeo(trunkR * 1.5, 7, 6),
      _trackLitMat(new THREE.MeshLambertMaterial({
        map: _leafTex,
        color: 0x88c858,
        emissive: _LEAF_EMISSIVE,
        emissiveIntensity: 0.08,
      }), 0.08, _LEAF_EMISSIVE));
    hub.position.y = crownY;
    hub.scale.set(1.1, 0.5, 1.1);
    hub.rotation.z = lean * 0.5;
    root.add(hub);

    const frondCols = [0xa8e860, 0x98d850, 0xb8f070, 0x88c848];
    const frondN = _detailCount(5, 6, 3, rng);
    const palmDetail = _detailMul() > 0.55;
    for (let i = 0; i < frondN; i++) {
      const ang = (i / frondN) * Math.PI * 2 + rng() * 0.25;
      const len = 2.2 + rng() * 1.5;
      const tint = frondCols[Math.floor(rng() * frondCols.length)];
      const fMat = _palmFrondMat(tint);
      const frond = new THREE.Mesh(
        new THREE.PlaneGeometry(len, 0.5 + rng() * 0.22, 4, 1), fMat);
      frond.position.set(Math.cos(ang) * 0.1, crownY + 0.06, Math.sin(ang) * 0.1);
      frond.rotation.order = 'YXZ';
      frond.rotation.y = ang;
      frond.rotation.x = -0.48 - rng() * 0.28;
      frond.rotation.z = lean * 0.35;
      frond.castShadow = false;
      frond.receiveShadow = true;
      root.add(frond);
      if (palmDetail && rng() < 0.55) {
        const sub = new THREE.Mesh(
          new THREE.PlaneGeometry(len * 0.78, 0.38, 3, 1), fMat);
        sub.position.copy(frond.position);
        sub.rotation.copy(frond.rotation);
        sub.rotation.x -= 0.18 + rng() * 0.14;
        sub.rotation.y += (rng() - 0.5) * 0.35;
        sub.castShadow = false;
        root.add(sub);
      }
    }

    const cocoMat = _trackLitMat(new THREE.MeshLambertMaterial({
      color: 0x8a6840,
      emissive: 0x181008,
      emissiveIntensity: 0.05,
    }), 0.05, 0x181008);
    const cocoN = 2 + Math.floor(rng() * 3);
    for (let c = 0; c < cocoN; c++) {
      const ca = (c / cocoN) * Math.PI * 2 + rng() * 0.8;
      const coco = new THREE.Mesh(
        _sphereGeo(0.1 + rng() * 0.04, 6, 5), cocoMat);
      coco.position.set(
        Math.cos(ca) * 0.22,
        crownY - 0.12 - rng() * 0.18,
        Math.sin(ca) * 0.22,
      );
      coco.castShadow = true;
      root.add(coco);
    }

    if (rng() < 0.55) {
      const tuftMat = _leafMat(0xc8d878);
      for (let g = 0; g < 3 + Math.floor(rng() * 3); g++) {
        const ga = rng() * Math.PI * 2;
        const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.5), tuftMat);
        blade.position.set(Math.cos(ga) * 0.35, 0.25, Math.sin(ga) * 0.35);
        blade.rotation.y = ga;
        blade.rotation.x = -0.2;
        blade.castShadow = false;
        root.add(blade);
      }
    }

    root.userData.treeKind = 'palm';
  }

  function buildDead(root, opts) {
    const rng = _rngFromOpts(opts);
    const h = 3.0 + rng() * 3.2;
    const mat = _trackLitMat(new THREE.MeshLambertMaterial({
      map: _barkTex,
      color: 0x6a5848,
      emissive: _TRUNK_EMISSIVE,
      emissiveIntensity: 0.05,
    }), 0.05, _TRUNK_EMISSIVE);
    _stackTrunk(root, mat, h, 0.16, 0.07, 3, rng);
    _addRoots(root, mat, 0.14, rng);
    for (let i = 0; i < 5 + Math.floor(rng() * 4); i++) {
      const ba = rng() * Math.PI * 2;
      const bl = 0.5 + rng() * 1.4;
      const by = h * (0.38 + rng() * 0.5);
      const br = new THREE.Mesh(_cylGeo(0.02, 0.05, bl, 4), mat);
      br.position.set(Math.cos(ba) * bl * 0.32, by, Math.sin(ba) * bl * 0.32);
      br.rotation.z = (rng() > 0.5 ? 1 : -1) * (Math.PI * 0.38 + rng() * 0.3);
      br.rotation.y = ba;
      br.castShadow = true;
      root.add(br);
      if (rng() < 0.35) {
        const snag = br.clone();
        snag.scale.setScalar(0.65);
        snag.rotation.z += (rng() > 0.5 ? 1 : -1) * 0.5;
        snag.position.y -= 0.15;
        root.add(snag);
      }
    }
    root.userData.treeKind = 'dead';
  }

  /** LOD léger (2 meshes) — arbres lointains / chargement différé. */
  function buildSimple(root, prefabId) {
    const kind = (prefabId || 'tree_oak').replace('tree_', '');
    const trunkColor = kind === 'birch' ? 0xd8d0c8 : kind === 'dead' ? 0x6a5a48 : 0x9a7a58;
    const trunkMat = _trunkMat(trunkColor);
    const trunkH = kind === 'pine' ? 4.4 : kind === 'palm' ? 3.8 : 3.4;
    const trunk = new THREE.Mesh(_cylGeo(0.32, 0.48, trunkH, 6), trunkMat);
    trunk.position.y = trunkH * 0.5;
    trunk.castShadow = false;
    root.add(trunk);
    if (kind === 'dead') {
      const snag = new THREE.Mesh(_cylGeo(0.12, 0.22, 1.8, 5), trunkMat);
      snag.position.set(0.35, trunkH * 0.55, 0.1);
      snag.rotation.z = 0.65;
      snag.castShadow = false;
      root.add(snag);
    } else if (kind === 'pine') {
      const cone = new THREE.Mesh(_coneGeo(1.7, 3.8, 6), _leafMat(0x3a6a38));
      cone.position.y = trunkH + 1.6;
      cone.castShadow = false;
      root.add(cone);
    } else if (kind === 'palm') {
      const crown = new THREE.Mesh(_dodecaGeo(1.4), _leafMat(0x4a8a40));
      crown.position.y = trunkH + 1.1;
      crown.scale.y = 0.65;
      crown.castShadow = false;
      root.add(crown);
    } else {
      const leafTint = kind === 'birch' ? 0x9acc68 : 0x6aaa48;
      const blob = new THREE.Mesh(_dodecaGeo(1.55), _leafMat(leafTint));
      blob.position.y = trunkH + 1.25;
      blob.castShadow = false;
      root.add(blob);
    }
    root.userData.treeKind = kind;
  }

  const TREE_PREFABS = {
    tree_oak: { build: buildOak, label: 'Chêne / feuillu' },
    tree_pine: { build: buildPine, label: 'Pin' },
    tree_birch: { build: buildBirch, label: 'Bouleau' },
    tree_dead: { build: buildDead, label: 'Arbre mort' },
    tree_palm: { build: buildPalm, label: 'Palmier' },
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
  ZS.TreePrefabs = {
    listTreePrefabIds, TREE_PREFABS,
    buildOak, buildPine, buildBirch, buildDead, buildPalm, buildSimple,
    tickTreeLighting,
  };
  ZS.tickTreeLighting = tickTreeLighting;
}());

