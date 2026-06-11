/**
 * Rôles & permissions — CMS admin multijoueur.
 * Source unique partagée client (affichage) / serveur (autorisation).
 */

export const PERMISSIONS = {
  'hub.access': 'Ouvrir le hub admin (F8)',
  'decor.edit': 'Éditer le décor en live',
  'decor.delete': 'Supprimer du décor',
  'world.map': 'Carte admin du monde',
  'prefab.catalog': 'Catalogue prefabs & revues',
  'players.view': 'Voir les joueurs connectés',
  'players.manage': 'Gérer les joueurs (kick, tp, heal…)',
  'players.roles': 'Attribuer des rôles',
  'calibration': 'Calibrages FPS & viewmodels',
  'scenario': 'Scénario & tests intro',
  'rcon': 'Console RCON',
  'rcon.dangerous': 'Commandes RCON destructives (wipe, kill…)',
  'dev.access': 'Accès serveur dev réservé',
};

const ALL_PERMS = Object.keys(PERMISSIONS);

/** @type {Record<string, { id: string, label: string, level: number, color: string, permissions: string[] }>} */
export const ROLES = {
  owner: {
    id: 'owner',
    label: 'Propriétaire',
    level: 100,
    color: '#f0c040',
    permissions: ['*'],
  },
  super_admin: {
    id: 'super_admin',
    label: 'Super admin',
    level: 90,
    color: '#e87850',
    permissions: [
      'hub.access', 'decor.edit', 'decor.delete', 'world.map', 'prefab.catalog',
      'players.view', 'players.manage', 'players.roles',
      'calibration', 'scenario', 'rcon', 'rcon.dangerous', 'dev.access',
    ],
  },
  admin: {
    id: 'admin',
    label: 'Administrateur',
    level: 70,
    color: '#6eb5ff',
    permissions: [
      'hub.access', 'decor.edit', 'decor.delete', 'world.map', 'prefab.catalog',
      'players.view', 'calibration', 'scenario', 'rcon',
    ],
  },
  moderator: {
    id: 'moderator',
    label: 'Modérateur',
    level: 50,
    color: '#9b7bff',
    permissions: ['hub.access', 'players.view', 'players.manage', 'rcon'],
  },
  builder: {
    id: 'builder',
    label: 'Builder',
    level: 40,
    color: '#5ecf8a',
    permissions: ['hub.access', 'decor.edit', 'world.map'],
  },
  tester: {
    id: 'tester',
    label: 'Testeur',
    level: 30,
    color: '#c8b464',
    permissions: ['hub.access', 'calibration', 'scenario'],
  },
  player: {
    id: 'player',
    label: 'Joueur',
    level: 0,
    color: '#8a94a4',
    permissions: [],
  },
};

export const ROLE_IDS = Object.keys(ROLES);

export const ASSIGNABLE_ROLE_IDS = ROLE_IDS.filter((id) => id !== 'player');

export function normUsername(username) {
  return String(username || '').trim().toLowerCase();
}

export function isValidRoleId(roleId) {
  return ROLE_IDS.includes(roleId);
}

export function getRoleDef(roleId) {
  return ROLES[roleId] || ROLES.player;
}

export function permissionsForRole(roleId) {
  const def = getRoleDef(roleId);
  if (def.permissions.includes('*')) return [...ALL_PERMS, '*'];
  return [...def.permissions];
}

export function roleHasPermission(roleId, perm) {
  const def = getRoleDef(roleId);
  if (def.permissions.includes('*')) return true;
  return def.permissions.includes(perm);
}

export function hasPermissionInList(permissions, perm) {
  if (!perm) return false;
  if (permissions.includes('*')) return true;
  return permissions.includes(perm);
}

/**
 * Peut-on attribuer `newRole` à `targetUsername` ?
 * @param {object} opts
 * @param {string} opts.actorRole
 * @param {string} opts.newRole
 * @param {string} [opts.targetRole]
 * @param {boolean} [opts.targetIsEnvOwner]
 * @param {boolean} [opts.actorIsEnvOwner]
 */
export function canAssignRole({
  actorRole,
  newRole,
  targetRole = 'player',
  targetIsEnvOwner = false,
  actorIsEnvOwner = false,
}) {
  if (!isValidRoleId(newRole) || newRole === 'player') {
    return { ok: false, error: 'Rôle invalide' };
  }
  if (!roleHasPermission(actorRole, 'players.roles') && !actorIsEnvOwner) {
    return { ok: false, error: 'Permission players.roles requise' };
  }
  if (newRole === 'owner' && actorRole !== 'owner' && !actorIsEnvOwner) {
    return { ok: false, error: 'Seul un propriétaire peut nommer un propriétaire' };
  }
  const actorLevel = getRoleDef(actorRole).level;
  const newLevel = getRoleDef(newRole).level;
  if (newLevel >= actorLevel && actorRole !== 'owner' && !actorIsEnvOwner) {
    return { ok: false, error: 'Vous ne pouvez pas attribuer un rôle égal ou supérieur au vôtre' };
  }
  if (targetIsEnvOwner && newRole !== 'owner') {
    return { ok: false, error: 'Propriétaire .env — rôle non rétrogradable' };
  }
  const targetLevel = getRoleDef(targetRole).level;
  if (targetLevel >= actorLevel && targetRole !== 'player' && actorRole !== 'owner' && !actorIsEnvOwner) {
    return { ok: false, error: 'Vous ne pouvez pas modifier ce joueur (rôle trop élevé)' };
  }
  return { ok: true };
}

/** Révoquer un rôle DB (repasser joueur standard). */
export function canRevokeRole({
  actorRole,
  targetRole = 'player',
  targetIsEnvOwner = false,
  actorIsEnvOwner = false,
}) {
  if (!roleHasPermission(actorRole, 'players.roles') && !actorIsEnvOwner) {
    return { ok: false, error: 'Permission players.roles requise' };
  }
  if (targetIsEnvOwner) {
    return { ok: false, error: 'Propriétaire .env — rôle non révocable' };
  }
  const actorLevel = getRoleDef(actorRole).level;
  const targetLevel = getRoleDef(targetRole).level;
  if (targetLevel >= actorLevel && targetRole !== 'player' && actorRole !== 'owner' && !actorIsEnvOwner) {
    return { ok: false, error: 'Vous ne pouvez pas révoquer ce joueur (rôle trop élevé)' };
  }
  return { ok: true };
}

export function buildAuthPayload(roleId, { envOwner = false } = {}) {
  const def = getRoleDef(roleId);
  const permissions = permissionsForRole(roleId);
  const isAdmin = hasPermissionInList(permissions, 'hub.access');
  const rconEnabled = hasPermissionInList(permissions, 'rcon');
  return {
    role: roleId,
    roleLabel: def.label,
    roleColor: def.color,
    roleLevel: def.level,
    permissions,
    isAdmin,
    rconEnabled,
    rconPreAuth: rconEnabled,
    envOwner: !!envOwner,
  };
}

export function roleCatalogForClient() {
  return ASSIGNABLE_ROLE_IDS.map((id) => {
    const def = ROLES[id];
    return {
      id,
      label: def.label,
      level: def.level,
      color: def.color,
      permissions: def.permissions.includes('*') ? ALL_PERMS : def.permissions,
    };
  });
}
