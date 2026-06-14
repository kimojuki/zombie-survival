// Callbacks tir + souris / molette — extrait de game.js (async IIFE)
  state.onShoot  = attack;
  state.onReload = () => {
    const item = ZS.Inventory.getActiveItem();
    const def  = item ? ZS.ITEMS[item.type] : null;
    if (def && def.category === 'firearm') _startReload(def);
  };
  state.onJump   = () => { state.jumpPressed = true; };
  document.addEventListener('mousedown', (e) => {
    if (!pointerLocked) {
      if (_blocksPointerLock(e.target)) return;
      if (e.target !== canvas) return;
      if (e.button === 2) {
        if (ZS.AdminLiveRoads?.tryCancelOnRightClick?.()) {
          e.preventDefault();
        }
        return;
      }
      if (e.button !== 0) return;
      if (ZS.AdminLiveRoads?.tryPlaceOnClick?.()) {
        e.preventDefault();
      }
      return;
    }
    if (_blocksPointerLock(e.target)) return;
    if (e.button === 2) {
      if (ZS.AdminLiveRoads?.tryCancelOnRightClick?.()) {
        e.preventDefault();
        return;
      }
      if (ZS.AdminLiveDecor?.tryCancelOnRightClick?.()) {
        e.preventDefault();
        return;
      }
      if (_placeHeldStructure()) e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    if (ZS.AdminLiveRoads?.tryPlaceOnClick?.()) {
      e.preventDefault();
      return;
    }
    if (ZS.AdminLiveDecor?.tryPlaceOnClick?.()) {
      e.preventDefault();
      return;
    }
    attack();
  });
  document.addEventListener('contextmenu', (e) => {
    if (!pointerLocked) {
      if (ZS.AdminLiveRoads?.isActive?.() && e.target === canvas) {
        e.preventDefault();
      }
      return;
    }
    if (ZS.AdminLiveDecor?.isPlacing?.() || ZS.AdminLiveRoads?.isPlacing?.()) {
      e.preventDefault();
      return;
    }
    const item = ZS.Inventory.getActiveItem();
    const def = item ? ZS.ITEMS[item.type] : null;
    if (def?.category === 'structure') e.preventDefault();
  });
  document.addEventListener('wheel', (e) => {
    if (!pointerLocked) {
      if (ZS.AdminLiveRoads?.onWheel?.(e)) e.preventDefault();
      return;
    }
    if (ZS.AdminLiveDecor?.onWheel?.(e)) e.preventDefault();
    if (ZS.AdminLiveRoads?.onWheel?.(e)) e.preventDefault();
  }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if (ZS.shortcutsBlocked?.(e) || ZS.Chat?.isOpen?.()) return;
    if (e.code === 'KeyR' && state.onReload) state.onReload();
  });
