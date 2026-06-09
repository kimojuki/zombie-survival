// Textures camp partagées — bois, toile, sac de couchage (prefabs décor + mapgen).
(function () {
  'use strict';

  const URLS = {
    woodLight: '/textures/camp/wood_planks_light.png',
    wood: '/textures/camp/wood_planks.png',
    canvas: '/textures/camp/olive_canvas.png',
    ground: '/textures/camp/spawn_ground.png',
    trailForest: '/textures/camp/trail_forest.png',
  };

  const _texLoader = new THREE.TextureLoader();
  const _texCache = new Map();
  let _mats = null;

  function _rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _canvasTex(canvas, key, repeatX, repeatY) {
    const rk = `${key}|${repeatX || 1}|${repeatY || 1}`;
    if (_texCache.has(rk)) return _texCache.get(rk);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX || 1, repeatY || 1);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    _texCache.set(rk, tex);
    return tex;
  }

  /** Nylon ripstop + surpiqûres — corps sac de couchage déroulé. */
  function _drawBedrollBodyCanvas() {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0xbed011);

    ctx.fillStyle = '#3a4548';
    ctx.fillRect(0, 0, S, S);

    ctx.strokeStyle = 'rgba(18,24,26,0.32)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= S; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, S);
      ctx.stroke();
    }
    for (let y = 0; y <= S; y += 7) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
    }

    for (let y = 14; y < S; y += 20) {
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y - 1);
      ctx.lineTo(S, y - 1);
      ctx.stroke();
    }

    const band = ctx.createLinearGradient(0, 0, S * 0.14, 0);
    band.addColorStop(0, '#7a3214');
    band.addColorStop(0.45, '#c85a28');
    band.addColorStop(1, 'rgba(58,69,72,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, S * 0.14, S);

    ctx.fillStyle = '#141a1c';
    ctx.fillRect(S * 0.47, 0, 5, S);
    ctx.fillStyle = '#5a6268';
    for (let y = 6; y < S; y += 16) {
      ctx.fillRect(S * 0.465, y, 7, 4);
    }

    for (let i = 0; i < 900; i++) {
      const x = rng() * S;
      const y = rng() * S;
      const v = (rng() - 0.5) * 22;
      ctx.fillStyle = `rgba(${58 + v | 0},${69 + v | 0},${72 + v | 0},${0.06 + rng() * 0.1})`;
      ctx.fillRect(x, y, 1 + rng() * 2, 1);
    }

    return c;
  }

  /** Partie roulée — plus sombre, plis concentriques. */
  function _drawBedrollRollCanvas() {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0xbed012);

    ctx.fillStyle = '#2e3638';
    ctx.fillRect(0, 0, S, S);

    for (let i = 0; i < 14; i++) {
      const t = i / 14;
      ctx.strokeStyle = `rgba(0,0,0,${0.12 + t * 0.18})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(S * 0.5, S * 0.5, S * (0.08 + t * 0.38), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(18,24,26,0.35)';
    for (let x = 0; x <= S; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, S);
      ctx.stroke();
    }

    const band = ctx.createLinearGradient(0, 0, 0, S * 0.2);
    band.addColorStop(0, '#8a3818');
    band.addColorStop(1, 'rgba(46,54,56,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, S, S * 0.22);

    for (let i = 0; i < 500; i++) {
      const v = (rng() - 0.5) * 18;
      ctx.fillStyle = `rgba(${46 + v | 0},${54 + v | 0},${56 + v | 0},${0.08})`;
      ctx.fillRect(rng() * S, rng() * S, 2, 1);
    }

    return c;
  }

  /** Capuche / oreiller — doublure polaire claire. */
  function _drawBedrollPillowCanvas() {
    const S = 128;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0xbed013);

    ctx.fillStyle = '#5a6468';
    ctx.fillRect(0, 0, S, S);

    for (let y = 0; y < S; y += 5) {
      for (let x = 0; x < S; x += 5) {
        const n = rng();
        ctx.fillStyle = n > 0.55 ? '#6a7478' : '#4a5458';
        ctx.fillRect(x, y, 5, 5);
      }
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    for (let y = 8; y < S; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
    }

    return c;
  }

  /** Oreiller lit — coton blanc légèrement froissé. */
  function _drawBedPillowCanvas() {
    const S = 128;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0xbed101);

    ctx.fillStyle = '#d8dce0';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 600; i++) {
      const v = (rng() - 0.5) * 16;
      ctx.fillStyle = `rgba(${216 + v | 0},${220 + v | 0},${224 + v | 0},${0.12})`;
      ctx.fillRect(rng() * S, rng() * S, 2, 1);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    for (let y = 10; y < S; y += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
    }
    return c;
  }

  /** Matelas — surpiqûres / capitonnage crème. */
  function _drawBedMattressCanvas() {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0xbed102);

    ctx.fillStyle = '#c8c4b8';
    ctx.fillRect(0, 0, S, S);

    for (let y = 0; y < S; y += 24) {
      for (let x = 0; x < S; x += 24) {
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + 12, y + 12, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.arc(x + 10, y + 10, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < 700; i++) {
      const v = (rng() - 0.5) * 14;
      ctx.fillStyle = `rgba(${200 + v | 0},${196 + v | 0},${184 + v | 0},${0.1})`;
      ctx.fillRect(rng() * S, rng() * S, 2, 1);
    }
    return c;
  }

  /** Couverture / couette — laine olive usée. */
  function _drawBedBlanketCanvas() {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0xbed103);

    ctx.fillStyle = '#4a5a48';
    ctx.fillRect(0, 0, S, S);

    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    for (let y = 8; y < S; y += 11) {
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y * 0.08) * 2);
      ctx.lineTo(S, y + Math.cos(y * 0.06) * 2);
      ctx.stroke();
    }

    for (let i = 0; i < 800; i++) {
      const v = (rng() - 0.5) * 20;
      ctx.fillStyle = `rgba(${74 + v | 0},${90 + v | 0},${72 + v | 0},${0.08 + rng() * 0.1})`;
      ctx.fillRect(rng() * S, rng() * S, 2, 1);
    }

    const fold = ctx.createLinearGradient(0, S * 0.55, 0, S);
    fold.addColorStop(0, 'rgba(0,0,0,0)');
    fold.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = fold;
    ctx.fillRect(0, S * 0.5, S, S * 0.5);
    return c;
  }

  /** Plateau table cabane — planches claires horizontales. */
  function _drawTableTopCanvas() {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0x7ab1e01);

    ctx.fillStyle = '#b8875a';
    ctx.fillRect(0, 0, S, S);

    for (let y = 0; y < S; y += 28) {
      const shade = 168 + Math.floor(rng() * 28);
      ctx.fillStyle = `rgb(${shade + 12},${shade - 8},${shade - 32})`;
      ctx.fillRect(0, y + 1, S, 24);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
    }

    for (let i = 0; i < 12; i++) {
      const kx = rng() * S;
      const ky = rng() * S;
      ctx.fillStyle = 'rgba(60,40,25,0.35)';
      ctx.beginPath();
      ctx.ellipse(kx, ky, 4 + rng() * 8, 3 + rng() * 5, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 500; i++) {
      const v = (rng() - 0.5) * 18;
      ctx.fillStyle = `rgba(${184 + v | 0},${135 + v | 0},${90 + v | 0},${0.06 + rng() * 0.08})`;
      ctx.fillRect(rng() * S, rng() * S, 2, 1);
    }
    return c;
  }

  /** Pieds / ceinture table — bois sombre usé. */
  function _drawTableLegCanvas() {
    const S = 128;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0x7ab1e02);

    ctx.fillStyle = '#4a3224';
    ctx.fillRect(0, 0, S, S);

    for (let x = 0; x < S; x += 24) {
      const shade = 68 + Math.floor(rng() * 22);
      ctx.fillStyle = `rgb(${shade + 8},${shade - 4},${shade - 12})`;
      ctx.fillRect(x + 1, 0, 20, S);
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, S);
      ctx.stroke();
    }

    for (let i = 0; i < 280; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.04 + rng() * 0.1})`;
      ctx.fillRect(rng() * S, rng() * S, 2, 1);
    }
    return c;
  }

  /** Cadre bois — planches + lattes sombres. */
  function _drawBedFrameCanvas() {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0xbed104);

    ctx.fillStyle = '#5c4030';
    ctx.fillRect(0, 0, S, S);

    for (let x = 0; x < S; x += 32) {
      const shade = 90 + Math.floor(rng() * 25);
      ctx.fillStyle = `rgb(${shade + 20},${shade},${shade - 15})`;
      ctx.fillRect(x + 1, 0, 28, S);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, S);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    for (let y = 18; y < S; y += 22) {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
    }

    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.04 + rng() * 0.08})`;
      ctx.fillRect(rng() * S, rng() * S, 3, 1);
    }
    return c;
  }

  function load(url, repeatX, repeatY) {
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

  /** Matériaux réutilisables pour caisses, lits, abris, établi, etc. */
  function materials() {
    if (_mats) return _mats;

    const texWood = load(URLS.woodLight, 2.2, 1.6);
    const texWoodFine = load(URLS.woodLight, 1.2, 1.0);
    const texWoodDark = load(URLS.wood, 1.4, 1.0);
    const texCanvas = load(URLS.canvas, 1.4, 1.2);
    const texCanvasTight = load(URLS.canvas, 0.9, 0.9);
    const texTrail = load(URLS.trailForest, 2.8, 2.8);
    const texBedrollBody = _canvasTex(_drawBedrollBodyCanvas(), 'bedroll:body', 1.8, 1.1);
    const texBedrollRoll = _canvasTex(_drawBedrollRollCanvas(), 'bedroll:roll', 1.2, 1.2);
    const texBedrollPillow = _canvasTex(_drawBedrollPillowCanvas(), 'bedroll:pillow', 1.0, 1.0);
    const texBedFrame = _canvasTex(_drawBedFrameCanvas(), 'bed:frame', 1.4, 1.2);
    const texBedMattress = _canvasTex(_drawBedMattressCanvas(), 'bed:mattress', 1.6, 2.2);
    const texBedBlanket = _canvasTex(_drawBedBlanketCanvas(), 'bed:blanket', 1.4, 1.8);
    const texBedPillow = _canvasTex(_drawBedPillowCanvas(), 'bed:pillow', 1.0, 1.0);
    const texTableTop = _canvasTex(_drawTableTopCanvas(), 'table:top', 1.8, 1.2);
    const texTableLeg = _canvasTex(_drawTableLegCanvas(), 'table:leg', 1.0, 1.0);

    _mats = {
      wood: (color) => new THREE.MeshLambertMaterial({ color: color || 0xc69158, map: texWood }),
      woodFine: (color) => new THREE.MeshLambertMaterial({ color: color || 0xc69158, map: texWoodFine }),
      woodDark: (color) => new THREE.MeshLambertMaterial({ color: color || 0xa16b3f, map: texWoodFine }),
      woodFrame: () => new THREE.MeshLambertMaterial({ color: 0x4a3018, map: texWoodDark }),
      woodPole: (color) => new THREE.MeshLambertMaterial({ color: color || 0xb68753, map: texWoodFine }),
      canvas: (color) => new THREE.MeshLambertMaterial({ color: color || 0x4a5838, map: texCanvas }),
      canvasTight: (color) => new THREE.MeshLambertMaterial({ color: color || 0x5a4030, map: texCanvasTight }),
      /** Sac de couchage déroulé — nylon ripstop (≠ lit/meuble). */
      bedrollBody: () => new THREE.MeshLambertMaterial({ color: 0xffffff, map: texBedrollBody }),
      bedrollRoll: () => new THREE.MeshLambertMaterial({ color: 0xffffff, map: texBedrollRoll }),
      bedrollPillow: () => new THREE.MeshLambertMaterial({ color: 0xffffff, map: texBedrollPillow }),
      /** Lit une place — cadre, matelas, couverture, oreiller. */
      bedFrame: () => new THREE.MeshLambertMaterial({ color: 0xffffff, map: texBedFrame }),
      bedMattress: () => new THREE.MeshLambertMaterial({ color: 0xffffff, map: texBedMattress }),
      bedBlanket: () => new THREE.MeshLambertMaterial({ color: 0xffffff, map: texBedBlanket }),
      bedPillow: () => new THREE.MeshLambertMaterial({ color: 0xffffff, map: texBedPillow }),
      /** Table cabane — plateau et pieds. */
      tableTop: () => new THREE.MeshLambertMaterial({ color: 0xffffff, map: texTableTop }),
      tableLeg: () => new THREE.MeshLambertMaterial({ color: 0xffffff, map: texTableLeg }),
      bark: () => new THREE.MeshLambertMaterial({ color: 0x4a3018, map: texWoodFine }),
      endWood: () => new THREE.MeshLambertMaterial({ color: 0xc4a070 }),
      ring: () => new THREE.MeshLambertMaterial({ color: 0xc8a878 }),
      rope: () => new THREE.MeshLambertMaterial({ color: 0x3a2a18 }),
      strap: () => new THREE.MeshLambertMaterial({ color: 0x2a3818 }),
      stone: () => new THREE.MeshLambertMaterial({ color: 0x7a7468 }),
      metal: () => new THREE.MeshLambertMaterial({ color: 0x7d7f84 }),
      tool: () => new THREE.MeshLambertMaterial({ color: 0x5f6d46 }),
      trail: (color) => new THREE.MeshLambertMaterial({
        color: color || 0x9a8870,
        map: texTrail,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -10,
      }),
    };
    return _mats;
  }

  window.ZS = window.ZS || {};
  ZS.CampTextures = { URLS, load, materials };
}());
