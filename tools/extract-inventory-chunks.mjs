#!/usr/bin/env node
/**
 * Découpe inventory.js en inventory/chunks/*.js
 * Usage: node tools/extract-inventory-chunks.mjs [--write]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INV = path.join(ROOT, 'apps/client/public/js/inventory.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/inventory/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-state.js',
    title: 'État inventaire + constantes',
    start: 'const HOTBAR_SIZE = 6;',
    end: 'function init(state, scene, socket)',
  },
  {
    file: '01-core.js',
    title: 'Init, tick, grab, portes',
    start: 'function init(state, scene, socket)',
    end: 'function _isWallSnapKind(kind)',
  },
  {
    file: '02-build.js',
    title: 'Placement structures + ghost',
    start: 'function _isWallSnapKind(kind)',
    end: 'function spawnStructure(d)',
  },
  {
    file: '03-world-sync.js',
    title: 'Spawn items monde + stacks',
    start: 'function spawnStructure(d)',
    end: 'function addItem(type, qty)',
  },
  {
    file: '04-items-combat.js',
    title: 'Add/remove, armure, munitions, save',
    start: 'function addItem(type, qty)',
    end: 'function _syncToServer()',
  },
  {
    file: '05-ui-part1-drag.js',
    title: 'Hotbar DOM + drag-drop',
    start: 'function _syncToServer()',
    end: 'function _buildInvPanel()',
  },
  {
    file: '05-ui-part2-panel.js',
    title: 'Panel inventaire + pickup mesh',
    start: 'function _buildInvPanel()',
    end: 'window.ZS = window.ZS || {};',
  },
  {
    file: '06-export.js',
    title: 'Export ZS.Inventory',
    start: 'window.ZS = window.ZS || {};',
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
  return `// ${chunk.title} — extrait de inventory.js (IIFE)\n${body}\n`;
}

function buildInventoryJs(chunkFiles) {
  const parts = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  );
  const body = parts.join('\n\n');
  return `// Inventory — hotbar + sac + équipement (généré — éditer inventory/chunks/*.js puis npm run bundle:inventory)
(function () {
  'use strict';

${body}
}());
`;
}

const src = fs.readFileSync(INV, 'utf8');
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
fs.writeFileSync(INV, buildInventoryJs(CHUNKS));
console.log('bundled inventory.js');
