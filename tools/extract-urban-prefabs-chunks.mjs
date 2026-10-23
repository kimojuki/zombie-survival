#!/usr/bin/env node
/** Découpe urban_prefabs.js — Usage: node tools/extract-urban-prefabs-chunks.mjs [--write] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/urban_prefabs.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/urban_prefabs/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-helpers.js',
    title: 'Helpers mesh + palettes',
    start: 'function _add(parent, geo, mat, x, y, z, rx, ry, rz)',
    end: 'function _buildTrashBin(root)',
  },
  {
    file: '01-build-outdoor.js',
    title: 'Props rue / extérieur',
    start: 'function _buildTrashBin(root)',
    end: 'function _buildOfficeDesk(root)',
  },
  {
    file: '02-build-interior.js',
    title: 'Mobilier intérieur',
    start: 'function _buildOfficeDesk(root)',
    end: 'function _buildBathtub(root)',
  },
  {
    file: '03-build-misc-a.js',
    title: 'Divers urbain A',
    start: 'function _buildBathtub(root)',
    end: 'function _buildJerseyBarrier(root)',
  },
  {
    file: '03-build-misc-b.js',
    title: 'Divers urbain B',
    start: 'function _buildJerseyBarrier(root)',
    end: 'function _buildSlotMachine(root)',
  },
  {
    file: '03-build-misc-c.js',
    title: 'Divers urbain C',
    start: 'function _buildSlotMachine(root)',
    end: 'function _buildEvCharger(root)',
  },
  {
    file: '03-build-misc-d.js',
    title: 'Divers urbain D',
    start: 'function _buildEvCharger(root)',
    end: 'if (ZS.registerDecorPrefab)',
  },
  {
    file: '04-register.js',
    title: 'Enregistrement catalogue décor',
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
  return `// ${chunk.title} — extrait de urban_prefabs.js (IIFE)\n${body}\n`;
}

function buildBundled(chunkFiles) {
  const parts = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  );
  const body = parts.join('\n\n');
  return `// Prefabs ville / urbain — catalogue RCON pour construction de map (S02+). (généré — éditer urban_prefabs/chunks/*.js puis npm run bundle:urban-prefabs)
(function () {
  'use strict';

${body}
}());
`;
}

const body = extractIifeBody(fs.readFileSync(SRC, 'utf8'));

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
fs.writeFileSync(SRC, buildBundled(CHUNKS));
console.log('bundled urban_prefabs.js');
