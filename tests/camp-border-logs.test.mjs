import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMP_BORDER_LOG,
  computeCampBorderLogPlacements,
} from '../packages/shared/src/camp-border-logs.mjs';

test('camp border logs cover most of the ellipse arc', () => {
  const logs = computeCampBorderLogPlacements(0, -6);
  assert.ok(logs.length >= CAMP_BORDER_LOG.MIN_LOG_COUNT);
  const first = logs[0];
  const last = logs[logs.length - 1];
  assert.ok(Math.abs(first.logLen - last.logLen) < 0.001);
  assert.ok(Math.abs(first.scale - last.scale) < 0.001);
  assert.ok(first.logLen > 0.35 && first.logLen < 0.5);
});

test('border log scales match base length ratio', () => {
  const [log] = computeCampBorderLogPlacements();
  assert.ok(Math.abs(log.scale - log.logLen / CAMP_BORDER_LOG.BASE_LOG_LEN) < 0.001);
});
