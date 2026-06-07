// Forme côtière plage — sync packages/shared/src/beach-spawn.mjs (chargé avant noise.js).
(function () {
  'use strict';

  const MAP_EAST_X = 295;
  const COAST_X_W = 244;
  /** Épaisseur dalle sable (couche 2) — terrain enfoncé en dessous. */
  const BEACH_SAND_THICKNESS = 0.35;

  function _smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function beachCoastWeight(x, z) {
    const cz = -8;
    const halfLen = 86;

    const zRel = Math.abs(z - cz);
    const zT = zRel / halfLen;
    if (zT > 1.1) return 0;

    const zEnv = zT <= 0.58 ? 1 : _smoothstep(1.1, 0.58, zT);
    if (zEnv < 0.004) return 0;

    const crescent = 0.3 + 0.7 * zEnv;
    const westCore = COAST_X_W;
    const westTip = westCore + 30 * (1 - zEnv);
    const westX = westCore + (westTip - westCore) * Math.pow(Math.min(1, zT), 1.35);
    const eastX = MAP_EAST_X + 6;
    const westFeather = 17 * crescent;

    if (x < westX - westFeather - 2 || x > eastX + 2) return 0;

    let w = zEnv;

    w *= _smoothstep(westX - westFeather, westX + 2, x);

    if (x > MAP_EAST_X + 1) {
      w *= _smoothstep(eastX + 2, MAP_EAST_X, x);
    }

    return Math.max(0, Math.min(1, w));
  }

  function isInBeachFootprint(x, z, margin) {
    const cut = Math.max(0.03, 0.11 - (margin || 0) * 0.045);
    return beachCoastWeight(x, z) >= cut;
  }

  /** Enfoncement terrain (couche 1) sous la dalle sable. */
  function beachTerrainSink(bw) {
    if (bw < 0.06) return 0;
    return BEACH_SAND_THICKNESS * 0.92 * Math.min(1, bw * 1.12);
  }

  function _terrainBase(x, z) {
    return ZS.getVisibleTerrainHeight
      ? ZS.getVisibleTerrainHeight(x, z)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
  }

  /** Hauteur du dessus de la dalle sable — null hors plage. */
  function getBeachSurfaceHeight(x, z) {
    const bw = beachCoastWeight(x, z);
    const base = _terrainBase(x, z);
    const sunk = base - beachTerrainSink(bw);

    if (bw < 0.12) {
      if (bw >= 0.08 && x >= MAP_EAST_X - 14) {
        return sunk + BEACH_SAND_THICKNESS * 0.88;
      }
      return null;
    }

    const raw = ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : base;
    const westT = Math.max(0, Math.min(1, (x - 236) / 18));
    const micro = (raw - base) * (1 - westT) * 0.06 * bw;
    return sunk + BEACH_SAND_THICKNESS + micro;
  }

  window.ZS = window.ZS || {};
  ZS.BEACH_SAND_THICKNESS = BEACH_SAND_THICKNESS;
  ZS.beachCoastWeight = beachCoastWeight;
  ZS.beachTerrainSink = beachTerrainSink;
  ZS.isInBeachFootprint = isInBeachFootprint;
  ZS.getBeachSurfaceHeight = getBeachSurfaceHeight;
}());
