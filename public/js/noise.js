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

  function _rawHeight(x, z) {
    const s = 0.035;
    return (
      smoothNoise(x * s,       z * s)       * 9 +
      smoothNoise(x * s * 2.7, z * s * 2.7) * 3 +
      smoothNoise(x * s * 6.3, z * s * 6.3) * 0.8
    ) - 5;
  }

  // { cx, cz, hw, hd, flatY, blend }
  const _flatZones   = [];
  // { cx, cz, hw, hd, y }  — walkable upper floor
  const _upperFloors = [];
  // { cx, cz, hw, hd, y0, y1, axis }  — staircase ramp
  const _ramps       = [];

  function registerFlatZone(cx, cz, hw, hd, blend) {
    _flatZones.push({ cx, cz, hw, hd, flatY: _rawHeight(cx, cz), blend: blend || 4 });
  }

  function registerUpperFloor(cx, cz, hw, hd, y) {
    _upperFloors.push({ cx, cz, hw, hd, y });
  }

  // axis='z': height goes from y0 at (cz-hd) to y1 at (cz+hd)
  // axis='x': height goes from y0 at (cx-hw) to y1 at (cx+hw)
  function registerRamp(cx, cz, hw, hd, y0, y1, axis) {
    _ramps.push({ cx, cz, hw, hd, y0, y1, axis: axis || 'z' });
  }

  function getTerrainHeight(x, z) {
    const raw = _rawHeight(x, z);
    let blended = raw;
    let maxW = 0;

    for (const zone of _flatZones) {
      const dx = Math.max(0, Math.abs(x - zone.cx) - zone.hw);
      const dz = Math.max(0, Math.abs(z - zone.cz) - zone.hd);
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= 0) return zone.flatY;

      if (dist < zone.blend) {
        const w  = 1 - dist / zone.blend;
        const sw = w * w * (3 - 2 * w); // smoothstep
        if (sw > maxW) {
          maxW    = sw;
          blended = zone.flatY * sw + raw * (1 - sw);
        }
      }
    }

    return blended;
  }

  // Returns the highest floor the player is currently standing on.
  // playerY is the camera/eye Y (feet = playerY - 1.7).
  function getEffectiveFloorHeight(x, z, playerY) {
    let best = getTerrainHeight(x, z);

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
      if (floor.y <= playerY - 0.5) best = Math.max(best, floor.y);
    }

    return best;
  }

  window.ZS = window.ZS || {};
  ZS.getTerrainHeight        = getTerrainHeight;
  ZS.getEffectiveFloorHeight = getEffectiveFloorHeight;
  ZS.registerFlatZone        = registerFlatZone;
  ZS.registerUpperFloor      = registerUpperFloor;
  ZS.registerRamp            = registerRamp;
}());
