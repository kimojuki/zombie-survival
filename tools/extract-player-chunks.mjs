#!/usr/bin/env node
/**
 * Découpe player.js en player/chunks/*.js
 * Usage: node tools/extract-player-chunks.mjs [--write]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLAYER = path.join(ROOT, 'apps/client/public/js/player.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/player/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-constants.js',
    title: 'Couleurs skin / vêtements',
    start: 'const SKIN  = 0xFFCBA4;',
    end: 'function createPlayerModel(opts = {})',
  },
  {
    file: '01-humanoid.js',
    title: 'Rig humanoïde joueur / zombie',
    start: 'function createPlayerModel(opts = {})',
    end: 'function _mergeAnim(base, over)',
  },
  {
    file: '02-grips.js',
    title: 'GRIPS, poses, getGrip',
    start: 'function _mergeAnim(base, over)',
    end: 'function _fpsMat(color)',
  },
  {
    file: '03-fps-part1-pose.js',
    title: 'FPS bras creation + poses',
    start: 'function _fpsMat(color)',
    end: 'function triggerArmAnim(fpsGroup, kind, type, opts',
  },
  {
    file: '03-fps-part2-anim-tick.js',
    title: 'Anim bras + tick rig',
    start: 'function triggerArmAnim(fpsGroup, kind, type, opts',
    end: 'function _fit(type)',
  },
  {
    file: '04-items-glb.js',
    title: 'GLB items + spawnDecorItem',
    start: 'function _fit(type)',
    end: 'function _clearSharedCenterHolder(fpsGroup)',
  },
  {
    file: '05-hand-torch.js',
    title: 'Main, torche, muzzle flash',
    start: 'function _clearSharedCenterHolder(fpsGroup)',
    end: 'function _buildModel(type)',
  },
  {
    file: '06-proc-models.js',
    title: 'Modèles procéduraux items',
    start: 'function _buildModel(type)',
    end: 'function _boxGeo(w, h, d)',
  },
  {
    file: '07-utils-export.js',
    title: 'Helpers mesh + exports ZS',
    start: 'function _boxGeo(w, h, d)',
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
  return `// ${chunk.title} — extrait de player.js (IIFE)\n${body}\n`;
}

function buildPlayerJs(chunkFiles) {
  const parts = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  );
  const body = parts.join('\n\n');
  return `// Modèles personnages + bras FPS + items (généré — éditer player/chunks/*.js puis npm run bundle:player)
(function () {
  'use strict';

${body}
}());
`;
}

const src = fs.readFileSync(PLAYER, 'utf8');
const body = extractIifeBody(src);

if (!WRITE) {
  for (const chunk of CHUNKS) {
    console.log(chunk.file, extractChunkBody(body, chunk).split('\n').length, 'lines');
  }
  console.log('\nRun with --write');
  process.exit(0);
}

fs.mkdirSync(CHUNKS_DIR, { recursive: true });
for (const chunk of CHUNKS) {
  const content = extractChunkBody(body, chunk);
  fs.writeFileSync(path.join(CHUNKS_DIR, chunk.file), wrapChunk(chunk, content));
  console.log('wrote', chunk.file, content.split('\n').length, 'lines');
}
fs.writeFileSync(PLAYER, buildPlayerJs(CHUNKS));
console.log('bundled player.js');
