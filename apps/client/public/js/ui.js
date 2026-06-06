// Mobile controls (nipplejs), HUD updates, death/respawn screen
(function () {
  'use strict';

  let _state;

  function init(state) {
    _state = state;
    _setupJoystick();
    _setupLookZone();
    _setupShootButton();
    _setupReloadButton();
    _setupJumpButton();
    _setupRespawn();
    setHealth(100);
    setKills(0);
    setAmmo(30);
  }

  // ── Joystick (left zone) — native touch, no nipplejs ────────────────────

  function _setupJoystick() {
    if (!document.body.classList.contains('mode-mobile')) return;
    const zone     = document.getElementById('left-zone');
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
    if (!document.body.classList.contains('mode-mobile')) return;
    const zone = document.getElementById('right-zone');
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
  ZS.UI     = { init, setHealth, setKills, setOnlineCount, setAmmo, setHunger, setThirst, setInfection, setStatus, showNotif, flashDamage, showWave, showDeath, hideDeath, setWeaponUI };
  ZS.logout = logout;
}());
