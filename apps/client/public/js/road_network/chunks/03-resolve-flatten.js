// Resolve + flatten terrain — extrait de road_network.js (IIFE)
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
        const passes = pts.length >= 5 ? 2 : 1;
        pts = _dedupe(_chaikin(pts, passes), 0.1);
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
