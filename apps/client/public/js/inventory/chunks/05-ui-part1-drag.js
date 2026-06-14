// Hotbar DOM + drag-drop
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
    ZS.IntroLessons?.onHotbarChange?.(_hotbar[_active]?.type || null);
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
