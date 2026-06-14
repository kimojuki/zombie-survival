#!/usr/bin/env node
/** Découpe fps_arm_tuner.js — Usage: node tools/extract-fps-arm-tuner-chunks.mjs [--write] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/fps_arm_tuner.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/fps_arm_tuner/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-config-profiles.js',
    title: 'Constantes + PROFILES',
    start: 'const PRESETS_KEY =',
    end: 'function _getPath(obj, path)',
  },
  {
    file: '01-pose-helpers.js',
    title: 'Presets + merge poses',
    start: 'function _getPath(obj, path)',
    end: 'const ArmTuner = {',
  },
  {
    file: '02-tuner-core.js',
    title: 'ArmTuner init/show/hide/apply',
    start: 'const ArmTuner = {',
    end: '    _buildPanel() {',
  },
  {
    file: '03-tuner-panel.js',
    title: 'Panneau UI + validate',
    start: '    _buildPanel() {',
    end: '  window.ZS = window.ZS || {};',
  },
  {
    file: '04-export.js',
    title: 'Export ZS.ArmTuner',
    start: '  window.ZS = window.ZS || {};',
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
  return `// ${chunk.title} — extrait de fps_arm_tuner.js (IIFE)\n${body}\n`;
}

function buildBundled(chunkFiles) {
  const parts = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  );
  return `// Calibration bras FPS + items (généré — éditer fps_arm_tuner/chunks/*.js puis npm run bundle:fps-arm-tuner)
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
console.log('bundled fps_arm_tuner.js');
