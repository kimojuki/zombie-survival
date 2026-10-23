#!/usr/bin/env node
/** Découpe admin-live-decor.js — Usage: node tools/extract-admin-live-decor-chunks.mjs [--write] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/admin-live-decor.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/admin-live-decor/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-config.js',
    title: 'Constantes + helpers slider',
    start: 'const PANEL_ID =',
    end: 'const AdminLiveDecor = {',
  },
  {
    file: '01-object-fields.js',
    title: 'État AdminLiveDecor',
    start: 'const AdminLiveDecor = {',
    end: '    _token() {',
  },
  {
    file: '02-methods-auth.js',
    title: 'Auth, undo, enter/exit',
    start: '    _token() {',
    end: '    enter() {',
  },
  {
    file: '03-methods-batch.js',
    title: 'Multi-sélection + batch',
    start: '    enter() {',
    end: '    onWheel(e) {',
  },
  {
    file: '04-methods-catalog.js',
    title: 'Catalogue + recherche + placement',
    start: '    onWheel(e) {',
    end: '    async _selectDecor(id) {',
  },
  {
    file: '05-methods-placement.js',
    title: 'Sélection décor + fetch',
    start: '    async _selectDecor(id) {',
    end: '    _buildBanner() {',
  },
  {
    file: '06-methods-panel.js',
    title: 'Banner + panneau DOM',
    start: '    _buildBanner() {',
    end: '    _syncPlaceButtons() {',
  },
  {
    file: '07-methods-form.js',
    title: 'Formulaire + save/delete',
    start: '    _syncPlaceButtons() {',
    end: '    _setStatus(msg, kind) {',
  },
  {
    file: '08-object-close-export.js',
    title: 'Status + export ZS',
    start: '    _setStatus(msg, kind) {',
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
  return `// ${chunk.title} — extrait de admin-live-decor.js (IIFE)\n${body}\n`;
}

function buildBundled(chunkFiles) {
  const parts = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  );
  const body = parts.join('\n\n');
  return `// Édition décor monde en live — admin : catalogue, pose preview, calibrage, sync live. (généré — éditer admin-live-decor/chunks/*.js puis npm run bundle:admin-live-decor)
(function () {
  'use strict';

${body}
}());
`;
}

const body = extractIifeBody(fs.readFileSync(SRC, 'utf8'));

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
fs.writeFileSync(SRC, buildBundled(CHUNKS));
console.log('bundled admin-live-decor.js');
