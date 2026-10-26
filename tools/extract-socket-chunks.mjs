#!/usr/bin/env node
/**
 * Découpe register-sockets.js en handlers/ par domaine.
 * Usage: node tools/extract-socket-chunks.mjs [--write]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REG = path.join(ROOT, 'apps/server/src/socket/register-sockets.js');
const HANDLERS_DIR = path.join(ROOT, 'apps/server/src/socket/handlers');
const WRITE = process.argv.includes('--write');

const CHUNKS = [
  {
    file: 'socket-auth.js',
    export: 'SOCKET_AUTH',
    title: 'Middleware auth Socket.io',
    start: 'io.use((socket, next) => {',
    end: "io.on('connection', async (socket) => {",
    includeStart: true,
    includeEnd: false,
  },
  {
    file: 'connection-bootstrap.js',
    export: 'CONNECTION_BOOTSTRAP',
    title: 'Bootstrap joueur à la connexion',
    start: "io.on('connection', async (socket) => {",
    end: '  // Le premier client transmet la géométrie de collision',
    includeStart: true,
    includeEnd: false,
  },
  {
    file: 'world-sync-handlers.js',
    export: 'WORLD_SYNC_HANDLERS',
    title: 'Sync monde client → serveur (colliders, eau, loot)',
    start: '  // Le premier client transmet la géométrie de collision',
    end: "  socket.on('move', (d) => {",
    includeStart: true,
    includeEnd: false,
  },
  {
    file: 'player-sync-handlers.js',
    export: 'PLAYER_SYNC_HANDLERS',
    title: 'Mouvement, équipement, sync zombie/game-init',
    start: "  socket.on('move', (d) => {",
    end: "  socket.on('scenario-advance', (d) => {",
    includeStart: true,
    includeEnd: false,
  },
  {
    file: 'combat-handlers.js',
    export: 'COMBAT_HANDLERS',
    title: 'Scénario, tir, pickup/drop items',
    start: "  socket.on('scenario-advance', (d) => {",
    end: "  socket.on('decor-chop', (d) => {",
    includeStart: true,
    includeEnd: false,
  },
  {
    file: 'decor-handlers.js',
    export: 'DECOR_HANDLERS',
    title: 'Décor, portes, storage, build, sleep',
    start: "  socket.on('decor-chop', (d) => {",
    end: "  socket.on('inventory-move', async (d, cb) => {",
    includeStart: true,
    includeEnd: false,
  },
  {
    file: 'inventory-craft-handlers.js',
    export: 'INVENTORY_CRAFT_HANDLERS',
    title: 'Inventaire, craft, respawn',
    start: "  socket.on('inventory-move', async (d, cb) => {",
    end: "  socket.on('sleep-loot-open', (data, cb) => {",
    includeStart: true,
    includeEnd: false,
  },
  {
    file: 'sleep-loot-handlers.js',
    export: 'SLEEP_LOOT_HANDLERS',
    title: 'Fouille corps endormi',
    start: "  socket.on('sleep-loot-open', (data, cb) => {",
    end: "  socket.on('group-create', (cb) => {",
    includeStart: true,
    includeEnd: false,
  },
  {
    file: 'social-handlers.js',
    export: 'SOCIAL_HANDLERS',
    title: 'Groupes, chat, admin, rcon socket',
    start: "  socket.on('group-create', (cb) => {",
    end: "  socket.on('disconnect', () => {",
    includeStart: true,
    includeEnd: false,
  },
  {
    file: 'disconnect-handlers.js',
    export: 'DISCONNECT_HANDLERS',
    title: 'Déconnexion joueur',
    start: "  socket.on('disconnect', () => {",
    end: '    _emitPlayersOnline();\n  });\n});',
    includeStart: true,
    includeEnd: true,
  },
];

function extractTemplateBody(src) {
  const m = src.match(/\$\{INVENTORY_HANDLERS\}\n\n([\s\S]*?)\n {4}\}\n {2}`\)/);
  if (m) return m[1];
  const m2 = src.match(/with \(deps\) \{\n\n([\s\S]*?)\n {4}\}\n {2}`\)/);
  if (m2) return m2[1].replace(/^\/\*\* use-item[\s\S]*?\n\}\n\n/, '');
  throw new Error('template body not found');
}

function sliceChunk(body, chunk) {
  const i0 = body.indexOf(chunk.start);
  const i1 = body.indexOf(chunk.end, i0 + 1);
  if (i0 < 0 || i1 < 0) {
    throw new Error(`chunk ${chunk.file}: markers not found (i0=${i0}, i1=${i1})`);
  }
  const from = chunk.includeStart ? i0 : i0 + chunk.start.length;
  const to = chunk.includeEnd ? i1 + chunk.end.length : i1;
  return body.slice(from, to).trimEnd();
}

function wrapHandler(chunk, content) {
  return `'use strict';

/** ${chunk.title} — extrait de register-sockets.js (with deps) */
const ${chunk.export} = \`
${content}
\`;

module.exports = { ${chunk.export} };
`;
}

function buildRegisterSockets() {
  const imports = [
    "const { INVENTORY_HANDLERS } = require('./handlers/inventory-handlers');",
    ...CHUNKS.map((c) => {
      const name = c.export;
      const req = `./handlers/${c.file.replace('.js', '')}`;
      return `const { ${name} } = require('${req}');`;
    }),
  ].join('\n');

  const injections = [
    '${INVENTORY_HANDLERS}',
    ...CHUNKS.map((c) => `\${${c.export}}`),
  ].join('\n\n');

  return `'use strict';

${imports}

/**
 * Handlers Socket.io — orchestration (corps dans handlers/*).
 */
function registerSocketHandlers(deps) {
  const fn = new Function('deps', \`
    with (deps) {

${injections}
    }
  \`);
  fn(deps);
}

module.exports = { registerSocketHandlers };
`;
}

const src = fs.readFileSync(REG, 'utf8');
const body = extractTemplateBody(src);

if (!WRITE) {
  for (const chunk of CHUNKS) {
    const content = sliceChunk(body, chunk);
    console.log(chunk.file, content.split('\n').length, 'lines');
  }
  console.log('\nRun with --write to extract files and rewrite register-sockets.js');
  process.exit(0);
}

fs.mkdirSync(HANDLERS_DIR, { recursive: true });
for (const chunk of CHUNKS) {
  const content = sliceChunk(body, chunk);
  fs.writeFileSync(path.join(HANDLERS_DIR, chunk.file), wrapHandler(chunk, content));
  console.log('wrote', chunk.file, content.split('\n').length, 'lines');
}

fs.writeFileSync(REG, buildRegisterSockets());
console.log('rewrote register-sockets.js');
