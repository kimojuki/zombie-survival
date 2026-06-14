#!/usr/bin/env node
/** Usage: node tools/extract-admin-hub-chunks.mjs [--write] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/admin-hub.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/admin-hub/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  { file: '00-chrome.js', title: 'État + permissions + navigation', start: 'const VIEWS =', end: 'function _bindChrome()' },
  { file: '01-bind-menu.js', title: 'Events chrome + menu racine', start: 'function _bindChrome()', end: 'function _buildWorldView()' },
  { file: '02-world-view.js', title: 'Vue monde admin', start: 'function _buildWorldView()', end: 'function init()' },
  { file: '03-init-export.js', title: 'Init + export AdminHub', start: 'function init()', toEnd: true },
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
  return `// ${chunk.title} — admin-hub.js\n${body}\n`;
}

function buildBundled(chunkFiles) {
  const body = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  ).join('\n\n');
  return `// Hub admin F8 (généré — admin-hub/chunks + npm run bundle:admin-hub)
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
console.log('bundled admin-hub.js');
