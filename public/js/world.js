// World: terrain, vegetation, lights, sky + day/night cycle
(function () {
  'use strict';

  let _scene, _ambientLight, _sunLight, _moonLight;
  let _timeOfDay = 0.3; // 0–1  (0=minuit, 0.25=lever, 0.5=midi, 0.75=coucher)
  const _DAY_DURATION = 240; // secondes par cycle complet

  // Étapes-clés indexées par hauteur du soleil (sunY: -1 → 1)
  // sky=couleur ciel, amb=couleur ambiante, ambI=intensité ambiante, sunI=intensité soleil
  const _KEYS = [
    { t: -1.00, sky: 0x020a14, amb: 0x0a0e22, ambI: 0.04, sunI: 0.00 }, // pleine nuit
    { t: -0.10, sky: 0x08051a, amb: 0x0a0e22, ambI: 0.05, sunI: 0.00 }, // pré-aube
    { t:  0.00, sky: 0xcc3b0a, amb: 0x441a08, ambI: 0.12, sunI: 0.20 }, // lever/coucher
    { t:  0.18, sky: 0xff8c20, amb: 0xffcc88, ambI: 0.35, sunI: 0.75 }, // heure dorée
    { t:  0.45, sky: 0x7ec8e3, amb: 0xfff8e7, ambI: 0.60, sunI: 1.40 }, // journée
    { t:  1.00, sky: 0x7ec8e3, amb: 0xfff8e7, ambI: 0.65, sunI: 1.50 }, // zénith
  ];

  // Réutilisés pour éviter d'allouer à chaque frame
  const _cA = new THREE.Color();
  const _cB = new THREE.Color();

  // ── API publique ─────────────────────────────────────────────────────────

  function buildWorld(scene) {
    _scene = scene;
    scene.background = new THREE.Color(0x7ec8e3);
    scene.fog = new THREE.Fog(0x7ec8e3, 50, 110);

    _ambientLight = new THREE.AmbientLight(0xfff8e7, 0.6);
    scene.add(_ambientLight);

    _sunLight = new THREE.DirectionalLight(0xfff8e7, 1.2);
    scene.add(_sunLight);

    _moonLight = new THREE.DirectionalLight(0x8899cc, 0);
    scene.add(_moonLight);

    buildTerrain(scene);
    spawnTrees(scene, 80);
    spawnRocks(scene, 40);
    buildSafeZone(scene);

    // Applique l'état initial sans attendre le premier tick
    tickDayNight(0);
  }

  function tickDayNight(dt) {
    _timeOfDay = (_timeOfDay + dt / _DAY_DURATION) % 1;

    // sunY: -1 = minuit, 0 = horizon (lever/coucher), 1 = midi
    const angle = _timeOfDay * Math.PI * 2;
    const sunY  = Math.sin(angle - Math.PI * 0.5);
    const sunX  = Math.cos(angle - Math.PI * 0.5);

    // Déplace le soleil en arc dans le ciel
    _sunLight.position.set(sunX * 200, sunY * 200, 50);
    // La lune est à l'opposé
    _moonLight.position.set(-sunX * 200, -sunY * 200, -50);

    const k = _interpKey(sunY);

    _sunLight.intensity   = k.sunI;
    _moonLight.intensity  = Math.max(0, -sunY) * 0.25;
    _ambientLight.intensity = k.ambI;
    _ambientLight.color.setHex(k.amb);
    _scene.background.setHex(k.sky);
    _scene.fog.color.setHex(k.sky);
  }

  // ── Privé ────────────────────────────────────────────────────────────────

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
          sky,
          amb,
          ambI: a.ambI + (b.ambI - a.ambI) * alpha,
          sunI: Math.max(0, a.sunI + (b.sunI - a.sunI) * alpha),
        };
      }
    }
    return _KEYS[_KEYS.length - 1];
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
    scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x4a7c59 })));
  }

  // PRNG déterministe — même graine = même monde à chaque chargement
  function _makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return (s >>> 0) / 0xffffffff;
    };
  }
  const _rng = _makeRng(0xDEADBEEF);

  function spawnTrees(scene, count) {
    for (let i = 0; i < count; i++) {
      const x = (_rng() - 0.5) * 110;
      const z = (_rng() - 0.5) * 110;
      if (Math.hypot(x, z) < 4) continue;
      const tree = makeTree();
      tree.position.set(x, ZS.getTerrainHeight(x, z), z);
      scene.add(tree);
    }
  }

  function spawnRocks(scene, count) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    for (let i = 0; i < count; i++) {
      const x = (_rng() - 0.5) * 110;
      const z = (_rng() - 0.5) * 110;
      const s = 0.3 + _rng() * 0.7;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat);
      rock.rotation.set(_rng() * Math.PI, _rng() * Math.PI, _rng() * Math.PI);
      rock.position.set(x, ZS.getTerrainHeight(x, z) + s * 0.3, z);
      scene.add(rock);
    }
  }

  function buildSafeZone(scene) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 0.4, 16), mat);
    base.position.set(0, ZS.getTerrainHeight(0, 0) + 0.2, 0);
    scene.add(base);
  }

  function makeTree() {
    const g = new THREE.Group();
    const trunkH  = 1.8 + _rng() * 1.5;
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1 + _rng() * 0.05, 0.18 + _rng() * 0.05, trunkH, 7),
      trunkMat
    );
    trunk.position.y = trunkH / 2;
    g.add(trunk);

    const leafMat  = new THREE.MeshLambertMaterial({ color: 0x1e7a3c });
    const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x2d9e52 });
    const clusters = 2 + Math.floor(_rng() * 3);
    for (let i = 0; i < clusters; i++) {
      const r = 0.8 + _rng() * 0.7;
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(r, 7, 5),
        i % 2 === 0 ? leafMat : leafMat2
      );
      leaf.position.set(
        (_rng() - 0.5) * 0.9,
        trunkH + r * 0.5 + _rng() * 0.6,
        (_rng() - 0.5) * 0.9
      );
      g.add(leaf);
    }
    return g;
  }

  window.ZS = window.ZS || {};
  ZS.buildWorld    = buildWorld;
  ZS.tickDayNight  = tickDayNight;
}());
