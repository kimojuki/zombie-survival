/** Filtre décor game-init + listes différées (arbres / props). */

/** Rayon game-init + APIs decor-trees / decor-props (sync serveur ↔ client network.js). */
export const GAME_INIT_DECOR_RADIUS = Object.freeze({ mobile: 220, desktop: 320 });

/** Marge au-delà de decorVisRadius : spawn mesh caché avant d'entrer dans le cône visible. */
export const DECOR_SPAWN_MARGIN = Object.freeze({ mobile: 85, desktop: 120 });

export function gameInitDecorRadius(clientKind) {
  return clientKind === 'mobile' ? GAME_INIT_DECOR_RADIUS.mobile : GAME_INIT_DECOR_RADIUS.desktop;
}

export function isFelledTreeDecor(item) {
  if (!item?.prefabId?.startsWith('tree_')) return false;
  if (item.falling) return true;
  return Number(item.woodRemaining) <= 0;
}

export function skipGameInitDecor(d) {
  if (d.prefabId?.startsWith('road_barrier_')) return true;
  const pk = String(d.placementKey || '');
  if (pk.startsWith('s01:hub:') || pk.startsWith('s01:camp:')) return true;
  return false;
}

/** @deprecated Préférer isCriticalPinnedDecorServer — incluait tout s01: (milliers d'objets). */
export function isPinnedDecorServer(d) {
  return isCriticalPinnedDecorServer(d);
}

/** Builds, coffres, portes — toujours game-init. Le seed s01: lointain passe par decor-props. */
export function isCriticalPinnedDecorServer(d) {
  if (!d) return false;
  const pid = d.prefabId || d.type || '';
  if (pid.startsWith('build_') || pid.startsWith('wreck_')) return true;
  if (pid === 'storage_chest' || pid === 'building_survivor_shack') return true;
  if (pid.includes('door')) return true;
  if (d.locked != null || d.doorOpen != null || d.storageOpen != null) return true;
  if (d.immutable && !String(d.placementKey || '').startsWith('s01:')) return true;
  return false;
}

export const GAME_INIT_DECOR_MAX = Object.freeze({ mobile: 650, desktop: 950 });

function _dist2(d, px, pz) {
  const dx = d.x - px;
  const dz = d.z - pz;
  return dx * dx + dz * dz;
}

/**
 * Décor proche + épinglé pour game-init.
 * Arbres / props lointains : APIs decor-trees / decor-props.
 */
export function decorItemsForGameInit(decorMap, px, pz, clientKind) {
  const r2 = gameInitDecorRadius(clientKind) ** 2;
  const maxN = clientKind === 'mobile' ? GAME_INIT_DECOR_MAX.mobile : GAME_INIT_DECOR_MAX.desktop;
  const critical = [];
  const near = [];
  for (const d of decorMap.values()) {
    if (skipGameInitDecor(d)) continue;
    if (isFelledTreeDecor(d)) continue;
    if (isCriticalPinnedDecorServer(d)) {
      critical.push(d);
      continue;
    }
    if (_dist2(d, px, pz) <= r2) near.push(d);
  }
  near.sort((a, b) => _dist2(a, px, pz) - _dist2(b, px, pz));
  const room = Math.max(0, maxN - critical.length);
  return critical.concat(near.slice(0, room));
}

export function decorTreesBeyond(decorMap, sx, sz, minR) {
  const minR2 = Number.isFinite(minR) && minR > 0 ? minR * minR : null;
  const rows = [];
  for (const d of decorMap.values()) {
    if (!d.prefabId?.startsWith('tree_')) continue;
    if (isFelledTreeDecor(d)) continue;
    const d2 = _dist2(d, sx, sz);
    if (minR2 != null && d2 <= minR2) continue;
    rows.push({ d, d2 });
  }
  rows.sort((a, b) => a.d2 - b.d2);
  return rows.map((r) => r.d);
}

export function decorPropsBeyond(decorMap, sx, sz, minR) {
  const minR2 = Number.isFinite(minR) && minR > 0 ? minR * minR : null;
  const rows = [];
  for (const d of decorMap.values()) {
    if (skipGameInitDecor(d)) continue;
    if (isFelledTreeDecor(d)) continue;
    if (d.prefabId?.startsWith('tree_')) continue;
    if (isCriticalPinnedDecorServer(d)) continue;
    const d2 = _dist2(d, sx, sz);
    if (minR2 != null && d2 <= minR2) continue;
    rows.push({ d, d2 });
  }
  rows.sort((a, b) => a.d2 - b.d2);
  return rows.map((r) => r.d);
}

/** Décor dans un disque autour du joueur — streaming exploration (paginé côté route). */
export function decorItemsNearPlayer(decorMap, px, pz, radius) {
  const r2 = Number.isFinite(radius) && radius > 0 ? radius * radius : null;
  if (r2 == null) return [];
  const rows = [];
  for (const d of decorMap.values()) {
    if (skipGameInitDecor(d)) continue;
    if (isFelledTreeDecor(d)) continue;
    const d2 = _dist2(d, px, pz);
    if (d2 > r2) continue;
    rows.push({ d, d2 });
  }
  rows.sort((a, b) => a.d2 - b.d2);
  return rows.map((r) => r.d);
}
