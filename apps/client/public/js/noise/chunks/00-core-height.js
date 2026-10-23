// Hash, bruit, hauteur brute
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

  const _BEACH_REF_Y = _rawHeightCore(252, 8);

  function _rawHeight(x, z) {
    let h = _rawHeightCore(x, z);
    const bw = ZS.beachCoastWeight ? ZS.beachCoastWeight(x, z) : 0;
    if (bw > 0.02) {
      const w = Math.pow(bw, 0.82);
      h = h * (1 - w * 0.92) + _BEACH_REF_Y * w * 0.92;
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
