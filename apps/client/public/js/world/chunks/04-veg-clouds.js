// Fleurs, herbe, nuages — extrait de world.js (IIFE)
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

    const prof = _optsProfile();
    const cloudCount = prof?.clouds ?? (_isMobileBuild() ? 4 : 10);
    for (let i = 0; i < cloudCount; i++) {
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
    tree_oak: 8, tree_pine: 10, tree_birch: 6, tree_dead: 3, tree_palm: 6,
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
