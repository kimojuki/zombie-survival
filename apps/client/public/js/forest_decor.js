// Décor procédural forêt (généré — forest_decor/chunks + npm run bundle:forest-decor)
(function () {
  'use strict';

const FT = () => ZS.ForestTextures || {};
  const SPAWN_CLEAR = { x: 0, z: -6 };
  const FOREST_CX = 72;
  const FOREST_CZ = -12;
  const FOREST_RX = 168;
  const FOREST_RZ = 102;
  /** Footprint décor S01 — sync sectors.mjs s01_start_forest (marge est hors plage). */
  const S01_FOREST = { xMin: -94, xMax: 228, zMin: -118, zMax: 104 };

  const _GEO = {
    pebble: new THREE.SphereGeometry(0.045, 4, 3),
    cone: new THREE.ConeGeometry(0.022, 0.035, 4),
    chip: new THREE.BoxGeometry(0.04, 0.008, 0.025),
    acorn: new THREE.SphereGeometry(0.018, 4, 3),
    grassBlade: new THREE.PlaneGeometry(0.08, 0.26),
    fernBlade: new THREE.PlaneGeometry(0.13, 0.35),
    branchCyl: new THREE.CylinderGeometry(0.012, 0.022, 1, 4),
    birchStrip: new THREE.PlaneGeometry(0.45, 0.16),
    pineMat: new THREE.PlaneGeometry(0.85, 0.85),
  };

  /** Regroupe micro-meshes identiques → un InstancedMesh par (geo, mat). */
  function _createInstancedBatch() {
    const buckets = new Map();
    const dummy = new THREE.Object3D();
    return {
      add(geo, mat, x, y, z, rx, ry, rz, sx, sy, sz) {
        if (!geo || !mat) return;
        const k = geo.uuid + ':' + mat.uuid;
        if (!buckets.has(k)) buckets.set(k, { geo, mat, items: [] });
        buckets.get(k).items.push({
          x, y, z,
          rx: rx || 0, ry: ry || 0, rz: rz || 0,
          sx: sx ?? 1, sy: sy ?? sx ?? 1, sz: sz ?? sx ?? 1,
        });
      },
      flush(parent) {
        let n = 0;
        for (const { geo, mat, items } of buckets.values()) {
          if (!items.length) continue;
          const mesh = new THREE.InstancedMesh(geo, mat, items.length);
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            dummy.position.set(it.x, it.y, it.z);
            dummy.rotation.set(it.rx, it.ry, it.rz);
            dummy.scale.set(it.sx, it.sy, it.sz);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
          parent.add(mesh);
          n += items.length;
        }
        buckets.clear();
        return n;
      },
      size() {
        let n = 0;
        for (const b of buckets.values()) n += b.items.length;
        return n;
      },
    };
  }

  const _BIRCH_BARK_MAT = new THREE.MeshLambertMaterial({ color: 0xd8d0c8 });

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

  function _trailPts() {
    return ZS.SPAWN_TRAIL_PTS || ZS.BEACH_TRAIL_PTS || [];
  }

  function _trailDist(x, z) {
    const pts = _trailPts();
    let min = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const [x0, z0] = pts[i - 1];
      const [x1, z1] = pts[i];
      const d = _distSeg(x, z, x0, z0, x1, z1);
      if (d < min) min = d;
    }
    return min;
  }

  function _nearTrail(x, z, margin) {
    return _trailDist(x, z) < margin;
  }

  /** Budget strict par tier — évite des milliers de meshes (perf runtime). */
  function _decorBudget() {
    const tier = ZS.Options?.getResolvedTier?.() ?? 'high';
    const scale = ZS.Options?.getDecorScale?.() ?? 1;
    const base = {
      potato: { anchors: 16, trail: 6, instLeaf: 22, instRock: 14, instAcorn: 10 },
      low: { anchors: 42, trail: 14, instLeaf: 50, instRock: 30, instAcorn: 22 },
      medium: { anchors: 78, trail: 26, instLeaf: 85, instRock: 48, instAcorn: 34 },
      high: { anchors: 110, trail: 36, instLeaf: 110, instRock: 62, instAcorn: 40 },
    }[tier] || { anchors: 110, trail: 36, instLeaf: 110, instRock: 62, instAcorn: 40 };
    const mul = Math.max(0.12, Math.min(1.05, scale));
    return {
      anchors: Math.max(8, Math.round(base.anchors * mul)),
      trail: Math.max(4, Math.round(base.trail * mul)),
      instLeaf: Math.max(6, Math.round(base.instLeaf * mul)),
      instRock: Math.max(4, Math.round(base.instRock * mul)),
      instAcorn: Math.max(4, Math.round(base.instAcorn * mul)),
      tier,
    };
  }

  const _DECOR_CHUNK = 44;
  const _decorChunks = new Map();
  /** @type {Map<string, ReturnType<typeof _createInstancedBatch>>} */
  const _chunkInstBatches = new Map();
  let _forestDecorRoot = null;
  let _visCamX = NaN;
  let _visCamZ = NaN;
  let _visStride = 0;

  function _resetDecorChunks() {
    _decorChunks.clear();
    _chunkInstBatches.clear();
    _forestDecorRoot = null;
    _visCamX = NaN;
    _visCamZ = NaN;
    _visStride = 0;
  }

  function _chunkParent(root, x, z) {
    const cs = _DECOR_CHUNK;
    const key = `${Math.floor(x / cs)},${Math.floor(z / cs)}`;
    let entry = _decorChunks.get(key);
    if (!entry) {
      const cx = Math.floor(x / cs) * cs + cs * 0.5;
      const cz = Math.floor(z / cs) * cs + cs * 0.5;
      const g = new THREE.Group();
      g.name = `forestDecorChunk:${key}`;
      g.userData.chunkCx = cx;
      g.userData.chunkCz = cz;
      root.add(g);
      entry = { group: g, cx, cz };
      _decorChunks.set(key, entry);
    }
    return entry.group;
  }

  function _chunkBatchKey(x, z) {
    const cs = _DECOR_CHUNK;
    return `${Math.floor(x / cs)},${Math.floor(z / cs)}`;
  }

  function _chunkInstBatch(x, z) {
    const key = _chunkBatchKey(x, z);
    if (!_chunkInstBatches.has(key)) _chunkInstBatches.set(key, _createInstancedBatch());
    return _chunkInstBatches.get(key);
  }

  function _flushAllChunkInstBatches() {
    let instCount = 0;
    for (const [key, batch] of _chunkInstBatches) {
      const entry = _decorChunks.get(key);
      if (!entry || batch.size() < 1) continue;
      instCount += batch.flush(entry.group);
    }
    _chunkInstBatches.clear();
    return instCount;
  }

  /** Grille spatiale O(1) — remplace le scan O(n) sur placed[]. */
  function _createPlacedTracker(cellSize) {
    const cells = new Map();
    let count = 0;
    return {
      get count() { return count; },
      canPlace(x, z, minGap, tiny) {
        const r = Math.ceil(minGap / cellSize);
        const cx = Math.floor(x / cellSize);
        const cz = Math.floor(z / cellSize);
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            const list = cells.get(`${cx + dx},${cz + dz}`);
            if (!list) continue;
            for (const p of list) {
              const g = p.tiny && tiny ? minGap * 0.45 : minGap;
              if (Math.hypot(x - p.x, z - p.z) < g) return false;
            }
          }
        }
        return true;
      },
      add(x, z, tiny) {
        const k = `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
        if (!cells.has(k)) cells.set(k, []);
        cells.get(k).push({ x, z, tiny });
        count++;
      },
    };
  }

  function _stripForestDecorShadows(root) {
    root.traverse((o) => {
      if (o.isMesh) o.castShadow = false;
    });
  }

  function updateForestDecorVisibility(camX, camZ) {
    if (!_decorChunks.size) return;
    if (++_visStride % 6 !== 0
        && Math.hypot(camX - _visCamX, camZ - _visCamZ) < 2.5) return;
    _visStride = 0;
    _visCamX = camX;
    _visCamZ = camZ;
    const visR = (ZS.Options?.getProfile?.()?.decorVisRadius ?? 130) + _DECOR_CHUNK * 0.55;
    const visR2 = visR * visR;
    for (const { group, cx, cz } of _decorChunks.values()) {
      const dx = camX - cx;
      const dz = camZ - cz;
      group.visible = dx * dx + dz * dz <= visR2;
    }
    if (_forestDecorRoot) {
      const inst = _forestDecorRoot.getObjectByName('forestDecorInstanced');
      if (inst) {
        let anyVisible = false;
        for (const { group } of _decorChunks.values()) {
          if (group.visible) { anyVisible = true; break; }
        }
        inst.visible = anyVisible;
      }
    }
  }


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
    const { geo, mat, count, rng, placed, tracker, scaleFn, forestSector } = opts;
    if (!geo || !mat || count < 1) return;
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    let placedN = 0;
    let tries = 0;
    const maxTries = count * (forestSector ? 36 : 28);
    while (placedN < count && tries < maxTries) {
      tries++;
      let x;
      let z;
      if (forestSector) {
        const sample = _sampleInForest(rng);
        if (!sample) continue;
        x = sample.x;
        z = sample.z;
        if (!_canPlaceForestDecor(x, z, tracker, 0.1, true)) continue;
      } else {
        x = FOREST_CX + (rng() * 2 - 1) * FOREST_RX;
        z = FOREST_CZ + (rng() * 2 - 1) * FOREST_RZ;
        if (!_canPlace(x, z, placed, 0.1, true)) continue;
      }
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
      if (tracker) tracker.add(x, z, true);
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

  function _buildYieldBatch(mobile) {
    let batch = mobile ? 8 : 14;
    const fps = ZS.PerfMonitor?.getStats?.()?.fps;
    if (fps != null && fps < 12) batch = Math.max(2, Math.floor(batch * 0.35));
    else if (fps != null && fps < 16) batch = Math.max(3, Math.floor(batch * 0.5));
    else if (fps != null && fps < 20) batch = Math.max(4, Math.floor(batch * 0.72));
    if (ZS._sectorDecorBusy || ZS.Network?.isSectorLoadBusy?.()) {
      batch = Math.max(2, Math.floor(batch * 0.5));
    }
    return batch;
  }

  async function _buildYieldFrame() {
    await _yieldFrame();
    const s = ZS.PerfMonitor?.getStats?.();
    if (s?.frameMsP95 > 88 || (s?.fps != null && s.fps < 14)) {
      await new Promise((resolve) => setTimeout(resolve, 28));
    }
  }

  function _anchorSlice(list) {
    const tier = ZS.Options?.getResolvedTier?.() ?? 'high';
    const frac = tier === 'potato' ? 0.2 : tier === 'low' ? 0.45 : tier === 'medium' ? 0.72 : 1;
    const minN = tier === 'potato' ? 4 : tier === 'low' ? 8 : list.length;
    return list.slice(0, Math.max(minN, Math.ceil(list.length * frac)));
  }

  async function buildForestDecorAsync(scene) {
    if (!scene) return { placed: 0, ms: 0, budget: null };
    ZS.LoadLog?.stepStart?.('forest-decor-build');
    _resetDecorChunks();
    const t0 = performance.now();
    const budget = _decorBudget();
    const tracker = _createPlacedTracker(1.8);
    const mobile = (ZS.Options?.getDecorScale?.() ?? 1) < 0.85
      || !!(window.__ZS_TOUCH_MODE || window.ZS?._touchInput || window.ZS?._isMobile);
    let sinceYield = 0;
    const rng = _rng(55291);

    const root = new THREE.Group();
    root.name = 'forestDecorRoot';
    scene.add(root);
    _forestDecorRoot = root;

    const _TRAIL_BUILDERS = [
      { w: 28, fn: _fernPatch, gap: 0.75, tiny: false },
      { w: 22, fn: _mossCarpet, gap: 0.9, tiny: false },
      { w: 20, fn: _grassTuft, gap: 0.7, tiny: false },
      { w: 18, fn: _branchScatter, gap: 0.45, tiny: true },
      { w: 16, fn: _mushroomCluster, gap: 0.7, tiny: false },
      { w: 14, fn: _pineNeedleMat, gap: 0.8, tiny: false },
      { w: 12, fn: _conePile, gap: 0.35, tiny: true },
      { w: 10, fn: _birchBark, gap: 0.55, tiny: true },
    ];

    const _LIGHT_SCATTER = [
      { w: 24, fn: _pineNeedleMat, gap: 0.8, tiny: false },
      { w: 22, fn: _conePile, gap: 0.35, tiny: true },
      { w: 20, fn: _birchBark, gap: 0.55, tiny: true },
      { w: 18, fn: _branchScatter, gap: 0.45, tiny: true },
      { w: 14, fn: _grassTuft, gap: 0.7, tiny: false },
      { w: 12, fn: _mossCarpet, gap: 0.9, tiny: false },
      { w: 10, fn: _fernPatch, gap: 0.75, tiny: false },
      { w: 8, fn: _mushroomCluster, gap: 0.7, tiny: false },
    ];

    function _pickFrom(list, rngFn, forestW) {
      const roll = rngFn() * 130;
      let acc = 0;
      for (const b of list) {
        let w = b.w;
        if (forestW > 0.65 && (b.fn === _fernPatch || b.fn === _mossCarpet || b.fn === _mushroomCluster)) {
          w *= 1.25;
        }
        acc += w;
        if (roll < acc) return b;
      }
      return list[0];
    }

    function _placeProp(x, z, pick) {
      const parent = _chunkParent(root, x, z);
      const batch = _chunkInstBatch(x, z);
      pick.fn(parent, batch, x, _groundY(x, z), z, rng);
      tracker.add(x, z, pick.tiny);
    }

    function _canPlaceTrailEdge(x, z, minGap, tiny) {
      const td = _trailDist(x, z);
      if (td < 1.2 || td > 4.2) return false;
      if (ZS.isInBeachFootprint?.(x, z, tiny ? 0.15 : 0.8)) return false;
      if (!ZS.isInForestFootprint?.(x, z, tiny ? 0.2 : 0.5)) return false;
      if (_forestW(x, z) < 0.22) return false;
      if (ZS.isInClearingDisc?.(x, z, tiny ? 2 : 4)) return false;
      if (ZS.isInWaterZone?.(x, z)) return false;
      return tracker.canPlace(x, z, minGap, tiny);
    }

    // 1 — Priorité corridor sentier (budget trail)
    const pts = _trailPts();
    const stepAlong = mobile ? 3.6 : 2.6;
    const perSideMax = budget.tier === 'high' ? 2 : 1;
    let trailN = 0;
    for (let i = 1; i < pts.length && trailN < budget.trail; i++) {
      const [x0, z0] = pts[i - 1];
      const [x1, z1] = pts[i];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      if (len < 0.5 || _forestW((x0 + x1) * 0.5, (z0 + z1) * 0.5) < 0.25) continue;
      const ux = dx / len;
      const uz = dz / len;
      const nx = -uz;
      const nz = ux;
      const steps = Math.max(1, Math.ceil(len / stepAlong));
      for (let s = 0; s <= steps && trailN < budget.trail; s++) {
        const t = s / steps;
        const cx = x0 + dx * t;
        const cz = z0 + dz * t;
        const fw = _forestW(cx, cz);
        if (fw < 0.25) continue;
        for (let side = -1; side <= 1 && trailN < budget.trail; side += 2) {
          const nSide = Math.min(perSideMax, 1 + (fw > 0.55 ? 1 : 0));
          for (let n = 0; n < nSide && trailN < budget.trail; n++) {
            const dist = 1.5 + rng() * 2.0;
            const px = cx + nx * side * dist + ux * (rng() - 0.5) * 0.45;
            const pz = cz + nz * side * dist + uz * (rng() - 0.5) * 0.45;
            const pick = _pickFrom(_TRAIL_BUILDERS, rng, fw);
            if (!_canPlaceTrailEdge(px, pz, pick.gap * 0.85, pick.tiny)) continue;
            _placeProp(px, pz, pick);
            trailN++;
          }
        }
        if (++sinceYield >= _buildYieldBatch(mobile)) {
          sinceYield = 0;
          await _buildYieldFrame();
        }
      }
    }

    // 2 — Scatter budget restant (builders légers)
    const scatterTarget = Math.max(0, budget.anchors - tracker.count);
    let attempts = 0;
    const maxAttempts = scatterTarget * 45;
    while (tracker.count < budget.anchors && attempts < maxAttempts) {
      attempts++;
      const sample = _sampleInForest(rng);
      if (!sample) continue;
      const { x, z, fw } = sample;
      const pick = _pickFrom(_LIGHT_SCATTER, rng, fw);
      if (!_canPlaceForestDecor(x, z, tracker, pick.gap, pick.tiny)) continue;
      _placeProp(x, z, pick);
      if (++sinceYield >= _buildYieldBatch(mobile)) {
        sinceYield = 0;
        await _buildYieldFrame();
      }
    }

    // 3 — Ancres fixes (subset tier)
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
      if (tracker.count >= budget.anchors + 12) break;
      if (!_canPlaceForestDecor(ax, az, tracker, 1.2, false)) continue;
      _placeProp(ax, az, { fn, gap: 1.2, tiny: false });
    }

    const chunkInstCount = _flushAllChunkInstBatches();

    // 4 — Litière instanciée (cap strict)
    const leafMat = FT().getLeafLitterMaterial?.();
    const rockMat = FT().getForestRockMaterial?.(17);
    const instRoot = new THREE.Group();
    instRoot.name = 'forestDecorInstanced';
    root.add(instRoot);
    await _yieldFrame();
    if (leafMat) {
      _scatterInstanced(instRoot, {
        geo: new THREE.BoxGeometry(0.035, 0.006, 0.025),
        mat: leafMat,
        count: budget.instLeaf,
        rng: _rng(88102),
        tracker,
        scaleFn: (r) => 0.55 + r() * 0.85,
        forestSector: true,
      });
    }
    await _yieldFrame();
    if (rockMat) {
      _scatterInstanced(instRoot, {
        geo: _GEO.pebble,
        mat: rockMat,
        count: budget.instRock,
        rng: _rng(77103),
        tracker,
        scaleFn: (r) => 0.5 + r() * 0.8,
        forestSector: true,
      });
    }
    await _yieldFrame();
    _scatterInstanced(instRoot, {
      geo: _GEO.acorn,
      mat: FT().getBarkMaterial?.(42) || rockMat,
      count: budget.instAcorn,
      rng: _rng(66104),
      tracker,
      scaleFn: (r) => 0.65 + r() * 0.55,
      forestSector: true,
    });

    _stripForestDecorShadows(root);
    const spawnX = ZS.SPAWN?.x ?? 248;
    const spawnZ = ZS.SPAWN?.z ?? -8;
    updateForestDecorVisibility(spawnX, spawnZ);

    const ms = Math.round(performance.now() - t0);
    const stats = {
      placed: tracker.count,
      trail: trailN,
      chunks: _decorChunks.size,
      chunkInst: chunkInstCount,
      ms,
      budget,
    };
    ZS.DevLog?.perf?.('forest-decor', ms, stats);
    ZS.DevLog?.trail?.('forest build', stats);
    ZS.LoadLog?.stepEnd?.('forest-decor-build', stats);
    requestAnimationFrame(() => {
      ZS.perfSnapshot?.({ label: 'post-forest-decor', traverse: true });
    });
    return stats;
  }

  function buildForestDecor(scene) {
    buildForestDecorAsync(scene);
  }

  /** @deprecated — alias scatter ; grille sectorielle retirée (perf). */
  async function buildForestSectorDecorAsync(scene) {
    return buildForestDecorAsync(scene);
  }

  /** @deprecated — intégré dans buildForestDecorAsync. */
  async function buildTrailCorridorDecorAsync(scene) {
    return buildForestDecorAsync(scene);
  }

  function finishForestDecorAsync(scene) {
    if (!scene) return Promise.resolve();
    return new Promise((resolve) => {
      const run = async () => {
        ZS.LoadLog?.mark?.('forest-decor-async-start');
        try {
          await buildForestDecorAsync(scene);
        } catch (e) {
          console.warn('[forest] decor deferred', e);
          ZS.LoadLog?.mark?.('forest-decor-async-error', { err: String(e?.message || e) });
        }
        resolve();
      };
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => { run(); }, { timeout: 3500 });
      } else {
        setTimeout(() => { run(); }, 48);
      }
    });
  }


window.ZS = window.ZS || {};
  ZS.buildForestDecor = buildForestDecor;
  ZS.buildForestDecorAsync = buildForestDecorAsync;
  ZS.buildForestSectorDecorAsync = buildForestSectorDecorAsync;
  ZS.buildTrailCorridorDecorAsync = buildTrailCorridorDecorAsync;
  ZS.finishForestDecorAsync = finishForestDecorAsync;
  ZS.updateForestDecorVisibility = updateForestDecorVisibility;
  ZS.distToSpawnTrail = _trailDist;
  ZS.S01_FOREST_DECOR_BOUNDS = S01_FOREST;

}());
