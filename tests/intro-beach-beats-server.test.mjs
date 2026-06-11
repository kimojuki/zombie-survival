import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntroBeachBeats } from '../apps/server/src/intro-beach-beats.mjs';
import { defaultIntroBeats } from '../packages/shared/src/intro-beach-beats.mjs';

function _makeCtx() {
  const items = new Map();
  const decorItems = new Map();
  let seq = 1;
  return {
    items,
    decorItems,
    addGroundItem: (item) => {
      items.set(item.id, item);
      return item;
    },
    removeGroundItem: (id) => { items.delete(id); },
    addDecorItem: (item) => {
      decorItems.set(item.id, item);
      return item;
    },
    removeDecorItem: (id) => { decorItems.delete(id); },
    introDecorId: (pid, kind) => `intro_${pid}_${kind}`,
    normPlayerId: (id) => Number(id) || id,
    nextItemId: () => `gi_${seq++}`,
    notifyPlayer: () => {},
    log: null,
  };
}

test('ensure does not respawn rock when already in inventory', () => {
  const ctx = _makeCtx();
  const mod = createIntroBeachBeats(ctx);
  const p = {
    id: 1,
    x: 282,
    z: -8,
    inv: {
      hotbar: [{ type: 'tool_caillou', qty: 1, durability: 80 }],
      bag: [],
      scenario: {
        step: 'explore',
        introBeats: { ...defaultIntroBeats(), footprints: true, pickedRock: true },
      },
    },
  };
  mod.ensure(p, null);
  const rocks = [...ctx.items.values()].filter((i) => i.type === 'tool_caillou');
  assert.equal(rocks.length, 0);
});

test('ensure spawns wake rock before footprints beat', () => {
  const ctx = _makeCtx();
  const mod = createIntroBeachBeats(ctx);
  const p = {
    id: 4,
    x: 282,
    z: -8,
    inv: {
      hotbar: [],
      bag: [],
      scenario: { step: 'intro_wake', introBeats: defaultIntroBeats() },
    },
  };
  mod.ensure(p, null);
  const rock = [...ctx.items.values()].find((i) => i.type === 'tool_caillou');
  assert.ok(rock, 'wake rock spawned');
  assert.equal(rock.introBeat, 'wake');
  assert.ok(Math.hypot(rock.x - (p.x - 1.75), rock.z - (p.z + 0.15)) < 0.2, 'rock in front of player');
  assert.equal(mod.canPickup(p, rock), true);
});

test('ensure respawns rock when beat active but not yet picked', () => {
  const ctx = _makeCtx();
  const mod = createIntroBeachBeats(ctx);
  const p = {
    id: 2,
    x: 282,
    z: -8,
    inv: {
      hotbar: [],
      bag: [],
      scenario: {
        step: 'explore',
        introBeats: { ...defaultIntroBeats(), footprints: true },
      },
    },
  };
  mod.ensure(p, null);
  const rocks = [...ctx.items.values()].filter((i) => i.type === 'tool_caillou');
  assert.equal(rocks.length, 1);
});

test('onPickup marks pickedRock and prevents respawn on next ensure', () => {
  const ctx = _makeCtx();
  const mod = createIntroBeachBeats(ctx);
  const p = {
    id: 3,
    x: 282,
    z: -8,
    inv: {
      hotbar: [],
      bag: [],
      scenario: {
        step: 'explore',
        introBeats: { ...defaultIntroBeats(), footprints: true },
      },
    },
  };
  mod.ensure(p, null);
  const rock = [...ctx.items.values()].find((i) => i.type === 'tool_caillou');
  assert.ok(rock);
  ctx.items.delete(rock.id);
  p.inv.hotbar = [{ type: 'tool_caillou', qty: 1, durability: 80 }];
  mod.onPickup(p, null, rock);
  assert.equal(p.inv.scenario.introBeats.pickedRock, true);
  mod.ensure(p, null);
  assert.equal([...ctx.items.values()].filter((i) => i.type === 'tool_caillou').length, 0);
});

test('tryCampfireBeatNear grants footprints+campfire when rock in inv at veilleuse', () => {
  const ctx = _makeCtx();
  const mod = createIntroBeachBeats(ctx);
  const p = {
    id: 5,
    x: 252,
    z: -7.6,
    inv: {
      hotbar: [{ type: 'tool_caillou', qty: 1, durability: 80 }],
      bag: [],
      scenario: { step: 'explore', introBeats: { ...defaultIntroBeats(), pickedRock: true } },
    },
  };
  assert.ok(mod.tryCampfireBeatNear(p, null));
  assert.equal(p.inv.scenario.introBeats.footprints, true);
  assert.equal(p.inv.scenario.introBeats.campfire, true);
});

test('tryCampfireBeatNear follows moved campfire decor not default coords', () => {
  const ctx = _makeCtx();
  ctx.decorItems.set('camp_moved', {
    id: 'camp_moved',
    prefabId: 'spawn_beach_campfire_ring',
    placementKey: 'beach:intro_campfire',
    x: 260,
    z: -12,
    scale: 1.35,
  });
  const mod = createIntroBeachBeats(ctx);
  const p = {
    id: 6,
    x: 260,
    z: -12,
    inv: {
      hotbar: [{ type: 'tool_caillou', qty: 1, durability: 80 }],
      bag: [],
      scenario: { step: 'explore', introBeats: { ...defaultIntroBeats(), pickedRock: true } },
    },
  };
  assert.ok(mod.tryCampfireBeatNear(p, null, 260, -12, 'camp_moved'));
  assert.equal(p.inv.scenario.introBeats.campfire, true);
  const pOld = {
    id: 7,
    x: 252,
    z: -7.6,
    inv: {
      hotbar: [{ type: 'tool_caillou', qty: 1, durability: 80 }],
      bag: [],
      scenario: { step: 'explore', introBeats: { ...defaultIntroBeats(), pickedRock: true } },
    },
  };
  assert.equal(mod.tryCampfireBeatNear(pOld, null, 252, -7.6, 'camp_moved'), false);
});
