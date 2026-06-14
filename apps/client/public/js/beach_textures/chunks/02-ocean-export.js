// Océan + lighting + export — beach_textures.js
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
