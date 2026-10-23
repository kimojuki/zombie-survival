// HUD + death + export
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

  function showNotif(text, ms) {
    const el = document.getElementById('pickup-notif');
    if (!el) return;
    el.textContent = text;
    el.style.opacity = '1';
    clearTimeout(showNotif._t);
    const dur = Number.isFinite(ms) ? ms : 1800;
    showNotif._t = setTimeout(() => { el.style.opacity = '0'; }, dur);
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
