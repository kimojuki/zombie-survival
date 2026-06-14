// Cadre lit + materials + export
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
    const texStoveBody = _canvasTex(_drawStoveBodyCanvas(), 'stove:body', 1.2, 1.4);
    const texStoveDoor = _canvasTex(_drawStoveDoorCanvas(), 'stove:door', 1.0, 1.0);
    const texCabinRug = _canvasTex(_drawCabinRugCanvas(), 'cabin:rug', 1.6, 1.0);

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
      /** Poêle cabane — fonte et porte vitrée. */
      stoveBody: () => new THREE.MeshLambertMaterial({ color: 0xffffff, map: texStoveBody }),
      stoveDoor: () => new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: texStoveDoor,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      /** Tapis tissé cabane — laine + bordure. */
      cabinRug: () => new THREE.MeshLambertMaterial({ color: 0xffffff, map: texCabinRug }),
      cabinRugBorder: () => new THREE.MeshLambertMaterial({ color: 0x3e2a1c, map: texCabinRug }),
      bark: () => new THREE.MeshLambertMaterial({ color: 0x4a3018, map: texWoodFine }),
      endWood: () => new THREE.MeshLambertMaterial({ color: 0xc4a070 }),
      ring: () => new THREE.MeshLambertMaterial({ color: 0xc8a878 }),
      rope: () => new THREE.MeshLambertMaterial({ color: 0x3a2a18 }),
      strap: () => new THREE.MeshLambertMaterial({ color: 0x2a3818 }),
      stone: () => new THREE.MeshLambertMaterial({ color: 0x7a7468 }),
      metal: () => new THREE.MeshLambertMaterial({ color: 0x7d7f84 }),
      tool: () => new THREE.MeshLambertMaterial({ color: 0x5f6d46 }),
      trail: (color) => new THREE.MeshLambertMaterial({
        color: color || 0xa89878,
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
