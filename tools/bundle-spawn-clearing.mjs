#!/usr/bin/env node
/** Regénère spawn_clearing.js depuis spawn_clearing/chunks/*.js */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/spawn_clearing/chunks');
const OUT = path.join(ROOT, 'apps/client/public/js/spawn_clearing.js');

const files = fs.readdirSync(CHUNKS_DIR).filter((f) => f.endsWith('.js')).sort();
const parts = files.map((f) => fs.readFileSync(path.join(CHUNKS_DIR, f), 'utf8').replace(/^\/\/[^\n]*\n/, '').trimEnd());
const body = parts.join('\n\n');

fs.writeFileSync(
  OUT,
  `// Décor visuel de la clairière de spawn (généré — éditer spawn_clearing/chunks/*.js puis npm run bundle:spawn-clearing)
// Orientation prefabs : packages/shared/src/decor-prefab-orientation.mjs · docs/DECOR_PREFAB_ORIENTATION.md
(function () {
  'use strict';

${body}
}());
`,
);

console.log('bundled spawn_clearing.js from', files.length, 'chunks (', body.split('\n').length, 'lines )');
