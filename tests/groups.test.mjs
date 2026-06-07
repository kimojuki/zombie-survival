import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GROUP_MAX_MEMBERS,
  buildGroupSnapshot,
  normalizeUsernameQuery,
} from '../packages/shared/src/groups.mjs';

test('buildGroupSnapshot — pas de groupe', () => {
  const snap = buildGroupSnapshot(null, 1);
  assert.equal(snap.inGroup, false);
  assert.equal(snap.maxMembers, GROUP_MAX_MEMBERS);
});

test('buildGroupSnapshot — groupe avec leader et membres', () => {
  const group = {
    id: 'g1',
    leaderId: 10,
    members: new Map([
      [10, { userId: 10, username: 'Alpha' }],
      [20, { userId: 20, username: 'Beta' }],
    ]),
  };
  const online = new Set([10]);
  const snap = buildGroupSnapshot(group, 10, online);
  assert.equal(snap.inGroup, true);
  assert.equal(snap.isLeader, true);
  assert.equal(snap.memberCount, 2);
  assert.equal(snap.members[0].isLeader, true);
  assert.equal(snap.members[0].online, true);
  assert.equal(snap.members[1].online, false);
});

test('normalizeUsernameQuery', () => {
  assert.equal(normalizeUsernameQuery('  Foo '), 'foo');
  assert.equal(normalizeUsernameQuery(''), '');
});
