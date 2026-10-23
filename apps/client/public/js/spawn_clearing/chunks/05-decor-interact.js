// Portes, storage, nearest, hit XZ — extrait de spawn_clearing.js (IIFE)
function _decorYawFromRoot(root) {
    if (root?.userData?.prefabId === 'storage_chest') {
      const inner = root.children[0];
      if (inner) return inner.rotation.y || 0;
    }
    return root.rotation?.y ?? 0;
  }

  /** Garde decorSpec aligné sur le pivot Three.js (cx/cz/rotY/baseY des colliders). */
  function _syncDecorSpecFromRoot(root) {
    const spec = root?.userData?.decorSpec;
    if (!spec || !root.position) return spec;
    spec.x = root.position.x;
    spec.z = root.position.z;
    spec.baseY = root.position.y;
    spec.rotY = _decorYawFromRoot(root) ?? spec.rotY ?? 0;
    spec.rotZ = root.rotation?.z ?? spec.rotZ ?? 0;
    if (Number.isFinite(root.rotation?.x)) spec.rotX = root.rotation.x;
    spec.scale = root.scale?.x ?? spec.scale ?? 1;
    return spec;
  }

  function _registerDecorCollision(decorId, spec, root, opts = {}) {
    if (!decorId || !ZS.registerDecorColliders || !ZS.buildDecorColliders) return;
    const force = !!opts.force;
    if (!force && ZS.Network?.isDecorColliderDefer?.()) return;
    if (root?.userData?.decorSpec) spec = _syncDecorSpecFromRoot(root);
    const cols = ZS.buildDecorColliders(spec);
    ZS.registerDecorColliders(decorId, cols);
    if (spec?.prefabId === 'building_survivor_shack') {
      ZS.BuildingDebug?.onShackCollidersRegistered?.(spec, cols, root || null);
    }
    if (!ZS.Network?.isColliderSyncBatch?.()) {
      ZS.Network?.syncWorldColliders?.();
    }
  }

  function _refreshDecorCollision(root) {
    if (!root?.userData?.decorSpec) return;
    if (root.userData.collide === false) return;
    const spec = _syncDecorSpecFromRoot(root);
    _registerDecorCollision(spec.decorId, spec, root, { force: true });
  }

  function _setDoorVisual(entry, open, opts = {}) {
    if (!entry?.pivot) return false;
    const wantOpen = !!open;
    const prevOpen = !!entry.open;
    entry.open = wantOpen;
    entry.targetOpen = wantOpen;
    const openTarget = Number.isFinite(entry.doorOpenAngle) ? entry.doorOpenAngle : DOOR_OPEN_ANGLE;
    const doorAngle = wantOpen ? openTarget : 0;
    entry.root.userData.doorOpen = wantOpen;
    if (entry.root.userData.decorSpec) {
      entry.root.userData.decorSpec.doorOpen = wantOpen;
      entry.root.userData.decorSpec.doorAngle = doorAngle;
    }
    if (opts.instant) {
      entry.openAngle = wantOpen ? openTarget : 0;
      entry.pivot.rotation.y = entry.openAngle;
    } else if (prevOpen !== wantOpen) {
      const px = entry.root?.position?.x;
      const pz = entry.root?.position?.z;
      const sp = (Number.isFinite(px) && Number.isFinite(pz))
        ? ZS.Audio?.spatialAt?.(px, pz)
        : null;
      ZS.Audio?.door?.(wantOpen ? 1 : 0, sp?.vol ?? 1, sp?.pan);
    }
    _refreshDecorCollision(entry.root);
    return true;
  }

  function _ensureDoorLockMesh(entry) {
    if (!entry?.pivot) return null;
    if (!entry.lockMesh) {
      const g = new THREE.Group();
      g.name = 'door-lock';
      const mat = new THREE.MeshLambertMaterial({ color: 0x666677 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), mat);
      body.position.set(0.52, 1.02, 0.2);
      g.add(body);
      const shackle = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.014, 6, 12, Math.PI),
        mat,
      );
      shackle.rotation.z = Math.PI / 2;
      shackle.position.set(0.52, 1.14, 0.2);
      g.add(shackle);
      entry.pivot.add(g);
      entry.lockMesh = g;
    }
    return entry.lockMesh;
  }

  function setDecorDoorLockState(decorId, data = {}) {
    const entry = DECOR_DOORS.get(decorId);
    if (!entry || !entry.root.parent) return false;
    entry.locked = !!data.locked;
    entry.lockId = data.lockId || null;
    entry.lockOwner = data.lockOwner || null;
    if (entry.root.userData.decorSpec) {
      entry.root.userData.decorSpec.locked = entry.locked;
      entry.root.userData.decorSpec.lockId = entry.lockId;
      entry.root.userData.decorSpec.lockOwner = entry.lockOwner;
    }
    const mesh = _ensureDoorLockMesh(entry);
    if (mesh) mesh.visible = entry.locked;
    return true;
  }

  function tickDecorDoors(dt) {
    for (const entry of DECOR_DOORS.values()) {
      if (!entry?.pivot?.parent) continue;
      const openTarget = Number.isFinite(entry.doorOpenAngle) ? entry.doorOpenAngle : DOOR_OPEN_ANGLE;
      const target = entry.targetOpen ? openTarget : 0;
      let angle = Number.isFinite(entry.openAngle) ? entry.openAngle : entry.pivot.rotation.y;
      const delta = target - angle;
      if (Math.abs(delta) < 0.008) {
        if (angle !== target) {
          angle = target;
          entry.openAngle = target;
          entry.pivot.rotation.y = target;
        }
        continue;
      }
      const step = Math.sign(delta) * Math.min(Math.abs(delta), DOOR_ANIM_SPEED * dt);
      angle += step;
      entry.openAngle = angle;
      entry.pivot.rotation.y = angle;
    }
    for (const entry of DECOR_STORAGES.values()) {
      if (!entry?.lidPivot?.parent) continue;
      const target = entry.targetOpen ? CHEST_OPEN_ANGLE : 0;
      let angle = Number.isFinite(entry.openAngle) ? entry.openAngle : entry.lidPivot.rotation.x;
      const delta = target - angle;
      if (Math.abs(delta) < 0.008) {
        if (angle !== target) {
          angle = target;
          entry.openAngle = target;
          entry.lidPivot.rotation.x = target;
        }
        continue;
      }
      const step = Math.sign(delta) * Math.min(Math.abs(delta), CHEST_ANIM_SPEED * dt);
      angle += step;
      entry.openAngle = angle;
      entry.lidPivot.rotation.x = angle;
    }
  }

  function setDecorDoorState(decorId, open, opts = {}) {
    const entry = DECOR_DOORS.get(decorId);
    if (!entry || !entry.root.parent) return false;
    return _setDoorVisual(entry, !!open, opts);
  }

  function unregisterDecorDoor(decorId) {
    DECOR_DOORS.delete(decorId);
  }

  function unregisterDecorStorage(decorId) {
    DECOR_STORAGES.delete(decorId);
  }

  function unregisterDecorInteract(decorId) {
    DECOR_INTERACTS.delete(decorId);
  }

  function unregisterDecorSign(decorId) {
    DECOR_SIGNS.delete(decorId);
  }

  function registerDecorSign(decorId, entry) {
    if (!decorId || !entry?.root) return;
    DECOR_SIGNS.set(decorId, entry);
  }

  function unregisterDecorBuild(decorId) {
    DECOR_BUILDS.delete(decorId);
  }

  function setDecorStorageState(decorId, open, opts = {}) {
    const entry = DECOR_STORAGES.get(decorId);
    if (!entry || !entry.root.parent) return false;
    const wantOpen = !!open;
    entry.open = wantOpen;
    entry.targetOpen = wantOpen;
    entry.root.userData.storageOpen = wantOpen;
    if (entry.root.userData.decorSpec) entry.root.userData.decorSpec.storageOpen = wantOpen;
    if (opts.instant && entry.lidPivot) {
      entry.openAngle = wantOpen ? CHEST_OPEN_ANGLE : 0;
      entry.lidPivot.rotation.x = entry.openAngle;
    }
    return true;
  }

  function findNearestDecorDoor(x, z, maxDist = 3.2) {
    let best = null;
    const pos = new THREE.Vector3();
    for (const [decorId, entry] of DECOR_DOORS) {
      if (!entry.root.parent || !entry.pivot) continue;
      entry.pivot.getWorldPosition(pos);
      const dist = Math.hypot(pos.x - x, pos.z - z);
      if (dist > maxDist) continue;
      if (!best || dist < best.dist) {
        best = {
          decorId,
          open: !!entry.open,
          dist,
          prefabId: entry.root.userData.prefabId,
          locked: !!entry.locked,
          lockId: entry.lockId || null,
          lockOwner: entry.lockOwner || null,
        };
      }
    }
    return best;
  }

  function findNearestDecorStorage(x, z, maxDist = 2.6) {
    let best = null;
    for (const [decorId, entry] of DECOR_STORAGES) {
      if (!entry.root.parent) continue;
      const dist = Math.hypot(entry.root.position.x - x, entry.root.position.z - z);
      if (dist > maxDist) continue;
      if (!best || dist < best.dist) best = { decorId, dist, prefabId: entry.root.userData.prefabId };
    }
    return best;
  }

  function findNearestDecorInteract(x, z, maxDist = 3.2, roleFilter = null) {
    let best = null;
    for (const [decorId, entry] of DECOR_INTERACTS) {
      if (!entry.root?.parent) continue;
      if (roleFilter && entry.role !== roleFilter) continue;
      const dist = Math.hypot(entry.root.position.x - x, entry.root.position.z - z);
      if (dist > maxDist) continue;
      if (!best || dist < best.dist) {
        best = {
          decorId,
          dist,
          role: entry.role,
          prefabId: entry.prefabId || entry.root.userData.prefabId,
        };
      }
    }
    return best;
  }

  function findNearestDecorSign(x, z, maxDist = 3.2) {
    let best = null;
    for (const [decorId, entry] of DECOR_SIGNS) {
      if (!entry.root.parent) continue;
      const dist = Math.hypot(entry.root.position.x - x, entry.root.position.z - z);
      if (dist > maxDist) continue;
      if (!best || dist < best.dist) {
        best = {
          decorId,
          dist,
          prefabId: entry.root.userData.prefabId,
          signKind: entry.signKind,
        };
      }
    }
    return best;
  }

  function hitDecorStorage(ox, oz, dx, dz, maxDist = 2.4) {
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len;
    const nz = dz / len;
    let best = null;
    for (const [decorId, entry] of DECOR_STORAGES) {
      if (!entry.root.parent) continue;
      const vx = entry.root.position.x - ox;
      const vz = entry.root.position.z - oz;
      const forward = vx * nx + vz * nz;
      if (forward < 0 || forward > maxDist) continue;
      const lateral = Math.abs(vx * nz - vz * nx);
      if (lateral > 1.05) continue;
      if (!best || forward < best.dist) {
        best = { decorId, dist: forward, prefabId: entry.root.userData.prefabId };
      }
    }
    return best;
  }

  function hitDecorBuild(ox, oz, dx, dz, maxDist = 2.6) {
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len;
    const nz = dz / len;
    let best = null;
    for (const [decorId, entry] of DECOR_BUILDS) {
      if (!entry.root?.parent) continue;
      const vx = entry.root.position.x - ox;
      const vz = entry.root.position.z - oz;
      const forward = vx * nx + vz * nz;
      if (forward < -0.35 || forward > maxDist) continue;
      const lateral = Math.abs(vx * nz - vz * nx);
      const reach = Math.max(entry.hw || 1.5, entry.hd || 1.5) + 0.65;
      if (lateral > reach) continue;
      if (!best || forward < best.dist) {
        best = { decorId, dist: forward, prefabId: entry.prefabId };
      }
    }
    return best;
  }
