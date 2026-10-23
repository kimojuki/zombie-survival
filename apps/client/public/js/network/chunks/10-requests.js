// Requêtes décor, storage, craft, sleep — extrait de network.js (IIFE)
function notifyDecorChop(decorId, dirX, dirZ) {
    if (!_socket || !decorId) return;
    const toolType = ZS.Inventory?.getActiveItem?.()?.type || 'tool_caillou';
    _socket.emit('decor-chop', { id: decorId, toolType, dirX, dirZ });
  }

  function notifyDecorMine(decorId) {
    if (!_socket || !decorId) return;
    const toolType = ZS.Inventory?.getActiveItem?.()?.type || 'tool_caillou';
    _socket.emit('decor-mine', { id: decorId, toolType });
  }

  function requestDecorDoorToggle(decorId) {
    if (!_socket || !decorId) return;
    _socket.emit('decor-door-toggle', { id: decorId });
  }

  function requestDecorDoorLock(decorId, cb) {
    if (!_socket || !decorId) return;
    _socket.emit('decor-door-lock', { id: decorId }, (res) => {
      if (res?.ok) {
        if (res.inventory && ZS.Inventory?.applyAuthoritativeInv) {
          ZS.Inventory.applyAuthoritativeInv(res.inventory);
        }
        if (res.keyDropped) {
          ZS.UI?.showNotif?.('Porte verrouillée — clé au sol (inventaire plein)');
        } else {
          ZS.UI?.showNotif?.('Porte verrouillée — clé reçue');
        }
      } else {
        ZS.UI?.showNotif?.(res?.error || 'Verrouillage impossible');
      }
      if (typeof cb === 'function') cb(res);
    });
  }

  function requestDecorDoorUnlock(decorId, cb) {
    if (!_socket || !decorId) return;
    _socket.emit('decor-door-unlock', { id: decorId }, (res) => {
      if (res?.ok) {
        if (res.inventory && ZS.Inventory?.applyAuthoritativeInv) {
          ZS.Inventory.applyAuthoritativeInv(res.inventory);
        }
        ZS.UI?.showNotif?.('Verrou retiré');
      } else {
        ZS.UI?.showNotif?.(res?.error || 'Retrait du verrou impossible');
      }
      if (typeof cb === 'function') cb(res);
    });
  }

  function requestUseItem(zone, index, type, cb, trace) {
    if (!_socket?.connected) {
      ZS.ConsumeDebug?.log('use-item-offline', { trace, zone, index, type });
      if (typeof cb === 'function') cb({ ok: false, err: 'offline', trace });
      return;
    }
    ZS.ConsumeDebug?.log('use-item-emit', { trace, zone, index, type, socketId: _socket.id });
    _socket.emit('use-item', { zone, index, type, trace }, (res) => {
      ZS.ConsumeDebug?.log('use-item-ack', {
        trace,
        res: res ? {
          ok: res.ok,
          err: res.err,
          trace: res.trace,
          debug: res.debug,
          serverBuild: res.serverBuild || res.debug?.build,
        } : null,
      });
      if (typeof cb === 'function') cb(res);
    });
  }

  function requestInvDebugSnapshot(trace, reason) {
    if (!_socket?.connected) {
      ZS.ConsumeDebug?.log('debug-snapshot-offline', { trace, reason });
      return;
    }
    const t = trace || ZS.ConsumeDebug?.traceId?.('snap');
    ZS.ConsumeDebug?.log('debug-snapshot-req', { trace: t, reason });
    _socket.emit('debug-inv-snapshot', { trace: t, reason }, (res) => {
      ZS.ConsumeDebug?.log('debug-snapshot-res', {
        trace: t,
        reason,
        serverBuild: res?.serverBuild,
        serverFood: res?.snap?.food,
        serverHotbar: res?.snap?.hotbar,
        client: ZS.ConsumeDebug?.clientSnapshot?.(),
        match: JSON.stringify(res?.snap?.food) === JSON.stringify(ZS.ConsumeDebug?.clientSnapshot?.()?.food),
      });
      if (res?.inventory) {
        if (ZS.Inventory?.applyAuthoritativeInv) {
          ZS.Inventory.applyAuthoritativeInv(res.inventory);
        } else {
          ZS.Inventory?.loadFromSave?.(res.inventory);
        }
        ZS.ConsumeDebug?.compare?.(res.inventory, `server-snapshot-${reason || 'manual'}`);
      }
    });
  }

  function requestCraftQueue(recipeId) {
    if (!_socket) return Promise.resolve({ ok: false });
    return new Promise((resolve) => {
      _socket.emit('craft-queue', { recipeId }, (res) => resolve(res || { ok: false }));
    });
  }

  function requestCraftCancel(jobId) {
    if (!_socket) return;
    _socket.emit('craft-cancel', { jobId });
  }

  function getLocalUsername() {
    return _localUsername || localStorage.getItem('zombie_username') || '';
  }

  function requestStorageOpen(decorId) {
    if (!_socket || !decorId) return;
    _socket.emit('storage-open', { id: decorId });
  }

  function requestStorageClose(decorId) {
    if (!_socket || !decorId) return;
    _socket.emit('storage-close', { id: decorId });
  }

  function requestStorageDeposit(decorId, stack) {
    if (!_socket || !decorId || !stack?.type) return;
    _socket.emit('storage-deposit', {
      id: decorId,
      zone: stack.zone,
      index: stack.idx,
      qty: stack.qty || 1,
    });
  }

  function requestStorageWithdraw(decorId, slot) {
    if (!_socket || !decorId) return;
    _socket.emit('storage-withdraw', { id: decorId, slot });
  }

  function requestStorageMove(decorId, from, to, cb) {
    if (!_socket || !decorId || !from?.zone || to?.zone == null) {
      if (typeof cb === 'function') cb({ ok: false, err: 'invalid' });
      return;
    }
    _socket.emit('storage-move', {
      id: decorId,
      from: { zone: from.zone, index: from.index },
      to: { zone: to.zone, index: to.index },
    }, cb);
  }

  function notifyIntroReadable(signKind) {
    if (!_socket || !signKind) return;
    _socket.emit('intro-readable-read', { signKind });
  }

  function requestStorageTakeAll(decorId, cb) {
    if (!_socket || !decorId) {
      if (typeof cb === 'function') cb({ ok: false, err: 'invalid' });
      return;
    }
    _socket.emit('storage-take-all', { id: decorId }, cb);
  }

  function requestStorageHit(decorId) {
    if (!_socket || !decorId) return;
    _socket.emit('storage-hit', { id: decorId });
  }

  function requestStoragePickup(decorId, cb) {
    if (!_socket || !decorId) return;
    const inv = ZS.Inventory?.getInvSnapshot?.();
    _socket.emit('storage-pickup', { id: decorId, inv }, (res) => {
      if (res?.ok) {
        if (res.inventory && ZS.Inventory?.applyAuthoritativeInv) {
          ZS.Inventory.applyAuthoritativeInv(res.inventory);
        }
        ZS.StorageUI?.closeIf?.(decorId);
        if (res.dropped > 0) {
          ZS.UI?.showNotif?.(`Coffre récupéré — ${res.dropped} pile(s) au sol (inventaire plein)`);
        } else {
          ZS.UI?.showNotif?.('Coffre récupéré');
        }
      } else {
        ZS.UI?.showNotif?.(res?.error || 'Récupération impossible');
      }
      if (typeof cb === 'function') cb(res);
    });
  }

  function requestBuildHit(decorId, toolType) {
    if (!_socket || !decorId || !toolType) return;
    _socket.emit('build-hit', { id: decorId, toolType });
  }

  function requestIntroTorchPickup(decorId) {
    return new Promise((resolve) => {
      if (!_socket) {
        resolve({ ok: false, err: 'offline' });
        return;
      }
      const lp = getLocalXZ?.();
      _socket.emit('intro-torch-pickup', {
        id: decorId || null,
        x: lp?.x,
        z: lp?.z,
      }, (res) => resolve(res || { ok: false, err: 'no_response' }));
    });
  }

  function requestCampfireCook(decorId, cb) {
    if (!_socket || !decorId) return;
    _socket.emit('campfire-cook', { decorId }, (res) => {
      if (res?.ok) ZS.UI?.showNotif?.('Viande cuite au feu');
      else ZS.UI?.showNotif?.(res?.error || 'Cuisson impossible');
      if (typeof cb === 'function') cb(res);
    });
  }

  function requestBedSleepStart(decorId, cb) {
    if (!_socket || !decorId) return;
    _socket.emit('bed-sleep-start', { decorId }, (res) => {
      if (typeof cb === 'function') cb(res);
    });
  }

  function requestBedSleepWake(cb) {
    if (!_socket) return;
    _socket.emit('bed-sleep-wake', {}, (res) => {
      if (typeof cb === 'function') cb(res);
    });
  }

  function requestCampRest(decorId, cb) {
    if (!_socket || !decorId) return;
    _socket.emit('camp-rest', { decorId }, (res) => {
      if (res?.ok) ZS.UI?.showNotif?.('Repos — endurance récupérée');
      else ZS.UI?.showNotif?.(res?.error || 'Repos impossible');
      if (typeof cb === 'function') cb(res);
    });
  }

  function _patchDecorFloorHeight(id, y) {
    const entry = decorItems.get(id);
    if (!entry?.data) return;
    entry.data.y = y;
    entry.data.baseY = y;
    if (entry.root) {
      entry.root.position.y = y;
      if (entry.root.userData.decorSpec) entry.root.userData.decorSpec.baseY = y;
    }
  }

  function syncDecorFloorHeight(id, y) {
    if (!_socket || !id || !Number.isFinite(y)) return;
    _socket.emit('decor-floor-height', { id, y });
  }
