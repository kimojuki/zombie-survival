#!/usr/bin/env node
/** Découpe decor_colliders.js — Usage: node tools/extract-decor-colliders-chunks.mjs [--write] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/decor_colliders.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/decor_colliders/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-prefab-data-a.js',
    title: 'PREFAB_COLLIDERS A',
    start: 'const PREFAB_COLLIDERS = {',
    end: 'spawn_prop_double_bed:',
  },
  {
    file: '01-prefab-data-b.js',
    title: 'PREFAB_COLLIDERS B',
    start: 'spawn_prop_double_bed:',
    end: 'spawn_prop_barber_chair:',
  },
  {
    file: '02-prefab-data-c.js',
    title: 'PREFAB_COLLIDERS C + build',
    start: 'spawn_prop_barber_chair:',
    end: '/** Dimensions épaves',
  },
  {
    file: '03-wreck-items.js',
    title: 'WRECK_BODY + ITEM_COLLIDERS',
    start: '/** Dimensions épaves',
    end: '/** Pièces validées une par une',
  },
  {
    file: '04-shack-doors.js',
    title: 'Shack + portes colliders',
    start: '/** Pièces validées une par une',
    end: 'function buildDecorColliders(spec)',
  },
  {
    file: '05-build-export.js',
    title: 'buildDecorColliders + export',
    start: 'function buildDecorColliders(spec)',
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
  return `// ${chunk.title} — extrait de decor_colliders.js (IIFE)\n${body}\n`;
}

function buildBundled(chunkFiles) {
  const parts = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  );
  return `// Collisions 2D décor prefab / item (généré — éditer decor_colliders/chunks/*.js puis npm run bundle:decor-colliders)
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
console.log('bundled decor_colliders.js');
