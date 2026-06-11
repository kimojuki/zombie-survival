// Aperçu 3D des prefabs décor — catalogue admin (Three.js + scripts legacy ZS).
(function () {
  'use strict';

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
    ZS.Network = { syncWorldColliders: _noop, patchDecorFloorHeight: _noop, getDecorRoot: () => null };
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

  function _loadScript(src, ver) {
    const url = `${src}${src.includes('?') ? '&' : '?'}v=${encodeURIComponent(ver)}`;
    const existing = document.querySelector(`script[data-prefab-preview="${CSS.escape(url)}"]`);
    if (existing) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.dataset.prefabPreview = url;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Chargement échoué: ${src}`));
      document.head.appendChild(s);
    });
  }

  function _getOrbitControls() {
    const OC = window.__OrbitControls;
    if (!OC) throw new Error('OrbitControls non chargé — recharger la page');
    return OC;
  }

  async function ensureReady(force = false) {
    const ver = await _fetchAssetVer();
    if (force || (loadedAssetVer && loadedAssetVer !== ver)) {
      readyPromise = null;
      thumbCache.clear();
    }
    if (readyPromise) return readyPromise;
    loadedAssetVer = ver;
    readyPromise = (async () => {
      if (!window.THREE?.Group) throw new Error('THREE non disponible — recharger la page');
      _stubZS();
      for (const src of SCRIPTS) await _loadScript(src, ver);
      if (!ZS.spawnDecorPrefab || !ZS.listDecorPrefabs) {
        throw new Error('spawn_clearing non chargé');
      }
    })().catch((err) => {
      readyPromise = null;
      throw err;
    });
    return readyPromise;
  }

  function _prefabKnown(prefabId) {
    return !!(ZS.listDecorPrefabs && ZS.listDecorPrefabs().includes(prefabId));
  }

  function _makeThumbScene(dark = false) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(dark ? 0x050807 : 0x0d1511);
    scene.add(new THREE.AmbientLight(0xffffff, dark ? 0.22 : 0.62));
    const dir = new THREE.DirectionalLight(0xffffff, 0.92);
    dir.position.set(5, 9, 6);
    scene.add(dir);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshLambertMaterial({ color: 0x152019 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    scene.add(ground);
    return scene;
  }

  async function _spawnRoot(prefabId, animTarget = _previewAnim) {
    await ensureReady();
    _spawnAnimTarget = animTarget;
    animTarget.fireLights.length = 0;
    animTarget.billboards.length = 0;
    animTarget.wallClocks.length = 0;
    const scene = new THREE.Scene();
    let root = ZS.spawnDecorPrefab(scene, prefabId, 0, 0, 0, _previewOpts(prefabId));
    if (root) return root;

    if (!_prefabKnown(prefabId)) {
      const ver = await _fetchAssetVer();
      if (ver !== loadedAssetVer) {
        readyPromise = null;
        loadedAssetVer = null;
        thumbCache.clear();
        await ensureReady();
        root = ZS.spawnDecorPrefab(scene, prefabId, 0, 0, 0, _previewOpts(prefabId));
        if (root) return root;
      }
    }
    return null;
  }

  function _previewOpts(prefabId) {
    const large = prefabId.startsWith('building_')
      || prefabId.startsWith('smallcity_')
      || prefabId.startsWith('s01_');
    const opts = {
      grounded: false,
      rotY: large ? 0.55 : 0.35,
      scale: 1,
    };
    if (prefabId.startsWith('wreck_')) {
      opts.wreckVariant = 'rust';
      opts.wreckTilt = 0.12;
      opts.wreckWheels = 2;
    }
    if (prefabId.startsWith('tree_')) {
      opts.treeSeed = 42;
    }
    return opts;
  }

  function _missingPrefabMsg(prefabId) {
    const known = _prefabKnown(prefabId);
    if (known) return `${prefabId} — erreur mesh (voir console)`;
    const n = ZS.listDecorPrefabs?.().length || 0;
    return `${prefabId} — absent du client (${n} prefabs). Ctrl+F5 ou redémarrer le serveur.`;
  }

  function _fitCamera(camera, root, aspect, pad = 1.35) {
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) {
      camera.position.set(2.2, 1.4, 2.2);
      camera.lookAt(0, 0.6, 0);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      return { center: new THREE.Vector3(0, 0.6, 0), pad, aspect };
    }
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z, 0.4);
    const dist = maxDim * pad;
    camera.position.set(center.x + dist * 0.72, center.y + maxDim * 0.42, center.z + dist * 0.85);
    camera.lookAt(center.x, center.y + maxDim * 0.12, center.z);
    camera.aspect = aspect;
    camera.near = Math.max(0.02, dist / 80);
    camera.far = Math.max(80, dist * 12);
    camera.updateProjectionMatrix();
    return { center: center.clone(), pad, aspect };
  }

  function _ensureThumbRenderer() {
    if (thumbRenderer) return;
    thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    thumbRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    thumbScene = new THREE.Scene();
    thumbScene.background = new THREE.Color(0x0d1511);
    thumbCamera = new THREE.PerspectiveCamera(42, 4 / 3, 0.05, 250);
    thumbLights = new THREE.Group();
    thumbLights.add(new THREE.AmbientLight(0xffffff, 0.62));
    const dir = new THREE.DirectionalLight(0xffffff, 0.92);
    dir.position.set(5, 9, 6);
    thumbLights.add(dir);
    thumbScene.add(thumbLights);
    thumbGround = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshLambertMaterial({ color: 0x152019 }),
    );
    thumbGround.rotation.x = -Math.PI / 2;
    thumbGround.position.y = -0.02;
    thumbScene.add(thumbGround);
  }

  function _clearThumbScene() {
    if (!thumbScene) return;
    const stale = thumbScene.children.filter((c) => c !== thumbLights && c !== thumbGround);
    for (const c of stale) thumbScene.remove(c);
  }

  function _drawPlaceholder(canvas, msg) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0d1511';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5a6a60';
    ctx.font = '11px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(msg || 'N/A', w / 2, h / 2);
  }

  async function renderThumbnail(prefabId, canvas) {
    if (!prefabId || !canvas) return false;
    if (thumbCache.has(prefabId)) {
      const img = thumbCache.get(prefabId);
      const ctx = canvas.getContext('2d');
      if (ctx && img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return true;
    }
    try {
      _stopThumbAnim(canvas);
      _ensureThumbRenderer();
      _clearThumbScene();

      const thumbAnim = { fireLights: [], billboards: [], wallClocks: [] };
      const root = await _spawnRoot(prefabId, thumbAnim);
      if (!root) {
        _drawPlaceholder(canvas, 'introuvable');
        console.warn('[prefab-preview]', _missingPrefabMsg(prefabId));
        return false;
      }
      _fitCamera(thumbCamera, root, canvas.width / canvas.height, 1.45);
      thumbRenderer.setSize(canvas.width, canvas.height, false);

      if (_hasPreviewAnim(thumbAnim)) {
        const scene = _makeThumbScene(true);
        scene.add(root);
        _primeWallClockPreview(thumbAnim);
        const tick = () => {
          if (!canvas.isConnected) {
            _stopThumbAnim(canvas);
            return;
          }
          _tickPreviewAnim(thumbCamera, 0.88, thumbAnim);
          thumbRenderer.render(scene, thumbCamera);
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(thumbRenderer.domElement, 0, 0, canvas.width, canvas.height);
          _liveThumbs.set(canvas, { raf: requestAnimationFrame(tick), root, scene, anim: thumbAnim });
        };
        tick();
        canvas.dispatchEvent(new CustomEvent('prefab-thumb-done', { bubbles: true }));
        return true;
      }

      thumbScene.add(root);
      thumbRenderer.render(thumbScene, thumbCamera);
      _clearThumbScene();

      const snap = document.createElement('canvas');
      snap.width = canvas.width;
      snap.height = canvas.height;
      snap.getContext('2d').drawImage(thumbRenderer.domElement, 0, 0);
      thumbCache.set(prefabId, snap);

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(snap, 0, 0);
      canvas.dispatchEvent(new CustomEvent('prefab-thumb-done', { bubbles: true }));
      return true;
    } catch (err) {
      console.warn('[prefab-preview]', prefabId, err);
      _drawPlaceholder(canvas, 'erreur');
      canvas.dispatchEvent(new CustomEvent('prefab-thumb-done', { bubbles: true }));
      return false;
    }
  }

  function _queueThumb(prefabId, canvas) {
    if (!prefabId || !canvas || canvas.dataset.rendered === '1') return;
    if (pendingThumbs.has(canvas)) return;
    pendingThumbs.add(canvas);
    ensureReady()
      .then(() => renderThumbnail(prefabId, canvas))
      .finally(() => {
        pendingThumbs.delete(canvas);
        canvas.dataset.rendered = '1';
      });
  }

  function scheduleThumbnails(container) {
    if (!container) return;
    _stopAllThumbAnims();
    _clearThumbScene();
    const canvases = container.querySelectorAll('canvas.preview-thumb[data-prefab-id]');
    if (!canvases.length) return;

    if (!('IntersectionObserver' in window)) {
      canvases.forEach((cv) => _queueThumb(cv.dataset.prefabId, cv));
      return;
    }

    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const cv = entry.target;
        obs.unobserve(cv);
        _queueThumb(cv.dataset.prefabId, cv);
      }
    }, { rootMargin: '120px' });

    canvases.forEach((cv) => {
      if (cv.dataset.rendered !== '1') obs.observe(cv);
    });
  }

  function _stopModalAnim() {
    if (modalAnim) cancelAnimationFrame(modalAnim);
    modalAnim = 0;
  }

  function _disposeModalRoot() {
    if (!modalRoot || !modalScene) return;
    modalScene.remove(modalRoot);
    modalRoot = null;
    modalFitState = null;
    _clearPreviewAnim();
    _applyModalPreviewLighting(false);
  }

  function _updateModalReviewButtons() {
    if (!modal) return;
    const valBtn = modal.querySelector('#prefab-preview-validate');
    const reworkBtn = modal.querySelector('#prefab-preview-rework');
    if (!valBtn || !reworkBtn) return;
    valBtn.classList.toggle('active', modalReviewStatus === 'validated');
    reworkBtn.classList.toggle('active', modalReviewStatus === 'rework');
    const noteEl = modal.querySelector('#prefab-preview-rework-note');
    if (noteEl) {
      const show = modalReviewStatus === 'rework' && modalReviewComment;
      noteEl.textContent = show ? `Note : ${modalReviewComment}` : '';
      noteEl.classList.toggle('hidden', !show);
    }
  }

  function _setModalReviewStatus(status, comment) {
    modalReviewStatus = status || null;
    if (comment !== undefined) modalReviewComment = String(comment || '');
    _updateModalReviewButtons();
  }

  function _setModalLoading(on, msg) {
    const el = modal?.querySelector('#prefab-preview-loading');
    if (!el) return;
    el.textContent = msg || 'Génération du modèle…';
    el.classList.toggle('hidden', !on);
  }

  function _modalResize() {
    if (!modalRenderer || !modalCamera) return;
    const canvas = modal.querySelector('#prefab-preview-canvas');
    const viewport = modal.querySelector('#prefab-preview-viewport');
    if (!canvas || !viewport) return;
    const w = viewport.clientWidth;
    const h = viewport.clientHeight || 540;
    modalRenderer.setSize(w, h, false);
    modalCamera.aspect = w / h;
    modalCamera.updateProjectionMatrix();
    if (modalFitState) modalFitState.aspect = w / h;
  }

  function _resetModalView() {
    if (!modalRoot || !modalCamera || !modalControls || !modalFitState) return;
    _fitCamera(modalCamera, modalRoot, modalFitState.aspect, modalFitState.pad);
    modalControls.target.copy(modalFitState.center);
    modalControls.update();
  }

  async function _ensureModalDom() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'prefab-preview-modal';
    modal.className = 'preview-modal hidden';
    modal.innerHTML = `
      <div class="preview-modal-backdrop"></div>
      <div class="preview-modal-panel" role="dialog" aria-modal="true" aria-labelledby="prefab-preview-id">
        <header class="preview-modal-head">
          <div>
            <div class="preview-modal-id" id="prefab-preview-id"></div>
            <div class="preview-modal-label" id="prefab-preview-label"></div>
            <div class="preview-modal-cat" id="prefab-preview-cat"></div>
            <div class="preview-modal-orient" id="prefab-preview-orient"></div>
          </div>
          <button type="button" class="preview-modal-close" aria-label="Fermer">×</button>
        </header>
        <div class="preview-modal-viewport" id="prefab-preview-viewport">
          <div class="preview-modal-loading" id="prefab-preview-loading">Génération du modèle…</div>
          <canvas id="prefab-preview-canvas"></canvas>
        </div>
        <div class="preview-modal-foot">
          <p class="preview-modal-desc" id="prefab-preview-desc"></p>
          <p class="preview-modal-rework-note hidden" id="prefab-preview-rework-note"></p>
          <div class="preview-modal-actions">
            <button type="button" class="preview-modal-action validate" id="prefab-preview-validate">Valider</button>
            <button type="button" class="preview-modal-action rework" id="prefab-preview-rework">À refaire</button>
            <button type="button" class="preview-modal-action" id="prefab-preview-reset">Recentrer</button>
            <button type="button" class="preview-modal-action primary" id="prefab-preview-copy">Copier RCON</button>
          </div>
        </div>
        <p class="preview-modal-hint" id="prefab-preview-hint">Glisser pour tourner · molette pour zoomer · clic droit pour déplacer · Échap pour fermer</p>
      </div>`;
    document.body.appendChild(modal);

    const close = () => closeModal();
    modal.querySelector('.preview-modal-close').addEventListener('click', close);
    modal.querySelector('.preview-modal-backdrop').addEventListener('click', close);
    modal.querySelector('#prefab-preview-reset').addEventListener('click', _resetModalView);
    const _emitReview = (status) => {
      if (!modalCurrentPrefabId) return;
      document.dispatchEvent(new CustomEvent('prefab-review-request', {
        detail: { prefabId: modalCurrentPrefabId, status },
      }));
    };
    modal.querySelector('#prefab-preview-validate').addEventListener('click', () => _emitReview('validated'));
    modal.querySelector('#prefab-preview-rework').addEventListener('click', () => _emitReview('rework'));
    window.addEventListener('prefab-review-changed', (e) => {
      if (!modal || modal.classList.contains('hidden')) return;
      if (e.detail?.prefabId !== modalCurrentPrefabId) return;
      _setModalReviewStatus(e.detail?.status || null, e.detail?.comment || '');
    });
    modal.querySelector('#prefab-preview-copy').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      if (!modalCurrentRcon) return;
      try {
        await navigator.clipboard.writeText(modalCurrentRcon);
        btn.textContent = 'Copié !';
        setTimeout(() => { btn.textContent = 'Copier RCON'; }, 1600);
      } catch {
        btn.textContent = 'Échec';
        setTimeout(() => { btn.textContent = 'Copier RCON'; }, 1600);
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
    });
    return modal;
  }

  async function openModal(prefabId, meta) {
    if (typeof meta === 'string') meta = { label: meta };
    meta = meta || {};

    await ensureReady();
    await _ensureModalDom();

    const canvas = modal.querySelector('#prefab-preview-canvas');
    modal.querySelector('#prefab-preview-id').textContent = prefabId;
    modal.querySelector('#prefab-preview-label').textContent = meta.label || prefabId;
    modal.querySelector('#prefab-preview-cat').textContent = meta.category || '';
    const orientEl = modal.querySelector('#prefab-preview-orient');
    if (orientEl) {
      orientEl.textContent = meta.orientationDetail || meta.orientation || '';
    }
    modal.querySelector('#prefab-preview-desc').textContent = meta.desc || '';
    modalCurrentRcon = meta.rcon || '';
    modalCurrentPrefabId = prefabId;
    _setModalReviewStatus(meta.reviewStatus || null, meta.reviewComment || '');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    _setModalLoading(true);

    if (!modalRenderer) {
      modalRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      modalRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      modalScene = new THREE.Scene();
      modalScene.background = new THREE.Color(0x0d1511);
      modalCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.05, 300);
      _modalAmbient = new THREE.AmbientLight(0xffffff, 0.62);
      modalScene.add(_modalAmbient);
      const dir = new THREE.DirectionalLight(0xffffff, 0.95);
      dir.position.set(6, 10, 7);
      modalScene.add(dir);
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 80),
        new THREE.MeshLambertMaterial({ color: 0x152019 }),
      );
      ground.rotation.x = -Math.PI / 2;
      modalScene.add(ground);

      const viewport = modal.querySelector('#prefab-preview-viewport');
      if (viewport && 'ResizeObserver' in window) {
        modalResizeObs = new ResizeObserver(() => _modalResize());
        modalResizeObs.observe(viewport);
      } else {
        window.addEventListener('resize', _modalResize);
      }
    }

    _stopModalAnim();
    _disposeModalRoot();
    if (modalControls) {
      modalControls.dispose();
      modalControls = null;
    }

    await new Promise((r) => requestAnimationFrame(r));

    modalRoot = await _spawnRoot(prefabId);
    if (!modalRoot) {
      _setModalLoading(false, _missingPrefabMsg(prefabId));
      console.warn('[prefab-preview]', _missingPrefabMsg(prefabId));
      return;
    }
    modalScene.add(modalRoot);
    _modalResize();
    modalFitState = _fitCamera(modalCamera, modalRoot, modalCamera.aspect, 1.55);
    _primeWallClockPreview(_previewAnim);
    _applyModalPreviewLighting(_hasPreviewAnim());

    const hintEl = modal.querySelector('#prefab-preview-hint');
    if (hintEl) {
      const animNote = _previewAnim.wallClocks.length
        ? 'heure du jeu'
        : (_previewAnim.fireLights.length ? 'feu / flammes' : '');
      hintEl.textContent = _hasPreviewAnim()
        ? `Aperçu animé (${animNote}) · glisser pour tourner · molette pour zoomer · Échap pour fermer`
        : 'Glisser pour tourner · molette pour zoomer · clic droit pour déplacer · Échap pour fermer';
    }

    const OrbitControls = _getOrbitControls();
    modalControls = new OrbitControls(modalCamera, canvas);
    modalControls.enableDamping = true;
    modalControls.dampingFactor = 0.08;
    modalControls.target.copy(modalFitState.center);
    modalControls.update();

    _setModalLoading(false);

    const tick = () => {
      modalAnim = requestAnimationFrame(tick);
      modalControls.update();
      _tickPreviewAnim(modalCamera);
      modalRenderer.render(modalScene, modalCamera);
    };
    tick();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    modalCurrentPrefabId = '';
    _setModalReviewStatus(null);
    _stopModalAnim();
    _disposeModalRoot();
    if (modalControls) {
      modalControls.dispose();
      modalControls = null;
    }
  }

  window.PrefabCatalogPreview = {
    ensureReady,
    renderThumbnail,
    scheduleThumbnails,
    openModal,
    closeModal,
  };
}());
