#!/usr/bin/env node
/** Usage: node tools/extract-sector-01-forest-chunks.mjs [--write] */
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/sector_01_forest.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/sector_01_forest/chunks');
const WRITE = process.argv.includes('--write');
const CHUNKS = [
  { file: '00-spawn-camp.js', title: 'Spawn + campement', start: '// ── Carte locale spawn', end: 'function _buildLargeTent(scene, B, cx, cz, baseY)' },
  { file: '01-cabins-gas.js', title: 'Tentes + cabanes + essence', start: 'function _buildLargeTent(scene, B, cx, cz, baseY)', end: 'function _buildRiver(scene)' },
  { file: '02-river.js', title: 'Rivière + berges', start: 'function _buildRiver(scene)', end: 'function _buildUtilityPoles(scene, B)' },
  { file: '03-poles-register.js', title: 'Poteaux + souches + register', start: 'function _buildUtilityPoles(scene, B)', toEnd: true },
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
  return `// SECTOR 01 — FOREST (généré — sector_01_forest/chunks + npm run bundle:sector-01-forest)\n(function () {\n  'use strict';\n\n${body}\n}());\n`;
}
const body = extractIifeBody(fs.readFileSync(SRC, 'utf8'));
if (!WRITE) { for (const c of CHUNKS) console.log(c.file, extractChunkBody(body, c).split('\n').length); process.exit(0); }
fs.mkdirSync(CHUNKS_DIR, { recursive: true });
for (const c of CHUNKS) { const t = extractChunkBody(body, c); fs.writeFileSync(path.join(CHUNKS_DIR, c.file), `// ${c.title}\n${t}\n`); console.log('wrote', c.file); }
fs.writeFileSync(SRC, buildBundled(CHUNKS));
