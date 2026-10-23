#!/usr/bin/env node
/** Usage: node tools/extract-build-anchors-chunks.mjs [--write] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/build_anchors.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/build_anchors/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  { file: '00-floor-registry.js', title: 'Registre fondations + hauteurs', start: 'const CELL =', end: 'function syncRegistryFromDecor(list)' },
  { file: '01-snap-walls.js', title: 'Sync décor + snap murs/plafonds', start: 'function syncRegistryFromDecor(list)', end: 'function findFoundationDeckNear(px, pz, buildLevel' },
  { file: '02-queries-export.js', title: 'Queries + export BuildAnchors', start: 'function findFoundationDeckNear(px, pz, buildLevel', toEnd: true },
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
  return `// ${chunk.title} — build_anchors.js\n${body}\n`;
}

function buildBundled(chunkFiles) {
  const body = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  ).join('\n\n');
  return `// Points d'ancrage fondations (généré — build_anchors/chunks + npm run bundle:build-anchors)
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
console.log('bundled build_anchors.js');
