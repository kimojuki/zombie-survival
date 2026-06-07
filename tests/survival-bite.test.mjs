import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyZombieMeleeSurvival,
  ZOMBIE_BITE_ATTACK_CHANCE,
  ZOMBIE_BITE_INFECT_CHANCE,
} from '../packages/shared/src/survival.mjs';

describe('zombie bite infection', () => {
  it('scratch hit does not infect', () => {
    const sv = { infection: 0, saignement: false };
    let i = 0;
    const seq = [0.99, 0.5, 0.5];
    const rnd = () => seq[i++];
    const r = applyZombieMeleeSurvival(sv, 8, rnd);
    assert.equal(r.bit, false);
    assert.equal(r.infected, false);
    assert.equal(sv.infection, 0);
  });

  it('bite without virus does not raise infection bar', () => {
    const sv = { infection: 0, saignement: false };
    let i = 0;
    const seq = [0.1, 0.99];
    const rnd = () => seq[i++];
    const r = applyZombieMeleeSurvival(sv, 8, rnd);
    assert.equal(r.bit, true);
    assert.equal(r.infected, false);
    assert.equal(sv.infection, 0);
  });

  it('infected bite adds infection only on bite path', () => {
    const sv = { infection: 0, saignement: false };
    let i = 0;
    const seq = [0.1, 0.1, 0];
    const rnd = () => seq[i++];
    const r = applyZombieMeleeSurvival(sv, 8, rnd);
    assert.equal(r.infected, true);
    assert.ok(sv.infection >= 10);
    assert.ok(sv.infection <= 22);
  });

  it('constants are sensible probabilities', () => {
    assert.ok(ZOMBIE_BITE_ATTACK_CHANCE > 0 && ZOMBIE_BITE_ATTACK_CHANCE < 1);
    assert.ok(ZOMBIE_BITE_INFECT_CHANCE > 0 && ZOMBIE_BITE_INFECT_CHANCE < 1);
  });
});
