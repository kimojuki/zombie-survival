#!/usr/bin/env node
/** Usage: node tools/extract-admin-zone-overlay-chunks.mjs [--write] */
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/admin-zone-overlay.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/admin-zone-overlay/chunks');
const WRITE = process.argv.includes('--write');
const CHUNKS = [
  { file: '00-draw-helpers.js', title: 'Layers + primitives ligne', start: 'const GROUP_NAME =', end: 'function _buildSafeBeachContour()' },
  { file: '01-build-layers.js', title: 'Contours plage, exclusions, build', start: 'function _buildSafeBeachContour()', end: 'function _dispose()' },
  { file: '02-ui-export.js', title: 'Toggle + panel + export', start: 'function _dispose()', toEnd: true },
];
function extractChunkBody(body, c) {
  const i0 = body.indexOf(c.start); if (i0 < 0) throw new Error(`start: ${c.start.slice(0, 50)}`);
  if (c.toEnd) return body.slice(i0).trimEnd();
  const i1 = body.indexOf(c.end, i0 + c.start.length); if (i1 < 0) throw new Error(`end after ${c.start.slice(0, 50)}`);
  return body.slice(i0, i1).trimEnd();
}
function extractIifeBody(src) {
  const o = src.indexOf("(function () {"), b = src.indexOf("'use strict';", o);
  return src.slice(src.indexOf('\n', b) + 1, src.lastIndexOf('}());'));
}
function buildBundled(files) {
  const body = files.map((c) => fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, '')).join('\n\n');
  return `// Overlay zones admin (généré — admin-zone-overlay/chunks + npm run bundle:admin-zone-overlay)\n(function () {\n  'use strict';\n\n${body}\n}());\n`;
}
const body = extractIifeBody(fs.readFileSync(SRC, 'utf8'));
if (!WRITE) { for (const c of CHUNKS) console.log(c.file, extractChunkBody(body, c).split('\n').length); process.exit(0); }
fs.mkdirSync(CHUNKS_DIR, { recursive: true });
for (const c of CHUNKS) { const t = extractChunkBody(body, c); fs.writeFileSync(path.join(CHUNKS_DIR, c.file), `// ${c.title}\n${t}\n`); console.log('wrote', c.file); }
fs.writeFileSync(SRC, buildBundled(CHUNKS));
