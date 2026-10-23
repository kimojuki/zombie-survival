// Chargement scripts + thumbnails
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
