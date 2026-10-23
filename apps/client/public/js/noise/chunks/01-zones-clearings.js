// Zones plates, clairières, patches
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
