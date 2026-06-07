import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createClientVersionLoader } from '../apps/server/src/client-version.js';

const publicDir = path.join(process.cwd(), 'apps/client/public');

describe('client version', () => {
  it('client-version.json exists with a version string', () => {
    const file = path.join(publicDir, 'client-version.json');
    assert.ok(fs.existsSync(file));
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(typeof data.version === 'string' && data.version.length >= 4);
  });

  it('loader reads version from public client-version.json', () => {
    const { load } = createClientVersionLoader(publicDir);
    const v = load();
    assert.match(v, /^[\w.-]+$/);
    assert.notEqual(v, 'dev');
  });
});
