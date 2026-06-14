/** Grille spatiale XZ — requêtes par rayon sans dépendance moteur. */

export function createSpatialGrid(cellSize = 32) {
  /** @type {Map<string, Array<{ x: number, z: number, data: unknown }>>} */
  const grid = new Map();

  function cellKey(cx, cz) {
    return `${cx},${cz}`;
  }

  function clear() {
    grid.clear();
  }

  /**
   * @param {Iterable<{ data: unknown, x: number, z: number }>} items
   */
  function rebuild(items) {
    grid.clear();
    for (const item of items) {
      const ref = item.data;
      const ix = (ref && Number.isFinite(ref.x)) ? ref.x : item.x;
      const iz = (ref && Number.isFinite(ref.z)) ? ref.z : item.z;
      if (!Number.isFinite(ix) || !Number.isFinite(iz)) continue;
      const cx = Math.floor(ix / cellSize);
      const cz = Math.floor(iz / cellSize);
      const key = cellKey(cx, cz);
      let bucket = grid.get(key);
      if (!bucket) {
        bucket = [];
        grid.set(key, bucket);
      }
      bucket.push(item);
    }
  }

  /**
   * @param {number} x
   * @param {number} z
   * @param {number} radius
   * @returns {unknown[]}
   */
  function query(x, z, radius, out) {
    const r2 = radius * radius;
    const minCx = Math.floor((x - radius) / cellSize);
    const maxCx = Math.floor((x + radius) / cellSize);
    const minCz = Math.floor((z - radius) / cellSize);
    const maxCz = Math.floor((z + radius) / cellSize);
    const results = out || [];
    if (!out) results.length = 0;
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = grid.get(cellKey(cx, cz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const item = bucket[i];
          const ref = item.data;
          const ix = (ref && Number.isFinite(ref.x)) ? ref.x : item.x;
          const iz = (ref && Number.isFinite(ref.z)) ? ref.z : item.z;
          const dx = ix - x;
          const dz = iz - z;
          if (dx * dx + dz * dz <= r2) results.push(ref ?? item.data);
        }
      }
    }
    return results;
  }

  return { rebuild, query, clear, cellSize };
}
