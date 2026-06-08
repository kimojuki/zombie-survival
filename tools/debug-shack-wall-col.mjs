import { readFileSync } from 'fs';
import vm from 'vm';
import { resolveAgentAgainstCollider, decorLocalToWorld } from '../packages/shared/src/collider-resolve.mjs';

const src = readFileSync('apps/client/public/js/decor_colliders.js', 'utf8');
const zs = {};
vm.runInNewContext(src, { window: { ZS: zs }, ZS: zs, Math, console });

const x = 165.1;
const z = 7.1;
const baseY = 7.5;
const rotY = 0.55;
const feetY = baseY + 0.05;

const spec = {
  kind: 'prefab',
  prefabId: 'building_survivor_shack',
  x,
  z,
  baseY,
  rotY,
  scale: 1,
  decorId: 'seed_s01:cabin01:shack',
  doorOpen: false,
};

const cols = zs.buildDecorColliders(spec);
console.log('Collider count:', cols.length);
for (const c of cols) {
  const w = decorLocalToWorld(c.lx || 0, 0, c.lz || 0, c);
  console.log(' ', c.hw != null ? 'box' : 'other', 'lx', c.lx, 'lz', c.lz, 'hw', c.hw, 'hd', c.hd,
    'worldCenter', w.x.toFixed(2), w.z.toFixed(2), 'minY', c.minY, 'maxY', c.maxY);
}

const north = cols.find((c) => Math.abs((c.lz || 0) - 2.04) < 0.01);
if (!north) {
  console.error('No north wall collider');
  process.exit(1);
}

// Point ~15 cm devant la face intérieure du mur (local Z)
const testLocalZ = 2.04 - 0.22 - 0.15;
const approach = decorLocalToWorld(0, 0, testLocalZ, north);
const hit = resolveAgentAgainstCollider(north, approach.x, approach.z, 0.4, feetY);
console.log('\nNorth wall hit test @ local z', testLocalZ.toFixed(2), 'world', approach.x.toFixed(2), approach.z.toFixed(2));
console.log('  collision:', hit ? `YES -> ${hit.x.toFixed(2)}, ${hit.z.toFixed(2)}` : 'NO');

// Ancien set latéral (lx=-2.54) si encore présent
const west = cols.find((c) => Math.abs((c.lx || 0) + 2.54) < 0.05);
if (west) {
  const wIn = decorLocalToWorld(-2.54 + 0.15, 0, 0, west);
  const wHit = resolveAgentAgainstCollider(west, wIn.x, wIn.z, 0.4, feetY);
  console.log('\nOLD west wall still present — hit @', wIn.x.toFixed(2), wIn.z.toFixed(2), wHit ? 'YES' : 'no');
}
