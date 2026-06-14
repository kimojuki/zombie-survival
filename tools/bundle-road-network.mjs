#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/road_network/chunks');
const OUT = path.join(ROOT, 'apps/client/public/js/road_network.js');

const files = fs.readdirSync(CHUNKS_DIR).filter((f) => f.endsWith('.js')).sort();
const body = files
  .map((f) => fs.readFileSync(path.join(CHUNKS_DIR, f), 'utf8').replace(/^\/\/[^\n]*\n/, '').trimEnd())
  .join('\n\n');

fs.writeFileSync(
  OUT,
  `// Road network — spawn polish : disque clairière + sentier lissé (généré — éditer road_network/chunks/*.js puis npm run bundle:road-network)
(function () {
  'use strict';

${body}
}());
`,
);
console.log('bundled road_network.js from', files.length, 'chunks (', body.split('\n').length, 'lines )');
