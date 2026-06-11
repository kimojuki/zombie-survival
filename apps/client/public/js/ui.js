// Mobile controls (nipplejs), HUD updates, death/respawn screen
(function () {
  'use strict';

  let _state;
  let _touchControlsReady = false;
  let _joyBase = null;
  let _joyThumb = null;
  let _sprintBtn = null;
  let _sprintPtr = null;
  let _crouchBtn = null;
  let _movePtr = null;
  let _lookPtr = null;
  let _moveOriginX = 0;
  let _moveOriginY = 0;
  let _lookLastX = 0;
  let _lookLastY = 0;
  let _sprintLookLastX = 0;
  let _sprintLookLastY = 0;
  const _MOVE_MAX = 60;
  let _lookSensTouch = 0.004;
  let _invertY = false;
  const _MOVE_FRAC = 0.44;

  function _wantsTouchControls() {
    return !!(ZS.needsTouchControls?.()
      || ZS.detectTouchInput?.()
      || (navigator.maxTouchPoints || 0) > 0
      || 'ontouchstart' in window);
  }

  const _UI_ROOT_SEL = [
    'button', 'input', 'textarea', 'select', 'a', 'label',
    '#menu-btn', '#menu-panel', '#craft-btn', '#inv-btn', '#map-btn', '#chat-btn',
    '#shoot-btn', '#jump-btn', '#reload-btn', '#use-btn', '#grab-btn', '#sprint-btn', '#crouch-btn',
    '#door-interact-btn', '#hotbar', '.hb-slot',
    '#inv-panel', '#inv-backdrop', '#craft-panel', '#craft-backdrop',
    '#qa-backdrop', '#admin-backdrop', '#group-backdrop', '#spawn-intro-overlay', '#map-overlay', '#death-screen',
    '#rcon-panel', '#storage-panel', '#storage-backdrop', '#sleep-loot-panel', '#sleep-loot-backdrop',
    '#sign-backdrop', '#sign-panel', '#options-backdrop', '#options-panel',
    '.inv-slot', '#chat-input-row',
    '#chat-wrap', '#craft-queue-hud',
  ].join(',');

  function _isPanelTarget(el) {
    return !!el?.closest?.(_UI_ROOT_SEL);
  }

  function _elementUnderTouch(x, y) {
    const mask = ['left-zone', 'right-zone'];
    const saved = [];
    for (const id of mask) {
      const el = document.getElementById(id);
      if (!el) continue;
      saved.push([el, el.style.pointerEvents]);
      el.style.pointerEvents = 'none';
    }
    const hit = document.elementFromPoint(x, y);
    for (const [el, pe] of saved) el.style.pointerEvents = pe;
    return hit;
  }

  function _isInteractiveAt(x, y, target) {
    if (_isPanelTarget(target)) return true;
    const under = _elementUnderTouch(x, y);
    if (_isPanelTarget(under)) return true;
    return _inUiChromeRect(x, y);
  }

  /** Rectangles HUD / boutons fixes (filet si elementFromPoint tombe sur le canvas). */
  function _inUiChromeRect(x, y) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (x > w - 290 && y > h - 220) return true;
    if (y > h - 95 && x > w * 0.22 && x < w * 0.78) return true;
    if (x < 76 && y > h - 330) return true;
    if (x > w - 56 && y < 58) return true;
    if (y < 110 && x < 210) return true;
    if (x > w - 210 && y < 110 && y > h - 200) return true;
    return false;
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

  function applyOptions() {
    const sens = ZS.Options?.getLookSensitivity?.();
    if (sens) _lookSensTouch = sens.touch;
    _invertY = !!ZS.Options?.get?.('invertY');
  }

  function _applyLookDelta(dx, dy) {
    if (!_state?.camera) return;
    const inv = _invertY ? -1 : 1;
    _state.camera.yaw -= dx * _lookSensTouch;
    _state.camera.pitch -= dy * _lookSensTouch * inv;
    _state.camera.pitch = Math.max(
      -Math.PI / 2 + 0.05,
      Math.min(Math.PI / 2 - 0.05, _state.camera.pitch),
    );
  }

  function _releaseSprintPointer(e) {
    if (e && _sprintPtr !== null && e.pointerId !== _sprintPtr) return;
    _sprintPtr = null;
    if (_state?.input) _state.input.sprintHeld = false;
    if (_sprintBtn) _sprintBtn.classList.remove('active');
  }

  function _syncCrouchButton() {
    if (!_crouchBtn || !_state?.input) return;
    _crouchBtn.classList.toggle('active', !!_state.input.crouchToggle);
    _crouchBtn.setAttribute('aria-pressed', _state.input.crouchToggle ? 'true' : 'false');
  }

  function _ensureCrouchButton() {
    if (_crouchBtn) return;
    _crouchBtn = document.createElement('button');
    _crouchBtn.id = 'crouch-btn';
    _crouchBtn.type = 'button';
    _crouchBtn.title = 'S\'accroupir';
    _crouchBtn.setAttribute('aria-label', 'S\'accroupir');
    _crouchBtn.setAttribute('aria-pressed', 'false');
    _crouchBtn.textContent = '⬇';
    _crouchBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!_state?.input) return;
      _state.input.crouchToggle = !_state.input.crouchToggle;
      _syncCrouchButton();
    }, { passive: false });
    document.body.appendChild(_crouchBtn);
  }

  function _updateCrouchButton() {
    if (!_wantsTouchControls()) return;
    _ensureCrouchButton();
    _syncCrouchButton();
  }

  function _ensureSprintButton() {
    if (_sprintBtn) return;
    _sprintBtn = document.createElement('button');
    _sprintBtn.id = 'sprint-btn';
    _sprintBtn.type = 'button';
    _sprintBtn.title = 'Sprint';
    _sprintBtn.setAttribute('aria-label', 'Sprint');
    _sprintBtn.textContent = '⚡';
    const sprintDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (_sprintPtr !== null) return;
      _sprintPtr = e.pointerId;
      _sprintLookLastX = e.clientX;
      _sprintLookLastY = e.clientY;
      try { _sprintBtn.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      if (_state?.input) _state.input.sprintHeld = true;
      _sprintBtn.classList.add('active');
    };
    const sprintMove = (e) => {
      if (e.pointerId !== _sprintPtr || !_state) return;
      const dx = e.clientX - _sprintLookLastX;
      const dy = e.clientY - _sprintLookLastY;
      if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) {
        _applyLookDelta(dx, dy);
        _sprintLookLastX = e.clientX;
        _sprintLookLastY = e.clientY;
      }
      if (e.cancelable) e.preventDefault();
    };
    const sprintUp = (e) => {
      if (e) {
        e.stopPropagation();
        _releaseSprintPointer(e);
        try { _sprintBtn.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      }
    };
    _sprintBtn.addEventListener('pointerdown', sprintDown, { passive: false });
    _sprintBtn.addEventListener('pointermove', sprintMove, { passive: false });
    _sprintBtn.addEventListener('pointerup', sprintUp);
    _sprintBtn.addEventListener('pointercancel', sprintUp);
    document.body.appendChild(_sprintBtn);
  }

  function _updateSprintButton() {
    if (!_wantsTouchControls()) return;
    _ensureSprintButton();
    const mx = _state?.input?.moveX ?? 0;
    const mz = _state?.input?.moveZ ?? 0;
    const moving = Math.hypot(mx, mz) > 0.12;
    const joyVisible = _joyBase && _joyBase.style.display !== 'none';
    if (!moving || !joyVisible || _movePtr === null) {
      if (_sprintPtr === null) {
        _sprintBtn.classList.remove('visible', 'active', 'exhausted');
        if (_state?.input) _state.input.sprintHeld = false;
      }
      _updateCrouchButton();
      return;
    }
    _sprintBtn.classList.add('visible');
    _sprintBtn.classList.toggle('exhausted', !ZS.Survival?.canSprint?.());
    _updateCrouchButton();
  }

  function _resetMove() {
    _movePtr = null;
    if (_state?.input) {
      _state.input.moveX = 0;
      _state.input.moveZ = 0;
      if (_sprintPtr === null) _state.input.sprintHeld = false;
    }
    if (_joyBase) {
      _joyBase.style.display = 'none';
      _joyThumb.style.transform = 'translate(-50%, -50%)';
    }
    if (_sprintBtn && _sprintPtr === null) {
      _sprintBtn.classList.remove('visible', 'active', 'exhausted');
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
      if (_isInteractiveAt(e.clientX, e.clientY, e.target)) return;

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
        _updateSprintButton();
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
        _updateSprintButton();
        if (e.cancelable) e.preventDefault();
      } else if (e.pointerId === _lookPtr) {
        const dx = e.clientX - _lookLastX;
        const dy = e.clientY - _lookLastY;
        _applyLookDelta(dx, dy);
        _lookLastX = e.clientX;
        _lookLastY = e.clientY;
        if (e.cancelable) e.preventDefault();
      } else if (e.pointerId === _sprintPtr) {
        const dx = e.clientX - _sprintLookLastX;
        const dy = e.clientY - _sprintLookLastY;
        if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) {
          _applyLookDelta(dx, dy);
          _sprintLookLastX = e.clientX;
          _sprintLookLastY = e.clientY;
        }
        if (e.cancelable) e.preventDefault();
      }
    };

    const onUp = (e) => {
      if (e.pointerId === _movePtr) _resetMove();
      if (e.pointerId === _lookPtr) _lookPtr = null;
      if (e.pointerId === _sprintPtr) _releaseSprintPointer(e);
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

  function setPlayerKills(k) {
    const el = document.getElementById('player-kills-count');
    if (el) el.textContent = Math.max(0, k | 0);
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

  function setEndurance(v) {
    const bar = document.getElementById('endurance-bar');
    const txt = document.getElementById('endurance-text');
    const wrap = document.getElementById('endurance-bar-wrap');
    const pct = Math.max(0, Math.min(100, v));
    if (bar) {
      bar.style.width = pct + '%';
      bar.style.background = pct > 45 ? '#e8c040' : pct > 18 ? '#cc8820' : '#aa5518';
    }
    if (txt) txt.textContent = Math.round(pct);
    if (wrap) wrap.style.opacity = pct >= 99.5 ? '0.72' : '1';
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

  const _statusFx = {
    bleeding: false,
    infected: false,
    antiviral: false,
    zoneSafe: null,
  };

  function _renderStatusEffects() {
    const el = document.getElementById('status-effects');
    if (!el) return;
    el.replaceChildren();
    if (_statusFx.zoneSafe === true) {
      const z = document.createElement('span');
      z.className = 'status-badge status-zone-safe';
      z.textContent = '🛡️ Plage sûre';
      el.appendChild(z);
    } else if (_statusFx.zoneSafe === false) {
      const z = document.createElement('span');
      z.className = 'status-badge status-zone-wild';
      z.textContent = '⚠️ Zone ouverte';
      el.appendChild(z);
    }
    if (_statusFx.bleeding) {
      const b = document.createElement('span');
      b.className = 'status-badge status-bleed';
      b.textContent = '🩸 Saignement';
      el.appendChild(b);
    }
    if (_statusFx.antiviral) {
      const a = document.createElement('span');
      a.className = 'status-badge status-antiviral';
      a.textContent = '💊 Antiviral actif';
      el.appendChild(a);
    }
    if (_statusFx.infected) {
      const i = document.createElement('span');
      i.className = 'status-badge status-infect';
      i.textContent = '🦠 Infecté';
      el.appendChild(i);
    }
  }

  function setStatus(bleeding, infected, antiviral) {
    _statusFx.bleeding = !!bleeding;
    _statusFx.infected = !!infected;
    _statusFx.antiviral = !!antiviral;
    _renderStatusEffects();
  }

  /** true = sable protégé, false = hors plage, null = masqué (mort / chargement). */
  function setZoneSafe(safe) {
    if (_statusFx.zoneSafe === safe) return;
    _statusFx.zoneSafe = safe;
    _renderStatusEffects();
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

  let _survVignette = null;
  function _ensureSurvVignette() {
    if (_survVignette) return _survVignette;
    _survVignette = document.getElementById('survival-vignette');
    return _survVignette;
  }

  /** Légère vignette immersive selon faim / soif / saignement. */
  function setSurvivalVignette({ faim, soif, saignement }) {
    if (ZS.Options?.isFeature?.('survivalVignette') === false) {
      const el0 = _ensureSurvVignette();
      if (el0) { el0.className = ''; el0.style.opacity = '0'; }
      return;
    }
    const el = _ensureSurvVignette();
    if (!el) return;
    if (saignement) {
      el.className = 'surv-bleed';
      el.style.opacity = '';
      return;
    }
    if (soif < 24) {
      el.className = 'surv-thirst';
      el.style.opacity = String(0.12 + ((24 - soif) / 24) * 0.34);
      return;
    }
    if (faim < 24) {
      el.className = 'surv-hunger';
      el.style.opacity = String(0.1 + ((24 - faim) / 24) * 0.3);
      return;
    }
    el.className = '';
    el.style.opacity = '0';
  }

  function showWave(msg) {
    const el = document.getElementById('wave-banner');
    el.textContent = msg;
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 2500);
  }

  function _formatSurvived(ms) {
    const total = Math.max(0, Math.floor((ms || 0) / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h} h ${m} min`;
    if (m > 0) return `${m} min ${s} s`;
    return `${s} s`;
  }

  function showDeath(recap) {
    setZoneSafe(null);
    const r = (recap && typeof recap === 'object') ? recap : { zombieKills: recap ?? 0 };
    const zk = document.getElementById('death-zombie-kills');
    const pk = document.getElementById('death-player-kills');
    const sv = document.getElementById('death-survived');
    if (zk) zk.textContent = String(r.zombieKills ?? 0);
    if (pk) pk.textContent = String(r.playerKills ?? 0);
    if (sv) sv.textContent = _formatSurvived(r.survivedMs);
    if (document.pointerLockElement) document.exitPointerLock();
    document.body.classList.add('death-screen-open');
    document.getElementById('death-screen').classList.add('show');
    ZS.onUiPanelOpen?.();
  }

  function hideDeath() {
    document.getElementById('death-screen').classList.remove('show');
    document.body.classList.remove('death-screen-open');
    ZS.onUiPanelClose?.();
  }

  function logout() {
    ['zombie_token','zombie_username','zombie_is_admin','zombie_spawn','zombie_health','zombie_kills']
      .forEach(k => localStorage.removeItem(k));
    window.location.href = '/';
  }

  window.ZS = window.ZS || {};
  ZS.UI = {
    init, ensureTouchControls, setHealth, setPlayerKills, setOnlineCount, setAmmo, setEndurance,
    setHunger, setThirst, setInfection, setStatus, setZoneSafe, setSurvivalVignette,
    applyOptions, showNotif, flashDamage,
    showWave, showDeath, hideDeath, setWeaponUI,
  };
  ZS.logout = logout;
}());
