// Clavier + raccourcis admin — extrait de game.js (async IIFE)
  // ── Input: keyboard ───────────────────────────────────────────────────────
  function _rconTyping(e) {
    const t = e.target;
    return t && (t.id === 'rcon-input' || t.closest?.('#rcon-panel'));
  }

  function _adminRoadsTyping(e) {
    if (!ZS.AdminLiveRoads?.isActive?.()) return false;
    const sel = '#zs-admin-live-roads input, #zs-admin-live-roads textarea, #zs-admin-live-roads select';
    const ae = document.activeElement;
    if (ae?.closest?.(sel)) return true;
    if (e?.target?.closest?.(sel)) return true;
    return false;
  }

  function _adminDecorTyping(e) {
    if (!ZS.AdminLiveDecor?.isActive?.()) return false;
    const sel = '#zs-admin-live-decor input, #zs-admin-live-decor textarea, #zs-admin-live-decor select';
    const ae = document.activeElement;
    if (ae?.closest?.(sel)) return true;
    if (e?.target?.closest?.(sel)) return true;
    return false;
  }

  document.addEventListener('keydown', (e) => {
    if (ZS.shortcutsBlocked?.(e) || ZS.Chat?.isOpen?.()) return;
    if (ZS.BedSleep?.isActive?.() && e.code === 'Space') {
      e.preventDefault();
      ZS.BedSleep.tryWake();
      return;
    }
    if (ZS.BedSleep?.isActive?.()) return;
    if (ZS.Rcon?.isOpen?.()) {
      if (_rconTyping(e)) return;
      if (e.code === 'Backquote' || e.code === 'F2' || e.code === 'Escape') {
        if (ZS.Rcon) { e.preventDefault(); ZS.Rcon.toggle(); }
      }
      return;
    }
    if (e.code === 'Backquote' || e.code === 'F2') {
      if (ZS.Rcon?.isAdmin?.()) {
        e.preventDefault();
        ZS.Rcon.toggle();
      }
      return;
    }
    if (e.code === 'Escape' && ZS.StorageUI?.isOpen?.()) {
      e.preventDefault();
      ZS.StorageUI.close();
      return;
    }
    if (e.code === 'Escape' && ZS.SignUI?.isOpen?.()) {
      e.preventDefault();
      ZS.SignUI.close();
      return;
    }
    if (e.code === 'Escape' && ZS.SleepLoot?.isOpen?.()) {
      e.preventDefault();
      ZS.SleepLoot.closePanel();
      return;
    }
    if (e.code === 'KeyQ' && ZS.AdminLiveDecor?.isPlacing?.() && ZS.AdminLiveDecor.tryRotateOnKey?.('KeyQ')) {
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && ZS.AdminLiveDecor?.isActive?.()) {
      e.preventDefault();
      ZS.AdminLiveDecor.tryUndo?.();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY' && ZS.AdminLiveDecor?.isActive?.()) {
      e.preventDefault();
      ZS.AdminLiveDecor.tryRedo?.();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && ZS.AdminLiveDecor?.isActive?.()) {
      if (ZS.AdminLiveDecor.tryCopyOnKey?.()) {
        e.preventDefault();
        return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV' && ZS.AdminLiveDecor?.isActive?.()) {
      if (ZS.AdminLiveDecor.tryPasteOnKey?.()) {
        e.preventDefault();
        return;
      }
    }
    if (e.code === 'KeyV' && ZS.AdminFly?.tryToggleKey?.('KeyV')) {
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyC' && !_touchInput && !e.repeat && !(e.ctrlKey || e.metaKey)) {
      state.input.crouchToggle = !state.input.crouchToggle;
      e.preventDefault();
      return;
    }
    if (ZS.AdminLiveRoads?.isActive?.() && !_adminRoadsTyping(e)) {
      if (e.code === 'Enter' && ZS.AdminLiveRoads.tryFinishOnEnter?.()) {
        e.preventDefault();
        return;
      }
      if (e.code === 'Backspace' && ZS.AdminLiveRoads.tryUndoPointOnBackspace?.()) {
        e.preventDefault();
        return;
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        if (document.pointerLockElement === canvas) {
          document.exitPointerLock?.();
          return;
        }
        ZS.AdminLiveRoads.exit();
        return;
      }
    }
    if (e.code === 'KeyE') {
      state.keys[e.code] = true;
      if (ZS.SleepLoot?.isOpen?.()) return;
      // key repeat remettait _doorUnlockHold.t à 0 → barre qui repart de zéro
      if (e.repeat) {
        if (_interactHold) e.preventDefault();
        return;
      }
      if (ZS.AdminLiveDecor?.isActive?.()) {
        if (_adminDecorTyping(e)) return;
        if (ZS.AdminLiveDecor.isPlacing?.()) {
          if (ZS.AdminLiveDecor.tryPickOnE?.({ shiftKey: e.shiftKey })) {
            e.preventDefault();
            return;
          }
          if (ZS.AdminLiveDecor.tryRotateOnKey?.('KeyE')) {
            e.preventDefault();
            return;
          }
          return;
        }
        if (ZS.AdminLiveDecor.tryPickOnE?.({ shiftKey: e.shiftKey })) {
          e.preventDefault();
          return;
        }
      }
      if (ZS.Inventory?.tryGrabNearest?.()) {
        e.preventDefault();
        return;
      }
      if (_interactWorldKeyDown()) e.preventDefault();
      return;
    }
    state.keys[e.code] = true;
  });
  document.addEventListener('keyup', (e) => {
    if (ZS.shortcutsBlocked?.(e) || ZS.Chat?.isOpen?.()) return;
    if (ZS.Rcon?.isOpen?.() || _rconTyping(e)) return;
    if (e.code === 'KeyE') _interactHoldEnd();
    state.keys[e.code] = false;
  });

  function _clearMovementKeys() {
    for (const k of Object.keys(state.keys)) delete state.keys[k];
    state.input.moveX = 0;
    state.input.moveZ = 0;
    state.input.sprintHeld = false;
  }
  ZS.clearMovementKeys = _clearMovementKeys;
