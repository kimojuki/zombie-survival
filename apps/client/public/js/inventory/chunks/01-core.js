// Init, tick, grab, portes — extrait de inventory.js (IIFE)
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
