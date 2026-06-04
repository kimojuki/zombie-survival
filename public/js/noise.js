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

  // { cx, cz, hw, hd, flatY, blend }
  const _flatZones   = [];
  // { cx, cz, hw, hd, y }  — walkable upper floor
  const _upperFloors = [];
  // { cx, cz, hw, hd, y0, y1, axis }  — staircase ramp
  const _ramps       = [];

  function registerFlatZone(cx, cz, hw, hd, blend) {
    _flatZones.push({ cx, cz, hw, hd, flatY: _rawHeight(cx, cz), blend: blend || 4 });
  }

  // Aplatit le terrain le long d'un tracé. On approxime la route par une suite de
  // petites zones plates qui se chevauchent, ce qui évite que l'herbe ressorte
  // au-dessus du ruban routier sur les bosses du terrain.
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
        _flatZones.push({
          cx: x,
          cz: z,
          hw: half + pad,
          hd: half + pad,
          flatY: _rawHeight(x, z),
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
  ZS.registerFlatPath        = registerFlatPath;
  ZS.registerUpperFloor      = registerUpperFloor;
  ZS.registerRamp            = registerRamp;
}());
