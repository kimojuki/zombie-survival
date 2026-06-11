// Socket.io client — multiplayer sync
(function () {
  'use strict';

  // id -> { mesh, targetX, targetY, targetZ, targetRotY, moveSpeed, animTime }
  const remotePlayers = new Map();
  const sleepingBodies = new Map(); // playerId -> { mesh, x, z, username, playerId }
  const deathCorpses = new Map(); // playerId -> { mesh, x, z, username, playerId }
  let _localDeathCorpse = null;
  let _spawnReady = false; // false jusqu'à sync complète (game-init + décor rendu)
  let _hadSpawnReady = false; // true après 1re sync réussie (survit aux disconnect)
  let _worldReady = false;
  let _pendingGameInit = null;
  let _gameInitSyncing = false;
  let _gameInitRetries = 0;
  const _GAME_INIT_MAX_RETRIES = 8;
  let _lastWorldTime = null;
  const decorItems = new Map();
  let _scene, _state, _socket, _localUsername = '';
  let _lastEquip = undefined;
  const _DOWN = (typeof THREE !== 'undefined') ? new THREE.Vector3(0, -1, 0) : null;
  const _rHandVec = (typeof THREE !== 'undefined') ? new THREE.Vector3() : null;

  function _loading() {
    return window.ZS?.Loading || window.__zsLoading || null;
  }

  function _connecting(show, msg, detail, phaseKey, local01) {
    const L = _loading();
    if (show) {
      if (L?.setPhase && phaseKey != null && local01 != null) {
        L.setPhase(phaseKey, local01, msg, detail);
      } else if (L?.show) {
        L.show(msg, detail);
      } else {
        const screen = document.getElementById('connecting-screen');
        const m = document.getElementById('connecting-msg');
        const d = document.getElementById('connecting-detail');
        if (screen) screen.style.display = 'flex';
        if (m && msg) m.textContent = msg;
        if (d) d.textContent = detail || '';
      }
    } else if (L?.hide) {
      L.hide();
    } else {
      const screen = document.getElementById('connecting-screen');
      if (screen) screen.style.display = 'none';
    }
  }

  function _setOnlineCount(n) {
    if (typeof n === 'number' && ZS.UI?.setOnlineCount) ZS.UI.setOnlineCount(n);
  }

  let _colliderSyncDepth = 0;
  let _colliderSyncTimer = null;
  let _serverCollidersReady = false;

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
    if (force) {
      clearTimeout(_colliderSyncTimer);
      _colliderSyncTimer = null;
      _socket.emit('world-colliders', _terrainCollidersPayload());
      return;
    }
    if (_colliderSyncTimer) return;
    _colliderSyncTimer = setTimeout(() => {
      _colliderSyncTimer = null;
      if (_socket && !_serverCollidersReady) {
        _socket.emit('world-colliders', _terrainCollidersPayload());
      }
    }, 150);
  }

  function _beginColliderBatch() {
    _colliderSyncDepth++;
  }

  function _endColliderBatch() {
    _colliderSyncDepth = Math.max(0, _colliderSyncDepth - 1);
    if (_colliderSyncDepth === 0) _syncWorldColliders(true);
  }

  function _removeDecorItem(id) {
    const entry = decorItems.get(id);
    if (!entry) return;
    if (entry.root?.parent) entry.root.parent.remove(entry.root);
    decorItems.delete(id);
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

  function _spawnDecorItem(d, spawnOpts = {}) {
    if (!d?.id || !_scene) return Promise.resolve(null);
    // Glissières posées localement au build RN (road_network + barrier_prefabs).
    if (d.prefabId?.startsWith('road_barrier_')) return Promise.resolve(null);
    if (_isFelledTreeDecor(d)) return Promise.resolve(null);
    const pk = String(d.placementKey || '');
    if (pk.startsWith('s01:hub:') || pk.startsWith('s01:camp:')) return Promise.resolve(null);
    _removeDecorItem(d.id);
    const isPrefab = d.kind === 'prefab' || (d.prefabId && !d.type);
    const isBuildWood = d.prefabId?.startsWith('build_') && d.prefabId.endsWith('_wood');
    const commonOpts = {
      decorId: d.id,
      rotY: Number.isFinite(d.rotY) ? d.rotY : 0,
      rotZ: d.rotZ || 0,
      scale: Number.isFinite(d.scale) ? d.scale : 1,
      grounded: !d.prefabId?.startsWith('wreck_'),
      groundLift: Number.isFinite(d.groundLift) ? d.groundLift : undefined,
      layFlat: !!d.layFlat,
      offsetX: d.offsetX || 0,
      offsetY: d.offsetY || 0,
      offsetZ: d.offsetZ || 0,
      wreckVariant: d.wreckVariant,
      wreckBurnt: !!d.wreckBurnt,
      wreckTilt: Number.isFinite(d.wreckTilt) ? d.wreckTilt : (Number.isFinite(d.rotZ) ? d.rotZ : 0),
      wreckWheels: Number.isFinite(d.wreckWheels) ? d.wreckWheels : undefined,
        wreckSink: Number.isFinite(d.wreckSink) ? d.wreckSink : 0,
      treeSeed: Number.isFinite(d.treeSeed) ? d.treeSeed : undefined,
      doorOpen: !!d.doorOpen,
      locked: !!d.locked,
      lockId: d.lockId || undefined,
      lockOwner: d.lockOwner || undefined,
      storageOpen: !!d.storageOpen,
      woodMax: Number.isFinite(d.woodMax) ? d.woodMax : undefined,
      woodRemaining: Number.isFinite(d.woodRemaining) ? d.woodRemaining : undefined,
      stoneMax: Number.isFinite(d.stoneMax) ? d.stoneMax : undefined,
      stoneRemaining: Number.isFinite(d.stoneRemaining) ? d.stoneRemaining : undefined,
      rockSeed: Number.isFinite(d.rockSeed) ? d.rockSeed : undefined,
      growthPhase: Number.isFinite(d.growthPhase) ? d.growthPhase : undefined,
      plantedAt: Number.isFinite(d.plantedAt) ? d.plantedAt : undefined,
      railLen: Number.isFinite(d.railLen) ? d.railLen : undefined,
      rotX: Number.isFinite(d.rotX) ? d.rotX : undefined,
      baseY: Number.isFinite(d.baseY) ? d.baseY
        : ((isBuildWood || d.prefabId === 'storage_chest') && Number.isFinite(d.y) ? d.y : undefined),
      buildLevel: Number.isFinite(d.buildLevel) ? Math.max(0, Math.min(8, d.buildLevel)) : 0,
      supportGroundY: Number.isFinite(d.supportGroundY) ? d.supportGroundY : undefined,
      buildDamage: Number.isFinite(d.buildDamage) ? d.buildDamage : undefined,
      buildMaxHp: Number.isFinite(d.buildMaxHp) ? d.buildMaxHp : undefined,
      signKind: d.signKind || undefined,
      interactRole: d.interactRole || undefined,
      simpleLod: !!spawnOpts.simpleLod,
    };
    if (d.prefabId?.startsWith('build_') && d.prefabId.endsWith('_wood')) {
      if (!Number.isFinite(commonOpts.buildDamage)) commonOpts.buildDamage = 0;
      if (!Number.isFinite(commonOpts.buildMaxHp)) commonOpts.buildMaxHp = 100;
      d.buildDamage = commonOpts.buildDamage;
      d.buildMaxHp = commonOpts.buildMaxHp;
    }
    const placementKey = d.placementKey ? String(d.placementKey) : '';
    if (placementKey.startsWith('s01:') && Number.isFinite(d.x) && Number.isFinite(d.z)) {
      const rotY = Number.isFinite(d.rotY) ? d.rotY : 0;
      if (d.shackAnchor && ZS.sampleShackPadHeight && Number.isFinite(d.shackFloorY)) {
        const a = d.shackAnchor;
        commonOpts.baseY = ZS.sampleShackPadHeight(a.x, a.z, a.rotY || 0) + d.shackFloorY;
        commonOpts.grounded = true;
      } else {
        const gy = d.prefabId === 'building_survivor_shack' && ZS.sampleShackPadHeight
          ? ZS.sampleShackPadHeight(d.x, d.z, rotY)
          : (ZS.getDecorGroundHeight
            ? ZS.getDecorGroundHeight(d.x, d.z)
            : (ZS.getTerrainHeight ? ZS.getTerrainHeight(d.x, d.z) : 0));
        commonOpts.baseY = gy;
        commonOpts.grounded = true;
      }
    }
    const onRoot = (root) => {
      if (!root) return;
      root.userData.decorId = d.id;
      decorItems.set(d.id, { root, data: d });
      if (_colliderSyncDepth === 0) _syncWorldColliders();
    };
    if (isPrefab) {
      if (!d.prefabId || !ZS.spawnDecorPrefab) return Promise.resolve(null);
      const root = ZS.spawnDecorPrefab(_scene, d.prefabId, d.x, d.y, d.z, commonOpts);
      if (!root && placementKey.startsWith('s01:')) {
        console.warn('[decor] prefab S01 non spawné', d.prefabId, placementKey);
      }
      if (!root && (d.zoneId === 'beach_intro_v3' || String(d.placementKey || '').startsWith('beach:intro'))) {
        console.warn('[decor] prefab intro plage non spawné', d.prefabId, d.placementKey);
      }
      onRoot(root);
      return Promise.resolve(root);
    }
    if (!d.type || !ZS.spawnDecorItem) return Promise.resolve(null);
    return ZS.spawnDecorItem(_scene, d.type, d.x, d.y, d.z, commonOpts).then((root) => {
      onRoot(root);
      return root;
    });
  }

  function _deferTreeRadius() {
    return ZS._isMobile ? 100 : 180;
  }

  const _treeDefer = {
    queue: [],
    loading: false,
    offset: 0,
    hasMore: true,
    sx: 0,
    sz: 0,
    active: false,
  };

  function _resetTreeDefer() {
    _treeDefer.queue.length = 0;
    _treeDefer.loading = false;
    _treeDefer.offset = 0;
    _treeDefer.hasMore = true;
    _treeDefer.active = false;
  }

  function _isPinnedDecor(data, decorId) {
    if (!data) return true;
    const pid = data.prefabId || data.type || '';
    if (data.immutable || (data.placementKey && String(data.placementKey).startsWith('s01:'))) return true;
    if (pid.startsWith('build_') || pid.startsWith('wreck_')) return true;
    if (pid.includes('door') || pid === 'storage_chest') return true;
    if (data.locked != null || data.doorOpen != null || data.storageOpen != null) return true;
    if (pid.startsWith('tree_') && decorId && ZS.isTreeVisPinned?.(decorId)) return true;
    return false;
  }

  function _decorVisRadius2() {
    const r = ZS.Options?.getProfile?.()?.decorVisRadius ?? 140;
    return r * r;
  }

  let _decorVisAcc = 0;

  const TREE_LOD_UPGRADE_R2 = 42 * 42;

  function _maybeUpgradeTreeLod(entry, px, pz) {
    const root = entry?.root;
    if (!root?.userData?.simpleLod) return;
    const tx = entry.data?.x ?? root.position.x;
    const tz = entry.data?.z ?? root.position.z;
    const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
    if (d2 > TREE_LOD_UPGRADE_R2) return;
    const pid = entry.data?.prefabId;
    if (!pid?.startsWith('tree_')) return;
    ZS.upgradeTreeLod?.(root, pid, {
      treeSeed: entry.data?.treeSeed,
      decorId: entry.data?.id,
    });
  }

  let _nameTagLosAcc = 0;

  function _findNameTag(mesh) {
    if (!mesh) return null;
    if (mesh.userData.nameTag) return mesh.userData.nameTag;
    for (let i = 0; i < mesh.children.length; i++) {
      const ch = mesh.children[i];
      if (ch?.isSprite && ch.userData?.isNameTag) return ch;
    }
    return null;
  }

  function _updateNameTagVisibility(mesh, camX, camZ, camHeadY) {
    const tag = _findNameTag(mesh);
    if (!tag) return;
    if (!mesh.visible) {
      tag.visible = false;
      return;
    }
    const tx = mesh.position.x;
    const tz = mesh.position.z;
    const dist = Math.hypot(tx - camX, tz - camZ);
    if (dist < 1.5) {
      tag.visible = true;
      return;
    }
    const targetHeadY = mesh.position.y + 1.55;
    const headY = Math.max(camHeadY, targetHeadY) - 0.08;
    const cols = ZS.getCollidersNear?.(
      (camX + tx) * 0.5,
      (camZ + tz) * 0.5,
      dist * 0.5 + 8,
    ) || [];
    tag.visible = ZS.hasHeadLineOfSight
      ? ZS.hasHeadLineOfSight(camX, camZ, tx, tz, cols, headY, { endpointShrink: 0.35 })
      : true;
  }

  function _tickNameTagOcclusion(camX, camZ, camHeadY) {
    _nameTagLosAcc++;
    if (_nameTagLosAcc % 3 !== 0) return;
    remotePlayers.forEach((rp) => _updateNameTagVisibility(rp.mesh, camX, camZ, camHeadY));
    sleepingBodies.forEach((entry) => _updateNameTagVisibility(entry.mesh, camX, camZ, camHeadY));
    deathCorpses.forEach((entry) => _updateNameTagVisibility(entry.mesh, camX, camZ, camHeadY));
  }

  function _tickDecorVisibility(px, pz) {
    _decorVisAcc++;
    if (_decorVisAcc % 4 !== 0) return;
    const visR2 = _decorVisRadius2();
    decorItems.forEach((entry, id) => {
      if (!entry?.root || _isPinnedDecor(entry.data, id)) {
        if (entry?.root) entry.root.visible = true;
        return;
      }
      const dx = (entry.data?.x ?? entry.root.position.x) - px;
      const dz = (entry.data?.z ?? entry.root.position.z) - pz;
      const d2 = dx * dx + dz * dz;
      entry.root.visible = d2 <= visR2;
      if (entry.root.visible) _maybeUpgradeTreeLod(entry, px, pz);
    });
  }

  async function _fetchDeferredTreesBatch() {
    if (_treeDefer.loading || !_treeDefer.hasMore) return;
    _treeDefer.loading = true;
    const minR = _deferTreeRadius();
    const limit = ZS._isMobile ? 48 : 80;
    try {
      const res = await fetch(
        `/api/world/decor-trees?x=${encodeURIComponent(_treeDefer.sx)}&z=${encodeURIComponent(_treeDefer.sz)}`
        + `&minR=${minR}&limit=${limit}&offset=${_treeDefer.offset}`,
      );
      if (!res.ok) {
        _treeDefer.hasMore = false;
        return;
      }
      const json = await res.json();
      const list = (json.items || []).filter((d) => d?.id && !decorItems.has(d.id));
      for (let i = 0; i < list.length; i++) _treeDefer.queue.push(list[i]);
      _treeDefer.offset = json.nextOffset ?? (_treeDefer.offset + list.length);
      _treeDefer.hasMore = !!json.hasMore;
    } catch (e) {
      console.warn('[sync] fetch arbres lointains', e);
      _treeDefer.hasMore = false;
    } finally {
      _treeDefer.loading = false;
    }
  }

  function _beginDeferredTrees(sx, sz) {
    _resetTreeDefer();
    _treeDefer.sx = sx;
    _treeDefer.sz = sz;
    _treeDefer.active = true;
    _fetchDeferredTreesBatch();
  }

  function _tickDeferredTreeLoader() {
    if (!_treeDefer.active) return;
    const maxSpawn = ZS._isMobile ? 2 : 4;
    if (_treeDefer.queue.length < 16 && _treeDefer.hasMore && !_treeDefer.loading) {
      _fetchDeferredTreesBatch();
    }
    if (!_treeDefer.queue.length) {
      if (!_treeDefer.hasMore && !_treeDefer.loading) _treeDefer.active = false;
      return;
    }
    _beginColliderBatch();
    let n = 0;
    while (_treeDefer.queue.length && n < maxSpawn) {
      const d = _treeDefer.queue.shift();
      _spawnDecorItem(d, { simpleLod: true });
      n++;
    }
    _endColliderBatch();
  }

  async function _spawnDecorBatch(list, onProgress, opts = {}) {
    if (!list.length) return;
    const CHUNK = opts.chunk ?? 128;
    const rafEvery = opts.rafEvery ?? 1;
    const pending = [];
    let chunks = 0;
    for (let i = 0; i < list.length; i++) {
      pending.push(_spawnDecorItem(list[i]));
      const flush = pending.length >= CHUNK || i === list.length - 1;
      if (!flush) continue;
      await Promise.all(pending);
      pending.length = 0;
      chunks++;
      if (onProgress) onProgress(i + 1, list.length);
      if (rafEvery > 0 && chunks % rafEvery === 0) {
        await new Promise((r) => requestAnimationFrame(r));
      }
    }
  }


  function _loadDeferredScript(src) {
    return ZS.loadScript?.(src) ?? Promise.reject(new Error('ZS.loadScript missing'));
  }

  function _s01DecorGroundY(data, px, pz, rotY) {
    if (data?.shackAnchor && ZS.sampleShackPadHeight && Number.isFinite(data.shackFloorY)) {
      const a = data.shackAnchor;
      return ZS.sampleShackPadHeight(a.x, a.z, a.rotY || 0) + data.shackFloorY;
    }
    if (data?.prefabId === 'building_survivor_shack' && ZS.sampleShackPadHeight) {
      return ZS.sampleShackPadHeight(px, pz, rotY);
    }
    return ZS.getDecorGroundHeight?.(px, pz);
  }

  function _resnapS01Decor() {
    if (!ZS.getDecorGroundHeight && !ZS.sampleShackPadHeight) return;
    for (const { root, data } of decorItems.values()) {
      const pk = String(data?.placementKey || '');
      if (!pk.startsWith('s01:') || !root) continue;
      const rotY = data.rotY ?? root.userData?.decorSpec?.rotY ?? root.rotation?.y ?? 0;
      const px = root.position.x;
      const pz = root.position.z;
      const gy = _s01DecorGroundY(data, px, pz, rotY);
      if (!Number.isFinite(gy)) continue;
      root.position.y = gy;
      data.baseY = gy;
      ZS.refreshDecorCollision?.(root);
    }
  }

  function _rebuildAllDecorColliders() {
    for (const { root } of decorItems.values()) {
      if (root?.userData?.decorSpec && root.userData.collide !== false) {
        ZS.refreshDecorCollision?.(root);
      }
    }
  }

  function _clearSyncedWorldState() {
    remotePlayers.forEach(({ mesh }) => _scene?.remove(mesh));
    remotePlayers.clear();
    sleepingBodies.forEach(({ mesh }) => _scene?.remove(mesh));
    sleepingBodies.clear();
    deathCorpses.forEach(({ mesh }) => _scene?.remove(mesh));
    deathCorpses.clear();
    _hideLocalDeathCorpse();
    decorItems.forEach(({ root }) => { if (root?.parent) root.parent.remove(root); });
    decorItems.clear();
    _resetTreeDefer();
    ZS.clearDecorColliders?.();
    _lastEquip = undefined;
  }

  function _beginGameInitSync(data) {
    if (_gameInitSyncing) {
      _pendingGameInit = data;
      return;
    }
    _gameInitSyncing = true;
    _connecting(true, 'Synchronisation…', 'Réception des données serveur', 'sync', 0);
    _finalizeGameInit(data)
      .catch((err) => {
        console.error('[network] game-init failed', err);
        _gameInitRetries++;
        if (_gameInitRetries >= _GAME_INIT_MAX_RETRIES) {
          _spawnReady = true;
          _syncPlayerPosToServer();
          _connecting(false);
          ZS.UI?.showNotif?.('Synchronisation incomplète — rechargez la page (Ctrl+F5)');
          return;
        }
        _connecting(true, 'Synchronisation interrompue', 'Nouvelle tentative…', 'sync', 0.08);
        const retry = () => {
          if (_socket?.connected) _socket.emit('request-game-init');
        };
        setTimeout(retry, 600 + _gameInitRetries * 400);
      })
      .finally(() => {
        _gameInitSyncing = false;
        if (_pendingGameInit) {
          const pending = _pendingGameInit;
          _pendingGameInit = null;
          _beginGameInitSync(pending);
        }
      });
  }

  function _flushPendingGameInit() {
    if (!_pendingGameInit || _gameInitSyncing) return;
    const pending = _pendingGameInit;
    _pendingGameInit = null;
    _beginGameInitSync(pending);
  }

  function _onGameInitReceived(data) {
    if (!_worldReady || !_scene || !_state) {
      _pendingGameInit = data;
      return;
    }
    _beginGameInitSync(data);
  }

  /** Démarre la connexion socket pendant buildWorld — buffer game-init jusqu'à init(). */
  function preconnect(socket) {
    _socket = socket;
    socket.on('connect', () => {
      if (!_worldReady) {
        window.ZS?.Loading?.setPhase?.('socket', 0.72, 'Serveur joint', 'Construction du monde…');
      }
      _syncDecorPrefabRegistry();
    });
    socket.on('game-init', _onGameInitReceived);
  }

  async function _finalizeGameInit(data) {
    const L = _loading();
    const t0 = performance.now();
    L?.setPhase?.('sync', 0.05, 'Synchronisation…', 'Préparation de la partie');

    ZS.AdminAuth?.loadFromAuth?.(data);
    if (ZS.AdminHub?.rebuildMenu) ZS.AdminHub.rebuildMenu();
    if (data.username) {
      localStorage.setItem('zombie_username', data.username);
      _localUsername = data.username;
    }
    if (ZS.Chat?.setUsername) ZS.Chat.setUsername(data.username);
    if (ZS.Chat?.setSelfId) ZS.Chat.setSelfId(data.selfId);
    if (ZS.Chat?.setServerReady) ZS.Chat.setServerReady(data.features?.chat !== false);
    if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
    if (data.qaEnabled) _loadDeferredScript('/js/qa-panel.js').then(() => {
      ZS.QaPanel?.init?.({ qaEnabled: true });
    }).catch(() => {});
    if (data.worldCollidersReady) _serverCollidersReady = true;
    ZS.Groups?.init?.();
    if (data.serverRole) localStorage.setItem('zombie_server_role', data.serverRole);
    _state.selfId = data.selfId;
    if (data.playerId != null) ZS.Inventory?.setSelfPlayerId?.(data.playerId);
    const spawn = data.spawn || ZS.SpawnZone?.spawn || null;
    if (spawn) {
      _state.player.x   = spawn.x;
      _state.player.z   = spawn.z;
      _state.camera.yaw = spawn.rotY || 0;
      _state.player.y   = ((ZS.getDecorGroundHeight
        ? ZS.getDecorGroundHeight(spawn.x, spawn.z)
        : (ZS.getTerrainHeight ? ZS.getTerrainHeight(spawn.x, spawn.z) : _state.player.y - 1.7))) + 1.7;
      if (ZS._camera) {
        ZS._camera.position.set(_state.player.x, _state.player.y, _state.player.z);
        ZS._camera.rotation.y = _state.camera.yaw;
      }
      if (ZS._localAvatar) {
        ZS._localAvatar.position.set(_state.player.x, _state.player.y - 1.7, _state.player.z);
        ZS._localAvatar.rotation.y = _state.camera.yaw;
      }
      localStorage.setItem('zombie_spawn', JSON.stringify(spawn));
    }
    if (typeof data.worldTime === 'number') ZS.setWorldTime(data.worldTime);
    if (ZS.Rcon) ZS.Rcon.init(_socket, data);
    if (ZS.AdminPanel) ZS.AdminPanel.init(_socket, data);
    _clearSyncedWorldState();
    for (const p of data.players) {
      if (p.id === _state.selfId) continue;
      _addRemotePlayer(p);
    }
    for (const s of (data.sleeping || [])) {
      if (s.dead) _addDeathCorpse(s);
      else _addSleepingBody(s);
    }
    if (data.respawnReason === 'stale_death') {
      ZS.UI?.showNotif?.('Vous étiez mort — respawn à la plage avec un nouveau kit.');
    } else if (data.respawnReason === 'offline_kill' || data.killedWhileOffline) {
      ZS.UI?.showNotif?.('Vous avez été tué pendant votre absence — respawn à la plage.');
    }

    const decorList = (data.decorItems || []).filter(
      (d) => !d.prefabId?.startsWith('road_barrier_')
        && !String(d.placementKey || '').startsWith('s01:hub:')
        && !String(d.placementKey || '').startsWith('s01:camp:'),
    );
    const itemList = data.items || [];
    const structList = data.structures || [];
    const spawnX = spawn?.x ?? _state.player.x ?? 0;
    const spawnZ = spawn?.z ?? _state.player.z ?? 0;
    const mobile = !!ZS._isMobile;
    const syncTotal = decorList.length + itemList.length + structList.length + 2;
    const tSync = performance.now();
    const batchOpts = mobile ? { chunk: 36, rafEvery: 2 } : { chunk: 56, rafEvery: 2 };

    for (const item of itemList) {
      ZS.Inventory.spawnWorldItem(item);
    }

    ZS.setDeferRockSnap?.(true);
    _beginColliderBatch();
    await _spawnDecorBatch(decorList, (n, total) => {
      const done = itemList.length + n;
      const t = syncTotal > 0 ? done / syncTotal : 1;
      L?.setPhase?.('sync', t, 'Synchronisation…', `${done} / ${syncTotal} objets`);
    }, batchOpts);
    console.info('[sync] décor', decorList.length, Math.round(performance.now() - tSync), 'ms');
    ZS.setDeferRockSnap?.(false);
    ZS.resnapAllMinableRocks?.(_scene);
    _resnapS01Decor();
    _rebuildAllDecorColliders();
    requestAnimationFrame(() => {
      ZS.BuildingDebug?.dumpShack?.();
    });
    ZS.BuildAnchors?.syncRegistryFromDecor?.(decorList);
    ZS.reconcileAllBuildFloors?.();
    _endColliderBatch();

    L?.setPhase?.('sync', 0.95, 'Synchronisation…', 'Rochers ancrés');

    const worldRockCount = decorList.filter(
      (d) => d.prefabId?.startsWith('rock_') && !d.anchorId,
    ).length;
    const spawnedRocks = _countSpawnedWorldRocks();
    if (worldRockCount > 0 && spawnedRocks === 0) {
      _beginColliderBatch();
      const n = await _resyncWorldRocksFromApi();
      ZS.resnapAllMinableRocks?.(_scene);
      _endColliderBatch();
      if (n > 0) console.info('[decor] rochers resync API:', n);
    }

    for (const st of structList) ZS.Inventory.spawnStructure(st);

    const clientV = window.__ZS_CLIENT_VERSION || '';
    const invDebugBuild = data.serverBuild || data.invDebugBuild || null;
    ZS.ConsumeDebug?.log('game-init-server-build', {
      clientVersion: clientV,
      invDebugBuild,
      wokeFromSleep: !!data.wokeFromSleep,
    });
    if (!invDebugBuild) {
      console.warn('[inv-debug] Serveur ancien (pas invDebugBuild) — npm run dev:server');
      ZS.UI?.showNotif?.('Serveur ancien — npm run dev:server');
    }

    if (data.inventory) {
      ZS.ConsumeDebug?.log('game-init-inv-raw', {
        trace: ZS.ConsumeDebug?.traceId?.('init'),
        serverFood: ZS.ConsumeDebug?.foodFromInv?.(data.inventory),
        wokeFromSleep: !!data.wokeFromSleep,
        invDebugBuild,
      });
      ZS.Inventory.loadFromSave(data.inventory);
      const cmp = ZS.ConsumeDebug?.compare?.(data.inventory, 'game-init');
      ZS.ConsumeDebug?.log('game-init-inv-loaded', { compare: cmp });
      requestInvDebugSnapshot(cmp?.trace, 'post-game-init');
    }
    if (typeof data.health === 'number' && _state?.player) {
      _state.player.health = Math.max(0, data.health);
      ZS.UI.setHealth(
        Math.floor(_state.player.health),
        ZS.Inventory?.getMaxHealth?.() || 100,
      );
      localStorage.setItem('zombie_health', String(Math.floor(_state.player.health)));
    }
    if (data.survival) ZS.Survival.loadFromSave(data.survival);
    const scenario = data.scenario || data.inventory?.scenario;
    ZS.IntroStarter?.setRockLookTarget?.(data.introRockLook);
    ZS.Scenario?.init?.(scenario, _state, _socket);
    if (typeof data.onlineCount === 'number') _setOnlineCount(data.onlineCount);
    else _setOnlineCount(remotePlayers.size + 1);
    if (typeof data.playerKills === 'number') {
      _state.player.playerKills = data.playerKills;
      ZS.UI.setPlayerKills(data.playerKills);
    }

    L?.setPhase?.('finalize', 0.5, 'Finalisation…', 'Envoi des collisions');
    _syncWorldColliders(true);
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    L?.setPhase?.('finalize', 0.85, 'Finalisation…', 'Préparation du combat');
    _syncPlayerPosToServer();
    _spawnReady = true;
    _hadSpawnReady = true;
    const zList = ZS.Scenario?.filterZombies?.(data.zombies || []) || data.zombies || [];
    if (zList.length) ZS.Zombies.syncAll(zList);
    if (_socket && !ZS.Scenario?.shouldDelayZombieSync?.()) {
      _socket.emit('request-zombie-sync');
    }
    ZS.SpawnIntro?.tryStart?.(_state);

    L?.setPhase?.('finalize', 1, 'Prêt', '');
    console.info('[sync] game-init total', Math.round(performance.now() - t0), 'ms');
    _gameInitRetries = 0;
    _connecting(false);
    _beginDeferredTrees(spawnX, spawnZ);
  }

  function init(socket, scene, state) {
    _socket = socket;
    _scene  = scene;
    _state  = state;
    _worldReady = true;
    _flushPendingGameInit();

    const socketPct = socket.connected ? 0.85 : 0.35;
    _connecting(
      true,
      socket.connected ? 'Connexion établie' : 'Connexion au serveur…',
      socket.connected ? 'Chargement de votre partie…' : 'Authentification en cours',
      'socket',
      socketPct,
    );
    ZS.loadScript?.('/js/groups.js').then(() => {
      ZS.Groups?.init?.();
      ZS.Groups?.bindSocket?.(socket);
    }).catch((e) => console.warn('[groups] load', e));

    socket.on('connect', () => {
      const needsResync = _hadSpawnReady;
      _spawnReady = false;
      if (!needsResync) {
        _connecting(true, 'Connexion établie', 'Chargement de votre partie…', 'socket', 0.35);
        return;
      }
      _setOnlineCount(0);
      _connecting(true, 'Connexion établie', 'Resynchronisation…', 'socket', 0.35);
      // Filet : nouvelle connexion ou recovery — le serveur renvoie game-init.
      setTimeout(() => {
        if (_socket?.connected && !_spawnReady) _socket.emit('request-game-init');
      }, socket.recovered ? 0 : 1200);
    });

    socket.on('connect_error', (err) => {
      const msg = (err && err.message) || '';
      if (/auth/i.test(msg)) {
        ['zombie_token', 'zombie_username', 'zombie_is_admin', 'zombie_spawn', 'zombie_health', 'zombie_kills']
          .forEach((k) => localStorage.removeItem(k));
        window.location.href = '/';
        return;
      }
      _connecting(true, 'Serveur indisponible', msg || 'Nouvelle tentative automatique…', 'socket', 0.1);
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return;
      _spawnReady = false;
      if (!_gameInitSyncing) _loading()?.reset?.();
      _connecting(true, 'Connexion perdue', 'Reconnexion en cours…', 'socket', 0.1);
    });

    socket.on('zombies-snapshot', (arr) => {
      if (!Array.isArray(arr)) return;
      const list = ZS.Scenario?.filterZombies?.(arr) ?? arr;
      ZS.Zombies.syncAll(list);
    });

    socket.on('scenario-update', (d) => {
      ZS.Scenario?.onUpdate?.(d);
    });

    socket.on('players-online', (d) => {
      if (typeof d?.count === 'number') _setOnlineCount(d.count);
    });

    socket.on('player-join', (p) => {
      if (p.id === state.selfId) return;
      if (remotePlayers.has(p.id)) return; // guard against double-add
      _addRemotePlayer(p);
    });

    socket.on('player-move', (d) => {
      if (d.id === state.selfId) return;
      const rp = remotePlayers.get(d.id);
      if (!rp) return;
      // d.y is the sender's eye height (terrain + 1.7); convert to foot level
      const groundY = d.y - 1.7;
      const dx = d.x - rp.targetX;
      const dz = d.z - rp.targetZ;
      rp.moveSpeed = Math.hypot(dx, dz) * 20; // speed ~0-6 for walking
      rp.targetX    = d.x;
      rp.targetY    = groundY;
      rp.targetZ    = d.z;
      rp.targetRotY = d.rotY;
    });

    socket.on('player-leave', (id) => {
      if (id === state.selfId) return;
      const rp = remotePlayers.get(id);
      if (rp) { _scene.remove(rp.mesh); remotePlayers.delete(id); }
    });

    socket.on('player-sleep', (s) => {
      if (!s?.playerId) return;
      // Filet de sécurité : retirer l'avatar debout si player-leave manque (déco → corps uniquement).
      if (s.username) {
        for (const [rid, rp] of remotePlayers) {
          if (rp.mesh?.userData?.username === s.username) {
            _scene.remove(rp.mesh);
            remotePlayers.delete(rid);
          }
        }
      }
      _addSleepingBody(s);
    });

    socket.on('player-wake', (d) => {
      const pid = Number(d?.playerId);
      if (!pid) return;
      _removeSleepingBody(pid);
    });

    socket.on('sleeper-death', (d) => {
      if (!d?.playerId) return;
      _removeSleepingBody(d.playerId);
      _addDeathCorpse(d);
      if (d.username) ZS.UI?.showNotif?.(`☠ ${d.username} a été tué`);
    });

    socket.on('sleeper-removed', (d) => {
      const pid = Number(d?.playerId);
      if (!pid) return;
      _removeSleepingBody(pid);
      _removeDeathCorpse(pid);
    });

    socket.on('sleeper-hit', (d) => {
      const pid = Number(d?.playerId);
      if (!pid || typeof d.health !== 'number') return;
      const sleep = sleepingBodies.get(pid);
      if (sleep) sleep.health = d.health;
    });

    socket.on('sleep-loot-update', (d) => {
      if (!d?.playerId) return;
      ZS.SleepLoot?.onInventoryUpdate?.(d.playerId, d.inventory);
    });

    // Un autre joueur change/retire son item en main
    socket.on('player-equip', (d) => {
      if (d.id === state.selfId) return;
      const rp = remotePlayers.get(d.id);
      if (!rp) return;
      rp.equipped = d.type || null;
      ZS.setRemoteHandItem(rp.mesh, rp.equipped);
    });

    // Un autre joueur attaque (tir ou mêlée) → on rejoue le geste du bras
    socket.on('player-attack', (d) => {
      if (d.id === state.selfId) return;
      const rp = remotePlayers.get(d.id);
      if (!rp) return;
      const weapon = d.weapon || rp.equipped;
      const grip = ZS.getGrip(weapon);
      const animDef = d.kind === 'recoil' ? grip.anim.recoil : grip.anim.melee;
      rp.attack = {
        t: 0,
        dur: animDef?.dur || (d.kind === 'recoil' ? 0.12 : 0.32),
        kind: d.kind,
      };
      if (d.kind === 'recoil') {
        const holder = rp.mesh.userData.rig?.rightItemHolder
          || rp.mesh.userData.limbs?.rArm?.getObjectByName('itemHolder')
          || rp.mesh.userData.limbs?.rArm?.getObjectByName('handHolder');
        if (holder) ZS.muzzleFlash(holder);
      }
      const sx = Number.isFinite(d.x) ? d.x : rp.mesh.position.x;
      const sz = Number.isFinite(d.z) ? d.z : rp.mesh.position.z;
      const sp = ZS.Audio?.spatialAt?.(sx, sz) || _spatial({ x: sx, z: sz });
      if (sp && sp.vol > 0.04) {
        if (d.kind === 'recoil') ZS.Audio.gunshot(weapon, sp.vol, sp.pan);
        else ZS.Audio.melee(sp.vol * 0.8, sp.pan);
      }
    });

    socket.on('player-footstep', (d) => {
      if (!d?.id || d.id === state.selfId) return;
      const sx = Number(d.x);
      const sz = Number(d.z);
      if (!Number.isFinite(sx) || !Number.isFinite(sz)) return;
      const sp = ZS.Audio?.spatialAt?.(sx, sz);
      if (!sp || sp.vol < 0.04) return;
      const base = d.sprint ? 0.72 : 0.56;
      ZS.Audio.footstep(d.surface || 'dirt', base * sp.vol, sp.pan);
    });

    socket.on('zombie-tick',  (d) => {
      if (d.zombies) {
        const list = ZS.Scenario?.filterZombies?.(d.zombies) ?? d.zombies;
        if (d.full === false) ZS.Zombies.applyDelta(list, d.removed);
        else ZS.Zombies.syncAll(list);
      }
      if (typeof d.time === 'number' && Math.abs(d.time - (_lastWorldTime ?? d.time)) > 0.0005) {
        _lastWorldTime = d.time;
        ZS.setWorldTime(d.time);
      }
    });

    socket.on('world-time', (d) => {
      if (typeof d?.time === 'number') ZS.setWorldTime(d.time);
    });

    socket.on('admin-role-update', (d) => {
      ZS.AdminAuth?.loadFromAuth?.(d);
      if (ZS.AdminHub?.rebuildMenu) ZS.AdminHub.rebuildMenu();
      if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
      if (ZS.AdminPanel?.refreshMenu) ZS.AdminPanel.refreshMenu();
      ZS.UI?.showNotif?.(`Rôle mis à jour : ${d.roleLabel || d.role || '?'}`);
    });

    socket.on('server-flags', (d) => {
      if (ZS.Rcon) ZS.Rcon.onFlags(d);
    });

    socket.on('admin-tp', (d) => {
      if (!d) return;
      state.player.x = d.x;
      state.player.y = d.y;
      state.player.z = d.z;
      if (d.rotY != null) {
        state.player.rotY = d.rotY;
        state.camera.yaw = d.rotY;
      }
      state.player.velocityY = 0;
      state.player.onGround = true;
      if (ZS._camera) {
        ZS._camera.position.set(d.x, d.y, d.z);
        if (d.rotY != null) ZS._camera.rotation.y = d.rotY;
      }
      if (ZS._localAvatar) {
        ZS._localAvatar.position.set(d.x, d.y - 1.7, d.z);
        ZS._localAvatar.rotation.y = d.rotY ?? state.camera.yaw;
      }
      _syncPlayerPosToServer();
      ZS.UI?.showNotif?.(`Téléporté → (${Math.round(d.x)}, ${Math.round(d.z)})`);
    });

    socket.on('server-announce', (d) => {
      if (!d?.message) return;
      let el = document.getElementById('server-announce');
      if (!el) {
        el = document.createElement('div');
        el.id = 'server-announce';
        document.body.appendChild(el);
      }
      const from = d.from ? `[${d.from}] ` : '';
      el.textContent = from + d.message;
      el.style.opacity = '1';
      clearTimeout(el._hideT);
      el._hideT = setTimeout(() => { el.style.opacity = '0'; }, 6000);
    });
    socket.on('zombie-spawn', (z) => {
      const list = ZS.Scenario?.filterZombies?.([z]) ?? [z];
      if (list.length) ZS.Zombies.spawn(z);
    });
    socket.on('zombie-hit', (d) => {
      if (!d?.id) return;
      const pos = (Number.isFinite(d.x) && Number.isFinite(d.z))
        ? { x: d.x, z: d.z, angle: d.angle }
        : null;
      ZS.Zombies.hit(d.id, d.health, d.maxHealth, pos);
    });
    socket.on('zombie-die',   (id)  => ZS.Zombies.die(id));

    socket.on('player-hit', (d) => {
      if (!d?.id || d.id === state.selfId) return;
      const rp = remotePlayers.get(d.id);
      if (!rp) return;
      ZS.flashRemotePlayer?.(rp.mesh);
    });

    socket.on('structure-spawn', (d) => ZS.Inventory.spawnStructure(d));
    socket.on('decor-item-spawn', (d) => _spawnDecorItem(d));
    socket.on('decor-item-remove', (id) => _removeDecorItem(id));
    socket.on('decor-door-state', (d) => {
      if (!d?.id) return;
      if (ZS.setDecorDoorState?.(d.id, !!d.open)) _syncWorldColliders();
      const entry = decorItems.get(d.id);
      if (entry) entry.data.doorOpen = !!d.open;
    });
    socket.on('door-lock-state', (d) => {
      if (!d?.id) return;
      ZS.setDecorDoorLockState?.(d.id, d);
      const entry = decorItems.get(d.id);
      if (entry?.data) {
        entry.data.locked = !!d.locked;
        entry.data.lockId = d.lockId || null;
        entry.data.lockOwner = d.lockOwner || null;
      }
    });
    socket.on('door-error', (d) => {
      if (d?.message) ZS.UI?.showNotif?.(d.message);
    });
    socket.on('storage-open', (d) => ZS.StorageUI?.open?.(d));
    socket.on('storage-update', (d) => ZS.StorageUI?.update?.(d));
    socket.on('storage-state', (d) => {
      if (!d?.id) return;
      ZS.setDecorStorageState?.(d.id, !!d.open);
      const entry = decorItems.get(d.id);
      if (entry) entry.data.storageOpen = !!d.open;
    });
    socket.on('storage-error', (d) => {
      if (d?.message) ZS.UI?.showNotif?.(d.message);
    });
    socket.on('build-damage', (d) => {
      if (!d?.id) return;
      const entry = decorItems.get(d.id);
      if (entry?.data) {
        if (d.kind === 'door') {
          entry.data.doorBreakDamage = d.damage;
          entry.data.doorBreakMaxHp = d.maxHp;
        } else {
          entry.data.buildDamage = d.damage;
          entry.data.buildMaxHp = d.maxHp;
        }
      }
      const label = d.kind === 'door' ? 'Porte endommagée' : 'Structure endommagée';
      ZS.UI?.showNotif?.(`${label} (${d.damage}/${d.maxHp})`);
    });
    socket.on('build-destroyed', (d) => {
      ZS.UI?.showNotif?.(d?.kind === 'door' ? 'Porte détruite' : 'Structure détruite');
    });
    socket.on('decor-tree-chop', (d) => {
      if (!d?.id) return;
      if (d.by !== state.selfId) {
        const entry = decorItems.get(d.id);
        const tx = entry?.data?.x;
        const tz = entry?.data?.z;
        if (Number.isFinite(tx) && Number.isFinite(tz)) {
          const sp = ZS.Audio?.spatialAt?.(tx, tz);
          if (sp && sp.vol > 0.05) ZS.Audio.chopWood(sp.vol * 0.92, sp.pan);
        }
      }
      ZS.applyRemoteTreeChop?.(d.id, d.woodRemaining, d.woodMax, d);
    });
    socket.on('decor-tree-grow', (d) => {
      if (!d?.id) return;
      ZS.applyRemoteTreeGrow?.(d.id, d);
    });
    socket.on('decor-tree-fell', (d) => {
      if (!d?.id) return;
      ZS.applyRemoteTreeFell?.(d.id, d.fallDirX, d.fallDirZ);
    });
    socket.on('decor-rock-mine', (d) => {
      if (!d?.id) return;
      if (d.by !== state.selfId) {
        const entry = decorItems.get(d.id);
        const tx = entry?.data?.x;
        const tz = entry?.data?.z;
        if (Number.isFinite(tx) && Number.isFinite(tz)) {
          const sp = ZS.Audio?.spatialAt?.(tx, tz);
          if (sp && sp.vol > 0.05) ZS.Audio.chopWood(sp.vol * 0.85, sp.pan);
        }
      }
      ZS.applyRemoteRockMine?.(d.id, d.stoneRemaining);
    });
    socket.on('decor-rock-depleted', (d) => {
      if (!d?.id) return;
      ZS.applyRemoteRockDepleted?.(d.id);
    });
    socket.on('item-spawn',  (d)  => ZS.Inventory.spawnWorldItem(d));
    socket.on('item-remove', (id) => ZS.Inventory.removeWorldItem(id));
    socket.on('inventory-authoritative', (inv) => {
      ZS.ConsumeDebug?.log('inventory-authoritative', {
        trace: ZS.ConsumeDebug?.traceId?.('auth'),
        serverFood: ZS.ConsumeDebug?.foodFromInv?.(inv),
        clientBefore: ZS.ConsumeDebug?.clientSnapshot?.(),
      });
      if (inv && ZS.Inventory?.applyAuthoritativeInv) {
        const prevActive = ZS.Inventory.getActiveItem?.()?.type;
        ZS.Inventory.applyAuthoritativeInv(inv);
        ZS.ConsumeDebug?.compare?.(inv, 'inventory-authoritative');
        ZS.SleepLoot?.refreshIfOpen?.();
        ZS.StorageUI?.refreshIfOpen?.();
        const next = ZS.Inventory.getActiveItem?.();
        if (prevActive && !next && prevActive !== '__fist__') {
          const def = ZS.ITEMS?.[prevActive];
          ZS.UI?.showNotif?.((def?.label || prevActive) + ' cassé(e) !');
          ZS.setHandItem?.(null);
        }
      } else if (inv && ZS.Inventory?.loadFromSave) {
        ZS.Inventory.loadFromSave(inv, { fullReset: true });
      }
    });
    socket.on('survival-update', (d) => {
      if (!d) return;
      ZS.Survival?.applyServerState?.(d);
      if (typeof d.health === 'number' && _state?.player) {
        _state.player.health = Math.max(0, d.health);
        ZS.UI.setHealth(Math.floor(_state.player.health), ZS.Inventory?.getMaxHealth?.() || 100);
        localStorage.setItem('zombie_health', String(Math.floor(_state.player.health)));
      }
    });

    socket.on('player-death', (d) => {
      if (!d) return;
      const isSelf = d.id === state.selfId;
      if (isSelf) {
        if (!_state?.player || _state.player.dead) return;
        _state.player.dead = true;
        _state.player.health = 0;
        ZS.UI.setHealth(0);
        ZS.UI.showDeath(d.recap || {
          zombieKills: d.kills ?? _state.player.kills,
          playerKills: 0,
          survivedMs: 0,
        });
        _showLocalDeathCorpse(d);
        return;
      }
      ZS.UI?.showNotif?.(`RIP ${d.username || 'Joueur'}`);
      const rp = remotePlayers.get(d.id);
      if (rp) {
        _scene.remove(rp.mesh);
        remotePlayers.delete(d.id);
      }
      _addDeathCorpse(d);
    });

    socket.on('player-respawn', (d) => {
      if (!d?.playerId) return;
      _removeDeathCorpse(d.playerId);
      if (d.id === state.selfId) return;
      const footY = (d.y || 0) - 1.7;
      if (!remotePlayers.has(d.id)) {
        _addRemotePlayer({
          id: d.id,
          username: d.username,
          x: d.x,
          y: d.y,
          z: d.z,
          rotY: d.rotY,
          equipped: d.equipped || null,
        });
        return;
      }
      const rp = remotePlayers.get(d.id);
      rp.targetX = d.x;
      rp.targetY = footY;
      rp.targetZ = d.z;
      rp.targetRotY = d.rotY || 0;
      rp.mesh.position.set(d.x, footY, d.z);
      rp.mesh.rotation.y = d.rotY || 0;
    });

    socket.on('move-correction', (d) => {
      if (!_state?.player || !d) return;
      const px = _state.player.x;
      const pz = _state.player.z;
      _state.player.x = d.x;
      _state.player.y = d.y;
      _state.player.z = d.z;
      _state.player.rotY = d.rotY;
      if (ZS._camera) {
        ZS._camera.position.set(d.x, d.y, d.z);
        ZS._camera.rotation.y = d.rotY ?? _state.camera.yaw;
      }
      if (Math.hypot(d.x - px, d.z - pz) > 8) {
        console.warn('[sync] move-correction', { from: [px, pz], to: [d.x, d.z] });
        ZS.UI?.showNotif?.(`Position corrigée → (${Math.round(d.x)}, ${Math.round(d.z)})`);
      }
    });

    socket.on('craft-queue-state', (d) => {
      ZS.Craft?.applyServerQueue?.(d);
    });

    socket.on('craft-complete', (d) => {
      ZS.Craft?.onServerComplete?.(d);
    });

    // Respawn autoritaire : position serveur (d.spawn), pas le SpawnZone local.
    socket.on('respawn-at', (d) => {
      state.player.dead = false;
      state.player.health = 100;
      const spawn = d.spawn || ZS.SpawnZone?.spawn || null;
      if (spawn) {
        state.player.x = spawn.x;
        state.player.z = spawn.z;
        state.player.y = ((ZS.getDecorGroundHeight
          ? ZS.getDecorGroundHeight(spawn.x, spawn.z)
          : (ZS.getTerrainHeight ? ZS.getTerrainHeight(spawn.x, spawn.z) : 1))) + 1.7;
        state.player.velocityY = 0;
        state.player.onGround  = true;
        state.camera.yaw = spawn.rotY || 0;
        if (ZS._camera) {
          ZS._camera.position.set(state.player.x, state.player.y, state.player.z);
          ZS._camera.rotation.y = state.camera.yaw;
        }
        if (ZS._localAvatar) {
          ZS._localAvatar.position.set(state.player.x, state.player.y - 1.7, state.player.z);
          ZS._localAvatar.rotation.y = state.camera.yaw;
        }
      }
      if (d.inventory && ZS.Inventory.loadRespawnKit) {
        ZS.Inventory.loadRespawnKit(d.inventory);
      } else if (d.inventory) {
        ZS.Inventory.loadFromSave(d.inventory, { fullReset: true });
      }
      if (d.survival) ZS.Survival.loadFromSave(d.survival);
      else ZS.Survival?.reset?.();
      if (d.inventory?.scenario) {
        ZS.Scenario?.init?.(d.inventory.scenario, state, _socket);
        if (d.inventory.scenario.step === 'intro_wake') {
          ZS.SpawnIntro?.tryStart?.(state);
        }
      }
      ZS.UI.setHealth(100);
      ZS.UI.hideDeath();
      _hideLocalDeathCorpse();
      _state.player.playerKills = 0;
      ZS.UI.setPlayerKills(0);
      _syncPlayerPosToServer();
    });

    socket.on('take-damage', (d) => {
      if (!_spawnReady) return;
      if (state.player.dead) return;
      const maxHp = ZS.Inventory?.getMaxHealth?.() || 100;
      const dmg = typeof d.dmg === 'number' ? d.dmg : 0;
      if (typeof d.health === 'number') {
        state.player.health = d.health;
      } else if (dmg > 0) {
        state.player.health = Math.max(0, state.player.health - dmg);
      }
      ZS.UI.setHealth(Math.floor(state.player.health), maxHp);
      if (dmg > 0 && state.player.health > 0) ZS.UI.flashDamage();
      if (d.infected) ZS.UI?.showNotif?.('⚠ Morsure infectée !');
      /* mort UI via player-death (serveur authoritatif) */
    });

    socket.on('score-update', (d) => {
      if (typeof d.kills === 'number') state.player.kills = d.kills;
      if (typeof d.playerKills === 'number') {
        state.player.playerKills = d.playerKills;
        ZS.UI.setPlayerKills(d.playerKills);
      }
    });

    _flushPendingGameInit();
  }

  function getLocalXZ() {
    return { x: _state?.player?.x ?? 0, z: _state?.player?.z ?? 0 };
  }

  const REMOTE_ANIM_R2 = 72 * 72;

  // Called every frame from game loop — smooth movement + walk animation
  function tick(dt) {
    const lp = getLocalXZ();
    _tickDecorVisibility(lp.x, lp.z);
    _tickDeferredTreeLoader();
    const cam = ZS._camera;
    if (cam) _tickNameTagOcclusion(cam.position.x, cam.position.z, cam.position.y);

    const LERP = 12;
    remotePlayers.forEach((rp) => {
      const mesh = rp.mesh;

      // Interpolate position
      mesh.position.x += (rp.targetX - mesh.position.x) * Math.min(1, LERP * dt);
      mesh.position.y += (rp.targetY - mesh.position.y) * Math.min(1, LERP * dt);
      mesh.position.z += (rp.targetZ - mesh.position.z) * Math.min(1, LERP * dt);

      // Interpolate rotation (shortest arc)
      let rotDiff = rp.targetRotY - mesh.rotation.y;
      while (rotDiff >  Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      mesh.rotation.y += rotDiff * Math.min(1, LERP * dt);

      const dist2 = (mesh.position.x - lp.x) ** 2 + (mesh.position.z - lp.z) ** 2;
      mesh.visible = dist2 <= 110 * 110;

      // Walk animation
      const limbs = mesh.userData.limbs;
      if (!limbs) return;
      if (dist2 > REMOTE_ANIM_R2) {
        rp.moveSpeed *= 0.85;
        return;
      }

      const speed = rp.moveSpeed || 0;
      const grip  = mesh.userData.grip || ZS.getGrip(rp.equipped);
      const rem   = grip.remote;
      const twoH  = grip.twoHanded && rem;
      if (twoH) {
        // Tenue à deux mains (armes à feu, barre, lance…) — params depuis GRIPS
        limbs.rArm.rotation.set(rem.rArmRot[0], rem.rArmRot[1], rem.rArmRot[2]);
        if (!rp._handHolder) rp._handHolder = limbs.rArm.getObjectByName('handHolder');
        const hh = rp._handHolder;
        if (hh) hh.quaternion.copy(limbs.rArm.quaternion).invert();
        const hOff = rem.handHolder || [0, -0.72, -0.12];
        const rHand = _rHandVec.set(hOff[0], hOff[1], hOff[2])
          .applyQuaternion(limbs.rArm.quaternion)
          .add(limbs.rArm.position);
        if (rem.lArmMode === 'aimAtHand') {
          const dir = _rHandVec.copy(rHand).sub(limbs.lArm.position).normalize();
          limbs.lArm.quaternion.setFromUnitVectors(_DOWN, dir);
        }
        if (speed > 0.3) {
          rp.animTime += dt * Math.max(4, speed * 1.2);
          const swing = Math.sin(rp.animTime) * 0.65;
          limbs.lLeg.rotation.x =  swing;
          limbs.rLeg.rotation.x = -swing;
        } else {
          limbs.lLeg.rotation.x *= 0.8;
          limbs.rLeg.rotation.x *= 0.8;
          if (Math.abs(limbs.lLeg.rotation.x) < 0.001) {
            limbs.lLeg.rotation.x = limbs.rLeg.rotation.x = 0;
            rp.animTime = 0;
          }
        }
      } else if (speed > 0.3) {
        if (!rp._handHolder) rp._handHolder = limbs.rArm.getObjectByName('handHolder');
        const hh = rp._handHolder;
        if (hh) { hh.rotation.set(0, 0, 0); hh.quaternion.set(0, 0, 0, 1); }
        limbs.lArm.quaternion.set(0, 0, 0, 1);
        limbs.lArm.rotation.y = limbs.lArm.rotation.z = 0;
        limbs.rArm.rotation.y = limbs.rArm.rotation.z = 0;
        rp.animTime += dt * Math.max(4, speed * 1.2);
        const swing = Math.sin(rp.animTime) * 0.65;
        limbs.lArm.rotation.x = -swing;
        limbs.rArm.rotation.x =  swing;
        limbs.lLeg.rotation.x =  swing;
        limbs.rLeg.rotation.x = -swing;
      } else {
        // Return limbs to neutral
        if (!rp._handHolder) rp._handHolder = limbs.rArm.getObjectByName('handHolder');
        const hh = rp._handHolder;
        if (hh) { hh.rotation.set(0, 0, 0); hh.quaternion.set(0, 0, 0, 1); }
        limbs.lArm.quaternion.set(0, 0, 0, 1);
        limbs.lArm.rotation.y = limbs.lArm.rotation.z = 0;
        limbs.rArm.rotation.y = limbs.rArm.rotation.z = 0;
        limbs.lArm.rotation.x *= 0.8;
        limbs.rArm.rotation.x *= 0.8;
        limbs.lLeg.rotation.x *= 0.8;
        limbs.rLeg.rotation.x *= 0.8;
        if (Math.abs(limbs.lArm.rotation.x) < 0.001) {
          limbs.lArm.rotation.x = limbs.rArm.rotation.x = 0;
          limbs.lLeg.rotation.x = limbs.rLeg.rotation.x = 0;
          rp.animTime = 0;
        }
      }
      rp.moveSpeed *= 0.85;

      // Geste d'attaque — surcharge le bras droit (porte l'item) le temps de l'anim
      if (rp.attack) {
        rp.attack.t += dt;
        const e = rp.attack.t / rp.attack.dur;
        if (e >= 1) {
          rp.attack = null;
        } else {
          const s = Math.sin(e * Math.PI);
          const atkGrip = mesh.userData.grip || ZS.getGrip(rp.equipped);
          if (rp.attack.kind === 'recoil') {
            const base = atkGrip.remote?.rArmRot?.[0] ?? (atkGrip.twoHanded ? 0.85 : 0.25);
            const a = atkGrip.anim.recoil;
            limbs.rArm.rotation.x = base + s * ((a.rArmX || 0.08) * 2.5);
          } else {
            const a = atkGrip.anim.melee;
            if (a.style === 'rock_slam' && atkGrip.twoHanded) {
              const base = atkGrip.remote?.rArmRot?.[0] ?? 0.58;
              const windEnd = 0.20;
              let ext = 0;
              if (e <= windEnd) {
                ext = Math.sin((e / windEnd) * Math.PI * 0.5) * 0.18;
              } else {
                const t = (e - windEnd) / (1 - windEnd);
                ext = -Math.sin(t * Math.PI) * 0.95;
              }
              limbs.rArm.rotation.x = base + ext;
              limbs.lArm.rotation.x = base + ext * 0.94;
            } else if (a.style === 'thrust_forward' && atkGrip.twoHanded) {
              const base = atkGrip.remote?.rArmRot?.[0] ?? 0.58;
              const ext = s * ((a.rArmX || 0.10) * 1.5);
              limbs.rArm.rotation.x = base + ext;
              limbs.lArm.rotation.x = base + ext * 0.92;
            } else {
              limbs.rArm.rotation.x = s * ((a.swingX || 0.95) * 1.75);
            }
          }
        }
      }
    });
  }

  let _lastSent = 0;
  function sendMove(x, y, z, rotY, force) {
    if (!_spawnReady || !_socket) return;
    if (!force && _state?.player?.dead) return;
    const now = Date.now();
    if (!force && now - _lastSent < 50) return; // 20 Hz max
    _lastSent = now;
    _socket.emit('move', { x, y, z, rotY });
  }

  function _syncPlayerPosToServer() {
    if (!_state?.player) return;
    const p = _state.player;
    sendMove(p.x, p.y, p.z, p.rotY ?? _state.camera?.yaw ?? 0, true);
  }

  /** Repousse le joueur local hors des autres joueurs (collision cylindrique XZ). */
  function resolveRemotePlayerCollision(px, pz, playerR) {
    let x = px;
    let z = pz;
    const minDist = playerR * 2;
    const minDist2 = minDist * minDist;
    const push = (zx, zz) => {
      const dx = x - zx;
      const dz = z - zz;
      const dist2 = dx * dx + dz * dz;
      if (dist2 >= minDist2 || dist2 <= 0.000001) return;
      const dist = Math.sqrt(dist2);
      const scale = minDist / dist;
      x = zx + dx * scale;
      z = zz + dz * scale;
    };
    remotePlayers.forEach((rp) => {
      push(rp.mesh.position.x, rp.mesh.position.z);
    });
    sleepingBodies.forEach((entry) => {
      if (entry?.mesh) push(entry.mesh.position.x, entry.mesh.position.z);
    });
    deathCorpses.forEach((entry) => {
      if (entry?.mesh) push(entry.mesh.position.x, entry.mesh.position.z);
    });
    return { x, z };
  }

  function sendShoot(ox, oz, dx, dz, weaponType) {
    if (!_spawnReady || !_socket) return;
    _socket.emit('shoot', { ox, oz, dx, dz, weaponType: weaponType || ZS.Inventory?.getActiveItem?.()?.type || '__fist__' });
  }

  // Item en main — diffusé aux autres joueurs (dédupliqué : envoi au changement).
  function sendEquip(type) {
    type = type || null;
    if (type === _lastEquip) return;
    _lastEquip = type;
    if (_socket) _socket.emit('equip', { type });
  }

  // Geste d'attaque — diffusé pour rejouer l'animation chez les autres.
  function sendAttack(kind, weapon) {
    if (!_socket) return;
    _socket.emit('attack', {
      kind: kind === 'recoil' ? 'recoil' : 'melee',
      weapon: weapon || ZS.Inventory?.getActiveItem?.()?.type || null,
    });
  }

  function sendFootstep(surface, sprint) {
    if (!_socket || !surface) return;
    _socket.emit('footstep', { surface, sprint: !!sprint });
  }

  function sendDied() {
    /* mort déclenchée par le serveur (player-death) */
  }
  function sendRespawn() {
    if (_socket) _socket.emit('respawn');
  }
  function sendSurvival() {
    /* survie authoritaire serveur */
  }

  // Volume (0–1) selon la distance à la caméra + panoramique stéréo (-1 G … +1 D)
  const AUDIO_RANGE = 60;
  const _sFwd = new THREE.Vector3(), _sRight = new THREE.Vector3(),
        _sTo = new THREE.Vector3(), _sUp = new THREE.Vector3(0, 1, 0);
  function _spatial(pos) {
    const cam = ZS._camera;
    if (!cam) return null;
    const dx = pos.x - cam.position.x, dz = pos.z - cam.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > AUDIO_RANGE) return { vol: 0, pan: 0 };
    const vol = (1 - dist / AUDIO_RANGE) ** 2;
    cam.getWorldDirection(_sFwd); _sFwd.y = 0; _sFwd.normalize();
    _sRight.crossVectors(_sFwd, _sUp).normalize();
    _sTo.set(dx, 0, dz).normalize();
    return { vol, pan: Math.max(-1, Math.min(1, _sTo.dot(_sRight))) };
  }

  function _addRemotePlayer(p) {
    const mesh = ZS.createPlayerModel();
    // p.y is eye height; place model at foot level
    const groundY = typeof ZS.getTerrainHeight === 'function'
      ? ZS.getTerrainHeight(p.x, p.z)
      : (p.y || 0) - 1.7;
    mesh.position.set(p.x, groundY, p.z);
    mesh.rotation.y = p.rotY || 0;
    mesh.userData.username = p.username;
    _scene.add(mesh);

    // Name tag sprite
    const tag = _makeNameTag(p.username);
    mesh.userData.nameTag = tag;
    mesh.add(tag);

    remotePlayers.set(p.id, {
      mesh,
      targetX:    p.x,
      targetY:    groundY,
      targetZ:    p.z,
      targetRotY: p.rotY || 0,
      moveSpeed:  0,
      animTime:   0,
      equipped:   p.equipped || null,
      attack:     null
    });

    // Item déjà tenu en main par ce joueur (rejoint déjà équipé)
    if (p.equipped) ZS.setRemoteHandItem(mesh, p.equipped);
  }

  function _groundYAt(x, z, eyeY) {
    if (ZS.getDecorGroundHeight) return ZS.getDecorGroundHeight(x, z);
    if (typeof ZS.getTerrainHeight === 'function') return ZS.getTerrainHeight(x, z);
    return (eyeY || 0) - 1.7;
  }

  function _addDeathCorpse(s) {
    const playerId = Number(s.playerId);
    if (!playerId || !_scene) return;
    _removeDeathCorpse(playerId);
    const mesh = ZS.createPlayerModel();
    const groundY = _groundYAt(s.x, s.z, s.y);
    mesh.position.set(s.x, groundY, s.z);
    mesh.rotation.y = s.rotY || 0;
    ZS.applySleepPose?.(mesh);
    mesh.userData.username = s.username;
    mesh.userData.deathCorpse = true;
    _scene.add(mesh);
    const tag = _makeNameTag(`☠ ${s.username || ''}`);
    tag.position.set(0, 0.55, 0);
    mesh.userData.nameTag = tag;
    mesh.add(tag);
    if (s.equipped) ZS.setRemoteHandItem(mesh, s.equipped);
    deathCorpses.set(playerId, {
      mesh,
      playerId,
      username: s.username,
      x: s.x,
      z: s.z,
    });
  }

  function _removeDeathCorpse(playerId) {
    const entry = deathCorpses.get(Number(playerId));
    if (!entry) return;
    _scene.remove(entry.mesh);
    deathCorpses.delete(Number(playerId));
  }

  function _showLocalDeathCorpse(d) {
    _hideLocalDeathCorpse();
    if (!_scene || !_state?.player) return;
    const x = d.x ?? _state.player.x;
    const z = d.z ?? _state.player.z;
    const y = d.y ?? _state.player.y;
    const rotY = d.rotY ?? _state.camera?.yaw ?? 0;
    const mesh = ZS.createPlayerModel();
    const groundY = _groundYAt(x, z, y);
    mesh.position.set(x, groundY, z);
    mesh.rotation.y = rotY;
    ZS.applySleepPose?.(mesh);
    mesh.userData.deathCorpse = true;
    _scene.add(mesh);
    const username = d.username || _localUsername || '';
    const tag = _makeNameTag(`☠ ${username}`);
    tag.position.set(0, 0.55, 0);
    mesh.add(tag);
    if (d.equipped) ZS.setRemoteHandItem(mesh, d.equipped);
    if (ZS._fpsArms) ZS._fpsArms.visible = false;
    _localDeathCorpse = mesh;
  }

  function _hideLocalDeathCorpse() {
    if (_localDeathCorpse && _scene) {
      _scene.remove(_localDeathCorpse);
      _localDeathCorpse = null;
    }
    if (ZS._fpsArms) ZS._fpsArms.visible = true;
  }

  function _addSleepingBody(s) {
    const playerId = Number(s.playerId);
    if (!playerId || !_scene) return;
    _removeSleepingBody(playerId);
    const mesh = ZS.createPlayerModel();
    const groundY = _groundYAt(s.x, s.z, s.y);
    mesh.position.set(s.x, groundY, s.z);
    mesh.rotation.y = s.rotY || 0;
    ZS.applySleepPose?.(mesh);
    mesh.userData.username = s.username;
    mesh.userData.sleeping = true;
    _scene.add(mesh);
    const tag = _makeNameTag(`💤 ${s.username || ''}`);
    tag.position.set(0, 0.55, 0);
    mesh.userData.nameTag = tag;
    mesh.add(tag);
    if (s.equipped) ZS.setRemoteHandItem(mesh, s.equipped);
    sleepingBodies.set(playerId, {
      mesh,
      playerId,
      username: s.username,
      x: s.x,
      z: s.z,
    });
  }

  function _removeSleepingBody(playerId) {
    const entry = sleepingBodies.get(Number(playerId));
    if (!entry) return;
    _scene.remove(entry.mesh);
    sleepingBodies.delete(Number(playerId));
  }

  function findNearestSleeping(px, pz, maxDist) {
    let best = null;
    let bestD = maxDist;
    sleepingBodies.forEach((body) => {
      const d = Math.hypot(body.x - px, body.z - pz);
      if (d < bestD) { bestD = d; best = body; }
    });
    return best;
  }

  /** Corps endormi ou mort au sol — le plus proche dans le rayon. */
  function findNearestLootable(px, pz, maxDist) {
    let best = null;
    let bestD = maxDist;
    const consider = (body) => {
      if (!body?.playerId) return;
      const d = Math.hypot(body.x - px, body.z - pz);
      if (d < bestD) { bestD = d; best = body; }
    };
    sleepingBodies.forEach(consider);
    deathCorpses.forEach(consider);
    return best;
  }

  function _makeNameTag(username) {
    const canvas = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((username || '').substring(0, 14), 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.userData.isNameTag = true;
    sprite.scale.set(1.6, 0.4, 1);
    sprite.position.set(0, 2.55, 0); // above head
    return sprite;
  }

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
        ZS.Inventory?.loadFromSave?.(res.inventory);
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

  function requestCampfireCook(decorId, cb) {
    if (!_socket || !decorId) return;
    _socket.emit('campfire-cook', { decorId }, (res) => {
      if (res?.ok) ZS.UI?.showNotif?.('Viande cuite au feu');
      else ZS.UI?.showNotif?.(res?.error || 'Cuisson impossible');
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

  function _getDecorRoot(id) {
    return decorItems.get(id)?.root || null;
  }

  function _getDecorData(id) {
    return decorItems.get(id)?.data || null;
  }

  function _getDecorEntry(id) {
    return decorItems.get(id) || null;
  }

  function _forEachDecor(fn) {
    decorItems.forEach((entry, id) => { fn(entry, id); });
  }

  window.ZS = window.ZS || {};
  ZS.Network = {
    preconnect, init, tick, getLocalXZ, sendMove, sendShoot, sendRespawn, sendDied, sendSurvival, sendEquip, sendAttack, sendFootstep,
    notifyDecorChop, notifyDecorMine, requestDecorDoorToggle, requestDecorDoorLock, requestDecorDoorUnlock,
    getLocalUsername, syncWorldColliders: _syncWorldColliders,
    findNearestSleeping,
    findNearestLootable,
    getSocket: () => _socket,
    isSpawnReady: () => _spawnReady,
    requestStorageOpen, requestStorageClose, requestStorageDeposit, requestStorageWithdraw, requestStorageMove,
    requestStorageTakeAll,
    notifyIntroReadable,
    requestStorageHit, requestStoragePickup,
    requestUseItem, requestInvDebugSnapshot, requestCraftQueue, requestCraftCancel,
    requestBuildHit,
    requestCampfireCook,
    requestCampRest,
    getDecorRoot: _getDecorRoot,
    getDecorData: _getDecorData,
    getDecorEntry: _getDecorEntry,
    forEachDecor: _forEachDecor,
    patchDecorFloorHeight: _patchDecorFloorHeight,
    syncDecorFloorHeight,
    resolveRemotePlayerCollision,
  };
}());
