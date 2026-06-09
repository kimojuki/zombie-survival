import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DECOR_PREFAB_META,
  DECOR_PREFAB_CATEGORIES,
  buildDecorPrefabCatalog,
  loadDecorPrefabCatalog,
  inferDecorPrefabCategory,
  defaultDecorPrefabRcon,
} from '../packages/shared/src/decor-prefab-catalog.mjs';
import {
  discoverDecorPrefabIds,
  DEFAULT_CLIENT_JS_DIR,
  _extractRegisterDecorPrefabIds,
  _extractPrefabObjectIds,
} from '../packages/shared/src/decor-prefab-discover.mjs';

test('discoverDecorPrefabIds — trouve tous les prefabs client connus', () => {
  const ids = discoverDecorPrefabIds();
  assert.ok(ids.length >= 43, `attendu ≥43 ids, reçu ${ids.length}`);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of [
    'spawn_campfire',
    'storage_chest',
    'building_survivor_shack',
    'smallcity_house_a',
    'tree_palm',
    'wreck_sedan',
    'road_barrier_post',
    'sign_beach_exit',
    's01_gas_station',
  ]) {
    assert.ok(ids.includes(id), `id manquant: ${id}`);
  }
});

test('discoverDecorPrefabIds — nouvel id via registerDecorPrefab serait détecté', () => {
  const sample = `
    ZS.registerDecorPrefab('test_new_prefab_xyz', { build() {} });
    const DECOR_PREFABS = {
      test_inline_prefab_abc: { build(root) {} },
    };
  `;
  const reg = _extractRegisterDecorPrefabIds(sample);
  const obj = _extractPrefabObjectIds(sample);
  assert.ok(reg.includes('test_new_prefab_xyz'));
  assert.ok(obj.includes('test_inline_prefab_abc'));
});

test('buildDecorPrefabCatalog — entrée auto pour prefab inconnu du META', () => {
  const [entry] = buildDecorPrefabCatalog(['brand_new_prefab_demo']);
  assert.equal(entry.id, 'brand_new_prefab_demo');
  assert.equal(entry.auto, true);
  assert.equal(entry.rcon, 'decoradd prefab brand_new_prefab_demo here');
  assert.ok(DECOR_PREFAB_CATEGORIES[entry.category]);
});

test('buildDecorPrefabCatalog — META manuel prioritaire + labels client', () => {
  const catalog = buildDecorPrefabCatalog(['storage_chest', 'brand_new_from_client'], {
    brand_new_from_client: { label: 'Label client custom' },
  });
  const chest = catalog.find((e) => e.id === 'storage_chest');
  const custom = catalog.find((e) => e.id === 'brand_new_from_client');
  assert.equal(chest.auto, false);
  assert.equal(chest.label, DECOR_PREFAB_META.storage_chest.label);
  assert.equal(custom.label, 'Label client custom');
  assert.equal(custom.auto, true);
});

test('loadDecorPrefabCatalog — cohérent avec le dossier client', () => {
  const { ids, catalog } = loadDecorPrefabCatalog(DEFAULT_CLIENT_JS_DIR);
  assert.equal(catalog.length, ids.length);
  for (const entry of catalog) {
    assert.match(entry.id, /^[a-z0-9_]+$/);
    assert.ok(entry.rcon.startsWith('decoradd prefab '));
    assert.ok(DECOR_PREFAB_CATEGORIES[entry.category], entry.category);
  }
});

test('inférence catégorie et rcon bâtiment', () => {
  assert.equal(inferDecorPrefabCategory('building_survivor_shack'), 'batiment');
  assert.equal(inferDecorPrefabCategory('spawn_lantern'), 'camp');
  assert.match(defaultDecorPrefabRcon('building_survivor_shack'), /here 0 1/);
  assert.match(defaultDecorPrefabRcon('wreck_sedan'), /rust/);
});
