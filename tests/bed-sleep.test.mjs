import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isBedSleepPrefab,
  tickBedSleep,
  BED_SLEEP_HP_PER_SEC,
} from '../packages/shared/src/bed-sleep.mjs';

describe('bed sleep', () => {
  it('recognizes single bed prefab', () => {
    assert.equal(isBedSleepPrefab('spawn_single_bed'), true);
    assert.equal(isBedSleepPrefab('spawn_bedroll'), false);
  });

  it('regens hp and drains hunger/thirst over time', () => {
    const p = {
      health: 40,
      inv: {},
      survival: { faim: 80, soif: 80, infection: 0, saignement: false },
    };
    const r = tickBedSleep(p, 1, () => 100);
    assert.ok(r.hpGained > 0);
    assert.ok(r.hpGained <= BED_SLEEP_HP_PER_SEC + 0.01);
    assert.ok(p.survival.faim < 80);
    assert.ok(p.survival.soif < 80);
    assert.ok(p.health > 40);
  });

  it('does not exceed max hp', () => {
    const p = {
      health: 98,
      inv: {},
      survival: { faim: 50, soif: 50 },
    };
    tickBedSleep(p, 2, () => 100);
    assert.equal(p.health, 100);
  });
});
