#!/usr/bin/env node
/** Usage: node tools/extract-prefab-catalog-preview-chunks.mjs [--write] */
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/prefab-catalog-preview.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/prefab-catalog-preview/chunks');
const WRITE = process.argv.includes('--write');
const CHUNKS = [
  { file: '00-anim-stub.js', title: 'Anim preview + stub ZS', start: 'const SCRIPTS =', end: 'function _loadScript(src, ver)' },
  { file: '01-thumb-scene.js', title: 'Chargement scripts + thumbnails', start: 'function _loadScript(src, ver)', end: 'function _resetModalView()' },
  { file: '02-modal.js', title: 'Modal preview 3D', start: 'function _resetModalView()', end: 'async function openModal(prefabId, meta)' },
  { file: '03-open-export.js', title: 'openModal + export', start: 'async function openModal(prefabId, meta)', toEnd: true },
];
function extractChunkBody(body, c) {
  const i0 = body.indexOf(c.start); if (i0 < 0) throw new Error(`start: ${c.start.slice(0,50)}`);
  if (c.toEnd) return body.slice(i0).trimEnd();
  const i1 = body.indexOf(c.end, i0 + c.start.length); if (i1 < 0) throw new Error(`end after ${c.start.slice(0,50)}`);
  return body.slice(i0, i1).trimEnd();
}
function extractIifeBody(src) {
  const o = src.indexOf("(function () {"), b = src.indexOf("'use strict';", o);
  return src.slice(src.indexOf('\n', b) + 1, src.lastIndexOf('}());'));
}
function buildBundled(files) {
  const body = files.map((c) => fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, '')).join('\n\n');
  return `// Aperçu 3D prefabs catalogue (généré — prefab-catalog-preview/chunks + npm run bundle:prefab-catalog-preview)\n(function () {\n  'use strict';\n\n${body}\n}());\n`;
}
const body = extractIifeBody(fs.readFileSync(SRC, 'utf8'));
if (!WRITE) { for (const c of CHUNKS) console.log(c.file, extractChunkBody(body, c).split('\n').length); process.exit(0); }
fs.mkdirSync(CHUNKS_DIR, { recursive: true });
for (const c of CHUNKS) { const t = extractChunkBody(body, c); fs.writeFileSync(path.join(CHUNKS_DIR, c.file), `// ${c.title}\n${t}\n`); console.log('wrote', c.file); }
fs.writeFileSync(SRC, buildBundled(CHUNKS));
