import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveS01Checkpoint,
  listS01Checkpoints,
} from '../packages/shared/src/s01-checkpoints.mjs';

describe('s01 checkpoints', () => {
  it('lists verification points', () => {
    const list = listS01Checkpoints();
    assert.ok(list.some((c) => c.id === 'cabane'));
    assert.ok(list.some((c) => c.id === 'plage'));
  });

  it('resolves aliases', () => {
    const view = resolveS01Checkpoint('cabin01');
    assert.equal(view?.id, 'cabane');
    assert.equal(view?.x, 169.1);
    const foot = resolveS01Checkpoint('repere');
    assert.equal(foot?.x, 165.1);
    assert.equal(foot?.z, 7.1);
  });

  it('returns null for unknown id', () => {
    assert.equal(resolveS01Checkpoint('nope'), null);
  });
});
