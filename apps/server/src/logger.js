'use strict';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };

const _levelName = (process.env.LOG_LEVEL || '').toLowerCase();
const _activeLevel = LEVELS[_levelName] ??
  (process.env.NODE_ENV === 'development' ? LEVELS.debug : LEVELS.info);

const PLAYER_SNAPSHOT_MS = Math.max(0, parseInt(process.env.LOG_PLAYER_SNAPSHOT_MS || '10000', 10));
const SERVER_STATS_MS    = Math.max(0, parseInt(process.env.LOG_SERVER_STATS_MS || '60000', 10));
const TICK_SUMMARY_MS    = Math.max(0, parseInt(process.env.LOG_TICK_SUMMARY_MS || '30000', 10));
const SLOW_TICK_MS       = Math.max(10, parseInt(process.env.LOG_SLOW_TICK_MS || '80', 10));

const _throttle = new Map();
let _lastTickSummary = 0;

function _enabled(level) {
  return LEVELS[level] <= _activeLevel;
}

function _compact(data) {
  if (data === undefined || data === null) return '';
  try {
    return ' ' + JSON.stringify(data);
  } catch {
    return ' [unserializable]';
  }
}

function _write(level, tag, msg, data) {
  if (!_enabled(level)) return;
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] [${tag}] ${msg}${_compact(data)}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function throttled(key, ms, fn) {
  const now = Date.now();
  if (now - (_throttle.get(key) || 0) < ms) return;
  _throttle.set(key, now);
  fn();
}

function playerSnapshot(players) {
  if (!PLAYER_SNAPSHOT_MS || !_enabled('debug')) return;
  const list = [];
  for (const p of players.values()) {
    list.push({
      u: p.username,
      x: +p.x.toFixed(1),
      y: +p.y.toFixed(1),
      z: +p.z.toFixed(1),
      h: p.health,
      k: p.kills,
      eq: p.equipped || null,
    });
  }
  _write('debug', 'players', `snapshot (${list.length})`, list);
}

function serverStats(state) {
  if (!SERVER_STATS_MS || !_enabled('debug')) return;
  const mem = process.memoryUsage();
  _write('debug', 'stats', 'server', {
    online: state.players,
    zombies: state.zombies,
    items: state.items,
    structures: state.structures,
    colliders: state.colliders,
    lootBuildings: state.lootBuildings,
    waterZones: state.waterZones,
    worldTime: state.worldTime != null ? +state.worldTime.toFixed(3) : null,
    rssMB: +(mem.rss / 1048576).toFixed(1),
    heapMB: +(mem.heapUsed / 1048576).toFixed(1),
    uptimeS: Math.floor(process.uptime()),
  });
}

function tickSummary(zombies, players, elapsedMs) {
  if (!_enabled('debug')) return;
  const now = Date.now();
  if (TICK_SUMMARY_MS && now - _lastTickSummary >= TICK_SUMMARY_MS) {
    _lastTickSummary = now;
    let aggro = 0;
    for (const z of zombies.values()) if (z.aggroTimer > 0) aggro++;
    _write('debug', 'zombie', 'tick summary', {
      ms: +elapsedMs.toFixed(1),
      total: zombies.size,
      aggro,
      players: players.size,
    });
  }
  if (elapsedMs >= SLOW_TICK_MS) {
    _write('warn', 'perf', `slow zombie tick ${elapsedMs.toFixed(1)}ms`, {
      zombies: zombies.size,
      players: players.size,
    });
  }
}

module.exports = {
  error: (tag, msg, data) => _write('error', tag, msg, data),
  warn:  (tag, msg, data) => _write('warn', tag, msg, data),
  info:  (tag, msg, data) => _write('info', tag, msg, data),
  debug: (tag, msg, data) => _write('debug', tag, msg, data),
  trace: (tag, msg, data) => _write('trace', tag, msg, data),
  throttled,
  playerSnapshot,
  serverStats,
  tickSummary,
  PLAYER_SNAPSHOT_MS,
  SERVER_STATS_MS,
  isDebug: () => _enabled('debug'),
  isTrace: () => _enabled('trace'),
  level: _levelName || (_activeLevel >= LEVELS.debug ? 'debug' : 'info'),
};
