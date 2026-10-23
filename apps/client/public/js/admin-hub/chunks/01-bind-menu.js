// Events chrome + menu racine — admin-hub.js
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

      _showView(v);

    });



    _els.world?.addEventListener('click', (e) => {

      const btn = e.target?.closest?.('[data-world-act]');

      if (!btn) return;

      if (btn.dataset.worldAct === 'decor-live') {

        close();

        ZS.AdminLiveDecor?.enter?.();

      }

      if (btn.dataset.worldAct === 'go-here') {

        close();

        ZS.requestPointerLock?.();

        ZS.AdminGoHere?.teleportToReticle?.();

      }

      if (btn.dataset.worldAct === 'world-map') {

        close();

        ZS.AdminWorldMapOverlay?.open?.();

      }

      if (btn.dataset.worldAct === 'zone-overlay') {

        close();

        ZS.AdminZoneOverlay?.toggle?.();

        ZS.requestPointerLock?.();

      }

      if (btn.dataset.worldAct === 'fly-mode') {

        close();

        ZS.AdminFly?.toggle?.();

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

        '    <span class="admin-hub-card-title">Calibrages UI</span>',

        '    <span class="admin-hub-card-desc">Bras FPS, torche, caillou, viewmodels, bras distant…</span>',

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
