// Mobile controls (nipplejs), HUD updates, death/respawn screen
(function () {
  'use strict';

  let _state;
  let _touchControlsReady = false;
  let _joyBase = null;
  let _joyThumb = null;
  let _movePtr = null;
  let _lookPtr = null;
  let _moveOriginX = 0;
  let _moveOriginY = 0;
  let _lookLastX = 0;
  let _lookLastY = 0;
  const _MOVE_MAX = 60;
  const _LOOK_SENS = 0.004;
  const _MOVE_FRAC = 0.44;

  function _wantsTouchControls() {
    return !!(ZS.needsTouchControls?.()
      || ZS.detectTouchInput?.()
      || (navigator.maxTouchPoints || 0) > 0
      || 'ontouchstart' in window);
  }

  function _isPanelTarget(el) {
    return !!el?.closest?.(
      'button,input,textarea,select,a,label,'
      + '#inv-panel,#craft-panel,#menu-panel,#qa-backdrop,#spawn-intro-overlay,'
      + '#map-overlay,#death-screen,#rcon-panel,#storage-panel,.inv-slot,#chat-input-row',
    );
  }

  function _inActionCluster(x, y) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return (x > w - 120 && y > h - 210) || (y > h - 88 && x > w * 0.28 && x < w * 0.72);
  }

  function _ensureJoyVisual() {
    if (_joyBase) return;
    _joyBase = document.createElement('div');
    _joyBase.id = 'joy-base';
    _joyThumb = document.createElement('div');
    _joyThumb.id = 'joy-thumb';
    _joyBase.appendChild(_joyThumb);
    _joyBase.style.display = 'none';
    document.body.appendChild(_joyBase);
  }

  function _resetMove() {
    _movePtr = null;
    if (_state?.input) {
      _state.input.moveX = 0;
      _state.input.moveZ = 0;
    }
    if (_joyBase) {
      _joyBase.style.display = 'none';
      _joyThumb.style.transform = 'translate(-50%, -50%)';
    }
  }

  function _liftTouchZones() {
    const left = document.getElementById('left-zone');
    const right = document.getElementById('right-zone');
    if (left) {
      left.style.zIndex = '240';
      document.body.appendChild(left);
    }
    if (right) {
      right.style.zIndex = '240';
      document.body.appendChild(right);
    }
  }

  function _setupGlobalTouchInput() {
    if (document.body.dataset.globalTouch === '1') return;
    document.body.dataset.globalTouch = '1';
    _ensureJoyVisual();

    const onDown = (e) => {
      if (!_state) return;
      if (e.pointerType === 'mouse' && !ZS._touchInput) return;
      if (ZS.SpawnIntro?.blocksInput?.()) return;
      if (_isPanelTarget(e.target)) return;
      if (_inActionCluster(e.clientX, e.clientY)) return;

      const ratio = e.clientX / Math.max(1, window.innerWidth);
      if (ratio < _MOVE_FRAC) {
        if (_movePtr !== null) return;
        _movePtr = e.pointerId;
        _moveOriginX = e.clientX;
        _moveOriginY = e.clientY;
        _joyBase.style.left = `${e.clientX}px`;
        _joyBase.style.top = `${e.clientY}px`;
        _joyBase.style.display = 'block';
        _joyThumb.style.transform = 'translate(-50%, -50%)';
        if (e.cancelable) e.preventDefault();
      } else if (ratio < 0.9) {
        if (_lookPtr !== null) return;
        _lookPtr = e.pointerId;
        _lookLastX = e.clientX;
        _lookLastY = e.clientY;
        if (e.cancelable) e.preventDefault();
      }
    };

    const onMove = (e) => {
      if (!_state) return;
      if (e.pointerId === _movePtr) {
        const dx = e.clientX - _moveOriginX;
        const dy = e.clientY - _moveOriginY;
        const len = Math.hypot(dx, dy) || 1;
        const clamped = Math.min(len, _MOVE_MAX);
        const nx = dx / len;
        const ny = dy / len;
        _state.input.moveX = nx * (clamped / _MOVE_MAX);
        _state.input.moveZ = ny * (clamped / _MOVE_MAX);
        _joyThumb.style.transform =
          `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`;
        if (e.cancelable) e.preventDefault();
      } else if (e.pointerId === _lookPtr) {
        const dx = e.clientX - _lookLastX;
        const dy = e.clientY - _lookLastY;
        _state.camera.yaw -= dx * _LOOK_SENS;
        _state.camera.pitch -= dy * _LOOK_SENS;
        _state.camera.pitch = Math.max(
          -Math.PI / 2 + 0.05,
          Math.min(Math.PI / 2 - 0.05, _state.camera.pitch),
        );
        _lookLastX = e.clientX;
        _lookLastY = e.clientY;
        if (e.cancelable) e.preventDefault();
      }
    };

    const onUp = (e) => {
      if (e.pointerId === _movePtr) _resetMove();
      if (e.pointerId === _lookPtr) _lookPtr = null;
    };

    document.addEventListener('pointerdown', onDown, { capture: true, passive: false });
    document.addEventListener('pointermove', onMove, { capture: true, passive: false });
    document.addEventListener('pointerup', onUp, { capture: true });
    document.addEventListener('pointercancel', onUp, { capture: true });
  }

  function ensureTouchControls(state) {
    if (state) _state = state;
    _initTouchControls();
  }

  function init(state) {
    _state = state;
    ZS.applyDeviceBodyClasses?.();
    _initTouchControls();
    _setupShootButton();
    _setupReloadButton();
    _setupJumpButton();
    _setupRespawn();
    setHealth(100);
    setKills(0);
    setAmmo(30);
  }

  function _initTouchControls() {
    if (!_state && !_wantsTouchControls()) return;
    ZS.applyDeviceBodyClasses?.();
    if (!_wantsTouchControls()) return;
    document.body.classList.add('input-touch');
    document.body.classList.remove('input-desktop');
    _liftTouchZones();
    if (!_state) return;
    _setupGlobalTouchInput();
    _setupJoystick();
    _setupLookZone();
    _touchControlsReady = true;
  }

  // ── Joystick (left zone) — native touch, no nipplejs ────────────────────

  function _setupJoystick() {
    const zone = document.getElementById('left-zone');
    if (!zone || zone.dataset.joyReady === '1') return;
    zone.dataset.joyReady = '1';
    const MAX_DIST = 60;
    let   originX  = 0, originY = 0, activeId = null;

    // Joystick visible flottant (apparaît où l'on pose le doigt)
    const base  = document.createElement('div'); base.id = 'joy-base';
    const thumb = document.createElement('div'); thumb.id = 'joy-thumb';
    base.appendChild(thumb);
    base.style.display = 'none';
    document.body.appendChild(base);

    function _reset() {
      activeId = null;
      _state.input.moveX = 0;
      _state.input.moveZ = 0;
      base.style.display = 'none';
      thumb.style.transform = 'translate(-50%, -50%)';
    }

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (activeId !== null) return;
      const t  = e.changedTouches[0];
      activeId = t.identifier;
      originX  = t.clientX;
      originY  = t.clientY;
      base.style.left = originX + 'px';
      base.style.top  = originY + 'px';
      base.style.display = 'block';
      thumb.style.transform = 'translate(-50%, -50%)';
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== activeId) continue;
        const dx  = t.clientX - originX;
        const dy  = t.clientY - originY;
        const len = Math.hypot(dx, dy) || 1;
        const clamped = Math.min(len, MAX_DIST);
        const nx = dx / len, ny = dy / len;
        _state.input.moveX = nx * (clamped / MAX_DIST);
        _state.input.moveZ = ny * (clamped / MAX_DIST);
        thumb.style.transform = `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`;
      }
    }, { passive: false });

    // Réinitialise si le doigt suivi est relâché OU s'il ne reste aucun toucher
    // (sécurité : évite l'état « bloqué » qui empêche de se déplacer ensuite).
    function _end(e) {
      let released = (e.touches && e.touches.length === 0);
      for (const t of e.changedTouches) if (t.identifier === activeId) released = true;
      if (released) _reset();
    }
    zone.addEventListener('touchend',    _end, { passive: false });
    zone.addEventListener('touchcancel', _end, { passive: false });
  }

  // ── Look zone (right half) ───────────────────────────────────────────────

  function _setupLookZone() {
    const zone = document.getElementById('right-zone');
    if (!zone || zone.dataset.lookReady === '1') return;
    zone.dataset.lookReady = '1';
    const SENS = 0.004;
    let lastX = null, lastY = null, activeId = null;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (activeId !== null) return;
      const t  = e.changedTouches[0];
      activeId = t.identifier;
      lastX = t.clientX; lastY = t.clientY;
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== activeId) continue;
        const dx = t.clientX - lastX;
        const dy = t.clientY - lastY;
        _state.camera.yaw   -= dx * SENS;
        _state.camera.pitch -= dy * SENS;
        _state.camera.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, _state.camera.pitch));
        lastX = t.clientX; lastY = t.clientY;
      }
    }, { passive: false });

    function _end(e) {
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) { activeId = null; lastX = null; lastY = null; }
      }
    }
    zone.addEventListener('touchend',    _end, { passive: false });
    zone.addEventListener('touchcancel', _end, { passive: false });
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
    if (shoot)  shoot.textContent = icon;
    if (reload) reload.style.display = cat === 'firearm' ? 'flex' : 'none';
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
  function setHealth(hp, max) {
    if (typeof max === 'number' && max > 0) _maxHp = max;
    const h   = Math.max(0, hp);
    const pct = Math.max(0, Math.min(100, (h / _maxHp) * 100));
    const bar = document.getElementById('health-bar');
    bar.style.width = pct + '%';
    bar.style.background = pct > 60 ? '#38a169' : pct > 30 ? '#e9a800' : '#e53e3e';
    document.getElementById('health-text').textContent =
      Math.round(h) + (_maxHp > 100 ? '/' + _maxHp : '');
  }

  function setKills(k) {
    document.getElementById('kills-count').textContent = k;
  }

  function setOnlineCount(n) {
    const el = document.getElementById('online-count');
    if (el) el.textContent = Math.max(0, n | 0);
  }

  function setAmmo(a) {
    document.getElementById('ammo-count').textContent = a;
  }

  function setHunger(v) {
    const bar = document.getElementById('hunger-bar');
    const txt = document.getElementById('hunger-text');
    if (bar) bar.style.width = Math.max(0, v) + '%';
    if (bar) bar.style.background = v > 40 ? '#e8a020' : v > 15 ? '#cc6820' : '#cc2020';
    if (txt) txt.textContent = Math.max(0, v);
  }

  function setThirst(v) {
    const bar = document.getElementById('thirst-bar');
    const txt = document.getElementById('thirst-text');
    if (bar) bar.style.width = Math.max(0, v) + '%';
    if (bar) bar.style.background = v > 40 ? '#2288cc' : v > 15 ? '#225599' : '#cc2020';
    if (txt) txt.textContent = Math.max(0, v);
  }

  function setInfection(v) {
    const bar  = document.getElementById('infection-bar');
    const wrap = document.getElementById('infection-bar-wrap');
    if (!bar || !wrap) return;
    const pct = Math.max(0, Math.min(100, v));
    bar.style.width = pct + '%';
    bar.style.background = pct < 40 ? '#44aa44' : pct < 70 ? '#aaaa22' : '#cc2222';
    wrap.style.display = pct > 0 ? 'flex' : 'none';
  }

  function setStatus(bleeding, infected) {
    const el = document.getElementById('status-effects');
    if (!el) return;
    el.replaceChildren();
    if (bleeding) {
      const b = document.createElement('span');
      b.className = 'status-badge status-bleed';
      b.textContent = '🩸 Saignement';
      el.appendChild(b);
    }
    if (infected) {
      const i = document.createElement('span');
      i.className = 'status-badge status-infect';
      i.textContent = '🦠 Infecté';
      el.appendChild(i);
    }
  }

  function showNotif(text) {
    const el = document.getElementById('pickup-notif');
    if (!el) return;
    el.textContent = text;
    el.style.opacity = '1';
    clearTimeout(showNotif._t);
    showNotif._t = setTimeout(() => { el.style.opacity = '0'; }, 1800);
  }

  function flashDamage() {
    const el = document.getElementById('damage-flash');
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 200);
  }

  function showWave(msg) {
    const el = document.getElementById('wave-banner');
    el.textContent = msg;
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 2500);
  }

  function showDeath(kills) {
    document.getElementById('death-kills').textContent = `Zombies tués : ${kills}`;
    document.getElementById('death-screen').classList.add('show');
  }

  function hideDeath() {
    document.getElementById('death-screen').classList.remove('show');
  }

  function logout() {
    ['zombie_token','zombie_username','zombie_is_admin','zombie_spawn','zombie_health','zombie_kills']
      .forEach(k => localStorage.removeItem(k));
    window.location.href = '/';
  }

  window.ZS = window.ZS || {};
  ZS.UI = {
    init, ensureTouchControls, setHealth, setKills, setOnlineCount, setAmmo,
    setHunger, setThirst, setInfection, setStatus, showNotif, flashDamage,
    showWave, showDeath, hideDeath, setWeaponUI,
  };
  ZS.logout = logout;
}());
