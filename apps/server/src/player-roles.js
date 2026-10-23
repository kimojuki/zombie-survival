'use strict';

const rb = require('./roles-bridge');

/**
 * Persistance & résolution des rôles joueurs.
 * Propriétaires .env (OWNER_USERS + ADMIN_USERS) = owner non rétrogradable.
 */
function createPlayerRolesService(pool, { ownerUsers, rconAutoAdmin, log }) {
  const owners = ownerUsers instanceof Set ? ownerUsers : new Set(ownerUsers || []);
  /** @type {Map<string, { role: string, assignedBy: string|null, updatedAt: string|null }>} */
  const cache = new Map();

  function isEnvOwner(username) {
    return owners.has(rb.normUsername(username));
  }

  function resolveRoleId(username) {
    const un = rb.normUsername(username);
    if (rconAutoAdmin) return 'owner';
    if (owners.has(un)) return 'owner';
    const row = cache.get(un);
    return row?.role && rb.isValidRoleId(row.role) ? row.role : 'player';
  }

  function getAuthForUser(username) {
    const roleId = resolveRoleId(username);
    return rb.buildAuthPayload(roleId, { envOwner: isEnvOwner(username) });
  }

  function hasPermission(username, perm) {
    if (!perm) return false;
    if (rconAutoAdmin) return true;
    const auth = getAuthForUser(username);
    return rb.hasPermissionInList(auth.permissions, perm);
  }

  function canManageRole(actorUsername, newRole, targetUsername) {
    const actorRole = resolveRoleId(actorUsername);
    const targetRole = resolveRoleId(targetUsername);
    return rb.canAssignRole({
      actorRole,
      newRole,
      targetRole,
      targetIsEnvOwner: isEnvOwner(targetUsername),
      actorIsEnvOwner: isEnvOwner(actorUsername),
    });
  }

  function canRevoke(actorUsername, targetUsername) {
    const actorRole = resolveRoleId(actorUsername);
    const targetRole = resolveRoleId(targetUsername);
    return rb.canRevokeRole({
      actorRole,
      targetRole,
      targetIsEnvOwner: isEnvOwner(targetUsername),
      actorIsEnvOwner: isEnvOwner(actorUsername),
    });
  }

  async function ensureSchema() {
    const isMysql = pool.kind !== 'sqlite';
    if (isMysql) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS player_roles (
          username VARCHAR(50) PRIMARY KEY,
          role VARCHAR(32) NOT NULL DEFAULT 'player',
          assigned_by VARCHAR(50) NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      return;
    }
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS player_roles (
        username TEXT PRIMARY KEY,
        role TEXT NOT NULL DEFAULT 'player',
        assigned_by TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async function load() {
    await ensureSchema();
    const [rows] = await pool.execute(
      'SELECT username, role, assigned_by, updated_at FROM player_roles ORDER BY username'
    );
    cache.clear();
    for (const r of rows) {
      const un = rb.normUsername(r.username);
      if (!un) continue;
      cache.set(un, {
        role: rb.isValidRoleId(r.role) ? r.role : 'player',
        assignedBy: r.assigned_by || null,
        updatedAt: r.updated_at ? String(r.updated_at) : null,
      });
    }
    log?.info?.('roles', 'loaded', { count: cache.size, owners: owners.size });
    return cache.size;
  }

  async function setRole(username, roleId, assignedBy) {
    const un = rb.normUsername(username);
    if (!un) throw Object.assign(new Error('Username invalide'), { code: 'INVALID_USER' });
    if (!rb.isValidRoleId(roleId) || roleId === 'player') {
      throw Object.assign(new Error('Rôle invalide'), { code: 'INVALID_ROLE' });
    }
    if (isEnvOwner(un) && roleId !== 'owner') {
      throw Object.assign(new Error('Propriétaire .env non modifiable'), { code: 'ENV_OWNER' });
    }
    const by = assignedBy ? rb.normUsername(assignedBy) : null;
    if (pool.kind === 'sqlite') {
      await pool.execute(
        `INSERT OR REPLACE INTO player_roles (username, role, assigned_by, updated_at)
         VALUES (?, ?, ?, datetime('now'))`,
        [un, roleId, by]
      );
    } else {
      await pool.execute(
        `INSERT INTO player_roles (username, role, assigned_by) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE role=VALUES(role), assigned_by=VALUES(assigned_by)`,
        [un, roleId, by]
      );
    }
    cache.set(un, { role: roleId, assignedBy: by, updatedAt: new Date().toISOString() });
    log?.info?.('roles', 'assigned', { username: un, role: roleId, by });
    return getAuthForUser(un);
  }

  async function clearRole(username) {
    const un = rb.normUsername(username);
    if (!un) return false;
    if (isEnvOwner(un)) {
      throw Object.assign(new Error('Propriétaire .env non rétrogradable'), { code: 'ENV_OWNER' });
    }
    await pool.execute('DELETE FROM player_roles WHERE username = ?', [un]);
    cache.delete(un);
    log?.info?.('roles', 'cleared', { username: un });
    return true;
  }

  function listAssignments() {
    const out = [];
    for (const [username, row] of cache.entries()) {
      const auth = rb.buildAuthPayload(row.role);
      out.push({
        username,
        role: row.role,
        roleLabel: auth.roleLabel,
        roleColor: auth.roleColor,
        assignedBy: row.assignedBy,
        updatedAt: row.updatedAt,
        envOwner: isEnvOwner(username),
      });
    }
    out.sort((a, b) => a.username.localeCompare(b.username));
    return out;
  }

  function getCatalog() {
    return {
      roles: rb.roleCatalogForClient(),
      assignable: rb.ASSIGNABLE_ROLE_IDS,
      permissions: rb.PERMISSIONS,
    };
  }

  return {
    ensureSchema,
    load,
    resolveRoleId,
    getAuthForUser,
    hasPermission,
    canManageRole,
    canRevoke,
    setRole,
    clearRole,
    listAssignments,
    getCatalog,
    isEnvOwner,
    getRoleDef: (id) => rb.getRoleDef(id),
    roleHasPermission: (roleId, perm) => rb.roleHasPermission(roleId, perm),
  };
}

module.exports = { createPlayerRolesService };
