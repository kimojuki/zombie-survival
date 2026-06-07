// Fouille joueurs (corps mort / endormi) — via ZS.PanelUI + drag & drop
(function () {
  'use strict';

  const LOOT_RADIUS = 3.5;
  const EQUIP_SLOTS = ['Tête', 'Torso', 'Mains', 'Dos'];
  const P = () => ZS.PanelUI;

  let shell = null;
  let hdrTitle = null;
  let targetTitle = null;
  let equipGrid = null;
  let targetHotbarGrid = null;
  let targetBagGrid = null;
  let targetBagTitle = null;
  let playerHotbarGrid = null;
  let playerBagGrid = null;
  let playerBagTitle = null;
  let dragBound = false;

  let panelOpen = false;
  let pending = false;
  let targetId = null;
  let targetName = '';
  let targetKind = 'sleep';
  let inventory = null;
  let state = null;

  function _corpseData(inv) {
    const equip = EQUIP_SLOTS.map((slotName) => ({
      zone: 'equip',
      index: slotName,
      stack: inv?.equip?.[slotName]?.type ? inv.equip[slotName] : null,
    }));
    const hotbar = Array.from({ length: 6 }, (_, i) => ({
      zone: 'hotbar',
      index: i,
      stack: inv?.hotbar?.[i]?.type ? inv.hotbar[i] : null,
    }));
    const bagArr = inv?.bag || [];
    const bag = Array.from({ length: bagArr.length }, (_, i) => ({
      zone: 'bag',
      index: i,
      stack: bagArr[i]?.type ? bagArr[i] : null,
    }));
    return { equip, hotbar, bag };
  }

  function _filledCount(data) {
    let n = 0;
    for (const group of [data.equip, data.hotbar, data.bag]) {
      for (const entry of group) {
        if (entry.stack?.type) n += 1;
      }
    }
    return n;
  }

  function _getItem(ref) {
    if (ref.side === 'target') {
      const data = _corpseData(inventory);
      if (ref.zone === 'equip') {
        const e = data.equip.find((x) => x.index === ref.index);
        return e?.stack?.type ? e.stack : null;
      }
      if (ref.zone === 'hotbar') {
        const e = data.hotbar[Number(ref.index)];
        return e?.stack?.type ? e.stack : null;
      }
      if (ref.zone === 'bag') {
        const e = data.bag[Number(ref.index)];
        return e?.stack?.type ? e.stack : null;
      }
      return null;
    }
    const invSlots = ZS.Inventory?.getStorageSlots?.() || [];
    const slot = invSlots.find((s) => s.zone === ref.zone && String(s.idx) === String(ref.index));
    return slot?.type ? { type: slot.type, qty: slot.qty } : null;
  }

  function _onMove(from, to, cb) {
    const sock = ZS.Network?.getSocket?.();
    if (!sock || !targetId) {
      cb?.({ ok: false, error: 'Déconnecté' });
      return;
    }
    sock.emit('sleep-loot-move', {
      playerId: targetId,
      from: { side: from.side, zone: from.zone, index: from.index },
      to: { side: to.side, zone: to.zone, index: to.index },
    }, (res) => {
      if (!res?.ok) {
        cb?.({ ok: false, error: res?.error || 'Déplacement refusé' });
        return;
      }
      if (res.inventory) inventory = res.inventory;
      _renderPanel();
      cb?.({ ok: true });
    });
  }

  function _bindDrag() {
    if (dragBound || !shell?.panel) return;
    dragBound = true;
    P().bindTransferDrag({
      panel: shell.panel,
      isActive: () => panelOpen,
      getItem: _getItem,
      onMove: _onMove,
    });
  }

  function _targetSlotEl(entry) {
    const stack = entry.stack;
    return P().makeSlot(stack?.type ? stack : null, {
      drag: {
        side: 'target',
        zone: entry.zone,
        index: entry.index,
        noDrag: !stack?.type,
      },
    });
  }

  function _ensurePanel() {
    if (shell) return;

    shell = P().create({
      id: 'sleep-loot-panel',
      backdropId: 'sleep-loot-backdrop',
      title: '🔍 Fouille',
      subtitle: 'Échap pour fermer',
      hint: 'Glissez les objets entre la cible et votre inventaire dans les deux sens.',
      zIndex: P().Z.STORAGE,
      wide: true,
      onClose: closePanel,
    });
    hdrTitle = shell.header.titleEl;

    const split = P().makeSplitBody({
      leftClass: 'zs-panel-col zs-panel-col-primary stor-chest-col loot-target-col',
      rightClass: 'zs-panel-col zs-panel-col-secondary stor-inv-col loot-player-col',
    });
    shell.body.replaceChildren();
    shell.body.appendChild(split.body);

    targetTitle = P().makeSectionTitle('');
    split.left.appendChild(targetTitle);

    const equipSec = document.createElement('section');
    equipSec.className = 'inv-section loot-equip-section';
    equipSec.appendChild(P().makeSectionTitle('Équipement'));
    equipGrid = document.createElement('div');
    equipGrid.className = 'inv-equip-grid loot-equip-grid';
    equipSec.appendChild(equipGrid);
    split.left.appendChild(equipSec);

    const targetHbSec = document.createElement('section');
    targetHbSec.className = 'inv-section stor-hotbar-section';
    targetHbSec.appendChild(P().makeSectionTitle('Barre d\'action'));
    targetHotbarGrid = P().makeHotbarGrid();
    targetHbSec.appendChild(targetHotbarGrid);
    split.left.appendChild(targetHbSec);

    const targetBagSec = document.createElement('section');
    targetBagSec.className = 'inv-section stor-bag-section';
    targetBagTitle = P().makeSectionTitle('');
    targetBagSec.appendChild(targetBagTitle);
    targetBagGrid = P().makeBagGrid();
    targetBagSec.appendChild(targetBagGrid);
    split.left.appendChild(targetBagSec);

    split.right.appendChild(P().makeSectionTitle('Votre inventaire'));
    const playerHint = document.createElement('p');
    playerHint.className = 'loot-player-hint';
    playerHint.textContent = 'Échange bidirectionnel — déposez ou retirez des objets par glisser-déposer.';
    split.right.appendChild(playerHint);

    const playerHbSec = document.createElement('section');
    playerHbSec.className = 'inv-section stor-hotbar-section';
    playerHbSec.appendChild(P().makeSectionTitle('Barre d\'action'));
    playerHotbarGrid = P().makeHotbarGrid();
    playerHbSec.appendChild(playerHotbarGrid);
    split.right.appendChild(playerHbSec);

    const playerBagSec = document.createElement('section');
    playerBagSec.className = 'inv-section stor-bag-section';
    playerBagTitle = P().makeSectionTitle('');
    playerBagSec.appendChild(playerBagTitle);
    playerBagGrid = P().makeBagGrid();
    playerBagSec.appendChild(playerBagGrid);
    split.right.appendChild(playerBagSec);

    _bindDrag();
  }

  function _renderPanel() {
    _ensurePanel();
    const data = _corpseData(inventory);
    const filled = _filledCount(data);
    const kindLabel = targetKind === 'death' ? '☠ Fouille' : '💤 Fouille';

    if (hdrTitle) hdrTitle.textContent = `${kindLabel} — ${targetName}`;
    if (targetTitle) targetTitle.textContent = `Cible · ${filled} objet${filled !== 1 ? 's' : ''}`;

    equipGrid.replaceChildren();
    for (const entry of data.equip) {
      const wrap = document.createElement('div');
      wrap.className = 'inv-equip-row';
      const lbl = document.createElement('span');
      lbl.className = 'inv-slot-label';
      lbl.textContent = entry.index;
      wrap.appendChild(lbl);
      wrap.appendChild(_targetSlotEl(entry));
      equipGrid.appendChild(wrap);
    }

    targetHotbarGrid.replaceChildren();
    for (const entry of data.hotbar) {
      targetHotbarGrid.appendChild(_targetSlotEl(entry));
    }

    if (targetBagTitle) {
      targetBagTitle.textContent = data.bag.length
        ? `Sac · ${data.bag.length} emplacements`
        : 'Sac · vide';
    }
    targetBagGrid.replaceChildren();
    if (!data.bag.length) {
      const empty = document.createElement('p');
      empty.className = 'inv-bag-empty';
      empty.textContent = 'Aucun sac ou sac vide.';
      targetBagGrid.appendChild(empty);
    } else {
      for (const entry of data.bag) {
        targetBagGrid.appendChild(_targetSlotEl(entry));
      }
    }

    const invSlots = ZS.Inventory?.getStorageSlots?.() || [];
    const bagSlots = invSlots.filter((s) => s.zone === 'bag');
    const hotbarSlots = invSlots.filter((s) => s.zone === 'hotbar');

    P().fillSlotGrid(playerHotbarGrid, hotbarSlots, { dragSide: 'player' });
    if (playerBagTitle) {
      playerBagTitle.textContent = bagSlots.length
        ? `Sac · ${bagSlots.length} emplacements`
        : 'Sac · aucun sac équipé';
    }
    playerBagGrid.replaceChildren();
    if (!bagSlots.length) {
      const empty = document.createElement('p');
      empty.className = 'inv-bag-empty';
      empty.textContent = 'Équipez un sac pour stocker des objets.';
      playerBagGrid.appendChild(empty);
    } else {
      P().fillSlotGrid(playerBagGrid, bagSlots, { dragSide: 'player' });
    }
  }

  function init(gameState) {
    state = gameState;
  }

  function openPanel(data) {
    targetId = Number(data.playerId);
    targetName = data.username || '?';
    targetKind = data.kind === 'death' ? 'death' : 'sleep';
    inventory = data.inventory || {};
    pending = false;
    _ensurePanel();
    _renderPanel();
    panelOpen = true;
    shell.setOpen(true);
    document.body.classList.add('sleep-loot-open');
    P().onDesktopPanelOpen();
  }

  function closePanel() {
    const wasOpen = panelOpen;
    panelOpen = false;
    pending = false;
    targetId = null;
    inventory = null;
    shell?.setOpen(false);
    document.body.classList.remove('sleep-loot-open');
    P().onDesktopPanelClose(wasOpen);
  }

  function onInventoryUpdate(playerId, inv) {
    if (!panelOpen || Number(playerId) !== Number(targetId)) return;
    inventory = inv;
    _renderPanel();
  }

  function findNearestTarget(px, pz) {
    return ZS.Network?.findNearestLootable?.(px, pz, LOOT_RADIUS) || null;
  }

  function tryInteract() {
    if (panelOpen || pending) return false;
    if (!state || state.player.dead) return false;
    const body = findNearestTarget(state.player.x, state.player.z);
    if (!body) return false;
    const sock = ZS.Network?.getSocket?.();
    if (!sock) return false;
    pending = true;
    sock.emit('sleep-loot-open', { playerId: body.playerId }, (res) => {
      pending = false;
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
    if (panelOpen) _renderPanel();
  }

  window.ZS = window.ZS || {};
  ZS.SleepLoot = {
    init,
    tryInteract,
    closePanel,
    onInventoryUpdate,
    getNearestForUi,
    refreshIfOpen,
    isOpen: () => panelOpen,
    isPending: () => pending,
  };
}());
