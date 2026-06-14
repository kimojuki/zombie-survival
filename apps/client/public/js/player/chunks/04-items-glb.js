// GLB items + spawnDecorItem — extrait de player.js (IIFE)
function _fit(type) {
    if (type === 'tool_caillou') return 0.68;
    if (type === 'wpn_pistolet' || type === 'pistol') return 0.52;
    if (type === 'wpn_fusil_chasse')                  return 1.20;
    if (type === 'wpn_barre_fer' || type === 'wpn_lance_artisanale' || type === 'wpn_arc_artisanal') return 1.15;
    const cat = ZS.ITEMS?.[type]?.category || '';
    const byCat = {
      firearm: 1.00, melee: 0.92, tool: 0.86,
      food: 0.42, medical: 0.42, ammo: 0.32, resource: 0.34,
      equipment: 0.44, structure: 0.46, key: 0.52,
    };
    return byCat[cat] || 0.36;
  }

  const _loader = (typeof THREE !== 'undefined' && THREE.GLTFLoader) ? new THREE.GLTFLoader() : null;
  const _cache  = {};   // file → Promise<THREE.Object3D> (template chargé)

  function _loadGLB(file) {
    if (_cache[file]) return _cache[file];
    _cache[file] = new Promise((resolve, reject) => {
      if (!_loader) { reject(new Error('GLTFLoader indisponible')); return; }
      _loader.load('/models/' + file + '.glb',
        (g) => {
          g.scene.traverse((o) => { if (o.isMesh) o.castShadow = true; });
          resolve(g.scene);
        },
        undefined,
        reject);
    });
    return _cache[file];
  }

  // Recentre l'objet, l'ajuste à `fit` (m) et applique l'orientation `rot`.
  function _normalize(obj, fit, rot) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const s = fit / (Math.max(size.x, size.y, size.z) || 1);
    obj.scale.setScalar(s);
    obj.position.set(-center.x * s, -center.y * s, -center.z * s);
    const centered = new THREE.Group(); centered.add(obj);     // géométrie centrée à l'origine
    const pivot = new THREE.Group(); pivot.add(centered);      // pivot pour l'orientation
    if (rot) pivot.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    return pivot;
  }

  // Comme _normalize, mais le modèle est ancré sur son point de prise.
  function _normalizeHeld(obj, fit, rot, gripPoint) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    const s = fit / (Math.max(size.x, size.y, size.z) || 1);
    obj.scale.setScalar(s);
    if (gripPoint) {
      obj.position.set(
        -(gripPoint.x || 0) * s,
        -(gripPoint.y || 0) * s,
        -(gripPoint.z || 0) * s,
      );
    } else {
      const center = new THREE.Vector3(); box.getCenter(center);
      obj.position.set(-center.x * s, -center.y * s, -center.z * s);
    }
    const centered = new THREE.Group(); centered.add(obj);
    const pivot = new THREE.Group(); pivot.add(centered);
    if (rot) pivot.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    return pivot;
  }

  function _defaultGripPoint(type, cat) {
    if (cat === 'firearm') return { x: 0, y: -0.10, z: 0.08 };
    if (cat === 'melee' || cat === 'tool') return { x: 0, y: -0.10, z: 0.00 };
    if (cat === 'food' || cat === 'medical') return { x: 0, y: 0.00, z: 0.00 };
    if (cat === 'ammo' || cat === 'resource') return { x: 0, y: 0.00, z: 0.00 };
    if (cat === 'equipment') return { x: 0, y: -0.02, z: 0.03 };
    if (cat === 'structure') return { x: 0, y: 0.00, z: 0.00 };
    return { x: 0, y: 0, z: 0 };
  }

  function _deriveGripPoint(obj, type, cat) {
    if (!obj) return null;
    const box = new THREE.Box3().setFromObject(obj);
    if (!isFinite(box.min.x) || !isFinite(box.max.x)) return null;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    if (cat === 'firearm') {
      return {
        x: center.x,
        y: box.min.y + size.y * 0.28,
        z: box.min.z + size.z * 0.58,
      };
    }
    if (cat === 'melee' || cat === 'tool') {
      return {
        x: center.x,
        y: box.min.y + size.y * 0.18,
        z: center.z,
      };
    }
    if (cat === 'food' || cat === 'medical') {
      return { x: center.x, y: center.y, z: center.z };
    }
    if (cat === 'ammo' || cat === 'resource' || cat === 'equipment' || cat === 'structure') {
      return {
        x: center.x,
        y: box.min.y + size.y * 0.35,
        z: center.z,
      };
    }
    return { x: center.x, y: center.y, z: center.z };
  }

  function _getGripPoint(type, obj) {
    const cat = ZS.ITEMS?.[type]?.category || '';
    return obj?.userData?.gripPoint || _deriveGripPoint(obj, type, cat) || _defaultGripPoint(type, cat);
  }

  function _setGripPoint(obj, x, y, z) {
    obj.userData = obj.userData || {};
    obj.userData.gripPoint = { x, y, z };
    return obj;
  }

  // Renvoie une Promesse du modèle d'affichage normalisé (GLB sinon procédural).
  // Utilisé par l'item en main ET le générateur d'icônes (ZS.Icons).
  function getItemModel(type) {
    const fit  = _fit(type);
    const spec = GLB[type];
    if (spec && _loader) {
      return _loadGLB(spec.file)
        .then((t) => _normalize(t.clone(true), fit, spec.rot))
        .catch(() => _normalize(_buildModel(type), fit, null));
    }
    return Promise.resolve(_normalize(_buildModel(type), fit, null));
  }

  function _registerDecorCollision(decorId, spec) {
    if (!decorId || !ZS.registerDecorColliders || !ZS.buildDecorColliders) return;
    ZS.registerDecorColliders(decorId, ZS.buildDecorColliders(spec));
  }

  function spawnDecorItem(scene, type, x, y, z, opts = {}) {
    if (!scene || !type) return Promise.resolve(null);
    const groundedY = opts.grounded !== false
      ? (ZS.getDecorGroundHeight
          ? ZS.getDecorGroundHeight(x || 0, z || 0, { groundLift: opts.groundLift })
          : (ZS.getTerrainHeight
              ? ZS.getTerrainHeight(x || 0, z || 0) + (Number.isFinite(opts.groundLift) ? opts.groundLift : 0)
              : (y || 0)))
      : (y || 0);
    const root = new THREE.Group();
    root.position.set(x || 0, groundedY, z || 0);
    root.rotation.set(opts.rotX || 0, opts.rotY || 0, opts.rotZ || 0);
    const s = Number.isFinite(opts.scale) ? opts.scale : 1;
    root.scale.setScalar(s);
    root.userData.type = type;
    scene.add(root);

    const decorId = opts.decorId;
    if (decorId && opts.collide !== false) {
      _registerDecorCollision(decorId, {
        decorId,
        kind: 'item',
        type,
        x: x || 0,
        z: z || 0,
        baseY: groundedY,
        rotY: opts.rotY || 0,
        scale: s,
        layFlat: !!opts.layFlat,
      });
    }

    if (type === 'tool_caillou' && ZS.RockPrefab?.buildGroundRock) {
      const wrap = new THREE.Group();
      ZS.RockPrefab.buildGroundRock(wrap, { rockSeed: opts.rockSeed, decorId });
      root.add(wrap);
      return Promise.resolve(root);
    }

    return getItemModel(type).then((model) => {
      if (!root.parent) return null;
      const wrap = new THREE.Group();
      wrap.add(model);
      if (opts.layFlat) wrap.rotation.x = -Math.PI / 2;
      wrap.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(wrap);
      const baseOffsetY = isFinite(box.min.y) ? -box.min.y : 0;
      wrap.position.set(
        opts.offsetX || 0,
        (opts.offsetY || 0) + baseOffsetY,
        opts.offsetZ || 0,
      );
      root.add(wrap);
      return root;
    }).catch(() => root);
  }

  // ── Mise à jour de l'item en main ─────────────────────────────────────────
