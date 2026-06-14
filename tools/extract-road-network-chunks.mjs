#!/usr/bin/env node
/** Découpe road_network.js — Usage: node tools/extract-road-network-chunks.mjs [--write] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/client/public/js/road_network.js');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/road_network/chunks');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: '00-constants-state.js',
    title: 'Constantes + état réseau',
    start: 'const SNAP_RADIUS = 1.0;',
    end: 'function _groundCacheKey(px, pz)',
  },
  {
    file: '01-ground-geom.js',
    title: 'Cache sol + géométrie polylignes',
    start: 'function _groundCacheKey(px, pz)',
    end: 'function defineClearing(def)',
  },
  {
    file: '02-trails-def.js',
    title: 'Définition clairières / arêtes / sentiers',
    start: 'function defineClearing(def)',
    end: 'function _findRoadJoinAtEnd(trail)',
  },
  {
    file: '03-resolve-flatten.js',
    title: 'Resolve + flatten terrain',
    start: 'function _findRoadJoinAtEnd(trail)',
    end: 'function _normClearingDist(x, z, c)',
  },
  {
    file: '04-query-mats.js',
    title: 'Requêtes surface + matériaux',
    start: 'function _normClearingDist(x, z, c)',
    end: 'function _buildClearingDisc(scene, c, mat, exitCone)',
  },
  {
    file: '05-mesh-junctions.js',
    title: 'Meshes jonctions + barrières',
    start: 'function _buildClearingDisc(scene, c, mat, exitCone)',
    end: 'function _buildLaneOverlay(scene, edge, M)',
  },
  {
    file: '06-mesh-roads-sync.js',
    title: 'Ruban sync + asphalte',
    start: 'function _buildLaneOverlay(scene, edge, M)',
    end: 'function _yieldRoadFrame()',
  },
  {
    file: '07-async-build.js',
    title: 'Build async + resnap',
    start: 'function _yieldRoadFrame()',
    end: 'function removeEdgesByPrefix(prefix)',
  },
  {
    file: '08-build-export.js',
    title: 'buildMeshes + export ZS.RoadNetwork',
    start: 'function removeEdgesByPrefix(prefix)',
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
  return `// ${chunk.title} — extrait de road_network.js (IIFE)\n${body}\n`;
}

function buildBundled(chunkFiles) {
  const parts = chunkFiles.map((c) =>
    fs.readFileSync(path.join(CHUNKS_DIR, c.file), 'utf8').replace(/^\/\/[^\n]*\n/, ''),
  );
  const body = parts.join('\n\n');
  return `// Road network — spawn polish : disque clairière + sentier lissé (généré — éditer road_network/chunks/*.js puis npm run bundle:road-network)
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
console.log('bundled road_network.js');
