#!/usr/bin/env node
/**
 * Liste les fichiers JS/MJS volumineux (candidats monolithe).
 * Usage: node tools/audit-monoliths.mjs [--min=500] [--json]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIN = parseInt(process.argv.find((a) => a.startsWith('--min='))?.split('=')[1] || '500', 10);
const JSON_OUT = process.argv.includes('--json');

const SCAN_ROOTS = [
  'apps/server',
  'apps/client/public/js',
  'apps/auth-server',
  'packages/shared/src',
];

const SKIP = /node_modules|[/\\]dist[/\\]|\.vite|client-version\.json/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (SKIP.test(full.replace(/\\/g, '/'))) continue;
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(js|mjs|cjs)$/.test(name)) out.push(full);
  }
  return out;
}

function countLines(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
}

const rows = [];
for (const rel of SCAN_ROOTS) {
  for (const file of walk(path.join(ROOT, rel))) {
    const lines = countLines(file);
    if (lines >= MIN) {
      rows.push({
        lines,
        path: path.relative(ROOT, file).replace(/\\/g, '/'),
        root: rel.split('/')[0] + '/' + (rel.split('/')[1] || ''),
      });
    }
  }
}

rows.sort((a, b) => b.lines - a.lines);

if (JSON_OUT) {
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

console.log(`=== Monolith audit (>= ${MIN} lines) ===\n`);
let lastRoot = '';
for (const r of rows) {
  if (r.root !== lastRoot) {
    console.log(`\n## ${r.root}`);
    lastRoot = r.root;
  }
  const flag = r.lines >= 2000 ? ' 🔴' : r.lines >= 1000 ? ' 🟠' : '';
  console.log(`  ${String(r.lines).padStart(5)}  ${r.path}${flag}`);
}
console.log(`\n${rows.length} fichiers >= ${MIN} lignes`);
