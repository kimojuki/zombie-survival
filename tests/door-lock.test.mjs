import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  playerHasDoorKey,
  flattenInvForDeath,
} from '../packages/shared/src/door-lock.mjs';

describe('door lock', () => {
  it('playerHasDoorKey matches lockId on struct_cle', () => {
    const inv = {
      hotbar: [{ type: 'struct_cle', qty: 1, lockId: 'lock_abc' }, null],
      bag: [],
      equip: {},
    };
    assert.equal(playerHasDoorKey(inv, 'lock_abc'), true);
    assert.equal(playerHasDoorKey(inv, 'lock_xyz'), false);
  });

  it('flattenInvForDeath preserves key lockId', () => {
    const loot = flattenInvForDeath({
      hotbar: [{ type: 'struct_cle', qty: 1, lockId: 'lock_42' }],
      bag: [{ type: 'res_planche', qty: 3 }],
      equip: {},
    });
    assert.equal(loot.length, 2);
    assert.equal(loot[0].lockId, 'lock_42');
    assert.equal(loot[1].type, 'res_planche');
  });
});
