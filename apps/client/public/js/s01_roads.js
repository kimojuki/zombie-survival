// Routes S01 — sync packages/shared/src/s01-roads.mjs (routes terre = CMS admin).

(function () {

  'use strict';

  /** Codegen retiré — cabane↔clairière refaite via F8 → Routes admin. */
  const S01_DIRT_ROADS = [];

  function registerRoads() {
    if (!ZS.RoadNetwork?.defineEdge) return;
    for (const def of S01_DIRT_ROADS) {
      ZS.RoadNetwork.defineEdge({
        id: def.id,
        pts: def.pts.map((p) => [p[0], p[1]]),
        width: def.width ?? 2.6,
        type: def.type || 'dirt',
        smooth: def.smooth !== false,
        visual: def.visual !== false,
        barriers: def.barriers === true,
      });
    }
  }

  window.ZS = window.ZS || {};
  ZS.S01_DIRT_ROADS = S01_DIRT_ROADS;
  ZS.S01Roads = { registerRoads };

}());