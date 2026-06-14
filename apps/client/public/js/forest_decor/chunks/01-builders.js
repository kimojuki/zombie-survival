// Builders procéduraux — forest_decor.js
function _sampleInForest(rng, maxTries) {
    maxTries = maxTries || 28;
    for (let i = 0; i < maxTries; i++) {
      const x = S01_FOREST.xMin + rng() * (S01_FOREST.xMax - S01_FOREST.xMin);
      const z = S01_FOREST.zMin + rng() * (S01_FOREST.zMax - S01_FOREST.zMin);
      const fw = _forestW(x, z);
      if (fw < 0.14) continue;
      if (!ZS.isInForestFootprint?.(x, z, 0.45)) continue;
      return { x, z, fw };
    }
    return null;
  }

  /** Placement micro-déco sur tout le sol forestier S01 (centre sentier libre). */
  function _canPlaceForestDecor(x, z, tracker, minGap, tiny) {
    if (ZS.isInBeachFootprint?.(x, z, tiny ? 0.15 : 0.8)) return false;
    if (!ZS.isInForestFootprint?.(x, z, tiny ? 0.2 : 0.5)) return false;
    if (_forestW(x, z) < (tiny ? 0.14 : 0.18)) return false;
    if (ZS.isInClearingDisc?.(x, z, tiny ? 2 : 5)) return false;
    if (ZS.isInWaterZone?.(x, z)) return false;
    if (!tiny && Math.hypot(x - SPAWN_CLEAR.x, z - SPAWN_CLEAR.z) < 8) return false;
    if (_trailDist(x, z) < 1.15) return false;
    if (tracker && !tracker.canPlace(x, z, minGap, tiny)) return false;
    return true;
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

  function _fernPatch(parent, batch, x, y, z, rng) {
    const mat = FT().getFernMaterial?.();
    if (!mat) return;
    mat.side = THREE.DoubleSide;
    const n = 5 + Math.floor(rng() * 6);
    for (let i = 0; i < n; i++) {
      const ang = rng() * Math.PI * 2;
      const h = 0.28 + rng() * 0.42;
      const sx = 0.75 + rng() * 0.5;
      const sy = h / 0.35;
      const px = x + Math.cos(ang) * 0.22;
      const pz = z + Math.sin(ang) * 0.22;
      const py = y + h * 0.45;
      if (batch) {
        batch.add(_GEO.fernBlade, mat, px, py, pz, -0.35 - rng() * 0.35, ang, 0, sx, sy, 1);
      } else {
        const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.1 + rng() * 0.06, h), mat);
        blade.position.set(px, py, pz);
        blade.rotation.y = ang;
        blade.rotation.x = -0.35 - rng() * 0.35;
        blade.castShadow = false;
        parent.add(blade);
      }
    }
  }

  function _mushroomCluster(parent, _batch, x, y, z, rng) {
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

  function _mossRock(parent, _batch, x, y, z, rng) {
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

  function _fallenLog(parent, _batch, x, y, z, rng) {
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

  function _branchScatter(parent, batch, x, y, z, rng) {
    const bark = FT().getBarkMaterial?.(Math.floor(rng() * 8));
    const n = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const len = 0.2 + rng() * 0.55;
      const px = x + (rng() - 0.5) * 0.4;
      const pz = z + (rng() - 0.5) * 0.4;
      const py = y + 0.02;
      if (batch) {
        batch.add(_GEO.branchCyl, bark, px, py + len * 0.5, pz,
          (rng() - 0.5) * 0.6, rng() * Math.PI, Math.PI / 2, 1, len, 1);
      } else {
        _add(parent, new THREE.CylinderGeometry(0.012, 0.022, len, 4), bark,
          px, py, pz, (rng() - 0.5) * 0.6, rng() * Math.PI, Math.PI / 2);
      }
    }
  }

  function _stumpSmall(parent, _batch, x, y, z, rng) {
    const bark = FT().getBarkMaterial?.(Math.floor(rng() * 8));
    const h = 0.12 + rng() * 0.18;
    const r = 0.14 + rng() * 0.12;
    _add(parent, new THREE.CylinderGeometry(r * 0.85, r, h, 7), bark, x, y + h * 0.5, z);
    if (rng() < 0.5) {
      const moss = FT().getMossMaterial?.(Math.floor(rng() * 6));
      _add(parent, new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.03, 8), moss, x, y + h + 0.01, z);
    }
  }

  function _rootExposed(parent, _batch, x, y, z, rng) {
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

  function _berryBush(parent, _batch, x, y, z, rng) {
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

  function _mossCarpet(parent, batch, x, y, z, rng) {
    const moss = FT().getMossMaterial?.(Math.floor(rng() * 6));
    moss.side = THREE.DoubleSide;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.35 + rng() * 0.55, 8), moss);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, y + 0.012, z);
    patch.receiveShadow = true;
    parent.add(patch);
    if (rng() < 0.4) {
      _fernPatch(parent, batch, x, y, z, rng);
    }
  }

  function _pineNeedleMat(parent, batch, x, y, z, rng) {
    const mat = FT().getPineNeedleMaterial?.();
    if (!mat) return;
    mat.side = THREE.DoubleSide;
    const sx = 0.82 + rng() * 0.6;
    const sy = 0.82 + rng() * 0.6;
    if (batch) {
      batch.add(_GEO.pineMat, mat, x, y + 0.01, z, -Math.PI / 2, 0, rng() * Math.PI, sx, sy, 1);
    } else {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.7 + rng() * 0.5, 0.7 + rng() * 0.5), mat);
      plane.rotation.x = -Math.PI / 2;
      plane.rotation.z = rng() * Math.PI;
      plane.position.set(x, y + 0.01, z);
      plane.receiveShadow = true;
      parent.add(plane);
    }
  }

  function _hollowLog(parent, _batch, x, y, z, rng) {
    const bark = FT().getBarkMaterial?.(Math.floor(rng() * 8));
    const len = 1.1 + rng() * 0.9;
    const rOut = 0.12 + rng() * 0.06;
    _add(parent, new THREE.CylinderGeometry(rOut, rOut * 0.9, len, 8, 1, true), bark,
      x, y + rOut, z, 0, rng() * Math.PI, Math.PI / 2);
    const dark = new THREE.MeshLambertMaterial({ color: 0x1a1410 });
    _add(parent, new THREE.CylinderGeometry(rOut * 0.55, rOut * 0.5, len * 0.92, 6), dark,
      x, y + rOut * 0.85, z, 0, rng() * Math.PI, Math.PI / 2);
  }

  function _birchBark(parent, batch, x, y, z, rng) {
    const sx = 0.78 + rng() * 0.55;
    const sy = 0.75 + rng() * 0.5;
    const rz = rng() * Math.PI;
    if (batch) {
      batch.add(_GEO.birchStrip, _BIRCH_BARK_MAT, x, y + 0.015, z, -Math.PI / 2 + (rng() - 0.5) * 0.2, 0, rz, sx, sy, 1);
      if (rng() < 0.5) {
        batch.add(_GEO.birchStrip, _BIRCH_BARK_MAT, x + 0.12, y + 0.01, z + 0.08,
          -Math.PI / 2 + (rng() - 0.5) * 0.2, 0, rz + 0.8, sx * 0.85, sy * 0.8, 1);
      }
    } else {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.35 + rng() * 0.25, 0.12 + rng() * 0.08), _BIRCH_BARK_MAT);
      strip.rotation.x = -Math.PI / 2 + (rng() - 0.5) * 0.2;
      strip.rotation.z = rz;
      strip.position.set(x, y + 0.015, z);
      strip.receiveShadow = true;
      parent.add(strip);
    }
  }

  function _grassTuft(parent, batch, x, y, z, rng) {
    const mat = FT().getForestGrassMaterial?.();
    if (!mat) return;
    mat.side = THREE.DoubleSide;
    const n = 5 + Math.floor(rng() * 5);
    for (let i = 0; i < n; i++) {
      const ang = rng() * Math.PI * 2;
      const sx = 0.75 + rng() * 0.55;
      const sy = 0.85 + rng() * 0.45;
      const px = x + Math.cos(ang) * 0.15;
      const pz = z + Math.sin(ang) * 0.15;
      const py = y + 0.12;
      if (batch) {
        batch.add(_GEO.grassBlade, mat, px, py, pz, -0.32 - rng() * 0.2, ang, 0, sx, sy, 1);
      } else {
        const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.06 + rng() * 0.04, 0.22 + rng() * 0.28), mat);
        blade.position.set(px, py, pz);
        blade.rotation.y = ang;
        blade.rotation.x = -0.32 - rng() * 0.2;
        blade.castShadow = false;
        parent.add(blade);
      }
    }
  }

  function _antMound(parent, _batch, x, y, z, rng) {
    const soil = new THREE.MeshLambertMaterial({ color: 0x5a4838 });
    _add(parent, new THREE.SphereGeometry(0.14 + rng() * 0.12, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), soil,
      x, y + 0.04, z, 0, rng() * Math.PI, 0, 1, 0.45 + rng() * 0.25, 1);
  }

  function _conePile(parent, batch, x, y, z, rng) {
    const mat = FT().getBarkMaterial?.(303);
    const n = 4 + Math.floor(rng() * 8);
    for (let i = 0; i < n; i++) {
      const s = 0.8 + rng() * 0.6;
      const px = x + (rng() - 0.5) * 0.4;
      const pz = z + (rng() - 0.5) * 0.4;
      const py = y + 0.012;
      if (batch) {
        batch.add(_GEO.cone, mat, px, py, pz,
          Math.PI / 2 + (rng() - 0.5) * 0.5, rng() * Math.PI, 0, s, s, s);
      } else {
        _add(parent, _GEO.cone, mat, px, py, pz,
          Math.PI / 2 + (rng() - 0.5) * 0.5, rng() * Math.PI, 0, s, s, s);
      }
    }
  }

  function _boneRemnant(parent, _batch, x, y, z, rng) {
    const bone = new THREE.MeshLambertMaterial({ color: 0xe8e0d0 });
    _add(parent, new THREE.CylinderGeometry(0.018, 0.022, 0.18 + rng() * 0.12, 5), bone,
      x, y + 0.03, z, Math.PI / 2, rng() * Math.PI, (rng() - 0.5) * 0.3);
    if (rng() < 0.6) {
      _add(parent, new THREE.SphereGeometry(0.035, 5, 4), bone,
        x + 0.08, y + 0.025, z, 0, rng() * Math.PI, 0);
    }
  }

  function _oldRope(parent, _batch, x, y, z, rng) {
    const mat = ZS.BeachTextures?.getRopeMaterial?.() || new THREE.MeshLambertMaterial({ color: 0x6a5848 });
    mat.side = THREE.DoubleSide;
    const len = 0.35 + rng() * 0.55;
    _add(parent, new THREE.CylinderGeometry(0.014, 0.018, len, 5), mat,
      x, y + 0.015, z, Math.PI / 2, rng() * Math.PI, (rng() - 0.5) * 0.4);
  }

  function _tarpScrap(parent, _batch, x, y, z, rng) {
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
