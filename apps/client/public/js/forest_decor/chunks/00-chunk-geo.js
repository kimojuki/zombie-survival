// Geo + chunks + visibilité — forest_decor.js
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

  const _DECOR_CHUNK = () => ZS.Engine?.CHUNK_SIZE ?? ZS.Engine?.ChunkStreamer?.CHUNK_SIZE ?? 64;
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
    ZS.Engine?.ChunkStreamer?.resetLayer?.('forest');
  }

  function _ensureForestChunkLayer() {
    const cs = _DECOR_CHUNK();
    ZS.Engine?.ChunkStreamer?.ensureLayer?.('forest', { chunkSize: cs });
  }

  function _syncForestInstVisibility() {
    if (!_forestDecorRoot) return;
    const inst = _forestDecorRoot.getObjectByName('forestDecorInstanced');
    if (!inst) return;
    let anyVisible = false;
    for (const { group } of _decorChunks.values()) {
      if (group.visible) { anyVisible = true; break; }
    }
    inst.visible = anyVisible;
  }

  function _chunkParent(root, x, z) {
    const cs = _DECOR_CHUNK();
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
      _ensureForestChunkLayer();
      ZS.Engine?.ChunkStreamer?.registerChunk?.('forest', key, { group: g, cx, cz });
    }
    return entry.group;
  }

  function _chunkBatchKey(x, z) {
    const cs = _DECOR_CHUNK();
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
    if (ZS.Engine?.ChunkStreamer) {
      if (_decorChunks.size) _syncForestInstVisibility();
      return;
    }
    if (!_decorChunks.size) return;
    if (++_visStride % 6 !== 0
        && Math.hypot(camX - _visCamX, camZ - _visCamZ) < 2.5) return;
    _visStride = 0;
    _visCamX = camX;
    _visCamZ = camZ;
    const cs = _DECOR_CHUNK();
    const visR = (ZS.Options?.getProfile?.()?.decorVisRadius ?? 130) + cs * 0.55;
    const visR2 = visR * visR;
    for (const { group, cx, cz } of _decorChunks.values()) {
      const dx = camX - cx;
      const dz = camZ - cz;
      group.visible = dx * dx + dz * dz <= visR2;
    }
    _syncForestInstVisibility();
  }
