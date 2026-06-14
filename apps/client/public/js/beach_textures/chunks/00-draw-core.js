// Sable, bois, coquillages — beach_textures.js
const SAND_UV_TILE = 3.2;
  const OCEAN_UV_TILE_V = 8;
  const PEBBLE_POOL = 10;
  const WOOD_POOL = 6;
  const _texCache = new Map();
  const _matCache = new Map();
  const _litMats = new Set();

  let _sandTex = null;
  let _wetSandTex = null;

  function _rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _canvasTex(canvas, key) {
    if (_texCache.has(key)) return _texCache.get(key);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    _texCache.set(key, tex);
    return tex;
  }

  function _trackMat(mat, emI, emTint) {
    mat.userData._baseEmissiveI = emI ?? 0;
    mat.userData._emissiveTint = emTint ?? 0;
    _litMats.add(mat);
    return mat;
  }

  function _matFromKey(key, color, opts) {
    opts = opts || {};
    const ck = `${key}:${color}:${opts.side || 0}:${opts.transparent || 0}:${opts.opacity || 1}`;
    if (_matCache.has(ck)) return _matCache.get(ck);
    const tex = _texCache.get(key);
    const mat = new THREE.MeshLambertMaterial({
      map: tex,
      color: color || 0xffffff,
      emissive: opts.emissive ?? 0x101008,
      emissiveIntensity: opts.emissiveIntensity ?? 0.08,
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
      depthWrite: opts.depthWrite !== false,
    });
    _matCache.set(ck, _trackMat(mat, opts.emissiveIntensity ?? 0.08, opts.emissive ?? 0x101008));
    return mat;
  }

  function _drawSandCanvas(wet) {
    const c = document.createElement('canvas');
    const S = 256;
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(wet ? 77231 : 44291);
    const base = wet ? '#b8a078' : '#dcc8a0';
    const dark = wet ? '#9a8868' : '#c4a878';
    const light = wet ? '#d0b890' : '#f0e4c8';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 2) {
      for (let x = 0; x < S; x += 2) {
        const n = rng();
        ctx.fillStyle = n > 0.55 ? light : (n < 0.25 ? dark : base);
        ctx.globalAlpha = 0.35 + rng() * 0.25;
        ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 520; i++) {
      const x = rng() * S;
      const y = rng() * S;
      const g = 160 + Math.floor(rng() * 70);
      ctx.fillStyle = `rgba(${g},${g - 20},${g - 48},${0.06 + rng() * 0.18})`;
      ctx.fillRect(x, y, 1 + rng() * 2, 1);
    }
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(100,85,60,${0.03 + rng() * 0.07})`;
      ctx.beginPath();
      ctx.arc(rng() * S, rng() * S, 0.8 + rng() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!wet) {
      for (let i = 0; i < 35; i++) {
        ctx.fillStyle = `rgba(255,248,230,${0.15 + rng() * 0.25})`;
        ctx.beginPath();
        ctx.ellipse(rng() * S, rng() * S, 1.2 + rng(), 0.8 + rng() * 0.6, rng() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return c;
  }

  function _drawShellCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(88123);
    const grad = ctx.createRadialGradient(S * 0.5, S * 0.45, 2, S * 0.5, S * 0.5, S * 0.55);
    grad.addColorStop(0, '#fff8f0');
    grad.addColorStop(0.5, '#f0dcc8');
    grad.addColorStop(1, '#d8b8a0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.strokeStyle = `rgba(180,140,110,${0.15 + rng() * 0.2})`;
      ctx.lineWidth = 1 + rng();
      ctx.beginPath();
      ctx.moveTo(S * 0.5, S * 0.5);
      ctx.lineTo(S * 0.5 + Math.cos(a) * S * 0.48, S * 0.5 + Math.sin(a) * S * 0.48);
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.08 + rng() * 0.15})`;
      ctx.fillRect(rng() * S, rng() * S, 1, 1);
    }
    return c;
  }

  function _drawWoodCanvas(seed) {
    const S = 128;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(seed || 55103);
    ctx.fillStyle = '#a08058';
    ctx.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 3) {
      const wobble = Math.sin(y * 0.12 + seed) * 4;
      ctx.strokeStyle = `rgba(70,50,30,${0.12 + rng() * 0.18})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + wobble);
      for (let x = 0; x < S; x += 6) ctx.lineTo(x, y + wobble + Math.sin(x * 0.05) * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const kx = rng() * S;
      const ky = rng() * S;
      ctx.fillStyle = `rgba(60,40,25,${0.2 + rng() * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(kx, ky, 4 + rng() * 8, 3 + rng() * 5, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(140,110,80,${0.05 + rng() * 0.1})`;
      ctx.fillRect(rng() * S, rng() * S, 2 + rng() * 4, 1);
    }
    return c;
  }

  function _drawPebbleCanvas(seed) {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(seed || 33107);
    const base = 120 + Math.floor(rng() * 30);
    ctx.fillStyle = `rgb(${base},${base - 10},${base - 22})`;
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 55; i++) {
      const g = base - 25 + Math.floor(rng() * 50);
      ctx.fillStyle = `rgba(${g},${g - 8},${g - 18},${0.3 + rng() * 0.5})`;
      ctx.beginPath();
      ctx.arc(rng() * S, rng() * S, 1.5 + rng() * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.05 + rng() * 0.1})`;
      ctx.fillRect(rng() * S, rng() * S, 1 + rng(), 1);
    }
    return c;
  }

  function _drawGrassCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(22441);
    ctx.fillStyle = '#88a848';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 48; i++) {
      const x = rng() * S;
      ctx.strokeStyle = `rgba(${60 + Math.floor(rng() * 40)},${100 + Math.floor(rng() * 50)},${30 + Math.floor(rng() * 30)},0.7)`;
      ctx.lineWidth = 1 + rng() * 2;
      ctx.beginPath();
      ctx.moveTo(x, S);
      ctx.quadraticCurveTo(x + (rng() - 0.5) * 8, S * 0.4, x + (rng() - 0.5) * 4, 0);
      ctx.stroke();
    }
    return c;
  }
