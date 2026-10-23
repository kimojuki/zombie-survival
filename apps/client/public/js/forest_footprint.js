// Zone décor forêt de départ — ouest de la carte, hors plage / sentier / clairière.
(function () {
  'use strict';

  const FOREST_EAST_X = 234;
  const FOREST_CZ = -10;
  const FOREST_Z_HALF = 108;

  function _smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /** Poids 0–1 : forêt dense près du sentier spawn → intérieur. */
  function forestFloorWeight(x, z) {
    if (ZS.isInBeachFootprint?.(x, z, 2)) return 0;
    if (x > FOREST_EAST_X + 4) return 0;

    const zRel = Math.abs(z - FOREST_CZ);
    const zT = zRel / FOREST_Z_HALF;
    if (zT > 1.12) return 0;

    let w = zT <= 0.55 ? 1 : _smoothstep(1.12, 0.55, zT);
    if (w < 0.004) return 0;

    if (x < 120) w = Math.min(1, w + 0.18);
    if (x < 40) w = Math.min(1, w + 0.12);
    if (x > 195) w *= _smoothstep(FOREST_EAST_X + 4, 198, x);

    return Math.max(0, Math.min(1, w));
  }

  function isInForestFootprint(x, z, margin) {
    const cut = Math.max(0.18, 0.32 - (margin || 0) * 0.04);
    return forestFloorWeight(x, z) >= cut;
  }

  window.ZS = window.ZS || {};
  ZS.forestFloorWeight = forestFloorWeight;
  ZS.isInForestFootprint = isInForestFootprint;
}());
