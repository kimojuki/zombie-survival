// Registre des outils de calibrage admin (bras FPS, items, caméra…).
(function () {
  'use strict';

  const _tools = [];

  function register(tool) {
    if (!tool?.id || typeof tool.open !== 'function') return;
    const idx = _tools.findIndex((t) => t.id === tool.id);
    const entry = {
      id: tool.id,
      title: tool.title || tool.id,
      icon: tool.icon || '⚙️',
      desc: tool.desc || '',
      tags: tool.tags || [],
      enabled: tool.enabled !== false,
      soon: !!tool.soon,
      hideFromCalibration: !!tool.hideFromCalibration,
      open: tool.open,
      close: tool.close || (() => {}),
      isOpen: tool.isOpen || (() => false),
    };
    if (idx >= 0) _tools[idx] = entry;
    else _tools.push(entry);
  }

  function list() {
    return _tools.slice();
  }

  function get(id) {
    return _tools.find((t) => t.id === id) || null;
  }

  function anyOpen() {
    return _tools.some((t) => t.isOpen());
  }

  function closeActive() {
    for (const t of _tools) {
      if (t.isOpen()) t.close();
    }
  }

  function openTool(id) {
    const t = get(id);
    if (!t || !t.enabled || t.soon) return false;
    t.open();
    return true;
  }

  function renderList(container, opts) {
    if (!container) return;
    opts = opts || {};
    container.innerHTML = '';
    const tools = _tools.slice();
    if (!tools.length) {
      container.innerHTML = '<p class="admin-hub-empty">Aucun outil de calibrage enregistré.</p>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'admin-hub-card-grid';

    for (const t of tools) {
      if (t.hideFromCalibration) continue;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'admin-hub-card' + (t.soon || !t.enabled ? ' is-disabled' : '');
      card.disabled = t.soon || !t.enabled;
      card.innerHTML = [
        `<span class="admin-hub-card-icon">${t.icon}</span>`,
        `<span class="admin-hub-card-title">${t.title}</span>`,
        `<span class="admin-hub-card-desc">${t.desc}</span>`,
        t.soon ? '<span class="admin-hub-card-badge">Bientôt</span>' : '',
      ].join('');
      card.addEventListener('click', () => {
        if (t.soon || !t.enabled) return;
        if (opts.onBeforeOpen) opts.onBeforeOpen(t);
        t.open();
      });
      grid.appendChild(card);
    }
    container.appendChild(grid);
  }

  window.ZS = window.ZS || {};
  ZS.Calibration = { register, list, get, anyOpen, closeActive, openTool, renderList };
}());
