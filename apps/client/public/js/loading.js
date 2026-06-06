// Écran de chargement — progression client + sync serveur
(function () {
  'use strict';

  if (window.__zsLoading) return;

  window.ZS = window.ZS || {};
  /** Plages de % — couvrent tout 0–100 (plus de plafond à 24 %). */
  const PHASES = Object.freeze({
    server: { min: 0, max: 12 },
    scripts: { min: 12, max: 22 },
    auth: { min: 22, max: 28 },
    world: { min: 28, max: 48 },
    socket: { min: 48, max: 58 },
    sync: { min: 58, max: 92 },
    finalize: { min: 92, max: 100 },
  });

  let _pct = 0;
  let _active = true;
  let _hideTimer = null;
  let _readyCallbacks = [];

  function _els() {
    return {
      screen: document.getElementById('connecting-screen'),
      msg: document.getElementById('connecting-msg'),
      detail: document.getElementById('connecting-detail'),
      bar: document.getElementById('connecting-progress-bar'),
      pct: document.getElementById('connecting-progress-pct'),
    };
  }

  function _render() {
    const { screen, bar, pct } = _els();
    if (screen) screen.style.display = 'flex';
    if (bar) bar.style.width = `${_pct}%`;
    if (pct) pct.textContent = `${_pct}%`;
  }

  function setProgress(pct, msg, detail) {
    _pct = Math.max(_pct, Math.min(100, Math.round(pct)));
    _active = _pct < 100;
    const { msg: m, detail: d } = _els();
    if (m && msg) m.textContent = msg;
    if (d && detail !== undefined) d.textContent = detail || '';
    _render();
  }

  /** Force une valeur exacte (ex. 100 % avant fade). */
  function forceProgress(pct, msg, detail) {
    _pct = Math.min(100, Math.round(pct));
    _active = _pct < 100;
    const { msg: m, detail: d } = _els();
    if (m && msg) m.textContent = msg;
    if (d && detail !== undefined) d.textContent = detail || '';
    _render();
  }

  function setPhase(phaseKey, local01, msg, detail) {
    const phase = PHASES[phaseKey];
    const t = Math.max(0, Math.min(1, local01));
    if (!phase) return setProgress(Math.round(t * 100), msg, detail);
    const p = phase.min + (phase.max - phase.min) * t;
    setProgress(p, msg, detail);
  }

  function show(msg, detail) {
    _active = true;
    const { msg: m, detail: d, screen } = _els();
    if (screen) screen.style.display = 'flex';
    if (screen) screen.classList.remove('connecting-fade-out');
    if (m && msg) m.textContent = msg;
    if (d && detail !== undefined) d.textContent = detail || '';
    _render();
  }

  function onReady(fn) {
    if (typeof fn !== 'function') return;
    if (!_active && _pct >= 100) {
      fn();
      return;
    }
    _readyCallbacks.push(fn);
  }

  function hide({ delay = 350 } = {}) {
    forceProgress(100, 'Prêt', 'Bonne survie.');
    _active = false;
    clearTimeout(_hideTimer);
    _hideTimer = setTimeout(() => {
      const { screen } = _els();
      if (screen) {
        screen.classList.add('connecting-fade-out');
        setTimeout(() => {
          screen.style.display = 'none';
          screen.classList.remove('connecting-fade-out');
          const cbs = _readyCallbacks.splice(0);
          for (const fn of cbs) {
            try { fn(); } catch (e) { console.error('[loading] onReady', e); }
          }
        }, 320);
      }
    }, delay);
  }

  function reset() {
    clearTimeout(_hideTimer);
    _pct = 0;
    _active = true;
    _readyCallbacks = [];
    const { screen } = _els();
    if (screen) {
      screen.style.display = 'flex';
      screen.classList.remove('connecting-fade-out');
    }
    _render();
  }

  function isActive() {
    return _active;
  }

  const api = { setProgress, forceProgress, setPhase, show, hide, reset, isActive, onReady, PHASES };
  window.__zsLoading = api;
  ZS.Loading = api;
}());
