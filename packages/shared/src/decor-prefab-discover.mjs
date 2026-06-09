/**
 * Découverte automatique des prefabs décor depuis le code client legacy.
 * Scanne apps/client/public/js — toute nouvelle entrée DECOR_PREFABS ou
 * registerDecorPrefab() apparaît dans le catalogue admin sans mise à jour manuelle.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const _HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_CLIENT_JS_DIR = path.resolve(_HERE, '../../../apps/client/public/js');

const _ID_RE = /^[a-z][a-z0-9_]*$/;

/**
 * @param {string} src
 * @returns {string[]}
 */
export function _extractRegisterDecorPrefabIds(src) {
  const ids = [];
  const re = /registerDecorPrefab\s*\(\s*['"]([a-z][a-z0-9_]*)['"]/g;
  for (const m of src.matchAll(re)) ids.push(m[1]);
  return ids;
}

/**
 * @param {string} src
 * @returns {string[]}
 */
export function _extractPrefabObjectIds(src) {
  const ids = [];
  const blockRe = /const\s+\w*PREFABS\s*=\s*\{/g;
  let hit;
  while ((hit = blockRe.exec(src)) !== null) {
    let depth = 1;
    const lines = src.slice(hit.index + hit[0].length).split('\n');
    for (const line of lines) {
      const key = line.match(/^\s+([a-z][a-z0-9_]*)\s*:\s*\{/);
      if (key && _ID_RE.test(key[1])) ids.push(key[1]);
      for (const ch of line) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      if (depth <= 0) break;
    }
  }
  return ids;
}

/**
 * @param {string} [clientJsDir]
 * @returns {string[]}
 */
export function discoverDecorPrefabIds(clientJsDir = DEFAULT_CLIENT_JS_DIR) {
  const ids = new Set();
  if (!fs.existsSync(clientJsDir)) return [];

  for (const name of fs.readdirSync(clientJsDir)) {
    if (!name.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(clientJsDir, name), 'utf8');
    for (const id of _extractRegisterDecorPrefabIds(src)) ids.add(id);
    for (const id of _extractPrefabObjectIds(src)) ids.add(id);
  }

  return [...ids].sort();
}
