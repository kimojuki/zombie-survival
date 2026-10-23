// Spawn item decor unique
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
