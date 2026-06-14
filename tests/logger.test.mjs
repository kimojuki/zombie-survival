import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);

function loadLogger(tmpDir) {
  process.env.LOG_DIR = tmpDir;
  process.env.LOG_FILE = '1';
  process.env.LOG_LEVEL = 'info';
  process.env.LOG_CONSOLE = 'plain';
  const logPath = path.join(rootDir, 'apps/server/src/logger.js');
  delete require.cache[require.resolve(logPath)];
  return require(logPath);
}

test('logger — écrit dans LOG_DIR et respecte LOG_LEVEL', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zs-log-'));
  const log = loadLogger(tmp);

  log.info('test', 'hello file', { ok: true });
  log.debug('test', 'hidden debug');
  log.error('test', 'error line', { code: 1 });

  const files = fs.readdirSync(tmp);
  const sessionName = files.find((f) => /^\d{4}-\d{2}-\d{2}\.log$/.test(f));
  assert.ok(sessionName, `session log expected in ${files.join(', ')}`);
  const sessionText = fs.readFileSync(path.join(tmp, sessionName), 'utf8');
  assert.match(sessionText, /\[test\] hello file/);
  assert.doesNotMatch(sessionText, /hidden debug/);

  const errorText = fs.readFileSync(path.join(tmp, 'error.log'), 'utf8');
  assert.match(errorText, /error line/);

  const paths = log.getLogPaths();
  assert.equal(paths.fileEnabled, true);
  assert.equal(paths.dir, tmp);
});

test('boot-report — steps timing', async () => {
  const lines = [];
  const fakeLog = {
    info: (tag, msg, data) => lines.push({ level: 'info', tag, msg, data }),
    error: (tag, msg, data) => lines.push({ level: 'error', tag, msg, data }),
    banner: (title, meta) => lines.push({ level: 'banner', title, meta }),
    bootSummary: (s) => lines.push({ level: 'summary', s }),
  };
  const { createBootReport } = require(path.join(rootDir, 'apps/server/src/boot-report.js'));
  const boot = createBootReport(fakeLog);
  boot.banner({ port: 3000 });
  await boot.step('demo', async () => {
    await new Promise((r) => setTimeout(r, 5));
    return { added: 3 };
  });
  const { totalMs, steps } = boot.finish({ ok: true });
  assert.ok(totalMs >= 5);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].ok, true);
  assert.equal(steps[0].added, 3);
  assert.ok(lines.some((l) => l.msg?.startsWith('▶')));
  assert.ok(lines.some((l) => l.level === 'summary'));
});
