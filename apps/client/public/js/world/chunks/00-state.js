// État, textures, helpers ciel — extrait de world.js (IIFE)
let _scene, _ambientLight, _sunLight, _moonLight, _hemiLight, _sunSprite, _moonSprite, _skyRoot, _starField;
  let _beachIntroGoldenHour = false;
  /** Matin lisible (pas crépuscule) — le caillou intro doit se voir au sol. */
  const BEACH_INTRO_GOLDEN_TIME = 0.31;
  const _fireLights = [];
  const _wallClocks = [];
  const _billboards = [];
  const _billboardVec = new THREE.Vector3();
  const _waterSurfaces = [];
  let _waterAnimTick = 0;
  let _waterAnimEnabled = true;
  let _lastFoliageDay = -1;
  let _colliderCache = null;
  let _colliderCacheFrame = -1;
  const _waterMats  = []; // matériaux de surface d'eau → animés chaque frame
  const _colliders  = [];
  const _decorColliders = new Map(); // decorId -> collider[]
  const _clouds     = [];
  let   _cloudMat   = null;
  let   _cloudTex   = null;
  let   _starMat    = null;
  let   _timeOfDay  = 0.3;
  let   _dayCount   = 0;
  let   _moonPhaseIndex = -1;
  const _DAY_LENGTH_SEC = 1800; // aligné serveur : 15 min jour + 15 min nuit
  function _terrainAtlasTex() {
    return ZS.TerrainTextures?.getAtlas?.()
      || _terrainTexFallback;
  }
  const _terrainTexFallback = new THREE.TextureLoader().load('/img/terrain_atlas.png');
  _terrainTexFallback.wrapS = _terrainTexFallback.wrapT = THREE.RepeatWrapping;
  _terrainTexFallback.magFilter = THREE.LinearFilter;
  _terrainTexFallback.minFilter = THREE.LinearMipmapLinearFilter;
  _terrainTexFallback.colorSpace = THREE.SRGBColorSpace;
  const _treeAtlas = new THREE.TextureLoader().load('/img/tree_atlas.png');
  _treeAtlas.wrapS = _treeAtlas.wrapT = THREE.RepeatWrapping;
  _treeAtlas.magFilter = THREE.NearestFilter;
  _treeAtlas.minFilter = THREE.NearestMipmapLinearFilter;
  _treeAtlas.colorSpace = THREE.SRGBColorSpace;

  function _atlasSlice(texture, offsetX, repeatX) {
    const t = texture.clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(repeatX, 1);
    t.offset.set(offsetX, 0);
    return t;
  }

  const _barkTex = _atlasSlice(_treeAtlas, 0.0, 0.5);
  const _leafTex = _atlasSlice(_treeAtlas, 0.5, 0.5);

  function _inRiver(x, z) { return ZS.isInRiverChannel?.(x, z, 0.8) ?? false; }
  function _onRoad(x, z) { return ZS.isNearRoad?.(x, z, 1.0) ?? false; }
  function _blockedSpawn(x, z) { return _inRiver(x, z) || _onRoad(x, z); }

  let _terrainMesh = null;
  const _groundMeshes = [];
  const _terrainRay = new THREE.Raycaster();
  const _terrainRayOrigin = new THREE.Vector3();
  const _terrainRayDir = new THREE.Vector3(0, -1, 0);
  const _tmpV = new THREE.Vector3();

  // ── Keyframes ciel jour/nuit ──────────────────────────────────────────────────
  const _KEYS = [
    { t: -1.00, sky: 0x060810, amb: 0x090f1e, ambI: 0.15, sunI: 0.00 },
    { t: -0.35, sky: 0x0b1020, amb: 0x0f1628, ambI: 0.16, sunI: 0.00 },
    { t: -0.10, sky: 0x150c28, amb: 0x130e22, ambI: 0.18, sunI: 0.00 },
    { t:  0.00, sky: 0x7a2208, amb: 0x581e0a, ambI: 0.26, sunI: 0.20 }, // horizon
    { t:  0.09, sky: 0xcc5a0a, amb: 0xffaa3a, ambI: 0.40, sunI: 0.68 }, // heure dorée
    { t:  0.22, sky: 0x7ec8e3, amb: 0xfff0c8, ambI: 0.56, sunI: 1.22 }, // matin
    { t:  0.50, sky: 0x5ab2d8, amb: 0xfffae8, ambI: 0.65, sunI: 1.50 }, // midi
    { t:  1.00, sky: 0x5ab2d8, amb: 0xfffae8, ambI: 0.65, sunI: 1.50 },
  ];

  // Couleurs nuages selon l'heure (interpolées sur sunY)
  const _CK = [
    { t: -1.00, r: 0.14, g: 0.17, b: 0.28 }, // minuit : bleu sombre
    { t: -0.08, r: 0.18, g: 0.15, b: 0.30 }, // pré-aube : violet
    { t:  0.00, r: 0.98, g: 0.52, b: 0.28 }, // lever : orange-rose vif
    { t:  0.07, r: 1.00, g: 0.78, b: 0.52 }, // heure dorée : or pâle
    { t:  0.20, r: 0.96, g: 0.97, b: 0.99 }, // matin : blanc légèrement bleuté
    { t:  1.00, r: 0.94, g: 0.96, b: 0.98 }, // jour : blanc cassé
  ];

  const _cA = new THREE.Color(), _cB = new THREE.Color();
  const _cT = new THREE.Color(), _cD = new THREE.Color();
  function _canvasTex(w, h, drawFn) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    drawFn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.needsUpdate = true;
    return t;
  }
  function _makeSunTex() {
    return _canvasTex(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 4, w * 0.5, h * 0.5, w * 0.48);
      g.addColorStop(0, 'rgba(255,255,220,1)');
      g.addColorStop(0.35, 'rgba(255,232,140,0.95)');
      g.addColorStop(0.68, 'rgba(255,184,60,0.8)');
      g.addColorStop(1, 'rgba(255,160,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  function _makeStarTex() {
    return _canvasTex(32, 32, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.48);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,248,220,0.95)');
      g.addColorStop(0.7, 'rgba(180,210,255,0.35)');
      g.addColorStop(1, 'rgba(180,210,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  function _makeCloudTex() {
    return _canvasTex(192, 96, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const blobs = [
        [0.22, 0.58, 0.22],
        [0.38, 0.46, 0.28],
        [0.56, 0.42, 0.26],
        [0.72, 0.54, 0.20],
        [0.48, 0.62, 0.18],
      ];
      for (const [x, y, r] of blobs) {
        const g = ctx.createRadialGradient(w * x, h * y, 0, w * x, h * y, h * r);
        g.addColorStop(0, 'rgba(255,255,255,0.98)');
        g.addColorStop(0.55, 'rgba(250,250,248,0.9)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(w * x, h * y, h * r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  function _makeMoonTex(phase) {
    return _canvasTex(128, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.28;
      ctx.fillStyle = 'rgba(120,150,210,0.12)';
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(230,236,255,0.98)';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      const illum = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
      const waxing = phase < 0.5;
      const shadowOffset = (1 - illum * 2) * r;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(10,14,28,0.94)';
      ctx.beginPath(); ctx.arc(cx + (waxing ? shadowOffset : -shadowOffset), cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    });
  }
  const _sunTex = _makeSunTex();
  const _starTex = _makeStarTex();
  const _cloudBaseTex = _makeCloudTex();
  let _moonTex = _makeMoonTex(0);
  function _moonPhase() { return (_dayCount % 28) / 28; }
  function _moonIllumination(phase) { return 0.5 - 0.5 * Math.cos(phase * Math.PI * 2); }
  function _ensureMoonPhaseTexture(phase) {
    const idx = Math.floor(phase * 28) % 28;
    if (idx === _moonPhaseIndex || !_moonSprite) return;
    _moonPhaseIndex = idx;
    _moonTex.dispose?.();
    _moonTex = _makeMoonTex(idx / 28);
    _moonSprite.material.map = _moonTex;
    _moonSprite.material.needsUpdate = true;
  }

  // ── API ──────────────────────────────────────────────────────────────────────
