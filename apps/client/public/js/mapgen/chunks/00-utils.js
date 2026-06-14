// Textures camp + bruit
const _texLoader = new THREE.TextureLoader();
  const _texCache = new Map();

  function _campTexture(url, repeatX, repeatY) {
    if (ZS.CampTextures?.load) return ZS.CampTextures.load(url, repeatX, repeatY);
    const key = `${url}|${repeatX || 1}|${repeatY || 1}`;
    if (_texCache.has(key)) return _texCache.get(key);
    const tex = _texLoader.load(url);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX || 1, repeatY || 1);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    _texCache.set(key, tex);
    return tex;
  }

  function _rng(seed) {
    let s = seed >>> 0;
    return () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return (s >>> 0) / 0xffffffff;
    };
  }

  function _clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function _smoothstep(t) {
    const x = _clamp01(t);
    return x * x * (3 - 2 * x);
  }

  function _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function _hash(x, z) {
    const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function _noise(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    const xf = x - xi, zf = z - zi;
    const ux = xf * xf * (3 - 2 * xf);
    const uz = zf * zf * (3 - 2 * zf);
    return _lerp(
      _lerp(_hash(xi, zi), _hash(xi + 1, zi), ux),
      _lerp(_hash(xi, zi + 1), _hash(xi + 1, zi + 1), ux),
      uz
    );
  }

  function _avgTerrain(x, z, radius) {
    const r = radius || 1.5;
    let sum = 0;
    let count = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        sum += ZS.getTerrainHeight(x + dx * r, z + dz * r);
        count++;
      }
    }
    return count ? sum / count : ZS.getTerrainHeight(x, z);
  }
