import Database from 'better-sqlite3';
import { computeS01DecorPlacements } from '../packages/shared/src/s01-world-placements.mjs';

const db = new Database('database/local-dev.sqlite', { readonly: true });
const rows = db.prepare(
  "SELECT id, payload FROM world_decor WHERE id LIKE '%cabin%' OR payload LIKE '%cabin01%'",
).all();
console.log('DB rows matching cabin01:', rows.length);
for (const r of rows) {
  const p = JSON.parse(r.payload);
  console.log(
    ' ',
    r.id,
    '|',
    p.prefabId,
    '|',
    p.placementKey,
    '@',
    p.x,
    p.z,
    '| rotY',
    p.rotY,
  );
}

const expected = computeS01DecorPlacements();
console.log('\nExpected seed:');
for (const p of expected) {
  console.log(' ', p.placementKey, p.prefabId, '@', p.x, p.z, 'rotY', p.rotY);
}

const chestDb = rows.find((r) => r.id.includes('chest'));
const chestExp = expected.find((p) => p.placementKey === 's01:cabin01:chest');
if (chestDb && chestExp) {
  const dbRot = JSON.parse(chestDb.payload).rotY;
  const expRot = chestExp.rotY;
  const ok = Math.abs(dbRot - expRot) < 0.02 && Math.abs(dbRot - (Math.PI + 0.55)) > 0.5;
  console.log(ok ? '\n✓ chest rotY OK (faces door)' : '\n✗ chest rotY mismatch or faces wall (shack+PI)');
}

const bedExp = expected.find((p) => p.placementKey === 's01:cabin01:bed');
const bedDb = rows.find((r) => r.id.includes('cabin01:bed') || r.payload.includes('s01:cabin01:bed'));
if (bedExp) {
  const ok = bedDb
    && JSON.parse(bedDb.payload).prefabId === 'spawn_single_bed'
    && Math.abs(JSON.parse(bedDb.payload).x - bedExp.x) < 0.05;
  console.log(ok ? '✓ lit seed OK' : '✗ lit missing or stale — redémarrer serveur ou `decorseed s01 reset`');
}

const oldBedroll = rows.find((r) => r.payload.includes('cabin01:bedroll'));
if (oldBedroll) {
  console.log('⚠ ancien sac seed encore en DB — `decorseed s01 reset`');
}

console.log('\nExpected count:', expected.length, '(shack + chest + bed)');

db.close();
