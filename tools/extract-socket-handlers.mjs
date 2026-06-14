#!/usr/bin/env node
/** Extrait un bloc handler socket vers src/socket/handlers/ */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = path.join(ROOT, 'apps/server/src/socket/register-sockets.js');
const src = fs.readFileSync(srcPath, 'utf8');

const startMarker = '/** use-item + debug-inv-snapshot';
const endMarker = '\n\nio.use((socket, next) => {';
const i0 = src.indexOf(startMarker);
const i1 = src.indexOf(endMarker);
if (i0 < 0 || i1 < 0) {
  console.error('markers not found', i0, i1);
  process.exit(1);
}
const body = src.slice(i0, i1).trimEnd();

const outPath = path.join(ROOT, 'apps/server/src/socket/handlers/inventory-handlers.js');
const out = `'use strict';

/** Handlers inventaire — extrait de register-sockets.js (with deps) */
const INVENTORY_HANDLERS = \`
${body}
\`;

module.exports = { INVENTORY_HANDLERS };
`;
fs.writeFileSync(outPath, out);
console.log('wrote', outPath, body.split('\n').length, 'lines');
