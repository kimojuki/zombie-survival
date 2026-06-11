// Limites build / safe S01 — miroir packages/shared (beach-spawn + s01-*).
(function () {
  'use strict';

  const POI_EXCLUSION_R = 10;

  /** POI validés en jeu — sync packages/shared/src/s01-poi.mjs */
  const POIS = [
    { x: 165.1, z: 7.1, r: POI_EXCLUSION_R, id: 'cabin01' },
  ];

  function isInCampSafeZone() {
    return false;
  }

  function isInS01SafeZone(x, z) {
    return !!ZS.isOnBeachSafeSand?.(x, z);
  }

  function isInBeachTrailMouthExclusion(x, z) {
    const pts = ZS.BEACH_TRAIL_PTS || [];
    if (!pts.length) return false;
    const [tx, tz] = pts[0];
    const westEdge = tx - POI_EXCLUSION_R;
    if (x > tx + 2 || x < westEdge - 4) return false;
    return Math.abs(z - tz) <= POI_EXCLUSION_R + 6;
  }

  function isInPoiBuildExclusion(x, z, halfW, halfD) {
    halfW = halfW || 0;
    halfD = halfD || 0;
    const corners = [
      [x, z],
      [x - halfW, z - halfD],
      [x + halfW, z - halfD],
      [x - halfW, z + halfD],
      [x + halfW, z + halfD],
    ];
    for (const poi of POIS) {
      for (const [px, pz] of corners) {
        if (Math.hypot(px - poi.x, pz - poi.z) < POI_EXCLUSION_R) return true;
      }
    }
    return false;
  }

  function isS01BuildBlocked(x, z, halfW, halfD) {
    if (ZS.isBuildBlockedOnBeach?.(x, z, halfW, halfD)) return true;
    if (isInBeachTrailMouthExclusion(x, z)) return true;
    if (isInPoiBuildExclusion(x, z, halfW, halfD)) return true;
    return false;
  }

  window.ZS = window.ZS || {};
  ZS.S01Bounds = {
    POIS,
    isInCampSafeZone,
    isInS01SafeZone,
    isInBeachTrailMouthExclusion,
    isInPoiBuildExclusion,
    isS01BuildBlocked,
    POI_EXCLUSION_R,
  };
}());
