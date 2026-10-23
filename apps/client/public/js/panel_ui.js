// Système de panneaux ZS — source unique pour backdrops, headers, slots, layout
(function () {
  'use strict';

  const Z = {
    BACKDROP: 449,
    PANEL: 450,
    STORAGE: 470,
    CRAFT: 500,
    GROUP: 510,
  };

  function isDesktopMode() {
    return document.body.classList.contains('mode-desktop');
  }

  function isTabletMode() {
    return document.body.classList.contains('mode-tablet');
  }

  function isDesktopUi() {
    return isDesktopMode() || isTabletMode();
  }

  function itemDef(type) {
    return ZS.ITEMS?.[type] || null;
  }

  function itemLabel(stack) {
    if (!stack?.type) return '';
    const def = itemDef(stack.type);
    const q = stack.qty > 1 ? ` ×${stack.qty}` : '';
    return `${def?.label || stack.type}${q}`;
  }

  function makeHint(text) {
    const el = document.createElement('div');
    el.className = 'zs-panel-hint inv-hint';
    el.textContent = text;
    return el;
  }

  function makeSectionTitle(text) {
    const el = document.createElement('h3');
    el.className = 'zs-section-title inv-section-title';
    el.textContent = text;
    return el;
  }

  function makeCloseButton(onClose) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zs-close-btn inv-close-btn';
    btn.textContent = '✕';
    btn.setAttribute('aria-label', 'Fermer');
    if (onClose) btn.addEventListener('click', onClose);
    return btn;
  }

  /** Header standard : titre + sous-titre + boutons à droite */
  function makeHeader(opts = {}) {
    const hdr = document.createElement('div');
    hdr.className = 'zs-panel-hdr inv-hdr';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'zs-panel-hdr-title inv-hdr-title';

    const titleEl = document.createElement('span');
    titleEl.className = 'zs-panel-hdr-name inv-hdr-name';
    titleEl.textContent = opts.title || '';

    titleWrap.appendChild(titleEl);

    let subEl = null;
    if (opts.subtitle) {
      subEl = document.createElement('span');
      subEl.className = 'zs-panel-hdr-sub inv-hdr-sub zs-desktop-only';
      subEl.textContent = opts.subtitle;
      titleWrap.appendChild(subEl);
    }

    hdr.appendChild(titleWrap);

    const hdrBtns = document.createElement('div');
    hdrBtns.className = 'zs-panel-hdr-btns inv-hdr-btns';

    if (opts.extraButtons) {
      for (const btn of opts.extraButtons) hdrBtns.appendChild(btn);
    }
    if (opts.onClose) hdrBtns.appendChild(makeCloseButton(opts.onClose));

    hdr.appendChild(hdrBtns);

    return { el: hdr, titleEl, subEl, hdrBtns };
  }

  const DRAG_THRESH = 7;
  let _xfer = null;

  function slotFromEl(el) {
    if (!el?.dataset?.zsZone) return null;
    return {
      side: el.dataset.zsSide || 'player',
      zone: el.dataset.zsZone,
      index: el.dataset.zsIdx,
    };
  }

  function _ensureXferGhost() {
    let g = document.getElementById('zs-drag-ghost');
    if (!g) {
      g = document.createElement('div');
      g.id = 'zs-drag-ghost';
      g.hidden = true;
      document.body.appendChild(g);
    }
    return g;
  }

  function _clearXferVisuals(panel) {
    if (!panel) return;
    panel.querySelectorAll('.inv-slot-dragging').forEach((n) => n.classList.remove('inv-slot-dragging'));
    if (_xfer?.dragOverEl) {
      _xfer.dragOverEl.classList.remove('inv-slot-drag-over');
      _xfer.dragOverEl = null;
    }
    const g = document.getElementById('zs-drag-ghost');
    if (g) g.hidden = true;
  }

  function _findXferSlot(panel, x, y) {
    const ghost = document.getElementById('zs-drag-ghost');
    if (ghost) ghost.hidden = true;
    const hit = document.elementFromPoint(x, y);
    if (ghost) ghost.hidden = false;
    const el = hit?.closest?.('.zs-drag-slot');
    if (!el || !panel.contains(el)) return null;
    if (el.dataset.zsDrop === '0') return null;
    return el;
  }

  function _startXferDrag(from, item, x, y, panel, srcEl) {
    const ghost = _ensureXferGhost();
    ghost.replaceChildren();
    ghost.className = 'inv-slot inv-slot-filled';
    const ic = document.createElement('span');
    ic.className = 'inv-drag-ghost-icon inv-slot-icon';
    ic.textContent = itemDef(item.type)?.icon || '?';
    ghost.appendChild(ic);
    try { ZS.Icons?.apply(ic, item.type); } catch { /* optional */ }
    if ((item.qty || 1) > 1) {
      const q = document.createElement('span');
      q.className = 'inv-drag-ghost-qty inv-slot-qty';
      q.textContent = String(item.qty);
      ghost.appendChild(q);
    }
    ghost.hidden = false;
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
    srcEl?.classList.add('inv-slot-dragging');
    _xfer = { ..._xfer, drag: { from, ptr: _xfer.pending.ptr }, pending: null };
  }

  function _onXferPointerMove(e) {
    if (!_xfer?.active) return;
    const { panel, pending, drag, opts } = _xfer;
    if (pending && e.pointerId === pending.ptr) {
      const dx = e.clientX - pending.x;
      const dy = e.clientY - pending.y;
      if (Math.hypot(dx, dy) >= DRAG_THRESH) {
        const item = opts.getItem?.(pending.from);
        if (item) _startXferDrag(pending.from, item, e.clientX, e.clientY, panel, pending.el);
      }
      if (e.cancelable) e.preventDefault();
      return;
    }
    if (!drag || e.pointerId !== drag.ptr) return;
    const ghost = document.getElementById('zs-drag-ghost');
    if (ghost) {
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
    }
    const over = _findXferSlot(panel, e.clientX, e.clientY);
    if (_xfer.dragOverEl && _xfer.dragOverEl !== over) {
      _xfer.dragOverEl.classList.remove('inv-slot-drag-over');
    }
    _xfer.dragOverEl = over;
    if (over) over.classList.add('inv-slot-drag-over');
    if (e.cancelable) e.preventDefault();
  }

  function _finishXferPointer(e) {
    if (!_xfer?.active) return;
    const { panel, pending, drag, opts } = _xfer;
    if (pending && e.pointerId === pending.ptr) {
      try { pending.el?.releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
      if (!drag && opts.onClick) opts.onClick(pending.from, pending.el);
      _clearXferVisuals(panel);
      _xfer = null;
      return;
    }
    if (!drag || e.pointerId !== drag.ptr) return;
    try {
      const srcEl = panel.querySelector(
        `.zs-drag-slot[data-zs-side="${drag.from.side}"][data-zs-zone="${drag.from.zone}"][data-zs-idx="${drag.from.index}"]`,
      );
      srcEl?.releasePointerCapture?.(e.pointerId);
    } catch { /* ignore */ }
    const targetEl = _findXferSlot(panel, e.clientX, e.clientY);
    const to = targetEl ? slotFromEl(targetEl) : null;
    const from = drag.from;
    _clearXferVisuals(panel);
    const done = _xfer;
    _xfer = null;
    if (to && !(to.side === from.side && to.zone === from.zone && String(to.index) === String(from.index))) {
      done.opts.onMove(from, to, (res) => {
        if (!res?.ok) ZS.UI?.showNotif?.(res?.error || 'Déplacement refusé');
      });
    }
  }

  function bindTransferDrag(opts) {
    const panel = typeof opts.panel === 'string' ? document.querySelector(opts.panel) : opts.panel;
    if (!panel || panel.dataset.zsXfer === '1') return;
    panel.dataset.zsXfer = '1';

    panel.addEventListener('pointerdown', (e) => {
      if (!opts.isActive?.()) return;
      const slotEl = e.target.closest('.zs-drag-slot');
      if (!slotEl || !panel.contains(slotEl)) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const from = slotFromEl(slotEl);
      if (!from) return;
      if (slotEl.dataset.zsDrag === '0') return;
      const item = opts.getItem?.(from);
      if (!item?.type) return;
      e.preventDefault();
      e.stopPropagation();
      _clearXferVisuals(panel);
      _xfer = {
        active: true,
        panel,
        opts,
        pending: { from, ptr: e.pointerId, x: e.clientX, y: e.clientY, el: slotEl },
        drag: null,
        dragOverEl: null,
      };
      try { slotEl.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });

    if (!document.body.dataset.zsXferGlobal) {
      document.body.dataset.zsXferGlobal = '1';
      document.addEventListener('pointermove', _onXferPointerMove, { passive: false });
      document.addEventListener('pointerup', _finishXferPointer);
      document.addEventListener('pointercancel', _finishXferPointer);
    }
  }

  function makeSlot(stack, opts = {}) {
    const readOnly = !!opts.readOnly;
    const drag = opts.drag || null;
    const onClick = opts.onClick;
    const useDiv = readOnly || !!drag;
    const el = document.createElement(useDiv ? 'div' : 'button');
    if (!useDiv) el.type = 'button';
    el.className = 'inv-slot zs-slot stor-slot' + (stack?.type ? ' inv-slot-filled' : '');
    if (readOnly) el.classList.add('stor-slot-readonly');
    if (drag) {
      el.classList.add('zs-drag-slot');
      el.dataset.zsSide = drag.side || 'player';
      el.dataset.zsZone = drag.zone;
      el.dataset.zsIdx = String(drag.index);
      if (!stack?.type || drag.noDrag) el.dataset.zsDrag = '0';
      if (drag.noDrop) el.dataset.zsDrop = '0';
      el.style.touchAction = 'none';
      if (stack?.type) el.style.cursor = 'grab';
    }
    el.title = stack?.type ? (opts.title || itemLabel(stack)) : '';
    if (stack?.type) {
      const def = itemDef(stack.type);
      const ic = document.createElement('span');
      ic.className = 'inv-slot-icon';
      ic.textContent = def?.icon || '?';
      el.appendChild(ic);
      try { ZS.Icons?.apply(ic, stack.type); } catch { /* optional */ }
      const qty = stack.qty || 1;
      if (qty > 1) {
        const q = document.createElement('span');
        q.className = 'inv-slot-qty';
        q.textContent = String(qty);
        el.appendChild(q);
      }
      if (onClick && !readOnly && !drag) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          onClick();
        });
      }
    } else if (!useDiv) {
      el.disabled = true;
    }
    return el;
  }

  function fillSlotGrid(grid, slots, slotOpts = {}) {
    const { onSlotClick, readOnly, dragSide, dragZone } = slotOpts;
    grid.replaceChildren();
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const stack = slot?.type ? { type: slot.type, qty: slot.qty } : null;
      const idx = slot?.idx != null ? slot.idx : (slot?.index != null ? slot.index : i);
      const zone = slot?.zone || dragZone;
      const side = slot?.side || dragSide || 'player';
      grid.appendChild(makeSlot(stack, {
        readOnly,
        drag: (dragZone || slot?.zone) ? { side, zone, index: idx } : null,
        onClick: stack && onSlotClick ? () => onSlotClick(slot) : null,
      }));
    }
  }

  function makeBody(className) {
    const body = document.createElement('div');
    body.className = className || 'zs-panel-body stor-body';
    return body;
  }

  /** Deux colonnes PC/tablette (coffre, fouille, etc.) */
  function makeSplitBody(opts = {}) {
    const body = makeBody(opts.bodyClass || 'zs-panel-body zs-panel-body-split stor-body');
    const left = document.createElement('section');
    left.className = opts.leftClass || 'zs-panel-col zs-panel-col-primary stor-chest-col';
    const right = document.createElement('section');
    right.className = opts.rightClass || 'zs-panel-col zs-panel-col-secondary stor-inv-col';
    body.appendChild(left);
    body.appendChild(right);
    return { body, left, right };
  }

  function makeHotbarGrid() {
    const grid = document.createElement('div');
    grid.className = 'inv-hotbar-grid stor-hotbar-grid zs-hotbar-grid';
    return grid;
  }

  function makeBagGrid() {
    const grid = document.createElement('div');
    grid.className = 'inv-bag-grid stor-bag-grid zs-bag-grid';
    return grid;
  }

  function makeChestGrid() {
    const grid = document.createElement('div');
    grid.className = 'stor-chest-grid zs-chest-grid';
    return grid;
  }

  /**
   * Coque complète : backdrop + panneau + header (+ hint optionnel) + body vide.
   * openMode: 'display' (défaut) ou 'class' (is-open sur backdrop/panel).
   */
  function create(opts = {}) {
    const id = opts.id;
    const backdropId = opts.backdropId || `${id}-backdrop`;
    const zPanel = opts.zIndex ?? Z.PANEL;
    const zBackdrop = opts.backdropZIndex ?? (zPanel - 1);

    const backdrop = document.createElement('div');
    backdrop.id = backdropId;
    backdrop.className = 'zs-backdrop';
    backdrop.style.zIndex = String(zBackdrop);
    if (opts.onClose) backdrop.addEventListener('click', opts.onClose);

    const panel = document.createElement('div');
    panel.id = id;
    panel.className = 'zs-panel' + (opts.wide ? ' zs-panel-wide' : '');
    panel.style.zIndex = String(zPanel);

    const header = makeHeader({
      title: opts.title || '',
      subtitle: opts.subtitle || '',
      extraButtons: opts.headerButtons,
      onClose: opts.onClose,
    });
    panel.appendChild(header.el);

    let hintEl = null;
    if (opts.hint) {
      hintEl = makeHint(opts.hint);
      panel.appendChild(hintEl);
    }

    const body = makeBody(opts.bodyClass);
    panel.appendChild(body);

    const openMode = opts.openMode || 'display';

    function setOpen(open) {
      if (openMode === 'class') {
        backdrop.classList.toggle('is-open', open);
        panel.classList.toggle('is-open', open);
        backdrop.style.display = '';
        panel.style.display = '';
      } else {
        backdrop.style.display = open ? 'block' : 'none';
        panel.style.display = open ? 'flex' : 'none';
      }
    }

    function isOpen() {
      if (openMode === 'class') return panel.classList.contains('is-open');
      return panel.style.display === 'flex';
    }

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    return {
      backdrop,
      panel,
      header,
      hintEl,
      body,
      setOpen,
      isOpen,
    };
  }

  function onDesktopPanelOpen() {
    if (isDesktopMode()) ZS.onUiPanelOpen?.();
  }

  function onDesktopPanelClose(wasOpen) {
    if (wasOpen && isDesktopMode()) ZS.onUiPanelClose?.();
  }

  window.ZS = window.ZS || {};
  ZS.PanelUI = {
    Z,
    isDesktopMode,
    isTabletMode,
    isDesktopUi,
    itemDef,
    itemLabel,
    makeHint,
    makeSectionTitle,
    makeCloseButton,
    makeHeader,
    makeSlot,
    slotFromEl,
    bindTransferDrag,
    fillSlotGrid,
    makeBody,
    makeSplitBody,
    makeHotbarGrid,
    makeBagGrid,
    makeChestGrid,
    create,
    onDesktopPanelOpen,
    onDesktopPanelClose,
  };
}());
