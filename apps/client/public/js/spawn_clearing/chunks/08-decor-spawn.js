// spawnDecorPrefab — extrait de spawn_clearing.js (IIFE)
function spawnDecorPrefab(scene, prefabId, x, y, z, opts = {}) {
    const prefab = DECOR_PREFABS[prefabId];
    if (!scene || !prefab) return null;
    const isWreck = prefabId.startsWith('wreck_');
    const isMinableRock = prefabId === 'spawn_stone' || prefabId.startsWith('rock_');
    const sink = Number.isFinite(opts.wreckSink) ? opts.wreckSink : 0;
    const s = Number.isFinite(opts.scale) ? opts.scale : 1;
    const groundAt = (px, pz) => (ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(px, pz)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(px, pz) : 0));
    let groundLift = Number.isFinite(opts.groundLift) ? opts.groundLift : null;
    if (isMinableRock && groundLift == null) groundLift = 0;
    if (groundLift == null) groundLift = 0;
    const isBuildFloor = prefab.buildKind === 'floor';
    const isBuildCeiling = prefab.buildKind === 'ceiling';
    const terrainY = ZS.getTerrainHeight
      ? ZS.getTerrainHeight(x || 0, z || 0)
      : groundAt(x || 0, z || 0);
    const groundY = terrainY;
    let deckY;
    if (isBuildFloor) {
      let buildLevel = Number.isFinite(opts.buildLevel) ? Math.max(0, opts.buildLevel) : 0;
      const rawY = Number.isFinite(opts.baseY) ? opts.baseY : (Number.isFinite(y) ? y : null);
      if (ZS.BuildAnchors?.resolveFloorDeckY) {
        deckY = ZS.BuildAnchors.resolveFloorDeckY(
          x || 0, z || 0,
          rawY ?? (terrainY + buildLevel * 2.6),
          opts.decorId || null,
          buildLevel,
        );
        buildLevel = Math.max(0, Math.min(8, Math.floor(Number(opts.buildLevel) || 0)));
      } else {
        deckY = rawY ?? (terrainY + buildLevel * 2.6);
      }
      opts = { ...opts, buildLevel };
    } else if (isBuildCeiling) {
      const buildLevel = Number.isFinite(opts.buildLevel) ? Math.max(0, opts.buildLevel) : 0;
      const rawY = Number.isFinite(opts.baseY) ? opts.baseY : (Number.isFinite(y) ? y : null);
      if (ZS.BuildAnchors?.resolveCeilingDeckY) {
        deckY = ZS.BuildAnchors.resolveCeilingDeckY(x || 0, z || 0, buildLevel)
          ?? rawY
          ?? (terrainY + (buildLevel + 1) * 2.6);
      } else {
        deckY = rawY ?? (terrainY + (buildLevel + 1) * 2.6);
      }
      opts = { ...opts, buildLevel };
    } else if (prefab.buildKind === 'wall' || prefab.buildKind === 'door' || prefab.buildKind === 'stair'
        || prefabId === 'storage_chest') {
      const buildLevel = Number.isFinite(opts.buildLevel) ? Math.max(0, opts.buildLevel) : 0;
      const rawY = Number.isFinite(opts.baseY) ? opts.baseY : (Number.isFinite(y) ? y : terrainY);
      if (ZS.BuildAnchors?.resolveStructureBaseY) {
        deckY = ZS.BuildAnchors.resolveStructureBaseY(x || 0, z || 0, rawY, buildLevel);
      } else {
        deckY = rawY;
      }
      opts = { ...opts, buildLevel };
    } else if (prefabId === 'building_survivor_shack' && opts.grounded !== false) {
      deckY = sampleShackPadHeight(x || 0, z || 0, opts.rotY || 0) + (Number.isFinite(groundLift) ? groundLift : 0);
    } else if (Number.isFinite(opts.baseY)) {
      deckY = opts.baseY;
    } else if (_prefabUsesClientGround(prefabId, opts)) {
      deckY = getDecorGroundHeight(x || 0, z || 0, { groundLift });
    } else if (Number.isFinite(y) && y > 0.25) {
      deckY = y;
    } else if (opts.grounded !== false && !isWreck) {
      deckY = getDecorGroundHeight(x || 0, z || 0, { groundLift });
    } else {
      deckY = y || 0;
    }
    if (isBuildFloor && !ZS.BuildAnchors?.resolveFloorDeckY) {
      deckY = Number.isFinite(opts.baseY) ? opts.baseY : (terrainY + (opts.buildLevel || 0) * 2.6);
    } else if ((prefab.buildKind === 'wall' || prefab.buildKind === 'door' || prefab.buildKind === 'stair'
        || prefabId === 'storage_chest')
        && !ZS.BuildAnchors?.resolveStructureBaseY
        && ZS.BuildAnchors?.clampStructureBaseY) {
      const buildLevel = Number.isFinite(opts.buildLevel) ? Math.max(0, opts.buildLevel) : 0;
      deckY = ZS.BuildAnchors.clampStructureBaseY(x || 0, z || 0, deckY, buildLevel);
    } else if (prefabId === 'storage_chest' && ZS.BuildAnchors?.clampStructureBaseY) {
      const buildLevel = Number.isFinite(opts.buildLevel) ? Math.max(0, opts.buildLevel) : 0;
      deckY = ZS.BuildAnchors.clampStructureBaseY(x || 0, z || 0, deckY, buildLevel);
    }
    const supportGroundY = Number.isFinite(opts.supportGroundY) ? opts.supportGroundY : terrainY;
    const supportDrop = isBuildFloor
      ? Math.max(0, deckY - supportGroundY)
      : 0;
    const groundedY = isWreck
      ? groundY - sink
      : deckY;
    const root = new THREE.Group();
    root.position.set(x || 0, groundedY, z || 0);
    root.rotation.set(
      opts.rotX || 0,
      prefabId === 'storage_chest' ? 0 : (opts.rotY || 0),
      opts.rotZ || 0,
    );
    root.scale.setScalar(s);
    root.userData.prefabId = prefabId;
    root.userData.collide = opts.collide !== false;

    const decorId = opts.decorId || `static_${prefabId}_${(x || 0).toFixed(1)}_${(z || 0).toFixed(1)}`;
    root.userData.decorId = decorId;

    scene.add(root);
    const isTree = prefabId.startsWith('tree_');
    const lp = ZS.Network?.getLocalXZ?.();
    const treeDist2 = lp
      ? ((x || 0) - lp.x) ** 2 + ((z || 0) - lp.z) ** 2
      : 0;
    const urgentR = window.ZS?.TREE_LOD_URGENT_R ?? 64;
    const urgentR2 = urgentR * urgentR;
    const useSimpleLod = isTree && (
      opts.simpleLod === true
      || (opts.simpleLod == null && treeDist2 > urgentR2)
    );
    if (useSimpleLod && ZS.TreePrefabs?.buildSimple) {
      ZS.TreePrefabs.buildSimple(root, prefabId);
      root.userData.simpleLod = true;
    } else {
      prefab.build(root, isBuildFloor ? { supportDrop } : opts);
    }

    const interactRole = opts.interactRole || INTERACT_ROLE_BY_PREFAB[prefabId] || null;
    const decorSpec = {
        decorId,
        kind: 'prefab',
        prefabId,
        x: root.position.x,
        z: root.position.z,
        baseY: root.position.y,
        rotY: _decorYawFromRoot(root),
        rotZ: root.rotation.z,
        scale: s,
        wreckTilt: isWreck ? root.rotation.z : undefined,
        doorOpen: !!opts.doorOpen,
        railLen: Number.isFinite(opts.railLen) ? opts.railLen : undefined,
        rotX: Number.isFinite(opts.rotX) ? opts.rotX : undefined,
        interactRole: interactRole || undefined,
      };
    root.userData.decorSpec = decorSpec;

    if (interactRole) {
      DECOR_INTERACTS.set(decorId, {
        root,
        role: interactRole,
        prefabId,
      });
    }

    if (root.userData.doorPivot) {
      const entry = {
        root,
        pivot: root.userData.doorPivot,
        open: !!opts.doorOpen,
        targetOpen: !!opts.doorOpen,
        openAngle: 0,
        doorOpenAngle: Number.isFinite(root.userData.doorPivot.userData?.openAngle)
          ? root.userData.doorPivot.userData.openAngle
          : DOOR_OPEN_ANGLE,
        locked: !!opts.locked,
        lockId: opts.lockId || null,
        lockOwner: opts.lockOwner || null,
      };
      DECOR_DOORS.set(decorId, entry);
      _setDoorVisual(entry, !!opts.doorOpen, { instant: true });
      if (opts.locked) {
        setDecorDoorLockState(decorId, {
          locked: true,
          lockId: opts.lockId,
          lockOwner: opts.lockOwner,
        });
      }
    }
    if (root.userData.isStorage) {
      const entry = {
        root,
        lidPivot: root.userData.storageLidPivot || null,
        open: !!opts.storageOpen,
        targetOpen: !!opts.storageOpen,
        openAngle: 0,
      };
      DECOR_STORAGES.set(decorId, entry);
      setDecorStorageState(decorId, !!opts.storageOpen, { instant: true });
    }
    if (root.userData.isReadableSign) {
      DECOR_SIGNS.set(decorId, {
        root,
        signKind: root.userData.signKind || opts.signKind || 'beach_safe_zone',
      });
    }

    if (prefab.buildKind) {
      DECOR_BUILDS.set(decorId, {
        root,
        prefabId,
        hw: (prefab.w || 3) / 2,
        hd: (prefab.t || prefab.w || 3) / 2,
      });
      root.traverse((o) => {
        if (o.isMesh) o.userData.decorId = decorId;
      });
    }

    if (opts.collide !== false && !isMinableRock) {
      _registerDecorCollision(decorId, decorSpec, root);
    }

    if (prefab.buildKind === 'floor') {
      ZS.registerUpperFloor?.(root.position.x, root.position.z, prefab.w / 2, prefab.t / 2, root.position.y + prefab.h);
      const buildLevel = Number.isFinite(opts.buildLevel)
        ? Math.max(0, opts.buildLevel)
        : 0;
      ZS.BuildAnchors?.registerFoundation(decorId, root.position.x, root.position.z, root.position.y, {
        hw: prefab.w / 2,
        hd: prefab.t / 2,
        level: buildLevel,
      });
      const sentY = Number.isFinite(opts.baseY) ? opts.baseY : y;
      if (Number.isFinite(sentY) && Math.abs(sentY - root.position.y) > 0.05) {
        ZS.Network?.patchDecorFloorHeight?.(decorId, root.position.y);
        ZS.Network?.syncDecorFloorHeight?.(decorId, root.position.y);
      }
      reconcileAllBuildFloors();
    } else if (prefab.buildKind === 'ceiling') {
      ZS.registerUpperFloor?.(
        root.position.x, root.position.z,
        prefab.w / 2, prefab.t / 2,
        root.position.y + prefab.h,
      );
      const buildLevel = Number.isFinite(opts.buildLevel) ? Math.max(0, opts.buildLevel) : 0;
      ZS.BuildAnchors?.registerFoundation(decorId, root.position.x, root.position.z, root.position.y + prefab.h, {
        hw: prefab.w / 2,
        hd: prefab.t / 2,
        level: buildLevel + 1,
      });
    } else if (prefab.buildKind === 'wall' || prefab.buildKind === 'door' || prefab.buildKind === 'stair') {
      const sentY = Number.isFinite(opts.baseY) ? opts.baseY : y;
      if (Number.isFinite(sentY) && Math.abs(sentY - root.position.y) > 0.05) {
        ZS.Network?.patchDecorFloorHeight?.(decorId, root.position.y);
        ZS.Network?.syncDecorFloorHeight?.(decorId, root.position.y);
      }
      if (prefab.buildKind === 'stair') {
        const rotY = root.rotation.y || 0;
        const alongZ = Math.abs(Math.cos(rotY)) > 0.5;
        const sign = alongZ ? Math.cos(rotY) : Math.sin(rotY);
        const lo = sign >= 0 ? root.position.y : root.position.y + prefab.h;
        const hi = sign >= 0 ? root.position.y + prefab.h : root.position.y;
        ZS.registerRamp?.(
          root.position.x,
          root.position.z,
          alongZ ? prefab.w / 2 : prefab.t / 2,
          alongZ ? prefab.t / 2 : prefab.w / 2,
          lo,
          hi,
          alongZ ? 'z' : 'x'
        );
      }
    } else if (prefabId === 'storage_chest') {
      const sentY = Number.isFinite(opts.baseY) ? opts.baseY : y;
      if (Number.isFinite(sentY) && Math.abs(sentY - root.position.y) > 0.05) {
        ZS.Network?.patchDecorFloorHeight?.(decorId, root.position.y);
        ZS.Network?.syncDecorFloorHeight?.(decorId, root.position.y);
      }
    }

    if (prefabId.startsWith('tree_') && ZS.registerChoppableTree) {
      if (!ZS.Options?.getProfile?.()?.shadows) {
        root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
      }
      ZS.registerChoppableTree(scene, root, root.position.x, root.position.z, decorId, {
        prefabId,
        woodMax: opts.woodMax,
        woodRemaining: opts.woodRemaining,
        growthPhase: Number.isFinite(opts.growthPhase) ? opts.growthPhase : 4,
        baseScale: s,
      });
    }

    if (isMinableRock && ZS.registerMinableRock) {
      ZS.registerMinableRock(scene, root, root.position.x, root.position.z, decorId, {
        prefabId,
        stoneMax: opts.stoneMax,
        stoneRemaining: opts.stoneRemaining,
        baseScale: s,
      });
    }

    if (isMinableRock && !_deferRockSnap) _snapMinableRockToGround(root, x, z);

    root.traverse((o) => {
      if (o.isMesh) o.userData.decorId = decorId;
    });

    return root;
  }

  /**
   * Camp de spawn complet — zones lisibles :
   *   centre = feu (campfire.js)
   *   sud (-Z) = pile de bois (vers le sentier)
   *   est    = caisse de ravitaillement
   *   ouest  = couchage (sac + bedroll)
   *   nord (+Z) = 2 souches assises
   */
