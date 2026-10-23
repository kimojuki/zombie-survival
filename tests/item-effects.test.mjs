import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getItemEffect,
  getMaxHealthFromInv,
  applyItemUse,
  syncArmorHealth,
} from '../packages/shared/src/item-effects.mjs';

function normalizeInv(inv) {
  return inv;
}

test('med_pilules reduce infection and pause progression', () => {
  const player = {
    health: 100,
    survival: { faim: 80, soif: 80, infection: 45, saignement: false },
    inv: { hotbar: [], bag: [], equip: {} },
  };
  const res = applyItemUse('med_pilules_anti_infection', player, normalizeInv);
  assert.equal(res.ok, true);
  assert.equal(player.survival.infection, 25);
  assert.ok(player.survival.infectionPausedUntil > Date.now());
});

test('med_seringue cures infection completely', () => {
  const player = {
    health: 80,
    survival: { faim: 80, soif: 80, infection: 60, saignement: false, infectionPausedUntil: Date.now() + 5000 },
    inv: { hotbar: [], bag: [], equip: {} },
  };
  const res = applyItemUse('med_seringue_anti_infection', player, normalizeInv);
  assert.equal(res.ok, true);
  assert.equal(player.survival.infection, 0);
  assert.equal(player.survival.infectionPausedUntil, undefined);
  assert.equal(player.health, 95);
});

test('med_bandage heals and stops bleeding', () => {
  const player = {
    health: 50,
    survival: { faim: 80, soif: 80, infection: 0, saignement: true },
    inv: { hotbar: [], bag: [], equip: {} },
  };
  const res = applyItemUse('med_bandage', player, normalizeInv);
  assert.equal(res.ok, true);
  assert.equal(player.health, 65);
  assert.equal(player.survival.saignement, false);
});

test('armor increases max health', () => {
  const inv = {
    hotbar: [],
    bag: [],
    equip: { Torso: { type: 'eq_gilet_protection', qty: 1 } },
  };
  assert.equal(getMaxHealthFromInv(inv, normalizeInv), 140);
});

test('unknown item returns null effect', () => {
  assert.equal(getItemEffect('nonexistent'), null);
});

test('syncArmorHealth grants bonus when equipping armor', () => {
  const player = { health: 100 };
  syncArmorHealth(player, 0, 40);
  assert.equal(player.health, 140);
});

test('syncArmorHealth clamps when unequipping armor', () => {
  const player = { health: 130 };
  syncArmorHealth(player, 40, 0);
  assert.equal(player.health, 100);
});

test('syncArmorHealth keeps low HP when unequipping', () => {
  const player = { health: 60 };
  syncArmorHealth(player, 40, 0);
  assert.equal(player.health, 60);
});
