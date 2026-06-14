// Boutons mobile + init
function init(state) {
    _state = state;
    ZS.applyDeviceBodyClasses?.();
    _initTouchControls();
    _ensureCrouchButton();
    _setupShootButton();
    _setupReloadButton();
    _setupJumpButton();
    _setupRespawn();
    setHealth(100);
    setPlayerKills(0);
    setAmmo(30);
    setEndurance(100);
  }

  function _initTouchControls() {
    if (!_state && !_wantsTouchControls()) return;
    ZS.applyDeviceBodyClasses?.();
    if (!_wantsTouchControls()) return;
    document.body.classList.add('input-touch');
    document.body.classList.remove('input-desktop');
    if (!_state) return;
    _setupGlobalTouchInput();
    _touchControlsReady = true;
  }

  // ── Shoot button ─────────────────────────────────────────────────────────

  function _setupShootButton() {
    const btn = document.getElementById('shoot-btn');
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (_state.onShoot) _state.onShoot();
    }, { passive: false });
    btn.addEventListener('click', () => {
      if (_state.onShoot) _state.onShoot();
    });
  }

  function _setupReloadButton() {
    const btn = document.getElementById('reload-btn');
    if (!btn) return;
    const fire = (e) => { if (e) e.preventDefault(); if (_state.onReload) _state.onReload(); };
    btn.addEventListener('touchstart', fire, { passive: false });
    btn.addEventListener('click', () => fire());
  }

  // Met à jour l'icône du bouton d'attaque + visibilité du bouton recharger.
  function setWeaponUI(type) {
    const shoot  = document.getElementById('shoot-btn');
    const reload = document.getElementById('reload-btn');
    const cat = type ? ZS.ITEMS?.[type]?.category : null;
    let icon = '👊';
    if (cat === 'firearm') icon = '🔫';
    else if (type === 'tool_caillou') icon = '🪨';
    else if (type === 'wpn_hache_combat' || type === 'tool_hachette') icon = '🪓';
    else if (cat === 'melee') icon = '🗡️';
    else if (cat === 'tool') icon = '🛠️';
    if (shoot) shoot.textContent = icon;
    if (reload) reload.classList.toggle('show-reload', cat === 'firearm');
  }

  // ── Jump button ──────────────────────────────────────────────────────────

  function _setupJumpButton() {
    const btn = document.getElementById('jump-btn');
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (_state.onJump) _state.onJump();
    }, { passive: false });
    btn.addEventListener('click', () => {
      if (_state.onJump) _state.onJump();
    });
  }

  // ── Respawn ───────────────────────────────────────────────────────────────

  function _setupRespawn() {
    const btn = document.getElementById('respawn-btn');
    const fire = (e) => {
      if (e) e.preventDefault();
      if (_state?.onRespawn) _state.onRespawn();
    };
    btn.addEventListener('click', fire);
    btn.addEventListener('touchstart', fire, { passive: false });
  }

  // ── HUD updates ───────────────────────────────────────────────────────────

  let _maxHp = 100;
