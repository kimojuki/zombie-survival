import {
  GROUP_MAX_MEMBERS,
  GROUP_INVITE_TTL_MS,
  GROUP_EVENTS,
  buildGroupSnapshot,
  normalizeUsernameQuery,
} from '../../../packages/shared/src/groups.mjs';

function _normId(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n : id;
}

export function createGroupsManager(ctx) {
  const { io, players, log, normPlayerId } = ctx;

  /** @type {Map<string, { id: string, leaderId: number|string, members: Map<number|string, { userId, username }> }>} */
  const groups = new Map();
  /** @type {Map<number|string, string>} */
  const memberOf = new Map();
  /** @type {Map<number|string, { groupId: string, fromUserId, fromUsername: string, createdAt: number }>} */
  const pendingInvites = new Map();
  let _nextId = 1;

  function _findOnlineByUsername(name) {
    const q = normalizeUsernameQuery(name);
    if (!q) return null;
    let partial = null;
    for (const p of players.values()) {
      const u = p.username.toLowerCase();
      if (u === q) return p;
      if (!partial && u.startsWith(q)) partial = p;
    }
    return partial;
  }

  function _socketEntryForUserId(userId) {
    const want = _normId(userId);
    for (const [socketId, p] of players) {
      if (_normId(p.id) === want) {
        return { socketId, socket: io.sockets.sockets.get(socketId), player: p };
      }
    }
    return null;
  }

  function _onlineUserIds() {
    const set = new Set();
    for (const p of players.values()) set.add(_normId(p.id));
    return set;
  }

  function _inviteablePlayers(selfUserId) {
    const self = _normId(selfUserId);
    const inGroup = new Set();
    for (const g of groups.values()) {
      for (const uid of g.members.keys()) inGroup.add(_normId(uid));
    }
    const out = [];
    for (const p of players.values()) {
      const uid = _normId(p.id);
      if (uid === self) continue;
      if (inGroup.has(uid)) continue;
      if (pendingInvites.has(uid)) continue;
      out.push({ userId: uid, username: p.username });
    }
    out.sort((a, b) => a.username.localeCompare(b.username, 'fr'));
    return out;
  }

  function _buildPayloadForPlayer(player) {
    const uid = _normId(player.id);
    const groupId = memberOf.get(uid);
    const group = groupId ? groups.get(groupId) : null;
    const online = _onlineUserIds();
    const snap = buildGroupSnapshot(group, uid, online);
    const invite = pendingInvites.get(uid);
    let pendingInvite = null;
    if (invite) {
      const g = groups.get(invite.groupId);
      pendingInvite = {
        groupId: invite.groupId,
        fromUsername: invite.fromUsername,
        memberCount: g ? g.members.size : 0,
        maxMembers: GROUP_MAX_MEMBERS,
      };
    }
    return {
      ...snap,
      pendingInvite,
      inviteablePlayers: group && group.leaderId === uid ? _inviteablePlayers(uid) : [],
    };
  }

  function _emitStateToUserId(userId) {
    const entry = _socketEntryForUserId(userId);
    if (!entry?.socket) return;
    entry.socket.emit(GROUP_EVENTS.STATE, _buildPayloadForPlayer(entry.player));
  }

  function _broadcastGroup(groupId) {
    const g = groups.get(groupId);
    if (!g) return;
    for (const uid of g.members.keys()) _emitStateToUserId(uid);
  }

  function _fail(cb, error) {
    if (typeof cb === 'function') cb({ ok: false, error });
    return { ok: false, error };
  }

  function _ok(cb, extra = {}) {
    const res = { ok: true, ...extra };
    if (typeof cb === 'function') cb(res);
    return res;
  }

  function _purgeExpiredInvites() {
    const now = Date.now();
    for (const [uid, inv] of pendingInvites) {
      if (now - inv.createdAt > GROUP_INVITE_TTL_MS) pendingInvites.delete(uid);
    }
  }

  function _disbandGroup(groupId, reason) {
    const g = groups.get(groupId);
    if (!g) return;
    for (const uid of g.members.keys()) {
      memberOf.delete(uid);
      pendingInvites.delete(uid);
      _emitStateToUserId(uid);
    }
    groups.delete(groupId);
    if (reason) log.info('groups', 'disband', { groupId, reason });
  }

  function _removeMember(groupId, userId, reason) {
    const g = groups.get(groupId);
    if (!g) return;
    const uid = _normId(userId);
    g.members.delete(uid);
    memberOf.delete(uid);
    pendingInvites.delete(uid);
    if (g.members.size === 0) {
      groups.delete(groupId);
      log.info('groups', 'empty removed', { groupId, reason });
      return;
    }
    if (g.leaderId === uid) {
      const next = g.members.keys().next().value;
      g.leaderId = next;
      log.info('groups', 'leader transfer', { groupId, newLeader: next });
    }
    _broadcastGroup(groupId);
    _emitStateToUserId(uid);
    if (reason) log.info('groups', 'member removed', { groupId, userId: uid, reason });
  }

  function onConnect(player) {
    _purgeExpiredInvites();
    const uid = _normId(player.id);
    const groupId = memberOf.get(uid);
    if (groupId) {
      const g = groups.get(groupId);
      if (g) {
        const m = g.members.get(uid);
        if (m) m.username = player.username;
      }
    }
    _emitStateToUserId(uid);
  }

  function onDisconnect(player) {
    const uid = _normId(player.id);
    const groupId = memberOf.get(uid);
    if (groupId) _broadcastGroup(groupId);
    const invite = pendingInvites.get(uid);
    if (invite) {
      pendingInvites.delete(uid);
      _broadcastGroup(invite.groupId);
    }
  }

  function handleCreate(player, cb) {
    _purgeExpiredInvites();
    const uid = _normId(player.id);
    if (memberOf.has(uid)) return _fail(cb, 'Vous êtes déjà dans un groupe');
    const id = `g${_nextId++}`;
    const g = {
      id,
      leaderId: uid,
      members: new Map([[uid, { userId: uid, username: player.username }]]),
    };
    groups.set(id, g);
    memberOf.set(uid, id);
    log.info('groups', 'create', { groupId: id, leader: player.username });
    _broadcastGroup(id);
    return _ok(cb);
  }

  function handleInvite(player, username, cb) {
    _purgeExpiredInvites();
    const uid = _normId(player.id);
    const groupId = memberOf.get(uid);
    if (!groupId) return _fail(cb, 'Vous n\'êtes pas dans un groupe');
    const g = groups.get(groupId);
    if (!g || g.leaderId !== uid) return _fail(cb, 'Seul le chef peut inviter');
    if (g.members.size >= GROUP_MAX_MEMBERS) return _fail(cb, 'Groupe complet');
    const target = _findOnlineByUsername(username);
    if (!target) return _fail(cb, 'Joueur introuvable en ligne');
    const targetId = _normId(target.id);
    if (targetId === uid) return _fail(cb, 'Vous ne pouvez pas vous inviter');
    if (memberOf.has(targetId)) return _fail(cb, `${target.username} est déjà dans un groupe`);
    if (pendingInvites.has(targetId)) return _fail(cb, `${target.username} a déjà une invitation en attente`);
    pendingInvites.set(targetId, {
      groupId,
      fromUserId: uid,
      fromUsername: player.username,
      createdAt: Date.now(),
    });
    log.info('groups', 'invite', { groupId, from: player.username, to: target.username });
    const entry = _socketEntryForUserId(targetId);
    if (entry?.socket) {
      entry.socket.emit(GROUP_EVENTS.INVITE, {
        groupId,
        fromUsername: player.username,
        memberCount: g.members.size,
        maxMembers: GROUP_MAX_MEMBERS,
      });
      _emitStateToUserId(targetId);
    }
    _emitStateToUserId(uid);
    return _ok(cb, { invited: target.username });
  }

  function handleInviteRespond(player, accept, cb) {
    _purgeExpiredInvites();
    const uid = _normId(player.id);
    const invite = pendingInvites.get(uid);
    if (!invite) return _fail(cb, 'Aucune invitation en attente');
    pendingInvites.delete(uid);
    if (!accept) {
      _emitStateToUserId(uid);
      const leaderEntry = _socketEntryForUserId(invite.fromUserId);
      if (leaderEntry?.socket) _emitStateToUserId(invite.fromUserId);
      return _ok(cb, { declined: true });
    }
    if (memberOf.has(uid)) return _fail(cb, 'Vous êtes déjà dans un groupe');
    const g = groups.get(invite.groupId);
    if (!g) return _fail(cb, 'Ce groupe n\'existe plus');
    if (g.members.size >= GROUP_MAX_MEMBERS) return _fail(cb, 'Groupe complet');
    g.members.set(uid, { userId: uid, username: player.username });
    memberOf.set(uid, invite.groupId);
    log.info('groups', 'join', { groupId: invite.groupId, user: player.username });
    _broadcastGroup(invite.groupId);
    return _ok(cb, { joined: true });
  }

  function handleKick(player, targetUserId, cb) {
    const uid = _normId(player.id);
    const groupId = memberOf.get(uid);
    if (!groupId) return _fail(cb, 'Vous n\'êtes pas dans un groupe');
    const g = groups.get(groupId);
    if (!g || g.leaderId !== uid) return _fail(cb, 'Seul le chef peut retirer un membre');
    const targetId = _normId(targetUserId);
    if (targetId === uid) return _fail(cb, 'Utilisez « Quitter » ou « Dissoudre »');
    if (!g.members.has(targetId)) return _fail(cb, 'Ce joueur n\'est pas dans votre groupe');
    _removeMember(groupId, targetId, 'kick');
    return _ok(cb);
  }

  function handleLeave(player, cb) {
    const uid = _normId(player.id);
    const groupId = memberOf.get(uid);
    if (!groupId) return _fail(cb, 'Vous n\'êtes pas dans un groupe');
    _removeMember(groupId, uid, 'leave');
    return _ok(cb);
  }

  function handleDisband(player, cb) {
    const uid = _normId(player.id);
    const groupId = memberOf.get(uid);
    if (!groupId) return _fail(cb, 'Vous n\'êtes pas dans un groupe');
    const g = groups.get(groupId);
    if (!g || g.leaderId !== uid) return _fail(cb, 'Seul le chef peut dissoudre le groupe');
    _disbandGroup(groupId, 'disband');
    return _ok(cb);
  }

  function onRosterChange() {
    for (const groupId of groups.keys()) _broadcastGroup(groupId);
    for (const uid of pendingInvites.keys()) _emitStateToUserId(uid);
  }

  function areSameGroup(userIdA, userIdB) {
    const a = memberOf.get(_normId(userIdA));
    const b = memberOf.get(_normId(userIdB));
    return !!(a && b && a === b);
  }

  return {
    onConnect,
    onDisconnect,
    onRosterChange,
    areSameGroup,
    handleCreate,
    handleInvite,
    handleInviteRespond,
    handleKick,
    handleLeave,
    handleDisband,
  };
}
