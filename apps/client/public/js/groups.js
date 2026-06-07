// Gestion des groupes — menu hamburger + panneau overlay
(function () {
  'use strict';

  let _socket = null;
  let _open = false;
  let _state = { inGroup: false, pendingInvite: null };
  let _initialized = false;
  let _busy = false;

  function _els() {
    return {
      backdrop: document.getElementById('group-backdrop'),
      panel: document.getElementById('group-panel'),
      body: document.getElementById('group-panel-body'),
      inviteBanner: document.getElementById('group-invite-banner'),
      inviteText: document.getElementById('group-invite-text'),
      inviteAccept: document.getElementById('group-invite-accept'),
      inviteDecline: document.getElementById('group-invite-decline'),
    };
  }

  function _setOpen(open) {
    _open = open;
    const { backdrop, panel } = _els();
    if (backdrop) backdrop.style.display = open ? 'flex' : 'none';
    if (panel) panel.style.display = open ? 'flex' : 'none';
    if (open) _render();
  }

  function _emit(event, payload, cb) {
    if (!_socket) {
      if (typeof cb === 'function') cb({ ok: false, error: 'Non connecté' });
      return;
    }
    if (payload === undefined) _socket.emit(event, cb);
    else _socket.emit(event, payload, cb);
  }

  function _runAction(fn) {
    if (_busy) return;
    _busy = true;
    fn((res) => {
      _busy = false;
      if (!res?.ok) {
        ZS.UI?.showNotif?.(res?.error || 'Action impossible');
        return;
      }
      if (res.invited) ZS.UI?.showNotif?.(`Invitation envoyée à ${res.invited}`);
      if (res.joined) ZS.UI?.showNotif?.('Vous avez rejoint le groupe');
      if (res.declined) ZS.UI?.showNotif?.('Invitation refusée');
    });
  }

  function _onState(data) {
    _state = data || { inGroup: false };
    _updateInviteBanner();
    if (_open) _render();
  }

  function _onInvite(data) {
    if (!data) return;
    _state.pendingInvite = {
      groupId: data.groupId,
      fromUsername: data.fromUsername,
      memberCount: data.memberCount,
      maxMembers: data.maxMembers,
    };
    _updateInviteBanner();
    ZS.UI?.showNotif?.(`Invitation de groupe de ${data.fromUsername}`);
    if (_open) _render();
  }

  function _updateInviteBanner() {
    const { inviteBanner, inviteText } = _els();
    const inv = _state.pendingInvite;
    if (!inviteBanner) return;
    if (!inv) {
      inviteBanner.style.display = 'none';
      return;
    }
    inviteBanner.style.display = 'flex';
    if (inviteText) {
      inviteText.textContent = `${inv.fromUsername} vous invite (${inv.memberCount || '?'}/${inv.maxMembers || 6})`;
    }
  }

  function _btn(label, className, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className || 'group-btn';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function _renderNoGroup(body) {
    const p = document.createElement('p');
    p.className = 'group-muted';
    p.textContent = 'Formez une équipe pour jouer ensemble. Le chef peut inviter des joueurs en ligne.';
    body.appendChild(p);
    body.appendChild(_btn('Créer un groupe', 'group-btn group-btn-primary', () => {
      _runAction((cb) => _emit('group-create', cb));
    }));
  }

  function _renderInviteSection(body) {
    const section = document.createElement('div');
    section.className = 'group-section';
    const title = document.createElement('h3');
    title.textContent = 'Inviter un joueur';
    section.appendChild(title);

    const row = document.createElement('div');
    row.className = 'group-invite-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'group-input';
    input.placeholder = 'Pseudo';
    input.maxLength = 32;
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    row.appendChild(input);

    const list = _state.inviteablePlayers || [];
    if (list.length) {
      const sel = document.createElement('select');
      sel.className = 'group-select';
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = '— Joueurs en ligne —';
      sel.appendChild(opt0);
      for (const pl of list) {
        const o = document.createElement('option');
        o.value = pl.username;
        o.textContent = pl.username;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => {
        if (sel.value) input.value = sel.value;
      });
      section.appendChild(sel);
    }

    row.appendChild(_btn('Inviter', 'group-btn group-btn-primary', () => {
      const name = input.value.trim();
      if (!name) {
        ZS.UI?.showNotif?.('Indiquez un pseudo');
        return;
      }
      _runAction((cb) => _emit('group-invite', { username: name }, cb));
      input.value = '';
    }));
    section.appendChild(row);
    body.appendChild(section);
  }

  function _renderMembers(body) {
    const section = document.createElement('div');
    section.className = 'group-section';
    const title = document.createElement('h3');
    title.textContent = `Membres (${_state.memberCount}/${_state.maxMembers})`;
    section.appendChild(title);

    const list = document.createElement('div');
    list.className = 'group-member-list';
    for (const m of (_state.members || [])) {
      const row = document.createElement('div');
      row.className = 'group-member-row';
      const name = document.createElement('span');
      name.className = 'group-member-name';
      name.textContent = m.username + (m.isLeader ? ' ★' : '') + (m.isSelf ? ' (vous)' : '');
      row.appendChild(name);
      const status = document.createElement('span');
      status.className = 'group-member-status' + (m.online ? ' online' : '');
      status.textContent = m.online ? 'en ligne' : 'hors ligne';
      row.appendChild(status);
      if (_state.isLeader && !m.isSelf) {
        const kick = _btn('Retirer', 'group-btn group-btn-danger group-btn-sm', () => {
          if (!confirm(`Retirer ${m.username} du groupe ?`)) return;
          _runAction((cb) => _emit('group-kick', { userId: m.userId }, cb));
        });
        row.appendChild(kick);
      }
      list.appendChild(row);
    }
    section.appendChild(list);
    body.appendChild(section);
  }

  function _renderActions(body) {
    const actions = document.createElement('div');
    actions.className = 'group-actions';
    if (_state.isLeader) {
      actions.appendChild(_btn('Dissoudre le groupe', 'group-btn group-btn-danger', () => {
        if (!confirm('Dissoudre le groupe pour tous les membres ?')) return;
        _runAction((cb) => _emit('group-disband', cb));
      }));
    } else {
      actions.appendChild(_btn('Quitter le groupe', 'group-btn group-btn-secondary', () => {
        if (!confirm('Quitter ce groupe ?')) return;
        _runAction((cb) => _emit('group-leave', cb));
      }));
    }
    body.appendChild(actions);
  }

  function _renderInGroup(body) {
    _renderMembers(body);
    if (_state.isLeader && (_state.memberCount || 0) < (_state.maxMembers || 6)) {
      _renderInviteSection(body);
    }
    _renderActions(body);
  }

  function _render() {
    const { body } = _els();
    if (!body) return;
    body.innerHTML = '';
    if (_state.inGroup) _renderInGroup(body);
    else _renderNoGroup(body);
  }

  function bindSocket(socket) {
    _socket = socket;
    socket.on('group-state', _onState);
    socket.on('group-invite', _onInvite);
  }

  function init() {
    if (_initialized) return;
    _initialized = true;

    const menuBtn = document.getElementById('menu-groups');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mp = document.getElementById('menu-panel');
        if (mp) mp.style.display = 'none';
        _setOpen(true);
      });
    }

    const closeBtn = document.getElementById('group-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => _setOpen(false));

    const { backdrop, inviteAccept, inviteDecline } = _els();
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) _setOpen(false);
      });
    }
    if (inviteAccept) {
      inviteAccept.addEventListener('click', () => {
        _runAction((cb) => _emit('group-invite-respond', { accept: true }, cb));
      });
    }
    if (inviteDecline) {
      inviteDecline.addEventListener('click', () => {
        _runAction((cb) => _emit('group-invite-respond', { accept: false }, cb));
      });
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Groups = { init, bindSocket, open: () => _setOpen(true), close: () => _setOpen(false) };
})();
