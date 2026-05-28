// Inventory — 6-slot hotbar, world pickups, item use
(function () {
  'use strict';

  const ITEM_DEFS = {
    pistol: { label: 'Pistolet',    icon: '🔫', category: 'weapon',     maxStack: 1  },
    ammo:   { label: 'Munitions',   icon: '🟡', category: 'ammo',       maxStack: 5  },
    medkit: { label: 'Trousse',     icon: '💊', category: 'consumable', maxStack: 3, healAmount: 50 },
    food:   { label: 'Nourriture',  icon: '🍗', category: 'consumable', maxStack: 5, healAmount: 25 },
  };

  // 6 slots: slot 0 = pistol, 1-5 = free
  let _slots = [
    { type: 'pistol', qty: 1, ammo: 30, maxAmmo: 30 },
    null, null, null, null, null
  ];
  let _active = 0;
  let _state, _scene, _socket;

  // id -> { mesh, type, x, z }
  const _worldItems = new Map();

  // ── Public API ─────────────────────────────────────────────────────────────

  function init(state, scene, socket) {
    _state  = state;
    _scene  = scene;
    _socket = socket;
    _buildHotbarDOM();
    _renderSlots();
    _bindKeys();
    _bindHotbarTouch();
    _setupUseBtn();
  }

  function tick(dt) {
    const now = Date.now() * 0.001;

    // Animate world items (bob + spin)
    _worldItems.forEach(({ mesh }) => {
      mesh.rotation.y += dt * 1.8;
      mesh.position.y = mesh.userData.baseY + Math.sin(now * 2.5) * 0.1;
    });

    // Auto-pickup when close enough
    const px = _state.player.x;
    const pz = _state.player.z;
    for (const [id, item] of _worldItems) {
      if (Math.hypot(item.x - px, item.z - pz) < 1.6) {
        // Remove mesh immediately; wait for server item-add before updating inventory
        _scene.remove(item.mesh);
        _worldItems.delete(id);
        _socket.emit('item-pickup', { id });
        break; // one per frame
      }
    }
  }

  function spawnWorldItem(d) {
    if (_worldItems.has(d.id)) return;
    const def = ITEM_DEFS[d.type];
    if (!def) return;
    const mesh = _makePickupMesh(d.type, def);
    const baseY = (typeof ZS.getTerrainHeight === 'function'
      ? ZS.getTerrainHeight(d.x, d.z) : 0) + 0.55;
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

  // Called by network when server confirms pickup (item-add)
  function receivePickup(type) {
    const def = ITEM_DEFS[type];
    if (!def) return;

    if (type === 'ammo') {
      // Stack with existing ammo or find a slot
      for (let i = 1; i < _slots.length; i++) {
        const s = _slots[i];
        if (s && s.type === 'ammo' && s.qty < def.maxStack) { s.qty++; _renderSlots(); return; }
      }
    } else {
      for (let i = 1; i < _slots.length; i++) {
        const s = _slots[i];
        if (s && s.type === type && s.qty < def.maxStack) { s.qty++; _renderSlots(); return; }
      }
    }

    // First empty slot (skip 0 which is weapon slot)
    for (let i = 1; i < _slots.length; i++) {
      if (!_slots[i]) {
        _slots[i] = { type, qty: 1 };
        _renderSlots();
        _showPickupNotif(def);
        return;
      }
    }
    _showPickupNotif(def, true); // full
  }

  function getActiveItem() {
    return _slots[_active] || null;
  }

  function getWeaponAmmo() {
    const s = _slots[0];
    return s && s.type === 'pistol' ? s.ammo : 0;
  }

  // Returns false if can't fire (no weapon active, no ammo)
  function decrementAmmo() {
    const item = getActiveItem();
    if (!item || item.type !== 'pistol' || item.ammo <= 0) return false;
    item.ammo--;
    _renderSlots();
    return true;
  }

  function reloadWeapon() {
    const s = _slots[0];
    if (s && s.type === 'pistol') { s.ammo = s.maxAmmo; _renderSlots(); }
  }

  // ── DOM ────────────────────────────────────────────────────────────────────

  function _buildHotbarDOM() {
    const bar = document.getElementById('hotbar');
    bar.replaceChildren();
    for (let i = 0; i < 6; i++) {
      const slot = document.createElement('div');
      slot.className = 'hb-slot' + (i === _active ? ' active' : '');
      slot.dataset.slot = i;
      // Key hint (desktop)
      const hint = document.createElement('span');
      hint.className = 'hb-key';
      hint.textContent = i + 1;
      slot.appendChild(hint);
      bar.appendChild(slot);
    }
  }

  function _renderSlots() {
    const bar = document.getElementById('hotbar');
    if (!bar) return;
    for (let i = 0; i < 6; i++) {
      const el = bar.children[i];
      const item = _slots[i];
      // Keep key hint, rebuild the rest
      const hint = el.querySelector('.hb-key');
      el.replaceChildren();
      if (hint) el.appendChild(hint);
      if (item) {
        const def = ITEM_DEFS[item.type];
        const icon = document.createElement('span');
        icon.className = 'hb-icon';
        icon.textContent = def.icon;
        const count = document.createElement('span');
        count.className = 'hb-count';
        count.textContent = item.type === 'pistol' ? item.ammo : item.qty;
        el.appendChild(icon);
        el.appendChild(count);
      }
    }
    _updateUseBtn();
  }

  function _setActiveSlot(i) {
    const bar = document.getElementById('hotbar');
    if (!bar) return;
    bar.children[_active].classList.remove('active');
    _active = i;
    bar.children[_active].classList.add('active');
    _updateUseBtn();
  }

  function _updateUseBtn() {
    const item = _slots[_active];
    const def = item ? ITEM_DEFS[item.type] : null;
    const show = def && (def.category === 'consumable' || def.category === 'ammo');
    const btn = document.getElementById('use-btn');
    if (btn) btn.style.display = show ? 'flex' : 'none';
  }

  function _useActiveItem() {
    const item = _slots[_active];
    if (!item) return;
    const def = ITEM_DEFS[item.type];
    if (!def) return;

    if (def.category === 'consumable') {
      if (_state.player.health >= 100) { _showMsg('Vie déjà au maximum !'); return; }
      const newHp = Math.min(100, _state.player.health + def.healAmount);
      _state.player.health = newHp;
      ZS.UI.setHealth(newHp);
      item.qty--;
      if (item.qty <= 0) _slots[_active] = null;
      _renderSlots();
    } else if (def.category === 'ammo') {
      const pistol = _slots[0];
      if (!pistol || pistol.type !== 'pistol') return;
      if (pistol.ammo >= pistol.maxAmmo) { _showMsg('Munitions au maximum !'); return; }
      pistol.ammo = pistol.maxAmmo;
      item.qty--;
      if (item.qty <= 0) _slots[_active] = null;
      _renderSlots();
    }
  }

  // ── Bindings ────────────────────────────────────────────────────────────────

  function _bindKeys() {
    document.addEventListener('keydown', (e) => {
      const digit = parseInt(e.key);
      if (digit >= 1 && digit <= 6) _setActiveSlot(digit - 1);
      if (e.code === 'KeyE') _useActiveItem();
    });
  }

  function _bindHotbarTouch() {
    const bar = document.getElementById('hotbar');
    bar.addEventListener('click', (e) => {
      const slotEl = e.target.closest('.hb-slot');
      if (!slotEl) return;
      const idx = parseInt(slotEl.dataset.slot);
      if (idx === _active) {
        const item = _slots[idx];
        const def = item ? ITEM_DEFS[item.type] : null;
        if (def && (def.category === 'consumable' || def.category === 'ammo')) {
          _useActiveItem();
        }
      } else {
        _setActiveSlot(idx);
      }
    });
  }

  function _setupUseBtn() {
    const btn = document.getElementById('use-btn');
    if (!btn) return;
    btn.addEventListener('click', _useActiveItem);
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      _useActiveItem();
    }, { passive: false });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function _makePickupMesh(type, def) {
    const palette = { pistol: 0x3B82F6, ammo: 0xFFD700, medkit: 0xff3333, food: 0x22bb44 };
    const color = palette[type] || 0xffffff;
    const g = new THREE.Group();
    // Main box
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.38, 0.38),
      new THREE.MeshLambertMaterial({ color })
    );
    g.add(box);
    // Small glow ring (flat torus-like cylinder on top)
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.04, 12),
      new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })
    );
    ring.position.y = 0.3;
    g.add(ring);
    return g;
  }

  function _showPickupNotif(def, full) {
    if (full) { _showMsg('Inventaire plein !'); return; }
    _showMsg('+1 ' + def.label);
  }

  function _showMsg(text) {
    const el = document.getElementById('pickup-notif');
    if (!el) return;
    el.textContent = text;
    el.style.opacity = '1';
    clearTimeout(_showMsg._t);
    _showMsg._t = setTimeout(() => { el.style.opacity = '0'; }, 1800);
  }

  window.ZS = window.ZS || {};
  ZS.Inventory = {
    init, tick,
    spawnWorldItem, removeWorldItem, receivePickup,
    getActiveItem, getWeaponAmmo, decrementAmmo, reloadWeapon
  };
}());
