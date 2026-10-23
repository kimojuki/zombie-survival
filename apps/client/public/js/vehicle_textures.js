// Textures procédurales épaves — peinture abîmée / rouille / calcinée.
(function () {
  'use strict';

  const _cache = new Map();

  const VARIANTS = {
    rust:   { base: '#6a3820', rust: 0.55, dirt: 0.35, scratch: 0.4 },
    olive:  { base: '#3d4a28', rust: 0.35, dirt: 0.45, scratch: 0.35 },
    navy:   { base: '#2a3348', rust: 0.3, dirt: 0.3, scratch: 0.38 },
    beige:  { base: '#8a7860', rust: 0.28, dirt: 0.5, scratch: 0.32 },
    burnt:  { base: '#1a1410', rust: 0.15, dirt: 0.2, scratch: 0.15, char: 0.85 },
  };

  function _hash(n) {
    const x = Math.sin(n * 127.1) * 43758.5453;
    return x - Math.floor(x);
  }

  function _paintCanvas(def, w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');

    ctx.fillStyle = def.base;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 140; i++) {
      const x = _hash(i * 3.1) * w;
      const y = _hash(i * 7.3 + 1) * h;
      const r = 2 + _hash(i * 11) * 14 * def.rust;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(120, 55, 28, ${0.25 + def.rust * 0.35})`);
      g.addColorStop(1, 'rgba(80, 40, 20, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    for (let i = 0; i < 90; i++) {
      const x = _hash(i * 5.7 + 20) * w;
      const y = _hash(i * 2.9 + 40) * h;
      ctx.fillStyle = `rgba(45, 38, 28, ${0.08 + def.dirt * 0.2})`;
      ctx.fillRect(x, y, 3 + _hash(i) * 8, 2 + _hash(i + 1) * 5);
    }

    ctx.strokeStyle = `rgba(20, 18, 16, ${0.15 + def.scratch * 0.25})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      const x0 = _hash(i * 13) * w;
      const y0 = _hash(i * 17) * h;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + (_hash(i + 50) - 0.5) * 40, y0 + (_hash(i + 60) - 0.5) * 20);
      ctx.stroke();
    }

    if (def.char > 0.5) {
      ctx.fillStyle = `rgba(8, 6, 4, ${def.char})`;
      ctx.fillRect(0, h * 0.35, w, h * 0.4);
      for (let i = 0; i < 40; i++) {
        const x = _hash(i * 19) * w;
        const y = h * 0.3 + _hash(i * 23) * h * 0.45;
        ctx.fillStyle = `rgba(255, 90, 20, ${0.03 + _hash(i) * 0.08})`;
        ctx.fillRect(x, y, 4, 4);
      }
    }

    return c;
  }

  function paint(variant, repeatX, repeatY) {
    const key = `${variant}|${repeatX || 1}|${repeatY || 1}`;
    if (_cache.has(key)) return _cache.get(key);

    const def = VARIANTS[variant] || VARIANTS.rust;
    const canvas = _paintCanvas(def, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX || 1.2, repeatY || 1.0);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    _cache.set(key, tex);
    return tex;
  }

  function material(variant, opts) {
    opts = opts || {};
    const v = opts.burnt ? 'burnt' : (variant || 'rust');
    return new THREE.MeshLambertMaterial({
      map: paint(v, opts.repeatX, opts.repeatY),
      color: opts.burnt ? 0x2a2018 : 0xffffff,
    });
  }

  window.ZS = window.ZS || {};
  ZS.VehicleTextures = { paint, material, variants: () => Object.keys(VARIANTS) };
}());
