/**
 * Test suite RCON via POST /api/rcon
 * Usage: node tools/rcon-test.mjs [baseUrl] [password]
 */
const baseUrl = process.argv[2] || process.env.BASE_URL || 'http://localhost:3300';
const password = process.argv[3] || process.env.RCON_PASSWORD || 'dev';

async function rcon(cmd) {
  const res = await fetch(`${baseUrl}/api/rcon`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RCON-Password': password,
    },
    body: JSON.stringify({ cmd }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ...body };
}

async function waitForServer(maxMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(`${baseUrl}/api/health`);
      if (r.ok) return;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server not ready at ${baseUrl}`);
}

function pass(name, detail = '') {
  console.log(`  OK  ${name}${detail ? ` — ${detail}` : ''}`);
  return { name, ok: true, detail };
}

function fail(name, detail = '') {
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  return { name, ok: false, detail };
}

async function expectOk(name, cmd, check) {
  const r = await rcon(cmd);
  if (r.status !== 200) return fail(name, `HTTP ${r.status}: ${r.error || r.lines?.[0]}`);
  if (!r.ok) return fail(name, r.lines?.[0] || 'ok=false');
  const text = (r.lines || []).join('\n');
  if (check && !check(text, r)) return fail(name, `check failed: ${text.slice(0, 120)}`);
  return pass(name, (r.lines || [])[0]?.slice(0, 80));
}

async function expectFail(name, cmd, substr) {
  const r = await rcon(cmd);
  if (r.status !== 200) return pass(name, `HTTP ${r.status} (rejet attendu)`);
  if (r.ok) return fail(name, 'devrait échouer');
  const text = (r.lines || []).join(' ');
  if (substr && !text.toLowerCase().includes(substr.toLowerCase())) {
    return fail(name, `message inattendu: ${text.slice(0, 100)}`);
  }
  return pass(name, text.slice(0, 80));
}

async function main() {
  console.log(`\nRCON tests → ${baseUrl}\n`);
  await waitForServer();
  const results = [];

  // ── Aide & état ──
  results.push(await expectOk('help', 'help', (t) => t.includes('decoradd')));
  results.push(await expectOk('help decor', 'help decor', (t) => t.includes('decor')));
  results.push(await expectOk('status', 'status', (t) => t.includes('Joueurs')));
  results.push(await expectOk('flags', 'flags', (t) => t.includes('autoDay')));
  results.push(await expectOk('players (vide)', 'players'));

  // ── Temps ──
  results.push(await expectOk('time', 'time'));
  results.push(await expectOk('time 0.42', 'time 0.42', (t) => t.includes('0.42')));
  results.push(await expectOk('day', 'day'));
  results.push(await expectOk('night', 'night'));
  results.push(await expectOk('dawn', 'dawn'));
  results.push(await expectOk('dusk', 'dusk'));
  results.push(await expectOk('autoday off', 'autoday off'));
  results.push(await expectOk('autoday on', 'autoday on'));

  // ── Zombies ──
  results.push(await expectOk('zombies off', 'zombies off'));
  results.push(await expectOk('nospawn on', 'nospawn on'));
  results.push(await expectOk('clearzombies', 'clearzombies'));
  results.push(await expectOk('spawnzombies 3', 'spawnzombies 3', (t) => t.includes('3')));
  results.push(await expectOk('zombieprefabs', 'zombieprefabs', (t) => t.includes('zombie_walker')));
  results.push(await expectOk('spawnzombie runner', 'spawnzombie zombie_runner 1', (t) => t.includes('zombie_runner')));
  results.push(await expectOk('zombielist', 'zombielist', (t) => t.includes('zombie_')));
  results.push(await expectOk('killzombie nearest', 'killzombie nearest', (t) => t.includes('supprimé') || t.includes('Zombie')));
  results.push(await expectOk('zombies on', 'zombies on'));
  results.push(await expectOk('nospawn off', 'nospawn off'));

  // ── Monde ──
  results.push(await expectOk('say', 'say Test RCON automatise', (t) => t.includes('Annonce')));
  results.push(await expectOk('loot status', 'loot status'));

  // ── Décor / prefabs ──
  results.push(await expectOk('decorprefabs', 'decorprefabs', (t) => t.includes('spawn_campfire')));
  results.push(await expectOk('decorprefabs wreck', 'decorprefabs wreck', (t) => t.includes('wreck_sedan')));
  results.push(await expectOk('decorprefabs tree', 'decorprefabs tree', (t) => t.includes('tree_oak')));
  results.push(await expectOk('decorprefabs barrier', 'decorprefabs barrier', (t) => t.includes('road_barrier_post')));
  results.push(await expectOk('decorprefabs filter', 'decorprefabs stump', (t) => t.includes('spawn_stump')));
  results.push(await expectOk('decorprefabs building', 'decorprefabs building', (t) => t.includes('building_survivor_shack')));
  results.push(await expectOk('decorprefabs storage', 'decorprefabs storage', (t) => t.includes('storage_chest')));
  results.push(await expectOk('decoritems', 'decoritems eau', (t) => t.includes('food_eau_bouteille')));
  results.push(await expectOk('decorlist seed', 'decorlist', (t) => t.includes('decor_')));

  results.push(await expectOk(
    'decoradd wreck',
    'decoradd prefab wreck_sedan 12 -8 0.5 1 rust 0.12 2',
    (t) => t.includes('wreck_sedan') && t.includes('decor_'),
  ));

  results.push(await expectOk(
    'decoradd prefab spawn_lantern',
    'decoradd prefab spawn_lantern 12 -8 0.5 1.2',
    (t) => t.includes('spawn_lantern') && t.includes('decor_'),
  ));

  results.push(await expectOk(
    'decorremove wreck nearest',
    'decorremove decor_92',
    (t) => t.includes('decor_92') || t.includes('wreck_sedan'),
  ));

  results.push(await expectOk(
    'decorseed wrecks idle',
    'decorseed wrecks',
    (t) => t.includes('déjà') || t.includes('présentes') || t.includes('ajoutée'),
  ));

  results.push(await expectOk(
    'decorseed trees idle',
    'decorseed trees',
    (t) => t.includes('déjà') || t.includes('présents') || t.includes('ajouté'),
  ));

  results.push(await expectOk(
    'decorseed barriers idle',
    'decorseed barriers',
    (t) => t.includes('déjà') || t.includes('présentes') || t.includes('ajoutée'),
  ));

  results.push(await expectOk(
    'decoradd tree_oak',
    'decoradd prefab tree_oak 8 -12 0.3 1.1',
    (t) => t.includes('tree_oak') && t.includes('decor_'),
  ));

  results.push(await expectOk(
    'decoradd tool_caillou',
    'decoradd item tool_caillou 9 -11 0 1',
    (t) => t.includes('tool_caillou') && t.includes('decor_'),
  ));

  results.push(await expectOk(
    'decoradd item',
    'decoradd item food_eau_bouteille 12 -7 0 0.9',
    (t) => t.includes('food_eau_bouteille'),
  ));

  results.push(await expectOk(
    'decoradd auto-prefab',
    'decoradd spawn_workbench 10 -9 0.2',
    (t) => t.includes('spawn_workbench'),
  ));

  results.push(await expectOk(
    'decoradd storage_chest',
    'decoradd prefab storage_chest 14 -10 0.2 1',
    (t) => t.includes('storage_chest') && t.includes('decor_'),
  ));

  results.push(await expectOk(
    'decoradd building rot scale ahead',
    'decoradd prefab building_survivor_shack 0 1',
    (t) => t.includes('building_survivor_shack') && !t.includes('@ (0.0, 1.0)'),
  ));

  const buildingAdd = await rcon('decoradd prefab building_survivor_shack 16 -12 0.35 1');
  const buildingAddText = (buildingAdd.lines || []).join('\n');
  const addedBuildingId = buildingAddText.match(/(decor_\d+)/)?.[1];
  if (
    buildingAdd.status === 200
    && buildingAdd.ok
    && addedBuildingId
    && buildingAddText.includes('building_survivor_shack')
  ) {
    results.push(pass('decoradd building prefab', buildingAdd.lines[0]?.slice(0, 80)));
  } else {
    results.push(fail('decoradd building prefab', buildingAdd.error || buildingAddText.slice(0, 120)));
  }

  const listAfter = await rcon('decorlist');
  const listText = (listAfter.lines || []).join('\n');

  results.push(await expectOk('decorlist after add', 'decorlist', (t) => t.includes('spawn_lantern') && t.includes('building_survivor_shack')));

  if (addedBuildingId && listText.includes(addedBuildingId)) {
    results.push(await expectOk('decorremove placed building by id', `decorremove ${addedBuildingId}`, (t) => t.includes(addedBuildingId)));
  } else {
    results.push(fail('decorremove placed building by id', 'id bâtiment introuvable dans decorlist'));
  }

  // ── Erreurs attendues ──
  results.push(await expectFail('decoradd prefab inconnu', 'decoradd prefab foo_bar_xyz 0 0', 'inconnu'));
  results.push(await expectFail('decoradd item inconnu', 'decoradd item item_invente_xyz 0 0', 'inconnu'));
  results.push(await expectFail('commande inconnue', 'notacommand', 'inconnue'));
  results.push(await expectFail('time invalide', 'time 99', 'invalide'));

  // ── Auth API ──
  const badAuth = await fetch(`${baseUrl}/api/rcon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-RCON-Password': 'wrong' },
    body: JSON.stringify({ cmd: 'status' }),
  });
  results.push(badAuth.status === 403 ? pass('auth 403 mauvais mdp') : fail('auth 403', `got ${badAuth.status}`));

  const noPw = await fetch(`${baseUrl}/api/rcon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: 'status' }),
  });
  results.push(noPw.status === 403 ? pass('auth 403 sans mdp') : fail('auth sans mdp', `got ${noPw.status}`));

  // ── Résumé ──
  const ok = results.filter((r) => r.ok).length;
  const ko = results.filter((r) => !r.ok).length;
  console.log(`\n=== Résultat: ${ok}/${results.length} OK, ${ko} échec(s) ===\n`);
  if (ko) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
