import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('legacy client module list points to existing scripts', () => {
  const src = readFileSync(join(root, 'apps/client/src/bootstrap/legacy-modules.js'), 'utf8');
  const modules = [...src.matchAll(/'([^']+\.js)'/g)].map((m) => m[1]);
  assert.equal(modules.length > 0, true);
  const missing = modules.filter((m) => !existsSync(join(root, 'apps/client/public', m)));
  assert.deepEqual(missing, []);
});
