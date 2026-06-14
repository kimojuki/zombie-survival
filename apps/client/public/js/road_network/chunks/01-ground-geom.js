// Cache sol + géométrie polylignes — extrait de road_network.js (IIFE)
function _groundCacheKey(px, pz) {
    const g = _groundCacheGrid;
    return `${Math.round(px / g)},${Math.round(pz / g)}`;
  }

  /** Hauteur mesh terrain (aligné visuel) — fallback analytique si pas de mesh. */
  function _groundSample(px, pz) {
    if (ZS.raycastTerrainHeight) return ZS.raycastTerrainHeight(px, pz);
    if (ZS.getVisibleTerrainHeight) return ZS.getVisibleTerrainHeight(px, pz);
    return ZS.getTerrainHeight ? ZS.getTerrainHeight(px, pz) : 0;
  }

  /** Post-spawn async : hauteur analytique (pas de raycast vertical par vertex). */
  function _groundSampleForBuild(px, pz) {
    if (_asyncRoadCfg && _asyncRoadCfgOrDefault().fastGround !== false) {
      if (ZS.getVisibleTerrainHeight) return ZS.getVisibleTerrainHeight(px, pz);
      return ZS.getTerrainHeight ? ZS.getTerrainHeight(px, pz) : 0;
    }
    return _groundSample(px, pz);
  }

  function _groundBaseFast(px, pz) {
    if (!_groundCache) return _groundSampleForBuild(px, pz);
    const k = _groundCacheKey(px, pz);
    let v = _groundCache.get(k);
    if (v === undefined) {
      v = _groundSampleForBuild(px, pz);
      _groundCache.set(k, v);
    }
    return v;
  }

  function _slopeLiftMulFast(px, pz) {
    const e = 0.32;
    const yx = _groundBaseFast(px + e, pz) - _groundBaseFast(px - e, pz);
    const yz = _groundBaseFast(px, pz + e) - _groundBaseFast(px, pz - e);
    const slope = Math.hypot(yx, yz) / (2 * e);
    return Math.max(RIBBON_LIFT_MIN / RIBBON_LIFT, 1 - slope * 1.35);
  }

  /** Y ruban async — raycast terrain caché + lift pente (comme sync, sans raycast décor). */
  function _roadVertexYAsync(px, pz, lift) {
    const base = lift != null ? lift : RIBBON_LIFT;
    const l = Math.max(RIBBON_LIFT_MIN, base * _slopeLiftMulFast(px, pz));
    return _groundBaseFast(px, pz) + l;
  }

  function _roadVertexYForBuild(px, pz, lift) {
    if (_asyncRoadCfg && _asyncRoadCfgOrDefault().fastGround !== false) {
      return _roadVertexYAsync(px, pz, lift);
    }
    return _roadVertexY(px, pz, lift);
  }

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
