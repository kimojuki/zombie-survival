// Constantes croissance arbres — miroir de packages/shared/src/tree-growth.mjs
(function () {
  'use strict';

  const TREE_SCALE_BY_PHASE = [0.14, 0.32, 0.52, 0.76, 1.0];
  const TREE_WOOD_RATIO_BY_PHASE = [0.1, 0.28, 0.5, 0.78, 1.0];
  const TREE_WOOD_MAX = {
    tree_oak: 8, tree_pine: 10, tree_birch: 6, tree_dead: 3, tree_palm: 6,
  };

  function clampPhase(phase) {
    return Math.max(0, Math.min(4, Math.floor(Number(phase) || 0)));
  }

  function getScale(phase) {
    return TREE_SCALE_BY_PHASE[clampPhase(phase)];
  }

  function getWoodMax(prefabId, phase) {
    const adult = TREE_WOOD_MAX[prefabId] ?? 6;
    return Math.max(1, Math.floor(adult * TREE_WOOD_RATIO_BY_PHASE[clampPhase(phase)]));
  }

  window.ZS = window.ZS || {};
  ZS.TreeGrowth = { getScale, getWoodMax, clampPhase };
}());
