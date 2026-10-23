// Colliders, textures, mesh helpers
const _colliders = [];
  const _sectors   = [];
  const _spawnSectors = [];
  function isNearRoad(x, z, margin) {
    if (ZS.RoadNetwork && ZS.RoadNetwork.isNearRoad) {
      return ZS.RoadNetwork.isNearRoad(x, z, margin);
    }
    return false;
  }

  // ── Registre de loot ────────────────────────────────────────────────────────
  // Chaque bâtiment "lootable" déclare son empreinte + sa catégorie. Le serveur
  // s'en sert pour générer les objets au sol (voir worlDesign/items/items.md).
  const _lootBuildings = [];
  function registerLoot(category, cx, cz, w, d) {
    _lootBuildings.push({ category, cx, cz, w: w || 8, d: d || 7 });
  }

  // ── Textures routes (tileset worlDesign/secteur/routes.png) ────────────────────
  // Tuiles extraites de l'atlas et répétées le long du ruban (voir _ribbon → UV).
  const _texLoader = new THREE.TextureLoader();
  function _roadTexture(url) {
    const t = _texLoader.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = 16;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const _texAsphalt = _roadTexture('/img/road_asphalt.png');
  const _texDirt    = _roadTexture('/img/road_dirt.png');
  const _texTrail   = ZS.CampTextures?.load
    ? ZS.CampTextures.load('/textures/camp/trail_forest.png', 2.8, 2.8)
    : _texDirt;

  function _whenTextureReady(tex) {
    if (!tex) return Promise.resolve();
    if (tex.image && (tex.image.complete || tex.image.width > 0)) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => resolve();
      tex.addEventListener('load', done, { once: true });
      tex.addEventListener('error', done, { once: true });
    });
  }

  /** Évite « Texture marked for update but no image data » au premier render route. */
  function whenRoadTexturesReady() {
    return Promise.all([_whenTextureReady(_texAsphalt), _whenTextureReady(_texDirt), _whenTextureReady(_texTrail)]);
  }

  // ── Materials ─────────────────────────────────────────────────────────────────
  const M = {
    brick:    new THREE.MeshLambertMaterial({ color: 0xb55a3a }),
    brick2:   new THREE.MeshLambertMaterial({ color: 0x9c4a2e }),
    concrete: new THREE.MeshLambertMaterial({ color: 0xa09488 }),
    concDark: new THREE.MeshLambertMaterial({ color: 0x787060 }),
    wood:     new THREE.MeshLambertMaterial({ color: 0x9c6b3c }),
    wood2:    new THREE.MeshLambertMaterial({ color: 0x7a4f2e }),
    roofRed:  new THREE.MeshLambertMaterial({ color: 0x8a2020 }),
    roofDark: new THREE.MeshLambertMaterial({ color: 0x3e2c1a }),
    roofGray: new THREE.MeshLambertMaterial({ color: 0x5e5e52 }),
    floor:    new THREE.MeshLambertMaterial({ color: 0x7a6a5a }),
    dirt:     new THREE.MeshLambertMaterial({ color: 0x5a4a3a }),
    window:   new THREE.MeshLambertMaterial({ color: 0x5a8aaa, transparent: true, opacity: 0.55 }),
    metal:    new THREE.MeshLambertMaterial({ color: 0x778899 }),
    rust:     new THREE.MeshLambertMaterial({ color: 0x8a5a30 }),
    road:     new THREE.MeshLambertMaterial({ map: _texAsphalt, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }),
    roadBroken:new THREE.MeshLambertMaterial({ map: _texAsphalt, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }),
    roadShoulder: new THREE.MeshLambertMaterial({ color: 0x5a4a36, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }),
    roadEdge: new THREE.MeshLambertMaterial({ color: 0xe3ddd0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -10 }),
    roadLine: new THREE.MeshLambertMaterial({ color: 0xeecc22, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -10 }),
    roadDirt: new THREE.MeshLambertMaterial({ map: _texDirt, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }),
    path:     new THREE.MeshLambertMaterial({ map: _texDirt, color: 0x9a8870, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -8 }),
    trail:    new THREE.MeshLambertMaterial({ map: _texTrail, color: 0x9a8870, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }),
    stairs:   new THREE.MeshLambertMaterial({ color: 0x6b4f30 }),
  };

  // ── Primitives ────────────────────────────────────────────────────────────────

  function _finite(v, fb) { return Number.isFinite(v) ? v : fb; }
  function _dim(v, fb) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : fb; }

  function _mesh(scene, geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(_finite(x, 0), _finite(y, 0), _finite(z, 0));
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  // noCollide=true → visuel uniquement
  // maxY → le joueur peut sauter par-dessus si ses pieds dépassent maxY
  // minY → collider actif seulement si les pieds du joueur sont au-dessus de minY
  function _wall(scene, x, z, baseY, lenX, lenZ, height, mat, noCollide, maxY, minY) {
    const w = _dim(lenX, 0.1), d = _dim(lenZ, 0.1), h = _dim(height, 0.1);
    const y = _finite(baseY, 0);
    _mesh(scene, new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z);
    if (!noCollide) {
      const col = { type: 'box', cx: x, cz: z, hw: w / 2, hd: d / 2 };
      if (maxY !== undefined) col.maxY = maxY;
      if (minY !== undefined) col.minY = minY;
      _colliders.push(col);
    }
  }

  function _slab(scene, x, z, y, w, d, mat) {
    _mesh(scene, new THREE.BoxGeometry(_dim(w, 0.1), 0.14, _dim(d, 0.1)), mat, x, _finite(y, 0) + 0.07, z);
  }

  // Dalle percée d'une trémie rectangulaire (cage d'escalier)
  function _slabWithHole(scene, cx, cz, y, w, d, mat, hole) {
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const z0 = cz - d / 2, z1 = cz + d / 2;
    const hx0 = Math.max(x0, hole.cx - hole.hw), hx1 = Math.min(x1, hole.cx + hole.hw);
    const hz0 = Math.max(z0, hole.cz - hole.hd), hz1 = Math.min(z1, hole.cz + hole.hd);
    if (hz0 - z0 > 0.02) _slab(scene, cx, (z0 + hz0) / 2, y, w, hz0 - z0, mat);
    if (z1 - hz1 > 0.02) _slab(scene, cx, (hz1 + z1) / 2, y, w, z1 - hz1, mat);
    if (hx0 - x0 > 0.02) _slab(scene, (x0 + hx0) / 2, (hz0 + hz1) / 2, y, hx0 - x0, hz1 - hz0, mat);
    if (x1 - hx1 > 0.02) _slab(scene, (hx1 + x1) / 2, (hz0 + hz1) / 2, y, x1 - hx1, hz1 - hz0, mat);
  }

  function _box(scene, x, z, y, w, h, d, mat) {
    _mesh(scene, new THREE.BoxGeometry(_dim(w, 0.1), _dim(h, 0.1), _dim(d, 0.1)), mat, x, y, z);
  }

  function _visualStairs(scene, cx, cz, fromY, toY, axis, stairWidth, halfLen) {
    const STEPS = 8;
    const stepH = (toY - fromY) / STEPS;
    const stepRun = (halfLen * 2) / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const cy  = fromY + stepH * (i + 0.5);
      const off = -halfLen + stepRun * (i + 0.5);
      const sx  = axis === 'x' ? cx + off : cx;
      const sz  = axis === 'z' ? cz + off : cz;
      const gw  = axis === 'x' ? stepRun + 0.02 : stairWidth;
      const gd  = axis === 'z' ? stepRun + 0.02 : stairWidth;
      _box(scene, sx, sz, cy, gw, stepH + 0.02, gd, M.stairs);
    }
  }

  // Enregistre une arête (rendu via RoadNetwork.buildMeshes)
  function _ribbon(scene, pts, width, mat, withLine, opts) {
    if (!ZS.RoadNetwork) return;
    const roadType = mat === M.road || mat === M.roadBroken ? 'asphalt'
      : mat === M.roadDirt ? 'dirt' : 'path';
    ZS.RoadNetwork.defineEdge({
      pts,
      width,
      type: roadType,
      line: !!withLine,
      broken: mat === M.roadBroken,
      taperStart: opts?.taperStart || 0,
      taperEnd: opts?.taperEnd || 0,
    });
  }

  // ── Reusable building templates ───────────────────────────────────────────────
