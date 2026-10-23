'use strict';

/**
 * Pont CJS vers roles.mjs (ESM) pour le serveur.
 */
const { pathToFileURL } = require('url');
const path = require('path');

const ROLES_URL = pathToFileURL(
  path.join(__dirname, '../../../packages/shared/src/roles.mjs'),
).href;

let _mod = null;

const _loadPromise = import(ROLES_URL).then((m) => {
  _mod = m;
  return m;
});

async function loadRolesModule() {
  if (_mod) return _mod;
  return _loadPromise;
}

// Sync re-export after first load — player-roles uses sync API
const syncProxy = new Proxy({}, {
  get(_t, prop) {
    if (_mod) return _mod[prop];
    throw new Error('roles module not loaded — call initRolesBridge() at boot');
  },
});

async function initRolesBridge() {
  return loadRolesModule();
}

function rolesReady() {
  return !!_mod;
}

module.exports = {
  initRolesBridge,
  rolesReady,
  get PERMISSIONS() { return syncProxy.PERMISSIONS; },
  get ROLES() { return syncProxy.ROLES; },
  get ROLE_IDS() { return syncProxy.ROLE_IDS; },
  get ASSIGNABLE_ROLE_IDS() { return syncProxy.ASSIGNABLE_ROLE_IDS; },
  get normUsername() { return syncProxy.normUsername; },
  get isValidRoleId() { return syncProxy.isValidRoleId; },
  get getRoleDef() { return syncProxy.getRoleDef; },
  get permissionsForRole() { return syncProxy.permissionsForRole; },
  get roleHasPermission() { return syncProxy.roleHasPermission; },
  get hasPermissionInList() { return syncProxy.hasPermissionInList; },
  get canAssignRole() { return syncProxy.canAssignRole; },
  get canRevokeRole() { return syncProxy.canRevokeRole; },
  get buildAuthPayload() { return syncProxy.buildAuthPayload; },
  get roleCatalogForClient() { return syncProxy.roleCatalogForClient; },
};
