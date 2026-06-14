// Ruban sync + asphalte — extrait de road_network.js (IIFE)
function _buildLaneOverlay(scene, edge, M) {
    if (!edge.line || edge.type !== 'asphalt') return;
    const lineMat = M.roadLine;
    if (!lineMat) return;

    const lineW = 0.24;
    const lift = RIBBON_LIFT + 0.028;
    const pos = [], idx = [];
    let prev = -1;

    for (let si = 0; si < edge.pts.length - 1; si++) {
      const [x0, z0] = edge.pts[si], [x1, z1] = edge.pts[si + 1];
      const sdx = x1 - x0, sdz = z1 - z0;
      const sLen = Math.hypot(sdx, sdz);
      if (sLen < 0.01) continue;
      const ux = sdx / sLen, uz = sdz / sLen;
      const nx = -uz, nz = ux;
      const hw = lineW * 0.5;
      const steps = Math.max(1, Math.ceil(sLen / RIBBON_STEP));

      for (let i = (si === 0 ? 0 : 1); i <= steps; i++) {
        const t = i / steps;
        const cx = x0 + sdx * t, cz = z0 + sdz * t;
        const cy = _roadVertexY(cx, cz, lift);
        const row = pos.length / 3;
        pos.push(
          cx + nx * (-hw), cy, cz + nz * (-hw),
          cx + nx * hw, cy, cz + nz * hw,
        );
        if (prev >= 0) {
          idx.push(prev, prev + 1, row, prev + 1, row + 1, row);
        }
        prev = row;
      }
    }

    if (pos.length < 6) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, lineMat);
    mesh.renderOrder = 3;
    mesh.userData.roadNetwork = true;
    const c = _centroidFromBuffer(geo.attributes.position);
    _addRoadMeshToScene(scene, mesh, c.x, c.z);
  }

  async function _buildLaneOverlayAsync(scene, edge, M) {
    if (!edge.line || edge.type !== 'asphalt') return;
    const lineMat = M.roadLine;
    if (!lineMat) return;

    const cfg = _asyncRoadCfgOrDefault();
    const lineW = 0.24;
    const lift = RIBBON_LIFT + 0.028;
    const lineStep = cfg.laneStep ?? Math.max(cfg.ribbonStep || 0.5, 0.55);
    const budgetMs = cfg.budgetMs ?? RIBBON_ASYNC_BUDGET_MS;
    const pos = [], idx = [];
    let prev = -1;
    let sliceStart = performance.now();

    for (let si = 0; si < edge.pts.length - 1; si++) {
      const [x0, z0] = edge.pts[si], [x1, z1] = edge.pts[si + 1];
      const sdx = x1 - x0, sdz = z1 - z0;
      const sLen = Math.hypot(sdx, sdz);
      if (sLen < 0.01) continue;
      const ux = sdx / sLen, uz = sdz / sLen;
      const nx = -uz, nz = ux;
      const hw = lineW * 0.5;
      const steps = Math.max(1, Math.ceil(sLen / lineStep));

      for (let i = (si === 0 ? 0 : 1); i <= steps; i++) {
        const t = i / steps;
        const cx = x0 + sdx * t, cz = z0 + sdz * t;
        const cy = _roadVertexYForBuild(cx, cz, lift);
        const row = pos.length / 3;
        pos.push(
          cx + nx * (-hw), cy, cz + nz * (-hw),
          cx + nx * hw, cy, cz + nz * hw,
        );
        if (prev >= 0) {
          idx.push(prev, prev + 1, row, prev + 1, row + 1, row);
        }
        prev = row;
        if (performance.now() - sliceStart >= budgetMs) {
          await _yieldRoadFrame();
          sliceStart = performance.now();
        }
      }
    }

    if (pos.length < 6) return;
    await _yieldRoadFrame();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const n = pos.length / 3;
    const nor = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) nor[i * 3 + 1] = 1;
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const mesh = new THREE.Mesh(geo, lineMat);
    mesh.renderOrder = 3;
    mesh.userData.roadNetwork = true;
    const c = _centroidFromBuffer(geo.attributes.position);
    _addRoadMeshToScene(scene, mesh, c.x, c.z);
  }

  function _buildAsphaltRoad(scene, edge, M) {
    const surfaceMat = edge.broken ? M.roadBroken : M.road;
    const shoulderMat = M.roadShoulder;
    const shoulderW = edge.width + 1.1;
    _buildRibbon(scene, { ...edge, width: shoulderW }, shoulderMat, 0, 0, RIBBON_LIFT - 0.03, 1);
    _buildRibbon(scene, edge, surfaceMat, 0, 0, RIBBON_LIFT, 2);
    _buildLaneOverlay(scene, edge, M);
    _buildBarriers(scene, edge, M);
  }

  function _buildRibbon(scene, edge, mat, skipDist, skipEnd, yLift, renderOrder) {
    const pts = edge.pts;
    if (!pts || pts.length < 2) return;
    const baseW = edge.width;
    const cols = 6;
    const pos = [], uv = [], idx = [];
    let prevRow = -1;
    const tileLen = Math.max(baseW * 0.7, 3.5);
    const skip = skipDist || 0;
    const skipE = skipEnd || 0;
    const total = edge.totalLen || _polylineLength(pts);
    const lift = yLift != null ? yLift : RIBBON_LIFT;
    const order = renderOrder != null ? renderOrder : 2;

    const samples = _samplePolyline(pts, RIBBON_STEP);
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
        const py = _roadVertexY(px, pz, lift);
        pos.push(px, py, pz);
        uv.push(u, v);
      }

      if (prevRow >= 0) {
        for (let c = 0; c < cols; c++) {
          const a = prevRow + c, b = prevRow + c + 1;
          const d = row + c, e = row + c + 1;
          idx.push(a, b, d, b, e, d);
        }
      }
      prevRow = row;
    }

    _pushMesh(scene, pos, uv, idx, mat, order);
  }
