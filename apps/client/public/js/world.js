// World: terrain, végétation, lumières, ciel + cycle jour/nuit
(function () {
  'use strict';

  let _scene, _ambientLight, _sunLight, _moonLight, _hemiLight, _sunSprite, _moonSprite, _skyRoot, _starField;
  const _fireLights = [];
  const _billboards = [];
  const _billboardVec = new THREE.Vector3();
  const _waterSurfaces = [];
  const _waterMats  = []; // matériaux de surface d'eau → animés chaque frame
  const _colliders  = [];
  const _decorColliders = new Map(); // decorId -> collider[]
  const _clouds     = [];
  let   _cloudMat   = null;
  let   _cloudTex   = null;
  let   _starMat    = null;
  let   _timeOfDay  = 0.3;
  let   _dayCount   = 0;
  let   _moonPhaseIndex = -1;
  const _DAY_LENGTH_SEC = 960;
  const _terrainTex = new THREE.TextureLoader().load('/img/terrain_atlas.png');
  _terrainTex.wrapS = _terrainTex.wrapT = THREE.RepeatWrapping;
  _terrainTex.magFilter = THREE.NearestFilter;
  _terrainTex.minFilter = THREE.NearestMipmapNearestFilter;
  _terrainTex.colorSpace = THREE.SRGBColorSpace;
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

  function _inRiver(x, z) { return ZS.isInRiverChannel?.(x, z, 0.8) ?? false; }
  function _onRoad(x, z) { return ZS.isNearRoad?.(x, z, 1.0) ?? false; }
  function _blockedSpawn(x, z) { return _inRiver(x, z) || _onRoad(x, z); }

  let _terrainMesh = null;

  // ── Keyframes ciel jour/nuit ──────────────────────────────────────────────────
  const _KEYS = [
    { t: -1.00, sky: 0x060810, amb: 0x090f1e, ambI: 0.15, sunI: 0.00 },
    { t: -0.35, sky: 0x0b1020, amb: 0x0f1628, ambI: 0.16, sunI: 0.00 },
    { t: -0.10, sky: 0x150c28, amb: 0x130e22, ambI: 0.18, sunI: 0.00 },
    { t:  0.00, sky: 0x7a2208, amb: 0x581e0a, ambI: 0.26, sunI: 0.20 }, // horizon
    { t:  0.09, sky: 0xcc5a0a, amb: 0xffaa3a, ambI: 0.40, sunI: 0.68 }, // heure dorée
    { t:  0.22, sky: 0x7ec8e3, amb: 0xfff0c8, ambI: 0.56, sunI: 1.22 }, // matin
    { t:  0.50, sky: 0x5ab2d8, amb: 0xfffae8, ambI: 0.65, sunI: 1.50 }, // midi
    { t:  1.00, sky: 0x5ab2d8, amb: 0xfffae8, ambI: 0.65, sunI: 1.50 },
  ];

  // Couleurs nuages selon l'heure (interpolées sur sunY)
  const _CK = [
    { t: -1.00, r: 0.14, g: 0.17, b: 0.28 }, // minuit : bleu sombre
    { t: -0.08, r: 0.18, g: 0.15, b: 0.30 }, // pré-aube : violet
    { t:  0.00, r: 0.98, g: 0.52, b: 0.28 }, // lever : orange-rose vif
    { t:  0.07, r: 1.00, g: 0.78, b: 0.52 }, // heure dorée : or pâle
    { t:  0.20, r: 0.96, g: 0.97, b: 0.99 }, // matin : blanc légèrement bleuté
    { t:  1.00, r: 0.94, g: 0.96, b: 0.98 }, // jour : blanc cassé
  ];

  const _cA = new THREE.Color(), _cB = new THREE.Color();
  const _cT = new THREE.Color(), _cD = new THREE.Color();
  function _canvasTex(w, h, drawFn) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    drawFn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.needsUpdate = true;
    return t;
  }
  function _makeSunTex() {
    return _canvasTex(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 4, w * 0.5, h * 0.5, w * 0.48);
      g.addColorStop(0, 'rgba(255,255,220,1)');
      g.addColorStop(0.35, 'rgba(255,232,140,0.95)');
      g.addColorStop(0.68, 'rgba(255,184,60,0.8)');
      g.addColorStop(1, 'rgba(255,160,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  function _makeStarTex() {
    return _canvasTex(32, 32, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.48);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,248,220,0.95)');
      g.addColorStop(0.7, 'rgba(180,210,255,0.35)');
      g.addColorStop(1, 'rgba(180,210,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  function _makeCloudTex() {
    return _canvasTex(192, 96, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const blobs = [
        [0.22, 0.58, 0.22],
        [0.38, 0.46, 0.28],
        [0.56, 0.42, 0.26],
        [0.72, 0.54, 0.20],
        [0.48, 0.62, 0.18],
      ];
      for (const [x, y, r] of blobs) {
        const g = ctx.createRadialGradient(w * x, h * y, 0, w * x, h * y, h * r);
        g.addColorStop(0, 'rgba(255,255,255,0.98)');
        g.addColorStop(0.55, 'rgba(250,250,248,0.9)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(w * x, h * y, h * r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  function _makeMoonTex(phase) {
    return _canvasTex(128, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.28;
      ctx.fillStyle = 'rgba(120,150,210,0.12)';
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(230,236,255,0.98)';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      const illum = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
      const waxing = phase < 0.5;
      const shadowOffset = (1 - illum * 2) * r;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(10,14,28,0.94)';
      ctx.beginPath(); ctx.arc(cx + (waxing ? shadowOffset : -shadowOffset), cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    });
  }
  const _sunTex = _makeSunTex();
  const _starTex = _makeStarTex();
  const _cloudBaseTex = _makeCloudTex();
  let _moonTex = _makeMoonTex(0);
  function _moonPhase() { return (_dayCount % 28) / 28; }
  function _moonIllumination(phase) { return 0.5 - 0.5 * Math.cos(phase * Math.PI * 2); }
  function _ensureMoonPhaseTexture(phase) {
    const idx = Math.floor(phase * 28) % 28;
    if (idx === _moonPhaseIndex || !_moonSprite) return;
    _moonPhaseIndex = idx;
    _moonTex.dispose?.();
    _moonTex = _makeMoonTex(idx / 28);
    _moonSprite.material.map = _moonTex;
    _moonSprite.material.needsUpdate = true;
  }

  // ── API ──────────────────────────────────────────────────────────────────────

  function buildWorld(scene) {
    _scene = scene;
    _skyRoot = new THREE.Group();
    _skyRoot.name = 'skyRoot';
    scene.background = new THREE.Color(0x5ab2d8);
    scene.fog = new THREE.Fog(0x5ab2d8, 95, 170);   // coupe alignée sur camera.far (175)

    scene.add(_skyRoot);
    _ambientLight = new THREE.AmbientLight(0xfff8e7, 0.65);
    scene.add(_ambientLight);

    // Lumière hémisphérique : donne une teinte ciel/sol pour rendre l'ambiance plus naturelle
    _hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2a4a18, 0.30);
    scene.add(_hemiLight);

    _sunLight = new THREE.DirectionalLight(0xfff5dd, 1.4);
    _sunLight.castShadow = true;
    _sunLight.shadow.mapSize.width  = 1024;
    _sunLight.shadow.mapSize.height = 1024;
    _sunLight.shadow.camera.near    = 1;
    _sunLight.shadow.camera.far     = 220;
    // Frustum d'ombre serré qui SUIT le joueur (voir setShadowCenter) → passe d'ombre
    // bien moins coûteuse (peu de casters) et ombres nettes partout sur la carte.
    _sunLight.shadow.camera.left    = -58;
    _sunLight.shadow.camera.right   = 58;
    _sunLight.shadow.camera.top     = 58;
    _sunLight.shadow.camera.bottom  = -58;
    _sunLight.shadow.bias           = -0.0004;
    _sunLight.shadow.normalBias     = 0.03;
    scene.add(_sunLight);
    scene.add(_sunLight.target);   // nécessaire pour orienter l'ombre vers le joueur

    _moonLight = new THREE.DirectionalLight(0x6677bb, 0);
    scene.add(_moonLight);

    _sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: _sunTex, color: 0xffffff, transparent: true, depthWrite: false, depthTest: true,
    }));
    _sunSprite.scale.set(18, 18, 1);
    _sunSprite.frustumCulled = false;
    _sunSprite.renderOrder = 0;
    scene.add(_sunSprite);

    _moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: _moonTex, color: 0xffffff, transparent: true, depthWrite: false, depthTest: true,
    }));
    _moonSprite.scale.set(12, 12, 1);
    _moonSprite.frustumCulled = false;
    _moonSprite.renderOrder = 0;
    scene.add(_moonSprite);
    spawnStars();
    spawnClouds();

    if (ZS.SpawnZone?.registerTerrain) ZS.SpawnZone.registerTerrain();
    if (ZS.Roads?.registerTerrain) ZS.Roads.registerTerrain();
    if (ZS.Buildings?.applyRoadFlattening) ZS.Buildings.applyRoadFlattening();
    buildTerrain(scene);
    const buildingColliders = ZS.Buildings.buildAll(scene);
    if (ZS.RoadNetwork?.buildMeshes) {
      ZS.BarrierPrefabs?.resetBarrierColliders?.();
      ZS.RoadNetwork.buildMeshes(scene, ZS.B.M);
    }
    for (const c of buildingColliders) _colliders.push(c);
    tickDayNight(0);
  }

  function setWorldTime(t) { _timeOfDay = t; }

  // Centre du frustum d'ombre (suit le joueur) — mis à jour depuis la boucle de jeu.
  let _shadowCX = 0, _shadowCZ = 0;
  function setShadowCenter(x, z) { _shadowCX = x; _shadowCZ = z; }
  const _skyDir = new THREE.Vector3();
  const _skyUp = new THREE.Vector3(0, 1, 0);
  const _skyRight = new THREE.Vector3();
  const _skyLocalDir = new THREE.Vector3();
  const _skyCamQuat = new THREE.Quaternion();
  const _skyRootQuat = new THREE.Quaternion();

  function tickDayNight(dt) {
    if (dt > 0) {
      _timeOfDay += dt / _DAY_LENGTH_SEC;
      if (_timeOfDay >= 1) {
        _timeOfDay -= 1;
        _dayCount++;
      }
    }
    const angle = _timeOfDay * Math.PI * 2;
    const sunY  = Math.sin(angle - Math.PI * 0.5);
    const sunX  = Math.cos(angle - Math.PI * 0.5);
    const phase = _moonPhase();
    const moonIllum = _moonIllumination(phase);
    const moonNight = Math.max(0, -sunY);
    const moonIntensity = moonNight * moonIllum * 0.85;
    const cam = ZS._camera;
    const skyAnchorY = cam?.position?.y ?? 24;
    const camFar = cam?.far ?? 175;
    const skySpriteRadius = Math.max(96, camFar - 22);
    const skyLightRadius = Math.max(skySpriteRadius + 10, camFar - 18);

    _skyRight.set(1, 0, 0);
    _skyDir.copy(_skyRight).multiplyScalar(sunX).addScaledVector(_skyUp, sunY).normalize();
    if (_skyRoot && cam) {
      if (_skyRoot.parent !== cam) cam.add(_skyRoot);
      _skyRoot.position.set(0, 0, 0);
      _skyRoot.quaternion.copy(_skyRootQuat.copy(cam.quaternion).invert());
    }

    // Soleil/lune positionnés autour du joueur pour que l'ombre serrée le suive.
    _sunLight.position.set(
      _shadowCX + _skyDir.x * skyLightRadius,
      skyAnchorY + _skyDir.y * skyLightRadius,
      _shadowCZ + _skyDir.z * skyLightRadius
    );
    if (_sunLight.target) _sunLight.target.position.set(_shadowCX, 0, _shadowCZ);
    _moonLight.position.set(
      _shadowCX - _skyDir.x * skyLightRadius,
      skyAnchorY - _skyDir.y * skyLightRadius,
      _shadowCZ - _skyDir.z * skyLightRadius
    );
    if (_sunSprite) {
      if (cam && _sunSprite.parent !== cam) cam.add(_sunSprite);
      _skyLocalDir.copy(_skyDir);
      if (cam) _skyLocalDir.applyQuaternion(_skyCamQuat.copy(cam.quaternion).invert());
      _sunSprite.position.copy(_skyLocalDir.multiplyScalar(skySpriteRadius));
      _sunSprite.visible = sunY > -0.02;
      _sunSprite.material.opacity = Math.max(0, Math.min(1, sunY * 1.2 + 0.2));
      _sunSprite.scale.setScalar(Math.max(18, skySpriteRadius * 0.11));
    }
    if (_moonSprite) {
      _ensureMoonPhaseTexture(phase);
      if (cam && _moonSprite.parent !== cam) cam.add(_moonSprite);
      _skyLocalDir.copy(_skyDir).multiplyScalar(-1);
      if (cam) _skyLocalDir.applyQuaternion(_skyCamQuat.copy(cam.quaternion).invert());
      _moonSprite.position.copy(_skyLocalDir.multiplyScalar(skySpriteRadius));
      _moonSprite.visible = sunY < 0.12;
      _moonSprite.material.opacity = Math.max(0.18, moonNight * (0.45 + moonIllum * 0.85));
      _moonSprite.scale.setScalar(Math.max(12, skySpriteRadius * 0.075));
    }
    if (_starField && _starMat) {
      _starField.visible = moonNight > 0.02;
      _starMat.opacity = Math.max(0, Math.min(0.95, moonNight * 1.15));
    }

    const k = _interpKey(sunY, _KEYS);
    _sunLight.intensity     = k.sunI;
    _moonLight.intensity    = moonIntensity;
    _ambientLight.intensity = k.ambI;
    _ambientLight.color.setHex(k.amb);
    _scene.background.setHex(k.sky);
    _scene.fog.color.setHex(k.sky);

    // Hémisphère : ciel = couleur actuelle du fond, sol = vert sombre constant
    _hemiLight.color.setHex(k.sky);
    _hemiLight.intensity = 0.06 + k.ambI * 0.22 + moonIntensity * 0.08;

    // Brouillard de nuit moins agressif
    const night = Math.max(0, Math.min(1, -sunY * 1.8));
    _scene.fog.near = 140 - night * 75;
    _scene.fog.far  = 420 - night * 200;

    // Eau : scintillement animé (intensité emissive ondulante)
    if (_waterMats.length > 0) {
      const wt  = Date.now() * 0.001;
      const rip = 0.14 + Math.sin(wt * 0.65) * 0.07 + Math.sin(wt * 1.38) * 0.04;
      const dBr = 0.35 + k.ambI * 0.65; // plus brillant de jour
      for (const m of _waterMats) m.emissiveIntensity = rip * dBr;
    }
    if (_waterSurfaces.length > 0) {
      const wt = Date.now() * 0.001;
      for (const ws of _waterSurfaces) {
        const pos = ws.mesh.geometry.attributes.position;
        const base = ws.base;
        for (let i = 0; i < pos.count; i++) {
          const bx = base[i * 3];
          const by = base[i * 3 + 1];
          const bz = base[i * 3 + 2];
          const wave =
            Math.sin(wt * ws.speed + bx * 0.09 + bz * 0.05) * ws.amp +
            Math.sin(wt * (ws.speed * 1.7) + bx * 0.16 - bz * 0.12) * (ws.amp * 0.45);
          pos.setY(i, by + wave);
        }
        pos.needsUpdate = true;
        ws.mesh.geometry.computeVertexNormals();
      }
    }

    // Nuages
    if (_clouds.length > 0 && _cloudMat) {
      if (dt > 0) {
        for (const c of _clouds) {
          c.azimuth += c.speed * dt;
        }
      }
      const cloudNightFade = Math.max(0.16, 1 - moonNight * 0.72);
      const cloudOpacity = 0.18 + (1 - moonNight) * 0.68;
      for (const c of _clouds) {
        const cosEl = Math.cos(c.elevation);
        c.sprite.position.set(
          Math.cos(c.azimuth) * cosEl * c.radius,
          Math.sin(c.elevation) * c.radius,
          Math.sin(c.azimuth) * cosEl * c.radius
        );
        c.sprite.scale.set(c.scale * (1.8 + Math.max(0, sunY) * 0.12), c.scale, 1);
      }
      // Couleur nuage interpolée
      const ck = _interpCloudKey(sunY);
      _cloudMat.color.setRGB(ck.r * cloudNightFade, ck.g * cloudNightFade, ck.b * cloudNightFade);
      _cloudMat.opacity = cloudOpacity;
      _cloudMat.emissiveIntensity = 0.02 + Math.max(0, -sunY) * 0.05;
    }

    if (_fireLights.length > 0) {
      const t = Date.now();
      const f = 0.82 + Math.sin(t * 0.011) * 0.09 + Math.sin(t * 0.019) * 0.06 + Math.sin(t * 0.034) * 0.04;
      const nightBoost = 0.4 + night * 1.1;
      for (const fl of _fireLights) {
        const base = fl.baseIntensity ?? 2.2;
        fl.light.intensity = f * base * nightBoost;
        if (fl.mesh) fl.mesh.scale.y = 0.85 + f * 0.22;
        if (fl.onTick) fl.onTick(t, f, night);
      }
    }
  }

  // ── Interpolations ────────────────────────────────────────────────────────────

  function _ss(t) { return t * t * (3 - 2 * t); } // smoothstep

  function _interpKey(sunY, keys) {
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (sunY >= a.t && sunY <= b.t) {
        const al = _ss((sunY - a.t) / (b.t - a.t));
        if (b.sky !== undefined) {
          _cA.setHex(a.sky); _cB.setHex(b.sky);
          const sky = _cA.lerp(_cB, al).getHex();
          _cA.setHex(a.amb); _cB.setHex(b.amb);
          const amb = _cA.lerp(_cB, al).getHex();
          return { sky, amb, ambI: a.ambI + (b.ambI - a.ambI) * al, sunI: Math.max(0, a.sunI + (b.sunI - a.sunI) * al) };
        }
      }
    }
    return keys[keys.length - 1];
  }

  function _interpCloudKey(sunY) {
    for (let i = 0; i < _CK.length - 1; i++) {
      const a = _CK[i], b = _CK[i + 1];
      if (sunY >= a.t && sunY <= b.t) {
        const al = _ss((sunY - a.t) / (b.t - a.t));
        return { r: a.r + (b.r - a.r) * al, g: a.g + (b.g - a.g) * al, b: a.b + (b.b - a.b) * al };
      }
    }
    return _CK[_CK.length - 1];
  }

  function spawnStars() {
    if (!_skyRoot) return;
    const count = 240;
    const radius = 168;
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const az = _rng() * Math.PI * 2;
      const el = 0.12 + _rng() * 0.78;
      const cosEl = Math.cos(el);
      pos[i * 3] = Math.cos(az) * cosEl * radius;
      pos[i * 3 + 1] = Math.sin(el) * radius;
      pos[i * 3 + 2] = Math.sin(az) * cosEl * radius;
      sizes[i] = 1 + _rng() * 1.8;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    _starMat = new THREE.PointsMaterial({
      map: _starTex,
      color: 0xeaf2ff,
      transparent: true,
      opacity: 0,
      size: 1.6,
      sizeAttenuation: true,
      depthWrite: false,
      depthTest: true,
      alphaTest: 0.08,
      blending: THREE.AdditiveBlending,
    });
    _starField = new THREE.Points(g, _starMat);
    _starField.frustumCulled = false;
    _skyRoot.add(_starField);
  }

  // ── Bruit pour le terrain ────────────────────────────────────────────────────

  function _tvh(x, z) { const n = Math.sin(x * 91.3 + z * 157.7) * 43758.5453; return n - Math.floor(n); }
  function _tvn(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
    const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    const lp = (a, b, t) => a + (b - a) * t;
    return lp(lp(_tvh(xi, zi), _tvh(xi+1, zi), ux), lp(_tvh(xi, zi+1), _tvh(xi+1, zi+1), ux), uz);
  }

  // ── Couleur terrain : hauteur + noise ────────────────────────────────────────

  function _terrainColor(x, z, h) {
    let base;
    if      (h < -4) base = 0x283c28;
    else if (h <  0) base = 0x325830;
    else if (h <  3) base = 0x3e6834;
    else if (h <  6) base = 0x4a7438;
    else if (h < 10) base = 0x5e7040;
    else if (h < 16) base = 0x7a7050;
    else             base = 0x888070;

    if (h >= 14) return base;

    const n1 = _tvn(x * 0.04, z * 0.04);
    const n2 = _tvn(x * 0.16, z * 0.16);
    const n3 = _tvn(x * 0.55, z * 0.55);
    const n  = n1 * 0.50 + n2 * 0.32 + n3 * 0.18;

    _cT.setHex(base);
    if (n > 0.70) {
      _cD.setHex(h < 4 ? 0x7a5530 : 0x8a6840); _cT.lerp(_cD, 0.55); // terre nue
    } else if (n > 0.60) {
      _cD.setHex(0x8c8838); _cT.lerp(_cD, 0.36); // herbe sèche
    } else if (n < 0.20) {
      _cD.setHex(0x285a28); _cT.lerp(_cD, 0.34); // mousse sombre
    } else if (n > 0.48 && n3 < 0.28 && h < 5) {
      _cD.setHex(0x9aaa3a); _cT.lerp(_cD, 0.18); // patch fleurs
    }
    return _cT.getHex();
  }

  function _terrainTint(x, z, h, slope, useDirt) {
    if (useDirt) {
      _cT.setHex(h > 13 ? 0x817760 : 0x7c5e38);
      if (slope > 0.6) {
        _cD.setHex(0x4b3724); _cT.lerp(_cD, Math.min(0.34, slope * 0.28));
      } else if (_tvn(x * 0.18, z * 0.18) < 0.28) {
        _cD.setHex(0x9f7c4b); _cT.lerp(_cD, 0.16);
      }
      return _cT.getHex();
    }

    _cT.setHex(_terrainColor(x, z, h));
    if (_tvn(x * 0.25, z * 0.25) > 0.7) {
      _cD.setHex(0x70953f); _cT.lerp(_cD, 0.18);
    } else if (_tvn(x * 0.22 + 13, z * 0.22 - 7) < 0.2) {
      _cD.setHex(0x2d602c); _cT.lerp(_cD, 0.22);
    }
    return _cT.getHex();
  }

  function buildTerrain(scene) {
    const SIZE = 600, SEG = 144;
    const geo  = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG).toNonIndexed();
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const uvs  = new Float32Array(pos.count * 2);
    const cols = new Float32Array(pos.count * 3);
    const col  = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i), vz = pos.getZ(i);
      let h = ZS.getTerrainHeight(vx, vz);
      if (ZS.isInClearingDisc?.(vx, vz, 0.12)) h -= 0.14;
      pos.setY(i, h);
    }

    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const ab = new THREE.Vector3(), ac = new THREE.Vector3(), nrm = new THREE.Vector3();
    const tileScale = 6.0;
    const frac = v => v - Math.floor(v);

    for (let i = 0; i < pos.count; i += 3) {
      a.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      b.set(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
      c.set(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      nrm.crossVectors(ab, ac).normalize();

      const slope = 1 - Math.max(0, nrm.y);
      const avgH = (a.y + b.y + c.y) / 3;
      const cx = (a.x + b.x + c.x) / 3, cz = (a.z + b.z + c.z) / 3;
      const inRiver = ZS.isInRiverChannel?.(cx, cz, 0) ?? false;
      const inClearing = ZS.isInClearingDisc?.(cx, cz, 0.25) ?? false;
      const onRoad  = ZS.isInRoadCorridor?.(cx, cz, 0.8) ?? ZS.isNearRoad?.(cx, cz, 1.2) ?? false;
      const useDirt = inRiver || onRoad || inClearing || slope > 0.22 || avgH > 13.5;
      const uBase = useDirt ? 0.52 : 0.02;
      const uSpan = 0.46;

      for (let k = 0; k < 3; k++) {
        const idx = i + k;
        const vx = pos.getX(idx), vy = pos.getY(idx), vz = pos.getZ(idx);
        uvs[idx * 2] = uBase + frac((vx + 300) / tileScale) * uSpan;
        uvs[idx * 2 + 1] = frac((vz + 300) / tileScale);
        col.setHex(_terrainTint(vx, vz, vy, slope, useDirt));
        cols[idx * 3] = col.r; cols[idx * 3 + 1] = col.g; cols[idx * 3 + 2] = col.b;
      }
    }

    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
      map: _terrainTex,
      vertexColors: true,
      flatShading: true,
    }));
    mesh.receiveShadow = true;
    scene.add(mesh);
    _terrainMesh = mesh;
  }

  // ── PRNG déterministe ────────────────────────────────────────────────────────

  function _makeRng(seed) {
    let s = seed >>> 0;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
  }
  const _rng = _makeRng(0xDEADBEEF);

  // ── Fleurs ───────────────────────────────────────────────────────────────────

  function spawnFlowers(scene, count) {
    const petalGeo = new THREE.CylinderGeometry(1, 0.6, 0.04, 6);
    const stemGeo  = new THREE.CylinderGeometry(0.015, 0.020, 1, 4);
    const stemMat  = new THREE.MeshLambertMaterial({ color: 0x2e5e1e });
    const petalColors = [0xffee22, 0xffffff, 0xcc44bb, 0xff9922, 0xaaddff, 0xffbbaa];
    const perColor = petalColors.map(() => []);
    const stems    = [];

    for (let i = 0; i < count; i++) {
      const x = (_rng() - 0.5) * 540, z = (_rng() - 0.5) * 540;
      if (x > -262 && x < -100 && z > -55 && z < 58) continue;
      if (_blockedSpawn(x, z)) continue;
      const by = ZS.getTerrainHeight(x, z);
      if (by > 9) continue;
      const h    = 0.16 + _rng() * 0.14;
      const r    = 0.08 + _rng() * 0.06;
      const ci   = Math.floor(_rng() * petalColors.length);
      const rotY = _rng() * Math.PI;
      perColor[ci].push({ x, y: by + h + 0.02, z, rotY, r });
      stems.push({ x, y: by + h * 0.5, z, h });
    }

    const dummy = new THREE.Object3D();
    for (let ci = 0; ci < petalColors.length; ci++) {
      const pts = perColor[ci];
      if (!pts.length) continue;
      const im = new THREE.InstancedMesh(petalGeo,
        new THREE.MeshLambertMaterial({ color: petalColors[ci] }), pts.length);
      im.castShadow = false;
      for (let k = 0; k < pts.length; k++) {
        const p = pts[k];
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.rotY, 0);
        dummy.scale.set(p.r, 1, p.r);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }
    if (stems.length > 0) {
      const sm = new THREE.InstancedMesh(stemGeo, stemMat, stems.length);
      sm.castShadow = false;
      for (let k = 0; k < stems.length; k++) {
        const s = stems[k];
        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, s.h, 1);
        dummy.updateMatrix();
        sm.setMatrixAt(k, dummy.matrix);
      }
      sm.instanceMatrix.needsUpdate = true;
      scene.add(sm);
    }
  }

  // ── Touffes d'herbe ───────────────────────────────────────────────────────────

  function spawnGrassTufts(scene, count) {
    const bladeGeo = new THREE.PlaneGeometry(1, 1);
    const mats = [0x4f8b36, 0x5f9a3f, 0x719f42, 0x456f2f, 0x82aa4b]
      .map(c => new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
    const perMat = mats.map(() => []);

    for (let i = 0; i < count; i++) {
      const x = (_rng() - 0.5) * 540, z = (_rng() - 0.5) * 540;
      if (x > -262 && x < -100 && z > -55 && z < 58) continue;
      if (_blockedSpawn(x, z)) continue;
      const by = ZS.getTerrainHeight(x, z);
      if (by > 10) continue;
      const mi = Math.floor(_rng() * mats.length);
      const bw = 0.018 + _rng() * 0.02;
      const h = 0.34 + _rng() * 0.34;
      const blades = 5 + Math.floor(_rng() * 5);
      for (let q = 0; q < blades; q++) {
        const ay   = _rng() * Math.PI * 2;
        const tilt = (_rng() - 0.5) * 0.05;
        const ox   = (_rng() - 0.5) * 0.22, oz = (_rng() - 0.5) * 0.22;
        const hh   = h * (0.72 + _rng() * 0.5);
        const ww   = bw * (0.85 + _rng() * 0.55);
        perMat[mi].push({ x: x + ox, y: by + hh * 0.5, z: z + oz, bw: ww, h: hh, ay, tilt });
      }
    }

    const dummy = new THREE.Object3D();
    for (let mi = 0; mi < mats.length; mi++) {
      const blades = perMat[mi];
      if (!blades.length) continue;
      const im = new THREE.InstancedMesh(bladeGeo, mats[mi], blades.length);
      im.castShadow = false;
      for (let k = 0; k < blades.length; k++) {
        const b = blades[k];
        dummy.position.set(b.x, b.y, b.z);
        dummy.rotation.set(0, b.ay, b.tilt);
        dummy.scale.set(b.bw, b.h, 1);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }
  }

  // ── Nuages réalistes ──────────────────────────────────────────────────────────

  function spawnClouds() {
    if (!_skyRoot) return;
    _cloudTex = _cloudBaseTex.clone();
    _cloudTex.needsUpdate = true;
    _cloudMat = new THREE.SpriteMaterial({
      map: _cloudTex,
      color: 0xf0f0ee,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      depthTest: true,
    });

    for (let i = 0; i < 16; i++) {
      const sprite = new THREE.Sprite(_cloudMat);
      const az0 = _rng() * Math.PI * 2;
      const el = 0.34 + _rng() * 0.20;
      const rad = 150 + _rng() * 14;
      const scale = 34 + _rng() * 28;
      sprite.frustumCulled = false;
      sprite.scale.set(scale * (1.55 + _rng() * 0.45), scale, 1);
      _skyRoot.add(sprite);
      _clouds.push({ sprite, azimuth: az0, elevation: el, radius: rad, speed: 0.006 + _rng() * 0.008, scale });
    }
  }

  // ── Arbres améliorés ─────────────────────────────────────────────────────────

  const TREE_WOOD_MAX = {
    tree_oak: 8, tree_pine: 10, tree_birch: 6, tree_dead: 3,
  };
  const TREE_FALL_LINGER_MS = 90_000;
  const TREE_FALL_ANIM_SEC = 1.15;

  // Registre des arbres abattables (récolte progressive de bois).
  const _trees = [];

  function _woodMaxFor(prefabId) {
    return TREE_WOOD_MAX[prefabId] ?? 6;
  }

  function _findTreeByDecorId(decorId) {
    if (!decorId) return null;
    return _trees.find((t) => t.decorId === decorId) || null;
  }

  function _treeGrowthScale(phase) {
    return ZS.TreeGrowth?.getScale?.(phase) ?? 1;
  }

  function _updateTreeColliders(tree) {
    if (!tree?.decorId || !ZS.buildDecorColliders) return;
    const spec = tree.group?.userData?.decorSpec;
    if (!spec) return;
    const growthScale = _treeGrowthScale(tree.growthPhase ?? 4);
    const effectiveScale = (tree.baseScale || spec.scale || 1) * growthScale;
    ZS.registerDecorColliders(
      tree.decorId,
      ZS.buildDecorColliders({ ...spec, scale: effectiveScale }),
    );
    ZS.Network?.syncWorldColliders?.();
  }

  function _updateTreeVisual(tree) {
    if (!tree?.group) return;
    const growthScale = _treeGrowthScale(tree.growthPhase ?? 4);
    tree.group.scale.setScalar((tree.baseScale || 1) * growthScale);
    _updateTreeColliders(tree);
  }

  function _registerTree(scene, group, x, z, collider, decorId, opts = {}) {
    const prefabId = opts.prefabId || group.userData.prefabId || 'tree_oak';
    const growthPhase = Number.isFinite(opts.growthPhase) ? opts.growthPhase : 4;
    const baseScale = Number.isFinite(opts.baseScale) ? opts.baseScale : (group.scale.x || 1);
    const woodMax = opts.woodMax
      ?? (ZS.TreeGrowth?.getWoodMax?.(prefabId, growthPhase) ?? _woodMaxFor(prefabId));
    const woodRemaining = Number.isFinite(opts.woodRemaining) ? opts.woodRemaining : woodMax;
    const tree = {
      scene, group, x, z, collider, decorId: decorId || null,
      prefabId, woodMax, woodRemaining, growthPhase, baseScale,
      state: 'standing',
      shakeT: 0,
      fallAnim: null,
      fallTimer: null,
    };
    _trees.push(tree);
    _updateTreeVisual(tree);
    return tree;
  }

  function registerChoppableTree(scene, group, x, z, decorId, opts = {}) {
    if (opts.baseScale == null) opts.baseScale = group.scale.x || 1;
    return _registerTree(scene, group, x, z, { decorId }, decorId, opts);
  }

  function removeChoppableTree(decorId) {
    const idx = _trees.findIndex((t) => t.decorId === decorId);
    if (idx < 0) return;
    const t = _trees[idx];
    if (t.fallTimer) clearTimeout(t.fallTimer);
    t.state = 'gone';
    _trees.splice(idx, 1);
  }

  function _shakeTree(tree) {
    tree.shakeT = 0.12;
  }

  function _startTreeFall(tree, dirX, dirZ) {
    if (!tree || tree.state !== 'standing') return;
    tree.state = 'falling';
    const len = Math.hypot(dirX, dirZ) || 1;
    const fallYaw = Math.atan2(dirX / len, dirZ / len);
    tree.group.rotation.order = 'YXZ';
    tree.fallAnim = {
      t: 0,
      dur: TREE_FALL_ANIM_SEC,
      fallYaw,
      impactPlayed: false,
    };
    if (tree.decorId) ZS.removeDecorColliders?.(tree.decorId);
    if (tree.fallTimer) clearTimeout(tree.fallTimer);
    tree.fallTimer = setTimeout(() => {
      if (tree.scene && tree.group?.parent) tree.scene.remove(tree.group);
      const idx = _trees.indexOf(tree);
      if (idx >= 0) _trees.splice(idx, 1);
    }, TREE_FALL_LINGER_MS);
  }

  function applyRemoteTreeChop(decorId, woodRemaining, woodMax) {
    const tree = _findTreeByDecorId(decorId);
    if (!tree || tree.state !== 'standing') return;
    if (Number.isFinite(woodMax)) tree.woodMax = woodMax;
    if (Number.isFinite(woodRemaining)) tree.woodRemaining = woodRemaining;
    _shakeTree(tree);
  }

  function applyRemoteTreeGrow(decorId, data = {}) {
    const tree = _findTreeByDecorId(decorId);
    if (!tree || tree.state !== 'standing') return;
    if (Number.isFinite(data.growthPhase)) tree.growthPhase = data.growthPhase;
    if (Number.isFinite(data.woodMax)) tree.woodMax = data.woodMax;
    if (Number.isFinite(data.woodRemaining)) tree.woodRemaining = data.woodRemaining;
    _updateTreeVisual(tree);
  }

  function _treeHitRadius(tree) {
    return 0.4 + 1.1 * _treeGrowthScale(tree.growthPhase ?? 4);
  }

  function applyRemoteTreeFell(decorId, dirX, dirZ) {
    const tree = _findTreeByDecorId(decorId);
    if (!tree || tree.state !== 'standing') return;
    _startTreeFall(tree, dirX, dirZ);
  }

  function tickTreeFalls(dt) {
    for (const tree of _trees) {
      if (tree.shakeT > 0) {
        tree.shakeT = Math.max(0, tree.shakeT - dt);
        const s = tree.shakeT > 0 ? (Math.random() - 0.5) * 0.06 * (tree.shakeT / 0.12) : 0;
        tree.group.position.x = tree.x + s;
      }
      if (tree.state !== 'falling' || !tree.fallAnim) continue;
      tree.fallAnim.t += dt;
      const p = Math.min(1, tree.fallAnim.t / tree.fallAnim.dur);
      const ease = p * p;
      tree.group.rotation.y = tree.fallAnim.fallYaw;
      tree.group.rotation.x = ease * (Math.PI * 0.46);
      if (p >= 1 && !tree.fallAnim.impactPlayed) {
        tree.fallAnim.impactPlayed = true;
        ZS.Audio?.treeFall?.(0.9);
      }
    }
  }

  // Coupe l'arbre le plus proche devant (ox,oz) — extrait du bois à chaque coup.
  function chopTree(ox, oz, dirX, dirZ, range, woodYield) {
    const len = Math.hypot(dirX, dirZ) || 1;
    const nx = dirX / len, nz = dirZ / len;
    let best = null, bestT = Infinity;
    for (const t of _trees) {
      if (t.state !== 'standing') continue;
      const proj = (t.x - ox) * nx + (t.z - oz) * nz;
      if (proj < 0 || proj > range) continue;
      const perp = Math.hypot(ox + nx * proj - t.x, oz + nz * proj - t.z);
      if (perp < _treeHitRadius(t) && proj < bestT) { bestT = proj; best = t; }
    }
    if (!best) return null;
    const yieldAmt = Math.max(1, woodYield || 1);
    const woodTaken = Math.min(yieldAmt, best.woodRemaining);
    best.woodRemaining -= woodTaken;
    _shakeTree(best);
    const felled = best.woodRemaining <= 0;
    if (felled) _startTreeFall(best, dirX, dirZ);
    return {
      hit: true,
      felled,
      woodTaken,
      woodRemaining: best.woodRemaining,
      x: best.x,
      z: best.z,
      decorId: best.decorId || null,
    };
  }

  // ── Rochers minables (récolte progressive de pierre) ───────────────────────

  const ROCK_STONE_MAX = {
    rock_boulder: 20, rock_outcrop: 14, spawn_stone: 8,
  };

  const _rocks = [];

  function _stoneMaxFor(prefabId) {
    return ROCK_STONE_MAX[prefabId] ?? 10;
  }

  function _findRockByDecorId(decorId) {
    if (!decorId) return null;
    return _rocks.find((r) => r.decorId === decorId) || null;
  }

  function _rockHarvestRatio(rock) {
    return rock.stoneMax > 0 ? rock.stoneRemaining / rock.stoneMax : 0;
  }

  function _rockVisualScale(ratio) {
    return 0.22 + 0.78 * ratio;
  }

  function _updateRockColliders(rock) {
    if (!rock?.decorId || !ZS.buildDecorColliders) return;
    const spec = rock.group?.userData?.decorSpec;
    if (!spec) return;
    const visualScale = _rockVisualScale(_rockHarvestRatio(rock));
    const effectiveScale = (rock.baseScale || spec.scale || 1) * visualScale;
    ZS.registerDecorColliders(
      rock.decorId,
      ZS.buildDecorColliders({ ...spec, scale: effectiveScale }),
    );
    ZS.Network?.syncWorldColliders?.();
  }

  function _updateRockVisual(rock) {
    const visualScale = _rockVisualScale(_rockHarvestRatio(rock));
    const vis = rock.group.userData.boulderVisual;
    if (vis) {
      vis.scale.setScalar(visualScale);
    } else {
      rock.group.scale.setScalar(rock.baseScale * visualScale);
    }
    _updateRockColliders(rock);
  }

  function _rockHitRadius(rock) {
    return 0.35 + 1.15 * _rockVisualScale(_rockHarvestRatio(rock));
  }

  function _registerRock(scene, group, x, z, decorId, opts = {}) {
    const prefabId = opts.prefabId || group.userData.prefabId || 'rock_boulder';
    const stoneMax = opts.stoneMax ?? _stoneMaxFor(prefabId);
    const stoneRemaining = Number.isFinite(opts.stoneRemaining) ? opts.stoneRemaining : stoneMax;
    const baseScale = Number.isFinite(opts.baseScale) ? opts.baseScale : (group.scale.x || 1);
    const rock = {
      scene, group, x, z, decorId: decorId || null,
      prefabId, stoneMax, stoneRemaining, baseScale,
      state: 'active',
      shakeT: 0,
    };
    _rocks.push(rock);
    _updateRockVisual(rock);
    return rock;
  }

  function registerMinableRock(scene, group, x, z, decorId, opts = {}) {
    return _registerRock(scene, group, x, z, decorId, opts);
  }

  function removeMinableRock(decorId) {
    const idx = _rocks.findIndex((r) => r.decorId === decorId);
    if (idx < 0) return;
    _rocks[idx].state = 'gone';
    _rocks.splice(idx, 1);
  }

  function _shakeRock(rock) {
    rock.shakeT = 0.1;
  }

  function _depleteRock(rock) {
    if (!rock || rock.state !== 'active') return;
    rock.state = 'depleted';
    rock.stoneRemaining = 0;
    _updateRockVisual(rock);
    if (rock.decorId) ZS.removeDecorColliders?.(rock.decorId);
    setTimeout(() => {
      if (rock.scene && rock.group?.parent) rock.scene.remove(rock.group);
      const idx = _rocks.indexOf(rock);
      if (idx >= 0) _rocks.splice(idx, 1);
    }, 350);
  }

  function applyRemoteRockMine(decorId, stoneRemaining) {
    const rock = _findRockByDecorId(decorId);
    if (!rock || rock.state !== 'active') return;
    if (Number.isFinite(stoneRemaining)) rock.stoneRemaining = stoneRemaining;
    _updateRockVisual(rock);
    _shakeRock(rock);
  }

  function applyRemoteRockDepleted(decorId) {
    const rock = _findRockByDecorId(decorId);
    if (!rock || rock.state !== 'active') return;
    _depleteRock(rock);
  }

  function tickRockMines(dt) {
    for (const rock of _rocks) {
      if (rock.shakeT > 0) {
        rock.shakeT = Math.max(0, rock.shakeT - dt);
        const s = rock.shakeT > 0 ? (Math.random() - 0.5) * 0.05 * (rock.shakeT / 0.1) : 0;
        rock.group.position.x = rock.x + s;
      }
    }
  }

  function mineRock(ox, oz, dirX, dirZ, range, stoneYield) {
    const len = Math.hypot(dirX, dirZ) || 1;
    const nx = dirX / len, nz = dirZ / len;
    let best = null, bestT = Infinity;
    for (const r of _rocks) {
      if (r.state !== 'active') continue;
      const proj = (r.x - ox) * nx + (r.z - oz) * nz;
      if (proj < 0 || proj > range) continue;
      const perp = Math.hypot(ox + nx * proj - r.x, oz + nz * proj - r.z);
      if (perp < _rockHitRadius(r) && proj < bestT) { bestT = proj; best = r; }
    }
    if (!best) return null;
    const yieldAmt = Math.max(1, stoneYield || 1);
    const stoneTaken = Math.min(yieldAmt, best.stoneRemaining);
    best.stoneRemaining -= stoneTaken;
    _shakeRock(best);
    _updateRockVisual(best);
    const depleted = best.stoneRemaining <= 0;
    if (depleted) _depleteRock(best);
    return {
      hit: true,
      depleted,
      stoneTaken,
      stoneRemaining: best.stoneRemaining,
      x: best.x,
      z: best.z,
      decorId: best.decorId || null,
    };
  }

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

  function registerBillboards(meshes) {
    for (const m of meshes) if (m) _billboards.push(m);
  }

  function updateBillboards(camX, camZ) {
    for (const m of _billboards) {
      if (!m.parent) continue;
      m.getWorldPosition(_billboardVec);
      // Plans verticaux face à la caméra (flammes, fumée)
      m.rotation.set(0, Math.atan2(camX - _billboardVec.x, camZ - _billboardVec.z), 0);
    }
  }

  function registerFireLight(light, mesh, opts) {
    _fireLights.push({
      light,
      mesh: mesh || null,
      baseIntensity: opts?.baseIntensity,
      onTick: opts?.onTick || null,
    });
  }
  function registerWaterMaterial(mat)     { _waterMats.push(mat); }
  function registerWaterSurface(mesh, amp, speed) {
    const arr = mesh.geometry.attributes.position.array;
    _waterSurfaces.push({
      mesh,
      base: new Float32Array(arr),
      amp: amp || 0.08,
      speed: speed || 1.2,
    });
  }

  // ── Zones d'eau (rivière) ────────────────────────────────────────────────────
  const _waterZones = []; // { x, z, r, y }

  function registerWaterZone(x, z, r, y) { _waterZones.push({ x, z, r, y }); }

  function getWaterSurface(px, pz) {
    let bestY = null, bestDist = Infinity;
    for (const wz of _waterZones) {
      const d = Math.hypot(px - wz.x, pz - wz.z);
      if (d < wz.r && d < bestDist) { bestDist = d; bestY = wz.y; }
    }
    return bestY;
  }

  function isInWaterZone(px, pz) {
    return _waterZones.some(wz => Math.hypot(px - wz.x, pz - wz.z) < wz.r);
  }
  function getWaterZones() { return _waterZones.slice(); }

  window.ZS = window.ZS || {};
  ZS.buildWorld        = buildWorld;
  ZS.tickDayNight      = tickDayNight;
  ZS.setWorldTime      = setWorldTime;
  ZS.setShadowCenter   = setShadowCenter;
  function registerDecorColliders(id, colliders) {
    if (!id) return;
    if (!colliders || !colliders.length) {
      _decorColliders.delete(id);
      return;
    }
    _decorColliders.set(id, colliders);
  }

  function removeDecorColliders(id) {
    if (id) _decorColliders.delete(id);
  }

  function clearDecorColliders() {
    _decorColliders.clear();
  }

  function getColliders() {
    const out = _colliders.slice();
    const barriers = ZS.getBarrierColliders?.();
    if (barriers?.length) out.push(...barriers);
    if (!_decorColliders.size) return out;
    for (const cols of _decorColliders.values()) {
      for (const c of cols) out.push(c);
    }
    return out;
  }

  // Hauteur max montable d'un bond (JUMP_V=8, GRAVITY=22 → ~1.45 m)
  const MAX_STAND_STEP = 1.55;
  const _dcE = new THREE.Euler(0, 0, 0, 'XYZ');
  const _dcQ = new THREE.Quaternion();
  const _dcV = new THREE.Vector3();

  /** Monde → espace local décor (rotY + rotZ inclinaison épaves). */
  function decorWorldToLocal(px, py, pz, col) {
    _dcV.set(px - col.cx, py - (col.baseY ?? 0), pz - col.cz);
    if (col.rotX || col.rotZ) {
      _dcE.set(col.rotX || 0, col.rotY || 0, col.rotZ || 0);
      _dcQ.setFromEuler(_dcE).invert();
      _dcV.applyQuaternion(_dcQ);
    } else if (col.rotY) {
      const c = Math.cos(-col.rotY);
      const s = Math.sin(-col.rotY);
      const x = _dcV.x;
      const z = _dcV.z;
      _dcV.x = x * c - z * s;
      _dcV.z = x * s + z * c;
    }
    return { lx: _dcV.x, ly: _dcV.y, lz: _dcV.z };
  }

  function decorLocalToWorld(lx, ly, lz, col) {
    _dcV.set(lx, ly, lz);
    if (col.rotX || col.rotZ) {
      _dcE.set(col.rotX || 0, col.rotY || 0, col.rotZ || 0);
      _dcQ.setFromEuler(_dcE);
      _dcV.applyQuaternion(_dcQ);
    } else if (col.rotY) {
      const c = Math.cos(col.rotY);
      const s = Math.sin(col.rotY);
      const x = _dcV.x;
      const z = _dcV.z;
      _dcV.x = x * c - z * s;
      _dcV.z = x * s + z * c;
    }
    return { x: col.cx + _dcV.x, z: col.cz + _dcV.z };
  }

  function overBoxFootprint(px, pz, margin, col) {
    const { lx, lz } = decorWorldToLocal(px, col.baseY ?? 0, pz, col);
    const bx = lx - (col.lx || 0);
    const bz = lz - (col.lz || 0);
    return Math.abs(bx) <= col.hw + margin && Math.abs(bz) <= col.hd + margin;
  }

  function resolveDecorBoxCollision(col, px, pz, feetY, playerR) {
    if (col.maxY !== undefined && feetY >= col.maxY - 0.05) return null;
    if (col.decorId && col.baseY != null && feetY < col.baseY - 0.35) return null;
    if (col.minY !== undefined && feetY < col.minY - 0.05) return null;

    const local = decorWorldToLocal(px, feetY, pz, col);
    const bx = local.lx - (col.lx || 0);
    const bz = local.lz - (col.lz || 0);
    const clampBX = Math.max(-col.hw, Math.min(col.hw, bx));
    const clampBZ = Math.max(-col.hd, Math.min(col.hd, bz));
    const wdx = bx - clampBX;
    const wdz = bz - clampBZ;
    const dist = Math.hypot(wdx, wdz);
    if (dist >= playerR) return null;
    if (dist <= 0.001) {
      const penX = (col.hw + playerR) - Math.abs(bx);
      const penZ = (col.hd + playerR) - Math.abs(bz);
      if (penX < penZ) {
        const sx = bx < 0 ? -1 : 1;
        return decorLocalToWorld((col.lx || 0) + sx * (col.hw + playerR), local.ly, local.lz, col);
      }
      const sz = bz < 0 ? -1 : 1;
      return decorLocalToWorld(local.lx, local.ly, (col.lz || 0) + sz * (col.hd + playerR), col);
    }

    const pen = playerR - dist;
    const outLX = bx + (wdx / dist) * pen + (col.lx || 0);
    const outLZ = bz + (wdz / dist) * pen + (col.lz || 0);
    return decorLocalToWorld(outLX, local.ly, outLZ, col);
  }

  function _distPointToSegment(px, pz, x0, z0, x1, z1) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-8) return { dist: Math.hypot(px - x0, pz - z0), cx: x0, cz: z0, ux: 0, uz: 1 };
    const t = Math.max(0, Math.min(1, ((px - x0) * dx + (pz - z0) * dz) / len2));
    const cx = x0 + dx * t;
    const cz = z0 + dz * t;
    const dist = Math.hypot(px - cx, pz - cz);
    const len = Math.sqrt(len2);
    return { dist, cx, cz, ux: dx / len, uz: dz / len };
  }

  function resolveDecorSegmentCollision(col, px, pz, feetY, playerR) {
    if (col.maxY !== undefined && feetY >= col.maxY - 0.05) return null;
    if (col.baseY != null && feetY < col.baseY - 0.35) return null;
    const hit = _distPointToSegment(px, pz, col.x0, col.z0, col.x1, col.z1);
    const min = playerR + (col.r || 0.1);
    if (hit.dist >= min) return null;
    if (hit.dist < 0.001) {
      return { x: px + hit.ux * min, z: pz + hit.uz * min };
    }
    const scale = min / hit.dist;
    return { x: hit.cx + (px - hit.cx) * scale, z: hit.cz + (pz - hit.cz) * scale };
  }

  function overSegmentFootprint(px, pz, margin, col) {
    const hit = _distPointToSegment(px, pz, col.x0, col.z0, col.x1, col.z1);
    return hit.dist <= (col.r || 0.1) + margin;
  }

  function overColliderFootprint(px, pz, margin, col) {
    if (col.type === 'seg') return overSegmentFootprint(px, pz, margin, col);
    if (col.type === 'box' || col.cx !== undefined) {
      if (col.lx != null || col.rotX || col.rotZ) return overBoxFootprint(px, pz, margin, col);
      const dx = px - col.cx;
      const dz = pz - col.cz;
      let lx, lz;
      if (col.rotY) {
        const c = Math.cos(-col.rotY);
        const s = Math.sin(-col.rotY);
        lx = dx * c - dz * s;
        lz = dx * s + dz * c;
      } else {
        lx = dx;
        lz = dz;
      }
      return Math.abs(lx) <= col.hw + margin && Math.abs(lz) <= col.hd + margin;
    }
    return Math.hypot(px - col.x, pz - col.z) <= (col.r || 0) + margin;
  }

  function decorStandTop(col) {
    if (!col?.decorId) return null;
    return col.maxY ?? col.topY ?? null;
  }

  /** Sol sous les pieds : terrain + étages + dessus des décors (caisses, souches…). */
  function getStandHeight(x, z, playerEyeY) {
    let best = ZS.getEffectiveFloorHeight(x, z, playerEyeY);
    const baseFloor = best;

    for (const col of getColliders()) {
      const top = decorStandTop(col);
      if (top == null) continue;
      if (!overColliderFootprint(x, z, 0.02, col)) continue;
      if (top - baseFloor > MAX_STAND_STEP) continue;
      if (top <= playerEyeY - 0.45 && top > best) best = top;
    }
    return best;
  }

  function shouldSkipDecorSideCollision(col, feetY, eyeY, velY, px, pz, margin) {
    const top = decorStandTop(col);
    if (top == null) return false;
    if (!overColliderFootprint(px, pz, margin, col)) return false;
    if (feetY >= top - 0.08) return true;
    if (velY <= 0 && eyeY >= top + 1.7 - 0.35) return true;
    return false;
  }

  ZS.getColliders           = getColliders;
  ZS.getBarrierColliders     = () => (ZS.BarrierPrefabs?.getBarrierColliders?.() || []);
  ZS.registerDecorColliders = registerDecorColliders;
  ZS.removeDecorColliders   = removeDecorColliders;
  ZS.clearDecorColliders    = clearDecorColliders;
  ZS.getStandHeight         = getStandHeight;
  ZS.overColliderFootprint  = overColliderFootprint;
  ZS.shouldSkipDecorSideCollision = shouldSkipDecorSideCollision;
  ZS.resolveDecorBoxCollision = resolveDecorBoxCollision;
  ZS.resolveDecorSegmentCollision = resolveDecorSegmentCollision;
  ZS.decorWorldToLocal      = decorWorldToLocal;
  ZS.chopTree              = chopTree;
  ZS.registerChoppableTree = registerChoppableTree;
  ZS.removeChoppableTree   = removeChoppableTree;
  ZS.applyRemoteTreeChop   = applyRemoteTreeChop;
  ZS.applyRemoteTreeGrow   = applyRemoteTreeGrow;
  ZS.applyRemoteTreeFell   = applyRemoteTreeFell;
  ZS.tickTreeFalls         = tickTreeFalls;
  ZS.mineRock              = mineRock;
  ZS.registerMinableRock   = registerMinableRock;
  ZS.removeMinableRock     = removeMinableRock;
  ZS.applyRemoteRockMine   = applyRemoteRockMine;
  ZS.applyRemoteRockDepleted = applyRemoteRockDepleted;
  ZS.tickRockMines         = tickRockMines;
  ZS.registerFireLight     = registerFireLight;
  ZS.registerBillboards    = registerBillboards;
  ZS.updateBillboards      = updateBillboards;
  ZS.registerWaterMaterial = registerWaterMaterial;
  ZS.registerWaterSurface  = registerWaterSurface;
  ZS.registerWaterZone     = registerWaterZone;
  ZS.getWaterSurface       = getWaterSurface;
  ZS.isInWaterZone         = isInWaterZone;
  ZS.getWaterZones         = getWaterZones;
  ZS.spawnTreesAt      = spawnTreesAt;
  ZS.spawnDeadTreesAt  = spawnDeadTreesAt;
  ZS.makeTree          = makeTree;
  ZS.makePineTree      = makePineTree;
  ZS.makeBirchTree     = makeBirchTree;
  ZS.makeDeadTree      = makeDeadTree;
}());
