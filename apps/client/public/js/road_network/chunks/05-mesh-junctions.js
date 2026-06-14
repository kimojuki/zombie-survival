// Meshes jonctions + barrières — extrait de road_network.js (IIFE)
function _buildClearingDisc(scene, c, mat, exitCone) {
    const rings = 5;
    const segs = 56;
    const pos = [], uv = [], idx = [];
    const lift = RIBBON_LIFT - 0.01;

    for (let r = 0; r <= rings; r++) {
      const rf = r / rings;
      const row = pos.length / 3;
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        const px = c.cx + Math.cos(a) * c.rx * rf;
        const pz = c.cz + Math.sin(a) * c.rz * rf;
        const py = _roadVertexY(px, pz, lift * (1 - rf * 0.35));
        pos.push(px, py, pz);
        uv.push(rf, s / segs);
      }
      if (r > 0) {
        const prev = row - segs;
        for (let s = 0; s < segs; s++) {
          const s1 = (s + 1) % segs;
          const a0 = (s / segs) * Math.PI * 2;
          const a1 = (s1 / segs) * Math.PI * 2;
          if (exitCone && rf > 0.72 && (_inExitCone(a0, exitCone) || _inExitCone(a1, exitCone))) {
            continue;
          }
          const a = prev + s, b = prev + s1, d = row + s, e = row + s1;
          idx.push(a, b, d, b, e, d);
        }
      }
    }

    _pushMesh(scene, pos, uv, idx, mat, 1);
  }

  /** Patch éventail : arc elliptique → 1ère section du sentier */
  function _buildCampTrailJunction(scene, clearing, edge, mat) {
    const pts = edge.pts;
    const [x0, z0] = pts[0], [x1, z1] = pts[1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.01) return;
    const ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    const nx = -uz, nz = ux;
    const hw = edge.width * 0.5;
    const lift = RIBBON_LIFT - 0.01;
    const cols = JUNCTION_ARC_STEPS;

    const aL = _ellipseAngle(clearing, x0 + nx * (-hw), z0 + nz * (-hw));
    const aR = _ellipseAngle(clearing, x0 + nx * hw, z0 + nz * hw);
    const arcAngles = _interpArcAngles(aL, aR, cols);

    const pos = [], uv = [], idx = [];
    const tip = _pointOnEllipse(clearing, _ellipseAngle(clearing, x0, z0), 1);
    const tipY = _roadVertexY(tip[0], tip[1], lift);
    pos.push(tip[0], tipY, tip[1]);
    uv.push(0.5, 0);

    for (let i = 0; i < arcAngles.length; i++) {
      const [px, pz] = _pointOnEllipse(clearing, arcAngles[i], 1);
      pos.push(px, _roadVertexY(px, pz, lift), pz);
      uv.push(i / cols, 0.35);
    }

    const mx = x0 + ux * JUNCTION_MERGE;
    const mz = z0 + uz * JUNCTION_MERGE;
    const trailRow = pos.length / 3;
    for (let c = 0; c <= cols; c++) {
      const off = -hw + edge.width * (c / cols);
      const px = mx + nx * off;
      const pz = mz + nz * off;
      pos.push(px, _roadVertexY(px, pz, lift), pz);
      uv.push(c / cols, 1);
    }

    for (let i = 0; i < cols; i++) {
      idx.push(0, i + 1, i + 2);
    }

    for (let i = 0; i < cols; i++) {
      const a = i + 1;
      const b = i + 2;
      const d = trailRow + i;
      const e = trailRow + i + 1;
      idx.push(a, b, d, b, e, d);
    }

    _pushMesh(scene, pos, uv, idx, mat, 1);
  }

  /** Jonction sentier → ouverture sur route asphaltée (bouche = point le plus proche). */
  function _buildTrailRoadJunction(scene, trail, join, trailMat, roadMat) {
    const mouthX = join.trailX != null ? join.trailX : trail.pts[trail.pts.length - 1][0];
    const mouthZ = join.trailZ != null ? join.trailZ : trail.pts[trail.pts.length - 1][1];
    const tux = join.trailUx != null ? join.trailUx : (() => {
      const n = trail.pts.length;
      const [x0, z0] = trail.pts[n - 1], [x1, z1] = trail.pts[n - 2];
      const len = Math.hypot(x0 - x1, z0 - z1) || 1;
      return (x0 - x1) / len;
    })();
    const tuz = join.trailUz != null ? join.trailUz : (() => {
      const n = trail.pts.length;
      const [x0, z0] = trail.pts[n - 1], [x1, z1] = trail.pts[n - 2];
      const len = Math.hypot(x0 - x1, z0 - z1) || 1;
      return (z0 - z1) / len;
    })();
    const tnx = -tuz, tnz = tux;
    const hw = trail.width * 0.5;
    const lift = RIBBON_LIFT - 0.01;
    const cols = JUNCTION_ARC_STEPS;
    const road = join.road;
    const roadHw = road.width * 0.5;
    const rux = join.ux, ruz = join.uz;
    const rnx = -ruz, rnz = rux;

    const backX = mouthX - tux * 2.4;
    const backZ = mouthZ - tuz * 2.4;
    const rcx = join.x, rcz = join.z;

    const toRoadX = rcx - mouthX, toRoadZ = rcz - mouthZ;
    const shoulder = (toRoadX * rnx + toRoadZ * rnz) >= 0 ? 1 : -1;
    const openX = rcx + rnx * roadHw * 0.62 * shoulder;
    const openZ = rcz + rnz * roadHw * 0.62 * shoulder;

    function _h(x, z, decor) {
      if (decor) return _roadVertexY(x, z, lift);
      return _roadVertexY(x, z, lift + 0.012);
    }

    const pos = [], uv = [], idx = [];
    const rows = [
      { cx: backX, cz: backZ, ux: tux, uz: tuz, w: trail.width, decor: true, v: 0 },
      { cx: mouthX, cz: mouthZ, ux: tux, uz: tuz, w: trail.width * 1.08, decor: true, v: 0.45 },
      { cx: openX, cz: openZ, ux: rux, uz: ruz, w: road.width * 0.72, decor: false, v: 1 },
    ];

    for (const row of rows) {
      const nx = -row.uz, nz = row.ux;
      const rowIdx = pos.length / 3;
      const half = row.w * 0.5;
      for (let c = 0; c <= cols; c++) {
        const u = c / cols;
        const off = -half + row.w * u;
        const px = row.cx + nx * off;
        const pz = row.cz + nz * off;
        const py = _h(px, pz, row.decor) + (row.decor ? 0 : 0.012);
        pos.push(px, py, pz);
        uv.push(u, row.v);
      }
      if (rowIdx > 0) {
        const prev = rowIdx - (cols + 1);
        for (let c = 0; c < cols; c++) {
          const a = prev + c, b = prev + c + 1;
          const d = rowIdx + c, e = rowIdx + c + 1;
          idx.push(a, b, d, b, e, d);
        }
      }
    }

    _pushMesh(scene, pos, uv, idx, trailMat, 2);
  }

  function _inBarrierGap(x, z) {
    for (const g of _barrierGaps) {
      if (Math.hypot(x - g.x, z - g.z) < g.r) return true;
    }
    return false;
  }

  function _barrierPointAt(pts, cum, dist) {
    const totalLen = cum[cum.length - 1];
    const d = Math.max(0, Math.min(totalLen, dist));
    for (let i = 1; i < pts.length; i++) {
      const segLen = cum[i] - cum[i - 1];
      if (segLen < 0.0001) continue;
      if (d <= cum[i] || i === pts.length - 1) {
        const f = (d - cum[i - 1]) / segLen;
        const x0 = pts[i - 1][0], z0 = pts[i - 1][1];
        const x1 = pts[i][0], z1 = pts[i][1];
        return {
          x: x0 + (x1 - x0) * f,
          z: z0 + (z1 - z0) * f,
          tx: (x1 - x0) / segLen,
          tz: (z1 - z0) / segLen,
        };
      }
    }
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const segLen = Math.hypot(last[0] - prev[0], last[1] - prev[1]) || 1;
    return {
      x: last[0], z: last[1],
      tx: (last[0] - prev[0]) / segLen,
      tz: (last[1] - prev[1]) / segLen,
    };
  }

  function _buildBarriers(scene, edge, _M) {
    if (!edge.barriers || edge.type !== 'asphalt') return;
    if (ZS.BarrierPrefabs?.buildRoadBarriers) {
      ZS.BarrierPrefabs.buildRoadBarriers(scene, edge, {
        offset: BARRIER_OFFSET,
        step: BARRIER_STEP,
        inGap: _inBarrierGap,
      });
    }
  }

  async function _buildBarriersAsync(scene, edge, _M) {
    if (!edge.barriers || edge.type !== 'asphalt') return;
    const cfg = _asyncRoadCfgOrDefault();
    const common = {
      offset: BARRIER_OFFSET,
      step: BARRIER_STEP,
      inGap: _inBarrierGap,
      budgetMs: cfg.budgetMs ?? 12,
      yieldFn: _yieldRoadFrame,
    };
    if (ZS.BarrierPrefabs?.buildRoadBarriersAsync) {
      await ZS.BarrierPrefabs.buildRoadBarriersAsync(scene, edge, common);
    } else {
      _buildBarriers(scene, edge, _M);
    }
  }
