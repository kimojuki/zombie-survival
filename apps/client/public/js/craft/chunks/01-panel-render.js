// Panel UI + render
function _buildQueueHud() {
    _queueHud = document.createElement('div');
    _queueHud.id = 'craft-queue-hud';
    _queueHud.hidden = true;
    const hud = document.getElementById('hud');
    (hud || document.body).appendChild(_queueHud);
  }

  function _buildPanel() {
    _backdrop = document.createElement('div');
    _backdrop.id = 'craft-backdrop';
    _backdrop.className = 'zs-backdrop';
    _backdrop.addEventListener('click', toggle);
    document.body.appendChild(_backdrop);

    _panel = document.createElement('div');
    _panel.id = 'craft-panel';
    _panel.className = 'zs-panel zs-panel-wide';

    const hdr = ZS.PanelUI.makeHeader({
      title: '⚒ Artisanat',
      subtitle: 'Q · Échap pour fermer',
      onClose: toggle,
    });
    _panel.appendChild(hdr.el);

    _queuePanel = document.createElement('div');
    _queuePanel.id = 'craft-queue-panel';
    _queuePanel.className = 'craft-queue-panel';
    _queuePanel.hidden = true;
    const qHead = document.createElement('div');
    qHead.className = 'craft-queue-panel-head';
    qHead.textContent = 'File de fabrication';
    _queuePanel.appendChild(qHead);
    _queueList = document.createElement('ul');
    _queueList.id = 'craft-queue-list';
    _queueList.className = 'craft-queue-list';
    _queuePanel.appendChild(_queueList);
    _panel.appendChild(_queuePanel);

    const mobileList = document.createElement('div');
    mobileList.id = 'craft-list';
    mobileList.className = 'craft-list-mobile';
    _panel.appendChild(mobileList);

    const desktop = document.createElement('div');
    desktop.className = 'craft-desktop-shell craft-desktop-only';

    _tabsNav = document.createElement('nav');
    _tabsNav.id = 'craft-tabs';
    _tabsNav.className = 'craft-tabs';
    _tabsNav.setAttribute('role', 'tablist');
    for (const sec of CRAFT_SECTIONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'craft-tab';
      btn.dataset.tab = sec.id;
      btn.setAttribute('role', 'tab');
      btn.innerHTML = `<span class="craft-tab-icon">${sec.icon}</span>`
        + `<span class="craft-tab-label">${sec.label}</span>`
        + `<span class="craft-tab-badge" hidden>0</span>`;
      btn.addEventListener('click', () => {
        _activeTab = sec.id;
        _renderDesktop();
      });
      _tabsNav.appendChild(btn);
    }
    desktop.appendChild(_tabsNav);

    const body = document.createElement('div');
    body.className = 'craft-tab-body';

    const head = document.createElement('div');
    head.className = 'craft-tab-head';
    _tabTitle = document.createElement('h2');
    _tabTitle.className = 'craft-tab-title';
    _tabHint = document.createElement('p');
    _tabHint.className = 'craft-tab-hint';
    head.appendChild(_tabTitle);
    head.appendChild(_tabHint);
    body.appendChild(head);

    _recipeGrid = document.createElement('div');
    _recipeGrid.id = 'craft-recipe-grid';
    _recipeGrid.className = 'craft-recipe-grid';
    body.appendChild(_recipeGrid);
    desktop.appendChild(body);
    _panel.appendChild(desktop);

    document.body.appendChild(_panel);
  }

  function _render() {
    if (_isDesktop()) _renderDesktop();
    else _renderMobile();
  }

  function _renderMobile() {
    const list = document.getElementById('craft-list');
    if (!list) return;
    list.replaceChildren();
    for (const rec of RECIPES) {
      const def = ZS.ITEMS[rec.result];
      if (!def) continue;
      list.appendChild(_makeMobileRow(rec, def));
    }
  }

  function _makeActionBtn(rec) {
    const check = _canEnqueue(rec);
    const hasRes = _hasResources(rec);
    const btn = document.createElement('button');
    btn.type = 'button';
    const dur = _fmtSec(_craftDuration(rec));
    if (check.ok) {
      btn.textContent = 'File · ' + dur;
      btn.className = 'craft-enqueue-btn';
      btn.addEventListener('click', () => { _enqueue(rec); });
    } else if (!hasRes) {
      btn.textContent = 'Manque ressources';
      btn.disabled = true;
      btn.className = 'craft-enqueue-btn craft-enqueue-disabled';
    } else {
      btn.textContent = 'Inventaire plein';
      btn.disabled = true;
      btn.className = 'craft-enqueue-btn craft-enqueue-disabled';
      btn.title = check.reason;
    }
    return btn;
  }

  function _makeMobileRow(rec, def) {
    const check = _canEnqueue(rec);
    const hasRes = _hasResources(rec);
    const row = document.createElement('div');
    row.className = 'craft-mobile-row'
      + (check.ok ? ' craft-mobile-row-ready'
        : (hasRes ? ' craft-mobile-row-partial' : ' craft-mobile-row-locked'));

    const info = document.createElement('div');
    info.className = 'craft-mobile-row-info';
    const title = document.createElement('div');
    title.className = 'craft-mobile-row-title';
    title.textContent = `${def.icon} ${def.label}`;
    const ings = document.createElement('div');
    ings.className = 'craft-mobile-row-ings';
    ings.innerHTML = _ingHtml(rec);
    const time = document.createElement('div');
    time.className = 'craft-mobile-row-time';
    time.textContent = `⏱ ${_fmtSec(_craftDuration(rec))}`;
    info.appendChild(title);
    info.appendChild(ings);
    info.appendChild(time);
    row.appendChild(info);
    row.appendChild(_makeActionBtn(rec));
    return row;
  }

  function _renderDesktop() {
    if (!_tabsNav || !_recipeGrid) return;

    for (const sec of CRAFT_SECTIONS) {
      const recipes = _recipesForSection(sec.id);
      const craftable = recipes.filter((r) => _canEnqueue(r).ok).length;
      const tabBtn = _tabsNav.querySelector(`[data-tab="${sec.id}"]`);
      if (!tabBtn) continue;
      tabBtn.classList.toggle('active', sec.id === _activeTab);
      tabBtn.setAttribute('aria-selected', sec.id === _activeTab ? 'true' : 'false');
      const badge = tabBtn.querySelector('.craft-tab-badge');
      if (badge) {
        if (craftable > 0) {
          badge.hidden = false;
          badge.textContent = String(craftable);
        } else {
          badge.hidden = true;
        }
      }
    }

    const section = CRAFT_SECTIONS.find((s) => s.id === _activeTab) || CRAFT_SECTIONS[0];
    if (_tabTitle) _tabTitle.textContent = `${section.icon} ${section.label}`;
    if (_tabHint) {
      _tabHint.textContent = section.hint + ' — ressources consommées à l\'ajout en file.';
    }

    _recipeGrid.replaceChildren();
    const recipes = _recipesForSection(section.id);
    if (!recipes.length) {
      const empty = document.createElement('p');
      empty.className = 'craft-empty';
      empty.textContent = 'Aucune recette dans cette section.';
      _recipeGrid.appendChild(empty);
      return;
    }

    for (const rec of recipes) {
      const def = ZS.ITEMS[rec.result];
      if (!def) continue;
      _recipeGrid.appendChild(_makeDesktopCard(rec, def));
    }
  }

  function _makeDesktopCard(rec, def) {
    const check = _canEnqueue(rec);
    const hasRes = _hasResources(rec);
    const card = document.createElement('article');
    card.className = 'craft-card'
      + (check.ok ? ' craft-card-ready' : (hasRes ? ' craft-card-nospace' : ' craft-card-locked'));

    const top = document.createElement('div');
    top.className = 'craft-card-top';
    const icon = document.createElement('span');
    icon.className = 'craft-card-icon';
    icon.textContent = def.icon || '📦';
    const name = document.createElement('h3');
    name.className = 'craft-card-name';
    name.textContent = def.label;
    if (rec.qty > 1) {
      const qty = document.createElement('span');
      qty.className = 'craft-card-qty';
      qty.textContent = `×${rec.qty}`;
      name.appendChild(qty);
    }
    top.appendChild(icon);
    top.appendChild(name);
    card.appendChild(top);

    const time = document.createElement('div');
    time.className = 'craft-card-time';
    time.textContent = '⏱ ' + _fmtSec(_craftDuration(rec));
    card.appendChild(time);

    const ings = document.createElement('ul');
    ings.className = 'craft-card-ings';
    for (const [id, need] of Object.entries(rec.ingredients)) {
      const have = ZS.Inventory.countItem(id);
      const lbl = ZS.ITEMS[id]?.label || id;
      const li = document.createElement('li');
      li.className = have >= need ? 'ok' : 'missing';
      li.textContent = `${lbl} — ${have}/${need}`;
      ings.appendChild(li);
    }
    card.appendChild(ings);

    const btnWrap = document.createElement('div');
    btnWrap.className = 'craft-card-actions';
    btnWrap.appendChild(_makeActionBtn(rec));
    card.appendChild(btnWrap);
    return card;
  }
