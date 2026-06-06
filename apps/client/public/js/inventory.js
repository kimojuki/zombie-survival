// Inventory — hotbar (6 slots) + sac (slots selon le sac équipé) + équipement
(function () {
  'use strict';

  const HOTBAR_SIZE = 6;
  const GRAB_RANGE  = 2.2;   // distance max pour ramasser un objet au sol
  let _grabTargetId = null;  // objet actuellement visé (à portée)

  let _hotbar = Array(HOTBAR_SIZE).fill(null);
  let _bag    = [];     // taille = slots_inventaire_bonus du sac équipé (0 sans sac)
  let _equip  = { Tête: null, Torso: null, Mains: null, Dos: null };
  let _active = 0;
  let _panelOpen  = false;
  let _invBackdrop = null;
  let _sel = null;      // sélection pour déplacement : { zone:'hotbar'|'bag'|'equip', idx }

  let _state, _scene, _socket;
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
  }

  // ── Capacité du sac (dépend du sac équipé) ──────────────────────────────────

  function _bagCapacity() {
    const bag = _equip['Dos'];
    return bag ? (_def(bag.type)?.slots_inventaire_bonus || 0) : 0;
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
        it.mesh.rotation.y += dt * 1.8;
        it.mesh.position.y = it.mesh.userData.baseY + Math.sin(now * 2.5) * 0.1;
      }
    });
    // Repère l'objet le plus proche dans la portée — PAS de ramassage automatique :
    // le joueur doit appuyer sur E / le bouton « Ramasser » (voir grabNearest).
    let nearId = null, nearItem = null, nearDist = GRAB_RANGE;
    for (const [id, item] of _worldItems) {
      const d = Math.hypot(item.x - px, item.z - pz);
      if (d < nearDist) { nearDist = d; nearId = id; nearItem = item; }
    }
    _grabTargetId = nearId;
    _updateGrabUI(nearItem);

    _updateBuildGhost();   // aperçu de construction si une structure est en main
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
    for (const it of list) if (it && it.type) addItem(it.type, it.qty || 1);
    ZS.UI?.showNotif?.('Butin récupéré');
  }

  // Ramasse l'objet actuellement visé (le plus proche à portée).
  function grabNearest() {
    if (_grabTargetId == null) return false;
    const item = _worldItems.get(_grabTargetId);
    if (!item) { _grabTargetId = null; return false; }
    // Inventaire plein → on refuse le ramassage (sinon l'objet serait perdu).
    // (Le butin de mort est toujours ramassable : récupération au mieux.)
    if (!item.bag && !_canAddItem(item.type)) {
      ZS.UI?.showNotif?.('Inventaire plein !');
      return false;
    }
    // Optimiste : on retire le mesh ; le serveur confirme (item-remove + item-add).
    _scene.remove(item.mesh);
    _worldItems.delete(_grabTargetId);
    _socket.emit('item-pickup', { id: _grabTargetId });
    _grabTargetId = null;
    _updateGrabUI(null);
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
        if (_canAddItem(item.type)) {
          btn.textContent = '✋ ' + (def?.label || 'Ramasser');
          btn.classList.remove('full');
        } else {
          btn.textContent = '🎒 Inventaire plein';
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
    struct_mur_bois:          { kind: 'wall',  w: 3.0, h: LEVEL_H, t: 0.2 },
    struct_porte_bois:        { kind: 'door',  w: 3.0, h: LEVEL_H, t: 0.2, gap: 1.3 },
    struct_grande_porte_bois: { kind: 'door',  w: 3.0, h: LEVEL_H, t: 0.2, gap: 2.2 },
    struct_plancher_bois:     { kind: 'floor', w: 3.0, h: 0.18,    t: 3.0 },
    struct_escalier_bois:     { kind: 'stair', w: 1.8, h: LEVEL_H, t: 3.0 },
    struct_storage_chest:     { kind: 'decorPrefab', prefabId: 'storage_chest', w: 1.2, h: 0.7, t: 0.8 },
  };
  let _ghost = null, _ghostType = null;
  let _buildLevel = 0;   // étage de construction courant (0 = sol)

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
  function _buildStructureMesh(type) {
    const s = STRUCT[type];
    const g = new THREE.Group();
    if (s.kind === 'wall') {
      _addBox(g, _WOOD, s.w, s.h, s.t, 0, s.h / 2, 0);
      for (let i = -1; i <= 1; i++) _addBox(g, _WOOD2, 0.12, s.h - 0.1, s.t + 0.04, i * s.w * 0.3, s.h / 2, 0);
      _addBox(g, _WOOD2, s.w, 0.16, s.t + 0.04, 0, s.h - 0.1, 0);
    } else if (s.kind === 'door') {
      const side = (s.w - s.gap) / 2;
      for (const sgn of [-1, 1]) _addBox(g, _WOOD, side, s.h, s.t, sgn * (s.gap / 2 + side / 2), s.h / 2, 0);
      _addBox(g, _WOOD, s.w, 0.4, s.t, 0, s.h - 0.2, 0);   // imposte au-dessus de l'ouverture
    } else if (s.kind === 'floor') {
      _addBox(g, _WOOD, s.w, s.h, s.t, 0, s.h / 2, 0);
      for (let i = -1; i <= 1; i++) _addBox(g, _WOOD2, 0.1, s.h + 0.02, s.t, i * s.w * 0.3, s.h / 2, 0);
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
    if (s.kind === 'wall') {
      box(x, z, s.w / 2, s.t / 2);
    } else if (s.kind === 'door') {
      const side = (s.w - s.gap) / 2, off = s.gap / 2 + side / 2;
      const ox = alongX ? off : 0, oz = alongX ? 0 : off;
      box(x - ox, z - oz, side / 2, s.t / 2);
      box(x + ox, z + oz, side / 2, s.t / 2);
    }
    // floor/stair : pas de collider bloquant (praticables via registerUpperFloor / registerRamp)
    return cols;
  }

  // Position/orientation de pose : devant le joueur, alignée sur la grille + l'étage.
  function _placementTransform() {
    const p = _state.player, yaw = _state.camera.yaw;
    let x = p.x - Math.sin(yaw) * 3.2;
    let z = p.z - Math.cos(yaw) * 3.2;
    const rotY = Math.round(yaw / (Math.PI / 2)) * (Math.PI / 2);
    const s = _isStructure(_hotbar[_active]?.type) ? STRUCT[_hotbar[_active].type] : null;
    if (s?.kind === 'decorPrefab') {
      x = p.x - Math.sin(yaw) * 2.6;
      z = p.z - Math.cos(yaw) * 2.6;
      const baseY = ZS.getDecorGroundHeight
        ? ZS.getDecorGroundHeight(x, z)
        : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
      return { x, z, rotY: yaw, baseY, level: 0 };
    }
    const snap = (v) => Math.round(v / GX) * GX;
    const edge = (v) => Math.round((v - GX / 2) / GX) * GX + GX / 2;
    if (s) {
      const alongX = Math.abs(Math.cos(rotY)) > 0.5;
      if (s.kind === 'wall' || s.kind === 'door') {
        // Les murs se posent sur les arêtes des cellules → ils encadrent les planchers
        if (alongX) { x = snap(x); z = edge(z); }
        else        { x = edge(x); z = snap(z); }
      } else {
        x = snap(x); z = snap(z);   // plancher / escalier : centre de cellule
      }
    }
    const baseY = (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0) + _buildLevel * LEVEL_H;
    return { x, z, rotY, baseY, level: _buildLevel };
  }

  function _updateBuildGhost() {
    const item = _hotbar[_active];
    const type = item ? item.type : null;
    if (!type || !_isStructure(type)) { _removeGhost(); return; }
    if (_ghostType !== type) {
      _removeGhost();
      _ghost = _buildStructureMesh(type);
      _ghost.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.45;
        o.castShadow = false;
      });
      _ghostType = type;
      _scene.add(_ghost);
    }
    const t = _placementTransform();
    _ghost.position.set(t.x, t.baseY, t.z);
    _ghost.rotation.y = t.rotY;
  }

  function _removeGhost() {
    if (_ghost) { _scene.remove(_ghost); _ghost = null; }
    _ghostType = null;
  }

  // Pose la structure active devant le joueur (consomme 1, sync serveur).
  function _placeStructure() {
    const item = _hotbar[_active];
    if (!item || !_isStructure(item.type)) return;
    const type = item.type;
    const t = _placementTransform();
    const s = STRUCT[type];
    removeItem(type, 1);
    if (s.kind === 'decorPrefab') {
      _socket.emit('place-decor-prefab', {
        itemType: type,
        prefabId: s.prefabId,
        x: t.x,
        y: 0,
        z: t.z,
        rotY: t.rotY,
        scale: 1,
      });
      if (!_hotbar[_active] || !_isStructure(_hotbar[_active].type)) _removeGhost();
      return;
    }
    _socket.emit('place-structure', {
      type, x: t.x, y: t.baseY, z: t.z, rotY: t.rotY,
      colliders: _structureColliders(type, t.x, t.z, t.rotY, t.baseY, t.level),
    });
    if (!_hotbar[_active] || !_isStructure(_hotbar[_active].type)) _removeGhost();
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

    const cols = (d.colliders && d.colliders.length) ? d.colliders : _structureColliders(d.type, d.x, d.z, rotY, baseY, 0);
    const world = ZS.getColliders && ZS.getColliders();
    if (world) for (const c of cols) world.push(c);

    if (s.kind === 'floor') {
      ZS.registerUpperFloor?.(d.x, d.z, s.w / 2, s.t / 2, baseY + s.h);
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
    const mesh = _makePickupMesh(def, d.type);
    const baseY = (ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(d.x, d.z)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(d.x, d.z) : 0)) + 0.55;
    mesh.position.set(d.x, baseY, d.z);
    mesh.userData.baseY = baseY;
    _scene.add(mesh);
    _worldItems.set(d.id, { mesh, type: d.type, x: d.x, z: d.z });
  }

  function removeWorldItem(id) {
    const item = _worldItems.get(id);
    if (!item) return;
    _scene.remove(item.mesh);
    _worldItems.delete(id);
  }

  // ── Server pickup callback ─────────────────────────────────────────────────

  function receivePickup(type, qty) {
    const n = Math.max(1, qty || 1);
    const added = addItem(type, n);
    const def = _def(type);
    if (def) ZS.UI.showNotif(added ? ('+' + n + ' ' + def.label) : 'Inventaire plein !');
  }

  // ── Inventory API (utilisé par Craft + Survival) ───────────────────────────

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

  function addItem(type, qty) {
    const def = _def(type);
    if (!def) return false;
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
    const ammoId = def.type_munition_accepte || 'ammo_pistolet';
    const cap    = def.capacite_chargeur || 12;
    const need   = cap - (s.ammo || 0);
    if (need <= 0) return;
    const load = Math.min(countItem(ammoId), need);
    if (load > 0) {
      removeItem(ammoId, load);
      s.ammo = (s.ammo || 0) + load;
      _renderHotbar();
      ZS.UI.setAmmo(s.ammo);
    }
  }

  // Usure de l'arme de mêlée active : -1 durabilité par coup, casse à 0.
  function wearActiveWeapon() {
    const s = _hotbar[_active];
    if (!s) return;
    const def = _def(s.type);
    if (!def || (def.category !== 'melee' && def.category !== 'tool')) return;
    const max = def.durabilite_max;
    if (max == null || max === Infinity) return;
    if (s.durability == null) s.durability = max;
    s.durability -= 1;
    if (s.durability <= 0) {
      _hotbar[_active] = null;
      ZS.UI.showNotif((def.label || 'Arme') + ' cassé(e) !');
      _renderHotbar();
      _syncToServer();
      ZS.setHandItem?.(null);
    }
  }

  function getArmorValue() {
    return Object.values(_equip).reduce((sum, s) => {
      return sum + (s ? (_def(s.type)?.valeur_armure || 0) : 0);
    }, 0);
  }

  // Vie max = 100 + valeur d'armure équipée (le joueur peut dépasser 100).
  function getMaxHealth() { return 100 + getArmorValue(); }

  // Met à jour la vie max selon l'armure. gain=true (équipement en cours de jeu) →
  // ajoute la vie bonus ; gain=false (chargement/restauration) → règle juste le plafond.
  let _lastArmor = 0;
  function _syncArmor(gain) {
    const armor = getArmorValue();
    const max   = 100 + armor;
    const p = _state && _state.player;
    if (p) {
      if (gain) { const delta = armor - _lastArmor; if (delta > 0) p.health += delta; }
      p.health = Math.max(0, Math.min(max, p.health));   // clamp au max courant
      ZS.UI?.setHealth?.(Math.floor(p.health), max);
    }
    _lastArmor = armor;
  }

  // ── Sauvegarde ─────────────────────────────────────────────────────────────

  // Accepte l'ancien format (tableau = hotbar seule) ou le nouveau
  // { hotbar, bag, equip }. Restaure intégralement les 3 zones.
  function loadFromSave(data, opts = {}) {
    if (!data) return;
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

    if (_hotbar[0] && _hotbar[0].type === 'pistol' && _hotbar[0].ammo == null) _hotbar[0].ammo = 30;

    _initToolDurability(_hotbar[0]);

    if (opts.fullReset) _setActiveSlot(0);

    _renderHotbar();
    if (_panelOpen) _renderInvPanel();
    if (!opts.fullReset) {
      ZS.setHandItem?.(_hotbar[_active]?.type || null);
      ZS.UI?.setWeaponUI?.(_hotbar[_active]?.type || null);
    }
    _syncArmor(false);
  }

  const STARTER_CAILLOU = { type: 'tool_caillou', qty: 1, durability: 80 };

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
    _setActiveSlot(0);
    _syncToServer();
    return true;
  }

  /** Respawn : restaure le kit serveur + caillou slot 1 + main. */
  function loadRespawnKit(data) {
    loadFromSave(data, { fullReset: true });
    let changed = false;
    if (!_hotbar[0] || _hotbar[0].type !== 'tool_caillou') {
      _hotbar[0] = { ...STARTER_CAILLOU };
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
    if (_socket) _socket.emit('inventory-sync', { hotbar: _hotbar, bag: _bag, equip: _equip });
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
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const el   = bar.children[i];
      const item = _hotbar[i];
      const hint = el.querySelector('.hb-key');
      const name = el.querySelector('.hb-name');   // conserve le libellé en cours d'affichage
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
    }
    _updateUseBtn();
    const active = _hotbar[_active];
    if (active && _def(active.type)?.category === 'firearm') {
      ZS.UI.setAmmo(active.ammo ?? 0);
    }
    ZS.setHandItem?.(_hotbar[_active]?.type || null);
    ZS.UI?.setWeaponUI?.(_hotbar[_active]?.type || null);
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
      if (ZS.Survival.useItem(item.type)) {
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
  }

  function _equipFromHotbar(idx) {
    const item = _hotbar[idx];
    if (!item) return;
    const def  = _def(item.type);
    if (!def || def.category !== 'equipment') return;
    const slotName = def.slot_equipement;
    const prev = _equip[slotName];
    _equip[slotName] = { type: item.type, qty: 1 };
    _hotbar[idx] = prev;
    if (slotName === 'Dos') _resizeBag();
    _syncArmor(true);
    _renderHotbar();
    if (_panelOpen) _renderInvPanel();
    ZS.UI.showNotif(def.label + ' équipé');
  }

  // ── Déplacement d'items (tap pour sélectionner → tap pour déposer) ──────────

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

  function _clickSlot(zone, idx) {
    if (!_sel) {
      if (_getSlot(zone, idx)) _sel = { zone, idx };   // ramasse
    } else {
      _moveOrSwap(_sel, { zone, idx });                 // dépose
      _sel = null;
    }
    _renderInvPanel();
    _renderHotbar();
  }

  function _moveOrSwap(from, to) {
    if (from.zone === to.zone && from.idx === to.idx) return;   // même slot → annule
    const src = _getSlot(from.zone, from.idx);
    if (!src) return;
    const dst = _getSlot(to.zone, to.idx);

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
        _afterMove(from, to);
        return;
      }
    }

    // Échange
    _setSlot(to.zone, to.idx, src);
    _setSlot(from.zone, from.idx, dst || null);
    _afterMove(from, to);
  }

  function _afterMove(from, to) {
    const touchedDos = (from.zone === 'equip' && from.idx === 'Dos')
                    || (to.zone === 'equip' && to.idx === 'Dos');
    if (touchedDos) _resizeBag();
    if (from.zone === 'equip' || to.zone === 'equip') _syncArmor(true);
    _syncToServer();
  }

  // Jette au sol l'objet sélectionné (hotbar, sac ou équipement) → redevient ramassable.
  function _dropSelected() {
    if (!_sel) return;
    const item = _getSlot(_sel.zone, _sel.idx);
    if (!item) { _sel = null; _renderInvPanel(); return; }
    const zone = _sel.zone, idx = _sel.idx;
    _setSlot(zone, idx, null);
    _sel = null;
    if (zone === 'equip' && idx === 'Dos') _resizeBag();   // sac retiré → réajuste
    _socket.emit('item-drop', { type: item.type, qty: item.qty || 1 });
    const def = _def(item.type);
    ZS.UI?.showNotif?.('Jeté : ' + (def?.label || item.type));
    _renderInvPanel();
    _renderHotbar();
    _syncToServer();
  }

  // ── Panneau inventaire ─────────────────────────────────────────────────────

  function _buildInvPanel() {
    _invBackdrop = document.createElement('div');
    Object.assign(_invBackdrop.style, {
      display: 'none', position: 'fixed', inset: '0', zIndex: '449',
    });
    _invBackdrop.addEventListener('click', togglePanel);
    document.body.appendChild(_invBackdrop);

    const p = document.createElement('div');
    p.id = 'inv-panel';
    Object.assign(p.style, {
      display: 'none', position: 'fixed',
      top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      width: 'min(400px, 96vw)', maxHeight: '80vh', overflowY: 'auto',
      background: 'rgba(8,8,6,0.97)', border: '1px solid #5a4a2a',
      borderRadius: '8px', padding: '12px', zIndex: '450',
      color: '#e8d090', fontFamily: 'monospace', fontSize: '12px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.8)',
    });

    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;'
      + 'margin-bottom:10px;border-bottom:1px solid #5a4a2a;padding-bottom:6px';
    const title = document.createElement('span');
    title.style.cssText = 'font-size:15px;font-weight:bold';
    title.textContent = '🎒 INVENTAIRE';
    const hdrBtns = document.createElement('div');
    hdrBtns.style.cssText = 'display:flex;gap:6px;align-items:center';

    const dropBtn = document.createElement('button');
    dropBtn.id = 'inv-drop-btn';
    dropBtn.textContent = '🗑 Jeter';
    dropBtn.style.cssText = 'background:rgba(120,40,40,0.5);color:#ffd0d0;border:1px solid #a05050;'
      + 'border-radius:6px;padding:5px 12px;cursor:pointer;font-size:13px;font-weight:700;line-height:1;'
      + 'min-height:36px;opacity:0.4;';
    dropBtn.addEventListener('click', _dropSelected);
    dropBtn.addEventListener('touchstart', (e) => { e.preventDefault(); _dropSelected(); }, { passive: false });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:rgba(80,50,10,0.5);color:#e8d090;border:1px solid #7a5a28;'
      + 'border-radius:6px;padding:5px 13px;cursor:pointer;font-size:16px;line-height:1;'
      + 'min-width:40px;min-height:36px;';
    closeBtn.addEventListener('click', togglePanel);
    hdrBtns.appendChild(dropBtn);
    hdrBtns.appendChild(closeBtn);
    hdr.appendChild(title);
    hdr.appendChild(hdrBtns);
    p.appendChild(hdr);

    const hint = document.createElement('div');
    hint.id = 'inv-hint';
    hint.style.cssText = 'font-size:10px;color:#9a8a6a;margin-bottom:8px;font-style:italic';
    hint.textContent = 'Touchez un objet puis un emplacement pour le déplacer.';
    p.appendChild(hint);

    const eqTitle = document.createElement('div');
    eqTitle.style.cssText = 'font-size:11px;color:#8a7a5a;margin-bottom:5px';
    eqTitle.textContent = 'ÉQUIPEMENT';
    p.appendChild(eqTitle);

    const equip = document.createElement('div');
    equip.id = 'inv-equip';
    equip.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:10px';
    p.appendChild(equip);

    const hbTitle = document.createElement('div');
    hbTitle.style.cssText = 'font-size:11px;color:#8a7a5a;margin-bottom:5px';
    hbTitle.textContent = 'SLOTS JOUEUR';
    p.appendChild(hbTitle);

    const hbGrid = document.createElement('div');
    hbGrid.id = 'inv-hotbar';
    hbGrid.style.cssText = 'display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:10px';
    p.appendChild(hbGrid);

    const bagTitle = document.createElement('div');
    bagTitle.id = 'inv-bag-title';
    bagTitle.style.cssText = 'font-size:11px;color:#8a7a5a;margin-bottom:5px';
    bagTitle.textContent = 'SAC';
    p.appendChild(bagTitle);

    const grid = document.createElement('div');
    grid.id = 'inv-grid';
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:5px';
    p.appendChild(grid);

    document.body.appendChild(p);
  }

  function _renderInvPanel() {
    const equip = document.getElementById('inv-equip');
    if (!equip) return;

    // Nom de l'item sélectionné, visible (le tooltip natif `title` ne s'affiche pas au toucher)
    const hint = document.getElementById('inv-hint');
    const selItem = _sel ? _getSlot(_sel.zone, _sel.idx) : null;
    const selDef  = selItem ? _def(selItem.type) : null;
    if (hint) {
      if (selDef) {
        hint.textContent = '▸ ' + (selDef.label || selItem.type) + ' — déposez sur un emplacement ou 🗑 Jeter.';
        hint.style.color = '#6cf';
        hint.style.fontStyle = 'normal';
      } else {
        hint.textContent = 'Touchez un objet puis un emplacement pour le déplacer.';
        hint.style.color = '#9a8a6a';
        hint.style.fontStyle = 'italic';
      }
    }
    // Bouton « Jeter » actif seulement si un objet est sélectionné
    const dropBtn = document.getElementById('inv-drop-btn');
    if (dropBtn) {
      dropBtn.style.opacity       = selItem ? '1' : '0.4';
      dropBtn.style.pointerEvents = selItem ? 'auto' : 'none';
    }

    // ÉQUIPEMENT
    equip.replaceChildren();
    for (const [slotName, item] of Object.entries(_equip)) {
      const el = _makeSlotEl(item);
      const lbl = document.createElement('div');
      lbl.style.cssText = 'position:absolute;top:2px;left:3px;font-size:9px;color:#7a6a4a;line-height:1';
      lbl.textContent = slotName;
      el.appendChild(lbl);
      _wireSlot(el, 'equip', slotName);
      equip.appendChild(el);
    }

    // SLOTS JOUEUR (hotbar)
    const hb = document.getElementById('inv-hotbar');
    hb.replaceChildren();
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const el = _makeSlotEl(_hotbar[i]);
      if (i === _active) el.style.boxShadow = 'inset 0 0 0 2px #d4b860';
      _wireSlot(el, 'hotbar', i);
      hb.appendChild(el);
    }

    // SAC
    const title = document.getElementById('inv-bag-title');
    if (title) title.textContent = _bag.length ? `SAC  (${_bag.length} slots)` : 'SAC  (aucun sac équipé)';
    const grid = document.getElementById('inv-grid');
    grid.replaceChildren();
    for (let i = 0; i < _bag.length; i++) {
      const el = _makeSlotEl(_bag[i]);
      _wireSlot(el, 'bag', i);
      grid.appendChild(el);
    }
  }

  // Rend un slot cliquable + surligne le slot sélectionné.
  function _wireSlot(el, zone, idx) {
    el.style.cursor = 'pointer';
    const item = _getSlot(zone, idx);
    if (item) el.title = _def(item.type)?.label || '';
    if (_sel && _sel.zone === zone && _sel.idx === idx) {
      el.style.boxShadow = 'inset 0 0 0 2px #6cf, 0 0 8px #6cf';
      el.style.borderColor = '#6cf';
    }
    el.addEventListener('click', (e) => { e.stopPropagation(); _clickSlot(zone, idx); });
  }

  function _makeSlotEl(item) {
    const el = document.createElement('div');
    Object.assign(el.style, {
      width: '54px', height: '54px', background: 'rgba(28,26,22,0.85)',
      border: item ? '1px solid #6a5a2a' : '1px solid #3a3428',
      borderRadius: '5px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', fontSize: '22px',
      position: 'relative', userSelect: 'none',
    });
    if (item) {
      const def = _def(item.type);
      const ic = document.createElement('span');
      Object.assign(ic.style, {
        width: '46px', height: '46px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '22px',
      });
      ic.textContent = def ? def.icon : '?';
      el.appendChild(ic);
      ZS.Icons?.apply(ic, item.type);
      if (item.qty > 1) {
        const q = document.createElement('span');
        q.style.cssText = 'position:absolute;bottom:2px;right:4px;font-size:10px;color:#e8d090;line-height:1';
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
    p.style.display = _panelOpen ? 'block' : 'none';
    if (_invBackdrop) _invBackdrop.style.display = _panelOpen ? 'block' : 'none';
    if (_panelOpen) _renderInvPanel();
  }

  // ── Bindings ───────────────────────────────────────────────────────────────

  function _bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (window.ZS?.Rcon?.isOpen?.()) return;
      if (window.ZS?.Chat?.isOpen?.()) return;
      const digit = parseInt(e.key);
      if (digit >= 1 && digit <= 6) _setActiveSlot(digit - 1);
      if (e.code === 'KeyE') { if (!grabNearest()) _useActiveItem(); }
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

  function _makePickupMesh(def, type) {
    const g = new THREE.Group();

    // Petit halo lumineux au sol pour repérer l'objet à récolter
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.30, 0.30, 0.03, 16),
      new THREE.MeshLambertMaterial({ color: def.color || 0xffffff, transparent: true, opacity: 0.35 })
    );
    ring.position.y = -0.28;
    g.add(ring);

    // Cube de remplacement instantané (le temps que le modèle 3D charge)
    const placeholder = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, 0.22),
      new THREE.MeshLambertMaterial({ color: def.color || 0xffffff })
    );
    g.add(placeholder);

    // Modèle 3D réel (GLB ou procédural) — caillou posé au sol
    if (type === 'tool_caillou' && ZS.RockPrefab?.buildGroundRock) {
      g.remove(placeholder);
      const rock = new THREE.Group();
      ZS.RockPrefab.buildGroundRock(rock, { rockSeed: 90210 });
      g.add(rock);
      return g;
    }
    if (ZS.getItemModel) {
      ZS.getItemModel(type).then((obj) => {
        g.remove(placeholder);
        g.add(obj);
      }).catch(() => { /* on conserve le cube de remplacement */ });
    }
    return g;
  }

  window.ZS = window.ZS || {};
  ZS.Inventory = {
    init, tick,
    spawnWorldItem, removeWorldItem, receivePickup, spawnStructure, collectBag,
    countItem, addItem, addItemSlot, removeItem, removeStack, getStorageStacks, getStorageSlots, canAddItem, canAddStack, consumeOne,
    getActiveItem, getWeaponAmmo, decrementAmmo, reloadWeapon, wearActiveWeapon,
    getArmorValue, getMaxHealth, togglePanel, loadFromSave, loadRespawnKit, ensureStarterCaillou, clear,
  };
}());
