#!/usr/bin/env node
/**
 * Découpe un chunk monolithique en sous-fichiers (même dossier).
 * Usage: node tools/split-chunk-file.mjs <path> '<json ranges>'
 *
 * ranges: [{ file, start, end?, toEnd? }]
 */
import fs from 'fs';
import path from 'path';

const configPath = process.argv[3];
const [filePath] = process.argv.slice(2);
if (!filePath || !configPath) {
  console.error('Usage: node tools/split-chunk-file.mjs <file> <config.json>');
  process.exit(1);
}

const ranges = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const src = fs.readFileSync(filePath, 'utf8');
const headerMatch = src.match(/^(\/\/[^\n]*\n)/);
const header = headerMatch ? headerMatch[1] : '';
const body = header ? src.slice(header.length) : src;
const dir = path.dirname(filePath);

function slice(start, end, toEnd = false) {
  const i0 = body.indexOf(start);
  if (i0 < 0) throw new Error(`start not found: ${start.slice(0, 50)}`);
  if (toEnd) return body.slice(i0).trimEnd();
  const i1 = body.indexOf(end, i0 + start.length);
  if (i1 < 0) throw new Error(`end not found after: ${start.slice(0, 50)}`);
  return body.slice(i0, i1).trimEnd();
}

for (const r of ranges) {
  const content = slice(r.start, r.end, r.toEnd);
  const title = r.title || r.file;
  fs.writeFileSync(path.join(dir, r.file), `// ${title}\n${content}\n`);
  console.log('wrote', r.file, content.split('\n').length, 'lines');
}

fs.unlinkSync(filePath);
console.log('removed', path.basename(filePath));
