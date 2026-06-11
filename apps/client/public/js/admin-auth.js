// Permissions & rôles CMS — cache client synchronisé avec le serveur.
(function () {
  'use strict';

  let _role = 'player';
  let _roleLabel = 'Joueur';
  let _roleColor = '#8a94a4';
  let _permissions = [];

  function _save() {
    try {
      localStorage.setItem('zs_role', _role);
      localStorage.setItem('zs_role_label', _roleLabel);
      localStorage.setItem('zs_permissions', JSON.stringify(_permissions));
      localStorage.setItem('zombie_is_admin', hasPerm('hub.access') ? '1' : '0');
    } catch (_) { /* quota */ }
  }

  function loadFromAuth(data) {
    if (!data || typeof data !== 'object') return;
    _role = data.role || 'player';
    _roleLabel = data.roleLabel || 'Joueur';
    _roleColor = data.roleColor || '#8a94a4';
    _permissions = Array.isArray(data.permissions) ? data.permissions.slice() : [];
    if (data.isAdmin && !hasPerm('hub.access') && _permissions.length === 0) {
      _permissions = ['*'];
    }
    _save();
  }

  function initFromStorage() {
    try {
      _role = localStorage.getItem('zs_role') || 'player';
      _roleLabel = localStorage.getItem('zs_role_label') || 'Joueur';
      _permissions = JSON.parse(localStorage.getItem('zs_permissions') || '[]');
    } catch (_) {
      _permissions = [];
    }
  }

  function hasPerm(perm) {
    if (!perm) return false;
    if (_permissions.includes('*')) return true;
    return _permissions.includes(perm);
  }

  function getRole() {
    return { id: _role, label: _roleLabel, color: _roleColor };
  }

  function isAdmin() {
    return hasPerm('hub.access');
  }

  initFromStorage();

  window.ZS = window.ZS || {};
  ZS.AdminAuth = {
    loadFromAuth,
    initFromStorage,
    hasPerm,
    getRole,
    isAdmin,
    getPermissions: () => _permissions.slice(),
  };
}());
