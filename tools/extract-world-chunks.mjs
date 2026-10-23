#!/usr/bin/env node
/**
 * Découpe world.js en world/chunks/*.js
 * Usage: node tools/extract-world-chunks.mjs [--write]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORLD = path.join(ROOT, 'apps/client/public/js/world.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/world/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-state.js',
    title: 'État, textures, helpers ciel',
    start: 'let _scene, _ambientLight',
    end: 'function _yieldFrame()',
  },
  {
    file: '01-build.js',
    title: 'buildWorld, buildWorldAsync',
    start: 'function _yieldFrame()',
    end: 'function setWorldTime(t)',
  },
  {
    file: '02-daynight.js',
    title: 'Cycle jour/nuit, étoiles',
    start: 'function setWorldTime(t)',
    end: 'function applyGraphicsOptions(profile)',
  },
  {
    file: '03-terrain.js',
    title: 'Terrain async + raycast sol',
    start: 'function applyGraphicsOptions(profile)',
    end: 'function spawnFlowers(scene, count)',
  },
  {
    file: '04-veg-clouds.js',
    title: 'Fleurs, herbe, nuages',
    start: 'function spawnFlowers(scene, count)',
    end: 'function registerChoppableTree(scene, group, x, z, decorId, opts = {})',
  },
  {
    file: '05-trees.js',
    title: 'Arbres coupables + chute',
    start: 'function registerChoppableTree(scene, group, x, z, decorId, opts = {})',
    end: 'function registerMinableRock(scene, group, x, z, decorId, opts = {})',
  },
  {
    file: '06-rocks.js',
    title: 'Rochers minables',
    start: 'function registerMinableRock(scene, group, x, z, decorId, opts = {})',
    end: 'function spawnTrees(scene, count)',
  },
  {
    file: '07-proc-spawn.js',
    title: 'Spawn procédural végétation',
    start: 'function spawnTrees(scene, count)',
    end: 'function registerBillboards(meshes)',
  },
  {
    file: '08-water-fx.js',
    title: 'Eau, feux, billboards',
    start: 'function registerBillboards(meshes)',
    end: 'function registerDecorColliders(id, colliders)',
  },
  {
    file: '09-colliders.js',
    title: 'Colliders décor + collision joueur',
    start: 'function registerDecorColliders(id, colliders)',
    end: 'ZS.getColliders           = getColliders;',
  },
  {
    file: '10-export.js',
    title: 'Exports ZS',
    start: 'ZS.getColliders           = getColliders;',
    toEnd: true,
  },
];

function sliceBetween(src, startMarker, endMarker, includeStart = true, toEnd = false) {
  const i0 = src.indexOf(startMarker);
  if (i0 < 0) throw new Error(`start not found: ${startMarker.slice(0, 60)}`);
  const searchFrom = i0 + startMarker.length;
  if (toEnd) return src.slice(includeStart ? i0 : searchFrom).trimEnd();
  const i1 = src.indexOf(endMarker, searchFrom);
  if (i1 < 0) throw new Error(`end not found after ${startMarker.slice(0, 60)}`);
  return src.slice(includeStart ? i0 : i1).trimEnd();
}

function extractChunkBody(body, chunk) {
  if (chunk.toEnd) {
    return sliceBetween(body, chunk.start, null, true, true);
  }
  const i0 = body.indexOf(chunk.start);
  if (i0 < 0) throw new Error(`start not found: ${chunk.start.slice(0, 60)}`);
  const i1 = body.indexOf(chunk.end, i0 + chunk.start.length);
  if (i1 < 0) throw new Error(`end not found after ${chunk.start.slice(0, 60)}`);
  return body.slice(i0, i1).trimEnd();
}

function extractIifeBody(src) {
  const open = src.indexOf("(function () {");
  const bodyStart = src.indexOf("'use strict';", open);
  const afterStrict = src.indexOf('\n', bodyStart) + 1;
  const close = src.lastIndexOf('}());');
  return src.slice(afterStrict, close);
}

function wrapChunk(chunk, body) {
  return `// ${chunk.title} — extrait de world.js (IIFE)\n${body}\n`;
}

function buildWorldJs(chunkFiles) {
  const parts = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  );
  const body = parts.join('\n\n');
  return `// World: terrain, végétation, lumières, ciel (généré — éditer world/chunks/*.js puis npm run bundle:world)
(function () {
  'use strict';

${body}
}());
`;
}

const src = fs.readFileSync(WORLD, 'utf8');
const body = extractIifeBody(src);

if (!WRITE) {
  for (const chunk of CHUNKS) {
    console.log(chunk.file, extractChunkBody(body, chunk).split('\n').length, 'lines');
  }
  console.log('\nRun with --write');
  process.exit(0);
}

fs.mkdirSync(CHUNKS_DIR, { recursive: true });
for (const chunk of CHUNKS) {
  const content = extractChunkBody(body, chunk);
  fs.writeFileSync(path.join(CHUNKS_DIR, chunk.file), wrapChunk(chunk, content));
  console.log('wrote', chunk.file, content.split('\n').length, 'lines');
}
fs.writeFileSync(WORLD, buildWorldJs(CHUNKS));
console.log('bundled world.js');
