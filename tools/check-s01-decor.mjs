import Database from 'better-sqlite3';
import { computeS01DecorPlacements } from '../packages/shared/src/s01-world-placements.mjs';

const db = new Database('database/local-dev.sqlite', { readonly: true });
const rows = db.prepare(
  "SELECT id, payload FROM world_decor WHERE id LIKE '%cabin%' OR payload LIKE '%cabin01%'",
).all();
console.log('DB rows matching cabin01:', rows.length);
for (const r of rows) {
  const p = JSON.parse(r.payload);
  console.log(' ', r.id, '|', p.prefabId, '|', p.placementKey, '@', p.x, p.z);
}

const expected = computeS01DecorPlacements();
console.log('Expected seed:', expected);

db.close();
