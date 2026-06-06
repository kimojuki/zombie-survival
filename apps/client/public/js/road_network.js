// Road network — spawn polish : disque clairière + sentier lissé
(function () {
  'use strict';

  const SNAP_RADIUS = 1.0;
  const RIBBON_LIFT = 0.07;
  const RIBBON_STEP = 0.32;
  const JUNCTION_MERGE = 0.42;
  const JUNCTION_ARC_STEPS = 12;

  const SHOULDER = { clearing: 0.5, dirt: 1.0, path: 0.8, trail: 0.85, asphalt: 2.8 };
  const BLEND    = { clearing: 4.0, dirt: 5.0, path: 4.0, trail: 4.5, asphalt: 6.5 };
  const QUERY_PAD = { clearing: 0.3, dirt: 0.6, path: 0.5, trail: 0.55, asphalt: 1.2 };
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
      lineSolid: !!def.lineSolid,
      broken: !!def.broken,
      barriers: def.barriers !== false,
      join: def.join || null,
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

  function _polylineLength(pts) {
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    return total;
  }

  function _samplePolyline(pts, step) {
    const total = _polylineLength(pts);
    if (total <= 0) return [];
    const out = [];
    const s = Math.max(step || 0.4, 0.08);
    for (let dist = 0; dist <= total; dist += s) {
      let remain = dist;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        const dx = x1 - x0, dz = z1 - z0;
        const segLen = Math.hypot(dx, dz);
        if (segLen < 1e-6) continue;
        if (remain <= segLen || i === pts.length - 2) {
          const f = segLen > 0 ? Math.min(1, remain / segLen) : 0;
          out.push({
            x: x0 + dx * f,
            z: z0 + dz * f,
            ux: dx / segLen,
            uz: dz / segLen,
            dist,
          });
          break;
        }
        remain -= segLen;
      }
    }
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2] || last;
    const dx = last[0] - prev[0], dz = last[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    const tail = out[out.length - 1];
    if (!tail || tail.dist < total - s * 0.3) {
      out.push({ x: last[0], z: last[1], ux: dx / len, uz: dz / len, dist: total });
    }
    return out;
  }

  /** Point le plus proche sur une polyligne. */
  function nearestPointOnRoad(roadPts, x, z) {
    if (!roadPts || roadPts.length < 2) return null;
    return _nearestOnEdge({ pts: roadPts }, x, z);
  }

  /**
   * Courbe camp → RN : vise le point route le plus proche de la bouche (pas l'extrémité est).
   */
  function buildTrailTowardRoad(mouth, roadPts, opts) {
    opts = opts || {};
    if (!mouth || !roadPts || roadPts.length < 2) return null;

    const [mx, mz] = mouth;
    const hit = nearestPointOnRoad(roadPts, mx, mz);
    if (!hit) return null;

    const lead = opts.leadIn || 5.5;
    const toMx = mx - hit.x;
    const toMz = mz - hit.z;
    const toLen = Math.hypot(toMx, toMz) || 1;
    const approachX = hit.x + (toMx / toLen) * lead;
    const approachZ = hit.z + (toMz / toLen) * lead;

    const perpX = -toMz / toLen;
    const perpZ = toMx / toLen;
    const bend = opts.bend || 3.5;
    const cx = mx + (approachX - mx) * 0.42 + perpX * bend;
    const cz = mz + (approachZ - mz) * 0.42 + perpZ * bend * 0.35;

    const steps = opts.steps || 14;
    const pts = [[mx, mz]];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const omt = 1 - t;
      pts.push([
        omt * omt * mx + 2 * omt * t * cx + t * t * approachX,
        omt * omt * mz + 2 * omt * t * cz + t * t * approachZ,
      ]);
    }
    return pts;
  }

  /** Plus proche couple sentier ↔ route (distance minimale le long des polylignes). */
  function computeTrailRoadJoin(trailPts, roadPts, opts) {
    opts = opts || {};
    if (!trailPts || trailPts.length < 2 || !roadPts || roadPts.length < 2) return null;

    let path = trailPts.map(p => [Number(p[0]) || 0, Number(p[1]) || 0]);
    if (opts.smooth !== false && path.length >= 3) {
      path = _dedupe(_chaikin(path, 1), 0.12);
    }

    const maxDist = opts.maxDist || 12;
    const samples = _samplePolyline(path, opts.step || 0.4);
    let best = null;

    for (const s of samples) {
      const hit = _nearestOnEdge({ pts: roadPts }, s.x, s.z);
      if (!hit || hit.dist > maxDist) continue;
      if (!best || hit.dist < best.dist - 1e-4) {
        best = {
          dist: hit.dist,
          x: hit.x,
          z: hit.z,
          ux: hit.ux,
          uz: hit.uz,
          trailX: s.x,
          trailZ: s.z,
          trailUx: s.ux,
          trailUz: s.uz,
          trailDist: s.dist,
          roadId: opts.roadId || null,
        };
      }
    }
    return best;
  }

  /** Coupe le sentier avant la jonction et ajoute une bouche d'approche. */
  function trimTrailForJoin(trailPts, join, leadIn) {
    if (!join || !trailPts || trailPts.length < 2) return trailPts.map(p => p.slice());

    const lead = leadIn || 3.0;
    const cutDist = Math.max(0, join.trailDist - lead);
    let path = trailPts.map(p => p.slice());
    if (path.length >= 3) {
      path = _dedupe(_chaikin(path, 1), 0.12);
    }

    const out = [];
    let acc = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, z0] = path[i], [x1, z1] = path[i + 1];
      const dx = x1 - x0, dz = z1 - z0;
      const segLen = Math.hypot(dx, dz);
      if (segLen < 1e-6) continue;

      if (acc + segLen < cutDist - 0.05) {
        if (!out.length || out[out.length - 1][0] !== x0 || out[out.length - 1][1] !== z0) {
          out.push([x0, z0]);
        }
        acc += segLen;
        continue;
      }

      const f = segLen > 0 ? Math.max(0, Math.min(1, (cutDist - acc) / segLen)) : 0;
      const cx = x0 + dx * f, cz = z0 + dz * f;
      if (!out.length || Math.hypot(out[out.length - 1][0] - cx, out[out.length - 1][1] - cz) > 0.15) {
        out.push([cx, cz]);
      }

      const tux = join.trailUx || (dx / segLen);
      const tuz = join.trailUz || (dz / segLen);
      const mouthX = join.trailX, mouthZ = join.trailZ;
      out.push([
        mouthX - tux * 1.1,
        mouthZ - tuz * 1.1,
      ]);
      out.push([mouthX, mouthZ]);
      return out;
    }

    out.push([join.trailX, join.trailZ]);
    return out;
  }

  function _findRoadJoinAtEnd(trail) {
    if (!trail.pts || trail.pts.length < 2) return null;

    if (trail._join && trail._join.roadId) {
      const road = _resolved.find(r => r.id === trail._join.roadId);
      if (road) {
        return {
          road,
          x: trail._join.x,
          z: trail._join.z,
          ux: trail._join.ux,
          uz: trail._join.uz,
          dist: trail._join.dist,
          trailX: trail._join.trailX,
          trailZ: trail._join.trailZ,
          trailUx: trail._join.trailUx,
          trailUz: trail._join.trailUz,
        };
      }
    }

    const [ex, ez] = trail.pts[trail.pts.length - 1];
    let best = null;
    for (const road of _resolved) {
      if (road.type !== 'asphalt' || road.id === trail.id) continue;
      const hit = _nearestOnEdge(road, ex, ez);
      const limit = road.width * 0.65 + 2.5;
      if (hit && hit.dist < limit && (!best || hit.dist < best.dist)) {
        best = { road, x: hit.x, z: hit.z, ux: hit.ux, uz: hit.uz, dist: hit.dist };
      }
    }
    return best;
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
        lineSolid: e.lineSolid,
        _join: e.join || null,
      });
    }

    _barrierGaps.length = 0;
    for (const trail of _resolved) {
      if (trail.type === 'dirt' || trail.type === 'path' || trail.type === 'trail') {
        const join = _findRoadJoinAtEnd(trail);
        if (join) {
          _barrierGaps.push({ x: join.x, z: join.z, r: 7.5 });
        }
      }
    }

    const trail = _resolved.find(ed => ed.id === 'spawn_trail');
    if (trail && window.ZS && trail._join) {
      // Ne pas écraser les points de contrôle : trails.js gère le lissage visuel.
    } else if (trail && window.ZS && !trail._join) {
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
    if (edge.type === 'trail') return M.trail || M.path || M.roadDirt;
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
      if (decor && ZS.getDecorGroundHeight) return ZS.getDecorGroundHeight(x, z);
      return (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0) + lift;
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
        const cy = ZS.getTerrainHeight(cx, cz) + lift;
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
      const roadJoin = _findRoadJoinAtEnd(e);
      if (!e.visual && roadJoin && (e.type === 'trail' || e.type === 'dirt' || e.type === 'path')) {
        _buildTrailRoadJunction(scene, e, roadJoin, _matFor(e, M), _matFor(roadJoin.road, M));
        continue;
      }
      if (!e.visual) continue;
      const mat = _matFor(e, M);
      const clearing = _findLinkedClearing(e);

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
    computeTrailRoadJoin,
    trimTrailForJoin,
    nearestPointOnRoad,
    buildTrailTowardRoad,
  };
  ZS.isNearRoad = isNearRoad;
}());
