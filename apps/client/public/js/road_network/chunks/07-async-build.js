// Build async + resnap — extrait de road_network.js (IIFE)
function _yieldRoadFrame() {
    return new Promise((resolve) => {
      // Post-spawn : ne pas attendre le paint (évite 12 s wall pour ~2 s CPU).
      if (_asyncRoadCfg) {
        setTimeout(resolve, 0);
        return;
      }
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });
  }

  /** Pré-remplit le cache hauteur le long du ruban (raycasts sync — skip si fastGround analytique). */
  function _prewarmRibbonGroundCache(edge, step, cols, skipDist, skipEnd, lift) {
    if (!_groundCache) return;
    if (_asyncRoadCfg && _asyncRoadCfgOrDefault().fastGround !== false) return;
    const pts = edge.pts;
    if (!pts || pts.length < 2) return;
    const baseW = edge.width;
    const skip = skipDist || 0;
    const skipE = skipEnd || 0;
    const total = edge.totalLen || _polylineLength(pts);
    const e = 0.32;
    for (const sample of _samplePolyline(pts, step)) {
      const along = sample.dist;
      if (along < skip - 0.02 || (skipE > 0 && along > total - skipE)) continue;
      const wMul = _taperMul(along, total, edge.taperStart, edge.taperEnd);
      if (wMul < 0.05) continue;
      const effW = baseW * wMul;
      const hw = effW / 2;
      const nx = -sample.uz;
      const nz = sample.ux;
      for (let c = 0; c <= cols; c++) {
        const off = -hw + effW * (c / cols);
        const px = sample.x + nx * off;
        const pz = sample.z + nz * off;
        _groundBaseFast(px, pz);
        _groundBaseFast(px + e, pz);
        _groundBaseFast(px - e, pz);
        _groundBaseFast(px, pz + e);
        _groundBaseFast(px, pz - e);
      }
    }
  }

  async function _buildRibbonAsync(scene, edge, mat, skipDist, skipEnd, yLift, renderOrder) {
    const pts = edge.pts;
    if (!pts || pts.length < 2) return;
    const cfg = _asyncRoadCfgOrDefault();
    const baseW = edge.width;
    const cols = cfg.cols ?? 4;
    const pos = []; const uv = []; const idx = [];
    let prevRow = -1;
    const tileLen = Math.max(baseW * 0.7, 3.5);
    const skip = skipDist || 0;
    const skipE = skipEnd || 0;
    const total = edge.totalLen || _polylineLength(pts);
    const lift = yLift != null ? yLift : RIBBON_LIFT;
    const order = renderOrder != null ? renderOrder : 2;
    const step = _ribbonStepForAsyncEdge(edge);
    _prewarmRibbonGroundCache(edge, step, cols, skip, skipE, lift);
    const samples = _samplePolyline(pts, step);
    const budgetMs = cfg.budgetMs ?? RIBBON_ASYNC_BUDGET_MS;
    const t0 = performance.now();
    let sliceStart = performance.now();
    for (const sample of samples) {
      const along = sample.dist;
      if (along < skip - 0.02) {
        prevRow = -1;
        continue;
      }
      if (skipE > 0 && along > total - skipE) {
        prevRow = -1;
        continue;
      }
      const wMul = _taperMul(along, total, edge.taperStart, edge.taperEnd);
      if (wMul < 0.05) {
        prevRow = -1;
        continue;
      }
      const effW = baseW * wMul;
      const hw = effW / 2;
      const nx = -sample.uz;
      const nz = sample.ux;
      const v = along / tileLen;
      const row = pos.length / 3;
      for (let c = 0; c <= cols; c++) {
        const u = c / cols;
        const off = -hw + effW * u;
        const px = sample.x + nx * off;
        const pz = sample.z + nz * off;
        const py = _roadVertexYForBuild(px, pz, lift);
        pos.push(px, py, pz);
        uv.push(u, v);
      }
      if (prevRow >= 0) {
        for (let c = 0; c < cols; c++) {
          const a = prevRow + c; const b = prevRow + c + 1;
          const d = row + c; const e = row + c + 1;
          idx.push(a, b, d, b, e, d);
        }
      }
      prevRow = row;
      if (performance.now() - sliceStart >= budgetMs) {
        await _yieldRoadFrame();
        sliceStart = performance.now();
      }
    }
    await _yieldRoadFrame();
    _pushMesh(scene, pos, uv, idx, mat, order, { skipNormals: true, roadLift: lift });
    const ms = Math.round(performance.now() - t0);
    if (ms >= 80 && ZS.LoadLog?.isEnabled?.()) {
      ZS.LoadLog.post('road-ribbon-slow', {
        id: edge.id,
        ms,
        samples: samples.length,
        pts: pts.length,
        step,
        cols,
      });
    }
  }

  async function _refineRoadMeshNormalsAsync(budgetMs) {
    let sliceStart = performance.now();
    for (const mesh of _meshes) {
      if (!mesh.userData?.roadNetwork || !mesh.geometry) continue;
      mesh.geometry.computeVertexNormals();
      if (performance.now() - sliceStart >= budgetMs) {
        await _yieldRoadFrame();
        sliceStart = performance.now();
      }
    }
  }

  /** Second passage vertices — grille plus fine, corrige trous / décalages. */
  async function _resnapRoadMeshesAsync(budgetMs) {
    const prevGrid = _groundCacheGrid;
    _groundCacheGrid = GROUND_CACHE_GRID_RESNAP;
    _groundCache?.clear?.();
    const t0 = performance.now();
    let sliceStart = performance.now();
    let verts = 0;
    for (const mesh of _meshes) {
      if (!mesh.userData?.roadNetwork) continue;
      const pos = mesh.geometry?.attributes?.position;
      if (!pos) continue;
      const lift = mesh.userData.roadLift ?? RIBBON_LIFT;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, _roadVertexYAsync(pos.getX(i), pos.getZ(i), lift));
        verts++;
        if (performance.now() - sliceStart >= budgetMs) {
          await _yieldRoadFrame();
          sliceStart = performance.now();
        }
      }
      pos.needsUpdate = true;
    }
    _groundCacheGrid = prevGrid;
    const ms = Math.round(performance.now() - t0);
    if (ms >= 40 && ZS.LoadLog?.isEnabled?.()) {
      ZS.LoadLog.post('road-resnap', { ms, verts, cacheSize: _groundCache?.size ?? 0 });
    }
  }

  async function _buildEdgeAsync(scene, e, M) {
    const cfg = _asyncRoadCfgOrDefault();
    const roadJoin = _findRoadJoinAtEnd(e);
    if (!e.visual && roadJoin && (e.type === 'trail' || e.type === 'dirt' || e.type === 'path')) {
      _buildTrailRoadJunction(scene, e, roadJoin, _matFor(e, M), _matFor(roadJoin.road, M));
      return;
    }
    if (!e.visual) return;
    const mat = _matFor(e, M);
    const clearing = _findLinkedClearing(e);
    if (clearing) {
      _buildCampTrailJunction(scene, clearing, e, mat);
      await _buildRibbonAsync(scene, e, mat, JUNCTION_MERGE, 0);
    } else if (roadJoin) {
      _buildTrailRoadJunction(scene, e, roadJoin, mat, _matFor(roadJoin.road, M));
      await _buildRibbonAsync(scene, e, mat, 0, JUNCTION_MERGE);
    } else if (e.type === 'asphalt') {
      const surfaceMat = e.broken ? M.roadBroken : M.road;
      if (!cfg.skipShoulder) {
        const shoulderMat = M.roadShoulder;
        const shoulderW = e.width + 1.1;
        await _buildRibbonAsync(scene, { ...e, width: shoulderW }, shoulderMat, 0, 0, RIBBON_LIFT - 0.03, 1);
      }
      await _buildRibbonAsync(scene, e, surfaceMat, 0, 0, RIBBON_LIFT, 2);
      if (!cfg.deferLaneOverlay && !cfg.skipLaneOverlay) {
        await _yieldRoadFrame();
        _buildLaneOverlay(scene, e, M);
      }
      if (!cfg.deferBarriers && !cfg.skipBarriers) {
        await _yieldRoadFrame();
        await _buildBarriersAsync(scene, e, M);
      }
    } else {
      await _buildRibbonAsync(scene, e, mat, 0, 0);
    }
  }

  async function _buildDeferredRoadDetailsAsync(scene, M, cfg) {
    const LL = ZS.LoadLog;
    if (cfg.deferLaneOverlay && !cfg.skipLaneOverlay) {
      LL?.mark?.('road-meshes-lanes-start');
      const t0 = performance.now();
      for (const e of _resolved) {
        if (e.type !== 'asphalt' || !e.line) continue;
        await _yieldRoadFrame();
        await _buildLaneOverlayAsync(scene, e, M);
      }
      LL?.mark?.('road-meshes-lanes-done', { ms: Math.round(performance.now() - t0) });
    }
    if (cfg.deferBarriers && !cfg.skipBarriers) {
      LL?.mark?.('road-meshes-barriers-start');
      const t0 = performance.now();
      for (const e of _resolved) {
        if (e.type !== 'asphalt' || !e.barriers) continue;
        await _yieldRoadFrame();
        await _buildBarriersAsync(scene, e, M);
      }
      LL?.mark?.('road-meshes-barriers-done', { ms: Math.round(performance.now() - t0) });
    }
  }

  async function buildMeshesAsync(scene, M, opts = {}) {
    if (!_ready) resolve();
    if (!scene || !M) return;
    const LL = ZS.LoadLog;
    const mobile = !!ZS._isMobile;
    _asyncRoadCfg = {
      ribbonStep: opts.ribbonStep ?? RIBBON_STEP_ASYNC_DEFAULT,
      budgetMs: opts.budgetMs ?? (mobile ? 14 : 28),
      cols: opts.cols ?? (mobile ? 3 : 4),
      skipShoulder: !!opts.skipShoulder,
      skipLaneOverlay: !!opts.skipLaneOverlay,
      skipBarriers: !!opts.skipBarriers,
      deferLaneOverlay: opts.deferLaneOverlay === true,
      deferBarriers: opts.deferBarriers === true,
      laneStep: opts.laneStep ?? 0.55,
      fastGround: opts.fastGround !== false,
      resnapMeshes: opts.resnapMeshes === true,
      refineNormals: opts.refineNormals !== false,
    };
    if (typeof window !== 'undefined') window.ZS._roadsPostSpawnBusy = true;
    _beginRoadChunkBuild(scene);
    _groundCache = new Map();
    _groundCacheGrid = GROUND_CACHE_GRID;
    const t0 = performance.now();
    const total = _resolved.length;
    LL?.stepStart?.('road-meshes-build', { edges: total, async: true, cfg: { ..._asyncRoadCfg } });
    try {
      let n = 0;
      for (const e of _resolved) {
        n++;
        const tEdge = performance.now();
        await _buildEdgeAsync(scene, e, M);
        const edgeMs = Math.round(performance.now() - tEdge);
        if (LL?.isEnabled?.()) {
          LL.mark('road-meshes-progress', {
            done: n,
            total,
            ms: Math.round(performance.now() - t0),
            edgeMs,
            id: e.id,
            type: e.type,
            pts: e.pts?.length ?? 0,
            step: _ribbonStepForAsyncEdge(e),
          });
        }
        if (edgeMs >= 200) {
          LL?.post?.('road-edge-slow', { id: e.id, type: e.type, edgeMs, pts: e.pts?.length ?? 0 });
        }
        await _yieldRoadFrame();
      }
      await _buildDeferredRoadDetailsAsync(scene, M, _asyncRoadCfg);
      if (_asyncRoadCfg.resnapMeshes) {
        LL?.mark?.('road-meshes-resnap-start');
        await _resnapRoadMeshesAsync(_asyncRoadCfg.budgetMs ?? RIBBON_ASYNC_BUDGET_MS);
        LL?.mark?.('road-meshes-resnap-done', { cacheSize: _groundCache?.size ?? 0 });
      }
      if (_asyncRoadCfg.refineNormals) {
        await _refineRoadMeshNormalsAsync(_asyncRoadCfg.budgetMs ?? RIBBON_ASYNC_BUDGET_MS);
      }
      LL?.stepEnd?.('road-meshes-build', {
        edges: total,
        ms: Math.round(performance.now() - t0),
        async: true,
        cfg: { ..._asyncRoadCfg },
        roadChunks: _roadChunks.size,
      });
      _registerRoadChunksWithStreamer();
    } finally {
      _asyncRoadCfg = null;
      _groundCache = null;
      if (typeof window !== 'undefined') window.ZS._roadsPostSpawnBusy = false;
    }
  }
