'use strict';
import fs from 'fs';

const lines = fs.readFileSync('apps/server/index.js', 'utf8').split('\n');

const expiryStart = lines.findIndex((l) => l.includes('// Expiration objets au sol'));
const makeZombieLine = lines.findIndex((l) => l.startsWith('function makeZombie('));
const regenInterval = lines.findIndex((l) => l.includes('resourceRegen?.tick()'));
let craftEnd = lines.findIndex((l) => l.startsWith('// ── Boot séquence'));
craftEnd--;
while (craftEnd > 0 && lines[craftEnd].trim() === '') craftEnd--;

if (expiryStart < 0 || makeZombieLine < 0 || regenInterval < 0 || craftEnd < 0) {
  throw new Error(`markers: expiry=${expiryStart} makeZombie=${makeZombieLine} regen=${regenInterval} craftEnd=${craftEnd}`);
}

// Block A: expiry + zombie sync + player spatial (stop before DETECT_RANGE / makeZombie)
const blockAEnd = lines.findIndex((l) => l.startsWith('async function loadZombiePrefabs'));
if (blockAEnd < 0) throw new Error('loadZombiePrefabs marker not found');
const blockA = lines.slice(expiryStart, blockAEnd).join('\n');

// Block B: intervals from resource regen through craft
const regenSetInterval = lines.findIndex((l, i) => l.startsWith('setInterval') && lines[i + 2]?.includes('resourceRegen?.tick()'));
if (regenSetInterval < 0) throw new Error('regen setInterval not found');
const blockB = lines.slice(regenSetInterval, craftEnd + 1).join('\n');

let body = `${blockA}\n\n${blockB}`;

const renames = [
  [/\b_playerVisibleZombies\b/g, 'playerVisibleZombies'],
  [/\b_zombieSyncTick\b/g, 'zombieSyncTick'],
  [/\b_lastZombieWallMs\b/g, 'lastZombieWallMs'],
  [/\b_lastPosSave\b/g, 'lastPosSave'],
  [/\b_lastSleeperSave\b/g, 'lastSleeperSave'],
  [/\b_playerSpatialGrid\b/g, 'playerSpatialGrid'],
  [/\b_zombieSpatialGrid\b/g, 'zombieSpatialGrid'],
];

for (const [re, to] of renames) body = body.replace(re, to);

// deps getters (with-block) — post-traitement après extraction brute
body = body
  .replace(/\b_worldTime\b/g, 'getWorldTime()')
  .replace(/getWorldTime\(\) = /g, 'setWorldTime(')
  .replace(/setWorldTime\(\(getWorldTime\(\) \+ DT \/ getWorldTime\(\)/g, 'setWorldTime((getWorldTime() + DT / dayDurationSec')
  .replace(/\/ _DAY_DURATION\)/g, '/ dayDurationSec)')
  .replace(/resourceRegen\?\.tick\(\)/g, 'resourceRegen()?.tick()')
  .replace(/\b_survivalMod\b/g, 'getSurvivalMod()')
  .replace(/getSurvivalMod\(\) \?/g, 'const svMod = getSurvivalMod();\n        const biteFx = svMod ?')
  .replace(/getSurvivalMod\(\)\.apply/g, 'svMod.apply')
  .replace(/worldColliders\.length/g, 'worldColliders().length')
  .replace(/lootBuildings\.length/g, 'lootBuildings().length')
  .replace(/worldWaterZones\.length/g, 'worldWaterZones().length');

// Retirer redéclarations couvertes par state{}
body = body.replace(/^let zombieSyncTick = 0;\n/m, '');
body = body.replace(/^\/\*\* @type \{Map<string, Set<number>>\} \*\/\nconst playerVisibleZombies = new Map\(\);\n\n/m, '');
body = body.replace(/^let lastZombieWallMs = Date\.now\(\);\n/m, '');
body = body.replace(/^const lastPosSave = new Map\(\);\n/m, '');
body = body.replace(/^const lastSleeperSave = new Map\(\);\n/m, '');

// Fix setWorldTime auto-day (replace mangled pattern from _worldTime rewrite)
body = body.replace(
  /if \(serverFlags\.autoDay\) \{\s*getWorldTime\(\) = \(getWorldTime\(\) \+ DT \/ dayDurationSec\) % 1;\s*\}/,
  'if (serverFlags.autoDay) {\n    setWorldTime((getWorldTime() + DT / dayDurationSec) % 1);\n  }',
);
body = body.replace(
  /if \(serverFlags\.autoDay\) \{\s*setWorldTime\(\(getWorldTime\(\) \+ DT \/ dayDurationSec\) % 1;\s*\}/,
  'if (serverFlags.autoDay) {\n    setWorldTime((getWorldTime() + DT / dayDurationSec) % 1);\n  }',
);

// spatial grid init used import(SPATIAL_GRID_URL) inline — keep, deps provides URL
body += `

api.rebuildPlayerSpatialGrid = _rebuildPlayerSpatialGrid;
api.broadcastPlayerMove = _broadcastPlayerMove;
api.playerVisibleZombies = playerVisibleZombies;
`;

const escaped = body.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const out = `'use strict';

/**
 * Boucles temps réel — loot expiry, zombie AI/sync, survie, craft, persist.
 */
function createWorldLoops(deps) {
  const state = {
    playerVisibleZombies: new Map(),
    zombieSyncTick: 0,
    lastZombieWallMs: Date.now(),
    lastPosSave: new Map(),
    lastSleeperSave: new Map(),
    playerSpatialGrid: null,
    zombieSpatialGrid: null,
  };
  const api = {};

  const fn = new Function('deps', 'state', 'api', \`
    with (deps) {
      with (state) {
${escaped}
      }
    }
  \`);
  fn(deps, state, api);

  return {
    get playerVisibleZombies() { return state.playerVisibleZombies; },
    rebuildPlayerSpatialGrid: (...args) => api.rebuildPlayerSpatialGrid(...args),
    broadcastPlayerMove: (...args) => api.broadcastPlayerMove(...args),
  };
}

module.exports = { createWorldLoops };
`;

fs.writeFileSync('apps/server/src/game/world-loops.js', out);
console.log('world-loops.js written, body lines:', body.split('\n').length);
