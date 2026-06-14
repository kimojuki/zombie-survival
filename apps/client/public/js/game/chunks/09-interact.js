// Portes, coffres, E / UI interact — extrait de game.js (async IIFE)
function _placeHeldStructure() {
    if (state.player.dead) return false;
    const item = ZS.Inventory.getActiveItem();
    const def = item ? ZS.ITEMS[item.type] : null;
    if (!def || def.category !== 'structure') return false;
    return !!ZS.Inventory.placeActiveStructure?.();
  }

  function _playSwing(kind, type) {
    ZS.triggerArmAnim(fpsArms, kind, type);
    ZS.Network.sendAttack(kind === 'punch' ? 'melee' : kind, type);
  }

  let _doorBtn = null;
  let _nearDoor = null;
  let _nearStorage = null;

  function _ensureDoorButton() {
    if (_doorBtn) return _doorBtn;
    _doorBtn = document.createElement('button');
    _doorBtn.id = 'door-interact-btn';
    _doorBtn.type = 'button';
    _doorBtn.style.cssText = [
      'display:none',
      'position:fixed',
      'right:92px',
      'bottom:132px',
      'z-index:120',
      'min-width:96px',
      'min-height:42px',
      'border:2px solid rgba(230,210,150,.85)',
      'border-radius:10px',
      'background:rgba(25,18,10,.78)',
      'color:#f3e3b0',
      'font:bold 13px system-ui,sans-serif',
      'box-shadow:0 4px 14px rgba(0,0,0,.35)',
      'touch-action:manipulation',
    ].join(';');
    const fire = (e) => {
      if (e) e.preventDefault();
      _interactWorld();
    };
    _doorBtn.addEventListener('click', fire);
    _doorBtn.addEventListener('touchstart', fire, { passive: false });
    document.body.appendChild(_doorBtn);
    return _doorBtn;
  }

  const INTERACT_HOLD_S = 2.0;
  const INTERACT_TAP_MAX_S = 0.28;
  let _interactHold = null;
  let _doorHoldBar = null;
  let _doorHoldLabel = null;

  function _isDesktopMode() {
    return document.body.classList.contains('mode-desktop');
  }

  function _hasDoorKey(lockId) {
    return ZS.Inventory?.hasDoorKey?.(lockId) || false;
  }

  function _localUsername() {
    return ZS.Network?.getLocalUsername?.() || localStorage.getItem('zombie_username') || '';
  }

  function _canRemoveDoorLock(door) {
    if (!door?.locked) return false;
    return _hasDoorKey(door.lockId);
  }

  function _ensureDoorHoldUi() {
    if (_doorHoldBar) return;
    const wrap = document.createElement('div');
    wrap.id = 'door-hold-ui';
    wrap.style.cssText = [
      'display:none', 'position:fixed', 'left:50%', 'bottom:18%', 'transform:translateX(-50%)',
      'z-index:130', 'min-width:180px', 'padding:8px 12px', 'border-radius:10px',
      'background:rgba(20,14,8,.82)', 'border:1px solid rgba(210,180,120,.6)',
      'color:#f3e3b0', 'font:12px system-ui,sans-serif', 'text-align:center',
    ].join(';');
    _doorHoldLabel = document.createElement('div');
    _doorHoldLabel.textContent = 'Retrait du verrou…';
    _doorHoldBar = document.createElement('div');
    _doorHoldBar.style.cssText = 'margin-top:6px;height:6px;border-radius:4px;background:rgba(255,255,255,.15);overflow:hidden';
    const fill = document.createElement('div');
    fill.id = 'door-hold-fill';
    fill.style.cssText = 'height:100%;width:0%;background:#66cc66;transition:width .05s linear';
    _doorHoldBar.appendChild(fill);
    wrap.appendChild(_doorHoldLabel);
    wrap.appendChild(_doorHoldBar);
    document.body.appendChild(wrap);
    _doorHoldBar = wrap;
    _doorHoldBar._fill = fill;
  }

  function _showHoldUi(progress, kind) {
    _ensureDoorHoldUi();
    _doorHoldLabel.textContent = kind === 'storage-pickup'
      ? 'Récupération du coffre…'
      : 'Retrait du verrou…';
    _doorHoldBar.style.display = 'block';
    _doorHoldBar._fill.style.width = `${Math.round(Math.min(1, progress) * 100)}%`;
  }

  function _hideHoldUi() {
    if (_doorHoldBar) _doorHoldBar.style.display = 'none';
  }

  function tryInstallDoorLock() {
    return ZS.Inventory?.installDoorLockOnNearestDoor?.() || false;
  }

  function _toggleNearbyDoor(door) {
    if (door.locked && !_hasDoorKey(door.lockId)) {
      ZS.UI?.showNotif?.('Porte verrouillée — clé requise');
      return true;
    }
    ZS.setDecorDoorState?.(door.decorId, !door.open);
    ZS.Network?.requestDecorDoorToggle?.(door.decorId);
    return true;
  }

  function _openStorageById(decorId) {
    if (!decorId) return false;
    ZS.setDecorStorageState?.(decorId, true);
    ZS.Network.requestStorageOpen(decorId);
    return true;
  }

  function _doorFromPick(pick) {
    if (!pick || pick.kind !== 'door') return null;
    return ZS.getDecorDoorForInteract?.(pick.decorId) || null;
  }

  function _storageFromPick(pick) {
    if (!pick || pick.kind !== 'storage') return null;
    return ZS.getDecorStorageForInteract?.(pick.decorId) || null;
  }

  function _signFromPick(pick) {
    if (!pick || pick.kind !== 'sign') return null;
    return ZS.getDecorSignForInteract?.(pick.decorId) || null;
  }

  function _interactRayTarget(maxDist = 3.5) {
    const pick = _pickInteractRay(maxDist);
    return {
      pick,
      storage: _storageFromPick(pick),
      door: _doorFromPick(pick),
      sign: _signFromPick(pick),
    };
  }

  function _interactDoorFromTarget(door) {
    if (!door) return false;
    const active = ZS.Inventory?.getActiveItem?.();
    if (active?.type === 'tool_verrou' && !door.locked) {
      return ZS.Inventory?.installDoorLockOnAimedDoor?.() || false;
    }
    return _toggleNearbyDoor(door);
  }

  function _interactDoorTap() {
    const { storage, door } = _interactRayTarget(3.2);
    if (storage) return _openStorageById(storage.decorId);
    if (door) return _interactDoorFromTarget(door);
    return false;
  }

  function _interactHoldStart() {
    const pick = _pickInteractRay(3.2);
    const storage = _storageFromPick(pick);
    if (storage && _isDesktopMode() && !ZS.StorageUI?.isOpen?.()) {
      if (_interactHold?.kind === 'storage-pickup' && _interactHold.decorId === storage.decorId) return true;
      _interactHold = { kind: 'storage-pickup', decorId: storage.decorId, t: 0, started: performance.now() };
      return true;
    }
    const door = _doorFromPick(pick);
    if (!door || !door.locked) return false;
    const active = ZS.Inventory?.getActiveItem?.();
    if (active?.type === 'tool_verrou') return false;
    if (!_canRemoveDoorLock(door)) return false;
    if (_interactHold?.kind === 'door-unlock' && _interactHold.decorId === door.decorId) return true;
    _interactHold = { kind: 'door-unlock', decorId: door.decorId, t: 0, started: performance.now() };
    return true;
  }

  function _interactHoldEnd() {
    if (!_interactHold) return;
    const hold = _interactHold;
    _interactHold = null;
    _hideHoldUi();
    if (hold.t >= INTERACT_HOLD_S) return;
    if (hold.t < INTERACT_TAP_MAX_S) {
      if (hold.kind === 'storage-pickup') _openStorageById(hold.decorId);
      else if (hold.kind === 'door-unlock') {
        const door = ZS.getDecorDoorForInteract?.(hold.decorId);
        if (door) _toggleNearbyDoor(door);
      }
    }
  }

  function _updateInteractHold(dt) {
    if (!_interactHold) return;
    if (!state.keys['KeyE']) {
      _interactHoldEnd();
      return;
    }
    _interactHold.t += dt;
    _showHoldUi(_interactHold.t / INTERACT_HOLD_S, _interactHold.kind);
    if (_interactHold.t >= INTERACT_HOLD_S) {
      const { kind, decorId } = _interactHold;
      _interactHold = null;
      _hideHoldUi();
      if (kind === 'door-unlock') ZS.Network?.requestDecorDoorUnlock?.(decorId);
      else if (kind === 'storage-pickup') ZS.Network?.requestStoragePickup?.(decorId);
    }
  }

  function _interactDoor() {
    return _interactDoorTap();
  }

  function _canPickupIntroCampfireTorch() {
    const beats = ZS.Scenario?.getIntroBeats?.();
    return !!ZS.Scenario?.isActive?.()
      && !ZS.Inventory?.hasItemType?.('tool_torche')
      && !beats?.pickedTorch;
  }

  function _hideIntroCampfireTorchMesh(decorId) {
    const entry = ZS.Network?.getDecorEntry?.(decorId);
    const root = entry?.root;
    if (root) ZS.BeachIntroPrefabs?.setIntroCampfireTorchVisible?.(root, false);
  }

  function _introTorchPickup(decorId) {
    ZS.Network?.requestIntroTorchPickup?.(decorId)?.then((res) => {
      if (res?.ok) {
        _hideIntroCampfireTorchMesh(decorId);
        ZS.Network?.forEachDecor?.((id, entry) => {
          if (entry?.data?.prefabId === 'spawn_beach_campfire_ring') {
            _hideIntroCampfireTorchMesh(id);
          }
        });
        ZS.Scenario?.mergeServerScenario?.({
          introBeats: { pickedTorch: true, campfire: true },
        });
        ZS.IntroStarter?.onPickup?.('tool_torche');
        ZS.IntroLessons?.onTorchAcquired?.();
        ZS.UI?.showNotif?.('Torche récupérée');
      } else if (res?.err === 'inventory_full') {
        ZS.UI?.showNotif?.('Inventaire plein — libère un emplacement');
      } else if (res?.err === 'no_torch') {
        ZS.UI?.showNotif?.('Approche la veilleuse — la torche n\'est pas encore là');
      } else if (res?.err === 'need_rock') {
        ZS.UI?.showNotif?.('Ramasse d\'abord le caillou sur la plage');
      } else if (res?.err === 'already_has_torch') {
        ZS.UI?.showNotif?.('Tu as déjà la torche');
        ZS.BeachIntroPrefabs?.syncIntroCampfireTorchVisibility?.();
      } else if (res?.err === 'need_campfire_beat') {
        ZS.UI?.showNotif?.('Approche la veilleuse — le feu doit te sentir proche');
      } else if (res?.err === 'pickup_failed') {
        ZS.UI?.showNotif?.('Ramassage impossible');
      } else {
        ZS.UI?.showNotif?.('Ramassage impossible');
      }
    });
  }

  function _interactCampProp(px, pz) {
    if (_canPickupIntroCampfireTorch()) {
      const introTorch = ZS.findNearestDecorInteract?.(px, pz, 3.5, 'intro_torch');
      if (introTorch) {
        _introTorchPickup(introTorch.decorId);
        return true;
      }
      const campfireTorch = ZS.findNearestDecorInteract?.(px, pz, 3.5, 'intro_campfire_torch');
      if (campfireTorch) {
        _introTorchPickup(campfireTorch.decorId);
        return true;
      }
    }
    const wb = ZS.findNearestDecorInteract?.(px, pz, 3.0, 'workbench');
    if (wb) {
      ZS.Craft?.toggle?.();
      return true;
    }
    const fire = ZS.findNearestDecorInteract?.(px, pz, 3.2, 'campfire');
    if (fire) {
      ZS.Network?.requestCampfireCook?.(fire.decorId);
      return true;
    }
    const bed = ZS.findNearestDecorInteract?.(px, pz, 3.2, 'bedroll');
    if (bed) {
      ZS.Network?.requestCampRest?.(bed.decorId);
      return true;
    }
    const bedFurniture = ZS.findNearestDecorInteract?.(px, pz, 3.2, 'bed');
    if (bedFurniture) {
      ZS.BedSleep?.tryStart?.(bedFurniture.decorId);
      return true;
    }
    return false;
  }

  function _interactWorld() {
    const { storage, door, sign } = _interactRayTarget(3.2);
    if (storage) return _openStorageById(storage.decorId);
    if (door) return _interactDoorFromTarget(door);
    if (_interactCampProp(state.player.x, state.player.z)) return true;
    if (sign && ZS.SignUI?.tryInteract?.(sign)) return true;
    return ZS.SleepLoot?.tryInteract?.() || false;
  }

  function _interactWorldKeyDown() {
    if (ZS.StorageUI?.isOpen?.()) return true;
    if (ZS.SignUI?.isOpen?.()) return true;
    if (ZS.SleepLoot?.isPending?.()) return true;
    if (!state.player.dead) {
      const { storage, door, sign } = _interactRayTarget(3.5);
      if (storage || door) {
        if (_interactHoldStart()) return true;
      }
      if (storage) return _openStorageById(storage.decorId);
      if (door) return _interactDoorFromTarget(door);
      if (sign && ZS.SignUI?.tryInteract?.(sign)) return true;
      if (_interactCampProp(state.player.x, state.player.z)) return true;
      const sleeper = ZS.SleepLoot?.getNearestForUi?.(state.player.x, state.player.z);
      if (sleeper && ZS.SleepLoot?.tryInteract?.()) return true;
    }
    if (_interactHoldStart()) return true;
    return _interactWorld();
  }

  ZS.isInteractHoldActive = () => !!_interactHold;
  ZS.isDoorUnlockHoldActive = ZS.isInteractHoldActive;

  let _doorUiTick = 0;
  let _doorUiX = NaN;
  let _doorUiZ = NaN;
  let _doorUiYaw = NaN;
  function _updateDoorInteractUi() {
    const px = state.player.x;
    const pz = state.player.z;
    const yaw = state.camera?.yaw ?? 0;
    const moved = Math.hypot(px - _doorUiX, pz - _doorUiZ) > 0.45;
    const turned = Math.abs(yaw - _doorUiYaw) > 0.035;
    if (!moved && !turned && !_interactHold && ++_doorUiTick < 2) return;
    _doorUiTick = 0;
    _doorUiX = px;
    _doorUiZ = pz;
    _doorUiYaw = yaw;
    const pick = _pickInteractRay(3.5);
    const storage = _storageFromPick(pick);
    const door = _doorFromPick(pick);
    const sign = _signFromPick(pick);
    let campProp = (!storage && !door && !sign)
      ? ZS.findNearestDecorInteract?.(px, pz, 3.2) : null;
    if (campProp && (campProp.role === 'intro_torch' || campProp.role === 'intro_campfire_torch')
        && !_canPickupIntroCampfireTorch()) campProp = null;
    const sleeper = (!storage && !door && !sign && !campProp && !state.player.dead)
      ? ZS.SleepLoot?.getNearestForUi?.(px, pz) : null;
    _nearStorage = storage;
    _nearDoor = door;
    const btn = _ensureDoorButton();
    if ((!storage && !door && !campProp && !sign && !sleeper) || state.player.dead || ZS.Rcon?.isOpen?.() || ZS.Chat?.isOpen?.() || ZS.SleepLoot?.isOpen?.() || ZS.SignUI?.isOpen?.()) {
      btn.style.display = 'none';
      return;
    }
    const mobile = document.body.classList.contains('input-touch');
    let label;
    if (storage) {
      label = 'Coffre';
      if (!mobile && !_interactHold) label += ' · maintenir E = ramasser';
    } else if (door) {
      const active = ZS.Inventory?.getActiveItem?.();
      if (active?.type === 'tool_verrou' && !door.locked) label = 'Verrouiller';
      else if (door.locked && !_hasDoorKey(door.lockId)) label = 'Verrouillée · frapper pour casser';
      else if (door.locked && _hasDoorKey(door.lockId)) {
        label = door.open ? 'Fermer' : 'Ouvrir';
        if (!mobile && !_interactHold) label += ' · maintenir E = retirer verrou';
      }
      else label = door.open ? 'Fermer' : 'Ouvrir';
    }
    else if (campProp?.role === 'workbench') label = 'Établi';
    else if ((campProp?.role === 'intro_torch' || campProp?.role === 'intro_campfire_torch')
        && _canPickupIntroCampfireTorch()) label = 'Ramasser la torche';
    else if (campProp?.role === 'campfire') label = 'Cuire au feu';
    else if (campProp?.role === 'bed') label = 'Repos';
    else if (campProp?.role === 'bedroll') label = 'Repos (sac)';
    else if (sign) label = sign.signKind?.startsWith('intro_') ? 'Lire' : 'Lire le panneau';
    else label = 'Fouiller';
    btn.textContent = mobile ? label : `E — ${label}`;
    btn.style.display = 'block';
    btn.style.right = mobile ? '92px' : '24px';
    btn.style.bottom = mobile ? '132px' : '96px';
  }
