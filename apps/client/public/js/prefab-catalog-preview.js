// Aperçu 3D des prefabs décor — catalogue admin (Three.js + scripts legacy ZS).
(function () {
  'use strict';

  const SCRIPTS = [
    '/js/camp_textures.js',
    '/js/campfire.js',
    '/js/buildings.js',
    '/js/vehicle_textures.js',
    '/js/rock_textures.js',
    '/js/rock_prefab.js',
    '/js/rock_world_prefabs.js',
    '/js/spawn_clearing.js',
    '/js/s01_prefabs.js',
    '/js/sign_prefabs.js',
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

  const thumbCache = new Map();
  const pendingThumbs = new Set();

  function _noop() {}

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

  async function _spawnRoot(prefabId) {
    await ensureReady();
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
      const root = await _spawnRoot(prefabId);
      if (!root) {
        _drawPlaceholder(canvas, 'introuvable');
        console.warn('[prefab-preview]', _missingPrefabMsg(prefabId));
        return false;
      }
      _ensureThumbRenderer();
      _clearThumbScene();
      thumbScene.add(root);
      _fitCamera(thumbCamera, root, canvas.width / canvas.height, 1.45);
      thumbRenderer.setSize(canvas.width, canvas.height, false);
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
          <div class="preview-modal-actions">
            <button type="button" class="preview-modal-action" id="prefab-preview-reset">Recentrer</button>
            <button type="button" class="preview-modal-action primary" id="prefab-preview-copy">Copier RCON</button>
          </div>
        </div>
        <p class="preview-modal-hint">Glisser pour tourner · molette pour zoomer · clic droit pour déplacer · Échap pour fermer</p>
      </div>`;
    document.body.appendChild(modal);

    const close = () => closeModal();
    modal.querySelector('.preview-modal-close').addEventListener('click', close);
    modal.querySelector('.preview-modal-backdrop').addEventListener('click', close);
    modal.querySelector('#prefab-preview-reset').addEventListener('click', _resetModalView);
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
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    _setModalLoading(true);

    if (!modalRenderer) {
      modalRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      modalRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      modalScene = new THREE.Scene();
      modalScene.background = new THREE.Color(0x0d1511);
      modalCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.05, 300);
      modalScene.add(new THREE.AmbientLight(0xffffff, 0.62));
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
      modalRenderer.render(modalScene, modalCamera);
    };
    tick();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
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
