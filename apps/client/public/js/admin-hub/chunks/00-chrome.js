// État + permissions + navigation — admin-hub.js
const VIEWS = {

    root: { title: '🛠️ CMS Admin', sub: 'F8 fermer · Hub live multijoueur' },

    world: { title: '🌍 Monde & décor', sub: 'Édition live des prefabs (E)' },

    players: { title: '👥 Joueurs', sub: 'En ligne · actions rapides · rôles' },

    calibration: { title: '🎯 Calibrages UI', sub: 'Bras FPS, torche, viewmodels, animations' },

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

    ZS.AdminLiveDecor?.exit?.();

    ZS.Calibration?.closeActive?.();

    _leaveView();

    if (!_open) return;

    _open = false;

    _view = 'root';

    _setVisible(false);

    ZS.onUiPanelClose?.();

  }



  function toggle() {

    if (ZS.AdminLiveDecor?.isActive?.()) {

      ZS.AdminLiveDecor.exit();

      return;

    }

    if (ZS.Calibration?.anyOpen?.()) {

      ZS.Calibration.closeActive();

      return;

    }

    if (_open) close();

    else open('root');

  }



  function isOpen() { return _open; }
