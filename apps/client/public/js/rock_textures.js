// Texture procédurale pour cailloux (main + sol).
(function () {
  'use strict';

  const _cache = new Map();

  function _mulberry32(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _drawRockCanvas(seed) {
    const rng = _mulberry32(seed || 1);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const base = 95 + Math.floor(rng() * 35);
    ctx.fillStyle = `rgb(${base},${base - 8},${base - 18})`;
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 48; i++) {
      const x = rng() * 64;
      const y = rng() * 64;
      const r = 2 + rng() * 7;
      const g = base - 20 + Math.floor(rng() * 40);
      ctx.fillStyle = `rgba(${g},${g - 6},${g - 14},${0.35 + rng() * 0.45})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 12; i++) {
      const x = rng() * 64;
      const y = rng() * 64;
      ctx.fillStyle = `rgba(255,255,255,${0.04 + rng() * 0.08})`;
      ctx.fillRect(x, y, 1 + rng() * 2, 1);
    }
    return c;
  }

  function getRockTexture(seed) {
    const key = seed >>> 0;
    if (_cache.has(key)) return _cache.get(key);
    const tex = new THREE.CanvasTexture(_drawRockCanvas(key));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    _cache.set(key, tex);
    return tex;
  }

  function getRockMaterial(seed, color) {
    return new THREE.MeshLambertMaterial({
      map: getRockTexture(seed),
      color: color || 0xffffff,
    });
  }

  window.ZS = window.ZS || {};
  ZS.RockTextures = { getRockTexture, getRockMaterial };
}());

