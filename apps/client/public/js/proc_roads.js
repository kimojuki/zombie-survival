// Routes procédurales — phase refonte : RN traversante + branche grande ville
(function () {
  'use strict';

  const TOWN_MAIN_WIDTH = 8.4; // 2 voies (~3,5 m) + axe central

  const TOWN_MAIN_PTS = [
    [88, -64], [74, -62], [62, -60], [56, -58],
    [36, -56], [16, -52], [-4, -46], [-24, -36], [-44, -24], [-64, -8],
    [-78, -9], [-92, -9], [-104, -9], [-118, -8], [-155, 0], [-180, 1], [-210, 0], [-250, 1], [-295, 0],
  ];

  const CITY_HIGHWAY_PTS = [
    [-104, -9], [-96, -32], [-82, -58], [-65, -85], [-48, -105], [-32, -116], [-20, -122],
  ];

  function _registerRoads() {
    if (!ZS.RoadNetwork) return;

    ZS.RoadNetwork.defineEdge({
      id: 'town_main',
      pts: TOWN_MAIN_PTS,
      width: TOWN_MAIN_WIDTH,
      type: 'asphalt',
      line: true,
      lineSolid: true,
      broken: true,
      barriers: true,
      smooth: true,
      taperEnd: 14,
    });

    ZS.RoadNetwork.defineEdge({
      id: 'city_highway',
      pts: CITY_HIGHWAY_PTS,
      width: 12,
      type: 'asphalt',
      line: true,
      barriers: true,
      smooth: true,
      taperEnd: 10,
    });
  }

  ZS.Roads = { registerTerrain: _registerRoads };
}());
