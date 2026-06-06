// Fouille des joueurs endormis (déconnectés)
(function () {
  'use strict';

  const LOOT_RADIUS = 3.5;
  let _panel = null;
  let _backdrop = null;
  let _open = false;
  let _targetId = null;
  let _targetName = '';
  let _inventory = null;
  let _state = null;

  function init(state) {
    _state = state;
  }

  function _def(type) {
    return ZS.ITEMS?.[type] || null;
  }

  function _ensurePanel() {
    if (_panel) return _panel;
    _backdrop = document.createElement('div');
    Object.assign(_backdrop.style, {
      display: 'none', position: 'fixed', inset: '0', zIndex: '455',
      background: 'rgba(0,0,0,0.45)',
    });
    _backdrop.addEventListener('click', closePanel);
    document.body.appendChild(_backdrop);

    _panel = document.createElement('div');
    _panel.id = 'sleep-loot-panel';
    Object.assign(_panel.style, {
      display: 'none', position: 'fixed',
      top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      width: 'min(380px, 96vw)', maxHeight: '78vh', overflowY: 'auto',
      background: 'rgba(8,8,6,0.97)', border: '1px solid #5a4a2a',
      borderRadius: '8px', padding: '12px', zIndex: '456',
      color: '#e8d090', fontFamily: 'monospace', fontSize: '12px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.8)',
    });
    document.body.appendChild(_panel);
    return _panel;
  }

  function _slotBtn(label, zone, index, item) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = [
      'width:52px', 'height:52px', 'margin:3px', 'padding:2px',
      'border:1px solid #6a5a32', 'border-radius:6px',
      'background:rgba(30,24,12,0.85)', 'color:#e8d090',
      'cursor:pointer', 'font-size:18px', 'line-height:1',
      'touch-action:manipulation',
    ].join(';');
    if (!item?.type) {
      btn.style.opacity = '0.35';
      btn.textContent = '·';
      btn.disabled = true;
      return btn;
    }
    const def = _def(item.type);
    btn.title = (def?.label || item.type) + ' — prendre';
    btn.textContent = def?.icon || '?';
    ZS.Icons?.apply(btn, item.type);
    if (item.qty > 1) {
      const q = document.createElement('span');
      q.textContent = item.qty;
      q.style.cssText = 'position:absolute;right:4px;bottom:2px;font-size:10px;color:#fff';
      btn.style.position = 'relative';
      btn.appendChild(q);
    }
    const take = (e) => {
      if (e) e.preventDefault();
      _takeItem(zone, index);
    };
    btn.addEventListener('click', take);
    btn.addEventListener('touchstart', take, { passive: false });
    return btn;
  }

  function _renderPanel() {
    const p = _ensurePanel();
    p.replaceChildren();
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'
      + 'border-bottom:1px solid #5a4a2a;padding-bottom:6px';
    const title = document.createElement('span');
    title.style.cssText = 'font-size:14px;font-weight:bold';
    title.textContent = `💤 Fouiller — ${_targetName}`;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:rgba(80,50,10,0.5);color:#e8d090;border:1px solid #7a5a28;'
      + 'border-radius:6px;padding:4px 12px;cursor:pointer;font-size:14px';
    closeBtn.addEventListener('click', closePanel);
    hdr.appendChild(title);
    hdr.appendChild(closeBtn);
    p.appendChild(hdr);

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:10px;color:#9a8a6a;margin-bottom:8px;font-style:italic';
    hint.textContent = 'Touchez un objet pour le voler.';
    p.appendChild(hint);

    const inv = _inventory || {};
    const hotbar = inv.hotbar || [];
    const bag = inv.bag || [];
    const equip = inv.equip || {};

    const hbTitle = document.createElement('div');
    hbTitle.textContent = 'Barre rapide';
    hbTitle.style.margin = '6px 0 4px';
    p.appendChild(hbTitle);
    const hbRow = document.createElement('div');
    hbRow.style.cssText = 'display:flex;flex-wrap:wrap';
    for (let i = 0; i < 6; i++) hbRow.appendChild(_slotBtn('hb', 'hotbar', i, hotbar[i]));
    p.appendChild(hbRow);

    const eqTitle = document.createElement('div');
    eqTitle.textContent = 'Équipement';
    eqTitle.style.margin = '8px 0 4px';
    p.appendChild(eqTitle);
    const eqRow = document.createElement('div');
    eqRow.style.cssText = 'display:flex;flex-wrap:wrap';
    for (const k of ['Tête', 'Torso', 'Mains', 'Dos']) {
      eqRow.appendChild(_slotBtn(k, 'equip', k, equip[k]));
    }
    p.appendChild(eqRow);

    const bagTitle = document.createElement('div');
    bagTitle.textContent = 'Sac';
    bagTitle.style.margin = '8px 0 4px';
    p.appendChild(bagTitle);
    const bagRow = document.createElement('div');
    bagRow.style.cssText = 'display:flex;flex-wrap:wrap';
    for (let i = 0; i < bag.length; i++) bagRow.appendChild(_slotBtn('bag', 'bag', i, bag[i]));
    if (!bag.length) {
      const empty = document.createElement('span');
      empty.textContent = '(vide)';
      empty.style.color = '#7a6a4a';
      bagRow.appendChild(empty);
    }
    p.appendChild(bagRow);
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

  function openPanel(data) {
    _targetId = Number(data.playerId);
    _targetName = data.username || '?';
    _inventory = data.inventory || {};
    _open = true;
    _ensurePanel();
    _renderPanel();
    _panel.style.display = 'block';
    _backdrop.style.display = 'block';
    document.body.classList.add('sleep-loot-open');
  }

  function closePanel() {
    _open = false;
    _targetId = null;
    _inventory = null;
    if (_panel) _panel.style.display = 'none';
    if (_backdrop) _backdrop.style.display = 'none';
    document.body.classList.remove('sleep-loot-open');
  }

  function onInventoryUpdate(playerId, inventory) {
    if (!_open || Number(playerId) !== Number(_targetId)) return;
    _inventory = inventory;
    _renderPanel();
  }

  function findNearestTarget(px, pz) {
    return ZS.Network?.findNearestSleeping?.(px, pz, LOOT_RADIUS) || null;
  }

  function tryInteract() {
    if (_open) { closePanel(); return true; }
    const st = _state;
    if (!st || st.player.dead) return false;
    const body = findNearestTarget(st.player.x, st.player.z);
    if (!body) return false;
    const sock = ZS.Network?.getSocket?.();
    if (!sock) return false;
    sock.emit('sleep-loot-open', { playerId: body.playerId }, (res) => {
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

  window.ZS = window.ZS || {};
  ZS.SleepLoot = {
    init,
    tryInteract,
    closePanel,
    onInventoryUpdate,
    getNearestForUi,
    isOpen: () => _open,
  };
}());
