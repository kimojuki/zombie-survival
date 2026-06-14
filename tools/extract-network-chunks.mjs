#!/usr/bin/env node
/**
 * Découpe network.js en chunks éditables (network/chunks/*.js).
 * Usage: node tools/extract-network-chunks.mjs [--write]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const NETWORK = path.join(ROOT, 'apps/client/public/js/network.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/network/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-state.js',
    title: 'État partagé + UI connexion',
    start: 'const remotePlayers = new Map();',
    end: 'function _terrainCollidersPayload()',
  },
  {
    file: '01-colliders.js',
    title: 'Sync colliders terrain',
    start: 'function _terrainCollidersPayload()',
    end: 'function _spawnDecorItem(d, spawnOpts = {})',
  },
  {
    file: '02-decor-part1-spawn-item.js',
    title: 'Spawn item décor unique',
    start: 'function _spawnDecorItem(d, spawnOpts = {})',
    end: 'function _gameInitDecorRadius()',
  },
  {
    file: '02-decor-part2-stream-gates.js',
    title: 'Stream fetch, gates, backlog',
    start: 'function _gameInitDecorRadius()',
    end: 'function _resetDecorSpawnDefer()',
  },
  {
    file: '02-decor-part3-defer-queue.js',
    title: 'Defer queue + tick spawn',
    start: 'function _resetDecorSpawnDefer()',
    end: 'function _resetTreeDefer()',
  },
  {
    file: '03-decor-part1-vis-init.js',
    title: 'Visibilité init + reveal',
    start: 'function _resetTreeDefer()',
    end: 'function _lodWindowMax(deferN, midLod, fps)',
  },
  {
    file: '03-decor-part2-lod.js',
    title: 'LOD upgrades + ring cache',
    start: 'function _lodWindowMax(deferN, midLod, fps)',
    end: 'function _findNameTag(mesh)',
  },
  {
    file: '03-decor-part3-nametag-vis.js',
    title: 'Nametags + visibilité décor',
    start: 'function _findNameTag(mesh)',
    end: 'async function _fetchDeferredTreesBatch()',
  },
  {
    file: '03-decor-part4-deferred-loaders.js',
    title: 'Loaders arbres/props différés',
    start: 'async function _fetchDeferredTreesBatch()',
    end: 'async function _spawnDecorBatch(list, onProgress, opts = {})',
  },
  {
    file: '04-decor-batch-colliders.js',
    title: 'Batch spawn + colliders décor',
    start: 'async function _spawnDecorBatch(list, onProgress, opts = {})',
    end: 'function _schedulePostInitGroundRefine(spawnX, spawnZ)',
  },
  {
    file: '05-init-sync.js',
    title: 'Post-init, game-init sync, preconnect',
    start: 'function _schedulePostInitGroundRefine(spawnX, spawnZ)',
    end: 'async function _finalizeGameInit(data)',
  },
  {
    file: '06-game-init.js',
    title: 'Finalisation game-init',
    start: 'async function _finalizeGameInit(data)',
    end: 'function init(socket, scene, state)',
  },
  {
    file: '07-init.js',
    title: 'init() — bootstrap socket',
    start: 'function init(socket, scene, state)',
    end: "}).catch((e) => console.warn('[groups] load', e));",
    includeEnd: true,
  },
  {
    file: '08-socket-handlers.js',
    title: 'Handlers Socket.io entrant',
    start: "    socket.on('connect', () => {\n      const needsResync",
    end: 'function getLocalXZ()',
  },
  {
    file: '09-tick-players.js',
    title: 'tick, emit, joueurs distants',
    start: 'function getLocalXZ()',
    end: 'function notifyDecorChop(decorId, dirX, dirZ)',
  },
  {
    file: '10-requests.js',
    title: 'Requêtes décor, storage, craft, sleep',
    start: 'function notifyDecorChop(decorId, dirX, dirZ)',
    end: 'function _getDecorRoot(id)',
  },
  {
    file: '11-export.js',
    title: 'Accesseurs décor + API ZS.Network',
    start: 'function _getDecorRoot(id)',
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
  return sliceBetween(
    body,
    chunk.start,
    chunk.end,
    true,
    chunk.includeEnd ?? false,
    chunk.toEnd ?? false,
  );
}

function extractIifeBody(src) {
  const open = src.indexOf("(function () {");
  if (open < 0) throw new Error('IIFE opener not found');
  const bodyStart = src.indexOf("'use strict';", open);
  if (bodyStart < 0) throw new Error('use strict not found');
  const afterStrict = src.indexOf('\n', bodyStart) + 1;
  const close = src.lastIndexOf('}());');
  if (close < 0) throw new Error('IIFE close not found');
  return src.slice(afterStrict, close);
}

function wrapChunk(chunk, body) {
  return `// ${chunk.title} — extrait de network.js (IIFE)\n${body}\n`;
}

function buildNetworkJs(chunkFiles) {
  const parts = chunkFiles.map((c) => fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''));
  const body = parts.join('\n\n');
  return `// Socket.io client — multiplayer sync (généré — éditer network/chunks/*.js puis npm run bundle:network)
(function () {
  'use strict';

${body}
}());
`;
}

const src = fs.readFileSync(NETWORK, 'utf8');
const body = extractIifeBody(src);

if (!WRITE) {
  for (const chunk of CHUNKS) {
    const content = extractChunkBody(body, chunk);
    console.log(chunk.file, content.split('\n').length, 'lines');
  }
  console.log('\nRun with --write to extract chunks + bundle network.js');
  process.exit(0);
}

fs.mkdirSync(CHUNKS_DIR, { recursive: true });
for (const chunk of CHUNKS) {
    const content = extractChunkBody(body, chunk);
  fs.writeFileSync(path.join(CHUNKS_DIR, chunk.file), wrapChunk(chunk, content));
  console.log('wrote', chunk.file, content.split('\n').length, 'lines');
}

fs.writeFileSync(NETWORK, buildNetworkJs(CHUNKS));
console.log('bundled network.js');
