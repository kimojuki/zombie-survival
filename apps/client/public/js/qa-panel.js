// Panneau QA in-game (serveur QA uniquement)
(function () {
  'use strict';

  let _open = false;
  let _items = [];
  let _campaign = null;
  let _testers = [];
  let _pendingFail = null;

  function _token() {
    return localStorage.getItem('zombie_token') || '';
  }

  function _authHeaders() {
    return { Authorization: 'Bearer ' + _token(), 'Content-Type': 'application/json' };
  }

  function _els() {
    return {
      backdrop: document.getElementById('qa-backdrop'),
      panel: document.getElementById('qa-panel'),
      list: document.getElementById('qa-item-list'),
      title: document.getElementById('qa-campaign-title'),
      testers: document.getElementById('qa-testers'),
      failBox: document.getElementById('qa-fail-box'),
      failInput: document.getElementById('qa-fail-input'),
      failItemLabel: document.getElementById('qa-fail-item-label'),
    };
  }

  function _setOpen(open) {
    _open = open;
    const { backdrop, panel, failBox } = _els();
    if (backdrop) backdrop.style.display = open ? 'flex' : 'none';
    if (panel) panel.style.display = open ? 'flex' : 'none';
    if (failBox) failBox.style.display = 'none';
    _pendingFail = null;
    if (open) _refresh();
  }

  async function _refresh() {
    const { list, title, testers } = _els();
    if (!list) return;
    list.innerHTML = '<p class="qa-loading">Chargement…</p>';
    try {
      const res = await fetch('/api/qa/checklist', { headers: _authHeaders(), cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        list.innerHTML = '<p class="qa-empty">Checklist indisponible.</p>';
        return;
      }
      _items = data.items || [];
      _campaign = data.campaign;
      _testers = data.testers || [];
      if (title) {
        title.textContent = _campaign
          ? `${_campaign.title}${_campaign.fullRetest ? ' (retest complet)' : ''}`
          : 'Aucune campagne QA';
      }
      if (testers) {
        testers.innerHTML = _testers.length
          ? _testers.slice(0, 5).map((t, i) =>
            `<span class="qa-tester-chip">${i + 1}. ${t.username} (${t.total})</span>`
          ).join('')
          : '<span class="qa-muted">Soyez le premier testeur !</span>';
      }
      if (!_items.length) {
        list.innerHTML = '<p class="qa-empty">Rien à tester pour le moment — merci !</p>';
        return;
      }
      list.innerHTML = '';
      _items.forEach((item) => list.appendChild(_renderItem(item)));
    } catch {
      list.innerHTML = '<p class="qa-empty">Erreur réseau.</p>';
    }
  }

  function _renderItem(item) {
    const row = document.createElement('div');
    row.className = 'qa-item';
    row.dataset.id = String(item.id);

    const info = document.createElement('div');
    info.className = 'qa-item-info';
    const h = document.createElement('div');
    h.className = 'qa-item-title';
    h.textContent = item.title;
    info.appendChild(h);
    if (item.description) {
      const p = document.createElement('div');
      p.className = 'qa-item-desc';
      p.textContent = item.description;
      info.appendChild(p);
    }
    if (item.status === 'failed') {
      const badge = document.createElement('span');
      badge.className = 'qa-badge-fail';
      badge.textContent = 'À retester';
      info.appendChild(badge);
    }

    const actions = document.createElement('div');
    actions.className = 'qa-item-actions';
    const passBtn = document.createElement('button');
    passBtn.type = 'button';
    passBtn.className = 'qa-btn qa-btn-pass';
    passBtn.title = 'Validé';
    passBtn.textContent = '✓';
    passBtn.addEventListener('click', () => _submit(item.id, 'pass'));

    const failBtn = document.createElement('button');
    failBtn.type = 'button';
    failBtn.className = 'qa-btn qa-btn-fail';
    failBtn.title = 'Problème';
    failBtn.textContent = '✗';
    failBtn.addEventListener('click', () => _openFail(item));

    actions.appendChild(passBtn);
    actions.appendChild(failBtn);
    row.appendChild(info);
    row.appendChild(actions);
    return row;
  }

  function _openFail(item) {
    _pendingFail = item;
    const { failBox, failInput, failItemLabel } = _els();
    if (failItemLabel) failItemLabel.textContent = item.title;
    if (failInput) {
      failInput.value = '';
      failInput.focus();
    }
    if (failBox) failBox.style.display = 'flex';
  }

  async function _submit(itemId, verdict, feedback) {
    try {
      const res = await fetch('/api/qa/verdict', {
        method: 'POST',
        headers: _authHeaders(),
        body: JSON.stringify({ itemId, verdict, feedback: feedback || null }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const msg = data.err === 'feedback_required'
          ? 'Décrivez le problème.'
          : (data.error || 'Envoi refusé');
        ZS.UI?.showNotif?.(msg);
        return;
      }
      ZS.UI?.showNotif?.(verdict === 'pass' ? '✓ Validé — merci !' : '✗ Retour envoyé aux devs');
      _refresh();
    } catch {
      ZS.UI?.showNotif?.('Erreur réseau');
    }
  }

  let _initialized = false;

  function init(opts = {}) {
    if (_initialized || !opts.qaEnabled) return;
    _initialized = true;

    const menuBtn = document.getElementById('menu-qa');
    if (menuBtn) {
      menuBtn.classList.remove('menu-qa-hidden');
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('menu-panel').style.display = 'none';
        _setOpen(true);
      });
    }

    const closeBtn = document.getElementById('qa-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => _setOpen(false));

    const backdrop = document.getElementById('qa-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) _setOpen(false);
      });
    }

    const cancelFail = document.getElementById('qa-fail-cancel');
    const sendFail = document.getElementById('qa-fail-send');
    if (cancelFail) {
      cancelFail.addEventListener('click', () => {
        const { failBox } = _els();
        if (failBox) failBox.style.display = 'none';
        _pendingFail = null;
      });
    }
    if (sendFail) {
      sendFail.addEventListener('click', () => {
        if (!_pendingFail) return;
        const text = (_els().failInput?.value || '').trim();
        if (!text) {
          ZS.UI?.showNotif?.('Décrivez le problème');
          return;
        }
        const id = _pendingFail.id;
        const { failBox } = _els();
        if (failBox) failBox.style.display = 'none';
        _pendingFail = null;
        _submit(id, 'fail', text);
      });
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.QaPanel = { init, refresh: _refresh, open: () => _setOpen(true), close: () => _setOpen(false) };
})();
