// CMS admin — gestion des rôles (vue standalone ou onglet joueurs).
(function () {
  'use strict';

  let _container = null;
  let _catalog = null;
  let _assignments = [];
  let _me = null;
  let _embedded = false;
  let _showCatalog = false;

  function _token() {
    return localStorage.getItem('zombie_token') || '';
  }

  function _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function _fetchRoles() {
    const res = await fetch('/api/admin/roles', {
      headers: { Authorization: 'Bearer ' + _token() },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Chargement impossible');
    return json;
  }

  function _roleOptions(selected) {
    const roles = _catalog?.roles || [];
    return roles.map((r) => {
      const sel = r.id === selected ? ' selected' : '';
      return `<option value="${r.id}"${sel}>${r.label}</option>`;
    }).join('');
  }

  function _badge(role, label, color, envOwner) {
    const style = color ? ` style="--role-color:${color}"` : '';
    const lock = envOwner ? ' <span class="admin-role-lock" title="Propriétaire .env">🔒</span>' : '';
    return `<span class="admin-role-badge"${style}>${_esc(label || role || 'Joueur')}${lock}</span>`;
  }

  function _renderCatalog() {
    const roles = _catalog?.roles || [];
    if (!roles.length) return '';
    const rows = roles.map((r) => {
      const perms = (r.permissions || []).slice(0, 6).join(', ');
      const more = (r.permissions || []).length > 6 ? '…' : '';
      return `<tr>
        <td>${_badge(r.id, r.label, r.color)}</td>
        <td class="admin-role-perms"><code>${_esc(perms)}${more}</code></td>
      </tr>`;
    }).join('');
    const hidden = _embedded && !_showCatalog ? ' style="display:none"' : '';
    const toggle = _embedded
      ? `<button type="button" class="admin-pm-mini" data-act="toggle-catalog">${_showCatalog ? 'Masquer' : 'Voir'} le détail des rôles</button>`
      : '<h4 class="admin-role-h4">Rôles disponibles</h4>';
    return `<div class="admin-role-catalog"${hidden}>
      ${toggle}
      <table class="admin-pl-table admin-role-cat-table">
        <thead><tr><th>Rôle</th><th>Permissions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  function _renderAssignments() {
    if (!_assignments.length) {
      return '<p class="admin-hub-empty">Aucune attribution enregistrée — joueurs standards ou propriétaires .env.</p>';
    }
    return _assignments.map((a) => {
      const disabled = a.envOwner ? ' disabled' : '';
      return `<div class="admin-role-row">
        <div class="admin-role-row-user"><b>${_esc(a.username)}</b> ${_badge(a.role, a.roleLabel, a.roleColor, a.envOwner)}</div>
        <select class="admin-role-select" data-user="${_esc(a.username)}" data-prev="${a.role}"${disabled} aria-label="Rôle ${_esc(a.username)}">
          ${_roleOptions(a.role)}
        </select>
      </div>`;
    }).join('');
  }

  function _renderAssignForm() {
    return `<div class="admin-role-quick">
      <input type="text" class="admin-role-input" data-field="username" placeholder="Nom du joueur" autocomplete="off" list="admin-role-suggest" />
      <datalist id="admin-role-suggest"></datalist>
      <select class="admin-role-select" data-field="role">${_roleOptions('admin')}</select>
      <button type="button" class="admin-pm-act admin-pm-act--primary" data-act="assign">Attribuer</button>
    </div>`;
  }

  function _render() {
    if (!_container) return;
    const me = _me || ZS.AdminAuth?.getRole?.() || {};
    const toolbar = _embedded
      ? ''
      : `<div class="admin-pl-toolbar">
          <span class="admin-pl-count">Votre rôle : ${_badge(me.role, me.roleLabel, me.roleColor, me.envOwner)}</span>
          <button type="button" class="admin-pl-refresh" data-act="refresh">Actualiser</button>
        </div>`;

    _container.innerHTML = [
      toolbar,
      '<div class="admin-role-panel">',
      '  <p class="admin-role-lead">Attribuez un rôle en 2 clics — effet immédiat à la reconnexion ou en live.</p>',
      _renderAssignForm(),
      '  <h4 class="admin-role-h4">Joueurs avec rôle enregistré</h4>',
      `  <div class="admin-role-list">${_renderAssignments()}</div>`,
      _renderCatalog(),
      !_embedded ? '<p class="admin-pl-foot">Propriétaires <code>OWNER_USERS</code> : non rétrogradables.</p>' : '',
      '</div>',
    ].join('');

    _fillSuggest();
  }

  async function _fillSuggest() {
    const dl = _container?.querySelector('#admin-role-suggest');
    if (!dl) return;
    try {
      const res = await fetch('/api/admin/players', {
        headers: { Authorization: 'Bearer ' + _token() },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      dl.innerHTML = (json.players || []).map((p) => `<option value="${_esc(p.username)}">`).join('');
    } catch { /* ignore */ }
  }

  async function _assign(username, roleId) {
    const res = await fetch('/api/admin/roles/' + encodeURIComponent(username), {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + _token(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: roleId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Échec attribution');
    return json;
  }

  async function refresh() {
    if (!_container) return;
    try {
      const data = await _fetchRoles();
      _catalog = data.catalog;
      _assignments = data.assignments || [];
      _me = data.me;
      _render();
    } catch (err) {
      _container.innerHTML = `<p class="admin-pl-err">${_esc(err.message || 'Erreur')}</p>
        <button type="button" class="admin-pl-refresh" data-act="refresh">Réessayer</button>`;
    }
  }

  function build(container, opts) {
    _container = container;
    _embedded = !!opts?.embedded;
    _showCatalog = !_embedded;
    if (!container) return;
    container.innerHTML = '<p class="admin-hub-empty">Chargement rôles…</p>';
    refresh();

    if (container.dataset.bound === '1') return;
    container.dataset.bound = '1';

    container.addEventListener('click', async (e) => {
      const btn = e.target?.closest?.('[data-act]');
      if (!btn || !_container.contains(btn)) return;
      const act = btn.dataset.act;
      if (act === 'refresh') return refresh();
      if (act === 'toggle-catalog') {
        _showCatalog = !_showCatalog;
        _render();
        return;
      }
      if (act === 'assign') {
        const form = _container.querySelector('.admin-role-quick');
        const username = form?.querySelector?.('[data-field="username"]')?.value?.trim();
        const roleId = form?.querySelector?.('[data-field="role"]')?.value;
        if (!username) {
          ZS.UI?.showNotif?.('Nom du joueur requis');
          return;
        }
        try {
          await _assign(username, roleId);
          ZS.UI?.showNotif?.(`${username} → ${roleId}`);
          refresh();
        } catch (err) {
          ZS.UI?.showNotif?.(err.message || 'Erreur');
        }
      }
    });

    container.addEventListener('change', async (e) => {
      const sel = e.target?.closest?.('.admin-role-select[data-user]');
      if (!sel || sel.disabled) return;
      const username = sel.dataset.user;
      const roleId = sel.value;
      const prev = sel.dataset.prev;
      if (roleId === prev) return;
      try {
        await _assign(username, roleId);
        sel.dataset.prev = roleId;
        ZS.UI?.showNotif?.(`${username} → ${roleId}`);
        refresh();
      } catch (err) {
        sel.value = prev;
        ZS.UI?.showNotif?.(err.message || 'Erreur');
      }
    });
  }

  function stop() {
    _container = null;
    _embedded = false;
  }

  window.ZS = window.ZS || {};
  ZS.AdminRoles = { build, refresh, stop };
}());
