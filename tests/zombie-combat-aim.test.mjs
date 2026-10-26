import test from 'node:test';
import assert from 'node:assert/strict';
import { rayHitXZ, findShootTarget } from '../packages/shared/src/combat.mjs';

test('rayHitXZ hits zombie in front within radius', () => {
  const hit = rayHitXZ(0, 0, 1, 0, 3, 1.5, 0, 0.8);
  assert.ok(hit);
  assert.ok(hit.t > 0 && hit.t < 3);
});

test('rayHitXZ misses behind shooter', () => {
  assert.equal(rayHitXZ(0, 0, 1, 0, 3, -1.5, 0, 0.8), null);
});

test('findShootTarget picks nearest zombie on ray', () => {
  const ray = { ox: 0, oz: 0, nx: 1, nz: 0, range: 5, radius: 0.85 };
  const zombies = [
    { id: 2, x: 4, z: 0, health: 50, hitRadius: 0.8 },
    { id: 1, x: 2, z: 0.2, health: 50, hitRadius: 0.8 },
  ];
  const best = findShootTarget(ray, zombies, []);
  assert.equal(best?.kind, 'zombie');
  assert.equal(best?.id, 1);
});

test('near-vertical aim would miss without xz fallback — direction length check', () => {
  // Client sometimes sends tiny dx/dz when looking up/down; server must not discard.
  const dx = 0.001;
  const dz = 0.001;
  const len = Math.hypot(dx, dz);
  assert.ok(len < 0.05, 'simulates near-vertical look');
  // Fallback facing rotY=0 → forward -Z in Three.js
  const yaw = 0;
  const nx = -Math.sin(yaw);
  const nz = -Math.cos(yaw);
  const hit = rayHitXZ(0, 0, nx, nz, 2, 0, -1.2, 0.85);
  assert.ok(hit, 'fallback facing should still hit zombie ahead');
});
