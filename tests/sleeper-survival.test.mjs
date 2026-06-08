import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  tickSleeperSurvival,
  catchUpSleeperSurvival,
} from '../apps/server/src/survival-tick.js';

function sleeper(overrides = {}) {
  return {
    health: 75,
    survival: { faim: 80, soif: 80, infection: 40, saignement: true },
    since: Date.now() - 60000,
    ...overrides,
  };
}

describe('sleeper survival', () => {
  it('decays hunger and thirst but not health', () => {
    const s = sleeper();
    tickSleeperSurvival(s, 60);
    assert.ok(s.survival.faim < 80);
    assert.ok(s.survival.soif < 80);
    assert.equal(s.health, 75);
  });

  it('does not progress infection or apply bleeding', () => {
    const s = sleeper({ survival: { faim: 80, soif: 80, infection: 55, saignement: true } });
    tickSleeperSurvival(s, 120);
    assert.equal(s.survival.infection, 55);
    assert.equal(s.survival.saignement, true);
    assert.equal(s.health, 75);
  });

  it('catch-up uses elapsed offline time', () => {
    const now = Date.now();
    const s = sleeper({
      lastSurvivalTickAt: now - 30000,
      survival: { faim: 50, soif: 50, infection: 0, saignement: false },
    });
    const dt = catchUpSleeperSurvival(s, now);
    assert.ok(dt >= 29);
    assert.ok(s.survival.faim < 50);
    assert.equal(s.health, 75);
    assert.equal(s.lastSurvivalTickAt, now);
  });

  it('skips dead sleepers', () => {
    const s = sleeper({ dead: true, health: 0 });
    assert.equal(catchUpSleeperSurvival(s), 0);
    assert.equal(s.survival.faim, 80);
  });
});
