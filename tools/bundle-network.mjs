#!/usr/bin/env node
/**
 * Regénère network.js depuis network/chunks/*.js
 * Usage: npm run bundle:network
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHUNKS_DIR = path.join(ROOT, 'apps/client/public/js/network/chunks');
const NETWORK = path.join(ROOT, 'apps/client/public/js/network.js');

const files = fs.readdirSync(CHUNKS_DIR).filter((f) => f.endsWith('.js')).sort();
if (!files.length) {
  console.error('No chunks in', CHUNKS_DIR);
  process.exit(1);
}

const parts = files.map((f) => {
  const raw = fs.readFileSync(path.join(CHUNKS_DIR, f), 'utf8');
  return raw.replace(/^\/\/[^\n]*\n/, '').trimEnd();
});

const body = parts.join('\n\n');
const out = `// Socket.io client — multiplayer sync (généré — éditer network/chunks/*.js puis npm run bundle:network)
(function () {
  'use strict';

${body}
}());
`;

fs.writeFileSync(NETWORK, out);
console.log('bundled network.js from', files.length, 'chunks (', body.split('\n').length, 'lines )');
