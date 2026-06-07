// Coffre de stockage — via ZS.PanelUI + drag & drop
(function () {
  'use strict';

  const P = () => ZS.PanelUI;

  let shell = null;
  let chestTitle = null;
  let chestGrid = null;
  let hotbarGrid = null;
  let bagGrid = null;
  let bagTitle = null;
  let dragBound = false;
  let state = { id: null, items: [], capacity: 27 };

  function _chestFilled() {
    let n = 0;
    for (const s of state.items) {
      if (s?.type) n += 1;
    }
    return n;
  }

  function _getItem(ref) {
    if (ref.side === 'chest' || ref.zone === 'chest') {
      const s = state.items[Number(ref.index)];
      return s?.type ? { type: s.type, qty: s.qty } : null;
    }
    const invSlots = ZS.Inventory?.getStorageSlots?.() || [];
    const slot = invSlots.find((s) => s.zone === ref.zone && String(s.idx) === String(ref.index));
    return slot?.type ? { type: slot.type, qty: slot.qty } : null;
  }

  function _mapMoveRef(ref) {
    return {
      zone: ref.side === 'chest' ? 'chest' : ref.zone,
      index: ref.index,
    };
  }

  function _onMove(from, to, cb) {
    ZS.Network?.requestStorageMove?.(
      state.id,
      _mapMoveRef(from),
      _mapMoveRef(to),
      (res) => {
        if (!res?.ok) cb?.({ ok: false, error: res?.err || 'Déplacement refusé' });
        else cb?.({ ok: true });
      },
    );
  }

  function _bindDrag() {
    if (dragBound || !shell?.panel) return;
    dragBound = true;
    P().bindTransferDrag({
      panel: shell.panel,
      isActive: isOpen,
      getItem: _getItem,
      onMove: _onMove,
    });
  }

  function _ensurePanel() {
    if (shell) return;

    shell = P().create({
      id: 'storage-panel',
      backdropId: 'storage-backdrop',
      title: '📦 Coffre',
      subtitle: 'Échap pour fermer',
      hint: 'Glissez les objets entre le coffre et votre inventaire dans les deux sens.',
      zIndex: P().Z.STORAGE,
      wide: true,
      onClose: close,
    });

    const split = P().makeSplitBody();
    shell.body.replaceChildren();
    shell.body.appendChild(split.body);

    chestTitle = P().makeSectionTitle('');
    split.left.appendChild(chestTitle);
    chestGrid = P().makeChestGrid();
    split.left.appendChild(chestGrid);

    const hbSec = document.createElement('section');
    hbSec.className = 'inv-section stor-hotbar-section';
    hbSec.appendChild(P().makeSectionTitle('Barre d\'action'));
    hotbarGrid = P().makeHotbarGrid();
    hbSec.appendChild(hotbarGrid);
    split.right.appendChild(hbSec);

    const bagSec = document.createElement('section');
    bagSec.className = 'inv-section stor-bag-section';
    bagTitle = P().makeSectionTitle('');
    bagSec.appendChild(bagTitle);
    bagGrid = P().makeBagGrid();
    bagSec.appendChild(bagGrid);
    split.right.appendChild(bagSec);

    _bindDrag();
  }

  function render() {
    _ensurePanel();
    if (chestTitle) chestTitle.textContent = `Coffre · ${_chestFilled()}/${state.capacity}`;

    chestGrid.replaceChildren();
    for (let i = 0; i < state.capacity; i++) {
      const stack = state.items[i] || null;
      const hasItem = !!stack?.type;
      chestGrid.appendChild(P().makeSlot(hasItem ? stack : null, {
        drag: { side: 'chest', zone: 'chest', index: i, noDrag: !hasItem },
      }));
    }

    const invSlots = ZS.Inventory?.getStorageSlots?.() || [];
    const bagSlots = invSlots.filter((s) => s.zone === 'bag');
    const hotbarSlots = invSlots.filter((s) => s.zone === 'hotbar');

    P().fillSlotGrid(hotbarGrid, hotbarSlots, { dragSide: 'player' });

    if (bagTitle) {
      bagTitle.textContent = bagSlots.length
        ? `Sac · ${bagSlots.length} emplacements`
        : 'Sac · aucun sac équipé';
    }
    bagGrid.replaceChildren();
    if (!bagSlots.length) {
      const empty = document.createElement('p');
      empty.className = 'inv-bag-empty';
      empty.textContent = 'Équipez un sac pour stocker des objets.';
      bagGrid.appendChild(empty);
    } else {
      P().fillSlotGrid(bagGrid, bagSlots, { dragSide: 'player' });
    }
  }

  function open(data) {
    state = {
      id: data?.id || null,
      items: Array.isArray(data?.items) ? data.items : [],
      capacity: data?.capacity || 27,
    };
    while (state.items.length < state.capacity) state.items.push(null);
    if (state.id) ZS.setDecorStorageState?.(state.id, true);
    _ensurePanel();
    shell.setOpen(true);
    render();
    P().onDesktopPanelOpen();
  }

  function update(data) {
    if (!shell?.isOpen()) return;
    if (!data || data.id !== state.id) return;
    state.items = Array.isArray(data.items) ? data.items : [];
    state.capacity = data.capacity || state.capacity;
    while (state.items.length < state.capacity) state.items.push(null);
    render();
  }

  function close() {
    const wasOpen = isOpen();
    if (state.id) ZS.setDecorStorageState?.(state.id, false);
    if (state.id) ZS.Network?.requestStorageClose?.(state.id);
    shell?.setOpen(false);
    state.id = null;
    P().onDesktopPanelClose(wasOpen);
  }

  function closeIf(decorId) {
    if (state.id && state.id === decorId) close();
  }

  function isOpen() {
    return !!state.id && !!shell?.isOpen();
  }

  function refreshIfOpen() {
    if (isOpen()) render();
  }

  window.ZS = window.ZS || {};
  ZS.StorageUI = { open, update, close, closeIf, isOpen, refreshIfOpen };
}());
