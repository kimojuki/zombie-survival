// CMS admin — joueurs connectés : cartes, recherche, actions rapides.
(function () {
  'use strict';

  const POLL_MS = 3000;

  let _pollTimer = null;
  let _container = null;
  let _players = [];
  let _selected = null;
  let _filter = '';
  let _tab = 'online';
  let _meta = { canManage: false, canRoles: false, viewer: '' };
  let _lastFetch = 0;
  let _busy = false;

  function _token() {
    return localStorage.getItem('zombie_token') || '';
  }

  function _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _hasRolesTab() {
    return !!(_meta.canRoles || ZS.AdminAuth?.hasPerm?.('players.roles'));
  }

  async function _fetchPlayers() {
    const res = await fetch('/api/admin/players', {
      headers: { Authorization: 'Bearer ' + _token() },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Chargement impossible');
    return json;
  }

  async function _runAction(username, action, extra) {
    if (_busy) return;
    _busy = true;
    try {
      const res = await fetch('/api/admin/players/' + encodeURIComponent(username) + '/action', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + _token(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Action échouée');
      ZS.UI?.showNotif?.(json.message || 'OK');
      await refresh({ silent: true });
      return json;
    } finally {
      _busy = false;
    }
  }

  function _filtered() {
    const q = _filter.trim().toLowerCase();
    if (!q) return _players;
    return _players.filter((p) => {
      const hay = [
        p.username,
        p.roleLabel,
        p.equipped,
        String(p.x),
        String(p.z),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  function _roleBadge(p) {
    if (p.roleLabel) {
      return `<span class="admin-role-badge" style="--role-color:${p.roleColor || '#8a94a4'}">${_esc(p.roleLabel)}</span>`;
    }
    if (p.isAdmin) return '<span class="admin-pl-badge">admin</span>';
    return '';
  }

  function _hpBar(hp) {
    const v = Math.max(0, Math.min(100, Number(hp) || 0));
    const cls = v <= 25 ? ' is-low' : v <= 50 ? ' is-mid' : '';
    return `<div class="admin-pm-hp${cls}" title="${v} HP"><div class="admin-pm-hp-fill" style="width:${v}%"></div></div>`;
  }

  function _actionBtn(act, label, icon, title) {
    if (!_meta.canManage && !ZS.AdminAuth?.hasPerm?.('players.manage')) return '';
    return `<button type="button" class="admin-pm-act" data-act="${act}" title="${_esc(title || label)}">${icon} ${label}</button>`;
  }

  function _renderDetail() {
    const p = _players.find((x) => x.username === _selected);
    if (!p) {
      return '<div class="admin-pm-detail admin-pm-detail--empty"><p>Sélectionnez un joueur pour agir rapidement.</p></div>';
    }
    const eq = p.equipped ? `<span class="admin-pl-eq">${_esc(p.equipped)}</span>` : 'Rien';
    const self = p.isSelf ? ' <span class="admin-pm-you">(vous)</span>' : '';
    return [
      '<div class="admin-pm-detail">',
      '  <div class="admin-pm-detail-hdr">',
      `    <div class="admin-pm-detail-name"><b>${_esc(p.username)}</b>${self} ${_roleBadge(p)}</div>`,
      `    <div class="admin-pm-detail-meta">${_hpBar(p.health)} <span>${p.health ?? '?'} HP · ${p.kills ?? 0} kills</span></div>`,
      '  </div>',
      `  <div class="admin-pm-detail-row"><span>Équipé</span>${eq}</div>`,
      `  <div class="admin-pm-detail-row"><span>Position</span><code class="admin-pm-coords">${p.x}, ${p.z}</code>
        <button type="button" class="admin-pm-mini" data-act="copy-pos" title="Copier">📋</button></div>`,
      '  <div class="admin-pm-actions">',
      _actionBtn('bring', 'Amener', '⬇️', 'Téléporte le joueur vers vous'),
      _actionBtn('goto', 'Aller', '⬆️', 'Vous téléporte vers le joueur'),
      _actionBtn('heal', 'Soigner', '💚', 'Remet la vie à 100'),
      _actionBtn('kick', 'Expulser', '🚪', 'Déconnecte le joueur'),
      '  </div>',
      '</div>',
    ].join('');
  }

  function _renderList() {
    const list = _filtered();
    if (!list.length) {
      return `<p class="admin-hub-empty">${_filter ? 'Aucun résultat.' : 'Aucun joueur connecté.'}</p>`;
    }
    return list.map((p) => {
      const sel = p.username === _selected ? ' is-selected' : '';
      const self = p.isSelf ? ' is-self' : '';
      return [
        `<button type="button" class="admin-pm-card${sel}${self}" data-user="${_esc(p.username)}">`,
        '  <div class="admin-pm-card-top">',
        `    <span class="admin-pm-card-name">${_esc(p.username)}</span>`,
        `    ${_roleBadge(p)}`,
        '  </div>',
        `  ${_hpBar(p.health)}`,
        '  <div class="admin-pm-card-meta">',
        `    <span>${p.health ?? '?'} HP</span>`,
        `    <span class="admin-pm-card-coords">${p.x}, ${p.z}</span>`,
        '  </div>',
        '</button>',
      ].join('');
    }).join('');
  }

  function _renderShell() {
    if (!_container) return;
    const ago = _lastFetch ? Math.max(0, Math.round((Date.now() - _lastFetch) / 1000)) : null;
    const live = ago != null && ago < 8 ? `<span class="admin-pm-live" title="Sync auto">●</span>` : '';
    const rolesTab = _hasRolesTab()
      ? `<button type="button" class="admin-pm-tab${_tab === 'roles' ? ' is-on' : ''}" data-tab="roles">Rôles</button>`
      : '';

    _container.innerHTML = [
      '<div class="admin-pm">',
      '  <div class="admin-pm-bar">',
      '    <div class="admin-pm-tabs">',
      `      <button type="button" class="admin-pm-tab${_tab === 'online' ? ' is-on' : ''}" data-tab="online">En ligne <b>${_players.length}</b></button>`,
      rolesTab,
      '    </div>',
      '    <div class="admin-pm-tools">',
      `      <input type="search" class="admin-pm-search" placeholder="Rechercher…" value="${_esc(_filter)}" autocomplete="off" ${_tab !== 'online' ? 'disabled' : ''} />`,
      `      <button type="button" class="admin-pm-icon-btn" data-act="refresh" title="Actualiser">${live}↻</button>`,
      '    </div>',
      '  </div>',
      _tab === 'online'
        ? `<div class="admin-pm-body">
            <div class="admin-pm-list">${_renderList()}</div>
            ${_renderDetail()}
          </div>`
        : '<div class="admin-pm-roles-host"></div>',
      '</div>',
    ].join('');

    if (_tab === 'roles') {
      const host = _container.querySelector('.admin-pm-roles-host');
      ZS.AdminRoles?.build?.(host, { embedded: true });
    }
  }

  function _renderError(msg) {
    if (!_container) return;
    _container.innerHTML = [
      '<div class="admin-pm-err">',
      `  <p>${_esc(msg)}</p>`,
      '  <button type="button" class="admin-pl-refresh" data-act="refresh">Réessayer</button>',
      '</div>',
    ].join('');
  }

  async function refresh(opts) {
    if (!_container) return;
    if (_tab !== 'online' && !opts?.forceList) {
      if (_tab === 'roles') _renderShell();
      return;
    }
    try {
      const data = await _fetchPlayers();
      _players = data.players || [];
      _meta.canManage = !!data.canManage;
      _meta.canRoles = !!data.canRoles;
      _meta.viewer = data.viewer || '';
      _lastFetch = Date.now();
      if (_selected && !_players.some((p) => p.username === _selected)) {
        _selected = _players[0]?.username || null;
      }
      if (!_selected && _players.length) _selected = _players[0].username;
      _renderShell();
      if (!opts?.silent) {
        /* no toast on auto-poll */
      }
    } catch (err) {
      if (!opts?.silent) _renderError(err.message || 'Erreur réseau');
    }
  }

  function _stopPoll() {
    if (_pollTimer != null) {
      clearInterval(_pollTimer);
      _pollTimer = null;
    }
  }

  async function _onAction(act, username) {
    if (!username) return;
    if (act === 'copy-pos') {
      const p = _players.find((x) => x.username === username);
      if (!p) return;
      const text = `${p.x}, ${p.z}`;
      try {
        await navigator.clipboard.writeText(text);
        ZS.UI?.showNotif?.('Position copiée');
      } catch {
        ZS.UI?.showNotif?.(text);
      }
      return;
    }
    if (act === 'kick') {
      if (!window.confirm(`Expulser ${username} ?`)) return;
    }
    try {
      await _runAction(username, act);
    } catch (err) {
      ZS.UI?.showNotif?.(err.message || 'Erreur');
    }
  }

  function build(container) {
    _container = container;
    if (!container) return;
    _tab = 'online';
    _filter = '';
    _selected = null;
    container.innerHTML = '<p class="admin-hub-empty">Chargement joueurs…</p>';
    refresh();
    _stopPoll();
    _pollTimer = setInterval(() => refresh({ silent: true }), POLL_MS);

    if (container.dataset.bound === '1') return;
    container.dataset.bound = '1';

    container.addEventListener('click', async (e) => {
      const tab = e.target?.closest?.('[data-tab]');
      if (tab && _container.contains(tab)) {
        const t = tab.dataset.tab;
        if (t === _tab) return;
        _tab = t;
        if (t === 'online') refresh({ forceList: true });
        else _renderShell();
        return;
      }

      const card = e.target?.closest?.('.admin-pm-card[data-user]');
      if (card) {
        _selected = card.dataset.user;
        _renderShell();
        return;
      }

      const btn = e.target?.closest?.('[data-act]');
      if (!btn || !_container.contains(btn)) return;
      const act = btn.dataset.act;
      if (act === 'refresh') return refresh();
      const user = _selected;
      if (user) await _onAction(act, user);
    });

    container.addEventListener('input', (e) => {
      const inp = e.target?.closest?.('.admin-pm-search');
      if (!inp || !_container.contains(inp)) return;
      _filter = inp.value;
      const list = _container.querySelector('.admin-pm-list');
      if (list) list.innerHTML = _renderList();
    });
  }

  function stop() {
    _stopPoll();
    ZS.AdminRoles?.stop?.();
    _container = null;
    _players = [];
    _selected = null;
  }

  window.ZS = window.ZS || {};
  ZS.AdminPlayers = { build, refresh, stop };
}());
