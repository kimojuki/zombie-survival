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

  function getTerrainHeight(x, z) {
    const s = 0.035;
    return (
      smoothNoise(x * s,        z * s)        * 9 +
      smoothNoise(x * s * 2.7,  z * s * 2.7)  * 3 +
      smoothNoise(x * s * 6.3,  z * s * 6.3)  * 0.8
    ) - 5;
  }

  window.ZS = window.ZS || {};
  ZS.getTerrainHeight = getTerrainHeight;
}());
