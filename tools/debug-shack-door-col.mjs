import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import vm from 'vm';
import { resolveAgentAgainstCollider } from '../packages/shared/src/collider-resolve.mjs';

const db = new Database('database/local-dev.sqlite', { readonly: true });
const row = db.prepare("SELECT payload FROM world_decor WHERE payload LIKE '%cabin01:shack%'").get();
db.close();
const payload = row ? JSON.parse(row.payload) : null;
console.log('DB shack doorOpen:', payload?.doorOpen);

const src = readFileSync('apps/client/public/js/decor_colliders.js', 'utf8');
const zs = {};
vm.runInNewContext(src, { window: { ZS: zs }, ZS: zs, Math, console });

const baseY = 7.1;
const spec = {
  kind: 'prefab',
  prefabId: 'building_survivor_shack',
  x: 165.1,
  z: 7.1,
  baseY,
  rotY: 0.55,
  scale: 1,
  decorId: 'seed_s01:cabin01:shack',
  doorOpen: !!payload?.doorOpen,
};
const cols = zs.buildDecorColliders(spec);
console.log('Collider count (doorOpen=%s):', spec.doorOpen, cols.length);
if (cols[0]) console.log('Door col:', cols[0]);

const door = cols[0];
if (door) {
  const feetY = 6.85;
  const tests = [
    [166.21, 5.32],
    [166.21, 5.20],
    [166.21, 5.40],
    [165.95, 5.32],
  ];
  for (const [px, pz] of tests) {
    const out = resolveAgentAgainstCollider(door, px, pz, 0.4, feetY);
    console.log(`  hit @ (${px}, ${pz}):`, out ? 'YES' : 'no');
  }
}
