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

    const mouth = ZS.getSpawnTrailMouth?.() || [0, -11.35];
    let trailPts = ZS.RoadNetwork.buildTrailTowardRoad
      ? ZS.RoadNetwork.buildTrailTowardRoad(mouth, TOWN_MAIN_PTS, { leadIn: 5.5, bend: 2.8, steps: 14 })
      : (ZS.SPAWN_TRAIL_PTS?.map(p => p.slice()) || []);

    if (ZS.SPAWN_TRAIL_PTS && trailPts?.length >= 2) {
      ZS.SPAWN_TRAIL_PTS.length = 0;
      trailPts.forEach(p => ZS.SPAWN_TRAIL_PTS.push(p));
    }

    let join = null;
    if (trailPts.length >= 2 && ZS.RoadNetwork.computeTrailRoadJoin) {
      join = ZS.RoadNetwork.computeTrailRoadJoin(trailPts, TOWN_MAIN_PTS, {
        smooth: true,
        maxDist: 12,
        roadId: 'town_main',
      });
      if (join && ZS.RoadNetwork.trimTrailForJoin) {
        trailPts = ZS.RoadNetwork.trimTrailForJoin(trailPts, join, 2.8);
        if (ZS.SPAWN_TRAIL_PTS) {
          ZS.SPAWN_TRAIL_PTS.length = 0;
          trailPts.forEach(p => ZS.SPAWN_TRAIL_PTS.push(p));
        }
      }
    }

    if (ZS.Trails?.registerFlatten && trailPts.length >= 2) {
      ZS.Trails.registerFlatten(trailPts, {
        width: 1.55,
        shoulder: 0.65,
        blend: 3.5,
        smooth: true,
      });
    }

    if (trailPts.length >= 2) {
      ZS.RoadNetwork.defineEdge({
        id: 'spawn_trail',
        pts: trailPts,
        width: 1.55,
        type: 'trail',
        visual: false,
        smooth: false,
        taperEnd: 0,
        join: join ? {
          roadId: 'town_main',
          x: join.x,
          z: join.z,
          ux: join.ux,
          uz: join.uz,
          dist: join.dist,
          trailX: join.trailX,
          trailZ: join.trailZ,
          trailUx: join.trailUx,
          trailUz: join.trailUz,
        } : null,
      });
    }

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
