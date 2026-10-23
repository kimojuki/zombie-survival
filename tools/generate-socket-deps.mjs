'use strict';
import fs from 'fs';

const indexLines = fs.readFileSync('apps/server/index.js', 'utf8').split('\n');
const socketFile = fs.readFileSync('apps/server/src/socket/register-sockets.js', 'utf8');

const innerStart = socketFile.indexOf('with (deps) {') + 'with (deps) {'.length;
const innerEnd = socketFile.lastIndexOf('    }\n  `);');
const inner = socketFile.slice(innerStart, innerEnd);

const indexNames = new Set();
for (const line of indexLines) {
  let m = line.match(/^(?:async )?function (_?[a-zA-Z][a-zA-Z0-9_]*)/);
  if (m) indexNames.add(m[1]);
  m = line.match(/^const (_?[a-zA-Z][a-zA-Z0-9_]*)\s*=/);
  if (m) indexNames.add(m[1]);
  m = line.match(/^let (_?[a-zA-Z][a-zA-Z0-9_]*)\s*=/);
  if (m) indexNames.add(m[1]);
}

const used = new Set();
const re = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
let match;
while ((match = re.exec(inner)) !== null) {
  used.add(match[1]);
}

const reserved = new Set([
  'true', 'false', 'null', 'undefined', 'this', 'async', 'await', 'function',
  'const', 'let', 'var', 'if', 'else', 'return', 'try', 'catch', 'for', 'of',
  'in', 'switch', 'case', 'break', 'default', 'new', 'typeof', 'instanceof',
  'delete', 'void', 'with', 'deps', 'require', 'module', 'exports', 'Math',
  'Date', 'JSON', 'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean',
  'parseInt', 'parseFloat', 'isFinite', 'Set', 'Map', 'Error', 'process',
  'console', 'Buffer', 'setInterval', 'setTimeout', 'clearInterval', 'clearTimeout',
]);

const deps = [...used]
  .filter((n) => !reserved.has(n) && indexNames.has(n))
  .sort();

const missing = [...used]
  .filter((n) => !reserved.has(n) && !indexNames.has(n) && !n.startsWith('socket') && n.length > 1)
  .filter((n) => !['cb', 'd', 'p', 'pl', 'err', 'res', 'req', 'id', 'x', 'y', 'z', 'ok', 'msg', 'pw', 'cmd', 'user', 'data', 'payload', 'result', 'saved', 'sleep', 'target', 'actor', 'action', 'sock', 'now', 'dmg', 'died', 'grace', 'key', 'last', 'next', 'out', 'raw', 'snap', 'item', 'it', 'zombie', 'hit', 'list', 'rows', 'row', 'all', 'slice', 'offset', 'limit', 'total', 'spawn', 'inv', 'eff', 'stack', 'zone', 'idx', 'type', 'text', 'ang', 'dist', 'body', 'patch', 'changed', 'force', 'removed', 'road', 'preset', 'presets', 'allowed', 'kind', 'label', 'includePlayerBuilds', 'prefabId', 'comment', 'status', 'check', 'auth', 'online', 'decor', 'staticMod', 'poisMod', 'staticData', 'seedPlacements', 'pois', 'byLayer', 'results', 'q', 'layer', 'hay', 'message', 'text', 'handoff', 'leaving', 'purged', 'slot', 'username', 'token', 'player', 'hash', 'trace', 'reply', 'before', 'after', 'useZone', 'useIdx', 'svBefore', 'rationAdded', 'resolved', 'typeHint', 'itemFx', 'bedMod', 'getMaxHp', 'pending', 'itemId', 'verdict', 'feedback', 'cols', 'zones', 'building', 'buildings', 'scenMod', 'wokeFromSleep', 'priorSleep', 'killedWhileOffline', 'restore', 'hasLiveRestore', 'connectHealth', 'forceBeachRespawn', 'dbId', 'wakeInv', 'respawnKit', 'freshBeachSpawn', 'beachRespawnSpawn', 'liveSession', 'userId', 'save', '_save', 'survival', '_survival', 'connect', 'initDecor', 'clientKind', 'pid', 'tid', 'sleep', 'ground', 'n', 'i', 'j', 'k', 'v', 'r', 'dx', 'dz', 'd2', 'cx', 'cz', 'cy', 'px', 'pz', 'sx', 'sz', 'minR', 'nextOffset', 'maxN', 'maxR2', 'angle', 'ex', 'ey', 'ez', 'len', 'step', 'speed', 'dt', 't', 'hp', 'maxHp', 'qty', 'type', 'src', 'dst', 'from', 'to', 'name', 'val', 'old', 'cur', 'prev', 'state', 'job', 'grid', 'slot', 'bag', 'hotbar', 'inv', 'equipped', 'weapon', 'ammo', 'group', 'invite', 'member', 'leader', 'roster', 'manager', 'gm', 'password', 'lines', 'perm', 'perms', 'admin', 'self', 'viewer', 'catalog', 'assignments', 'owners', 'me', 'roads', 'backup', 'snap', 'saved', 'scope', 'counter', 'counters', 'mod', 'reviewSnap', 'prefabs', 'categories', 'reviews', 'reworkList', 'reworkDetails', 'validatedList', 'known', 'filename', 'payload', 'includePlayerBuilds', 'storageChanged', 'storage', 'storageSummary', 'immutable', 'editable', 'truncated', 'capacity', 'fillPct', 'origin', 'config', 'proto', 'host', 'capacity', 'items', 'count', 'hasMore', 'ready', 'boot', 'uptime', 'commit', 'clientVersion', 'serverRole', 'decor', 'invDebugBuild', 'chat', 'rcon', 'ok', 'error', 'code', 'status', 'role', 'qaEnabled', 'devOnly', 'guestEnabled', 'registerEnabled', 'authMode', 'handoffEnabled', 'version', 'serverId', 'servers', 'public', 'health', 'players', 'online', 'slotsRemaining'].includes(n))
  .sort();

console.log('deps count', deps.length);
console.log('deps:', deps.join(', '));
if (missing.length) {
  console.log('\nmissing from index (may be local or import):', missing.slice(0, 80).join(', '));
  if (missing.length > 80) console.log(`... +${missing.length - 80} more`);
}

fs.writeFileSync(
  'apps/server/src/socket/deps-names.json',
  JSON.stringify(deps, null, 2),
);
