// Grille d'inventaire style Minecraft (coffre, fouille corps, etc.)
(function () {
  'use strict';

  const PANEL_Z = 470;
  const BACKDROP_Z = 469;

  function itemLabel(stack) {
    if (!stack?.type) return '';
    const def = ZS.ITEMS?.[stack.type];
    const q = stack.qty > 1 ? ` x${stack.qty}` : '';
    return `${def?.label || stack.type}${q}`;
  }

  function sectionTitle(text) {
    const h = document.createElement('div');
    h.textContent = text;
    h.style.cssText = 'margin:10px 0 4px;color:#3b3b3b;font:16px monospace;text-shadow:1px 1px 0 #eee';
    return h;
  }

  function makeGrid(cols = 9) {
    const grid = document.createElement('div');
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},40px);gap:4px;width:max-content;max-width:100%;`;
    return grid;
  }

  function makeSlot(stack, onClick, opts = {}) {
    const slot = document.createElement('button');
    slot.type = 'button';
    const hasItem = !!stack?.type;
    slot.title = hasItem ? (opts.title || itemLabel(stack)) : '';
    slot.style.cssText = [
      'position:relative',
      'width:40px',
      'height:40px',
      'padding:0',
      'border:2px solid',
      'border-color:#595959 #f5f5f5 #f5f5f5 #595959',
      'background:#8b8b8b',
      'box-shadow:inset 2px 2px 0 rgba(0,0,0,.35), inset -2px -2px 0 rgba(255,255,255,.35)',
      'font:20px monospace',
      'color:#fff',
      'touch-action:manipulation',
    ].join(';');
    if (hasItem && onClick) {
      slot.style.cursor = 'pointer';
      slot.addEventListener('click', onClick);
    } else {
      slot.disabled = !hasItem;
      slot.style.cursor = hasItem ? 'default' : 'default';
    }
    if (opts.readOnly && hasItem) slot.disabled = true;

    if (hasItem) {
      const icon = document.createElement('span');
      icon.textContent = ZS.ITEMS?.[stack.type]?.icon || '?';
      icon.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:20px;pointer-events:none';
      ZS.Icons?.apply(icon, stack.type);
      const count = document.createElement('span');
      const qty = stack.qty || 1;
      count.textContent = qty > 1 ? String(qty) : '';
      count.style.cssText = 'position:absolute;right:3px;bottom:1px;font:bold 11px monospace;color:#fff;text-shadow:1px 1px 0 #000;pointer-events:none';
      slot.appendChild(icon);
      slot.appendChild(count);
    }
    return slot;
  }

  function stylePanel(el) {
    el.style.cssText = [
      'display:none',
      'position:fixed',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      `z-index:${PANEL_Z}`,
      'width:min(438px,96vw)',
      'max-height:82vh',
      'overflow:auto',
      'background:#c6c6c6',
      'border:4px solid',
      'border-color:#f6f6f6 #555 #555 #f6f6f6',
      'border-radius:4px',
      'padding:12px 14px 14px',
      'color:#303030',
      'font:13px monospace',
      'box-shadow:0 6px 28px rgba(0,0,0,.55)',
    ].join(';');
  }

  function styleBackdrop(el, zIndex = BACKDROP_Z) {
    el.style.cssText = `display:none;position:fixed;inset:0;z-index:${zIndex};background:rgba(0,0,0,.28)`;
  }

  function makeCloseButton(onClick) {
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'x';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.style.cssText = 'position:absolute;right:8px;top:6px;width:24px;height:24px;border:2px solid #555;background:#d6d6d6;color:#222;cursor:pointer';
    closeBtn.addEventListener('click', onClick);
    return closeBtn;
  }

  /** Grille 9 colonnes — sac joueur (27) + hotbar (9). */
  function appendPlayerInventory(panel, opts = {}) {
    const readOnly = !!opts.readOnly;
    panel.appendChild(sectionTitle(opts.title || 'Inventaire'));
    const invSlots = ZS.Inventory?.getStorageSlots?.() || [];
    const bagSlots = invSlots.filter((s) => s.zone === 'bag');
    const hotbarSlots = invSlots.filter((s) => s.zone === 'hotbar');

    const invGrid = makeGrid(9);
    const paddedBag = [...bagSlots, ...Array(Math.max(0, 27 - bagSlots.length)).fill(null)];
    for (const slot of paddedBag) {
      const stack = slot?.type ? { type: slot.type, qty: slot.qty } : null;
      invGrid.appendChild(makeSlot(stack, null, { readOnly }));
    }
    panel.appendChild(invGrid);

    const hotbarGrid = makeGrid(9);
    const paddedHotbar = [...hotbarSlots, ...Array(Math.max(0, 9 - hotbarSlots.length)).fill(null)];
    for (const slot of paddedHotbar) {
      const stack = slot?.type ? { type: slot.type, qty: slot.qty } : null;
      hotbarGrid.appendChild(makeSlot(stack, null, { readOnly }));
    }
    panel.appendChild(hotbarGrid);
  }

  window.ZS = window.ZS || {};
  ZS.ChestUI = {
    itemLabel,
    sectionTitle,
    makeGrid,
    makeSlot,
    stylePanel,
    styleBackdrop,
    makeCloseButton,
    appendPlayerInventory,
    PANEL_Z,
    BACKDROP_Z,
  };
})();
