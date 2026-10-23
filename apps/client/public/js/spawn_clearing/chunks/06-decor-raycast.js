// Raycast admin / portes / panneaux — extrait de spawn_clearing.js (IIFE)
const _adminPickHits = [];

  const _ADMIN_PICK_SKIP = new Set(['__ald_preview__']);

  /** Visée écran → tout décor synchronisé (mode admin édition live). */
  function pickDecorAdminRay(raycaster, maxDist = 80) {
    if (!raycaster || !ZS.Network?.forEachDecor) return null;
    _adminPickHits.length = 0;
    ZS.Network.forEachDecor((entry, id) => {
      if (_ADMIN_PICK_SKIP.has(id)) return;
      if (!entry.root?.parent || entry.root.visible === false) return;
      entry.root.traverse((o) => {
        if (o.isMesh && o.visible !== false) _adminPickHits.push(o);
      });
    });
    if (!_adminPickHits.length) return null;
    const prevFar = raycaster.far;
    raycaster.far = maxDist;
    const hits = raycaster.intersectObjects(_adminPickHits, false);
    raycaster.far = prevFar;
    if (!hits.length) return null;
    let node = hits[0].object;
    while (node) {
      const id = node.userData?.decorId;
      if (id) {
        const data = ZS.Network.getDecorData?.(id);
        return {
          decorId: id,
          dist: hits[0].distance,
          prefabId: data?.prefabId,
          point: hits[0].point,
        };
      }
      node = node.parent;
    }
    return null;
  }

  /** Visée écran → mesh construction (prioritaire sur la récolte cone XZ). */
  function hitDecorBuildRay(raycaster, maxDist = 3.5) {
    if (!raycaster) return null;
    _buildRayHits.length = 0;
    for (const entry of DECOR_BUILDS.values()) {
      if (!entry.root?.parent) continue;
      entry.root.traverse((o) => {
        if (o.isMesh) _buildRayHits.push(o);
      });
    }
    if (!_buildRayHits.length) return null;
    const prevFar = raycaster.far;
    raycaster.far = maxDist;
    const hits = raycaster.intersectObjects(_buildRayHits, false);
    raycaster.far = prevFar;
    if (!hits.length) return null;
    let node = hits[0].object;
    while (node) {
      const id = node.userData?.decorId;
      if (id && DECOR_BUILDS.has(id)) {
        return { decorId: id, dist: hits[0].distance, prefabId: DECOR_BUILDS.get(id).prefabId };
      }
      node = node.parent;
    }
    return null;
  }

  const _doorRayHits = [];
  const _storageRayHits = [];
  const _signRayHits = [];

  /**
   * True si un mur décor (cabane, etc.) bloque le rayon avant la cible.
   * Le mesh coffre est testé seul — sans ça on peut interagir à travers les murs.
   */
  function _interactRayOccluded(raycaster, hitDist, excludeDecorId) {
    if (!raycaster?.ray || !ZS.hasHeadLineOfSight || !ZS.getCollidersNear) return false;
    if (!Number.isFinite(hitDist) || hitDist < 0.05) return false;
    const ray = raycaster.ray;
    const ox = ray.origin.x;
    const oz = ray.origin.z;
    const dx = ray.direction.x;
    const dz = ray.direction.z;
    const t = Math.max(0.05, hitDist - 0.12);
    const ex = ox + dx * t;
    const ez = oz + dz * t;
    const eyeY = ray.origin.y;
    const span = Math.hypot(ex - ox, ez - oz);
    const midX = (ox + ex) * 0.5;
    const midZ = (oz + ez) * 0.5;
    const colliders = ZS.getCollidersNear(midX, midZ, span * 0.5 + 8);
    const filtered = [];
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.decorId === excludeDecorId) continue;
      filtered.push(c);
    }
    return !ZS.hasHeadLineOfSight(ox, oz, ex, ez, filtered, eyeY, { endpointShrink: 0.12 });
  }

  function getDecorDoorForInteract(decorId) {
    const entry = DECOR_DOORS.get(decorId);
    if (!entry?.root?.parent) return null;
    return {
      decorId,
      open: !!entry.open,
      dist: 0,
      prefabId: entry.root.userData.prefabId,
      locked: !!entry.locked,
      lockId: entry.lockId || null,
      lockOwner: entry.lockOwner || null,
    };
  }

  function getDecorStorageForInteract(decorId) {
    const entry = DECOR_STORAGES.get(decorId);
    if (!entry?.root?.parent) return null;
    return { decorId, dist: 0, prefabId: entry.root.userData.prefabId };
  }

  function getDecorSignForInteract(decorId) {
    const entry = DECOR_SIGNS.get(decorId);
    if (!entry?.root?.parent) return null;
    return {
      decorId,
      dist: 0,
      prefabId: entry.root.userData.prefabId,
      signKind: entry.signKind,
    };
  }

  /** Visée écran → coffre (mesh décor, prioritaire sur proximité). */
  function hitDecorStorageRay(raycaster, maxDist = 3.5) {
    if (!raycaster) return null;
    _storageRayHits.length = 0;
    for (const [decorId, entry] of DECOR_STORAGES) {
      if (!entry.root?.parent) continue;
      entry.root.traverse((o) => {
        if (o.isMesh) {
          o.userData.decorId = decorId;
          _storageRayHits.push(o);
        }
      });
    }
    if (!_storageRayHits.length) return null;
    const prevFar = raycaster.far;
    raycaster.far = maxDist;
    const hits = raycaster.intersectObjects(_storageRayHits, false);
    raycaster.far = prevFar;
    if (!hits.length) return null;
    let node = hits[0].object;
    while (node) {
      const id = node.userData?.decorId;
      if (id && DECOR_STORAGES.has(id)) {
        const dist = hits[0].distance;
        if (_interactRayOccluded(raycaster, dist, id)) return null;
        return {
          decorId: id,
          dist,
          prefabId: DECOR_STORAGES.get(id).root.userData.prefabId,
        };
      }
      node = node.parent;
    }
    return null;
  }

  /** Visée écran → porte verrouillée (cabanes, etc. hors DECOR_BUILDS). */
  function hitDecorDoorRay(raycaster, maxDist = 3.5) {
    if (!raycaster) return null;
    _doorRayHits.length = 0;
    for (const [decorId, entry] of DECOR_DOORS) {
      if (!entry.root?.parent || !entry.pivot) continue;
      entry.pivot.traverse((o) => {
        if (o.isMesh) {
          o.userData.decorId = decorId;
          _doorRayHits.push(o);
        }
      });
    }
    if (!_doorRayHits.length) return null;
    const prevFar = raycaster.far;
    raycaster.far = maxDist;
    const hits = raycaster.intersectObjects(_doorRayHits, false);
    raycaster.far = prevFar;
    if (!hits.length) return null;
    let node = hits[0].object;
    while (node) {
      const id = node.userData?.decorId;
      const entry = id ? DECOR_DOORS.get(id) : null;
      if (entry) {
        return {
          decorId: id,
          dist: hits[0].distance,
          prefabId: entry.root.userData.prefabId,
          locked: !!entry.locked,
          lockId: entry.lockId || null,
        };
      }
      node = node.parent;
    }
    return null;
  }

  /** Visée écran → panneau / note / bouteille lisible. */
  function hitDecorSignRay(raycaster, maxDist = 3.5) {
    if (!raycaster) return null;
    _signRayHits.length = 0;
    for (const [decorId, entry] of DECOR_SIGNS) {
      if (!entry.root?.parent) continue;
      entry.root.traverse((o) => {
        if (o.isMesh) {
          o.userData.decorId = decorId;
          _signRayHits.push(o);
        }
      });
    }
    if (!_signRayHits.length) return null;
    const prevFar = raycaster.far;
    raycaster.far = maxDist;
    const hits = raycaster.intersectObjects(_signRayHits, false);
    raycaster.far = prevFar;
    if (!hits.length) return null;
    let node = hits[0].object;
    while (node) {
      const id = node.userData?.decorId;
      const entry = id ? DECOR_SIGNS.get(id) : null;
      if (entry) {
        const dist = hits[0].distance;
        if (_interactRayOccluded(raycaster, dist, id)) return null;
        return {
          decorId: id,
          dist,
          prefabId: entry.root.userData.prefabId,
          signKind: entry.signKind,
        };
      }
      node = node.parent;
    }
    return null;
  }

  /** Coffre / porte / panneau : le mesh le plus proche sur le rayon caméra (viseur). */
  function pickDecorInteractRay(raycaster, maxDist = 3.5) {
    const candidates = [];
    const storage = hitDecorStorageRay(raycaster, maxDist);
    const door = hitDecorDoorRay(raycaster, maxDist);
    const sign = hitDecorSignRay(raycaster, maxDist);
    if (storage) candidates.push({ kind: 'storage', ...storage });
    if (door) candidates.push({ kind: 'door', ...door });
    if (sign) candidates.push({ kind: 'sign', ...sign });
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.dist - b.dist);
    return candidates[0];
  }

  function getDecorDoorMeta(decorId) {
    const entry = DECOR_DOORS.get(decorId);
    if (!entry?.root?.parent) return null;
    return {
      decorId,
      locked: !!entry.locked,
      lockId: entry.lockId || null,
      prefabId: entry.root.userData.prefabId,
    };
  }

  /** Plus bas vertex du visuel en coordonnées monde (respecte rotY / scale). */
