// Placement structures + ghost — extrait de inventory.js (IIFE)
function _isWallSnapKind(kind) {
    return kind === 'wall' || kind === 'door' || kind === 'doorway';
  }
  let _ghost = null, _ghostType = null;
  let _ghostSupportDrop = -1;
  let _anchorGuides = null;
  let _pegGuideMat = null;
  const _ANCHOR_GUIDE_KINDS = new Set(['wall', 'door', 'doorway', 'floor', 'ceiling']);
  let _buildLevel = 0;   // étage de construction courant (0 = sol)
  let _placePending = false;
  let _placePendingType = null;
  let _placePendingTransform = null;
  let _placePendingSpec = null;
  let _placePendingTimer = null;
  let _floorReconcileAt = 0;

  function _isStructure(type) { return !!STRUCT[type]; }

  const _WOOD  = new THREE.MeshLambertMaterial({ color: 0xb5894e });
  const _WOOD2 = new THREE.MeshLambertMaterial({ color: 0x8a5a2e });

  function _addBox(g, mat, w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }

  // Mesh d'une structure : base à y=0, largeur le long de X, épaisseur le long de Z.
  function _buildStructureMesh(type, opts = {}) {
    const s = STRUCT[type];
    const g = new THREE.Group();
    if (s.kind === 'wall') {
      _addBox(g, _WOOD, s.w, s.h, s.t, 0, s.h / 2, 0);
      for (let i = -1; i <= 1; i++) _addBox(g, _WOOD2, 0.12, s.h - 0.1, s.t + 0.04, i * s.w * 0.3, s.h / 2, 0);
      _addBox(g, _WOOD2, s.w, 0.16, s.t + 0.04, 0, s.h - 0.1, 0);
    } else if (s.kind === 'door' || s.kind === 'doorway') {
      const side = (s.w - s.gap) / 2;
      for (const sgn of [-1, 1]) _addBox(g, _WOOD, side, s.h, s.t, sgn * (s.gap / 2 + side / 2), s.h / 2, 0);
      _addBox(g, _WOOD, s.w, 0.4, s.t, 0, s.h - 0.2, 0);   // imposte au-dessus de l'ouverture
    } else if (s.kind === 'floor') {
      const supportDrop = Number.isFinite(opts.supportDrop) ? opts.supportDrop : 0;
      if (supportDrop > 0.2 && ZS.buildFloorSupports) {
        ZS.buildFloorSupports(g, 0, -supportDrop, 0, 0);
      }
      _addBox(g, _WOOD, s.w, s.h, s.t, 0, s.h / 2, 0);
      for (let i = -1; i <= 1; i++) _addBox(g, _WOOD2, 0.1, s.h + 0.02, s.t, i * s.w * 0.3, s.h / 2, 0);
    } else if (s.kind === 'ceiling') {
      _addBox(g, _WOOD, s.w, s.h, s.t, 0, s.h / 2, 0);
      for (let i = -1; i <= 1; i++) _addBox(g, _WOOD2, 0.1, 0.08, s.t + 0.02, i * s.w * 0.3, 0.04, 0);
      _addBox(g, _WOOD2, s.w + 0.02, 0.08, 0.1, 0, 0.04, -s.t / 2 + 0.05);
      _addBox(g, _WOOD2, s.w + 0.02, 0.08, 0.1, 0, 0.04, s.t / 2 - 0.05);
    } else if (s.kind === 'stair') {
      const STEPS = 6, sh = s.h / STEPS, sd = s.t / STEPS;
      for (let i = 0; i < STEPS; i++) {
        const zc = -s.t / 2 + sd * (i + 0.5);
        _addBox(g, i % 2 ? _WOOD2 : _WOOD, s.w, sh * (i + 1), sd, 0, sh * (i + 1) / 2, zc);
      }
    } else if (s.kind === 'decorPrefab' && s.prefabId === 'storage_chest') {
      _addBox(g, _WOOD, 1.15, 0.48, 0.72, 0, 0.24, 0);
      _addBox(g, _WOOD2, 1.22, 0.12, 0.80, 0, 0.56, 0);
      _addBox(g, _WOOD2, 0.08, 0.58, 0.78, -0.58, 0.29, 0);
      _addBox(g, _WOOD2, 0.08, 0.58, 0.78, 0.58, 0.29, 0);
      _addBox(g, new THREE.MeshLambertMaterial({ color: 0x5d6268 }), 0.18, 0.16, 0.08, 0, 0.32, -0.42);
    }
    return g;
  }

  // Colliders (boîtes AABB 2D) d'une structure placée, orientation snappée à 90°.
  // baseY/level : pour un étage > 0, on ajoute minY → le mur ne bloque que ce niveau.
  function _structureColliders(type, x, z, rotY, baseY, level) {
    const s = STRUCT[type];
    const alongX = Math.abs(Math.cos(rotY)) > 0.5;
    const cols = [];
    const minY = level > 0 ? baseY - 0.6 : undefined;
    const box = (cx, cz, halfW, halfT) => {
      const c = alongX
        ? { type: 'box', cx, cz, hw: halfW, hd: halfT }
        : { type: 'box', cx, cz, hw: halfT, hd: halfW };
      if (minY !== undefined) c.minY = minY;
      cols.push(c);
    };
    const localBox = (lx, lz, halfW, halfT, maxY) => {
      const c = { type: 'box', cx: x, cz: z, lx, lz, hw: halfW, hd: halfT, rotY, baseY };
      if (minY !== undefined) c.minY = minY;
      if (maxY !== undefined) c.maxY = baseY + maxY;
      cols.push(c);
    };
    if (s.kind === 'wall') {
      box(x, z, s.w / 2, s.t / 2);
    } else if (s.kind === 'door' || s.kind === 'doorway') {
      const side = (s.w - s.gap) / 2, off = s.gap / 2 + side / 2;
      const ox = alongX ? off : 0, oz = alongX ? 0 : off;
      box(x - ox, z - oz, side / 2, s.t / 2);
      box(x + ox, z + oz, side / 2, s.t / 2);
    } else if (s.kind === 'stair') {
      localBox(-(s.w / 2 + 0.08), 0, 0.10, s.t / 2, s.h);
      localBox( (s.w / 2 + 0.08), 0, 0.10, s.t / 2, s.h);
    }
    // floor : pas de collider bloquant (praticable via registerUpperFloor)
    return cols;
  }

  // Position/orientation de pose : devant le joueur, alignée sur la grille + l'étage.
  function _placementTransform() {
    const p = _state.player, yaw = _state.camera.yaw;
    let x = p.x - Math.sin(yaw) * 3.2;
    let z = p.z - Math.cos(yaw) * 3.2;
    let rotY = Math.round(yaw / (Math.PI / 2)) * (Math.PI / 2);
    const s = _isStructure(_hotbar[_active]?.type) ? STRUCT[_hotbar[_active].type] : null;
    if (s?.kind === 'decorPrefab') {
      x = p.x - Math.sin(yaw) * 2.6;
      z = p.z - Math.cos(yaw) * 2.6;
      const terrainAt = (px, pz) => (ZS.getTerrainHeight
        ? ZS.getTerrainHeight(px, pz)
        : (ZS.getDecorGroundHeight ? ZS.getDecorGroundHeight(px, pz) : 0));
      const fallbackY = terrainAt(x, z) + _buildLevel * LEVEL_H;
      let baseY = fallbackY;
      let level = _buildLevel;
      let snapped = false;
      if (ZS.BuildAnchors?.findFoundationUnderCell?.(x, z, _buildLevel)) {
        snapped = true;
      } else if (ZS.BuildAnchors?.findFoundationDeckNear?.(x, z, _buildLevel)) {
        snapped = true;
      }
      if (ZS.BuildAnchors?.resolveStructureBaseY) {
        baseY = ZS.BuildAnchors.resolveStructureBaseY(x, z, fallbackY, _buildLevel);
        level = _buildLevel;
      } else if (ZS.BuildAnchors?.findFoundationDeckNear) {
        const deck = ZS.BuildAnchors.findFoundationDeckNear(x, z, _buildLevel);
        if (deck) {
          baseY = deck.baseY;
          level = deck.level;
        }
      }
      if (ZS.BuildAnchors?.clampStructureBaseY) {
        baseY = ZS.BuildAnchors.clampStructureBaseY(x, z, baseY, level);
      }
      const supportGroundY = terrainAt(x, z);
      return {
        x, z, rotY: yaw, baseY, level, snapped,
        supportGroundY, supportDrop: 0, floorsToLift: [],
      };
    }
    const snap = (v) => Math.round(v / GX) * GX;
    const edge = (v) => Math.round((v - GX / 2) / GX) * GX + GX / 2;
    const rawX = x;
    const rawZ = z;
    if (s) {
      const alongX = Math.abs(Math.cos(rotY)) > 0.5;
      if (_isWallSnapKind(s.kind)) {
        // Les murs se posent sur les arêtes des cellules → ils encadrent les planchers
        if (alongX) { x = snap(x); z = edge(z); }
        else        { x = edge(x); z = snap(z); }
      } else if (s.kind !== 'floor') {
        x = snap(x); z = snap(z);   // escalier : centre de cellule
      }
      // plancher : grille appliquée seulement si aucun ancrage voisin
    }

    let snapped = false;
    let snapBaseY = null;
    let snapLevel = _buildLevel;
    if (s && ZS.BuildAnchors?.snapPlacement) {
      const trySnap = (px, pz) => ZS.BuildAnchors.snapPlacement(px, pz, s.kind, rotY, _buildLevel, {
        playerX: p.x,
        playerZ: p.z,
      });
      let anchor = null;
      if (s.kind === 'floor') {
        anchor = trySnap(rawX, rawZ) || trySnap(snap(rawX), snap(rawZ));
      } else if (s.kind === 'ceiling') {
        anchor = trySnap(rawX, rawZ) || trySnap(x, z);
      } else if (_isWallSnapKind(s.kind)) {
        anchor = trySnap(rawX, rawZ) || trySnap(x, z);
      } else {
        anchor = trySnap(x, z);
      }
      if (anchor) {
        x = anchor.x;
        z = anchor.z;
        rotY = anchor.rotY;
        snapBaseY = anchor.baseY;
        snapLevel = anchor.level;
        snapped = true;
      } else if (s.kind === 'floor' && ZS.BuildAnchors.getNearestFloorBaseY) {
        const near = ZS.BuildAnchors.getNearestFloorBaseY(rawX, rawZ, undefined, _buildLevel);
        if (near) {
          if (Number.isFinite(near.x) && Number.isFinite(near.z)) {
            x = near.x;
            z = near.z;
          }
          snapBaseY = near.baseY;
          snapLevel = near.level;
          snapped = true;
        } else {
          x = snap(rawX);
          z = snap(rawZ);
        }
      }
    } else if (s?.kind === 'floor') {
      x = snap(rawX);
      z = snap(rawZ);
    }

    if (s?.kind === 'floor' && ZS.BuildAnchors?.findAdjacentFloorHeight) {
      const adj = ZS.BuildAnchors.findAdjacentFloorHeight(x, z, _buildLevel);
      if (adj) {
        snapBaseY = adj.baseY;
        snapLevel = adj.level;
        snapped = true;
      }
    }

    if (_isWallSnapKind(s?.kind) && snapBaseY == null && ZS.BuildAnchors?.findFoundationDeckNear) {
      const deck = ZS.BuildAnchors.findFoundationDeckNear(x, z, _buildLevel)
        || ZS.BuildAnchors.findFoundationDeckNear(rawX, rawZ, _buildLevel);
      if (deck) {
        snapBaseY = deck.baseY;
        snapLevel = deck.level;
        snapped = true;
      }
    }

    const terrainAt = (px, pz) => (ZS.getTerrainHeight
      ? ZS.getTerrainHeight(px, pz)
      : (ZS.getDecorGroundHeight ? ZS.getDecorGroundHeight(px, pz) : 0));

    const fallbackY = terrainAt(x, z) + _buildLevel * LEVEL_H;
    let baseY = fallbackY;
    let floorsToLift = [];
    if (s?.kind === 'floor' && ZS.BuildAnchors?.resolveFloorDeckY) {
      baseY = ZS.BuildAnchors.resolveFloorDeckY(x, z, fallbackY, null, _buildLevel);
      snapLevel = _buildLevel;
      const adj = ZS.BuildAnchors.listAdjacentFoundations?.(x, z);
      if (adj?.length) {
        snapped = true;
        const unified = ZS.BuildAnchors.computeUnifiedFloorHeight(x, z, fallbackY, null, _buildLevel);
        floorsToLift = unified.toLift;
      }
    } else if (s?.kind === 'floor' && ZS.BuildAnchors?.computeUnifiedFloorHeight) {
      const unified = ZS.BuildAnchors.computeUnifiedFloorHeight(x, z, fallbackY, null, _buildLevel);
      baseY = unified.targetY;
      snapLevel = _buildLevel;
      if (unified.toLift.length) {
        snapped = true;
        floorsToLift = unified.toLift;
      } else if (unified.targetY !== fallbackY) {
        snapped = true;
      }
    } else if (snapBaseY != null) {
      baseY = snapBaseY;
    }
    if ((_isWallSnapKind(s?.kind) || s?.kind === 'stair')
        && ZS.BuildAnchors?.resolveStructureBaseY) {
      baseY = ZS.BuildAnchors.resolveStructureBaseY(x, z, baseY, _buildLevel);
      snapLevel = _buildLevel;
    } else if ((_isWallSnapKind(s?.kind) || s?.kind === 'stair')
        && ZS.BuildAnchors?.clampStructureBaseY) {
      baseY = ZS.BuildAnchors.clampStructureBaseY(x, z, baseY, snapLevel);
    }
    if (s?.kind === 'floor' && ZS.BuildAnchors?.clampFloorDeckY) {
      baseY = ZS.BuildAnchors.clampFloorDeckY(x, z, baseY, _buildLevel);
    } else if (s?.kind === 'ceiling' && ZS.BuildAnchors?.resolveCeilingDeckY) {
      const resolved = ZS.BuildAnchors.resolveCeilingDeckY(x, z, _buildLevel);
      if (resolved != null) {
        baseY = resolved;
        const under = ZS.BuildAnchors.findFoundationUnderCell?.(x, z, _buildLevel);
        if (under) {
          snapLevel = under.level;
          snapped = true;
        }
      }
    }
    const groundAt = (px, pz) => (ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(px, pz)
      : terrainAt(px, pz));
    const supportGroundY = (s?.kind === 'floor') ? terrainAt(x, z) : groundAt(x, z);
    const supportDrop = (s?.kind === 'floor') ? Math.max(0, baseY - supportGroundY) : 0;
    return {
      x, z, rotY, baseY, level: snapLevel, snapped,
      supportGroundY, supportDrop, floorsToLift,
    };
  }

  function _hideAnchorGuides() {
    if (!_anchorGuides) return;
    _scene.remove(_anchorGuides);
    _anchorGuides.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        if (o.material && o.material !== _pegGuideMat) o.material.dispose?.();
      }
    });
    _anchorGuides = null;
  }

  function _updateAnchorGuides(s) {
    if (!s || !_ANCHOR_GUIDE_KINDS.has(s.kind) || !ZS.BuildAnchors?.listFoundations) {
      _hideAnchorGuides();
      return;
    }
    const p = _state.player;
    if (s.kind === 'ceiling' && ZS.BuildAnchors.listCeilingAnchors) {
      const ceilings = ZS.BuildAnchors.listCeilingAnchors(14, p.x, p.z, _buildLevel);
      if (!ceilings.length) {
        _hideAnchorGuides();
        return;
      }
      if (!_anchorGuides) {
        _anchorGuides = new THREE.Group();
        _anchorGuides.name = 'build-anchor-guides';
        _scene.add(_anchorGuides);
      }
      while (_anchorGuides.children.length) {
        const c = _anchorGuides.children[0];
        _anchorGuides.remove(c);
        c.geometry?.dispose?.();
      }
      if (!_pegGuideMat) {
        _pegGuideMat = new THREE.MeshLambertMaterial({
          color: 0x66dd66, transparent: true, opacity: 0.85, depthWrite: false,
        });
      }
      const pegH = 0.32;
      for (const c of ceilings) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.11, pegH, 0.11), _pegGuideMat);
        m.position.set(c.x, c.baseY + 0.22 + pegH / 2, c.z);
        m.castShadow = false;
        m.receiveShadow = false;
        _anchorGuides.add(m);
      }
      return;
    }
    const edges = (_isWallSnapKind(s.kind) && ZS.BuildAnchors.listExposedWallEdges)
      ? ZS.BuildAnchors.listExposedWallEdges(14, p.x, p.z)
      : null;
    const floors = edges?.length ? null : ZS.BuildAnchors.listFoundations(14, p.x, p.z);
    if (!edges?.length && !floors?.length) {
      _hideAnchorGuides();
      return;
    }
    if (!_anchorGuides) {
      _anchorGuides = new THREE.Group();
      _anchorGuides.name = 'build-anchor-guides';
      _scene.add(_anchorGuides);
    }
    while (_anchorGuides.children.length) {
      const c = _anchorGuides.children[0];
      _anchorGuides.remove(c);
      c.geometry?.dispose?.();
    }
    if (!_pegGuideMat) {
      _pegGuideMat = new THREE.MeshLambertMaterial({
        color: 0x66dd66, transparent: true, opacity: 0.85, depthWrite: false,
      });
    }
    const pegH = 0.32;
    if (edges?.length) {
      for (const e of edges) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.11, pegH, 0.11), _pegGuideMat);
        m.position.set(e.x, e.baseY + 0.22 + pegH / 2, e.z);
        m.castShadow = false;
        m.receiveShadow = false;
        _anchorGuides.add(m);
      }
      return;
    }
    for (const f of floors) {
      const y = f.baseY + 0.22;
      for (const [ox, oz] of [[0, f.hd], [0, -f.hd], [f.hw, 0], [-f.hw, 0]]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.11, pegH, 0.11), _pegGuideMat);
        m.position.set(f.cx + ox, y + pegH / 2, f.cz + oz);
        m.castShadow = false;
        m.receiveShadow = false;
        _anchorGuides.add(m);
      }
    }
  }

  function _updateBuildGhost() {
    const item = _hotbar[_active];
    const type = item ? item.type : null;
    if (!type || !_isStructure(type)) {
      _removeGhost();
      _hideAnchorGuides();
      _ghostSupportDrop = -1;
      return;
    }
    const s = STRUCT[type];
    if (s?.kind === 'floor' && ZS.reconcileAllBuildFloors) {
      const now = performance.now();
      if (now - _floorReconcileAt > 750) {
        _floorReconcileAt = now;
        ZS.reconcileAllBuildFloors();
      }
    }
    const t = _placementTransform();
    const supportDrop = t.supportDrop || 0;
    if (_ghostType !== type || _ghostSupportDrop !== supportDrop) {
      _removeGhost();
      _ghost = _buildStructureMesh(type, { supportDrop });
      _ghost.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.45;
        o.castShadow = false;
      });
      _ghostType = type;
      _ghostSupportDrop = supportDrop;
      _scene.add(_ghost);
    }
    _ghost.position.set(t.x, t.baseY, t.z);
    _ghost.rotation.y = t.rotY;
    _ghost.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      if (o.material.emissive) {
        o.material.emissive.setHex(t.snapped ? 0x33aa33 : 0x000000);
        o.material.emissiveIntensity = t.snapped ? 0.4 : 0;
      }
    });
    _updateAnchorGuides(s);
  }

  function _removeGhost() {
    if (_ghost) { _scene.remove(_ghost); _ghost = null; }
    _ghostType = null;
    _ghostSupportDrop = -1;
    _hideAnchorGuides();
  }

  function _clearPlacePending() {
    _placePending = false;
    _placePendingType = null;
    _placePendingTransform = null;
    _placePendingSpec = null;
    if (_placePendingTimer) clearTimeout(_placePendingTimer);
    _placePendingTimer = null;
  }

  function _placeLegacyStructure(type, t, s) {
    _socket.emit('place-structure', {
      type, x: t.x, y: t.baseY, z: t.z, rotY: t.rotY,
      colliders: _structureColliders(type, t.x, t.z, t.rotY, t.baseY, t.level),
    }, (res) => {
      if (res?.ok) {
        if (!_hotbar[_active] || !_isStructure(_hotbar[_active].type)) _removeGhost();
      } else {
        const err = res?.err || res?.error;
        ZS.UI?.showNotif?.(err === 'beach_protected'
          ? 'Construction interdite sur la plage (zone protégée)'
          : (err || 'Placement refusé'));
      }
    });
  }

  function _fallbackBuildPlacement(type, t, s) {
    return false;
  }

  // Pose la structure active devant le joueur (consomme 1, sync serveur).
  function _placeStructure() {
    const item = _hotbar[_active];
    if (_placePending || !item || !_isStructure(item.type)) return false;
    const type = item.type;
    const t = _placementTransform();
    const s = STRUCT[type];
    const halfW = (s.w || 3) / 2;
    const halfD = (s.t || s.w || 3) / 2;
    if (ZS.S01Bounds?.isS01BuildBlocked?.(t.x, t.z, halfW, halfD)
        || ZS.isBuildBlockedOnBeach?.(t.x, t.z, halfW, halfD)) {
      ZS.UI?.showNotif?.('Construction interdite dans cette zone protégée');
      return false;
    }
    if (s.prefabId) {
      _placePending = true;
      _placePendingType = type;
      _placePendingTransform = t;
      _placePendingSpec = s;
      if (_placePendingTimer) clearTimeout(_placePendingTimer);
      _placePendingTimer = setTimeout(() => {
        if (!_placePending || _placePendingType !== type) return;
        _clearPlacePending();
        ZS.UI?.showNotif?.('Placement sans réponse serveur');
      }, 3500);
      const payload = {
        itemType: type,
        prefabId: s.prefabId,
        x: t.x,
        y: t.baseY,
        z: t.z,
        rotY: t.rotY,
        scale: 1,
        baseY: t.baseY,
        buildLevel: t.level,
        supportGroundY: t.supportGroundY,
      };
      _socket.emit('place-decor-prefab', payload, (res) => {
        _clearPlacePending();
        if (!res?.ok) {
          const err = res?.error || res?.err;
        ZS.UI?.showNotif?.(err === 'beach_protected'
          ? 'Construction interdite sur la plage (zone protégée)'
          : (err || 'Placement refusé'));
          return;
        }
        if (!_hotbar[_active] || !_isStructure(_hotbar[_active].type)) _removeGhost();
      });
      return true;
    }
    _placeLegacyStructure(type, t, s);
    return true;
  }

  // Construit une structure reçue du serveur (mesh + collisions + sol praticable).
