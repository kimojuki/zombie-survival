'use strict';

/**
 * Interactions joueur ↔ décor proche (portes, distance XZ).
 */
function createPlayerInteract(deps) {
  const { getDecorItems, doorPrefabs } = deps;

  function distXZ(ax, az, bx, bz) {
    return Math.hypot(ax - bx, az - bz);
  }

  function getNearbyDoor(id, px, pz, maxDist = 6) {
    if (!id || typeof id !== 'string') return null;
    const item = getDecorItems().get(id);
    if (!item || !doorPrefabs.has(item.prefabId)) return null;
    if (Math.hypot((item.x || 0) - px, (item.z || 0) - pz) > maxDist) return null;
    return item;
  }

  return { distXZ, getNearbyDoor };
}

module.exports = { createPlayerInteract };
