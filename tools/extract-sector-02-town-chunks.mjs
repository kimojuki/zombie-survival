#!/usr/bin/env node
/** Découpe sector_02_town.js — Usage: node tools/extract-sector-02-town-chunks.mjs [--write] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/sector_02_town.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/sector_02_town/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-config-build.js',
    title: 'Routes + build principal',
    start: 'const TOWN_MAIN_PTS =',
    end: '  // ── Mini marché',
  },
  {
    file: '01-shops.js',
    title: 'Marché, pharmacie, police, supermarché',
    start: '  // ── Mini marché',
    end: '  // ── Maisons résidentielles',
  },
  {
    file: '02-houses.js',
    title: 'Maisons + garages',
    start: '  // ── Maisons résidentielles',
    end: '  // ── Immeuble',
  },
  {
    file: '03-urban-core.js',
    title: 'Immeuble, parking, lampadaires, props',
    start: '  // ── Immeuble',
    end: '  // ── Place centrale',
  },
  {
    file: '04-square-cemetery.js',
    title: 'Place + cimetière + abribus',
    start: '  // ── Place centrale',
    end: '  // ── Étals de marché abandonnés',
  },
  {
    file: '05-extras-register.js',
    title: 'Signalisation + extras + registerSector',
    start: '  // ── Signalisation',
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
  return `// ${chunk.title} — extrait de sector_02_town.js (IIFE)\n${body}\n`;
}

function buildBundled(chunkFiles) {
  const parts = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  );
  return `// SECTOR 02 — SMALL TOWN (généré — éditer sector_02_town/chunks/*.js puis npm run bundle:sector-02-town)
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
console.log('bundled sector_02_town.js');
