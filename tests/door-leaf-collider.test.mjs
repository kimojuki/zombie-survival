import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DOOR_OPEN_ANGLE,
  transformOpenDoorLeaf,
} from '../packages/shared/src/door-leaf-collider.mjs';
import { survivorShackDoorLeafColliderDef } from '../packages/shared/src/survivor-shack-door.mjs';
import { resolveAgentAgainstCollider } from '../packages/shared/src/collider-resolve.mjs';

test('open door leaf moves off doorway center', () => {
  const closed = survivorShackDoorLeafColliderDef();
  const open = transformOpenDoorLeaf(closed, DOOR_OPEN_ANGLE);
  assert.notEqual(open.lx, closed.lx);
  assert.notEqual(open.lz, closed.lz);
  assert.equal(open.localRotY, DOOR_OPEN_ANGLE);
});

test('open shack door blocks agent on swung panel, not doorway', () => {
  const closed = survivorShackDoorLeafColliderDef();
  const open = transformOpenDoorLeaf(closed, DOOR_OPEN_ANGLE);
  const col = {
    type: 'box',
    cx: 165.1,
    cz: 7.1,
    rotY: 0.55,
    baseY: 7,
    decorId: 'shack_door',
    ...open,
  };
  const doorway = resolveAgentAgainstCollider(col, 165.1, 7.1, 0.4, 7);
  assert.equal(doorway, null, 'doorway center should stay walkable');
  const onPanel = resolveAgentAgainstCollider(col, 164.5, 6.2, 0.4, 7);
  assert.ok(onPanel, 'swung door panel should block');
});
