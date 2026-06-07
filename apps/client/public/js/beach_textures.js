// Textures procédurales plage — sable, coquillages, bois, déchets, etc.
(function () {
  'use strict';

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

  function _drawSeaweedCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(66771);
    ctx.fillStyle = '#2a5840';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 22; i++) {
      const x = rng() * S;
      ctx.strokeStyle = `rgba(${30 + Math.floor(rng() * 40)},${90 + Math.floor(rng() * 50)},${50 + Math.floor(rng() * 40)},0.85)`;
      ctx.lineWidth = 2 + rng() * 3;
      ctx.beginPath();
      ctx.moveTo(x, S);
      for (let y = S; y > 0; y -= 8) {
        ctx.lineTo(x + Math.sin(y * 0.15 + i) * 6, y);
      }
      ctx.stroke();
    }
    return c;
  }

  function _drawStarfishCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(99317);
    ctx.fillStyle = '#c86840';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 80; i++) {
      const g = 160 + Math.floor(rng() * 60);
      ctx.fillStyle = `rgba(${g},${g - 60},${g - 100},${0.15 + rng() * 0.25})`;
      ctx.beginPath();
      ctx.arc(rng() * S, rng() * S, 1 + rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = 'rgba(120,40,20,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(S / 2, S / 2);
      ctx.lineTo(S / 2 + Math.cos(a) * S * 0.45, S / 2 + Math.sin(a) * S * 0.45);
      ctx.stroke();
    }
    return c;
  }

  function _drawCoconutCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(11803);
    ctx.fillStyle = '#5a4028';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 120; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * S * 0.45;
      ctx.strokeStyle = `rgba(40,25,15,${0.15 + rng() * 0.3})`;
      ctx.lineWidth = 0.5 + rng();
      ctx.beginPath();
      ctx.moveTo(S / 2, S / 2);
      ctx.lineTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r);
      ctx.stroke();
    }
    return c;
  }

  function _drawFabricCanvas(hue) {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(hue || 4422);
    const h = hue || 200;
    ctx.fillStyle = `hsl(${h},55%,55%)`;
    ctx.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 4) {
      for (let x = 0; x < S; x += 4) {
        ctx.fillStyle = `hsla(${h},${40 + rng() * 30}%,${45 + rng() * 20}%,0.5)`;
        ctx.fillRect(x, y, 3, 3);
      }
    }
    for (let i = 0; i < 6; i++) {
      const y = Math.floor(rng() * S);
      ctx.strokeStyle = `hsla(${h + 20},70%,70%,0.35)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
    }
    return c;
  }

  function _drawCrateCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(77001);
    ctx.fillStyle = '#9a7048';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 5; i++) {
      const y = (i + 1) * (S / 6);
      ctx.strokeStyle = 'rgba(60,40,25,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const x = (i + 1) * (S / 5);
      ctx.strokeStyle = 'rgba(70,48,28,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, S);
      ctx.stroke();
    }
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(50,35,20,${0.1 + rng() * 0.2})`;
      ctx.fillRect(rng() * S, rng() * S, 2 + rng() * 4, 1);
    }
    return c;
  }

  function _drawRopeCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(55221);
    ctx.fillStyle = '#c0b090';
    ctx.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += 3) {
      ctx.strokeStyle = `rgba(90,70,50,${0.25 + rng() * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < S; y += 6) {
        ctx.lineTo(x + Math.sin(y * 0.3) * 2, y);
      }
      ctx.stroke();
    }
    return c;
  }

  function _drawNetCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(200,190,170,0.15)';
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(140,130,110,0.65)';
    ctx.lineWidth = 1;
    const step = 8;
    for (let x = 0; x <= S; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, S);
      ctx.stroke();
    }
    for (let y = 0; y <= S; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
    }
    return c;
  }

  function _drawRustCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(88441);
    ctx.fillStyle = '#8a5840';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(${120 + Math.floor(rng() * 80)},${50 + Math.floor(rng() * 40)},${20 + Math.floor(rng() * 30)},${0.2 + rng() * 0.4})`;
      ctx.beginPath();
      ctx.arc(rng() * S, rng() * S, 1 + rng() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  }

  function _drawCoralCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(33199);
    ctx.fillStyle = '#d08070';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = `rgba(${200 + Math.floor(rng() * 40)},${80 + Math.floor(rng() * 60)},${60 + Math.floor(rng() * 50)},${0.3 + rng() * 0.5})`;
      ctx.beginPath();
      ctx.arc(rng() * S, rng() * S, 1 + rng() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  }

  function _drawLitterCanvas(kind) {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(kind === 'bottle' ? 44101 : kind === 'can' ? 44102 : 44103);
    if (kind === 'bottle') {
      ctx.fillStyle = '#3a7858';
      ctx.fillRect(8, 0, 48, S);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, 18, 36, 22);
      ctx.fillStyle = 'rgba(200,40,40,0.7)';
      ctx.fillRect(16, 22, 32, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(10, 4, 8, S - 8);
    } else if (kind === 'can') {
      ctx.fillStyle = '#b0b8c0';
      ctx.fillRect(10, 0, 44, S);
      for (let i = 0; i < 8; i++) {
        ctx.strokeStyle = 'rgba(80,80,90,0.4)';
        ctx.beginPath();
        ctx.moveTo(10, i * 8);
        ctx.lineTo(54, i * 8);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(200,50,40,0.6)';
      ctx.fillRect(18, 20, 28, 12);
    } else {
      const hues = [40, 200, 320, 120];
      const h = hues[Math.floor(rng() * hues.length)];
      ctx.fillStyle = `hsl(${h},70%,50%)`;
      ctx.beginPath();
      ctx.moveTo(10, 20);
      ctx.lineTo(50, 15);
      ctx.lineTo(45, 45);
      ctx.lineTo(8, 40);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    return c;
  }

  function _drawSeaglassCanvas() {
    const S = 32;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(77881);
    const hues = [160, 185, 200, 140];
    const h = hues[Math.floor(rng() * hues.length)];
    const grad = ctx.createRadialGradient(S / 2, S / 2, 1, S / 2, S / 2, S / 2);
    grad.addColorStop(0, `hsla(${h},55%,75%,0.95)`);
    grad.addColorStop(1, `hsla(${h},45%,55%,0.7)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(4, 4, 8, 4);
    return c;
  }

  function _drawSandDollarCanvas() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(66551);
    ctx.fillStyle = '#e8d8c0';
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(160,140,110,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        S / 2 + Math.cos(a) * S * 0.2, S / 2 + Math.sin(a) * S * 0.2,
        S * 0.12, S * 0.08, a, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(180,160,130,${0.1 + rng() * 0.2})`;
      ctx.fillRect(rng() * S, rng() * S, 1, 1);
    }
    return c;
  }

  function _ensureTex(key, drawFn) {
    if (!_texCache.has(key)) _canvasTex(drawFn(), key);
    return _texCache.get(key);
  }

  function _poolSeed(seed, pool) {
    return ((seed || 1) >>> 0) % pool;
  }

  function _ensureWoodTex(seed) {
    const slot = _poolSeed(seed, WOOD_POOL);
    const key = `wood:${slot}`;
    if (!_texCache.has(key)) _canvasTex(_drawWoodCanvas(55103 + slot * 997), key);
    return _texCache.get(key);
  }

  function _ensurePebbleTex(seed) {
    const slot = _poolSeed(seed, PEBBLE_POOL);
    const key = `pebble:${slot}`;
    if (!_texCache.has(key)) _canvasTex(_drawPebbleCanvas(33107 + slot * 503), key);
    return _texCache.get(key);
  }

  function getSandTexture(wet) {
    if (wet) {
      if (!_wetSandTex) _wetSandTex = _canvasTex(_drawSandCanvas(true), 'sand:wet');
      return _wetSandTex;
    }
    if (!_sandTex) _sandTex = _canvasTex(_drawSandCanvas(false), 'sand:dry');
    return _sandTex;
  }

  function getSandMaterial(color, opts) {
    opts = opts || {};
    const wet = !!opts.wet;
    getSandTexture(wet);
    return _matFromKey(wet ? 'sand:wet' : 'sand:dry', color || 0xffffff, {
      emissive: wet ? 0x181410 : 0x2a2218,
      emissiveIntensity: wet ? 0.08 : 0.12,
    });
  }

  function getShellMaterial(tint) {
    _ensureTex('shell', _drawShellCanvas);
    const tints = [0xfff8f0, 0xf0e0d0, 0xe8d0b8, 0xfff0e8];
    return _matFromKey('shell', tint || tints[0], { emissive: 0x201810, emissiveIntensity: 0.06 });
  }

  function getWoodMaterial(seed, tint) {
    const slot = _poolSeed(seed, WOOD_POOL);
    _ensureWoodTex(seed);
    return _matFromKey(`wood:${slot}`, tint || 0xffffff, { emissive: 0x181008, emissiveIntensity: 0.05 });
  }

  function getPebbleMaterial(seed, tint) {
    const slot = _poolSeed(seed, PEBBLE_POOL);
    _ensurePebbleTex(seed);
    return _matFromKey(`pebble:${slot}`, tint || 0xffffff, { emissive: 0x101008, emissiveIntensity: 0.04 });
  }

  function getGrassMaterial() {
    _ensureTex('grass', _drawGrassCanvas);
    return _matFromKey('grass', 0xffffff, { emissive: 0x304010, emissiveIntensity: 0.12, side: THREE.DoubleSide });
  }

  function getSeaweedMaterial() {
    _ensureTex('seaweed', _drawSeaweedCanvas);
    return _matFromKey('seaweed', 0xffffff, { emissive: 0x183020, emissiveIntensity: 0.1, side: THREE.DoubleSide });
  }

  function getStarfishMaterial() {
    _ensureTex('starfish', _drawStarfishCanvas);
    return _matFromKey('starfish', 0xffffff, { emissive: 0x401808, emissiveIntensity: 0.08, side: THREE.DoubleSide });
  }

  function getCoconutMaterial() {
    _ensureTex('coconut', _drawCoconutCanvas);
    return _matFromKey('coconut', 0xffffff, { emissive: 0x181008, emissiveIntensity: 0.05 });
  }

  function getFabricMaterial(hue) {
    const key = `fabric:${hue || 200}`;
    if (!_texCache.has(key)) _canvasTex(_drawFabricCanvas(hue), key);
    return _matFromKey(key, 0xffffff, { emissive: 0x101010, emissiveIntensity: 0.05, side: THREE.DoubleSide });
  }

  function getCrateMaterial() {
    _ensureTex('crate', _drawCrateCanvas);
    return _matFromKey('crate', 0xffffff, { emissive: 0x181008, emissiveIntensity: 0.05 });
  }

  function getRopeMaterial() {
    _ensureTex('rope', _drawRopeCanvas);
    return _matFromKey('rope', 0xffffff, { emissive: 0x181410, emissiveIntensity: 0.05, side: THREE.DoubleSide });
  }

  function getNetMaterial() {
    _ensureTex('net', _drawNetCanvas);
    return _matFromKey('net', 0xffffff, {
      emissive: 0x101010, emissiveIntensity: 0.04, side: THREE.DoubleSide, transparent: true, opacity: 0.88,
    });
  }

  function getRustMaterial() {
    _ensureTex('rust', _drawRustCanvas);
    return _matFromKey('rust', 0xffffff, { emissive: 0x201008, emissiveIntensity: 0.05 });
  }

  function getCoralMaterial() {
    _ensureTex('coral', _drawCoralCanvas);
    return _matFromKey('coral', 0xffffff, { emissive: 0x401818, emissiveIntensity: 0.08 });
  }

  function getLitterMaterial(kind) {
    const key = `litter:${kind}`;
    if (!_texCache.has(key)) _canvasTex(_drawLitterCanvas(kind), key);
    return _matFromKey(key, 0xffffff, { emissive: 0x080808, emissiveIntensity: 0.04 });
  }

  function getSeaglassMaterial() {
    _ensureTex('seaglass', _drawSeaglassCanvas);
    return _matFromKey('seaglass', 0xffffff, {
      emissive: 0x102828, emissiveIntensity: 0.1, transparent: true, opacity: 0.82, side: THREE.DoubleSide,
    });
  }

  function getSandDollarMaterial() {
    _ensureTex('sanddollar', _drawSandDollarCanvas);
    return _matFromKey('sanddollar', 0xffffff, { emissive: 0x201810, emissiveIntensity: 0.06, side: THREE.DoubleSide });
  }

  function _drawOceanCanvas() {
    const W = 512;
    const H = 192;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    const rng = _rng(0x0CE4A71);

    const shoreGrad = ctx.createLinearGradient(0, 0, W, 0);
    shoreGrad.addColorStop(0, '#6ed4c8');
    shoreGrad.addColorStop(0.03, '#48b8ae');
    shoreGrad.addColorStop(0.08, '#2e9aaa');
    shoreGrad.addColorStop(0.18, '#1f7f96');
    shoreGrad.addColorStop(0.32, '#186a82');
    shoreGrad.addColorStop(0.48, '#145a72');
    shoreGrad.addColorStop(0.62, '#124e66');
    shoreGrad.addColorStop(0.78, '#164a60');
    shoreGrad.addColorStop(0.88, '#3a8aaa');
    shoreGrad.addColorStop(0.95, '#6ab8d0');
    shoreGrad.addColorStop(1, '#9ad4e8');
    ctx.fillStyle = shoreGrad;
    ctx.fillRect(0, 0, W, H);

    for (let y = 0; y < H; y++) {
      const v = y / H;
      const wave = Math.sin(v * Math.PI * 14 + rng() * 0.4) * 0.5 + 0.5;
      const alpha = 0.04 + wave * 0.05;
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, `rgba(120,220,210,${alpha * 0.5})`);
      g.addColorStop(0.35, `rgba(40,140,170,${alpha})`);
      g.addColorStop(0.7, `rgba(20,90,120,${alpha * 0.8})`);
      g.addColorStop(1, `rgba(180,230,245,${alpha * 0.35})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, y, W, 1);
    }

    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 48; i++) {
      const y0 = rng() * H;
      const amp = 2 + rng() * 5;
      const freq = 0.008 + rng() * 0.014;
      const phase = rng() * Math.PI * 2;
      ctx.strokeStyle = `rgba(200,245,255,${0.04 + rng() * 0.06})`;
      ctx.lineWidth = 0.6 + rng() * 1.2;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const y = y0 + Math.sin(x * freq + phase) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    const foamGrad = ctx.createLinearGradient(0, 0, W * 0.14, 0);
    foamGrad.addColorStop(0, 'rgba(240,252,255,0.55)');
    foamGrad.addColorStop(0.5, 'rgba(180,235,230,0.22)');
    foamGrad.addColorStop(1, 'rgba(120,200,195,0)');
    ctx.fillStyle = foamGrad;
    ctx.fillRect(0, 0, W * 0.14, H);
    for (let i = 0; i < 280; i++) {
      const x = rng() * W * 0.11;
      const y = rng() * H;
      const r = 0.6 + rng() * 2.8;
      ctx.fillStyle = `rgba(255,255,255,${0.08 + rng() * 0.22})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.5 + rng() * 0.4), rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'soft-light';
    for (let i = 0; i < 90; i++) {
      const x = rng() * W * 0.28;
      const y = rng() * H;
      const r = 4 + rng() * 18;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(160,240,255,${0.08 + rng() * 0.12})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 120; i++) {
      const x = W * (0.15 + rng() * 0.75);
      const y = rng() * H;
      ctx.fillStyle = `rgba(220,250,255,${0.02 + rng() * 0.05})`;
      ctx.fillRect(x, y, 1 + rng() * 2, 1);
    }

    ctx.globalCompositeOperation = 'source-over';
    const haze = ctx.createLinearGradient(W * 0.82, 0, W, 0);
    haze.addColorStop(0, 'rgba(0,0,0,0)');
    haze.addColorStop(0.5, 'rgba(180,220,235,0.12)');
    haze.addColorStop(1, 'rgba(220,245,255,0.28)');
    ctx.fillStyle = haze;
    ctx.fillRect(W * 0.78, 0, W * 0.22, H);

    return c;
  }

  function _ensureOceanTex() {
    const key = 'ocean';
    if (_texCache.has(key)) return _texCache.get(key);
    const tex = new THREE.CanvasTexture(_drawOceanCanvas());
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, OCEAN_UV_TILE_V);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    _texCache.set(key, tex);
    return tex;
  }

  function getOceanMaterial() {
    const ck = 'ocean:mat:v1';
    if (_matCache.has(ck)) return _matCache.get(ck);
    const tex = _ensureOceanTex();
    const mat = new THREE.MeshLambertMaterial({
      map: tex,
      color: 0xffffff,
      emissive: 0x0a2840,
      emissiveIntensity: 0.22,
      transparent: true,
      opacity: 0.93,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    mat.userData._oceanScroll = true;
    mat.userData._baseEmissiveI = 0.22;
    mat.userData._emissiveTint = 0x0a2840;
    _litMats.add(mat);
    _matCache.set(ck, mat);
    return mat;
  }

  function getRockMaterial(seed) {
    if (ZS.RockTextures?.getRockMaterial) return ZS.RockTextures.getRockMaterial(seed, 0xffffff);
    return getPebbleMaterial(seed);
  }

  function tickBeachLighting(dayBlend) {
    const d = Math.max(0, Math.min(1, dayBlend));
    for (const mat of _litMats) {
      const base = mat.userData._baseEmissiveI ?? 0;
      mat.emissiveIntensity = base * d;
      if (d < 0.02) mat.emissive.setHex(0x000000);
      else if (mat.userData._emissiveTint != null) mat.emissive.setHex(mat.userData._emissiveTint);
    }
  }

  window.ZS = window.ZS || {};
  ZS.BeachTextures = {
    getSandTexture,
    getSandMaterial,
    getShellMaterial,
    getWoodMaterial,
    getPebbleMaterial,
    getGrassMaterial,
    getSeaweedMaterial,
    getStarfishMaterial,
    getCoconutMaterial,
    getFabricMaterial,
    getCrateMaterial,
    getRopeMaterial,
    getNetMaterial,
    getRustMaterial,
    getCoralMaterial,
    getLitterMaterial,
    getSeaglassMaterial,
    getSandDollarMaterial,
    getOceanMaterial,
    getRockMaterial,
    tickBeachLighting,
    SAND_UV_TILE,
    OCEAN_UV_TILE_V,
  };
  ZS.tickBeachLighting = tickBeachLighting;
}());
