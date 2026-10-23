import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findShootTarget,
  findPlayerShootTarget,
  PLAYER_COLLIDE_RADIUS,
  rayHitXZ,
} from '../packages/shared/src/combat.mjs';

test('rayHitXZ detects point on segment', () => {
  const hit = rayHitXZ(0, 0, 1, 0, 10, 5, 0.3, 0.5);
  assert.ok(hit);
  assert.ok(Math.abs(hit.t - 5) < 0.01);
});

test('findShootTarget prefers closest along ray', () => {
  const ray = { ox: 0, oz: 0, nx: 1, nz: 0, range: 20, radius: 0.8 };
  const zombies = [{ id: 1, x: 15, z: 0, health: 50, hitRadius: 0.8 }];
  const players = [{ socketId: 'a', x: 5, z: 0, health: 100, invincible: false, skip: false }];
  const hit = findShootTarget(ray, zombies, players);
  assert.equal(hit.kind, 'player');
  assert.equal(hit.id, 'a');
});

test('findPlayerShootTarget hits player even when zombie is closer on ray', () => {
  const ray = { ox: 0, oz: 0, nx: 1, nz: 0, range: 1.6, radius: 1.4 };
  const zombies = [{ id: 1, x: 0.5, z: 0, health: 50, hitRadius: 0.42 }];
  const players = [{ socketId: 'v', x: 0.9, z: 0, health: 100, invincible: false, skip: false }];
  const mixed = findShootTarget(ray, zombies, players);
  assert.equal(mixed.kind, 'zombie');
  const pvp = findPlayerShootTarget(ray, players);
  assert.equal(pvp.kind, 'player');
  assert.equal(pvp.id, 'v');
});

test('player collide radius is stable', () => {
  assert.equal(PLAYER_COLLIDE_RADIUS, 0.45);
});

test('findPlayerShootTarget tolerates slight lateral offset', () => {
  const ray = { ox: 0, oz: 0, nx: 1, nz: 0, range: 90, radius: 0.8 };
  const players = [{ socketId: 'v', x: 8, z: 0.65, health: 100, invincible: false, skip: false }];
  const hit = findPlayerShootTarget(ray, players);
  assert.equal(hit?.kind, 'player');
});
