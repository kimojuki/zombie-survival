// Textures procédurales forêt — mousse, écorce, fougères, champignons, litière.
(function () {
  'use strict';

  const BARK_POOL = 8;
  const MOSS_POOL = 6;
  const ROCK_POOL = 8;
  const _texCache = new Map();
  const _matCache = new Map();
  const _litMats = new Set();

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
      emissive: opts.emissive ?? 0x0a1008,
      emissiveIntensity: opts.emissiveIntensity ?? 0.07,
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
    });
    _matCache.set(ck, _trackMat(mat, opts.emissiveIntensity ?? 0.07, opts.emissive ?? 0x0a1008));
    return mat;
  }

  function _poolSeed(seed, pool) {
    return Math.abs(Math.floor(seed || 0)) % pool;
  }

  function _drawMossCanvas(seed) {
    const S = 128;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(seed || 33102);
    ctx.fillStyle = '#3d5c32';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 120; i++) {
      const g = 50 + Math.floor(rng() * 55);
      ctx.fillStyle = `rgba(${g},${g + 25},${g - 15},${0.25 + rng() * 0.45})`;
      ctx.beginPath();
      ctx.arc(rng() * S, rng() * S, 2 + rng() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(90,120,60,${0.15 + rng() * 0.2})`;
      ctx.fillRect(rng() * S, rng() * S, 3 + rng() * 5, 1 + rng() * 2);
    }
    return c;
  }

  function _drawBarkCanvas(seed) {
    const S = 128;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(seed || 88201);
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += 4) {
      ctx.strokeStyle = `rgba(35,22,15,${0.15 + rng() * 0.25})`;
      ctx.lineWidth = 1 + rng();
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (rng() - 0.5) * 3, S);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const ky = rng() * S;
      ctx.fillStyle = `rgba(25,15,10,${0.25 + rng() * 0.3})`;
      ctx.fillRect(S * 0.35, ky, S * 0.3, 2 + rng() * 4);
    }
    return c;
  }

  function _drawLeafLitterCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(44123);
    ctx.fillStyle = '#4a3828';
    ctx.fillRect(0, 0, S, S);
    const hues = ['#6a5038', '#8a6848', '#a07850', '#5c4830', '#7a6040'];
    for (let i = 0; i < 85; i++) {
      ctx.fillStyle = hues[Math.floor(rng() * hues.length)];
      ctx.globalAlpha = 0.55 + rng() * 0.4;
      ctx.beginPath();
      ctx.ellipse(rng() * S, rng() * S, 2 + rng() * 4, 1 + rng() * 2.5, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return c;
  }

  function _drawFernCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(77204);
    ctx.fillStyle = '#2a4a28';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 18; i++) {
      const x = rng() * S;
      ctx.strokeStyle = `rgba(${35 + Math.floor(rng() * 30)},${80 + Math.floor(rng() * 50)},${35 + Math.floor(rng() * 25)},0.9)`;
      ctx.lineWidth = 1.5 + rng() * 2;
      ctx.beginPath();
      ctx.moveTo(x, S);
      for (let y = S; y > 0; y -= 6) {
        ctx.lineTo(x + Math.sin(y * 0.2 + i) * 5, y);
      }
      ctx.stroke();
    }
    return c;
  }

  function _drawMushroomCanvas(hue) {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(hue || 99102);
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(0, 0, S, S);
    const cap = hue === 1 ? '#c84838' : (hue === 2 ? '#d8a848' : '#c8c0b0');
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.38, S * 0.32, S * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8d0c0';
    ctx.fillRect(S * 0.46, S * 0.38, S * 0.08, S * 0.35);
    if (hue === 1) {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.arc(S * (0.35 + rng() * 0.3), S * (0.28 + rng() * 0.15), 2 + rng() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return c;
  }

  function _drawForestRockCanvas(seed) {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(seed || 55201);
    const base = 95 + Math.floor(rng() * 25);
    ctx.fillStyle = `rgb(${base},${base - 8},${base - 18})`;
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 45; i++) {
      const g = base - 20 + Math.floor(rng() * 40);
      ctx.fillStyle = `rgba(${g},${g - 6},${g - 14},${0.35 + rng() * 0.45})`;
      ctx.beginPath();
      ctx.arc(rng() * S, rng() * S, 1.5 + rng() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = `rgba(50,75,40,${0.12 + rng() * 0.2})`;
      ctx.fillRect(rng() * S, rng() * S, 4 + rng() * 6, 2 + rng() * 3);
    }
    return c;
  }

  function _drawPineNeedleCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(66203);
    ctx.fillStyle = '#2a3820';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 200; i++) {
      ctx.strokeStyle = `rgba(${40 + Math.floor(rng() * 35)},${70 + Math.floor(rng() * 40)},${30 + Math.floor(rng() * 20)},0.65)`;
      ctx.lineWidth = 0.8 + rng();
      const x = rng() * S;
      const y = rng() * S;
      const a = rng() * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * (3 + rng() * 5), y + Math.sin(a) * (3 + rng() * 5));
      ctx.stroke();
    }
    return c;
  }

  function _drawBerryCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(88205);
    ctx.fillStyle = '#2a4828';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 28; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#8a2838' : '#384828';
      ctx.beginPath();
      ctx.arc(rng() * S, rng() * S, 2 + rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  }

  function _ensureTex(key, drawFn, arg) {
    if (!_texCache.has(key)) _canvasTex(drawFn(arg), key);
  }

  function getMossMaterial(seed) {
    const slot = _poolSeed(seed, MOSS_POOL);
    _ensureTex(`moss:${slot}`, _drawMossCanvas, seed + slot * 17);
    return _matFromKey(`moss:${slot}`, 0xffffff, { emissive: 0x182818, emissiveIntensity: 0.1 });
  }

  function getBarkMaterial(seed) {
    const slot = _poolSeed(seed, BARK_POOL);
    _ensureTex(`bark:${slot}`, _drawBarkCanvas, seed + slot * 31);
    return _matFromKey(`bark:${slot}`, 0xffffff, { emissive: 0x100808, emissiveIntensity: 0.05 });
  }

  function getLeafLitterMaterial() {
    _ensureTex('leafLitter', _drawLeafLitterCanvas);
    return _matFromKey('leafLitter', 0xffffff, { emissive: 0x181008, emissiveIntensity: 0.04 });
  }

  function getFernMaterial() {
    _ensureTex('fern', _drawFernCanvas);
    return _matFromKey('fern', 0xffffff, { emissive: 0x102818, emissiveIntensity: 0.1, side: THREE.DoubleSide });
  }

  function getMushroomMaterial(variant) {
    const v = variant || 0;
    _ensureTex(`mushroom:${v}`, _drawMushroomCanvas, v);
    return _matFromKey(`mushroom:${v}`, 0xffffff, { emissive: 0x201810, emissiveIntensity: 0.06 });
  }

  function getForestRockMaterial(seed) {
    const slot = _poolSeed(seed, ROCK_POOL);
    _ensureTex(`frock:${slot}`, _drawForestRockCanvas, seed + slot * 23);
    return _matFromKey(`frock:${slot}`, 0xffffff, { emissive: 0x101008, emissiveIntensity: 0.04 });
  }

  function getPineNeedleMaterial() {
    _ensureTex('pineNeedle', _drawPineNeedleCanvas);
    return _matFromKey('pineNeedle', 0xffffff, { emissive: 0x142010, emissiveIntensity: 0.08, side: THREE.DoubleSide });
  }

  function getBerryMaterial() {
    _ensureTex('berry', _drawBerryCanvas);
    return _matFromKey('berry', 0xffffff, { emissive: 0x281018, emissiveIntensity: 0.08, side: THREE.DoubleSide });
  }

  function _drawForestGrassCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(33441);
    ctx.fillStyle = '#4a6838';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 42; i++) {
      const x = rng() * S;
      ctx.strokeStyle = `rgba(${45 + Math.floor(rng() * 35)},${85 + Math.floor(rng() * 45)},${35 + Math.floor(rng() * 25)},0.75)`;
      ctx.lineWidth = 1 + rng() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, S);
      ctx.quadraticCurveTo(x + (rng() - 0.5) * 6, S * 0.35, x + (rng() - 0.5) * 3, 0);
      ctx.stroke();
    }
    return c;
  }

  function getForestGrassMaterial() {
    _ensureTex('forestGrass', _drawForestGrassCanvas);
    return _matFromKey('forestGrass', 0xffffff, { emissive: 0x203018, emissiveIntensity: 0.1, side: THREE.DoubleSide });
  }

  function tickForestLighting(dayBlend) {
    const d = Math.max(0, Math.min(1, dayBlend));
    for (const mat of _litMats) {
      const base = mat.userData._baseEmissiveI ?? 0;
      mat.emissiveIntensity = base * d;
      if (d < 0.02) mat.emissive.setHex(0x000000);
      else if (mat.userData._emissiveTint != null) mat.emissive.setHex(mat.userData._emissiveTint);
    }
  }

  window.ZS = window.ZS || {};
  ZS.ForestTextures = {
    getMossMaterial,
    getBarkMaterial,
    getLeafLitterMaterial,
    getFernMaterial,
    getMushroomMaterial,
    getForestRockMaterial,
    getPineNeedleMaterial,
    getBerryMaterial,
    getForestGrassMaterial,
    tickForestLighting,
  };
  ZS.tickForestLighting = tickForestLighting;
}());
