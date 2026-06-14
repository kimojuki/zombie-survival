// Atlas, géos, matériaux
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
