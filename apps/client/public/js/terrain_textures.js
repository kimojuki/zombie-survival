// Atlas terrain procédural — sol forêt (mousse, litière, humus) + terre compactée.
(function () {
  'use strict';

  const TILE = 128;
  const ATLAS_W = TILE * 2;
  const ATLAS_H = TILE;

  let _atlasTex = null;

  function _rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Sol forestier : humus clair, mousse, feuilles mortes, taches de lumière filtrée. */
  function _drawForestFloorTile(ctx, S, seed) {
    const rng = _rng(seed);
    const grad = ctx.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, '#6a7e5e');
    grad.addColorStop(0.5, '#647856');
    grad.addColorStop(1, '#6e8262');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    const img = ctx.getImageData(0, 0, S, S);
    const d = img.data;
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const i = (py * S + px) * 4;
        const n = rng();
        const v = (n - 0.5) * 18;
        d[i] = Math.max(0, Math.min(255, d[i] + v * 0.85));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + v * 0.9));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + v * 0.7));
      }
    }
    ctx.putImageData(img, 0, 0);

    for (let i = 0; i < 58; i++) {
      const mx = rng() * S;
      const my = rng() * S;
      const r = 5 + rng() * 16;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, r);
      const bright = rng() < 0.62;
      g.addColorStop(0, bright ? 'rgba(118,148,92,0.72)' : 'rgba(88,118,72,0.55)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.22 + rng() * 0.32;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < 22; i++) {
      const mx = rng() * S;
      const my = rng() * S;
      const r = 8 + rng() * 22;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, r);
      g.addColorStop(0, 'rgba(168,188,128,0.38)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.18 + rng() * 0.22;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const leaves = ['#8a7048', '#9a8058', '#7a6240', '#a89060', '#b8a070', '#6a5840'];
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = leaves[Math.floor(rng() * leaves.length)];
      ctx.globalAlpha = 0.28 + rng() * 0.42;
      ctx.beginPath();
      ctx.ellipse(
        rng() * S, rng() * S,
        1.2 + rng() * 3.2, 0.8 + rng() * 2.2,
        rng() * Math.PI, 0, Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < 90; i++) {
      const x = rng() * S;
      const y = rng() * S;
      const a = rng() * Math.PI;
      const len = 3 + rng() * 7;
      ctx.strokeStyle = `rgba(${72 + rng() * 28},${98 + rng() * 32},${58 + rng() * 18},${0.16 + rng() * 0.28})`;
      ctx.lineWidth = 0.5 + rng() * 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }

    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(${88 + rng() * 18},${108 + rng() * 20},${78 + rng() * 14},${0.12 + rng() * 0.16})`;
      ctx.fillRect(rng() * S, rng() * S, 2 + rng() * 5, 1 + rng() * 2);
    }
  }

  /** Terre / sentier forêt : sol compacté, racines, cailloux. */
  function _drawForestSoilTile(ctx, S, seed) {
    const rng = _rng(seed);
    ctx.fillStyle = '#6a5844';
    ctx.fillRect(0, 0, S, S);

    const img = ctx.getImageData(0, 0, S, S);
    const d = img.data;
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const i = (py * S + px) * 4;
        const n = rng();
        const v = (n - 0.5) * 26;
        d[i] = Math.max(0, Math.min(255, d[i] + v));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + v * 0.85));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + v * 0.7));
      }
    }
    ctx.putImageData(img, 0, 0);

    for (let i = 0; i < 18; i++) {
      const y0 = rng() * S;
      ctx.strokeStyle = `rgba(32,24,18,${0.2 + rng() * 0.25})`;
      ctx.lineWidth = 1 + rng() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      for (let x = 0; x <= S; x += 8) {
        ctx.lineTo(x, y0 + Math.sin(x * 0.15 + i) * 3 + (rng() - 0.5) * 2);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 55; i++) {
      const g = 70 + Math.floor(rng() * 35);
      ctx.fillStyle = `rgba(${g},${g - 10},${g - 22},${0.35 + rng() * 0.4})`;
      ctx.beginPath();
      ctx.arc(rng() * S, rng() * S, 0.8 + rng() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(58,46,34,${0.25 + rng() * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(rng() * S, rng() * S, 2 + rng() * 4, 1 + rng() * 2.5, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function getAtlas() {
    if (_atlasTex) return _atlasTex;
    const c = document.createElement('canvas');
    c.width = ATLAS_W;
    c.height = ATLAS_H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    _drawForestFloorTile(ctx, TILE, 51001);
    ctx.save();
    ctx.translate(TILE, 0);
    _drawForestSoilTile(ctx, TILE, 51002);
    ctx.restore();

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    _atlasTex = tex;
    return _atlasTex;
  }

  window.ZS = window.ZS || {};
  ZS.TerrainTextures = { getAtlas };
}());
