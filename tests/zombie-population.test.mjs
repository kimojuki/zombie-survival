import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickZombiesToTrim, zombieTrimScore } from '../apps/server/src/zombie-population.js';

describe('zombie population trim', () => {
  it('keeps closest zombies to spawn when trimming excess', () => {
    const spawn = { x: 0, z: 0 };
    const zombies = [
      { id: 1, x: 5, z: 0 },
      { id: 2, x: 200, z: 0 },
      { id: 3, x: 10, z: 0 },
    ];
    const trim = pickZombiesToTrim(zombies, 2, [], spawn);
    assert.equal(trim.length, 1);
    assert.equal(trim[0].id, 2);
  });

  it('keeps closest zombies to players when online', () => {
    const players = [{ x: 0, z: 0 }];
    const zombies = [
      { id: 1, x: 5, z: 0 },
      { id: 2, x: 100, z: 0 },
      { id: 3, x: 8, z: 0 },
    ];
    const trim = pickZombiesToTrim(zombies, 2, players, null);
    assert.equal(trim.length, 1);
    assert.equal(trim[0].id, 2);
  });

  it('returns empty when at or below target', () => {
    const zombies = [{ id: 1, x: 0, z: 0 }];
    assert.deepEqual(pickZombiesToTrim(zombies, 2, [], { x: 0, z: 0 }), []);
  });

  it('zombieTrimScore prefers distance to nearest player', () => {
    const players = [{ x: 0, z: 0 }];
    assert.ok(zombieTrimScore({ x: 50, z: 0 }, players, null)
      > zombieTrimScore({ x: 5, z: 0 }, players, null));
  });
});
