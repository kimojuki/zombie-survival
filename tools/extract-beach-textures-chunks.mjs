#!/usr/bin/env node
/** Usage: node tools/extract-beach-textures-chunks.mjs [--write] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/beach_textures.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/beach_textures/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  { file: '00-draw-core.js', title: 'Sable, bois, coquillages', start: 'const SAND_UV_TILE =', end: 'function _drawSeaweedCanvas()' },
  { file: '01-draw-misc.js', title: 'Déchets, corail, océan canvas', start: 'function _drawSeaweedCanvas()', end: 'function _drawOceanCanvas()' },
  { file: '02-ocean-export.js', title: 'Océan + lighting + export', start: 'function _drawOceanCanvas()', toEnd: true },
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
  return `// ${chunk.title} — beach_textures.js\n${body}\n`;
}

function buildBundled(chunkFiles) {
  const body = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  ).join('\n\n');
  return `// Textures procédurales plage (généré — beach_textures/chunks + npm run bundle:beach-textures)
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
console.log('bundled beach_textures.js');
