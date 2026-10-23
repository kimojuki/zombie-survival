// Pointer lock + souris — extrait de game.js (async IIFE)
  // ── Input: desktop pointer lock ───────────────────────────────────────────
  let pointerLocked = false;
  let _lockReqId = 0;

  function _safeExitPointerLock() {
    if (!document.pointerLockElement) return;
    _lockReqId += 1;
    try {
      document.exitPointerLock();
    } catch (_) { /* ignore */ }
  }

  function _blocksPointerLock(el) {
    if (!el || el === canvas) return false;
    return !!el.closest?.(
      '#menu-panel, #menu-btn, #inv-panel, #craft-panel, #storage-panel, #storage-backdrop, #sleep-loot-panel, #sleep-loot-backdrop, #sign-backdrop, #sign-panel, #options-backdrop, #options-panel, #admin-backdrop, #admin-panel, #map-overlay, #group-backdrop, #death-screen, '
      + '#connecting-screen, #rcon-panel, #chat-wrap, #hotbar, #craft-btn, #inv-btn, #map-btn, #chat-btn, '
      + '#build-ctl, #zs-admin-live-decor, #zs-admin-live-roads, #zs-admin-map-overlay, #zs-admin-prefab-catalog, #zs-arm-tuner, '
      + '#sprint-btn, #crouch-btn, '
      + 'button, a, input, textarea, select, [contenteditable]'
    );
  }

  function _syncPointerLockUi() {
    pointerLocked = document.pointerLockElement === canvas;
    document.body.classList.toggle('pointer-locked', pointerLocked);
    if (canvas) canvas.style.cursor = pointerLocked ? 'none' : 'crosshair';
  }

  function _uiPanelOpen() {
    const inv = document.getElementById('inv-panel');
    if (inv && inv.style.display === 'block') return true;
    const craft = document.getElementById('craft-panel');
    if (craft && craft.classList.contains('is-open')) return true;
    const map = document.getElementById('map-overlay');
    if (map && map.style.display === 'flex') return true;
    const groupBd = document.getElementById('group-backdrop');
    if (groupBd && groupBd.style.display === 'flex') return true;
    if (ZS.StorageUI?.isOpen?.()) return true;
    if (ZS.SleepLoot?.isOpen?.()) return true;
    if (ZS.SignUI?.isOpen?.()) return true;
    if (ZS.OptionsUI?.isOpen?.()) return true;
    if (ZS.AdminHub?.isOpen?.()) return true;
    if (ZS.AdminWorldMapOverlay?.isOpen?.()) return true;
    if (document.getElementById('zs-admin-prefab-catalog')) return true;
    if (ZS.Calibration?.anyOpen?.() && !ZS.AdminLiveDecor?.isActive?.() && !ZS.ArmTuner?.allowsWalkPreview?.()) return true;
    if (ZS.AdminPanel?.isOpen?.()) return true;
    const death = document.getElementById('death-screen');
    if (death && death.classList.contains('show')) return true;
    const optBd = document.getElementById('options-backdrop');
    if (optBd && optBd.style.display === 'flex') return true;
    const adminBd = document.getElementById('admin-backdrop');
    if (adminBd && adminBd.style.display === 'flex') return true;
    return false;
  }

  function _onUiPanelOpen() {
    if (_isMobile) return;
    _safeExitPointerLock();
  }

  function _onUiPanelClose() {
    // Pas de requestPointerLock ici : Chrome exige un geste utilisateur (clic canvas).
    // Le listener mousedown sur le canvas reprend le lock au prochain clic.
  }

  function _requestPointerLock() {
    if (ZS.SpawnIntro?.isActive?.()) return;
    if (_isMobile || pointerLocked) return;
    if (ZS.AdminWorldMapOverlay?.isOpen?.()) return;
    if (ZS.Rcon?.isOpen?.()) return;
    if (ZS.Chat?.isOpen?.() || document.body.classList.contains('chat-open')) return;
    if (_uiPanelOpen()) return;
    const conn = document.getElementById('connecting-screen');
    if (conn && conn.style.display === 'flex' && !conn.classList.contains('connecting-fade-out')) return;
    if (ZS.Loading?.isActive?.()) return;
    if (!canvas?.requestPointerLock) return;
    const reqId = ++_lockReqId;
    let req;
    try {
      req = canvas.requestPointerLock();
    } catch (_) {
      return;
    }
    if (req && typeof req.then === 'function') {
      req.catch((err) => {
        if (reqId !== _lockReqId) return;
        // SecurityError normal si Esc / panneau / extension bloque le lock.
        if (err?.name !== 'SecurityError' && err?.name !== 'NotAllowedError') {
          console.warn('[input] pointer lock:', err?.message || err);
        }
      });
    }
  }

  if (!_isMobile) {
    document.addEventListener('mousedown', (e) => {
      if (pointerLocked) return;
      if (e.button !== 0) return;
      if (ZS.AdminWorldMapOverlay?.isOpen?.()) return;
      if (ZS.Rcon?.isOpen?.()) return;
      if (ZS.AdminLiveRoads?.isActive?.()) return;
      if (_blocksPointerLock(e.target)) return;
      _requestPointerLock();
    }, true);
  }

  document.addEventListener('pointerlockchange', _syncPointerLockUi);
  document.addEventListener('pointerlockerror', () => {
    _syncPointerLockUi();
  });
  _syncPointerLockUi();
  ZS.requestPointerLock = _requestPointerLock;
  ZS.onUiPanelOpen = _onUiPanelOpen;
  ZS.onUiPanelClose = _onUiPanelClose;

  document.addEventListener('mousemove', (e) => {
    if (ZS.SpawnIntro?.isActive?.()) return;
    if (ZS.AdminWorldMapOverlay?.isOpen?.()) return;
    if (!pointerLocked) {
      _updateViewAimNdc(e.clientX, e.clientY);
      return;
    }
    _viewAimNdc.set(0, 0);
    _viewAimNdcValid = true;
    const sens = ZS.Options?.getLookSensitivity?.().mouse ?? 0.002;
    const inv = ZS.Options?.get?.('invertY') ? -1 : 1;
    state.camera.yaw   -= e.movementX * sens;
    state.camera.pitch -= e.movementY * sens * inv;
    state.camera.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, state.camera.pitch));
  });
