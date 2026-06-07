import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tickPlayerSurvival } from '../apps/server/src/survival-tick.js';

function player(overrides = {}) {
  return {
    health: 100,
    inv: { hotbar: [], bag: [], equip: {} },
    survival: { faim: 80, soif: 80, infection: 0, saignement: false },
    ...overrides,
  };
}

describe('survival tick', () => {
  it('decays hunger and thirst over time', () => {
    const p = player();
    tickPlayerSurvival(p, 10, () => 100);
    assert.ok(p.survival.faim < 80);
    assert.ok(p.survival.soif < 80);
  });

  it('bleeding deals damage', () => {
    const p = player({ survival: { faim: 80, soif: 80, infection: 0, saignement: true } });
    const { dmg } = tickPlayerSurvival(p, 1, () => 100);
    assert.ok(dmg > 0);
    assert.ok(p.health < 100);
  });

  it('infection at 100 kills player', () => {
    const p = player({ survival: { faim: 80, soif: 80, infection: 100, saignement: false } });
    const { died, reason } = tickPlayerSurvival(p, 1, () => 100);
    assert.equal(died, true);
    assert.equal(reason, 'infection');
    assert.equal(p.health, 0);
  });

  it('starvation damage when hunger empty', () => {
    const p = player({ survival: { faim: 0, soif: 80, infection: 0, saignement: false } });
    const { dmg } = tickPlayerSurvival(p, 1, () => 100);
    assert.ok(dmg > 0);
  });
});
