#!/usr/bin/env node
/** Re-extract chunk modules from git HEAD (UTF-8 safe). Usage: node tools/reextract-from-git.mjs map beach-decor */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const MODULES = {
  map: {
    rel: 'apps/client/public/js/map.js',
    header: '// Carte in-game (généré — map/chunks + npm run bundle:map)',
    chunks: [
      { file: '00-core-pickup.js', title: 'Constantes + init + pickup', start: 'const SPAWN_X =', end: 'function _drawPaperBg(ctx, W, H)' },
      { file: '01-draw-world.js', title: 'Canvas fond + secteurs', start: 'function _drawPaperBg(ctx, W, H)', end: 'function _drawGates(ctx)' },
      { file: '02-draw-export.js', title: 'Joueur + légende + export', start: 'function _drawGates(ctx)', toEnd: true },
    ],
  },
  'beach-decor': {
    rel: 'apps/client/public/js/beach_decor.js',
    header: '// Décor procédural plage (généré — beach_decor/chunks + npm run bundle:beach-decor)',
    chunks: [
      { file: '00-props.js', title: 'Constantes + helpers + builders', start: 'const SPAWN_X =', end: 'const _BUILDERS = [' },
      { file: '01-scatter.js', title: 'Pick + scatter instancé', start: 'const _BUILDERS = [', end: 'async function buildBeachDecorAsync(scene)' },
      { file: '02-async-export.js', title: 'Build async + export', start: 'async function buildBeachDecorAsync(scene)', toEnd: true },
    ],
  },
};

function iifeBody(src) {
  const open = src.indexOf("(function () {");
  const bodyStart = src.indexOf("'use strict';", open);
  return src.slice(src.indexOf('\n', bodyStart) + 1, src.lastIndexOf('}());'));
}

function extractChunkBody(body, c) {
  const i0 = body.indexOf(c.start);
  if (i0 < 0) throw new Error(`start not found: ${c.start}`);
  if (c.toEnd) return body.slice(i0).trimEnd();
  const i1 = body.indexOf(c.end, i0 + c.start.length);
  if (i1 < 0) throw new Error(`end not found after ${c.start}`);
  return body.slice(i0, i1).trimEnd();
}

const names = process.argv.slice(2);
if (!names.length) {
  console.error('Usage: node tools/reextract-from-git.mjs <map|beach-decor> [...]');
  process.exit(1);
}

for (const name of names) {
  const mod = MODULES[name];
  if (!mod) throw new Error(`unknown module: ${name}`);
  const gitSrc = execSync(`git show HEAD:${mod.rel}`, { encoding: 'utf8', cwd: ROOT });
  const body = iifeBody(gitSrc);
  const chunksDir = path.join(ROOT, path.dirname(mod.rel), 'chunks');
  fs.mkdirSync(chunksDir, { recursive: true });
  for (const c of mod.chunks) {
    const content = extractChunkBody(body, c);
    fs.writeFileSync(path.join(chunksDir, c.file), `// ${c.title}\n${content}\n`, 'utf8');
    console.log(name, 'wrote', c.file, content.split('\n').length, 'lines');
  }
  const bundledBody = mod.chunks.map((c) => extractChunkBody(body, c)).join('\n\n');
  const bundled = `${mod.header}
(function () {
  'use strict';

${bundledBody}
}());
`;
  fs.writeFileSync(path.join(ROOT, mod.rel), bundled, 'utf8');
  console.log(name, 'bundled', mod.rel);
}
