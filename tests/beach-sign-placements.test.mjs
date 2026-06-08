import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBeachSignPlacements,
  BEACH_SIGN_PLACEMENT_KEY,
} from '../packages/shared/src/beach-sign-placements.mjs';
import { isOnBeachSafeSand } from '../packages/shared/src/beach-spawn.mjs';

test('beach exit sign and torch are on safe sand near trail mouth', () => {
  const signs = computeBeachSignPlacements();
  assert.equal(signs.length, 2);
  const board = signs.find((s) => s.prefabId === 'sign_beach_exit');
  const torch = signs.find((s) => s.prefabId === 'beach_exit_torch');
  assert.ok(board);
  assert.ok(torch);
  assert.equal(board.placementKey, BEACH_SIGN_PLACEMENT_KEY);
  assert.ok(isOnBeachSafeSand(board.x, board.z), 'sign must sit on beach sand');
  assert.ok(isOnBeachSafeSand(torch.x, torch.z), 'torch must sit on beach sand');
});
