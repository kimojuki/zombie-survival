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

db.close();
