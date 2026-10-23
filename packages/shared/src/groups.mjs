/** Gestion des groupes joueurs (party) — constantes et helpers partagés. */

export const GROUP_MAX_MEMBERS = 6;
export const GROUP_INVITE_TTL_MS = 5 * 60 * 1000;

export const GROUP_EVENTS = Object.freeze({
  STATE: 'group-state',
  INVITE: 'group-invite',
  UPDATE: 'group-update',
});

/**
 * @param {object|null} group — { id, leaderId, members: Map|Array }
 * @param {number|string} selfUserId
 * @param {Set<number|string>} onlineUserIds
 */
export function buildGroupSnapshot(group, selfUserId, onlineUserIds = new Set()) {
  if (!group) {
    return { inGroup: false, maxMembers: GROUP_MAX_MEMBERS };
  }
  const raw = group.members instanceof Map ? [...group.members.values()] : (group.members || []);
  const members = raw.map((m) => ({
    userId: m.userId,
    username: m.username,
    online: onlineUserIds.has(m.userId),
    isLeader: m.userId === group.leaderId,
    isSelf: m.userId === selfUserId,
  }));
  members.sort((a, b) => {
    if (a.isLeader !== b.isLeader) return a.isLeader ? -1 : 1;
    return String(a.username).localeCompare(String(b.username), 'fr');
  });
  return {
    inGroup: true,
    groupId: group.id,
    leaderId: group.leaderId,
    isLeader: group.leaderId === selfUserId,
    members,
    memberCount: members.length,
    maxMembers: GROUP_MAX_MEMBERS,
  };
}

/** @param {string} name */
export function normalizeUsernameQuery(name) {
  return String(name || '').trim().toLowerCase();
}
