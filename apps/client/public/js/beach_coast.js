// Forme côtière plage — sync packages/shared/src/beach-spawn.mjs (chargé avant noise.js).
(function () {
  'use strict';

  const MAP_EAST_X = 295;
  const COAST_X_W = 244;
  /** Enfoncement du terrain sous la plage (aplatit la zone). */
  const BEACH_SAND_THICKNESS = 0.26;
  /** Hauteur de la couverture sable au-dessus du terrain enfoncé. */
  const BEACH_CAP_LIFT = 0.05;

  function _smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  const OCEAN_SHORE_X = MAP_EAST_X + 1;

  /** 0–1 : proximité de la ligne de rivage (vagues plus fortes près de l’océan à l’est). */
  function beachOceanProximity(x, z) {
    const bw = beachCoastWeight(x, z);
    if (bw < 0.03) return 0;
    const inland = Math.max(0, OCEAN_SHORE_X - x);
    const t = 1 - Math.min(1, inland / 50);
    return bw * t * t;
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

  const BEACH_SAFE_SAND_MIN_WEIGHT = 0.32;

  function isInBeachFootprint(x, z, margin) {
    const cut = Math.max(0.03, 0.11 - (margin || 0) * 0.045);
    return beachCoastWeight(x, z) >= cut;
  }

  function isOnBeachSafeSand(x, z) {
    return beachCoastWeight(x, z) >= BEACH_SAFE_SAND_MIN_WEIGHT && isInBeachFootprint(x, z, 0);
  }

  function isBuildBlockedOnBeach(x, z, halfW, halfD) {
    const hw = halfW == null ? 1.5 : halfW;
    const hd = halfD == null ? 1.5 : halfD;
    const pts = [
      [x, z],
      [x - hw, z - hd],
      [x + hw, z - hd],
      [x - hw, z + hd],
      [x + hw, z + hd],
    ];
    return pts.some(([px, pz]) => isOnBeachSafeSand(px, pz));
  }

  function beachTerrainSink(bw) {
    if (bw < 0.06) return 0;
    const t = Math.min(1, (bw - 0.06) / 0.94);
    return BEACH_SAND_THICKNESS * t;
  }

  function _rawTerrainBase(x, z) {
    let h = ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0;
    if (ZS.isInClearingDisc?.(x, z, 0.12)) h -= 0.14;
    return h;
  }

  /** Hauteur du dessus de la couverture sable — null hors plage. */
  function getBeachSurfaceHeight(x, z) {
    const bw = beachCoastWeight(x, z);
    if (bw < 0.08) return null;
    const base = _rawTerrainBase(x, z);
    return base - beachTerrainSink(bw) + BEACH_CAP_LIFT;
  }

  window.ZS = window.ZS || {};
  ZS.BEACH_SAND_THICKNESS = BEACH_SAND_THICKNESS;
  ZS.BEACH_CAP_LIFT = BEACH_CAP_LIFT;
  ZS.beachCoastWeight = beachCoastWeight;
  ZS.beachOceanProximity = beachOceanProximity;
  ZS.beachTerrainSink = beachTerrainSink;
  ZS.isInBeachFootprint = isInBeachFootprint;
  ZS.isOnBeachSafeSand = isOnBeachSafeSand;
  ZS.isBuildBlockedOnBeach = isBuildBlockedOnBeach;
  ZS.getBeachSurfaceHeight = getBeachSurfaceHeight;
}());
