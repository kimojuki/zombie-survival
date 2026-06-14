// Anim preview + stub ZS
const SCRIPTS = [
    '/js/camp_textures.js',
    '/js/campfire.js',
    '/js/world_clock.js',
    '/js/buildings.js',
    '/js/vehicle_textures.js',
    '/js/rock_textures.js',
    '/js/rock_prefab.js',
    '/js/rock_world_prefabs.js',
    '/js/spawn_clearing.js',
    '/js/s01_prefabs.js',
    '/js/sign_prefabs.js',
    '/js/beach_intro_prefabs.js',
    '/js/beach_starter_prefabs.js',
    '/js/urban_prefabs.js',
    '/js/leisure_prefabs.js',
    '/js/vehicle_prefabs.js',
    '/js/tree_prefabs.js',
    '/js/barrier_prefabs.js',
  ];

  let readyPromise = null;
  let loadedAssetVer = null;
  let thumbRenderer = null;
  let thumbScene = null;
  let thumbCamera = null;
  let thumbLights = null;
  let thumbGround = null;

  let modal = null;
  let modalRenderer = null;
  let modalScene = null;
  let modalCamera = null;
  let modalControls = null;
  let modalAnim = 0;
  let modalRoot = null;
  let modalResizeObs = null;
  let modalFitState = null;
  let modalCurrentRcon = '';
  let modalCurrentPrefabId = '';
  let modalReviewStatus = null;
  let modalReviewComment = '';

  const thumbCache = new Map();
  const pendingThumbs = new Set();
  const _liveThumbs = new Map();
  const _previewAnim = { fireLights: [], billboards: [], wallClocks: [] };
  let _previewWorldTime = 0.38;
  let _spawnAnimTarget = _previewAnim;
  const _billboardVec = new THREE.Vector3();
  let _modalAmbient = null;

  function _noop() {}

  function _clearPreviewAnim() {
    _previewAnim.fireLights.length = 0;
    _previewAnim.billboards.length = 0;
    _previewAnim.wallClocks.length = 0;
  }

  function _stopThumbAnim(canvas) {
    const state = _liveThumbs.get(canvas);
    if (!state) return;
    if (state.raf) cancelAnimationFrame(state.raf);
    _liveThumbs.delete(canvas);
    if (state.root) {
      if (state.scene) state.scene.remove(state.root);
      else if (thumbScene) thumbScene.remove(state.root);
    }
  }

  function _stopAllThumbAnims() {
    for (const cv of [..._liveThumbs.keys()]) _stopThumbAnim(cv);
  }

  function _updatePreviewBillboards(camX, camZ, anim = _previewAnim) {
    for (const m of anim.billboards) {
      if (!m?.parent) continue;
      m.getWorldPosition(_billboardVec);
      m.rotation.set(0, Math.atan2(camX - _billboardVec.x, camZ - _billboardVec.z), 0);
    }
  }

  function _tickPreviewAnim(camera, night = 0.88, anim = _previewAnim) {
    if (!camera) return;
    _updatePreviewBillboards(camera.position.x, camera.position.z, anim);
    if (anim.wallClocks.length) {
      _previewWorldTime += 1 / 1800 / 30;
      ZS.applyWallClockHands?.(anim.wallClocks, _previewWorldTime, Date.now());
    }
    if (!anim.fireLights.length && !anim.wallClocks.length) return;
    const t = Date.now();
    const f = 0.82 + Math.sin(t * 0.011) * 0.09 + Math.sin(t * 0.019) * 0.06 + Math.sin(t * 0.034) * 0.04;
    const nightBoost = 0.4 + night * 1.1;
    for (const fl of anim.fireLights) {
      if (!fl.light?.parent) continue;
      const base = fl.baseIntensity ?? 2.2;
      fl.light.intensity = f * base * nightBoost;
      if (fl.fillLight?.parent) fl.fillLight.intensity = (fl.fillBase ?? 0.65) * (0.75 + f * 0.35) * nightBoost;
      if (fl.mesh?.parent) fl.mesh.scale.y = 0.85 + f * 0.22;
      if (fl.onTick) fl.onTick(t, f, night);
    }
  }

  function _hasPreviewAnim(anim = _previewAnim) {
    return anim.fireLights.length > 0 || anim.billboards.length > 0 || anim.wallClocks.length > 0;
  }

  function _primeWallClockPreview(anim = _previewAnim) {
    if (!anim.wallClocks.length || !ZS.applyWallClockHands) return;
    ZS.applyWallClockHands(anim.wallClocks, _previewWorldTime, Date.now());
    for (const c of anim.wallClocks) {
      for (const pivot of [c.hourHand, c.minuteHand]) {
        if (!pivot) continue;
        pivot.traverse((o) => {
          if (o.isMesh) {
            o.renderOrder = Math.max(o.renderOrder || 0, 8);
            if (o.material) {
              o.material.depthTest = true;
              o.material.depthWrite = true;
            }
          }
        });
      }
    }
  }

  function _installPreviewAnimHooks() {
    ZS.registerBillboards = (meshes) => {
      for (const m of meshes) if (m) _spawnAnimTarget.billboards.push(m);
    };
    ZS.registerFireLight = (light, mesh, opts = {}) => {
      _spawnAnimTarget.fireLights.push({
        light,
        mesh: mesh || null,
        baseIntensity: opts.baseIntensity,
        fillLight: opts.fillLight || null,
        fillBase: opts.fillLight?.intensity,
        onTick: opts.onTick || null,
      });
    };
    ZS.updateBillboards = (camX, camZ) => _updatePreviewBillboards(camX, camZ, _spawnAnimTarget);
    ZS.getWorldTime = () => _previewWorldTime;
    ZS.registerWallClock = (clock) => {
      if (clock?.hourHand) _spawnAnimTarget.wallClocks.push(clock);
    };
  }

  function _applyModalPreviewLighting(animated) {
    if (!modalScene) return;
    modalScene.background = new THREE.Color(animated ? 0x050807 : 0x0d1511);
    if (_modalAmbient) _modalAmbient.intensity = animated ? 0.22 : 0.62;
  }

  function _stubZS() {
    window.ZS = window.ZS || {};
    ZS.getTerrainHeight = () => 0;
    ZS.getVisibleTerrainHeight = () => 0;
    ZS.getDecorGroundHeight = () => 0;
    ZS.raycastGroundHeight = () => 0;
    ZS.getBeachSurfaceHeight = () => null;
    ZS.Options = { getProfile: () => ({ shadows: false }) };
    ZS.registerDecorColliders = _noop;
    ZS.registerGroundMesh = _noop;
    ZS.registerUpperFloor = _noop;
    ZS.BuildAnchors = {
      resolveFloorDeckY: null,
      resolveStructureBaseY: null,
      registerFoundation: _noop,
      reconcileAllFoundationHeights: () => [],
    };
    ZS.Network = Object.assign(ZS.Network || {}, {
      syncWorldColliders: _noop,
      patchDecorFloorHeight: _noop,
      getDecorRoot: () => null,
    });
    ZS.Audio = { door: _noop, spatialAt: () => null };
    _installPreviewAnimHooks();
  }

  async function _fetchAssetVer() {
    try {
      const res = await fetch('/api/client-version', { cache: 'no-store' });
      if (!res.ok) return String(Date.now());
      const data = await res.json();
      return data.version || String(Date.now());
    } catch {
      return 'dev';
    }
  }
