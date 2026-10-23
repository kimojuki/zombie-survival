// Panel inventaire + pickup mesh
function _buildInvPanel() {
    _invBackdrop = document.createElement('div');
    _invBackdrop.id = 'inv-backdrop';
    _invBackdrop.className = 'zs-backdrop';
    _invBackdrop.addEventListener('click', togglePanel);
    document.body.appendChild(_invBackdrop);

    const p = document.createElement('div');
    p.id = 'inv-panel';
    p.className = 'zs-panel zs-panel-wide';

    const dropBtn = document.createElement('button');
    dropBtn.type = 'button';
    dropBtn.id = 'inv-drop-btn';
    dropBtn.className = 'inv-drop-btn';
    dropBtn.textContent = '🗑 Jeter';
    dropBtn.addEventListener('click', _dropSelected);
    dropBtn.addEventListener('touchstart', (e) => { e.preventDefault(); _dropSelected(); }, { passive: false });

    const hdr = ZS.PanelUI.makeHeader({
      title: '🎒 Inventaire',
      subtitle: 'I · Tab · Échap pour fermer',
      extraButtons: [dropBtn],
      onClose: togglePanel,
    });
    p.appendChild(hdr.el);

    const hint = ZS.PanelUI.makeHint('Maintenez et glissez un objet vers un autre emplacement.');
    hint.id = 'inv-hint';
    p.appendChild(hint);

    const body = document.createElement('div');
    body.className = 'zs-panel-body inv-body';

    const equipCol = document.createElement('aside');
    equipCol.className = 'inv-equip-col';
    const eqTitle = document.createElement('h3');
    eqTitle.className = 'inv-section-title';
    eqTitle.textContent = 'Équipement';
    equipCol.appendChild(eqTitle);
    const equip = document.createElement('div');
    equip.id = 'inv-equip';
    equip.className = 'inv-equip-grid';
    equipCol.appendChild(equip);
    body.appendChild(equipCol);

    const mainCol = document.createElement('div');
    mainCol.className = 'inv-main-col';

    const hbSec = document.createElement('section');
    hbSec.className = 'inv-section inv-hotbar-section';
    const hbTitle = document.createElement('h3');
    hbTitle.className = 'inv-section-title';
    hbTitle.textContent = 'Barre d\'action';
    hbSec.appendChild(hbTitle);
    const hbGrid = document.createElement('div');
    hbGrid.id = 'inv-hotbar';
    hbGrid.className = 'inv-hotbar-grid';
    hbSec.appendChild(hbGrid);
    mainCol.appendChild(hbSec);

    const bagSec = document.createElement('section');
    bagSec.className = 'inv-section inv-bag-section';
    const bagTitle = document.createElement('h3');
    bagTitle.id = 'inv-bag-title';
    bagTitle.className = 'inv-section-title';
    bagTitle.textContent = 'Sac';
    bagSec.appendChild(bagTitle);
    const grid = document.createElement('div');
    grid.id = 'inv-grid';
    grid.className = 'inv-bag-grid';
    bagSec.appendChild(grid);
    mainCol.appendChild(bagSec);

    body.appendChild(mainCol);

    const detailCol = document.createElement('aside');
    detailCol.className = 'inv-detail-col inv-desktop-only';
    const detailTitle = document.createElement('h3');
    detailTitle.className = 'inv-section-title';
    detailTitle.textContent = 'Détail';
    detailCol.appendChild(detailTitle);
    const detailCard = document.createElement('div');
    detailCard.className = 'inv-detail-card';
    _detailIcon = document.createElement('div');
    _detailIcon.className = 'inv-detail-icon';
    _detailIcon.textContent = '▫';
    detailCard.appendChild(_detailIcon);
    _detailName = document.createElement('div');
    _detailName.className = 'inv-detail-name';
    _detailName.textContent = 'Aucune sélection';
    detailCard.appendChild(_detailName);
    _detailCat = document.createElement('div');
    _detailCat.className = 'inv-detail-cat';
    detailCard.appendChild(_detailCat);
    _detailDesc = document.createElement('p');
    _detailDesc.className = 'inv-detail-desc';
    _detailDesc.textContent = 'Sélectionnez un objet pour afficher sa description.';
    detailCard.appendChild(_detailDesc);
    detailCol.appendChild(detailCard);
    body.appendChild(detailCol);

    p.appendChild(body);

    document.body.appendChild(p);
    _bindInvDrag();
  }

  function _renderInvPanel() {
    const equip = document.getElementById('inv-equip');
    if (!equip) return;

    equip.replaceChildren();
    for (const slotName of EQUIP_SLOTS) {
      const item = _equip[slotName];
      const wrap = document.createElement('div');
      wrap.className = 'inv-equip-row';
      const lbl = document.createElement('span');
      lbl.className = 'inv-slot-label';
      lbl.textContent = slotName;
      const el = _makeSlotEl(item);
      _wireSlot(el, 'equip', slotName);
      wrap.appendChild(lbl);
      wrap.appendChild(el);
      equip.appendChild(wrap);
    }

    const hb = document.getElementById('inv-hotbar');
    hb.replaceChildren();
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const el = _makeSlotEl(_hotbar[i]);
      if (i === _active) el.classList.add('inv-slot-active');
      const keyHint = document.createElement('span');
      keyHint.className = 'inv-slot-key inv-desktop-only';
      keyHint.textContent = String(i + 1);
      el.appendChild(keyHint);
      _wireSlot(el, 'hotbar', i);
      hb.appendChild(el);
    }

    const title = document.getElementById('inv-bag-title');
    if (title) {
      title.textContent = _bag.length
        ? `Sac · ${_bag.length} emplacements`
        : 'Sac · aucun sac équipé';
    }
    const grid = document.getElementById('inv-grid');
    grid.replaceChildren();
    if (!_bag.length) {
      const empty = document.createElement('p');
      empty.className = 'inv-bag-empty';
      empty.textContent = 'Équipez un sac pour stocker des objets.';
      grid.appendChild(empty);
    } else {
      for (let i = 0; i < _bag.length; i++) {
        const el = _makeSlotEl(_bag[i]);
        _wireSlot(el, 'bag', i);
        grid.appendChild(el);
      }
    }
    _updateInvSelection();
  }

  function _wireSlot(el, zone, idx) {
    const item = _getSlot(zone, idx);
    el.dataset.invZone = zone;
    el.dataset.invIdx = String(idx);
    if (item) el.title = _def(item.type)?.label || '';
    el.addEventListener('pointerdown', (e) => _onSlotPointerDown(e, zone, idx), { passive: false });
  }

  function _makeSlotEl(item) {
    const el = document.createElement('div');
    el.className = 'inv-slot' + (item ? ' inv-slot-filled' : '');
    if (item) {
      const def = _def(item.type);
      const ic = document.createElement('span');
      ic.className = 'inv-slot-icon';
      ic.textContent = def ? def.icon : '?';
      el.appendChild(ic);
      ZS.Icons?.apply(ic, item.type);
      if (item.qty > 1) {
        const q = document.createElement('span');
        q.className = 'inv-slot-qty';
        q.textContent = item.qty;
        el.appendChild(q);
      }
    }
    return el;
  }

  function togglePanel() {
    _panelOpen = !_panelOpen;
    const p = document.getElementById('inv-panel');
    if (!p) return;
    _sel = null;
    _endDrag();
    p.style.display = _panelOpen ? 'flex' : 'none';
    if (_invBackdrop) _invBackdrop.style.display = _panelOpen ? 'block' : 'none';
    if (_panelOpen) {
      _renderInvPanel();
      ZS.IntroLessons?.onBagOpen?.();
      ZS.onUiPanelOpen?.();
    } else {
      ZS.onUiPanelClose?.();
    }
  }

  // ── Bindings ───────────────────────────────────────────────────────────────

  function _bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (ZS.shortcutsBlocked?.(e) || ZS.Chat?.isOpen?.() || ZS.Rcon?.isOpen?.()) return;
      const digit = parseInt(e.key);
      if (digit >= 1 && digit <= 6) _setActiveSlot(digit - 1);
      if (e.code === 'KeyE') {
        if (ZS.AdminLiveDecor?.isActive?.()) return;
        if (e.repeat || ZS.isInteractHoldActive?.()) return;
        if (!grabNearest()) _useActiveItem();
      }
      if (e.code === 'KeyI') togglePanel();
      if (e.code === 'Tab' && document.body.classList.contains('mode-desktop')) {
        e.preventDefault();
        togglePanel();
      }
      if (e.code === 'PageUp'   && _isStructure(_hotbar[_active]?.type)) _changeLevel(1);
      if (e.code === 'PageDown' && _isStructure(_hotbar[_active]?.type)) _changeLevel(-1);
      if (e.code === 'Escape' && _panelOpen) togglePanel();
    });
  }

  function _bindHotbarTouch() {
    const bar = document.getElementById('hotbar');
    // pointerdown : sélection immédiate (souris ET tactile), non bloquée par le
    // flux d'événements du joystick → on peut sélectionner un slot en se déplaçant.
    let _lastTap = 0;
    bar.addEventListener('pointerdown', (e) => {
      const slotEl = e.target.closest('.hb-slot');
      if (!slotEl) return;
      e.preventDefault();
      const now = Date.now();
      if (now - _lastTap < 60) return;   // anti-rebond (pointer + éventuel doublon)
      _lastTap = now;
      const idx = parseInt(slotEl.dataset.slot);
      if (idx === _active) {
        const def = _hotbar[idx] ? _def(_hotbar[idx].type) : null;
        if (def && ['food','medical','ammo','equipment','structure'].includes(def.category)) _useActiveItem();
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

  function _setupGrabBtn() {
    const btn = document.getElementById('grab-btn');
    if (!btn) return;
    btn.addEventListener('click', grabNearest);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); grabNearest(); }, { passive: false });
  }

  // Contrôle d'étage de construction (▲ / ▼) — visible quand une structure est en main.
  function _setupBuildCtl() {
    const ctl = document.createElement('div');
    ctl.id = 'build-ctl';
    ctl.style.cssText = 'display:none;position:fixed;right:14px;bottom:300px;z-index:62;'
      + 'flex-direction:column;align-items:center;gap:4px;';
    const bs = 'width:46px;height:40px;border-radius:10px;background:rgba(212,184,96,0.92);'
      + 'border:2px solid #f0d878;color:#1a1206;font-size:18px;font-weight:800;cursor:pointer;'
      + 'pointer-events:auto;display:flex;align-items:center;justify-content:center;';
    const up = document.createElement('button'); up.textContent = '▲'; up.style.cssText = bs;
    const lvl = document.createElement('div');    lvl.id = 'build-lvl';
    lvl.style.cssText = 'background:rgba(0,0,0,0.65);color:#f0d878;padding:3px 8px;'
      + 'border-radius:6px;font-size:11px;font-weight:700;font-family:monospace;';
    lvl.textContent = 'Niv 0';
    const dn = document.createElement('button'); dn.textContent = '▼'; dn.style.cssText = bs;
    const wire = (el, d) => {
      el.addEventListener('click', () => _changeLevel(d));
      el.addEventListener('touchstart', (e) => { e.preventDefault(); _changeLevel(d); }, { passive: false });
    };
    wire(up, 1); wire(dn, -1);
    ctl.appendChild(up); ctl.appendChild(lvl); ctl.appendChild(dn);
    document.body.appendChild(ctl);
  }

  function _changeLevel(d) {
    _buildLevel = Math.max(0, Math.min(8, _buildLevel + d));
    const lvl = document.getElementById('build-lvl');
    if (lvl) lvl.textContent = 'Niv ' + _buildLevel;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _def(type) { return ZS.ITEMS?.[type] || null; }

  function _makePickupMesh(def, type, opts = {}) {
    const g = new THREE.Group();
    const introWake = !!opts.introWake && type === 'tool_caillou';
    const mobileBoost = introWake && !!ZS._isMobile ? 1.45 : 1;

    // Petit halo lumineux au sol pour repérer l'objet à récolter
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry((introWake ? 0.52 : 0.30) * mobileBoost, (introWake ? 0.52 : 0.30) * mobileBoost, 0.03, 16),
      new THREE.MeshLambertMaterial({
        color: introWake ? 0xffc860 : (def.color || 0xffffff),
        transparent: true,
        opacity: introWake ? 0.62 : 0.35,
      }),
    );
    ring.position.y = introWake ? -0.18 : -0.28;
    g.add(ring);
    if (introWake) {
      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68 * mobileBoost, 0.68 * mobileBoost, 0.02, 20),
        new THREE.MeshBasicMaterial({ color: 0xffe8a0, transparent: true, opacity: ZS._isMobile ? 0.72 : 0.55 }),
      );
      glow.position.y = -0.16;
      g.add(glow);
      g.userData.introGlow = glow;
      const beacon = new THREE.PointLight(0xffc870, ZS._isMobile ? 1.45 : 1.1, ZS._isMobile ? 9 : 7, 1.8);
      beacon.position.set(0, 0.22, 0);
      g.add(beacon);
      g.userData.introBeacon = beacon;
    }

    // Cube de remplacement instantané (le temps que le modèle 3D charge)
    const placeholder = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, 0.22),
      new THREE.MeshLambertMaterial({ color: def.color || 0xffffff })
    );
    g.add(placeholder);

    if (type === 'tool_torche') {
      g.remove(placeholder);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.065, 0.5, 6),
        new THREE.MeshLambertMaterial({ color: 0x6b4a20 }),
      );
      pole.position.y = 0.08;
      g.add(pole);
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 7, 6),
        new THREE.MeshBasicMaterial({ color: 0xff5a18 }),
      );
      flame.position.y = 0.38;
      g.add(flame);
      ring.material.color.setHex(0xff8800);
      ring.scale.set(1.35, 1, 1.35);
      return g;
    }
    // Modèle 3D réel (GLB ou procédural) — caillou posé au sol
    if (type === 'tool_caillou' && ZS.RockPrefab?.buildGroundRock) {
      g.remove(placeholder);
      const rock = new THREE.Group();
      ZS.RockPrefab.buildGroundRock(rock, { rockSeed: introWake ? 90210 : 90211, scale: introWake ? 1.22 : 1 });
      if (introWake) rock.scale.setScalar(1.18);
      g.add(rock);
      return g;
    }
    if (ZS.getItemModel) {
      ZS.getItemModel(type).then((obj) => {
        g.remove(placeholder);
        if (type === DOOR_KEY_TYPE) {
          const wrap = new THREE.Group();
          wrap.add(obj);
          wrap.rotation.x = -Math.PI / 2;
          wrap.rotation.z = Math.random() * Math.PI * 2;
          wrap.updateWorldMatrix(true, true);
          const box = new THREE.Box3().setFromObject(wrap);
          if (isFinite(box.min.y)) wrap.position.y = -box.min.y - 0.28;
          g.add(wrap);
        } else {
          g.add(obj);
        }
      }).catch(() => { /* on conserve le cube de remplacement */ });
    }
    return g;
  }
