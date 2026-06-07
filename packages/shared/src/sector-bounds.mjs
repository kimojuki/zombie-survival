/** Limites secteur jouable — sync client `sector_bounds.js` + serveur `move`. */
export {
  SECTOR_01,
  SECTORS_ALL,
  SECTORS_LOCKED,
  SECTOR_01_GATES,
  MAP_WORLD,
  MAP_ROADS,
  getSectorAt,
} from './sectors.mjs';

import { SECTOR_01 } from './sectors.mjs';

export function clampToSector01(x, z) {
  return {
    x: Math.max(SECTOR_01.xMin, Math.min(SECTOR_01.xMax, x)),
    z: Math.max(SECTOR_01.zMin, Math.min(SECTOR_01.zMax, z)),
  };
}

export function isInsideSector01(x, z, margin = 0) {
  const m = margin || 0;
  return x >= SECTOR_01.xMin - m
    && x <= SECTOR_01.xMax + m
    && z >= SECTOR_01.zMin - m
    && z <= SECTOR_01.zMax + m;
}
