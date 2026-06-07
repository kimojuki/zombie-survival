// Fouille joueurs (corps mort / endormi) — UI style coffre Minecraft (autonome)
(function () {
  'use strict';

  const LOOT_RADIUS = 3.5;
  let _panel = null;
  let _backdrop = null;
  let _open = false;
  let _pending = false;
  let _targetId = null;
  let _targetName = '';
  let _targetKind = 'sleep';
  let _inventory = null;
  let _state = null;

  // ── Grille Minecraft (intégrée — ne dépend pas de chest_ui.js) ─────────────
  function _itemLabel(stack) {
    if (!stack?.type) return '';
    const def = ZS.ITEMS?.[stack.type];
    const q = stack.qty > 1 ? ` x${stack.qty}` : '';
    return `${def?.label || stack.type}${q}`;
  }

  function _sectionTitle(text) {
    const h = document.createElement('div');
    h.textContent = text;
    h.style.cssText = 'margin:10px 0 4px;color:#3b3b3b;font:16px monospace;text-shadow:1px 1px 0 #eee';
    return h;
  }

  function _makeGrid(cols) {
    const grid = document.createElement('div');
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols || 9},40px);gap:4px;width:max-content;max-width:100%;`;
    return grid;
  }

  function _makeSlot(stack, onClick, opts) {
    opts = opts || {};
    const slot = document.createElement('button');
    slot.type = 'button';
    const hasItem = !!stack?.type;
    slot.title = hasItem ? (opts.title || _itemLabel(stack)) : '';
    slot.style.cssText = [
      'position:relative', 'width:40px', 'height:40px', 'padding:0',
      'border:2px solid', 'border-color:#595959 #f5f5f5 #f5f5f5 #595959',
      'background:#8b8b8b',
      'box-shadow:inset 2px 2px 0 rgba(0,0,0,.35), inset -2px -2px 0 rgba(255,255,255,.35)',
      'font:20px monospace', 'color:#fff', 'touch-action:manipulation',
    ].join(';');
    if (hasItem && onClick) {
      slot.style.cursor = 'pointer';
      slot.addEventListener('click', onClick);
    } else {
      slot.disabled = !hasItem;
    }
    if (opts.readOnly && hasItem) slot.disabled = true;
    if (hasItem) {
      const icon = document.createElement('span');
      icon.textContent = ZS.ITEMS?.[stack.type]?.icon || '?';
      icon.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:20px;pointer-events:none';
      try { ZS.Icons?.apply(icon, stack.type); } catch { /* icône optionnelle */ }
      const qty = stack.qty || 1;
      if (qty > 1) {
        const count = document.createElement('span');
        count.textContent = String(qty);
        count.style.cssText = 'position:absolute;right:3px;bottom:1px;font:bold 11px monospace;color:#fff;text-shadow:1px 1px 0 #000;pointer-events:none';
        slot.appendChild(count);
      }
      slot.appendChild(icon);
    }
    return slot;
  }

  function _makeCloseButton(onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'x';
    btn.setAttribute('aria-label', 'Fermer');
    btn.style.cssText = 'position:absolute;right:8px;top:6px;width:24px;height:24px;border:2px solid #555;background:#d6d6d6;color:#222;cursor:pointer';
    btn.addEventListener('click', onClick);
    return btn;
  }

  function _appendPlayerInventory(panel, title) {
    panel.appendChild(_sectionTitle(title || 'Votre inventaire'));
    const invSlots = ZS.Inventory?.getStorageSlots?.() || [];
    const bagSlots = invSlots.filter((s) => s.zone === 'bag');
    const hotbarSlots = invSlots.filter((s) => s.zone === 'hotbar');

    const invGrid = _makeGrid(9);
    const paddedBag = [...bagSlots, ...Array(Math.max(0, 27 - bagSlots.length)).fill(null)];
    for (const slot of paddedBag) {
      const stack = slot?.type ? { type: slot.type, qty: slot.qty } : null;
      invGrid.appendChild(_makeSlot(stack, null, { readOnly: true }));
    }
    panel.appendChild(invGrid);

    const hotbarGrid = _makeGrid(9);
    const paddedHotbar = [...hotbarSlots, ...Array(Math.max(0, 9 - hotbarSlots.length)).fill(null)];
    for (const slot of paddedHotbar) {
      const stack = slot?.type ? { type: slot.type, qty: slot.qty } : null;
      hotbarGrid.appendChild(_makeSlot(stack, null, { readOnly: true }));
    }
    panel.appendChild(hotbarGrid);
  }

  function init(state) {
    _state = state;
  }

  function _ensurePanel() {
    if (_panel) return _panel;
    _backdrop = document.createElement('div');
    _backdrop.id = 'sleep-loot-backdrop';
    _backdrop.addEventListener('click', closePanel);
    document.body.appendChild(_backdrop);

    _panel = document.createElement('div');
    _panel.id = 'sleep-loot-panel';
    document.body.appendChild(_panel);
    return _panel;
  }

  function _showPanel() {
    _panel?.classList.add('is-open');
    _backdrop?.classList.add('is-open');
    document.body.classList.add('sleep-loot-open');
  }

  function _hidePanel() {
    _panel?.classList.remove('is-open');
    _backdrop?.classList.remove('is-open');
    document.body.classList.remove('sleep-loot-open');
  }

  function _corpseSlots(inv) {
    const slots = [];
    const push = (zone, index, stack) => {
      slots.push({ zone, index, stack: stack?.type ? stack : null });
    };
    const equip = inv?.equip || {};
    for (const k of ['Tête', 'Torso', 'Mains', 'Dos']) push('equip', k, equip[k]);
    for (let i = 0; i < 6; i++) push('hotbar', i, inv?.hotbar?.[i]);
    const bag = inv?.bag || [];
    const bagLen = Math.max(bag.length, 9);
    const padded = Math.ceil(bagLen / 9) * 9;
    for (let i = 0; i < padded; i++) push('bag', i, bag[i]);
    return slots;
  }

  function _corpseFilledCount(slots) {
    return slots.filter((s) => s.stack?.type).length;
  }

  function _takeItem(zone, index) {
    const sock = ZS.Network?.getSocket?.();
    if (!sock || !_targetId) return;
    sock.emit('sleep-loot-take', { playerId: _targetId, zone, index }, (res) => {
      if (!res?.ok) {
        ZS.UI?.showNotif?.(res?.error || 'Impossible');
        return;
      }
      _inventory = res.inventory;
      _renderPanel();
    });
  }

  function _renderPanel() {
    const panel = _ensurePanel();
    panel.replaceChildren();

    panel.appendChild(_makeCloseButton(closePanel));

    const kindLabel = _targetKind === 'death' ? '☠ Corps' : '💤 Joueur endormi';
    const corpseSlots = _corpseSlots(_inventory);
    const filled = _corpseFilledCount(corpseSlots);
    panel.appendChild(_sectionTitle(`${kindLabel} — ${_targetName} (${filled})`));

    const hint = document.createElement('div');
    hint.textContent = 'Cliquez un objet du corps pour le prendre.';
    hint.style.cssText = 'font-size:11px;color:#555;margin:-2px 0 6px;font-style:italic';
    panel.appendChild(hint);

    const corpseGrid = _makeGrid(9);
    for (const entry of corpseSlots) {
      corpseGrid.appendChild(_makeSlot(entry.stack, entry.stack ? () => {
        if (!ZS.Inventory?.canAddStack?.(entry.stack.type, entry.stack.qty || 1)) {
          ZS.UI?.showNotif?.('Inventaire plein');
          return;
        }
        _takeItem(entry.zone, entry.index);
      } : null, {
        title: entry.stack ? `${_itemLabel(entry.stack)} — prendre` : '',
      }));
    }
    panel.appendChild(corpseGrid);

    _appendPlayerInventory(panel, 'Votre inventaire');
    return true;
  }

  function openPanel(data) {
    _targetId = Number(data.playerId);
    _targetName = data.username || '?';
    _targetKind = data.kind === 'death' ? 'death' : 'sleep';
    _inventory = data.inventory || {};
    _pending = false;
    _ensurePanel();
    _renderPanel();
    _open = true;
    _showPanel();
    if (document.body.classList.contains('input-desktop')) {
      ZS.onUiPanelOpen?.();
    }
  }

  function closePanel() {
    const wasOpen = _open;
    _open = false;
    _pending = false;
    _targetId = null;
    _inventory = null;
    _hidePanel();
    if (wasOpen && document.body.classList.contains('input-desktop')) {
      ZS.onUiPanelClose?.();
    }
  }

  function onInventoryUpdate(playerId, inventory) {
    if (!_open || Number(playerId) !== Number(_targetId)) return;
    _inventory = inventory;
    _renderPanel();
  }

  function findNearestTarget(px, pz) {
    return ZS.Network?.findNearestLootable?.(px, pz, LOOT_RADIUS) || null;
  }

  function tryInteract() {
    if (_open || _pending) return false;
    const st = _state;
    if (!st || st.player.dead) return false;
    const body = findNearestTarget(st.player.x, st.player.z);
    if (!body) return false;
    const sock = ZS.Network?.getSocket?.();
    if (!sock) return false;
    _pending = true;
    sock.emit('sleep-loot-open', { playerId: body.playerId }, (res) => {
      _pending = false;
      if (!res?.ok) {
        ZS.UI?.showNotif?.(res?.error || 'Rien à fouiller');
        return;
      }
      openPanel(res);
    });
    return true;
  }

  function getNearestForUi(px, pz) {
    return findNearestTarget(px, pz);
  }

  function refreshIfOpen() {
    if (_open) _renderPanel();
  }

  window.ZS = window.ZS || {};
  ZS.SleepLoot = {
    init,
    tryInteract,
    closePanel,
    onInventoryUpdate,
    getNearestForUi,
    refreshIfOpen,
    isOpen: () => _open,
    isPending: () => _pending,
  };
})();
