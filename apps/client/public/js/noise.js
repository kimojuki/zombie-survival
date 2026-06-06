// Terrain height noise — shared by world generation and player collision
(function () {
  'use strict';

  function hash(x, z) {
    const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function smoothNoise(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    const xf = x - xi, zf = z - zi;
    const ux = xf * xf * (3 - 2 * xf);
    const uz = zf * zf * (3 - 2 * zf);
    return lerp(
      lerp(hash(xi, zi),     hash(xi + 1, zi),     ux),
      lerp(hash(xi, zi + 1), hash(xi + 1, zi + 1), ux),
      uz
    );
  }

  function _rawHeightCore(x, z) {
    const s = 0.022;
    // Base detail layer (unchanged feel up close)
    const base = (
      smoothNoise(x * s,       z * s)       * 4.0 +
      smoothNoise(x * s * 3.2, z * s * 3.2) * 1.4 +
      smoothNoise(x * s * 8.0, z * s * 8.0) * 0.3
    ) - 2.0;
    // Low-frequency rolling hills — bipolar so valleys form too
    const rolls = (smoothNoise(x * 0.009, z * 0.009) - 0.5) * 9.0
                + (smoothNoise(x * 0.004, z * 0.004) - 0.5) * 6.0;
    // Landmark peaks — all placed at map edges, well clear of every building zone
    const h1 = Math.max(0, 1 - Math.hypot(x -  8, z - 98) / 24) * 10; // far north
    const h2 = Math.max(0, 1 - Math.hypot(x - 98, z + 18) / 20) *  9; // far east
    const h3 = Math.max(0, 1 - Math.hypot(x + 95, z -  5) / 22) * 11; // far west
    const h4 = Math.max(0, 1 - Math.hypot(x + 12, z + 98) / 20) *  8; // far south
    const h5 = Math.max(0, 1 - Math.hypot(x - 42, z - 82) / 16) *  7; // mid-north ridge
    return base + rolls + Math.max(h1, Math.max(h2, Math.max(h3, Math.max(h4, h5))));
  }

  const _SPAWN_REF_Y = _rawHeightCore(0, -6);

  function _rawHeight(x, z) {
    let h = _rawHeightCore(x, z);
    // Start Forest — clairière de spawn : relief adouci (évite bosses/crêtes locales)
    const md = Math.hypot(x * 0.48, (z + 7) * 0.52);
    const MEADOW_R = 36;
    if (md < MEADOW_R) {
      const w = Math.pow(1 - md / MEADOW_R, 1.8);
      h = h * (1 - w * 0.92) + _SPAWN_REF_Y * w * 0.92;
    }
    return h;
  }

  // { cx, cz, hw, hd, flatY, blend }
  const _flatZones   = [];
  // Clairières circulaires/elliptiques — aplatissement radial lisse
  const _clearingDiscs = [];
  // Patches de terrain procédural: lissage local + leveled basin
  const _terrainPatches = [];
  // Polylignes routières — aplatissement lisse (distance au tracé, pas boîtes)
  const _roadCorridors = [];
  const _trailCorridors = [];
  // { cx, cz, hw, hd, y }  — walkable upper floor
  const _upperFloors = [];
  // { cx, cz, hw, hd, y0, y1, axis }  — staircase ramp
  const _ramps       = [];

  function registerFlatZone(cx, cz, hw, hd, blend) {
    _flatZones.push({ cx, cz, hw, hd, flatY: _rawHeight(cx, cz), blend: blend || 4 });
  }

  function registerClearingDisc(cx, cz, rx, rz, blend) {
    const flatY = _rawHeight(cx, cz);
    _clearingDiscs.push({
      cx, cz,
      rx: rx || 5,
      rz: rz || rx || 5,
      blend: blend || 4,
      flatY,
    });
  }

  function registerTerrainPatch(cx, cz, rx, rz, blend, opts) {
    const patch = {
      cx: Number(cx),
      cz: Number(cz),
      rx: Number(rx) || 6,
      rz: Number(rz) || Number(rx) || 6,
      blend: Number(blend) || 4,
      flatY: _rawHeight(cx, cz),
      smooth: opts && Number.isFinite(opts.smooth) ? opts.smooth : 0.65,
      level: opts && Number.isFinite(opts.level) ? opts.level : 0.25,
      sampleRadius: opts && Number.isFinite(opts.sampleRadius) ? opts.sampleRadius : 1.8,
    };
    _terrainPatches.push(patch);
    return patch;
  }

  function _clearingNormDist(x, z, disc) {
    const dx = (x - disc.cx) / disc.rx;
    const dz = (z - disc.cz) / disc.rz;
    return Math.hypot(dx, dz);
  }

  function _clearingHeight(x, z, baseH) {
    let h = baseH;
    for (const disc of _clearingDiscs) {
      const nd = _clearingNormDist(x, z, disc);
      const outer = 1 + disc.blend / Math.min(disc.rx, disc.rz);
      if (nd >= outer) continue;
      if (nd <= 1) {
        h = disc.flatY;
        continue;
      }
      const t = 1 - (nd - 1) / (outer - 1);
      const w = t * t * (3 - 2 * t);
      h = disc.flatY * w + h * (1 - w);
    }
    return h;
  }

  function _baseHeight(x, z) {
    let h = _rawHeight(x, z);
    h = _clearingHeight(x, z, h);
    h = _roadCorridorHeight(x, z, h);
    h = _trailCorridorHeight(x, z, h);
    h = _riverBedHeight(x, z, h);
    h = _applyFlatZones(x, z, h);
    return h;
  }

  function _sampleBaseAverage(x, z, radius) {
    const r = Math.max(0.5, radius || 1.5);
    const step = r * 0.75;
    let sum = 0;
    let count = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        sum += _baseHeight(x + dx * step, z + dz * step);
        count++;
      }
    }
    return count > 0 ? sum / count : _baseHeight(x, z);
  }

  function _terrainPatchWeight(x, z, patch) {
    const dx = (x - patch.cx) / patch.rx;
    const dz = (z - patch.cz) / patch.rz;
    const d = Math.hypot(dx, dz);
    const outer = 1 + patch.blend / Math.min(patch.rx, patch.rz);
    if (d >= outer) return 0;
    if (d <= 1) return 1;
    const t = 1 - (d - 1) / (outer - 1);
    return t * t * (3 - 2 * t);
  }

  function _applyTerrainPatches(x, z, baseH) {
    let h = baseH;
    for (const patch of _terrainPatches) {
      const w = _terrainPatchWeight(x, z, patch);
      if (w <= 0) continue;
      const smoothH = _sampleBaseAverage(x, z, patch.sampleRadius);
      const target = smoothH * (1 - patch.level) + patch.flatY * patch.level;
      const strength = patch.smooth * w;
      h = h * (1 - strength) + target * strength;
    }
    return h;
  }

  function isInClearingDisc(x, z, margin) {
    const pad = (margin || 0) / 5;
    for (const disc of _clearingDiscs) {
      if (_clearingNormDist(x, z, disc) <= 1 + pad) return true;
    }
    return false;
  }

  // Aplatit le terrain le long d'un tracé. On approxime la route par une suite de
  // petites zones plates qui se chevauchent, ce qui évite que l'herbe ressorte
  // au-dessus du ruban routier sur les bosses du terrain.
  // { cx, cz, hw, hd, depth, blend } — legacy unused; rivières = polylignes
  const _riverPolylines = [];

  function _distToSegment(px, pz, x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0;
    const len2 = dx * dx + dz * dz;
    if (len2 < 0.0001) return Math.hypot(px - x0, pz - z0);
    const t = Math.max(0, Math.min(1, ((px - x0) * dx + (pz - z0) * dz) / len2));
    return Math.hypot(px - (x0 + dx * t), pz - (z0 + dz * t));
  }

  function _nearestRiverPoint(x, z) {
    let best = null;
    for (const rp of _riverPolylines) {
      for (let i = 0; i < rp.points.length - 1; i++) {
        const p0 = rp.points[i], p1 = rp.points[i + 1];
        const dx = p1[0] - p0[0], dz = p1[1] - p0[1];
        const len2 = dx * dx + dz * dz;
        if (len2 < 0.0001) continue;
        const t = Math.max(0, Math.min(1, ((x - p0[0]) * dx + (z - p0[1]) * dz) / len2));
        const cx = p0[0] + dx * t, cz = p0[1] + dz * t;
        const dist = Math.hypot(x - cx, z - cz);
        if (!best || dist < best.dist) best = { dist, cx, cz, rp };
      }
    }
    return best;
  }

  function _applyFlatZones(x, z, raw) {
    let h = raw;
    for (const zone of _flatZones) {
      const dx = Math.max(0, Math.abs(x - zone.cx) - zone.hw);
      const dz = Math.max(0, Math.abs(z - zone.cz) - zone.hd);
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= 0) { h = zone.flatY; continue; }
      if (dist < zone.blend) {
        const w  = 1 - dist / zone.blend;
        const sw = w * w * (3 - 2 * w);
        h = zone.flatY * sw + h * (1 - sw);
      }
    }
    return h;
  }

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

  function registerRoadCorridor(points, halfWidth, blend) {
    if (!Array.isArray(points) || points.length < 2) return;
    const pts = points
      .map(p => [_finite(p[0], null), _finite(p[1], null)])
      .filter(p => p[0] !== null && p[1] !== null);
    if (pts.length < 2) return;
    let heights = pts.map(([x, z]) => _rawHeight(x, z));
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
    let heights = pts.map(([x, z]) => _rawHeight(x, z));
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
    let heights = pts.map(([x, z]) => _rawHeight(x, z));
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

  function _riverBedHeight(x, z, baseH) {
    const hit = _nearestRiverPoint(x, z);
    if (!hit) return baseH;
    const { dist, cx, cz, rp } = hit;
    const outer = rp.halfW + rp.blend;
    if (dist >= outer) return baseH;
    const centerH = _applyFlatZones(cx, cz, _rawHeight(cx, cz));
    const targetBed = centerH - rp.depth;
    let w;
    if (dist <= rp.halfW) {
      w = 1;
    } else {
      const t = 1 - (dist - rp.halfW) / rp.blend;
      w = t * t * (3 - 2 * t);
    }
    return _finite(targetBed * w + baseH * (1 - w), baseH);
  }

  function registerRiverChannel(points, width, depth, blend) {
    if (!Array.isArray(points) || points.length < 2) return;
    _riverPolylines.push({
      points: points.map(p => [p[0], p[1]]),
      halfW: (width || 12) / 2,
      depth: depth || 0.18,
      blend: blend || 12,
    });
  }

  function isInRiverChannel(x, z, margin) {
    const pad = margin || 0;
    for (const rp of _riverPolylines) {
      let minDist = Infinity;
      for (let i = 0; i < rp.points.length - 1; i++) {
        const p0 = rp.points[i], p1 = rp.points[i + 1];
        minDist = Math.min(minDist, _distToSegment(x, z, p0[0], p0[1], p1[0], p1[1]));
      }
      if (minDist < rp.halfW + pad + 1.5) return true;
    }
    return false;
  }

  function registerFlatPath(points, width, blend, step) {
    if (!Array.isArray(points) || points.length < 2) return;
    const sampleStep = step || Math.max(1.2, Math.min(4.0, (width || 4) * 0.45));
    const half = (width || 4) * 0.5;
    const pad = Math.max(1.2, half * 0.55);
    const zoneBlend = blend || Math.max(2.5, half * 0.6);

    for (let i = 0; i < points.length - 1; i++) {
      const [x0, z0] = points[i];
      const [x1, z1] = points[i + 1];
      const dx = x1 - x0, dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      if (len < 0.01) continue;
      const steps = Math.max(1, Math.ceil(len / sampleStep));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = x0 + dx * t;
        const z = z0 + dz * t;
        if (isInRiverChannel(x, z, 0.4)) continue;
        _flatZones.push({
          cx: x,
          cz: z,
          hw: half + pad,
          hd: half + pad,
          flatY: _applyFlatZones(x, z, _rawHeight(x, z)),
          blend: zoneBlend
        });
      }
    }
  }

  // hole (optionnel) = { cx, cz, hw, hd } : trémie d'escalier — le joueur passe au travers
  function registerUpperFloor(cx, cz, hw, hd, y, hole) {
    _upperFloors.push({ cx, cz, hw, hd, y, hole: hole || null });
  }

  // axis='z': height goes from y0 at (cz-hd) to y1 at (cz+hd)
  // axis='x': height goes from y0 at (cx-hw) to y1 at (cx+hw)
  function registerRamp(cx, cz, hw, hd, y0, y1, axis) {
    _ramps.push({ cx, cz, hw, hd, y0, y1, axis: axis || 'z' });
  }

  function getTerrainHeight(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
    const raw = _rawHeight(x, z);
    const base = _baseHeight(x, z);
    return _finite(_applyTerrainPatches(x, z, base), raw);
  }

  // Returns the highest floor the player is currently standing on.
  // playerY is the camera/eye Y (feet = playerY - 1.7).
  function getEffectiveFloorHeight(x, z, playerY) {
    let best = ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(x, z)
      : getTerrainHeight(x, z);

    for (const ramp of _ramps) {
      if (Math.abs(x - ramp.cx) > ramp.hw || Math.abs(z - ramp.cz) > ramp.hd) continue;
      const t = ramp.axis === 'x'
        ? (x - (ramp.cx - ramp.hw)) / (ramp.hw * 2)
        : (z - (ramp.cz - ramp.hd)) / (ramp.hd * 2);
      const rampY = ramp.y0 + (ramp.y1 - ramp.y0) * Math.max(0, Math.min(1, t));
      if (rampY > best && rampY <= playerY - 0.5) best = rampY;
    }

    for (const floor of _upperFloors) {
      if (Math.abs(x - floor.cx) > floor.hw || Math.abs(z - floor.cz) > floor.hd) continue;
      // Trémie d'escalier : aucun plancher au-dessus des marches → on peut redescendre
      if (floor.hole &&
          Math.abs(x - floor.hole.cx) <= floor.hole.hw &&
          Math.abs(z - floor.hole.cz) <= floor.hole.hd) continue;
      if (floor.y <= playerY - 0.5) best = Math.max(best, floor.y);
    }

    return best;
  }

  window.ZS = window.ZS || {};
  ZS.getTerrainHeight        = getTerrainHeight;
  ZS.getEffectiveFloorHeight = getEffectiveFloorHeight;
  ZS.registerFlatZone        = registerFlatZone;
  ZS.registerClearingDisc    = registerClearingDisc;
  ZS.registerTerrainPatch    = registerTerrainPatch;
  ZS.isInClearingDisc        = isInClearingDisc;
  ZS.registerFlatPath        = registerFlatPath;
  ZS.registerRoadCorridor      = registerRoadCorridor;
  ZS.registerRoadCorridorVar   = registerRoadCorridorVar;
  ZS.registerTrailCorridor     = registerTrailCorridor;
  ZS.finalizeRoadNetwork       = finalizeRoadNetwork;
  ZS.isInRoadCorridor          = isInRoadCorridor;
  ZS.registerRiverChannel      = registerRiverChannel;
  ZS.isInRiverChannel        = isInRiverChannel;
  ZS.registerUpperFloor      = registerUpperFloor;
  ZS.registerRamp            = registerRamp;
}());
