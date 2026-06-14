#!/usr/bin/env node
/**
 * Vérifications avant release — tests + rappels documentation.
 * Usage : npm run release:check
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

function warn(msg) {
  console.warn(`[release-check] ⚠ ${msg}`);
}

function ok(msg) {
  console.log(`[release-check] ✓ ${msg}`);
}

function main() {
  console.log('[release-check] Zombie Survival — pre-release\n');

  const versionFile = 'apps/client/public/client-version.json';
  if (!fs.existsSync(path.join(ROOT, versionFile))) {
    warn(`${versionFile} introuvable`);
  } else {
    const ver = JSON.parse(read(versionFile)).version;
    ok(`client version: ${ver}`);
  }

  const notes = read('docs/RELEASE_NOTES.md');
  if (notes.includes('## En cours (non publié)') && notes.includes('_Aucune entrée')) {
    warn('RELEASE_NOTES.md — section « En cours » vide : remplir avant merge master');
  } else {
    ok('RELEASE_NOTES.md — brouillon « En cours » présent');
  }

  if (!fs.existsSync(path.join(ROOT, 'docs/RELEASE_PROCESS.md'))) {
    warn('RELEASE_PROCESS.md manquant');
  } else {
    ok('RELEASE_PROCESS.md présent');
  }

  console.log('\n[release-check] lint + test…\n');
  execSync('npm run lint', { cwd: ROOT, stdio: 'inherit' });
  execSync('npm test', { cwd: ROOT, stdio: 'inherit' });

  console.log('\n[release-check] Terminé — compléter checklist docs/RELEASE_PROCESS.md avant deploy prod.');
}

main();
