// Rivière, étages, export
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
  ZS.isInTrailCorridor         = isInTrailCorridor;
  ZS.registerRiverChannel      = registerRiverChannel;
  ZS.isInRiverChannel        = isInRiverChannel;
  ZS.registerUpperFloor      = registerUpperFloor;
  ZS.registerRamp            = registerRamp;
