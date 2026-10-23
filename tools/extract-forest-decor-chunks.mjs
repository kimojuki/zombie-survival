#!/usr/bin/env node
/** Usage: node tools/extract-forest-decor-chunks.mjs [--write] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/forest_decor.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/forest_decor/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  { file: '00-chunk-geo.js', title: 'Geo + chunks + visibilité', start: 'const FT = ()', end: 'function _sampleInForest(rng, maxTries)' },
  { file: '01-builders.js', title: 'Builders procéduraux', start: 'function _sampleInForest(rng, maxTries)', end: 'function _pickBuilder(rng, x)' },
  { file: '02-scatter-async.js', title: 'Scatter + build async', start: 'function _pickBuilder(rng, x)', end: 'window.ZS = window.ZS || {};' },
  { file: '03-export.js', title: 'Export ZS', start: 'window.ZS = window.ZS || {};', toEnd: true },
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
  return src.slice(afterStrict, src.lastIndexOf('}());'));
}

function wrapChunk(chunk, body) {
  return `// ${chunk.title} — forest_decor.js\n${body}\n`;
}

function buildBundled(chunkFiles) {
  const body = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  ).join('\n\n');
  return `// Décor procédural forêt (généré — forest_decor/chunks + npm run bundle:forest-decor)
(function () {
  'use strict';

${body}
}());
`;
}

const body = extractIifeBody(fs.readFileSync(SRC, 'utf8'));
if (!WRITE) {
  for (const c of CHUNKS) console.log(c.file, extractChunkBody(body, c).split('\n').length, 'lines');
  console.log('\nRun with --write');
  process.exit(0);
}
fs.mkdirSync(CHUNKS_DIR, { recursive: true });
for (const c of CHUNKS) {
  const content = extractChunkBody(body, c);
  fs.writeFileSync(path.join(CHUNKS_DIR, c.file), wrapChunk(c, content));
  console.log('wrote', c.file, content.split('\n').length, 'lines');
}
fs.writeFileSync(SRC, buildBundled(CHUNKS));
console.log('bundled forest_decor.js');
