import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLES,
  ROLE_IDS,
  roleHasPermission,
  canAssignRole,
  canRevokeRole,
  buildAuthPayload,
  permissionsForRole,
} from '../packages/shared/src/roles.mjs';

test('roles catalog includes owner and player defaults', () => {
  assert.ok(ROLE_IDS.includes('owner'));
  assert.ok(ROLE_IDS.includes('super_admin'));
  assert.ok(ROLE_IDS.includes('player'));
  assert.equal(ROLES.owner.level, 100);
  assert.equal(ROLES.player.permissions.length, 0);
});

test('owner has wildcard permissions', () => {
  assert.ok(roleHasPermission('owner', 'hub.access'));
  assert.ok(roleHasPermission('owner', 'players.roles'));
  const auth = buildAuthPayload('owner');
  assert.equal(auth.role, 'owner');
  assert.ok(auth.isAdmin);
  assert.ok(auth.rconEnabled);
  assert.ok(auth.permissions.includes('*'));
});

test('builder can edit decor but not assign roles', () => {
  assert.ok(roleHasPermission('builder', 'decor.edit'));
  assert.ok(!roleHasPermission('builder', 'players.roles'));
  assert.ok(!roleHasPermission('builder', 'rcon'));
});

test('super_admin can assign admin but not owner', () => {
  const ok = canAssignRole({
    actorRole: 'super_admin',
    newRole: 'admin',
    targetRole: 'player',
  });
  assert.equal(ok.ok, true);

  const deny = canAssignRole({
    actorRole: 'super_admin',
    newRole: 'owner',
    targetRole: 'player',
  });
  assert.equal(deny.ok, false);
});

test('env owner cannot be demoted via revoke rules', () => {
  const deny = canRevokeRole({
    actorRole: 'super_admin',
    targetRole: 'owner',
    targetIsEnvOwner: true,
  });
  assert.equal(deny.ok, false);
});

test('moderator permissions are scoped', () => {
  const perms = permissionsForRole('moderator');
  assert.ok(perms.includes('players.manage'));
  assert.ok(!perms.includes('decor.edit'));
});
