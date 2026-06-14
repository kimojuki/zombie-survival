#!/usr/bin/env node
/** Découpe audio.js — Usage: node tools/extract-audio-chunks.mjs [--write] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/audio.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/audio/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-state-load.js',
    title: 'État + chargement buffers',
    start: 'const MUTE_KEY =',
    end: '  // ── Initialisation / reprise du contexte',
  },
  {
    file: '01-init-biome.js',
    title: 'Init + ambiances biomes',
    start: '  // ── Initialisation / reprise du contexte',
    end: '  function scatterSeagull(nearness)',
  },
  {
    file: '02-footsteps-spatial.js',
    title: 'Pas + spatial + eau',
    start: '  function scatterSeagull(nearness)',
    end: '  // ── Tir d\'arme à feu',
  },
  {
    file: '03-combat-sfx.js',
    title: 'Tir, zombie, porte, mêlée',
    start: '  // ── Tir d\'arme à feu',
    end: '  // ── Panoramique stéréo',
  },
  {
    file: '04-torch-mute-export.js',
    title: 'Torche + mute + export ZS.Audio',
    start: '  // ── Panoramique stéréo',
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
  return `// ${chunk.title} — extrait de audio.js (IIFE)\n${body}\n`;
}

function buildBundled(chunkFiles) {
  const parts = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  );
  return `// Web Audio — ambiances + SFX (généré — éditer audio/chunks/*.js puis npm run bundle:audio)
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
console.log('bundled audio.js');
