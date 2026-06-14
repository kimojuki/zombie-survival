// Sync colliders terrain — extrait de network.js (IIFE)
function _terrainCollidersPayload() {
    return ZS.getCollidersForServer?.() || ZS.getColliders?.() || [];
  }

  function _syncDecorPrefabRegistry() {
    if (!_socket?.connected || !ZS.listDecorPrefabs) return;
    _socket.emit('decor-prefab-registry', {
      ids: ZS.listDecorPrefabs(),
      meta: ZS.getDecorPrefabMeta?.() || {},
    });
  }

  function _syncWorldColliders(force = false) {
    if (!_socket || !ZS.getColliders) return;
    if (_serverCollidersReady) return;
    if (_colliderSyncDepth > 0 && !force) return;
    if (!force && ZS.isFrameRecovering?.()) return;
    if (!force && _isSectorLoadBusy?.()) return;
    if (force) {
      clearTimeout(_colliderSyncTimer);
      _colliderSyncTimer = null;
      _socket.emit('world-colliders', _terrainCollidersPayload());
      return;
    }
    if (_colliderSyncTimer) return;
    let debounceMs = 150;
    if (_inBootGrace()) debounceMs = 280;
    if (decorItems.size > 1500) debounceMs = Math.max(debounceMs, 320);
    const lp = getLocalXZ();
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    if (lodMid > 100) debounceMs = Math.max(debounceMs, 420);
    if (_decorSpawnDefer.pending.length > 280) debounceMs = Math.max(debounceMs, 380);
    _colliderSyncTimer = setTimeout(() => {
      _colliderSyncTimer = null;
      if (_socket && !_serverCollidersReady) {
        _socket.emit('world-colliders', _terrainCollidersPayload());
      }
    }, debounceMs);
  }

  let _colliderDeferRegister = false;

  function _beginColliderBatch() {
    _colliderSyncDepth++;
    _colliderDeferRegister = true;
  }

  function _endColliderBatch() {
    _colliderSyncDepth = Math.max(0, _colliderSyncDepth - 1);
    if (_colliderSyncDepth === 0) _colliderDeferRegister = false;
    if (_colliderSyncDepth === 0) {
      const heavy = _decorSpawnDefer.pending.length > 220
        || _lodPendingCount() > 420
        || _isSectorLoadBusy()
        || ZS.isFrameRecovering?.();
      _syncWorldColliders(!heavy);
    }
  }

  function _removeDecorItem(id) {
    const entry = decorItems.get(id);
    if (!entry) return;
    if (entry.root?.parent) entry.root.parent.remove(entry.root);
    if (entry.root?.userData?.simpleLod) _adjustLodPendingCached(-1);
    else _invalidateLodRingCache();
    decorItems.delete(id);
    _invalidateDecorVisRing();
    ZS.StorageUI?.closeIf?.(id);
    ZS.removeDecorColliders?.(id);
    ZS.unregisterDecorDoor?.(id);
    ZS.unregisterDecorStorage?.(id);
    ZS.unregisterDecorSign?.(id);
    ZS.unregisterDecorInteract?.(id);
    ZS.unregisterDecorBuild?.(id);
    ZS.BuildAnchors?.unregisterFoundation?.(id);
    ZS.removeChoppableTree?.(id);
    ZS.removeMinableRock?.(id);
    if (_colliderSyncDepth === 0) _syncWorldColliders();
  }

  function _countSpawnedWorldRocks() {
    let n = 0;
    decorItems.forEach(({ data }) => {
      if (data?.prefabId?.startsWith('rock_') && !data?.anchorId) n++;
    });
    return n;
  }

  async function _resyncWorldRocksFromApi() {
    try {
      const res = await fetch('/api/world/decor-rocks');
      if (!res.ok) return 0;
      const json = await res.json();
      let added = 0;
      for (const decor of (json.items || [])) {
        if (decorItems.has(decor.id)) continue;
        await _spawnDecorItem(decor);
        added++;
      }
      return added;
    } catch (_) {
      return 0;
    }
  }

  function _isFelledTreeDecor(d) {
    if (!d?.prefabId?.startsWith('tree_')) return false;
    if (d.falling) return true;
    return Number.isFinite(d.woodRemaining) && d.woodRemaining <= 0;
  }

  function _isTreeInTrailCorridor(d) {
    if (!d?.prefabId?.startsWith('tree_')) return false;
    const dist = ZS.distToSpawnTrail?.(d.x, d.z);
    return Number.isFinite(dist) && dist < 4;
  }
