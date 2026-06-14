#!/usr/bin/env node
/**
 * Copie landing + assets publics dans infra/docker/edge/www (volume nginx edge).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CLIENT = path.join(ROOT, 'apps/client');
const OUT = path.join(ROOT, 'infra/docker/edge/www');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(CLIENT, 'public'), OUT);
fs.copyFileSync(path.join(CLIENT, 'index.html'), path.join(OUT, 'index.html'));
console.log('[edge-sync] OK', OUT);
