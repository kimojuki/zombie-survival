#!/usr/bin/env node
/** Découpe leisure_prefabs.js — Usage: node tools/extract-leisure-prefabs-chunks.mjs [--write] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/leisure_prefabs.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/leisure_prefabs/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-helpers.js',
    title: 'Helpers mesh',
    start: 'function _add(parent, geo, mat, x, y, z, rx, ry, rz)',
    end: 'function _buildDartboard(root)',
  },
  {
    file: '01-build-games-a.js',
    title: 'Jeux de salle A',
    start: 'function _buildDartboard(root)',
    end: 'function _buildMountainBike(root)',
  },
  {
    file: '02-build-games-b.js',
    title: 'Jeux de salle B + camp',
    start: 'function _buildMountainBike(root)',
    end: 'function _buildRouletteTable(root)',
  },
  {
    file: '03-build-outdoor.js',
    title: 'Sports extérieur + plage',
    start: 'function _buildRouletteTable(root)',
    end: 'function _buildSolarShower(root)',
  },
  {
    file: '04-build-misc.js',
    title: 'Divers loisirs',
    start: 'function _buildSolarShower(root)',
    end: 'if (ZS.registerDecorPrefab)',
  },
  {
    file: '05-register.js',
    title: 'Enregistrement catalogue',
    start: 'if (ZS.registerDecorPrefab)',
    toEnd: true,
  },
];

function extractChunkBody(body, chunk) {
  const i0 = body.indexOf(chunk.start);
  if (i0 < 0) throw new Error(`start not found: ${chunk.start.slice(0, 60)}`);
  if (chunk.toEnd) return body.slice(i0).trimEnd();
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
  return `// ${chunk.title} — extrait de leisure_prefabs.js (IIFE)\n${body}\n`;
}

function buildBundled(chunkFiles) {
  const parts = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  );
  return `// Prefabs sport, jeux et loisirs (généré — éditer leisure_prefabs/chunks/*.js puis npm run bundle:leisure-prefabs)
(function () {
  'use strict';

${parts.join('\n\n')}
}());
`;
}

const body = extractIifeBody(fs.readFileSync(SRC, 'utf8'));

if (!WRITE) {
  for (const chunk of CHUNKS) console.log(chunk.file, extractChunkBody(body, chunk).split('\n').length, 'lines');
  console.log('\nRun with --write');
  process.exit(0);
}

fs.mkdirSync(CHUNKS_DIR, { recursive: true });
for (const chunk of CHUNKS) {
  const content = extractChunkBody(body, chunk);
  fs.writeFileSync(path.join(CHUNKS_DIR, chunk.file), wrapChunk(chunk, content));
  console.log('wrote', chunk.file, content.split('\n').length, 'lines');
}
fs.writeFileSync(SRC, buildBundled(CHUNKS));
console.log('bundled leisure_prefabs.js');
