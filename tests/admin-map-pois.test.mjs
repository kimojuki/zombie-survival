import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdminMapPois,
  computeAdminMapSeedPlacements,
} from '../packages/shared/src/admin-map-pois.mjs';
import { computeS01DecorPlacements } from '../packages/shared/src/s01-world-placements.mjs';

test('buildAdminMapPois — live prioritaire sur seed', () => {
  const seed = computeS01DecorPlacements();
  const liveDecor = [{
    id: 'seed_s01:cabin01:shack',
    prefabId: 'building_survivor_shack',
    placementKey: 's01:cabin01:shack',
    x: 165.12,
    z: 7.08,
    rotY: 0.55,
    immutable: true,
    layer: 'building',
  }];
  const pois = buildAdminMapPois({ decor: liveDecor, seedPlacements: seed, designLandmarks: [] });
  const shack = pois.find((p) => p.placementKey === 's01:cabin01:shack');
  assert.ok(shack);
  assert.equal(shack.source, 'live');
  assert.equal(shack.x, 165.12);
  assert.equal(shack.category, 'building');
});

test('buildAdminMapPois — coffre et signalisation plage', () => {
  const pois = buildAdminMapPois({
    decor: [],
    seedPlacements: computeAdminMapSeedPlacements(),
    designLandmarks: [],
  });
  const chest = pois.find((p) => p.placementKey === 's01:cabin01:chest');
  const sign = pois.find((p) => p.prefabId === 'sign_beach_exit');
  const torch = pois.find((p) => p.prefabId === 'beach_exit_torch');
  assert.ok(chest);
  assert.equal(chest.category, 'storage');
  assert.equal(chest.label, 'Coffre cabane #1');
  assert.ok(sign);
  assert.equal(sign.category, 'sign');
  assert.ok(torch);
  assert.equal(torch.category, 'sign');
});

test('buildAdminMapPois — arbres et barrières exclus des POI', () => {
  const pois = buildAdminMapPois({
    decor: [
      {
        id: 'tree_1',
        prefabId: 'tree_oak',
        placementKey: 'tree:s01:1',
        x: 10,
        z: 20,
        layer: 'tree',
      },
      {
        id: 'bar_1',
        prefabId: 'road_barrier_post',
        placementKey: 'barrier:road:1',
        x: 11,
        z: 21,
        layer: 'barrier',
      },
      {
        id: 'seed_s01:cabin01:shack',
        prefabId: 'building_survivor_shack',
        placementKey: 's01:cabin01:shack',
        x: 165,
        z: 7,
        layer: 'building',
      },
    ],
    seedPlacements: [],
    designLandmarks: [],
  });
  assert.equal(pois.filter((p) => p.prefabId?.startsWith('tree_')).length, 0);
  assert.equal(pois.filter((p) => p.prefabId?.startsWith('road_barrier_')).length, 0);
  assert.ok(pois.find((p) => p.placementKey === 's01:cabin01:shack'));
});

test('buildAdminMapPois — placeholders design séparés', () => {
  const pois = buildAdminMapPois({
    decor: [],
    seedPlacements: [],
    designLandmarks: [{ id: 'x', label: 'Test', x: 1, z: 2, placeholder: true }],
  });
  const d = pois.find((p) => p.id === 'x');
  assert.equal(d.category, 'poi-design');
  assert.equal(d.precise, false);
});
