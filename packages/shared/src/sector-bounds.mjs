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

import { SECTOR_01, SECTORS_ALL } from './sectors.mjs';

export const SECTOR_02 = SECTORS_ALL.find((s) => s.id === 's02');

export const PLAYABLE_AREAS = Object.freeze([
  SECTOR_01,
  SECTOR_02,
  {
    id: 's01_s02_corridor',
    xMin: Math.min(SECTOR_01.xMin, SECTOR_02.xMax),
    xMax: Math.max(SECTOR_01.xMin, SECTOR_02.xMax),
    zMin: SECTOR_02.zMin,
    zMax: SECTOR_02.zMax,
  },
].filter(Boolean));

function _contains(area, x, z, margin = 0) {
  return x >= area.xMin - margin
    && x <= area.xMax + margin
    && z >= area.zMin - margin
    && z <= area.zMax + margin;
}

function _clampToArea(area, x, z) {
  return {
    x: Math.max(area.xMin, Math.min(area.xMax, x)),
    z: Math.max(area.zMin, Math.min(area.zMax, z)),
  };
}

function _dist2(a, x, z) {
  return ((a.x - x) ** 2) + ((a.z - z) ** 2);
}

export function clampToSector01(x, z) {
  for (const area of PLAYABLE_AREAS) {
    if (_contains(area, x, z)) return { x, z };
  }
  let best = _clampToArea(SECTOR_01, x, z);
  let bestD = _dist2(best, x, z);
  for (const area of PLAYABLE_AREAS) {
    const c = _clampToArea(area, x, z);
    const d = _dist2(c, x, z);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

export function isInsideSector01(x, z, margin = 0) {
  return PLAYABLE_AREAS.some((area) => _contains(area, x, z, margin));
}
