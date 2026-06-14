#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/admin-live-decor/chunks');
const OUT = path.join(ROOT, 'apps/client/public/js/admin-live-decor.js');

const files = fs.readdirSync(CHUNKS_DIR).filter((f) => f.endsWith('.js')).sort();
const body = files
  .map((f) => fs.readFileSync(path.join(CHUNKS_DIR, f), 'utf8').replace(/^\/\/[^\n]*\n/, '').trimEnd())
  .join('\n\n');

fs.writeFileSync(
  OUT,
  `// Édition décor monde en live — admin : catalogue, pose preview, calibrage, sync live. (généré — éditer admin-live-decor/chunks/*.js puis npm run bundle:admin-live-decor)
(function () {
  'use strict';

${body}
}());
`,
);
console.log('bundled admin-live-decor.js from', files.length, 'chunks (', body.split('\n').length, 'lines )');
