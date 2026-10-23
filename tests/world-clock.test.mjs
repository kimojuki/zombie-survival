import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { worldTimeToClockHands, advanceClockHandRotationZ } from '../packages/shared/src/world-clock.mjs';

const PI2 = Math.PI * 2;
const HALF = Math.PI / 2;

describe('world-clock', () => {
  it('midi — aiguilles sur 12h', () => {
    const a = worldTimeToClockHands(0.5);
    assert.ok(Math.abs(a.hourZ) < 1e-9);
    assert.ok(Math.abs(a.minuteZ) < 1e-9);
    assert.ok(Math.abs(a.hour24 - 12) < 1e-6);
  });

  it('minuit — aiguilles sur 12h', () => {
    const a = worldTimeToClockHands(0);
    assert.ok(Math.abs(a.hourZ) < 1e-9);
    assert.ok(Math.abs(a.minuteZ) < 1e-9);
  });

  it('6h00 — petite aiguille sur 6', () => {
    const a = worldTimeToClockHands(0.25);
    assert.ok(Math.abs(a.hourZ - Math.PI) < 1e-6);
    assert.ok(Math.abs(a.minuteZ) < 1e-6);
  });

  it('3h00 — petite aiguille sur 3', () => {
    const a = worldTimeToClockHands(0.125);
    assert.ok(Math.abs(a.hourZ - HALF) < 1e-6);
  });

  it('sens horaire — +15 min avance la grande aiguille', () => {
    const a0 = worldTimeToClockHands(0.5);
    const a1 = worldTimeToClockHands(0.5 + 15 / (24 * 60));
    assert.ok(a1.minuteZ > a0.minuteZ);
    assert.ok(Math.abs(a1.minuteZ - a0.minuteZ - PI2 / 4) < 0.02);
  });

  it('petite aiguille — pas de double comptage des minutes sur l\'heure', () => {
    const before = worldTimeToClockHands(59 / (24 * 60));
    const after = worldTimeToClockHands(61 / (24 * 60));
    assert.ok(after.hourZ > before.hourZ);
    assert.ok(after.hourZ - before.hourZ < PI2 / 12 / 3);
  });

  it('59→61 min — advanceClockHandRotationZ sens horaire (delta négatif)', () => {
    const m59 = worldTimeToClockHands(59 / (24 * 60));
    const rz = advanceClockHandRotationZ(m59.minuteZ, 2, 60);
    assert.ok(rz < m59.minuteZ);
    assert.ok(Math.abs(m59.minuteZ - rz - PI2 / 30) < 0.02);
  });
});
