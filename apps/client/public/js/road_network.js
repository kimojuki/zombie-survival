// Road network — spawn polish : disque clairière + sentier lissé
(function () {
  'use strict';

  const SNAP_RADIUS = 1.0;
  const RIBBON_LIFT = 0.07;
  const RIBBON_STEP = 0.32;
  const JUNCTION_MERGE = 0.42;
  const JUNCTION_ARC_STEPS = 12;

  const SHOULDER = { clearing: 0.5, dirt: 1.0, path: 0.8, asphalt: 2.8 };
  const BLEND    = { clearing: 4.0, dirt: 5.0, path: 4.0, asphalt: 6.5 };
  const QUERY_PAD = { clearing: 0.3, dirt: 0.6, path: 0.5, asphalt: 1.2 };
  const BARRIER_OFFSET = 0.55;
  const BARRIER_STEP = 2.6;

  const _raw = [];
  const _clearings = [];
  const _resolved = [];
  const _barrierGaps = [];
  let _ready = false;
  let _edgeId = 0;

  function _smoothstep(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  function _chaikin(pts, passes) {
    let result = pts.map(p => [p[0], p[1]]);
    for (let pass = 0; pass < passes; pass++) {
      if (result.length < 2) break;
      const next = [[result[0][0], result[0][1]]];
      for (let i = 0; i < result.length - 1; i++) {
        const [x0, z0] = result[i], [x1, z1] = result[i + 1];
        next.push([0.75 * x0 + 0.25 * x1, 0.75 * z0 + 0.25 * z1]);
        next.push([0.25 * x0 + 0.75 * x1, 0.25 * z0 + 0.75 * z1]);
      }
      next.push([result[result.length - 1][0], result[result.length - 1][1]]);
      result = next;
    }
    return result;
  }

  function _dedupe(pts, minDist) {
    if (!pts.length) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const last = out[out.length - 1];
      if (Math.hypot(pts[i][0] - last[0], pts[i][1] - last[1]) >= minDist) out.push(pts[i]);
    }
    return out;
  }

  function _snapKey(x, z) {
    return `${Math.round(x / SNAP_RADIUS) * SNAP_RADIUS},${Math.round(z / SNAP_RADIUS) * SNAP_RADIUS}`;
  }

  function defineClearing(def) {
    if (!def || def.cx == null || def.cz == null) return null;
    const c = {
      id: def.id || `clearing_${_clearings.length}`,
      cx: Number(def.cx),
      cz: Number(def.cz),
      rx: def.rx || def.radius || 5.5,
      rz: def.rz || def.radius || def.rx || 5.5,
      blend: def.blend || 4,
      type: def.type || 'clearing',
      visual: def.visual !== false,
    };
    _clearings.push(c);
    _ready = false;
    return c.id;
  }

  function defineEdge(def) {
    if (!def || !Array.isArray(def.pts) || def.pts.length < 2) return null;
    const edge = {
      id: def.id || `edge_${_edgeId++}`,
      pts: def.pts.map(p => [Number(p[0]) || 0, Number(p[1]) || 0]),
      width: def.width || 3,
      type: def.type || 'dirt',
      visual: def.visual !== false,
      smooth: def.smooth !== false,
      taperStart: def.taperStart || 0,
      taperEnd: def.taperEnd || 0,
      line: !!def.line,
      broken: !!def.broken,
      barriers: def.barriers !== false,
    };
    _raw.push(edge);
    _ready = false;
    return edge.id;
  }

  function _nearestOnEdge(edge, x, z) {
    let best = null;
    for (let i = 0; i < edge.pts.length - 1; i++) {
      const [x0, z0] = edge.pts[i], [x1, z1] = edge.pts[i + 1];
      const dx = x1 - x0, dz = z1 - z0;
      const len2 = dx * dx + dz * dz;
      if (len2 < 1e-8) continue;
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2));
      const px = x0 + dx * t, pz = z0 + dz * t;
      const dist = Math.hypot(x - px, z - pz);
      if (!best || dist < best.dist) {
        best = {
          dist, x: px, z: pz,
          ux: dx / Math.sqrt(len2), uz: dz / Math.sqrt(len2),
          segIdx: i, t,
        };
      }
    }
    return best;
  }

  function _findRoadJoinAtEnd(trail) {
    if (!trail.pts || trail.pts.length < 2) return null;
    const [ex, ez] = trail.pts[trail.pts.length - 1];
    for (const road of _resolved) {
      if (road.type !== 'asphalt' || road.id === trail.id) continue;
      const hit = _nearestOnEdge(road, ex, ez);
      if (hit && hit.dist < road.width * 0.65 + 2.5) {
        return { road, x: hit.x, z: hit.z, ux: hit.ux, uz: hit.uz, dist: hit.dist };
      }
    }
    return null;
  }

  function _taperMul(dist, total, taperStart, taperEnd) {
    let mul = 1;
    if (taperStart > 0 && dist < taperStart) mul = dist / taperStart;
    if (taperEnd > 0 && dist > total - taperEnd) mul = Math.min(mul, (total - dist) / taperEnd);
    return _smoothstep(mul);
  }

  function resolve() {
    const buckets = new Map();
    for (const e of _raw) {
      for (const i of [0, e.pts.length - 1]) {
        const [x, z] = e.pts[i];
        const key = _snapKey(x, z);
        if (!buckets.has(key)) buckets.set(key, { xs: [], zs: [] });
        buckets.get(key).xs.push(x);
        buckets.get(key).zs.push(z);
      }
    }
    const snapAt = new Map();
    for (const [key, b] of buckets) {
      if (b.xs.length < 2) continue;
      const n = b.xs.length;
      snapAt.set(key, [
        b.xs.reduce((a, v) => a + v, 0) / n,
        b.zs.reduce((a, v) => a + v, 0) / n,
      ]);
    }

    _resolved.length = 0;
    for (const e of _raw) {
      let pts = e.pts.map(p => p.slice());
      if (e.smooth && pts.length >= 3) {
        pts = _dedupe(_chaikin(pts, 1), 0.12);
      }
      const k0 = _snapKey(pts[0][0], pts[0][1]);
      const k1 = _snapKey(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      if (snapAt.has(k0)) pts[0] = snapAt.get(k0).slice();
      if (snapAt.has(k1)) pts[pts.length - 1] = snapAt.get(k1).slice();

      let totalLen = 0;
      for (let i = 1; i < pts.length; i++) {
        totalLen += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      }
      _resolved.push({
        id: e.id, pts, width: e.width, type: e.type, visual: e.visual,
        taperStart: e.taperStart, taperEnd: e.taperEnd, totalLen,
        line: e.line, broken: e.broken, barriers: e.barriers,
      });
    }

    _barrierGaps.length = 0;
    for (const trail of _resolved) {
      if (trail.type === 'dirt' || trail.type === 'path') {
        const join = _findRoadJoinAtEnd(trail);
        if (join) {
          _barrierGaps.push({ x: join.x, z: join.z, r: 7.5 });
        }
      }
    }

    const trail = _resolved.find(ed => ed.id === 'spawn_trail');
    if (trail && window.ZS) {
      ZS.SPAWN_TRAIL_PTS = trail.pts.map(p => p.slice());
    }
    _ready = true;
  }

  function applyFlattening() {
    if (!_ready) resolve();
    if (ZS.registerClearingDisc) {
      for (const c of _clearings) {
        ZS.registerClearingDisc(c.cx, c.cz, c.rx, c.rz, c.blend);
      }
    }
    if (ZS.registerRoadCorridor) {
      for (const e of _resolved) {
        const halfW = e.width * 0.5 + (SHOULDER[e.type] || 1);
        ZS.registerRoadCorridor(e.pts, halfW, BLEND[e.type] || 4);
        const linked = _findLinkedClearing(e);
        if (linked && e.pts.length >= 2) {
          const [x0, z0] = e.pts[0], [x1, z1] = e.pts[1];
          const sl = Math.hypot(x1 - x0, z1 - z0) || 1;
          const mx = x0 + ((x1 - x0) / sl) * JUNCTION_MERGE;
          const mz = z0 + ((z1 - z0) / sl) * JUNCTION_MERGE;
          ZS.registerRoadCorridor([[x0, z0], [mx, mz]], halfW + 0.4, BLEND[e.type] || 4);
        }
        const roadJoin = _findRoadJoinAtEnd(e);
        if (roadJoin && e.pts.length >= 2) {
          const n = e.pts.length;
          const [x0, z0] = e.pts[n - 1], [x1, z1] = e.pts[n - 2];
          const sl = Math.hypot(x0 - x1, z0 - z1) || 1;
          const mx = x0 - ((x0 - x1) / sl) * JUNCTION_MERGE;
          const mz = z0 - ((z0 - z1) / sl) * JUNCTION_MERGE;
          ZS.registerRoadCorridor([[mx, mz], [x0, z0]], halfW + 0.5, BLEND[e.type] || 4);
        }
      }
    }
    if (ZS.finalizeRoadNetwork) ZS.finalizeRoadNetwork();
  }

  function _normClearingDist(x, z, c) {
    return Math.hypot((x - c.cx) / c.rx, (z - c.cz) / c.rz);
  }

  function _distSeg(x, z, x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-8) return Math.hypot(x - x0, z - z0);
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2));
    return Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t));
  }

  function isNearRoad(x, z, margin) {
    if (!_ready) resolve();
    const m = margin || 0;
    for (const e of _resolved) {
      const hw = e.width * 0.5 + (QUERY_PAD[e.type] || 0.6) + m;
      for (let i = 0; i < e.pts.length - 1; i++) {
        if (_distSeg(x, z, e.pts[i][0], e.pts[i][1], e.pts[i + 1][0], e.pts[i + 1][1]) <= hw) {
          return true;
        }
      }
    }
    return false;
  }

  function sampleAlong(edgeId, t) {
    if (!_ready) resolve();
    const e = _resolved.find(ed => ed.id === edgeId);
    if (!e || e.totalLen <= 0) return null;
    const dist = Math.max(0, Math.min(1, t)) * e.totalLen;
    let acc = 0;
    for (let i = 0; i < e.pts.length - 1; i++) {
      const [x0, z0] = e.pts[i], [x1, z1] = e.pts[i + 1];
      const dx = x1 - x0, dz = z1 - z0;
      const segLen = Math.hypot(dx, dz);
      if (segLen < 0.01) continue;
      if (acc + segLen >= dist || i === e.pts.length - 2) {
        const f = segLen > 0 ? Math.min(1, (dist - acc) / segLen) : 0;
        return { x: x0 + dx * f, z: z0 + dz * f, ux: dx / segLen, uz: dz / segLen };
      }
      acc += segLen;
    }
    const last = e.pts[e.pts.length - 1];
    return { x: last[0], z: last[1], ux: 0, uz: 1 };
  }

  function getResolvedEdges() {
    if (!_ready) resolve();
    return _resolved.map(e => ({ id: e.id, pts: e.pts.map(p => p.slice()), width: e.width, type: e.type }));
  }

  function _matFor(edge, M) {
    if (edge.type === 'clearing') return M.path || M.roadDirt;
    if (edge.type === 'dirt' || edge.type === 'path') return M.roadDirt || M.path;
    return M.road;
  }

  function _ellipseAngle(c, x, z) {
    return Math.atan2((z - c.cz) / c.rz, (x - c.cx) / c.rx);
  }

  function _pointOnEllipse(c, angle, rf) {
    const f = rf == null ? 1 : rf;
    return [
      c.cx + Math.cos(angle) * c.rx * f,
      c.cz + Math.sin(angle) * c.rz * f,
    ];
  }

  function _interpArcAngles(aL, aR, steps) {
    let left = aL, right = aR;
    let span = right - left;
    if (span < 0) span += Math.PI * 2;
    if (span > Math.PI) {
      const t = left; left = right; right = t;
      span = Math.PI * 2 - span;
    }
    const out = [];
    for (let i = 0; i <= steps; i++) {
      out.push(left + (span * i) / steps);
    }
    return out;
  }

  function _findLinkedClearing(edge) {
    if (!edge.pts || edge.pts.length < 2) return null;
    const [x, z] = edge.pts[0];
    for (const c of _clearings) {
      const nd = _normClearingDist(x, z, c);
      if (nd >= 0.88 && nd <= 1.12) return c;
    }
    return null;
  }

  function _exitCone(clearing, edge) {
    const [x0, z0] = edge.pts[0];
    const [x1, z1] = edge.pts[1];
    const len = Math.hypot(x1 - x0, z1 - z0) || 1;
    const nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
    const hw = edge.width * 0.5 + 0.35;
    const aL = _ellipseAngle(clearing, x0 + nx * (-hw), z0 + nz * (-hw));
    const aR = _ellipseAngle(clearing, x0 + nx * hw, z0 + nz * hw);
    const center = _ellipseAngle(clearing, x0, z0);
    return { aL, aR, center, pad: 0.12 };
  }

  function _inExitCone(angle, cone) {
    let a = angle, s = cone.aL - cone.pad, e = cone.aR + cone.pad;
    while (a < s) a += Math.PI * 2;
    while (e < s) e += Math.PI * 2;
    return a >= s && a <= e;
  }

  function _pushMesh(scene, pos, uv, idx, mat, renderOrder) {
    if (pos.length < 9) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (uv.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = renderOrder;
    scene.add(mesh);
  }

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
        const py = ZS.getTerrainHeight(px, pz) + lift * (1 - rf * 0.35);
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
    const tipY = ZS.getTerrainHeight(tip[0], tip[1]) + lift;
    pos.push(tip[0], tipY, tip[1]);
    uv.push(0.5, 0);

    for (let i = 0; i < arcAngles.length; i++) {
      const [px, pz] = _pointOnEllipse(clearing, arcAngles[i], 1);
      pos.push(px, ZS.getTerrainHeight(px, pz) + lift, pz);
      uv.push(i / cols, 0.35);
    }

    const mx = x0 + ux * JUNCTION_MERGE;
    const mz = z0 + uz * JUNCTION_MERGE;
    const trailRow = pos.length / 3;
    for (let c = 0; c <= cols; c++) {
      const off = -hw + edge.width * (c / cols);
      const px = mx + nx * off;
      const pz = mz + nz * off;
      pos.push(px, ZS.getTerrainHeight(px, pz) + lift, pz);
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

  /** Jonction sentier → ouverture sur route asphaltée */
  function _buildTrailRoadJunction(scene, trail, join, trailMat, roadMat) {
    const pts = trail.pts;
    const n = pts.length;
    const [x0, z0] = pts[n - 1], [x1, z1] = pts[n - 2];
    const len = Math.hypot(x0 - x1, z0 - z1) || 1;
    const ux = (x0 - x1) / len, uz = (z0 - z1) / len;
    const nx = -uz, nz = ux;
    const hw = trail.width * 0.5;
    const lift = RIBBON_LIFT - 0.01;
    const cols = JUNCTION_ARC_STEPS;
    const road = join.road;
    const roadHw = road.width * 0.5;

    const mergeX = x0 - ux * JUNCTION_MERGE * 0.5;
    const mergeZ = z0 - uz * JUNCTION_MERGE * 0.5;

    const pos = [], uv = [], idx = [];
    const trailRow = 0;
    for (let c = 0; c <= cols; c++) {
      const off = -hw + trail.width * (c / cols);
      const px = mergeX + nx * off;
      const pz = mergeZ + nz * off;
      pos.push(px, ZS.getTerrainHeight(px, pz) + lift, pz);
      uv.push(c / cols, 0);
    }

    const roadRow = pos.length / 3;
    const rcx = join.x, rcz = join.z;
    const rnx = -join.uz, rnz = join.ux;
    for (let c = 0; c <= cols; c++) {
      const t = c / cols;
      const off = -roadHw * 0.85 + roadHw * 1.7 * t;
      const px = rcx + rnx * off;
      const pz = rcz + rnz * off;
      pos.push(px, ZS.getTerrainHeight(px, pz) + lift + 0.01, pz);
      uv.push(t, 1);
    }

    const hub = pos.length / 3;
    const openX = rcx - join.uz * roadHw * 0.2;
    const openZ = rcz + join.ux * roadHw * 0.2;
    pos.push(openX, ZS.getTerrainHeight(openX, openZ) + lift + 0.015, openZ);
    uv.push(0.5, 0.55);

    for (let i = 0; i < cols; i++) {
      idx.push(trailRow + i, trailRow + i + 1, hub);
    }
    for (let i = 0; i < cols; i++) {
      idx.push(hub, roadRow + i, roadRow + i + 1);
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

  function _buildBarriers(scene, edge, M) {
    if (!edge.barriers || edge.type !== 'asphalt') return;
    const railMat = M.metal || M.rust;
    const postMat = M.metal || M.rust;
    const hw = edge.width * 0.5 + BARRIER_OFFSET;
    const pts = edge.pts;
    if (pts.length < 2) return;

    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const totalLen = cum[cum.length - 1];
    if (totalLen < 0.01) return;

    const axisX = new THREE.Vector3(1, 0, 0);
    const dir = new THREE.Vector3();
    const quat = new THREE.Quaternion();

    for (const side of [-1, 1]) {
      const posts = [];
      for (let d = 0; d <= totalLen + 0.001; d += BARRIER_STEP) {
        const p = _barrierPointAt(pts, cum, d);
        const bx = p.x + (-p.tz) * hw * side;
        const bz = p.z + p.tx * hw * side;
        if (_inBarrierGap(bx, bz)) { posts.push(null); continue; }
        const by = ZS.getTerrainHeight(bx, bz);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.72, 5), postMat);
        post.position.set(bx, by + 0.36, bz);
        post.castShadow = true;
        scene.add(post);
        posts.push({ x: bx, y: by + 0.62, z: bz });
      }

      for (let i = 0; i < posts.length - 1; i++) {
        const a = posts[i], b = posts[i + 1];
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const len = Math.hypot(dx, dy, dz);
        if (len < 0.02) continue;
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.07), railMat);
        rail.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
        dir.set(dx / len, dy / len, dz / len);
        quat.setFromUnitVectors(axisX, dir);
        rail.setRotationFromQuaternion(quat);
        rail.castShadow = true;
        scene.add(rail);
      }
    }
  }

  function _buildLaneOverlay(scene, edge, M) {
    if (!edge.line || edge.type !== 'asphalt') return;
    const lineMat = M.roadLine;
    if (!lineMat) return;
    const dashOn = 2.0, dashOff = 2.4;
    const lPos = [], lIdx = [];
    let lprev = -1, dashAcc = 0;
    const step = 0.28;

    for (let si = 0; si < edge.pts.length - 1; si++) {
      const [x0, z0] = edge.pts[si], [x1, z1] = edge.pts[si + 1];
      const sdx = x1 - x0, sdz = z1 - z0;
      const sLen = Math.hypot(sdx, sdz);
      if (sLen < 0.01) continue;
      const steps = Math.max(1, Math.ceil(sLen / step));
      for (let i = (si === 0 ? 0 : 1); i <= steps; i++) {
        const t = i / steps;
        const cx = x0 + sdx * t, cz = z0 + sdz * t;
        const cy = ZS.getTerrainHeight(cx, cz) + RIBBON_LIFT + 0.025;
        const li = lPos.length / 3;
        const sw = 0.11;
        lPos.push(cx - sw, cy, cz, cx + sw, cy, cz);
        const piece = sLen / steps;
        const cycle = dashOn + dashOff;
        const mid = (dashAcc + piece * 0.5) % cycle;
        if (lprev >= 0 && mid < dashOn) lIdx.push(lprev, lprev + 1, li, lprev + 1, li + 1, li);
        dashAcc += piece;
        lprev = li;
      }
    }
    if (lPos.length < 6 || !lIdx.length) return;
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.Float32BufferAttribute(lPos, 3));
    lGeo.setIndex(lIdx);
    lGeo.computeVertexNormals();
    const mesh = new THREE.Mesh(lGeo, lineMat);
    mesh.renderOrder = 3;
    scene.add(mesh);
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
    const baseW = edge.width;
    const cols = 6;
    const pos = [], uv = [], idx = [];
    let prevRow = -1;
    let arc = 0;
    const tileLen = Math.max(baseW * 0.7, 3.5);
    const skip = skipDist || 0;
    const skipE = skipEnd || 0;
    const total = edge.totalLen || 0;
    const lift = yLift != null ? yLift : RIBBON_LIFT;
    const order = renderOrder != null ? renderOrder : 2;

    for (let si = 0; si < pts.length - 1; si++) {
      const [x0, z0] = pts[si], [x1, z1] = pts[si + 1];
      const sdx = x1 - x0, sdz = z1 - z0;
      const sLen = Math.hypot(sdx, sdz);
      if (sLen < 0.01) continue;

      if (si > 0 && si < pts.length - 1) {
        const [bx, bz] = pts[si - 1];
        const d1x = x0 - bx, d1z = z0 - bz;
        const l1 = Math.hypot(d1x, d1z);
        if (l1 > 0.01) {
          const dot = (d1x * sdx + d1z * sdz) / (l1 * sLen);
          if (dot < 0.86) prevRow = -1;
        }
      }

      const nx = -sdz / sLen, nz = sdx / sLen;
      const steps = Math.max(1, Math.ceil(sLen / RIBBON_STEP));

      for (let i = (si === 0 ? 0 : 1); i <= steps; i++) {
        const t = i / steps;
        const x = x0 + sdx * t;
        const z = z0 + sdz * t;
        const along = arc + sLen * t;
        if (along < skip - 0.02) { prevRow = -1; continue; }
        if (skipE > 0 && along > total - skipE) { prevRow = -1; continue; }
        const wMul = _taperMul(along, total, edge.taperStart, edge.taperEnd);
        if (wMul < 0.05) { prevRow = -1; continue; }

        const effW = baseW * wMul;
        const hw = effW / 2;
        const v = along / tileLen;
        const row = pos.length / 3;

        for (let c = 0; c <= cols; c++) {
          const u = c / cols;
          const off = -hw + effW * u;
          const px = x + nx * off;
          const pz = z + nz * off;
          const py = ZS.getTerrainHeight(px, pz) + lift;
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
      arc += sLen;
    }

    _pushMesh(scene, pos, uv, idx, mat, order);
  }

  function buildMeshes(scene, M) {
    if (!_ready) resolve();
    if (!scene || !M) return;
    const clearMat = M.path || M.roadDirt;
    const edgeExits = new Map();
    for (const e of _resolved) {
      const linked = _findLinkedClearing(e);
      if (linked) edgeExits.set(e.id, _exitCone(linked, e));
    }

    // Temporairement désactivé: on retire tous les disques visuels de clairière
    // pour isoler le grand disque brun pendant la refonte du spawn.

    for (const e of _resolved) {
      if (!e.visual) continue;
      const mat = _matFor(e, M);
      const clearing = _findLinkedClearing(e);
      const roadJoin = _findRoadJoinAtEnd(e);

      if (clearing) {
        _buildCampTrailJunction(scene, clearing, e, mat);
        _buildRibbon(scene, e, mat, JUNCTION_MERGE, 0);
      } else if (roadJoin) {
        _buildTrailRoadJunction(scene, e, roadJoin, mat, _matFor(roadJoin.road, M));
        _buildRibbon(scene, e, mat, 0, JUNCTION_MERGE);
      } else if (e.type === 'asphalt') {
        _buildAsphaltRoad(scene, e, M);
      } else {
        _buildRibbon(scene, e, mat, 0, 0);
      }
    }
  }

  window.ZS = window.ZS || {};
  ZS.RoadNetwork = {
    defineEdge,
    defineClearing,
    resolve,
    applyFlattening,
    buildMeshes,
    isNearRoad,
    sampleAlong,
    getResolvedEdges,
  };
  ZS.isNearRoad = isNearRoad;
}());
