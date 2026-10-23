// Corridors routes, trails, rivière
function _smoothHeights(values, radius) {
    const out = values.slice();
    const r = radius || 2;
    for (let i = 0; i < values.length; i++) {
      let sum = 0, n = 0;
      for (let j = i - r; j <= i + r; j++) {
        if (j < 0 || j >= values.length) continue;
        sum += values[j]; n++;
      }
      out[i] = sum / n;
    }
    return out;
  }

  function _finite(v, fallback) {
    return Number.isFinite(v) ? v : fallback;
  }

  function _pushCorridor(list, pts, heights, halfW, halfWidths, blendVal) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const maxHalf = halfWidths
      ? Math.max(...halfWidths)
      : Math.max(halfW || 4, 0.5);
    const pad = maxHalf + blendVal;
    for (const [x, z] of pts) {
      minX = Math.min(minX, x - pad); maxX = Math.max(maxX, x + pad);
      minZ = Math.min(minZ, z - pad); maxZ = Math.max(maxZ, z + pad);
    }
    list.push({
      points: pts,
      heights,
      halfW: halfWidths ? null : Math.max(halfW || 4, 0.5),
      halfWidths: halfWidths || null,
      blend: blendVal,
      minX, maxX, minZ, maxZ,
    });
  }

  function _pushRoadCorridor(pts, heights, halfW, halfWidths, blendVal) {
    _pushCorridor(_roadCorridors, pts, heights, halfW, halfWidths, blendVal);
  }

  /** Hauteur d'ancrage route — clairières / zones plates, sans autres corridors routiers. */
  function _corridorAnchorHeight(x, z) {
    let h = _rawHeight(x, z);
    h = _clearingHeight(x, z, h);
    h = _trailCorridorHeight(x, z, h);
    h = _riverBedHeight(x, z, h);
    h = _applyFlatZones(x, z, h);
    return h;
  }

  function registerRoadCorridor(points, halfWidth, blend) {
    if (!Array.isArray(points) || points.length < 2) return;
    const pts = points
      .map(p => [_finite(p[0], null), _finite(p[1], null)])
      .filter(p => p[0] !== null && p[1] !== null);
    if (pts.length < 2) return;
    let heights = pts.map(([x, z]) => _corridorAnchorHeight(x, z));
    for (let pass = 0; pass < 2; pass++) heights = _smoothHeights(heights, 2);
    const blendVal = Math.max(blend || 4, 0.5);
    _pushRoadCorridor(pts, heights, halfWidth, null, blendVal);
  }

  function registerRoadCorridorVar(points, halfWidths, blend) {
    if (!Array.isArray(points) || points.length < 2) return;
    const pts = points
      .map(p => [_finite(p[0], null), _finite(p[1], null)])
      .filter(p => p[0] !== null && p[1] !== null);
    if (pts.length < 2) return;
    let heights = pts.map(([x, z]) => _corridorAnchorHeight(x, z));
    for (let pass = 0; pass < 2; pass++) heights = _smoothHeights(heights, 2);
    const blendVal = Math.max(blend || 4, 0.5);
    const hw = (halfWidths || []).map(w => Math.max(w || 0.5, 0.5));
    while (hw.length < pts.length) hw.push(hw[hw.length - 1] || 0.5);
    _pushRoadCorridor(pts, heights, null, hw, blendVal);
  }

  function _halfWAt(rc, i, t) {
    if (rc.halfWidths) {
      const a = rc.halfWidths[i] || rc.halfW || 0.5;
      const b = rc.halfWidths[i + 1] || a;
      return a + (b - a) * t;
    }
    return rc.halfW;
  }

  function _sampleRoadCorridor(rc, x, z) {
    let best = null;
    for (let i = 0; i < rc.points.length - 1; i++) {
      const a = rc.points[i], b = rc.points[i + 1];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const len2 = dx * dx + dz * dz;
      if (len2 < 0.0001) continue;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / len2));
      const px = a[0] + dx * t, pz = a[1] + dz * t;
      const dist = Math.hypot(x - px, z - pz);
      const h = rc.heights[i] + (rc.heights[i + 1] - rc.heights[i]) * t;
      const halfW = _halfWAt(rc, i, t);
      if (!Number.isFinite(h)) continue;
      if (!best || dist < best.dist) best = { dist, h, rc, halfW };
    }
    return best;
  }

  function _nearestRoadSample(x, z) {
    let best = null;
    for (const rc of _roadCorridors) {
      if (x < rc.minX || x > rc.maxX || z < rc.minZ || z > rc.maxZ) continue;
      const hit = _sampleRoadCorridor(rc, x, z);
      if (hit && (!best || hit.dist < best.dist)) best = hit;
    }
    return best;
  }

  function _insideFlatZone(x, z) {
    for (const zone of _flatZones) {
      if (Math.abs(x - zone.cx) <= zone.hw && Math.abs(z - zone.cz) <= zone.hd) return true;
    }
    return false;
  }

  function _roadCorridorHeight(x, z, baseH) {
    if (_insideFlatZone(x, z)) return baseH;

    let sumW = 0, sumH = 0, maxW = 0;
    for (const rc of _roadCorridors) {
      if (x < rc.minX || x > rc.maxX || z < rc.minZ || z > rc.maxZ) continue;
      const hit = _sampleRoadCorridor(rc, x, z);
      if (!hit) continue;
      const halfW = hit.halfW || hit.rc.halfW;
      const outer = halfW + hit.rc.blend;
      if (hit.dist >= outer) continue;
      let w;
      if (hit.dist <= halfW) {
        w = 1;
      } else {
        const t = 1 - (hit.dist - halfW) / hit.rc.blend;
        w = t * t * (3 - 2 * t);
      }
      if (w <= 0) continue;
      sumW += w;
      sumH += hit.h * w;
      if (w > maxW) maxW = w;
    }
    if (sumW <= 0) return baseH;

    const roadH = sumH / sumW;
    const blend = Math.min(1, maxW + (sumW > 1 ? 0.15 : 0));
    return _finite(roadH * blend + baseH * (1 - blend), baseH);
  }

  function _corridorHeightFrom(list, x, z, baseH) {
    if (_insideFlatZone(x, z)) return baseH;
    let sumW = 0, sumH = 0, maxW = 0;
    for (const rc of list) {
      if (x < rc.minX || x > rc.maxX || z < rc.minZ || z > rc.maxZ) continue;
      const hit = _sampleRoadCorridor(rc, x, z);
      if (!hit) continue;
      const halfW = hit.halfW || hit.rc.halfW;
      const outer = halfW + hit.rc.blend;
      if (hit.dist >= outer) continue;
      let w;
      if (hit.dist <= halfW) {
        w = 1;
      } else {
        const t = 1 - (hit.dist - halfW) / hit.rc.blend;
        w = t * t * (3 - 2 * t);
      }
      if (w <= 0) continue;
      sumW += w;
      sumH += hit.h * w;
      if (w > maxW) maxW = w;
    }
    if (sumW <= 0) return baseH;
    const roadH = sumH / sumW;
    const blend = Math.min(1, maxW + (sumW > 1 ? 0.15 : 0));
    return _finite(roadH * blend + baseH * (1 - blend), baseH);
  }

  function _trailCorridorHeight(x, z, baseH) {
    return _corridorHeightFrom(_trailCorridors, x, z, baseH);
  }

  function registerTrailCorridor(points, halfWidth, blend) {
    if (!Array.isArray(points) || points.length < 2) return;
    const pts = points
      .map(p => [_finite(p[0], null), _finite(p[1], null)])
      .filter(p => p[0] !== null && p[1] !== null);
    if (pts.length < 2) return;
    let heights = pts.map(([x, z]) => _corridorAnchorHeight(x, z));
    for (let pass = 0; pass < 2; pass++) heights = _smoothHeights(heights, 2);
    const blendVal = Math.max(blend || 3, 0.5);
    _pushCorridor(_trailCorridors, pts, heights, halfWidth, null, blendVal);
  }

  // Harmonise les hauteurs aux nœuds partagés (croisements de routes).
  function finalizeRoadNetwork() {
    const snap = 1.0;
    const buckets = new Map();
    for (const rc of _roadCorridors) {
      for (let i = 0; i < rc.points.length; i++) {
        const [x, z] = rc.points[i];
        const key = `${Math.round(x / snap) * snap},${Math.round(z / snap) * snap}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push({ rc, i });
      }
    }
    for (const entries of buckets.values()) {
      if (entries.length < 2) continue;
      let avg = 0;
      for (const e of entries) avg += e.rc.heights[e.i];
      avg /= entries.length;
      for (const e of entries) e.rc.heights[e.i] = avg;
    }
    for (const rc of _roadCorridors) {
      rc.heights = _smoothHeights(rc.heights, 1);
    }
  }

  function isInRoadCorridor(x, z, margin) {
    const hit = _nearestRoadSample(x, z);
    if (!hit) return false;
    const halfW = hit.halfW || hit.rc.halfW;
    return hit.dist < halfW + (margin || 0);
  }

  function _nearestTrailSample(x, z) {
    let best = null;
    for (const rc of _trailCorridors) {
      if (x < rc.minX || x > rc.maxX || z < rc.minZ || z > rc.maxZ) continue;
      const hit = _sampleRoadCorridor(rc, x, z);
      if (hit && (!best || hit.dist < best.dist)) best = hit;
    }
    return best;
  }

  function isInTrailCorridor(x, z, margin) {
    const hit = _nearestTrailSample(x, z);
    if (!hit) return false;
    const halfW = hit.halfW || hit.rc.halfW;
    return hit.dist < halfW + (margin || 0);
  }
