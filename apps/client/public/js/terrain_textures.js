// Terrain texture legacy hook.
// Le terrain utilise les matériaux existants si aucun atlas spécialisé n'est fourni.
(function () {
  'use strict';
  window.ZS = window.ZS || {};
  ZS.TerrainTextures = ZS.TerrainTextures || {
    getGroundMaterial: null,
    getForestFloorMaterial: null,
  };
}());
