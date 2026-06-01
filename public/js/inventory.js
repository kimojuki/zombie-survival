// Inventory — hotbar (6 slots) + sac (20 slots) + équipement
(function () {
  'use strict';

  const HOTBAR_SIZE = 6;
  const BAG_BASE    = 20;

  let _hotbar = Array(HOTBAR_SIZE).fill(null);
  let _bag    = Array(BAG_BASE).fill(null);
  let _equip  = { Tête: null, Torso: null, Mains: null, Dos: null };
  let _active = 0;
  let _panelOpen  = false;
  let _invBackdrop = null;

  let _state, _scene, _socket;
  const _worldItems = new Map();

  // ── Init ───────────────────────────────────────────────────────────────────

  function init(state, scene, socket) {
    _state  = state;
    _scene  = scene;
    _socket = socket;
    _buildHotbarDOM();
    _buildInvPanel();
    _renderHotbar();
    _bindKeys();
    _bindHotbarTouch();
    _setupUseBtn();
  }

  // ── Tick ───────────────────────────────────────────────────────────────────

  function tick(dt) {
    const now = Date.now() * 0.001;
    _worldItems.forEach(({ mesh }) => {
      mesh.rotation.y += dt * 1.8;
      mesh.position.y = mesh.userData.baseY + Math.sin(now * 2.5) * 0.1;
    });
    const px = _state.player.x, pz = _state.player.z;
    for (const [id, item] of _worldItems) {
      if (Math.hypot(item.x - px, item.z - pz) < 1.6) {
        _scene.remove(item.mesh);
        _worldItems.delete(id);
        _socket.emit('item-pickup', { id });
        break;
      }
    }
  }

  // ── World items ────────────────────────────────────────────────────────────

  function spawnWorldItem(d) {
    if (_worldItems.has(d.id)) return;
    const def = _def(d.type);
    if (!def) return;
    const mesh = _makePickupMesh(def);
    const baseY = (ZS.getTerrainHeight ? ZS.getTerrainHeight(d.x, d.z) : 0) + 0.55;
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

  function receivePickup(type) {
    const added = addItem(type, 1);
    const def = _def(type);
    if (def) ZS.UI.showNotif(added ? ('+1 ' + def.label) : 'Inventaire plein !');
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

  function getArmorValue() {
    return Object.values(_equip).reduce((sum, s) => {
      return sum + (s ? (_def(s.type)?.valeur_armure || 0) : 0);
    }, 0);
  }

  // ── Sauvegarde ─────────────────────────────────────────────────────────────

  function loadFromSave(slots) {
    if (!Array.isArray(slots) || slots.length === 0) return;
    for (let i = 0; i < Math.min(slots.length, HOTBAR_SIZE); i++) {
      _hotbar[i] = slots[i] || null;
    }
    if (_hotbar[0] && _hotbar[0].type === 'pistol' && _hotbar[0].ammo == null) {
      _hotbar[0].ammo = 30;
    }
    _renderHotbar();
    ZS.setHandItem?.(_hotbar[_active]?.type || null);
  }

  function clear() {
    _hotbar = Array(HOTBAR_SIZE).fill(null);
    _bag    = Array(BAG_BASE).fill(null);
    _equip  = { Tête: null, Torso: null, Mains: null, Dos: null };
    _renderHotbar();
    _syncToServer();
  }

  function _syncToServer() {
    if (_socket) _socket.emit('inventory-sync', _hotbar);
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
      el.replaceChildren();
      if (hint) el.appendChild(hint);
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
  }

  function _setActiveSlot(i) {
    const bar = document.getElementById('hotbar');
    if (!bar) return;
    bar.children[_active].classList.remove('active');
    _active = i;
    bar.children[_active].classList.add('active');
    _updateUseBtn();
    ZS.setHandItem?.(_hotbar[_active]?.type || null);
  }

  function _updateUseBtn() {
    const item = _hotbar[_active];
    const def  = item ? _def(item.type) : null;
    const show = def && ['food','medical','ammo','map','equipment'].includes(def.category);
    const btn  = document.getElementById('use-btn');
    if (btn) btn.style.display = show ? 'flex' : 'none';
  }

  // ── Utilisation ────────────────────────────────────────────────────────────

  function _useActiveItem() {
    const item = _hotbar[_active];
    if (!item) return;
    const def = _def(item.type);
    if (!def) return;

    if (def.category === 'food' || def.category === 'medical') {
      ZS.Survival.useItem(item.type);
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
    _renderHotbar();
    if (_panelOpen) _renderInvPanel();
    ZS.UI.showNotif(def.label + ' équipé');
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
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:rgba(80,50,10,0.5);color:#e8d090;border:1px solid #7a5a28;'
      + 'border-radius:6px;padding:5px 13px;cursor:pointer;font-size:16px;line-height:1;'
      + 'min-width:40px;min-height:36px;';
    closeBtn.addEventListener('click', togglePanel);
    hdr.appendChild(title);
    hdr.appendChild(closeBtn);
    p.appendChild(hdr);

    const eqTitle = document.createElement('div');
    eqTitle.style.cssText = 'font-size:11px;color:#8a7a5a;margin-bottom:5px';
    eqTitle.textContent = 'ÉQUIPEMENT';
    p.appendChild(eqTitle);

    const equip = document.createElement('div');
    equip.id = 'inv-equip';
    equip.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:10px';
    p.appendChild(equip);

    const bagTitle = document.createElement('div');
    bagTitle.style.cssText = 'font-size:11px;color:#8a7a5a;margin-bottom:5px';
    bagTitle.textContent = 'SAC  (clic → hotbar)';
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
    equip.replaceChildren();
    for (const [slotName, item] of Object.entries(_equip)) {
      const el = _makeSlotEl(item);
      const lbl = document.createElement('div');
      lbl.style.cssText = 'position:absolute;top:2px;left:3px;font-size:9px;color:#7a6a4a;line-height:1';
      lbl.textContent = slotName;
      el.style.position = 'relative';
      el.appendChild(lbl);
      if (item) {
        el.style.cursor = 'pointer';
        el.title = _def(item.type)?.label + ' (déséquiper)';
        el.addEventListener('click', () => { _unequip(slotName); _renderInvPanel(); });
      }
      equip.appendChild(el);
    }

    const grid = document.getElementById('inv-grid');
    grid.replaceChildren();
    for (let i = 0; i < _bag.length; i++) {
      const el = _makeSlotEl(_bag[i]);
      if (_bag[i]) {
        const idx = i;
        el.style.cursor = 'pointer';
        el.title = _def(_bag[i].type)?.label || '';
        el.addEventListener('click', () => { _bagToHotbar(idx); _renderInvPanel(); });
      }
      grid.appendChild(el);
    }
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

  function _bagToHotbar(bagIdx) {
    const item = _bag[bagIdx];
    if (!item) return;
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      if (!_hotbar[i]) {
        _hotbar[i] = item;
        _bag[bagIdx] = null;
        _renderHotbar();
        return;
      }
    }
    ZS.UI.showNotif('Hotbar pleine');
  }

  function _unequip(slotName) {
    const item = _equip[slotName];
    if (!item) return;
    if (addItem(item.type, 1)) _equip[slotName] = null;
    else ZS.UI.showNotif('Inventaire plein');
  }

  function togglePanel() {
    _panelOpen = !_panelOpen;
    const p = document.getElementById('inv-panel');
    if (!p) return;
    p.style.display = _panelOpen ? 'block' : 'none';
    if (_invBackdrop) _invBackdrop.style.display = _panelOpen ? 'block' : 'none';
    if (_panelOpen) _renderInvPanel();
  }

  // ── Bindings ───────────────────────────────────────────────────────────────

  function _bindKeys() {
    document.addEventListener('keydown', (e) => {
      const digit = parseInt(e.key);
      if (digit >= 1 && digit <= 6) _setActiveSlot(digit - 1);
      if (e.code === 'KeyE') _useActiveItem();
      if (e.code === 'KeyI') togglePanel();
      if (e.code === 'Escape' && _panelOpen) togglePanel();
    });
  }

  function _bindHotbarTouch() {
    const bar = document.getElementById('hotbar');
    bar.addEventListener('click', (e) => {
      const slotEl = e.target.closest('.hb-slot');
      if (!slotEl) return;
      const idx = parseInt(slotEl.dataset.slot);
      if (idx === _active) {
        const def = _hotbar[idx] ? _def(_hotbar[idx].type) : null;
        if (def && ['food','medical','ammo','equipment'].includes(def.category)) _useActiveItem();
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

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _def(type) { return ZS.ITEMS?.[type] || null; }

  function _makePickupMesh(def) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.38, 0.38),
      new THREE.MeshLambertMaterial({ color: def.color || 0xffffff })
    );
    g.add(box);
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.04, 12),
      new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })
    );
    ring.position.y = 0.3;
    g.add(ring);
    return g;
  }

  window.ZS = window.ZS || {};
  ZS.Inventory = {
    init, tick,
    spawnWorldItem, removeWorldItem, receivePickup,
    countItem, addItem, removeItem, consumeOne,
    getActiveItem, getWeaponAmmo, decrementAmmo, reloadWeapon,
    getArmorValue, togglePanel, loadFromSave, clear,
  };
}());
