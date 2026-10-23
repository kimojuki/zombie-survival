// Viewport adaptatif + plein écran — extrait de game.js (async IIFE)
  // ── Viewport sizing — adapte le rendu à la vraie zone visible ───────────────
  const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  let _frameRecoverUntil = 0;
  let _zombieRecoverSkip = 0;
  let _adaptivePrUntil = 0;
  let _adaptivePrRestoreAfter = 0;
  let _adaptivePrLastResizeAt = 0;
  let _adaptivePrCap = null;
  const _ADAPTIVE_PR_HOLD_MS = 1800;
  const _ADAPTIVE_PR_RESTORE_MS = 3400;
  const _ADAPTIVE_PR_RESIZE_COOLDOWN_MS = 2800;
  let _lastVpW = 0;
  let _lastVpH = 0;
  let _lastVpPr = 0;
  let _lastVpTop = 0;
  let _lastVpLeft = 0;

  let _bootRenderWarmup = 0;

  ZS.beginBootRenderWarmup = (frames) => {
    _bootRenderWarmup = Math.max(0, frames | 0);
    if (_bootRenderWarmup > 0) {
      _adaptivePrCap = ZS._isMobile ? 0.68 : 0.82;
      _adaptivePrRestoreAfter = performance.now() + _ADAPTIVE_PR_RESTORE_MS;
      _resizeToViewport(true);
    }
  };
  ZS.getBootRenderWarmup = () => _bootRenderWarmup;

  ZS.isFrameRecovering = () => performance.now() < _frameRecoverUntil;

  function _effectivePixelRatioMax() {
    const base = ZS.Options?.getProfile?.()?.pixelRatioMax ?? _gfxProf.pixelRatioMax;
    if (_adaptivePrCap != null) return Math.min(base, _adaptivePrCap);
    return base;
  }

  function _resizeToViewport(force = false) {
    // visualViewport donne la vraie zone visible (sous la barre Safari sur iOS)
    const vp = window.visualViewport;
    const w  = vp ? vp.width  : window.innerWidth;
    const h  = vp ? vp.height : window.innerHeight;
    const prMax = _effectivePixelRatioMax();
    const pr = Math.min(window.devicePixelRatio || 1, prMax);
    const top = vp ? vp.offsetTop : 0;
    const left = vp ? vp.offsetLeft : 0;
    if (!force
        && Math.abs(w - _lastVpW) < 0.5
        && Math.abs(h - _lastVpH) < 0.5
        && Math.abs(pr - _lastVpPr) < 0.01
        && Math.abs(top - _lastVpTop) < 0.5
        && Math.abs(left - _lastVpLeft) < 0.5) {
      return;
    }
    _lastVpW = w;
    _lastVpH = h;
    _lastVpPr = pr;
    _lastVpTop = top;
    _lastVpLeft = left;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    canvas.style.top    = top + 'px';
    canvas.style.left   = left + 'px';
  }

  function _tickAdaptivePixelRatio(frameMs) {
    const fps = ZS.PerfMonitor?.getStats?.()?.fps;
    const recover = ZS.isFrameRecovering();
    const sectorBusy = ZS.Network?.isSectorLoadBusy?.();
    const now = performance.now();
    const stressed = frameMs >= 52 || recover || sectorBusy || (fps != null && fps < 15);
    if (stressed) {
      _adaptivePrUntil = now + _ADAPTIVE_PR_HOLD_MS;
      _adaptivePrRestoreAfter = now + _ADAPTIVE_PR_RESTORE_MS;
    }
    const dropCap = ZS._isMobile ? 0.82 : 0.95;
    const shouldDrop = now < _adaptivePrUntil
      || (_adaptivePrCap != null && now < _adaptivePrRestoreAfter);
    const newCap = shouldDrop ? dropCap : null;
    if (newCap === _adaptivePrCap) return;
    if (now - _adaptivePrLastResizeAt < _ADAPTIVE_PR_RESIZE_COOLDOWN_MS) return;
    _adaptivePrCap = newCap;
    _adaptivePrLastResizeAt = now;
    _resizeToViewport();
    if (shouldDrop && ZS.LoadLog?.isEnabled?.()) {
      ZS.LoadLog.post('adaptive-pr-drop', {
        cap: newCap,
        frameMs: Math.round(frameMs),
        fps: fps ?? null,
      });
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', _resizeToViewport);
    if (_isIOS) window.visualViewport.addEventListener('scroll', _resizeToViewport);
  }
  window.addEventListener('resize', _resizeToViewport);
  _resizeToViewport(true);

  // ── Plein écran + orientation paysage ─────────────────────────────────────
  let _fsActive = false;

  function _tryFullscreen() {
    if (_fsActive) return;
    const el = document.documentElement;
    // iOS 16.4+ / Android / desktop
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
    // Orientation (non-iOS)
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  }

  // iOS < 16.4 : scroll trick corrigé — doit temporairement autoriser l'overflow
  function _iosScrollHide() {
    if (!_isIOS || window.navigator.standalone || _fsActive) return;
    const body = document.body;
    body.style.overflow = 'scroll';
    body.style.height   = (window.screen.height + 50) + 'px';
    setTimeout(() => {
      window.scrollTo(0, 50);
      setTimeout(() => {
        body.style.overflow = 'hidden';
        body.style.height   = '';
        _resizeToViewport();
      }, 200);
    }, 60);
  }

  document.addEventListener('fullscreenchange', () => {
    _fsActive = !!document.fullscreenElement;
    if (_iosBtn) _iosBtn.style.display = _fsActive ? 'none' : 'flex';
  });
  document.addEventListener('webkitfullscreenchange', () => {
    _fsActive = !!document.webkitFullscreenElement;
    if (_iosBtn) _iosBtn.style.display = _fsActive ? 'none' : 'flex';
  });

  // Bouton ⛶ persistant pour iOS (barre Safari ne peut pas être cachée
  // autrement que via requestFullscreen ou PWA)
  let _iosBtn = null;
  if (_isIOS && !window.navigator.standalone) {
    _iosBtn = document.createElement('button');
    _iosBtn.textContent = '⛶';
    Object.assign(_iosBtn.style, {
      position: 'fixed', bottom: '82px', left: '12px',
      width: '42px', height: '42px', borderRadius: '10px',
      background: 'rgba(0,0,0,0.65)',
      border: '1px solid rgba(255,255,255,0.3)',
      color: '#fff', fontSize: '22px', lineHeight: '1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '200', cursor: 'pointer',
      backdropFilter: 'blur(4px)',
    });
    document.body.appendChild(_iosBtn);
    _iosBtn.addEventListener('click', () => {
      _tryFullscreen();
      _iosScrollHide();
    });

    // Bannière "Ajouter à l'écran d'accueil" pour plein écran garanti
    const hint = document.createElement('div');
    hint.textContent = '📲 Ajouter à l\'écran d\'accueil pour le vrai plein écran';
    Object.assign(hint.style, {
      position: 'fixed', top: '0', left: '0', right: '0',
      background: 'rgba(0,0,0,0.8)', color: '#fff',
      fontSize: '12px', textAlign: 'center', padding: '6px 8px',
      zIndex: '300', pointerEvents: 'none',
    });
    document.body.appendChild(hint);
    setTimeout(() => { hint.style.display = 'none'; }, 5000);
  }

  function _enterFullscreen() {
    _tryFullscreen();
    _iosScrollHide();
  }

  // Retry plein écran — mobile uniquement (évite de voler le premier clic PC)
  if (_isMobile) {
    document.addEventListener('touchstart', _enterFullscreen);
    document.addEventListener('click', _enterFullscreen);
  }

  if (screen.orientation) {
    screen.orientation.addEventListener('change', () => {
      if (screen.orientation.type.startsWith('landscape')) _enterFullscreen();
    });
  } else {
    window.addEventListener('orientationchange', () => {
      if (Math.abs(window.orientation) === 90) _enterFullscreen();
    });
  }
