#!/usr/bin/env node
/**
 * Découpe game.js en game/chunks/*.js
 * Usage: node tools/extract-game-chunks.mjs [--write]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME = path.join(ROOT, 'apps/client/public/js/game.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/game/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-auth.js',
    title: 'Handoff + garde auth',
    start: 'function _clearAuthSession()',
    end: '  // ── State',
  },
  {
    file: '01-state-renderer.js',
    title: 'State + Three.js + overlay eau',
    start: '  // ── State',
    end: 'function _updateWaterEffect(px, pz, py)',
  },
  {
    file: '02-water-fx.js',
    title: 'Effets eau / pas / zone plage',
    start: 'function _updateWaterEffect(px, pz, py)',
    end: '  // ── Socket (parallèle au build',
  },
  {
    file: '03-socket-world.js',
    title: 'Socket + build monde + avatar FPS + raycast',
    start: '  // ── Socket (parallèle au build',
    end: '  ZS.pickAdminDecorPlacement = _pickAdminDecorPlacement;',
  },
  {
    file: '04-bootstrap-ui.js',
    title: 'Modules jeu + menu',
    start: '  // Position camera at spawn before first render',
    end: '  // ── Viewport sizing',
  },
  {
    file: '05-viewport-fs.js',
    title: 'Viewport adaptatif + plein écran',
    start: '  // ── Viewport sizing',
    end: '  // ── Input: keyboard',
  },
  {
    file: '06-input-keyboard.js',
    title: 'Clavier + raccourcis admin',
    start: '  // ── Input: keyboard',
    end: '  // ── Input: desktop pointer lock',
  },
  {
    file: '07-input-pointer.js',
    title: 'Pointer lock + souris',
    start: '  // ── Input: desktop pointer lock',
    end: '  // ── Combat : tir, mêlée',
  },
  {
    file: '08-combat.js',
    title: 'Tir, mêlée, récolte',
    start: '  // ── Combat : tir, mêlée',
    end: 'function _placeHeldStructure()',
  },
  {
    file: '09-interact.js',
    title: 'Portes, coffres, E / UI interact',
    start: 'function _placeHeldStructure()',
    end: '  state.onShoot  = attack;',
  },
  {
    file: '10-bindings.js',
    title: 'Callbacks tir + souris / molette',
    start: '  state.onShoot  = attack;',
    end: '  // ── Respawn',
  },
  {
    file: '11-respawn-loop-setup.js',
    title: 'Respawn + culling lumières',
    start: '  // ── Respawn',
    end: '  function loop(timestamp)',
  },
  {
    file: '12-loop.js',
    title: 'Boucle principale RAF',
    start: '  function loop(timestamp)',
    end: '  // ── Movement',
  },
  {
    file: '13-movement-export.js',
    title: 'Mouvement FPS + export ZS.Game',
    start: '  // ── Movement',
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
  const open = src.indexOf('(async function () {');
  const bodyStart = src.indexOf("'use strict';", open);
  const afterStrict = src.indexOf('\n', bodyStart) + 1;
  const close = src.lastIndexOf('}());');
  return src.slice(afterStrict, close);
}

function wrapChunk(chunk, body) {
  return `// ${chunk.title} — extrait de game.js (async IIFE)\n${body}\n`;
}

function buildGameJs(chunkFiles) {
  const parts = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  );
  const body = parts.join('\n\n');
  return `// Main game loop — Three.js setup, FPS movement, shooting (généré — éditer game/chunks/*.js puis npm run bundle:game)
(async function () {
  'use strict';

${body}
}());
`;
}

const src = fs.readFileSync(GAME, 'utf8');
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
fs.writeFileSync(GAME, buildGameJs(CHUNKS));
console.log('bundled game.js');
