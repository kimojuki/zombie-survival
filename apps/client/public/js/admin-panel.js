// Panneau outils admin in-game (menu hamburger → réglages de test).
(function () {
  'use strict';

  const LS_INTRO_RESET = 'zs_admin_intro_reset_on_respawn';

  let _open = false;
  let _built = false;
  let _socket = null;
  let _isAdmin = false;
  let _introReset = false;
  let _els = {};

  function _q(id) { return document.getElementById(id); }

  function _clientIsAdmin() {
    if (ZS.AdminAuth?.hasPerm?.('scenario')) return true;
    if (_isAdmin) return true;
    return localStorage.getItem('zombie_is_admin') === '1';
  }

  function _readIntroReset() {
    return localStorage.getItem(LS_INTRO_RESET) === '1';
  }

  function _makeToggle(checked, onChange) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'opt-toggle' + (checked ? ' is-on' : '');
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', checked ? 'true' : 'false');
    btn.innerHTML = '<span class="opt-toggle-track"><span class="opt-toggle-thumb"></span></span>';
    btn.addEventListener('click', () => {
      const next = !btn.classList.contains('is-on');
      btn.classList.toggle('is-on', next);
      btn.setAttribute('aria-checked', next ? 'true' : 'false');
      onChange(next);
    });
    return btn;
  }

  function _makeRow(label, controlEl, hint) {
    const row = document.createElement('div');
    row.className = 'opt-row';
    const lab = document.createElement('label');
    lab.className = 'opt-label';
    lab.textContent = label;
    const ctrlWrap = document.createElement('div');
    ctrlWrap.className = 'opt-row-ctrl';
    ctrlWrap.appendChild(controlEl);
    row.appendChild(lab);
    row.appendChild(ctrlWrap);
    if (hint) {
      const h = document.createElement('p');
      h.className = 'opt-hint';
      h.textContent = hint;
      row.appendChild(h);
    }
    return row;
  }

  function _sectionTitle(text, icon) {
    const h = document.createElement('h3');
    h.className = 'zs-section-title inv-section-title';
    if (icon) {
      const sp = document.createElement('span');
      sp.className = 'opt-sec-icon';
      sp.textContent = icon;
      h.appendChild(sp);
    }
    h.appendChild(document.createTextNode(icon ? ` ${text}` : text));
    return h;
  }

  function _syncIntroToggleUi() {
    const btn = _q('admin-opt-intro-reset');
    if (!btn) return;
    btn.classList.toggle('is-on', _introReset);
    btn.setAttribute('aria-checked', _introReset ? 'true' : 'false');
  }

  function _syncIntroServer() {
    if (!_socket || !_clientIsAdmin()) return;
    _socket.emit('admin-intro-reset-toggle', { enabled: _introReset }, (res) => {
      if (!res?.ok) {
        ZS.UI?.showNotif?.('Réglage intro : refus serveur');
        return;
      }
      if (typeof res.enabled === 'boolean') {
        _introReset = res.enabled;
        localStorage.setItem(LS_INTRO_RESET, _introReset ? '1' : '0');
        _syncIntroToggleUi();
      }
    });
  }

  function _setIntroReset(enabled) {
    _introReset = !!enabled;
    localStorage.setItem(LS_INTRO_RESET, _introReset ? '1' : '0');
    _syncIntroToggleUi();
    _syncIntroServer();
  }

  function _showIntroWarn(show) {
    const box = _q('admin-intro-warn');
    if (box) box.style.display = show ? 'flex' : 'none';
  }

  function _confirmIntroResetNow() {
    if (!_socket) return;
    _showIntroWarn(false);
    close();
    _socket.emit('admin-intro-reset-now', {}, (res) => {
      if (!res?.ok) {
        ZS.UI?.showNotif?.(res?.error || 'Reset intro : refus serveur');
        return;
      }
      _introReset = true;
      localStorage.setItem(LS_INTRO_RESET, '1');
      _syncIntroToggleUi();
    });
  }

  function _buildBody() {
    if (_built) return;
    const body = _els.body;
    if (!body) return;
    body.innerHTML = '';

    body.appendChild(_sectionTitle('Scénario', '🎬'));

    const introToggle = _makeToggle(_introReset, (on) => {
      _setIntroReset(on);
    });
    introToggle.id = 'admin-opt-intro-reset';
    body.appendChild(_makeRow(
      'Reset intro à chaque respawn',
      introToggle,
      'Rejoue l\'intro plage depuis le réveil à chaque mort. Utile pour tester le parcours tutoriel.',
    ));

    const resetNowBtn = document.createElement('button');
    resetNowBtn.type = 'button';
    resetNowBtn.className = 'opt-btn opt-btn-secondary';
    resetNowBtn.textContent = 'Réinitialiser l\'intro maintenant';
    resetNowBtn.addEventListener('click', () => _showIntroWarn(true));
    body.appendChild(_makeRow(
      'Test immédiat',
      resetNowBtn,
      'Vous mourrez sur place, puis respawn à la plage — même flux qu\'une vraie mort.',
    ));

    _built = true;
  }

  function _setVisible(visible) {
    if (_els.backdrop) {
      _els.backdrop.style.display = visible ? 'flex' : 'none';
      _els.backdrop.classList.toggle('is-open', visible);
    }
    if (_els.panel) {
      _els.panel.style.display = visible ? 'flex' : 'none';
      _els.panel.classList.toggle('is-open', visible);
    }
  }

  function refreshMenu() {
    const btn = _q('menu-admin');
    if (!btn) return;
    btn.classList.toggle('menu-admin-hidden', !_clientIsAdmin());
  }

  function buildScenario() {
    if (!_els.body) {
      _els.body = _q('admin-panel-body');
    }
    _introReset = _readIntroReset();
    _buildBody();
    _syncIntroToggleUi();
    _showIntroWarn(false);
  }

  function open() {
    if (!_clientIsAdmin()) return;
    if (ZS.AdminHub?.open) {
      ZS.AdminHub.open('scenario');
      return;
    }
    if (_open) return;
    if (!_els.backdrop) init();
    buildScenario();
    _open = true;
    _setVisible(true);
    ZS.onUiPanelOpen?.();
  }

  function close() {
    ZS.AdminLiveDecor?.exit?.();
    ZS.Calibration?.closeActive?.();
    if (ZS.AdminHub?.isOpen?.()) {
      ZS.AdminHub.close();
      return;
    }
    if (!_open) return;
    _open = false;
    _showIntroWarn(false);
    _setVisible(false);
    ZS.onUiPanelClose?.();
  }

  function toggle() {
    _open ? close() : open();
  }

  function isOpen() { return _open; }

  function _bindChrome() {
    if (_els.backdrop?.dataset.bound === '1') return;
    if (_els.backdrop) _els.backdrop.dataset.bound = '1';
    _q('admin-close-btn')?.addEventListener('click', close);
    _els.backdrop?.addEventListener('click', (e) => {
      if (e.target === _els.backdrop) close();
    });
    _q('admin-intro-warn-cancel')?.addEventListener('click', () => _showIntroWarn(false));
    _q('admin-intro-warn-confirm')?.addEventListener('click', _confirmIntroResetNow);
    document.addEventListener('keydown', (e) => {
      if (!_open) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (_q('admin-intro-warn')?.style.display === 'flex') {
          _showIntroWarn(false);
          return;
        }
        close();
      }
    });
  }

  function _bindMenu() {
    const menuBtn = _q('menu-admin');
    if (!menuBtn || menuBtn._boundAdminPanel) return;
    menuBtn._boundAdminPanel = true;
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mp = _q('menu-panel');
      if (mp) mp.style.display = 'none';
      if (ZS.AdminHub?.open) ZS.AdminHub.open('root');
      else open();
    });
  }

  function init(socket, gameInit) {
    _socket = socket || _socket;
    _isAdmin = !!(gameInit?.isAdmin || gameInit?.rconPreAuth);
    if (localStorage.getItem('zombie_is_admin') === '1') _isAdmin = true;
    _introReset = _readIntroReset();

    _els.backdrop = _q('admin-backdrop');
    _els.panel = _q('admin-panel');
    _els.body = _q('admin-panel-body');
    _bindChrome();
    _bindMenu();
    refreshMenu();

    if (_introReset) _syncIntroServer();
  }

  window.ZS = window.ZS || {};
  ZS.AdminPanel = {
    init,
    open,
    close,
    toggle,
    isOpen: () => _open || !!ZS.AdminHub?.isOpen?.(),
    buildScenario,
    refreshMenu,
    isIntroResetEnabled: () => _introReset,
  };
}());
