#!/usr/bin/env node
/** Audit: chunk start markers vs top of IIFE body (detect omitted preamble). */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const toolsDir = path.join(ROOT, 'tools');
const files = fs.readdirSync(toolsDir).filter((f) => f.startsWith('extract-') && f.endsWith('-chunks.mjs'));

function iifeBody(src) {
  const open = src.indexOf("(function () {");
  const bodyStart = src.indexOf("'use strict';", open);
  return src.slice(src.indexOf('\n', bodyStart) + 1, src.lastIndexOf('}());'));
}

for (const file of files) {
  const mod = await import(path.join(toolsDir, file).replace(/\\/g, '/'));
  // Can't easily import - parse file instead
  const text = fs.readFileSync(path.join(toolsDir, file), 'utf8');
  const srcMatch = text.match(/const SRC = path\.join\(ROOT, '([^']+)'\)/);
  if (!srcMatch) continue;
  const rel = srcMatch[1];
  let gitBody;
  try {
    const gitSrc = execSync(`git show HEAD:${rel}`, { encoding: 'utf8', cwd: ROOT });
    gitBody = iifeBody(gitSrc);
  } catch {
    continue;
  }
  const starts = [...text.matchAll(/start: '([^']+)'/g)].map((m) => m[1]);
  if (!starts.length) continue;
  const firstStart = starts[0];
  const preamble = gitBody.slice(0, gitBody.indexOf(firstStart)).trim();
  if (preamble.length > 0) {
    console.log(`\n⚠ ${file} (${rel})`);
    console.log(`  first start: ${firstStart.slice(0, 50)}`);
    console.log(`  omitted ${preamble.split('\n').length} lines:`);
    console.log(preamble.split('\n').slice(0, 8).join('\n'));
    if (preamble.split('\n').length > 8) console.log('  ...');
  }
}
