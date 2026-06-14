// openModal + export
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
