// Routes S01 désactivées — sentier plage géré par proc_spawn + Trails (pas de RN flatten).
(function () {
  'use strict';

  function registerRoads() {
    // Intentionnellement vide : évite aplats terrain RoadNetwork le long du sentier / forêt.
  }

  window.ZS = window.ZS || {};
  ZS.S01Roads = { registerRoads };
}());
