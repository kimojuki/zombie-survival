'use strict';

const GUEST_USERNAME_PREFIX = 'Invite_';

function parseOwnerUsers() {
  const keys = ['OWNER_USERS', 'ADMIN_USERS'];
  const set = new Set();
  for (const key of keys) {
    for (const part of (process.env[key] || '').split(',')) {
      const name = part.trim().toLowerCase();
      if (name) set.add(name);
    }
  }
  return set;
}

const OWNER_USERS = parseOwnerUsers();
const RCON_AUTO_ADMIN = process.env.RCON_AUTO_ADMIN === 'true'
  && (process.env.AUTH_DB_CLIENT || process.env.DB_CLIENT || 'sqlite') === 'sqlite';

function canAccessDevServer(username) {
  const u = (username || '').toLowerCase();
  return OWNER_USERS.has(u) || RCON_AUTO_ADMIN;
}

function devAccessPayload() {
  return {
    error: 'Serveur dev réservé aux administrateurs',
    code: 'dev_admin_only',
  };
}

function assertAccountNotBanned(account) {
  if (account?.banned) {
    return {
      ok: false,
      status: 403,
      body: {
        error: account.ban_reason || 'Compte suspendu',
        code: 'banned',
      },
    };
  }
  return null;
}

function assertDevAccess(username, serverRole) {
  if (serverRole === 'dev' && !canAccessDevServer(username)) {
    return { ok: false, status: 403, body: devAccessPayload() };
  }
  return null;
}

function isDevServer() {
  const role = (process.env.SERVER_ROLE || 'prod').toLowerCase();
  return role === 'dev';
}

function assertGuestRegisterAllowed() {
  if (isDevServer()) {
    return { ok: false, status: 403, body: devAccessPayload() };
  }
  return null;
}

function isGuestUsername(username) {
  return typeof username === 'string' && username.startsWith(GUEST_USERNAME_PREFIX);
}

function validateUsername(username) {
  if (!username || username.length < 3 || username.length > 50) {
    return 'Nom: 3-50 caractères';
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return 'Nom invalide (a-z, 0-9, _, -)';
  }
  if (isGuestUsername(username)) {
    return 'Ce préfixe est réservé aux invités';
  }
  return null;
}

function validatePassword(password) {
  if (!password || password.length < 6) return 'Mot de passe: min 6 caractères';
  return null;
}

function getServerRoleForAuth() {
  const role = (process.env.SERVER_ROLE || 'prod').toLowerCase();
  return ['dev', 'qa', 'prod'].includes(role) ? role : 'prod';
}

module.exports = {
  OWNER_USERS,
  canAccessDevServer,
  devAccessPayload,
  assertAccountNotBanned,
  assertDevAccess,
  assertGuestRegisterAllowed,
  validateUsername,
  validatePassword,
  getServerRoleForAuth,
  isDevServer,
  isGuestUsername,
};
