// Historique session — dernières actions admin décor (mémoire locale).
(function () {
  'use strict';

  const MAX = 24;
  let _entries = [];

  function _fmtTime(ts) {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }

  function push(type, detail) {
    _entries.push({
      type,
      detail: detail || '',
      at: Date.now(),
    });
    while (_entries.length > MAX) _entries.shift();
  }

  function list() {
    return _entries.slice().reverse();
  }

  function clear() {
    _entries = [];
  }

  function render(container) {
    if (!container) return;
    const rows = list();
    if (!rows.length) {
      container.innerHTML = '<div class="hint">Aucune action cette session.</div>';
      return;
    }
    const labels = {
      create: 'Créé',
      delete: 'Supprimé',
      patch: 'Modifié',
      storage: 'Coffre',
      copy: 'Copié',
      paste: 'Collé',
      multi_delete: 'Suppr. lot',
    };
    container.innerHTML = rows.map((e) => {
      const label = labels[e.type] || e.type;
      return `<div class="hist-row"><span class="hist-time">${_fmtTime(e.at)}</span> <b>${label}</b> ${e.detail}</div>`;
    }).join('');
  }

  window.ZS = window.ZS || {};
  ZS.AdminDecorHistory = { push, list, clear, render };
}());
