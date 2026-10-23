#!/usr/bin/env node
/** Usage: node tools/extract-sector-05-military-chunks.mjs [--write] */
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/sector_05_military.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/sector_05_military/chunks');
const WRITE = process.argv.includes('--write');
const CHUNKS = [
  { file: '00-config-infra.js', title: 'Config + clôtures + routes', start: 'const CX =', end: 'function _buildTrainingRange(scene, B)' },
  { file: '01-buildings-life.js', title: 'Casernes + mess + médical', start: 'function _buildTrainingRange(scene, B)', end: 'function _buildMotorPool(scene, B)' },
  { file: '02-buildings-ops.js', title: 'Hangar + armurerie + bunker', start: 'function _buildMotorPool(scene, B)', end: 'function _buildTents(scene, B)' },
  { file: '03-vehicles-register.js', title: 'Véhicules + props + register', start: 'function _buildTents(scene, B)', toEnd: true },
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
  return `// SECTOR 05 — MILITARY ZONE (généré — sector_05_military/chunks + npm run bundle:sector-05-military)\n(function () {\n  'use strict';\n\n${body}\n}());\n`;
}
const body = extractIifeBody(fs.readFileSync(SRC, 'utf8'));
if (!WRITE) { for (const c of CHUNKS) console.log(c.file, extractChunkBody(body, c).split('\n').length); process.exit(0); }
fs.mkdirSync(CHUNKS_DIR, { recursive: true });
for (const c of CHUNKS) { const t = extractChunkBody(body, c); fs.writeFileSync(path.join(CHUNKS_DIR, c.file), `// ${c.title}\n${t}\n`); console.log('wrote', c.file); }
fs.writeFileSync(SRC, buildBundled(CHUNKS));
