// Terrain S01 — rivière ouest + aplats POI secondaires (pas de campement / clairière artificielle).
(function () {
  'use strict';

  const RIVER_PTS = [
    [-97, -265], [-115, -180], [-88, -40], [-105, 90],
  ];
  const RIVER_WIDTH = 12;
  const RIVER_DEPTH = 0.18;
  const RIVER_BLEND = 14;

  function registerRiver() {
    if (!ZS.registerRiverChannel) return;
    ZS.registerRiverChannel(RIVER_PTS, RIVER_WIDTH, RIVER_DEPTH, RIVER_BLEND);
  }

  /** Aplats légers autour des POI bâtis — sans les anciens sites de campement. */
  function registerFlatZones() {
    if (!ZS.registerFlatZone) return;
    ZS.registerFlatZone(-60, -70, 13, 11, 6);
    ZS.registerFlatZone(-80, 42, 13, 11, 6);
    ZS.registerFlatZone(82, -100, 18, 11, 7);
    ZS.registerFlatZone(28, -42, 7, 7, 6);
    ZS.registerFlatZone(-90, -9, 16, 5, 5);
  }

  function registerWorld() {
    registerRiver();
    registerFlatZones();
  }

  window.ZS = window.ZS || {};
  ZS.S01Terrain = { registerWorld };
}());
