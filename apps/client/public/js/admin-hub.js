// Menu admin in-game — F8. Hub CMS : monde, joueurs, calibrages, scénario, RCON.

(function () {

  'use strict';



  const VIEWS = {

    root: { title: '🛠️ CMS Admin', sub: 'F8 fermer · Hub live multijoueur' },

    world: { title: '🌍 Monde & décor', sub: 'Édition live des prefabs (E)' },

    players: { title: '👥 Joueurs', sub: 'En ligne · actions rapides · rôles' },

    calibration: { title: '🎯 Calibrages', sub: 'Poses FPS, viewmodels, animations' },

    scenario: { title: '🎬 Scénario & tests', sub: 'Intro plage, reset respawn' },

    roles: { title: '🔐 Rôles & permissions', sub: 'Attribuer les droits CMS' },

  };



  let _open = false;

  let _view = 'root';

  let _els = {};

  let _keyHandler = null;



  function _q(id) { return document.getElementById(id); }



  function _hasPerm(perm) {

    if (ZS.AdminAuth?.hasPerm?.(perm)) return true;

    if (perm === 'hub.access' && localStorage.getItem('zombie_is_admin') === '1') return true;

    return false;

  }



  function _isAdmin() {

    return _hasPerm('hub.access');

  }



  function _setVisible(visible) {

    if (_els.backdrop) {

      _els.backdrop.style.display = visible ? 'flex' : 'none';

      _els.backdrop.classList.toggle('is-open', visible);

    }

    if (_els.panel) {

      _els.panel.style.display = visible ? 'flex' : 'none';

      _els.panel.classList.toggle('is-open', visible);

      _els.panel.classList.toggle('admin-hub-panel--wide', visible && _view === 'players');

    }

  }



  function _updateHeader() {

    const meta = VIEWS[_view] || VIEWS.root;

    if (_els.title) _els.title.textContent = meta.title;

    if (_els.sub) _els.sub.textContent = _view === 'root' ? 'F8 pour fermer · Échap pour fermer' : 'Échap retour';

    if (_els.backBtn) _els.backBtn.style.display = _view === 'root' ? 'none' : 'inline-flex';

  }



  function _leaveView() {

    if (_view === 'players') ZS.AdminPlayers?.stop?.();

    if (_view === 'roles') ZS.AdminRoles?.stop?.();

  }



  function _showView(name) {

    _leaveView();

    _view = VIEWS[name] ? name : 'root';

    _updateHeader();

    const views = [_els.root, _els.world, _els.players, _els.roles, _els.calibration, _els.scenario];

    for (const v of views) {

      if (v) v.style.display = 'none';

    }

    if (_view === 'root' && _els.root) _els.root.style.display = 'block';

    if (_view === 'world' && _els.world) _els.world.style.display = 'block';

    if (_els.panel) {

      _els.panel.classList.toggle('admin-hub-panel--wide', _view === 'players');

    }

    if (_view === 'players' && _els.players) {

      _els.players.style.display = 'block';

      ZS.AdminPlayers?.build?.(_els.players);

    }

    if (_view === 'roles' && _els.roles) {

      _els.roles.style.display = 'block';

      ZS.AdminRoles?.build?.(_els.roles);

    }

    if (_view === 'calibration' && _els.calibration) {

      _els.calibration.style.display = 'block';

      ZS.Calibration?.renderList?.(_els.calibration, {

        onBeforeOpen: () => close(),

      });

    }

    if (_view === 'scenario' && _els.scenario) {

      _els.scenario.style.display = 'block';

      ZS.AdminPanel?.buildScenario?.();

    }

  }



  function open(view) {

    if (!_isAdmin()) {

      ZS.UI?.showNotif?.('Menu admin : permission hub.access requise');

      return;

    }

    if (_open && view) {

      _showView(view);

      return;

    }

    if (_open) return;

    _open = true;

    _showView(view || 'root');

    _setVisible(true);

    ZS.onUiPanelOpen?.();

  }



  function close() {

    ZS.Calibration?.closeActive?.();

    _leaveView();

    if (!_open) return;

    _open = false;

    _view = 'root';

    _setVisible(false);

    ZS.onUiPanelClose?.();

  }



  function toggle() {

    if (ZS.Calibration?.anyOpen?.()) {

      ZS.Calibration.closeActive();

      return;

    }

    if (_open) close();

    else open('root');

  }



  function isOpen() { return _open; }



  function _bindChrome() {

    if (_els.backdrop?.dataset.hubBound === '1') return;

    if (_els.backdrop) _els.backdrop.dataset.hubBound = '1';



    _els.backBtn = _q('admin-hub-back-btn');

    _els.backBtn?.addEventListener('click', () => _showView('root'));



    _q('admin-close-btn')?.addEventListener('click', close);

    _els.backdrop?.addEventListener('click', (e) => {

      if (e.target === _els.backdrop) close();

    });



    _els.root?.addEventListener('click', (e) => {

      const nav = e.target?.closest?.('[data-hub-nav]');

      if (!nav) return;

      const v = nav.dataset.hubNav;

      if (v === 'rcon') {

        close();

        if (_hasPerm('rcon')) ZS.Rcon.open();

        else ZS.UI?.showNotif?.('RCON : permission rcon requise');

        return;

      }

      const permMap = {

        world: 'decor.edit',

        players: 'players.view',

        roles: 'players.roles',

        calibration: 'calibration',

        scenario: 'scenario',

      };

      if (permMap[v] && !_hasPerm(permMap[v])) {

        ZS.UI?.showNotif?.('Permission insuffisante');

        return;

      }

      if (v === 'world_live') {

        if (!_hasPerm('decor.edit')) {

          ZS.UI?.showNotif?.('Permission decor.edit requise');

          return;

        }

        close();

        ZS.Calibration?.openTool?.('world_decor_live');

        return;

      }

      _showView(v);

    });



    _els.world?.addEventListener('click', (e) => {

      const btn = e.target?.closest?.('[data-world-act]');

      if (!btn) return;

      if (btn.dataset.worldAct === 'decor-live') {

        close();

        ZS.Calibration?.openTool?.('world_decor_live');

      }

    });



    document.addEventListener('keydown', (e) => {

      if (!_open) return;

      if (e.code === 'Escape') {

        e.preventDefault();

        e.stopPropagation();

        if (_q('admin-intro-warn')?.style.display === 'flex') return;

        if (_view === 'root') close();

        else _showView('root');

      }

    });

  }



  function _bindF8() {

    if (_keyHandler) document.removeEventListener('keydown', _keyHandler, true);

    _keyHandler = (e) => {

      if (e.code !== 'F8' || e.shiftKey) return;

      if (ZS.shortcutsBlocked?.(e) && !ZS.Calibration?.anyOpen?.() && !_open) return;

      e.preventDefault();

      e.stopPropagation();

      toggle();

    };

    document.addEventListener('keydown', _keyHandler, true);

  }



  function rebuildMenu() {

    if (_els.root) delete _els.root.dataset.built;

    _buildRootMenu();

  }



  function _buildRootMenu() {

    if (!_els.root || _els.root.dataset.built === '1') return;

    _els.root.dataset.built = '1';

    const role = ZS.AdminAuth?.getRole?.() || {};

    const online = document.getElementById('online-count')?.textContent?.trim() || '';

    const roleBadge = role.label

      ? `<div class="admin-hub-topline">
          <span class="admin-role-badge" style="--role-color:${role.color || '#8a94a4'}">${role.label}</span>
          ${online ? `<span class="admin-hub-online-pill">${online} en ligne</span>` : ''}
        </div>`

      : (online ? `<div class="admin-hub-topline"><span class="admin-hub-online-pill">${online} en ligne</span></div>` : '');

    const cards = [];

    if (_hasPerm('decor.edit')) {

      cards.push(

        '  <button type="button" class="admin-hub-card" data-hub-nav="world">',

        '    <span class="admin-hub-card-icon">🌍</span>',

        '    <span class="admin-hub-card-title">Monde & décor</span>',

        '    <span class="admin-hub-card-desc">Édition prefabs, placement live (E), sync tous clients.</span>',

        '  </button>',

      );

    }

    if (_hasPerm('players.view')) {

      cards.push(

        '  <button type="button" class="admin-hub-card" data-hub-nav="players">',

        '    <span class="admin-hub-card-icon">👥</span>',

        '    <span class="admin-hub-card-title">Joueurs</span>',

        '    <span class="admin-hub-card-desc">Cartes live, recherche, TP/soin/kick en 1 clic.</span>',

        '  </button>',

      );

    }

    const contentCards = [];

    if (_hasPerm('calibration')) {

      contentCards.push(

        '  <button type="button" class="admin-hub-card" data-hub-nav="calibration">',

        '    <span class="admin-hub-card-icon">🎯</span>',

        '    <span class="admin-hub-card-title">Calibrages</span>',

        '    <span class="admin-hub-card-desc">Bras FPS, torche, caillou, outils, bras distant…</span>',

        '  </button>',

      );

    }

    if (_hasPerm('scenario')) {

      contentCards.push(

        '  <button type="button" class="admin-hub-card" data-hub-nav="scenario">',

        '    <span class="admin-hub-card-icon">🎬</span>',

        '    <span class="admin-hub-card-title">Scénario & tests</span>',

        '    <span class="admin-hub-card-desc">Intro plage, reset respawn, parcours tutoriel.</span>',

        '  </button>',

      );

    }

    if (_hasPerm('decor.edit')) {

      contentCards.push(

        '  <button type="button" class="admin-hub-card admin-hub-card-accent" data-hub-nav="world_live">',

        '    <span class="admin-hub-card-icon">✏️</span>',

        '    <span class="admin-hub-card-title">Édition monde (E)</span>',

        '    <span class="admin-hub-card-desc">Raccourci direct — visez un décor et éditez.</span>',

        '  </button>',

      );

    }

    const sysCards = [];

    if (_hasPerm('rcon')) {

      sysCards.push(

        '  <button type="button" class="admin-hub-card" data-hub-nav="rcon" id="admin-hub-rcon-card">',

        '    <span class="admin-hub-card-icon">⌨️</span>',

        '    <span class="admin-hub-card-title">Console RCON</span>',

        '    <span class="admin-hub-card-desc">Commandes serveur, météo, debug live.</span>',

        '  </button>',

      );

    }

    _els.root.innerHTML = [

      roleBadge,

      cards.length ? '<p class="admin-hub-section">Live — monde & joueurs</p><div class="admin-hub-card-grid">' + cards.join('') + '</div>' : '',

      contentCards.length ? '<p class="admin-hub-section">Contenu & gameplay</p><div class="admin-hub-card-grid">' + contentCards.join('') + '</div>' : '',

      sysCards.length ? '<p class="admin-hub-section">Système</p><div class="admin-hub-card-grid admin-hub-card-grid-1">' + sysCards.join('') + '</div>' : '',

      '<p class="admin-hub-foot">CMS jeu — rôles granulaires · propriétaires via OWNER_USERS / ADMIN_USERS (.env).</p>',

    ].join('');



  }



  function _buildWorldView() {

    if (!_els.world || _els.world.dataset.built === '1') return;

    _els.world.dataset.built = '1';

    _els.world.innerHTML = [

      '<p class="admin-hub-empty">Outils de modification du monde en multijoueur.</p>',

      '<div class="admin-hub-card-grid">',

      '  <button type="button" class="admin-hub-card admin-hub-card-accent" data-world-act="decor-live">',

      '    <span class="admin-hub-card-icon">🏗️</span>',

      '    <span class="admin-hub-card-title">Édition décor live</span>',

      '    <span class="admin-hub-card-desc">E pour cibler · panneau latéral · sync serveur.</span>',

      '  </button>',

      '  <a class="admin-hub-card is-disabled" href="/prefab-catalog.html" target="_blank" rel="noopener">',

      '    <span class="admin-hub-card-icon">📦</span>',

      '    <span class="admin-hub-card-title">Catalogue prefabs</span>',

      '    <span class="admin-hub-card-desc">Carte admin navigateur (nouvel onglet).</span>',

      '  </a>',

      '</div>',

      '<p class="admin-pl-foot">Bientôt : POI, spawns, zones safe, loot tables…</p>',

    ].join('');

  }



  function init() {

    _els.backdrop = _q('admin-backdrop');

    _els.panel = _q('admin-panel');

    _els.title = _q('admin-hub-title');

    _els.sub = _q('admin-hub-sub');

    _els.root = _q('admin-hub-root');

    _els.world = _q('admin-hub-world');

    _els.players = _q('admin-hub-players');

    _els.roles = _q('admin-hub-roles');

    _els.calibration = _q('admin-hub-calibration');

    _els.scenario = _q('admin-panel-body');

    _buildRootMenu();

    _buildWorldView();

    _bindChrome();

    _bindF8();



    try {

      const params = new URLSearchParams(location.search);

      if (params.get('armTuner') === '1' || params.get('adminCal')) {

        const cal = params.get('adminCal') || 'fps_arm_tuner';

        setTimeout(() => {

          if (!_isAdmin()) return;

          if (params.get('armTuner') === '1') open('calibration');

          else {

            close();

            ZS.Calibration?.openTool?.(cal);

          }

        }, 800);

      }

    } catch (_) { /* ignore */ }

  }



  window.ZS = window.ZS || {};

  ZS.AdminHub = { init, open, close, toggle, isOpen, showView: _showView, isAdmin: _isAdmin, hasPerm: _hasPerm, rebuildMenu };

}());


