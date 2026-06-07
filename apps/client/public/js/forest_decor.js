// Décor procédural forêt — fougères, mousse, champignons, rondins, litière, cailloux.
(function () {
  'use strict';

  const FT = () => ZS.ForestTextures || {};
  const SPAWN_CLEAR = { x: 0, z: -6 };
  const FOREST_CX = 72;
  const FOREST_CZ = -12;
  const FOREST_RX = 168;
  const FOREST_RZ = 102;

  const _GEO = {
    pebble: new THREE.SphereGeometry(0.045, 4, 3),
    cone: new THREE.ConeGeometry(0.022, 0.035, 4),
    chip: new THREE.BoxGeometry(0.04, 0.008, 0.025),
    acorn: new THREE.SphereGeometry(0.018, 4, 3),
  };

  function _rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _forestW(x, z) {
    return ZS.forestFloorWeight ? ZS.forestFloorWeight(x, z) : 0;
  }

  function _groundY(x, z) {
    return ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(x, z)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
  }

  function _distSeg(px, pz, x0, z0, x1, z1) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-8) return Math.hypot(px - x0, pz - z0);
    let t = ((px - x0) * dx + (pz - z0) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x0 + dx * t), pz - (z0 + dz * t));
  }

  function _nearTrail(x, z, margin) {
    const pts = ZS.SPAWN_TRAIL_PTS || ZS.BEACH_TRAIL_PTS || [];
    for (let i = 1; i < pts.length; i++) {
      const [x0, z0] = pts[i - 1];
      const [x1, z1] = pts[i];
      if (_distSeg(x, z, x0, z0, x1, z1) < margin) return true;
    }
    return false;
  }

  function _canPlace(x, z, placed, minGap, tiny) {
    if (!ZS.isInForestFootprint?.(x, z, tiny ? 0.3 : 1)) return false;
    if (_forestW(x, z) < (tiny ? 0.22 : 0.3)) return false;
    if (ZS.isInClearingDisc?.(x, z, tiny ? 2 : 4)) return false;
    if (ZS.isInWaterZone?.(x, z)) return false;
    if (!tiny && Math.hypot(x - SPAWN_CLEAR.x, z - SPAWN_CLEAR.z) < 9) return false;
    if (!tiny && _nearTrail(x, z, 2.4)) return false;
    if (tiny && _nearTrail(x, z, 1.35)) return false;
    for (const p of placed) {
      const g = p.tiny && tiny ? minGap * 0.5 : minGap;
      if (Math.hypot(x - p.x, z - p.z) < g) return false;
    }
    return true;
  }

  function _add(parent, geo, mat, x, y, z, rx, ry, rz, sx, sy, sz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    if (sx != null) m.scale.set(sx, sy ?? sx, sz ?? sx);
    m.castShadow = !mat.transparent;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function _fernPatch(parent, x, y, z, rng) {
    const mat = FT().getFernMaterial?.();
    mat.side = THREE.DoubleSide;
    const n = 5 + Math.floor(rng() * 6);
    for (let i = 0; i < n; i++) {
      const ang = rng() * Math.PI * 2;
      const h = 0.28 + rng() * 0.42;
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.1 + rng() * 0.06, h), mat);
      blade.position.set(x + Math.cos(ang) * 0.22, y + h * 0.45, z + Math.sin(ang) * 0.22);
      blade.rotation.y = ang;
      blade.rotation.x = -0.35 - rng() * 0.35;
      blade.castShadow = false;
      parent.add(blade);
    }
  }

  function _mushroomCluster(parent, x, y, z, rng) {
    const n = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const variant = Math.floor(rng() * 3);
      const mat = FT().getMushroomMaterial?.(variant);
      const capR = 0.04 + rng() * 0.05;
      const stemH = 0.05 + rng() * 0.07;
      const ox = x + (rng() - 0.5) * 0.35;
      const oz = z + (rng() - 0.5) * 0.35;
      _add(parent, new THREE.CylinderGeometry(0.012, 0.016, stemH, 5), mat,
        ox, y + stemH * 0.5, oz);
      _add(parent, new THREE.SphereGeometry(capR, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.55), mat,
        ox, y + stemH + capR * 0.35, oz);
    }
  }

  function _mossRock(parent, x, y, z, rng) {
    const rockMat = FT().getForestRockMaterial?.(Math.floor(rng() * 8000));
    const mossMat = FT().getMossMaterial?.(Math.floor(rng() * 6));
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + rng() * 0.55, 0), rockMat);
    rock.position.set(x, y + 0.14, z);
    rock.rotation.set(rng(), rng(), rng());
    rock.scale.set(1, 0.5 + rng() * 0.4, 1);
    rock.castShadow = true;
    parent.add(rock);
    if (rng() < 0.85) {
      _add(parent, new THREE.SphereGeometry(0.12 + rng() * 0.2, 5, 4, 0, Math.PI * 2, 0, Math.PI * 0.5), mossMat,
        x, y + 0.08, z, 0, rng() * Math.PI, 0, 1, 0.35 + rng() * 0.25, 1);
    }
  }

  function _fallenLog(parent, x, y, z, rng) {
    const bark = FT().getBarkMaterial?.(Math.floor(rng() * 8));
    const len = 0.9 + rng() * 2.2;
    const r0 = 0.05 + rng() * 0.05;
    const r1 = r0 * (0.75 + rng() * 0.35);
    _add(parent, new THREE.CylinderGeometry(r0, r1, len, 6), bark,
      x, y + r0, z, 0, rng() * Math.PI, Math.PI / 2 + (rng() - 0.5) * 0.2);
    if (rng() < 0.55) {
      const moss = FT().getMossMaterial?.(Math.floor(rng() * 6));
      _add(parent, new THREE.BoxGeometry(len * 0.7, 0.04, r0 * 2.8), moss,
        x, y + r0 * 1.6, z, 0, rng() * Math.PI, Math.PI / 2, 1, 1, 1);
    }
  }

  function _branchScatter(parent, x, y, z, rng) {
    const bark = FT().getBarkMaterial?.(Math.floor(rng() * 8));
    const n = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const len = 0.2 + rng() * 0.55;
      _add(parent, new THREE.CylinderGeometry(0.012, 0.022, len, 4), bark,
        x + (rng() - 0.5) * 0.4, y + 0.02, z + (rng() - 0.5) * 0.4,
        (rng() - 0.5) * 0.6, rng() * Math.PI, Math.PI / 2);
    }
  }

  function _stumpSmall(parent, x, y, z, rng) {
    const bark = FT().getBarkMaterial?.(Math.floor(rng() * 8));
    const h = 0.12 + rng() * 0.18;
    const r = 0.14 + rng() * 0.12;
    _add(parent, new THREE.CylinderGeometry(r * 0.85, r, h, 7), bark, x, y + h * 0.5, z);
    if (rng() < 0.5) {
      const moss = FT().getMossMaterial?.(Math.floor(rng() * 6));
      _add(parent, new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.03, 8), moss, x, y + h + 0.01, z);
    }
  }

  function _rootExposed(parent, x, y, z, rng) {
    const bark = FT().getBarkMaterial?.(Math.floor(rng() * 8));
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + rng() * 0.4;
      const len = 0.35 + rng() * 0.45;
      _add(parent, new THREE.CylinderGeometry(0.025, 0.04, len, 5), bark,
        x + Math.cos(ang) * 0.15, y + 0.04, z + Math.sin(ang) * 0.15,
        0.5 + rng() * 0.3, ang, 0);
    }
  }

  function _berryBush(parent, x, y, z, rng) {
    const mat = FT().getBerryMaterial?.();
    mat.side = THREE.DoubleSide;
    const n = 4 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const ang = rng() * Math.PI * 2;
      const spr = new THREE.Mesh(new THREE.SphereGeometry(0.14 + rng() * 0.1, 6, 5), mat);
      spr.position.set(x + Math.cos(ang) * 0.25, y + 0.12 + rng() * 0.15, z + Math.sin(ang) * 0.25);
      spr.scale.y = 0.75 + rng() * 0.35;
      spr.castShadow = true;
      parent.add(spr);
    }
  }

  function _mossCarpet(parent, x, y, z, rng) {
    const moss = FT().getMossMaterial?.(Math.floor(rng() * 6));
    moss.side = THREE.DoubleSide;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.35 + rng() * 0.55, 8), moss);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, y + 0.012, z);
    patch.receiveShadow = true;
    parent.add(patch);
    if (rng() < 0.4) {
      _fernPatch(parent, x, y, z, rng);
    }
  }

  function _pineNeedleMat(parent, x, y, z, rng) {
    const mat = FT().getPineNeedleMaterial?.();
    mat.side = THREE.DoubleSide;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.7 + rng() * 0.5, 0.7 + rng() * 0.5), mat);
    plane.rotation.x = -Math.PI / 2;
    plane.rotation.z = rng() * Math.PI;
    plane.position.set(x, y + 0.01, z);
    plane.receiveShadow = true;
    parent.add(plane);
  }

  function _hollowLog(parent, x, y, z, rng) {
    const bark = FT().getBarkMaterial?.(Math.floor(rng() * 8));
    const len = 1.1 + rng() * 0.9;
    const rOut = 0.12 + rng() * 0.06;
    _add(parent, new THREE.CylinderGeometry(rOut, rOut * 0.9, len, 8, 1, true), bark,
      x, y + rOut, z, 0, rng() * Math.PI, Math.PI / 2);
    const dark = new THREE.MeshLambertMaterial({ color: 0x1a1410 });
    _add(parent, new THREE.CylinderGeometry(rOut * 0.55, rOut * 0.5, len * 0.92, 6), dark,
      x, y + rOut * 0.85, z, 0, rng() * Math.PI, Math.PI / 2);
  }

  function _birchBark(parent, x, y, z, rng) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xd8d0c8 });
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.35 + rng() * 0.25, 0.12 + rng() * 0.08), mat);
    strip.rotation.x = -Math.PI / 2 + (rng() - 0.5) * 0.2;
    strip.rotation.z = rng() * Math.PI;
    strip.position.set(x, y + 0.015, z);
    strip.receiveShadow = true;
    parent.add(strip);
    if (rng() < 0.5) {
      const mat2 = mat.clone();
      const s2 = strip.clone();
      s2.material = mat2;
      s2.position.set(x + 0.12, y + 0.01, z + 0.08);
      s2.rotation.z += 0.8;
      parent.add(s2);
    }
  }

  function _grassTuft(parent, x, y, z, rng) {
    const mat = FT().getForestGrassMaterial?.();
    mat.side = THREE.DoubleSide;
    const n = 5 + Math.floor(rng() * 5);
    for (let i = 0; i < n; i++) {
      const ang = rng() * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.06 + rng() * 0.04, 0.22 + rng() * 0.28), mat);
      blade.position.set(x + Math.cos(ang) * 0.15, y + 0.12, z + Math.sin(ang) * 0.15);
      blade.rotation.y = ang;
      blade.rotation.x = -0.32 - rng() * 0.2;
      blade.castShadow = false;
      parent.add(blade);
    }
  }

  function _antMound(parent, x, y, z, rng) {
    const soil = new THREE.MeshLambertMaterial({ color: 0x5a4838 });
    _add(parent, new THREE.SphereGeometry(0.14 + rng() * 0.12, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), soil,
      x, y + 0.04, z, 0, rng() * Math.PI, 0, 1, 0.45 + rng() * 0.25, 1);
  }

  function _conePile(parent, x, y, z, rng) {
    const mat = FT().getBarkMaterial?.(303);
    const n = 4 + Math.floor(rng() * 8);
    for (let i = 0; i < n; i++) {
      _add(parent, _GEO.cone, mat,
        x + (rng() - 0.5) * 0.4, y + 0.012, z + (rng() - 0.5) * 0.4,
        Math.PI / 2 + (rng() - 0.5) * 0.5, rng() * Math.PI, 0,
        0.8 + rng() * 0.6, 0.8 + rng() * 0.6, 0.8 + rng() * 0.6);
    }
  }

  function _boneRemnant(parent, x, y, z, rng) {
    const bone = new THREE.MeshLambertMaterial({ color: 0xe8e0d0 });
    _add(parent, new THREE.CylinderGeometry(0.018, 0.022, 0.18 + rng() * 0.12, 5), bone,
      x, y + 0.03, z, Math.PI / 2, rng() * Math.PI, (rng() - 0.5) * 0.3);
    if (rng() < 0.6) {
      _add(parent, new THREE.SphereGeometry(0.035, 5, 4), bone,
        x + 0.08, y + 0.025, z, 0, rng() * Math.PI, 0);
    }
  }

  function _oldRope(parent, x, y, z, rng) {
    const mat = ZS.BeachTextures?.getRopeMaterial?.() || new THREE.MeshLambertMaterial({ color: 0x6a5848 });
    mat.side = THREE.DoubleSide;
    const len = 0.35 + rng() * 0.55;
    _add(parent, new THREE.CylinderGeometry(0.014, 0.018, len, 5), mat,
      x, y + 0.015, z, Math.PI / 2, rng() * Math.PI, (rng() - 0.5) * 0.4);
  }

  function _tarpScrap(parent, x, y, z, rng) {
    const mat = ZS.BeachTextures?.getFabricMaterial?.(130) || new THREE.MeshLambertMaterial({ color: 0x4a5a48 });
    mat.side = THREE.DoubleSide;
    const tarp = new THREE.Mesh(new THREE.PlaneGeometry(0.55 + rng() * 0.35, 0.4 + rng() * 0.25), mat);
    tarp.rotation.x = -Math.PI / 2;
    tarp.rotation.z = rng() * Math.PI;
    tarp.position.set(x, y + 0.012, z);
    tarp.receiveShadow = true;
    parent.add(tarp);
  }

  const _BUILDERS = [
    { w: 22, fn: _fernPatch, gap: 1.0, tiny: false },
    { w: 18, fn: _mossRock, gap: 1.3, tiny: false },
    { w: 16, fn: _grassTuft, gap: 0.85, tiny: false },
    { w: 15, fn: _branchScatter, gap: 0.55, tiny: true },
    { w: 14, fn: _mushroomCluster, gap: 0.9, tiny: false },
    { w: 13, fn: _mossCarpet, gap: 1.1, tiny: false },
    { w: 12, fn: _pineNeedleMat, gap: 1.0, tiny: false },
    { w: 11, fn: _fallenLog, gap: 2.0, tiny: false },
    { w: 10, fn: _stumpSmall, gap: 1.6, tiny: false },
    { w: 9, fn: _conePile, gap: 0.45, tiny: true },
    { w: 8, fn: _rootExposed, gap: 1.4, tiny: false },
    { w: 7, fn: _berryBush, gap: 1.8, tiny: false },
    { w: 6, fn: _birchBark, gap: 0.7, tiny: true },
    { w: 5, fn: _antMound, gap: 1.2, tiny: false },
    { w: 4, fn: _hollowLog, gap: 2.8, tiny: false },
    { w: 3, fn: _oldRope, gap: 1.5, tiny: false },
    { w: 2, fn: _tarpScrap, gap: 2.2, tiny: false },
    { w: 1, fn: _boneRemnant, gap: 3.5, tiny: false },
  ];

  function _pickBuilder(rng, x) {
    const deep = x < 80;
    const roll = rng() * 175;
    let acc = 0;
    for (const b of _BUILDERS) {
      let w = b.w;
      if (deep && (b.fn === _fernPatch || b.fn === _mossRock || b.fn === _mossCarpet
          || b.fn === _fallenLog || b.fn === _mushroomCluster)) w *= 1.45;
      if (!deep && x > 170 && (b.fn === _grassTuft || b.fn === _branchScatter)) w *= 1.3;
      acc += w;
      if (roll < acc) return b;
    }
    return _BUILDERS[0];
  }

  function _scatterInstanced(parent, opts) {
    const { geo, mat, count, rng, placed, scaleFn } = opts;
    if (!geo || !mat || count < 1) return;
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    let placedN = 0;
    let tries = 0;
    const maxTries = count * 28;
    while (placedN < count && tries < maxTries) {
      tries++;
      const x = FOREST_CX + (rng() * 2 - 1) * FOREST_RX;
      const z = FOREST_CZ + (rng() * 2 - 1) * FOREST_RZ;
      if (!_canPlace(x, z, placed, 0.1, true)) continue;
      const y = _groundY(x, z);
      const s = scaleFn ? scaleFn(rng) : 0.75 + rng() * 0.55;
      dummy.position.set(x, y + 0.005 * s, z);
      dummy.rotation.set(
        (rng() - 0.5) * 0.4,
        rng() * Math.PI * 2,
        (rng() - 0.5) * 0.35);
      dummy.scale.set(s, s * (0.65 + rng() * 0.35), s);
      dummy.updateMatrix();
      mesh.setMatrixAt(placedN, dummy.matrix);
      placed.push({ x, z, tiny: true });
      placedN++;
    }
    mesh.count = placedN;
    mesh.instanceMatrix.needsUpdate = true;
    parent.add(mesh);
  }

  function _yieldFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });
  }

  function _anchorSlice(list) {
    const tier = ZS.Options?.getResolvedTier?.() ?? 'high';
    const frac = tier === 'potato' ? 0.2 : tier === 'low' ? 0.45 : tier === 'medium' ? 0.72 : 1;
    const minN = tier === 'potato' ? 4 : tier === 'low' ? 8 : list.length;
    return list.slice(0, Math.max(minN, Math.ceil(list.length * frac)));
  }

  async function buildForestDecorAsync(scene) {
    if (!scene) return;
    const scale = ZS.Options?.getDecorScale?.() ?? 1;
    const mobile = scale < 0.85 || !!(window.__ZS_TOUCH_MODE || window.ZS?._touchInput || window.ZS?._isMobile);
    const target = Math.max(14, Math.round((mobile ? 105 : 205) * scale));
    const rng = _rng(55291);
    const placed = [];
    let attempts = 0;
    const maxAttempts = target * 55;
    const batch = Math.max(4, Math.round((mobile ? 8 : 14) * Math.min(1, scale + 0.35)));
    let sinceYield = 0;

    const root = new THREE.Group();
    root.name = 'forestDecor';
    scene.add(root);

    while (placed.length < target && attempts < maxAttempts) {
      attempts++;
      const x = FOREST_CX + (rng() * 2 - 1) * FOREST_RX;
      const z = FOREST_CZ + (rng() * 2 - 1) * FOREST_RZ;
      const pick = _pickBuilder(rng, x);
      if (!_canPlace(x, z, placed, pick.gap, pick.tiny)) continue;
      const y = _groundY(x, z);
      pick.fn(root, x, y, z, rng);
      placed.push({ x, z, tiny: pick.tiny });
      if (++sinceYield >= batch) {
        sinceYield = 0;
        await _yieldFrame();
      }
    }

    const leafMat = FT().getLeafLitterMaterial?.();
    const rockMat = FT().getForestRockMaterial?.(17);
    await _yieldFrame();
    if (leafMat) {
      _scatterInstanced(root, {
        geo: new THREE.BoxGeometry(0.035, 0.006, 0.025),
        mat: leafMat,
        count: Math.max(10, Math.round((mobile ? 130 : 270) * scale)),
        rng: _rng(88102),
        placed,
        scaleFn: (r) => 0.55 + r() * 0.85,
      });
    }
    await _yieldFrame();
    if (rockMat) {
      _scatterInstanced(root, {
        geo: _GEO.pebble,
        mat: rockMat,
        count: Math.max(8, Math.round((mobile ? 70 : 145) * scale)),
        rng: _rng(77103),
        placed,
        scaleFn: (r) => 0.5 + r() * 0.8,
      });
    }
    await _yieldFrame();
    _scatterInstanced(root, {
      geo: _GEO.acorn,
      mat: FT().getBarkMaterial?.(42) || rockMat,
      count: Math.max(6, Math.round((mobile ? 55 : 115) * scale)),
      rng: _rng(66104),
      placed,
      scaleFn: (r) => 0.65 + r() * 0.55,
    });

    const anchors = [
      [195, -14, _fernPatch], [188, 8, _mossRock], [175, -28, _fallenLog],
      [160, 18, _mushroomCluster], [145, -42, _stumpSmall], [128, 5, _berryBush],
      [110, -18, _mossCarpet], [95, 28, _hollowLog], [78, -55, _rootExposed],
      [62, 12, _pineNeedleMat], [48, -32, _fallenLog], [35, 42, _grassTuft],
      [22, -8, _fernPatch], [18, -48, _mossRock], [8, 22, _conePile],
      [-5, -22, _branchScatter], [-18, 38, _berryBush], [-32, -58, _stumpSmall],
      [-48, 8, _mossCarpet], [-58, -35, _fallenLog], [-72, 48, _birchBark],
      [205, -5, _grassTuft], [198, 32, _mossRock], [168, -62, _antMound],
      [42, -68, _boneRemnant], [88, -72, _oldRope], [-42, -12, _tarpScrap],
      [28, -42, _fernPatch], [-20, 33, _mossRock], [-60, -70, _stumpSmall],
      [120, -88, _pineNeedleMat], [55, 55, _mushroomCluster],
    ];
    for (const [ax, az, fn] of _anchorSlice(anchors)) {
      if (!_canPlace(ax, az, placed, 1.4, false)) continue;
      fn(root, ax, _groundY(ax, az), az, _rng(Math.floor(ax * 13 + az * 7)));
      placed.push({ x: ax, z: az, tiny: false });
    }
  }

  function buildForestDecor(scene) {
    buildForestDecorAsync(scene);
  }

  function finishForestDecorAsync(scene) {
    if (!scene) return;
    const run = () => {
      try {
        const p = buildForestDecorAsync(scene);
        if (p?.catch) p.catch((e) => console.warn('[forest] decor deferred', e));
      } catch (e) {
        console.warn('[forest] decor deferred', e);
      }
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 3500 });
    } else {
      setTimeout(run, 48);
    }
  }

  window.ZS = window.ZS || {};
  ZS.buildForestDecor = buildForestDecor;
  ZS.buildForestDecorAsync = buildForestDecorAsync;
  ZS.finishForestDecorAsync = finishForestDecorAsync;
}());
