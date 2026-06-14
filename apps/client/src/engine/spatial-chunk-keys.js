/**
 * Grille spatiale 64 m — clés chunk partagées (forêt, plage, routes).
 */
export const CHUNK_SIZE = 64;

/**
 * @param {number} x
 * @param {number} z
 * @param {number} [chunkSize]
 */
export function chunkCell(x, z, chunkSize = CHUNK_SIZE) {
  return {
    cx: Math.floor(x / chunkSize),
    cz: Math.floor(z / chunkSize),
  };
}

/**
 * @param {number} x
 * @param {number} z
 * @param {number} [chunkSize]
 */
export function chunkKeyFromWorld(x, z, chunkSize = CHUNK_SIZE) {
  const { cx, cz } = chunkCell(x, z, chunkSize);
  return `${cx},${cz}`;
}

/**
 * @param {string} key
 * @param {number} [chunkSize]
 */
export function chunkCenterFromKey(key, chunkSize = CHUNK_SIZE) {
  const [cx, cz] = key.split(',').map(Number);
  return {
    x: cx * chunkSize + chunkSize * 0.5,
    z: cz * chunkSize + chunkSize * 0.5,
  };
}

/**
 * Clés chunk dans un disque (pour prefetch).
 * @param {number} sx source X
 * @param {number} sz source Z
 * @param {number} radius
 * @param {number} [chunkSize]
 */
export function chunkKeysInRadius(sx, sz, radius, chunkSize = CHUNK_SIZE) {
  const minCx = Math.floor((sx - radius) / chunkSize);
  const maxCx = Math.floor((sx + radius) / chunkSize);
  const minCz = Math.floor((sz - radius) / chunkSize);
  const maxCz = Math.floor((sz + radius) / chunkSize);
  const r2 = radius * radius;
  const keys = [];
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cz = minCz; cz <= maxCz; cz++) {
      const centerX = cx * chunkSize + chunkSize * 0.5;
      const centerZ = cz * chunkSize + chunkSize * 0.5;
      const dx = centerX - sx;
      const dz = centerZ - sz;
      if (dx * dx + dz * dz <= r2) keys.push(`${cx},${cz}`);
    }
  }
  return keys;
}
