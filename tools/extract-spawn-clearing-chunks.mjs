#!/usr/bin/env node
/**
 * Découpe spawn_clearing.js en spawn_clearing/chunks/*.js
 * Usage: node tools/extract-spawn-clearing-chunks.mjs [--write]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/spawn_clearing.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/spawn_clearing/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-geo-ground.js',
    title: 'Géométrie camp, hauteur sol, sentier spawn',
    start: 'function _rng(seed)',
    end: 'function _add(parent, geo, mat, x, y, z, rx, ry, rz)',
  },
  {
    file: '01-props-part1-spawn.js',
    title: 'Props spawn basiques',
    start: 'function _add(parent, geo, mat, x, y, z, rx, ry, rz)',
    end: 'function _buildCabinTable(parent, x, y, z, ry)',
  },
  {
    file: '01-props-part2a-cabin-furniture.js',
    title: 'Mobilier cabine leger',
    start: 'function _buildCabinTable(parent, x, y, z, ry)',
    end: 'function _buildCabinBasin(parent, x, y, z, ry)',
  },
  {
    file: '01-props-part2b-cabin-heavy.js',
    title: 'Basin, horloge, portemanteau',
    start: 'function _buildCabinBasin(parent, x, y, z, ry)',
    end: 'function _buildBeachWreckDebris(parent, x, y, z, ry)',
  },
  {
    file: '01-props-part3-beach.js',
    title: 'Plage, workbench, lean-to',
    start: 'function _buildBeachWreckDebris(parent, x, y, z, ry)',
    end: 'function _buildSurvivorShackWallNorth(g)',
  },
  {
    file: '02-props-shack-houses.js',
    title: 'Shack, bois, maisons smallcity',
    start: 'function _buildSurvivorShackWallNorth(g)',
    end: 'function buildCampGround(scene, cx, cz, baseY, B)',
  },
  {
    file: '03-camp-ground.js',
    title: 'Lisière rondins + mesh sol camp',
    start: 'function buildCampGround(scene, cx, cz, baseY, B)',
    end: 'const DECOR_DOORS = new Map();',
  },
  {
    file: '04-decor-registry.js',
    title: 'DECOR_PREFABS + registre',
    start: 'const DECOR_DOORS = new Map();',
    end: 'function _decorYawFromRoot(root)',
  },
  {
    file: '05-decor-interact.js',
    title: 'Portes, storage, nearest, hit XZ',
    start: 'function _decorYawFromRoot(root)',
    end: 'const _adminPickHits = [];',
  },
  {
    file: '06-decor-raycast.js',
    title: 'Raycast admin / portes / panneaux',
    start: 'const _adminPickHits = [];',
    end: 'function _rockWorldBoundsY(root)',
  },
  {
    file: '07-decor-rock-build.js',
    title: 'Rochers, floors build, reconcile',
    start: 'function _rockWorldBoundsY(root)',
    end: 'function spawnDecorPrefab(scene, prefabId, x, y, z, opts = {})',
  },
  {
    file: '08-decor-spawn.js',
    title: 'spawnDecorPrefab',
    start: 'function spawnDecorPrefab(scene, prefabId, x, y, z, opts = {})',
    end: 'function buildCampLayout(scene, cx, cz, baseY, B)',
  },
  {
    file: '09-camp-layout.js',
    title: 'Layout camp spawn + props herbes',
    start: 'function buildCampLayout(scene, cx, cz, baseY, B)',
    end: 'function _onPath(x, z)',
  },
  {
    file: '10-trail-clearing.js',
    title: 'Sentier, ring clairière, trail decor',
    start: 'function _onPath(x, z)',
    end: 'window.ZS = window.ZS || {};',
  },
  {
    file: '11-export.js',
    title: 'Exports ZS + upgradeTreeLod',
    start: 'window.ZS = window.ZS || {};',
    toEnd: true,
  },
];

function sliceBetween(src, startMarker, endMarker, includeStart = true, includeEnd = false, toEnd = false) {
  const i0 = src.indexOf(startMarker);
  if (i0 < 0) throw new Error(`start not found: ${startMarker.slice(0, 60)}`);
  const searchFrom = i0 + startMarker.length;
  if (toEnd) return src.slice(includeStart ? i0 : searchFrom).trimEnd();
  const i1 = src.indexOf(endMarker, searchFrom);
  if (i1 < 0) throw new Error(`end not found after ${startMarker.slice(0, 60)}`);
  const from = includeStart ? i0 : searchFrom;
  const to = includeEnd ? i1 + endMarker.length : i1;
  return src.slice(from, to).trimEnd();
}

function extractChunkBody(body, chunk) {
  return sliceBetween(body, chunk.start, chunk.end, true, chunk.includeEnd ?? false, chunk.toEnd ?? false);
}

function extractIifeBody(src) {
  const open = src.indexOf("(function () {");
  if (open < 0) throw new Error('IIFE opener not found');
  const bodyStart = src.indexOf("'use strict';", open);
  const afterStrict = src.indexOf('\n', bodyStart) + 1;
  const close = src.lastIndexOf('}());');
  if (close < 0) throw new Error('IIFE close not found');
  return src.slice(afterStrict, close);
}

function wrapChunk(chunk, body) {
  return `// ${chunk.title} — extrait de spawn_clearing.js (IIFE)\n${body}\n`;
}

function buildSpawnClearingJs(chunkFiles) {
  const parts = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  );
  const body = parts.join('\n\n');
  return `// Décor visuel de la clairière de spawn (généré — éditer spawn_clearing/chunks/*.js puis npm run bundle:spawn-clearing)
// Orientation prefabs : packages/shared/src/decor-prefab-orientation.mjs · docs/DECOR_PREFAB_ORIENTATION.md
(function () {
  'use strict';

${body}
}());
`;
}

const src = fs.readFileSync(SRC, 'utf8');
const body = extractIifeBody(src);

if (!WRITE) {
  for (const chunk of CHUNKS) {
    const content = extractChunkBody(body, chunk);
    console.log(chunk.file, content.split('\n').length, 'lines');
  }
  console.log('\nRun with --write to extract chunks + bundle spawn_clearing.js');
  process.exit(0);
}

fs.mkdirSync(CHUNKS_DIR, { recursive: true });
for (const chunk of CHUNKS) {
  const content = extractChunkBody(body, chunk);
  fs.writeFileSync(path.join(CHUNKS_DIR, chunk.file), wrapChunk(chunk, content));
  console.log('wrote', chunk.file, content.split('\n').length, 'lines');
}

fs.writeFileSync(SRC, buildSpawnClearingJs(CHUNKS));
console.log('bundled spawn_clearing.js');
