// Inventory — hotbar (6 slots) + sac (slots selon le sac équipé) + équipement
(function () {
  'use strict';

  const HOTBAR_SIZE = 6;
  const GRAB_RANGE  = 2.2;   // distance max pour ramasser un objet au sol
  const GRAB_RANGE_INTRO = 3.6;
  let _grabTargetId = null;  // objet actuellement visé (à portée)
  let _selfPlayerId = null;  // id persistant (loot personnel)

  let _hotbar = Array(HOTBAR_SIZE).fill(null);
  let _bag    = [];     // taille = slots_inventaire_bonus du sac équipé (0 sans sac)
  let _equip  = { Tête: null, Torso: null, Mains: null, Dos: null };
  let _active = 0;
  let _panelOpen  = false;
  let _invBackdrop = null;
  let _sel = null;      // objet sélectionné (détail / jeter) : { zone, idx }
  let _dragPending = null;
  let _drag = null;
  let _dragGhost = null;
  let _dragOverEl = null;
  const _DRAG_THRESH = 7;
  let _detailIcon = null;
  let _detailName = null;
  let _detailCat = null;
  let _detailDesc = null;

  let _state, _scene, _socket;
  let _lockPending = null;
  const _worldItems = new Map();

  // ── Init ───────────────────────────────────────────────────────────────────

  function init(state, scene, socket) {
    _state  = state;
    _scene  = scene;
    _socket = socket;
    // Inventaire vide par défaut (aucun sac équipé)
    _resizeBag();
    _buildHotbarDOM();
    _buildInvPanel();
    _renderHotbar();
    _bindKeys();
    _bindHotbarTouch();
    _setupUseBtn();
    _setupGrabBtn();
    _setupBuildCtl();
    if (socket) {
      socket.on('door-lock-result', _onDoorLockResult);
    }
  }

  function _finishDoorLockAttempt(d) {
    if (!_lockPending) return;
    if (d?.id && _lockPending.decorId && d.id !== _lockPending.decorId) return;
    clearTimeout(_lockPending.timer);
    _lockPending = null;
    if (d?.ok) {
      if (d.inventory && ZS.Inventory?.applyAuthoritativeInv) {
        ZS.Inventory.applyAuthoritativeInv(d.inventory);
      }
      if (d.keyDropped) {
        ZS.UI?.showNotif?.('Porte verrouillée — clé au sol (inventaire plein)');
      } else {
        ZS.UI?.showNotif?.('Porte verrouillée — clé reçue');
      }
    } else {
      ZS.UI?.showNotif?.(d?.error || 'Verrouillage impossible');
    }
  }

  function _onDoorLockResult(d) {
    _finishDoorLockAttempt(d);
  }

  function _aimedDecorDoor(maxDist = 3.6) {
    const pick = ZS.pickWorldInteract?.(maxDist);
    if (pick?.kind === 'door') return ZS.getDecorDoorForInteract?.(pick.decorId) || null;
    return null;
  }

  /** Verrou en main + porte sous le viseur → pose le cadenas (sync serveur). */
  function installDoorLockOnNearestDoor() {
    return installDoorLockOnAimedDoor();
  }

  function installDoorLockOnAimedDoor() {
    if (!_state?.player) return false;
    const door = _aimedDecorDoor(3.6);
    if (!door) {
      ZS.UI?.showNotif?.('Visez une porte (objet Porte / Grande Porte)');
      return false;
    }
    if (door.locked) {
      ZS.UI?.showNotif?.('Porte déjà verrouillée');
      return true;
    }
    const active = _hotbar[_active];
    if (!active || active.type !== 'tool_verrou') {
      ZS.UI?.showNotif?.('Sélectionnez le verrou dans la barre d\'action');
      return false;
    }
    if (countItem('tool_verrou') < 1) {
      ZS.UI?.showNotif?.('Pas de verrou');
      return false;
    }
    if (!_socket?.connected) {
      ZS.UI?.showNotif?.('Serveur déconnecté');
      return false;
    }
    if (_lockPending) return true;

    const inv = getInvSnapshot();
    ZS.UI?.showNotif?.('Verrouillage…');
    _lockPending = {
      decorId: door.decorId,
      timer: setTimeout(() => {
        if (!_lockPending) return;
        _lockPending = null;
        ZS.UI?.showNotif?.('Pas de réponse serveur — redémarrez Node (npm run dev:server)');
      }, 3500),
    };
    _socket.emit('decor-door-lock', { id: door.decorId }, (res) => {
      _finishDoorLockAttempt({ ...res, id: door.decorId });
    });
    return true;
  }

  // ── Capacité du sac (dépend du sac équipé) ──────────────────────────────────

  function _bagCapacity() {
    const bag = _equip['Dos'];
    return bag ? (_def(bag.type)?.slots_inventaire_bonus || 0) : 0;
  }

  /** Sans sac équipé : tout le sac → hotbar (aligné serveur ensureSlotGrid). */
  function _migrateBagToHotbarIfNoSac() {
    if (_bagCapacity() > 0) return;
    const stacks = _bag.filter((s) => s?.type);
    if (!stacks.length) return;
    _bag = [];
    _resizeBag();
    for (const it of stacks) {
      const hasType = (t) => _hotbar.some((s) => s?.type === t);
      if (hasType(it.type)) continue;
      const i = _hotbar.findIndex((s) => !s || !s.type);
      if (i < 0) break;
      _hotbar[i] = it;
    }
  }

  // Redimensionne _bag selon le sac équipé ; le surplus part en hotbar sinon perdu.
  function _resizeBag() {
    const cap   = _bagCapacity();
    const items = _bag.filter(Boolean);
    const next  = Array(cap).fill(null);
    const overflow = [];
    items.forEach((it, i) => { if (i < cap) next[i] = it; else overflow.push(it); });
    _bag = next;
    for (const it of overflow) {
      let placed = false;
      for (let i = 0; i < HOTBAR_SIZE && !placed; i++) if (!_hotbar[i]) { _hotbar[i] = it; placed = true; }
      if (!placed) ZS.UI?.showNotif?.('Sac réduit : objets perdus');
    }
  }

  // ── Tick ───────────────────────────────────────────────────────────────────

  let _ghostTick = 0;

  function tick(dt) {
    const now = Date.now() * 0.001;
    const px = _state.player.x, pz = _state.player.z;
    // Culling distance : on masque (et on n'anime plus) les objets éloignés → moins de draw calls.
    const VIS2 = 55 * 55;
    _worldItems.forEach((it) => {
      const dx = it.x - px, dz = it.z - pz;
      const vis = dx * dx + dz * dz < VIS2;
      if (it.mesh.visible !== vis) it.mesh.visible = vis;
      if (vis) {
        it.mesh.rotation.y += dt * (it.introWake ? 0.45 : 1.8);
        const bob = it.introWake ? Math.sin(now * 2.2) * 0.04 : Math.sin(now * 2.5) * 0.1;
        it.mesh.position.y = it.mesh.userData.baseY + bob;
        if (it.introWake && it.mesh.userData.introGlow) {
          const pulse = 0.55 + Math.sin(now * 3.4) * 0.22;
          it.mesh.userData.introGlow.material.opacity = pulse;
          if (it.mesh.userData.introBeacon) {
            it.mesh.userData.introBeacon.intensity = 0.85 + Math.sin(now * 3.4) * 0.35;
          }
        }
      }
    });
    // Repère l'objet le plus proche dans la portée — PAS de ramassage automatique :
    // le joueur doit appuyer sur E / le bouton « Ramasser » (voir grabNearest).
    const grabR = ZS.Scenario?.isActive?.() ? GRAB_RANGE_INTRO : GRAB_RANGE;
    let nearId = null, nearItem = null, nearDist = grabR;
    for (const [id, item] of _worldItems) {
      if (!_isPersonalLootOwner(item)) continue;
      const d = Math.hypot(item.x - px, item.z - pz);
      if (d < nearDist) { nearDist = d; nearId = id; nearItem = item; }
    }
    _grabTargetId = nearId;
    _updateGrabUI(nearItem);

    const activeType = _hotbar[_active]?.type;
    if (activeType && _isStructure(activeType)) {
      if (++_ghostTick % 3 === 0) _updateBuildGhost();
    } else if (_ghost) {
      _ghostTick = 0;
      _updateBuildGhost();
    }
  }

  // Y a-t-il au moins une place pour cet objet (pile non pleine ou slot libre) ?
  function _canAddItem(type) {
    const def = _def(type);
    if (!def) return false;
    for (const arr of [_hotbar, _bag]) {
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        if (!s) return true;                                       // slot libre
        if (s.type === type && s.qty < def.maxStack) return true;  // pile non pleine
      }
    }
    return false;
  }

  function _canAddDoorKey(lockId) {
    if (!lockId) return false;
    let hasEmpty = false;
    for (const arr of [_hotbar, _bag]) {
      for (const s of arr) {
        if (!s) { hasEmpty = true; continue; }
        if (s.type === DOOR_KEY_TYPE && s.lockId === lockId) return false;
      }
    }
    return hasEmpty;
  }

  function _isPersonalLootOwner(item) {
    if (!item || item.ownerPlayerId == null) return true;
    if (_selfPlayerId == null) return true;
    return Number(item.ownerPlayerId) === Number(_selfPlayerId);
  }

  function setSelfPlayerId(id) {
    _selfPlayerId = id != null ? Number(id) : null;
  }

  function _canPickupWorldItem(item) {
    if (!item) return false;
    if (!_isPersonalLootOwner(item)) return false;
    if (item.bag) return true;
    if (item.type === DOOR_KEY_TYPE) return _canAddDoorKey(item.lockId);
    return _canAddItem(item.type);
  }

  function canAddItem(type) {
    return _canAddItem(type);
  }

  function canAddStack(type, qty) {
    const def = _def(type);
    if (!def) return false;
    let room = 0;
    for (const arr of [_hotbar, _bag]) {
      for (const s of arr) {
        if (!s) room += def.maxStack;
        else if (s.type === type) room += Math.max(0, def.maxStack - (s.qty || 1));
      }
    }
    return room >= Math.max(1, qty || 1);
  }

  // Caisse de butin de mort
  function _makeBagMesh() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x7a5a2a })));
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.13, 0.54),
      new THREE.MeshLambertMaterial({ color: 0x33240f }));
    strap.position.y = 0.06; g.add(strap);
    return g;
  }

  // Récupère tout le contenu d'un butin de mort.
  function collectBag(list) {
    if (!Array.isArray(list)) return;
    for (const it of list) {
      if (!it?.type) continue;
      if (it.lockId || it.durability != null || it.ammo != null) {
        addItemSlot({ ...it, qty: it.qty || 1 });
      } else {
        addItem(it.type, it.qty || 1);
      }
    }
    ZS.UI?.showNotif?.('Butin récupéré');
  }

  // Ramasse l'objet actuellement visé (le plus proche à portée).
  function grabNearest() {
    if (_grabTargetId == null) return false;
    const item = _worldItems.get(_grabTargetId);
    if (!item) { _grabTargetId = null; return false; }
    // Inventaire plein → on refuse le ramassage (sinon l'objet serait perdu).
    // (Le butin de mort est toujours ramassable : récupération au mieux.)
    if (!item.bag && !_canPickupWorldItem(item)) {
      ZS.UI?.showNotif?.(item.type === DOOR_KEY_TYPE ? 'Inventaire plein ou clé déjà possédée' : 'Inventaire plein !');
      return false;
    }
    // Attendre confirmation serveur avant de retirer le mesh.
    const pickedId = _grabTargetId;
    _socket.emit('item-pickup', { id: pickedId }, (res) => {
      if (res?.ok) {
        _scene.remove(item.mesh);
        _worldItems.delete(pickedId);
        ZS.IntroStarter?.onPickup?.(item.type);
      } else if (res?.err === 'not_ready') {
        ZS.UI?.showNotif?.('Un autre objet vous attend d\'abord…');
      } else {
        ZS.UI?.showNotif?.('Ramassage impossible');
      }
      _grabTargetId = null;
      _updateGrabUI(null);
    });
    return true;
  }

  // Affiche/masque le bouton de ramassage selon l'objet à portée.
  function _updateGrabUI(item) {
    const btn = document.getElementById('grab-btn');
    if (!btn) return;
    if (item) {
      if (item.bag) {
        btn.textContent = '🎒 Récupérer le butin';
        btn.classList.remove('full');
      } else {
        const def = _def(item.type);
        if (_canPickupWorldItem(item)) {
          btn.textContent = '✋ ' + (def?.label || 'Ramasser');
          btn.classList.remove('full');
        } else {
          btn.textContent = item.type === DOOR_KEY_TYPE ? '🔑 Clé déjà possédée' : '🎒 Inventaire plein';
          btn.classList.add('full');
        }
      }
      btn.style.display = 'flex';
    } else if (btn.style.display !== 'none') {
      btn.style.display = 'none';
    }
  }

  // ── Construction (structures placables : murs, portes, plancher, escalier) ───
  // Grille commune (GX) + hauteur d'étage (LEVEL_H) pour aligner et empiler.
  const GX = 3.0, LEVEL_H = 2.6;
  const STRUCT = {
    struct_mur_bois:                    { kind: 'wall',    prefabId: 'build_wall_wood',           w: 3.0, h: LEVEL_H, t: 0.36 },
    struct_mur_embrasure_porte:         { kind: 'doorway', prefabId: 'build_doorway_wood',        w: 3.0, h: LEVEL_H, t: 0.36, gap: 1.8 },
    struct_mur_embrasure_grande_porte:  { kind: 'doorway', prefabId: 'build_large_doorway_wood',  w: 3.0, h: LEVEL_H, t: 0.36, gap: 2.4 },
    struct_porte_bois:                  { kind: 'door',    prefabId: 'build_door_wood',           w: 3.0, h: LEVEL_H, t: 0.36, gap: 1.8 },
    struct_grande_porte_bois:           { kind: 'door',    prefabId: 'build_large_door_wood',     w: 3.0, h: LEVEL_H, t: 0.36, gap: 2.4 },
    struct_plancher_bois:               { kind: 'floor',   prefabId: 'build_floor_wood',          w: 3.0, h: 0.18,    t: 3.0 },
    struct_plafond_bois:                { kind: 'ceiling', prefabId: 'build_ceiling_wood',        w: 3.0, h: 0.18,    t: 3.0 },
    struct_escalier_bois:               { kind: 'stair',   prefabId: 'build_stair_wood',          w: 1.8, h: LEVEL_H, t: 3.0 },
    struct_storage_chest:               { kind: 'decorPrefab', prefabId: 'storage_chest', w: 1.2, h: 0.7, t: 0.8 },
  };
  const DOOR_KEY_TYPE = 'struct_cle';
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
  function spawnStructure(d) {
    const s = STRUCT[d.type];
    if (!s) return;
    const rotY  = d.rotY || 0;
    const baseY = (typeof d.y === 'number')
      ? d.y
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(d.x, d.z) : 0);
    const mesh  = _buildStructureMesh(d.type);
    mesh.position.set(d.x, baseY, d.z);
    mesh.rotation.y = rotY;
    _scene.add(mesh);

    const structureColliderId = `structure_${d.id}`;
    const cols = ((d.colliders && d.colliders.length) ? d.colliders : _structureColliders(d.type, d.x, d.z, rotY, baseY, 0))
      .map((c) => ({ ...c, decorId: c.decorId || structureColliderId }));
    ZS.registerDecorColliders?.(structureColliderId, cols);
    ZS.Network?.syncWorldColliders?.();

    if (s.kind === 'floor') {
      ZS.registerUpperFloor?.(d.x, d.z, s.w / 2, s.t / 2, baseY + s.h);
      const level = Math.max(0, Math.round((baseY - (ZS.getTerrainHeight?.(d.x, d.z) ?? baseY)) / LEVEL_H));
      ZS.BuildAnchors?.registerFoundation(structureColliderId, d.x, d.z, baseY, {
        hw: s.w / 2,
        hd: s.t / 2,
        level: Number.isFinite(d.level) ? d.level : level,
      });
    } else if (s.kind === 'stair') {
      // La marche monte le long du +Z local. Selon rotY, ce +Z pointe vers ±Z ou ±X
      // dans le monde : on suit ce SENS pour que la rampe monte comme l'escalier visuel.
      const alongZ = Math.abs(Math.cos(rotY)) > 0.5;
      const sign   = alongZ ? Math.cos(rotY) : Math.sin(rotY);  // direction de montée
      const lo = sign >= 0 ? baseY : baseY + s.h;
      const hi = sign >= 0 ? baseY + s.h : baseY;
      ZS.registerRamp?.(d.x, d.z,
        alongZ ? s.w / 2 : s.t / 2,
        alongZ ? s.t / 2 : s.w / 2,
        lo, hi, alongZ ? 'z' : 'x');
    }
  }

  // ── World items ────────────────────────────────────────────────────────────

  function spawnWorldItem(d) {
    if (!_scene) {
      console.warn('[inventory] spawnWorldItem ignoré — scène non initialisée', d?.id);
      return;
    }
    if (_worldItems.has(d.id)) return;
    if (d.bag) {                                  // butin de mort (caisse)
      const mesh  = _makeBagMesh();
      const baseY = (ZS.getDecorGroundHeight
        ? ZS.getDecorGroundHeight(d.x, d.z)
        : (ZS.getTerrainHeight ? ZS.getTerrainHeight(d.x, d.z) : 0)) + 0.45;
      mesh.position.set(d.x, baseY, d.z);
      mesh.userData.baseY = baseY;
      _scene.add(mesh);
      _worldItems.set(d.id, { mesh, type: 'death_bag', x: d.x, z: d.z, bag: true });
      return;
    }
    const def = _def(d.type);
    if (!def) return;
    const introWake = !!d.introPersonal && d.introBeat === 'wake' && d.type === 'tool_caillou';
    const mesh = _makePickupMesh(def, d.type, { introWake });
    const baseY = (ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(d.x, d.z)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(d.x, d.z) : 0)) + (introWake ? 0.42 : 0.55);
    mesh.position.set(d.x, baseY, d.z);
    mesh.userData.baseY = baseY;
    _scene.add(mesh);
    _worldItems.set(d.id, {
      mesh, type: d.type, x: d.x, z: d.z,
      lockId: d.lockId || null,
      ownerPlayerId: d.ownerPlayerId != null ? Number(d.ownerPlayerId) : null,
      introWake,
    });
  }

  function removeWorldItem(id) {
    const item = _worldItems.get(id);
    if (!item) return;
    _scene.remove(item.mesh);
    _worldItems.delete(id);
  }

  // ── Server pickup callback ─────────────────────────────────────────────────

  function receivePickup(type, qty) {
    if (type === 'map') return;
    if (_placePending && type === _placePendingType) {
      const placed = _fallbackBuildPlacement(_placePendingType, _placePendingTransform, _placePendingSpec);
      if (!placed) {
        _clearPlacePending();
        ZS.UI?.showNotif?.('Placement refusé');
      }
      return;
    }
    const n = Math.max(1, qty || 1);
    const added = addItem(type, n);
    const def = _def(type);
    if (def) ZS.UI.showNotif(added ? ('+' + n + ' ' + def.label) : 'Inventaire plein !');
  }

  // ── Inventory API (utilisé par Craft + Survival) ───────────────────────────

  function findItemSlot(type) {
    for (let i = 0; i < _hotbar.length; i++) {
      if (_hotbar[i]?.type === type) return { zone: 'hotbar', idx: i };
    }
    for (let i = 0; i < _bag.length; i++) {
      if (_bag[i]?.type === type) return { zone: 'bag', idx: i };
    }
    return null;
  }

  function countItem(type) {
    return [..._hotbar, ..._bag].reduce((n, s) => n + (s && s.type === type ? s.qty : 0), 0);
  }

  function removeItem(type, qty) {
    let left = qty;
    for (const arr of [_hotbar, _bag]) {
      for (let i = 0; i < arr.length && left > 0; i++) {
        if (!arr[i] || arr[i].type !== type) continue;
        const take = Math.min(arr[i].qty, left);
        arr[i].qty -= take;
        left -= take;
        if (arr[i].qty <= 0) arr[i] = null;
      }
    }
    _renderHotbar();
    if (_panelOpen) _renderInvPanel();
    _syncToServer();
  }

  function getInvSnapshot() {
    return {
      hotbar: JSON.parse(JSON.stringify(_hotbar)),
      bag: JSON.parse(JSON.stringify(_bag)),
      equip: JSON.parse(JSON.stringify(_equip)),
    };
  }

  function syncToServer() {
    _syncToServer();
  }

  function getStorageStacks() {
    const out = [];
    const scan = (zone, arr) => {
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        if (s?.type) out.push({ zone, idx: i, type: s.type, qty: s.qty || 1 });
      }
    };
    scan('hotbar', _hotbar);
    scan('bag', _bag);
    return out;
  }

  function getStorageSlots() {
    const out = [];
    const scan = (zone, arr) => {
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        out.push({
          zone,
          idx: i,
          type: s?.type || null,
          qty: s?.qty || 0,
        });
      }
    };
    scan('bag', _bag);
    scan('hotbar', _hotbar);
    return out;
  }

  function removeStack(zone, idx, qty) {
    const arr = zone === 'hotbar' ? _hotbar : zone === 'bag' ? _bag : null;
    if (!arr || idx < 0 || idx >= arr.length) return null;
    const s = arr[idx];
    if (!s?.type) return null;
    const take = Math.max(1, Math.min(s.qty || 1, qty || s.qty || 1));
    const out = { type: s.type, qty: take };
    s.qty = (s.qty || 1) - take;
    if (s.qty <= 0) arr[idx] = null;
    _renderHotbar();
    if (_panelOpen) _renderInvPanel();
    _syncToServer();
    return out;
  }

  function consumeOne(type) { removeItem(type, 1); }

  function placeActiveStructure() {
    const item = _hotbar[_active];
    const def = item ? _def(item.type) : null;
    if (!def || def.category !== 'structure') return false;
    _placeStructure();
    return true;
  }

  function addItem(type, qty) {
    const def = _def(type);
    if (!def) return false;
    if (type === DOOR_KEY_TYPE) return false;
    let left = qty;
    // Empiler d'abord
    for (const arr of [_hotbar, _bag]) {
      for (let i = 0; i < arr.length && left > 0; i++) {
        if (arr[i] && arr[i].type === type && arr[i].qty < def.maxStack) {
          const add = Math.min(def.maxStack - arr[i].qty, left);
          arr[i].qty += add;
          left -= add;
        }
      }
    }
    // Slots libres ensuite
    for (const arr of [_hotbar, _bag]) {
      for (let i = 0; i < arr.length && left > 0; i++) {
        if (arr[i]) continue;
        const add = Math.min(def.maxStack, left);
        arr[i] = { type, qty: add };
        if (def.category === 'firearm') arr[i].ammo = 0;
        left -= add;
      }
    }
    _renderHotbar();
    if (_panelOpen) _renderInvPanel();
    return left === 0;
  }

  /** Ajoute un slot complet (fouille, butin avec durabilité/munitions). */
  function addItemSlot(slot) {
    if (!slot?.type) return false;
    const clone = JSON.parse(JSON.stringify(slot));
    const n = clone.qty || 1;
    if (n > 1 && !clone.durability && clone.ammo == null) {
      return addItem(clone.type, n);
    }
    for (const arr of [_hotbar, _bag]) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i]) continue;
        arr[i] = clone;
        _renderHotbar();
        if (_panelOpen) _renderInvPanel();
        _syncToServer();
        const def = _def(clone.type);
        if (def) ZS.UI.showNotif('+' + (clone.qty || 1) + ' ' + (def.label || clone.type));
        return true;
      }
    }
    ZS.UI?.showNotif?.('Inventaire plein !');
    return false;
  }

  // ── Armes à feu ────────────────────────────────────────────────────────────

  function getActiveItem() { return _hotbar[_active] || null; }

  function hasDoorKey(lockId) {
    if (!lockId) return false;
    const match = (s) => s && s.type === DOOR_KEY_TYPE && s.lockId === lockId;
    for (const s of _hotbar) if (match(s)) return true;
    for (const s of _bag) if (match(s)) return true;
    for (const k of Object.keys(_equip)) if (match(_equip[k])) return true;
    return false;
  }

  function removeDoorKey(lockId) {
    if (!lockId) return false;
    const clear = (arr) => {
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        if (s && s.type === DOOR_KEY_TYPE && s.lockId === lockId) {
          arr[i] = null;
          return true;
        }
      }
      return false;
    };
    if (clear(_hotbar) || clear(_bag)) {
      _renderHotbar();
      if (_panelOpen) _renderInvPanel();
      _syncToServer();
      return true;
    }
    return false;
  }

  function getWeaponAmmo() {
    const s = _hotbar[_active];
    if (!s) return 0;
    return _def(s.type)?.category === 'firearm' ? (s.ammo || 0) : 0;
  }

  function decrementAmmo() {
    const s = _hotbar[_active];
    if (!s || _def(s.type)?.category !== 'firearm' || (s.ammo || 0) <= 0) return false;
    s.ammo--;
    _renderHotbar();
    ZS.UI.setAmmo(s.ammo);
    return true;
  }

  function reloadWeapon() {
    const s = _hotbar[_active];
    if (!s) return;
    const def = _def(s.type);
    if (!def || def.category !== 'firearm') return;
    const cap = def.capacite_chargeur || 12;
    if ((s.ammo || 0) >= cap) return;
    if (_socket?.connected) {
      _socket.emit('weapon-reload', { weaponType: s.type });
      return;
    }
    const ammoId = def.type_munition_accepte || 'ammo_pistolet';
    const need = cap - (s.ammo || 0);
    const load = Math.min(countItem(ammoId), need);
    if (load > 0) {
      removeItem(ammoId, load);
      s.ammo = (s.ammo || 0) + load;
      _renderHotbar();
      ZS.UI.setAmmo(s.ammo);
    }
  }

  // Usure outil/mêlée — serveur authoritatif (voir shoot / decor-chop / build-hit).
  function wearActiveWeapon() {
    /* no-op client — durabilité gérée serveur */
  }

  function getArmorValue() {
    return Object.values(_equip).reduce((sum, s) => {
      return sum + (s ? (_def(s.type)?.valeur_armure || 0) : 0);
    }, 0);
  }

  // Vie max = 100 + valeur d'armure équipée (le joueur peut dépasser 100).
  function getMaxHealth() { return 100 + getArmorValue(); }

  // Rafraîchit la barre de vie (max selon armure). Les PV sont authoritatifs serveur — ne pas les recalculer ici.
  function _syncArmor() {
    const max = getMaxHealth();
    const p = _state?.player;
    if (!p) return;
    const hp = Number(p.health);
    if (!Number.isFinite(hp)) return;
    ZS.UI?.setHealth?.(Math.floor(Math.max(0, Math.min(max, hp))), max);
  }

  // ── Sauvegarde ─────────────────────────────────────────────────────────────

  // Accepte l'ancien format (tableau = hotbar seule) ou le nouveau
  // { hotbar, bag, equip }. Restaure intégralement les 3 zones.
  function loadFromSave(data, opts = {}) {
    if (!data) return;
    ZS.ConsumeDebug?.log('loadFromSave', {
      trace: ZS.ConsumeDebug?.traceId?.('load'),
      serverFood: ZS.ConsumeDebug?.foodFromInv?.(data),
      opts,
    });
    const isArr = Array.isArray(data);
    const hotbar = isArr ? data : data.hotbar;
    const bag    = isArr ? null : data.bag;
    const equip  = isArr ? null : data.equip;

    if (Array.isArray(hotbar)) {
      if (hotbar.length === 0 && !equip && !bag) return;
      for (let i = 0; i < HOTBAR_SIZE; i++) _hotbar[i] = hotbar[i] || null;
    }
    if (equip && typeof equip === 'object') {
      for (const k of ['Tête', 'Torso', 'Mains', 'Dos']) _equip[k] = equip[k] || null;
    }
    const cap  = _bagCapacity();
    const next = Array(cap).fill(null);
    const overflow = [];
    if (Array.isArray(bag)) {
      bag.forEach((s, i) => { if (!s) return; if (i < cap) next[i] = s; else overflow.push(s); });
    }
    _bag = next;
    for (const it of overflow) {
      let placed = false;
      for (let i = 0; i < HOTBAR_SIZE && !placed; i++) if (!_hotbar[i]) { _hotbar[i] = it; placed = true; }
    }
    _migrateBagToHotbarIfNoSac();

    if (_hotbar[0] && _hotbar[0].type === 'pistol' && _hotbar[0].ammo == null) _hotbar[0].ammo = 30;

    _initToolDurability(_hotbar[0]);

    if (opts.fullReset) _setActiveSlot(0);

    if (!opts.skipRender) {
      _renderHotbar();
      if (_panelOpen) _renderInvPanel();
    }
    if (!opts.fullReset) {
      ZS.setHandItem?.(_hotbar[_active]?.type || null);
      ZS.UI?.setWeaponUI?.(_hotbar[_active]?.type || null);
    }
    _syncArmor();
  }

  function _sameStack(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.type === b.type
      && (a.qty || 1) === (b.qty || 1)
      && (a.ammo ?? -1) === (b.ammo ?? -1)
      && (a.durability ?? -1) === (b.durability ?? -1)
      && (a.lockId || '') === (b.lockId || '');
  }

  function _renderOneHotbarSlot(i) {
    const bar = document.getElementById('hotbar');
    if (!bar || i < 0 || i >= HOTBAR_SIZE) return;
    const el = bar.children[i];
    if (!el) return;
    const item = _hotbar[i];
    const hint = el.querySelector('.hb-key');
    const name = el.querySelector('.hb-name');
    el.replaceChildren();
    if (hint) el.appendChild(hint);
    if (name) el.appendChild(name);
    if (item) {
      const def  = _def(item.type);
      const icon = document.createElement('span');
      icon.className   = 'hb-icon';
      Object.assign(icon.style, {
        width: '42px', height: '42px', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      });
      icon.textContent = def ? def.icon : '?';
      ZS.Icons?.apply(icon, item.type);
      const count = document.createElement('span');
      count.className   = 'hb-count';
      if (def?.category === 'firearm') {
        count.textContent = (item.ammo ?? 0) + '/' + (def.capacite_chargeur || 0);
      } else {
        count.textContent = item.qty > 1 ? item.qty : '';
      }
      el.appendChild(icon);
      el.appendChild(count);
    }
    if (i === _active) {
      const active = _hotbar[_active];
      if (active && _def(active.type)?.category === 'firearm') {
        ZS.UI.setAmmo(active.ammo ?? 0);
      }
      ZS.setHandItem?.(_hotbar[_active]?.type || null);
      ZS.UI?.setWeaponUI?.(_hotbar[_active]?.type || null);
    }
  }

  function applyAuthoritativeInv(data) {
    if (!data) return;
    ZS.ConsumeDebug?.log('applyAuthoritativeInv', {
      serverFood: ZS.ConsumeDebug?.foodFromInv?.(data),
      clientBefore: ZS.ConsumeDebug?.clientSnapshot?.(),
    });
    const before = _hotbar.map((s) => (s ? { ...s } : null));
    loadFromSave(data, { fullReset: false, skipRender: true });
    if (data.scenario) ZS.Scenario?.mergeServerScenario?.(data.scenario);
    let slotDirty = false;
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      if (!_sameStack(before[i], _hotbar[i])) {
        _renderOneHotbarSlot(i);
        slotDirty = true;
      }
    }
    if (slotDirty) _updateUseBtn();
    if (_panelOpen) _renderInvPanel();
    _syncArmor();
    ZS.BeachIntroPrefabs?.syncIntroCampfireTorchVisibility?.();
  }

  const STARTER_CAILLOU = { type: 'tool_caillou', qty: 1, durability: 80 };
  const STARTER_TORCHE  = { type: 'tool_torche', qty: 1 };
  const STARTER_RATIONS = [
    { type: 'food_eau_bouteille', qty: 1 },
    { type: 'food_sandwich', qty: 1 },
  ];

  function _initToolDurability(slot) {
    if (!slot?.type || slot.durability != null) return;
    const max = _def(slot.type)?.durabilite_max;
    if (max != null && max !== Infinity) slot.durability = max;
  }

  /** Kit de départ si inventaire vide (1re connexion ou vieille sauvegarde). */
  function ensureStarterCaillou() {
    const hasAny = _hotbar.some((s) => s && s.type)
      || _bag.some((s) => s && s.type)
      || Object.values(_equip).some((s) => s && s.type);
    if (hasAny) return false;
    _hotbar[0] = { ...STARTER_CAILLOU };
    _hotbar[1] = { ...STARTER_TORCHE };
    _setActiveSlot(0);
    _syncToServer();
    return true;
  }

  function _hasItemType(type) {
    return _hotbar.some((s) => s && s.type === type)
      || _bag.some((s) => s && s.type === type)
      || Object.values(_equip).some((s) => s && s.type === type);
  }

  /** Eau + sandwich si aucun aliment (secours client). */
  function ensureStarterRations() {
    const hasFood = _hotbar.some((s) => s?.type?.startsWith('food_'))
      || _bag.some((s) => s?.type?.startsWith('food_'))
      || Object.values(_equip).some((s) => s?.type?.startsWith('food_'));
    if (hasFood) return false;
    let changed = false;
    for (const s of STARTER_RATIONS) {
      if (_hasItemType(s.type)) continue;
      if (addItem(s.type, s.qty)) changed = true;
    }
    if (changed) _syncToServer();
    return changed;
  }

  /** Torche si absente (rejoin de nuit — secours client si sync serveur en retard). */
  function ensureStarterTorche() {
    if (_hasItemType('tool_torche')) return false;
    const idx = _hotbar.findIndex((s) => !s || !s.type);
    if (idx >= 0) _hotbar[idx] = { ...STARTER_TORCHE };
    else _bag.push({ ...STARTER_TORCHE });
    _renderHotbar();
    return true;
  }

  /** Respawn : restaure le kit serveur + caillou slot 0 + torche slot 1. */
  function loadRespawnKit(data) {
    loadFromSave(data, { fullReset: true });
    let changed = false;
    if (!_hotbar[0] || _hotbar[0].type !== 'tool_caillou') {
      _hotbar[0] = { ...STARTER_CAILLOU };
      changed = true;
    }
    if (!_hotbar[1] || _hotbar[1].type !== 'tool_torche') {
      _hotbar[1] = { ...STARTER_TORCHE };
      changed = true;
    }
    _initToolDurability(_hotbar[0]);
    if (changed) _renderHotbar();
    _setActiveSlot(0);
    _syncToServer();
  }

  function clear() {
    _hotbar = Array(HOTBAR_SIZE).fill(null);
    _equip  = { Tête: null, Torso: null, Mains: null, Dos: null };
    _bag    = [];
    _resizeBag();
    _sel = null;
    _renderHotbar();
    if (_panelOpen) _renderInvPanel();
    _syncToServer();
  }

  function _syncToServer() {
    /* inventaire authoritaire serveur — plus de push client */
  }

  // ── Hotbar DOM ─────────────────────────────────────────────────────────────

  function _buildHotbarDOM() {
    const bar = document.getElementById('hotbar');
    bar.replaceChildren();
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const slot = document.createElement('div');
      slot.className = 'hb-slot' + (i === _active ? ' active' : '');
      slot.dataset.slot = i;
      const hint = document.createElement('span');
      hint.className = 'hb-key';
      hint.textContent = i + 1;
      slot.appendChild(hint);
      bar.appendChild(slot);
    }
  }

  function _renderHotbar() {
    const bar = document.getElementById('hotbar');
    if (!bar) return;
    for (let i = 0; i < HOTBAR_SIZE; i++) _renderOneHotbarSlot(i);
    _updateUseBtn();
    _syncToServer();
  }

  function _setActiveSlot(i) {
    const bar = document.getElementById('hotbar');
    if (!bar) return;
    bar.children[_active].classList.remove('active');
    _active = i;
    bar.children[_active].classList.add('active');
    _updateUseBtn();
    ZS.setHandItem?.(_hotbar[_active]?.type || null);
    ZS.UI?.setWeaponUI?.(_hotbar[_active]?.type || null);
    _showActiveName();
  }

  // Affiche le nom de l'item sélectionné au-dessus de son slot, puis le masque.
  let _nameTimer = null;
  function _showActiveName() {
    const bar = document.getElementById('hotbar');
    if (!bar) return;
    bar.querySelectorAll('.hb-name').forEach((n) => n.remove());
    clearTimeout(_nameTimer);
    const item = _hotbar[_active];
    const def  = item ? _def(item.type) : null;
    if (!def) return;
    const label = document.createElement('span');
    label.className   = 'hb-name';
    label.textContent = def.label || item.type;
    bar.children[_active].appendChild(label);
    requestAnimationFrame(() => label.classList.add('show'));
    _nameTimer = setTimeout(() => {
      label.classList.remove('show');
      setTimeout(() => label.remove(), 300);
    }, 2200);
  }

  function _updateUseBtn() {
    const item = _hotbar[_active];
    const def  = item ? _def(item.type) : null;
    const isStruct = def && def.category === 'structure';
    const show = def && ['food','medical','ammo','map','equipment','structure'].includes(def.category);
    const btn  = document.getElementById('use-btn');
    if (btn) {
      btn.style.display = show ? 'flex' : 'none';
      btn.textContent = isStruct ? '🔨 Placer' : 'Utiliser';
    }
    const ctl = document.getElementById('build-ctl');
    if (ctl) ctl.style.display = isStruct ? 'flex' : 'none';
  }

  // ── Utilisation ────────────────────────────────────────────────────────────

  function _useActiveItem() {
    const item = _hotbar[_active];
    if (!item) return;
    const def = _def(item.type);
    if (!def) return;

    if (def.category === 'food' || def.category === 'medical') {
      const loc = findItemSlot(item.type) || { zone: 'hotbar', idx: _active };
      if (ZS.Survival.useItem(item.type, loc)) {
        const dur = (ZS.getGrip?.(item.type)?.anim?.use?.dur)
          ?? (def.category === 'medical' ? (def.temps_utilisation || 1.5) : 0.5);
        if (ZS._fpsArms) ZS.triggerArmAnim(ZS._fpsArms, 'use', item.type, { dur });
      }
      return;
    }
    if (def.category === 'map') {
      ZS.Map?.toggleMap();
      return;
    }
    if (def.category === 'ammo') {
      reloadWeapon();
      return;
    }
    if (def.category === 'equipment') {
      _equipFromHotbar(_active);
      return;
    }
    if (def.category === 'structure') {
      _placeStructure();
      return;
    }
    if (def.category === 'tool' && item.type === 'tool_verrou') {
      return installDoorLockOnNearestDoor();
    }
  }

  function _equipFromHotbar(idx) {
    const item = _hotbar[idx];
    if (!item) return;
    const def  = _def(item.type);
    if (!def || def.category !== 'equipment') return;
    const slotName = def.slot_equipement;
    _moveOrSwap({ zone: 'hotbar', idx }, { zone: 'equip', idx: slotName });
    _renderHotbar();
    if (_panelOpen) _renderInvPanel();
    ZS.UI.showNotif(def.label + ' équipé');
  }

  // ── Déplacement d'items (glisser-déposer) ─────────────────────────────────

  function _parseSlotIdx(zone, raw) {
    if (zone === 'equip') return raw;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : raw;
  }

  function _slotFromEl(el) {
    if (!el?.dataset?.invZone) return null;
    return {
      zone: el.dataset.invZone,
      idx: _parseSlotIdx(el.dataset.invZone, el.dataset.invIdx),
    };
  }

  function _ensureDragGhost() {
    if (_dragGhost) return;
    _dragGhost = document.createElement('div');
    _dragGhost.id = 'inv-drag-ghost';
    _dragGhost.hidden = true;
    document.body.appendChild(_dragGhost);
  }

  function _positionDragGhost(x, y) {
    if (!_dragGhost) return;
    _dragGhost.style.left = `${x}px`;
    _dragGhost.style.top = `${y}px`;
  }

  function _setDragOver(el) {
    if (_dragOverEl === el) return;
    if (_dragOverEl) _dragOverEl.classList.remove('inv-slot-drag-over');
    _dragOverEl = el || null;
    if (_dragOverEl) _dragOverEl.classList.add('inv-slot-drag-over');
  }

  function _clearDragVisuals() {
    document.querySelectorAll('#inv-panel .inv-slot-dragging').forEach((n) => {
      n.classList.remove('inv-slot-dragging');
    });
    _setDragOver(null);
    if (_dragGhost) _dragGhost.hidden = true;
  }

  function _endDrag() {
    _drag = null;
    _dragPending = null;
    _clearDragVisuals();
  }

  function _findInvSlotEl(x, y) {
    if (_dragGhost) _dragGhost.hidden = true;
    const hit = document.elementFromPoint(x, y);
    if (_dragGhost) _dragGhost.hidden = false;
    return hit?.closest?.('#inv-panel .inv-slot') || null;
  }

  function _startDrag(from, item, x, y) {
    _ensureDragGhost();
    const def = _def(item.type);
    _dragGhost.replaceChildren();
    const ic = document.createElement('span');
    ic.className = 'inv-drag-ghost-icon';
    ic.textContent = def?.icon || '?';
    _dragGhost.appendChild(ic);
    ZS.Icons?.apply(ic, item.type);
    if (item.qty > 1) {
      const q = document.createElement('span');
      q.className = 'inv-drag-ghost-qty';
      q.textContent = item.qty;
      _dragGhost.appendChild(q);
    }
    _dragGhost.hidden = false;
    _positionDragGhost(x, y);
    _drag = { from, ptr: _dragPending?.ptr ?? null };
    _dragPending = null;
    const srcEl = document.querySelector(
      `#inv-panel .inv-slot[data-inv-zone="${from.zone}"][data-inv-idx="${from.idx}"]`,
    );
    srcEl?.classList.add('inv-slot-dragging');
  }

  function _onInvPointerMove(e) {
    if (!_panelOpen) return;
    if (_dragPending && e.pointerId === _dragPending.ptr) {
      const dx = e.clientX - _dragPending.x;
      const dy = e.clientY - _dragPending.y;
      if (Math.hypot(dx, dy) >= _DRAG_THRESH) {
        const item = _getSlot(_dragPending.zone, _dragPending.idx);
        if (item) _startDrag({ zone: _dragPending.zone, idx: _dragPending.idx }, item, e.clientX, e.clientY);
      }
      if (e.cancelable) e.preventDefault();
      return;
    }
    if (!_drag || e.pointerId !== _drag.ptr) return;
    _positionDragGhost(e.clientX, e.clientY);
    _setDragOver(_findInvSlotEl(e.clientX, e.clientY));
    if (e.cancelable) e.preventDefault();
  }

  function _releaseDragCapture(ptr) {
    if (_dragPending?.ptr === ptr) {
      try { _dragPending.el?.releasePointerCapture?.(ptr); } catch (_) { /* ignore */ }
    }
    if (_drag?.ptr === ptr) {
      const from = _drag.from;
      const srcEl = document.querySelector(
        `#inv-panel .inv-slot[data-inv-zone="${from.zone}"][data-inv-idx="${from.idx}"]`,
      );
      try { srcEl?.releasePointerCapture?.(ptr); } catch (_) { /* ignore */ }
    }
  }

  function _finishDragDrop(e) {
    if (_dragPending && e.pointerId === _dragPending.ptr) {
      _releaseDragCapture(e.pointerId);
      _dragPending = null;
      _updateInvSelection();
      return;
    }
    if (!_drag || e.pointerId !== _drag.ptr) return;
    _releaseDragCapture(e.pointerId);
    const from = _drag.from;
    const targetEl = _findInvSlotEl(e.clientX, e.clientY);
    const to = targetEl ? _slotFromEl(targetEl) : null;
    _endDrag();
    if (to && !(to.zone === from.zone && to.idx === from.idx)) {
      _moveOrSwap(from, to);
      const landed = _getSlot(to.zone, to.idx);
      _sel = landed ? { zone: to.zone, idx: to.idx } : null;
      if (!landed && _getSlot(from.zone, from.idx)) _sel = { zone: from.zone, idx: from.idx };
      _renderInvPanel();
      _renderHotbar();
      return;
    }
    _sel = _getSlot(from.zone, from.idx) ? { zone: from.zone, idx: from.idx } : null;
    _updateInvSelection();
  }

  function _onSlotPointerDown(e, zone, idx) {
    if (!_panelOpen) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    _endDrag();
    const item = _getSlot(zone, idx);
    if (!item) {
      _sel = null;
      _updateInvSelection();
      return;
    }
    _sel = { zone, idx };
    _dragPending = {
      zone, idx, ptr: e.pointerId, x: e.clientX, y: e.clientY, el: e.currentTarget,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    _updateInvSelection();
  }

  function _onSlotPointerUp(e) {
    if (_dragPending && e.pointerId === _dragPending.ptr) {
      try { _dragPending.el?.releasePointerCapture?.(e.pointerId); } catch (_) { /* ignore */ }
    }
    _finishDragDrop(e);
  }

  function _bindInvDrag() {
    if (document.body.dataset.invDrag === '1') return;
    document.body.dataset.invDrag = '1';
    document.addEventListener('pointermove', _onInvPointerMove, { passive: false });
    document.addEventListener('pointerup', _onSlotPointerUp);
    document.addEventListener('pointercancel', _onSlotPointerUp);
  }

  function _updateInvSelection() {
    const selItem = _sel ? _getSlot(_sel.zone, _sel.idx) : null;
    const selDef = selItem ? _def(selItem.type) : null;
    if (!_sel || !selItem) _sel = null;

    const hint = document.getElementById('inv-hint');
    if (hint) {
      hint.classList.toggle('inv-hint-selected', !!selDef);
      const desktop = document.body.classList.contains('mode-desktop');
      hint.textContent = desktop
        ? 'Glissez un objet vers un emplacement pour le déplacer.'
        : 'Maintenez et glissez un objet vers un autre emplacement.';
    }

    if (document.body.classList.contains('mode-desktop')) {
      _renderItemDetail(selItem);
    }

    const dropBtn = document.getElementById('inv-drop-btn');
    if (dropBtn) {
      dropBtn.classList.toggle('inv-drop-btn-active', !!selItem);
      dropBtn.disabled = !selItem;
    }

    document.querySelectorAll('#inv-panel .inv-slot').forEach((el) => {
      const slot = _slotFromEl(el);
      if (!slot) return;
      el.classList.toggle(
        'inv-slot-selected',
        !!(_sel && _sel.zone === slot.zone && _sel.idx === slot.idx),
      );
    });
  }

  function _getSlot(zone, idx) {
    if (zone === 'equip')  return _equip[idx];
    if (zone === 'hotbar') return _hotbar[idx];
    return _bag[idx];
  }
  function _setSlot(zone, idx, val) {
    if (zone === 'equip')  { _equip[idx] = val; return; }
    if (zone === 'hotbar') { _hotbar[idx] = val; return; }
    _bag[idx] = val;
  }

  function _moveOrSwap(from, to) {
    if (from.zone === to.zone && from.idx === to.idx) return;   // même slot → annule
    const src = _getSlot(from.zone, from.idx);
    if (!src) return;
    const dst = _getSlot(to.zone, to.idx);
    const preMove = getInvSnapshot();

    // Validation des emplacements d'équipement (slot précis requis)
    if (to.zone === 'equip') {
      const def = _def(src.type);
      if (!def || def.category !== 'equipment' || def.slot_equipement !== to.idx) {
        ZS.UI.showNotif('Emplacement incompatible'); return;
      }
    }
    if (from.zone === 'equip' && dst) {
      const ddef = _def(dst.type);
      if (!ddef || ddef.category !== 'equipment' || ddef.slot_equipement !== from.idx) {
        ZS.UI.showNotif('Emplacement incompatible'); return;
      }
    }

    // Fusion de piles identiques
    if (dst && dst.type === src.type) {
      const max = _def(src.type)?.maxStack || 1;
      if (max > 1) {
        const total = (dst.qty || 1) + (src.qty || 1);
        dst.qty = Math.min(max, total);
        const rest = total - dst.qty;
        _setSlot(from.zone, from.idx, rest > 0 ? { ...src, qty: rest } : null);
        _afterMove(from, to, preMove);
        return;
      }
    }

    // Échange
    _setSlot(to.zone, to.idx, src);
    _setSlot(from.zone, from.idx, dst || null);
    _afterMove(from, to, preMove);
  }

  function _afterMove(from, to, preMove) {
    const touchedDos = (from.zone === 'equip' && from.idx === 'Dos')
                    || (to.zone === 'equip' && to.idx === 'Dos');
    if (touchedDos) _resizeBag();
    if (from.zone === 'equip' || to.zone === 'equip') _syncArmor();
    if (_socket?.connected) {
      _socket.emit('inventory-move', { from: { zone: from.zone, index: from.idx }, to: { zone: to.zone, index: to.idx } }, (res) => {
        if (res?.ok) return;
        if (preMove) applyAuthoritativeInv(preMove);
        _renderInvPanel();
        _renderHotbar();
        ZS.UI?.showNotif?.('Déplacement refusé');
      });
    }
  }

  // Jette au sol l'objet sélectionné (hotbar, sac ou équipement) → redevient ramassable.
  function _dropSelected() {
    if (!_sel) return;
    const item = _getSlot(_sel.zone, _sel.idx);
    if (!item) { _sel = null; _renderInvPanel(); return; }
    if (item.type === DOOR_KEY_TYPE && !item.lockId) {
      ZS.UI?.showNotif?.('Cette clé est invalide');
      return;
    }
    const zone = _sel.zone, idx = _sel.idx;
    const dropPayload = { zone, index: idx, type: item.type, qty: item.qty || 1 };
    if (item.lockId) dropPayload.lockId = item.lockId;
    _socket.emit('item-drop', dropPayload, (res) => {
      if (res?.ok) {
        _setSlot(zone, idx, null);
        _sel = null;
        if (zone === 'equip' && idx === 'Dos') _resizeBag();
        const def = _def(item.type);
        ZS.UI?.showNotif?.('Jeté : ' + (def?.label || item.type));
        _renderInvPanel();
        _renderHotbar();
      } else {
        ZS.UI?.showNotif?.('Impossible de jeter l\'objet');
      }
    });
  }

  // ── Panneau inventaire ─────────────────────────────────────────────────────

  const EQUIP_SLOTS = ['Tête', 'Torso', 'Mains', 'Dos'];

  const _CAT_LABELS = {
    food: 'Nourriture',
    medical: 'Soins',
    melee: 'Mêlée',
    firearm: 'Arme à feu',
    ammo: 'Munitions',
    equipment: 'Équipement',
    resource: 'Ressource',
    tool: 'Outil',
    structure: 'Construction',
    key: 'Clé',
    map: 'Carte',
  };

  function _itemDesc(type) {
    const def = _def(type);
    return def?.desc || 'Aucune description disponible.';
  }

  function _renderItemDetail(selItem) {
    if (!_detailName || !_detailDesc) return;
    if (!selItem) {
      if (_detailIcon) _detailIcon.textContent = '▫';
      _detailName.textContent = 'Aucune sélection';
      if (_detailCat) _detailCat.textContent = '';
      _detailDesc.textContent = 'Sélectionnez un objet pour afficher sa description.';
      return;
    }
    const def = _def(selItem.type);
    if (_detailIcon) {
      _detailIcon.textContent = def?.icon || '?';
      ZS.Icons?.apply(_detailIcon, selItem.type);
    }
    _detailName.textContent = def?.label || selItem.type;
    if (_detailCat) {
      _detailCat.textContent = def?.category
        ? (_CAT_LABELS[def.category] || def.category)
        : '';
    }
    _detailDesc.textContent = _itemDesc(selItem.type);
  }

  function _buildInvPanel() {
    _invBackdrop = document.createElement('div');
    _invBackdrop.id = 'inv-backdrop';
    _invBackdrop.className = 'zs-backdrop';
    _invBackdrop.addEventListener('click', togglePanel);
    document.body.appendChild(_invBackdrop);

    const p = document.createElement('div');
    p.id = 'inv-panel';
    p.className = 'zs-panel zs-panel-wide';

    const dropBtn = document.createElement('button');
    dropBtn.type = 'button';
    dropBtn.id = 'inv-drop-btn';
    dropBtn.className = 'inv-drop-btn';
    dropBtn.textContent = '🗑 Jeter';
    dropBtn.addEventListener('click', _dropSelected);
    dropBtn.addEventListener('touchstart', (e) => { e.preventDefault(); _dropSelected(); }, { passive: false });

    const hdr = ZS.PanelUI.makeHeader({
      title: '🎒 Inventaire',
      subtitle: 'I · Tab · Échap pour fermer',
      extraButtons: [dropBtn],
      onClose: togglePanel,
    });
    p.appendChild(hdr.el);

    const hint = ZS.PanelUI.makeHint('Maintenez et glissez un objet vers un autre emplacement.');
    hint.id = 'inv-hint';
    p.appendChild(hint);

    const body = document.createElement('div');
    body.className = 'zs-panel-body inv-body';

    const equipCol = document.createElement('aside');
    equipCol.className = 'inv-equip-col';
    const eqTitle = document.createElement('h3');
    eqTitle.className = 'inv-section-title';
    eqTitle.textContent = 'Équipement';
    equipCol.appendChild(eqTitle);
    const equip = document.createElement('div');
    equip.id = 'inv-equip';
    equip.className = 'inv-equip-grid';
    equipCol.appendChild(equip);
    body.appendChild(equipCol);

    const mainCol = document.createElement('div');
    mainCol.className = 'inv-main-col';

    const hbSec = document.createElement('section');
    hbSec.className = 'inv-section inv-hotbar-section';
    const hbTitle = document.createElement('h3');
    hbTitle.className = 'inv-section-title';
    hbTitle.textContent = 'Barre d\'action';
    hbSec.appendChild(hbTitle);
    const hbGrid = document.createElement('div');
    hbGrid.id = 'inv-hotbar';
    hbGrid.className = 'inv-hotbar-grid';
    hbSec.appendChild(hbGrid);
    mainCol.appendChild(hbSec);

    const bagSec = document.createElement('section');
    bagSec.className = 'inv-section inv-bag-section';
    const bagTitle = document.createElement('h3');
    bagTitle.id = 'inv-bag-title';
    bagTitle.className = 'inv-section-title';
    bagTitle.textContent = 'Sac';
    bagSec.appendChild(bagTitle);
    const grid = document.createElement('div');
    grid.id = 'inv-grid';
    grid.className = 'inv-bag-grid';
    bagSec.appendChild(grid);
    mainCol.appendChild(bagSec);

    body.appendChild(mainCol);

    const detailCol = document.createElement('aside');
    detailCol.className = 'inv-detail-col inv-desktop-only';
    const detailTitle = document.createElement('h3');
    detailTitle.className = 'inv-section-title';
    detailTitle.textContent = 'Détail';
    detailCol.appendChild(detailTitle);
    const detailCard = document.createElement('div');
    detailCard.className = 'inv-detail-card';
    _detailIcon = document.createElement('div');
    _detailIcon.className = 'inv-detail-icon';
    _detailIcon.textContent = '▫';
    detailCard.appendChild(_detailIcon);
    _detailName = document.createElement('div');
    _detailName.className = 'inv-detail-name';
    _detailName.textContent = 'Aucune sélection';
    detailCard.appendChild(_detailName);
    _detailCat = document.createElement('div');
    _detailCat.className = 'inv-detail-cat';
    detailCard.appendChild(_detailCat);
    _detailDesc = document.createElement('p');
    _detailDesc.className = 'inv-detail-desc';
    _detailDesc.textContent = 'Sélectionnez un objet pour afficher sa description.';
    detailCard.appendChild(_detailDesc);
    detailCol.appendChild(detailCard);
    body.appendChild(detailCol);

    p.appendChild(body);

    document.body.appendChild(p);
    _bindInvDrag();
  }

  function _renderInvPanel() {
    const equip = document.getElementById('inv-equip');
    if (!equip) return;

    equip.replaceChildren();
    for (const slotName of EQUIP_SLOTS) {
      const item = _equip[slotName];
      const wrap = document.createElement('div');
      wrap.className = 'inv-equip-row';
      const lbl = document.createElement('span');
      lbl.className = 'inv-slot-label';
      lbl.textContent = slotName;
      const el = _makeSlotEl(item);
      _wireSlot(el, 'equip', slotName);
      wrap.appendChild(lbl);
      wrap.appendChild(el);
      equip.appendChild(wrap);
    }

    const hb = document.getElementById('inv-hotbar');
    hb.replaceChildren();
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const el = _makeSlotEl(_hotbar[i]);
      if (i === _active) el.classList.add('inv-slot-active');
      const keyHint = document.createElement('span');
      keyHint.className = 'inv-slot-key inv-desktop-only';
      keyHint.textContent = String(i + 1);
      el.appendChild(keyHint);
      _wireSlot(el, 'hotbar', i);
      hb.appendChild(el);
    }

    const title = document.getElementById('inv-bag-title');
    if (title) {
      title.textContent = _bag.length
        ? `Sac · ${_bag.length} emplacements`
        : 'Sac · aucun sac équipé';
    }
    const grid = document.getElementById('inv-grid');
    grid.replaceChildren();
    if (!_bag.length) {
      const empty = document.createElement('p');
      empty.className = 'inv-bag-empty';
      empty.textContent = 'Équipez un sac pour stocker des objets.';
      grid.appendChild(empty);
    } else {
      for (let i = 0; i < _bag.length; i++) {
        const el = _makeSlotEl(_bag[i]);
        _wireSlot(el, 'bag', i);
        grid.appendChild(el);
      }
    }
    _updateInvSelection();
  }

  function _wireSlot(el, zone, idx) {
    const item = _getSlot(zone, idx);
    el.dataset.invZone = zone;
    el.dataset.invIdx = String(idx);
    if (item) el.title = _def(item.type)?.label || '';
    el.addEventListener('pointerdown', (e) => _onSlotPointerDown(e, zone, idx), { passive: false });
  }

  function _makeSlotEl(item) {
    const el = document.createElement('div');
    el.className = 'inv-slot' + (item ? ' inv-slot-filled' : '');
    if (item) {
      const def = _def(item.type);
      const ic = document.createElement('span');
      ic.className = 'inv-slot-icon';
      ic.textContent = def ? def.icon : '?';
      el.appendChild(ic);
      ZS.Icons?.apply(ic, item.type);
      if (item.qty > 1) {
        const q = document.createElement('span');
        q.className = 'inv-slot-qty';
        q.textContent = item.qty;
        el.appendChild(q);
      }
    }
    return el;
  }

  function togglePanel() {
    _panelOpen = !_panelOpen;
    const p = document.getElementById('inv-panel');
    if (!p) return;
    _sel = null;
    _endDrag();
    p.style.display = _panelOpen ? 'flex' : 'none';
    if (_invBackdrop) _invBackdrop.style.display = _panelOpen ? 'block' : 'none';
    if (_panelOpen) {
      _renderInvPanel();
      ZS.onUiPanelOpen?.();
    } else {
      ZS.onUiPanelClose?.();
    }
  }

  // ── Bindings ───────────────────────────────────────────────────────────────

  function _bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (ZS.shortcutsBlocked?.(e) || ZS.Chat?.isOpen?.() || ZS.Rcon?.isOpen?.()) return;
      const digit = parseInt(e.key);
      if (digit >= 1 && digit <= 6) _setActiveSlot(digit - 1);
      if (e.code === 'KeyE') {
        if (ZS.AdminLiveDecor?.isActive?.()) return;
        if (e.repeat || ZS.isInteractHoldActive?.()) return;
        if (!grabNearest()) _useActiveItem();
      }
      if (e.code === 'KeyI') togglePanel();
      if (e.code === 'Tab' && document.body.classList.contains('mode-desktop')) {
        e.preventDefault();
        togglePanel();
      }
      if (e.code === 'PageUp'   && _isStructure(_hotbar[_active]?.type)) _changeLevel(1);
      if (e.code === 'PageDown' && _isStructure(_hotbar[_active]?.type)) _changeLevel(-1);
      if (e.code === 'Escape' && _panelOpen) togglePanel();
    });
  }

  function _bindHotbarTouch() {
    const bar = document.getElementById('hotbar');
    // pointerdown : sélection immédiate (souris ET tactile), non bloquée par le
    // flux d'événements du joystick → on peut sélectionner un slot en se déplaçant.
    let _lastTap = 0;
    bar.addEventListener('pointerdown', (e) => {
      const slotEl = e.target.closest('.hb-slot');
      if (!slotEl) return;
      e.preventDefault();
      const now = Date.now();
      if (now - _lastTap < 60) return;   // anti-rebond (pointer + éventuel doublon)
      _lastTap = now;
      const idx = parseInt(slotEl.dataset.slot);
      if (idx === _active) {
        const def = _hotbar[idx] ? _def(_hotbar[idx].type) : null;
        if (def && ['food','medical','ammo','equipment','structure'].includes(def.category)) _useActiveItem();
      } else {
        _setActiveSlot(idx);
      }
    });
  }

  function _setupUseBtn() {
    const btn = document.getElementById('use-btn');
    if (!btn) return;
    btn.addEventListener('click', _useActiveItem);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); _useActiveItem(); }, { passive: false });
  }

  function _setupGrabBtn() {
    const btn = document.getElementById('grab-btn');
    if (!btn) return;
    btn.addEventListener('click', grabNearest);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); grabNearest(); }, { passive: false });
  }

  // Contrôle d'étage de construction (▲ / ▼) — visible quand une structure est en main.
  function _setupBuildCtl() {
    const ctl = document.createElement('div');
    ctl.id = 'build-ctl';
    ctl.style.cssText = 'display:none;position:fixed;right:14px;bottom:300px;z-index:62;'
      + 'flex-direction:column;align-items:center;gap:4px;';
    const bs = 'width:46px;height:40px;border-radius:10px;background:rgba(212,184,96,0.92);'
      + 'border:2px solid #f0d878;color:#1a1206;font-size:18px;font-weight:800;cursor:pointer;'
      + 'pointer-events:auto;display:flex;align-items:center;justify-content:center;';
    const up = document.createElement('button'); up.textContent = '▲'; up.style.cssText = bs;
    const lvl = document.createElement('div');    lvl.id = 'build-lvl';
    lvl.style.cssText = 'background:rgba(0,0,0,0.65);color:#f0d878;padding:3px 8px;'
      + 'border-radius:6px;font-size:11px;font-weight:700;font-family:monospace;';
    lvl.textContent = 'Niv 0';
    const dn = document.createElement('button'); dn.textContent = '▼'; dn.style.cssText = bs;
    const wire = (el, d) => {
      el.addEventListener('click', () => _changeLevel(d));
      el.addEventListener('touchstart', (e) => { e.preventDefault(); _changeLevel(d); }, { passive: false });
    };
    wire(up, 1); wire(dn, -1);
    ctl.appendChild(up); ctl.appendChild(lvl); ctl.appendChild(dn);
    document.body.appendChild(ctl);
  }

  function _changeLevel(d) {
    _buildLevel = Math.max(0, Math.min(8, _buildLevel + d));
    const lvl = document.getElementById('build-lvl');
    if (lvl) lvl.textContent = 'Niv ' + _buildLevel;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _def(type) { return ZS.ITEMS?.[type] || null; }

  function _makePickupMesh(def, type, opts = {}) {
    const g = new THREE.Group();
    const introWake = !!opts.introWake && type === 'tool_caillou';

    // Petit halo lumineux au sol pour repérer l'objet à récolter
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(introWake ? 0.52 : 0.30, introWake ? 0.52 : 0.30, 0.03, 16),
      new THREE.MeshLambertMaterial({
        color: introWake ? 0xffc860 : (def.color || 0xffffff),
        transparent: true,
        opacity: introWake ? 0.62 : 0.35,
      }),
    );
    ring.position.y = introWake ? -0.18 : -0.28;
    g.add(ring);
    if (introWake) {
      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68, 0.68, 0.02, 20),
        new THREE.MeshBasicMaterial({ color: 0xffe8a0, transparent: true, opacity: 0.55 }),
      );
      glow.position.y = -0.16;
      g.add(glow);
      g.userData.introGlow = glow;
      const beacon = new THREE.PointLight(0xffc870, 1.1, 7, 1.8);
      beacon.position.set(0, 0.22, 0);
      g.add(beacon);
      g.userData.introBeacon = beacon;
    }

    // Cube de remplacement instantané (le temps que le modèle 3D charge)
    const placeholder = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, 0.22),
      new THREE.MeshLambertMaterial({ color: def.color || 0xffffff })
    );
    g.add(placeholder);

    if (type === 'tool_torche') {
      g.remove(placeholder);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.065, 0.5, 6),
        new THREE.MeshLambertMaterial({ color: 0x6b4a20 }),
      );
      pole.position.y = 0.08;
      g.add(pole);
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 7, 6),
        new THREE.MeshBasicMaterial({ color: 0xff5a18 }),
      );
      flame.position.y = 0.38;
      g.add(flame);
      ring.material.color.setHex(0xff8800);
      ring.scale.set(1.35, 1, 1.35);
      return g;
    }
    // Modèle 3D réel (GLB ou procédural) — caillou posé au sol
    if (type === 'tool_caillou' && ZS.RockPrefab?.buildGroundRock) {
      g.remove(placeholder);
      const rock = new THREE.Group();
      ZS.RockPrefab.buildGroundRock(rock, { rockSeed: introWake ? 90210 : 90211, scale: introWake ? 1.22 : 1 });
      if (introWake) rock.scale.setScalar(1.18);
      g.add(rock);
      return g;
    }
    if (ZS.getItemModel) {
      ZS.getItemModel(type).then((obj) => {
        g.remove(placeholder);
        if (type === DOOR_KEY_TYPE) {
          const wrap = new THREE.Group();
          wrap.add(obj);
          wrap.rotation.x = -Math.PI / 2;
          wrap.rotation.z = Math.random() * Math.PI * 2;
          wrap.updateWorldMatrix(true, true);
          const box = new THREE.Box3().setFromObject(wrap);
          if (isFinite(box.min.y)) wrap.position.y = -box.min.y - 0.28;
          g.add(wrap);
        } else {
          g.add(obj);
        }
      }).catch(() => { /* on conserve le cube de remplacement */ });
    }
    return g;
  }

  window.ZS = window.ZS || {};
  ZS.Inventory = {
    init, tick, tryGrabNearest: grabNearest,
    spawnWorldItem, removeWorldItem, receivePickup, spawnStructure, collectBag,
    countItem, findItemSlot, addItem, addItemSlot, removeItem, removeStack, getStorageStacks, getStorageSlots, canAddItem, canAddStack, consumeOne,
    getInvSnapshot, syncToServer, applyAuthoritativeInv,
    placeActiveStructure, getActiveItem, hasDoorKey, removeDoorKey, installDoorLockOnNearestDoor, installDoorLockOnAimedDoor, getWeaponAmmo, decrementAmmo, reloadWeapon, wearActiveWeapon,
    getArmorValue, getMaxHealth, togglePanel, loadFromSave, loadRespawnKit,
    ensureStarterCaillou, ensureStarterTorche, ensureStarterRations, clear,
    hasItemType: _hasItemType,
    setSelfPlayerId,
  };
}());
