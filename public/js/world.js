// World: terrain, végétation, lumières, ciel + cycle jour/nuit
(function () {
  'use strict';

  let _scene, _ambientLight, _sunLight, _moonLight, _hemiLight;
  const _fireLights = [];
  const _waterMats  = []; // matériaux de surface d'eau → animés chaque frame
  const _colliders  = [];
  const _clouds     = [];
  let   _cloudMat   = null;
  let   _timeOfDay  = 0.3;

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

  // ── API ──────────────────────────────────────────────────────────────────────

  function buildWorld(scene) {
    _scene = scene;
    scene.background = new THREE.Color(0x5ab2d8);
    scene.fog = new THREE.Fog(0x5ab2d8, 95, 170);   // coupe alignée sur camera.far (175)

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

    buildTerrain(scene);
    spawnFlowers(scene, 200);
    spawnGrassTufts(scene, 220);
    spawnTrees(scene, 130);
    spawnRocks(scene, 50);
    spawnBushes(scene, 90);
    spawnClouds(scene);

    const buildingColliders = ZS.Buildings.buildAll(scene);
    for (const c of buildingColliders) _colliders.push(c);
    tickDayNight(0);
  }

  function setWorldTime(t) { _timeOfDay = t; }

  // Centre du frustum d'ombre (suit le joueur) — mis à jour depuis la boucle de jeu.
  let _shadowCX = 0, _shadowCZ = 0;
  function setShadowCenter(x, z) { _shadowCX = x; _shadowCZ = z; }

  function tickDayNight(dt) {
    const angle = _timeOfDay * Math.PI * 2;
    const sunY  = Math.sin(angle - Math.PI * 0.5);
    const sunX  = Math.cos(angle - Math.PI * 0.5);

    // Soleil/lune positionnés autour du joueur pour que l'ombre serrée le suive.
    _sunLight.position.set(_shadowCX + sunX * 120, sunY * 120, _shadowCZ + 60);
    if (_sunLight.target) _sunLight.target.position.set(_shadowCX, 0, _shadowCZ);
    _moonLight.position.set(_shadowCX - sunX * 120, -sunY * 120, _shadowCZ - 60);

    const k = _interpKey(sunY, _KEYS);
    _sunLight.intensity     = k.sunI;
    _moonLight.intensity    = Math.max(0, -sunY) * 0.50;
    _ambientLight.intensity = k.ambI;
    _ambientLight.color.setHex(k.amb);
    _scene.background.setHex(k.sky);
    _scene.fog.color.setHex(k.sky);

    // Hémisphère : ciel = couleur actuelle du fond, sol = vert sombre constant
    _hemiLight.color.setHex(k.sky);
    _hemiLight.intensity = 0.06 + k.ambI * 0.22;

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

    // Nuages
    if (_clouds.length > 0 && _cloudMat) {
      if (dt > 0) {
        for (const c of _clouds) {
          c.position.x += 1.1 * dt;
          if (c.position.x > 430) c.position.x -= 860;
        }
      }
      // Couleur nuage interpolée
      const ck = _interpCloudKey(sunY);
      _cloudMat.color.setRGB(ck.r, ck.g, ck.b);
      _cloudMat.emissiveIntensity = 0.03 + Math.max(0, -sunY) * 0.09;
    }

    if (_fireLights.length > 0) {
      const t = Date.now();
      const f = 0.82 + Math.sin(t * 0.011) * 0.09 + Math.sin(t * 0.019) * 0.06 + Math.sin(t * 0.034) * 0.04;
      for (const fl of _fireLights) {
        fl.light.intensity = f * 2.2;
        if (fl.mesh) fl.mesh.scale.y = 0.85 + f * 0.22;
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

  function buildTerrain(scene) {
    const SIZE = 600, SEG = 110;
    const geo  = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const col  = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i), vz = pos.getZ(i);
      const h  = ZS.getTerrainHeight(vx, vz);
      pos.setY(i, h);
      col.setHex(_terrainColor(vx, vz, h));
      cols[i*3] = col.r; cols[i*3+1] = col.g; cols[i*3+2] = col.b;
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
    const mats = [0x3a7830, 0x4a8838, 0x6a8428, 0x527040]
      .map(c => new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
    const perMat = mats.map(() => []);

    for (let i = 0; i < count; i++) {
      const x = (_rng() - 0.5) * 540, z = (_rng() - 0.5) * 540;
      if (x > -262 && x < -100 && z > -55 && z < 58) continue;
      const by = ZS.getTerrainHeight(x, z);
      if (by > 8) continue;
      const mi = Math.floor(_rng() * mats.length);
      const bw = 0.06 + _rng() * 0.05, h = 0.20 + _rng() * 0.18;
      const blades = 2 + Math.floor(_rng() * 2);
      for (let q = 0; q < blades; q++) {
        const ay   = q * Math.PI / 2 + _rng() * 0.5;
        const tilt = (_rng() - 0.5) * 0.18;
        const ox   = (_rng() - 0.5) * 0.12, oz = (_rng() - 0.5) * 0.12;
        perMat[mi].push({ x: x + ox, y: by + h * 0.5, z: z + oz, bw, h, ay, tilt });
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

  function spawnClouds(scene) {
    _cloudMat = new THREE.MeshLambertMaterial({
      color: 0xf0f0ee, emissive: 0xffffff, emissiveIntensity: 0.03,
      transparent: true, opacity: 0.88,
    });

    for (let i = 0; i < 18; i++) {
      const g   = new THREE.Group();
      const cx  = (_rng() - 0.5) * 900;
      const cy  = 60 + _rng() * 40;
      const cz  = (_rng() - 0.5) * 900;
      const scW = 1.4 + _rng() * 1.2;

      const baseParts = 2 + Math.floor(_rng() * 2);
      for (let j = 0; j < baseParts; j++) {
        const r   = 7 + _rng() * 11;
        const s   = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), _cloudMat);
        const ang = (j / baseParts) * Math.PI * 2;
        s.position.set(Math.cos(ang) * _rng() * 12 * scW, -1 + _rng() * 2, Math.sin(ang) * _rng() * 8);
        s.scale.set(scW * (1.2 + _rng()*0.4), 0.40 + _rng()*0.18, 1.0);
        g.add(s);
      }
      const topParts = 1 + Math.floor(_rng() * 2);
      for (let j = 0; j < topParts; j++) {
        const r   = 5 + _rng() * 8;
        const s   = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), _cloudMat);
        const ang = _rng() * Math.PI * 2;
        s.position.set(Math.cos(ang) * _rng() * 9 * scW * 0.5, 5 + _rng() * 8, Math.sin(ang) * _rng() * 6);
        s.scale.set(scW * 0.85, 0.70 + _rng() * 0.30, 0.9);
        g.add(s);
      }

      g.position.set(cx, cy, cz);
      scene.add(g);
      _clouds.push(g);
    }
  }

  // ── Arbres améliorés ─────────────────────────────────────────────────────────

  // Registre des arbres abattables (pour l'abattage à la hache).
  const _trees = [];
  function _registerTree(scene, group, x, z, collider) {
    _trees.push({ scene, group, x, z, collider, hp: 5, maxHp: 5, alive: true });
  }

  // Abat l'arbre le plus proche devant (ox,oz) dans la direction (dirX,dirZ).
  // Renvoie { hit, felled, x, z } ou null si aucun arbre à portée.
  function chopTree(ox, oz, dirX, dirZ, range, damage) {
    const len = Math.hypot(dirX, dirZ) || 1;
    const nx = dirX / len, nz = dirZ / len;
    let best = null, bestT = Infinity;
    for (const t of _trees) {
      if (!t.alive) continue;
      const proj = (t.x - ox) * nx + (t.z - oz) * nz;          // distance le long du regard
      if (proj < 0 || proj > range) continue;
      const perp = Math.hypot(ox + nx * proj - t.x, oz + nz * proj - t.z);
      if (perp < 1.4 && proj < bestT) { bestT = proj; best = t; }
    }
    if (!best) return null;
    best.hp -= (damage || 1);
    if (best.hp > 0) {
      best.group.position.x += (Math.random() - 0.5) * 0.05;   // petite secousse
      return { hit: true, felled: false, x: best.x, z: best.z };
    }
    best.alive = false;
    if (best.scene) best.scene.remove(best.group);
    const ci = _colliders.indexOf(best.collider);
    if (ci >= 0) _colliders.splice(ci, 1);
    return { hit: true, felled: true, x: best.x, z: best.z };
  }

  function spawnTrees(scene, count) {
    for (let i = 0; i < count; i++) {
      const x = (_rng() - 0.5) * 560, z = (_rng() - 0.5) * 560;
      if (Math.hypot(x, z) < 4) continue;
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
    const barkCol  = [0x6a3a10, 0x7a4218, 0x5a3010, 0x8a5020];
    const trunkMat = new THREE.MeshLambertMaterial({ color: barkCol[Math.floor(_rng() * barkCol.length)] });

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
    const leafCols = [0x1e7a3c, 0x2d9e52, 0x256a38, 0x358a44, 0x1a6830, 0x2a8040];
    const lm1  = new THREE.MeshLambertMaterial({ color: leafCols[Math.floor(_rng() * leafCols.length)] });
    const lm2  = new THREE.MeshLambertMaterial({ color: leafCols[Math.floor(_rng() * leafCols.length)] });
    const leafN = 4 + Math.floor(_rng() * 3);
    for (let i = 0; i < leafN; i++) {
      const r    = 0.9 + _rng() * 1.2;
      const ang  = (i / leafN) * Math.PI * 2 + _rng() * 0.8;
      const dist = 0.3 + _rng() * 1.2;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), i % 2 === 0 ? lm1 : lm2);
      leaf.position.set(Math.cos(ang) * dist, trunkH * 0.62 + _rng() * 1.8, Math.sin(ang) * dist);
      leaf.scale.y = 0.72 + _rng() * 0.3;
      g.add(leaf);
    }
    return g;
  }

  function makePineTree() {
    const g = new THREE.Group();
    const h        = 5.5 + _rng() * 4.5; // 5.5 – 10m
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a2008 });
    const trunk    = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.24, h, 9), trunkMat);
    trunk.position.y = h / 2; trunk.castShadow = true; g.add(trunk);

    const pCols = [0x184828, 0x1a5228, 0x153a22, 0x20502c];
    const pMat  = new THREE.MeshLambertMaterial({ color: pCols[Math.floor(_rng() * pCols.length)] });
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
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0xd0c8b8 });
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
    const lMat  = new THREE.MeshLambertMaterial({ color: lCols[Math.floor(_rng() * lCols.length)] });
    for (let i = 0; i < 6 + Math.floor(_rng() * 4); i++) {
      const r    = 0.55 + _rng() * 0.7;
      const ang  = _rng() * Math.PI * 2;
      const dist = 0.3 + _rng() * 0.9;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), lMat);
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

  function registerFireLight(light, mesh) { _fireLights.push({ light, mesh }); }
  function registerWaterMaterial(mat)     { _waterMats.push(mat); }

  // ── Zones d'eau (rivière) ────────────────────────────────────────────────────
  const _waterZones = []; // { x, z, r, y }

  function registerWaterZone(x, z, r, y) { _waterZones.push({ x, z, r, y }); }

  function getWaterSurface(px, pz) {
    for (const wz of _waterZones) {
      if (Math.hypot(px - wz.x, pz - wz.z) < wz.r) return wz.y;
    }
    return null;
  }

  window.ZS = window.ZS || {};
  ZS.buildWorld        = buildWorld;
  ZS.tickDayNight      = tickDayNight;
  ZS.setWorldTime      = setWorldTime;
  ZS.setShadowCenter   = setShadowCenter;
  ZS.getColliders      = () => _colliders;
  ZS.chopTree          = chopTree;
  ZS.registerFireLight     = registerFireLight;
  ZS.registerWaterMaterial = registerWaterMaterial;
  ZS.registerWaterZone     = registerWaterZone;
  ZS.getWaterSurface       = getWaterSurface;
  ZS.spawnTreesAt      = spawnTreesAt;
  ZS.spawnDeadTreesAt  = spawnDeadTreesAt;
  ZS.makeTree          = makeTree;
  ZS.makePineTree      = makePineTree;
  ZS.makeBirchTree     = makeBirchTree;
  ZS.makeDeadTree      = makeDeadTree;
}());
