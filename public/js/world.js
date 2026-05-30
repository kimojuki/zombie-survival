// World: terrain, vegetation, lights, sky + day/night cycle
(function () {
  'use strict';

  let _scene, _ambientLight, _sunLight, _moonLight;
  const _fireLights = [];
  const _colliders  = [];
  const _clouds     = [];
  let   _cloudMat   = null;
  let   _timeOfDay  = 0.3;

  // ── Keyframes jour/nuit ───────────────────────────────────────────────────────
  // sunY : -1 = minuit, 0 = horizon (lever/coucher), +1 = midi
  // Zones élargies autour de t=0 → transition douce lever/coucher.
  // ambI minimum = 0.15 → jamais de "noir total".
  const _KEYS = [
    { t: -1.00, sky: 0x060810, amb: 0x090f1e, ambI: 0.15, sunI: 0.00 }, // minuit profond
    { t: -0.35, sky: 0x0b1020, amb: 0x0f1628, ambI: 0.16, sunI: 0.00 }, // nuit calme
    { t: -0.10, sky: 0x150c28, amb: 0x130e22, ambI: 0.18, sunI: 0.00 }, // pré-aube violette
    { t:  0.00, sky: 0x7a2208, amb: 0x581e0a, ambI: 0.26, sunI: 0.20 }, // soleil à l'horizon
    { t:  0.09, sky: 0xcc5a0a, amb: 0xffaa3a, ambI: 0.40, sunI: 0.68 }, // heure dorée (lever)
    { t:  0.22, sky: 0x7ec8e3, amb: 0xfff0c8, ambI: 0.56, sunI: 1.22 }, // matin lumineux
    { t:  0.50, sky: 0x5ab2d8, amb: 0xfffae8, ambI: 0.65, sunI: 1.50 }, // plein jour
    { t:  1.00, sky: 0x5ab2d8, amb: 0xfffae8, ambI: 0.65, sunI: 1.50 }, // après-midi
  ];

  const _cA = new THREE.Color();
  const _cB = new THREE.Color();
  const _cT = new THREE.Color(); // scratch pour terrainColor
  const _cD = new THREE.Color(); // scratch pour terrainColor

  // ── API ──────────────────────────────────────────────────────────────────────

  function buildWorld(scene) {
    _scene = scene;
    scene.background = new THREE.Color(0x5ab2d8);
    scene.fog = new THREE.Fog(0x5ab2d8, 150, 450);

    _ambientLight = new THREE.AmbientLight(0xfff8e7, 0.65);
    scene.add(_ambientLight);

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
    spawnFlowers(scene, 260);
    spawnTrees(scene, 180);
    spawnRocks(scene, 60);
    spawnBushes(scene, 120);
    spawnClouds(scene);

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
    _sunLight.intensity     = k.sunI;
    _moonLight.intensity    = Math.max(0, -sunY) * 0.45;
    _ambientLight.intensity = k.ambI;
    _ambientLight.color.setHex(k.amb);
    _scene.background.setHex(k.sky);
    _scene.fog.color.setHex(k.sky);

    // Brouillard de nuit moins agressif — évite le "noir total"
    const night = Math.max(0, Math.min(1, -sunY * 1.8));
    _scene.fog.near = 140 - night * 75;   // 140 (jour) → 65 (nuit)
    _scene.fog.far  = 420 - night * 200;  // 420 (jour) → 220 (nuit)

    // Nuages : dérive lente + couleur selon heure
    if (_clouds.length > 0 && dt > 0 && _cloudMat) {
      for (const c of _clouds) {
        c.position.x += 0.9 * dt;
        if (c.position.x > 430) c.position.x -= 860;
      }
      // Luminosité nuage : blanc le jour, bleu-gris la nuit
      const br = Math.max(0.22, k.ambI * 0.88 + 0.06);
      const nb = Math.max(0, -sunY);
      _cloudMat.color.setRGB(br, br, Math.max(br - 0.05, br - nb * 0.12));
      _cloudMat.emissiveIntensity = 0.04 + nb * 0.08;
    }

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

  function _smoothstep(t) { return t * t * (3 - 2 * t); }

  function _interpKey(sunY) {
    for (let i = 0; i < _KEYS.length - 1; i++) {
      const a = _KEYS[i], b = _KEYS[i + 1];
      if (sunY >= a.t && sunY <= b.t) {
        // Smoothstep pour des transitions plus naturelles (pas linéaires)
        const alpha = _smoothstep((sunY - a.t) / (b.t - a.t));
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

  // ── Bruit pour variation du terrain ──────────────────────────────────────────

  function _tvh(x, z) {
    const n = Math.sin(x * 91.3 + z * 157.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function _tvn(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    const fx = x - xi, fz = z - zi;
    const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    const lp = (a, b, t) => a + (b - a) * t;
    return lp(lp(_tvh(xi, zi), _tvh(xi + 1, zi), ux),
              lp(_tvh(xi, zi + 1), _tvh(xi + 1, zi + 1), ux), uz);
  }

  // ── Couleur terrain : gradient hauteur + variation noise ─────────────────────

  function _terrainColor(x, z, h) {
    // Gradient de base selon la hauteur
    let baseHex;
    if      (h < -4)  baseHex = 0x283c28;  // fond de vallée sombre
    else if (h <  0)  baseHex = 0x325830;  // herbe basse / humide
    else if (h <  3)  baseHex = 0x3e6834;  // herbe fraîche
    else if (h <  6)  baseHex = 0x4a7438;  // herbe normale
    else if (h < 10)  baseHex = 0x5e7040;  // herbe haute / rocheuse
    else if (h < 16)  baseHex = 0x7a7050;  // rocaille
    else              baseHex = 0x888070;  // sommet rocheux

    if (h >= 14) return baseHex; // pas de variation sur les rochers hauts

    // Bruit multi-octaves pour patches naturels
    const n1 = _tvn(x * 0.04, z * 0.04);       // grandes zones (~25m)
    const n2 = _tvn(x * 0.14, z * 0.14);       // zones moyennes (~7m)
    const n3 = _tvn(x * 0.50, z * 0.50);       // détail fin (~2m)
    const n  = n1 * 0.50 + n2 * 0.32 + n3 * 0.18;

    _cT.setHex(baseHex);

    if (n > 0.70) {
      // Terre / sol nu
      _cD.setHex(h < 4 ? 0x7a5530 : 0x8a6840);
      _cT.lerp(_cD, 0.55);
    } else if (n > 0.60) {
      // Herbe sèche / brûlée
      _cD.setHex(0x8c8838);
      _cT.lerp(_cD, 0.38);
    } else if (n < 0.20) {
      // Mousse / herbe mouillée sombre
      _cD.setHex(0x2a5828);
      _cT.lerp(_cD, 0.34);
    } else if (n > 0.50 && n3 < 0.30 && h < 5) {
      // Petite touche fleurie (herbe claire / fleur)
      _cD.setHex(0x9aaa3a);
      _cT.lerp(_cD, 0.20);
    }

    return _cT.getHex();
  }

  function buildTerrain(scene) {
    const SIZE = 600, SEG = 180;
    const geo  = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos  = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const col  = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i), vz = pos.getZ(i);
      const h  = ZS.getTerrainHeight(vx, vz);
      pos.setY(i, h);
      col.setHex(_terrainColor(vx, vz, h));
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

  // ── Fleurs ───────────────────────────────────────────────────────────────────

  function spawnFlowers(scene, count) {
    const stemMat  = new THREE.MeshLambertMaterial({ color: 0x2e5e1e });
    const flMats   = [0xffee22, 0xffffff, 0xcc44bb, 0xff9922, 0xaaddff, 0xffbbaa]
                       .map(c => new THREE.MeshLambertMaterial({ color: c }));

    for (let i = 0; i < count; i++) {
      const x = (_rng() - 0.5) * 540;
      const z = (_rng() - 0.5) * 540;
      // Éviter le centre-ville (zone bâtie principale)
      if (x > -262 && x < -100 && z > -55 && z < 58) continue;
      const by = ZS.getTerrainHeight(x, z);
      if (by > 9) continue; // pas de fleurs sur rochers

      const h   = 0.16 + _rng() * 0.14;
      const mat = flMats[Math.floor(_rng() * flMats.length)];

      // Pétales (cylindre plat)
      const petal = new THREE.Mesh(new THREE.CylinderGeometry(0.08 + _rng() * 0.06, 0.06, 0.04, 6), mat);
      petal.position.set(x, by + h + 0.02, z);
      petal.rotation.y = _rng() * Math.PI;
      scene.add(petal);

      // Tige
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.020, h, 4), stemMat);
      stem.position.set(x, by + h * 0.5, z);
      scene.add(stem);
    }
  }

  // ── Nuages ───────────────────────────────────────────────────────────────────

  function spawnClouds(scene) {
    _cloudMat = new THREE.MeshLambertMaterial({
      color:              0xf0f0ee,
      emissive:           0xffffff,
      emissiveIntensity:  0.04,
      transparent:        true,
      opacity:            0.88,
    });

    for (let i = 0; i < 28; i++) {
      const g  = new THREE.Group();
      const cx = (_rng() - 0.5) * 820;
      const cy = 64 + _rng() * 32;
      const cz = (_rng() - 0.5) * 820;

      const parts = 4 + Math.floor(_rng() * 4);
      for (let j = 0; j < parts; j++) {
        const r = 6 + _rng() * 11;
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), _cloudMat);
        s.position.set(
          (_rng() - 0.5) * 22,
          (_rng() - 0.28) * 5,  // légèrement aplati vers le bas
          (_rng() - 0.5) * 14
        );
        s.scale.y = 0.42 + _rng() * 0.26;
        g.add(s);
      }
      g.position.set(cx, cy, cz);
      scene.add(g);
      _clouds.push(g);
    }
  }

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

  function makePineTree() {
    const g = new THREE.Group();
    const h        = 3.5 + _rng() * 3.2;
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
