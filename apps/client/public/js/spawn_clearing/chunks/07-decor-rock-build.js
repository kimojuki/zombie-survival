// Rochers, floors build, reconcile — extrait de spawn_clearing.js (IIFE)
function _rockWorldBoundsY(root) {
    if (!root) return null;
    root.updateMatrixWorld(true);
    const vis = root.userData.boulderVisual || root;
    let minY = Infinity;
    let maxY = -Infinity;
    const v = new THREE.Vector3();
    vis.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        v.applyMatrix4(o.matrixWorld);
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
      }
    });
    if (!Number.isFinite(minY)) return null;
    return { minY, maxY: Number.isFinite(maxY) ? maxY : minY };
  }

  /** Enfoncement réaliste : ~18 % hauteur, entre 12 et 40 cm selon taille. */
  function _rockEmbedDepth(root) {
    const b = _rockWorldBoundsY(root);
    if (!b) return 0.14;
    const h = Math.max(0.2, b.maxY - b.minY);
    return Math.max(0.12, Math.min(0.40, h * 0.18));
  }

  function _sampleRockSurfaceY(x, z, root) {
    const s = root?.scale?.x || 1;
    const footprint = 0.35 + 0.45 * s;
    const pts = [[x, z]];
    if (footprint > 0.2) {
      pts.push([x + footprint, z], [x - footprint, z], [x, z + footprint], [x, z - footprint]);
    }
    let minH = Infinity;
    for (const [px, pz] of pts) {
      const h = getDecorGroundHeight(px, pz);
      if (h < minH) minH = h;
    }
    return Number.isFinite(minH) ? minH : getDecorGroundHeight(x, z);
  }

  /** Ancre le bas réel (vertices monde) sur la surface décor, légèrement enfoncé. */
  let _deferRockSnap = false;

  function setDeferRockSnap(on) {
    _deferRockSnap = !!on;
  }

  function _snapMinableRockToGround(root, x, z) {
    if (!root) return;
    const vis = root.userData.boulderVisual;
    if (vis) vis.position.set(0, 0, 0);
    const surface = _sampleRockSurfaceY(x || 0, z || 0, root);
    root.position.y = surface;
    const bounds = _rockWorldBoundsY(root);
    if (bounds != null) {
      const embed = _rockEmbedDepth(root);
      root.position.y += surface - bounds.minY - embed;
    }
    if (root.userData.decorSpec) {
      root.userData.decorSpec.baseY = root.position.y;
      _refreshDecorCollision(root);
    }
  }

  function resnapMinableRock(root) {
    if (!root?.userData?.prefabId) return;
    const pid = root.userData.prefabId;
    if (pid !== 'spawn_stone' && !pid.startsWith('rock_')) return;
    _snapMinableRockToGround(root, root.position.x, root.position.z);
  }

  function resnapAllMinableRocks(scene) {
    if (!scene) return;
    scene.traverse((o) => {
      if (!o.userData?.boulderVisual || !o.userData?.decorId) return;
      resnapMinableRock(o);
    });
  }

  function _disposeObject3D(o) {
    if (!o) return;
    o.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
        else c.material.dispose?.();
      }
    });
  }

  /** Remonte une fondation existante + recalcule supports/collisions/registre. */
  function _resyncBuildFloorMesh(root, targetY) {
    const prefab = DECOR_PREFABS.build_floor_wood;
    if (!root || !prefab) return;
    const x = root.position.x;
    const z = root.position.z;
    const decorId = root.userData.decorId;
    const terrainY = ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0;
    const supportDrop = Math.max(0, targetY - terrainY);
    while (root.children.length) {
      const c = root.children[0];
      root.remove(c);
      _disposeObject3D(c);
    }
    root.position.y = targetY;
    prefab.build(root, { supportDrop });
    if (root.userData.decorSpec) root.userData.decorSpec.baseY = targetY;
    ZS.registerUpperFloor?.(x, z, prefab.w / 2, prefab.t / 2, targetY + prefab.h);
    ZS.BuildAnchors?.registerFoundation(decorId, x, z, targetY, {
      hw: prefab.w / 2,
      hd: prefab.t / 2,
      level: 0,
    });
    _refreshDecorCollision(root);
    ZS.Network?.patchDecorFloorHeight?.(decorId, targetY);
  }

  function _liftBuildFloors(toLift, targetY) {
    if (!toLift?.length || !Number.isFinite(targetY)) return;
    for (const f of toLift) {
      const root = ZS.Network?.getDecorRoot?.(f.id);
      if (root) _resyncBuildFloorMesh(root, targetY);
    }
  }

  /** Aligne visuellement toutes les fondations connexes à la hauteur max du groupe. */
  function reconcileAllBuildFloors() {
    const lifts = ZS.BuildAnchors?.reconcileAllFoundationHeights?.() || [];
    for (const l of lifts) {
      const root = ZS.Network?.getDecorRoot?.(l.id);
      if (root) _resyncBuildFloorMesh(root, l.targetY);
    }
  }

  /** Props monde seedés serveur — Y client (terrain aplati routes / clairières). */
  function _prefabUsesClientGround(prefabId, opts) {
    if (opts.grounded === false) return false;
    if (prefabId?.startsWith('tree_')) return true;
    if (prefabId === 'spawn_stone' || prefabId?.startsWith('rock_')) return true;
    if (opts.fastGround) return true;
    return false;
  }
