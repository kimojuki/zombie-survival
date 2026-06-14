// Add/remove, armure, munitions, save — extrait de inventory.js (IIFE)
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
