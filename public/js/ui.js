// Mobile controls (nipplejs), HUD updates, death/respawn screen
(function () {
  'use strict';

  let _state;

  function init(state) {
    _state = state;
    _setupJoystick();
    _setupLookZone();
    _setupShootButton();
    _setupRespawn();
    setHealth(100);
    setKills(0);
    setAmmo(30);
  }

  // ── Joystick (left zone) — native touch, no nipplejs ────────────────────

  function _setupJoystick() {
    const zone     = document.getElementById('left-zone');
    const MAX_DIST = 60;
    let   originX  = null, originY = null, activeId = null;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (activeId !== null) return;
      const t  = e.changedTouches[0];
      activeId = t.identifier;
      originX  = t.clientX;
      originY  = t.clientY;
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== activeId) continue;
        const dx  = t.clientX - originX;
        const dy  = t.clientY - originY;
        const len = Math.hypot(dx, dy) || 1;
        const clamped = Math.min(len, MAX_DIST);
        _state.input.moveX =  (dx / len) * (clamped / MAX_DIST);
        _state.input.moveZ =  (dy / len) * (clamped / MAX_DIST);
      }
    }, { passive: false });

    function _end(e) {
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) {
          activeId = null;
          _state.input.moveX = 0;
          _state.input.moveZ = 0;
        }
      }
    }
    zone.addEventListener('touchend',    _end, { passive: false });
    zone.addEventListener('touchcancel', _end, { passive: false });
  }

  // ── Look zone (right half) ───────────────────────────────────────────────

  function _setupLookZone() {
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

  // ── Respawn ───────────────────────────────────────────────────────────────

  function _setupRespawn() {
    document.getElementById('respawn-btn').addEventListener('click', () => {
      if (_state.onRespawn) _state.onRespawn();
    });
  }

  // ── HUD updates ───────────────────────────────────────────────────────────

  function setHealth(hp) {
    document.getElementById('health-bar').style.width = Math.max(0, hp) + '%';
    document.getElementById('health-text').textContent = Math.max(0, hp);
    const bar = document.getElementById('health-bar');
    bar.style.background = hp > 60 ? '#38a169' : hp > 30 ? '#e9a800' : '#e53e3e';
  }

  function setKills(k) {
    document.getElementById('kills-count').textContent = k;
  }

  function setAmmo(a) {
    document.getElementById('ammo-count').textContent = a;
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

  window.ZS = window.ZS || {};
  ZS.UI = { init, setHealth, setKills, setAmmo, flashDamage, showWave, showDeath, hideDeath };
}());
