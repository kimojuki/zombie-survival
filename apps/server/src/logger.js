'use strict';

const fs = require('fs');
const path = require('path');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const _levelName = (process.env.LOG_LEVEL || '').toLowerCase();
const _activeLevel = LEVELS[_levelName] ??
  (process.env.NODE_ENV === 'development' ? LEVELS.debug : LEVELS.info);

const PLAYER_SNAPSHOT_MS = Math.max(0, parseInt(process.env.LOG_PLAYER_SNAPSHOT_MS || '10000', 10));
const SERVER_STATS_MS = Math.max(0, parseInt(process.env.LOG_SERVER_STATS_MS || '60000', 10));
const TICK_SUMMARY_MS = Math.max(0, parseInt(process.env.LOG_TICK_SUMMARY_MS || '30000', 10));
const SLOW_TICK_MS = Math.max(10, parseInt(process.env.LOG_SLOW_TICK_MS || '80', 10));

const LOG_FILE_ENABLED = process.env.LOG_FILE !== '0' && process.env.LOG_FILE !== 'false';
const LOG_CONSOLE = (process.env.LOG_CONSOLE || 'pretty').toLowerCase();
const LOG_PRETTY = LOG_CONSOLE === 'pretty' && process.stdout.isTTY;

const _fileDir = (() => {
  const raw = process.env.LOG_DIR || 'logs/server';
  return path.isAbsolute(raw) ? raw : path.join(ROOT_DIR, raw);
})();

const _throttle = new Map();
let _lastTickSummary = 0;
let _sessionLogPath = null;
let _errorLogPath = null;

const COLORS = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[90m',
  trace: '\x1b[35m',
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function _enabled(level) {
  return LEVELS[level] <= _activeLevel;
}

function _dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function _ensureFileStreams() {
  if (!LOG_FILE_ENABLED || _sessionLogPath) return;
  try {
    fs.mkdirSync(_fileDir, { recursive: true });
    _sessionLogPath = path.join(_fileDir, `${_dateStamp()}.log`);
    _errorLogPath = path.join(_fileDir, 'error.log');
  } catch (err) {
    console.error('[logger] cannot open log files', err.message);
  }
}

function _compact(data) {
  if (data === undefined || data === null) return '';
  try {
    return ' ' + JSON.stringify(data);
  } catch {
    return ' [unserializable]';
  }
}

function _formatPlain(level, tag, msg, data) {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] [${tag}] ${msg}${_compact(data)}`;
}

function _formatPretty(level, tag, msg, data) {
  const ts = new Date().toTimeString().slice(0, 8);
  const c = COLORS[level] || '';
  const lvl = level.toUpperCase().padEnd(5);
  const tagP = tag.slice(0, 14).padEnd(14);
  let line = `${COLORS.dim}[${ts}]${COLORS.reset} ${c}${lvl}${COLORS.reset} ${COLORS.bold}${tagP}${COLORS.reset} ${msg}`;
  if (data !== undefined && data !== null) {
    if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length <= 6) {
      const parts = Object.entries(data).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
      line += ` ${COLORS.dim}(${parts.join(' · ')})${COLORS.reset}`;
    } else {
      line += `${COLORS.dim}${_compact(data)}${COLORS.reset}`;
    }
  }
  return line;
}

function _writeFile(line, level) {
  if (!LOG_FILE_ENABLED) return;
  _ensureFileStreams();
  try {
    if (_sessionLogPath) fs.appendFileSync(_sessionLogPath, line + '\n');
    if (level === 'error' && _errorLogPath) fs.appendFileSync(_errorLogPath, line + '\n');
  } catch (err) {
    console.error('[logger] file append failed', err.message);
  }
}

function _write(level, tag, msg, data) {
  if (!_enabled(level)) return;
  const plain = _formatPlain(level, tag, msg, data);
  const out = LOG_PRETTY ? _formatPretty(level, tag, msg, data) : plain;
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);
  _writeFile(plain, level);
}

function throttled(key, ms, fn) {
  const now = Date.now();
  if (now - (_throttle.get(key) || 0) < ms) return;
  _throttle.set(key, now);
  fn();
}

function banner(title, meta) {
  _ensureFileStreams();
  const lines = [
    '══════════════════════════════════════════════════════════',
    title,
    '══════════════════════════════════════════════════════════',
  ];
  if (meta && typeof meta === 'object') {
    for (const [k, v] of Object.entries(meta)) {
      if (v === undefined || v === null || v === '') continue;
      lines.push(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
    }
  }
  if (LOG_FILE_ENABLED && _sessionLogPath) {
    lines.push(`  logs: ${_sessionLogPath}`);
    if (_errorLogPath) lines.push(`  errors: ${_errorLogPath}`);
  }
  lines.push('──────────────────────────────────────────────────────────');
  for (const line of lines) {
    if (LOG_PRETTY) console.log(`${COLORS.bold}${line}${COLORS.reset}`);
    else console.log(line);
    _writeFile(`[${new Date().toISOString()}] [INFO] [boot] ${line}`, 'info');
  }
}

function bootSummary(summary) {
  const { totalMs, steps = [], failed = 0, ...rest } = summary || {};
  _write('info', 'boot', '── résumé initialisation ──', {
    totalMs,
    steps: steps.length,
    failed,
    ...rest,
  });
  for (const s of steps) {
    const mark = s.ok === false ? '✗' : '✓';
    _write(s.ok === false ? 'warn' : 'debug', 'boot', `  ${mark} ${s.step}`, {
      ms: s.ms,
      ...(s.error ? { error: s.error } : {}),
    });
  }
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
    decor: state.decor,
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

function getLogPaths() {
  _ensureFileStreams();
  return {
    dir: _fileDir,
    session: _sessionLogPath,
    error: _errorLogPath,
    fileEnabled: LOG_FILE_ENABLED,
  };
}

module.exports = {
  error: (tag, msg, data) => _write('error', tag, msg, data),
  warn: (tag, msg, data) => _write('warn', tag, msg, data),
  info: (tag, msg, data) => _write('info', tag, msg, data),
  debug: (tag, msg, data) => _write('debug', tag, msg, data),
  trace: (tag, msg, data) => _write('trace', tag, msg, data),
  throttled,
  banner,
  bootSummary,
  playerSnapshot,
  serverStats,
  tickSummary,
  getLogPaths,
  PLAYER_SNAPSHOT_MS,
  SERVER_STATS_MS,
  isDebug: () => _enabled('debug'),
  isTrace: () => _enabled('trace'),
  level: _levelName || (_activeLevel >= LEVELS.debug ? 'debug' : 'info'),
  fileDir: _fileDir,
  fileEnabled: LOG_FILE_ENABLED,
};
