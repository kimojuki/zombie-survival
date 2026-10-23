import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tickPlayerSurvival } from '../apps/server/src/survival-tick.js';
import { HUNGER_DECAY_PER_SEC, THIRST_DECAY_PER_SEC } from '../packages/shared/src/survival.mjs';

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

  it('hunger/thirst decay at a sustainable pace (not drain in minutes)', () => {
    const p = player();
    tickPlayerSurvival(p, 60, () => 100);
    const hungerDrop = 80 - p.survival.faim;
    const thirstDrop = 80 - p.survival.soif;
    assert.ok(Math.abs(hungerDrop - HUNGER_DECAY_PER_SEC * 60) < 0.01);
    assert.ok(Math.abs(thirstDrop - THIRST_DECAY_PER_SEC * 60) < 0.01);
    assert.ok(p.survival.faim > 77);
    assert.ok(p.survival.soif > 76);
  });

  it('bleeding deals damage', () => {
    const p = player({ survival: { faim: 80, soif: 80, infection: 0, saignement: true } });
    const { dmg } = tickPlayerSurvival(p, 1, () => 100);
    assert.ok(dmg > 0);
    assert.ok(p.health < 100);
  });

  it('pauses infection while antiviral active', () => {
    const p = player({
      survival: {
        faim: 80, soif: 80, infection: 40, saignement: false,
        infectionPausedUntil: Date.now() + 120000,
      },
    });
    tickPlayerSurvival(p, 30, () => 100);
    assert.equal(p.survival.infection, 40);
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
