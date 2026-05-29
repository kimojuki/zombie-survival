// World: terrain, vegetation, lights, sky + day/night cycle
(function () {
  'use strict';

  let _scene, _ambientLight, _sunLight, _moonLight;
  const _fireLights = [];
  const _colliders = [];
  let _timeOfDay = 0.3;

  // Day/night keyframes  (sunY: -1=midnight … 0=horizon … 1=noon)
  const _KEYS = [
    { t: -1.00, sky: 0x0a1520, amb: 0x111e38, ambI: 0.20, sunI: 0.00 },
    { t: -0.10, sky: 0x101828, amb: 0x1a2a4a, ambI: 0.25, sunI: 0.00 },
    { t:  0.00, sky: 0xcc3b0a, amb: 0x441a08, ambI: 0.12, sunI: 0.20 },
    { t:  0.18, sky: 0xff8c20, amb: 0xffcc88, ambI: 0.38, sunI: 0.80 },
    { t:  0.45, sky: 0x7ec8e3, amb: 0xfff8e7, ambI: 0.60, sunI: 1.40 },
    { t:  1.00, sky: 0x7ec8e3, amb: 0xfff8e7, ambI: 0.65, sunI: 1.50 },
  ];

  const _cA = new THREE.Color();
  const _cB = new THREE.Color();

  // ── API ──────────────────────────────────────────────────────────────────────

  function buildWorld(scene) {
    _scene = scene;
    scene.background = new THREE.Color(0x7ec8e3);
    scene.fog = new THREE.Fog(0x7ec8e3, 150, 450);

    _ambientLight = new THREE.AmbientLight(0xfff8e7, 0.6);
    scene.add(_ambientLight);

    // Sun — casts soft shadows over the whole map
    _sunLight = new THREE.DirectionalLight(0xfff5dd, 1.3);
    _sunLight.castShadow = true;
    _sunLight.shadow.mapSize.width  = 2048;
    _sunLight.shadow.mapSize.height = 2048;
    _sunLight.shadow.camera.near   = 1;
    _sunLight.shadow.camera.far    = 600;
    _sunLight.shadow.camera.left   = -320;
    _sunLight.shadow.camera.right  = 320;
    _sunLight.shadow.camera.top    = 320;
    _sunLight.shadow.camera.bottom = -320;
    _sunLight.shadow.bias          = -0.0003;
    _sunLight.shadow.normalBias    = 0.02;
    scene.add(_sunLight);

    _moonLight = new THREE.DirectionalLight(0x8899cc, 0);
    scene.add(_moonLight);

    buildTerrain(scene);
    spawnTrees(scene, 500);
    spawnRocks(scene, 200);
    spawnBushes(scene, 400);

    const buildingColliders = ZS.Buildings.buildAll(scene);
    for (const c of buildingColliders) _colliders.push(c);

    tickDayNight(0);
  }

  function setWorldTime(t) { _timeOfDay = t; }

  function tickDayNight(dt) {
    const angle = _timeOfDay * Math.PI * 2;
    const sunY  = Math.sin(angle - Math.PI * 0.5);
    const sunX  = Math.cos(angle - Math.PI * 0.5);

    _sunLight.position.set(sunX * 200, sunY * 200, 60);
    _moonLight.position.set(-sunX * 200, -sunY * 200, -60);

    const k = _interpKey(sunY);
    _sunLight.intensity      = k.sunI;
    _moonLight.intensity     = Math.max(0, -sunY) * 0.5;
    _ambientLight.intensity  = k.ambI;
    _ambientLight.color.setHex(k.amb);
    _scene.background.setHex(k.sky);
    _scene.fog.color.setHex(k.sky);

    const night = Math.max(0, Math.min(1, -sunY * 2.2));
    _scene.fog.near = 150 - night * 90;   // 150 (day) → 60 (night)
    _scene.fog.far  = 450 - night * 270;  // 450 (day) → 180 (night)

    if (_fireLights.length > 0) {
      const t = Date.now();
      const f = 0.82
        + Math.sin(t * 0.011) * 0.09
        + Math.sin(t * 0.019) * 0.06
        + Math.sin(t * 0.034) * 0.04;
      for (const fl of _fireLights) {
        fl.light.intensity = f * 2.2;
        if (fl.mesh) fl.mesh.scale.y = 0.85 + f * 0.22;
      }
    }
  }

  // ── Privé ────────────────────────────────────────────────────────────────────

  function _interpKey(sunY) {
    for (let i = 0; i < _KEYS.length - 1; i++) {
      const a = _KEYS[i], b = _KEYS[i + 1];
      if (sunY >= a.t && sunY <= b.t) {
        const alpha = (sunY - a.t) / (b.t - a.t);
        _cA.setHex(a.sky); _cB.setHex(b.sky);
        const sky = _cA.lerp(_cB, alpha).getHex();
        _cA.setHex(a.amb); _cB.setHex(b.amb);
        const amb = _cA.lerp(_cB, alpha).getHex();
        return {
          sky, amb,
          ambI: a.ambI + (b.ambI - a.ambI) * alpha,
          sunI: Math.max(0, a.sunI + (b.sunI - a.sunI) * alpha),
        };
      }
    }
    return _KEYS[_KEYS.length - 1];
  }

  // Height → vertex color: deep valley (dark) → peak (rocky grey)
  const _TC = [
    { h: -8, hex: 0x2c4430 },
    { h: -2, hex: 0x385838 },
    { h:  1, hex: 0x487848 },
    { h:  4, hex: 0x568850 },
    { h:  8, hex: 0x787050 },
    { h: 12, hex: 0x887860 },
    { h: 20, hex: 0x888070 },
  ];

  function _terrainColor(h) {
    if (h <= _TC[0].h) return _TC[0].hex;
    for (let i = 0; i < _TC.length - 1; i++) {
      if (h <= _TC[i + 1].h) {
        const t = (h - _TC[i].h) / (_TC[i + 1].h - _TC[i].h);
        _cA.setHex(_TC[i].hex); _cB.setHex(_TC[i + 1].hex);
        return _cA.lerp(_cB, t).getHex();
      }
    }
    return _TC[_TC.length - 1].hex;
  }

  function buildTerrain(scene) {
    const SIZE = 600, SEG = 300;
    const geo  = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos  = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const col  = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const h = ZS.getTerrainHeight(pos.getX(i), pos.getZ(i));
      pos.setY(i, h);
      col.setHex(_terrainColor(h));
      cols[i * 3] = col.r; cols[i * 3 + 1] = col.g; cols[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // ── PRNG déterministe ────────────────────────────────────────────────────────

  function _makeRng(seed) {
    let s = seed >>> 0;
    return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
  }
  const _rng = _makeRng(0xDEADBEEF);

  // ── Végétation ───────────────────────────────────────────────────────────────

  function spawnTrees(scene, count) {
    for (let i = 0; i < count; i++) {
      const x = (_rng() - 0.5) * 560;
      const z = (_rng() - 0.5) * 560;
      if (Math.hypot(x, z) < 4) continue;
      _colliders.push({ x, z, r: 0.6 });
      const tree = _rng() < 0.28 ? makePineTree() : makeTree();
      tree.position.set(x, ZS.getTerrainHeight(x, z), z);
      scene.add(tree);
    }
  }

  // Arbres feuillus classiques
  function makeTree() {
    const g = new THREE.Group();
    const trunkH   = 1.8 + _rng() * 1.5;
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk    = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1 + _rng() * 0.05, 0.18 + _rng() * 0.06, trunkH, 7), trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    g.add(trunk);

    const lMat1 = new THREE.MeshLambertMaterial({ color: 0x1e7a3c });
    const lMat2 = new THREE.MeshLambertMaterial({ color: 0x2d9e52 });
    for (let i = 0; i < 2 + Math.floor(_rng() * 3); i++) {
      const r    = 0.8 + _rng() * 0.7;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), i % 2 === 0 ? lMat1 : lMat2);
      leaf.position.set((_rng() - 0.5) * 0.9, trunkH + r * 0.5 + _rng() * 0.6, (_rng() - 0.5) * 0.9);
      leaf.castShadow = true;
      g.add(leaf);
    }
    return g;
  }

  // Pins — silhouette sombre et anguleuse, bonne atmosphère
  function makePineTree() {
    const g = new THREE.Group();
    const h       = 3.5 + _rng() * 3.2;
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a2808 });
    const trunk    = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, h, 7), trunkMat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    g.add(trunk);

    const pMat   = new THREE.MeshLambertMaterial({ color: 0x184828 });
    const layers = 3 + Math.floor(_rng() * 2);
    for (let i = 0; i < layers; i++) {
      const r    = (0.95 - i * 0.15) * (0.65 + _rng() * 0.45);
      const conH = 1.0 + _rng() * 0.55;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, conH, 8), pMat);
      cone.position.y = h * (0.38 + i * 0.2) + conH * 0.32;
      cone.castShadow = true;
      g.add(cone);
    }
    return g;
  }

  function spawnDeadTreesAt(scene, cx, cz, count, spread) {
    for (let i = 0; i < count; i++) {
      const a = _rng() * Math.PI * 2;
      const d = 2 + _rng() * spread;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      const tree = makeDeadTree();
      tree.position.set(x, ZS.getTerrainHeight(x, z), z);
      scene.add(tree);
      _colliders.push({ x, z, r: 0.25 });
    }
  }

  function spawnTreesAt(scene, cx, cz, count, radius, pineRatio, skipNear) {
    for (let i = 0; i < count; i++) {
      const a = _rng() * Math.PI * 2;
      const r = _rng() * radius;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      if (skipNear && skipNear.some(s => Math.hypot(x - s[0], z - s[1]) < s[2])) continue;
      _colliders.push({ x, z, r: 0.6 });
      const tree = _rng() < (pineRatio || 0.28) ? makePineTree() : makeTree();
      tree.position.set(x, ZS.getTerrainHeight(x, z), z);
      scene.add(tree);
    }
  }

  function makeDeadTree() {
    const g   = new THREE.Group();
    const h   = 2.4 + _rng() * 2.8;
    const mat = new THREE.MeshLambertMaterial({ color: 0x483828 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.15, h, 5), mat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 3 + Math.floor(_rng() * 3); i++) {
      const ba  = _rng() * Math.PI * 2;
      const bl  = 0.5 + _rng() * 1.1;
      const by  = h * (0.5 + _rng() * 0.45);
      const br  = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, bl, 4), mat);
      br.position.set(Math.cos(ba) * bl * 0.35, by, Math.sin(ba) * bl * 0.35);
      br.rotation.z = (_rng() > 0.5 ? 1 : -1) * (Math.PI * 0.42 + _rng() * 0.25);
      br.rotation.y = ba;
      br.castShadow = true;
      g.add(br);
    }
    return g;
  }

  function spawnRocks(scene, count) {
    const mats = [
      new THREE.MeshLambertMaterial({ color: 0x888888 }),
      new THREE.MeshLambertMaterial({ color: 0x7a6850 }),
      new THREE.MeshLambertMaterial({ color: 0x6a6872 }),
    ];
    for (let i = 0; i < count; i++) {
      const x  = (_rng() - 0.5) * 560;
      const z  = (_rng() - 0.5) * 560;
      const s  = 0.3 + _rng() * 0.8;
      const by = ZS.getTerrainHeight(x, z);
      _colliders.push({ x, z, r: s + 0.25, topY: by + s * 1.4 });
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mats[Math.floor(_rng() * 3)]);
      rock.rotation.set(_rng() * Math.PI, _rng() * Math.PI, _rng() * Math.PI);
      rock.position.set(x, by + s * 0.3, z);
      rock.castShadow = true;
      rock.receiveShadow = true;
      scene.add(rock);
    }
  }

  function spawnBushes(scene, count) {
    const mats = [
      new THREE.MeshLambertMaterial({ color: 0x2d5a25 }),
      new THREE.MeshLambertMaterial({ color: 0x3a6530 }),
      new THREE.MeshLambertMaterial({ color: 0x4a5828 }),
    ];
    for (let i = 0; i < count; i++) {
      const x = (_rng() - 0.5) * 540;
      const z = (_rng() - 0.5) * 540;
      if (Math.hypot(x, z) < 5) continue;
      const r    = 0.28 + _rng() * 0.45;
      const bush = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 4), mats[Math.floor(_rng() * 3)]);
      bush.scale.y = 0.6 + _rng() * 0.4;
      bush.position.set(x, ZS.getTerrainHeight(x, z) + r * 0.35, z);
      bush.castShadow = true;
      scene.add(bush);
    }
  }

  function registerFireLight(light, mesh) {
    _fireLights.push({ light, mesh });
  }

  window.ZS = window.ZS || {};
  ZS.buildWorld        = buildWorld;
  ZS.tickDayNight      = tickDayNight;
  ZS.setWorldTime      = setWorldTime;
  ZS.getColliders      = () => _colliders;
  ZS.registerFireLight = registerFireLight;
  ZS.spawnTreesAt      = spawnTreesAt;
  ZS.spawnDeadTreesAt  = spawnDeadTreesAt;
  ZS.makeTree          = makeTree;
  ZS.makePineTree      = makePineTree;
  ZS.makeDeadTree      = makeDeadTree;
}());
