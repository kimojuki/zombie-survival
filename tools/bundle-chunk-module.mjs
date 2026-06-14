#!/usr/bin/env node
/**
 * Regénère un module IIFE depuis un dossier */chunks/*.js
 * Usage: node tools/bundle-chunk-module.mjs <chunksDir> <outFile> "<header line>"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const chunksRel = process.argv[2];
const outRel = process.argv[3];
const header = process.argv[4] || '// Generated chunk bundle';

if (!chunksRel || !outRel) {
  console.error('Usage: node tools/bundle-chunk-module.mjs <chunksDir> <outFile> "<header>"');
  process.exit(1);
}

const CHUNKS_DIR = path.join(ROOT, chunksRel);
const OUT = path.join(ROOT, outRel);
const files = fs.readdirSync(CHUNKS_DIR).filter((f) => f.endsWith('.js')).sort();
const body = files
  .map((f) => fs.readFileSync(path.join(CHUNKS_DIR, f), 'utf8').replace(/^\/\/[^\n]*\n/, '').trimEnd())
  .join('\n\n');

fs.writeFileSync(
  OUT,
  `${header}
(function () {
  'use strict';

${body}
}());
`,
);
console.log('bundled', path.basename(outRel), 'from', files.length, 'chunks (', body.split('\n').length, 'lines )');
