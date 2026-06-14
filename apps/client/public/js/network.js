// Socket.io client — multiplayer sync (généré — éditer network/chunks/*.js puis npm run bundle:network)
(function () {
  'use strict';

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
  let _disconnectUiTimer = null;
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
  let _decorBatchDepth = 0;
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

function _spawnDecorItem(d, spawnOpts = {}) {
    if (!d?.id || !_scene) return Promise.resolve(null);
    // Glissières posées localement au build RN (road_network + barrier_prefabs).
    if (d.prefabId?.startsWith('road_barrier_')) return Promise.resolve(null);
    if (_isFelledTreeDecor(d)) return Promise.resolve(null);
    if (_isTreeInTrailCorridor(d)) return Promise.resolve(null);
    const pk = String(d.placementKey || '');
    if (pk.startsWith('s01:hub:') || pk.startsWith('s01:camp:')) return Promise.resolve(null);
    if (decorItems.has(d.id)) _removeDecorItem(d.id);
    const isPrefab = d.kind === 'prefab' || (d.prefabId && !d.type);
    const isBuildWood = d.prefabId?.startsWith('build_') && d.prefabId.endsWith('_wood');
    const commonOpts = {
      decorId: d.id,
      rotY: Number.isFinite(d.rotY) ? d.rotY : 0,
      rotZ: d.rotZ || 0,
      scale: Number.isFinite(d.scale) ? d.scale : 1,
      grounded: d.grounded === false ? false : !d.prefabId?.startsWith('wreck_'),
      collide: d.collide !== false,
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
      fastGround: !!spawnOpts.fastGround,
    };
    if (d.prefabId?.startsWith('build_') && d.prefabId.endsWith('_wood')) {
      if (!Number.isFinite(commonOpts.buildDamage)) commonOpts.buildDamage = 0;
      if (!Number.isFinite(commonOpts.buildMaxHp)) commonOpts.buildMaxHp = 100;
      d.buildDamage = commonOpts.buildDamage;
      d.buildMaxHp = commonOpts.buildMaxHp;
    }
    if (d.grounded === false && Number.isFinite(d.y)) {
      commonOpts.baseY = d.y;
      commonOpts.grounded = false;
    }
    const placementKey = d.placementKey ? String(d.placementKey) : '';
    if (placementKey.startsWith('s01:') && Number.isFinite(d.x) && Number.isFinite(d.z)) {
      const rotY = Number.isFinite(d.rotY) ? d.rotY : 0;
      const needsPreciseGround = d.shackAnchor
        || d.prefabId === 'building_survivor_shack'
        || !spawnOpts.fastGround;
      if (needsPreciseGround && d.shackAnchor && ZS.sampleShackPadHeight && Number.isFinite(d.shackFloorY)) {
        const a = d.shackAnchor;
        commonOpts.baseY = ZS.sampleShackPadHeight(a.x, a.z, a.rotY || 0) + d.shackFloorY;
        commonOpts.grounded = true;
      } else if (needsPreciseGround) {
        const gy = d.prefabId === 'building_survivor_shack' && ZS.sampleShackPadHeight
          ? ZS.sampleShackPadHeight(d.x, d.z, rotY)
          : (ZS.getDecorGroundHeight
            ? ZS.getDecorGroundHeight(d.x, d.z)
            : (ZS.getTerrainHeight ? ZS.getTerrainHeight(d.x, d.z) : 0));
        commonOpts.baseY = gy;
        commonOpts.grounded = true;
      } else if (Number.isFinite(d.y)) {
        commonOpts.baseY = d.y;
        commonOpts.grounded = true;
      } else {
        commonOpts.baseY = ZS.getTerrainHeight ? ZS.getTerrainHeight(d.x, d.z) : 0;
        commonOpts.grounded = true;
      }
    }
    const onRoot = (root) => {
      if (!root) return;
      root.userData.decorId = d.id;
      if (spawnOpts.fastGround) root.userData.fastGroundSpawn = true;
      if (root.userData.simpleLod) {
        if (_decorBatchDepth === 0) {
          _adjustLodPendingCached(1);
          _markLodQueueDirty();
        }
        const px = _state?.player?.x ?? d.x;
        const pz = _state?.player?.z ?? d.z;
        const tx = Number.isFinite(d.x) ? d.x : root.position.x;
        const tz = Number.isFinite(d.z) ? d.z : root.position.z;
        const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
        if (d2 <= TREE_LOD_MID_R2) {
          const ring = d2 <= TREE_LOD_URGENT_R2 ? 'urgent' : 'mid';
          ZS.Engine?.LodGapMonitor?.notifySimpleLodSpawn?.(tx, tz, d.id, {
            ring,
            simpleLodUrgent: _lodUrgentPendingCount(px, pz),
            simpleLodMid: _lodMidRingPendingCount(px, pz),
          });
        }
      } else if (_decorBatchDepth === 0) {
        _markLodQueueDirty();
      }
      decorItems.set(d.id, { root, data: d });
      ZS.Engine?.DecorGapMonitor?.notifySpawn?.(
        Number.isFinite(d.x) ? d.x : root.position.x,
        Number.isFinite(d.z) ? d.z : root.position.z,
        d.id,
      );
      if (_decorBatchDepth === 0) _invalidateDecorVisRing();
      if (!_isPinnedDecor(d, d.id)) {
        const px = _state?.player?.x ?? d.x;
        const pz = _state?.player?.z ?? d.z;
        const tx = Number.isFinite(d.x) ? d.x : root.position.x;
        const tz = Number.isFinite(d.z) ? d.z : root.position.z;
        if (_initVisReveal.active) {
          root.visible = false;
        } else {
          const dx = tx - px;
          const dz = tz - pz;
          const visR2 = _effectiveDecorVisR2();
          root.visible = (dx * dx + dz * dz) <= visR2;
        }
      }
      if (d.prefabId === 'spawn_beach_campfire_ring') {
        ZS.BeachIntroPrefabs?.syncIntroCampfireTorchVisibility?.();
      }
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

function _gameInitDecorRadius() {
    return ZS._isMobile ? 220 : 320;
  }

  function _decorSpawnMargin() {
    return ZS._isMobile ? 85 : 120;
  }

  function _decorSpawnRadius() {
    const vis = ZS.Options?.getProfile?.()?.decorVisRadius ?? 140;
    return vis + _decorSpawnMargin();
  }

  function _decorSpawnRadius2() {
    const r = _decorSpawnRadius();
    return r * r;
  }

  function _deferTreeRadius() {
    return _gameInitDecorRadius();
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

  /** Décor reçu en game-init mais pas encore instancié (hors rayon visibilité). */
  const _decorDeferLegacy = { pending: [] };
  function _decorDeferArray() {
    const loader = ZS.Engine?.ContentLoader;
    if (loader) return loader.getDecorPending();
    return _decorDeferLegacy.pending;
  }
  const _decorSpawnDefer = {
    get pending() { return _decorDeferArray(); },
  };

  /** Ancrage streaming arbres/props — recentré quand le joueur s'éloigne. */
  const _decorStream = {
    anchorX: null, anchorZ: null, lastX: null, lastZ: null, fetchX: null, fetchZ: null,
  };
  const STREAM_RECENTER_R = 160;
  const STREAM_MOVE_R = 100;
  const STREAM_FETCH_RESET_R = 80;

  function _resetDecorStream() {
    _decorStream.anchorX = null;
    _decorStream.anchorZ = null;
    _decorStream.lastX = null;
    _decorStream.lastZ = null;
    _decorStream.fetchX = null;
    _decorStream.fetchZ = null;
  }

  /** Pagination API : offset invalide si le joueur a bougé (liste triée par position). */
  function _resetFetchOffsetIfMoved(px, pz) {
    if (_decorStream.fetchX == null) {
      _decorStream.fetchX = px;
      _decorStream.fetchZ = pz;
      return false;
    }
    const dx = px - _decorStream.fetchX;
    const dz = pz - _decorStream.fetchZ;
    if (dx * dx + dz * dz < STREAM_FETCH_RESET_R * STREAM_FETCH_RESET_R) return false;
    _decorStream.fetchX = px;
    _decorStream.fetchZ = pz;
    return true;
  }

  function _maybeRecenterDecorStream(px, pz) {
    if (_decorStream.anchorX == null) {
      _decorStream.anchorX = px;
      _decorStream.anchorZ = pz;
      _decorStream.lastX = px;
      _decorStream.lastZ = pz;
      return;
    }
    const mdx = px - _decorStream.lastX;
    const mdz = pz - _decorStream.lastZ;
    if (mdx * mdx + mdz * mdz >= STREAM_MOVE_R * STREAM_MOVE_R) {
      _decorStream.lastX = px;
      _decorStream.lastZ = pz;
    }
    const sdx = px - _decorStream.anchorX;
    const sdz = pz - _decorStream.anchorZ;
    if (sdx * sdx + sdz * sdz < STREAM_RECENTER_R * STREAM_RECENTER_R) return;
    const jump2 = sdx * sdx + sdz * sdz;
    const isTeleport = jump2 > 100 * 100;
    _decorStream.anchorX = px;
    _decorStream.anchorZ = pz;
    _treeDefer.offset = 0;
    _treeDefer.hasMore = true;
    _treeDefer.sx = px;
    _treeDefer.sz = pz;
    _propDefer.offset = 0;
    _propDefer.hasMore = true;
    _propDefer.sx = px;
    _propDefer.sz = pz;
    _nearStream.offset = 0;
    _nearStream.hasMore = true;
    _nearStream.softStartAt = performance.now();
    const nearPending = ZS.Engine?.ContentLoader?.pendingNearPlayer?.(px, pz)?.total ?? 0;
    const pauseMs = isTeleport ? 5000
      : (nearPending >= 24 ? 900 : (_decorSpawnDefer.pending.length > 280 ? 3500 : 2000));
    _nearStream.recenterUntil = performance.now() + pauseMs;
    const dropped = _pruneDecorDeferFarFrom(px, pz);
    ZS.LoadLog?.post?.('decor-stream-recenter', {
      x: Math.round(px),
      z: Math.round(pz),
      teleport: isTeleport,
      droppedDefer: dropped,
      pauseMs,
      nearPending,
    });
  }

  function _updateExplorationBoost(px, pz) {
    const evalBoost = ZS.Engine?.ContentLoader?.evaluateExplorationBoost?.(px, pz, { minTotal: 15 });
    if (!evalBoost) return _explorationBoostActive();
    const now = performance.now();
    if (evalBoost.active) {
      _explorationBoostUntil = Math.max(_explorationBoostUntil, now + (evalBoost.durationMs ?? 10_000));
      if (evalBoost.total >= 30 && now - _lastExplorationBoostLogAt > 4000) {
        _lastExplorationBoostLogAt = now;
        ZS.LoadLog?.post?.('exploration-defer-boost', {
          critical: evalBoost.critical,
          near: evalBoost.near,
          total: evalBoost.total,
          pending: evalBoost.pending,
        });
      }
    }
    return _explorationBoostActive();
  }

  function _explorationBoostActive() {
    return performance.now() < _explorationBoostUntil;
  }

  function _updateApproachPrefetch(px, pz, vx, vz) {
    const evalPrefetch = ZS.Engine?.ContentLoader?.evaluateApproachPrefetch?.(px, pz, vx, vz);
    const now = performance.now();
    const speed2 = vx * vx + vz * vz;
    if (evalPrefetch?.active) {
      _approachPrefetchUntil = Math.max(_approachPrefetchUntil, now + (evalPrefetch.durationMs ?? 6000));
      if (now - _lastApproachPrefetchLogAt > 5000) {
        _lastApproachPrefetchLogAt = now;
        ZS.LoadLog?.post?.('approach-prefetch', {
          speed: Math.round((evalPrefetch.speed ?? 0) * 10) / 10,
          ahead: evalPrefetch.ahead?.total ?? 0,
          lead: Math.round(evalPrefetch.dist ?? 0),
          pending: evalPrefetch.pending,
        });
      }
    } else if (speed2 > 2.5 * 2.5) {
      _approachPrefetchUntil = Math.max(_approachPrefetchUntil, now + 3500);
    }
    return _approachPrefetchActive();
  }

  function _updateCriticalSurge(px, pz, vx, vz) {
    const evalSurge = ZS.Engine?.ContentLoader?.evaluateCriticalSurge?.(px, pz, vx, vz);
    if (!evalSurge) return _criticalSurgeActive();
    const now = performance.now();
    if (evalSurge.active) {
      _criticalSurgeUntil = Math.max(_criticalSurgeUntil, now + (evalSurge.durationMs ?? 12_000));
      if ((evalSurge.nearNow?.critical >= 24 || evalSurge.nearNow?.near >= 22)
        && now - _lastCriticalSurgeLogAt > 4000) {
        _lastCriticalSurgeLogAt = now;
        ZS.LoadLog?.post?.('critical-surge', {
          critical: evalSurge.nearNow?.critical ?? 0,
          near: evalSurge.nearNow?.near ?? 0,
          aheadCritical: evalSurge.ahead?.critical ?? 0,
          aheadTotal: evalSurge.ahead?.total ?? 0,
          speed: Math.round((evalSurge.speed ?? 0) * 10) / 10,
          pending: evalSurge.pending,
        });
      }
    }
    return _criticalSurgeActive();
  }

  function _criticalSurgeActive() {
    return performance.now() < _criticalSurgeUntil;
  }

  /** Beaucoup de simpleLod visibles → priorité upgrades textures finales. */
  function _updateLodTextureSurge(px, pz) {
    const urgent = _lodUrgentPendingCount(px, pz);
    const mid = _lodMidRingPendingCount(px, pz);
    const now = performance.now();
    const active = urgent >= 4 || mid >= 16 || (urgent >= 2 && mid >= 8);
    if (active) {
      _lodTextureSurgeUntil = Math.max(_lodTextureSurgeUntil, now + 14_000);
      if (now - _lastLodTextureSurgeLogAt > 4000) {
        _lastLodTextureSurgeLogAt = now;
        ZS.LoadLog?.post?.('lod-texture-surge', {
          urgent, mid, near: _lodNearPendingCount(px, pz),
          total: _lodPendingCount(),
        });
      }
    }
    return _lodTextureSurgeActive();
  }

  function _lodTextureSurgeActive() {
    return performance.now() < _lodTextureSurgeUntil;
  }

  function _approachPrefetchActive() {
    return performance.now() < _approachPrefetchUntil;
  }

  function _streamFetchPoint(px, pz, vx, vz) {
    const lead = ZS.Engine?.ContentLoader?.computeLeadAnchor?.(px, pz, vx, vz);
    if (!lead?.active) return { fx: px, fz: pz, extraR: 0 };
    return {
      fx: px + (lead.lx - px) * 0.55,
      fz: pz + (lead.lz - pz) * 0.55,
      extraR: Math.min(Math.round(lead.dist * 0.45), 72),
    };
  }

  /** Fetch décor dans un disque autour du joueur (exploration). */
  const STREAM_SOFT_MS = 12000;
  const STREAM_SOFT_EXTEND_MS = 6000;
  const POST_REVEAL_SPAWN_SOFT_MS = 15000;
  const LOD_STREAM_PAUSE = 680;
  const LOD_MID_STREAM_PAUSE = 105;
  const LOD_MID_BACKLOG_HIGH = 175;
  const LOD_MID_BOOT_PAUSE = 200;
  const LOD_MID_BOOT_HIGH = 280;
  const LOD_MID_SECTOR_PAUSE = 125;
  const LOD_MID_SECTOR_HIGH = 215;
  const DEFER_STREAM_PAUSE = 420;
  const DEFER_STREAM_RESUME = 380;
  const SECTOR_DECOR_COOLDOWN_MS = 8000;
  const POST_SECTOR_DRAIN_SOFT_MS = 8000;
  const LOD_URGENT_PRESSURE = 40;
  const LOD_URGENT_SPAWN_PAUSE = 80;
  let _postSectorDrainUntil = 0;
  let _streamSoftExtraUntil = 0;
  let _lastBacklogPlan = null;
  const _streamGate = { reason: '', since: 0 };
  let _lastDeferCapLogAt = 0;
  let _lastDeferCapVal = -1;
  let _explorationBoostUntil = 0;
  let _lastExplorationBoostLogAt = 0;
  let _approachPrefetchUntil = 0;
  let _lastApproachPrefetchLogAt = 0;
  let _criticalSurgeUntil = 0;
  let _lastCriticalSurgeLogAt = 0;
  let _lodTextureSurgeUntil = 0;
  let _lastLodTextureSurgeLogAt = 0;
  const _nearStream = {
    active: false,
    loading: false,
    offset: 0,
    hasMore: true,
    fetchAcc: 0,
    softStartAt: 0,
    recenterUntil: 0,
  };

  function _syncDeferGatePaused(deferN) {
    return ZS.BacklogScheduler?.syncDeferGate(deferN) ?? (deferN > DEFER_STREAM_PAUSE);
  }

  function _deferForcedDrain(deferN, lodMid, lodNear) {
    return ZS.BacklogScheduler?.deferForced(deferN, lodMid, lodNear, _inBootGrace()) ?? false;
  }

  function _buildBacklogPlan(px, pz) {
    const deferN = _decorSpawnDefer.pending.length;
    const lodMid = _lodMidRingPendingCount(px, pz);
    const lodNear = _lodNearPendingCount(px, pz);
    const lodTotal = _lodPendingCount();
    const fpsStats = ZS.PerfMonitor?.getStats?.() ?? {};
    const deferForced = _deferForcedDrain(deferN, lodMid, lodNear);
    const nearCounts = ZS.Engine?.ContentLoader?.pendingNearPlayer?.(px, pz) ?? {};
    const ctx = {
      deferPending: deferN,
      lodTotalPending: lodTotal,
      lodNearPending: lodNear,
      lodMidPending: lodMid,
      lodUrgentPending: _lodUrgentPendingCount(px, pz),
      pendingCritical: nearCounts.critical ?? 0,
      pendingNearRing: nearCounts.near ?? 0,
      streamActive: _nearStream.active,
      initVisActive: _initVisRevealBusy(),
      initVisDeferBlocked: _initVisRevealDeferBlocked(),
      roadsBusy: !!ZS._roadsPostSpawnBusy,
      sectorDecorBusy: !!ZS._sectorDecorBusy,
      sectorCooldown: _sectorDecorCooldown(),
      postSectorDrain: _inPostSectorDrainSoft(),
      streamSoft: _inStreamSoftStart(),
      bootGrace: _inBootGrace(),
      recenterUntil: (_nearStream.recenterUntil > 0 && performance.now() < _nearStream.recenterUntil) ? 1 : 0,
      recenterActive: _nearStream.recenterUntil > 0 && performance.now() < _nearStream.recenterUntil,
      postSpawnVisualBusy: _postSpawnVisualBusy(),
      frameRecovering: !!ZS.isFrameRecovering?.(),
      deferForced,
      isMobile: !!ZS._isMobile,
      fps: fpsStats.fps ?? null,
      approachPrefetch: _approachPrefetchActive(),
      explorationBoost: _explorationBoostActive(),
      criticalSurge: _criticalSurgeActive(),
      lodTextureSurge: _lodTextureSurgeActive(),
      decorGapActive: !!ZS.Engine?.DecorGapMonitor?.hasActiveGap?.(),
      decorGapEmergency: !!ZS.Engine?.DecorGapMonitor?.hasEmergencyGap?.(),
      lodGapActive: !!ZS.Engine?.LodGapMonitor?.hasActiveGap?.(),
    };
    _lastBacklogPlan = ZS.Engine?.DecorPressure?.evaluate(ctx)
      ?? ZS.BacklogScheduler?.evaluate(ctx)
      ?? null;
    if (_lastBacklogPlan) {
      ZS._backlogPlan = _lastBacklogPlan;
      ZS._roadBuildBudgetMs = _lastBacklogPlan.quotas.roadBudgetMs;
      if (!ZS.Engine?.DecorPressure) {
        ZS.Engine?.Telemetry?.postBacklogSnapshot?.(_lastBacklogPlan);
      }
    }
    return _lastBacklogPlan;
  }

  function _lodMidStreamThresholds() {
    const phase = _lastBacklogPlan?.phase;
    if (phase && ZS.BacklogScheduler?.LOD_MID) {
      if (phase === 'sector-build' || phase === 'sector-drain') return ZS.BacklogScheduler.LOD_MID.sector;
      if (phase === 'boot' || phase === 'stream-soft') return ZS.BacklogScheduler.LOD_MID.boot;
      return ZS.BacklogScheduler.LOD_MID.normal;
    }
    if (_isSectorLoadBusy()) {
      return { pause: LOD_MID_SECTOR_PAUSE, high: LOD_MID_SECTOR_HIGH };
    }
    if (_inBootGrace()) {
      return { pause: LOD_MID_BOOT_PAUSE, high: LOD_MID_BOOT_HIGH };
    }
    return { pause: LOD_MID_STREAM_PAUSE, high: LOD_MID_BACKLOG_HIGH };
  }

  function _inStreamSoftStart() {
    const now = performance.now();
    if (_nearStream.active && _nearStream.softStartAt > 0
      && now - _nearStream.softStartAt < STREAM_SOFT_MS) return true;
    return _streamSoftExtraUntil > now;
  }

  function _maybeExtendStreamSoft() {
    if (!_nearStream.active || !_nearStream.softStartAt) return;
    const now = performance.now();
    if (now - _nearStream.softStartAt < STREAM_SOFT_MS) return;
    if (_streamSoftExtraUntil > now) return;
    const deferN = _decorSpawnDefer.pending.length;
    const lp = getLocalXZ();
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const th = _lodMidStreamThresholds();
    if (deferN <= 180 && lodMid <= th.pause * 0.88) return;
    if (deferN > 200) return;
    if (deferN > 300 && lodMid === 0) return;
    if (_lodNearPendingCount(lp.x, lp.z) > 160 && deferN > 80) return;
    _streamSoftExtraUntil = now + STREAM_SOFT_EXTEND_MS;
    ZS.LoadLog?.post?.('stream-soft-extend', {
      ms: STREAM_SOFT_EXTEND_MS,
      defer: deferN,
      lodMid,
    });
  }

  function _isSectorLoadBusy() {
    return _sectorDecorCooldown() || _inPostSectorDrainSoft() || !!ZS._sectorDecorBusy;
  }

  function _inPostRevealSpawnSoft() {
    return _postRevealSpawnUntil > 0 && performance.now() < _postRevealSpawnUntil;
  }

  function _sectorDecorCooldown() {
    const until = ZS._sectorDecorCooldownUntil || 0;
    return until > 0 && performance.now() < until;
  }

  function _inPostSectorDrainSoft() {
    return _postSectorDrainUntil > 0 && performance.now() < _postSectorDrainUntil;
  }

  function _markSectorDecorCooldown() {
    const now = performance.now();
    const lp = getLocalXZ();
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const th = _lodMidStreamThresholds();
    let drainMs = POST_SECTOR_DRAIN_SOFT_MS;
    if (lodMid > th.pause) drainMs += 4000;
    else if (lodMid > th.pause * 0.65) drainMs += 2000;
    ZS._sectorDecorCooldownUntil = now + SECTOR_DECOR_COOLDOWN_MS;
    _postSectorDrainUntil = ZS._sectorDecorCooldownUntil + drainMs;
    ZS.LoadLog?.post?.('sector-decor-cooldown', {
      ms: SECTOR_DECOR_COOLDOWN_MS,
      drainSoftMs: drainMs,
      lodMid,
    });
  }

  function _streamGateContext() {
    const lp = getLocalXZ();
    const lodTotal = _lodPendingCount();
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const lodNear = _lodNearPendingCount(lp.x, lp.z);
    const plan = _lastBacklogPlan;
    return {
      defer: _decorSpawnDefer.pending.length,
      lod: lodTotal,
      lodNear,
      lodMid,
      lodMidTh: plan?.th ?? _lodMidStreamThresholds(),
      urgent: _lodUrgentPendingCount(lp.x, lp.z),
      phase: plan?.phase ?? null,
      priority: plan?.priority ?? null,
    };
  }

  function _setStreamGate(reason, ctx) {
    const r = reason || '';
    if (_streamGate.reason === r) return;
    const now = performance.now();
    const base = ctx || _streamGateContext();
    const pauseReasons = { 'drain-first': 1, 'spawn-only': 1 };
    if (_streamGate.reason && pauseReasons[_streamGate.reason]) {
      ZS.Engine?.DecorGapMonitor?.notifyStreamResumed?.();
    }
    if (_streamGate.reason && !r) {
      ZS.LoadLog?.post?.('stream-gate-clear', {
        prev: _streamGate.reason,
        blockedMs: Math.round(now - _streamGate.since),
        ...base,
      });
    } else if (r) {
      ZS.LoadLog?.post?.('stream-gate', { reason: r, ...base });
    }
    if (r && pauseReasons[r]) {
      const lp = getLocalXZ();
      ZS.Engine?.DecorGapMonitor?.notifyStreamPaused?.(r, {
        x: Math.round(lp.x), z: Math.round(lp.z),
        pending: base.defer ?? _decorSpawnDefer.pending.length,
        activeGap: !!ZS.Engine?.DecorGapMonitor?.hasActiveGap?.(),
        lodGapActive: !!ZS.Engine?.LodGapMonitor?.hasActiveGap?.(),
      });
    }
    _streamGate.reason = r;
    _streamGate.since = r ? now : 0;
  }

  function _streamGateBlockReason(px, pz) {
    const plan = _lastBacklogPlan || _buildBacklogPlan(px, pz);
    if (!plan) {
      if (!_nearStream.active) return 'inactive';
      return '';
    }
    const gov = ZS.Engine?.BudgetGovernor;
    if (gov?.canWork?.('stream', plan)) return '';
    return plan.reasons?.stream || 'backlog';
  }

  function _maybeLogDeferCap(maxSpawn, deferPending, lodNear) {
    if (maxSpawn > 5 || !ZS.LoadLog?.isEnabled?.()) return;
    const now = performance.now();
    if (maxSpawn === _lastDeferCapVal && now - _lastDeferCapLogAt < 8000) return;
    _lastDeferCapLogAt = now;
    _lastDeferCapVal = maxSpawn;
    ZS.LoadLog.post('defer-cap', {
      maxSpawn,
      deferPending,
      lodNear,
      lodTotal: _lodPendingCount(),
      lodMid: _lodMidRingPendingCount(getLocalXZ().x, getLocalXZ().z),
      sectorCooldown: _sectorDecorCooldown(),
      postDrain: _inPostSectorDrainSoft(),
      postRevealSoft: _inPostRevealSpawnSoft(),
    });
  }

  function _streamFetchLimit(lodMidN, decorN, deferN, th) {
    const deferPending = deferN ?? _decorSpawnDefer.pending.length;
    const gates = th || _lodMidStreamThresholds();
    if (_inStreamSoftStart()) {
      return ZS._isMobile ? 12 : 20;
    }
    if (_inPostSectorDrainSoft()) {
      if (deferPending > 150) return ZS._isMobile ? 6 : 10;
      return ZS._isMobile ? 8 : 12;
    }
    if (lodMidN > gates.pause) return ZS._isMobile ? 4 : 8;
    if (deferPending > 300) return ZS._isMobile ? 8 : 12;
    if (deferPending > 150) return ZS._isMobile ? 12 : 20;
    let limit = ZS._isMobile ? 80 : 120;
    if (lodMidN > gates.pause * 0.65) limit = ZS._isMobile ? 24 : 36;
    else if (decorN > 2000) limit = ZS._isMobile ? 32 : 48;
    else if (decorN > 1400) limit = ZS._isMobile ? 48 : 72;
    return limit;
  }

  function _resetNearStream() {
    _nearStream.active = false;
    _nearStream.loading = false;
    _nearStream.offset = 0;
    _nearStream.hasMore = true;
    _nearStream.fetchAcc = 0;
    _nearStream.softStartAt = 0;
    _nearStream.recenterUntil = 0;
    _streamSoftExtraUntil = 0;
  }

  function _pruneDecorDeferFarFrom(px, pz) {
    const pending = _decorSpawnDefer.pending;
    if (!pending.length) return 0;
    const th = _lodMidStreamThresholds();
    const lodMid = _lodMidRingPendingCount(px, pz);
    let margin = 96;
    if (lodMid > th.high) margin = 24;
    else if (lodMid > th.pause) margin = 48;
    const minKeepR = 416;
    const keepR = Math.max(_nearStreamRadius() + margin, minKeepR);
    const keepR2 = keepR * keepR;
    const maxDrop = 80;
    const isP0 = ZS.Engine?.isP0GameplayDecor;
    const keep = [];
    const dropCandidates = [];
    for (let i = 0; i < pending.length; i++) {
      const d = pending[i];
      if (isP0?.(d)) {
        keep.push(d);
        continue;
      }
      const tx = Number.isFinite(d.x) ? d.x : px;
      const tz = Number.isFinite(d.z) ? d.z : pz;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 <= keepR2) keep.push(d);
      else dropCandidates.push({ d, d2 });
    }
    dropCandidates.sort((a, b) => b.d2 - a.d2);
    const dropN = Math.min(maxDrop, dropCandidates.length);
    for (let i = dropN; i < dropCandidates.length; i++) {
      keep.push(dropCandidates[i].d);
    }
    const dropped = pending.length - keep.length;
    pending.length = 0;
    pending.push(...keep);
    return dropped;
  }

  function _nearStreamRadius() {
    return _gameInitDecorRadius() + _decorSpawnMargin() + 48;
  }

  function _beginNearStream(sx, sz) {
    _resetNearStream();
    _nearStream.active = true;
    _nearStream.softStartAt = performance.now();
    _decorStream.anchorX = sx;
    _decorStream.anchorZ = sz;
    _decorStream.lastX = sx;
    _decorStream.lastZ = sz;
    _decorStream.fetchX = sx;
    _decorStream.fetchZ = sz;
    ZS.LoadLog?.post?.('decor-stream-start', {
      x: Math.round(sx),
      z: Math.round(sz),
      r: _nearStreamRadius(),
      softMs: STREAM_SOFT_MS,
    });
  }

  async function _fetchDecorStreamNearBatch(px, pz, vx, vz) {
    if (_nearStream.loading || !_nearStream.hasMore) return;
    const plan = _lastBacklogPlan || _buildBacklogPlan(px, pz);
    if (!plan?.allow.stream) return;
    _nearStream.loading = true;
    if (_resetFetchOffsetIfMoved(px, pz)) _nearStream.offset = 0;
    const fetchPt = _streamFetchPoint(px, pz, vx ?? 0, vz ?? 0);
    const r = _nearStreamRadius() + (fetchPt.extraR || 0);
    const decorN = decorItems.size;
    const lodMid = plan.pressure.lodMid;
    const deferN = plan.pressure.defer;
    const th = plan.th;
    const limit = _streamFetchLimit(lodMid, decorN, deferN, th);
    try {
      const res = await fetch(
        `/api/world/decor-stream?x=${encodeURIComponent(fetchPt.fx)}&z=${encodeURIComponent(fetchPt.fz)}`
        + `&r=${r}&limit=${limit}&offset=${_nearStream.offset}`,
      );
      if (res.status === 404) {
        _nearStream.hasMore = false;
        return;
      }
      if (!res.ok) {
        _nearStream.hasMore = false;
        return;
      }
      const json = await res.json();
      if (ZS.Engine?.DecorGapMonitor?.hasActiveGap?.()
          || ZS.Engine?.LodGapMonitor?.hasActiveGap?.()) {
        return;
      }
      let queued = 0;
      const queueCap = plan.quotas.streamQueueCap;
      for (const d of (json.items || [])) {
        if (!d?.id || _deferQueueHas(d.id)) continue;
        if (queued >= queueCap) break;
        _decorSpawnDefer.pending.push(d);
        queued++;
      }
      _nearStream.offset = json.nextOffset ?? (_nearStream.offset + (json.items?.length || 0));
      _nearStream.hasMore = !!json.hasMore;
      if (queued > 0 || !json.hasMore) {
        ZS.Engine?.DecorGapMonitor?.notifyStreamQueued?.(queued, fetchPt.fx, fetchPt.fz, {
          pending: _decorSpawnDefer.pending.length,
          lead: fetchPt.extraR > 0,
          r,
        });
        ZS.LoadLog?.post?.('decor-stream-fetch', {
          queued,
          pending: _decorSpawnDefer.pending.length,
          offset: _nearStream.offset,
          total: json.total,
          hasMore: _nearStream.hasMore,
          lead: fetchPt.extraR > 0,
          r,
        });
      }
    } catch (e) {
      console.warn('[sync] decor-stream', e);
    } finally {
      _nearStream.loading = false;
    }
  }

  function _tickDecorStreamFetch(px, pz, dt, vx, vz) {
    const loader = ZS.Engine?.ContentLoader;
    const activeGap = !!ZS.Engine?.DecorGapMonitor?.hasActiveGap?.();
    const lodGapActive = !!ZS.Engine?.LodGapMonitor?.hasActiveGap?.();
    if (loader?.shouldDeferStreamFetch?.(px, pz)) {
      _setStreamGate('drain-first', { defer: _decorSpawnDefer.pending.length, lod: _lodPendingCount() });
      return;
    }
    if (loader?.shouldPauseStreamFetch?.(px, pz, vx ?? 0, vz ?? 0, { activeGap, lodGapActive })) {
      _setStreamGate('spawn-only', { defer: _decorSpawnDefer.pending.length, lod: _lodPendingCount() });
      return;
    }
    const block = _streamGateBlockReason(px, pz);
    if (block) {
      _setStreamGate(block, { defer: _decorSpawnDefer.pending.length, lod: _lodPendingCount(), lodMid: _lodMidRingPendingCount(px, pz) });
      return;
    }
    _setStreamGate('');
    const lodMid = _lodMidRingPendingCount(px, pz);
    const deferN = _decorSpawnDefer.pending.length;
    const th = _lodMidStreamThresholds();
    _maybeRecenterDecorStream(px, pz);
    _nearStream.fetchAcc += dt;
    const moving = (vx * vx + vz * vz) > 1.44;
    const prefetch = _approachPrefetchActive();
    const surge = _criticalSurgeActive();
    const pendingLow = deferN < (prefetch || surge ? 8 : (_inStreamSoftStart() ? 24 : 56));
    const decorN = decorItems.size;
    let fetchInterval = decorN > 2000 ? 0.38 : decorN > 1400 ? 0.28 : 0.22;
    if (moving || prefetch || surge) fetchInterval = Math.min(fetchInterval, surge ? 0.10 : (prefetch ? 0.12 : 0.16));
    if (_inStreamSoftStart()) fetchInterval = Math.max(fetchInterval, prefetch ? 0.18 : 0.45);
    if (_inPostSectorDrainSoft()) fetchInterval = Math.max(fetchInterval, 0.78);
    if (lodMid > th.pause * 0.65) fetchInterval = Math.max(fetchInterval, 0.42);
    if (lodMid > th.pause * 0.9) fetchInterval = 0.58;
    if (deferN > 250) fetchInterval = Math.max(fetchInterval, 0.72);
    else if (deferN > 120) fetchInterval = Math.max(fetchInterval, 0.55);
    const due = _nearStream.fetchAcc >= fetchInterval;
    if (!_nearStream.hasMore || _nearStream.loading) return;
    if (!due && !pendingLow && !prefetch && !surge) return;
    _maybeExtendStreamSoft();
    _nearStream.fetchAcc = 0;
    _fetchDecorStreamNearBatch(px, pz, vx, vz);
  }

  const _propDefer = {
    loading: false,
    offset: 0,
    hasMore: true,
    sx: 0,
    sz: 0,
    active: false,
  };

function _resetDecorSpawnDefer() {
    const loader = ZS.Engine?.ContentLoader;
    if (loader) loader.resetDecor();
    else _decorDeferLegacy.pending.length = 0;
  }

  function _resetPropDefer() {
    _propDefer.loading = false;
    _propDefer.offset = 0;
    _propDefer.hasMore = true;
    _propDefer.active = false;
  }

  function _deferQueueHas(id) {
    if (!id) return true;
    if (decorItems.has(id)) return true;
    return _decorSpawnDefer.pending.some((d) => d.id === id);
  }

  function _queueDeferredProp(d) {
    if (!d?.id || _deferQueueHas(d.id)) return;
    _decorSpawnDefer.pending.push(d);
  }

  function _splitDecorForSpawn(list, px, pz) {
    const spawnR2 = _decorSpawnRadius2();
    let near = [];
    const deferred = [];
    for (const d of list) {
      if (_isCriticalPinnedDecor(d, d?.id)) {
        near.push(d);
        continue;
      }
      const dx = (Number.isFinite(d.x) ? d.x : px) - px;
      const dz = (Number.isFinite(d.z) ? d.z : pz) - pz;
      if (dx * dx + dz * dz <= spawnR2) near.push(d);
      else deferred.push(d);
    }
    return _capInitDecorNear(near, deferred, px, pz);
  }

  let _decorDeferLogAcc = 0;
  let _treeDeferLogLast = 0;
  /** Resnap arbres différés — budgeté (évite pic 500 ms dans network tick). */
  let _treeResnapPending = null;
  let _treeResnapSnapped = 0;

  function _roadsPostSpawnBusy() {
    return !!ZS._roadsPostSpawnBusy;
  }

  function _postSpawnVisualBusy() {
    return !!ZS._roadsPostSpawnBusy || !!ZS._sectorDecorBusy;
  }

  let _decorVisRing = null;
  let _decorVisCursor = 0;
  let _decorVisLastPx = NaN;
  let _decorVisLastPz = NaN;
  function _invalidateDecorVisRing() {
    _decorVisRing = null;
    _decorVisCursor = 0;
    _decorVisLastPx = NaN;
    _decorVisLastPz = NaN;
  }

  let _deferPruneAcc = 0;
  const _treeFetchGate = { reason: '', since: 0 };

  function _decorTickBudgetMs() {
    if (ZS.isFrameRecovering?.()) return ZS._isMobile ? 2 : 4;
    let base;
    if (_postSpawnVisualBusy()) base = ZS._isMobile ? 4 : 8;
    else base = ZS._isMobile ? 6 : 12;
    if (_inPostSectorDrainSoft()) base = Math.max(4, Math.floor(base * 0.72));
    const fps = ZS.PerfMonitor?.getStats?.()?.fps;
    if (fps != null && fps < 12) return Math.max(2, Math.floor(base * 0.35));
    if (fps != null && fps < 16) return Math.max(3, Math.floor(base * 0.55));
    if (fps != null && fps < 20) return Math.max(4, Math.floor(base * 0.75));
    return base;
  }

  function _deferLoaderBlockReason() {
    const lp = getLocalXZ();
    const plan = _lastBacklogPlan || _buildBacklogPlan(lp.x, lp.z);
    const gov = ZS.Engine?.BudgetGovernor;
    if (gov?.treeFetchBlockReason) {
      return gov.treeFetchBlockReason(plan, {
        deferPending: _decorSpawnDefer.pending.length,
        lodMid: _lodMidRingPendingCount(lp.x, lp.z),
        deferForced: plan?.deferForced ?? _deferForcedDrain(
          _decorSpawnDefer.pending.length,
          _lodMidRingPendingCount(lp.x, lp.z),
          _lodNearPendingCount(lp.x, lp.z),
        ),
      });
    }
    if (!plan || plan.allow.treeFetch) return '';
    if (plan.deferForced && plan.pressure.defer >= DEFER_STREAM_RESUME - 20) return '';
    if (plan.pressure.lodMid < 24 && plan.pressure.defer > 250) return '';
    if (plan.phase === 'sector-drain'
        && plan.pressure.defer > 180
        && !plan.deferForced
        && plan.pressure.lodMid > plan.th.pause * 0.65) return 'post-drain';
    if (plan.phase === 'sector-drain'
        && plan.pressure.lodMid > plan.th.pause
        && plan.pressure.defer > 100) return 'post-drain-lod';
    if (plan.pressure.lodMid > plan.th.high && plan.pressure.defer > 80) return 'lod-mid';
    if (plan.deferPaused) return 'defer-pause';
    if (plan.pressure.lodNear > 160 && plan.pressure.defer > 60) return 'lod-near';
    return 'backlog';
  }

  function _setTreeFetchGate(reason, ctx) {
    const r = reason || '';
    if (_treeFetchGate.reason === r) return;
    const now = performance.now();
    const base = ctx || _streamGateContext();
    if (_treeFetchGate.reason && !r) {
      ZS.LoadLog?.post?.('tree-fetch-gate-clear', {
        prev: _treeFetchGate.reason,
        blockedMs: Math.round(now - _treeFetchGate.since),
        ...base,
      });
    } else if (r) {
      ZS.LoadLog?.post?.('tree-fetch-gate', { reason: r, ...base });
    }
    _treeFetchGate.reason = r;
    _treeFetchGate.since = r ? now : 0;
  }

  function _maybePeriodicDeferPrune(px, pz, dt) {
    _deferPruneAcc += dt;
    if (_deferPruneAcc < 4) return;
    _deferPruneAcc = 0;
    const n = _decorSpawnDefer.pending.length;
    const lodN = _lodPendingCount();
    const lodMid = _lodMidRingPendingCount(px, pz);
    const th = _lodMidStreamThresholds();
    if (n < 280 && lodN < 520 && lodMid < th.pause) return;
    if (!_inPostSectorDrainSoft() && !_sectorDecorCooldown() && n < 420 && lodN < 620 && lodMid < th.pause * 1.1) return;
    const before = n;
    const dropped = _pruneDecorDeferFarFrom(px, pz);
    if (dropped > 0) {
      ZS.LoadLog?.post?.('defer-prune', {
        dropped,
        before,
        pending: _decorSpawnDefer.pending.length,
        lod: lodN,
        lodMid,
      });
    }
  }

  function _resnapOneGroundedDecor(entry) {
    const { root, data } = entry;
    if (!root || !_prefabResnapGround(data?.prefabId, data)) return false;
    const rotY = data.rotY ?? root.userData?.decorSpec?.rotY ?? root.rotation?.y ?? 0;
    const px = root.position.x;
    const pz = root.position.z;
    const gy = _s01DecorGroundY(data, px, pz, rotY);
    if (!Number.isFinite(gy)) return false;
    if (Math.abs(root.position.y - gy) < 0.02) return false;
    root.position.y = gy;
    data.y = gy;
    data.baseY = gy;
    root.userData.fastGroundSpawn = false;
    ZS.refreshDecorCollision?.(root);
    return true;
  }

  function _scheduleDeferredTreeResnap() {
    if (_treeResnapPending) return;
    _treeResnapPending = [];
    for (const entry of decorItems.values()) {
      const root = entry?.root;
      if (!root || !_prefabResnapGround(entry.data?.prefabId, entry.data)) continue;
      if (!root.userData?.fastGroundSpawn) continue;
      if (!entry.data?.prefabId?.startsWith('tree_')) continue;
      _treeResnapPending.push(entry);
    }
    if (!_treeResnapPending.length) {
      _treeResnapPending = null;
      return;
    }
    _treeResnapSnapped = 0;
    ZS.LoadLog?.post?.('deferred-trees-resnap-start', { count: _treeResnapPending.length });
    _tickDeferredTreeResnap();
  }

  function _tickDeferredTreeResnap() {
    if (!_treeResnapPending?.length) {
      _treeResnapPending = null;
      return;
    }
    if (!_decorTickHeavyAllowed()) {
      requestAnimationFrame(_tickDeferredTreeResnap);
      return;
    }
    const t0 = performance.now();
    const budget = _decorTickBudgetMs() || 10;
    while (_treeResnapPending.length && performance.now() - t0 < budget) {
      if (_resnapOneGroundedDecor(_treeResnapPending.shift())) _treeResnapSnapped++;
    }
    if (_treeResnapPending.length) {
      requestAnimationFrame(_tickDeferredTreeResnap);
      return;
    }
    const total = _treeResnapSnapped;
    _treeResnapPending = null;
    _treeResnapSnapped = 0;
    if (total > 0) console.info('[decor] resnap arbres différés:', total);
    ZS.LoadLog?.post?.('deferred-trees-resnap-done', { snapped: total });
  }

  function _decorTickHeavyAllowed() {
    if (ZS.isFrameRecovering?.()) return false;
    const s = ZS.PerfMonitor?.getStats?.();
    if (s?.frameMsMax != null && s.frameMsMax > 110) return false;
    if (s?.frameMsP95 != null && s.frameMsP95 > 95) return false;
    return true;
  }

  /** Spawn immédiat des décor en attente dans le rayon spawn (palmiers, arbres proches). */
  async function _flushSpawnZoneDeferSpawn(px, pz, opts = {}) {
    const radius = opts.radius ?? SPAWN_IMMEDIATE_R;
    const maxMs = opts.maxMs ?? (ZS._isMobile ? 320 : 480);
    const maxItems = opts.maxItems ?? (ZS._isMobile ? 120 : 200);
    const pending = _decorSpawnDefer.pending;
    if (!pending.length) return { spawned: 0, ms: 0 };

    const loader = ZS.Engine?.ContentLoader;
    const spawnR2 = _decorSpawnRadius2();
    const streamR = _gameInitDecorRadius() + _decorSpawnMargin();
    const streamR2 = streamR * streamR;
    const handlers = {
      simpleLod: (d) => _treeSpawnSimpleLod(d, px, pz),
      spawnOne: (d, o) => _spawnDecorItem(d, o),
      yield: () => _yieldToMainLight(),
    };

    _beginColliderBatch();
    let result;
    if (loader?.drainDecorRingAsync) {
      result = await loader.drainDecorRingAsync(px, pz, {
        maxItems,
        maxMs,
        radiusR2: radius * radius,
        spawnR2,
        streamR2,
        forceFastGround: true,
        batchSize: 24,
      }, handlers);
    } else {
      const t0 = performance.now();
      const toRemove = new Set();
      let spawned = 0;
      for (let i = 0; i < pending.length && spawned < maxItems; i++) {
        if (performance.now() - t0 >= maxMs) break;
        const d = pending[i];
        const tx = Number.isFinite(d.x) ? d.x : px;
        const tz = Number.isFinite(d.z) ? d.z : pz;
        if ((tx - px) ** 2 + (tz - pz) ** 2 > radius * radius) continue;
        toRemove.add(i);
        _spawnDecorItem(d, { simpleLod: _treeSpawnSimpleLod(d, px, pz), fastGround: true });
        spawned++;
        if (spawned % 24 === 0) await _yieldToMainLight();
      }
      if (toRemove.size) {
        const kept = [];
        for (let i = 0; i < pending.length; i++) {
          if (!toRemove.has(i)) kept.push(pending[i]);
        }
        pending.length = 0;
        pending.push(...kept);
      }
      result = { spawned, ms: Math.round(performance.now() - t0) };
    }
    _endColliderBatch();

    console.info('[sync] spawn-zone defer flush', result.spawned, 'obj', result.ms, 'ms · reste', _decorSpawnDefer.pending.length);
    ZS.LoadLog?.post?.('spawn-zone-defer-flush', {
      spawned: result.spawned,
      ms: result.ms,
      pending: _decorSpawnDefer.pending.length,
    });
    return result;
  }

  function _deferSpawnHandlers(px, pz, ctx) {
    const forcedDrain = ctx.forcedDrain;
    const lodNear = ctx.lodNear;
    const lodMid = ctx.lodMid;
    const lodMidTh = ctx.lodMidTh;
    const urgentPending = ctx.urgentPending;
    const approachPrefetch = ctx.approachPrefetch;
    const criticalSurge = ctx.criticalSurge;
    const explorationBoost = ctx.explorationBoost;
    const decorGapActive = ctx.decorGapActive;
    const decorGapEmergency = ctx.decorGapEmergency;
    const pendingNearRing = ctx.pendingNearRing ?? 0;
    const idleGapFill = decorGapActive || decorGapEmergency
      || (pendingNearRing >= 8 && (ctx.idleSpeed2 ?? 1) < 1.44);
    const vx = ctx.vx ?? 0;
    const vz = ctx.vz ?? 0;
    const farR2 = 320 * 320;
    const bypassLod = approachPrefetch || criticalSurge || explorationBoost || decorGapActive || idleGapFill;
    return {
      shouldSkip: (pick) => {
        if (decorGapActive && (pick.ring === 'critical' || pick.ring === 'near')) return false;
        if (decorGapEmergency && (pick.ring === 'critical' || pick.ring === 'near')) return false;
        if (idleGapFill && (pick.ring === 'critical' || pick.ring === 'near')) return false;
        if (bypassLod) {
          const tx = Number.isFinite(pick.d.x) ? pick.d.x : px;
          const tz = Number.isFinite(pick.d.z) ? pick.d.z : pz;
          const dx = tx - px;
          const dz = tz - pz;
          const dot = dx * vx + dz * vz;
          if (dot > 0 && dx * dx + dz * dz <= farR2) return false;
          if ((criticalSurge || explorationBoost || decorGapActive) && pick.ring === 'critical') return false;
          if ((explorationBoost || decorGapActive || idleGapFill) && pick.ring === 'near') return false;
        }
        if (urgentPending > LOD_URGENT_SPAWN_PAUSE && !decorGapActive && !idleGapFill
          && pick.d.prefabId?.startsWith('tree_')
          && _treeSpawnSimpleLod(pick.d, px, pz)) return true;
        if (!forcedDrain && !bypassLod && lodNear > 96
          && pick.d.prefabId?.startsWith('tree_')
          && _treeSpawnSimpleLod(pick.d, px, pz)) return true;
        if (!forcedDrain && !bypassLod && lodMid > lodMidTh.pause
          && pick.d.prefabId?.startsWith('tree_')
          && _treeSpawnSimpleLod(pick.d, px, pz)) return true;
        return false;
      },
      simpleLod: (d) => {
        if (decorGapActive || idleGapFill) {
          const tx = Number.isFinite(d.x) ? d.x : px;
          const tz = Number.isFinite(d.z) ? d.z : pz;
          if ((tx - px) ** 2 + (tz - pz) ** 2 <= TREE_LOD_NEAR_R2) return false;
        }
        return _treeSpawnSimpleLod(d, px, pz);
      },
      spawnOne: (d, o) => _spawnDecorItem(d, o),
    };
  }

  function _tickDecorSpawnDefer(px, pz, remainingMs) {
    const pending = _decorSpawnDefer.pending;
    if (!pending.length) return;

    const loader = ZS.Engine?.ContentLoader;
    const src = loader?.getStreamingSource?.() ?? { vx: 0, vz: 0 };
    const vx = src.vx ?? 0;
    const vz = src.vz ?? 0;
    const deferPending = pending.length;
    const lodMid = _lodMidRingPendingCount(px, pz);
    const lodNear = _lodNearPendingCount(px, pz);
    const plan = _lastBacklogPlan || _buildBacklogPlan(px, pz);
    const forcedDrain = _deferForcedDrain(deferPending, lodMid, lodNear);
    const zoneBoost = _inSpawnZoneBoost();
    const band0Pending = zoneBoost && _deferHasBand0Pending(px, pz);
    const urgentPending = _lodUrgentPendingCount(px, pz);
    const explorationBoost = _explorationBoostActive?.() ?? false;
    const approachPrefetch = _approachPrefetchActive?.() ?? false;
    const criticalSurge = _criticalSurgeActive?.() ?? false;
    const decorGapActive = !!ZS.Engine?.DecorGapMonitor?.hasActiveGap?.();
    const decorGapEmergency = !!ZS.Engine?.DecorGapMonitor?.hasEmergencyGap?.();
    const lodGapActive = !!ZS.Engine?.LodGapMonitor?.hasActiveGap?.();
    const lodTextureSurge = _lodTextureSurgeActive?.() ?? false;
    const nearCounts = loader?.pendingNearPlayer?.(px, pz) ?? {};
    const pendingNearRing = nearCounts.near ?? 0;
    const lead = ((approachPrefetch || criticalSurge) && loader?.computeLeadAnchor)
      ? loader.computeLeadAnchor(px, pz, vx, vz)
      : { lx: px, lz: pz, active: false };
    const drainX = ((approachPrefetch || criticalSurge) && lead.active) ? lead.lx : px;
    const drainZ = ((approachPrefetch || criticalSurge) && lead.active) ? lead.lz : pz;
    const gov = ZS.Engine?.BudgetGovernor;

    const gate = gov?.evaluateDeferSpawnGate?.(plan, {
      forcedDrain,
      band0Pending,
      explorationBoost,
      approachPrefetch,
      criticalSurge,
      decorGapActive,
      decorGapEmergency,
      lodGapActive,
      lodTextureSurge,
      initVisDeferBlocked: _initVisRevealDeferBlocked(),
      postSpawnVisualBusy: _postSpawnVisualBusy(),
      decorTickHeavyAllowed: _decorTickHeavyAllowed(),
      urgentPending,
      sectorCooldown: _sectorDecorCooldown(),
      recenterActive: _nearStream.recenterUntil > 0 && performance.now() < _nearStream.recenterUntil,
    }) ?? { allowed: true };

    if (!gate.allowed) return;

    const lodMidTh = plan?.th ?? _lodMidStreamThresholds();
    const maxSpawn = gov?.computeDeferSpawnQuota?.(plan, {
      isMobile: ZS._isMobile,
      deferPending,
      lodMid,
      lodNear,
      lodMidTh,
      urgentPending,
      decorN: decorItems.size,
      forcedDrain,
      band0Pending,
      explorationBoost,
      approachPrefetch,
      criticalSurge,
      decorGapActive,
      decorGapEmergency,
      lodGapActive,
      lodTextureSurge,
      simpleLodUrgent: _lodUrgentPendingCount(px, pz),
      pendingNearRing,
      postSpawnVisualBusy: _postSpawnVisualBusy(),
      sectorCooldown: _sectorDecorCooldown(),
      postSectorDrainSoft: _inPostSectorDrainSoft(),
      postRevealSpawnSoft: _inPostRevealSpawnSoft(),
      streamSoftStart: _inStreamSoftStart(),
      bootGrace: _inBootGrace(),
    }) ?? (plan?.quotas?.maxSpawn ?? (ZS._isMobile ? 6 : 12));

    _maybeLogDeferCap(maxSpawn, deferPending, lodNear);

    const budgetMs = gov?.getDeferSpawnCapMs?.({
      isMobile: ZS._isMobile,
      zoneBoost: band0Pending || explorationBoost || criticalSurge || decorGapActive || decorGapEmergency,
      approachPrefetch,
      criticalSurge,
      decorGapActive,
      decorGapEmergency,
      lodGapActive,
      lodTextureSurge,
      remainingMs,
    }) ?? (ZS._isMobile ? 6 : 9);

    const spawnR2 = _decorSpawnRadius2();
    const streamR = _gameInitDecorRadius() + _decorSpawnMargin();
    const streamR2 = streamR * streamR;
    const handlers = _deferSpawnHandlers(px, pz, {
      forcedDrain, lodNear, lodMid, lodMidTh, urgentPending,
      approachPrefetch, criticalSurge, explorationBoost, decorGapActive, decorGapEmergency, vx, vz,
      pendingNearRing,
      idleSpeed2: vx * vx + vz * vz,
    });

    _beginColliderBatch();
    let n = 0;
    let ms = 0;

    if (loader?.drainDecorRing) {
      const gapDrain = decorGapActive || decorGapEmergency
        || (pendingNearRing >= 10 && vx * vx + vz * vz < 1.44);
      const result = loader.drainDecorRing(drainX, drainZ, {
        maxItems: gapDrain ? Math.max(maxSpawn, ZS._isMobile ? 12 : 20) : maxSpawn,
        maxMs: gapDrain ? Math.max(budgetMs, ZS._isMobile ? 14 : 22) : budgetMs,
        spawnR2,
        streamR2,
      }, handlers);
      n = result.spawned;
      ms = result.ms;
    } else {
      const t0 = performance.now();
      const ranked = [];
      for (let i = 0; i < pending.length; i++) {
        const d = pending[i];
        const tx = Number.isFinite(d.x) ? d.x : px;
        const tz = Number.isFinite(d.z) ? d.z : pz;
        const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
        const band = d2 <= spawnR2 ? 0 : (d2 <= streamR2 ? 1 : 2);
        ranked.push({ index: i, d, d2, band });
      }
      ranked.sort((a, b) => a.band - b.band || a.d2 - b.d2);
      const toRemove = new Set();
      for (const pick of ranked) {
        if (n >= maxSpawn) break;
        if (performance.now() - t0 >= budgetMs) break;
        if (handlers.shouldSkip(pick)) continue;
        toRemove.add(pick.index);
        handlers.spawnOne(pick.d, {
          simpleLod: handlers.simpleLod(pick.d),
          fastGround: pick.band >= 1,
        });
        n++;
      }
      if (toRemove.size) {
        const kept = [];
        for (let i = 0; i < pending.length; i++) {
          if (!toRemove.has(i)) kept.push(pending[i]);
        }
        pending.length = 0;
        pending.push(...kept);
      }
      ms = Math.round(performance.now() - t0);
    }
    _endColliderBatch();

    if (n > 0) {
      _decorDeferLogAcc = (_decorDeferLogAcc || 0) + n;
      if (ms >= 8 || _decorDeferLogAcc % 48 === 0) {
        ZS.LoadLog?.post?.('decor-defer-spawn', {
          spawned: n,
          pending: pending.length,
          lodMid,
          ms,
          totalSpawned: _decorDeferLogAcc,
          gateBypass: !!gate.bypass,
        });
      }
    }
  }

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

  /** POI interactifs / builds — toujours spawn init. Le reste (s01 seed lointain) = rayon. */
  function _isCriticalPinnedDecor(data, decorId) {
    if (!data) return false;
    const pid = data.prefabId || data.type || '';
    if (pid.startsWith('build_') || pid.startsWith('wreck_')) return true;
    if (pid === 'storage_chest' || pid === 'building_survivor_shack') return true;
    if (pid.includes('door')) return true;
    if (data.locked != null || data.doorOpen != null || data.storageOpen != null) return true;
    if (pid.startsWith('tree_') && decorId && ZS.isTreeVisPinned?.(decorId)) return true;
    return false;
  }

  const INIT_NEAR_DECOR_CAP = () => (ZS._isMobile ? 420 : 680);
  const SPAWN_IMMEDIATE_R = 100;
  const SPAWN_IMMEDIATE_R2 = SPAWN_IMMEDIATE_R * SPAWN_IMMEDIATE_R;

  function _capInitDecorNear(near, deferred, px, pz) {
    const cap = INIT_NEAR_DECOR_CAP();
    const immediate = [];
    const rest = [];
    for (const d of near) {
      if (_isCriticalPinnedDecor(d, d?.id)) {
        immediate.push(d);
        continue;
      }
      const tx = Number.isFinite(d.x) ? d.x : px;
      const tz = Number.isFinite(d.z) ? d.z : pz;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 <= SPAWN_IMMEDIATE_R2) immediate.push(d);
      else rest.push(d);
    }
    if (rest.length + immediate.length <= cap) {
      return { near: immediate.concat(rest), deferred };
    }
    rest.sort((a, b) => {
      const ax = (Number.isFinite(a.x) ? a.x : px) - px;
      const az = (Number.isFinite(a.z) ? a.z : pz) - pz;
      const bx = (Number.isFinite(b.x) ? b.x : px) - px;
      const bz = (Number.isFinite(b.z) ? b.z : pz) - pz;
      return (ax * ax + az * az) - (bx * bx + bz * bz);
    });
    const room = Math.max(0, cap - immediate.length);
    const kept = immediate.concat(rest.slice(0, room));
    const overflow = rest.slice(room);
    if (overflow.length) {
      console.info('[sync] décor init capped', kept.length, '+', overflow.length, 'différés (cap', cap, ')');
      ZS.LoadLog?.post?.('init-decor-cap', { kept: kept.length, overflow: overflow.length, cap, immediate: immediate.length });
    }
    return { near: kept, deferred: deferred.concat(overflow) };
  }

  function _decorVisRadius2() {
    const r = ZS.Options?.getProfile?.()?.decorVisRadius ?? 140;
    return r * r;
  }

  let _decorVisAcc = 0;
  let _spawnReadyAt = 0;
  const INIT_VIS_REVEAL_MS = 3600;
  const INIT_VIS_REVEAL_HOLD_FRAMES = 4;
  const INIT_VIS_REVEAL_EXPAND_PAUSE_FRAMES = 4;
  const INIT_VIS_EXPAND_MIN_DR2 = 28;
  /** Rayon visibilité progressif pendant hold (évite pic render shader compile). */
  const INIT_VIS_HOLD_RADIUS = [10, 16, 22, 30, 38, 46, 54, 64];
  const _initVisReveal = {
    active: false,
    phase: 'idle',
    px: 0,
    pz: 0,
    radius2: 0,
    targetR2: 0,
    expandStartAt: 0,
    lastAppliedR2: 0,
  };

  function _effectiveDecorVisR2() {
    if (_initVisReveal.active) {
      const target = _initVisReveal.targetR2 || _decorVisRadius2();
      return Math.min(_initVisReveal.radius2, target);
    }
    return _decorVisRadius2();
  }

  /** Compte décor spawnés dans un rayon (visible vs total). */
  function _countDecorNear(px, pz, radius) {
    const r2 = radius * radius;
    let visible = 0;
    let total = 0;
    for (const { root, data } of decorItems.values()) {
      if (!root || !data) continue;
      const tx = Number.isFinite(data.x) ? data.x : root.position.x;
      const tz = Number.isFinite(data.z) ? data.z : root.position.z;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 > r2) continue;
      total++;
      if (root.visible) visible++;
    }
    return { visible, total };
  }

  function _countDeferNear(px, pz, radius) {
    const r2 = radius * radius;
    let n = 0;
    for (const d of _decorSpawnDefer.pending) {
      const tx = Number.isFinite(d.x) ? d.x : px;
      const tz = Number.isFinite(d.z) ? d.z : pz;
      if ((tx - px) ** 2 + (tz - pz) ** 2 <= r2) n++;
    }
    return n;
  }

  function _sampleDecorGap(px, pz) {
    const loader = ZS.Engine?.ContentLoader;
    const rings = loader?.pendingRingSummary?.(px, pz)
      ?? loader?.pendingNearPlayer?.(px, pz)
      ?? { critical: 0, near: 0, total: 0, far: 0, disk320: 0 };
    const counts = _countDecorNear(px, pz, 160);
    return {
      pendingNear: rings.near ?? 0,
      pendingCritical: rings.critical ?? 0,
      pendingFar: rings.far ?? 0,
      disk320: rings.disk320 ?? 0,
      visibleNear: counts.visible,
      totalNear: counts.total,
      deferNear: _countDeferNear(px, pz, 160),
      deferPending: _decorSpawnDefer.pending.length,
    };
  }

  const BOOT_GRACE_MS = 12000;
  const SPAWN_ZONE_BOOST_MS = 25000;
  let _spawnZoneCollidersRegistered = 0;

  function _inSpawnZoneBoost() {
    return _spawnReadyAt > 0 && performance.now() - _spawnReadyAt < SPAWN_ZONE_BOOST_MS;
  }

  function _deferHasBand0Pending(px, pz) {
    const spawnR2 = _decorSpawnRadius2();
    for (const d of _decorSpawnDefer.pending) {
      const tx = Number.isFinite(d.x) ? d.x : px;
      const tz = Number.isFinite(d.z) ? d.z : pz;
      if ((tx - px) ** 2 + (tz - pz) ** 2 <= spawnR2) return true;
    }
    return false;
  }
  const TREE_LOD_URGENT_R = 64;
  const TREE_LOD_URGENT_R2 = TREE_LOD_URGENT_R * TREE_LOD_URGENT_R;
  const TREE_LOD_NEAR_R2 = 72 * 72;
  const INIT_TREE_FULL_LOD_R2 = 105 * 105;
  const TREE_LOD_MID_R2 = 110 * 110;
  const LOD_BACKLOG_MID = 450;
  const LOD_BACKLOG_HIGH = 800;
  const LOD_BOOT_GRACE_MS = 3500;
  const LOD_UPGRADE_WINDOW_MS = 4000;
  const LOD_UPGRADE_WINDOW_MAX = 80;
  let _lodUpgradeList = null;
  let _lodLastScanPx = NaN;
  let _lodLastScanPz = NaN;
  let _lodUpgradeWindowAt = 0;
  let _lodUpgradeWindowCount = 0;
  let _postInitPending = null;
  let _deferredInvDebugTrace = null;
  let _postRevealSpawnUntil = 0;
  const DEFERRED_TREE_START_MS = 4000;

  function _resetInitVisReveal() {
    _initVisReveal.active = false;
    _initVisReveal.phase = 'idle';
    _initVisReveal.radius2 = 0;
    _initVisReveal.expandStartAt = 0;
    _initVisReveal.lastAppliedR2 = 0;
  }

  function _beginInitVisReveal(px, pz) {
    _initVisReveal.active = true;
    _initVisReveal.phase = 'pre';
    _initVisReveal.px = px;
    _initVisReveal.pz = pz;
    const r0 = INIT_VIS_HOLD_RADIUS[0];
    _initVisReveal.radius2 = r0 * r0;
    _initVisReveal.targetR2 = _decorVisRadius2();
    _initVisReveal.expandStartAt = 0;
    _initVisReveal.lastAppliedR2 = 0;
    const touched = _applyInitVisReveal(px, pz);
    ZS.LoadLog?.post?.('init-vis-reveal-start', {
      r: r0,
      targetR: Math.round(Math.sqrt(_initVisReveal.targetR2)),
      holdFrames: INIT_VIS_REVEAL_HOLD_FRAMES,
      touched,
    });
  }

  function _initVisToggleBudget() {
    if (ZS.isFrameRecovering?.()) return ZS._isMobile ? 12 : 20;
    if (_initVisReveal.phase === 'expand') return ZS._isMobile ? 32 : 48;
    if (_initVisReveal.phase === 'hold' || _initVisReveal.phase === 'pause') {
      return ZS._isMobile ? 36 : 56;
    }
    return 9999;
  }

  function _applyInitVisReveal(px, pz, maxToggles) {
    if (!_initVisReveal.active) return 0;
    const outerR2 = Math.min(_initVisReveal.radius2, _initVisReveal.targetR2);
    const innerR2 = _initVisReveal.lastAppliedR2 || 0;
    if (outerR2 <= innerR2) return 0;
    const budget = maxToggles ?? _initVisToggleBudget();
    let touched = 0;
    let toggles = 0;
    let complete = true;
    decorItems.forEach((entry, id) => {
      if (toggles >= budget) {
        complete = false;
        return;
      }
      if (!entry?.root) return;
      if (_isPinnedDecor(entry.data, id)) {
        entry.root.visible = true;
        return;
      }
      const tx = entry.data?.x ?? entry.root.position.x;
      const tz = entry.data?.z ?? entry.root.position.z;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 <= innerR2) return;
      if (d2 <= outerR2) {
        if (!entry.root.visible) {
          touched++;
          toggles++;
        }
        entry.root.visible = true;
        return;
      }
      if (entry.root.visible) {
        entry.root.visible = false;
        touched++;
        toggles++;
      }
    });
    if (complete) _initVisReveal.lastAppliedR2 = outerR2;
    _initVisReveal.px = px;
    _initVisReveal.pz = pz;
    return touched;
  }

  async function _runInitVisRevealHoldFrames(px, pz) {
    if (!_initVisReveal.active) return;
    _initVisReveal.phase = 'hold';
    _initVisReveal.px = px;
    _initVisReveal.pz = pz;
    await _yieldToMain();
    for (let f = 0; f < INIT_VIS_REVEAL_HOLD_FRAMES; f++) {
      const holdR = INIT_VIS_HOLD_RADIUS[Math.min(f + 1, INIT_VIS_HOLD_RADIUS.length - 1)];
      _initVisReveal.radius2 = holdR * holdR;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const t0 = performance.now();
      const touched = _applyInitVisReveal(px, pz);
      const ms = Math.round(performance.now() - t0);
      if (ms >= 12 && ZS.LoadLog?.isEnabled?.()) {
        ZS.LoadLog.post('init-vis-hold-step', { f: f + 1, r: holdR, ms, touched });
      }
    }
    _initVisReveal.phase = 'pause';
    for (let f = 0; f < INIT_VIS_REVEAL_EXPAND_PAUSE_FRAMES; f++) {
      const pauseIdx = INIT_VIS_REVEAL_HOLD_FRAMES + f + 1;
      const holdR = INIT_VIS_HOLD_RADIUS[Math.min(pauseIdx, INIT_VIS_HOLD_RADIUS.length - 1)];
      _initVisReveal.radius2 = holdR * holdR;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      _applyInitVisReveal(px, pz);
    }
    _initVisReveal.phase = 'expand';
    _initVisReveal.expandStartAt = performance.now();
    ZS.LoadLog?.post?.('init-vis-reveal-expand', {
      holdFrames: INIT_VIS_REVEAL_HOLD_FRAMES,
      pauseFrames: INIT_VIS_REVEAL_EXPAND_PAUSE_FRAMES,
      targetR: Math.round(Math.sqrt(_initVisReveal.targetR2)),
    });
  }

  function _tickInitVisReveal(px, pz) {
    if (!_initVisReveal.active) return false;
    if (_initVisReveal.phase === 'pre' || _initVisReveal.phase === 'hold' || _initVisReveal.phase === 'pause') {
      _initVisReveal.px = px;
      _initVisReveal.pz = pz;
      return true;
    }
    if (_initVisReveal.phase !== 'expand') return false;
    const elapsed = performance.now() - _initVisReveal.expandStartAt;
    const tLin = Math.min(1, elapsed / INIT_VIS_REVEAL_MS);
    const t = 1 - (1 - tLin) ** 3;
    const urgentR = TREE_LOD_URGENT_R;
    const visR = Math.sqrt(_initVisReveal.targetR2);
    const r = urgentR + (visR - urgentR) * t;
    const outerR2 = r * r;
    if (outerR2 - (_initVisReveal.lastAppliedR2 || 0) < INIT_VIS_EXPAND_MIN_DR2 && t < 1) {
      _initVisReveal.px = px;
      _initVisReveal.pz = pz;
      return true;
    }
    _initVisReveal.radius2 = outerR2;
    _initVisReveal.px = px;
    _initVisReveal.pz = pz;
    _applyInitVisReveal(px, pz);
    if (t >= 1) {
      _initVisReveal.active = false;
      _initVisReveal.phase = 'idle';
      ZS.LoadLog?.post?.('init-vis-reveal-done', {
        ms: Math.round(elapsed),
        r: Math.round(visR),
        holdFrames: INIT_VIS_REVEAL_HOLD_FRAMES,
      });
      _runPostInitWorkIfReady();
    }
    return true;
  }

  function _initVisRevealHoldPhase() {
    if (!_initVisReveal.active) return false;
    const p = _initVisReveal.phase;
    return p === 'pre' || p === 'hold' || p === 'pause';
  }

  function _initVisRevealDeferBlocked() {
    if (!_initVisReveal.active) return false;
    const p = _initVisReveal.phase;
    return p === 'pre' || p === 'hold' || p === 'pause';
  }

  function _initVisRevealBusy() {
    if (!_initVisReveal.active) return false;
    if (_initVisReveal.phase === 'pre' || _initVisReveal.phase === 'hold' || _initVisReveal.phase === 'pause') return true;
    return _initVisReveal.phase === 'expand';
  }

function _lodWindowMax(deferN, midLod, fps) {
    const plan = _lastBacklogPlan;
    if (plan?.quotas?.lodWindowMax != null) return plan.quotas.lodWindowMax;
    const th = _lodMidStreamThresholds();
    const lodNear = _lodNearPendingCount(_lodRingCache.px, _lodRingCache.pz);
    let cap = LOD_UPGRADE_WINDOW_MAX;
    if (deferN > 400) cap = 24;
    else if (deferN > 250) cap = 40;
    else if (_inPostSectorDrainSoft() && deferN > 120) cap = 32;
    else if (_inPostSectorDrainSoft() && deferN === 0 && midLod > th.pause * 0.32) cap = 88;
    else if (deferN === 0 && midLod > th.pause * 0.45 && fps != null && fps >= 14) cap = 110;
    else if (deferN === 0 && midLod > th.pause * 0.25) cap = 96;
    if (lodNear > 260) cap = Math.min(cap, deferN > 200 ? 24 : 40);
    else if (lodNear > 180) cap = Math.min(cap, deferN > 250 ? 36 : 48);
    else if (lodNear > 120) cap = Math.min(cap, 52);
    if (deferN < 150 && lodNear > 80 && midLod < th.pause * 0.5) {
      cap = Math.max(cap, fps != null && fps >= 18 ? 48 : 36);
    }
    return cap;
  }

  function _colliderBootDelayMs() {
    if (_spawnZoneCollidersRegistered > 0) return 500;
    const defer = _decorSpawnDefer.pending.length;
    const lp = getLocalXZ();
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const th = _lodMidStreamThresholds();
    if (lodMid > th.high) return 3200;
    if (lodMid > th.pause) return 2400;
    if (defer > 350) return 1800;
    return 1200;
  }

  function _flushLodUpgradeWindowLog(px, pz, fps) {
    if (_lodUpgradeWindowCount <= 0 || !ZS.LoadLog?.isEnabled?.()) return;
    ZS.LoadLog.post('lod-upgrade-batch', {
      upgraded: _lodUpgradeWindowCount,
      pending: _lodPendingCount(),
      lodMid: _lodMidRingPendingCount(px, pz),
      deferPending: _decorSpawnDefer.pending.length,
      urgentPending: _lodUrgentPendingCount(px, pz),
      px: Math.round(px),
      pz: Math.round(pz),
      fps: fps ?? null,
    });
  }

  function _rollLodUpgradeWindow(px, pz, fps, windowMax) {
    const now = performance.now();
    if (!_lodUpgradeWindowAt || now - _lodUpgradeWindowAt >= LOD_UPGRADE_WINDOW_MS) {
      if (_lodUpgradeWindowAt && _lodUpgradeWindowCount > 0) {
        _flushLodUpgradeWindowLog(px, pz, fps);
      }
      _lodUpgradeWindowAt = now;
      _lodUpgradeWindowCount = 0;
    }
    return Math.max(0, windowMax - _lodUpgradeWindowCount);
  }

  function _schedulePostInitWork(spawnX, spawnZ, decorList, structList, data) {
    _postInitPending = { spawnX, spawnZ, decorList, structList, data };
  }

  function _runPostInitWorkIfReady() {
    if (!_postInitPending || !_spawnReady) return;
    if (_initVisReveal.active) return;
    const p = _postInitPending;
    _postInitPending = null;
    _scheduleNearCollidersAfterBoot(p.spawnX, p.spawnZ, _colliderBootDelayMs());
    _beginNearStream(p.spawnX, p.spawnZ);
    const lp = getLocalXZ();
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const th = _lodMidStreamThresholds();
    const treeDelayMs = DEFERRED_TREE_START_MS + (lodMid > th.pause ? 2500 : 0);
    setTimeout(() => {
      _beginDeferredTrees(p.spawnX, p.spawnZ);
      _beginDeferredProps(p.spawnX, p.spawnZ);
    }, treeDelayMs);
    _runPostInitIdle(p.decorList, p.structList, p.data, p.spawnX, p.spawnZ).catch((e) => {
      console.warn('[sync] post-init idle', e);
    });
    if (_deferredInvDebugTrace) {
      requestInvDebugSnapshot(_deferredInvDebugTrace, 'post-reveal-init');
      _deferredInvDebugTrace = null;
    }
    _postRevealSpawnUntil = performance.now() + (lodMid > th.pause ? POST_REVEAL_SPAWN_SOFT_MS + 6000 : POST_REVEAL_SPAWN_SOFT_MS);
    ZS.LoadLog?.post?.('post-init-stream-start', {
      x: Math.round(p.spawnX),
      z: Math.round(p.spawnZ),
      softMs: STREAM_SOFT_MS,
      treeDelayMs: treeDelayMs,
      deferSoftMs: lodMid > th.pause ? POST_REVEAL_SPAWN_SOFT_MS + 6000 : POST_REVEAL_SPAWN_SOFT_MS,
      lodMid,
    });
  }

  function _inBootGrace() {
    return _spawnReadyAt > 0 && performance.now() - _spawnReadyAt < BOOT_GRACE_MS;
  }

  function _markLodQueueDirty() {
    _lodUpgradeList = null;
    _lodListRebuildAt = 0;
  }

  let _lodPendingCached = 0;
  let _lodListRebuildAt = 0;
  const LOD_PRESSURE_MARGIN = 72;
  const _lodRingCache = {
    px: NaN, pz: NaN, urgent: 0, mid: 0, near: 0, dirty: true, at: 0,
  };
  const LOD_RING_CACHE_MOVE2 = 8 * 8;
  const LOD_RING_CACHE_MS = 120;

  function _invalidateLodRingCache() {
    _lodRingCache.dirty = true;
  }

  function _adjustLodPendingCached(delta) {
    _lodPendingCached = Math.max(0, _lodPendingCached + delta);
    _invalidateLodRingCache();
  }

  function _recomputeLodPendingFull() {
    let n = 0;
    for (const entry of decorItems.values()) {
      if (entry?.root?.userData?.simpleLod) n++;
    }
    _lodPendingCached = n;
    _lodRingCache.dirty = true;
  }

  function _lodPressureRadius2() {
    const r = Math.sqrt(_decorVisRadius2()) + LOD_PRESSURE_MARGIN;
    return r * r;
  }

  function _syncLodRingCounts(px, pz) {
    const now = performance.now();
    const moved2 = Number.isFinite(_lodRingCache.px)
      ? (px - _lodRingCache.px) ** 2 + (pz - _lodRingCache.pz) ** 2
      : Infinity;
    if (!_lodRingCache.dirty
        && moved2 <= LOD_RING_CACHE_MOVE2
        && now - _lodRingCache.at < LOD_RING_CACHE_MS) return;
    let urgent = 0;
    let mid = 0;
    let near = 0;
    const pressR2 = _lodPressureRadius2();
    for (const entry of decorItems.values()) {
      if (!entry?.root?.userData?.simpleLod) continue;
      const tx = entry.data?.x ?? entry.root.position.x;
      const tz = entry.data?.z ?? entry.root.position.z;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 <= pressR2) near++;
      const pid = entry.data?.prefabId;
      if (!pid?.startsWith('tree_')) continue;
      if (d2 <= TREE_LOD_URGENT_R2) urgent++;
      if (d2 <= TREE_LOD_MID_R2) mid++;
    }
    _lodRingCache.urgent = urgent;
    _lodRingCache.mid = mid;
    _lodRingCache.near = near;
    _lodRingCache.px = px;
    _lodRingCache.pz = pz;
    _lodRingCache.dirty = false;
    _lodRingCache.at = now;
  }

  function _lodPendingCount() {
    return _lodPendingCached;
  }

  function _lodUrgentPendingCount(px, pz) {
    _syncLodRingCounts(px, pz);
    return _lodRingCache.urgent;
  }

  function _lodMidRingPendingCount(px, pz) {
    _syncLodRingCounts(px, pz);
    return _lodRingCache.mid;
  }

  function _lodNearPendingCount(px, pz) {
    _syncLodRingCounts(px, pz);
    return _lodRingCache.near;
  }

  function _sampleLodGap(px, pz) {
    const deferN = _decorSpawnDefer.pending.length;
    const lodMid = _lodMidRingPendingCount(px, pz);
    const lodNear = _lodNearPendingCount(px, pz);
    const plan = _lastBacklogPlan || _buildBacklogPlan(px, pz);
    const forcedDrain = _deferForcedDrain(deferN, lodMid, lodNear);
    const fps = ZS.PerfMonitor?.getStats?.()?.fps ?? null;
    let lodUpgradeBlocked = false;
    let lodUpgradeBlockReason = null;
    if (_postSpawnVisualBusy()) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'post-spawn';
    } else if (_initVisReveal.active) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'init-vis';
    } else if (!_decorTickHeavyAllowed()) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'heavy-throttle';
    } else if (plan && !plan.allow.lodUpgrade && !forcedDrain) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'backlog-plan';
    } else if (_syncDeferGatePaused(deferN) && !forcedDrain) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'defer-gate';
    } else if (deferN > 280 && lodMid < 48 && !forcedDrain) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'defer-priority';
    } else if (fps != null && fps < 10) {
      lodUpgradeBlocked = true;
      lodUpgradeBlockReason = 'fps-low';
    }
    return {
      simpleLodTotal: _lodPendingCount(),
      simpleLodUrgent: _lodUrgentPendingCount(px, pz),
      simpleLodMid: lodMid,
      simpleLodNear: lodNear,
      lodUpgradeQueue: _lodUpgradeList?.length ?? null,
      lodUpgradeBlocked,
      lodUpgradeBlockReason,
      deferPending: deferN,
      fps,
    };
  }

  function _treeWantsSimpleLodAt(x, z, px, pz) {
    const d2 = ((x || 0) - px) ** 2 + ((z || 0) - pz) ** 2;
    return d2 > TREE_LOD_URGENT_R2;
  }

  function _lodBurstMax(d2, fps, urgentPressure) {
    if (urgentPressure && d2 <= TREE_LOD_URGENT_R2) {
      return ZS._isMobile ? 12 : 20;
    }
    let max = ZS._isMobile ? 2 : 4;
    if (d2 <= TREE_LOD_URGENT_R2) max = ZS._isMobile ? 4 : 6;
    else if (d2 <= TREE_LOD_NEAR_R2) max = ZS._isMobile ? 2 : 3;
    else max = 1;
    if (fps != null && fps < 22) max = Math.max(1, Math.floor(max * 0.5));
    if (fps != null && fps < 14) max = d2 <= TREE_LOD_URGENT_R2 ? 2 : 0;
    return max;
  }

  function _treeWantsSimpleLod(d, px, pz) {
    if (!d?.prefabId?.startsWith('tree_')) return false;
    const tx = Number.isFinite(d.x) ? d.x : px;
    const tz = Number.isFinite(d.z) ? d.z : pz;
    return _treeWantsSimpleLodAt(tx, tz, px, pz);
  }

  function _treeSpawnSimpleLod(d, px, pz) {
    if (!d?.prefabId?.startsWith('tree_')) return false;
    const tx = Number.isFinite(d.x) ? d.x : px;
    const tz = Number.isFinite(d.z) ? d.z : pz;
    const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
    if (d2 <= TREE_LOD_NEAR_R2) return false;
    const deferN = _decorSpawnDefer.pending.length;
    const midLod = _lodMidRingPendingCount(px, pz);
    if (d2 <= TREE_LOD_MID_R2) {
      if (_lodTextureSurgeActive?.()) return false;
      if (deferN > 120 || midLod >= 12) return false;
    }
    return _treeWantsSimpleLod(d, px, pz);
  }

  function _treeSpawnSimpleLodForInit(d, px, pz) {
    if (!d?.prefabId?.startsWith('tree_')) return false;
    const tx = Number.isFinite(d.x) ? d.x : px;
    const tz = Number.isFinite(d.z) ? d.z : pz;
    const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
    if (d2 <= INIT_TREE_FULL_LOD_R2) return false;
    return _treeWantsSimpleLod(d, px, pz);
  }

  function _rebuildLodUpgradeList(px, pz) {
    _lodUpgradeList = [];
    for (const entry of decorItems.values()) {
      const root = entry?.root;
      if (!root?.userData?.simpleLod) continue;
      const pid = entry.data?.prefabId;
      if (!pid?.startsWith('tree_')) continue;
      const tx = entry.data?.x ?? root.position.x;
      const tz = entry.data?.z ?? root.position.z;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 > TREE_LOD_MID_R2) continue;
      _lodUpgradeList.push({ entry, d2 });
    }
    _lodUpgradeList.sort((a, b) => a.d2 - b.d2);
    _lodLastScanPx = px;
    _lodLastScanPz = pz;
  }

  function _compactLodUpgradeList() {
    if (!_lodUpgradeList?.length) return;
    _lodUpgradeList = _lodUpgradeList.filter((row) => row?.entry?.root?.userData?.simpleLod);
  }

  function _upgradeTreeLodEntry(entry, px, pz) {
    const root = entry?.root;
    if (!root?.userData?.simpleLod) return false;
    const pid = entry.data?.prefabId;
    if (!pid?.startsWith('tree_')) return false;
    const tx = entry.data?.x ?? root.position.x;
    const tz = entry.data?.z ?? root.position.z;
    const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
    if (d2 > TREE_LOD_MID_R2) return false;
    if (!root.visible && d2 > TREE_LOD_URGENT_R2 * 0.64) return false;
    const bootAge = _spawnReadyAt > 0 ? performance.now() - _spawnReadyAt : Infinity;
    if (bootAge < LOD_BOOT_GRACE_MS && d2 > TREE_LOD_URGENT_R2) return false;
    const tLod = performance.now();
    const ok = !!ZS.upgradeTreeLod?.(root, pid, {
      treeSeed: entry.data?.treeSeed,
      decorId: entry.data?.id,
    });
    const lodMs = performance.now() - tLod;
    if (ok && lodMs >= 20 && ZS.LoadLog?.isEnabled?.()) {
      ZS.LoadLog.post('lod-upgrade-slow', { ms: Math.round(lodMs), prefab: pid, d2: Math.round(d2) });
    }
    if (ok) {
      if (!root.userData?.simpleLod) {
        _adjustLodPendingCached(-1);
        ZS.Engine?.LodGapMonitor?.notifyLodUpgrade?.(
          tx, tz, entry.data?.id,
          {
            lodMs: Math.round(lodMs),
            simpleLodUrgent: _lodUrgentPendingCount(px, pz),
            simpleLodMid: _lodMidRingPendingCount(px, pz),
          },
        );
      } else _invalidateLodRingCache();
    }
    return ok;
  }

  function _tickLodUpgrades(px, pz) {
    if (_postSpawnVisualBusy()) return;
    if (_initVisReveal.active) return;
    if (!_decorTickHeavyAllowed()) return;
    const sectorCooldown = _sectorDecorCooldown();
    const deferN = _decorSpawnDefer.pending.length;
    const lodMid = _lodMidRingPendingCount(px, pz);
    const lodNear = _lodNearPendingCount(px, pz);
    const lodTextureSurge = _lodTextureSurgeActive?.() ?? false;
    const plan = _lastBacklogPlan || _buildBacklogPlan(px, pz);
    const forcedDrain = _deferForcedDrain(deferN, lodMid, lodNear);
    if (plan && !plan.allow.lodUpgrade && !forcedDrain && !lodTextureSurge) return;
    if (_syncDeferGatePaused(deferN) && !forcedDrain && !lodTextureSurge) return;
    if (deferN > 280 && lodMid < 48 && !forcedDrain && !lodTextureSurge) return;
    const fps = ZS.PerfMonitor?.getStats?.()?.fps ?? null;
    if (fps != null && fps < 10) return;

    const urgentEarly = _lodUrgentPendingCount(px, pz);
    if (sectorCooldown && urgentEarly < 8 && !lodTextureSurge) return;
    if (sectorCooldown && lodTextureSurge && urgentEarly < 2) return;

    const windowMax = _lodWindowMax(deferN, lodMid, fps);
    const windowLeft = _rollLodUpgradeWindow(px, pz, fps, windowMax);
    if (windowLeft <= 0) return;

    const pendingLod = _lodPendingCount();
    const midLod = _lodMidRingPendingCount(px, pz);
    const th = _lodMidStreamThresholds();
    const urgentPending = _lodUrgentPendingCount(px, pz);
    const urgentOnly = sectorCooldown;
    const backlog = midLod > th.pause * 0.75 || pendingLod > LOD_BACKLOG_MID || (_inPostSectorDrainSoft() && deferN > 150);

    const moved = !Number.isFinite(_lodLastScanPx)
      || (px - _lodLastScanPx) ** 2 + (pz - _lodLastScanPz) ** 2 > 30 * 30;
    const rebuildDue = !_lodUpgradeList
      || moved
      || performance.now() - _lodListRebuildAt > 900;
    if (rebuildDue) {
      _rebuildLodUpgradeList(px, pz);
      _lodListRebuildAt = performance.now();
    }
    if (!_lodUpgradeList?.length && pendingLod === 0) return;

    const t0 = performance.now();
    let budget = fps != null && fps < 20
      ? 6
      : Math.min(14, Math.max(8, (_decorTickBudgetMs() || 8) * 1.5));
    if (backlog) budget = Math.min(budget, fps != null && fps < 16 ? 4 : 6);
    if (urgentPending > 0 && fps != null && fps >= 16) {
      budget = Math.min(16, budget + (urgentPending > 8 ? 4 : 2));
    }
    let upgraded = 0;
    let tickCap = backlog ? (fps != null && fps < 16 ? 3 : 5) : 12;
    if (urgentPending > 0 && fps != null && fps >= 14) {
      tickCap = Math.max(tickCap, backlog ? 8 : 10);
    }
    const urgentPressure = urgentPending > LOD_URGENT_PRESSURE;
    if (!urgentPressure && urgentPending > 24) tickCap = Math.min(tickCap, 5);
    if (urgentPressure && fps != null && fps >= 12) {
      tickCap = windowLeft;
      budget = Math.min(22, budget + 8);
    }
    if (urgentOnly) {
      tickCap = Math.min(tickCap, urgentPending > 20 ? 6 : 4);
      budget = Math.min(budget, urgentPending > 20 ? 8 : 5);
    }
    if (deferN === 0 && midLod > th.pause * 0.45 && fps != null && fps >= 14 && !urgentOnly) {
      tickCap = Math.max(tickCap, Math.min(18, windowLeft));
      budget = Math.min(20, budget + 6);
    }
    if (lodTextureSurge && urgentPending >= 2) {
      tickCap = Math.max(tickCap, Math.min(windowLeft, fps != null && fps >= 14 ? 16 : 10));
      budget = Math.min(24, budget + (urgentPending > 6 ? 10 : 6));
    }
    tickCap = Math.min(tickCap, windowLeft);

    // Pass 1 — urgent ring rescan (priorité immédiate autour du joueur).
    for (const entry of decorItems.values()) {
      if (performance.now() - t0 >= budget) break;
      if (!entry?.root?.userData?.simpleLod) continue;
      const pid = entry.data?.prefabId;
      if (!pid?.startsWith('tree_')) continue;
      const tx = entry.data?.x ?? entry.root.position.x;
      const tz = entry.data?.z ?? entry.root.position.z;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 > TREE_LOD_URGENT_R2) continue;
      if (!urgentPressure) {
        const burst = _lodBurstMax(d2, fps, false);
        if (!burst) break;
        if (_upgradeTreeLodEntry(entry, px, pz)) {
          upgraded++;
          if (_lodUpgradeWindowCount + upgraded >= windowMax) break;
          if (upgraded >= burst || upgraded >= tickCap) break;
        }
        continue;
      }
      if (_upgradeTreeLodEntry(entry, px, pz)) {
        upgraded++;
        if (_lodUpgradeWindowCount + upgraded >= windowMax) break;
        if (upgraded >= tickCap) break;
      }
    }

    // Pass 2 — mid ring ; throttled si backlog, actif dès que urgent vide.
    let i = 0;
    const allowPass2 = urgentPending === 0 && !urgentPressure && !urgentOnly;
    let pass2Cap = tickCap;
    if (backlog) pass2Cap = Math.min(pass2Cap, fps != null && fps < 18 ? 3 : 6);
    else if (fps != null && fps >= 20) pass2Cap = Math.min(windowLeft - upgraded, 8);
    if (allowPass2 && !_lodUpgradeList?.length) {
      _rebuildLodUpgradeList(px, pz);
    }
    const pass2List = _lodUpgradeList;
    while (allowPass2 && pass2List && i < pass2List.length && performance.now() - t0 < budget
      && upgraded < pass2Cap && _lodUpgradeWindowCount + upgraded < windowMax) {
      const row = pass2List[i++];
      if (!row?.entry?.root?.userData?.simpleLod) continue;
      const tx = row.entry.data?.x ?? row.entry.root.position.x;
      const tz = row.entry.data?.z ?? row.entry.root.position.z;
      const d2 = (tx - px) ** 2 + (tz - pz) ** 2;
      if (d2 <= TREE_LOD_URGENT_R2) continue;
      const burst = _lodBurstMax(d2, fps, false);
      if (!burst) break;
      if (_upgradeTreeLodEntry(row.entry, px, pz)) {
        upgraded++;
        if (upgraded >= burst + 2) break;
      }
    }

    if (upgraded > 0) {
      _compactLodUpgradeList();
      _lodUpgradeWindowCount += upgraded;
    }
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
    const fpsStats = ZS.PerfMonitor?.getStats?.();
    if (fpsStats?.frameMsP95 != null && fpsStats.frameMsP95 > 92) return;
    if (_initVisRevealBusy()) return;
    const fps = ZS.PerfMonitor?.getStats?.()?.fps;
    const stride = (fps != null && fps < 16) || _isSectorLoadBusy() ? 5 : 3;
    if (_nameTagLosAcc % stride !== 0) return;
    remotePlayers.forEach((rp) => _updateNameTagVisibility(rp.mesh, camX, camZ, camHeadY));
    sleepingBodies.forEach((entry) => _updateNameTagVisibility(entry.mesh, camX, camZ, camHeadY));
    deathCorpses.forEach((entry) => _updateNameTagVisibility(entry.mesh, camX, camZ, camHeadY));
  }

  function _decorVisStride() {
    const n = decorItems.size;
    let stride;
    if (_inBootGrace()) stride = 24;
    else if (_postSpawnVisualBusy()) stride = 64;
    else if (n > 2500) stride = 28;
    else if (n > 2200) stride = 22;
    else if (n > 1400) stride = 12;
    else if (n > 800) stride = 8;
    else stride = 4;
    if (_sectorDecorCooldown() || _inPostSectorDrainSoft()) stride += 10;
    const deferN = _decorSpawnDefer.pending.length;
    if (deferN > 350) stride += 8;
    else if (deferN > 200) stride += 4;
    if (_lodPendingCount() > LOD_BACKLOG_MID) stride += 4;
    return stride;
  }

  function _decorVisBatchSize(n) {
    const fps = ZS.PerfMonitor?.getStats?.()?.fps;
    let batch = n;
    if (n <= 1200) return n;
    if (n > 2500) batch = 260;
    else if (n > 2000) batch = 320;
    else batch = 420;
    if (fps != null && fps < 16) batch = Math.floor(batch * 0.65);
    else if (fps != null && fps < 20) batch = Math.floor(batch * 0.82);
    if (_isSectorLoadBusy()) batch = Math.floor(batch * 0.75);
    return batch;
  }

  function _updateDecorVisEntry(entry, id, px, pz, visR2) {
    if (!entry?.root || _isPinnedDecor(entry.data, id)) {
      if (entry?.root) entry.root.visible = true;
      return;
    }
    const dx = (entry.data?.x ?? entry.root.position.x) - px;
    const dz = (entry.data?.z ?? entry.root.position.z) - pz;
    const d2 = dx * dx + dz * dz;
    entry.root.visible = d2 <= visR2;
  }

  function _tickDecorVisibility(px, pz) {
    if (_tickInitVisReveal(px, pz)) return;
    const fpsStats = ZS.PerfMonitor?.getStats?.();
    if (fpsStats?.frameMsMax != null && fpsStats.frameMsMax > 100) return;
    if (fpsStats?.frameMsP95 != null && fpsStats.frameMsP95 > 85) return;
    if (fpsStats?.fps != null && fpsStats.fps < 12) return;
    _decorVisAcc++;
    const stride = _decorVisStride();
    const moved2 = Number.isFinite(_decorVisLastPx)
      ? (px - _decorVisLastPx) ** 2 + (pz - _decorVisLastPz) ** 2
      : Infinity;
    const stationary = moved2 < 2.25;
    const effectiveStride = stationary ? stride * 3 : stride;
    if (_decorVisAcc % effectiveStride !== 0) return;
    _decorVisLastPx = px;
    _decorVisLastPz = pz;
    const t0 = performance.now();
    const visR2 = _decorVisRadius2();
    const n = decorItems.size;
    const batchAll = n <= 1200;
    if (batchAll) {
      decorItems.forEach((entry, id) => _updateDecorVisEntry(entry, id, px, pz, visR2));
    } else {
      if (!_decorVisRing || _decorVisRing.length !== n) {
        _decorVisRing = [];
        decorItems.forEach((entry, id) => _decorVisRing.push([id, entry]));
        _decorVisCursor = 0;
      }
      const batch = _decorVisBatchSize(n);
      const len = _decorVisRing.length;
      let processed = 0;
      let i = _decorVisCursor;
      while (processed < batch && processed < len) {
        const row = _decorVisRing[i];
        if (row) _updateDecorVisEntry(row[1], row[0], px, pz, visR2);
        i++;
        processed++;
        if (i >= len) i = 0;
      }
      _decorVisCursor = i;
    }
    const ms = performance.now() - t0;
    if (ms >= 25 && ZS.LoadLog?.isEnabled?.()) {
      ZS.LoadLog.post('decor-visibility-tick', {
        ms: Math.round(ms),
        decorCount: decorItems.size,
      });
    }
  }

async function _fetchDeferredTreesBatch() {
    const block = _deferLoaderBlockReason();
    if (block) {
      _setTreeFetchGate(block);
      return;
    }
    _setTreeFetchGate('');
    if (_treeDefer.loading || !_treeDefer.hasMore) return;
    const lp = getLocalXZ();
    const th = _lodMidStreamThresholds();
    if (_lodMidRingPendingCount(lp.x, lp.z) > th.high) return;
    _treeDefer.loading = true;
    if (_resetFetchOffsetIfMoved(_treeDefer.sx, _treeDefer.sz)) _treeDefer.offset = 0;
    const minR = _deferTreeRadius();
    const limit = _inStreamSoftStart()
      ? (ZS._isMobile ? 16 : 24)
      : (ZS._isMobile ? 64 : 100);
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
    ZS.LoadLog?.post?.('deferred-trees-start', { x: Math.round(sx), z: Math.round(sz) });
    _fetchDeferredTreesBatch();
  }

  async function _fetchDeferredPropsBatch() {
    const block = _deferLoaderBlockReason();
    if (block) {
      _setTreeFetchGate(block);
      return;
    }
    _setTreeFetchGate('');
    if (_propDefer.loading || !_propDefer.hasMore) return;
    _propDefer.loading = true;
    if (_resetFetchOffsetIfMoved(_propDefer.sx, _propDefer.sz)) _propDefer.offset = 0;
    const minR = _deferTreeRadius();
    const limit = ZS._isMobile ? 48 : 80;
    try {
      const res = await fetch(
        `/api/world/decor-props?x=${encodeURIComponent(_propDefer.sx)}&z=${encodeURIComponent(_propDefer.sz)}`
        + `&minR=${minR}&limit=${limit}&offset=${_propDefer.offset}`,
      );
      if (res.status === 404) {
        _propDefer.hasMore = false;
        return;
      }
      if (!res.ok) {
        _propDefer.hasMore = false;
        return;
      }
      const json = await res.json();
      const list = json.items || [];
      for (let i = 0; i < list.length; i++) _queueDeferredProp(list[i]);
      _propDefer.offset = json.nextOffset ?? (_propDefer.offset + list.length);
      _propDefer.hasMore = !!json.hasMore;
      ZS.DevLog?.sync?.('decor-props-batch', {
        count: list.length,
        offset: _propDefer.offset,
        hasMore: _propDefer.hasMore,
        pending: _decorSpawnDefer.pending.length,
      });
    } catch (e) {
      console.warn('[sync] fetch props lointains', e);
      _propDefer.hasMore = false;
    } finally {
      _propDefer.loading = false;
    }
  }

  function _beginDeferredProps(sx, sz) {
    _resetPropDefer();
    _propDefer.sx = sx;
    _propDefer.sz = sz;
    _propDefer.active = true;
    ZS.LoadLog?.post?.('deferred-props-start', {
      x: Math.round(sx),
      z: Math.round(sz),
      pendingDecor: _decorSpawnDefer.pending.length,
    });
    _fetchDeferredPropsBatch();
  }

  function _tickDeferredPropLoader() {
    if (_postSpawnVisualBusy()) return;
    if (!_decorTickHeavyAllowed()) return;
    const block = _deferLoaderBlockReason();
    if (block) {
      _setTreeFetchGate(block);
      return;
    }
    _setTreeFetchGate('');
    if (!_propDefer.active) return;
    if (_propDefer.hasMore && !_propDefer.loading) {
      _fetchDeferredPropsBatch();
    }
    if (!_propDefer.hasMore && !_propDefer.loading) _propDefer.active = false;
  }

  function _tickDeferredTreeLoader() {
    if (_postSpawnVisualBusy() || _initVisRevealBusy()) return;
    if (!_decorTickHeavyAllowed()) return;
    const block = _deferLoaderBlockReason();
    if (block) {
      _setTreeFetchGate(block);
      return;
    }
    _setTreeFetchGate('');
    if (!_treeDefer.active) return;
    const lp = getLocalXZ();
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const th = _lodMidStreamThresholds();
    if (lodMid > th.high) return;
    let maxSpawn = ZS._isMobile ? 3 : 6;
    if (_inStreamSoftStart()) maxSpawn = Math.min(maxSpawn, ZS._isMobile ? 2 : 3);
    if (lodMid > th.pause * 0.85) maxSpawn = Math.min(maxSpawn, ZS._isMobile ? 3 : 5);
    if (_treeDefer.queue.length < 24 && _treeDefer.hasMore && !_treeDefer.loading) {
      _fetchDeferredTreesBatch();
    }
    if (!_treeDefer.queue.length) {
      if (!_treeDefer.hasMore && !_treeDefer.loading) {
        if (_treeDefer.active) {
          _treeDefer.active = false;
          _scheduleDeferredTreeResnap();
        }
      }
      return;
    }
    const t0 = performance.now();
    const budget = _decorTickBudgetMs() || 8;
    _beginColliderBatch();
    let n = 0;
    let qi = 0;
    while (qi < _treeDefer.queue.length && n < maxSpawn && performance.now() - t0 < budget) {
      const d = _treeDefer.queue[qi];
      const simpleLod = _treeSpawnSimpleLod(d, lp.x, lp.z);
      if (lodMid > th.pause && simpleLod) {
        qi++;
        continue;
      }
      _treeDefer.queue.splice(qi, 1);
      _spawnDecorItem(d, { simpleLod, fastGround: true });
      n++;
    }
    _endColliderBatch();
    if (n > 0 && ZS.LoadLog?.isEnabled?.()) {
      const now = performance.now();
      const done = !_treeDefer.queue.length && !_treeDefer.hasMore;
      if (done || now - _treeDeferLogLast >= 4000) {
        _treeDeferLogLast = now;
        ZS.LoadLog.post('deferred-trees-spawn', {
          spawned: n,
          queue: _treeDefer.queue.length,
          hasMore: _treeDefer.hasMore,
          done,
        });
      }
    }
  }

async function _spawnDecorBatch(list, onProgress, opts = {}) {
    if (!list.length) return;
    const LL = ZS.LoadLog;
    const sliceMs = opts.sliceMs ?? (ZS._isMobile ? 18 : 22);
    const yieldEvery = opts.yieldEvery ?? 8;
    const maxMs = opts.maxMs ?? 90000;
    const simpleLodTrees = !!opts.simpleLodTrees;
    const initFullLodTrees = !!opts.initFullLodTrees;
    const fastGround = !!opts.fastGround;
    const spawnPx = opts.spawnX;
    const spawnPz = opts.spawnZ;
    const slowMs = opts.slowMs ?? 25;
    const t0 = performance.now();
    let sliceStart = performance.now();
    let totalSpawnMs = 0;
    let maxItemMs = 0;
    let maxItemPrefab = '';
    let yieldCount = 0;
    let spawned = 0;
    LL?.stepStart?.('decor-batch', { count: list.length, sliceMs, simpleLodTrees, fastGround });
    _decorBatchDepth++;
    try {
    if (simpleLodTrees && Number.isFinite(spawnPx) && Number.isFinite(spawnPz)) {
      list.sort((a, b) => {
        const ax = Number.isFinite(a.x) ? a.x : spawnPx;
        const az = Number.isFinite(a.z) ? a.z : spawnPz;
        const bx = Number.isFinite(b.x) ? b.x : spawnPx;
        const bz = Number.isFinite(b.z) ? b.z : spawnPz;
        const ad2 = (ax - spawnPx) ** 2 + (az - spawnPz) ** 2;
        const bd2 = (bx - spawnPx) ** 2 + (bz - spawnPz) ** 2;
        const au = ad2 > TREE_LOD_URGENT_R2 ? 1 : 0;
        const bu = bd2 > TREE_LOD_URGENT_R2 ? 1 : 0;
        return au - bu || ad2 - bd2;
      });
    }
    for (let i = 0; i < list.length; i++) {
      if (maxMs > 0 && performance.now() - t0 > maxMs) {
        const rest = list.slice(i);
        if (rest.length) {
          _decorSpawnDefer.pending.push(...rest);
          console.warn('[sync] decor batch — limite temps, différé:', rest.length);
          LL?.mark?.('decor-batch-timeout', { spawned, rest: rest.length, maxMs });
        }
        if (onProgress) onProgress(i, list.length);
        break;
      }
      const d = list[i];
      const ti = performance.now();
      const refX = Number.isFinite(spawnPx) ? spawnPx : (ZS.Network?.getLocalXZ?.()?.x ?? 0);
      const refZ = Number.isFinite(spawnPz) ? spawnPz : (ZS.Network?.getLocalXZ?.()?.z ?? 0);
      _spawnDecorItem(d, {
        simpleLod: simpleLodTrees && (initFullLodTrees
          ? _treeSpawnSimpleLodForInit(d, refX, refZ)
          : _treeSpawnSimpleLod(d, refX, refZ)),
        fastGround,
      });
      const itemMs = performance.now() - ti;
      totalSpawnMs += itemMs;
      spawned++;
      if (itemMs > maxItemMs) {
        maxItemMs = itemMs;
        maxItemPrefab = d.prefabId || '?';
      }
      if (LL?.isEnabled?.() && itemMs >= slowMs) {
        LL.mark('decor-slow', {
          i,
          prefabId: d.prefabId,
          ms: Math.round(itemMs),
          key: String(d.placementKey || '').slice(0, 48),
        });
      }
      const n = i + 1;
      if (onProgress && (n % yieldEvery === 0 || n === list.length)) {
        onProgress(n, list.length);
      }
      if (LL?.isEnabled?.() && (n % 64 === 0 || n === list.length)) {
        LL.mark('decor-progress', {
          done: n,
          total: list.length,
          avgMs: Math.round(totalSpawnMs / n),
          maxMs: Math.round(maxItemMs),
          maxPrefab: maxItemPrefab,
          yields: yieldCount,
        });
      }
      if (performance.now() - sliceStart >= sliceMs) {
        await _yieldToMainLight();
        yieldCount++;
        sliceStart = performance.now();
      }
    }
    const batchMs = Math.round(performance.now() - t0);
    LL?.stepEnd?.('decor-batch', {
      count: spawned,
      total: list.length,
      ms: batchMs,
      avgMs: spawned ? Math.round(totalSpawnMs / spawned) : 0,
      maxMs: Math.round(maxItemMs),
      maxPrefab: maxItemPrefab,
      yields: yieldCount,
    });
    } finally {
      _decorBatchDepth = Math.max(0, _decorBatchDepth - 1);
      if (_decorBatchDepth === 0) {
        _markLodQueueDirty();
        _invalidateDecorVisRing();
      }
    }
  }

  function _prefabResnapGround(prefabId, data) {
    if (!prefabId || data?.grounded === false || data?.shackAnchor) return false;
    if (prefabId.startsWith('build_') || prefabId.startsWith('wreck_')) return false;
    if (prefabId === 'building_survivor_shack' || prefabId === 'storage_chest') return false;
    if (prefabId.startsWith('tree_')) return true;
    if (prefabId.startsWith('rock_') || prefabId === 'spawn_stone') return true;
    if (prefabId.startsWith('spawn_') && !prefabId.includes('offshore')) return true;
    return false;
  }

  function _resnapGroundedWorldDecorNear(px, pz, radius, maxItems) {
    if (!ZS.getDecorGroundHeight) return 0;
    const r2 = (radius ?? 72) ** 2;
    let n = 0;
    for (const entry of decorItems.values()) {
      if (maxItems != null && n >= maxItems) break;
      const { root, data } = entry;
      if (!root) continue;
      const tx = root.position.x;
      const tz = root.position.z;
      const dx = tx - px;
      const dz = tz - pz;
      if (dx * dx + dz * dz > r2) continue;
      if (_resnapOneGroundedDecor(entry)) n++;
    }
    return n;
  }

  function _resnapGroundedWorldDecor() {
    if (!ZS.getDecorGroundHeight) return 0;
    let n = 0;
    for (const entry of decorItems.values()) {
      if (_resnapOneGroundedDecor(entry)) n++;
    }
    return n;
  }

  function _refineFastGroundDecorNear(px, pz, radius, maxItems) {
    if (!ZS.getDecorGroundHeight) return 0;
    const r2 = radius * radius;
    let n = 0;
    for (const { root, data } of decorItems.values()) {
      if (maxItems != null && n >= maxItems) break;
      if (!root?.userData?.fastGroundSpawn) continue;
      const tx = root.position.x;
      const tz = root.position.z;
      const dx = tx - px;
      const dz = tz - pz;
      if (dx * dx + dz * dz > r2) continue;
      const gy = _s01DecorGroundY(data, tx, tz, data.rotY ?? root.rotation?.y ?? 0)
        ?? ZS.getDecorGroundHeight(tx, tz);
      if (!Number.isFinite(gy)) continue;
      root.position.y = gy;
      data.baseY = gy;
      root.userData.fastGroundSpawn = false;
      ZS.refreshDecorCollision?.(root);
      n++;
    }
    return n;
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

  function _resnapS01DecorNear(px, pz, radius) {
    if (!ZS.getDecorGroundHeight && !ZS.sampleShackPadHeight) return 0;
    const r2 = (radius ?? 80) ** 2;
    let n = 0;
    for (const { root, data } of decorItems.values()) {
      const pk = String(data?.placementKey || '');
      if (!pk.startsWith('s01:') || !root) continue;
      const tx = root.position.x;
      const tz = root.position.z;
      const dx = tx - px;
      const dz = tz - pz;
      if (dx * dx + dz * dz > r2) continue;
      const rotY = data.rotY ?? root.userData?.decorSpec?.rotY ?? root.rotation?.y ?? 0;
      const gy = _s01DecorGroundY(data, tx, tz, rotY);
      if (!Number.isFinite(gy)) continue;
      if (Math.abs(root.position.y - gy) < 0.02) continue;
      root.position.y = gy;
      data.baseY = gy;
      ZS.refreshDecorCollision?.(root);
      n++;
    }
    return n;
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

  function _prefabNeedsCollider(prefabId) {
    if (!prefabId) return true;
    if (prefabId.startsWith('tree_') || prefabId.startsWith('rock_')
      || prefabId.startsWith('build_') || prefabId.startsWith('wreck_')) return true;
    const defs = ZS.DECOR_PREFAB_COLLIDERS?.[prefabId];
    return !!(defs && defs.length);
  }

  function _entryNeedsCollider(entry, px, pz, simpleLodMaxR2) {
    const root = entry?.root;
    if (!root?.userData?.decorSpec || root.userData.collide === false) return false;
    const spec = root.userData.decorSpec;
    if (!_prefabNeedsCollider(spec.prefabId)) return false;
    if (root.userData.simpleLod) {
      const dx = (root.position.x || 0) - px;
      const dz = (root.position.z || 0) - pz;
      if (dx * dx + dz * dz > simpleLodMaxR2) return false;
    }
    return true;
  }

  function _colliderRebuildPriority(entry) {
    const pid = entry?.root?.userData?.decorSpec?.prefabId || entry?.data?.prefabId || '';
    if (pid.startsWith('build_') || pid.startsWith('wreck_')) return 0;
    if (pid === 'storage_chest' || pid === 'building_survivor_shack') return 0;
    if (pid.includes('door')) return 0;
    if (pid.startsWith('rock_')) return 1;
    if (pid.startsWith('tree_')) return 3;
    return 2;
  }

  function _partitionDecorColliderEntries(px, pz, nearRadius) {
    const nearR2 = nearRadius * nearRadius;
    const simpleLodMaxR2 = (ZS._isMobile ? 38 : 48) ** 2;
    const near = [];
    const far = [];
    for (const entry of decorItems.values()) {
      const root = entry?.root;
      if (!root?.userData?.decorSpec || root.userData.collide === false) continue;
      const dx = (root.position.x || 0) - px;
      const dz = (root.position.z || 0) - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 <= nearR2) {
        if (_entryNeedsCollider(entry, px, pz, simpleLodMaxR2)) near.push(entry);
        continue;
      }
      if (_entryNeedsCollider(entry, px, pz, simpleLodMaxR2)) far.push(entry);
    }
    return { near, far };
  }

  async function _rebuildDecorCollidersChunked(entries, opts = {}) {
    if (!entries?.length) return { done: 0, deferred: 0 };
    const chunk = opts.chunk ?? (ZS._isMobile ? 12 : 16);
    const rafEvery = opts.rafEvery ?? 1;
    const maxMs = opts.maxMs ?? 0;
    const t0 = performance.now();
    let chunks = 0;
    let done = 0;
    for (let i = 0; i < entries.length; i += chunk) {
      if (maxMs > 0 && performance.now() - t0 > maxMs) {
        const deferred = entries.length - i;
        if (deferred > 0) {
          console.warn('[sync] colliders — limite temps, différé:', deferred);
        }
        if (opts.onProgress) opts.onProgress(done, entries.length);
        return { done, deferred };
      }
      const end = Math.min(i + chunk, entries.length);
      for (let j = i; j < end; j++) {
        const { root } = entries[j];
        if (root?.userData?.decorSpec && root.userData.collide !== false) {
          ZS.refreshDecorCollision?.(root);
        }
        done++;
      }
      if (opts.onProgress) opts.onProgress(done, entries.length);
      chunks++;
      if (opts.rafEvery === 0) continue;
      if (chunks % rafEvery === 0) {
        await new Promise((r) => setTimeout(r, 0));
        await new Promise((r) => requestAnimationFrame(r));
      }
    }
    return { done, deferred: 0 };
  }

  async function _rebuildAllDecorCollidersAsync(opts = {}) {
    const px = opts.playerX ?? _state?.player?.x ?? 0;
    const pz = opts.playerZ ?? _state?.player?.z ?? 0;
    const nearRadius = opts.nearRadius ?? (ZS._isMobile ? 58 : 72);
    const { near, far } = _partitionDecorColliderEntries(px, pz, nearRadius);
    ZS.DevLog?.sync?.('colliders-split', { near: near.length, far: far.length, nearRadius });

    const maxSync = opts.maxSync ?? (ZS._isMobile ? 100 : 180);
    near.sort((a, b) => _colliderRebuildPriority(a) - _colliderRebuildPriority(b));
    const syncNow = near.slice(0, maxSync);
    const deferNear = near.slice(maxSync);
    const idleRest = deferNear.concat(far);

    const syncResult = await _rebuildDecorCollidersChunked(syncNow, opts);
    if (idleRest.length > 0 || syncResult.deferred > 0) {
      const rest = syncResult.deferred > 0
        ? syncNow.slice(syncResult.done).concat(idleRest)
        : idleRest;
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 120));
      idle(() => {
        _rebuildDecorCollidersChunked(rest, {
          chunk: opts.chunk ?? (ZS._isMobile ? 16 : 24),
          rafEvery: 2,
          maxMs: 0,
        }).catch(() => {});
      });
      if (rest.length) {
        console.info('[sync] colliders différés (idle):', rest.length);
      }
    }
  }

  let _decorColliderBgPromise = null;
  let _colliderFarQueue = [];
  let _colliderFarAcc = 0;

  function _markSpawnColliderReady(root) {
    if (root) root.userData.spawnColliderReady = true;
  }

  /** Colliders immédiats autour du spawn — avant init-vis / builds lourds. */
  function _registerSpawnZoneCollidersSync(px, pz, opts = {}) {
    const radius = opts.radius ?? (ZS._isMobile ? 58 : 72);
    const maxMs = opts.maxMs ?? (ZS._isMobile ? 180 : 260);
    const { near } = _partitionDecorColliderEntries(px, pz, radius);
    near.sort((a, b) => _colliderRebuildPriority(a) - _colliderRebuildPriority(b));
    const t0 = performance.now();
    let registered = 0;
    for (const entry of near) {
      if (performance.now() - t0 >= maxMs) break;
      const root = entry?.root;
      if (!root || root.userData.spawnColliderReady) continue;
      try {
        if (root.userData?.decorSpec && root.userData.collide !== false) {
          ZS.refreshDecorCollision?.(root);
          _markSpawnColliderReady(root);
          registered++;
        }
      } catch (_) { /* skip */ }
    }
    _spawnZoneCollidersRegistered = registered;
    return {
      registered,
      total: near.length,
      ms: Math.round(performance.now() - t0),
      partial: registered < near.length,
    };
  }

  function _nearColliderWorkAllowed() {
    if (ZS.isFrameRecovering?.()) return false;
    const s = ZS.PerfMonitor?.getStats?.();
    if (s?.frameMsMax != null && s.frameMsMax > 200) return false;
    return true;
  }

  function _yieldToMainLight() {
    return new Promise((r) => setTimeout(r, 0));
  }

  function _yieldToMain() {
    return new Promise((r) => {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(r, 0));
      else setTimeout(r, 0);
    });
  }

  /** Colliders proches en arrière-plan — le reste via _tickFarColliderDefer. */
  function _runDecorCollidersBackground(opts = {}) {
    if (_decorColliderBgPromise) return _decorColliderBgPromise;
    const px = opts.playerX ?? _state?.player?.x ?? 0;
    const pz = opts.playerZ ?? _state?.player?.z ?? 0;
    const nearRadius = opts.nearRadius ?? (ZS._isMobile ? 58 : 72);
    const { near, far } = _partitionDecorColliderEntries(px, pz, nearRadius);
    _colliderFarQueue = far;
    near.sort((a, b) => _colliderRebuildPriority(a) - _colliderRebuildPriority(b));
    const all = near.filter((entry) => !entry?.root?.userData?.spawnColliderReady);
    const total = all.length;
    if (!total) {
      ZS.endDecorColliderRegisterBatch?.();
      _decorColliderBgPromise = null;
      return Promise.resolve({ total: 0, ms: 0, deferred: far.length });
    }
    let idx = 0;
    const t0 = performance.now();
    const budgetMs = opts.budgetMs ?? 6;
    const onProgress = opts.onProgress;

    _decorColliderBgPromise = new Promise((resolve) => {
      const step = () => {
        const sectorBlock = _isSectorLoadBusy() && !_inBootGrace();
        if (sectorBlock || !_nearColliderWorkAllowed()) {
          const schedPause = typeof requestAnimationFrame === 'function'
            ? (fn) => requestAnimationFrame(fn)
            : (fn) => setTimeout(fn, 16);
          schedPause(step);
          return;
        }
        const sliceStart = performance.now();
        while (idx < all.length && performance.now() - sliceStart < budgetMs) {
          const entry = all[idx++];
          try {
            const { root } = entry;
            if (root?.userData?.spawnColliderReady) continue;
            if (root?.userData?.decorSpec && root.userData.collide !== false) {
              ZS.refreshDecorCollision?.(root);
              _markSpawnColliderReady(root);
            }
          } catch (err) {
            const pid = entry?.data?.prefabId || entry?.root?.userData?.decorSpec?.prefabId;
            console.warn('[sync] collider skip', pid || '?', err?.message || err);
          }
        }
        if (onProgress) onProgress(idx, total);
        if (idx >= all.length) {
          const ms = Math.round(performance.now() - t0);
          console.info('[sync] colliders near', total, ms, 'ms',
            _colliderFarQueue.length ? `(+${_colliderFarQueue.length} lointains différés)` : '');
          ZS.endDecorColliderRegisterBatch?.();
          _decorColliderBgPromise = null;
          resolve({ total, ms, deferred: _colliderFarQueue.length });
          return;
        }
        const sched = typeof requestAnimationFrame === 'function'
          ? (fn) => requestAnimationFrame(fn)
          : (fn) => setTimeout(fn, 0);
        sched(step);
      };
      setTimeout(step, 0);
    });
    return _decorColliderBgPromise;
  }

  function _tickFarColliderDefer(dt) {
    if (!_colliderFarQueue.length) return;
    const plan = _lastBacklogPlan;
    if (plan && !plan.allow.colliderFar && !_inSpawnZoneBoost()) return;
    if (_isSectorLoadBusy() && !_inSpawnZoneBoost()) return;
    const fpsStats = ZS.PerfMonitor?.getStats?.();
    if (fpsStats?.frameMsMax != null && fpsStats.frameMsMax > 140) return;
    if (fpsStats?.frameMsP95 != null && fpsStats.frameMsP95 > 110) return;
    _colliderFarAcc += dt;
    const fps = ZS.PerfMonitor?.getStats?.()?.fps;
    const interval = fps != null && fps < 14 ? 0.32 : 0.14;
    if (_colliderFarAcc < interval) return;
    _colliderFarAcc = 0;
    const budget = fps != null && fps < 16 ? 1 : (ZS._isMobile ? 1 : 2);
    const before = _colliderFarQueue.length;
    _beginColliderBatch();
    for (let i = 0; i < budget && _colliderFarQueue.length; i++) {
      const entry = _colliderFarQueue.shift();
      try {
        if (entry?.root?.userData?.decorSpec && entry.root.userData.collide !== false) {
          ZS.refreshDecorCollision?.(entry.root);
        }
      } catch (_) { /* skip */ }
    }
    _endColliderBatch();
    if (before > 0 && !_colliderFarQueue.length && ZS.LoadLog?.isEnabled?.()) {
      ZS.LoadLog.post('collider-defer-done', { processed: before });
    }
  }

function _schedulePostInitGroundRefine(spawnX, spawnZ) {
    const idle = typeof requestIdleCallback === 'function'
      ? (fn) => requestIdleCallback(fn, { timeout: 5000 })
      : (fn) => setTimeout(fn, 400);
    const tStart = performance.now();
    let snappedTotal = 0;
    let refinePass = 0;
    const slice = () => {
      if (!_spawnReady || _isSectorLoadBusy() || ZS.isFrameRecovering?.()) {
        idle(slice);
        return;
      }
      const t0 = performance.now();
      const budgetMs = ZS._isMobile ? 5 : 8;
      while (performance.now() - t0 < budgetMs) {
        const refined = _refineFastGroundDecorNear(spawnX, spawnZ, 52, 6);
        if (refined > 0) refinePass++;
        else break;
      }
      while (performance.now() - t0 < budgetMs) {
        const snapped = _resnapGroundedWorldDecorNear(spawnX, spawnZ, 72, 4);
        snappedTotal += snapped;
        if (snapped <= 0) break;
      }
      const hasFast = [...decorItems.values()].some(({ root }) => root?.userData?.fastGroundSpawn);
      if (hasFast) {
        idle(slice);
        return;
      }
      const ms = Math.round(performance.now() - tStart);
      if (snappedTotal > 0) console.info('[decor] resnap post-init (proche):', snappedTotal);
      ZS.LoadLog?.post?.('post-init-ground-refine', { ms, snapped: snappedTotal, refinePass });
    };
    idle(slice);
  }

  function _scheduleNearCollidersAfterBoot(spawnX, spawnZ, delayMs) {
    const delay = delayMs ?? (_spawnZoneCollidersRegistered > 0 ? 500 : 2200);
    ZS.LoadLog?.post?.('colliders-post-boot-scheduled', { delayMs: delay, preRegistered: _spawnZoneCollidersRegistered });
    setTimeout(() => {
      if (!_spawnReady || !_scene) return;
      ZS.LoadLog?.stepStart?.('colliders-post-boot');
      ZS.beginDecorColliderRegisterBatch?.();
      _runDecorCollidersBackground({
        playerX: spawnX,
        playerZ: spawnZ,
        budgetMs: ZS._isMobile ? 10 : 14,
      }).then((r) => {
        ZS.LoadLog?.stepEnd?.('colliders-post-boot', r || {});
      });
      console.info('[sync] colliders proches (post-boot)');
    }, delay);
  }

  function _syncZombiesFromInit(data, requestSync) {
    const zList = ZS.Scenario?.filterZombies?.(data?.zombies || []) || data?.zombies || [];
    if (zList.length) ZS.Zombies.syncAll(zList);
    if (requestSync && _socket && !ZS.Scenario?.shouldDelayZombieSync?.()) {
      _socket.emit('request-zombie-sync');
    }
  }

  async function _runPostInitIdle(decorList, structList, data, spawnX, spawnZ) {
    const LL = ZS.LoadLog;
    LL?.post?.('post-init-idle-start', {
      deferredDecor: _decorSpawnDefer.pending.length,
      decorTotal: decorList.length,
    });
    ZS.runPostSpawnVisualBuilds?.(_scene);
    await _yieldToMain();
    LL?.post?.('post-init-build-anchors');
    const buildList = decorList.filter((d) => d.prefabId?.startsWith('build_'));
    ZS.BuildAnchors?.syncRegistryFromDecor?.(buildList);
    await _yieldToMain();
    ZS.reconcileAllBuildFloors?.();
    ZS.BuildingDebug?.dumpShack?.();

    const worldRockCount = decorList.filter(
      (d) => d.prefabId?.startsWith('rock_') && !d.anchorId,
    ).length;
    const spawnedRocks = _countSpawnedWorldRocks();
    if (worldRockCount > 0 && spawnedRocks === 0) {
      _beginColliderBatch();
      _resyncWorldRocksFromApi().then((n) => {
        ZS.resnapAllMinableRocks?.(_scene);
        _endColliderBatch();
        if (n > 0) console.info('[decor] rochers resync API:', n);
      }).catch(() => _endColliderBatch());
    }

    await _yieldToMain();
    for (const st of structList) ZS.Inventory.spawnStructure(st);

    const zList = ZS.Scenario?.filterZombies?.(data.zombies || []) || data.zombies || [];
    if (zList.length) ZS.Zombies.syncAll(zList);
    if (_socket && !ZS.Scenario?.shouldDelayZombieSync?.()) {
      _socket.emit('request-zombie-sync');
    }
    ZS.SpawnIntro?.tryStart?.(_state);
    ZS.BeachIntroPrefabs?.syncIntroCampfireTorchVisibility?.();
    _schedulePostInitGroundRefine(spawnX, spawnZ);
    LL?.post?.('post-init-idle-done', {
      pendingDecor: _decorSpawnDefer.pending.length,
      treeActive: _treeDefer.active,
      propActive: _propDefer.active,
    });
  }

  function isDecorColliderDefer() {
    return _colliderDeferRegister;
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
    _lodPendingCached = 0;
    _lodRingCache.dirty = true;
    _lodRingCache.urgent = 0;
    _lodRingCache.mid = 0;
    _lodRingCache.near = 0;
    _invalidateDecorVisRing();
    _markLodQueueDirty();
    _lastBacklogPlan = null;
    ZS._backlogPlan = null;
    ZS._roadBuildBudgetMs = null;
    ZS.BacklogScheduler?.resetDeferGate?.();
    _resetTreeDefer();
    _resetDecorSpawnDefer();
    _resetPropDefer();
    _resetNearStream();
    _resetDecorStream();
    _resetInitVisReveal();
    _postInitPending = null;
    _lodUpgradeWindowAt = 0;
    _lodUpgradeWindowCount = 0;
    _colliderFarQueue = [];
    _colliderFarAcc = 0;
    _spawnZoneCollidersRegistered = 0;
    _spawnReadyAt = 0;
    ZS.clearDecorColliders?.();
    _lastEquip = undefined;
  }

  function _beginGameInitSync(data) {
    if (_gameInitSyncing) {
      _pendingGameInit = data;
      ZS.LoadLog?.mark?.('game-init-queued', {
        decor: data?.decorItems?.length ?? 0,
        bytes: ZS.LoadLog?.payloadBytes?.(data),
      });
      return;
    }
    _gameInitSyncing = true;
    ZS.LoadLog?.stepStart?.('game-init', {
      decor: data?.decorItems?.length ?? 0,
      items: data?.items?.length ?? 0,
      structures: data?.structures?.length ?? 0,
      players: data?.players?.length ?? 0,
      bytes: ZS.LoadLog?.payloadBytes?.(data),
    });
    _connecting(true, 'Synchronisation…', 'Réception des données serveur', 'sync', 0);
    _finalizeGameInit(data)
      .catch((err) => {
        console.error('[network] game-init failed', err);
        ZS.LoadLog?.stepEnd?.('game-init', { failed: true, err: String(err?.message || err) });
        ZS.LoadLog?.summary?.('game-init-failed');
        _gameInitRetries++;
        if (_gameInitRetries >= _GAME_INIT_MAX_RETRIES) {
          _spawnReady = true;
          _syncPlayerPosToServer();
          _connecting(false);
          ZS.UI?.showNotif?.('Synchronisation incomplète — rechargez la page (Ctrl+F5)');
          return;
        }
        _connecting(
          true,
          'Synchronisation interrompue',
          `Nouvelle tentative ${_gameInitRetries}/${_GAME_INIT_MAX_RETRIES}…`,
          'sync',
          0.08,
        );
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
    const buffered = !_worldReady || !_scene || !_state;
    ZS.LoadLog?.mark?.('game-init-received', {
      buffered,
      worldReady: !!_worldReady,
      decor: data?.decorItems?.length ?? 0,
      bytes: ZS.LoadLog?.payloadBytes?.(data),
    });
    if (buffered) {
      _pendingGameInit = data;
      return;
    }
    _beginGameInitSync(data);
  }

  /** Démarre la connexion socket pendant buildWorld — buffer game-init jusqu'à init(). */
  function preconnect(socket) {
    _socket = socket;
    socket.on('connect', () => {
      ZS.LoadLog?.mark?.('socket-connect', { duringWorldBuild: !_worldReady });
      if (!_worldReady) {
        window.ZS?.Loading?.setPhase?.('socket', 0.72, 'Serveur joint', 'Construction du monde…');
      }
      _syncDecorPrefabRegistry();
    });
    socket.on('game-init', _onGameInitReceived);
  }

async function _finalizeGameInit(data) {
    const L = _loading();
    const LL = ZS.LoadLog;
    const t0 = performance.now();
    LL?.mark?.('game-init-prepare');
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
    if (data.features?.guest) {
      localStorage.setItem('zombie_is_guest', '1');
      localStorage.setItem('zombie_guest_committed', data.features.guestCommitted ? '1' : '0');
      const mins = data.features.guestCommitMinutes || 8;
      ZS.GuestAccount?.injectMenuEntry?.();
      if (!data.features.guestCommitted) {
        ZS.UI?.showNotif?.(`Mode invité — progression sauvegardée après ~${mins} min de jeu`);
      } else {
        ZS.UI?.showNotif?.('Invité enregistré — menu ☰ → Créer mon compte pour votre pseudo');
      }
    } else {
      localStorage.setItem('zombie_is_guest', '0');
    }
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
    ZS.Engine?.ContentLoader?.setStreamingSource?.(spawnX, spawnZ);
    ZS.Engine?.ContentLoader?.setBootPhase?.('sync');
    ZS.Engine?.Telemetry?.setBootPhase?.('sync');
    const mobile = !!ZS._isMobile;
    const syncTotal = decorList.length + itemList.length + structList.length + 2;
    const tSync = performance.now();
    const batchOpts = mobile
      ? { sliceMs: 14, yieldEvery: 8, simpleLodTrees: true, initFullLodTrees: true, fastGround: true, spawnX, spawnZ }
      : { sliceMs: 14, yieldEvery: 10, simpleLodTrees: true, initFullLodTrees: true, fastGround: true, spawnX, spawnZ };
    const { near: nearDecor, deferred: deferredDecor } = _splitDecorForSpawn(decorList, spawnX, spawnZ);
    _decorSpawnDefer.pending.push(...deferredDecor);
    ZS.DevLog?.sync?.('decor-split', {
      near: nearDecor.length,
      deferred: deferredDecor.length,
      total: decorList.length,
      spawn: [Math.round(spawnX), Math.round(spawnZ)],
    });
    LL?.mark?.('decor-split', {
      near: nearDecor.length,
      deferred: deferredDecor.length,
      total: decorList.length,
      items: itemList.length,
      structures: structList.length,
    });

    LL?.stepStart?.('world-items', { count: itemList.length });
    for (const item of itemList) {
      ZS.Inventory.spawnWorldItem(item);
    }
    LL?.stepEnd?.('world-items', { count: itemList.length });

    ZS.setDeferRockSnap?.(true);
    _beginColliderBatch();
    _beginInitVisReveal(spawnX, spawnZ);
    await _spawnDecorBatch(nearDecor, (n, total) => {
      const done = itemList.length + n;
      const t = syncTotal > 0 ? done / syncTotal : 1;
      L?.setPhase?.('sync', t, 'Synchronisation…', `${done} / ${syncTotal} objets`);
    }, batchOpts);
    _recomputeLodPendingFull();
    await _yieldToMainLight();
    const colliderSync = _registerSpawnZoneCollidersSync(spawnX, spawnZ);
    LL?.mark?.('spawn-zone-colliders', colliderSync);
    console.info('[sync] colliders zone spawn', colliderSync.registered, '/', colliderSync.total, colliderSync.ms, 'ms');
    const deferFlush = await _flushSpawnZoneDeferSpawn(spawnX, spawnZ);
    LL?.mark?.('spawn-zone-defer-flush', deferFlush);
    ZS.updateForestDecorVisibility?.(spawnX, spawnZ);
    const decorMs = Math.round(performance.now() - tSync);
    console.info('[sync] décor', nearDecor.length, '/', decorList.length, decorMs, 'ms',
      deferredDecor.length ? `(+${deferredDecor.length} différés)` : '');
    ZS.DevLog?.sync?.('decor-batch', {
      count: nearDecor.length,
      deferred: deferredDecor.length,
      total: decorList.length,
      ms: decorMs,
      mobile,
    });
    ZS.setDeferRockSnap?.(false);
    L?.setPhase?.('sync', 0.92, 'Synchronisation…', 'Inventaire et scénario');
    const idleSnap = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
    idleSnap(() => {
      ZS.resnapAllMinableRocks?.(_scene);
      const n = _resnapS01DecorNear(spawnX, spawnZ, 48);
      if (n > 0) console.info('[decor] resnap s01 proche:', n);
    });
    _endColliderBatch();

    const clientV = window.__ZS_CLIENT_VERSION || '';
    const invDebugBuild = data.serverBuild || data.invDebugBuild || null;
    const tInv = performance.now();
    LL?.stepStart?.('inventory-scenario');
    ZS.ConsumeDebug?.log('game-init-server-build', {
      clientVersion: clientV,
      invDebugBuild,
      wokeFromSleep: !!data.wokeFromSleep,
    });
    if (!invDebugBuild) {
      console.warn('[inv-debug] Serveur ancien (pas invDebugBuild) — npm run dev:server');
      if (localStorage.getItem('zombie_is_admin') === '1') {
        ZS.UI?.showNotif?.('Serveur ancien — npm run dev:server');
      }
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
      if (ZS.ConsumeDebug?.isEnabled?.()) {
        _deferredInvDebugTrace = cmp?.trace;
      }
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
    _syncZombiesFromInit(data, true);
    if (typeof data.onlineCount === 'number') _setOnlineCount(data.onlineCount);
    else _setOnlineCount(remotePlayers.size + 1);
    if (typeof data.playerKills === 'number') {
      _state.player.playerKills = data.playerKills;
      ZS.UI.setPlayerKills(data.playerKills);
    }

    const invMs = Math.round(performance.now() - tInv);
    console.info('[sync] inventaire+scenario', invMs, 'ms');
    LL?.stepEnd?.('inventory-scenario', { ms: invMs });

    L?.setPhase?.('finalize', 0.35, 'Finalisation…', 'Connexion au monde');
    _syncPlayerPosToServer();
    _hadSpawnReady = true;
    _gameInitRetries = 0;

    L?.setPhase?.('finalize', 0.7, 'Finalisation…', 'Première image');
    await _runInitVisRevealHoldFrames(spawnX, spawnZ);

    _spawnReady = true;
    _spawnReadyAt = performance.now();
    if (ZS.Scenario?.needsWakeIntro?.()) {
      ZS.SpawnIntro?.tryStart?.(_state);
    }
    ZS.beginBootRenderWarmup?.(ZS._isMobile ? 14 : 20);
    ZS.LoadLog?.startPostFrameWatch?.(50, 180000);

    const idleColliders = window.requestIdleCallback || ((cb) => setTimeout(cb, 48));
    idleColliders(() => {
      LL?.stepStart?.('colliders-sync');
      _syncWorldColliders(true);
      LL?.stepEnd?.('colliders-sync');
    });

    const initMs = Math.round(performance.now() - t0);
    console.info('[sync] game-init total', initMs, 'ms', '(décor', decorMs, 'ms · inv', invMs, 'ms)');
    ZS.DevLog?.sync?.('game-init-done', {
      ms: initMs,
      decorMs,
      invMs,
      decor: decorList.length,
      nearDecor: nearDecor.length,
      deferredDecor: deferredDecor.length,
      wokeFromSleep: !!data.wokeFromSleep,
      scenarioStep: data.scenario?.step || data.inventory?.scenario?.step,
    });
    LL?.stepEnd?.('game-init', {
      ms: initMs,
      decorMs,
      invMs,
      decor: decorList.length,
      nearDecor: nearDecor.length,
      deferredDecor: deferredDecor.length,
    });
    ZS.DecorGapMonitor?.notifyGameReady?.({
      x: spawnX,
      z: spawnZ,
      deferTotal: _decorSpawnDefer.pending.length,
      nearDecor: nearDecor.length,
      deferredDecor: deferredDecor.length,
      decorTotal: decorList.length,
    });
    ZS.LodGapMonitor?.notifyGameReady?.({
      x: spawnX,
      z: spawnZ,
      simpleLodTotal: _lodPendingCount?.() ?? null,
      simpleLodUrgent: _lodUrgentPendingCount?.(spawnX, spawnZ) ?? null,
      simpleLodMid: _lodMidRingPendingCount?.(spawnX, spawnZ) ?? null,
    });
    LL?.summary?.('game-init');
    L?.setPhase?.('finalize', 1, 'Prêt', '');
    _connecting(false);
    _schedulePostInitWork(spawnX, spawnZ, decorList, structList, data);
    if (!_initVisReveal.active) _runPostInitWorkIfReady();
  }

function init(socket, scene, state) {
    _socket = socket;
    _scene  = scene;
    _state  = state;
    _worldReady = true;
    ZS.LoadLog?.mark?.('network-init', {
      socketConnected: !!socket.connected,
      pendingGameInit: !!_pendingGameInit,
    });
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
      clearTimeout(_disconnectUiTimer);
      _disconnectUiTimer = null;
      if (socket.recovered && _hadSpawnReady) {
        _spawnReady = true;
        return;
      }
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
        ['zombie_token', 'zombie_username', 'zombie_is_admin', 'zombie_is_guest', 'zombie_guest_committed', 'zombie_spawn', 'zombie_health', 'zombie_kills']
          .forEach((k) => localStorage.removeItem(k));
        window.location.href = '/play.html';
        return;
      }
      _connecting(true, 'Serveur indisponible', msg || 'Nouvelle tentative automatique…', 'socket', 0.1);
    });

    socket.on('guest-committed', () => {
      localStorage.setItem('zombie_guest_committed', '1');
      ZS.UI?.showNotif?.('Progression invité sauvegardée — créez un compte pour personnaliser votre pseudo');
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return;
      _spawnReady = false;
      clearTimeout(_disconnectUiTimer);
      _disconnectUiTimer = setTimeout(() => {
        _disconnectUiTimer = null;
        if (_socket?.connected) return;
        if (!_gameInitSyncing) _loading()?.reset?.();
        _connecting(true, 'Connexion perdue', 'Reconnexion en cours…', 'socket', 0.1);
      }, 480);
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
      const ps = ZS.PlayerStance;
      const eyeH = d.crouch ? (ps?.EYE_CROUCH ?? 1.05) : (ps?.EYE_STAND ?? 1.7);
      const groundY = d.y - eyeH;
      const dx = d.x - rp.targetX;
      const dz = d.z - rp.targetZ;
      rp.moveSpeed = Math.hypot(dx, dz) * 20; // speed ~0-6 for walking
      rp.targetX    = d.x;
      rp.targetY    = groundY;
      rp.targetZ    = d.z;
      rp.targetRotY = d.rotY;
      rp.crouching  = !!d.crouch;
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
      if (ZS.Scenario?.shouldDelayZombieSync?.()) return;
      if (d.zombies) {
        const list = ZS.Scenario?.filterZombies?.(d.zombies) ?? d.zombies;
        if (d.full === false) ZS.Zombies.applyDelta(list, d.removed);
        else if (list.length) ZS.Zombies.syncAll(list);
      }
      if (typeof d.time === 'number' && Math.abs(d.time - (_lastWorldTime ?? d.time)) > 0.0005) {
        _lastWorldTime = d.time;
        ZS.setWorldTime(d.time);
      }
    });

    socket.on('world-time', (d) => {
      if (typeof d?.time === 'number') ZS.setWorldTime(d.time);
    });

    socket.on('bed-sleep-end', (d) => {
      ZS.BedSleep?.onServerEnd?.(d?.reason);
      const av = window.ZS?._localAvatar;
      if (av) av.visible = true;
    });

    socket.on('player-bed-sleep', (d) => {
      if (!d?.id) return;
      const rp = remotePlayers.get(d.id);
      if (!rp?.mesh) return;
      if (d.sleeping) {
        rp.mesh.position.set(d.x, _groundYAt(d.x, d.z, d.y), d.z);
        rp.mesh.rotation.y = d.rotY || 0;
        ZS.applySleepPose?.(rp.mesh);
        rp.mesh.userData.bedSleeping = true;
      } else if (rp.mesh.userData.bedSleeping) {
        rp.mesh.userData.bedSleeping = false;
        rp.mesh.rotation.x = 0;
        rp.mesh.position.set(d.x, _groundYAt(d.x, d.z, d.y), d.z);
        rp.mesh.rotation.y = d.rotY || 0;
      }
    });

    socket.on('admin-role-update', (d) => {
      ZS.AdminAuth?.loadFromAuth?.(d);
      if (ZS.AdminHub?.rebuildMenu) ZS.AdminHub.rebuildMenu();
      if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
      if (ZS.AdminPanel?.refreshMenu) ZS.AdminPanel.refreshMenu();
      ZS.UI?.showNotif?.(`Rôle mis à jour : ${d.roleLabel || d.role || '?'}`);
    });

    socket.on('admin-roads-changed', () => {
      ZS.AdminRoads?.reloadAndRefresh?.().catch((err) => {
        console.warn('[roads] live refresh', err);
      });
    });

    socket.on('world-backup-restored', (d) => {
      ZS.UI?.showNotif?.('Monde restauré depuis un backup — rechargement…');
      if (d?.requiresReload) {
        setTimeout(() => { window.location.reload(); }, 1500);
      }
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
      const dist = Math.hypot(d.x - px, d.z - pz);
      const introActive = ZS.Scenario?.isActive?.();
      if (dist > 8 && !introActive) {
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

  let _netTickSlowAcc = 0;
  let _prevStreamX = NaN;
  let _prevStreamZ = NaN;

  // Called every frame from game loop — smooth movement + walk animation
  function tick(dt) {
    const t0 = performance.now();
    const lp = getLocalXZ();
    let vx = 0;
    let vz = 0;
    if (Number.isFinite(_prevStreamX) && dt > 0.001) {
      vx = (lp.x - _prevStreamX) / dt;
      vz = (lp.z - _prevStreamZ) / dt;
    }
    _prevStreamX = lp.x;
    _prevStreamZ = lp.z;
    ZS.Engine?.ContentLoader?.setStreamingSource?.(lp.x, lp.z, { vx, vz });
    ZS.Engine?.ChunkStreamer?.setStreamingSource?.(lp.x, lp.z);
    _updateExplorationBoost(lp.x, lp.z);
    _updateApproachPrefetch(lp.x, lp.z, vx, vz);
    _updateCriticalSurge(lp.x, lp.z, vx, vz);
    _updateLodTextureSurge(lp.x, lp.z);
    const gov = ZS.Engine?.BudgetGovernor;
    const criticalSurge = _criticalSurgeActive?.() ?? false;
    const lodTextureSurge = _lodTextureSurgeActive?.() ?? false;
    let decorBudget = gov?.getDecorBudget?.({
      isMobile: ZS._isMobile,
      frameRecovering: ZS.isFrameRecovering?.(),
      postSpawnVisualBusy: _postSpawnVisualBusy?.(),
      initVisActive: _initVisRevealBusy?.(),
      fps: ZS.PerfMonitor?.getStats?.()?.fps,
      bootWarmup: ZS.getBootRenderWarmup?.() ?? 0,
      criticalSurge,
      lodTextureSurge,
      decorGapActive: !!ZS.Engine?.DecorGapMonitor?.hasActiveGap?.(),
      lodGapActive: !!ZS.Engine?.LodGapMonitor?.hasActiveGap?.(),
      decorGapEmergency: !!ZS.Engine?.DecorGapMonitor?.hasEmergencyGap?.(),
    }) ?? _decorTickBudgetMs();
    const plan = _buildBacklogPlan(lp.x, lp.z);
    _tickDecorStreamFetch(lp.x, lp.z, dt, vx, vz);
    _maybePeriodicDeferPrune(lp.x, lp.z, dt);
    const gapSample = _sampleDecorGap(lp.x, lp.z);
    ZS.Engine?.DecorGapMonitor?.tick?.(dt, {
      px: lp.x,
      pz: lp.z,
      vx,
      vz,
      ...gapSample,
      initVisActive: _initVisRevealBusy?.(),
      postSpawnBusy: _postSpawnVisualBusy?.(),
      approachPrefetch: _approachPrefetchActive?.() ?? false,
      explorationBoost: _explorationBoostActive?.() ?? false,
      criticalSurge: _criticalSurgeActive?.() ?? false,
      forestHiddenNear: !!ZS.Engine?.ChunkStreamer?.hasHiddenNear?.(lp.x, lp.z),
      streamGate: _streamGate?.reason || null,
    });
    const lodSample = _sampleLodGap(lp.x, lp.z);
    ZS.Engine?.LodGapMonitor?.tick?.(dt, {
      px: lp.x,
      pz: lp.z,
      vx,
      vz,
      ...lodSample,
      initVisActive: _initVisRevealBusy?.(),
      postSpawnBusy: _postSpawnVisualBusy?.(),
    });
    if (decorBudget > 0) {
      const runLod = () => { if (performance.now() - t0 < decorBudget) _tickLodUpgrades(lp.x, lp.z); };
      const runDefer = () => { _tickDecorSpawnDefer(lp.x, lp.z, decorBudget - (performance.now() - t0)); };
      const runVis = () => { if (performance.now() - t0 < decorBudget) _tickDecorVisibility(lp.x, lp.z); };
      const runLoaders = () => {
        if (performance.now() - t0 < decorBudget) _tickDeferredTreeLoader();
        if (performance.now() - t0 < decorBudget) _tickDeferredPropLoader();
      };
      const frameRunner = ZS.Engine?.FrameRunner;
      if (frameRunner?.runDecorWorkers) {
        frameRunner.runDecorWorkers({
          budgetMs: decorBudget,
          t0,
          plan,
          workers: { lod: runLod, defer: runDefer, vis: runVis, loaders: runLoaders },
        });
      } else {
        const deferN = plan?.pressure.defer ?? _decorSpawnDefer.pending.length;
        const priority = plan?.priority ?? 'balanced';
        if (priority === 'lod') {
          runLod();
          if (deferN > 120 && performance.now() - t0 < decorBudget) runDefer();
          if (performance.now() - t0 < decorBudget) runVis();
          if (performance.now() - t0 < decorBudget) runLoaders();
        } else if (priority === 'defer') {
          runDefer();
          if (performance.now() - t0 < decorBudget) runVis();
          if (performance.now() - t0 < decorBudget) runLoaders();
        } else {
          const phase = (_netTickSlowAcc++ % 3);
          if (phase === 0) { runLod(); runDefer(); runVis(); runLoaders(); }
          else if (phase === 1) { runDefer(); runLod(); runVis(); runLoaders(); }
          else { runVis(); runLod(); runDefer(); runLoaders(); }
        }
      }
    }
    _tickFarColliderDefer(dt);
    const tAfterDecor = performance.now();
    const cam = ZS._camera;
    if (cam) _tickNameTagOcclusion(cam.position.x, cam.position.z, cam.position.y);

    const LERP = 12;
    const skipRemoteAnim = ZS.isFrameRecovering?.();
    remotePlayers.forEach((rp) => {
      const mesh = rp.mesh;

      // Interpolate position
      mesh.position.x += (rp.targetX - mesh.position.x) * Math.min(1, LERP * dt);
      mesh.position.y += (rp.targetY - mesh.position.y) * Math.min(1, LERP * dt);
      mesh.position.z += (rp.targetZ - mesh.position.z) * Math.min(1, LERP * dt);

      const crouchScale = ZS.PlayerStance?.CROUCH_MESH_SCALE ?? 0.72;
      const targetScaleY = rp.crouching ? crouchScale : 1;
      mesh.scale.y += (targetScaleY - mesh.scale.y) * Math.min(1, LERP * dt);

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
      if (skipRemoteAnim && dist2 > REMOTE_ANIM_R2 * 0.36) return;
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
    const decorMs = tAfterDecor - t0;
    const totalMs = performance.now() - t0;
    if (totalMs >= 20 && ZS.LoadLog?.isEnabled?.()) {
      _netTickSlowAcc++;
      if (_netTickSlowAcc % 20 === 1) {
        ZS.LoadLog.post('network-tick-slow', {
          totalMs: Math.round(totalMs),
          decorMs: Math.round(decorMs),
          remoteMs: Math.round(totalMs - decorMs),
          decorBudget,
          pendingDecor: _decorSpawnDefer.pending.length,
          lodPending: _lodPendingCount(),
          treeQueue: _treeDefer.queue.length,
          streamGate: _streamGate.reason || null,
          treeGate: _treeFetchGate.reason || null,
          colliderFar: _colliderFarQueue.length,
          n: _netTickSlowAcc,
        });
      }
    }
  }

  let _lastSent = 0;
  function sendMove(x, y, z, rotY, force) {
    if (!_spawnReady || !_socket) return;
    if (!force && _state?.player?.dead) return;
    const now = Date.now();
    if (!force && now - _lastSent < 50) return; // 20 Hz max
    _lastSent = now;
    _socket.emit('move', {
      x, y, z, rotY,
      crouch: !!_state?.player?.crouching,
    });
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
      attack:     null,
      crouching:  !!p.crouch,
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

  function _getPerfContext() {
    const lp = getLocalXZ();
    let simpleLod = 0;
    let urgentLod = 0;
    for (const entry of decorItems.values()) {
      if (!entry?.root?.userData?.simpleLod) continue;
      simpleLod++;
      const pid = entry.data?.prefabId;
      if (!pid?.startsWith('tree_')) continue;
      const tx = entry.data?.x ?? entry.root.position.x;
      const tz = entry.data?.z ?? entry.root.position.z;
      const d2 = (tx - lp.x) ** 2 + (tz - lp.z) ** 2;
      if (d2 <= TREE_LOD_URGENT_R2) urgentLod++;
    }
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const th = _lodMidStreamThresholds();
    return {
      decorSpawned: decorItems.size,
      decorPending: _decorSpawnDefer.pending.length,
      treeQueue: _treeDefer.queue.length,
      simpleLodPending: simpleLod,
      simpleLodMidPending: lodMid,
      lodMidThresholds: th,
      urgentLodPending: urgentLod,
      lodQueue: _lodUpgradeList?.length ?? null,
      streamActive: _nearStream.active,
      streamGate: _streamGate.reason || null,
      streamSoftExtra: _streamSoftExtraUntil > performance.now(),
      treeFetchGate: _treeFetchGate.reason || null,
      decorBudget: _decorTickBudgetMs(),
      colliderFar: _colliderFarQueue.length,
      sectorLoadBusy: _isSectorLoadBusy(),
      sectorCooldown: _sectorDecorCooldown(),
      postSectorDrain: _inPostSectorDrainSoft(),
      initVisReveal: _initVisReveal.active ? _initVisReveal.phase : null,
      frameRecovering: !!ZS.isFrameRecovering?.(),
    };
  }

  window.ZS = window.ZS || {};
  ZS.TREE_LOD_URGENT_R = TREE_LOD_URGENT_R;
  ZS.treeWantsSimpleLodAt = _treeWantsSimpleLodAt;
  ZS._markSectorDecorCooldown = _markSectorDecorCooldown;
  ZS.markSectorDecorCooldown = _markSectorDecorCooldown;
  const _networkApi = {
    preconnect, init, tick, getLocalXZ, sendMove, sendShoot, sendRespawn, sendDied, sendSurvival, sendEquip, sendAttack, sendFootstep,
    notifyDecorChop, notifyDecorMine, requestDecorDoorToggle, requestDecorDoorLock, requestDecorDoorUnlock,
    getLocalUsername, syncWorldColliders: _syncWorldColliders, isDecorColliderDefer,
    isColliderSyncBatch: () => _colliderSyncDepth > 0,
    findNearestSleeping,
    findNearestLootable,
    getSocket: () => _socket,
    isSpawnReady: () => _spawnReady,
    isInitVisRevealHold: _initVisRevealHoldPhase,
    isInitVisRevealBusy: _initVisRevealBusy,
    isSectorLoadBusy: _isSectorLoadBusy,
    requestStorageOpen, requestStorageClose, requestStorageDeposit, requestStorageWithdraw, requestStorageMove,
    requestStorageTakeAll,
    notifyIntroReadable,
    requestStorageHit, requestStoragePickup,
    requestUseItem, requestInvDebugSnapshot, requestCraftQueue, requestCraftCancel,
    requestBuildHit,
    requestIntroTorchPickup,
    requestCampfireCook,
    requestCampRest,
    requestBedSleepStart,
    requestBedSleepWake,
    getDecorRoot: _getDecorRoot,
    getDecorData: _getDecorData,
    getDecorEntry: _getDecorEntry,
    forEachDecor: _forEachDecor,
    patchDecorFloorHeight: _patchDecorFloorHeight,
    syncDecorFloorHeight,
    resolveRemotePlayerCollision,
    getPerfContext: _getPerfContext,
    getLodUrgentPending: () => {
      const lp = getLocalXZ();
      return _lodUrgentPendingCount(lp.x, lp.z);
    },
    getDeferPendingCount: () => _decorSpawnDefer.pending.length,
  };
  ZS.Network = Object.assign(ZS.Network || {}, _networkApi);
  ZS.networkTick = tick;
  if (typeof ZS.Network.tick !== 'function') {
    console.error('[network] API invalide — tick absent après init');
  }
}());
