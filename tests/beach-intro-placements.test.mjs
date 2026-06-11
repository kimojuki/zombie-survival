import test from 'node:test';

import assert from 'node:assert/strict';

import {

  BEACH_INTRO_WORLD_PROPS,

  computeBeachIntroPlacements,

  inBeatZone,

  INTRO_ZONE_CAMPFIRE,

  INTRO_ZONE_FOOTPRINTS,

  INTRO_ZONE_PIER,

  inIntroCampfirePickupZone,

  resolveIntroCampfireZone,

  introPathStageDistances,

  introPersonalRockPosition,

  introRockLookTarget,

  isBeachIntroPlacementValid,

} from '../packages/shared/src/beach-intro-placements.mjs';

import {

  BEACH_SPAWN,

  INTRO_SPAWN_CLUSTER,

  isOnBeachSafeSand,

} from '../packages/shared/src/beach-spawn.mjs';



test('beach intro world props on sand', () => {

  const props = computeBeachIntroPlacements();

  assert.equal(props.length, BEACH_INTRO_WORLD_PROPS.length);

  for (const p of props) {
    assert.ok(isBeachIntroPlacementValid(p), `${p.prefabId}`);
    if (p.prefabId === 'spawn_beach_offshore_wreck') {
      assert.ok(!isOnBeachSafeSand(p.x, p.z), 'offshore wreck must be in water');
      continue;
    }
    assert.ok(isOnBeachSafeSand(p.x, p.z), `${p.prefabId}`);
  }

  assert.ok(props.some((p) => p.prefabId === 'spawn_beach_message_bottle' && p.signKind === 'intro_bottle_k'));
  assert.ok(props.some((p) => p.prefabId === 'spawn_beach_offshore_wreck'));

});



test('intro path stages spaced along westbound trail', () => {

  const stages = introPathStageDistances();

  assert.equal(stages.length, 3);

  for (const d of stages) {

    assert.ok(d >= 7, `stage gap ${d}m too short`);

  }

  assert.ok(INTRO_ZONE_FOOTPRINTS.x > INTRO_ZONE_PIER.x, 'trail runs east to west');

  assert.ok(INTRO_SPAWN_CLUSTER.cx - INTRO_ZONE_FOOTPRINTS.x >= 10, 'wake cluster east of first clue');

});



test('intro beat zone footprints separate from wake cluster', () => {

  assert.ok(inBeatZone(INTRO_ZONE_FOOTPRINTS.x, INTRO_ZONE_FOOTPRINTS.z, INTRO_ZONE_FOOTPRINTS));

  assert.ok(!inBeatZone(INTRO_SPAWN_CLUSTER.cx, INTRO_SPAWN_CLUSTER.cz, INTRO_ZONE_FOOTPRINTS));

  assert.ok(!inBeatZone(BEACH_SPAWN.x, BEACH_SPAWN.z, INTRO_ZONE_FOOTPRINTS));

});



test('intro rock spawns in front of player on east beach cluster', () => {

  const px = INTRO_SPAWN_CLUSTER.cx;

  const pz = INTRO_SPAWN_CLUSTER.cz;

  const near = introPersonalRockPosition(px, pz, 1);

  assert.deepEqual(near, introRockLookTarget(px, pz));

  assert.ok(Math.hypot(near.x - px, near.z - pz) <= 3);

  const far = introPersonalRockPosition(270, 40, 1);

  assert.ok(Math.hypot(far.x - 270, far.z - 40) <= 4.5, 'caillou devant le joueur');

});

test('resolveIntroCampfireZone uses decor position when moved', () => {
  const moved = resolveIntroCampfireZone([{
    prefabId: 'spawn_beach_campfire_ring',
    placementKey: 'beach:intro_campfire',
    x: 260,
    z: -12,
    scale: 1.35,
  }]);
  assert.equal(moved.x, 260);
  assert.equal(moved.z, -12);
  assert.ok(inIntroCampfirePickupZone(260, -12, moved));
  assert.equal(inIntroCampfirePickupZone(INTRO_ZONE_CAMPFIRE.x, INTRO_ZONE_CAMPFIRE.z, moved), false);
  const fallback = resolveIntroCampfireZone([]);
  assert.deepEqual(fallback, INTRO_ZONE_CAMPFIRE);
});

