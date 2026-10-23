'use strict';
import fs from 'fs';

const path = 'apps/server/index.js';
let lines = fs.readFileSync(path, 'utf8').split('\n');

function findLine(pred, from = 0) {
  const i = lines.findIndex((l, idx) => idx >= from && pred(l, idx));
  if (i < 0) throw new Error('line not found');
  return i;
}

function removeRange(startPred, endPred) {
  const start = findLine(startPred);
  const end = findLine(endPred, start + 1);
  lines.splice(start, end - start + 1);
  return { start, removed: end - start + 1 };
}

// 1. World HTTP routes (keep helper functions)
const wStart = findLine((l) => l.startsWith("app.get('/api/world/decor-trees'"));
const wEnd = findLine((l) => l.startsWith("app.get('/api/world/decor-rocks'"));
// include full decor-rocks handler through closing });
let wEndFull = wEnd;
while (wEndFull < lines.length && lines[wEndFull].trim() !== '});') wEndFull++;
lines.splice(wStart, wEndFull - wStart + 1);

// 2. Dev routes block
const dStart = findLine((l) => l.includes('// ── Dev / bench routes'));
const dEnd = findLine((l) => l.includes('// ── Game state (suite)'));
lines.splice(dStart, dEnd - dStart);

// 3. Socket block
const sStart = findLine((l) => l.includes('// ── Socket.io'));
const reinit = findLine((l) => l.startsWith('// ── Réinitialisation unique'));
let sEnd = reinit - 1;
while (sEnd > sStart && lines[sEnd].trim() === '') sEnd--;
lines.splice(sStart, sEnd - sStart + 1);

// 4. Imports
const importLine = findLine((l) => l.includes("require('./src/routes/admin-routes')"));
if (!lines[importLine + 1]?.includes('world-routes')) {
  lines.splice(
    importLine + 1,
    0,
    "const { registerWorldRoutes } = require('./src/routes/world-routes');",
    "const { registerDevRoutes } = require('./src/routes/dev-routes');",
    "const { registerSocketHandlers } = require('./src/socket/register-sockets');",
    "const { createSocketDeps } = require('./src/socket/create-socket-deps');",
  );
}

// 5. Insert register calls before `let rcon = null`
const bindings = fs.readFileSync('apps/server/src/socket/bindings-snippet.js.txt', 'utf8').trim();
const rconLine = findLine((l) => l.trim() === 'let rcon = null;');

const worldReg = `
registerWorldRoutes(app, {
  getServerReady: () => serverReady,
  decorTreesBeyond: (sx, sz, minR) => _decorTreesBeyond(decorItems, sx, sz, minR),
  decorPropsBeyond: (sx, sz, minR) => _decorPropsBeyond(decorItems, sx, sz, minR),
  decorNearPlayer: (px, pz, radius) => _decorItemsNearPlayer(decorItems, px, pz, radius),
  getDecorItems: () => decorItems,
  isMinableRockPrefab: _isMinableRockPrefab,
});

registerDevRoutes(app, {
  log,
  jwt,
  JWT_SECRET,
  getPlayer,
  createPlayer,
  savePlayerState,
  bcrypt,
  authPayload: _authPayload,
  serverRole: SERVER_ROLE,
  isQaServer,
  authFromHeader,
  qaChecklist,
  getSleepingPlayers: () => sleepingPlayers,
  deleteWorldSleeper,
  beachSpawn: BEACH_SPAWN,
  benchSave: BENCH_SAVE,
  isBenchUsername: _isBenchUsername,
  getScenarioBeach: _getScenarioBeach,
});

${bindings}
`;

if (!lines.some((l) => l.includes('registerWorldRoutes(app'))) {
  lines.splice(rconLine, 0, worldReg);
}

fs.writeFileSync(path, lines.join('\n'));
console.log('index.js updated, lines:', lines.length);
